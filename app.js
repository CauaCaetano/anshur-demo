(function () {
  const A = window.ANSHUR, M = window.MOTOR, G = window.GRAFICOS, K = window.COMUM;
  const { C, real, mil, pct, esc, data, diasDesde, diasEntre, hojeISO, NOMES, FICHA, estado } = K;
  const tela = document.getElementById('tela');
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  // ---------- cabeçalho ----------
  $('#marca').innerHTML = '<img class="logo-img" src="logo/anshur-logo.png?v=5" alt="Anshur" width="216" height="54">';
  $('#marca-movel').innerHTML = '<img class="logo-img" src="logo/anshur-logo.png?v=5" alt="Anshur" width="132" height="33">';
  $('#revenda').innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 20V9l9-5 9 5v11M7 20v-6h10v6"/></svg>${esc(A.revenda.nome)}`;
  $('#refdata').innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16v14H4zM4 10h16M8 3v4M16 3v4"/></svg>${new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).replace('.', '')}`;
  const btnPerfil = $('#perfil'), menuPerfil = $('#perfil-menu');
  btnPerfil.onclick = (e) => { e.stopPropagation(); const ab = menuPerfil.hidden; menuPerfil.hidden = !ab; btnPerfil.setAttribute('aria-expanded', ab); };
  document.addEventListener('click', (e) => { if (!menuPerfil.hidden && !menuPerfil.contains(e.target)) { menuPerfil.hidden = true; btnPerfil.setAttribute('aria-expanded', 'false'); } });
  const OP = K.ambiente === 'op';
  $('.selo-demo').textContent = OP ? 'Minha revenda' : 'Dados demonstrativos';
  $('.lateral-rodape').textContent = OP ? 'Dados reais da sua revenda, guardados só neste navegador.' : 'Dados demonstrativos de uma revenda fictícia.';
  menuPerfil.innerHTML = `<p><b>${OP ? esc(A.revenda.nome) : 'Seu Antônio'}</b><span>${OP ? 'Ambiente com dados reais' : 'Proprietário · ' + esc(A.revenda.nome)}</span></p>
    <button type="button" role="menuitem" id="m-premissas">Premissas da revenda</button>
    <button type="button" role="menuitem" id="m-seg">Segurança dos dados</button>
    <button type="button" role="menuitem" id="m-ambiente">${OP ? 'Voltar para a demonstração' : 'Usar com os dados da minha revenda'}</button>
    ${OP ? '<button type="button" role="menuitem" id="m-nome">Nome da revenda</button><button type="button" role="menuitem" id="m-apagar">Apagar dados da minha revenda</button>' : '<button type="button" role="menuitem" id="m-restaurar">Restaurar dados demonstrativos</button>'}`;
  const fechaMenu = () => { menuPerfil.hidden = true; btnPerfil.setAttribute('aria-expanded', 'false'); };
  $('#m-premissas').onclick = () => { fechaMenu(); abrirPremissas(); };
  $('#m-seg').onclick = () => { fechaMenu(); abrirCamada('modal', `<h2>Segurança dos dados</h2>
      <p class="sub" style="margin-bottom:12px">O que acontece hoje com os seus números, sem promessa além do que existe.</p>
      <ul style="margin:0;padding-left:20px;display:grid;gap:8px;font-size:16px">
        <li><b>Nesta versão, nada sai do seu computador.</b> Planilhas importadas, avaliações e trocas ficam guardadas só neste navegador.</li>
        <li>A demonstração e o ambiente com os dados da sua revenda são separados e não se misturam.</li>
        <li>Você pode apagar os dados da sua revenda a qualquer momento pelo menu do perfil.</li>
        <li>As planilhas exportadas são suas: dá para levar os dados para outro sistema quando quiser.</li>
      </ul>`); };
  $('#m-ambiente').onclick = () => { fechaMenu(); confirmar(OP ? 'Voltar para a demonstração?' : 'Usar com os dados da sua revenda?', OP ? 'Seus dados continuam guardados neste navegador; você pode voltar quando quiser.' : 'Abre um ambiente separado, vazio, para importar o histórico real de trocas. A demonstração não se mistura com ele.', 'Trocar', () => { K.repo.trocarAmbiente(OP ? 'demo' : 'op'); location.hash = OP ? '#visao' : '#teste'; location.reload(); }); };
  if (OP) {
    $('#m-nome').onclick = () => { fechaMenu(); abrirCamada('modal', `<h2>Nome da revenda</h2><div class="campos" style="margin-top:12px"><div class="campo"><label for="n-nome">Nome</label><input id="n-nome" value="${esc(estado.nomeRevenda || '')}"></div><div class="campo"><label for="n-cid">Cidade</label><input id="n-cid" value="${esc(estado.cidadeRevenda || '')}"></div></div><div class="acoes"><button class="btn btn-ouro" type="button" id="n-ok">Salvar</button></div>`, (c) => { $('#n-ok', c).onclick = () => { estado.nomeRevenda = $('#n-nome', c).value.trim(); estado.cidadeRevenda = $('#n-cid', c).value.trim(); salvar(); location.reload(); }; }); };
    $('#m-apagar').onclick = () => { fechaMenu(); confirmar('Apagar os dados da sua revenda?', 'Remove deste navegador o histórico importado, as avaliações e as trocas registradas no ambiente real. Não dá para desfazer.', 'Apagar', () => { K.repo.apagar('op'); location.reload(); }); };
  } else {
    $('#m-restaurar').onclick = () => { fechaMenu(); confirmar('Restaurar dados demonstrativos?', 'As avaliações, trocas fechadas, vendas e preços alterados nesta demonstração serão apagados deste navegador.', 'Restaurar', () => { K.restaurar(); location.hash = '#visao'; location.reload(); }); };
  }
  function abrirPremissas() {
    const cfg = K.cfg;
    abrirCamada('modal', `<h2>Premissas da revenda</h2><p class="sub">São decisões comerciais da revenda, não resultados garantidos. Mudam os cálculos de todas as telas a partir de agora; avaliações já registradas guardam as premissas do dia.</p>
      <div class="campo" style="margin-top:16px"><label for="p-margem">Margem-alvo na troca: <b id="p-mv">${pct(cfg.margemAlvo, 0)}</b></label><input class="deslizar" id="p-margem" type="range" min="8" max="22" step="1" value="${Math.round(cfg.margemAlvo * 100)}"></div>
      <div class="campo" style="margin-top:14px"><label for="p-juros">Custo do capital: <b id="p-jv">${pct(cfg.jurosMes)}</b> ao mês</label><input class="deslizar" id="p-juros" type="range" min="0.5" max="3" step="0.1" value="${(cfg.jurosMes * 100).toFixed(1)}"><span class="ajuda">Taxa que a revenda paga ou deixa de ganhar com o dinheiro parado (ex.: CDI, capital de giro, floor plan).</span></div>
      <div class="campo" style="margin-top:14px"><label for="p-base">Base do custo do capital</label><select id="p-base"><option value="aquisicao" ${cfg.baseJuros === 'aquisicao' ? 'selected' : ''}>Valor pago na troca</option><option value="total" ${cfg.baseJuros === 'total' ? 'selected' : ''}>Valor pago + preparação</option></select></div>
      <p class="conta">Custo do capital por máquina = base × taxa mensal × dias no pátio ÷ 30. É uma estimativa de custo de oportunidade: não entra no custo da máquina nem é prejuízo realizado.</p>
      <div class="campos" style="margin-top:14px"><div class="campo"><label for="p-com">Comissão do vendedor (% da venda do usado)</label><input id="p-com" inputmode="decimal" value="${(cfg.comissaoPct * 100).toLocaleString('pt-BR')}"></div>
      <div class="campo"><label for="p-desc">Parte do valor pago acima do recomendado que sai da comissão (%)</label><input id="p-desc" inputmode="numeric" value="${Math.round(cfg.descontoAcima * 100)}"></div>
      <div class="campo"><label for="p-hora">Valor da hora da oficina (R$)</label><input id="p-hora" inputmode="numeric" value="${cfg.valorHora}"></div></div>
      <div class="acoes"><button class="btn btn-ouro" type="button" id="p-ok">Aplicar</button><button class="btn btn-linha" type="button" id="p-pad">Voltar ao padrão</button></div>`, (c) => {
      const m = $('#p-margem', c), j = $('#p-juros', c);
      m.oninput = () => { $('#p-mv', c).textContent = m.value + '%'; }; j.oninput = () => { $('#p-jv', c).textContent = String(j.value).replace('.', ',') + '%'; };
      const aplicar = (v) => { Object.assign(cfg, v); A.margemAlvo = cfg.margemAlvo; estado.config = { margemAlvo: cfg.margemAlvo, jurosMes: cfg.jurosMes, baseJuros: cfg.baseJuros, comissaoPct: cfg.comissaoPct, descontoAcima: cfg.descontoAcima, valorHora: cfg.valorHora }; delete estado.margem; salvar(); cacheLimpa(); fecharCamada(); toast('Premissas aplicadas.'); rota(); };
      $('#p-ok', c).onclick = () => aplicar({ margemAlvo: +m.value / 100, jurosMes: +j.value / 100, baseJuros: $('#p-base', c).value, comissaoPct: Math.max(0, num($('#p-com', c).value)) / 100, descontoAcima: Math.min(100, Math.max(0, num($('#p-desc', c).value))) / 100, valorHora: Math.max(0, num($('#p-hora', c).value)) || K.PADRAO.valorHora });
      $('#p-pad', c).onclick = () => aplicar({ ...K.PADRAO });
    });
  }

  // ---------- utilidades de interface ----------
  function toast(msg, erro) {
    const t = document.createElement('div'); t.className = 'toast' + (erro ? ' erro' : ''); t.setAttribute('role', erro ? 'alert' : 'status'); t.textContent = msg;
    $('#toasts').appendChild(t); setTimeout(() => { t.classList.add('saindo'); setTimeout(() => t.remove(), 220); }, 3200);
  }
  document.addEventListener('pointerdown', (e) => {
    const b = e.target.closest('.btn'); if (!b) return;
    const r = b.getBoundingClientRect(), o = document.createElement('span'), d = Math.max(r.width, r.height);
    o.className = 'onda'; o.style.cssText = `width:${d}px;height:${d}px;left:${e.clientX - r.left - d / 2}px;top:${e.clientY - r.top - d / 2}px`;
    b.appendChild(o); setTimeout(() => o.remove(), 520);
  });
  const reduzido = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FMT = { mil, pct: (v) => pct(v), int: (v) => Math.round(v).toLocaleString('pt-BR'), real, dias: (v) => Math.round(v) + ' dias' };
  function contar(raiz = tela) {
    $$('[data-conta]', raiz).forEach((el) => {
      const alvo = +el.dataset.conta, f = FMT[el.dataset.fmt || 'int'];
      if (reduzido) { el.textContent = f(alvo); return; }
      const t0 = performance.now(), dur = 800;
      const passo = (t) => { const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3); el.textContent = f(alvo * e); if (k < 1) requestAnimationFrame(passo); };
      requestAnimationFrame(passo);
      setTimeout(() => { el.textContent = f(alvo); }, dur + 150); // garante o número final mesmo com a aba em segundo plano
    });
  }
  const conta = (v, fmt) => `<span data-conta="${v}" data-fmt="${fmt}">${FMT[fmt](0)}</span>`;

  // modal e gaveta
  let fecharAtual = null;
  function abrirCamada(tipo, conteudo, aoAbrir) {
    fecharCamada(true);
    const camada = $('#camada');
    camada.innerHTML = `<div class="fundo-camada"></div><div class="${tipo}" role="dialog" aria-modal="true" tabindex="-1"><button class="fechar" type="button" aria-label="Fechar">×</button>${conteudo}</div>`;
    const fundo = camada.firstElementChild, caixa = fundo.nextElementSibling, antes = document.activeElement;
    requestAnimationFrame(() => { fundo.classList.add('aberta'); caixa.classList.add('aberta'); });
    const esc_ = (e) => { if (e.key === 'Escape') fecharCamada(); };
    document.addEventListener('keydown', esc_);
    fecharAtual = () => { document.removeEventListener('keydown', esc_); fundo.classList.remove('aberta'); caixa.classList.remove('aberta'); setTimeout(() => { if (camada.contains(caixa)) camada.innerHTML = ''; }, 280); if (antes && antes.focus) antes.focus(); };
    fundo.onclick = () => fecharCamada(); $('.fechar', caixa).onclick = () => fecharCamada();
    setTimeout(() => (caixa.querySelector('input,select,button:not(.fechar)') || caixa).focus(), 60);
    if (aoAbrir) aoAbrir(caixa);
    return caixa;
  }
  function fecharCamada(imediato) {
    if (!fecharAtual) return; const f = fecharAtual; fecharAtual = null;
    if (imediato) { $('#camada').innerHTML = ''; } else f();
  }
  function confirmar(titulo, texto, botao, aoConfirmar) {
    abrirCamada('modal', `<h2>${esc(titulo)}</h2><p class="sub">${esc(texto)}</p><div class="acoes"><button class="btn btn-ouro" type="button" id="sim">${esc(botao)}</button><button class="btn btn-linha" type="button" id="nao">Cancelar</button></div>`, (c) => {
      $('#sim', c).onclick = () => { fecharCamada(); aoConfirmar(); };
      $('#nao', c).onclick = () => fecharCamada();
    });
  }
  function baixarCSV(nome, linhas) {
    const csv = '﻿' + linhas.map((l) => l.map((c) => { const s = String(c ?? ''); return /[;"\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }).join(';')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = nome; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast('Planilha gerada: ' + nome);
  }
  const salvar = () => { if (!K.gravar(estado)) toast('Não foi possível salvar neste navegador.', true); };

  // ---------- contas ----------
  const recCache = new Map();
  const cacheLimpa = () => recCache.clear();
  // estimativa de hoje para máquinas do pátio (aprende com tudo que já foi vendido)
  const recHoje = (t) => { const k = 'h' + t.id + '|' + A.margemAlvo; if (!recCache.has(k)) recCache.set(k, M.avaliar(t, { excluir: t.id })); return recCache.get(k); };
  // o que o Anshur teria dito no dia da troca: só com vendas concluídas antes daquela data (sem vazamento)
  const recEpoca = (t) => {
    const k = 'e' + t.id + '|' + A.margemAlvo;
    if (!recCache.has(k)) recCache.set(k, t.previsto ? { ...t.previsto, registrado: true } : M.avaliar(t, { excluir: t.id, ate: t.entrada, semValidacao: true }));
    return recCache.get(k);
  };
  const rec = recEpoca;

  function infoPatio(t) {
    const dias = diasDesde(t.entrada), r = recHoje(t), custo = C.custo(t);
    const venda = r ? r.venda : t.anuncio;
    const margem = C.margemProjetada(venda, custo);
    const faixa = C.faixaIdade(dias);
    const juros = C.custoFinanceiro(t, dias);
    let acao = 'Acompanhar';
    if (dias > 90 && margem < 0.06) acao = 'Priorizar venda: margem já baixa';
    else if (t.anuncio > venda * 1.06 && dias > 45) acao = 'Revisar preço de venda';
    else if (t.preparoEst && t.preparo > t.preparoEst * 1.4) acao = 'Revisar custo de preparação';
    else if (dias > 90) acao = 'Priorizar negociação';
    else if (dias > 60) acao = 'Revisar anúncio e divulgação';
    const risco = custo * (dias / 90) * (1 + Math.max(0, 0.12 - margem) * 6);
    return { t, dias, venda, custo, margem, faixa, juros, acao, risco };
  }

  // ---------- VISÃO GERAL ----------
  // ícones de traço (mesma espessura em todo o sistema)
  const ic = (d, cls = 'ico') => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
  const ICO = {
    moedas: ic('<ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6"/>'),
    pct: ic('<circle cx="12" cy="12" r="9"/><path d="M8.5 15.5l7-7"/><circle cx="9" cy="9" r="1.2"/><circle cx="15" cy="15" r="1.2"/>'),
    barras: ic('<path d="M4 20h16M7 16v-5M11 16V7M15 16v-7M19 16V5"/>'),
    alerta: ic('<path d="M12 3 2 20h20L12 3zM12 10v4M12 17v.5"/>'),
    linha: ic('<path d="M3 17l6-6 4 4 8-8M15 7h6v6"/>'),
    camadas: ic('<path d="M12 3 2 8l10 5 10-5-10-5zM2 13l10 5 10-5"/>'),
    alvo: ic('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/>'),
    etiqueta: ic('<path d="M3 12V4h8l10 10-8 8L3 12z"/><circle cx="7.5" cy="7.5" r="1.4"/>'),
    alto: ic('<circle cx="12" cy="12" r="9"/><path d="M12 7v6M12 16v.5"/>'),
    medio: ic('<path d="M12 3 2 20h20L12 3zM12 10v4M12 17v.5"/>'),
    baixo: ic('<circle cx="12" cy="12" r="9"/><path d="M8 12.5l2.5 2.5L16 9.5"/>'),
    trator: ic('<path d="M5 17V9h7l2 4h4v4"/><path d="M8 9V6"/><circle cx="8" cy="17" r="3"/><circle cx="18" cy="18" r="2"/>', 'ico maq-svg'),
    colhedora: ic('<path d="M2 16h14V9H9l-2 3H2z"/><path d="M16 11l5-5M19 6h3"/><circle cx="6" cy="17.5" r="2.5"/><circle cx="13" cy="17.5" r="2.5"/>', 'ico maq-svg'),
    pulverizador: ic('<path d="M4 15V8h6l2 3h6v4z"/><path d="M1 13h22M3 13v2M21 13v2"/><circle cx="7" cy="17" r="2.5"/><circle cx="16" cy="17" r="2.5"/>', 'ico maq-svg'),
    plantadeira: ic('<path d="M2 9h20M3 9l2-3h14l2 3M5 9v6M10 9v6M15 9v6M20 9v6"/><circle cx="5" cy="17" r="1.6"/><circle cx="10" cy="17" r="1.6"/><circle cx="15" cy="17" r="1.6"/><circle cx="20" cy="17" r="1.6"/>', 'ico maq-svg')
  };
  const VENDEDORES = () => { const l = [...new Set(A.trocas.map((t) => t.vendedor).filter((v) => v && !/Avalia|demonstra/i.test(v)))].sort(); return l.length ? l : ['Gerente de usados']; };
  // calendário agrícola da região (cana, soja e milho no nordeste paulista): quando cada tipo de máquina costuma ter procura
  const SAFRA = {
    colhedora: { janela: 'janeiro a março', motivo: 'usinas e fornecedores fecham frota antes da safra da cana, que começa em abril', meses: [0, 1, 2] },
    pulverizador: { janela: 'julho a setembro', motivo: 'preparação para o plantio da soja e para os tratos da cana', meses: [6, 7, 8] },
    plantadeira: { janela: 'julho a setembro', motivo: 'o plantio da soja começa com as chuvas, a partir de setembro', meses: [6, 7, 8] },
    trator: { janela: 'março a junho e agosto a outubro', motivo: 'colheita e preparo de solo puxam a procura em duas épocas', meses: [2, 3, 4, 5, 7, 8, 9] }
  };
  const janelaVenda = (tipo) => { const s = SAFRA[tipo]; if (!s) return ''; const m = new Date().getMonth(); return s.meses.includes(m) ? `Estamos na melhor época para vender (${s.janela}): ${s.motivo}.` : `Melhor época para vender: ${s.janela}, porque ${s.motivo}.`; };

  // risco em 3 níveis, com cor + ícone + texto
  const nivelRisco = (i) => (i.dias > 90 || i.margem < 0.06 ? { nome: 'Alto', cls: 'alto', ico: ICO.alto } : i.dias > 60 || i.margem < 0.10 ? { nome: 'Médio', cls: 'medio', ico: ICO.medio } : { nome: 'Baixo', cls: 'baixo', ico: ICO.baixo });

  function semDados() {
    tela.innerHTML = `<div class="titulo"><div><h1>Bem-vindo ao Anshur</h1><p>Este é o ambiente com os dados reais da sua revenda. Ele começa vazio e não se mistura com a demonstração.</p></div></div>
      <section class="painel"><h2>Comece pelo histórico de trocas</h2><p class="sub" style="margin:6px 0 14px">Importe de 10 a 200 trocas já vendidas (planilha do Excel ou CSV do seu sistema). O Anshur aprende com elas, mede o próprio erro e passa a avaliar as próximas trocas. Os dados ficam só neste navegador.</p>
      <div class="acoes"><a class="btn btn-ouro" href="#teste">Importar histórico</a><button class="btn btn-linha" type="button" id="volta-demo">Ver a demonstração</button></div></section>`;
    $('#volta-demo').onclick = () => { K.repo.trocarAmbiente('demo'); location.reload(); };
  }

  function telaVisao() {
    if (!A.trocas.length) return semDados();
    const itens = C.patio().map(infoPatio);
    const vendidas = C.vendidas();
    const capital = itens.reduce((s, i) => s + i.t.pago, 0);
    const resultadoEst = itens.reduce((s, i) => s + i.venda - i.custo, 0);
    const margemReal = vendidas.reduce((s, t) => s + C.margem(t), 0) / Math.max(1, vendidas.length);
    const velhos = itens.filter((i) => i.dias > 90);
    const capVelho = velhos.reduce((s, i) => s + i.t.pago, 0);

    // capital imobilizado no fim de cada um dos últimos 6 meses
    const meses = [];
    for (let k = 5; k >= 0; k--) {
      const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - k + 1); d.setDate(0);
      const fim = k === 0 ? hojeISO() : d.toISOString().slice(0, 10);
      const v = A.trocas.filter((t) => t.entrada <= fim && (!t.saida || t.saida > fim)).reduce((s, t) => s + t.pago, 0);
      meses.push({ r: new Date(fim + 'T12:00:00').toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''), v });
    }
    // margem prevista x realizada nos meses com venda
    const porMes = {};
    vendidas.forEach((t) => { const k = t.saida.slice(0, 7); (porMes[k] = porMes[k] || []).push(t); });
    const ult = Object.keys(porMes).sort().slice(-6).map((k) => {
      // só entram vendas que tinham previsão na data da troca (validação temporal)
      const ts = porMes[k].filter((t) => rec(t));
      if (!ts.length) return null;
      const prev = ts.reduce((s, t) => { const r = rec(t); return s + C.margemProjetada(r.venda, t.pago + (r.preparo || t.preparoEst || t.preparo)); }, 0) / ts.length;
      const realz = ts.reduce((s, t) => s + C.margem(t), 0) / ts.length;
      return { r: new Date(k + '-15T12:00:00').toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '') + ` (${ts.length})`, a: prev, b: realz };
    }).filter(Boolean);
    const custoCap = itens.reduce((s, i) => s + i.juros, 0);
    const faixas = ['normal', 'atencao', 'alerta', 'critico'];
    const nomesF = { normal: '0–30 dias', atencao: '31–60 dias', alerta: '61–90 dias', critico: '+90 dias' };
    const idade = faixas.map((f) => { const g = itens.filter((i) => i.faixa === f); return { r: nomesF[f], v: g.reduce((s, i) => s + i.t.pago, 0), cls: f, extra: `${g.length} ${g.length === 1 ? 'máquina' : 'máquinas'}` }; });
    const agir = itens.slice().sort((a, b) => b.risco - a.risco).slice(0, 6);

    const coresIdade = { normal: '#3E6B57', atencao: '#71877B', alerta: '#E2D6BF', critico: '#C1A36A' };
    const nomesRosca = { normal: 'Até 30 dias', atencao: '31 a 60 dias', alerta: '61 a 90 dias', critico: 'Acima de 90 dias' };
    tela.innerHTML = `
      <div class="titulo"><div><h1>Visão geral da revenda</h1><p>Onde está o seu dinheiro e o que fazer hoje.</p></div>
        <div class="acoes"><a class="btn btn-linha" href="#patio">Ver pátio completo</a><button class="btn btn-linha" type="button" id="premissas-v">Premissas</button></div></div>
      <div class="kpis escalonado">
        <a class="kpi k-marfim" href="#patio"><span class="rot">${ICO.moedas}Capital imobilizado</span><span class="val">${conta(capital, 'mil')}</span><span class="exp">Pago nas ${itens.length} máquinas do pátio</span></a>
        <a class="kpi k-salvia" href="#trocas"><span class="rot">${ICO.pct}Margem média realizada</span><span class="val">${conta(margemReal, 'pct')}</span><span class="exp">Nas ${vendidas.length} trocas vendidas</span></a>
        <a class="kpi k-marfim" href="#trocas"><span class="rot">${ICO.barras}Resultado bruto do estoque</span><span class="val">${conta(resultadoEst, 'mil')}</span><span class="exp">Estimativa, não lucro garantido</span></a>
        <a class="kpi k-risco" href="#patio" id="kpi-90"><span class="rot">${ICO.alerta}Acima de 90 dias</span><span class="val">${conta(velhos.length, 'int')} ${velhos.length === 1 ? 'máquina' : 'máquinas'}</span><span class="pilula">${mil(capVelho)}</span></a>
      </div>
      <p class="conta" style="margin:-4px 0 16px">Custo financeiro estimado do estoque: <b>${mil(custoCap)}</b> até hoje (${pct(K.cfg.jurosMes)} ao mês sobre ${K.cfg.baseJuros === 'total' ? 'valor pago + preparação' : 'o valor pago'}, proporcional aos dias de cada máquina). É custo de oportunidade, não prejuízo realizado. <button class="link" type="button" id="premissas-v2">Alterar premissa</button></p>
      <div class="grade-2">
        <section class="painel"><div class="painel-cab"><h2>${ICO.linha}Capital imobilizado nos últimos 6 meses</h2></div>${G.linha(meses)}</section>
        <section class="painel"><div class="painel-cab"><h2>${ICO.camadas}Idade do estoque <small>(por valor)</small></h2></div>${G.rosca(idade.map((x) => ({ r: nomesRosca[x.cls], v: x.v, cor: coresIdade[x.cls] })))}</section>
      </div>
      <section class="painel bloco"><div class="painel-cab"><h2>Margem prevista x realizada</h2><p>Por mês de venda (nº de vendas)</p></div>
        ${ult.length ? G.barrasDuplas(ult, ['Prevista', 'Realizada'], { largura: innerWidth >= 960 ? 1100 : 560, altura: 200 }) : '<p class="vazio">Ainda não há vendas com previsão feita antes da troca.</p>'}
        <div class="legenda"><span><i style="background:#B9C2BC"></i>Prevista pelo Anshur na entrada</span><span><i style="background:var(--ouro)"></i>Realizada na venda</span></div>
      </section>
      <section class="painel bloco agir"><div class="painel-cab"><div><h2>${ICO.alvo}Onde você precisa agir</h2><p>${agir.length} máquinas que mais pesam no seu capital hoje</p></div></div>
        <div class="tabela-wrap"><table class="tabela grande"><thead><tr><th>Máquina</th><th>Idade (dias)</th><th class="n">Capital preso</th><th class="n">Margem estimada</th><th>Risco</th><th>Recomendação</th></tr></thead>
        <tbody>${agir.map((i) => { const nv = nivelRisco(i); return `<tr class="clicavel" tabindex="0" data-id="${i.t.id}"><td class="maq"><span class="maq-ico">${ICO[i.t.tipo]}</span><span><b>${esc(NOMES[i.t.tipo].split(' ')[0] + ' ' + i.t.marca + ' ' + i.t.modelo)}</b><span>${i.t.ano} · ${i.t.horas.toLocaleString('pt-BR')} h</span></span></td>
          <td><span class="dias ${i.faixa}">${i.dias} dias</span></td><td class="n forte">${mil(i.t.pago)}</td><td class="n ${i.margem < 0.06 ? 'neg' : ''}">${pct(i.margem)}</td><td><span class="risco ${nv.cls}">${nv.ico}${nv.nome}</span></td><td><span class="reco">${ICO.etiqueta}${esc(i.acao)}</span></td></tr>`; }).join('')}</tbody></table></div>
      </section>`;
    $$('tr.clicavel', tela).forEach((tr) => { const abre = () => detalheMaquina(tr.dataset.id); tr.onclick = abre; tr.onkeydown = (e) => { if (e.key === 'Enter') abre(); }; });
    $('#premissas-v').onclick = abrirPremissas; $('#premissas-v2').onclick = abrirPremissas;
    $('#kpi-90').onclick = () => { fp.idade = 'critico'; };
    contar();
  }

  // ---------- AVALIAR ----------
  const anoAtual = new Date().getFullYear();
  const av = { passo: 1, tipo: 'trator', marca: 'Massey Ferguson', modelo: 'MF 4709', ano: anoAtual - 5, horas: 3900, local: 'Orlândia, SP', obs: '',
    ficha: { motor: 4, transmissao: 4, hidraulico: 3, pneus: 2, cabine: 4, lataria: 3 }, fotos: [], verif: { horimetro: false, notas: false, chassi: false }, declarado: '', fipe: '', anuncios: ['', '', ''] };
  const condDe = (f) => Math.round(FICHA.reduce((s, [k]) => s + f[k], 0) / FICHA.length * 20);
  const maqAv = () => ({ tipo: av.tipo, marca: av.marca, modelo: av.modelo, ano: av.ano, horas: av.horas, cond: condDe(av.ficha), ficha: { ...av.ficha } });
  const num = (s) => { const v = parseFloat(String(s).replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.')); return isFinite(v) ? v : 0; };

  function telaAvaliar() {
    const nomesPasso = ['Identificação', 'Inspeção', 'Evidências', 'Resultado'];
    tela.innerHTML = `
      <div class="titulo"><div><h1>Avaliar troca</h1><p>Quanto vale pagar no usado que o cliente oferece, com base nas trocas que a ${esc(A.revenda.nome)} já vendeu.</p></div></div>
      <nav class="etapas" aria-label="Etapas da avaliação">${nomesPasso.map((n, i) => `<button type="button" data-p="${i + 1}" ${av.passo === i + 1 ? 'aria-current="step"' : ''} class="${av.passo > i + 1 ? 'feita' : ''}">${n}</button>`).join('')}</nav>
      <div id="passo"></div>
      ${estado.avaliacoes.length ? `<section class="painel bloco"><div class="painel-cab"><h2>Avaliações registradas</h2><p>${estado.avaliacoes.length} nesta demonstração</p></div>
        <div class="tabela-wrap"><table class="tabela"><thead><tr><th>Data</th><th>Máquina</th><th class="n">Valor máximo</th><th class="n">Venda estimada</th></tr></thead><tbody>
        ${estado.avaliacoes.slice().reverse().map((a) => `<tr><td>${data(a.data)}</td><td class="maq"><b>${esc(a.maq.marca + ' ' + a.maq.modelo)}</b><span>${a.maq.ano} · ${a.maq.horas.toLocaleString('pt-BR')} h</span></td><td class="n">${mil(a.teto)}</td><td class="n">${mil(a.venda)}</td></tr>`).join('')}</tbody></table></div></section>` : ''}`;
    $$('.etapas button', tela).forEach((b) => b.onclick = () => irPasso(+b.dataset.p));
    desenharPasso();
  }
  function irPasso(p) {
    if (p > 1 && !(av.horas > 0)) { av.passo = 1; desenharPasso(); toast('Informe as horas do horímetro para continuar.', true); return; }
    av.passo = p;
    $$('.etapas button', tela).forEach((b) => { const n = +b.dataset.p; b.classList.toggle('feita', n < p); if (n === p) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current'); });
    desenharPasso(); window.scrollTo({ top: 0, behavior: reduzido ? 'auto' : 'smooth' });
  }
  const navPasso = (ultimo) => `<div class="acoes">${av.passo > 1 ? '<button class="btn btn-linha" type="button" data-ir="-1">Voltar</button>' : ''}${ultimo ? '' : '<button class="btn btn-ouro" type="button" data-ir="1">Continuar</button>'}</div>`;

  function desenharPasso() {
    const caixa = $('#passo'); if (!caixa) return;
    const tipos = Object.keys(NOMES);
    const marcas = [...new Set(A.modelos.filter((m) => m.tipo === av.tipo).map((m) => m.marca))];
    if (!marcas.includes(av.marca)) av.marca = marcas[0];
    const modelos = A.modelos.filter((m) => m.tipo === av.tipo && m.marca === av.marca);
    if (!modelos.some((m) => m.modelo === av.modelo)) av.modelo = modelos[0].modelo;
    const anos = []; for (let a = anoAtual; a >= anoAtual - 15; a--) anos.push(a);
    let h = '';
    if (av.passo === 1) h = `<section class="painel passo"><h2>Identificação da máquina</h2><div class="campos tres" style="margin-top:14px">
        <div class="campo"><label for="f-tipo">Categoria</label><select id="f-tipo">${tipos.map((k) => `<option value="${k}" ${k === av.tipo ? 'selected' : ''}>${NOMES[k]}</option>`).join('')}</select></div>
        <div class="campo"><label for="f-marca">Fabricante</label><select id="f-marca">${marcas.map((m) => `<option ${m === av.marca ? 'selected' : ''}>${esc(m)}</option>`).join('')}</select></div>
        <div class="campo"><label for="f-modelo">Modelo</label><select id="f-modelo">${modelos.map((m) => `<option ${m.modelo === av.modelo ? 'selected' : ''}>${esc(m.modelo)}</option>`).join('')}</select></div>
        <div class="campo"><label for="f-ano">Ano</label><select id="f-ano">${anos.map((a) => `<option ${a === av.ano ? 'selected' : ''}>${a}</option>`).join('')}</select></div>
        <div class="campo"><label for="f-horas">Horas trabalhadas</label><input id="f-horas" type="number" inputmode="numeric" min="0" step="10" value="${av.horas || ''}" required aria-describedby="e-horas"><span class="erro-campo" id="e-horas"></span></div>
        <div class="campo"><label for="f-local">Localização da máquina</label><input id="f-local" value="${esc(av.local)}" autocomplete="off"></div>
        <div class="campo"><label for="f-nova">Máquina nova desta negociação</label><select id="f-nova"><option value="">Nenhuma / não financiada</option>${(A.financiadas || []).filter((f) => !f.venda).map((f) => `<option value="${f.chassi}" ${av.nova === f.chassi ? 'selected' : ''}>${esc(f.marca + ' ' + f.modelo)} · ${f.chassi}</option>`).join('')}</select></div>
        <div class="campo inteiro"><label for="f-obs">Informações adicionais</label><textarea id="f-obs" rows="2" placeholder="Ex.: piloto automático, pneus novos há 1 safra">${esc(av.obs)}</textarea></div>
      </div>${navPasso()}</section>`;
    if (av.passo === 2) { const c = condDe(av.ficha); h = `<section class="painel passo"><div class="painel-cab"><h2>Inspeção</h2><p>Nota de 1 (ruim) a 5 (ótimo)</p></div>
        <p class="ajuda">Na versão da revenda, a IA lê as fotos e sugere as notas; o avaliador confere e corrige.</p>
        ${FICHA.map(([k, n, d]) => `<div class="criterio"><div><b id="r-${k}">${n}</b><p>${d}</p></div><div class="notas" role="group" aria-labelledby="r-${k}">${[1, 2, 3, 4, 5].map((v) => `<button type="button" data-k="${k}" data-v="${v}" aria-pressed="${av.ficha[k] === v}">${v}</button>`).join('')}</div></div>`).join('')}
        <div style="margin-top:16px"><span class="rot-campo">Nota geral</span> <b id="nota-geral">${c}/100</b><div class="medidor"><i id="medidor" style="width:${c}%"></i></div></div>${navPasso()}</section>`; }
    if (av.passo === 3) h = `<section class="painel passo"><h2>Documentação e evidências</h2>
        <div class="fotos" style="margin-top:14px">${['Frente', 'Lateral', 'Horímetro', 'Pneus'].map((n, i) => `<label class="foto ${av.fotos[i] ? 'tem' : ''}" style="${av.fotos[i] ? `background-image:url(${av.fotos[i]})` : ''}">${n}<input type="file" accept="image/*" capture="environment" data-i="${i}" aria-label="Foto: ${n}"></label>`).join('')}</div>
        <p class="ajuda" style="margin-top:6px">As fotos ficam só neste aparelho.</p>
        <div class="campos" style="margin-top:18px">
          <div class="campo inteiro"><span class="rot-campo">Verificado pela revenda</span><div class="checks">
            <label class="check"><input type="checkbox" data-v="horimetro" ${av.verif.horimetro ? 'checked' : ''}> Horímetro conferido com foto</label>
            <label class="check"><input type="checkbox" data-v="notas" ${av.verif.notas ? 'checked' : ''}> Notas ou ordens de serviço entregues</label>
            <label class="check"><input type="checkbox" data-v="chassi" ${av.verif.chassi ? 'checked' : ''}> Chassi e número de série conferidos</label></div></div>
          <div class="campo inteiro"><label for="f-decl">Declarado pelo cliente (ainda sem comprovante)</label><textarea id="f-decl" rows="2" placeholder="Ex.: motor retificado em 2023, sempre revisado na concessionária">${esc(av.declarado)}</textarea></div>
          <div class="campo"><label for="f-fipe">Tabela Fipe desta máquina (opcional)</label><input id="f-fipe" inputmode="numeric" placeholder="R$" value="${esc(av.fipe)}"></div>
          <div class="campo"><span class="rot-campo">Anúncios parecidos (opcional)</span><div style="display:flex;gap:6px">${av.anuncios.map((a, i) => `<input aria-label="Preço do anúncio ${i + 1}" data-an="${i}" inputmode="numeric" placeholder="R$" value="${esc(a)}" style="min-height:42px;padding:9px;border-radius:6px;border:1px solid rgba(17,24,32,.16);background:var(--marinho);width:100%">`).join('')}</div></div>
        </div>${navPasso()}</section>`;
    if (av.passo === 4) h = `<div class="passo" id="resultado"></div>`;
    caixa.innerHTML = h;
    $$('[data-ir]', caixa).forEach((b) => b.onclick = () => irPasso(av.passo + +b.dataset.ir));
    if (av.passo === 1) {
      $('#f-tipo').onchange = (e) => { av.tipo = e.target.value; desenharPasso(); };
      $('#f-marca').onchange = (e) => { av.marca = e.target.value; desenharPasso(); };
      $('#f-modelo').onchange = (e) => { av.modelo = e.target.value; };
      $('#f-ano').onchange = (e) => { av.ano = +e.target.value; };
      $('#f-horas').oninput = (e) => { av.horas = Math.max(0, +e.target.value || 0); $('#e-horas').textContent = av.horas > 0 ? '' : 'Informe as horas do horímetro.'; };
      $('#f-local').oninput = (e) => { av.local = e.target.value; };
      $('#f-nova').onchange = (e) => { av.nova = e.target.value; };
      $('#f-obs').oninput = (e) => { av.obs = e.target.value; };
    }
    if (av.passo === 2) $$('.notas button', caixa).forEach((b) => b.onclick = () => {
      av.ficha[b.dataset.k] = +b.dataset.v; $$('button', b.parentNode).forEach((x) => x.setAttribute('aria-pressed', x === b));
      const c = condDe(av.ficha); $('#nota-geral').textContent = c + '/100'; $('#medidor').style.width = c + '%';
    });
    if (av.passo === 3) {
      $$('input[type=file]', caixa).forEach((inp) => inp.onchange = () => {
        const arq = inp.files[0]; if (!arq) return;
        const img = new Image(), url = URL.createObjectURL(arq);
        img.onload = () => {
          const cv = document.createElement('canvas'), k = Math.min(1, 640 / Math.max(img.width, img.height));
          cv.width = img.width * k; cv.height = img.height * k; cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
          av.fotos[+inp.dataset.i] = cv.toDataURL('image/jpeg', 0.72); URL.revokeObjectURL(url);
          const lab = inp.parentNode; lab.classList.add('tem'); lab.style.backgroundImage = `url(${av.fotos[+inp.dataset.i]})`;
          toast('Foto adicionada.');
        };
        img.onerror = () => toast('Não foi possível ler essa imagem.', true);
        img.src = url;
      });
      $$('[data-v]', caixa).forEach((c) => c.onchange = () => { av.verif[c.dataset.v] = c.checked; });
      $('#f-decl').oninput = (e) => { av.declarado = e.target.value; };
      $('#f-fipe').oninput = (e) => { av.fipe = e.target.value; };
      $$('[data-an]', caixa).forEach((i) => i.oninput = () => { av.anuncios[+i.dataset.an] = i.value; });
    }
    if (av.passo === 4) desenharResultado();
  }

  function desenharResultado() {
    const maq = maqAv(), r = M.avaliar(maq), caixa = $('#resultado');
    if (!r) { caixa.innerHTML = `<section class="painel vazio">Histórico insuficiente para avaliar esta máquina: são precisas pelo menos ${M.QUALIDADE.minimoTreino} vendas com referência de preço.${OP ? ' <a class="link" href="#teste">Importar histórico</a>' : ''}</section>`; return; }
    const fipe = num(av.fipe), anuncios = av.anuncios.map(num).filter((v) => v > 0);
    const hist = historicoModelo(maq.modelo);
    if (av.reserva && hist.reserva > 0) { r.teto = Math.floor((r.teto - hist.reserva) / 1000) * 1000; r.resultado = r.venda - r.teto - r.preparo; r.margemSobreVenda = r.resultado / r.venda; r.faixa = [Math.min(r.faixa[0], r.teto), r.teto]; }
    const nova = (A.financiadas || []).find((f) => f.chassi === av.nova), jn = nova ? jurosFin(nova) : null;
    const mediaAn = anuncios.length ? anuncios.reduce((s, v) => s + v, 0) / anuncios.length : 0;
    caixa.innerHTML = `
      <div class="grade-2">
        <div>
          <section class="res-topo">
            <span class="rot">VALOR MÁXIMO RECOMENDADO NA TROCA</span>
            <div class="grande">${conta(r.teto, 'real')}</div>
            <p class="sub">Faixa de negociação: ${real(r.faixa[0])} a ${real(r.faixa[1])}</p>
            <span class="conf ${r.confianca}">Qualidade da estimativa: ${r.confianca}</span>
            ${r.confianca === 'baixa' ? '<p class="sub" style="margin-top:8px">Dados insuficientes para uma recomendação confiável. Use como referência e decida com o gerente.</p>' : ''}
          </section>
          ${nova ? `<section class="painel bloco" style="border-color:#F0CFCB;background:#FBEDEB"><h2 style="color:#8E2F2B">${ICO.alerta}Juro do floor plan nesta negociação</h2>
            <p style="font-size:18px;margin-top:8px">${esc(nova.marca + ' ' + nova.modelo)} (${nova.chassi}) está no estoque desde ${data(nova.entrada)}. ${jn.emCarencia ? `Ainda em carência até ${data(jn.inicio)}.` : `Já custou <b class="neg">${real(jn.total)}</b> de juros e soma <b class="neg">${real(nova.valor * nova.taxaMes / 30)} por dia</b>.`}</p>
            <p class="sub" style="margin-top:6px">Cada dia sem fechar esta venda é juro pago ao banco. Use isso na negociação do usado.</p></section>` : ''}
          ${hist.n ? `<section class="painel bloco"><h2>${ICO.etiqueta}Histórico de oficina deste modelo</h2>
            <ul class="lista-motivos" style="margin-top:8px">${hist.defeitos.slice(0, 4).map((d) => `<li><span>${esc(d.servico)} <span class="sub">· ${d.n} ${d.n === 1 ? 'vez' : 'vezes'}</span></span><b>${real(d.media)}</b></li>`).join('') || '<li><span>Nenhum defeito recorrente registrado.</span></li>'}</ul>
            <p class="conta">Nas ${hist.trocas} trocas deste modelo, o preparo passou do previsto em média ${real(hist.reserva)} por máquina.${hist.reserva > 0 ? ` <label class="check" style="margin-top:8px"><input type="checkbox" id="reserva" ${av.reserva ? 'checked' : ''}> Descontar essa reserva de risco do valor máximo</label>` : ''}</p></section>` : ''}
          <section class="painel bloco"><h2>Qualidade dos dados</h2>
            <div class="numeros">
              <div><span>Vendas usadas no cálculo</span><b>${r.base}</b></div>
              <div><span>Do mesmo tipo · mesmo modelo</span><b>${r.doTipo} · ${r.mesmoModelo}</b></div>
              <div><span>Dispersão dos preços</span><b>± ${pct(r.dispersao, 1)}</b></div>
              <div><span>Erro histórico validado</span><b>${r.qualidade && r.qualidade.n >= M.QUALIDADE.minimoValidacao ? pct(r.qualidade.mape) + ' (' + r.qualidade.n + ' testes)' : 'sem amostra'}</b></div>
              <div><span>Erro médio em reais</span><b>${r.qualidade && r.qualidade.n >= M.QUALIDADE.minimoValidacao ? mil(r.qualidade.mae) : '—'}</b></div>
              <div><span>Vendas atípicas excluídas</span><b>${r.atipicas}</b></div>
            </div>
            <p class="nota-rodape">Erro validado: o Anshur previu vendas antigas usando só o que tinha sido vendido antes de cada troca e comparou com o preço real. Alta = 12+ vendas do tipo e erro até 6%; moderada = 8+ vendas e erro até 10%; abaixo disso, baixa.</p>
          </section>
          <section class="painel bloco">
            <div class="numeros">
              <div><span>Venda estimada</span><b>${real(r.venda)}</b></div>
              <div><span>Preparação estimada</span><b>${real(r.preparo)}</b></div>
              <div><span>Resultado bruto projetado</span><b>${real(r.resultado)}</b></div>
              <div><span>Margem sobre a venda</span><b>${pct(r.margemSobreVenda, 2)}</b></div>
              <div><span>Tempo estimado de pátio</span><b>${r.dias ? r.dias + ' dias' : '—'}</b></div>
              <div><span>Margem-alvo (premissa)</span><b>${pct(r.margem, 0)}</b></div>
            </div>
            <p class="conta">Conta: ${real(r.venda)} de venda − ${real(r.teto)} pagos na troca − ${real(r.preparo)} de preparo = ${real(r.resultado)}.</p>
            ${fipe || mediaAn ? `<div class="conta">${fipe ? `Fipe informada: ${real(fipe)}. O valor máximo fica ${pct(1 - r.teto / fipe)} abaixo, porque a troca precisa deixar margem e pagar o preparo. ` : ''}${mediaAn ? `Média de ${anuncios.length} ${anuncios.length === 1 ? 'anúncio' : 'anúncios'}: ${real(mediaAn)}. Anúncio é preço pedido, não preço vendido; a venda estimada fica ${pct(Math.abs(1 - r.venda / mediaAn))} ${r.venda < mediaAn ? 'abaixo' : 'acima'}.` : ''}</div>` : ''}
          </section>
        </div>
        <div>
          <section class="painel"><h2>Por que recomendamos este valor?</h2>
            <ul class="lista-motivos" style="margin-top:10px">
              ${r.motivos.map((m) => `<li><span>${m.nome} comparado às máquinas do mesmo tipo</span><b class="${m.valor >= 0 ? 'pos' : 'neg'}">${m.valor >= 0 ? '+' : '−'} ${mil(Math.abs(m.valor))}</b></li>`).join('')}
              <li><span>Preparação pelo estado da inspeção (${maq.cond}/100)</span><b class="neg">− ${mil(r.preparo)}</b></li>
              <li><span>Margem-alvo da revenda</span><b class="neg">− ${mil(r.venda * r.margem)}</b></li>
            </ul>
            ${r.limites.length ? `<p class="nota-rodape"><b>Limitações:</b> ${r.limites.map(esc).join(' ')}</p>` : ''}
          </section>
          <section class="painel bloco"><h2>Trocas semelhantes já vendidas</h2><div class="comparaveis" style="margin-top:10px">
            ${r.comp.map((t) => `<div class="comp"><div><b>${esc(t.marca + ' ' + t.modelo)} · ${t.ano}</b><span>${t.horas.toLocaleString('pt-BR')} h · pago ${mil(t.pago)} · ${t.diasPatio} dias</span></div><div style="text-align:right"><b>${mil(t.vendido)}</b><span>vendido</span></div></div>`).join('')}
          </div></section>
        </div>
      </div>
      <div class="acoes"><button class="btn btn-linha" type="button" data-ir="-1">Voltar</button><button class="btn btn-linha" type="button" id="registrar">Registrar avaliação</button><button class="btn btn-linha" type="button" id="premissas">Ajustar premissas</button><button class="btn btn-ouro" type="button" id="fechar-troca">Fechar troca</button></div>
      <p class="nota-rodape">O valor máximo é uma recomendação. Quem decide o valor pago é o gerente.</p>`;
    $('[data-ir]', caixa).onclick = () => irPasso(3);
    const res_ = $('#reserva', caixa); if (res_) res_.onchange = () => { av.reserva = res_.checked; desenharResultado(); toast(av.reserva ? 'Reserva de risco descontada do valor máximo.' : 'Reserva de risco retirada.'); };
    $('#registrar').onclick = (e) => {
      const b = e.currentTarget; b.classList.add('carregando');
      // a avaliação congela os números e as premissas do dia: não é recalculada quando o modelo muda
      setTimeout(() => { estado.avaliacoes.push({ id: 'AV' + Date.now(), data: hojeISO(), maq, teto: r.teto, venda: r.venda, preparo: r.preparo, faixa: r.faixa, confianca: r.confianca, amostras: r.base, mape: r.qualidade ? r.qualidade.mape : null, premissas: { margemAlvo: r.margem, jurosMes: K.cfg.jurosMes } }); salvar(); b.classList.remove('carregando'); toast('Avaliação registrada com as premissas de hoje.'); telaAvaliar(); }, 450);
    };
    $('#premissas').onclick = abrirPremissas;
    $('#fechar-troca').onclick = () => abrirCamada('modal', `<h2>Fechar troca</h2><p class="sub">Registre o valor efetivamente negociado. Ele pode ser diferente do valor máximo recomendado.</p>
      <div class="campos" style="margin-top:16px">
        <div class="campo"><label for="t-valor">Valor pago na troca</label><input id="t-valor" inputmode="numeric" value="${r.teto.toLocaleString('pt-BR')}"></div>
        <div class="campo"><label for="t-data">Data</label><input id="t-data" type="date" value="${hojeISO()}" max="${hojeISO()}"></div>
        <div class="campo"><label for="t-vend">Vendedor</label><select id="t-vend">${VENDEDORES().map((v) => `<option>${esc(v)}</option>`).join('')}</select></div>
        <div class="campo" id="t-aprov-box" hidden><label for="t-aprov">Aprovado por (gerente)</label><input id="t-aprov" placeholder="Nome de quem autorizou"></div>
        <div class="campo inteiro" id="t-mot-box" hidden><label for="t-mot">Motivo para pagar acima</label><input id="t-mot" placeholder="Ex.: cliente fecha a compra de uma colhedora nova"></div>
      </div>
      <p class="conta" id="t-aviso">Valor máximo recomendado: ${real(r.teto)}.</p>
      <div class="acoes"><button class="btn btn-ouro" type="button" id="t-ok">Confirmar troca</button><button class="btn btn-linha" type="button" id="t-nao">Cancelar</button></div>`, (c) => {
      const inp = $('#t-valor', c), aviso = $('#t-aviso', c);
      const checar = () => {
        const v = num(inp.value), d = v - r.teto;
        $('#t-aprov-box', c).hidden = !(d > 0); $('#t-mot-box', c).hidden = !(d > 0);
        aviso.innerHTML = !(v > 0) ? '<span class="neg">Informe o valor pago.</span>' : d > 0 ? `<span class="neg">${real(d)} acima do valor máximo recomendado. A margem projetada cai para ${pct((r.venda - v - r.preparo) / r.venda)}. Precisa da aprovação do gerente; pela regra da revenda, ${pct(K.cfg.descontoAcima, 0)} do valor acima (${real(d * K.cfg.descontoAcima)}) sai da comissão do vendedor.</span>` : `Dentro do valor máximo recomendado (${real(r.teto)}). Margem projetada: ${pct((r.venda - v - r.preparo) / r.venda)}.`;
      };
      inp.oninput = checar; checar();
      $('#t-nao', c).onclick = () => fecharCamada();
      $('#t-ok', c).onclick = (e) => {
        const v = num(inp.value), dt = $('#t-data', c).value || hojeISO();
        if (!(v > 0)) { inp.focus(); toast('Informe o valor pago na troca.', true); return; }
        const acima = v > r.teto, aprov = $('#t-aprov', c).value.trim(), mot = $('#t-mot', c).value.trim();
        if (acima && (!aprov || !mot)) { (aprov ? $('#t-mot', c) : $('#t-aprov', c)).focus(); toast('Acima do recomendado: informe quem aprovou e o motivo.', true); return; }
        const b = e.currentTarget; b.classList.add('carregando');
        setTimeout(() => {
          const t = K.fecharTroca(estado, maq, r, v, dt, { vendedor: $('#t-vend', c).value, negociacao: av.nova || null, aprovacao: acima ? { por: aprov, motivo: mot, excesso: v - r.teto, data: hojeISO() } : null, origem: av.local || 'Troca registrada',
            manutencoes: av.declarado ? [{ servico: av.declarado, horas: av.horas, comNota: av.verif.notas }] : [], fotos: av.fotos.filter(Boolean), verif: { ...av.verif } });
          const id = t.id;
          A.trocas.push({ ...t }); salvar(); cacheLimpa();
          fecharCamada(true);
          abrirCamada('modal', `<h2>Troca registrada</h2><p class="sub">${esc(t.marca + ' ' + t.modelo)} entrou no pátio por ${real(t.pago)}. O passaporte foi criado e a visão geral já foi atualizada.</p>
            <div class="acoes"><a class="btn btn-ouro" href="passaporte.html?id=${id}">Abrir passaporte</a><a class="btn btn-linha" href="#patio" id="ir-patio">Ver no pátio</a></div>`, (cc) => { $('#ir-patio', cc).onclick = () => fecharCamada(true); });
          toast('Troca registrada no pátio.');
        }, 500);
      };
    });
    contar(caixa);
  }

  // ---------- PÁTIO ----------
  const fp = { tipo: '', marca: '', idade: '', ordem: 'risco' };
  function telaPatio() {
    const todos = C.patio().map(infoPatio);
    let itens = todos.filter((i) => (!fp.tipo || i.t.tipo === fp.tipo) && (!fp.marca || i.t.marca === fp.marca) && (!fp.idade || i.faixa === fp.idade));
    const ord = { risco: (a, b) => b.risco - a.risco, capital: (a, b) => b.t.pago - a.t.pago, dias: (a, b) => b.dias - a.dias, margem: (a, b) => a.margem - b.margem };
    itens.sort(ord[fp.ordem]);
    const cap = itens.reduce((s, i) => s + i.t.pago, 0), velhos = itens.filter((i) => i.dias > 90);
    const marcas = [...new Set(todos.map((i) => i.t.marca))].sort();
    tela.innerHTML = `
      <div class="titulo"><div><h1>Pátio de máquinas</h1><p>Saiba onde seu capital está parado e quais equipamentos exigem atenção.</p></div>
        <div class="acoes"><button class="btn btn-linha" type="button" id="exportar"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg>Exportar planilha</button></div></div>
      <div class="kpis escalonado">
        <div class="kpi"><span class="rot">Máquinas no pátio</span><span class="val">${conta(itens.length, 'int')}</span></div>
        <div class="kpi"><span class="rot">Capital imobilizado</span><span class="val">${conta(cap, 'mil')}</span></div>
        <div class="kpi"><span class="rot">Permanência média</span><span class="val">${conta(itens.reduce((s, i) => s + i.dias, 0) / Math.max(1, itens.length), 'dias')}</span></div>
        <div class="kpi risco"><span class="rot">Acima de 90 dias</span><span class="val">${velhos.length} · ${mil(velhos.reduce((s, i) => s + i.t.pago, 0))}</span></div>
      </div>
      <div class="filtros">
        <div class="campo"><label for="p-tipo">Categoria</label><select id="p-tipo"><option value="">Todas</option>${Object.keys(NOMES).map((k) => `<option value="${k}" ${fp.tipo === k ? 'selected' : ''}>${NOMES[k]}</option>`).join('')}</select></div>
        <div class="campo"><label for="p-marca">Fabricante</label><select id="p-marca"><option value="">Todos</option>${marcas.map((m) => `<option ${fp.marca === m ? 'selected' : ''}>${esc(m)}</option>`).join('')}</select></div>
        <div class="campo"><label for="p-idade">Tempo de pátio</label><select id="p-idade"><option value="">Todos</option>${['normal', 'atencao', 'alerta', 'critico'].map((f) => `<option value="${f}" ${fp.idade === f ? 'selected' : ''}>${C.NOMES_IDADE[f]}</option>`).join('')}</select></div>
        <div class="campo"><label for="p-ordem">Ordenar por</label><select id="p-ordem">${[['risco', 'Maior risco de margem'], ['capital', 'Maior capital imobilizado'], ['dias', 'Maior tempo no pátio'], ['margem', 'Menor margem projetada']].map(([v, n]) => `<option value="${v}" ${fp.ordem === v ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
      </div>
      <section class="painel"><div class="tabela-wrap"><table class="tabela"><thead><tr><th>Máquina</th><th>Entrada</th><th class="n">Dias</th><th class="n">Aquisição</th><th class="n">Preparo</th><th class="n">Custo total</th><th class="n">Anunciado</th><th class="n">Venda estimada</th><th class="n">Margem</th><th>Situação</th></tr></thead>
        <tbody>${itens.length ? itens.map((i) => `<tr class="clicavel" tabindex="0" data-id="${i.t.id}"><td class="maq"><b>${esc(i.t.marca + ' ' + i.t.modelo)}</b><span>${NOMES[i.t.tipo]} · ${i.t.ano} · ${i.t.horas.toLocaleString('pt-BR')} h</span></td>
          <td>${data(i.t.entrada)}</td><td class="n">${i.dias} <span class="tag ${i.faixa}">${C.NOMES_IDADE[i.faixa]}</span></td><td class="n">${mil(i.t.pago)}</td><td class="n">${mil(i.t.preparo)}</td><td class="n">${mil(i.custo)}</td><td class="n">${mil(i.t.anuncio)}</td><td class="n">${mil(i.venda)}</td>
          <td class="n ${i.margem < 0.06 ? 'neg' : ''}">${pct(i.margem)}</td><td>${esc(i.acao)}</td></tr>`).join('') : '<tr><td colspan="10" class="vazio">Nenhuma máquina com esses filtros.</td></tr>'}</tbody></table></div>
        <p class="nota-rodape">Toque numa máquina para ver os detalhes, simular redução de preço e abrir o passaporte.</p></section>`;
    ['tipo', 'marca', 'idade', 'ordem'].forEach((k) => { $('#p-' + k).onchange = (e) => { fp[k] = e.target.value; telaPatio(); }; });
    $$('tr.clicavel', tela).forEach((tr) => { const abre = () => detalheMaquina(tr.dataset.id); tr.onclick = abre; tr.onkeydown = (e) => { if (e.key === 'Enter') abre(); }; });
    $('#exportar').onclick = () => baixarCSV('anshur-patio.csv', [['Máquina', 'Categoria', 'Ano', 'Horas', 'Entrada', 'Dias', 'Aquisição', 'Preparo', 'Custo total', 'Anunciado', 'Venda estimada', 'Margem projetada', 'Situação']]
      .concat(itens.map((i) => [i.t.marca + ' ' + i.t.modelo, NOMES[i.t.tipo], i.t.ano, i.t.horas, data(i.t.entrada), i.dias, i.t.pago, i.t.preparo, i.custo, i.t.anuncio, i.venda, (i.margem * 100).toFixed(1).replace('.', ',') + '%', i.acao])));
    contar();
  }

  const linhaItem = (it) => `<div class="item-prep" style="display:grid;grid-template-columns:2fr 1fr 0.7fr;gap:8px"><input class="campo-in" data-f="desc" aria-label="Serviço ou peça" placeholder="Ex.: troca do kit de embreagem" value="${esc(it.desc || '')}"><input class="campo-in" data-f="pecas" inputmode="numeric" aria-label="Peças em reais" placeholder="Peças R$" value="${it.pecas ? it.pecas.toLocaleString('pt-BR') : ''}"><input class="campo-in" data-f="horas" inputmode="decimal" aria-label="Horas de oficina" placeholder="Horas" value="${it.horas || ''}"></div>`;

  function detalheMaquina(id) {
    const t = A.trocas.find((x) => x.id === id); if (!t) return;
    const i = infoPatio(t);
    const mov = [{ data: t.entrada, txt: `Entrada no pátio por ${real(t.pago)}` }, { data: t.entrada, txt: `Preparo: ${real(t.preparo)}${t.preparoEst ? ` (previsto ${real(t.preparoEst)})` : ''}` }]
      .concat((t.precos || []).map((p) => ({ data: p.data, txt: `${p.motivo}: ${real(p.valor)}` }))).sort((a, b) => a.data.localeCompare(b.data));
    abrirCamada('gaveta', `
      <span class="tag ${i.faixa}">${C.NOMES_IDADE[i.faixa]} · ${i.dias} dias</span>
      <h2 style="font-size:22px;margin-top:10px">${esc(t.marca + ' ' + t.modelo)}</h2><p class="sub">${NOMES[t.tipo]} · ${t.ano} · ${t.horas.toLocaleString('pt-BR')} h · ${esc(t.origem)}</p>
      <div class="det">
        <div><span>Aquisição</span><b>${real(t.pago)}</b></div><div><span>Preparação</span><b>${real(t.preparo)}</b></div>
        <div><span>Custo total</span><b>${real(i.custo)}</b></div><div><span>Preço anunciado</span><b>${real(t.anuncio)}</b></div>
        <div><span>Venda estimada</span><b>${real(i.venda)}</b></div><div><span>Margem projetada</span><b class="${i.margem < 0.06 ? 'neg' : ''}">${pct(i.margem)}</b></div>
        <div><span>Custo financeiro estimado</span><b>${real(i.juros)}</b></div><div><span>Recomendação</span><b>${esc(i.acao)}</b></div>
      </div>
      ${t.previsto ? `<p class="conta">Previsto no dia da troca (${data(t.previsto.data)}): valor máximo ${real(t.previsto.teto)}, venda ${real(t.previsto.venda)}, preparo ${real(t.previsto.preparo)}, ${t.previsto.dias || '—'} dias de pátio, qualidade ${t.previsto.confianca}. Pago: ${real(t.pago)}.</p>` : ''}
      <p class="conta">${esc(janelaVenda(t.tipo))}</p>
      ${t.aprovacao ? `<p class="conta">Troca acima do recomendado em ${real(t.aprovacao.excesso)}, aprovada por ${esc(t.aprovacao.por)}: ${esc(t.aprovacao.motivo)}.</p>` : ''}
      <section class="painel" style="margin-top:6px"><h2>Ordem de preparo na oficina</h2>
        <p class="sub" style="margin:4px 0 12px">Peças e horas de mão de obra (R$ ${K.cfg.valorHora}/h). O total vira o preparo real e é comparado com o previsto${t.preparoEst ? ` (${real(t.preparoEst)})` : ''}.</p>
        <div id="itens-prep" style="display:grid;gap:8px">${((estado.preparos[t.id] && estado.preparos[t.id].itens) || []).map((it) => linhaItem(it)).join('') || linhaItem({})}</div>
        <div class="acoes" style="margin-top:10px"><button class="btn btn-linha" type="button" id="add-item">Adicionar item</button><span class="conta" id="tot-prep" style="margin:0"></span></div>
        <div class="acoes" style="margin-top:8px"><button class="btn btn-ouro" type="button" id="g-prep-ok">Salvar preparo</button></div>
      </section>
      <section class="painel" style="margin-top:6px"><h2>Registrar a venda</h2>
        <p class="sub" style="margin:4px 0 12px">A venda fecha a conta da máquina e ensina o motor.</p>
        <div class="campos">
          <div class="campo"><label for="g-venda">Valor da venda</label><input id="g-venda" inputmode="numeric" placeholder="R$"></div>
          <div class="campo"><label for="g-data">Data da venda</label><input id="g-data" type="date" value="${hojeISO()}" min="${t.entrada}" max="${hojeISO()}"></div>
        </div>
        <div class="acoes" style="margin-top:12px"><button class="btn btn-ouro" type="button" id="g-vender">Registrar venda</button></div>
      </section>
      <section class="painel" style="margin-top:6px"><h2>Simular redução de preço</h2>
        <p class="sub" style="margin:4px 0 12px">Só simula. Os valores da máquina não mudam até você aplicar.</p>
        <label class="rot-campo" for="sim">Redução sobre o anúncio: <b id="sim-pct">0%</b></label>
        <input class="deslizar" id="sim" type="range" min="0" max="15" step="1" value="0">
        <div class="det" id="sim-res"></div>
        <button class="btn btn-linha" type="button" id="aplicar" disabled>Aplicar novo preço</button>
      </section>
      <section style="margin-top:18px"><h2 style="font-size:15px;margin-bottom:12px">Histórico de movimentações</h2>
        <ul class="linha-tempo">${mov.map((m) => `<li>${esc(m.txt)}<span>${data(m.data)}</span></li>`).join('')}</ul></section>
      <div class="acoes"><a class="btn btn-ouro" href="passaporte.html?id=${t.id}">Abrir passaporte</a></div>`, (c) => {
      const s = $('#sim', c), res = $('#sim-res', c), ap = $('#aplicar', c);
      const atual = () => {
        const p = +s.value / 100, novo = Math.round(t.anuncio * (1 - p) / 1000) * 1000;
        // vendas costumam fechar abaixo do anúncio; usamos a mesma relação atual entre venda estimada e anúncio
        const vendaNova = Math.min(i.venda, novo * Math.min(1, i.venda / t.anuncio)) || novo;
        const m = (vendaNova - i.custo) / vendaNova;
        $('#sim-pct', c).textContent = s.value + '%';
        res.innerHTML = `<div><span>Novo anúncio</span><b>${real(novo)}</b></div><div><span>Margem projetada</span><b class="${m < 0.06 ? 'neg' : ''}">${pct(m)} <small class="sub">(hoje ${pct(i.margem)})</small></b></div><div><span>Resultado bruto</span><b>${real(vendaNova - i.custo)}</b></div><div><span>Diferença</span><b class="neg">${real(vendaNova - i.venda)}</b></div>`;
        ap.disabled = !(+s.value > 0); ap.dataset.novo = novo;
      };
      s.oninput = atual; atual();
      const lerItens = () => $$('.item-prep', c).map((l) => ({ desc: $('[data-f=desc]', l).value.trim(), pecas: num($('[data-f=pecas]', l).value), horas: num($('[data-f=horas]', l).value) })).filter((it) => it.desc || it.pecas || it.horas);
      const totalItens = () => lerItens().reduce((s, it) => s + it.pecas + it.horas * K.cfg.valorHora, 0);
      const mostraTotal = () => { const tot = totalItens(); $('#tot-prep', c).innerHTML = `Total: <b>${real(tot)}</b>${t.preparoEst ? ` · previsto ${real(t.preparoEst)} · <span class="${tot > t.preparoEst ? 'neg' : 'pos'}">${tot > t.preparoEst ? '+' : ''}${real(tot - t.preparoEst)}</span>` : ''}`; };
      $('#itens-prep', c).addEventListener('input', mostraTotal); mostraTotal();
      $('#add-item', c).onclick = () => { $('#itens-prep', c).insertAdjacentHTML('beforeend', linhaItem({})); $$('.item-prep', c).at(-1).querySelector('input').focus(); };
      $('#g-prep-ok', c).onclick = () => {
        const itens = lerItens(), v = totalItens(); if (!itens.length) { toast('Adicione ao menos um item de preparo.', true); return; }
        K.registrarPreparo(estado, t.id, v, hojeISO()); estado.preparos[t.id].itens = itens; t.preparo = Math.round(v); salvar(); cacheLimpa(); toast('Preparo registrado: ' + real(v) + '.'); rota();
      };
      $('#g-vender', c).onclick = () => {
        const v = num($('#g-venda', c).value), dv = $('#g-data', c).value;
        if (!(v > 0)) { $('#g-venda', c).focus(); toast('Informe o valor da venda.', true); return; }
        if (!dv || dv < t.entrada) { toast('A data da venda não pode ser antes da troca.', true); return; }
        const res = v - t.pago - t.preparo;
        confirmar('Registrar venda?', `${t.marca} ${t.modelo} vendida por ${real(v)} em ${data(dv)}. Resultado bruto: ${real(res)} (${pct(res / v)}). A máquina sai do pátio.`, 'Registrar venda', () => {
          K.registrarVenda(estado, t.id, v, dv); t.vendido = Math.round(v); t.saida = dv; t.diasPatio = diasEntre(t.entrada, dv); salvar(); cacheLimpa();
          toast('Venda registrada. Veja o previsto x realizado em Inteligência de trocas.'); rota();
        });
      };
      ap.onclick = () => confirmar('Aplicar novo preço?', `O anúncio passa de ${real(t.anuncio)} para ${real(+ap.dataset.novo)}.`, 'Aplicar', () => {
        const reg = { data: hojeISO(), valor: +ap.dataset.novo, motivo: 'Redução de preço' };
        (estado.precos[t.id] = estado.precos[t.id] || []).push(reg); t.precos = (t.precos || []).concat(reg); t.anuncio = reg.valor; salvar();
        toast('Novo preço aplicado.'); rota();
      });
    });
  }

  // ---------- INTELIGÊNCIA DE TROCAS ----------
  const ft = { periodo: 'tudo', tipo: '', resultado: '' };
  function telaTrocas() {
    const limite = ft.periodo === 'tudo' ? '' : (() => { const d = new Date(); d.setMonth(d.getMonth() - +ft.periodo); return d.toISOString().slice(0, 10); })();
    const vend = C.vendidas().filter((t) => (!limite || t.saida >= limite) && (!ft.tipo || t.tipo === ft.tipo) && (!ft.resultado || (ft.resultado === 'pos' ? C.resultado(t) >= 0 : C.resultado(t) < 0)))
      .sort((a, b) => b.saida.localeCompare(a.saida));
    const linhas = vend.map((t) => { const r = rec(t); return { t, r, dif: r ? t.pago - r.teto : 0, res: C.resultado(t), m: C.margem(t) }; });
    const prej = linhas.filter((l) => l.res < 0);
    const excesso = linhas.reduce((s, l) => s + Math.max(0, l.dif), 0);
    // fontes de perda calculadas dos registros
    const fontes = [
      { r: 'Pago acima do recomendado', v: excesso, cls: 'critico', extra: `${linhas.filter((l) => l.dif > 0).length} trocas` },
      { r: 'Preparo acima do previsto', v: linhas.reduce((s, l) => s + Math.max(0, l.t.preparo - (l.t.preparoEst || l.t.preparo)), 0), cls: 'alerta', extra: `${linhas.filter((l) => l.t.preparoEst && l.t.preparo > l.t.preparoEst).length} trocas` },
      { r: 'Venda abaixo da estimativa', v: linhas.reduce((s, l) => s + Math.max(0, (l.r ? l.r.venda : l.t.vendido) - l.t.vendido), 0), cls: 'atencao', extra: `${linhas.filter((l) => l.r && l.r.venda > l.t.vendido).length} trocas` },
      { r: 'Pátio acima de 90 dias', v: linhas.reduce((s, l) => s + C.custoFinanceiro(l.t, Math.max(0, l.t.diasPatio - 90)), 0), cls: 'neutro', extra: `custo financeiro estimado (${pct(K.cfg.jurosMes)} a.m.), não é prejuízo realizado` }
    ].sort((a, b) => b.v - a.v);
    const val = M.validar();
    const tiposVal = Object.keys(val.porTipo).sort((a, b) => val.porTipo[b].n - val.porTipo[a].n);
    // previsto x realizado: registrado no dia da troca ou reconstituído só com as vendas anteriores a ela
    const pxr = linhas.filter((l) => l.r).slice(0, 12);
    const porTri = {};
    vend.forEach((t) => { const d = new Date(t.saida + 'T12:00:00'), k = d.getFullYear() + ' T' + (Math.floor(d.getMonth() / 3) + 1); (porTri[k] = porTri[k] || []).push(C.margem(t)); });
    const tri = Object.keys(porTri).sort().map((k) => ({ r: k.slice(2), v: porTri[k].reduce((s, v) => s + v, 0) / porTri[k].length }));
    const perdasTipo = Object.keys(NOMES).map((k) => ({ r: NOMES[k].split(' ')[0], v: -prej.filter((l) => l.t.tipo === k).reduce((s, l) => s + l.res, 0), cls: 'critico', extra: `${prej.filter((l) => l.t.tipo === k).length} com prejuízo` })).filter((p) => p.v > 0);

    tela.innerHTML = `
      <div class="titulo"><div><h1>Inteligência de trocas</h1><p>Onde a revenda ganhou e onde perdeu dinheiro nas trocas já vendidas.</p></div>
        <div class="acoes"><button class="btn btn-linha" type="button" id="exportar"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg>Exportar planilha</button></div></div>
      <div class="filtros">
        <div class="campo"><label for="t-per">Período</label><select id="t-per">${[['12', 'Últimos 12 meses'], ['24', 'Últimos 24 meses'], ['tudo', 'Todo o histórico']].map(([v, n]) => `<option value="${v}" ${ft.periodo === v ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
        <div class="campo"><label for="t-tipo">Categoria</label><select id="t-tipo"><option value="">Todas</option>${Object.keys(NOMES).map((k) => `<option value="${k}" ${ft.tipo === k ? 'selected' : ''}>${NOMES[k]}</option>`).join('')}</select></div>
        <div class="campo"><label for="t-res">Resultado</label><select id="t-res"><option value="">Todos</option><option value="pos" ${ft.resultado === 'pos' ? 'selected' : ''}>Positivo</option><option value="neg" ${ft.resultado === 'neg' ? 'selected' : ''}>Negativo</option></select></div>
      </div>
      <div class="kpis escalonado">
        <div class="kpi"><span class="rot">Trocas vendidas</span><span class="val">${conta(linhas.length, 'int')}</span><span class="exp">Margem média ${pct(linhas.reduce((s, l) => s + l.m, 0) / Math.max(1, linhas.length))}</span></div>
        <div class="kpi"><span class="rot">Resultado bruto acumulado</span><span class="val">${conta(linhas.reduce((s, l) => s + l.res, 0), 'mil')}</span><span class="exp">Venda menos aquisição e preparo.</span></div>
        <div class="kpi risco"><span class="rot">Trocas com prejuízo</span><span class="val">${prej.length} · ${mil(-prej.reduce((s, l) => s + l.res, 0))}</span><span class="exp">Venderam por menos do que custaram.</span></div>
        <div class="kpi"><span class="rot">Pago acima do recomendado</span><span class="val">${conta(excesso, 'mil')}</span><span class="exp">Soma do que foi pago além do valor máximo que o Anshur indicaria.</span></div>
      </div>
      <div class="grade-3">
        <section class="painel"><div class="painel-cab"><h2>Principais fontes de perda</h2></div>${G.horizontais(fontes)}</section>
        <section class="painel"><div class="painel-cab"><h2>Margem realizada</h2><p>Por trimestre de venda</p></div>${tri.length > 1 ? G.linha(tri, { formato: (v) => pct(v), altura: 200 }) : '<p class="vazio">Poucos dados no período.</p>'}</section>
        <section class="painel"><div class="painel-cab"><h2>Perdas por categoria</h2></div>${perdasTipo.length ? G.horizontais(perdasTipo) : '<p class="vazio">Nenhuma troca com prejuízo no filtro.</p>'}</section>
      </div>
      <section class="painel bloco"><div class="painel-cab"><h2>Qualidade do motor de avaliação</h2><p>Validação temporal, sem usar a própria venda</p></div>
        ${val.n >= M.QUALIDADE.minimoValidacao ? `<div class="numeros">
          <div><span>Vendas previstas e conferidas</span><b>${val.n} de ${val.total}</b></div>
          <div><span>Erro médio (MAPE)</span><b>${pct(val.mape)}</b></div>
          <div><span>Erro médio em reais (MAE)</span><b>${mil(val.mae)}</b></div>
          <div><span>Tendência</span><b>${val.vies < 0 ? 'prevê ' + pct(-val.vies) + ' abaixo' : 'prevê ' + pct(val.vies) + ' acima'}</b></div>
        </div>
        <div class="tabela-wrap" style="margin-top:12px"><table class="tabela"><thead><tr><th>Tipo</th><th class="n">Testes</th><th class="n">MAPE</th><th class="n">MAE</th></tr></thead><tbody>
          ${tiposVal.map((k) => { const q = val.porTipo[k]; return `<tr><td>${NOMES[k]}</td><td class="n">${q.n}</td><td class="n">${q.n >= M.QUALIDADE.minimoValidacao ? pct(q.mape) : 'amostra pequena'}</td><td class="n">${q.n >= M.QUALIDADE.minimoValidacao ? mil(q.mae) : '—'}</td></tr>`; }).join('')}</tbody></table></div>
        <p class="nota-rodape">Para cada venda, o motor só conheceu o que já tinha sido vendido antes da data daquela troca. As ${val.total - val.n} vendas mais antigas ficaram sem teste porque ainda não havia histórico suficiente.</p>`
        : `<p class="vazio">Ainda não há vendas suficientes com data de troca e de venda para medir o erro (mínimo ${M.QUALIDADE.minimoValidacao}).</p>`}
      </section>
      <section class="painel bloco"><div class="painel-cab"><h2>${ICO.linha}Calendário de vendas da região</h2><p>Safra da cana, plantio da soja e o que a sua revenda já vendeu em cada mês</p></div>
        ${Object.keys(NOMES).map((k) => { const s = SAFRA[k], mesAt = new Date().getMonth(), vendasMes = Array(12).fill(0); C.vendidas().filter((t) => t.tipo === k).forEach((t) => { vendasMes[+t.saida.slice(5, 7) - 1]++; });
          return `<div style="margin:14px 0 4px"><b style="font-size:17px">${NOMES[k]}</b> <span class="sub">· melhor época: ${s.janela} (${s.motivo})</span></div>
          <div class="cal">${['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'].map((m, i) => `<span class="${s.meses.includes(i) ? 'on' : ''} ${i === mesAt ? 'hoje' : ''}" title="${vendasMes[i]} vendas da revenda em ${m}">${m}<br><small>${vendasMes[i]}</small></span>`).join('')}</div>`; }).join('')}
        <p class="nota-rodape">Verde: época de maior procura na região. Número embaixo: quantas máquinas desse tipo a revenda vendeu naquele mês no histórico. Com dados reais, o calendário passa a refletir o giro da própria revenda.</p>
      </section>
      <section class="painel bloco"><div class="painel-cab"><h2>Previsto x realizado</h2><p>Últimas vendas com previsão</p></div>
        <div class="tabela-wrap"><table class="tabela"><thead><tr><th>Máquina</th><th class="n">Venda prev. · real</th><th class="n">Preparo prev. · real</th><th class="n">Margem prev. · real</th><th class="n">Pátio prev. · real</th><th>Origem</th></tr></thead><tbody>
          ${pxr.length ? pxr.map((l) => { const r = l.r, mp = C.margemProjetada(r.venda, l.t.pago + (r.preparo || 0)); return `<tr><td class="maq"><b>${esc(l.t.marca + ' ' + l.t.modelo)}</b><span>${data(l.t.entrada)} → ${data(l.t.saida)}</span></td>
            <td class="n">${mil(r.venda)} · <b class="${l.t.vendido < r.venda ? 'neg' : 'pos'}">${mil(l.t.vendido)}</b></td><td class="n">${mil(r.preparo || 0)} · <b class="${l.t.preparo > (r.preparo || 0) ? 'neg' : 'pos'}">${mil(l.t.preparo)}</b></td>
            <td class="n">${pct(mp)} · <b class="${l.m < mp ? 'neg' : 'pos'}">${pct(l.m)}</b></td><td class="n">${r.dias ? r.dias + ' d' : '—'} · <b>${l.t.diasPatio} d</b></td><td>${r.registrado ? '<span class="tag comprovado">Registrado</span>' : '<span class="tag declarado">Reconstituído</span>'}</td></tr>`; }).join('') : '<tr><td colspan="6" class="vazio">Nenhuma venda com previsão no filtro.</td></tr>'}</tbody></table></div>
        <p class="nota-rodape">Registrado: previsão gravada no dia em que a troca foi fechada no Anshur. Reconstituído: o que o motor diria naquele dia, usando só as vendas anteriores.</p>
      </section>
      <section class="painel bloco"><div class="tabela-wrap"><table class="tabela"><thead><tr><th>Venda</th><th>Máquina</th><th class="n">Recomendado</th><th class="n">Pago</th><th class="n">Diferença</th><th class="n">Preparo</th><th class="n">Venda</th><th class="n">Margem</th><th class="n">Resultado</th></tr></thead>
        <tbody>${linhas.length ? linhas.map((l) => `<tr><td>${data(l.t.saida)}</td><td class="maq"><b>${esc(l.t.marca + ' ' + l.t.modelo)}</b><span>${l.t.ano} · ${l.t.horas.toLocaleString('pt-BR')} h · ${l.t.diasPatio} dias</span></td>
          <td class="n">${l.r ? mil(l.r.teto) : '—'}</td><td class="n">${mil(l.t.pago)}</td><td class="n ${l.dif > 0 ? 'neg' : 'pos'}">${l.dif > 0 ? '+' : ''}${mil(l.dif)}</td><td class="n">${mil(l.t.preparo)}</td><td class="n">${mil(l.t.vendido)}</td>
          <td class="n ${l.m < 0 ? 'neg' : ''}">${pct(l.m)}</td><td class="n ${l.res < 0 ? 'neg' : 'pos'}">${mil(l.res)}</td></tr>`).join('') : '<tr><td colspan="9" class="vazio">Nenhuma troca com esses filtros.</td></tr>'}</tbody></table></div>
        <p class="nota-rodape">"Recomendado" é o valor máximo que o Anshur indicaria na data da troca, aprendendo só com as vendas anteriores. A diferença é um ponto para revisar a decisão, não um prejuízo comprovado.</p></section>`;
    [['t-per', 'periodo'], ['t-tipo', 'tipo'], ['t-res', 'resultado']].forEach(([i, k]) => { $('#' + i).onchange = (e) => { ft[k] = e.target.value; telaTrocas(); }; });
    $('#exportar').onclick = () => baixarCSV('anshur-trocas.csv', [['Data da venda', 'Máquina', 'Categoria', 'Ano', 'Horas', 'Recomendado', 'Pago', 'Diferença', 'Preparo', 'Venda', 'Margem', 'Resultado', 'Dias no pátio']]
      .concat(linhas.map((l) => [data(l.t.saida), l.t.marca + ' ' + l.t.modelo, NOMES[l.t.tipo], l.t.ano, l.t.horas, l.r ? l.r.teto : '', l.t.pago, l.dif, l.t.preparo, l.t.vendido, (l.m * 100).toFixed(1).replace('.', ',') + '%', l.res, l.t.diasPatio])));
    contar();
  }

  // ---------- TESTE ÀS CEGAS ----------
  const tc = { modo: OP ? 'minhas' : 'revenda', selecionadas: null, texto: '', previa: null };
  function telaTeste() {
    // só trocas que o motor conseguiria avaliar na data em que entraram (validação temporal)
    const recentes = C.vendidas().filter((t) => rec(t)).sort((a, b) => b.saida.localeCompare(a.saida)).slice(0, 16);
    if (!tc.selecionadas) tc.selecionadas = new Set(recentes.slice(0, 8).map((t) => t.id));
    tela.innerHTML = `
      <div class="titulo"><div><h1>Quanto você pagou a mais sem perceber?</h1><p>O Anshur avalia trocas antigas sem ver quanto foi pago, usando só o que tinha sido vendido antes de cada uma. Depois revelamos e comparamos.</p></div></div>
      <div class="abas-modo" role="group" aria-label="Origem das trocas">
        <button type="button" data-m="revenda" aria-pressed="${tc.modo === 'revenda'}">${OP ? 'Trocas já importadas' : 'Trocas da demonstração'}</button>
        <button type="button" data-m="minhas" aria-pressed="${tc.modo === 'minhas'}">${OP ? 'Importar planilha' : 'Usar minhas trocas'}</button>
      </div>
      <div id="teste-corpo"></div>`;
    $$('.abas-modo button', tela).forEach((b) => b.onclick = () => { tc.modo = b.dataset.m; telaTeste(); });
    const corpo = $('#teste-corpo');
    if (tc.modo === 'revenda') {
      if (!recentes.length) { corpo.innerHTML = `<section class="painel vazio">Ainda não há trocas com data suficiente para o teste. <button class="link" type="button" id="ir-imp">Importar planilha</button></section>`; $('#ir-imp').onclick = () => { tc.modo = 'minhas'; telaTeste(); }; return; }
      corpo.innerHTML = `<section class="painel passo"><div class="painel-cab"><h2>1. Escolha as trocas</h2><p><span id="qtd">${tc.selecionadas.size}</span> selecionadas</p></div>
        <div class="selecao">${recentes.map((t) => `<label><input type="checkbox" value="${t.id}" ${tc.selecionadas.has(t.id) ? 'checked' : ''}> ${esc(t.marca + ' ' + t.modelo)} · ${t.ano} · ${t.horas.toLocaleString('pt-BR')} h<span>troca em ${data(t.entrada)}</span></label>`).join('')}</div>
        <div class="acoes"><button class="btn btn-ouro" type="button" id="rodar">Avaliar sem ver o resultado</button></div></section><div id="revelacao"></div>`;
      $$('.selecao input', corpo).forEach((c) => c.onchange = () => { c.checked ? tc.selecionadas.add(c.value) : tc.selecionadas.delete(c.value); $('#qtd').textContent = tc.selecionadas.size; });
      $('#rodar').onclick = (e) => {
        const casos = recentes.filter((t) => tc.selecionadas.has(t.id));
        if (casos.length < 3) { toast('Escolha pelo menos 3 trocas.', true); return; }
        revelar(casos.map((t) => ({ t, r: rec(t) })), false, e.currentTarget);
      };
      return;
    }
    corpo.innerHTML = `<section class="painel passo"><h2>Use as trocas reais da sua revenda</h2>
      <p class="sub" style="margin:6px 0 14px">Cole do Excel ou abra o CSV do seu sistema. Os dados são lidos só neste navegador: nada é enviado.</p>
      <p class="ajuda">Colunas (com ou sem cabeçalho, nesta ordem se não houver): <b>categoria; fabricante; modelo; ano; horas; estado (1 a 5); valor pago na troca; valor vendido; dias no pátio; Fipe (opcional); data da troca; data da venda</b>. Valores podem vir como "R$ 210.000,00". Com as datas, o teste usa só as vendas anteriores a cada troca.</p>
      <div class="campo" style="margin-top:12px"><label for="cola">Trocas</label><textarea class="cola" id="cola" placeholder="Categoria;Fabricante;Modelo;Ano;Horas;Estado;Valor pago;Valor vendido;Dias;Fipe;Data da troca;Data da venda">${esc(tc.texto)}</textarea></div>
      <div class="acoes"><button class="btn btn-ouro" type="button" id="conferir">Conferir planilha</button><label class="btn btn-linha" style="cursor:pointer">Abrir arquivo CSV<input type="file" accept=".csv,.txt,text/csv" id="arquivo" class="sr"></label><button class="btn btn-linha" type="button" id="modelo">Baixar planilha modelo</button></div>
      <div id="previa"></div></section>${blocoSync()}<div id="revelacao"></div>`;
    ligarBotoesSync(corpo);
    $('#cola').oninput = (e) => { tc.texto = e.target.value; tc.previa = null; $('#previa').innerHTML = ''; };
    $('#modelo').onclick = () => baixarCSV('anshur-modelo-trocas.csv', [['Categoria', 'Fabricante', 'Modelo', 'Ano', 'Horas', 'Estado (1 a 5)', 'Valor pago na troca', 'Valor vendido', 'Dias no pátio', 'Fipe (opcional)', 'Data da troca', 'Data da venda'], ['Trator', 'Massey Ferguson', 'MF 4709', '2019', '5200', '3', 'R$ 210.000,00', 'R$ 265.000,00', '48', '', '10/03/2025', '27/04/2025']]);
    $('#arquivo').onchange = (e) => { const f = e.target.files[0]; if (!f) return; const rd = new FileReader(); rd.onload = () => { tc.texto = String(rd.result); $('#cola').value = tc.texto; conferir(); }; rd.onerror = () => toast('Não foi possível ler o arquivo.', true); rd.readAsText(f, 'utf-8'); };
    $('#conferir').onclick = conferir;
    if (tc.previa) mostrarPrevia();
  }

  function conferir() {
    if (!tc.texto.trim()) { toast('Cole as trocas ou abra um arquivo.', true); return; }
    tc.previa = window.IMPORTAR.ler(tc.texto, { refDe: M.refDe, anoMax: anoAtual });
    mostrarPrevia();
  }
  function mostrarPrevia() {
    const p = tc.previa, caixa = $('#previa'); if (!caixa) return;
    caixa.innerHTML = `<div class="conta" style="margin-top:16px"><b>${p.aceitas.length} ${p.aceitas.length === 1 ? 'troca aceita' : 'trocas aceitas'}</b> · ${p.rejeitadas.length} ${p.rejeitadas.length === 1 ? 'rejeitada' : 'rejeitadas'} · ${p.comDatas ? 'com datas: teste temporal' : 'sem datas: cada troca é testada com as outras'}</div>
      ${p.rejeitadas.length ? `<div class="tabela-wrap" style="margin-top:10px"><table class="tabela"><thead><tr><th>Linha</th><th>Motivo</th><th>Conteúdo</th></tr></thead><tbody>${p.rejeitadas.slice(0, 12).map((r) => `<tr><td>${r.linha}</td><td class="neg">${esc(r.motivo)}</td><td class="sub">${esc(r.texto)}</td></tr>`).join('')}</tbody></table></div>${p.rejeitadas.length > 12 ? `<p class="nota-rodape">E mais ${p.rejeitadas.length - 12} linhas rejeitadas.</p>` : ''}` : ''}
      ${p.aceitas.length ? `<div class="tabela-wrap" style="margin-top:10px"><table class="tabela"><thead><tr><th>Máquina</th><th class="n">Ano</th><th class="n">Horas</th><th class="n">Pago</th><th class="n">Vendido</th><th>Troca → venda</th></tr></thead><tbody>${p.aceitas.slice(0, 8).map((t) => `<tr><td class="maq"><b>${esc(t.marca + ' ' + t.modelo)}</b><span>${NOMES[t.tipo]}</span></td><td class="n">${t.ano}</td><td class="n">${t.horas.toLocaleString('pt-BR')}</td><td class="n">${real(t.pago)}</td><td class="n">${real(t.vendido)}</td><td>${t.entrada ? data(t.entrada) + ' → ' + data(t.saida) : '—'}</td></tr>`).join('')}</tbody></table></div>${p.aceitas.length > 8 ? `<p class="nota-rodape">Mostrando 8 de ${p.aceitas.length}.</p>` : ''}` : ''}
      <div class="acoes"><button class="btn btn-ouro" type="button" id="rodar-minhas" ${p.aceitas.length < 5 ? 'disabled' : ''}>Avaliar sem ver o resultado</button>${p.comDatas ? `<button class="btn btn-linha" type="button" id="salvar-hist" ${p.aceitas.length < 5 ? 'disabled' : ''}>Usar como histórico da minha revenda</button>` : ''}</div>
      ${p.aceitas.length < 5 ? '<p class="nota-rodape neg">São precisas pelo menos 5 trocas válidas.</p>' : ''}${!p.comDatas && p.aceitas.length ? '<p class="nota-rodape">Para usar como histórico da revenda, inclua as datas da troca e da venda.</p>' : ''}`;
    const rodar = $('#rodar-minhas', caixa);
    if (rodar) rodar.onclick = (e) => {
      const h = p.aceitas;
      const casos = h.map((t) => ({ t, r: M.avaliar(t, { historico: h, excluir: t.id, ate: p.comDatas ? t.entrada : undefined, semValidacao: true }) }));
      revelar(casos, true, e.currentTarget, p.comDatas);
    };
    const sh = $('#salvar-hist', caixa);
    if (sh) sh.onclick = () => confirmar('Usar como histórico da sua revenda?', `As ${p.aceitas.length} trocas vão para o ambiente com dados reais (separado da demonstração), guardadas só neste navegador. O Anshur passa a avaliar com base nelas.`, 'Usar como histórico', () => {
      const op = K.repo.ler('op');
      const chave = (t) => [t.tipo, t.modelo, t.ano, t.horas, t.pago, t.vendido].join('|');
      const ja = new Set((op.historico || []).map(chave));
      const novas = p.aceitas.filter((t) => !ja.has(chave(t))).map((t, i) => ({ ...t, id: 'H' + ((op.historico || []).length + i + 1), ficha: { motor: t.cond / 20, transmissao: t.cond / 20, hidraulico: t.cond / 20, pneus: t.cond / 20, cabine: t.cond / 20, lataria: t.cond / 20 }, manutencoes: [] }));
      op.historico = (op.historico || []).concat(novas);
      if (!K.repo.gravar(op, 'op')) { toast('Não foi possível salvar neste navegador.', true); return; }
      K.repo.trocarAmbiente('op'); location.hash = '#trocas'; location.reload();
    });
  }

  function revelar(casosBrutos, importadas, botao, temporal = true) {
    const caixa = $('#revelacao');
    const res = casosBrutos.filter((c) => c.r);
    if (!res.length) { toast('Não foi possível avaliar essas trocas: histórico insuficiente antes delas.', true); return; }
    botao.classList.add('carregando');
    caixa.innerHTML = `<section class="placar bloco" aria-live="polite"><span class="sub">Avaliando ${res.length} trocas sem ver o valor pago…</span><div class="grande" id="placar-val">—</div><p id="placar-txt"></p></section>
      <div class="cegas">${res.map((c, i) => `<article class="cega" id="cega-${i}"><h3>${esc(c.t.marca + ' ' + c.t.modelo)} · ${c.t.ano} · ${c.t.horas.toLocaleString('pt-BR')} h</h3>
        <div class="linhas"><div><span>Anshur recomendaria até</span><b class="oculto" data-a>calculando</b></div><div><span>A revenda pagou</span><b class="oculto" data-p>••••••</b></div><div><span>Vendeu por</span><b class="oculto" data-v>••••••</b></div><div><span>Diferença</span><b class="oculto" data-d>••••••</b></div></div></article>`).join('')}</div>`;
    caixa.scrollIntoView({ behavior: reduzido ? 'auto' : 'smooth', block: 'start' });
    const passo = reduzido ? 0 : 420;
    res.forEach((c, i) => {
      const card = $('#cega-' + i, caixa), dif = c.t.pago - c.r.teto;
      setTimeout(() => { const a = $('[data-a]', card); a.textContent = real(c.r.teto); a.className = 'revela'; }, passo * i + 200);
      setTimeout(() => {
        const p = $('[data-p]', card), v = $('[data-v]', card), d = $('[data-d]', card);
        p.textContent = real(c.t.pago); v.textContent = real(c.t.vendido);
        const margemSe = (c.t.vendido - Math.min(c.t.pago, c.r.teto) - (c.t.preparo || 0)) / c.t.vendido, margemFoi = C.margem(c.t);
        d.innerHTML = dif > 0 ? `<span class="neg">${real(dif)} acima (${pct(dif / c.r.teto)})</span>` : `<span class="pos">${real(-dif)} abaixo</span>`;
        [p, v, d].forEach((x) => { x.className = 'revela'; });
        if (dif > 0) card.insertAdjacentHTML('beforeend', `<p class="nota-rodape revela">Margem foi ${pct(margemFoi)}; pagando o recomendado seria ${pct(margemSe)}. Previsão de venda: ${real(c.r.venda)}.</p>`);
        card.classList.add('revelada', dif > 0 ? 'pagou-mais' : 'pagou-menos');
      }, passo * i + 200 + passo * 0.7);
    });
    setTimeout(() => {
      botao.classList.remove('carregando');
      const mais = res.filter((c) => c.t.pago > c.r.teto), menos = res.filter((c) => c.t.pago <= c.r.teto);
      const soma = mais.reduce((s, c) => s + c.t.pago - c.r.teto, 0);
      const erroVenda = res.reduce((s, c) => s + Math.abs(c.r.venda - c.t.vendido) / c.t.vendido, 0) / res.length;
      const el = $('#placar-val', caixa); el.dataset.conta = soma; el.dataset.fmt = 'real'; contar(caixa);
      $('.placar .sub', caixa).textContent = `Em ${mais.length} de ${res.length} trocas a revenda pagou acima do valor máximo que o Anshur indicaria`;
      $('#placar-txt', caixa).innerHTML = `Nas outras ${menos.length}, pagou dentro do recomendado. Nessas trocas o Anshur errou o preço de venda em ${pct(erroVenda)} em média. A diferença é uma oportunidade de revisar a decisão, não prejuízo comprovado: a avaliação também pode errar.${importadas ? (temporal ? ' Cada troca foi avaliada só com as vendas anteriores a ela.' : ' Sem datas, cada troca foi avaliada com as outras da planilha; com poucas trocas a estimativa é preliminar.') : ''}
        <span class="acoes" style="display:flex"><button class="btn btn-linha" type="button" id="repetir">Repetir com outras trocas</button>${importadas ? '' : '<a class="btn btn-linha" href="#trocas">Ver inteligência de trocas</a>'}</span>`;
      $('#repetir', caixa).onclick = () => { caixa.innerHTML = ''; window.scrollTo({ top: 0, behavior: reduzido ? 'auto' : 'smooth' }); };
    }, passo * res.length + 200 + passo);
  }

  // ---------- PASSAPORTES ----------
  function telaPassaportes() {
    const itens = C.patio().map(infoPatio).sort((a, b) => b.t.entrada.localeCompare(a.t.entrada));
    if (!itens.length) { tela.innerHTML = '<div class="titulo"><div><h1>Passaportes</h1><p>Nenhuma máquina no pátio. Ao fechar uma troca, o passaporte é criado automaticamente.</p></div></div><a class="btn btn-ouro" href="#avaliar">Avaliar uma troca</a>'; return; }
    tela.innerHTML = `
      <div class="titulo"><div><h1>Passaportes</h1><p>A ficha pública de cada usado do pátio: o comprador aponta o celular no QR Code e vê inspeção, documentos e manutenções.</p></div></div>
      <div class="cartoes escalonado">${itens.map((i) => {
        const comp = (i.t.manutencoes || []).filter((m) => m.comNota).length, tot = (i.t.manutencoes || []).length;
        return `<article class="cartao-pp"><span class="id">ANS-${esc(i.t.id)}</span><h2 style="font-size:17px">${esc(i.t.marca + ' ' + i.t.modelo)}</h2>
          <p class="sub">${NOMES[i.t.tipo]} · ${i.t.ano} · ${i.t.horas.toLocaleString('pt-BR')} h · anunciado ${mil(i.t.anuncio)}</p>
          <p class="sub"><span class="tag comprovado">${comp} comprovadas</span> <span class="tag declarado">${tot - comp} declaradas</span></p>
          <div class="acoes" style="margin-top:4px"><a class="btn btn-ouro" href="passaporte.html?id=${i.t.id}">Abrir</a><button class="btn btn-linha" type="button" data-copiar="${i.t.id}">Copiar link</button></div></article>`;
      }).join('')}</div>`;
    $$('[data-copiar]', tela).forEach((b) => b.onclick = async () => {
      const url = new URL('passaporte.html?id=' + b.dataset.copiar, location.href).href;
      try { await navigator.clipboard.writeText(url); toast('Link do passaporte copiado.'); } catch (e) { toast('Não foi possível copiar. Link: ' + url, true); }
    });
  }

  // histórico de oficina por modelo: defeitos em garantia e quanto o preparo passou do previsto nas trocas
  function historicoModelo(modelo) {
    const gar = (A.garantias || []).filter((g) => g.modelo === modelo);
    const grupos = {}; gar.forEach((g) => { const x = (grupos[g.servico] = grupos[g.servico] || { servico: g.servico, n: 0, soma: 0 }); x.n++; x.soma += g.valor; });
    const defeitos = Object.values(grupos).map((d) => ({ ...d, media: d.soma / d.n })).sort((a, b) => b.n - a.n || b.media - a.media);
    const trocas = A.trocas.filter((t) => t.modelo === modelo && t.preparoEst);
    const reserva = trocas.length ? Math.round(trocas.reduce((s, t) => s + Math.max(0, t.preparo - t.preparoEst), 0) / trocas.length / 100) * 100 : 0;
    return { n: gar.length + trocas.length, defeitos, trocas: trocas.length, reserva };
  }

  // ---------- VENDEDORES ----------
  function porVendedor() {
    const g = {};
    C.vendidas().forEach((t) => {
      const v = t.vendedor || 'Sem vendedor'; const r = rec(t);
      const x = (g[v] = g[v] || { nome: v, trocas: 0, resultado: 0, venda: 0, acima: 0, nAcima: 0, dias: 0, prej: 0 });
      x.trocas++; x.resultado += C.resultado(t); x.venda += t.vendido; x.dias += t.diasPatio || 0;
      if (C.resultado(t) < 0) x.prej++;
      if (r && t.pago > r.teto) { x.acima += t.pago - r.teto; x.nAcima++; }
    });
    return Object.values(g).map((x) => { const bruta = x.venda * K.cfg.comissaoPct, desconto = Math.min(bruta, x.acima * K.cfg.descontoAcima); return { ...x, margem: x.resultado / x.venda, diasMedio: x.dias / x.trocas, comissao: bruta, desconto, comissaoFinal: bruta - desconto }; }).sort((a, b) => b.resultado - a.resultado);
  }
  function telaVendedores() {
    const vs = porVendedor();
    if (!vs.length) { tela.innerHTML = '<div class="titulo"><div><h1>Vendedores</h1><p>Sem trocas vendidas ainda.</p></div></div>'; return; }
    const melhorMargem = vs.slice().sort((a, b) => b.margem - a.margem)[0];
    const maisAcima = vs.slice().sort((a, b) => b.acima - a.acima)[0];
    tela.innerHTML = `
      <div class="titulo"><div><h1>Vendedores</h1><p>Quem traz resultado nas trocas e quem paga caro demais no usado.</p></div></div>
      <div class="kpis escalonado">
        <div class="kpi k-marfim"><span class="rot">${ICO.moedas}Melhor resultado</span><span class="val">${esc(vs[0].nome)}</span><span class="exp">${mil(vs[0].resultado)} em ${vs[0].trocas} trocas</span></div>
        <div class="kpi k-salvia"><span class="rot">${ICO.pct}Melhor margem</span><span class="val">${pct(melhorMargem.margem)}</span><span class="exp">${esc(melhorMargem.nome)}</span></div>
        <div class="kpi k-risco"><span class="rot">${ICO.alerta}Mais pago acima</span><span class="val">${mil(maisAcima.acima)}</span><span class="exp">${esc(maisAcima.nome)} · ${maisAcima.nAcima} trocas acima do recomendado</span></div>
        <div class="kpi k-marfim"><span class="rot">${ICO.barras}Equipe</span><span class="val">${vs.length}</span><span class="exp">${vs.reduce((s, x) => s + x.trocas, 0)} trocas vendidas</span></div>
      </div>
      <section class="painel"><div class="painel-cab"><h2>${ICO.alvo}Ranking por resultado bruto</h2><p>Venda menos aquisição e preparo</p></div>
        <div class="ranking escalonado">${vs.map((x, i) => `<div class="rank ${i === 0 ? 'ouro' : ''}"><span class="pos">${i + 1}º</span><div><b>${esc(x.nome)}</b><span>${x.trocas} trocas · margem ${pct(x.margem)} · ${Math.round(x.diasMedio)} dias de pátio em média · ${x.prej} com prejuízo</span></div>
          <div class="num"><b>${mil(x.resultado)}</b><span class="${x.acima > 0 ? 'neg' : ''}">${mil(x.acima)} pago acima</span></div></div>`).join('')}</div>
        <p class="nota-rodape">"Pago acima" compara o valor pago na troca com o máximo que o Anshur indicaria na data, usando só as vendas anteriores. É um ponto para conversar com o vendedor, não uma acusação.</p></section>
      <section class="painel bloco"><div class="painel-cab"><h2>${ICO.moedas}Comissão atrelada ao usado</h2><p>Regra da revenda: ${pct(K.cfg.comissaoPct)} da venda, menos ${pct(K.cfg.descontoAcima, 0)} do que foi pago acima do recomendado</p></div>
        <div class="tabela-wrap"><table class="tabela grande"><thead><tr><th>Vendedor</th><th class="n">Comissão cheia</th><th class="n">Desconto por troca acima</th><th class="n">Comissão final</th></tr></thead><tbody>
        ${vs.map((x) => `<tr><td><b>${esc(x.nome)}</b></td><td class="n">${real(x.comissao)}</td><td class="n ${x.desconto > 0 ? 'neg' : ''}">${x.desconto > 0 ? '−' : ''}${real(x.desconto)}</td><td class="n forte">${real(x.comissaoFinal)}</td></tr>`).join('')}</tbody></table></div>
        <p class="nota-rodape">Percentuais configuráveis em Premissas. Trocas acima do recomendado exigem a aprovação de um gerente, registrada com nome e motivo.</p></section>`;
    contar();
  }

  // ---------- GARANTIAS ----------
  const fg = { status: '' };
  function telaGarantias() {
    const lista = (A.garantias || []).slice().sort((a, b) => b.data.localeCompare(a.data));
    if (!lista.length) { tela.innerHTML = '<div class="titulo"><div><h1>Garantias a receber</h1><p>Nenhuma ordem de serviço em garantia cadastrada. Na implantação importamos as OS do seu sistema.</p></div></div>'; return; }
    const aReceber = lista.filter((g) => g.status === 'aguardando');
    const glosa = lista.reduce((s, g) => s + (g.status === 'parcial' || g.status === 'negado' ? g.valor - g.pago : 0), 0);
    const vencidas = aReceber.filter((g) => diasDesde(g.data) > 60);
    const filtrada = lista.filter((g) => !fg.status || g.status === fg.status);
    const NOME = { pago: 'Pago', parcial: 'Pago a menos', negado: 'Negado', aguardando: 'Aguardando' };
    const CLS = { pago: 'baixo', parcial: 'medio', negado: 'alto', aguardando: 'medio' };
    const porMarca = {}; lista.forEach((g) => { if (g.status !== 'pago') porMarca[g.marca] = (porMarca[g.marca] || 0) + g.valor - g.pago; });
    tela.innerHTML = `
      <div class="titulo"><div><h1>Garantias a receber</h1><p>Serviços que a oficina fez em garantia e o que o fabricante ainda não pagou ou pagou a menos.</p></div>
        <div class="acoes"><button class="btn btn-linha" type="button" id="exp-gar">Exportar cobrança</button></div></div>
      <div class="kpis escalonado">
        <div class="kpi k-marfim"><span class="rot">${ICO.moedas}A receber do fabricante</span><span class="val">${conta(aReceber.reduce((s, g) => s + g.valor, 0), 'mil')}</span><span class="exp">${aReceber.length} ordens aguardando pagamento</span></div>
        <div class="kpi k-risco"><span class="rot">${ICO.alerta}Glosado ou negado</span><span class="val">${conta(glosa, 'mil')}</span><span class="exp">Diferença entre o serviço feito e o que foi pago</span></div>
        <div class="kpi k-risco"><span class="rot">${ICO.alto}Paradas há +60 dias</span><span class="val">${vencidas.length}</span><span class="exp">${mil(vencidas.reduce((s, g) => s + g.valor, 0))} esperando há mais de 2 meses</span></div>
        <div class="kpi k-salvia"><span class="rot">${ICO.baixo}Recebido no ano</span><span class="val">${conta(lista.reduce((s, g) => s + g.pago, 0), 'mil')}</span><span class="exp">${lista.filter((g) => g.status === 'pago').length} ordens pagas integralmente</span></div>
      </div>
      <div class="grade-2 larga">
        <section class="painel"><div class="painel-cab"><h2>${ICO.etiqueta}Ordens de serviço em garantia</h2></div>
          <div class="filtros"><div class="campo"><label for="g-st">Situação</label><select id="g-st"><option value="">Todas</option>${Object.keys(NOME).map((k) => `<option value="${k}" ${fg.status === k ? 'selected' : ''}>${NOME[k]}</option>`).join('')}</select></div></div>
          <div class="tabela-wrap"><table class="tabela"><thead><tr><th>OS</th><th>Serviço</th><th class="n">Valor</th><th class="n">Pago</th><th>Situação</th></tr></thead><tbody>
          ${filtrada.map((g) => `<tr><td><b>${g.os}</b><br><span class="sub">${data(g.data)} · ${diasDesde(g.data)} dias</span></td><td><b>${esc(g.servico)}</b><br><span class="sub">${esc(g.marca)} · ${esc(g.cliente)}${g.motivo ? ' · ' + esc(g.motivo) : ''}</span></td><td class="n">${real(g.valor)}</td><td class="n">${real(g.pago)}</td><td><span class="risco ${CLS[g.status]}">${NOME[g.status]}</span></td></tr>`).join('')}</tbody></table></div></section>
        <section class="painel"><div class="painel-cab"><h2>${ICO.barras}Pendente por fabricante</h2></div>${G.horizontais(Object.entries(porMarca).sort((a, b) => b[1] - a[1]).map(([m, v]) => ({ r: m, v, cls: 'alerta' })))}
          <p class="nota-rodape">Na implantação, o Anshur lê as OS e os extratos de garantia que a revenda já recebe e cruza os dois todo mês.</p></section>
      </div>`;
    $('#g-st').onchange = (e) => { fg.status = e.target.value; telaGarantias(); };
    $('#exp-gar').onclick = () => baixarCSV('anshur-garantias.csv', [['OS', 'Data', 'Fabricante', 'Serviço', 'Cliente', 'Valor', 'Pago', 'Diferença', 'Situação', 'Motivo']].concat(lista.filter((g) => g.status !== 'pago').map((g) => [g.os, data(g.data), g.marca, g.servico, g.cliente, g.valor, g.pago, g.valor - g.pago, NOME[g.status], g.motivo])));
    contar();
  }

  // ---------- ESTOQUE FINANCIADO ----------
  function jurosFin(f) {
    const hoje = hojeISO(), inicio = (() => { const d = new Date(f.entrada + 'T12:00:00'); d.setDate(d.getDate() + f.carencia); return d.toISOString().slice(0, 10); })();
    const fim = f.quitacao || hoje;
    const total = fim > inicio ? f.valor * f.taxaMes * diasEntre(inicio, fim) / 30 : 0;
    // juros depois da venda: do maior entre venda e fim da carência até a quitação (ou hoje)
    const iniPos = f.venda ? (f.venda > inicio ? f.venda : inicio) : null;
    const aposVenda = iniPos && fim > iniPos ? f.valor * f.taxaMes * diasEntre(iniPos, fim) / 30 : 0;
    return { total, aposVenda, inicio, emCarencia: hoje < inicio };
  }
  function telaFinanciamento() {
    const lista = (A.financiadas || []).map((f) => ({ f, j: jurosFin(f) })).sort((a, b) => b.j.aposVenda - a.j.aposVenda);
    if (!lista.length) { tela.innerHTML = '<div class="titulo"><div><h1>Estoque financiado</h1><p>Nenhuma máquina financiada cadastrada.</p></div></div>'; return; }
    const vendidasAbertas = lista.filter((x) => x.f.venda && !x.f.quitacao);
    const perdido = lista.reduce((s, x) => s + x.j.aposVenda, 0);
    tela.innerHTML = `
      <div class="titulo"><div><h1>Estoque financiado</h1><p>Máquinas novas no floor plan: juros que continuam correndo depois que a máquina já foi vendida.</p></div></div>
      <div class="kpis escalonado">
        <div class="kpi k-marfim"><span class="rot">${ICO.moedas}Financiado em estoque</span><span class="val">${conta(lista.filter((x) => !x.f.venda).reduce((s, x) => s + x.f.valor, 0), 'mil')}</span><span class="exp">${lista.filter((x) => !x.f.venda).length} máquinas novas no pátio</span></div>
        <div class="kpi k-risco"><span class="rot">${ICO.alerta}Juros pagos após a venda</span><span class="val">${conta(perdido, 'mil')}</span><span class="exp">Dinheiro que dava para ter economizado quitando no dia da venda</span></div>
        <div class="kpi k-risco"><span class="rot">${ICO.alto}Vendidas e não quitadas</span><span class="val">${vendidasAbertas.length}</span><span class="exp">${mil(vendidasAbertas.reduce((s, x) => s + x.f.valor, 0))} ainda devendo ao banco</span></div>
        <div class="kpi k-salvia"><span class="rot">${ICO.barras}Juros totais do período</span><span class="val">${conta(lista.reduce((s, x) => s + x.j.total, 0), 'mil')}</span><span class="exp">Taxa de ${pct(lista[0].f.taxaMes)} ao mês após ${lista[0].f.carencia} dias de carência</span></div>
      </div>
      <section class="painel"><div class="painel-cab"><h2>${ICO.etiqueta}Máquinas financiadas</h2><p>Ordenado pelo juro pago depois da venda</p></div>
        <div class="tabela-wrap"><table class="tabela"><thead><tr><th>Máquina</th><th class="n">Valor</th><th>Entrada</th><th>Venda</th><th>Quitação</th><th class="n">Juros até hoje</th><th class="n">Por dia</th><th class="n">Juros após venda</th><th>Situação</th></tr></thead><tbody>
        ${lista.map(({ f, j }) => { const sit = !f.venda ? (j.emCarencia ? ['baixo', 'Em carência'] : ['medio', 'No pátio, pagando juros']) : !f.quitacao ? ['alto', 'Vendida, quitar já'] : j.aposVenda > 0 ? ['medio', 'Quitada com atraso'] : ['baixo', 'Quitada no prazo']; return `<tr><td class="maq"><span class="maq-ico">${ICO[f.tipo]}</span><span><b>${esc(f.marca + ' ' + f.modelo)}</b><span>${f.chassi} · ${esc(f.banco)}</span></span></td><td class="n">${mil(f.valor)}</td><td>${data(f.entrada)}</td><td>${data(f.venda)}</td><td>${data(f.quitacao)}</td><td class="n">${real(j.total)}</td><td class="n ${!f.quitacao && !j.emCarencia ? 'neg forte' : ''}">${!f.quitacao && !j.emCarencia ? real(f.valor * f.taxaMes / 30) : '—'}</td><td class="n ${j.aposVenda > 0 ? 'neg forte' : ''}">${real(j.aposVenda)}</td><td><span class="risco ${sit[0]}">${sit[1]}</span></td></tr>`; }).join('')}</tbody></table></div>
        <p class="nota-rodape">Na implantação, o Anshur cruza o extrato do floor plan com as notas de venda e avisa no mesmo dia em que uma máquina financiada é vendida.</p></section>`;
    contar();
  }

  // ---------- ALERTAS ----------
  function listaAlertas() {
    const out = [];
    C.patio().map(infoPatio).forEach((i) => {
      if (i.dias > 90) out.push({ nivel: 'alto', titulo: `${i.t.marca} ${i.t.modelo} passou de 90 dias no pátio`, txt: `${mil(i.t.pago)} parados há ${i.dias} dias · ${i.acao}`, ir: '#patio' });
      else if (i.dias > 60 && i.dias <= 67) out.push({ nivel: 'medio', titulo: `${i.t.marca} ${i.t.modelo} entrou na faixa de alerta`, txt: `${i.dias} dias no pátio`, ir: '#patio' });
      if (i.margem < 0.06) out.push({ nivel: 'alto', titulo: `Margem baixa: ${i.t.marca} ${i.t.modelo}`, txt: `Margem projetada de ${pct(i.margem)}`, ir: '#patio' });
    });
    (A.financiadas || []).forEach((f) => { if (f.venda && !f.quitacao) out.push({ nivel: 'alto', titulo: `Quitar ${f.marca} ${f.modelo} com o banco`, txt: `Vendida em ${data(f.venda)} e o juro continua correndo`, ir: '#financiamento' }); });
    const gv = (A.garantias || []).filter((g) => g.status === 'aguardando' && diasDesde(g.data) > 60);
    if (gv.length) out.push({ nivel: 'medio', titulo: `${gv.length} garantias paradas há mais de 60 dias`, txt: `${mil(gv.reduce((s, g) => s + g.valor, 0))} para cobrar do fabricante`, ir: '#garantias' });
    const ult = estado.fechadas.slice(-3).filter((t) => t.previsto && t.pago > t.previsto.teto);
    ult.forEach((t) => out.push({ nivel: 'medio', titulo: `Troca acima do recomendado: ${t.marca} ${t.modelo}`, txt: `Pago ${real(t.pago)}, máximo indicado ${real(t.previsto.teto)}`, ir: '#patio' }));
    return out.sort((a, b) => (a.nivel === 'alto' ? 0 : 1) - (b.nivel === 'alto' ? 0 : 1));
  }
  function abrirAlertas() {
    const l = listaAlertas();
    abrirCamada('gaveta', `<h2 style="font-size:24px">Alertas de hoje</h2><p class="sub">${l.length} pontos que pedem atenção do dono.</p>
      <ul class="alertas">${l.map((a) => `<li class="${a.nivel}">${a.nivel === 'alto' ? ICO.alto : ICO.medio}<a href="${a.ir}" class="link-alerta" style="color:inherit;text-decoration:none"><b>${esc(a.titulo)}</b><span>${esc(a.txt)}</span></a></li>`).join('') || '<li class="info">' + ICO.baixo + '<div><b>Tudo em ordem</b><span>Nenhum alerta agora.</span></div></li>'}</ul>`, (c) => { $$('.link-alerta', c).forEach((a) => a.onclick = () => fecharCamada(true)); });
  }

  // ---------- RELATÓRIO DO MÊS ----------
  function telaRelatorio() {
    const hoje = new Date(), mesIni = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1).toISOString().slice(0, 10), mesFim = new Date(hoje.getFullYear(), hoje.getMonth(), 0).toISOString().slice(0, 10);
    const nomeMes = new Date(mesIni + 'T12:00:00').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    const vend = C.vendidas().filter((t) => t.saida >= mesIni && t.saida <= mesFim);
    const entr = A.trocas.filter((t) => t.entrada >= mesIni && t.entrada <= mesFim);
    const itens = C.patio().map(infoPatio);
    const res = vend.reduce((s, t) => s + C.resultado(t), 0), venda = vend.reduce((s, t) => s + t.vendido, 0);
    const acima = vend.concat(entr).filter((t, i, a) => a.indexOf(t) === i).reduce((s, t) => { const r = rec(t); return s + (r && t.pago > r.teto ? t.pago - r.teto : 0); }, 0);
    const al = listaAlertas().filter((a) => a.nivel === 'alto').slice(0, 5);
    const gar = (A.garantias || []).filter((g) => g.status === 'aguardando').reduce((s, g) => s + g.valor, 0);
    const fin = (A.financiadas || []).reduce((s, f) => s + jurosFin(f).aposVenda, 0);
    tela.innerHTML = `
      <div class="titulo"><div><h1>Relatório do dono</h1><p>Resumo de ${nomeMes} para ler em 2 minutos ou imprimir.</p></div><div class="acoes"><button class="btn btn-ouro" type="button" onclick="print()">Imprimir ou salvar PDF</button></div></div>
      <article class="relatorio">
        <img class="logo-img" src="logo/anshur-logo.png?v=5" alt="Anshur" width="200" height="50">
        <p class="sub" style="margin-top:8px">${esc(A.revenda.nome)} · ${esc(A.revenda.cidade)} · emitido em ${new Date().toLocaleDateString('pt-BR')}</p>
        <h2>O mês em números</h2>
        <div class="numeros"><div><span>Trocas que entraram</span><b>${entr.length}</b></div><div><span>Usados vendidos</span><b>${vend.length}</b></div><div><span>Faturamento com usados</span><b>${mil(venda)}</b></div>
          <div><span>Resultado bruto</span><b class="${res < 0 ? 'neg' : 'pos'}">${mil(res)}</b></div><div><span>Margem realizada</span><b>${venda ? pct(res / venda) : '—'}</b></div><div><span>Pago acima do recomendado</span><b class="${acima > 0 ? 'neg' : ''}">${mil(acima)}</b></div></div>
        <h2>Onde está o dinheiro hoje</h2>
        <ul><li>${mil(C.capitalImobilizado())} parados em ${itens.length} usados no pátio; ${itens.filter((i) => i.dias > 90).length} passaram de 90 dias.</li>
          <li>Custo financeiro estimado do estoque até hoje: ${mil(itens.reduce((s, i) => s + i.juros, 0))} (premissa ${pct(K.cfg.jurosMes)} ao mês).</li>
          <li>${mil(gar)} em garantias esperando pagamento do fabricante.</li>
          <li>${mil(fin)} de juros do estoque financiado pagos depois da venda.</li></ul>
        <h2>O que fazer esta semana</h2>
        <ul>${al.length ? al.map((a) => `<li><b>${esc(a.titulo)}</b>: ${esc(a.txt)}.</li>`).join('') : '<li>Nenhum ponto crítico.</li>'}</ul>
        <h2>Qualidade das avaliações</h2>
        <p>${(() => { const v = M.validar(); return v.n >= M.QUALIDADE.minimoValidacao ? `Nas ${v.n} vendas conferidas, o Anshur errou o preço de venda em ${pct(v.mape)} em média (${mil(v.mae)} por máquina). Quanto mais trocas a revenda registra, mais preciso ele fica.` : 'Ainda não há vendas suficientes para medir o erro.'; })()}</p>
        <p class="nota-rodape">Valores estimados são estimativas, não resultados garantidos. ${OP ? '' : 'Revenda e dados fictícios, só para demonstração.'}</p>
      </article>`;
  }

  // ---------- SINCRONIZAÇÃO AUTOMÁTICA COM A PASTA DO SISTEMA ----------
  // O sistema da revenda (DMS) exporta um relatório de trocas para uma pasta todo dia; o Anshur lê o arquivo
  // mais novo sempre que abre. Funciona no Chrome e no Edge do computador (File System Access API).
  const idb = (modo, fn) => new Promise((ok, erro) => {
    const req = indexedDB.open('anshur', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('kv');
    req.onerror = () => erro(req.error);
    req.onsuccess = () => { const tx = req.result.transaction('kv', modo), st = tx.objectStore('kv'); const r = fn(st); tx.oncomplete = () => ok(r && r.result); tx.onerror = () => erro(tx.error); };
  });
  const temPasta = () => 'showDirectoryPicker' in window;
  async function sincronizar(pedir) {
    if (!OP || !temPasta()) return 'indisponivel';
    let h; try { h = await idb('readonly', (st) => st.get('pasta')); } catch (e) { return 'erro'; }
    if (!h) return 'sem-pasta';
    let perm = await h.queryPermission({ mode: 'read' });
    if (perm !== 'granted' && pedir) perm = await h.requestPermission({ mode: 'read' });
    if (perm !== 'granted') return 'permissao';
    let maisNovo = null;
    for await (const ent of h.values()) {
      if (ent.kind !== 'file' || !/\.(csv|txt)$/i.test(ent.name)) continue;
      const f = await ent.getFile(); if (!maisNovo || f.lastModified > maisNovo.lastModified) maisNovo = f;
    }
    if (!maisNovo) return 'vazia';
    const lido = window.IMPORTAR.ler(await maisNovo.text(), { refDe: M.refDe, anoMax: anoAtual });
    const chave = (t) => [t.tipo, t.modelo, t.ano, t.horas, t.pago, t.vendido].join('|');
    const ja = new Set((estado.historico || []).map(chave));
    const novas = lido.aceitas.filter((t) => t.entrada && t.saida && !ja.has(chave(t))).map((t, i) => ({ ...t, id: 'H' + ((estado.historico || []).length + i + 1), ficha: { motor: t.cond / 20, transmissao: t.cond / 20, hidraulico: t.cond / 20, pneus: t.cond / 20, cabine: t.cond / 20, lataria: t.cond / 20 }, manutencoes: [] }));
    estado.historico = (estado.historico || []).concat(novas);
    estado.ultimaSync = { arquivo: maisNovo.name, data: new Date().toISOString(), novas: novas.length, rejeitadas: lido.rejeitadas.length };
    salvar();
    return novas.length ? 'novas' : 'em-dia';
  }
  async function ligarPasta() {
    try {
      const h = await window.showDirectoryPicker({ mode: 'read' });
      await idb('readwrite', (st) => st.put(h, 'pasta'));
      const r = await sincronizar(true);
      toast(r === 'novas' ? `Pasta ligada: ${estado.ultimaSync.novas} trocas novas importadas.` : r === 'vazia' ? 'Pasta ligada, mas ainda não há CSV nela.' : 'Pasta ligada.');
      if (r === 'novas') setTimeout(() => location.reload(), 900); else rota();
    } catch (e) { if (e.name !== 'AbortError') toast('Não foi possível ligar a pasta.', true); }
  }
  function blocoSync() {
    if (!OP) return `<section class="painel bloco"><h2>${ICO.linha}Atualização automática com o seu sistema</h2>
      <p class="sub" style="margin:6px 0 12px">No ambiente com os dados da sua revenda, o Anshur pode ler sozinho a planilha que o seu sistema exporta todo dia numa pasta do computador. Ninguém precisa subir arquivo.</p>
      <button class="btn btn-linha" type="button" id="ir-op">Usar com os dados da minha revenda</button></section>`;
    const u = estado.ultimaSync;
    return `<section class="painel bloco"><h2>${ICO.linha}Atualização automática com o seu sistema</h2>
      <p class="sub" style="margin:6px 0 12px">Programe o seu sistema (DMS) para exportar o relatório de trocas todo dia numa pasta. O Anshur lê o arquivo mais novo dessa pasta sempre que é aberto e importa só as trocas novas. Funciona no Chrome e no Edge do computador; nada sai do computador.</p>
      ${u ? `<p class="conta">Última sincronização: ${new Date(u.data).toLocaleString('pt-BR')} · arquivo ${esc(u.arquivo)} · ${u.novas} trocas novas${u.rejeitadas ? ` · ${u.rejeitadas} linhas com erro` : ''}.</p>` : ''}
      ${temPasta() ? '<div class="acoes"><button class="btn btn-ouro" type="button" id="ligar-pasta">Escolher pasta de exportação</button><button class="btn btn-linha" type="button" id="sinc-agora">Sincronizar agora</button></div>' : '<p class="conta">Este navegador não permite ler pastas. Use o Chrome ou o Edge no computador.</p>'}</section>`;
  }
  function ligarBotoesSync(raiz) {
    const a = $('#ligar-pasta', raiz), b = $('#sinc-agora', raiz), c = $('#ir-op', raiz);
    if (a) a.onclick = ligarPasta;
    if (b) b.onclick = async () => { const r = await sincronizar(true); toast({ novas: `${estado.ultimaSync.novas} trocas novas importadas.`, 'em-dia': 'Tudo em dia: nenhuma troca nova.', 'sem-pasta': 'Escolha a pasta primeiro.', vazia: 'A pasta não tem CSV.', permissao: 'O navegador não liberou a leitura da pasta.' }[r] || 'Não foi possível sincronizar.', !['novas', 'em-dia'].includes(r)); if (r === 'novas') setTimeout(() => location.reload(), 900); };
    if (c) c.onclick = () => { K.repo.trocarAmbiente('op'); location.hash = '#teste'; location.reload(); };
  }

  // ---------- rotas com transição ----------
  const TELAS = { visao: telaVisao, avaliar: telaAvaliar, patio: telaPatio, trocas: telaTrocas, teste: telaTeste, passaportes: telaPassaportes, vendedores: telaVendedores, garantias: telaGarantias, financiamento: telaFinanciamento, relatorio: telaRelatorio };
  function moverIndicador() {
    const ativo = $('.menu a[aria-current="page"]'), ind = $('.menu-indicador');
    if (!ativo || !ind) return;
    if (matchMedia('(min-width: 960px)').matches) { ind.style.transform = `translateY(${ativo.offsetTop}px)`; ind.style.width = ''; }
    else { ind.style.transform = `translateX(${ativo.offsetLeft}px)`; ind.style.width = ativo.offsetWidth + 'px'; }
  }
  let primeira = true;
  function rota() {
    const nome = (location.hash || '#visao').slice(1);
    const ativa = TELAS[nome] ? nome : 'visao';
    $$('.menu a').forEach((a) => { if (a.dataset.aba === ativa) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    moverIndicador();
    fecharCamada(true);
    const desenhar = () => { tela.classList.remove('saindo'); TELAS[ativa](); tela.classList.remove('entrando'); void tela.offsetWidth; tela.classList.add('entrando'); };
    if (primeira || reduzido) { primeira = false; desenhar(); return; }
    tela.classList.add('saindo');
    setTimeout(() => { desenhar(); window.scrollTo(0, 0); }, 120);
  }
  $('#sino').onclick = abrirAlertas;
  if (OP) sincronizar(false).then((r) => { if (r === 'novas') { toast(`Sincronizado com o seu sistema: ${estado.ultimaSync.novas} trocas novas.`); setTimeout(() => location.reload(), 1200); } else if (r === 'permissao') toast('Toque em Teste às cegas › Importar planilha › Sincronizar agora para atualizar com o seu sistema.'); }).catch(() => {});
  const nAl = listaAlertas().length; if (nAl) { $('#sino-n').hidden = false; $('#sino-n').textContent = nAl; }
  window.addEventListener('hashchange', rota);
  window.addEventListener('resize', moverIndicador);
  rota();
})();
