// Peças e Estoque do Anshur: REGRAS PURAS (sem tela). Testadas em testes_oficina_pecas.js. Telas em areas/pecas.js.
// Tudo mora em estado.pecas = { catalogo, movimentos, inventarios, pedidos, compras, vendas } (listas com id: a fila offline
// grava item a item). Saldo e custo médio NUNCA são guardados: são sempre recalculados dos movimentos (como o saldo do Financeiro).
(function (raiz) {
  const r2 = (v) => Math.round((+v || 0) * 100) / 100;
  const r3 = (v) => Math.round((+v || 0) * 1000) / 1000;
  const hojeISO = () => new Date().toISOString().slice(0, 10);
  const diasEntre = (a, b) => Math.round((new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / 864e5);
  function somarDias(iso, n) { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); }
  let seq = 0;
  const novoId = (pre) => pre + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase() + (seq++).toString(36);
  const normal = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
  const UNIDADES = { un: 'Unidade', pc: 'Peça', jg: 'Jogo', kit: 'Kit', l: 'Litro', kg: 'Quilo', m: 'Metro', cx: 'Caixa' };
  const ORIGENS = { compra: 'Compra', os: 'Ordem de serviço', balcao: 'Venda de balcão', transferencia: 'Transferência', inventario: 'Inventário', devolucao: 'Devolução', inicial: 'Saldo inicial' };

  const vazio = () => ({ catalogo: [], movimentos: [], inventarios: [], pedidos: [], compras: [], vendas: [] });
  function garantir(est) {
    if (!est.pecas || typeof est.pecas !== 'object' || Array.isArray(est.pecas)) est.pecas = vazio();
    const p = est.pecas; ['catalogo', 'movimentos', 'inventarios', 'pedidos', 'compras', 'vendas'].forEach((k) => { if (!Array.isArray(p[k])) p[k] = []; });
    return p;
  }
  const ativas = (est) => garantir(est).catalogo.filter((x) => !x.inativa);
  const peca = (est, id) => garantir(est).catalogo.find((x) => x.id === id) || null;
  const nomePeca = (p) => (p ? `${p.sku} · ${p.descricao}` : '');

  // ---------- catálogo ----------
  function proximoSku(est) {
    const n = garantir(est).catalogo.map((x) => +(String(x.sku).match(/^PC-(\d+)$/) || [])[1] || 0);
    return 'PC-' + String(Math.max(0, ...n) + 1).padStart(4, '0');
  }
  const listaCompat = (v) => (Array.isArray(v) ? v : String(v || '').split(/[,;\n]/)).map((s) => s.trim()).filter(Boolean);
  // d: { sku?, codFab, descricao, marca, compat ('6125J, MF 4709' ou lista), local, unidade, preco, minimos: { loja: n }, fornecedor }
  function salvarPeca(est, d, quem = '', agora = new Date().toISOString()) {
    const c = garantir(est).catalogo, descricao = String(d.descricao || '').trim();
    if (!descricao) throw new Error('Escreva a descrição da peça.');
    const sku = String(d.sku || '').trim() || (d.id && peca(est, d.id) ? peca(est, d.id).sku : proximoSku(est));
    if (c.some((x) => x.id !== d.id && !x.inativa && normal(x.sku) === normal(sku))) throw new Error(`Já existe uma peça com o código ${sku}.`);
    const minimos = {}; Object.entries(d.minimos || {}).forEach(([l, n]) => { const v = Math.max(0, +n || 0); if (v > 0) minimos[l] = v; });
    const base = { sku, codFab: String(d.codFab || '').trim(), descricao, marca: String(d.marca || '').trim(), compat: listaCompat(d.compat), local: String(d.local || '').trim(),
      unidade: UNIDADES[d.unidade] ? d.unidade : 'un', preco: r2(d.preco), minimos, fornecedor: d.fornecedor || '' };
    if (d.id) { const x = peca(est, d.id); if (!x) throw new Error('Peça não encontrada.'); Object.assign(x, base, { alteradoPor: quem, alteradoEm: agora }); return x; }
    const x = Object.assign({ id: novoId('PC'), criadoPor: quem, criadoEm: agora }, base); c.push(x); return x;
  }
  const compativel = (p, modelo) => { const m = normal(modelo); return !!m && (p.compat || []).some((c) => { const k = normal(c); return k && (m.includes(k) || k.includes(m)); }); };
  function buscar(est, q, { modelo = '' } = {}) {
    const s = normal(q);
    return ativas(est).filter((p) => (!s || normal([p.sku, p.codFab, p.descricao, p.marca, (p.compat || []).join(' '), p.local].join(' ')).includes(s)) && (!modelo || compativel(p, modelo)));
  }

  // ---------- posição do estoque (recalculada) ----------
  const ordem = (a, b) => String(a.data).localeCompare(String(b.data)) || String(a.quando || '').localeCompare(String(b.quando || '')) || String(a.id).localeCompare(String(b.id));
  // custo médio móvel da revenda (todas as lojas); saldo por loja. Saída não muda o custo médio.
  function replay(movs, ate = '') {
    let qtd = 0, medio = 0; const porLoja = {};
    movs.slice().sort(ordem).forEach((m) => {
      if (ate && m.data > ate) return;
      const q = +m.qtd || 0, l = m.loja || '';
      if (m.tipo === 'entrada' || m.tipo === 'devolucao' || (m.tipo === 'ajuste' && q > 0)) {
        const c = m.tipo === 'ajuste' ? (+m.custo || medio) : +m.custo || 0;
        medio = qtd > 0 ? (qtd * medio + q * c) / (qtd + q) : c; qtd += q; porLoja[l] = r3((porLoja[l] || 0) + q);
      } else if (m.tipo === 'saida' || (m.tipo === 'ajuste' && q < 0)) { const s = Math.abs(q); qtd -= s; porLoja[l] = r3((porLoja[l] || 0) - s); }
      else if (m.tipo === 'transf') { porLoja[l] = r3((porLoja[l] || 0) - q); porLoja[m.para] = r3((porLoja[m.para] || 0) + q); }
    });
    return { qtd: r3(qtd), porLoja, medio: r2(medio) };
  }
  const movsDe = (est, id) => garantir(est).movimentos.filter((m) => m.peca === id);
  function posicao(est, id, { loja = '', lojas = null, ate = '' } = {}) {
    const r = replay(movsDe(est, id), ate);
    const qtd = loja ? (r.porLoja[loja] || 0) : lojas && lojas.length ? r3(lojas.reduce((s, l) => s + (r.porLoja[l] || 0), 0)) : r.qtd;
    return { qtd, porLoja: r.porLoja, custoMedio: r.medio, valor: r2(qtd * r.medio) };
  }
  // posição de todas as peças de uma vez (um passe pelos movimentos)
  function estoque(est, { loja = '', lojas = null, ate = '' } = {}) {
    const g = new Map(); garantir(est).movimentos.forEach((m) => { if (!g.has(m.peca)) g.set(m.peca, []); g.get(m.peca).push(m); });
    return ativas(est).map((p) => {
      const r = replay(g.get(p.id) || [], ate);
      const qtd = loja ? (r.porLoja[loja] || 0) : lojas && lojas.length ? r3(lojas.reduce((s, l) => s + (r.porLoja[l] || 0), 0)) : r.qtd;
      return { peca: p, qtd, porLoja: r.porLoja, custoMedio: r.medio, valor: r2(qtd * r.medio) };
    });
  }

  // ---------- movimentos ----------
  function mov(est, d, quem, agora) {
    const m = Object.assign({ id: novoId('MV'), data: d.data || hojeISO(), quando: agora, por: quem }, d);
    m.qtd = r3(m.qtd); if (typeof m.custo === 'number') m.custo = r2(m.custo);
    garantir(est).movimentos.push(m); return m;
  }
  const qtdOk = (q) => +q > 0 && isFinite(+q);
  // saída do estoque (OS ou balcão): sai pelo custo médio do momento; não deixa o saldo da loja ficar negativo
  function saida(est, { peca: id, qtd, loja = '', data, origem, ref = '', obs = '' }, quem = '', agora = new Date().toISOString(), { permitirNegativo = false } = {}) {
    const p = peca(est, id); if (!p) throw new Error('Peça não encontrada.');
    if (!qtdOk(qtd)) throw new Error('Quantidade inválida.');
    const pos = posicao(est, id, { loja });
    if (!permitirNegativo && pos.qtd < +qtd) throw new Error(`Sem saldo de ${p.descricao} na loja ${loja || 'principal'}: tem ${pos.qtd}, precisa de ${+qtd}.`);
    return mov(est, { tipo: 'saida', peca: id, qtd, custo: pos.custoMedio, loja, data, origem, ref, obs }, quem, agora);
  }
  function transferir(est, { peca: id, qtd, de, para, data, obs = '' }, quem = '', agora = new Date().toISOString()) {
    const p = peca(est, id); if (!p) throw new Error('Peça não encontrada.');
    if (!de || !para || de === para) throw new Error('Escolha duas lojas diferentes.');
    if (!qtdOk(qtd)) throw new Error('Quantidade inválida.');
    const pos = posicao(est, id, { loja: de });
    if (pos.qtd < +qtd) throw new Error(`Sem saldo para transferir: ${de} tem ${pos.qtd}.`);
    return mov(est, { tipo: 'transf', peca: id, qtd, loja: de, para, data, origem: 'transferencia', custo: pos.custoMedio, obs }, quem, agora);
  }

  // ---------- compra (entrada) com conta a pagar no Financeiro ----------
  // d: { data, loja, fornecedor (id do cadastro comum), fornecedorNome, nota, itens: [{ peca, qtd, custo }], frete?, vencimento, parcelas?, pedido? }
  // F = window.FINANCEIRO (opcional nos testes). Mesma nota do mesmo fornecedor não entra duas vezes (XML importado de novo).
  function entradaCompra(est, d, quem = '', agora = new Date().toISOString(), F = null) {
    const P = garantir(est), itens = (d.itens || []).filter((i) => i && i.peca && +i.qtd > 0);
    if (!itens.length) throw new Error('Inclua ao menos uma peça com quantidade.');
    itens.forEach((i) => { if (!peca(est, i.peca)) throw new Error('Peça não encontrada no catálogo.'); if (!(+i.custo >= 0)) throw new Error('Custo inválido.'); });
    const nota = String(d.nota || '').trim();
    if (nota && d.fornecedor && P.compras.some((c) => !c.cancelada && c.fornecedor === d.fornecedor && normal(c.nota) === normal(nota))) throw new Error(`A nota ${nota} deste fornecedor já foi lançada.`);
    const frete = r2(d.frete || 0), bruto = r2(itens.reduce((s, i) => s + i.qtd * i.custo, 0));
    const data = d.data || hojeISO();
    // frete rateado pelo valor de cada item (entra no custo da peça)
    const compra = { id: novoId('CP'), data, loja: d.loja || '', fornecedor: d.fornecedor || '', fornecedorNome: d.fornecedorNome || '', nota, frete, total: r2(bruto + frete), itens: [], lancamentos: [], pedido: d.pedido || '', origem: d.origem || 'manual', por: quem, em: agora };
    itens.forEach((i) => {
      const parte = bruto > 0 ? frete * (i.qtd * i.custo) / bruto : 0, unit = r2(+i.custo + parte / i.qtd);
      const m = mov(est, { tipo: 'entrada', peca: i.peca, qtd: i.qtd, custo: unit, loja: compra.loja, data, origem: 'compra', ref: compra.id, obs: nota ? 'NF ' + nota : '' }, quem, agora);
      compra.itens.push({ peca: i.peca, qtd: r3(i.qtd), custo: r2(i.custo), custoFinal: unit, mov: m.id });
      const p = peca(est, i.peca); if (d.fornecedor && !p.fornecedor) p.fornecedor = d.fornecedor;
    });
    if (F && compra.total > 0) {
      const ls = F.criar(est, { tipo: 'pagar', descricao: `Compra de peças${nota ? ' · NF ' + nota : ''}${d.fornecedorNome ? ' · ' + d.fornecedorNome : ''}`, valor: compra.total, vencimento: d.vencimento || somarDias(data, 30), competencia: data,
        categoria: 'cus-pecas', centro: 'cc-pecas', loja: compra.loja, fornecedor: compra.fornecedor, documento: nota ? 'NF ' + nota : compra.id, origem: 'pecas', parcelas: d.parcelas || 1 }, quem, agora);
      ls.forEach((l) => { l.origemId = compra.id; });
      compra.lancamentos = ls.map((l) => l.id);
    }
    P.compras.push(compra);
    if (d.pedido) { const pd = P.pedidos.find((x) => x.id === d.pedido); if (pd) { pd.status = 'recebido'; pd.compra = compra.id; pd.recebidoEm = data; } }
    return compra;
  }

  // ---------- venda de balcão com conta a receber ----------
  // d: { data, loja, cliente (id), clienteNome, itens: [{ peca, qtd, preco }], desconto, vencimento, recebido?: { conta, forma } }
  function vendaBalcao(est, d, quem = '', agora = new Date().toISOString(), F = null) {
    const P = garantir(est), itens = (d.itens || []).filter((i) => i && i.peca && +i.qtd > 0);
    if (!itens.length) throw new Error('Inclua ao menos uma peça.');
    // confere todo o saldo antes de tirar qualquer coisa (nada fica pela metade)
    const precisa = {}; itens.forEach((i) => { precisa[i.peca] = (precisa[i.peca] || 0) + +i.qtd; });
    Object.entries(precisa).forEach(([id, q]) => { const p = peca(est, id); if (!p) throw new Error('Peça não encontrada.'); const s = posicao(est, id, { loja: d.loja || '' }).qtd; if (s < q) throw new Error(`Sem saldo de ${p.descricao}: tem ${s}, precisa de ${q}.`); });
    const data = d.data || hojeISO(), numero = 'BV-' + String(P.vendas.length + 1).padStart(4, '0') + (d.sufixo || '');
    const venda = { id: novoId('BV'), numero, data, loja: d.loja || '', cliente: d.cliente || '', clienteNome: d.clienteNome || '', itens: [], desconto: r2(d.desconto || 0), lancamentos: [], por: quem, em: agora };
    itens.forEach((i) => { const m = saida(est, { peca: i.peca, qtd: i.qtd, loja: venda.loja, data, origem: 'balcao', ref: venda.id }, quem, agora); venda.itens.push({ peca: i.peca, qtd: r3(i.qtd), preco: r2(i.preco), custo: m.custo, mov: m.id }); });
    venda.bruto = r2(venda.itens.reduce((s, i) => s + i.qtd * i.preco, 0));
    venda.total = r2(Math.max(0, venda.bruto - venda.desconto));
    venda.custo = r2(venda.itens.reduce((s, i) => s + i.qtd * i.custo, 0));
    if (F && venda.total > 0) {
      const [l] = F.criar(est, { tipo: 'receber', descricao: `Peças no balcão · ${numero}${d.clienteNome ? ' · ' + d.clienteNome : ''}`, valor: venda.total, custoVenda: venda.custo, vencimento: d.vencimento || data, competencia: data,
        categoria: 'rec-pecas', centro: 'cc-pecas', loja: venda.loja, cliente: venda.cliente, documento: numero, origem: 'pecas' }, quem, agora);
      l.origemId = venda.id; venda.lancamentos = [l.id];
      if (d.recebido && d.recebido.conta) F.baixar(est, l.id, { data, forma: d.recebido.forma || 'pix', conta: d.recebido.conta }, quem, agora);
    }
    P.vendas.push(venda); return venda;
  }

  // ---------- inventário: contagem por loja; diferença vira ajuste com motivo ----------
  // d: { loja, data, contagens: [{ peca, contado, motivo? }], motivo (geral) }
  function inventario(est, d, quem = '', agora = new Date().toISOString()) {
    const P = garantir(est), data = d.data || hojeISO(), inv = { id: novoId('IN'), loja: d.loja || '', data, por: quem, em: agora, itens: [], motivo: String(d.motivo || '').trim() };
    const linhas = (d.contagens || []).filter((c) => c && c.peca && c.contado !== '' && c.contado != null && isFinite(+c.contado));
    if (!linhas.length) throw new Error('Conte ao menos uma peça.');
    const calc = linhas.map((c) => { const pos = posicao(est, c.peca, { loja: inv.loja }); return { c, pos, dif: r3(+c.contado - pos.qtd) }; });
    calc.forEach(({ c, dif }) => { if (dif !== 0 && !String(c.motivo || inv.motivo).trim()) throw new Error('Informe o motivo de cada diferença.'); if (+c.contado < 0) throw new Error('Contagem não pode ser negativa.'); });
    calc.forEach(({ c, pos, dif }) => {
      const it = { peca: c.peca, sistema: pos.qtd, contado: r3(c.contado), diferenca: dif, custo: pos.custoMedio, motivo: String(c.motivo || inv.motivo || '').trim() };
      if (dif !== 0) it.mov = mov(est, { tipo: 'ajuste', peca: c.peca, qtd: dif, custo: pos.custoMedio, loja: inv.loja, data, origem: 'inventario', ref: inv.id, obs: it.motivo }, quem, agora).id;
      inv.itens.push(it);
    });
    inv.ajuste = r2(inv.itens.reduce((s, i) => s + i.diferenca * i.custo, 0));
    P.inventarios.push(inv); return inv;
  }

  // ---------- estoque mínimo e pedido de compra sugerido ----------
  // mínimo por loja (peca.minimos[loja]); repõe até 2× o mínimo
  function abaixoMinimo(est, { lojas = null, loja = '' } = {}) {
    const out = [];
    estoque(est).forEach((e) => {
      Object.entries(e.peca.minimos || {}).forEach(([l, min]) => {
        if (loja && l !== loja) return; if (!loja && lojas && lojas.length && !lojas.includes(l)) return;
        const s = e.porLoja[l] || 0;
        if (min > 0 && s < min) out.push({ peca: e.peca, loja: l, saldo: s, minimo: min, falta: r3(min - s), sugerido: Math.ceil(2 * min - s), custo: e.custoMedio });
      });
    });
    return out.sort((a, b) => (a.saldo / a.minimo) - (b.saldo / b.minimo) || a.peca.descricao.localeCompare(b.peca.descricao));
  }
  // ignora o que já está num pedido em aberto
  function pedidoSugerido(est, opts = {}) {
    const P = garantir(est), emPedido = new Set();
    P.pedidos.filter((p) => p.status === 'aberto').forEach((p) => p.itens.forEach((i) => emPedido.add(i.peca + '|' + p.loja)));
    const g = new Map();
    abaixoMinimo(est, opts).filter((x) => !emPedido.has(x.peca.id + '|' + x.loja)).forEach((x) => {
      const k = (x.peca.fornecedor || '') + '|' + x.loja;
      const o = g.get(k) || { fornecedor: x.peca.fornecedor || '', loja: x.loja, itens: [], total: 0 };
      o.itens.push({ peca: x.peca.id, qtd: x.sugerido, custo: x.custo }); o.total = r2(o.total + x.sugerido * x.custo); g.set(k, o);
    });
    return [...g.values()].sort((a, b) => b.total - a.total);
  }
  function criarPedido(est, d, quem = '', agora = new Date().toISOString()) {
    const itens = (d.itens || []).filter((i) => i.peca && +i.qtd > 0); if (!itens.length) throw new Error('Pedido sem itens.');
    const P = garantir(est), p = { id: novoId('PD'), numero: 'PD-' + String(P.pedidos.length + 1).padStart(4, '0') + (d.sufixo || ''), fornecedor: d.fornecedor || '', loja: d.loja || '', itens: itens.map((i) => ({ peca: i.peca, qtd: r3(i.qtd), custo: r2(i.custo) })), total: r2(itens.reduce((s, i) => s + i.qtd * (+i.custo || 0), 0)), status: 'aberto', data: d.data || hojeISO(), por: quem, em: agora };
    P.pedidos.push(p); return p;
  }
  function cancelarPedido(est, id, motivo = '', quem = '') { const p = garantir(est).pedidos.find((x) => x.id === id); if (!p || p.status !== 'aberto') throw new Error('Só dá para cancelar pedido em aberto.'); p.status = 'cancelado'; p.cancelado = { motivo, por: quem }; return p; }
  function textoPedido(p, { revenda = '', nome = (id) => id } = {}) {
    return `Olá! Aqui é da ${revenda}. Pedido de compra ${p.numero}${p.loja ? ' (entrega em ' + p.loja + ')' : ''}:\n` + p.itens.map((i) => `• ${i.qtd} × ${nome(i.peca)}`).join('\n') + '\nPor favor, confirme preço e prazo. Obrigado!';
  }

  // ---------- curva ABC (pelo valor consumido: OS + balcão, a custo) ----------
  function curvaABC(est, { hoje = hojeISO(), dias = 365, loja = '' } = {}) {
    const de = somarDias(hoje, -dias), v = new Map();
    garantir(est).movimentos.forEach((m) => {
      if (m.data < de || m.data > hoje || (loja && m.loja !== loja)) return;
      if (m.tipo === 'saida') v.set(m.peca, r2((v.get(m.peca) || 0) + m.qtd * (m.custo || 0)));
      if (m.tipo === 'devolucao' && m.origem === 'devolucao') v.set(m.peca, r2((v.get(m.peca) || 0) - m.qtd * (m.custo || 0)));
    });
    const total = r2([...v.values()].reduce((s, x) => s + Math.max(0, x), 0));
    let acum = 0;
    const linhas = ativas(est).map((p) => ({ peca: p, valor: Math.max(0, v.get(p.id) || 0) })).sort((a, b) => b.valor - a.valor || a.peca.descricao.localeCompare(b.peca.descricao)).map((x) => {
      const pct = total ? x.valor / total : 0, antes = acum; acum += pct;
      // a classe é decidida pelo acumulado ANTES do item (o item que cruza 80% ainda é A)
      return Object.assign(x, { pct, acumulado: acum, classe: !x.valor ? 'C' : antes < 0.8 ? 'A' : antes < 0.95 ? 'B' : 'C', semGiro: !x.valor });
    });
    const resumo = { A: { n: 0, valor: 0 }, B: { n: 0, valor: 0 }, C: { n: 0, valor: 0 } };
    linhas.forEach((l) => { resumo[l.classe].n++; resumo[l.classe].valor = r2(resumo[l.classe].valor + l.valor); });
    return { linhas, total, resumo, de, ate: hoje };
  }

  // ---------- NF-e de compra (XML): leitura simples, sem validar assinatura ----------
  const tag = (s, t) => { const m = String(s).match(new RegExp(`<(?:\\w+:)?${t}(?:\\s[^>]*)?>([\\s\\S]*?)</(?:\\w+:)?${t}>`)); return m ? m[1].trim() : ''; };
  const tags = (s, t) => { const out = [], re = new RegExp(`<(?:\\w+:)?${t}(?:\\s[^>]*)?>([\\s\\S]*?)</(?:\\w+:)?${t}>`, 'g'); let m; while ((m = re.exec(String(s)))) out.push(m[1]); return out; };
  const ent = (s) => String(s).replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&amp;/g, '&');
  function lerNFe(xml) {
    const x = String(xml || '');
    if (!/<(?:\w+:)?infNFe[\s>]/.test(x)) throw new Error('O arquivo não parece um XML de NF-e.');
    const emit = tag(x, 'emit'), ide = tag(x, 'ide');
    const itens = tags(x, 'det').map((d) => { const p = tag(d, 'prod'); return { cProd: ent(tag(p, 'cProd')), descricao: ent(tag(p, 'xProd')), unidade: ent(tag(p, 'uCom')).toLowerCase(), qtd: r3(tag(p, 'qCom')), custo: r2(tag(p, 'vUnCom')), total: r2(tag(p, 'vProd')), ean: tag(p, 'cEAN') }; }).filter((i) => i.descricao && i.qtd > 0);
    if (!itens.length) throw new Error('A nota não tem itens.');
    const dups = tags(x, 'dup').map((d) => ({ numero: tag(d, 'nDup'), vencimento: tag(d, 'dVenc').slice(0, 10), valor: r2(tag(d, 'vDup')) }));
    return { numero: tag(ide, 'nNF'), serie: tag(ide, 'serie'), data: (tag(ide, 'dhEmi') || tag(ide, 'dEmi')).slice(0, 10), fornecedor: { nome: ent(tag(emit, 'xNome')), documento: tag(emit, 'CNPJ') || tag(emit, 'CPF'), cidade: ent(tag(tag(emit, 'enderEmit'), 'xMun')) },
      itens, frete: r2(tag(tag(x, 'ICMSTot'), 'vFrete')), total: r2(tag(tag(x, 'ICMSTot'), 'vNF')), duplicatas: dups };
  }
  // liga cada item da nota a uma peça do catálogo (código do fabricante, SKU ou descrição); sem par = sugere cadastrar
  function casarNFe(est, nfe) {
    const cat = ativas(est);
    return nfe.itens.map((i) => {
      const c = normal(i.cProd), d = normal(i.descricao);
      const p = cat.find((x) => c && (normal(x.codFab) === c || normal(x.sku) === c)) || cat.find((x) => d && normal(x.descricao) === d) || null;
      return Object.assign({}, i, { peca: p ? p.id : '', como: p ? (c && (normal(p.codFab) === c || normal(p.sku) === c) ? 'código' : 'descrição') : '' });
    });
  }

  // ---------- resumo (cartão da entrada) e permissões ----------
  function resumo(est, opts = {}) {
    const e = estoque(est, opts), ab = abaixoMinimo(est, opts);
    return { itens: e.filter((x) => x.qtd > 0).length, valor: r2(e.reduce((s, x) => s + Math.max(0, x.valor), 0)), abaixo: ab.length, negativos: e.filter((x) => x.qtd < 0).length, pedidosAbertos: garantir(est).pedidos.filter((p) => p.status === 'aberto').length };
  }
  const podeVer = (perfil) => ['dono', 'gerente', 'oficina', 'financeiro', 'auditor'].includes(perfil);
  const podeEditar = (perfil) => ['dono', 'gerente', 'oficina', 'financeiro'].includes(perfil);
  const podeAjustar = (perfil) => ['dono', 'gerente'].includes(perfil); // inventário com ajuste e catálogo de preços

  raiz.PECAS = { UNIDADES, ORIGENS, r2, r3, somarDias, diasEntre, normal, vazio, garantir, ativas, peca, nomePeca, proximoSku, salvarPeca, compativel, buscar,
    replay, posicao, estoque, saida, transferir, entradaCompra, vendaBalcao, inventario, abaixoMinimo, pedidoSugerido, criarPedido, cancelarPedido, textoPedido,
    curvaABC, lerNFe, casarNFe, resumo, podeVer, podeEditar, podeAjustar, novoId, movimento: mov };
})(typeof window !== 'undefined' ? window : globalThis);
