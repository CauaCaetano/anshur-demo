// Leitura de trocas coladas do Excel ou de CSV do sistema da revenda. Roda só no navegador: nada é enviado.
(function (raiz) {
  // datas primeiro: "data da troca" não pode cair na coluna de valor pago
  const COLUNAS = {
    entrada: /data da troca|entrada|dt.*troca/, saida: /data da venda|sa[ií]da|dt.*venda/,
    tipo: /categ|tipo|grupo/, marca: /fabric|marca/, modelo: /modelo/, ano: /^ano|ano\b|fabrica[cç][aã]o/, horas: /hora|hor[ií]metro/,
    estado: /estado|nota|condi/, pago: /pago|troca|compra|aquisi/, vendido: /vend|venda/, dias: /dias|perman|p[aá]tio/,
    fipe: /fipe|refer/
  };
  const ORDEM = ['tipo', 'marca', 'modelo', 'ano', 'horas', 'estado', 'pago', 'vendido', 'dias', 'fipe', 'entrada', 'saida'];
  const semAcento = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

  // "R$ 210.000,00" | "210000" | "210.000" | "210,5 mil"
  function dinheiro(s) {
    let t = String(s ?? '').trim().toLowerCase(); if (!t) return NaN;
    const mil = /mil\b/.test(t), mi = /mi(lh[oõ]es|\b)/.test(t) && !mil;
    t = t.replace(/r\$|\s|mil|milh[oõ]es|mi\b/g, '');
    if (/,\d{1,2}$/.test(t)) t = t.replace(/\./g, '').replace(',', '.');
    else if (/\.\d{3}(\.|$)/.test(t)) t = t.replace(/\./g, '');
    else t = t.replace(/,/g, '');
    let v = parseFloat(t); if (!isFinite(v)) return NaN;
    if (mil) v *= 1000; if (mi) v *= 1e6;
    return v;
  }
  function numero(s) { const v = dinheiro(s); return v; }
  // aceita dd/mm/aaaa, dd/mm/aa e aaaa-mm-dd; devolve ISO ou null
  function dataISO(s) {
    const t = String(s ?? '').trim(); if (!t) return null;
    let m = t.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    let a, me, d;
    if (m) { a = +m[1]; me = +m[2]; d = +m[3]; }
    else { m = t.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2}|\d{4})$/); if (!m) return 'invalida'; d = +m[1]; me = +m[2]; a = +m[3] < 100 ? 2000 + +m[3] : +m[3]; }
    const dt = new Date(Date.UTC(a, me - 1, d));
    if (dt.getUTCFullYear() !== a || dt.getUTCMonth() !== me - 1 || dt.getUTCDate() !== d) return 'invalida';
    return dt.toISOString().slice(0, 10);
  }
  const tipoDe = (s) => { s = semAcento(s); return /trat/.test(s) ? 'trator' : /colh/.test(s) ? 'colhedora' : /pulv/.test(s) ? 'pulverizador' : /plant|semead/.test(s) ? 'plantadeira' : null; };
  const separador = (l) => (l.includes('\t') ? '\t' : (l.split(';').length >= (l.split(',').length) ? ';' : ','));
  function dividir(l, sep) { // respeita aspas do CSV
    const out = []; let cur = '', q = false;
    for (let i = 0; i < l.length; i++) { const ch = l[i]; if (ch === '"') { if (q && l[i + 1] === '"') { cur += '"'; i++; } else q = !q; } else if (ch === sep && !q) { out.push(cur); cur = ''; } else cur += ch; }
    out.push(cur); return out.map((c) => c.trim());
  }

  // opts: { anoMax, refDe(t) -> referência ou null, hoje }
  function ler(texto, opts = {}) {
    const anoMax = opts.anoMax || new Date().getFullYear();
    const hoje = opts.hoje || new Date().toISOString().slice(0, 10);
    const linhas = String(texto || '').replace(/^﻿/, '').split(/\r?\n/);
    const aceitas = [], rejeitadas = [], vistos = new Map();
    let mapa = null, sep = null;
    linhas.forEach((bruta, n) => {
      if (!bruta.trim()) return;
      sep = sep || separador(bruta);
      const c = dividir(bruta, sep);
      if (!mapa) {
        const cab = c.map(semAcento);
        const ehCab = !c.some((x) => /\d{4}/.test(x)) && cab.some((x) => /modelo|categ|pago|vend/.test(x));
        if (ehCab) {
          mapa = {}; cab.forEach((h, i) => { const k = Object.keys(COLUNAS).find((k) => !(k in mapa) && COLUNAS[k].test(h)); if (k) mapa[k] = i; });
          return;
        }
        mapa = {}; ORDEM.forEach((k, i) => { mapa[k] = i; });
      }
      const v = (k) => (mapa[k] == null ? '' : c[mapa[k]] ?? '');
      const linha = n + 1, erros = [];
      const tipo = tipoDe(v('tipo'));
      const ano = parseInt(v('ano'), 10), horas = numero(v('horas')), estadoN = numero(v('estado'));
      const pago = dinheiro(v('pago')), vendido = dinheiro(v('vendido')), dias = numero(v('dias')), fipe = dinheiro(v('fipe'));
      const entrada = dataISO(v('entrada')), saida = dataISO(v('saida'));
      if (!tipo) erros.push('categoria não reconhecida (trator, colhedora, pulverizador ou plantadeira)');
      if (!v('modelo')) erros.push('modelo vazio');
      if (!(ano > 1990 && ano <= anoMax)) erros.push('ano inválido');
      if (!(horas >= 0)) erros.push('horas inválidas');
      if (!(pago > 0)) erros.push('valor pago vazio ou inválido');
      if (!(vendido > 0)) erros.push('valor vendido vazio ou inválido');
      if (entrada === 'invalida') erros.push('data da troca inválida');
      if (saida === 'invalida') erros.push('data da venda inválida');
      if (entrada && saida && entrada !== 'invalida' && saida !== 'invalida' && saida < entrada) erros.push('venda antes da troca');
      if (entrada && entrada !== 'invalida' && entrada > hoje) erros.push('data da troca no futuro');
      if (pago > 0 && vendido > 0 && (pago > vendido * 3 || vendido > pago * 3)) erros.push('valores pago e vendido muito diferentes: confira os zeros');
      const t = { id: 'I' + linha, tipo, marca: v('marca'), modelo: v('modelo'), ano, horas: horas || 0,
        cond: estadoN > 5 ? Math.min(100, estadoN) : Math.max(1, Math.min(5, estadoN || 3)) * 20,
        pago, vendido, preparo: 0, diasPatio: dias >= 0 ? dias : null, origem: 'Importada' };
      if (fipe > 0) t.referencia = fipe;
      if (entrada && entrada !== 'invalida') t.entrada = entrada;
      if (saida && saida !== 'invalida') t.saida = saida;
      if (t.entrada && !t.saida && t.diasPatio != null) { const d = new Date(t.entrada + 'T12:00:00'); d.setDate(d.getDate() + t.diasPatio); t.saida = d.toISOString().slice(0, 10); }
      if (t.entrada && t.saida && t.diasPatio == null) t.diasPatio = Math.round((new Date(t.saida) - new Date(t.entrada)) / 864e5);
      if (!erros.length && opts.refDe && !opts.refDe(t)) erros.push(`modelo "${t.modelo}" sem referência: informe a Fipe`);
      const chave = [tipo, semAcento(t.modelo), ano, t.horas, pago, vendido].join('|');
      if (!erros.length && vistos.has(chave)) erros.push(`duplicada da linha ${vistos.get(chave)}`);
      if (erros.length) rejeitadas.push({ linha, motivo: erros.join('; '), texto: bruta.slice(0, 80) });
      else { vistos.set(chave, linha); aceitas.push(t); }
    });
    const comDatas = aceitas.length > 0 && aceitas.every((t) => t.entrada && t.saida);
    return { aceitas, rejeitadas, comDatas, cabecalho: !!mapa };
  }

  const API = { ler, dinheiro, dataISO, tipoDe };
  if (typeof module !== 'undefined') module.exports = API; else raiz.IMPORTAR = API;
})(typeof window !== 'undefined' ? window : globalThis);
