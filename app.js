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
  const NV = K.nuvem; // conta no servidor (só no ambiente real)
  const seloNuvem = () => { if (!NV) return; const n = NV.pendentes(); $('.selo-demo').textContent = NV.semInternet() ? 'Sem internet' + (n ? ` · ${n} esperando` : '') : n ? `Enviando ${n}…` : 'Minha revenda'; };
  $('.selo-demo').textContent = OP ? (NV && NV.offline ? 'Sem internet' : 'Minha revenda') : 'Dados demonstrativos';
  if (NV) { seloNuvem(); window.addEventListener('anshur:nuvem', seloNuvem); }
  $('.lateral-rodape').textContent = OP ? (NV ? 'Dados da sua revenda, guardados na conta da revenda.' : 'Dados reais da sua revenda, guardados só neste navegador.') : 'Dados demonstrativos de uma revenda fictícia.';
  const ehDono = () => K.usuarioAtual().perfil === 'dono';
  menuPerfil.innerHTML = `<p><b>${esc(K.usuarioAtual().nome)}</b><span>${K.PERFIS[K.usuarioAtual().perfil]} · ${esc(A.revenda.nome)}${OP ? ' · dados reais' : ''}${NV ? '<br>' + esc(NV.usuario.email || '') : ''}</span></p>
    <button type="button" role="menuitem" id="m-perfil">Meu perfil</button>
    <button type="button" role="menuitem" id="m-instalar">Instalar o app</button>
    <button type="button" role="menuitem" id="m-premissas">Premissas da revenda</button>
    <button type="button" role="menuitem" id="m-seg">Segurança dos dados</button>
    <button type="button" role="menuitem" id="m-ambiente">${OP ? 'Voltar para a demonstração' : 'Usar com os dados da minha revenda'}</button>
    ${NV ? `<button type="button" role="menuitem" id="m-nome">Nome da revenda</button>${(NV.revendas || []).length > 1 ? '<button type="button" role="menuitem" id="m-trocar">Trocar de revenda</button>' : ''}${ehDono() && !NV.offline ? '<button type="button" role="menuitem" id="m-apagar">Excluir a revenda e todos os dados</button>' : ''}<button type="button" role="menuitem" id="m-sair">Sair da conta</button>`
      : OP ? '<button type="button" role="menuitem" id="m-nome">Nome da revenda</button><button type="button" role="menuitem" id="m-apagar">Apagar dados da minha revenda</button>' : '<button type="button" role="menuitem" id="m-restaurar">Restaurar dados demonstrativos</button>'}`;
  const fechaMenu = () => { menuPerfil.hidden = true; btnPerfil.setAttribute('aria-expanded', 'false'); };
  $('#m-perfil').onclick = () => { fechaMenu(); location.hash = '#perfil'; };
  $('#m-instalar').onclick = () => { fechaMenu(); $('#instalar-btn').click(); };
  $('#m-premissas').onclick = () => { fechaMenu(); abrirPremissas(); };
  $('#m-seg').onclick = () => { fechaMenu(); abrirCamada('modal', `<h2>Segurança dos dados</h2>
      <p class="sub" style="margin-bottom:12px">O que acontece hoje com os seus números, sem promessa além do que existe.</p>
      ${NV ? `<ul style="margin:0;padding-left:20px;display:grid;gap:8px;font-size:16px">
        <li><b>Os dados da revenda ficam no servidor</b> (banco Postgres no Supabase), separados por revenda: cada pessoa só vê a revenda para a qual foi convidada.</li>
        <li>Cada pessoa entra com e-mail e senha próprios. O perfil (dono, gerente, vendedor, oficina, financeiro, auditor) é definido pelo dono e conferido pelo servidor.</li>
        <li>Trocas fechadas, aprovações, preços, vendas, convites e exclusões também vão para uma trilha no servidor que ninguém da revenda consegue alterar ou apagar.</li>
        <li>Documentos ficam numa pasta privada da revenda (até 10 MB cada); o link para abrir um original vale 2 minutos.</li>
        <li>Sem internet, o Anshur abre a última cópia deste aparelho: dá para consultar o pátio e cadastrar avaliações. O que for feito fica guardado no aparelho e é enviado quando a internet voltar; troca acima da alçada vira pedido de aprovação.</li>
        <li>O dono baixa uma cópia completa quando quiser (Configurações) e pode pedir a exclusão de tudo pelo menu do perfil.</li>
      </ul>` : `<ul style="margin:0;padding-left:20px;display:grid;gap:8px;font-size:16px">
        <li><b>Nesta versão, nada sai do seu computador.</b> Planilhas importadas, avaliações e trocas ficam guardadas só neste navegador.</li>
        <li>A demonstração e o ambiente com os dados da sua revenda são separados e não se misturam.</li>
        <li>Você pode apagar os dados da sua revenda a qualquer momento pelo menu do perfil.</li>
        <li>As planilhas exportadas são suas: dá para levar os dados para outro sistema quando quiser.</li>
      </ul>`}`); };
  $('#m-ambiente').onclick = () => { fechaMenu(); confirmar(OP ? 'Voltar para a demonstração?' : 'Usar com os dados da sua revenda?', OP ? (NV ? 'Seus dados continuam na conta da revenda; você pode voltar quando quiser.' : 'Seus dados continuam guardados neste navegador; você pode voltar quando quiser.') : 'Abre um ambiente separado, vazio, para importar o histórico real de trocas. A demonstração não se mistura com ele.', 'Trocar', () => { K.repo.trocarAmbiente(OP ? 'demo' : 'op'); location.hash = OP ? '#visao' : '#teste'; K.recarregar(); }); };
  if (OP) {
    $('#m-nome').onclick = () => { fechaMenu(); abrirCamada('modal', `<h2>Nome da revenda</h2><div class="campos" style="margin-top:12px"><div class="campo"><label for="n-nome">Nome</label><input id="n-nome" value="${esc(estado.nomeRevenda || '')}"></div><div class="campo"><label for="n-cid">Cidade</label><input id="n-cid" value="${esc(estado.cidadeRevenda || '')}"></div></div><div class="acoes"><button class="btn btn-ouro" type="button" id="n-ok">Salvar</button></div>`, (c) => { $('#n-ok', c).onclick = async () => { estado.nomeRevenda = $('#n-nome', c).value.trim(); estado.cidadeRevenda = $('#n-cid', c).value.trim(); if (NV && estado.nomeRevenda.length >= 2 && ['dono', 'gerente'].includes(K.usuarioAtual().perfil)) await NV.renomear(estado.nomeRevenda, estado.cidadeRevenda).catch((e) => toast(e.message, true)); salvar(); K.recarregar(); }; }); };
    if (NV) {
      const tr = $('#m-trocar'); if (tr) tr.onclick = () => { fechaMenu(); NV.trocarRevenda(); };
      $('#m-sair').onclick = () => { fechaMenu(); NV.sair(); };
      const ap = $('#m-apagar');
      if (ap) ap.onclick = () => { fechaMenu(); abrirCamada('modal', `<h2>Excluir a revenda e todos os dados</h2>
        <p class="sub" style="margin:6px 0 12px">Apaga do servidor, para sempre, tudo de <b>${esc(NV.revenda.nome)}</b>: trocas, avaliações, documentos, equipe, convites e a trilha de atividades. Antes, baixe uma cópia em Configurações. Não dá para desfazer.</p>
        <div class="campo"><label for="x-conf">Para confirmar, digite o nome da revenda: <b>${esc(NV.revenda.nome)}</b></label><input id="x-conf" autocomplete="off"></div>
        <div class="acoes"><button class="btn btn-perigo" type="button" id="x-ok">Excluir para sempre</button></div>`, (c) => {
        $('#x-ok', c).onclick = async (e) => {
          const v = $('#x-conf', c).value.trim(); if (v !== NV.revenda.nome) { toast('O nome digitado não confere.', true); return; }
          e.currentTarget.disabled = true; e.currentTarget.textContent = 'Excluindo…';
          try { await NV.excluirRevenda(v); toast('Revenda e dados excluídos do servidor.'); setTimeout(() => location.reload(), 900); }
          catch (er) { toast(er.message, true); e.currentTarget.disabled = false; e.currentTarget.textContent = 'Excluir para sempre'; }
        };
      }); };
    } else $('#m-apagar').onclick = () => { fechaMenu(); confirmar('Apagar os dados da sua revenda?', 'Remove deste navegador o histórico importado, as avaliações e as trocas registradas no ambiente real. Não dá para desfazer.', 'Apagar', () => { K.repo.apagar('op'); K.recarregar(); }); };
  } else {
    $('#m-restaurar').onclick = () => { fechaMenu(); confirmar('Restaurar dados demonstrativos?', 'As avaliações, trocas fechadas, vendas e preços alterados nesta demonstração serão apagados deste navegador.', 'Restaurar', () => { K.restaurar(); location.hash = '#visao'; K.recarregar(); }); };
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
      const aplicar = (v) => { Object.assign(cfg, v); A.margemAlvo = cfg.margemAlvo; estado.config = { margemAlvo: cfg.margemAlvo, jurosMes: cfg.jurosMes, baseJuros: cfg.baseJuros, comissaoPct: cfg.comissaoPct, descontoAcima: cfg.descontoAcima, valorHora: cfg.valorHora }; delete estado.margem; K.registrar('config', 'Regras comerciais alteradas'); salvar(); cacheLimpa(); fecharCamada(); toast('Premissas aplicadas.'); rota(); };
      $('#p-ok', c).onclick = () => aplicar({ margemAlvo: +m.value / 100, jurosMes: +j.value / 100, baseJuros: $('#p-base', c).value, comissaoPct: Math.max(0, num($('#p-com', c).value)) / 100, descontoAcima: Math.min(100, Math.max(0, num($('#p-desc', c).value))) / 100, valorHora: Math.max(0, num($('#p-hora', c).value)) || K.PADRAO.valorHora });
      $('#p-pad', c).onclick = () => aplicar({ ...K.PADRAO });
    });
  }

  // ---------- utilidades de interface ----------
  function toast(msg, erro) {
    if (NV && !erro && NV.pendentes()) {
      msg = String(msg).replace(/\b([Ss])alv(o|a|os|as)\b/g, (x, s1, f) => (s1 === 'S' ? 'G' : 'g') + 'uardad' + f);
      if (/guardad|registrad|aplicad|lançad|enviad|marcad|adicionad|atualizad/i.test(msg)) msg += NV.semInternet() ? ' Fica neste aparelho e vai para o servidor quando a internet voltar.' : ' Enviando ao servidor…';
    }
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
  // com conta, a faixa da nuvem já avisa quando não dá para gravar (só leitura ou sem internet)
  const salvar = () => { if (!K.gravar(estado) && !K.nuvem) toast('Não foi possível salvar neste navegador.', true); };

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
      <section class="painel"><h2>Comece pelo histórico de trocas</h2><p class="sub" style="margin:6px 0 14px">Importe de 10 a 200 trocas já vendidas (planilha do Excel ou CSV do seu sistema). O Anshur aprende com elas, mede o próprio erro e passa a avaliar as próximas trocas. ${K.nuvem ? 'Os dados ficam na conta da revenda.' : 'Os dados ficam só neste navegador.'}</p>
      <div class="acoes"><a class="btn btn-ouro" href="#teste">Importar histórico</a><button class="btn btn-linha" type="button" id="volta-demo">Ver a demonstração</button></div></section>`;
    $('#volta-demo').onclick = () => { K.repo.trocarAmbiente('demo'); K.recarregar(); };
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
        <div class="acoes"><a class="btn btn-linha" href="#patio">Ver pátio completo</a><button class="btn btn-linha" type="button" id="premissas-v">Premissas</button>${botaoAdicionar([{ nome: 'Nova avaliação', desc: 'Quanto pagar no usado da troca', acao: () => { location.hash = '#avaliar'; } }, { nome: 'Máquina no pátio', desc: 'Cadastrar à mão', acao: () => addMaquinaManual() }, { nome: 'Documento ou planilha', desc: 'Foto, PDF, CSV ou Excel', acao: () => { location.hash = '#documentos'; } }])}</div></div>
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
        <tbody>${agir.map((i) => { const nv = nivelRisco(i); return `<tr class="clicavel" tabindex="0" data-id="${i.t.id}"><td class="maq">${fotoMini(i.t)}<span><b>${esc(NOMES[i.t.tipo].split(' ')[0] + ' ' + i.t.marca + ' ' + i.t.modelo)}</b><span>${i.t.ano} · ${i.t.horas.toLocaleString('pt-BR')} h</span></span></td>
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
    ficha: { motor: 4, transmissao: 4, hidraulico: 3, pneus: 2, cabine: 4, lataria: 3 }, fotos: [], verif: { horimetro: false, notas: false, chassi: false }, declarado: '', fipe: '', anuncios: ['', '', ''], ia: null };
  const AV0 = JSON.parse(JSON.stringify(av));
  const chaveRascunho = () => (NV ? `anshur-rascunho:${NV.revenda.id}:${NV.usuario.id}` : 'anshur-rascunho-' + K.ambiente);
  let rascunhoDe = null, rascunhoTimer = null;
  try { const r = JSON.parse(localStorage.getItem(chaveRascunho())); if (r && r.av) { Object.assign(av, r.av); rascunhoDe = r.quando; } } catch (e) { /* sem rascunho */ }
  // só guarda quando a avaliação mudou desde o último rascunho ou registro (cliques que não mudam nada não criam rascunho)
  let rascunhoUltimo = JSON.stringify(av);
  function guardarRascunho() { clearTimeout(rascunhoTimer); rascunhoTimer = setTimeout(() => { const j = JSON.stringify(av); if (j === rascunhoUltimo) return; rascunhoUltimo = j; try { rascunhoDe = new Date().toISOString(); localStorage.setItem(chaveRascunho(), JSON.stringify({ av, quando: rascunhoDe })); } catch (e) { /* sem espaço: segue sem rascunho */ } }, 250); }
  function limparRascunho(zerar) { clearTimeout(rascunhoTimer); rascunhoDe = null; try { localStorage.removeItem(chaveRascunho()); } catch (e) { /* sem */ } if (zerar) { Object.assign(av, JSON.parse(JSON.stringify(AV0))); fotosGrandes = {}; } rascunhoUltimo = JSON.stringify(av); }
  // fotos em 1280 px só na memória desta tela (vão para a IA e, com conta e internet, para a pasta privada da revenda);
  // no rascunho e nos dados ficam miniaturas leves
  let fotosGrandes = {};
  const RT = window.RETENCAO;
  ['input', 'change', 'click'].forEach((ev) => tela.addEventListener(ev, (e) => { if (e.target.closest && e.target.closest('#passo') && (location.hash || '') === '#avaliar') guardarRascunho(); }));
  const condDe = (f) => Math.round(FICHA.reduce((s, [k]) => s + f[k], 0) / FICHA.length * 20);
  const maqAv = () => ({ tipo: av.tipo, marca: av.marca, modelo: av.modelo, ano: av.ano, horas: av.horas, cond: condDe(av.ficha), ficha: { ...av.ficha } });
  const num = (s) => { const v = parseFloat(String(s).replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.')); return isFinite(v) ? v : 0; };

  function telaAvaliar() {
    const nomesPasso = ['Identificação', 'Fotos', 'Inspeção', 'Resultado'];
    tela.innerHTML = `
      <div class="titulo"><div><h1>Avaliar troca</h1><p>Quanto vale pagar no usado que o cliente oferece, com base nas trocas que a ${esc(A.revenda.nome)} já vendeu.</p></div>${botaoAdicionar([{ nome: 'Preencher com documento', desc: 'Foto da nota ou do CRV da máquina', acao: () => { location.hash = '#documentos'; } }, { nome: 'Novo modelo no catálogo', desc: 'Modelo que ainda não está na lista', acao: () => { location.hash = '#config'; } }])}</div>
      <nav class="etapas" aria-label="Etapas da avaliação">${nomesPasso.map((n, i) => `<button type="button" data-p="${i + 1}" ${av.passo === i + 1 ? 'aria-current="step"' : ''} class="${av.passo > i + 1 ? 'feita' : ''}">${n}</button>`).join('')}</nav>
      ${rascunhoDe ? `<p class="conta" id="rascunho-aviso">Rascunho guardado neste aparelho (${new Date(rascunhoDe).toLocaleString('pt-BR')}). <button class="link" type="button" id="rascunho-zerar">Começar do zero</button></p>` : ''}
      <div id="passo"></div>
      ${estado.avaliacoes.length ? `<section class="painel bloco"><div class="painel-cab"><h2>Avaliações registradas</h2><p>${estado.avaliacoes.length} nesta demonstração</p></div>
        <div class="tabela-wrap"><table class="tabela"><thead><tr><th>Data</th><th>Máquina</th><th class="n">Valor máximo</th><th class="n">Venda estimada</th><th>Situação</th></tr></thead><tbody>
        ${estado.avaliacoes.slice().reverse().map((a) => `<tr><td>${data(a.data)}</td><td class="maq"><b>${esc(a.maq.marca + ' ' + a.maq.modelo)}</b><span>${a.maq.ano} · ${a.maq.horas.toLocaleString('pt-BR')} h</span></td><td class="n">${mil(a.teto)}</td><td class="n">${mil(a.venda)}</td><td>${{ troca: 'Virou troca', desistiu: 'Cliente desistiu' }[a.status] || (a.status === 'aberta' ? 'Em negociação' : '—')}${a.ia ? ' <span class="tag comprovado">IA revisada</span>' : ''}</td></tr>`).join('')}</tbody></table></div></section>` : ''}`;
    $$('.etapas button', tela).forEach((b) => b.onclick = () => irPasso(+b.dataset.p));
    const zr = $('#rascunho-zerar'); if (zr) zr.onclick = () => { limparRascunho(true); telaAvaliar(); };
    desenharPasso();
  }
  function irPasso(p) {
    if (p > 1 && !(av.horas > 0)) { av.passo = 1; desenharPasso(); toast('Informe as horas do horímetro para continuar.', true); return; }
    // nada da IA entra no resultado sem o avaliador decidir item a item
    if (p > 3 && iaPendentes() > 0) { toast(`Revise as ${iaPendentes()} sugestões da IA (aceitar ou manter a sua nota) antes do resultado.`, true); p = 3; }
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
    if (av.passo === 2) h = passoFotos();
    if (av.passo === 3) { const c = condDe(av.ficha); h = `<section class="painel passo"><div class="painel-cab"><h2>Inspeção</h2><p>Nota de 1 (ruim) a 5 (ótimo)</p></div>
        ${av.ia ? `<p class="conta ia-aviso">${av.ia.exemplo ? '<span class="tag declarado">Exemplo</span> ' : ''}A IA olhou ${av.ia.nFotos} fotos e <b>sugeriu</b> notas. Quem decide é você: aceite ou mantenha a sua nota em cada item${iaPendentes() ? ` (<b id="ia-falta">${iaPendentes()} para revisar</b>)` : ' (tudo revisado)'}.</p>` : '<p class="ajuda">Tire as fotos guiadas no passo anterior e a IA sugere as notas; você confere e decide item a item.</p>'}
        ${FICHA.map(([k, n, d]) => `<div class="criterio"><div><b id="r-${k}">${n}</b><p>${d}</p>${linhaIA(k)}</div><div class="notas" role="group" aria-labelledby="r-${k}">${[1, 2, 3, 4, 5].map((v) => `<button type="button" data-k="${k}" data-v="${v}" aria-pressed="${av.ficha[k] === v}">${v}</button>`).join('')}</div></div>`).join('')}
        ${avariasIA()}
        <div style="margin-top:16px"><span class="rot-campo">Nota geral</span> <b id="nota-geral">${c}/100</b><div class="medidor"><i id="medidor" style="width:${c}%"></i></div></div>
        <h2 style="margin-top:22px">Documentação e evidências</h2>
        <div class="campos" style="margin-top:14px">
          <div class="campo inteiro"><span class="rot-campo">Verificado pela revenda</span><div class="checks">
            <label class="check"><input type="checkbox" data-v="horimetro" ${av.verif.horimetro ? 'checked' : ''}> Horímetro conferido com foto</label>
            <label class="check"><input type="checkbox" data-v="notas" ${av.verif.notas ? 'checked' : ''}> Notas ou ordens de serviço entregues</label>
            <label class="check"><input type="checkbox" data-v="chassi" ${av.verif.chassi ? 'checked' : ''}> Chassi e número de série conferidos</label></div></div>
          <div class="campo inteiro"><label for="f-decl">Declarado pelo cliente (ainda sem comprovante)</label><textarea id="f-decl" rows="2" placeholder="Ex.: motor retificado em 2023, sempre revisado na concessionária">${esc(av.declarado)}</textarea></div>
          <div class="campo"><label for="f-fipe">Tabela Fipe desta máquina (opcional)</label><input id="f-fipe" inputmode="numeric" placeholder="R$" value="${esc(av.fipe)}"></div>
          <div class="campo"><span class="rot-campo">Anúncios parecidos (opcional)</span><div style="display:flex;gap:6px">${av.anuncios.map((a, i) => `<input aria-label="Preço do anúncio ${i + 1}" data-an="${i}" inputmode="numeric" placeholder="R$" value="${esc(a)}" style="min-height:42px;padding:9px;border-radius:6px;border:1px solid rgba(17,24,32,.16);background:var(--marinho);width:100%">`).join('')}</div></div>
        </div>${navPasso()}</section>`; }
    if (av.passo === 4) h = `<div class="passo" id="resultado"></div>`;
    caixa.innerHTML = h;
    $$('[data-ir]', caixa).forEach((b) => b.onclick = () => irPasso(av.passo + +b.dataset.ir));
    if (av.passo === 1) {
      $('#f-tipo').onchange = (e) => { const tinha = av.fotos.some(Boolean) || av.ia; av.tipo = e.target.value; if (tinha) { av.fotos = []; av.ia = null; fotosGrandes = {}; toast('Tipo trocado: as fotos guiadas e as sugestões da IA foram zeradas (a lista de fotos muda por tipo).'); } desenharPasso(); };
      $('#f-marca').onchange = (e) => { av.marca = e.target.value; desenharPasso(); };
      $('#f-modelo').onchange = (e) => { av.modelo = e.target.value; };
      $('#f-ano').onchange = (e) => { av.ano = +e.target.value; };
      $('#f-horas').oninput = (e) => { av.horas = Math.max(0, +e.target.value || 0); $('#e-horas').textContent = av.horas > 0 ? '' : 'Informe as horas do horímetro.'; };
      $('#f-local').oninput = (e) => { av.local = e.target.value; };
      $('#f-nova').onchange = (e) => { av.nova = e.target.value; };
      $('#f-obs').oninput = (e) => { av.obs = e.target.value; };
    }
    if (av.passo === 2) ligarFotos(caixa);
    if (av.passo === 3) {
      $$('.notas button', caixa).forEach((b) => b.onclick = () => {
        const k = b.dataset.k, v = +b.dataset.v;
        av.ficha[k] = v; $$('button', b.parentNode).forEach((x) => x.setAttribute('aria-pressed', x === b));
        // escolher uma nota com sugestão pendente é a decisão do avaliador sobre aquele item
        const s = av.ia && av.ia.sugestao.itens[k];
        if (s && s.nota && !av.ia.decisoes[k]) { av.ia.decisoes[k] = { sugerida: s.nota, final: v, acao: v === s.nota ? 'aceitou' : 'alterou' }; desenharPasso(); return; }
        const c = condDe(av.ficha); $('#nota-geral').textContent = c + '/100'; $('#medidor').style.width = c + '%';
      });
      $$('[data-ia-aceita]', caixa).forEach((b) => b.onclick = () => { const k = b.dataset.iaAceita, s = av.ia.sugestao.itens[k]; av.ficha[k] = s.nota; av.ia.decisoes[k] = { sugerida: s.nota, final: s.nota, acao: 'aceitou' }; guardarRascunho(); desenharPasso(); });
      $$('[data-ia-mantem]', caixa).forEach((b) => b.onclick = () => { const k = b.dataset.iaMantem, s = av.ia.sugestao.itens[k]; av.ia.decisoes[k] = { sugerida: s.nota, final: av.ficha[k], acao: 'manteve' }; guardarRascunho(); desenharPasso(); });
      $$('[data-ia-rever]', caixa).forEach((b) => b.onclick = () => { delete av.ia.decisoes[b.dataset.iaRever]; guardarRascunho(); desenharPasso(); });
      $$('[data-avaria]', caixa).forEach((b) => b.onclick = () => { av.ia.avariasDec[+b.dataset.avaria] = b.dataset.conf === '1' ? 'confirmada' : 'descartada'; guardarRascunho(); desenharPasso(); });
      $$('input[data-v]', caixa).forEach((c) => c.onchange = () => { av.verif[c.dataset.v] = c.checked; });
      $('#f-decl').oninput = (e) => { av.declarado = e.target.value; };
      $('#f-fipe').oninput = (e) => { av.fipe = e.target.value; };
      $$('[data-an]', caixa).forEach((i) => i.oninput = () => { av.anuncios[+i.dataset.an] = i.value; });
    }
    if (av.passo === 4) desenharResultado();
  }

  // ---------- AVALIAÇÃO FOTOGRÁFICA COM IA (a IA sugere; o avaliador decide item a item) ----------
  const NOME_ITEM = Object.fromEntries(FICHA.map(([k, n]) => [k, n]));
  function passoFotos() {
    const ang = RT.angulosDe(av.tipo), n = ang.filter((a, i) => av.fotos[i]).length;
    return `<section class="painel passo"><div class="painel-cab"><h2>Fotos guiadas · ${NOMES[av.tipo]}</h2><p><b id="fotos-n">${n}</b> de ${ang.length} fotos</p></div>
      <p class="ajuda">Siga a lista: cada foto ajuda a avaliar um item da ficha. O ideal é tirar todas (de 10 a 15); com 3 ou mais a IA já sugere as notas. As fotos são reduzidas no aparelho (1280 px) antes de qualquer envio.</p>
      <div class="fotos fotos-guiadas">${ang.map((a, i) => `<label class="foto ${av.fotos[i] ? 'tem' : ''}" style="${av.fotos[i] ? `background-image:url(${av.fotos[i]})` : ''}"><span class="foto-nome">${esc(a.nome)}</span><span class="foto-dica">${esc(a.dica)}</span><input type="file" accept="image/*" capture="environment" data-i="${i}" aria-label="Foto: ${esc(a.nome)}. ${esc(a.dica)}"></label>`).join('')}</div>
      <div class="ia-caixa" id="ia-caixa">${blocoIA(n)}</div>${navPasso()}</section>`;
  }
  function blocoIA(n) {
    const quem = OP ? (NV ? 'IA definida pelo dono em Configurações (padrão: IA da Blue Rose, Gemini grátis, 30 análises por dia)' : 'IA disponível na conta da revenda') : 'Na demonstração a análise mostra um <b>exemplo fixo</b>: nenhuma foto sai deste aparelho';
    if (av.ia) {
      const s = av.ia.sugestao, falt = s.faltando || [], ang = RT.angulosDe(av.tipo);
      return `<h3>${av.ia.exemplo ? '<span class="tag declarado">Exemplo</span> ' : ''}Sugestões da IA prontas</h3>
        <p class="sub">Analisou ${av.ia.nFotos} fotos em ${new Date(av.ia.quando).toLocaleString('pt-BR')}${av.ia.provedor ? ' · ' + esc(av.ia.provedor === 'blue_rose' ? 'IA da Blue Rose' : av.ia.provedor === 'exemplo' ? 'exemplo da demonstração' : 'IA própria da revenda') : ''}. Nada foi aplicado: revise item a item na Inspeção.</p>
        ${(s.avarias || []).length ? `<p style="margin-top:8px"><b>${s.avarias.length} ${s.avarias.length === 1 ? 'possível avaria vista' : 'possíveis avarias vistas'}</b> (confira na Inspeção).</p>` : ''}
        ${falt.length ? `<p class="sub" style="margin-top:6px"><b>Fotos faltando ou sem nitidez:</b> ${falt.map((f) => esc(((ang.find((a) => a.id === f.angulo) || {}).nome || f.angulo) + ' (' + f.motivo + ')')).join('; ')}</p>` : ''}
        ${s.observacao ? `<p class="sub" style="margin-top:6px">${esc(s.observacao)}</p>` : ''}
        <div class="acoes"><button class="btn btn-ouro" type="button" data-ir="1">Revisar na Inspeção</button><button class="btn btn-linha" type="button" id="ia-analisar">Analisar de novo</button></div>`;
    }
    return `<h3>Avaliação das fotos com IA</h3><p class="sub">${quem}. A IA sugere nota por item, possíveis avarias e fotos faltando; não inventa defeito (diz "não dá para ver") e não salva nada sem a sua revisão.</p>
      <div class="acoes"><button class="btn btn-ouro" type="button" id="ia-analisar" ${n >= 3 ? '' : 'disabled'}>Analisar ${n} ${n === 1 ? 'foto' : 'fotos'} com IA</button>${n < 3 ? '<span class="sub">Tire pelo menos 3 fotos.</span>' : ''}</div>`;
  }
  const comprimir = (arq, lado, q) => new Promise((ok, erro) => {
    const img = new Image(), url = URL.createObjectURL(arq);
    img.onload = () => { const cv = document.createElement('canvas'), k = Math.min(1, lado / Math.max(img.width, img.height)); cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k); cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height); URL.revokeObjectURL(url); ok(cv.toDataURL('image/jpeg', q)); };
    img.onerror = () => { URL.revokeObjectURL(url); erro(new Error('imagem')); }; img.src = url;
  });
  function ligarFotos(caixa) {
    const ang = RT.angulosDe(av.tipo);
    $$('input[type=file]', caixa).forEach((inp) => inp.onchange = async () => {
      const arq = inp.files[0]; if (!arq) return; const i = +inp.dataset.i;
      try {
        const [grande, mini] = await Promise.all([comprimir(arq, 1280, 0.7), comprimir(arq, 480, 0.62)]);
        fotosGrandes[ang[i].id] = grande; av.fotos[i] = mini; guardarRascunho();
        const lab = inp.parentNode; lab.classList.add('tem'); lab.style.backgroundImage = `url(${mini})`;
        const n = ang.filter((a, j) => av.fotos[j]).length; $('#fotos-n').textContent = n;
        if (!av.ia) { $('#ia-caixa').innerHTML = blocoIA(n); ligarIA(caixa); }
        toast(`Foto adicionada: ${ang[i].nome}.`);
      } catch (e) { toast('Não foi possível ler essa imagem.', true); }
    });
    ligarIA(caixa);
  }
  function ligarIA(caixa) {
    const b = $('#ia-analisar', caixa); if (b) b.onclick = () => analisarIA(b);
    $$('#ia-caixa [data-ir]', caixa).forEach((x) => x.onclick = () => irPasso(av.passo + +x.dataset.ir));
  }
  // exemplo da demonstração: fixo, marcado "Exemplo", sem enviar foto a lugar nenhum
  function exemploIA() {
    const ang = RT.angulosDe(av.tipo), tem = new Set(ang.filter((a, i) => av.fotos[i]).map((a) => a.id));
    const viu = (k) => ang.some((a) => tem.has(a.id) && a.itens.includes(k));
    const base = { motor: [3, 'Mangueiras ressecadas e resto de óleo perto da bomba injetora (foto Motor).'], transmissao: [4, 'Sem vazamento visível na caixa (foto Transmissão).'], hidraulico: [3, 'Engate traseiro com folga aparente e mangueira remendada (foto Hidráulico).'], pneus: [2, 'Garras dos pneus traseiros gastas, cerca de 30% de vida (foto Pneus traseiros).'], cabine: [4, 'Painel inteiro e bancos em bom estado (foto Cabine).'], lataria: [3, 'Ferrugem leve no para-lama esquerdo e repintura no capô (foto Lateral esquerda).'] };
    const itens = {}; Object.keys(base).forEach((k) => { itens[k] = viu(k) ? { nota: base[k][0], justificativa: base[k][1] } : { nota: null, justificativa: 'Não dá para ver: falta a foto deste item.' }; });
    return { itens, avarias: viu('pneus') ? [{ descricao: 'Desgaste forte nas garras dos pneus traseiros', foto: 'pneus-tras', gravidade: 'moderada' }] : [], faltando: ang.filter((a) => !tem.has(a.id)).slice(0, 6).map((a) => ({ angulo: a.id, motivo: 'foto não tirada' })), observacao: 'Exemplo fixo da demonstração: na conta da revenda a IA olha as fotos de verdade.' };
  }
  async function analisarIA(b) {
    const ang = RT.angulosDe(av.tipo), idx = ang.map((a, i) => i).filter((i) => av.fotos[i]);
    if (idx.length < 3) { toast('Tire pelo menos 3 fotos.', true); return; }
    let sugestao, provedor = 'exemplo', modelo = '';
    if (!NV) sugestao = exemploIA();
    else {
      if (NV.semInternet()) { toast('Sem internet: a IA analisa quando a conexão voltar. Você pode seguir e dar as notas à mão.', true); return; }
      b.disabled = true; b.textContent = 'Analisando as fotos…';
      try {
        const fotos = idx.map((i) => ({ angulo: ang[i].id, mime: 'image/jpeg', dados: String(fotosGrandes[ang[i].id] || av.fotos[i]).split(',')[1] }));
        const r = await NV.ia('analisar', { tipo: av.tipo, maquina: { tipo: av.tipo, marca: av.marca, modelo: av.modelo, ano: av.ano, horas: av.horas }, fotos });
        sugestao = RT.limparSugestao(r.sugestao, ang.map((a) => a.id)); provedor = r.provedor; modelo = r.modelo;
        if (r.restantes != null) toast(`Análise pronta. Restam ${r.restantes} análises grátis hoje.`);
      } catch (e) { b.disabled = false; b.textContent = 'Analisar com IA'; toast(e.message, true); return; }
    }
    av.ia = { quando: new Date().toISOString(), exemplo: !NV, provedor, modelo, nFotos: idx.length, sugestao, decisoes: {}, avariasDec: {} };
    // itens sem nota sugerida ("não dá para ver") não pedem decisão: ficam com a nota do avaliador
    guardarRascunho(); desenharPasso();
    if (!NV) toast('Exemplo pronto (demonstração). Revise na Inspeção.');
  }
  const iaPendentes = () => { if (!av.ia) return 0; const s = av.ia.sugestao; return Object.keys(s.itens).filter((k) => s.itens[k].nota && !av.ia.decisoes[k]).length + (s.avarias || []).filter((x, i) => !av.ia.avariasDec[i]).length; };
  function linhaIA(k) {
    if (!av.ia) return ''; const s = av.ia.sugestao.itens[k]; if (!s) return '';
    if (!s.nota) return `<p class="ia-linha ia-nada">IA: ${esc(s.justificativa || 'não dá para ver nas fotos')}</p>`;
    const d = av.ia.decisoes[k];
    if (d) return `<p class="ia-linha ia-feita">IA sugeriu ${d.sugerida} · você ${d.acao === 'aceitou' ? 'aceitou' : d.acao === 'manteve' ? 'manteve ' + d.final : 'escolheu ' + d.final} <button class="link" type="button" data-ia-rever="${k}">rever</button></p>`;
    return `<div class="ia-linha ia-pendente"><span><b>IA sugere ${s.nota}</b> · ${esc(s.justificativa)}</span><span class="ia-bts"><button class="btn btn-linha" type="button" data-ia-aceita="${k}">Aceitar ${s.nota}</button><button class="btn btn-linha" type="button" data-ia-mantem="${k}">Manter ${av.ficha[k]}</button></span></div>`;
  }
  function avariasIA() {
    if (!av.ia || !(av.ia.sugestao.avarias || []).length) return '';
    const ang = RT.angulosDe(av.tipo);
    return `<div class="ia-avarias"><b>Possíveis avarias vistas pela IA</b>${av.ia.sugestao.avarias.map((x, i) => { const d = av.ia.avariasDec[i]; return `<div class="ia-linha ${d ? 'ia-feita' : 'ia-pendente'}"><span>${esc(x.descricao)} <span class="sub">· ${esc(x.gravidade)}${x.foto ? ' · foto ' + esc((ang.find((a) => a.id === x.foto) || {}).nome || x.foto) : ''}</span></span>${d ? `<span>${d === 'confirmada' ? 'Você confirmou' : 'Você descartou'}</span>` : `<span class="ia-bts"><button class="btn btn-linha" type="button" data-avaria="${i}" data-conf="1">Confere</button><button class="btn btn-linha" type="button" data-avaria="${i}" data-conf="0">Não confere</button></span>`}</div>`; }).join('')}</div>`;
  }
  // o que a IA sugeriu e o que o avaliador decidiu (vai para a avaliação, o retrato e a trilha do servidor)
  function resumoIA() {
    if (!av.ia) return null;
    const s = av.ia.sugestao, d = av.ia.decisoes, ks = Object.keys(d);
    const n = (a) => ks.filter((k) => d[k].acao === a).length;
    const av_ = (s.avarias || []).map((x, i) => ({ descricao: x.descricao, decisao: av.ia.avariasDec[i] || 'sem revisão' }));
    const texto = `${av.ia.exemplo ? 'EXEMPLO (demonstração): ' : ''}IA sugeriu ${Object.entries(s.itens).map(([k, v]) => `${NOME_ITEM[k]} ${v.nota || '—'}`).join(', ')}; o avaliador aceitou ${n('aceitou')}, alterou ${n('alterou')}, manteve ${n('manteve')}${ks.filter((k) => d[k].acao !== 'aceitou').length ? ' (' + ks.filter((k) => d[k].acao !== 'aceitou').map((k) => `${NOME_ITEM[k]}: ${d[k].sugerida}→${d[k].final}`).join(', ') + ')' : ''}${av_.length ? `; avarias: ${av_.filter((x) => x.decisao === 'confirmada').length} confirmadas, ${av_.filter((x) => x.decisao === 'descartada').length} descartadas` : ''}.`;
    return { quando: av.ia.quando, exemplo: !!av.ia.exemplo, provedor: av.ia.provedor, modelo: av.ia.modelo, fotos: av.ia.nFotos, decisoes: d, avarias: av_, faltando: (s.faltando || []).map((f) => f.angulo), resumo: texto };
  }
  // com conta e internet, as fotos em 1280 px vão para a pasta privada da revenda (no JSON ficam só miniaturas)
  async function subirFotos(id, grandes, tipo) {
    if (!NV || NV.semInternet() || !NV.subirDoc) return [];
    const ang = RT.angulosDe(tipo), out = [];
    for (const a of ang) {
      const d = grandes[a.id]; if (!d) continue;
      try { const bin = atob(d.split(',')[1]), u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i); out.push({ angulo: a.id, caminho: await NV.subirDoc(id + '-foto', new File([u8], a.id + '.jpg', { type: 'image/jpeg' })) }); } catch (e) { /* segue: a miniatura fica nos dados */ }
    }
    return out;
  }
  const zerarFotosIA = () => { av.fotos = []; av.ia = null; fotosGrandes = {}; };

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
          ${(() => { const hv = checaHorimetro({ ...maq, manutencoes: [] }); const vm = variacaoMercado(maq.tipo); const cs = compradoresPara({ ...maq, anuncio: Math.round(r.venda * 1.08) }); return (hv.length ? `<section class="painel bloco" style="border-color:#F0CFCB;background:#FBEDEB"><h2 style="color:#8E2F2B">${ICO.alerta}Horímetro: confira antes de fechar</h2><ul class="lista-motivos">${hv.map((x) => `<li><span>${esc(x)}</span></li>`).join('')}</ul></section>` : '')
            + (vm != null ? `<section class="painel bloco ${vm < -0.05 ? 'aviso-ruim' : ''}"><h2>${ICO.linha}Mercado de ${NOMES[maq.tipo].toLowerCase()}</h2><p style="font-size:17px;margin-top:6px">Anúncios e leilões ${vm < 0 ? 'caíram' : 'subiram'} <b class="${vm < 0 ? 'neg' : 'pos'}">${pct(Math.abs(vm))}</b> nos últimos 2 meses.${vm < -0.05 ? ' O histórico da revenda ainda não reflete essa queda: considere negociar abaixo do valor máximo.' : ''}</p><a class="link" href="#mercado">Ver monitor de mercado</a></section>` : '')
            + `<section class="painel bloco"><h2>${ICO.alvo}Quem compraria esta máquina</h2>${cs.length ? `<p style="margin:6px 0 8px">${cs.length} ${cs.length === 1 ? 'comprador cadastrado procura' : 'compradores cadastrados procuram'} algo assim:</p>${cs.slice(0, 3).map((c) => `<span class="tag comprovado" style="margin:0 6px 6px 0">${esc(c.nome)} · até ${mil(c.precoMax)}</span>`).join('')}` : '<p class="sub" style="margin-top:6px">Nenhum comprador cadastrado procura esta máquina agora.</p>'}</section>`; })()}
          ${blocoBarter(r.teto, 'bt-av')}
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
    ligarBarter(caixa, r.teto, 'bt-av');
    const res_ = $('#reserva', caixa); if (res_) res_.onchange = () => { av.reserva = res_.checked; desenharResultado(); toast(av.reserva ? 'Reserva de risco descontada do valor máximo.' : 'Reserva de risco retirada.'); };
    $('#registrar').onclick = (e) => {
      const b = e.currentTarget; b.classList.add('carregando');
      // a avaliação congela os números e as premissas do dia: não é recalculada quando o modelo muda
      const ia = resumoIA();
      tirarRetrato(maq, r, { decisao: 'Avaliação registrada', ia: ia ? ia.resumo : null }).then((rt) => { const id = 'AV' + Date.now(); estado.avaliacoes.push({ retrato: rt.id, id, data: hojeISO(), por: eu().nome, loja: estado.lojaAtual || '', status: 'aberta', maq, teto: r.teto, venda: r.venda, preparo: r.preparo, faixa: r.faixa, confianca: r.confianca, amostras: r.base, mape: r.qualidade ? r.qualidade.mape : null, premissas: { margemAlvo: r.margem, jurosMes: K.cfg.jurosMes }, ...(ia ? { ia } : {}), fotos: av.fotos.filter(Boolean).length }); log('avaliacao', `Avaliação registrada: ${maq.marca} ${maq.modelo} ${maq.ano}, máximo ${real(r.teto)}`); if (ia) log('ia', `Avaliação ${maq.marca} ${maq.modelo}: ${ia.resumo}`, { ref: id }); salvar(); zerarFotosIA(); limparRascunho(); b.classList.remove('carregando'); toast('Avaliação registrada com retrato imutável.'); telaAvaliar(); });
    };
    $('#premissas').onclick = abrirPremissas;
    $('#fechar-troca').onclick = () => abrirCamada('modal', `<h2>Fechar troca</h2><p class="sub">Registre o valor efetivamente negociado. Ele pode ser diferente do valor máximo recomendado.</p>
      <div class="campos" style="margin-top:16px">
        <div class="campo"><label for="t-valor">Valor pago na troca</label><input id="t-valor" inputmode="numeric" value="${r.teto.toLocaleString('pt-BR')}"></div>
        <div class="campo"><label for="t-data">Data</label><input id="t-data" type="date" value="${hojeISO()}" max="${hojeISO()}"></div>
        <div class="campo"><label for="t-vend">Vendedor</label><select id="t-vend">${VENDEDORES().map((v) => `<option>${esc(v)}</option>`).join('')}</select></div>
        <div class="campo" id="t-aprov-box" hidden><label for="t-aprov">Aprovado por (gerente)</label><input id="t-aprov" list="dl-gerentes" placeholder="Nome de quem autorizou" value="${podeAprovar() ? esc(eu().nome) : ''}">${lista('dl-gerentes', estado.usuarios.filter((u) => ['dono', 'gerente'].includes(u.perfil)).map((u) => u.nome))}</div>
        <div class="campo inteiro" id="t-mot-box" hidden><label for="t-mot">Motivo para pagar acima</label><input id="t-mot" placeholder="Ex.: cliente fecha a compra de uma colhedora nova"></div>
      </div>
      <p class="conta" id="t-aviso">Valor máximo recomendado: ${real(r.teto)}.</p>
      <div class="acoes"><button class="btn btn-ouro" type="button" id="t-ok">Confirmar troca</button><button class="btn btn-linha" type="button" id="t-nao">Cancelar</button></div>`, (c) => {
      const inp = $('#t-valor', c), aviso = $('#t-aviso', c);
      const checar = () => {
        const v = num(inp.value), d = v - r.teto;
        $('#t-aprov-box', c).hidden = !(d > 0); $('#t-mot-box', c).hidden = !(d > 0);
        const nv = nivelExigido(maq.tipo, d);
        $('#t-aprov-box', c).hidden = !(d > 0) || nv === 'livre'; $('#t-mot-box', c).hidden = !(d > 0);
        aviso.innerHTML = !(v > 0) ? '<span class="neg">Informe o valor pago.</span>' : d > 0 ? `<span class="neg">${real(d)} acima do valor máximo recomendado (${NOME_NIVEL[nv]} para ${NOMES[maq.tipo].toLowerCase()}). A margem projetada cai para ${pct((r.venda - v - r.preparo) / r.venda)}. Pela regra da revenda, ${pct(K.cfg.descontoAcima, 0)} do valor acima (${real(d * K.cfg.descontoAcima)}) sai da comissão do vendedor.</span>
          <div class="contra"><b>Antes de pagar acima, ofereça ao cliente:</b>${contraproposta(d, r).map((o) => `<div><b>${esc(o.t)}</b><span>${esc(o.d)}</span></div>`).join('')}</div>` : `Dentro do valor máximo recomendado (${real(r.teto)}). Margem projetada: ${pct((r.venda - v - r.preparo) / r.venda)}.`;
      };
      inp.oninput = checar; checar();
      $('#t-nao', c).onclick = () => fecharCamada();
      $('#t-ok', c).onclick = async (e) => {
        const v = num(inp.value), dt = $('#t-data', c).value || hojeISO();
        if (!(v > 0)) { inp.focus(); toast('Informe o valor pago na troca.', true); return; }
        const acima = v > r.teto, aprov = $('#t-aprov', c).value.trim(), mot = $('#t-mot', c).value.trim();
        const nivel = nivelExigido(maq.tipo, v - r.teto);
        // sem internet, a aprovação acima da alçada não vale: a troca vira pedido e só conta quando aprovada com internet
        const semRedeAprov = acima && nivel !== 'livre' && NV && NV.semInternet();
        if (acima && !mot) { $('#t-mot', c).focus(); toast('Acima do recomendado: informe o motivo.', true); return; }
        if (acima && nivel !== 'livre' && podeLiberar(nivel) && !aprov && !semRedeAprov) { $('#t-aprov', c).focus(); toast('Informe quem aprovou.', true); return; }
        if (acima && (!podeLiberar(nivel) || semRedeAprov)) {
          const rt = await tirarRetrato(maq, r, { valorPago: Math.round(v), decisao: 'Pedido de aprovação (' + NOME_NIVEL[nivel] + ')', motivo: mot });
          const ped = { id: 'P' + Date.now() + Math.random().toString(36).slice(2, 5), nivel, semInternet: !!semRedeAprov, retrato: rt.id, quando: new Date().toISOString(), por: eu().nome, maq, rec: { teto: r.teto, venda: r.venda, preparo: r.preparo, dias: r.dias, margem: r.margem, margemSobreVenda: r.margemSobreVenda, confianca: r.confianca, doTipo: r.doTipo, qualidade: r.qualidade ? { mape: r.qualidade.mape } : null }, valor: Math.round(v), data: dt, motivo: mot, status: 'pendente', extra: { vendedor: $('#t-vend', c).value, negociacao: av.nova || null, origem: av.local || 'Troca registrada', fotos: av.fotos.filter(Boolean).slice(0, 4), verif: { ...av.verif }, ...(resumoIA() ? { ia: resumoIA() } : {}) } };
          estado.pendentes.push(ped); log('aprovacao', `Pedido de aprovação: ${maq.marca} ${maq.modelo} por ${real(v)} (máximo ${real(r.teto)})${semRedeAprov ? ', feito sem internet' : ''}`); if (resumoIA()) log('ia', `Pedido ${maq.marca} ${maq.modelo}: ${resumoIA().resumo}`); salvar(); zerarFotosIA(); limparRascunho(); atualizarSino();
          fecharCamada(true); toast(semRedeAprov ? 'Sem internet: a troca virou pedido de aprovação (pendente). Ela só entra no pátio depois de aprovada com internet.' : nivel === 'dono' ? 'Pedido enviado ao dono: para este tipo de máquina, só ele libera.' : 'Pedido enviado ao gerente. A troca só entra no pátio depois da aprovação.'); location.hash = '#aprovacoes'; return;
        }
        const b = e.currentTarget; b.classList.add('carregando');
        const rtF = await tirarRetrato(maq, r, { valorPago: Math.round(v), decisao: acima ? (nivel === 'livre' ? 'Acima do teto, dentro da alçada do vendedor' : 'Acima do teto, aprovada por ' + aprov) : 'Dentro do valor máximo', motivo: mot });
        setTimeout(() => {
          const t = K.fecharTroca(estado, maq, r, v, dt, { retrato: rtF.id, vendedor: $('#t-vend', c).value, negociacao: av.nova || null, aprovacao: acima ? { por: nivel === 'livre' ? eu().nome + ' (alçada do vendedor)' : aprov, motivo: mot, excesso: v - r.teto, data: hojeISO() } : null, origem: av.local || 'Troca registrada',
            manutencoes: av.declarado ? [{ servico: av.declarado, horas: av.horas, comNota: av.verif.notas }] : [], fotos: av.fotos.filter(Boolean).slice(0, 4), verif: { ...av.verif }, ...(resumoIA() ? { ia: resumoIA() } : {}) });
          const id = t.id;
          A.trocas.push({ ...t }); const iaT = resumoIA(); if (iaT) log('ia', `Troca ${t.marca} ${t.modelo}: ${iaT.resumo}`, { ref: t.id }); const subir = subirFotos(t.id, { ...fotosGrandes }, av.tipo); zerarFotosIA(); limparRascunho(); subir.then((l) => { if (!l.length) return; const f = estado.fechadas.find((x) => x.id === id); if (f) { f.fotosArq = l; salvar(); } }); log('troca', `Troca fechada: ${t.marca} ${t.modelo} por ${real(t.pago)} (máximo recomendado ${real(r.teto)})${t.aprovacao ? `, acima do teto, aprovada por ${t.aprovacao.por}` : ''}`, { ref: t.id }); salvar(); cacheLimpa();
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
    const q = (fp.busca || '').toLowerCase();
    let itens = todos.filter((i) => (!q || [i.t.marca, i.t.modelo, i.t.chassi, i.t.vendedor, i.t.loja].join(' ').toLowerCase().includes(q)) && (!fp.tipo || i.t.tipo === fp.tipo) && (!fp.marca || i.t.marca === fp.marca) && (!fp.idade || i.faixa === fp.idade));
    const ord = { risco: (a, b) => b.risco - a.risco, capital: (a, b) => b.t.pago - a.t.pago, dias: (a, b) => b.dias - a.dias, margem: (a, b) => a.margem - b.margem };
    itens.sort(ord[fp.ordem]);
    const cap = itens.reduce((s, i) => s + i.t.pago, 0), velhos = itens.filter((i) => i.dias > 90);
    const marcas = [...new Set(todos.map((i) => i.t.marca))].sort();
    tela.innerHTML = `
      <div class="titulo"><div><h1>Pátio de máquinas</h1><p>Saiba onde seu capital está parado e quais equipamentos exigem atenção.</p></div>
        <div class="acoes"><button class="btn btn-linha" type="button" id="exportar">${ic('<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>')}Exportar</button><button class="btn btn-linha" type="button" id="comparar">Comparar (<span id="n-comp">${comparar.size}</span>)</button>${botaoAdicionar([{ nome: 'Cadastrar à mão', desc: 'Máquina que entrou no pátio', acao: () => addMaquinaManual() }, { nome: 'Puxar de documento', desc: 'Foto da nota, PDF ou planilha', acao: () => { location.hash = '#documentos'; } }, { nome: 'Avaliar uma troca', desc: 'Calcular o valor máximo antes de fechar', acao: () => { location.hash = '#avaliar'; } }])}</div></div>
      <div class="kpis escalonado">
        <div class="kpi k-marfim"><span class="rot">${ICO.barras}Máquinas no pátio</span><span class="val">${conta(itens.length, 'int')}</span></div>
        <div class="kpi k-marfim"><span class="rot">${ICO.moedas}Capital imobilizado</span><span class="val">${conta(cap, 'mil')}</span></div>
        <div class="kpi k-salvia"><span class="rot">${ICO.linha}Permanência média</span><span class="val">${conta(itens.reduce((s, i) => s + i.dias, 0) / Math.max(1, itens.length), 'dias')}</span></div>
        <div class="kpi k-risco"><span class="rot">${ICO.alerta}Acima de 90 dias</span><span class="val">${velhos.length} ${velhos.length === 1 ? 'máquina' : 'máquinas'}</span><span class="pilula">${mil(velhos.reduce((s, i) => s + i.t.pago, 0))}</span></div>
      </div>
      <div class="campo" style="margin-bottom:12px"><label for="p-busca">Buscar no pátio</label><input id="p-busca" placeholder="Modelo, marca, chassi ou vendedor" value="${esc(fp.busca || '')}"></div>
      <div class="filtros">
        <div class="campo"><label for="p-tipo">Categoria</label><select id="p-tipo"><option value="">Todas</option>${Object.keys(NOMES).map((k) => `<option value="${k}" ${fp.tipo === k ? 'selected' : ''}>${NOMES[k]}</option>`).join('')}</select></div>
        <div class="campo"><label for="p-marca">Fabricante</label><select id="p-marca"><option value="">Todos</option>${marcas.map((m) => `<option ${fp.marca === m ? 'selected' : ''}>${esc(m)}</option>`).join('')}</select></div>
        <div class="campo"><label for="p-idade">Tempo de pátio</label><select id="p-idade"><option value="">Todos</option>${['normal', 'atencao', 'alerta', 'critico'].map((f) => `<option value="${f}" ${fp.idade === f ? 'selected' : ''}>${C.NOMES_IDADE[f]}</option>`).join('')}</select></div>
        <div class="campo"><label for="p-ordem">Ordenar por</label><select id="p-ordem">${[['risco', 'Maior risco de margem'], ['capital', 'Maior capital imobilizado'], ['dias', 'Maior tempo no pátio'], ['margem', 'Menor margem projetada']].map(([v, n]) => `<option value="${v}" ${fp.ordem === v ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
      </div>
      <section class="painel"><div class="tabela-wrap"><table class="tabela"><thead><tr><th><span class="sr">Comparar</span></th><th>Máquina</th><th>Entrada</th><th class="n">Dias</th><th class="n">Aquisição</th><th class="n">Preparo</th><th class="n">Custo total</th><th class="n">Anunciado</th><th class="n">Venda estimada</th><th class="n">Margem</th><th>Situação</th></tr></thead>
        <tbody>${itens.length ? itens.map((i) => `<tr class="clicavel" tabindex="0" data-id="${i.t.id}"><td><input type="checkbox" class="comp-chk" value="${i.t.id}" ${comparar.has(i.t.id) ? 'checked' : ''} aria-label="Comparar ${esc(i.t.modelo)}"></td><td class="maq">${fotoMini(i.t)}<span><b>${esc(i.t.marca + ' ' + i.t.modelo)}</b><span>${NOMES[i.t.tipo]} · ${i.t.ano} · ${i.t.horas.toLocaleString('pt-BR')} h</span></span></td>
          <td>${data(i.t.entrada)}</td><td class="n">${i.dias} <span class="tag ${i.faixa}">${C.NOMES_IDADE[i.faixa]}</span></td><td class="n">${mil(i.t.pago)}</td><td class="n">${mil(i.t.preparo)}</td><td class="n">${mil(i.custo)}</td><td class="n">${mil(i.t.anuncio)}</td><td class="n">${mil(i.venda)}</td>
          <td class="n ${i.margem < 0.06 ? 'neg' : ''}">${pct(i.margem)}</td><td>${esc(i.acao)}</td></tr>`).join('') : `<tr><td colspan="11" class="vazio">${todos.length ? 'Nenhuma máquina com esses filtros.' : 'O pátio está vazio. Use Adicionar para cadastrar a primeira máquina.'}</td></tr>`}</tbody></table></div>
        <p class="nota-rodape">Toque numa máquina para ver os detalhes, simular redução de preço e abrir o passaporte.</p></section>`;
    ['tipo', 'marca', 'idade', 'ordem'].forEach((k) => { $('#p-' + k).onchange = (e) => { fp[k] = e.target.value; telaPatio(); }; });
    let tb; $('#p-busca').oninput = (e) => { clearTimeout(tb); tb = setTimeout(() => { fp.busca = e.target.value; telaPatio(); const el = $('#p-busca'); el.focus(); el.setSelectionRange(el.value.length, el.value.length); }, 250); };
    $$('.comp-chk', tela).forEach((c) => { c.onclick = (e) => e.stopPropagation(); c.onchange = () => { if (c.checked) { if (comparar.size >= 3) { c.checked = false; toast('Compare no máximo 3 máquinas.', true); return; } comparar.add(c.value); } else comparar.delete(c.value); $('#n-comp').textContent = comparar.size; }; });
    $('#comparar').onclick = abrirComparacao;
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
      <div class="galeria-ficha">${[0, 1, 2].map((k) => { const f = F.de(t, k); return `<img src="${f.propria ? f.u : (k ? F.mini(f.u) : f.u)}" alt="Foto ${k + 1} de ${esc(t.marca + ' ' + t.modelo)}" loading="lazy">`; }).join('')}</div>
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
      ${manterOuVender(i)}
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
          <div class="campo"><label for="g-com">Comissão paga (R$, se já souber)</label><input id="g-com" inputmode="numeric" placeholder="Deixe vazio se não souber"></div>
          <div class="campo"><label for="g-jur">Juros do floor plan (R$, se houver)</label><input id="g-jur" inputmode="numeric" placeholder="Deixe vazio se não houver"></div>
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
      <section style="margin-top:18px"><h2 style="font-size:18px;margin-bottom:12px">Linha do tempo da máquina</h2>
        <ul class="linha-tempo">${mov.map((m) => `<li>${esc(m.txt)}<span>${data(m.data)}</span></li>`).concat(estado.atividades.filter((a) => a.ref === t.id).map((a) => `<li>${esc(a.texto)}<span>${new Date(a.quando).toLocaleString('pt-BR')} · ${esc(a.usuario)}</span></li>`)).join('')}</ul></section>
      <section style="margin-top:12px"><h2 style="font-size:18px;margin-bottom:8px">Compradores interessados</h2>${(() => { const cs = compradoresPara(t); return cs.length ? cs.slice(0, 5).map((c) => `<span class="tag comprovado" style="margin:0 6px 6px 0">${esc(c.nome)} · ${esc(c.cidade || '')} · até ${mil(c.precoMax)}</span>`).join('') : '<p class="sub">Ninguém cadastrado procura esta máquina. <a class="link" href="#compradores">Cadastrar comprador</a></p>'; })()}</section>
      ${checaHorimetro(t).length ? `<p class="conta neg">${checaHorimetro(t).map(esc).join(' ')}</p>` : ''}
      <section style="margin-top:12px"><h2 style="font-size:18px;margin-bottom:8px">Documentos</h2>${(t.docs || []).length ? `<ul class="lista-motivos">${t.docs.map((d) => { const doc = estado.documentos.find((x) => x.id === d); return `<li><span>${esc(doc ? doc.nome : d)}</span><b>${doc ? esc(doc.tipo) : ''}</b></li>`; }).join('')}</ul>` : '<p class="sub">Nenhum documento anexado.</p>'}<a class="btn btn-linha" href="#documentos" style="margin-top:8px">Anexar documento</a></section>
      <div class="acoes"><a class="btn btn-ouro" href="passaporte.html?id=${t.id}">Abrir passaporte</a><button class="btn btn-linha" type="button" id="gerar-an">Gerar anúncio</button><button class="btn btn-linha" type="button" id="exp-dms">Exportar para o sistema</button>${t.retrato ? '<button class="btn btn-linha" type="button" id="ver-rt">Retrato da avaliação</button>' : ''}</div>`, (c) => {
      if ($('#ver-rt', c)) $('#ver-rt', c).onclick = () => verRetrato(t.retrato);
      $('#exp-dms', c).onclick = () => exportarParaDMS(t); $('#gerar-an', c).onclick = () => gerarAnuncio(t);
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
        K.registrarPreparo(estado, t.id, v, hojeISO()); estado.preparos[t.id].itens = itens; t.preparo = Math.round(v); log('preparo', `Preparo de ${t.marca} ${t.modelo} registrado: ${real(v)}`, { ref: t.id }); salvar(); cacheLimpa(); toast('Preparo registrado: ' + real(v) + '.'); rota();
      };
      $('#g-vender', c).onclick = () => {
        const v = num($('#g-venda', c).value), dv = $('#g-data', c).value;
        if (!(v > 0)) { $('#g-venda', c).focus(); toast('Informe o valor da venda.', true); return; }
        if (!dv || dv < t.entrada) { toast('A data da venda não pode ser antes da troca.', true); return; }
        const res = v - t.pago - t.preparo, comS = $('#g-com', c).value.trim(), jurS = $('#g-jur', c).value.trim();
        confirmar('Registrar venda?', `${t.marca} ${t.modelo} vendida por ${real(v)} em ${data(dv)}. Resultado bruto: ${real(res)} (${pct(res / v)}). A máquina sai do pátio.`, 'Registrar venda', () => {
          K.registrarVenda(estado, t.id, v, dv); t.vendido = Math.round(v); t.saida = dv; t.diasPatio = diasEntre(t.entrada, dv);
          const cs = {}; if (comS) cs.comissao = num(comS); if (jurS) cs.juros = num(jurS);
          if (Object.keys(cs).length) t.custos = Object.assign({}, t.custos, K.registrarCustos(estado, t.id, cs, eu().nome));
          log('venda', `Venda registrada: ${t.marca} ${t.modelo} por ${real(v)}`, { ref: t.id }); salvar(); cacheLimpa();
          toast('Venda registrada. Veja o previsto x realizado em Inteligência de trocas.'); rota();
        });
      };
      ap.onclick = () => confirmar('Aplicar novo preço?', `O anúncio passa de ${real(t.anuncio)} para ${real(+ap.dataset.novo)}.`, 'Aplicar', () => {
        const reg = { data: hojeISO(), valor: +ap.dataset.novo, motivo: 'Redução de preço' };
        (estado.precos[t.id] = estado.precos[t.id] || []).push(reg); t.precos = (t.precos || []).concat(reg); t.anuncio = reg.valor; log('preco', `Preço de ${t.marca} ${t.modelo} alterado para ${real(reg.valor)}`, { ref: t.id }); salvar();
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
        <div class="acoes"><button class="btn btn-linha" type="button" id="exportar">${ic('<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>')}Exportar</button>${botaoAdicionar([{ nome: 'Venda antiga à mão', desc: 'Troca que já foi vendida', acao: addVendaManual }, { nome: 'Importar planilha', desc: 'Histórico do seu sistema', acao: () => { tc.modo = 'minhas'; location.hash = '#teste'; } }, { nome: 'Puxar de documento', desc: 'Foto, PDF ou Excel', acao: () => { location.hash = '#documentos'; } }])}</div></div>
      <div class="filtros">
        <div class="campo"><label for="t-per">Período</label><select id="t-per">${[['12', 'Últimos 12 meses'], ['24', 'Últimos 24 meses'], ['tudo', 'Todo o histórico']].map(([v, n]) => `<option value="${v}" ${ft.periodo === v ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
        <div class="campo"><label for="t-tipo">Categoria</label><select id="t-tipo"><option value="">Todas</option>${Object.keys(NOMES).map((k) => `<option value="${k}" ${ft.tipo === k ? 'selected' : ''}>${NOMES[k]}</option>`).join('')}</select></div>
        <div class="campo"><label for="t-res">Resultado</label><select id="t-res"><option value="">Todos</option><option value="pos" ${ft.resultado === 'pos' ? 'selected' : ''}>Positivo</option><option value="neg" ${ft.resultado === 'neg' ? 'selected' : ''}>Negativo</option></select></div>
      </div>
      <div class="kpis escalonado">
        <div class="kpi k-marfim"><span class="rot">${ICO.barras}Trocas vendidas</span><span class="val">${conta(linhas.length, 'int')}</span><span class="exp">Margem média ${pct(linhas.reduce((s, l) => s + l.m, 0) / Math.max(1, linhas.length))}</span></div>
        <div class="kpi k-salvia"><span class="rot">${ICO.moedas}Resultado bruto acumulado</span><span class="val">${conta(linhas.reduce((s, l) => s + l.res, 0), 'mil')}</span><span class="exp">Venda menos aquisição e preparo.</span></div>
        <div class="kpi k-risco"><span class="rot">${ICO.alerta}Trocas com prejuízo</span><span class="val">${prej.length} ${prej.length === 1 ? 'troca' : 'trocas'}</span><span class="pilula">${mil(-prej.reduce((s, l) => s + l.res, 0))}</span><span class="exp">Venderam por menos do que custaram.</span></div>
        <div class="kpi k-marfim"><span class="rot">${ICO.pct}Pago acima do recomendado</span><span class="val">${conta(excesso, 'mil')}</span><span class="exp">Soma do que foi pago além do valor máximo que o Anshur indicaria.</span></div>
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
      <div class="titulo"><div><h1>Quanto você pagou a mais sem perceber?</h1><p>O Anshur avalia trocas antigas sem ver quanto foi pago, usando só o que tinha sido vendido antes de cada uma. Depois revelamos e comparamos.</p></div>${botaoAdicionar([{ nome: 'Colar ou abrir planilha', desc: 'Trocas antigas do seu sistema', acao: () => { tc.modo = 'minhas'; telaTeste(); } }, { nome: 'Venda antiga à mão', desc: 'Uma troca por vez', acao: addVendaManual }])}</div>
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
    if (sh) sh.onclick = () => confirmar('Usar como histórico da sua revenda?', `As ${p.aceitas.length} trocas vão para o ambiente com dados reais (separado da demonstração), ${K.nuvem ? 'guardadas na conta da revenda' : 'guardadas neste navegador e enviadas para a conta quando você entrar'}. O Anshur passa a avaliar com base nelas.`, 'Usar como histórico', () => {
      const op = K.repo.ler('op');
      const chave = (t) => [t.tipo, t.modelo, t.ano, t.horas, t.pago, t.vendido].join('|');
      const ja = new Set((op.historico || []).map(chave));
      const novas = p.aceitas.filter((t) => !ja.has(chave(t))).map((t, i) => ({ ...t, id: 'H' + ((op.historico || []).length + i + 1), ficha: { motor: t.cond / 20, transmissao: t.cond / 20, hidraulico: t.cond / 20, pneus: t.cond / 20, cabine: t.cond / 20, lataria: t.cond / 20 }, manutencoes: [] }));
      op.historico = (op.historico || []).concat(novas);
      if (!K.repo.gravar(op, 'op')) { toast('Não foi possível salvar neste navegador.', true); return; }
      K.repo.trocarAmbiente('op'); location.hash = '#trocas'; K.recarregar();
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
      <div class="titulo"><div><h1>Passaportes</h1><p>A ficha pública de cada usado do pátio: o comprador aponta o celular no QR Code e vê inspeção, documentos e manutenções.</p></div>${botaoAdicionar([{ nome: 'Máquina no pátio', desc: 'O passaporte é criado junto', acao: () => addMaquinaManual() }])}</div>
      <div class="cartoes escalonado">${itens.map((i) => {
        const comp = (i.t.manutencoes || []).filter((m) => m.comNota).length, tot = (i.t.manutencoes || []).length;
        return `<article class="cartao-pp"><img class="pp-foto" src="${F.de(i.t).propria ? F.de(i.t).u : F.mini(F.de(i.t).u)}" alt="${esc(i.t.marca + ' ' + i.t.modelo)}" loading="lazy"><span class="id">ANS-${esc(i.t.id)}</span><h2 style="font-size:17px">${esc(i.t.marca + ' ' + i.t.modelo)}</h2>
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
      <div class="titulo"><div><h1>Vendedores</h1><p>Quem traz resultado nas trocas e quem paga caro demais no usado.</p></div>${botaoAdicionar([{ nome: 'Adicionar vendedor', desc: 'Entra na equipe com perfil de vendedor', acao: () => addUsuario({ perfil: 'vendedor', nome: '', email: '' }) }])}</div>
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
    if (!lista.length) { tela.innerHTML = `<div class="titulo"><div><h1>Garantias a receber</h1><p>Nenhuma ordem de serviço em garantia cadastrada.</p></div>${botaoAdicionar([{ nome: 'OS à mão', desc: 'Serviço feito em garantia', acao: () => addGarantia() }, { nome: 'Puxar de documento', desc: 'Foto ou PDF', acao: () => { location.hash = '#documentos'; } }])}</div>`; return; }
    const aReceber = lista.filter((g) => g.status === 'aguardando');
    const glosa = lista.reduce((s, g) => s + (g.status === 'parcial' || g.status === 'negado' ? g.valor - g.pago : 0), 0);
    const vencidas = aReceber.filter((g) => diasDesde(g.data) > 60);
    const filtrada = lista.filter((g) => !fg.status || g.status === fg.status);
    const NOME = { pago: 'Pago', parcial: 'Pago a menos', negado: 'Negado', aguardando: 'Aguardando' };
    const CLS = { pago: 'baixo', parcial: 'medio', negado: 'alto', aguardando: 'medio' };
    const porMarca = {}; lista.forEach((g) => { if (g.status !== 'pago') porMarca[g.marca] = (porMarca[g.marca] || 0) + g.valor - g.pago; });
    tela.innerHTML = `
      <div class="titulo"><div><h1>Garantias a receber</h1><p>Serviços que a oficina fez em garantia e o que o fabricante ainda não pagou ou pagou a menos.</p></div>
        <div class="acoes"><button class="btn btn-linha" type="button" id="exp-gar">Exportar cobrança</button>${botaoAdicionar([{ nome: 'OS à mão', desc: 'Serviço feito em garantia', acao: () => addGarantia() }, { nome: 'Puxar de documento', desc: 'Foto ou PDF da OS ou do extrato', acao: () => { location.hash = '#documentos'; } }])}</div></div>
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
    if (!lista.length) { tela.innerHTML = `<div class="titulo"><div><h1>Estoque financiado</h1><p>Nenhuma máquina financiada cadastrada.</p></div>${botaoAdicionar([{ nome: 'Máquina financiada à mão', desc: 'Chassi, valor, banco e taxa', acao: () => addFinanciada() }, { nome: 'Puxar de documento', desc: 'Contrato ou extrato', acao: () => { location.hash = '#documentos'; } }])}</div>`; return; }
    const vendidasAbertas = lista.filter((x) => x.f.venda && !x.f.quitacao);
    const perdido = lista.reduce((s, x) => s + x.j.aposVenda, 0);
    tela.innerHTML = `
      <div class="titulo"><div><h1>Estoque financiado</h1><p>Máquinas novas no floor plan: juros que continuam correndo depois que a máquina já foi vendida.</p></div>${botaoAdicionar([{ nome: 'Máquina financiada à mão', desc: 'Chassi, valor, banco e taxa', acao: () => addFinanciada() }, { nome: 'Puxar de documento', desc: 'Contrato ou extrato do banco', acao: () => { location.hash = '#documentos'; } }])}</div>
      <div class="kpis escalonado">
        <div class="kpi k-marfim"><span class="rot">${ICO.moedas}Financiado em estoque</span><span class="val">${conta(lista.filter((x) => !x.f.venda).reduce((s, x) => s + x.f.valor, 0), 'mil')}</span><span class="exp">${lista.filter((x) => !x.f.venda).length} máquinas novas no pátio</span></div>
        <div class="kpi k-risco"><span class="rot">${ICO.alerta}Juros pagos após a venda</span><span class="val">${conta(perdido, 'mil')}</span><span class="exp">Dinheiro que dava para ter economizado quitando no dia da venda</span></div>
        <div class="kpi k-risco"><span class="rot">${ICO.alto}Vendidas e não quitadas</span><span class="val">${vendidasAbertas.length}</span><span class="exp">${mil(vendidasAbertas.reduce((s, x) => s + x.f.valor, 0))} ainda devendo ao banco</span></div>
        <div class="kpi k-salvia"><span class="rot">${ICO.barras}Juros totais do período</span><span class="val">${conta(lista.reduce((s, x) => s + x.j.total, 0), 'mil')}</span><span class="exp">Taxa de ${pct(lista[0].f.taxaMes)} ao mês após ${lista[0].f.carencia} dias de carência</span></div>
      </div>
      <section class="painel"><div class="painel-cab"><h2>${ICO.etiqueta}Máquinas financiadas</h2><p>Ordenado pelo juro pago depois da venda</p></div>
        <div class="tabela-wrap"><table class="tabela"><thead><tr><th>Máquina</th><th class="n">Valor</th><th>Entrada</th><th>Venda</th><th>Quitação</th><th class="n">Juros até hoje</th><th class="n">Por dia</th><th class="n">Juros após venda</th><th>Situação</th></tr></thead><tbody>
        ${lista.map(({ f, j }) => { const sit = !f.venda ? (j.emCarencia ? ['baixo', 'Em carência'] : ['medio', 'No pátio, pagando juros']) : !f.quitacao ? ['alto', 'Vendida, quitar já'] : j.aposVenda > 0 ? ['medio', 'Quitada com atraso'] : ['baixo', 'Quitada no prazo']; return `<tr><td class="maq">${fotoMini(f)}<span><b>${esc(f.marca + ' ' + f.modelo)}</b><span>${f.chassi} · ${esc(f.banco)}</span></span></td><td class="n">${mil(f.valor)}</td><td>${data(f.entrada)}</td><td>${data(f.venda)}</td><td>${data(f.quitacao)}</td><td class="n">${real(j.total)}</td><td class="n ${!f.quitacao && !j.emCarencia ? 'neg forte' : ''}">${!f.quitacao && !j.emCarencia ? real(f.valor * f.taxaMes / 30) : '—'}</td><td class="n ${j.aposVenda > 0 ? 'neg forte' : ''}">${real(j.aposVenda)}</td><td><span class="risco ${sit[0]}">${sit[1]}</span></td></tr>`; }).join('')}</tbody></table></div>
        <p class="nota-rodape">Na implantação, o Anshur cruza o extrato do floor plan com as notas de venda e avisa no mesmo dia em que uma máquina financiada é vendida.</p></section>`;
    contar();
  }

  // ---------- ALERTAS ----------
  function listaAlertas() {
    const out = [];
    C.patio().map(infoPatio).forEach((i) => {
      if (i.dias > 90) out.push({ id: 'p90-' + i.t.id, cat: 'Estoque', nivel: 'alto', titulo: `${i.t.marca} ${i.t.modelo} passou de 90 dias no pátio`, txt: `${mil(i.t.pago)} parados há ${i.dias} dias · ${i.acao}`, ir: '#patio' });
      else if (i.dias > 60 && i.dias <= 67) out.push({ id: 'p60-' + i.t.id, cat: 'Estoque', nivel: 'medio', titulo: `${i.t.marca} ${i.t.modelo} entrou na faixa de alerta`, txt: `${i.dias} dias no pátio`, ir: '#patio' });
      if (i.margem < 0.06) out.push({ id: 'mg-' + i.t.id, cat: 'Financeiro', nivel: 'alto', titulo: `Margem baixa: ${i.t.marca} ${i.t.modelo}`, txt: `Margem projetada de ${pct(i.margem)}`, ir: '#patio' });
    });
    (A.financiadas || []).forEach((f) => { if (f.venda && !f.quitacao) out.push({ id: 'fp-' + f.chassi, cat: 'Financeiro', nivel: 'alto', titulo: `Quitar ${f.marca} ${f.modelo} com o banco`, txt: `Vendida em ${data(f.venda)} e o juro continua correndo`, ir: '#financiamento' }); });
    const gv = (A.garantias || []).filter((g) => g.status === 'aguardando' && diasDesde(g.data) > 60);
    if (gv.length) out.push({ id: 'gar-' + gv.length, cat: 'Garantia', nivel: 'medio', titulo: `${gv.length} garantias paradas há mais de 60 dias`, txt: `${mil(gv.reduce((s, g) => s + g.valor, 0))} para cobrar do fabricante`, ir: '#garantias' });
    const ult = estado.fechadas.slice(-3).filter((t) => t.previsto && t.pago > t.previsto.teto);
    ult.forEach((t) => out.push({ id: 'ac-' + t.id, cat: 'Comercial', nivel: 'medio', titulo: `Troca acima do recomendado: ${t.marca} ${t.modelo}`, txt: `Pago ${real(t.pago)}, máximo indicado ${real(t.previsto.teto)}`, ir: '#patio' }));
    (A.trocas || []).filter((t) => !t.vendido && t.preparoEst && t.preparo > t.preparoEst * 1.4).forEach((t) => out.push({ id: 'of-' + t.id, cat: 'Oficina', nivel: 'medio', titulo: `Preparo acima do previsto: ${t.marca} ${t.modelo}`, txt: `${real(t.preparo)} contra ${real(t.preparoEst)} previstos`, ir: '#patio' }));
    (estado.pendentes || []).filter((p) => p.status === 'pendente').forEach((p) => out.push({ id: 'ap-' + p.id, cat: 'Comercial', nivel: 'alto', titulo: `Aprovação pedida: ${p.maq.marca} ${p.maq.modelo}`, txt: `${p.por} quer pagar ${real(p.valor)}, ${real(p.valor - p.rec.teto)} acima do máximo`, ir: '#aprovacoes' }));
    C.patio().forEach((t) => { const cs = compradoresPara(t); if (cs.length) out.push({ id: 'cp-' + t.id + '-' + cs.length, cat: 'Comercial', nivel: 'medio', titulo: `${cs.length} ${cs.length === 1 ? 'comprador procura' : 'compradores procuram'} ${t.marca} ${t.modelo}`, txt: cs.slice(0, 2).map((c) => c.nome).join(', ') + (cs.length > 2 ? ' e outros' : ''), ir: '#compradores' }); });
    Object.keys(NOMES).forEach((k) => { const v = variacaoMercado(k); if (v != null && v < -0.05) out.push({ id: 'mk-' + k + '-' + Math.round(v * 100), cat: 'Mercado', nivel: 'alto', titulo: `Mercado de ${NOMES[k].toLowerCase()} caiu ${pct(-v)}`, txt: 'Anúncios e leilões dos últimos 2 meses: cuidado ao pagar na troca', ir: '#mercado' }); });
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
      if (r === 'novas') setTimeout(() => K.recarregar(), 900); else rota();
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
    if (b) b.onclick = async () => { const r = await sincronizar(true); toast({ novas: `${estado.ultimaSync.novas} trocas novas importadas.`, 'em-dia': 'Tudo em dia: nenhuma troca nova.', 'sem-pasta': 'Escolha a pasta primeiro.', vazia: 'A pasta não tem CSV.', permissao: 'O navegador não liberou a leitura da pasta.' }[r] || 'Não foi possível sincronizar.', !['novas', 'em-dia'].includes(r)); if (r === 'novas') setTimeout(() => K.recarregar(), 900); };
    if (c) c.onclick = () => { K.repo.trocarAmbiente('op'); location.hash = '#teste'; K.recarregar(); };
  }

  // =====================================================================================
  // V5: fotos, usuários e permissões, auditoria, adicionar em todas as páginas, documentos,
  // configurações, relatórios por período, busca global, notificações, comparação e instalação
  // =====================================================================================
  const F = window.FOTOS;
  const fotoMini = (t, cls = 'maq-foto') => { const f = F.de(t); const src = f.propria ? f.u : F.mini(f.u); return `<img class="${cls}" src="${src}" alt="" loading="lazy" onerror="this.outerHTML='<span class=&quot;maq-ico&quot;>${ICO[t.tipo] ? '' : ''}</span>'">`; };
  const eu = () => K.usuarioAtual();
  const PERM = {
    dono: ['hoje', 'visao', 'avaliar', 'patio', 'trocas', 'teste', 'passaportes', 'vendedores', 'garantias', 'financiamento', 'relatorio', 'documentos', 'atividades', 'usuarios', 'config', 'compradores', 'mercado', 'aprovacoes', 'rotina', 'memoria', 'historico'],
    gerente: ['hoje', 'visao', 'avaliar', 'patio', 'trocas', 'teste', 'passaportes', 'vendedores', 'garantias', 'financiamento', 'relatorio', 'documentos', 'atividades', 'compradores', 'mercado', 'aprovacoes', 'rotina', 'memoria', 'historico'],
    vendedor: ['hoje', 'visao', 'avaliar', 'patio', 'passaportes', 'documentos', 'compradores', 'mercado', 'aprovacoes', 'rotina', 'memoria'],
    oficina: ['hoje', 'patio', 'passaportes', 'garantias', 'documentos', 'rotina'],
    financeiro: ['hoje', 'visao', 'patio', 'trocas', 'garantias', 'financiamento', 'relatorio', 'documentos', 'atividades', 'rotina', 'memoria', 'historico'],
    auditor: ['hoje', 'visao', 'patio', 'trocas', 'vendedores', 'garantias', 'financiamento', 'relatorio', 'atividades', 'aprovacoes', 'rotina', 'memoria', 'historico']
  };
  const pode = (aba) => aba === 'perfil' || (PERM[eu().perfil] || PERM.dono).includes(aba);
  const podeAprovar = () => ['dono', 'gerente'].includes(eu().perfil);
  const log = (tipo, texto, extra) => { K.registrar(tipo, texto, extra); };

  // ---------- botão Adicionar (manual ou puxando de documento) ----------
  function botaoAdicionar(opcoes) {
    if (eu().perfil === 'auditor') return '<span class="tag declarado">Só leitura</span>';
    const id = 'add' + Math.random().toString(36).slice(2, 7);
    setTimeout(() => {
      const b = document.getElementById(id); if (!b) return;
      const m = b.nextElementSibling;
      b.onclick = (e) => { e.stopPropagation(); m.hidden = !m.hidden; b.setAttribute('aria-expanded', !m.hidden); };
      document.addEventListener('click', () => { m.hidden = true; }, { once: true });
      $$('button', m).forEach((x, i) => x.onclick = () => { m.hidden = true; opcoes[i].acao(); });
    });
    return `<div class="add-wrap"><button class="btn btn-ouro" type="button" id="${id}" aria-haspopup="menu" aria-expanded="false">${ic('<path d="M12 5v14M5 12h14"/>')}Adicionar</button>
      <div class="add-menu" role="menu" hidden>${opcoes.map((o) => `<button type="button" role="menuitem"><b>${esc(o.nome)}</b><span>${esc(o.desc)}</span></button>`).join('')}</div></div>`;
  }
  const lista = (id, itens) => `<datalist id="${id}">${[...new Set(itens.filter(Boolean))].map((v) => `<option value="${esc(v)}">`).join('')}</datalist>`;
  const sugestoes = () => lista('dl-marca', A.modelos.map((m) => m.marca)) + lista('dl-modelo', A.modelos.map((m) => m.modelo)) + lista('dl-vend', VENDEDORES()) + lista('dl-cidade', ['Orlândia, SP', 'Sertãozinho, SP', 'Morro Agudo, SP', 'Guaíra, SP', 'Bebedouro, SP', 'Jaboticabal, SP', 'Ituverava, SP', 'São Joaquim da Barra, SP', 'Batatais, SP', 'Franca, SP', 'Ribeirão Preto, SP'])
    + lista('dl-banco', ['Banco da montadora', 'Banco do Brasil', 'Sicredi', 'Bradesco', 'Santander']) + lista('dl-servico', (A.garantias || []).map((g) => g.servico));

  // formulário genérico com sugestões que aceitam texto livre
  function formulario(titulo, campos, valores, aoSalvar, sub = '') {
    abrirCamada('modal', `<h2>${esc(titulo)}</h2>${sub ? `<p class="sub">${sub}</p>` : ''}${sugestoes()}
      <form class="campos" style="margin-top:14px" novalidate>${campos.map((c) => `<div class="campo ${c.inteiro ? 'inteiro' : ''}"><label for="fm-${c.k}">${esc(c.r)}${c.obr ? ' *' : ''}${c.conf ? ` <span class="conf-campo ${c.conf}">${c.conf === 'alta' ? 'lido com segurança' : c.conf === 'media' ? 'confira' : 'não encontrado'}</span>` : ''}</label>
        ${c.tipo === 'select' ? `<select id="fm-${c.k}">${c.ops.map(([v, n]) => `<option value="${esc(v)}" ${String(valores[c.k] ?? '') === String(v) ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select>`
        : `<input id="fm-${c.k}" ${c.lista ? `list="${c.lista}"` : ''} type="${c.tipo === 'data' ? 'date' : 'text'}" ${c.num ? 'inputmode="decimal"' : ''} value="${esc(valores[c.k] ?? '')}" placeholder="${esc(c.ph || '')}" autocomplete="off">`}<span class="erro-campo" id="er-${c.k}"></span></div>`).join('')}
      </form><div class="acoes"><button class="btn btn-ouro" type="button" id="fm-ok">Salvar</button><button class="btn btn-linha" type="button" id="fm-nao">Cancelar</button></div>`, (cx) => {
      $('#fm-nao', cx).onclick = () => fecharCamada();
      $('#fm-ok', cx).onclick = () => {
        const v = {}; let ok = true;
        campos.forEach((c) => { const el = $('#fm-' + c.k, cx); let x = el.value.trim(); if (c.num) x = x ? num(x) : ''; v[c.k] = x;
          const er = $('#er-' + c.k, cx); er.textContent = c.obr && (x === '' || (c.num && !(x > 0))) ? 'Preencha este campo.' : ''; if (er.textContent) ok = false; });
        if (!ok) { toast('Confira os campos marcados.', true); return; }
        aoSalvar(v);
      };
    });
  }
  const CAMPOS_MAQ = [
    { k: 'tipo', r: 'Categoria', tipo: 'select', ops: Object.entries(NOMES), obr: true }, { k: 'marca', r: 'Fabricante', lista: 'dl-marca', obr: true },
    { k: 'modelo', r: 'Modelo', lista: 'dl-modelo', obr: true }, { k: 'ano', r: 'Ano', num: true, obr: true }, { k: 'horas', r: 'Horas', num: true },
    { k: 'pago', r: 'Valor pago na troca (R$)', num: true, obr: true }, { k: 'preparo', r: 'Preparo (R$)', num: true }, { k: 'entrada', r: 'Data de entrada', tipo: 'data', obr: true },
    { k: 'anuncio', r: 'Preço anunciado (R$)', num: true }, { k: 'vendedor', r: 'Vendedor', lista: 'dl-vend' }, { k: 'origem', r: 'Origem / cliente', lista: 'dl-cidade', ph: 'Faz. Santa Helena, Orlândia' },
    { k: 'referencia', r: 'Fipe da máquina (se o modelo for novo)', num: true }, { k: 'chassi', r: 'Chassi / número de série' }
  ];
  function criarMaquina(v, extra = {}) {
    const est = 3, cond = 70;
    const id = 'M' + String(estado.fechadas.length + 1).padStart(3, '0') + (OP ? 'R' : '') + (NV ? Math.random().toString(36).slice(2, 6).toUpperCase() : '');
    const t = { id, tipo: v.tipo, marca: v.marca, modelo: v.modelo, ano: +v.ano, horas: +v.horas || 0, cond, ficha: { motor: est, transmissao: est, hidraulico: est, pneus: est, cabine: est, lataria: est },
      pago: Math.round(v.pago), preparo: Math.round(v.preparo || 0), preparoEst: null, vendido: v.vendido ? Math.round(v.vendido) : null, entrada: v.entrada, saida: v.saida || null,
      diasPatio: v.saida ? diasEntre(v.entrada, v.saida) : null, anuncio: Math.round(v.anuncio || v.pago * 1.15), precos: [{ data: v.entrada, valor: Math.round(v.anuncio || v.pago * 1.15), motivo: 'Anúncio inicial' }],
      vendedor: v.vendedor || eu().nome, origem: v.origem || 'Cadastro manual', idAgro: false, manutencoes: [], fotos: [], chassi: v.chassi || '', preparoInformado: v.preparo !== '' && v.preparo != null, ...extra };
    if (v.referencia) t.referencia = v.referencia;
    if (!M.catalogo(t) && v.referencia) A.modelos.push({ tipo: t.tipo, marca: t.marca, modelo: t.modelo, base: v.referencia, hAno: 800, importado: true });
    estado.fechadas.push(t); A.trocas.push({ ...t }); return t;
  }
  function addMaquinaManual(pre = {}, docId) {
    formulario('Adicionar máquina ao pátio', CAMPOS_MAQ, { tipo: 'trator', entrada: hojeISO(), ...pre }, (v) => {
      const t = criarMaquina(v, docId ? { docs: [docId] } : {}); salvar(); cacheLimpa();
      log('maquina', `Máquina adicionada ao pátio: ${t.marca} ${t.modelo} por ${real(t.pago)}`, { ref: t.id });
      fecharCamada(true); toast('Máquina adicionada ao pátio.'); location.hash = '#patio'; rota();
    }, 'Sugestões aparecem enquanto você digita, mas pode escrever qualquer valor.');
  }
  function addVendaManual() {
    formulario('Adicionar venda antiga', CAMPOS_MAQ.concat([{ k: 'vendido', r: 'Valor vendido (R$)', num: true, obr: true }, { k: 'saida', r: 'Data da venda', tipo: 'data', obr: true }]), { tipo: 'trator' }, (v) => {
      if (v.saida < v.entrada) { toast('A venda não pode ser antes da troca.', true); return; }
      const t = criarMaquina(v); salvar(); cacheLimpa(); log('venda', `Venda antiga registrada: ${t.marca} ${t.modelo} por ${real(t.vendido)}`, { ref: t.id });
      fecharCamada(true); toast('Venda adicionada ao histórico.'); rota();
    });
  }
  function addGarantia(pre = {}, docId) {
    formulario('Adicionar OS de garantia', [{ k: 'os', r: 'Número da OS', obr: true }, { k: 'data', r: 'Data', tipo: 'data', obr: true }, { k: 'marca', r: 'Fabricante', lista: 'dl-marca', obr: true }, { k: 'modelo', r: 'Modelo', lista: 'dl-modelo' },
      { k: 'servico', r: 'Serviço', lista: 'dl-servico', obr: true, inteiro: true }, { k: 'cliente', r: 'Cliente', lista: 'dl-cidade' }, { k: 'valor', r: 'Valor do serviço (R$)', num: true, obr: true }, { k: 'pago', r: 'Pago pelo fabricante (R$)', num: true },
      { k: 'status', r: 'Situação', tipo: 'select', ops: [['aguardando', 'Aguardando'], ['pago', 'Pago'], ['parcial', 'Pago a menos'], ['negado', 'Negado']] }, { k: 'motivo', r: 'Motivo (se pago a menos ou negado)' }],
    { data: hojeISO(), status: 'aguardando', ...pre }, (v) => {
      const g = { ...v, valor: Math.round(v.valor), pago: Math.round(v.pago || 0), docs: docId ? [docId] : [] };
      estado.extras.garantias.push(g); A.garantias.push(g); salvar(); log('garantia', `OS de garantia ${g.os} cadastrada (${real(g.valor)})`);
      fecharCamada(true); toast('OS de garantia adicionada.'); location.hash = '#garantias'; rota();
    });
  }
  function addFinanciada(pre = {}, docId) {
    formulario('Adicionar máquina financiada', [{ k: 'chassi', r: 'Chassi', obr: true }, { k: 'tipo', r: 'Categoria', tipo: 'select', ops: Object.entries(NOMES) }, { k: 'marca', r: 'Fabricante', lista: 'dl-marca', obr: true }, { k: 'modelo', r: 'Modelo', lista: 'dl-modelo', obr: true },
      { k: 'valor', r: 'Valor financiado (R$)', num: true, obr: true }, { k: 'banco', r: 'Banco', lista: 'dl-banco' }, { k: 'taxa', r: 'Taxa ao mês (%)', num: true }, { k: 'carencia', r: 'Carência (dias)', num: true },
      { k: 'entrada', r: 'Entrada no estoque', tipo: 'data', obr: true }, { k: 'venda', r: 'Data da venda', tipo: 'data' }, { k: 'quitacao', r: 'Data da quitação', tipo: 'data' }],
    { tipo: 'trator', taxa: '1,1', carencia: 90, entrada: hojeISO(), ...pre }, (v) => {
      const f = { chassi: v.chassi, tipo: v.tipo, marca: v.marca, modelo: v.modelo, valor: Math.round(v.valor), banco: v.banco || '—', taxaMes: (v.taxa || 1.1) / 100, carencia: +v.carencia || 0, entrada: v.entrada, venda: v.venda || null, quitacao: v.quitacao || null, docs: docId ? [docId] : [] };
      estado.extras.financiadas.push(f); A.financiadas.push(f); salvar(); log('financiamento', `Máquina financiada cadastrada: ${f.marca} ${f.modelo} (${real(f.valor)})`);
      fecharCamada(true); toast('Máquina financiada adicionada.'); location.hash = '#financiamento'; rota();
    });
  }
  function addUsuario(u) {
    if (K.nuvem) { location.hash = '#usuarios'; return; }
    formulario(u ? 'Editar usuário' : 'Adicionar usuário', [{ k: 'nome', r: 'Nome', obr: true }, { k: 'email', r: 'E-mail' }, { k: 'perfil', r: 'Perfil', tipo: 'select', ops: Object.entries(K.PERFIS) }], u || { perfil: 'vendedor' }, (v) => {
      if (u) { Object.assign(u, v); log('usuario', `Usuário ${v.nome} alterado para ${K.PERFIS[v.perfil]}`); }
      else { estado.usuarios.push({ id: 'u' + Date.now(), ...v }); log('usuario', `Usuário ${v.nome} criado como ${K.PERFIS[v.perfil]}`); }
      salvar(); fecharCamada(true); toast('Usuário salvo.'); rota();
    });
  }

  // ---------- documentos: fotos, PDFs e planilhas viram sugestões de preenchimento ----------
  const idbDoc = (modo, fn) => idb(modo, fn);
  const carregar = (src) => new Promise((ok, erro) => { if ([...document.scripts].some((s) => s.src === src)) return ok(); const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = () => erro(new Error('Sem internet para carregar o leitor.')); document.head.appendChild(s); });
  async function lerTexto(arquivo, progresso) {
    const nome = arquivo.name.toLowerCase();
    if (/\.(csv|txt)$/.test(nome)) return { tipo: 'planilha', texto: await arquivo.text() };
    if (/\.(xlsx|xls|ods)$/.test(nome)) {
      progresso('Abrindo a planilha…'); await carregar('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js');
      const wb = window.XLSX.read(await arquivo.arrayBuffer(), { type: 'array' });
      return { tipo: 'planilha', texto: window.XLSX.utils.sheet_to_csv(wb.Sheets[wb.SheetNames[0]], { FS: ';' }) };
    }
    if (/\.pdf$/.test(nome)) {
      progresso('Lendo o PDF…'); await carregar('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js');
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      const pdf = await window.pdfjsLib.getDocument({ data: await arquivo.arrayBuffer() }).promise; let txt = '';
      for (let p = 1; p <= Math.min(pdf.numPages, 8); p++) { const c = await (await pdf.getPage(p)).getTextContent(); txt += c.items.map((i) => i.str).join(' ') + '\n'; }
      if (txt.trim().length > 30) return { tipo: 'pdf', texto: txt };
      return { tipo: 'pdf', texto: '', aviso: 'Este PDF é uma imagem escaneada; tire uma foto da página para ler o texto.' };
    }
    if (/^image\//.test(arquivo.type)) {
      progresso('Lendo o texto da foto (pode levar até 1 minuto)…');
      await carregar('https://cdn.jsdelivr.net/npm/tesseract.js@5.1.0/dist/tesseract.min.js');
      const r = await window.Tesseract.recognize(arquivo, 'por', { logger: (m) => { if (m.status === 'recognizing text') progresso(`Lendo o texto da foto… ${Math.round(m.progress * 100)}%`); } });
      return { tipo: 'foto', texto: r.data.text };
    }
    throw new Error('Formato não aceito. Use foto, PDF, CSV ou Excel.');
  }
  // extrai campos do texto e diz o quanto confia em cada um
  function extrair(texto) {
    const t = ' ' + texto.replace(/\s+/g, ' ') + ' ', low = t.toLowerCase(), c = {};
    const achar = (re) => { const m = t.match(re); return m ? m[1].trim() : ''; };
    const tipo = /colhed|colheit|cana/.test(low) ? 'colhedora' : /pulveriz/.test(low) ? 'pulverizador' : /plantadeir|semeadeir/.test(low) ? 'plantadeira' : /trator/.test(low) ? 'trator' : '';
    if (tipo) c.tipo = { v: tipo, conf: 'media' };
    const marca = [...new Set(A.modelos.map((m) => m.marca))].find((m) => low.includes(m.toLowerCase())) || (/deere/.test(low) ? 'John Deere' : /massey/.test(low) ? 'Massey Ferguson' : /case/.test(low) ? 'Case IH' : '');
    if (marca) c.marca = { v: marca, conf: 'alta' };
    const mod = A.modelos.find((m) => low.includes(m.modelo.toLowerCase().replace(/^mf /, '')));
    if (mod) { c.modelo = { v: mod.modelo, conf: 'alta' }; c.tipo = { v: mod.tipo, conf: 'alta' }; if (!c.marca) c.marca = { v: mod.marca, conf: 'alta' }; }
    const ano = achar(/(?:ano(?: de)?(?: fabrica[çc][ãa]o| modelo)?|fab\.?)\s*[:\-]?\s*((?:19|20)\d{2})/i) || achar(/\b((?:20[0-2]\d|199\d))\b/);
    if (ano) c.ano = { v: ano, conf: /ano/i.test(t) ? 'alta' : 'media' };
    const horas = achar(/(?:hor[íi]metro|horas)\s*[:\-]?\s*([\d.]{2,7})/i) || achar(/([\d.]{3,7})\s*(?:h|hs|horas)\b/i);
    if (horas) c.horas = { v: horas.replace(/\./g, ''), conf: 'alta' };
    const chassi = achar(/(?:chassi|s[ée]rie|n[ºo°]?\s*de\s*s[ée]rie|pin)\s*[:\-]?\s*([A-Z0-9]{6,20})/i);
    if (chassi) c.chassi = { v: chassi.toUpperCase(), conf: 'alta' };
    const valores = [...t.matchAll(/R\$\s*([\d.]+,\d{2}|[\d.]{4,})/g)].map((m) => window.IMPORTAR.dinheiro(m[1])).filter((v) => v > 1000).sort((a, b) => b - a);
    if (valores.length) c.valor = { v: String(valores[0]), conf: valores.length === 1 ? 'alta' : 'media' };
    const datas = [...t.matchAll(/\b(\d{2}\/\d{2}\/\d{4})\b/g)].map((m) => window.IMPORTAR.dataISO(m[1])).filter((d) => d && d !== 'invalida');
    if (datas.length) c.data = { v: datas[0], conf: datas.length === 1 ? 'alta' : 'media' };
    const cnpj = achar(/(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})/); if (cnpj) c.cnpj = { v: cnpj, conf: 'alta' };
    const os = achar(/(?:ordem de servi[çc]o|o\.?s\.?)\s*(?:n[ºo°]\.?)?\s*[:\-]?\s*([A-Z0-9\-]{3,12})/i); if (os) c.os = { v: os, conf: 'media' };
    const cliente = achar(/(?:cliente|propriet[áa]rio|comprador|emitente)\s*[:\-]\s*([A-ZÁÉÍÓÚÂÊÔÃÕÇa-záéíóúâêôãõç .]{4,50}?)(?=\s(?:cpf|cnpj|endere|cidade|rua|av\.|trator|colhed|pulveriz|plantad|ano|hor|chassi|s[ée]rie|valor|data|modelo)|\s{2}|$)/i); if (cliente) c.cliente = { v: cliente, conf: 'media' };
    const destino = /garantia/.test(low) ? 'garantia' : /floor ?plan|financiad|cédula|alienação/.test(low) ? 'financiada' : 'maquina';
    return { campos: c, destino };
  }
  function telaDocumentos() {
    const docs = estado.documentos.slice().reverse();
    tela.innerHTML = `
      <div class="titulo"><div><h1>Central de documentos</h1><p>Mande foto de nota, ordem de serviço, contrato, PDF ou planilha. O Anshur lê, sugere o preenchimento e você confere antes de salvar.</p></div>${botaoAdicionar([{ nome: 'Escolher arquivo', desc: 'Foto, PDF, CSV ou Excel', acao: () => $('#doc-arq').click() }, { nome: 'Cadastrar sem documento', desc: 'Máquina, garantia ou financiamento à mão', acao: () => addMaquinaManual() }])}</div>
      <label class="soltar" id="soltar"><input type="file" id="doc-arq" accept="image/*,.pdf,.csv,.txt,.xlsx,.xls,.ods" multiple class="sr">
        ${ic('<path d="M12 16V4M7 9l5-5 5 5M4 20h16"/>', 'ico grande')}<b>Arraste arquivos aqui ou toque para escolher</b><span>Fotos (JPG, PNG), PDF, CSV e Excel · também dá para tirar foto pelo celular</span></label>
      <div id="doc-proc"></div>
      <section class="painel bloco"><div class="painel-cab"><h2>${ICO.etiqueta}Documentos recebidos</h2><p>${docs.length} ${docs.length === 1 ? 'documento' : 'documentos'}</p></div>
        ${docs.length ? `<div class="tabela-wrap"><table class="tabela"><thead><tr><th>Arquivo</th><th>Tipo</th><th>Virou</th><th>Por</th><th>Quando</th><th></th></tr></thead><tbody>
          ${docs.map((d) => `<tr><td><b>${esc(d.nome)}</b><br><span class="sub">${Math.round(d.tamanho / 1024)} KB</span></td><td>${esc(d.tipo)}</td><td>${esc(d.virou || 'Arquivado')}</td><td>${esc(d.usuario)}</td><td>${new Date(d.quando).toLocaleString('pt-BR')}</td><td><button class="link" type="button" data-ver="${d.id}">Ver original</button></td></tr>`).join('')}</tbody></table></div>`
        : '<p class="vazio">Nenhum documento ainda. Comece mandando a foto de uma nota fiscal ou de uma ordem de serviço.</p>'}</section>`;
    const inp = $('#doc-arq'), zona = $('#soltar');
    inp.onchange = () => processar([...inp.files]);
    zona.ondragover = (e) => { e.preventDefault(); zona.classList.add('sobre'); }; zona.ondragleave = () => zona.classList.remove('sobre');
    zona.ondrop = (e) => { e.preventDefault(); zona.classList.remove('sobre'); processar([...e.dataTransfer.files]); };
    $$('[data-ver]', tela).forEach((b) => b.onclick = async () => {
      const d = estado.documentos.find((x) => x.id === b.dataset.ver);
      if (K.nuvem && d && d.caminho) { const w = window.open('', '_blank'); try { const url = await K.nuvem.abrirDoc(d.caminho); if (w) w.location = url; else location.href = url; } catch (e) { if (w) w.close(); toast(e.message, true); } return; }
      try { const blob = await idbDoc('readonly', (st) => st.get('doc:' + b.dataset.ver)); if (!blob) { toast('Original não está neste aparelho.', true); return; } window.open(URL.createObjectURL(blob), '_blank'); } catch (e) { toast('Não foi possível abrir o original.', true); }
    });
  }
  async function processar(arquivos) {
    const caixa = $('#doc-proc'); if (!arquivos.length) return;
    for (const arq of arquivos) {
      if (K.nuvem && arq.size > K.nuvem.limiteDoc) { toast(`${arq.name}: arquivo acima de 10 MB.`, true); continue; }
      if (arq.size > 15 * 1024 * 1024) { toast(`${arq.name}: arquivo acima de 15 MB.`, true); continue; }
      caixa.innerHTML = `<section class="painel bloco"><div class="carregando-linha"><span class="giro"></span><b id="doc-st">Recebendo ${esc(arq.name)}…</b></div></section>`;
      const prog = (m) => { const s = $('#doc-st'); if (s) s.textContent = m; };
      let lido;
      try { lido = await lerTexto(arq, prog); } catch (e) { caixa.innerHTML = `<section class="painel bloco"><p class="neg">${esc(arq.name)}: ${esc(e.message)}</p></section>`; continue; }
      const id = 'd' + Date.now();
      try { await idbDoc('readwrite', (st) => st.put(arq, 'doc:' + id)); } catch (e) { /* original fica só nesta sessão */ }
      const doc = { id, nome: arq.name, tamanho: arq.size, tipo: { planilha: 'Planilha', pdf: 'PDF', foto: 'Foto' }[lido.tipo], quando: new Date().toISOString(), usuario: eu().nome, virou: '' };
      if (K.nuvem) { prog('Guardando o original na pasta da revenda…'); try { doc.caminho = await K.nuvem.subirDoc(id, arq); } catch (e) { toast(`${arq.name}: o original não foi guardado no servidor (${e.message}).`, true); } }
      estado.documentos.push(doc); salvar(); log('documento', `Documento recebido: ${arq.name}`);
      if (lido.tipo === 'planilha') {
        const p = window.IMPORTAR.ler(lido.texto, { refDe: M.refDe, anoMax: anoAtual });
        caixa.innerHTML = `<section class="painel bloco"><h2>${esc(arq.name)}</h2><p class="conta">${p.aceitas.length} linhas reconhecidas como trocas · ${p.rejeitadas.length} com problema.</p>
          <div class="acoes"><button class="btn btn-ouro" type="button" id="pl-teste">Levar para o teste às cegas</button>${p.comDatas && p.aceitas.length >= 5 ? '<button class="btn btn-linha" type="button" id="pl-hist">Usar como histórico da minha revenda</button>' : ''}</div></section>`;
        $('#pl-teste').onclick = () => { tc.texto = lido.texto; tc.modo = 'minhas'; tc.previa = p; doc.virou = 'Teste às cegas'; salvar(); location.hash = '#teste'; };
        const h = $('#pl-hist'); if (h) h.onclick = () => { tc.texto = lido.texto; tc.modo = 'minhas'; tc.previa = p; doc.virou = 'Histórico'; salvar(); location.hash = '#teste'; setTimeout(() => $('#salvar-hist') && $('#salvar-hist').click(), 600); };
        continue;
      }
      const ex = extrair(lido.texto || '');
      const n = Object.keys(ex.campos).length;
      caixa.innerHTML = `<section class="painel bloco"><h2>${esc(arq.name)}</h2>
        ${lido.aviso ? `<p class="conta neg">${esc(lido.aviso)}</p>` : `<p class="conta">${n ? `Encontramos ${n} ${n === 1 ? 'informação' : 'informações'}. Escolha o que este documento vai virar; os campos já vêm sugeridos e você corrige o que quiser.` : 'Não conseguimos ler informações úteis. Você pode preencher à mão; o documento fica anexado.'}</p>`}
        <details class="texto-lido"><summary>Ver o texto que foi lido</summary><pre>${esc((lido.texto || '').slice(0, 3000))}</pre></details>
        <div class="acoes"><button class="btn ${ex.destino === 'maquina' ? 'btn-ouro' : 'btn-linha'}" type="button" data-d="maquina">Máquina no pátio</button><button class="btn ${ex.destino === 'garantia' ? 'btn-ouro' : 'btn-linha'}" type="button" data-d="garantia">OS de garantia</button><button class="btn ${ex.destino === 'financiada' ? 'btn-ouro' : 'btn-linha'}" type="button" data-d="financiada">Máquina financiada</button><button class="btn btn-linha" type="button" data-d="arquivar">Só arquivar</button></div></section>`;
      $$('[data-d]', caixa).forEach((b) => b.onclick = () => {
        const c = ex.campos, val = (k) => (c[k] ? c[k].v : ''), d = b.dataset.d;
        const marcar = (campos) => campos.map((x) => { const mapa = { pago: 'valor', valor: 'valor', entrada: 'data', data: 'data' }; const kk = c[x.k] ? x.k : mapa[x.k]; return { ...x, conf: c[kk] ? (c[kk].conf === 'alta' ? 'alta' : 'media') : (x.obr ? 'baixa' : '') }; });
        if (d === 'arquivar') { doc.virou = 'Arquivado'; salvar(); toast('Documento arquivado.'); telaDocumentos(); return; }
        if (d === 'maquina') { const campos = CAMPOS_MAQ; formularioDoc('Máquina no pátio', marcar(campos), { tipo: val('tipo') || 'trator', marca: val('marca'), modelo: val('modelo'), ano: val('ano'), horas: val('horas'), pago: val('valor'), entrada: val('data') || hojeISO(), chassi: val('chassi'), origem: val('cliente') }, (v) => { const t = criarMaquina(v, { docs: [id] }); doc.virou = `Máquina ${t.marca} ${t.modelo}`; log('maquina', `Máquina criada a partir do documento ${arq.name}`, { ref: t.id }); return '#patio'; }); }
        if (d === 'garantia') { fecharCamada(true); addGarantia({ os: val('os'), data: val('data') || hojeISO(), marca: val('marca'), modelo: val('modelo'), valor: val('valor'), cliente: val('cliente') }, id); doc.virou = 'OS de garantia'; salvar(); }
        if (d === 'financiada') { fecharCamada(true); addFinanciada({ chassi: val('chassi'), tipo: val('tipo') || 'trator', marca: val('marca'), modelo: val('modelo'), valor: val('valor'), entrada: val('data') || hojeISO() }, id); doc.virou = 'Máquina financiada'; salvar(); }
      });
    }
  }
  function formularioDoc(titulo, campos, valores, criar) {
    formulario(titulo, campos, valores, (v) => { const destino = criar(v); salvar(); cacheLimpa(); fecharCamada(true); toast('Salvo a partir do documento. Nada foi gravado sem a sua confirmação.'); location.hash = destino; rota(); },
      'Verde: lido com segurança. Amarelo: confira. Vermelho: não encontramos, preencha.');
  }

  // ---------- usuários e permissões ----------
  function telaUsuarios() {
    if (K.nuvem) return telaEquipe();
    const paginas = [['visao', 'Visão geral'], ['avaliar', 'Avaliar troca'], ['patio', 'Pátio'], ['trocas', 'Inteligência'], ['vendedores', 'Vendedores'], ['garantias', 'Garantias'], ['financiamento', 'Financiado'], ['relatorio', 'Relatórios'], ['config', 'Configurações']];
    tela.innerHTML = `
      <div class="titulo"><div><h1>Usuários e permissões</h1><p>Quem usa o Anshur e o que cada perfil pode ver e fazer.</p></div>${botaoAdicionar([{ nome: 'Adicionar usuário', desc: 'Nome, e-mail e perfil', acao: () => addUsuario() }])}</div>
      <section class="painel"><div class="tabela-wrap"><table class="tabela grande"><thead><tr><th>Nome</th><th>Perfil</th><th>E-mail</th><th>Atividades</th><th></th></tr></thead><tbody>
        ${estado.usuarios.map((u) => `<tr><td>${avatarHTML(u, 36)} <b>${esc(u.nome)}</b>${u.id === eu().id ? ' <span class="tag comprovado">você</span>' : ''}</td><td>${K.PERFIS[u.perfil]}</td><td>${esc(u.email || '—')}</td><td>${estado.atividades.filter((a) => a.usuario === u.nome).length}</td>
          <td style="white-space:nowrap"><button class="link" type="button" data-entrar="${u.id}">Entrar como</button> · <button class="link" type="button" data-editar="${u.id}">Editar</button>${u.perfil !== 'dono' ? ` · <button class="link neg" type="button" data-tirar="${u.id}">Remover</button>` : ''}</td></tr>`).join('')}</tbody></table></div></section>
      <section class="painel bloco"><div class="painel-cab"><h2>${ICO.alvo}O que cada perfil acessa</h2></div>
        <div class="tabela-wrap"><table class="tabela"><thead><tr><th>Perfil</th>${paginas.map(([, n]) => `<th class="n">${n}</th>`).join('')}<th class="n">Aprovar acima do teto</th></tr></thead><tbody>
        ${Object.entries(K.PERFIS).map(([p, n]) => `<tr><td><b>${n}</b></td>${paginas.map(([k]) => `<td class="n">${PERM[p].includes(k) ? '<span class="pos">✓</span>' : '<span class="sub">—</span>'}</td>`).join('')}<td class="n">${['dono', 'gerente'].includes(p) ? '<span class="pos">✓</span>' : '<span class="sub">—</span>'}</td></tr>`).join('')}</tbody></table></div>
        <p class="nota-rodape">Nesta versão, "Entrar como" serve para ver o sistema como cada pessoa. O login com senha por usuário entra na versão com servidor.</p></section>`;
    $$('[data-entrar]', tela).forEach((b) => b.onclick = () => { estado.usuarioAtual = b.dataset.entrar; salvar(); log('usuario', `Entrou como ${eu().nome}`); toast('Agora você está vendo como ' + eu().nome + '.'); location.hash = pode('visao') ? '#visao' : '#patio'; K.recarregar(); });
    $$('[data-editar]', tela).forEach((b) => b.onclick = () => addUsuario(estado.usuarios.find((u) => u.id === b.dataset.editar)));
    $$('[data-tirar]', tela).forEach((b) => b.onclick = () => { const u = estado.usuarios.find((x) => x.id === b.dataset.tirar); confirmar(`Remover ${u.nome}?`, 'A pessoa deixa de aparecer na lista. As atividades dela continuam no histórico.', 'Remover', () => { estado.usuarios = estado.usuarios.filter((x) => x !== u); log('usuario', `Usuário ${u.nome} removido`); salvar(); rota(); }); });
  }

  // equipe com conta: convites por link, perfil e lojas definidos pelo dono, conferidos pelo servidor
  function telaEquipe() {
    const NV = K.nuvem, souDono = eu().perfil === 'dono', gere = ['dono', 'gerente'].includes(eu().perfil) && !NV.somenteLeitura;
    const perfisConvite = Object.entries(K.PERFIS).filter(([p]) => souDono || !['dono', 'gerente'].includes(p));
    const paginas = [['visao', 'Visão geral'], ['avaliar', 'Avaliar troca'], ['patio', 'Pátio'], ['trocas', 'Inteligência'], ['vendedores', 'Vendedores'], ['garantias', 'Garantias'], ['financiamento', 'Financiado'], ['relatorio', 'Relatórios'], ['config', 'Configurações']];
    tela.innerHTML = `
      <div class="titulo"><div><h1>Equipe e acessos</h1><p>Cada pessoa entra com o próprio e-mail e senha. O perfil define o que ela vê e faz, e o servidor confere.</p></div></div>
      ${gere ? `<section class="painel"><h2>${ICO.alvo}Convidar pessoa</h2>
        <form id="cv-f" class="campos" style="margin-top:12px" novalidate><div class="campo"><label for="cv-email">E-mail da pessoa</label><input id="cv-email" type="email" autocomplete="off" required></div>
        <div class="campo"><label for="cv-perfil">Perfil</label><select id="cv-perfil">${perfisConvite.map(([p, n]) => `<option value="${p}" ${p === 'vendedor' ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
        <div class="acoes inteiro"><button class="btn btn-ouro" type="submit">Gerar convite</button></div></form>
        <div id="cv-link"></div>
        <p class="nota-rodape">O convite vale 7 dias e só funciona com o e-mail convidado. Mande o link por WhatsApp ou e-mail: a pessoa cria a conta com esse e-mail e entra direto na revenda.</p></section>` : ''}
      <section class="painel bloco"><div class="painel-cab"><h2>Pessoas com acesso</h2><p>${estado.usuarios.length}</p></div>
        <div class="tabela-wrap"><table class="tabela grande"><thead><tr><th>Nome</th><th>E-mail</th><th>Perfil</th>${estado.lojas.length ? '<th>Lojas (vazio = todas)</th>' : ''}<th></th></tr></thead><tbody>
        ${estado.usuarios.map((u) => `<tr><td>${avatarHTML(u, 36)} <b>${esc(u.nome)}</b>${u.id === eu().id ? ' <span class="tag comprovado">você</span>' : ''}</td><td>${esc(u.email || '—')}</td>
          <td>${souDono && !NV.offline ? `<select data-perfil="${esc(u.id)}" aria-label="Perfil de ${esc(u.nome)}">${Object.entries(K.PERFIS).map(([p, n]) => `<option value="${p}" ${u.perfil === p ? 'selected' : ''}>${n}</option>`).join('')}</select>` : K.PERFIS[u.perfil]}</td>
          ${estado.lojas.length ? `<td>${souDono && !NV.offline ? `<input data-lojas="${esc(u.id)}" value="${esc((u.lojas || []).join(', '))}" list="dl-lojas" placeholder="Todas" aria-label="Lojas de ${esc(u.nome)}">` : esc((u.lojas || []).join(', ') || 'Todas')}</td>` : ''}
          <td style="white-space:nowrap">${souDono && !NV.offline ? `<button class="link" type="button" data-guardar="${esc(u.id)}">Salvar</button>${u.id !== eu().id ? ` · <button class="link neg" type="button" data-tirar="${esc(u.id)}">Remover acesso</button>` : ''}` : ''}</td></tr>`).join('')}</tbody></table></div>
        ${lista('dl-lojas', estado.lojas)}</section>
      ${gere ? '<section class="painel bloco" id="cv-pend"><h2>Convites em aberto</h2><p class="sub">Carregando…</p></section>' : ''}
      <section class="painel bloco"><div class="painel-cab"><h2>${ICO.alvo}O que cada perfil acessa</h2></div>
        <div class="tabela-wrap"><table class="tabela"><thead><tr><th>Perfil</th>${paginas.map(([, n]) => `<th class="n">${n}</th>`).join('')}<th class="n">Aprovar acima do teto</th></tr></thead><tbody>
        ${Object.entries(K.PERFIS).map(([p, n]) => `<tr><td><b>${n}</b></td>${paginas.map(([k]) => `<td class="n">${PERM[p].includes(k) ? '<span class="pos">✓</span>' : '<span class="sub">—</span>'}</td>`).join('')}<td class="n">${['dono', 'gerente'].includes(p) ? '<span class="pos">✓</span>' : '<span class="sub">—</span>'}</td></tr>`).join('')}</tbody></table></div>
        <p class="nota-rodape">O auditor só lê: o servidor recusa qualquer gravação dele. A restrição por loja vale nas telas; os dados da revenda são um conjunto único.</p></section>`;
    const mostrarLink = (link, email) => {
      const txt = `Você foi convidado para o Anshur da ${A.revenda.nome}. Crie sua conta com o e-mail ${email} neste link (vale 7 dias): ${link}`;
      $('#cv-link').innerHTML = `<div class="campo" style="margin-top:12px"><label for="cv-url">Link do convite para ${esc(email)}</label><input id="cv-url" readonly value="${esc(link)}"></div>
        <div class="acoes"><button class="btn btn-linha" type="button" id="cv-copiar">Copiar link</button><a class="btn btn-linha" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(txt)}">Mandar pelo WhatsApp</a></div>`;
      $('#cv-copiar').onclick = () => { $('#cv-url').select(); (navigator.clipboard ? navigator.clipboard.writeText(link) : Promise.reject()).then(() => toast('Link copiado.'), () => { document.execCommand('copy'); toast('Link copiado.'); }); };
    };
    const carregarConvites = async () => {
      const box = $('#cv-pend'); if (!box) return;
      try {
        const l = await NV.convites();
        box.innerHTML = `<h2>Convites em aberto</h2>${l.length ? `<div class="tabela-wrap"><table class="tabela"><thead><tr><th>E-mail</th><th>Perfil</th><th>Vence</th><th></th></tr></thead><tbody>${l.map((c) => `<tr><td>${esc(c.email)}</td><td>${K.PERFIS[c.perfil]}</td><td>${new Date(c.expira).toLocaleDateString('pt-BR')}${new Date(c.expira) < new Date() ? ' <span class="neg">vencido</span>' : ''}</td><td><button class="link neg" type="button" data-cancelar="${esc(c.id)}">Cancelar</button></td></tr>`).join('')}</tbody></table></div>` : '<p class="vazio">Nenhum convite em aberto.</p>'}`;
        $$('[data-cancelar]', box).forEach((b) => b.onclick = async () => { try { await NV.cancelarConvite(b.dataset.cancelar); toast('Convite cancelado.'); carregarConvites(); } catch (e) { toast(e.message, true); } });
      } catch (e) { box.innerHTML = `<h2>Convites em aberto</h2><p class="neg">${esc(e.message)}</p>`; }
    };
    const f = $('#cv-f');
    if (f) f.onsubmit = async (e) => {
      e.preventDefault();
      const email = $('#cv-email').value.trim().toLowerCase(), perfil = $('#cv-perfil').value, bt = f.querySelector('button');
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { toast('Confira o e-mail.', true); $('#cv-email').focus(); return; }
      bt.disabled = true;
      try { const link = await NV.convidar(email, perfil); log('equipe', `Convite gerado para ${email} como ${K.PERFIS[perfil]}`); salvar(); mostrarLink(link, email); carregarConvites(); }
      catch (er) { toast(er.message, true); }
      bt.disabled = false;
    };
    $$('[data-guardar]', tela).forEach((b) => b.onclick = async () => {
      const id = b.dataset.guardar, u = estado.usuarios.find((x) => x.id === id);
      const perfil = $(`[data-perfil="${id}"]`).value, campo = $(`[data-lojas="${id}"]`);
      const lojas = campo ? campo.value.split(',').map((x) => x.trim()).filter(Boolean) : null;
      try { await NV.alterarMembro(id, perfil, lojas, u.nome); log('equipe', `${u.nome}: perfil ${K.PERFIS[perfil]}${lojas && lojas.length ? ', lojas ' + lojas.join(', ') : ''}`); salvar(); toast('Acesso atualizado.'); K.recarregar(); }
      catch (e) { toast(e.message, true); }
    });
    $$('[data-tirar]', tela).forEach((b) => b.onclick = () => { const u = estado.usuarios.find((x) => x.id === b.dataset.tirar); confirmar(`Remover o acesso de ${u.nome}?`, 'A pessoa deixa de entrar nesta revenda na hora. As atividades dela continuam no histórico.', 'Remover acesso', async () => {
      try { await NV.removerMembro(u.id); log('equipe', `Acesso de ${u.nome} removido`); salvar(); toast('Acesso removido.'); K.recarregar(); } catch (e) { toast(e.message, true); }
    }); });
    carregarConvites();
  }

  // ---------- configurações ----------
  function telaConfig() {
    const passos = primeirosPassos();
    tela.innerHTML = `
      <div class="titulo"><div><h1>Configurações</h1><p>Dados da revenda, regras comerciais, integrações e os seus dados.</p></div>${botaoAdicionar([{ nome: 'Usuário', desc: 'Gerente, vendedor, oficina ou financeiro', acao: () => addUsuario() }, { nome: 'Modelo no catálogo', desc: 'Com a referência de preço', acao: () => $('#c-modelo').click() }])}</div>
      <section class="painel"><div class="painel-cab"><h2>${ICO.baixo}Primeiros passos</h2><p>${passos.filter((p) => p.ok).length} de ${passos.length} concluídos</p></div>
        <div class="progresso"><i style="width:${passos.filter((p) => p.ok).length / passos.length * 100}%"></i></div>
        <ul class="passos-on">${passos.map((p) => `<li class="${p.ok ? 'ok' : ''}">${p.ok ? ICO.baixo : '<span class="bolinha"></span>'}<span><b>${esc(p.nome)}</b><span>${esc(p.desc)}</span></span>${p.ok ? '' : `<a class="btn btn-linha" href="${p.ir}">Fazer agora</a>`}</li>`).join('')}</ul></section>
      <div class="grade-2 bloco">
        <section class="painel"><h2>${ICO.camadas}Dados da revenda</h2>${sugestoes()}
          <div class="campos" style="margin-top:12px">
            <div class="campo"><label for="c-nome">Nome da revenda</label><input id="c-nome" value="${esc(estado.nomeRevenda || A.revenda.nome)}"></div>
            <div class="campo"><label for="c-cnpj">CNPJ</label><input id="c-cnpj" value="${esc(estado.cnpj || '')}" placeholder="00.000.000/0000-00" inputmode="numeric"></div>
            <div class="campo"><label for="c-cid">Cidade</label><input id="c-cid" list="dl-cidade" value="${esc(estado.cidadeRevenda || A.revenda.cidade)}"></div>
            <div class="campo"><label for="c-marcas">Marcas que a revenda representa</label><input id="c-marcas" list="dl-marca" value="${esc(estado.marcasRevenda || '')}" placeholder="Ex.: Case IH, Jacto"></div>
          </div><div class="acoes"><button class="btn btn-ouro" type="button" id="c-salvar">Salvar dados</button></div></section>
        <section class="painel"><h2>${ICO.moedas}Regras comerciais</h2>
          <div class="numeros"><div><span>Margem-alvo</span><b>${pct(K.cfg.margemAlvo, 0)}</b></div><div><span>Custo do capital</span><b>${pct(K.cfg.jurosMes)} a.m.</b></div><div><span>Comissão</span><b>${pct(K.cfg.comissaoPct)}</b></div>
            <div><span>Desconto por troca acima</span><b>${pct(K.cfg.descontoAcima, 0)}</b></div><div><span>Hora da oficina</span><b>${real(K.cfg.valorHora)}</b></div><div><span>Base do custo</span><b>${K.cfg.baseJuros === 'total' ? 'Pago + preparo' : 'Valor pago'}</b></div></div>
          <div class="acoes"><button class="btn btn-linha" type="button" id="c-prem">Alterar regras</button></div></section>
      </div>
      ${blocoIAConfig()}${blocoAvisos()}${blocoLojas()}${blocoLGPD()}
      <section class="painel bloco"><h2>${ICO.alvo}Alçadas de aprovação por tipo de máquina</h2><p class="sub" style="margin:6px 0 12px">Quanto acima do valor máximo cada um pode liberar. Acima da alçada do gerente, só o dono libera. Zero = qualquer valor acima precisa de aprovação.</p>
        <div class="tabela-wrap"><table class="tabela grande"><thead><tr><th>Tipo</th><th class="n">Vendedor libera até (R$)</th><th class="n">Gerente libera até (R$)</th><th>Acima disso</th></tr></thead><tbody>
        ${Object.entries(alcadas()).map(([k, a]) => `<tr><td><b>${NOMES[k]}</b></td><td class="n"><input class="campo-in" style="max-width:150px;text-align:right" data-alc="${k}|vendedor" inputmode="numeric" value="${a.vendedor.toLocaleString('pt-BR')}"></td><td class="n"><input class="campo-in" style="max-width:150px;text-align:right" data-alc="${k}|gerente" inputmode="numeric" value="${a.gerente.toLocaleString('pt-BR')}"></td><td>Só o dono</td></tr>`).join('')}</tbody></table></div>
        <div class="acoes"><button class="btn btn-ouro" type="button" id="c-alc">Salvar alçadas</button></div></section>
      <div class="grade-2 bloco">
        <section class="painel"><h2>${ICO.barras}Catálogo de modelos</h2><p class="sub" style="margin:6px 0 10px">Referências de preço usadas pelo motor. Modelos novos entram com a Fipe.</p>
          <div class="tabela-wrap" style="max-height:320px;overflow:auto"><table class="tabela"><thead><tr><th>Modelo</th><th>Categoria</th><th class="n">Referência</th></tr></thead><tbody>${A.modelos.map((m) => `<tr><td><b>${esc(m.marca)}</b> ${esc(m.modelo)}</td><td>${NOMES[m.tipo]}</td><td class="n">${mil(m.base)}</td></tr>`).join('')}</tbody></table></div>
          <div class="acoes"><button class="btn btn-linha" type="button" id="c-modelo">Adicionar modelo</button></div></section>
        <section class="painel"><h2>${ICO.linha}Integrações e dados</h2>
          <ul class="lista-motivos" style="margin-top:8px"><li><span>Sincronização com a pasta do sistema (DMS)</span><b>${estado.ultimaSync ? 'Ligada' : 'Desligada'}</b></li><li><span>Documentos recebidos</span><b>${estado.documentos.length}</b></li><li><span>Atividades registradas</span><b>${estado.atividades.length}</b></li></ul>
          <div class="acoes"><a class="btn btn-linha" href="#teste">Sincronizar com o sistema</a><button class="btn btn-linha" type="button" id="c-backup">Baixar cópia de segurança</button><label class="btn btn-linha" style="cursor:pointer">Restaurar cópia<input type="file" accept=".json" id="c-restaura" class="sr"></label><button class="btn btn-linha" type="button" id="c-instalar">Instalar o app</button></div></section>
      ${K.nuvem && !K.nuvem.offline && ['dono', 'gerente', 'auditor'].includes(eu().perfil) ? '<section class="painel bloco" id="c-copias"><h2>Cópias diárias no servidor</h2><p class="sub">Carregando…</p></section>' : ''}
      </div>`;
    $('#c-salvar').onclick = () => { if (K.nuvem && $('#c-nome').value.trim().length >= 2 && ['dono', 'gerente'].includes(eu().perfil)) K.nuvem.renomear($('#c-nome').value.trim(), $('#c-cid').value.trim()).catch((e) => toast(e.message, true)); estado.nomeRevenda = $('#c-nome').value.trim(); estado.cnpj = $('#c-cnpj').value.trim(); estado.cidadeRevenda = $('#c-cid').value.trim(); estado.marcasRevenda = $('#c-marcas').value.trim(); salvar(); log('config', 'Dados da revenda atualizados'); toast('Dados da revenda salvos.'); setTimeout(() => K.recarregar(), 600); };
    $('#c-prem').onclick = abrirPremissas; ligarLGPD(); ligarLojas(); ligarIAConfig(); ligarAvisos();
    $('#c-alc').onclick = () => { const n = {}; $$('[data-alc]', tela).forEach((i) => { const [k, q] = i.dataset.alc.split('|'); n[k] = n[k] || {}; n[k][q] = Math.max(0, num(i.value) || 0); }); Object.values(n).forEach((a) => { if (a.gerente < a.vendedor) a.gerente = a.vendedor; }); estado.alcadas = n; log('config', 'Alçadas de aprovação alteradas'); salvar(); toast('Alçadas salvas.'); rota(); };
    $('#c-modelo').onclick = () => formulario('Adicionar modelo ao catálogo', [{ k: 'tipo', r: 'Categoria', tipo: 'select', ops: Object.entries(NOMES) }, { k: 'marca', r: 'Fabricante', lista: 'dl-marca', obr: true }, { k: 'modelo', r: 'Modelo', lista: 'dl-modelo', obr: true }, { k: 'base', r: 'Referência de preço seminovo (R$)', num: true, obr: true }], { tipo: 'trator' }, (v) => {
      A.modelos.push({ tipo: v.tipo, marca: v.marca, modelo: v.modelo, base: v.base, hAno: { trator: 750, colhedora: 2600, pulverizador: 820, plantadeira: 270 }[v.tipo], importado: true });
      estado.modelosExtra = (estado.modelosExtra || []).concat([{ tipo: v.tipo, marca: v.marca, modelo: v.modelo, base: v.base }]); salvar(); log('config', `Modelo ${v.marca} ${v.modelo} adicionado ao catálogo`); fecharCamada(true); toast('Modelo adicionado.'); rota();
    });
    const caixaCopias = $('#c-copias');
    if (caixaCopias) K.nuvem.copias().then((l) => {
      const dono = eu().perfil === 'dono';
      caixaCopias.innerHTML = `<h2>Cópias diárias no servidor</h2><p class="sub" style="margin:6px 0 10px">Todo dia de madrugada o servidor guarda uma cópia dos dados da revenda e mantém os últimos 30 dias. ${dono ? 'Restaurar troca os dados atuais pelos daquele dia (fica registrado na trilha).' : 'Só o dono pode restaurar.'}</p>
        ${l.length ? `<div class="tabela-wrap"><table class="tabela"><thead><tr><th>Dia</th><th>Versão</th><th>Guardada em</th><th></th></tr></thead><tbody>${l.map((c) => `<tr><td>${data(c.dia)}</td><td>${c.versao}</td><td>${new Date(c.criado).toLocaleString('pt-BR')}</td><td>${dono ? `<button class="link" type="button" data-restaurar="${esc(c.dia)}">Restaurar</button>` : ''}</td></tr>`).join('')}</tbody></table></div>` : '<p class="vazio">A primeira cópia é feita esta madrugada.</p>'}
        <p class="nota-rodape">As cópias ficam no mesmo banco de dados; para ter uma cópia fora dele, use "Baixar cópia de segurança".</p>`;
      $$('[data-restaurar]', caixaCopias).forEach((b) => b.onclick = () => confirmar(`Restaurar a cópia de ${data(b.dataset.restaurar)}?`, 'Os dados atuais da revenda serão trocados pelos daquele dia, para todos da equipe. Antes, baixe uma cópia de segurança se quiser guardar a versão atual.', 'Restaurar', async () => {
        try { await K.nuvem.restaurarCopia(b.dataset.restaurar); toast('Cópia restaurada.'); setTimeout(() => location.reload(), 700); } catch (e) { toast(e.message, true); }
      }));
    }, (e) => { caixaCopias.innerHTML = `<h2>Cópias diárias no servidor</h2><p class="neg">${esc(e.message)}</p>`; });
    $('#c-backup').onclick = () => { const url = URL.createObjectURL(new Blob([JSON.stringify(estado, null, 1)], { type: 'application/json' })); const a = document.createElement('a'); a.href = url; a.download = `anshur-copia-${hojeISO()}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); log('config', 'Cópia de segurança baixada'); salvar(); toast('Cópia de segurança gerada.'); };
    $('#c-restaura').onchange = (e) => { const f = e.target.files[0]; if (!f) return; f.text().then((tx) => { let d; try { d = JSON.parse(tx); } catch (er) { toast('Arquivo inválido.', true); return; } if (!d || !Array.isArray(d.fechadas)) { toast('Este arquivo não é uma cópia do Anshur.', true); return; } confirmar('Restaurar esta cópia?', 'Os dados atuais deste ambiente serão substituídos pelos da cópia.', 'Restaurar', () => { K.repo.gravar(d); K.recarregar(); }); }); };
    $('#c-instalar').onclick = simularInstalacao;
  }
  function primeirosPassos() {
    return [
      { nome: 'Dados da revenda', desc: 'Nome, CNPJ e cidade', ok: !!estado.cnpj, ir: '#config' },
      { nome: 'Regras comerciais', desc: 'Margem-alvo, custo do capital e comissão', ok: !!(estado.config && Object.keys(estado.config).length), ir: '#config' },
      { nome: 'Equipe', desc: 'Cadastre gerente, vendedores e oficina', ok: estado.usuarios.length > 1, ir: '#usuarios' },
      { nome: 'Histórico de vendas', desc: 'Importe as trocas já vendidas', ok: C.vendidas().length >= 10, ir: '#teste' },
      { nome: 'Estoque atual', desc: 'Máquinas que estão hoje no pátio', ok: C.patio().length > 0, ir: '#patio' },
      { nome: 'Primeira avaliação', desc: 'Avalie uma troca de verdade', ok: estado.avaliacoes.length > 0 || estado.fechadas.some((t) => t.previsto), ir: '#avaliar' },
      { nome: 'Primeiro relatório', desc: 'Abra o relatório da semana', ok: estado.atividades.some((a) => a.tipo === 'relatorio'), ir: '#relatorio' }
    ];
  }

  // ---------- instalação (simulação) ----------
  let promptInstalar = null;
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); promptInstalar = e; });
  function simularInstalacao() {
    abrirCamada('modal', `<div class="instala"><img src="icone-192.png" alt="" width="88" height="88" class="instala-ico"><h2>Instalar o Anshur</h2>
      <p class="sub" id="ins-txt">Abre direto da tela inicial, em tela cheia, e funciona sem internet no pátio.</p>
      <div class="progresso grande" id="ins-bar" hidden><i style="width:0%"></i></div>
      <div class="acoes" style="justify-content:center"><button class="btn btn-ouro" type="button" id="ins-ok">Instalar</button></div></div>`, (c) => {
      $('#ins-ok', c).onclick = () => {
        const bar = $('#ins-bar', c), txt = $('#ins-txt', c); $('#ins-ok', c).hidden = true; bar.hidden = false;
        const etapas = [[20, 'Baixando o aplicativo…'], [55, 'Guardando para usar sem internet…'], [80, 'Criando o atalho na tela inicial…'], [100, 'Pronto! O Anshur está instalado.']];
        etapas.forEach(([p, m], i) => setTimeout(() => { $('i', bar).style.width = p + '%'; txt.textContent = m; if (p === 100) { c.querySelector('.instala').classList.add('feito'); $('.acoes', c).innerHTML = `<button class="btn btn-ouro" type="button" id="ins-fim">Abrir o Anshur</button>${promptInstalar ? '<button class="btn btn-linha" type="button" id="ins-real">Instalar de verdade neste aparelho</button>' : ''}`; $('#ins-fim', c).onclick = () => fecharCamada(); const r = $('#ins-real', c); if (r) r.onclick = () => { promptInstalar.prompt(); }; log('config', 'Instalação do app (simulação)'); salvar(); } }, 700 * (i + 1)));
      };
    });
  }

  // ---------- relatórios diário, semanal e mensal ----------
  let periodo = 'semanal';
  function janela(p, deslocar = 0) {
    const hoje = new Date(hojeISO() + 'T12:00:00');
    const fim = new Date(hoje), ini = new Date(hoje);
    if (p === 'diario') { fim.setDate(fim.getDate() - deslocar); ini.setDate(ini.getDate() - deslocar); }
    if (p === 'semanal') { fim.setDate(fim.getDate() - 7 * deslocar); ini.setDate(fim.getDate() - 6); }
    if (p === 'mensal') { fim.setMonth(fim.getMonth() - deslocar); ini.setTime(fim.getTime()); ini.setDate(1); if (deslocar) { fim.setDate(1); fim.setMonth(fim.getMonth() + 1); fim.setDate(0); } }
    return [ini.toISOString().slice(0, 10), fim.toISOString().slice(0, 10)];
  }
  function metricas([ini, fim]) {
    const dentro = (d) => d && d >= ini && d <= fim;
    const vend = A.trocas.filter((t) => t.vendido && dentro(t.saida)), entr = A.trocas.filter((t) => dentro(t.entrada));
    const venda = vend.reduce((s, t) => s + t.vendido, 0), res = vend.reduce((s, t) => s + C.resultado(t), 0);
    const acima = entr.reduce((s, t) => { const r = rec(t); return s + (r && t.pago > r.teto ? t.pago - r.teto : 0); }, 0);
    const garRec = (A.garantias || []).filter((g) => dentro(g.data) && g.pago > 0).reduce((s, g) => s + g.pago, 0);
    const atv = estado.atividades.filter((a) => dentro(a.quando.slice(0, 10)));
    return { vend, entr, venda, res, margem: venda ? res / venda : NaN, acima, garRec, atv, aval: estado.avaliacoes.filter((a) => dentro(a.data)).length, comprado: entr.reduce((s, t) => s + t.pago, 0), dias: vend.length ? vend.reduce((s, t) => s + (t.diasPatio || 0), 0) / vend.length : NaN };
  }
  function telaRelatorios() {
    if (periodo === 'margem') return telaMargem();
    const atual = janela(periodo), ant = janela(periodo, 1), m = metricas(atual), p = metricas(ant);
    const nomeP = { diario: 'Diário', semanal: 'Semanal', mensal: 'Mensal' }[periodo];
    const delta = (a, b, inverso) => { if (!isFinite(a) || !isFinite(b) || b === 0) return '<span class="sub">sem comparação</span>'; const d = (a - b) / Math.abs(b); const bom = inverso ? d < 0 : d > 0; return `<span class="${bom ? 'pos' : 'neg'}">${d > 0 ? '▲' : '▼'} ${pct(Math.abs(d), 0)}</span> <span class="sub">vs período anterior</span>`; };
    const itens = C.patio().map(infoPatio), al = listaAlertas().filter((a) => !estado.resolvidos[a.id]).slice(0, 6);
    const porV = {}; m.vend.forEach((t) => { const v = t.vendedor || '—'; porV[v] = porV[v] || { n: 0, res: 0 }; porV[v].n++; porV[v].res += C.resultado(t); });
    log('relatorio', `Relatório ${nomeP.toLowerCase()} aberto`); salvar();
    tela.innerHTML = `
      <div class="titulo"><div><h1>Relatórios</h1><p>${nomeP}: ${data(atual[0])}${atual[0] !== atual[1] ? ' a ' + data(atual[1]) : ''}, comparado com ${data(ant[0])}${ant[0] !== ant[1] ? ' a ' + data(ant[1]) : ''}.</p></div>
        <div class="acoes"><button class="btn btn-linha" type="button" id="r-csv">Exportar CSV</button><button class="btn btn-linha" type="button" onclick="print()">Imprimir ou PDF</button>${botaoAdicionar([{ nome: 'Anotação no relatório', desc: 'Fica no histórico de atividades do período', acao: () => formulario('Adicionar anotação', [{ k: 'texto', r: 'Anotação', obr: true, inteiro: true }], {}, (v) => { log('anotacao', v.texto); salvar(); fecharCamada(true); toast('Anotação registrada.'); rota(); }) }])}</div></div>
      ${abasRel()}
      <article class="relatorio" style="max-width:none">
        <img class="logo-img" src="logo/anshur-logo.png?v=5" alt="Anshur" width="190" height="48"><p class="sub" style="margin-top:6px">${esc(A.revenda.nome)} · relatório ${nomeP.toLowerCase()} · emitido em ${new Date().toLocaleString('pt-BR')} por ${esc(eu().nome)}</p>
        <div class="kpis" style="margin-top:18px">
          <div class="kpi k-marfim"><span class="rot">${ICO.barras}Usados vendidos</span><span class="val">${m.vend.length}</span><span class="exp">${delta(m.vend.length, p.vend.length)}</span></div>
          <div class="kpi k-salvia"><span class="rot">${ICO.moedas}Resultado bruto</span><span class="val">${mil(m.res)}</span><span class="exp">${delta(m.res, p.res)}</span></div>
          <div class="kpi k-marfim"><span class="rot">${ICO.pct}Margem realizada</span><span class="val">${isFinite(m.margem) ? pct(m.margem) : '—'}</span><span class="exp">${delta(m.margem, p.margem)}</span></div>
          <div class="kpi k-risco"><span class="rot">${ICO.alerta}Pago acima do recomendado</span><span class="val">${mil(m.acima)}</span><span class="exp">${delta(m.acima, p.acima, true)}</span></div>
        </div>
        <div class="numeros"><div><span>Trocas que entraram</span><b>${m.entr.length} · ${mil(m.comprado)}</b></div><div><span>Faturamento com usados</span><b>${mil(m.venda)}</b></div><div><span>Tempo médio até vender</span><b>${isFinite(m.dias) ? Math.round(m.dias) + ' dias' : '—'}</b></div>
          <div><span>Avaliações feitas</span><b>${m.aval}</b></div><div><span>Garantias recebidas</span><b>${mil(m.garRec)}</b></div><div><span>Capital imobilizado hoje</span><b>${mil(C.capitalImobilizado())}</b></div></div>
        ${!m.vend.length && !m.entr.length ? `<p class="conta">Sem trocas nem vendas neste período. ${periodo === 'diario' ? 'Veja o relatório semanal ou mensal para ter números.' : ''}</p>` : ''}
        <h2>Prioridades</h2><ul>${al.map((a) => `<li><b>${esc(a.titulo)}</b>: ${esc(a.txt)}.</li>`).join('') || '<li>Nenhum ponto crítico.</li>'}</ul>
        ${Object.keys(porV).length ? `<h2>Vendedores no período</h2><ul>${Object.entries(porV).sort((a, b) => b[1].res - a[1].res).map(([v, x]) => `<li><b>${esc(v)}</b>: ${x.n} ${x.n === 1 ? 'venda' : 'vendas'}, resultado ${mil(x.res)}.</li>`).join('')}</ul>` : ''}
        <h2>Máquinas que mais pesam hoje</h2><ul>${itens.sort((a, b) => b.risco - a.risco).slice(0, 5).map((i) => `<li>${esc(i.t.marca + ' ' + i.t.modelo)}: ${i.dias} dias, ${mil(i.t.pago)} parados, margem estimada ${pct(i.margem)}. ${esc(i.acao)}.</li>`).join('')}</ul>
        <h2>O que aconteceu no sistema</h2><ul>${m.atv.slice(0, 10).map((a) => `<li>${new Date(a.quando).toLocaleString('pt-BR')} · ${esc(a.usuario)}: ${esc(a.texto)}</li>`).join('') || '<li>Nenhuma atividade registrada no período.</li>'}</ul>
        <p class="nota-rodape">Cada número vem dos registros do sistema. Valores estimados são estimativas. ${OP ? '' : 'Revenda e dados fictícios.'}</p></article>`;
    $$('[data-per]', tela).forEach((b) => b.onclick = () => { periodo = b.dataset.per; telaRelatorios(); });
    $('#r-csv').onclick = () => baixarCSV(`anshur-relatorio-${periodo}-${hojeISO()}.csv`, [['Indicador', 'Período atual', 'Período anterior'], ['Usados vendidos', m.vend.length, p.vend.length], ['Resultado bruto', Math.round(m.res), Math.round(p.res)], ['Margem realizada', isFinite(m.margem) ? (m.margem * 100).toFixed(1) + '%' : '', isFinite(p.margem) ? (p.margem * 100).toFixed(1) + '%' : ''], ['Pago acima do recomendado', Math.round(m.acima), Math.round(p.acima)], ['Trocas que entraram', m.entr.length, p.entr.length], ['Faturamento com usados', Math.round(m.venda), Math.round(p.venda)], ['Garantias recebidas', Math.round(m.garRec), Math.round(p.garRec)]]);
  }

  const abasRel = () => `<div class="abas-modo" role="group" aria-label="Tipo de relatório">${[['diario', 'Diário'], ['semanal', 'Semanal'], ['mensal', 'Mensal'], ['margem', 'Margem por marca']].map(([k, n]) => `<button type="button" data-per="${k}" aria-pressed="${periodo === k}">${n}</button>`).join('')}</div>`;

  // ---------- RELATÓRIO DE MARGEM LÍQUIDA POR MARCA (e por tipo) ----------
  // Só operações concluídas (vendidas). Real = preparo e comissão registrados; estimada = falta algum (sinalizado). Nada é inventado.
  const fm = { de: '', ate: '', loja: null, agrupar: 'marca' };
  const nomeMes = (m) => { const [a, b] = m.split('-'); return new Date(+a, +b - 1, 15).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }).replace('.', ''); };
  const podeLancarCustos = () => ['dono', 'gerente', 'financeiro'].includes(eu().perfil) && !(NV && NV.somenteLeitura);
  const pctCSV = (v) => (isFinite(v) ? (v * 100).toFixed(1).replace('.', ',') : '');
  function telaMargem() {
    const lojasVer = K.lojasPermitidas || estado.lojas;
    if (fm.loja === null) fm.loja = estado.lojaAtual && lojasVer.includes(estado.lojaAtual) ? estado.lojaAtual : '';
    if (fm.loja && !lojasVer.includes(fm.loja)) fm.loja = '';
    const base = A.todasTrocas || A.trocas, mesHoje = hojeISO().slice(0, 7);
    const vendMeses = base.filter((t) => t.vendido && t.saida).map((t) => t.saida.slice(0, 7));
    const primeiro = vendMeses.length ? vendMeses.reduce((a, b) => (a < b ? a : b)) : mesHoje;
    const meses = []; for (let [a, m] = primeiro.split('-').map(Number); `${a}-${String(m).padStart(2, '0')}` <= mesHoje; m === 12 ? (m = 1, a++) : m++) meses.push(`${a}-${String(m).padStart(2, '0')}`);
    if (!fm.ate || !meses.includes(fm.ate)) fm.ate = mesHoje;
    if (!fm.de || !meses.includes(fm.de)) { const d = new Date(mesHoje + '-15T12:00:00'); d.setMonth(d.getMonth() - 11); fm.de = d.toISOString().slice(0, 7) < primeiro ? primeiro : d.toISOString().slice(0, 7); }
    if (fm.de > fm.ate) [fm.de, fm.ate] = [fm.ate, fm.de];
    const r = K.relatorioMargem(base, { de: fm.de, ate: fm.ate, loja: fm.loja, lojas: K.lojasPermitidas, agrupar: fm.agrupar });
    const nomeG = fm.agrupar === 'tipo' ? 'Tipo' : 'Marca', rotG = (c) => (fm.agrupar === 'tipo' ? NOMES[c] || c : c);
    const pc = (v) => (isFinite(v) ? pct(v) : '—'), neg = (v) => (v < 0 ? 'neg' : '');
    const sitG = (x) => (x.status === 'real' ? '<span class="tag comprovado">Real</span>' : `<span class="tag declarado">Estimada</span><span class="sub mg-falta">${[x.faltaPreparo ? `${x.faltaPreparo} sem preparo` : '', x.faltaComissao ? `${x.faltaComissao} sem comissão` : ''].filter(Boolean).join(' · ')}</span>`);
    const sitO = (o) => (o.status === 'real' ? '<span class="tag comprovado">Real</span>' : `<span class="tag declarado">Estimada</span><span class="sub mg-falta">falta ${o.faltando.join(' e ')}${o.preparoPrevisto ? ` (preparo previsto ${real(o.preparoPrevisto)}, não somado)` : ''}</span>`);
    const lancar = podeLancarCustos();
    const periodoTxt = fm.de === fm.ate ? nomeMes(fm.de) : `${nomeMes(fm.de)} a ${nomeMes(fm.ate)}`;
    const opt = (lista, sel) => lista.map(([v, n]) => `<option value="${esc(v)}" ${v === sel ? 'selected' : ''}>${esc(n)}</option>`).join('');
    const mesesOpt = meses.slice().reverse().map((m) => [m, nomeMes(m)]);
    const linhaNum = (x) => `<td class="n">${real(x.receita)}</td><td class="n">${real(x.aquisicao)}</td><td class="n">${real(x.preparo)}</td><td class="n">${real(x.juros)}</td><td class="n">${real(x.comissao)}</td><td class="n forte ${neg(x.margem)}">${real(x.margem)}</td><td class="n ${neg(x.margem)}">${pc(x.pct)}</td>`;
    const cab = `<th class="n">Receita</th><th class="n">Aquisição</th><th class="n">Preparo</th><th class="n">Juros floor plan</th><th class="n">Comissão</th><th class="n">Margem líquida</th><th class="n">%</th>`;
    tela.innerHTML = `
      <div class="titulo"><div><h1>Relatórios</h1><p>Margem líquida por ${nomeG.toLowerCase()} das operações concluídas (vendidas), mês a mês.</p></div>
        <div class="acoes"><button class="btn btn-linha" type="button" id="mg-csv">Exportar CSV</button><button class="btn btn-linha" type="button" id="mg-print">Imprimir ou PDF</button></div></div>
      ${abasRel()}
      <div class="campos filtros-margem" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr));margin-bottom:16px">
        <div class="campo"><label for="mg-de">De</label><select id="mg-de">${opt(mesesOpt, fm.de)}</select></div>
        <div class="campo"><label for="mg-ate">Até</label><select id="mg-ate">${opt(mesesOpt, fm.ate)}</select></div>
        ${lojasVer.length ? `<div class="campo"><label for="mg-loja">Loja</label><select id="mg-loja">${opt([['', K.lojasPermitidas ? 'Minhas lojas' : 'Todas as lojas']].concat(lojasVer.map((l) => [l, l])), fm.loja)}</select></div>` : ''}
        <div class="campo"><label for="mg-agr">Agrupar por</label><select id="mg-agr">${opt([['marca', 'Marca'], ['tipo', 'Tipo de máquina']], fm.agrupar)}</select></div>
      </div>
      <article class="relatorio relatorio-margem" style="max-width:none">
        <img class="logo-img" src="logo/anshur-logo.png?v=5" alt="Anshur" width="190" height="48">
        <p class="sub" style="margin-top:6px">${esc(A.revenda.nome)} · ${fm.loja ? 'loja ' + esc(fm.loja) : K.lojasPermitidas ? 'lojas ' + esc(K.lojasPermitidas.join(', ')) : 'todas as lojas'} · ${esc(periodoTxt)} · emitido em ${new Date().toLocaleString('pt-BR')} por ${esc(eu().nome)}</p>
        <h2 style="margin-top:14px">Margem líquida por ${nomeG.toLowerCase()}</h2>
        <div class="numeros"><div><span>Operações concluídas</span><b>${r.total.n} <small class="sub">(${r.total.nReal} reais · ${r.total.nEst} estimadas)</small></b></div><div><span>Receita (vendas)</span><b>${mil(r.total.receita)}</b></div>
          <div><span>Custos registrados</span><b>${mil(r.total.aquisicao + r.total.preparo + r.total.juros + r.total.comissao)}</b></div><div><span>Margem líquida</span><b class="${neg(r.total.margem)}">${mil(r.total.margem)}</b></div><div><span>Margem líquida %</span><b class="${neg(r.total.margem)}">${pc(r.total.pct)}</b></div></div>
        ${r.total.nEst ? `<p class="conta">${r.total.nEst} de ${r.total.n} operações estão com margem <b>estimada</b>: faltam custos registrados (${[r.total.faltaPreparo ? `preparo em ${r.total.faltaPreparo}` : '', r.total.faltaComissao ? `comissão em ${r.total.faltaComissao}` : ''].filter(Boolean).join(', ')}). O Anshur não inventa custo: a margem dessas operações usa só o que foi registrado e pode ser menor.${lancar ? ' Lance os custos em cada operação, abaixo.' : ''}</p>` : ''}
        ${!r.total.n ? '<p class="conta">Nenhuma operação concluída (vendida) neste período e nesta loja.</p>' : `
        <div class="tabela-wrap"><table class="tabela" id="mg-grupos"><thead><tr><th>${nomeG}</th><th class="n">Vendas</th>${cab}<th>Situação</th></tr></thead><tbody>
          ${r.grupos.map((g) => `<tr><td><b>${esc(rotG(g.chave))}</b></td><td class="n">${g.n}</td>${linhaNum(g)}<td>${sitG(g)}</td></tr>`).join('')}
          <tr class="mg-total"><td><b>Total</b></td><td class="n"><b>${r.total.n}</b></td>${linhaNum(r.total)}<td>${sitG(r.total)}</td></tr></tbody></table></div>
        <h2>Mês a mês</h2>
        <div class="tabela-wrap"><table class="tabela" id="mg-meses"><thead><tr><th>Mês</th><th>${nomeG}</th><th class="n">Vendas</th><th class="n">Receita</th><th class="n">Margem líquida</th><th class="n">%</th><th>Situação</th></tr></thead><tbody>
          ${r.meses.map((x) => `<tr><td>${esc(nomeMes(x.mes))}</td><td>${esc(rotG(x.chave))}</td><td class="n">${x.n}</td><td class="n">${real(x.receita)}</td><td class="n forte ${neg(x.margem)}">${real(x.margem)}</td><td class="n ${neg(x.margem)}">${pc(x.pct)}</td><td>${x.status === 'real' ? '<span class="tag comprovado">Real</span>' : '<span class="tag declarado">Estimada</span>'}</td></tr>`).join('')}</tbody></table></div>
        <h2>Operações</h2>
        <div class="tabela-wrap"><table class="tabela" id="mg-ops"><thead><tr><th>Venda</th><th>Máquina</th>${lojasVer.length ? '<th>Loja</th>' : ''}${cab}<th>Situação</th>${lancar ? '<th class="sem-impressao"></th>' : ''}</tr></thead><tbody>
          ${r.operacoes.map((o) => `<tr data-op="${esc(o.id)}"><td>${data(o.saida)}</td><td class="maq"><span><b>${esc(o.marca + ' ' + o.modelo)}</b><span>${esc(NOMES[o.tipo] || o.tipo)} · ${o.ano || ''}${o.pecas != null ? ` · peças ${real(o.pecas)}, mão de obra ${real(o.maoDeObra)} (${(o.horasOficina || 0).toLocaleString('pt-BR')} h)` : ''}</span></span></td>${lojasVer.length ? `<td>${esc(o.loja || '—')}</td>` : ''}${linhaNum(o)}<td>${sitO(o)}</td>${lancar ? `<td class="sem-impressao"><button class="link" type="button" data-custos="${esc(o.id)}">Lançar custos</button></td>` : ''}</tr>`).join('')}</tbody></table></div>`}
        <p class="nota-rodape">Margem líquida = venda − valor pago na troca − preparo (peças e horas) − juros do floor plan − comissão. Real: preparo e comissão registrados. Estimada: falta algum desses custos; a margem mostrada usa só os custos registrados e pode ser menor. Juros do floor plan entram quando registrados (usado fora do floor plan não tem juros). Só operações vendidas, pela data da venda. ${OP ? '' : 'Revenda e dados fictícios.'}</p>
      </article>`;
    $$('[data-per]', tela).forEach((b) => b.onclick = () => { periodo = b.dataset.per; telaRelatorios(); });
    $('#mg-de').onchange = (e) => { fm.de = e.target.value; telaMargem(); };
    $('#mg-ate').onchange = (e) => { fm.ate = e.target.value; telaMargem(); };
    const sl = $('#mg-loja'); if (sl) sl.onchange = (e) => { fm.loja = e.target.value; telaMargem(); };
    $('#mg-agr').onchange = (e) => { fm.agrupar = e.target.value; telaMargem(); };
    $('#mg-print').onclick = () => print();
    $('#mg-csv').onclick = () => {
      const L = [['Mês', 'Data da venda', 'Operação', 'Tipo', 'Marca', 'Modelo', 'Ano', 'Loja', 'Receita', 'Aquisição', 'Preparo', 'Peças', 'Mão de obra', 'Juros floor plan', 'Comissão', 'Margem líquida', 'Margem %', 'Situação', 'Custos faltando']]
        .concat(r.operacoes.map((o) => [o.mes, o.saida, o.id, NOMES[o.tipo] || o.tipo, o.marca, o.modelo, o.ano, o.loja, o.receita, o.aquisicao, o.preparo, o.pecas ?? '', o.maoDeObra ?? '', o.juros, o.comissao, o.margem, pctCSV(o.pct), o.status === 'real' ? 'Real' : 'Estimada', o.faltando.join(', ')]))
        .concat([[], [nomeG, 'Vendas', 'Reais', 'Estimadas', 'Receita', 'Aquisição', 'Preparo', 'Juros floor plan', 'Comissão', 'Margem líquida', 'Margem %']])
        .concat(r.grupos.concat([Object.assign({ chave: 'Total' }, r.total)]).map((g) => [rotG(g.chave), g.n, g.nReal, g.nEst, g.receita, g.aquisicao, g.preparo, g.juros, g.comissao, g.margem, pctCSV(g.pct)]));
      baixarCSV(`anshur-margem-por-${fm.agrupar}-${fm.de}-a-${fm.ate}${fm.loja ? '-' + fm.loja.replace(/\W+/g, '-') : ''}.csv`, L);
    };
    $$('[data-custos]', tela).forEach((b) => b.onclick = () => {
      const t = base.find((x) => x.id === b.dataset.custos); if (!t) return;
      const o = K.margemOperacao(t), cu = t.custos || {};
      const campos = [{ k: 'comissao', r: 'Comissão paga (R$)', num: true, ph: 'Vazio = não registrada' }, { k: 'juros', r: 'Juros do floor plan (R$)', num: true, ph: 'Vazio = sem juros registrados' }]
        .concat(o.faltando.includes('preparo') ? [{ k: 'preparo', r: 'Preparo total: peças + mão de obra (R$)', num: true, ph: o.preparoPrevisto ? 'Previsto: ' + real(o.preparoPrevisto) : 'Vazio = não registrado' }] : []);
      formulario(`Custos da venda: ${t.marca} ${t.modelo}`, campos, { comissao: cu.comissao ?? '', juros: cu.juros ?? '' }, (v) => {
        const cs = {}; if (v.comissao !== '') cs.comissao = v.comissao; if (v.juros !== '') cs.juros = v.juros;
        if (!Object.keys(cs).length && (v.preparo === '' || v.preparo === undefined)) { toast('Informe pelo menos um custo.', true); return; }
        if (Object.keys(cs).length) t.custos = Object.assign({}, t.custos, K.registrarCustos(estado, t.id, cs, eu().nome));
        if (v.preparo !== '' && v.preparo !== undefined) { K.registrarPreparo(estado, t.id, v.preparo, hojeISO()); t.preparo = Math.round(v.preparo); t.preparoRegistrado = hojeISO(); }
        log('venda', `Custos lançados: ${t.marca} ${t.modelo}${cs.comissao != null ? ', comissão ' + real(cs.comissao) : ''}${cs.juros != null ? ', juros ' + real(cs.juros) : ''}${v.preparo !== '' && v.preparo !== undefined ? ', preparo ' + real(v.preparo) : ''}`, { ref: t.id });
        salvar(); cacheLimpa(); fecharCamada(true); toast('Custos lançados.'); telaMargem();
      }, 'Só o que foi realmente pago. Campo vazio continua como não registrado.');
    });
  }

  // ---------- auditoria ----------
  function telaAtividades() {
    const l = estado.atividades;
    tela.innerHTML = `<div class="titulo"><div><h1>Atividades</h1><p>Tudo o que foi feito no sistema, por quem e quando.</p></div>${botaoAdicionar([{ nome: 'Anotação', desc: 'Registro manual (visita, ligação, combinado)', acao: () => formulario('Adicionar anotação', [{ k: 'texto', r: 'O que aconteceu', obr: true, inteiro: true }], {}, (v) => { log('anotacao', v.texto); salvar(); fecharCamada(true); toast('Anotação registrada.'); rota(); }) }])}</div>
      <section class="painel">${l.length ? `<ul class="linha-tempo grande">${l.slice(0, 200).map((a) => `<li><b>${esc(a.texto)}</b><span>${new Date(a.quando).toLocaleString('pt-BR')} · ${esc(a.usuario)} (${K.PERFIS[a.perfil] || ''})</span></li>`).join('')}</ul>` : '<p class="vazio">Nenhuma atividade ainda. Avaliações, trocas, vendas, documentos e mudanças de regra aparecem aqui.</p>'}
      <p class="nota-rodape">${K.nuvem ? 'Trocas, aprovações, preços, vendas, convites e exclusões também vão para a trilha do servidor, abaixo, que ninguém da revenda consegue alterar ou apagar.' : 'Na demonstração o registro fica neste navegador. Na conta da revenda, as atividades críticas vão também para uma trilha no servidor que não pode ser alterada.'}</p></section>
      ${K.nuvem && !K.nuvem.offline ? '<section class="painel bloco" id="ev-srv"><h2>Trilha do servidor</h2><p class="sub">Carregando…</p></section>' : ''}`;
    const box = $('#ev-srv');
    if (box) K.nuvem.eventosServidor().then((ev) => {
      const nome = (id) => { const u = estado.usuarios.find((x) => x.id === id); return u ? u.nome : 'pessoa removida'; };
      box.innerHTML = `<h2>Trilha do servidor</h2><p class="sub" style="margin-bottom:8px">Registro só de inclusão: não tem edição nem exclusão.</p>${ev.length ? `<ul class="linha-tempo grande">${ev.map((a) => `<li><b>${esc(a.texto)}</b><span>${new Date(a.quando).toLocaleString('pt-BR')} · ${esc(nome(a.usuario))} · ${esc(a.tipo)}</span></li>`).join('')}</ul>` : '<p class="vazio">Nenhum registro ainda.</p>'}`;
    }, (e) => { box.innerHTML = `<h2>Trilha do servidor</h2><p class="neg">${esc(e.message)}</p>`; });
  }

  // ---------- busca global (Ctrl+K) ----------
  function abrirBusca() {
    const acoes = [['Nova avaliação', '#avaliar'], ['Ver pátio', '#patio'], ['Relatório semanal', '#relatorio'], ['Central de documentos', '#documentos'], ['Configurações', '#config'], ['Usuários', '#usuarios'], ['Garantias a receber', '#garantias'], ['Estoque financiado', '#financiamento'], ['Teste às cegas', '#teste'], ['Atividades', '#atividades']].filter(([, h]) => pode(h.slice(1)));
    abrirCamada('modal busca-modal', `<input class="busca-in" id="busca" placeholder="Buscar máquina, chassi, OS, vendedor, página…" autocomplete="off" aria-label="Buscar"><div id="busca-res" class="busca-res"></div><p class="nota-rodape">Setas para navegar, Enter para abrir, Esc para fechar.</p>`, (c) => {
      const inp = $('#busca', c), res = $('#busca-res', c); let sel = 0, itens = [];
      const desenha = () => {
        const q = inp.value.trim().toLowerCase();
        const maq = A.trocas.filter((t) => !q || [t.marca, t.modelo, t.id, t.chassi, t.vendedor, t.origem].join(' ').toLowerCase().includes(q)).slice(0, 6).map((t) => ({ g: t.vendido ? 'Vendidas' : 'No pátio', n: `${t.marca} ${t.modelo} · ${t.ano}`, d: t.vendido ? `vendida ${data(t.saida)} por ${mil(t.vendido)}` : `${diasDesde(t.entrada)} dias no pátio`, ir: () => { location.hash = t.vendido ? '#trocas' : '#patio'; setTimeout(() => !t.vendido && detalheMaquina(t.id), 300); } }));
        const gar = (A.garantias || []).filter((g) => q && [g.os, g.servico, g.cliente, g.marca].join(' ').toLowerCase().includes(q)).slice(0, 4).map((g) => ({ g: 'Garantias', n: `${g.os} · ${g.servico}`, d: `${g.marca} · ${real(g.valor)}`, ir: () => { location.hash = '#garantias'; } }));
        const fin = (A.financiadas || []).filter((f) => q && [f.chassi, f.modelo, f.marca].join(' ').toLowerCase().includes(q)).slice(0, 4).map((f) => ({ g: 'Financiadas', n: `${f.marca} ${f.modelo}`, d: f.chassi, ir: () => { location.hash = '#financiamento'; } }));
        const pag = acoes.filter(([n]) => !q || n.toLowerCase().includes(q)).slice(0, 5).map(([n, h]) => ({ g: 'Ir para', n, d: '', ir: () => { location.hash = h; } }));
        itens = [...pag, ...maq, ...gar, ...fin]; sel = Math.min(sel, Math.max(0, itens.length - 1));
        let g = ''; res.innerHTML = itens.map((x, i) => `${x.g !== g ? `<div class="busca-g">${(g = x.g)}</div>` : ''}<button type="button" class="busca-it ${i === sel ? 'sel' : ''}" data-i="${i}"><b>${esc(x.n)}</b><span>${esc(x.d)}</span></button>`).join('') || '<p class="vazio">Nada encontrado.</p>';
        $$('.busca-it', res).forEach((b) => b.onclick = () => { fecharCamada(true); itens[+b.dataset.i].ir(); });
      };
      inp.oninput = () => { sel = 0; desenha(); };
      inp.onkeydown = (e) => { if (e.key === 'ArrowDown') { sel = Math.min(itens.length - 1, sel + 1); desenha(); e.preventDefault(); } if (e.key === 'ArrowUp') { sel = Math.max(0, sel - 1); desenha(); e.preventDefault(); } if (e.key === 'Enter' && itens[sel]) { fecharCamada(true); itens[sel].ir(); } };
      desenha(); setTimeout(() => inp.focus(), 80);
    });
  }
  document.addEventListener('keydown', (e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); abrirBusca(); } });

  // ---------- comparação de máquinas ----------
  const comparar = new Set();
  function abrirComparacao() {
    const l = [...comparar].map((id) => A.trocas.find((t) => t.id === id)).filter(Boolean).map(infoPatio);
    if (l.length < 2) { toast('Marque 2 ou 3 máquinas para comparar.', true); return; }
    const linhas = [['Foto', (i) => `<img src="${F.de(i.t).propria ? F.de(i.t).u : F.mini(F.de(i.t).u)}" alt="" style="width:100%;max-width:220px;border-radius:10px;aspect-ratio:4/3;object-fit:cover">`], ['Ano · horas', (i) => `${i.t.ano} · ${i.t.horas.toLocaleString('pt-BR')} h`], ['Aquisição', (i) => real(i.t.pago)], ['Preparação', (i) => real(i.t.preparo)], ['Custo financeiro', (i) => real(i.juros)], ['Dias no pátio', (i) => `<span class="dias ${i.faixa}">${i.dias} dias</span>`], ['Venda estimada', (i) => real(i.venda)], ['Margem esperada', (i) => `<b class="${i.margem < 0.06 ? 'neg' : 'pos'}">${pct(i.margem)}</b>`], ['Risco de oficina', (i) => { const h = historicoModelo(i.t.modelo); return h.reserva ? real(h.reserva) + ' em média' : 'sem histórico'; }], ['Época de venda', (i) => esc((SAFRA[i.t.tipo] || {}).janela || '—')], ['Recomendação', (i) => esc(i.acao)]];
    abrirCamada('gaveta larga', `<h2 style="font-size:24px">Comparar máquinas</h2><div class="tabela-wrap" style="margin-top:14px"><table class="tabela grande comparar"><thead><tr><th></th>${l.map((i) => `<th>${esc(i.t.marca + ' ' + i.t.modelo)}</th>`).join('')}</tr></thead><tbody>${linhas.map(([n, f]) => `<tr><td><b>${n}</b></td>${l.map((i) => `<td>${f(i)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`);
  }

  // ---------- notificações com categoria e "resolvido" ----------
  function abrirNotificacoes() {
    const l = listaAlertas(); let filtro = 'abertos';
    const desenha = (c) => {
      const v = l.filter((a) => (filtro === 'abertos' ? !estado.resolvidos[a.id] : !!estado.resolvidos[a.id]));
      $('#notif', c).innerHTML = v.map((a) => `<li class="${a.nivel}">${a.nivel === 'alto' ? ICO.alto : ICO.medio}<div><span class="cat">${esc(a.cat)}</span><b>${esc(a.titulo)}</b><span>${esc(a.txt)}</span><span class="acoes" style="margin-top:8px;display:flex"><a class="btn btn-linha" href="${a.ir}" data-ir>Abrir</a>${filtro === 'abertos' ? `<button class="btn btn-linha" type="button" data-res="${a.id}">Marcar como resolvido</button>` : `<button class="btn btn-linha" type="button" data-reab="${a.id}">Reabrir</button>`}</span></div></li>`).join('') || `<li class="info">${ICO.baixo}<div><b>${filtro === 'abertos' ? 'Tudo em ordem' : 'Nada resolvido ainda'}</b></div></li>`;
      $$('[data-ir]', c).forEach((x) => x.onclick = () => fecharCamada(true));
      $$('[data-res]', c).forEach((x) => x.onclick = () => { estado.resolvidos[x.dataset.res] = { por: eu().nome, quando: new Date().toISOString() }; log('alerta', 'Alerta resolvido: ' + l.find((a) => a.id === x.dataset.res).titulo); salvar(); desenha(c); atualizarSino(); toast('Marcado como resolvido.'); });
      $$('[data-reab]', c).forEach((x) => x.onclick = () => { delete estado.resolvidos[x.dataset.reab]; salvar(); desenha(c); atualizarSino(); });
    };
    abrirCamada('gaveta', `<h2 style="font-size:24px">Notificações</h2><div class="abas-modo" style="margin-top:12px"><button type="button" data-f="abertos" aria-pressed="true">Abertas</button><button type="button" data-f="resolvidos" aria-pressed="false">Resolvidas</button></div><ul class="alertas" id="notif"></ul>`, (c) => {
      $$('[data-f]', c).forEach((b) => b.onclick = () => { filtro = b.dataset.f; $$('[data-f]', c).forEach((x) => x.setAttribute('aria-pressed', x === b)); desenha(c); });
      desenha(c);
    });
  }
  function atualizarSino() { const n = listaAlertas().filter((a) => !estado.resolvidos[a.id]).length; const b = $('#sino-n'); b.hidden = !n; b.textContent = n; }

  // =====================================================================================
  // V6: compradores e casamento com o pátio, monitor de mercado, aprovações, horímetro suspeito,
  // troca em grãos (barter) e exportação para o sistema da revenda
  // =====================================================================================
  // ---------- compradores ----------
  function compradoresPara(t) {
    return (A.compradores || []).filter((c) => c.tipo === t.tipo && (!c.marcas || c.marcas === t.marca) && t.ano >= (+c.anoMin || 0) && (!c.precoMax || (t.anuncio || t.pago * 1.15) <= c.precoMax * 1.08))
      .map((c) => ({ c, folga: c.precoMax ? c.precoMax - (t.anuncio || 0) : 0 })).sort((a, b) => b.folga - a.folga).map((x) => x.c);
  }
  function addComprador(pre = {}) {
    formulario('Adicionar comprador interessado', [{ k: 'nome', r: 'Nome', obr: true }, { k: 'fazenda', r: 'Fazenda / empresa' }, { k: 'cidade', r: 'Cidade', lista: 'dl-cidade' }, { k: 'telefone', r: 'Telefone' },
      { k: 'tipo', r: 'Procura', tipo: 'select', ops: Object.entries(NOMES) }, { k: 'marcas', r: 'Marca preferida (opcional)', lista: 'dl-marca' }, { k: 'anoMin', r: 'Ano mínimo', num: true }, { k: 'precoMax', r: 'Paga até (R$)', num: true, obr: true }, { k: 'obs', r: 'Observação', inteiro: true }],
    { tipo: 'trator', ...pre }, (v) => {
      const c = { id: 'C' + Date.now(), ...v, desde: hojeISO() }; estado.extras.compradores.push(c); A.compradores.push(c); salvar();
      const m = C.patio().filter((t) => compradoresPara(t).includes(c)); log('comprador', `Comprador ${c.nome} cadastrado procurando ${NOMES[c.tipo].toLowerCase()}`);
      fecharCamada(true); toast(m.length ? `${c.nome} combina com ${m.length} ${m.length === 1 ? 'máquina' : 'máquinas'} do pátio.` : 'Comprador cadastrado. Avisaremos quando entrar uma máquina que combine.'); rota();
    });
  }
  function telaCompradores() {
    const l = A.compradores || [];
    const patio = C.patio();
    tela.innerHTML = `
      <div class="titulo"><div><h1>Compradores</h1><p>Quem está procurando máquina. Quando entra um usado que combina, o Anshur avisa na hora.</p></div>${botaoAdicionar([{ nome: 'Comprador à mão', desc: 'Nome, o que procura e quanto paga', acao: () => addComprador() }, { nome: 'Importar lista', desc: 'Planilha de contatos', acao: () => { location.hash = '#documentos'; } }])}</div>
      <div class="kpis escalonado">
        <div class="kpi k-marfim"><span class="rot">${ICO.alvo}Compradores ativos</span><span class="val">${l.length}</span></div>
        <div class="kpi k-salvia"><span class="rot">${ICO.baixo}Máquinas com comprador</span><span class="val">${patio.filter((t) => compradoresPara(t).length).length} de ${patio.length}</span></div>
        <div class="kpi k-marfim"><span class="rot">${ICO.moedas}Dinheiro procurando máquina</span><span class="val">${mil(l.reduce((s, c) => s + (+c.precoMax || 0), 0))}</span></div>
        <div class="kpi k-risco"><span class="rot">${ICO.alerta}Pátio sem comprador</span><span class="val">${patio.filter((t) => !compradoresPara(t).length).length}</span><span class="exp">Máquinas que precisam de divulgação</span></div>
      </div>
      <section class="painel"><div class="painel-cab"><h2>${ICO.etiqueta}Casamentos do pátio</h2><p>Máquina parada e quem procura</p></div>
        ${patio.map((t) => { const cs = compradoresPara(t); return cs.length ? `<div class="casa">${fotoMini(t)}<div><b>${esc(t.marca + ' ' + t.modelo)} · ${t.ano}</b><span>${diasDesde(t.entrada)} dias no pátio · anunciado ${mil(t.anuncio)}</span></div><div class="casa-c">${cs.slice(0, 3).map((c) => `<span class="tag comprovado">${esc(c.nome)} · até ${mil(c.precoMax)}</span>`).join('')}${cs.length > 3 ? `<span class="sub">+${cs.length - 3}</span>` : ''}</div></div>` : ''; }).join('') || '<p class="vazio">Nenhum casamento ainda.</p>'}
      </section>
      <section class="painel bloco"><div class="tabela-wrap"><table class="tabela"><thead><tr><th>Comprador</th><th>Procura</th><th class="n">Ano mínimo</th><th class="n">Paga até</th><th>Desde</th><th>Combina com</th></tr></thead><tbody>
        ${l.map((c) => { const m = patio.filter((t) => compradoresPara(t).includes(c)); return `<tr><td><b>${esc(c.nome)}</b><br><span class="sub">${esc([c.fazenda, c.cidade, mascarar(c.telefone)].filter(Boolean).join(' · '))}</span></td><td>${NOMES[c.tipo]}${c.marcas ? ' ' + esc(c.marcas) : ''}<br><span class="sub">${esc(c.obs || '')}</span></td><td class="n">${c.anoMin || '—'}</td><td class="n">${mil(+c.precoMax || 0)}</td><td>${data(c.desde)}</td><td>${m.length ? m.map((t) => esc(t.modelo)).join(', ') : '<span class="sub">nada no pátio</span>'}</td></tr>`; }).join('') || '<tr><td colspan="6" class="vazio">Nenhum comprador cadastrado.</td></tr>'}</tbody></table></div></section>`;
    contar();
  }

  // ---------- monitor de mercado (anúncios e leilões observados) ----------
  function indiceMercado(tipo) {
    // preço observado / referência do modelo ajustada por idade, agrupado por mês
    const meses = {};
    (A.anuncios || []).filter((a) => a.tipo === tipo).forEach((a) => {
      const ref = M.refDe(a); if (!ref) return;
      const esperado = ref * Math.pow(0.9, Math.max(0, new Date(a.data).getFullYear() - a.ano - 1));
      const k = a.data.slice(0, 7); (meses[k] = meses[k] || []).push(a.preco / esperado);
    });
    return Object.keys(meses).sort().map((k) => ({ r: new Date(k + '-15T12:00:00').toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''), k, v: meses[k].reduce((s, x) => s + x, 0) / meses[k].length * 100, n: meses[k].length }));
  }
  function variacaoMercado(tipo) {
    const ix = indiceMercado(tipo); if (ix.length < 3) return null;
    const rec = ix.slice(-2), ant = ix.slice(-5, -2);
    const m = (l) => l.reduce((s, x) => s + x.v, 0) / l.length;
    return ant.length ? m(rec) / m(ant) - 1 : null;
  }
  function addAnuncio() {
    formulario('Registrar anúncio ou leilão', [{ k: 'fonte', r: 'Onde viu', tipo: 'select', ops: [['Agrofy', 'Agrofy'], ['Mercado Máquinas', 'Mercado Máquinas'], ['Leilão', 'Leilão'], ['Revenda concorrente', 'Revenda concorrente'], ['Outro', 'Outro']] }, { k: 'data', r: 'Data', tipo: 'data', obr: true },
      { k: 'tipo', r: 'Categoria', tipo: 'select', ops: Object.entries(NOMES) }, { k: 'marca', r: 'Fabricante', lista: 'dl-marca', obr: true }, { k: 'modelo', r: 'Modelo', lista: 'dl-modelo', obr: true }, { k: 'ano', r: 'Ano', num: true, obr: true }, { k: 'horas', r: 'Horas', num: true }, { k: 'preco', r: 'Preço (R$)', num: true, obr: true }, { k: 'cidade', r: 'Cidade', lista: 'dl-cidade' }],
    { data: hojeISO(), fonte: 'Agrofy', tipo: 'trator' }, (v) => { const a = { id: 'AN' + Date.now(), ...v }; estado.extras.anuncios.push(a); A.anuncios.push(a); salvar(); log('mercado', `Anúncio registrado: ${a.marca} ${a.modelo} ${a.ano} por ${real(a.preco)} (${a.fonte})`); fecharCamada(true); toast('Anúncio registrado no monitor.'); rota(); });
  }
  function telaMercado() {
    const tipos = Object.keys(NOMES);
    const cores = { trator: '#3E6B57', colhedora: '#C1A36A', pulverizador: '#71877B', plantadeira: '#202D35' };
    const anunciosRec = (A.anuncios || []).slice().sort((a, b) => b.data.localeCompare(a.data));
    tela.innerHTML = `
      <div class="titulo"><div><h1>Monitor de mercado</h1><p>Anúncios e leilões de fora da revenda: se o mercado de um tipo de máquina cai, o Anshur avisa antes de você pagar caro na troca.</p></div>${botaoAdicionar([{ nome: 'Anúncio ou leilão à mão', desc: 'Preço, ano, horas e onde viu', acao: addAnuncio }, { nome: 'Importar lista de anúncios', desc: 'Planilha exportada ou copiada do portal', acao: () => { location.hash = '#documentos'; } }])}</div>
      <div class="kpis escalonado">${tipos.map((k) => { const v = variacaoMercado(k); return `<div class="kpi ${v != null && v < -0.05 ? 'k-risco' : v != null && v > 0.03 ? 'k-salvia' : 'k-marfim'}"><span class="rot">${ICO[k]}${NOMES[k]}</span><span class="val">${v == null ? '—' : (v > 0 ? '▲ ' : '▼ ') + pct(Math.abs(v))}</span><span class="exp">${v == null ? 'Poucos anúncios ainda' : 'Últimos 2 meses contra os 3 anteriores'}</span></div>`; }).join('')}</div>
      <section class="painel"><div class="painel-cab"><h2>${ICO.linha}Índice de preço observado</h2><p>100 = preço esperado pela referência do modelo</p></div>
        ${tipos.map((k) => { const ix = indiceMercado(k); return ix.length > 1 ? `<div style="margin:10px 0 2px"><b style="color:${cores[k]}">${NOMES[k]}</b> <span class="sub">${ix.reduce((s, x) => s + x.n, 0)} anúncios</span></div>${G.linha(ix.slice(-7), { formato: (v) => Math.round(v) + '', altura: 130, largura: innerWidth >= 960 ? 1100 : 560 })}` : ''; }).join('') || '<p class="vazio">Registre anúncios para formar o índice.</p>'}</section>
      <section class="painel bloco"><div class="painel-cab"><h2>${ICO.etiqueta}Anúncios e leilões registrados</h2><p>${anunciosRec.length}</p></div>
        <div class="tabela-wrap"><table class="tabela"><thead><tr><th>Data</th><th>Máquina</th><th class="n">Horas</th><th class="n">Preço</th><th>Onde</th></tr></thead><tbody>
        ${anunciosRec.slice(0, 40).map((a) => `<tr><td>${data(a.data)}</td><td><b>${esc(a.marca + ' ' + a.modelo)}</b> · ${a.ano}<br><span class="sub">${esc(a.cidade || '')}</span></td><td class="n">${(+a.horas || 0).toLocaleString('pt-BR')}</td><td class="n forte">${real(a.preco)}</td><td>${esc(a.fonte)}</td></tr>`).join('')}</tbody></table></div>
        <p class="nota-rodape">${OP ? '' : 'Anúncios fictícios para a demonstração. '}Na revenda, a equipe registra o que vê nos portais e leilões, ou importa a lista; o Anshur não copia dados de sites de terceiros.</p></section>`;
    contar();
  }

  // ---------- horímetro suspeito ----------
  function checaHorimetro(maq) {
    const avisos = [];
    const hAno = (M.catalogo(maq) || {}).hAno || { trator: 750, colhedora: 2600, pulverizador: 820, plantadeira: 270 }[maq.tipo] || 800;
    const idade = Math.max(1, anoAtual - maq.ano), esperado = hAno * idade;
    if (maq.horas > 0 && maq.horas < esperado * 0.35) avisos.push(`Horas muito abaixo do normal: ${maq.horas.toLocaleString('pt-BR')} h para ${idade} anos de uso (o comum seria perto de ${Math.round(esperado / 100) * 100} h). Confira o painel e o histórico de revisões.`);
    if (maq.horas > esperado * 2) avisos.push(`Horas muito acima do normal para a idade: ${maq.horas.toLocaleString('pt-BR')} h. Revise o estado do motor e da transmissão.`);
    const mans = (maq.manutencoes || []).filter((m) => +m.horas > maq.horas);
    if (mans.length) avisos.push(`Há revisão registrada com ${(+mans[0].horas).toLocaleString('pt-BR')} h, mais do que o horímetro mostra hoje: possível troca ou adulteração do horímetro.`);
    return avisos;
  }

  // ---------- aprovações (trava sem furo) ----------
  function telaAprovacoes() {
    const l = estado.pendentes.slice().reverse();
    tela.innerHTML = `<div class="titulo"><div><h1>Aprovações</h1><p>Trocas que o vendedor quer fechar acima do valor máximo. Só entram no pátio depois que um gerente ou o dono aprovar.</p></div></div>
      ${NV && NV.semInternet() ? '<p class="conta">Sem internet: os pedidos aparecem, mas aprovar ou recusar só funciona com internet.</p>' : ''}
      <section class="painel">${l.length ? l.map((p) => `<div class="aprov ${p.status}"><div><b>${esc(p.maq.marca + ' ' + p.maq.modelo)} · ${p.maq.ano} · ${p.maq.horas.toLocaleString('pt-BR')} h</b>${p.semInternet ? ' <span class="tag declarado">Feito sem internet</span>' : ''}
        <span>Pedido por ${esc(p.por)} em ${new Date(p.quando).toLocaleString('pt-BR')} · quer pagar <b class="neg">${real(p.valor)}</b>, máximo recomendado ${real(p.rec.teto)} (<b class="neg">+${real(p.valor - p.rec.teto)}</b>)</span>
        <span>Motivo: ${esc(p.motivo || '—')}</span>${p.status !== 'pendente' ? `<span>${p.status === 'aprovada' ? 'Aprovada' : 'Recusada'} por ${esc(p.decisao.por)} em ${new Date(p.decisao.quando).toLocaleString('pt-BR')}</span>` : ''}</div>
        ${p.retrato ? `<button class="link" type="button" data-rt="${p.retrato}">Ver retrato da avaliação</button>` : ''}
        ${p.status === 'pendente' ? (podeLiberar(p.nivel || 'gerente') ? `<div class="acoes" style="margin:0"><button class="btn btn-ouro" type="button" data-apr="${p.id}">Aprovar</button><button class="btn btn-perigo" type="button" data-rec="${p.id}">Recusar</button></div>` : `<span class="tag declarado">${p.nivel === 'dono' ? 'Aguardando o dono' : 'Aguardando gerente'}</span>`) : `<span class="tag ${p.status === 'aprovada' ? 'comprovado' : 'declarado'}">${p.status === 'aprovada' ? 'Aprovada' : 'Recusada'}</span>`}</div>`).join('') : '<p class="vazio">Nenhuma troca esperando aprovação.</p>'}</section>`;
    $$('[data-apr]', tela).forEach((b) => b.onclick = () => decidir(b.dataset.apr, true));
    $$('[data-rt]', tela).forEach((b) => b.onclick = () => verRetrato(b.dataset.rt));
    $$('[data-rec]', tela).forEach((b) => b.onclick = () => decidir(b.dataset.rec, false));
  }
  async function decidir(id, aprova) {
    const p = estado.pendentes.find((x) => x.id === id); if (!p || !podeLiberar(p.nivel || 'gerente')) return;
    if (NV && NV.semInternet()) { toast('Aprovar ou recusar só com internet: a troca só conta depois que a decisão é salva no servidor.', true); return; }
    if (aprova && !(await confirmaPin())) return;
    p.status = aprova ? 'aprovada' : 'recusada'; p.decisao = { por: eu().nome, quando: new Date().toISOString() };
    if (aprova) {
      const t = K.fecharTroca(estado, p.maq, p.rec, p.valor, p.data, { ...p.extra, retrato: p.retrato, aprovacao: { por: eu().nome, motivo: p.motivo, excesso: p.valor - p.rec.teto, data: hojeISO() } });
      A.trocas.push({ ...t }); log('aprovacao', `Troca acima do teto aprovada: ${t.marca} ${t.modelo} por ${real(t.pago)} (pedido de ${p.por})`, { ref: t.id });
    } else log('aprovacao', `Troca acima do teto recusada: ${p.maq.marca} ${p.maq.modelo} (pedido de ${p.por})`);
    salvar(); cacheLimpa(); atualizarSino();
    if (NV) { const ok = await NV.descarregar(); if (!ok) { toast('A decisão ainda não chegou ao servidor: fica guardada neste aparelho e é enviada quando a conexão voltar.', true); rota(); return; } }
    toast(aprova ? 'Aprovada: a máquina entrou no pátio.' : 'Recusada. O vendedor vê a decisão.'); rota();
  }

  // ---------- troca em grãos (barter) ----------
  const GRAOS = { soja: { nome: 'Soja (saca 60 kg)', preco: 128 }, milho: { nome: 'Milho (saca 60 kg)', preco: 62 }, cana: { nome: 'Cana (tonelada)', preco: 155 } };
  function blocoBarter(valor, id) {
    const b = estado.barter || { grao: 'soja', preco: GRAOS.soja.preco };
    return `<section class="painel bloco" id="${id}"><h2>${ICO.moedas}Troca paga em grãos (barter)</h2>
      <div class="campos" style="margin-top:10px"><div class="campo"><label for="${id}-g">Produto</label><select id="${id}-g">${Object.entries(GRAOS).map(([k, g]) => `<option value="${k}" ${b.grao === k ? 'selected' : ''}>${g.nome}</option>`).join('')}</select></div>
      <div class="campo"><label for="${id}-p">Preço de hoje (R$ por unidade)</label><input id="${id}-p" inputmode="decimal" value="${String(b.preco).replace('.', ',')}"></div></div>
      <div class="numeros" id="${id}-r"></div><p class="nota-rodape">O preço do grão é informado pela revenda (bolsa, trading ou cooperativa do dia). Simulação de queda mostra quanto a troca passa a valer.</p></section>`;
  }
  function ligarBarter(raiz, valor, id) {
    const g = $('#' + id + '-g', raiz), p = $('#' + id + '-p', raiz), r = $('#' + id + '-r', raiz); if (!g) return;
    const calc = (gravar = true) => {
      const preco = num(p.value) || GRAOS[g.value].preco;
      // só grava quando a pessoa muda o grão ou o preço (abrir a tela não é alteração)
      if (gravar && JSON.stringify(estado.barter) !== JSON.stringify({ grao: g.value, preco })) { estado.barter = { grao: g.value, preco }; salvar(); }
      const un = g.value === 'cana' ? 'toneladas' : 'sacas', q = valor / preco;
      r.innerHTML = `<div><span>Valor máximo em ${un}</span><b>${Math.round(q).toLocaleString('pt-BR')}</b></div><div><span>Se o grão cair 10%, a troca vale</span><b class="neg">${real(q * preco * 0.9)}</b></div><div><span>Se o grão subir 10%, a troca vale</span><b class="pos">${real(q * preco * 1.1)}</b></div>`;
    };
    g.onchange = () => { p.value = String(GRAOS[g.value].preco).replace('.', ','); calc(); }; p.oninput = () => calc(); calc(false);
  }

  // ---------- exportar a troca para o sistema da revenda ----------
  function exportarParaDMS(t) {
    baixarCSV(`anshur-troca-${t.id}.csv`, [['Campo', 'Valor'], ['Código Anshur', t.id], ['Categoria', NOMES[t.tipo]], ['Fabricante', t.marca], ['Modelo', t.modelo], ['Ano', t.ano], ['Horas', t.horas], ['Chassi', t.chassi || ''], ['Valor pago na troca', t.pago], ['Valor máximo recomendado', t.previsto ? t.previsto.teto : ''], ['Preparo previsto', t.preparoEst || ''], ['Preço anunciado', t.anuncio], ['Vendedor', t.vendedor || ''], ['Aprovado por', t.aprovacao ? t.aprovacao.por : ''], ['Data de entrada', data(t.entrada)]]);
    log('exportacao', `Troca ${t.marca} ${t.modelo} exportada para o sistema da revenda`, { ref: t.id }); salvar();
  }

  // =====================================================================================
  // V7: alçadas por tipo de máquina, retrato imutável da avaliação e contraproposta guiada
  // =====================================================================================
  const ALCADA_PADRAO = { trator: { vendedor: 5000, gerente: 40000 }, colhedora: { vendedor: 0, gerente: 0 }, pulverizador: { vendedor: 3000, gerente: 30000 }, plantadeira: { vendedor: 3000, gerente: 20000 } };
  const alcadas = () => Object.assign({}, ALCADA_PADRAO, estado.alcadas || {});
  // nível de quem pode liberar um valor acima do teto: livre (o próprio vendedor), gerente ou dono
  function nivelExigido(tipo, excesso) {
    if (excesso <= 0) return 'livre';
    const a = alcadas()[tipo] || { vendedor: 0, gerente: 0 };
    return excesso <= a.vendedor ? 'livre' : excesso <= a.gerente ? 'gerente' : 'dono';
  }
  const podeLiberar = (nivel) => nivel === 'livre' || eu().perfil === 'dono' || (nivel === 'gerente' && eu().perfil === 'gerente');
  const NOME_NIVEL = { livre: 'dentro da alçada do vendedor', gerente: 'precisa do gerente', dono: 'só o dono libera' };

  // retrato da avaliação: congela tudo o que o sistema mostrou e gera um código que denuncia qualquer alteração
  async function sha256(txt) { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(txt)); return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join(''); }
  async function tirarRetrato(maq, r, extra = {}) {
    const corpo = { versao: 1, quando: new Date().toISOString(), usuario: eu().nome, perfil: eu().perfil, revenda: A.revenda.nome,
      maquina: { tipo: maq.tipo, marca: maq.marca, modelo: maq.modelo, ano: maq.ano, horas: maq.horas, inspecao: maq.cond },
      recomendacao: { valorMaximo: r.teto, faixa: r.faixa, vendaEstimada: r.venda, preparo: r.preparo, margem: r.margemSobreVenda, qualidade: r.confianca, erroHistorico: r.qualidade ? r.qualidade.mape : null, vendasUsadas: r.base },
      premissas: { margemAlvo: r.margem, jurosMes: K.cfg.jurosMes }, mercado: variacaoMercado(maq.tipo), compradores: compradoresPara({ ...maq, anuncio: Math.round(r.venda * 1.08) }).length,
      horimetro: checaHorimetro({ ...maq, manutencoes: [] }), alertasMostrados: r.limites, ...extra };
    const json = JSON.stringify(corpo), hash = await sha256(json);
    const id = 'R' + Date.now();
    estado.retratos = estado.retratos || {}; estado.retratos[id] = { json, hash };
    return { id, hash };
  }
  async function verRetrato(id) {
    const rt = (estado.retratos || {})[id]; if (!rt) { toast('Retrato não encontrado neste aparelho.', true); return; }
    const ok = (await sha256(rt.json)) === rt.hash, c = JSON.parse(rt.json);
    abrirCamada('modal retrato-modal', `<div class="retrato">
      <img class="logo-img" src="logo/anshur-logo.png?v=5" alt="Anshur" width="150" height="38">
      <h2 style="margin-top:12px">Retrato da avaliação</h2>
      <p class="sub">Gerado em ${new Date(c.quando).toLocaleString('pt-BR')} por ${esc(c.usuario)} (${K.PERFIS[c.perfil] || ''}) · ${esc(c.revenda)}</p>
      <p class="selo-verif ${ok ? 'ok' : 'falha'}">${ok ? ICO.baixo + 'Íntegro: nada foi alterado desde a avaliação' : ICO.alto + 'ALTERADO: o conteúdo não bate com o código original'}</p>
      <div class="numeros"><div><span>Máquina</span><b>${esc(c.maquina.marca + ' ' + c.maquina.modelo)} · ${c.maquina.ano}</b></div><div><span>Horas · inspeção</span><b>${(+c.maquina.horas).toLocaleString('pt-BR')} h · ${c.maquina.inspecao}/100</b></div><div><span>Valor máximo recomendado</span><b>${real(c.recomendacao.valorMaximo)}</b></div>
        <div><span>Venda estimada</span><b>${real(c.recomendacao.vendaEstimada)}</b></div><div><span>Qualidade da estimativa</span><b>${esc(c.recomendacao.qualidade)}</b></div><div><span>Margem-alvo do dia</span><b>${pct(c.premissas.margemAlvo, 0)}</b></div>
        ${c.valorPago != null ? `<div><span>Valor pago</span><b class="${c.valorPago > c.recomendacao.valorMaximo ? 'neg' : 'pos'}">${real(c.valorPago)}</b></div>` : ''}${c.decisao ? `<div><span>Decisão</span><b>${esc(c.decisao)}</b></div>` : ''}</div>
      ${(c.horimetro || []).length || c.mercado != null || (c.alertasMostrados || []).length ? `<h3 style="margin-top:14px">Alertas que o sistema mostrou</h3><ul>${[...(c.horimetro || []), ...(c.mercado != null && c.mercado < -0.05 ? [`Mercado caindo ${pct(-c.mercado)} em 2 meses`] : []), ...(c.alertasMostrados || [])].map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
      ${c.ia ? `<h3 style="margin-top:14px">IA nas fotos</h3><p>${esc(c.ia)}</p>` : ''}
      <p class="codigo">Código de verificação (SHA-256): <code>${rt.hash}</code></p></div>
      <div class="acoes"><button class="btn btn-ouro" type="button" onclick="print()">Imprimir ou salvar PDF</button></div>`);
  }

  // contraproposta: como cobrir a diferença sem pagar acima do teto
  function contraproposta(excesso, r) {
    const nova = (A.financiadas || []).find((f) => f.chassi === av.nova);
    const b = estado.barter || { grao: 'soja', preco: GRAOS.soja.preco }, un = b.grao === 'cana' ? 'toneladas de cana' : 'sacas de ' + b.grao;
    const parcela = Math.ceil(excesso / 3 / 100) * 100;
    return [
      { t: 'Desconto na máquina nova', d: `Em vez de pagar ${real(excesso)} a mais no usado, dê ${real(excesso)} de desconto${nova ? ` no ${nova.marca} ${nova.modelo}` : ' na máquina nova'}. O usado entra pelo teto (${real(r.teto)}) e a margem do usado fica protegida.` },
      { t: 'Diferença em grãos', d: `O cliente recebe o teto em dinheiro e a diferença em ${Math.round(excesso / b.preco).toLocaleString('pt-BR')} ${un} (preço do dia ${real(b.preco)}), entregues na colheita.` },
      { t: 'Diferença na venda do usado', d: `Pague ${real(r.teto)} agora e combine repassar até ${real(excesso)} quando o usado for vendido acima de ${real(r.venda)}. A revenda só divide o que realmente ganhar.` },
      { t: 'Prazo em vez de valor', d: `Mantenha o teto e ofereça o pagamento da máquina nova em 3 parcelas a mais, equivalente a cerca de ${real(parcela)} por parcela de folga para o cliente.` }
    ];
  }

  // ---------- MEU PERFIL ----------
  const iniciais = (n) => String(n || '?').split(' ').filter(Boolean).map((x) => x[0]).slice(0, 2).join('').toUpperCase();
  const avatarHTML = (u, tam = 46) => u.foto ? `<img class="foto-perfil" src="${u.foto}" alt="" width="${tam}" height="${tam}">` : `<span class="foto-perfil vazia" style="width:${tam}px;height:${tam}px;font-size:${Math.round(tam / 2.6)}px">${esc(iniciais(u.nome))}</span>`;
  function atualizarAvatar() { const b = $('#perfil'); const u = eu(); b.innerHTML = u.foto ? `<img src="${u.foto}" alt="">` : esc(iniciais(u.nome)); b.classList.toggle('com-foto', !!u.foto); b.setAttribute('aria-label', 'Perfil de ' + u.nome); }
  function telaPerfil() {
    const u = eu();
    const minhas = estado.atividades.filter((a) => a.usuario === u.nome);
    const aval = minhas.filter((a) => a.tipo === 'avaliacao').length, trocas = minhas.filter((a) => a.tipo === 'troca').length;
    const pend = (estado.pendentes || []).filter((p) => p.status === 'pendente' && (p.por === u.nome || podeLiberar(p.nivel || 'gerente'))).length;
    const pref = u.notif || { Estoque: true, Financeiro: true, Comercial: true, Oficina: true, Garantia: true, Mercado: true };
    tela.innerHTML = `
      <div class="titulo"><div><h1>Meu perfil</h1><p>Seus dados, sua foto e como o Anshur fala com você.</p></div></div>
      <div class="grade-2">
        <section class="painel perfil-cartao">
          <div class="perfil-topo">
            <label class="perfil-foto" title="Trocar foto">${avatarHTML(u, 120)}<input type="file" accept="image/*" capture="user" id="pf-foto" class="sr"><span class="perfil-foto-acao">${ic('<path d="M4 8h3l2-3h6l2 3h3v11H4zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"/>')}</span></label>
            <div><h2 style="font-size:28px">${esc(u.nome)}</h2><p class="sub" style="font-size:17px">${K.PERFIS[u.perfil]} · ${esc(A.revenda.nome)}</p>
              ${u.foto ? '<button class="link" type="button" id="pf-tira">Remover foto</button>' : '<p class="ajuda">Toque na foto para colocar a sua.</p>'}</div>
          </div>
          <div class="numeros" style="margin-top:20px"><div><span>Avaliações feitas</span><b>${aval}</b></div><div><span>Trocas fechadas</span><b>${trocas}</b></div><div><span>Pendências para você</span><b class="${pend ? 'neg' : ''}">${pend}</b></div></div>
        </section>
        <section class="painel"><h2>${ICO.etiqueta}Informações pessoais</h2>${sugestoes()}
          <div class="campos" style="margin-top:12px">
            <div class="campo"><label for="pf-nome">Nome completo</label><input id="pf-nome" value="${esc(u.nome)}" autocomplete="name"></div>
            <div class="campo"><label for="pf-apelido">Como prefere ser chamado</label><input id="pf-apelido" value="${esc(u.apelido || '')}" placeholder="Ex.: Seu Antônio"></div>
            <div class="campo"><label for="pf-cargo">Cargo</label><input id="pf-cargo" list="dl-cargos" value="${esc(u.cargo || K.PERFIS[u.perfil])}">${lista('dl-cargos', ['Proprietário', 'Diretor comercial', 'Gerente de usados', 'Gerente de loja', 'Vendedor', 'Avaliador', 'Chefe de oficina', 'Financeiro'])}</div>
            <div class="campo"><label for="pf-loja">Loja / unidade</label><input id="pf-loja" list="dl-cidade" value="${esc(u.loja || A.revenda.cidade)}"></div>
            <div class="campo"><label for="pf-email">E-mail</label><input id="pf-email" type="email" value="${esc(u.email || '')}" autocomplete="email" ${K.nuvem ? 'readonly title="E-mail da conta de acesso"' : ''}></div>
            <div class="campo"><label for="pf-tel">Celular / WhatsApp</label><input id="pf-tel" inputmode="tel" value="${esc(u.telefone || '')}" placeholder="(16) 99999-0000" autocomplete="tel"></div>
            <div class="campo"><label for="pf-desde">Na revenda desde</label><input id="pf-desde" type="date" value="${esc(u.desde || '')}"></div>
            ${u.perfil === 'vendedor' ? `<div class="campo"><label for="pf-meta">Meta de trocas por mês</label><input id="pf-meta" inputmode="numeric" value="${esc(u.meta || '')}"></div>` : `<div class="campo"><label for="pf-ass">Assinatura nos relatórios</label><input id="pf-ass" value="${esc(u.assinatura || '')}" placeholder="Ex.: Antônio Silva, diretor"></div>`}
            <div class="campo inteiro"><label for="pf-bio">Observações</label><textarea id="pf-bio" rows="2" placeholder="Especialidade, marcas que conhece, região que atende">${esc(u.bio || '')}</textarea></div>
          </div>
          <div class="acoes"><button class="btn btn-ouro" type="button" id="pf-salvar">Salvar perfil</button></div></section>
      </div>
      <div class="grade-2 bloco">
        <section class="painel"><h2>${ICO.alerta}Notificações que você quer receber</h2>
          <div class="checks" style="margin-top:12px">${Object.keys(pref).map((k) => `<label class="check"><input type="checkbox" data-pref="${k}" ${pref[k] ? 'checked' : ''}> ${k}</label>`).join('')}</div>
          <input type="checkbox" id="pf-resumo" hidden ${u.resumo ? 'checked' : ''}>
          <p class="nota-rodape">Estas escolhas valem para o sino. O aviso por e-mail (dias úteis às 7h, só quando há algo para fazer) é ligado pelo dono em Configurações › Avisos.</p>
          <div class="acoes"><button class="btn btn-linha" type="button" id="pf-notif">Salvar preferências</button></div></section>
        <section class="painel"><h2>${ICO.alvo}Segurança</h2>
          ${['dono', 'gerente'].includes(u.perfil) ? `<p class="sub" style="margin:6px 0 12px">Com um PIN, ninguém aprova troca acima do teto usando o seu nome sem saber o código.</p>
          <div class="campos"><div class="campo"><label for="pf-pin">${u.pin ? 'Novo PIN de aprovação' : 'Criar PIN de aprovação'} (4 a 6 números)</label><input id="pf-pin" type="password" inputmode="numeric" maxlength="6" autocomplete="new-password"></div></div>
          <div class="acoes"><button class="btn btn-linha" type="button" id="pf-pin-ok">${u.pin ? 'Trocar PIN' : 'Criar PIN'}</button>${u.pin ? '<span class="tag comprovado">PIN ativo</span>' : ''}</div>` : '<p class="sub" style="margin-top:6px">Seu perfil não aprova trocas acima do teto.</p>'}
          <ul class="lista-motivos" style="margin-top:14px"><li><span>Último acesso</span><b>${new Date(u.ultimoAcesso || Date.now()).toLocaleString('pt-BR')}</b></li><li><span>Atividades registradas</span><b>${minhas.length}</b></li></ul>
          <div class="acoes"><a class="btn btn-linha" href="#atividades">Ver minhas atividades</a>${K.nuvem ? '<button class="btn btn-linha" type="button" id="pf-sair">Sair da conta</button>' : estado.usuarios.length > 1 && pode('usuarios') ? '<a class="btn btn-linha" href="#usuarios">Trocar de usuário</a>' : ''}</div></section>
      </div>`;
    $('#pf-foto').onchange = (e) => {
      const f = e.target.files[0]; if (!f) return;
      const img = new Image(), url = URL.createObjectURL(f);
      img.onload = () => { const lado = Math.min(img.width, img.height), cv = document.createElement('canvas'); cv.width = cv.height = 256; cv.getContext('2d').drawImage(img, (img.width - lado) / 2, (img.height - lado) / 2, lado, lado, 0, 0, 256, 256); u.foto = cv.toDataURL('image/jpeg', 0.82); URL.revokeObjectURL(url); salvar(); log('perfil', 'Foto do perfil atualizada'); atualizarAvatar(); toast('Foto atualizada.'); telaPerfil(); };
      img.onerror = () => toast('Não foi possível ler essa imagem.', true); img.src = url;
    };
    const sairBt = $('#pf-sair'); if (sairBt) sairBt.onclick = () => K.nuvem.sair();
    const tira = $('#pf-tira'); if (tira) tira.onclick = () => { delete u.foto; salvar(); atualizarAvatar(); telaPerfil(); };
    $('#pf-salvar').onclick = () => {
      const nome = $('#pf-nome').value.trim(), email = $('#pf-email').value.trim();
      if (!nome) { toast('O nome não pode ficar vazio.', true); $('#pf-nome').focus(); return; }
      if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { toast('Confira o e-mail.', true); $('#pf-email').focus(); return; }
      const antes = u.nome;
      Object.assign(u, { nome, email, apelido: $('#pf-apelido').value.trim(), cargo: $('#pf-cargo').value.trim(), loja: $('#pf-loja').value.trim(), telefone: $('#pf-tel').value.trim(), desde: $('#pf-desde').value, bio: $('#pf-bio').value.trim() });
      if ($('#pf-meta')) u.meta = $('#pf-meta').value.trim(); if ($('#pf-ass')) u.assinatura = $('#pf-ass').value.trim();
      // mantém o histórico ligado ao novo nome
      if (antes !== nome) estado.atividades.forEach((a) => { if (a.usuario === antes) a.usuario = nome; });
      if (K.nuvem && antes !== nome) K.nuvem.alterarMembro(u.id, u.perfil, null, nome).catch(() => {});
      log('perfil', 'Perfil atualizado'); salvar(); atualizarAvatar(); toast('Perfil salvo.'); telaPerfil();
    };
    $('#pf-notif').onclick = () => { u.notif = {}; $$('[data-pref]', tela).forEach((c) => { u.notif[c.dataset.pref] = c.checked; }); u.resumo = $('#pf-resumo').checked; salvar(); atualizarSino(); toast('Preferências salvas.'); };
    const pin = $('#pf-pin-ok'); if (pin) pin.onclick = async () => { const v = $('#pf-pin').value; if (!/^\d{4,6}$/.test(v)) { toast('O PIN precisa ter de 4 a 6 números.', true); return; } u.pin = await sha256(u.id + ':' + v); log('perfil', 'PIN de aprovação ' + (u.pin ? 'definido' : 'alterado')); salvar(); toast('PIN salvo. Ele será pedido em cada aprovação.'); telaPerfil(); };
  }
  // aprovação com PIN, quando a pessoa definiu um
  async function confirmaPin() {
    const u = eu(); if (!u.pin) return true;
    return new Promise((ok) => {
      abrirCamada('modal', `<h2>Confirme com o seu PIN</h2><p class="sub">Aprovação acima do teto em nome de ${esc(u.nome)}.</p><div class="campo" style="margin-top:12px"><label for="pin-in">PIN</label><input id="pin-in" type="password" inputmode="numeric" maxlength="6" autocomplete="off"></div><div class="acoes"><button class="btn btn-ouro" type="button" id="pin-ok">Confirmar</button><button class="btn btn-linha" type="button" id="pin-nao">Cancelar</button></div>`, (c) => {
        $('#pin-nao', c).onclick = () => { fecharCamada(); ok(false); };
        $('#pin-ok', c).onclick = async () => { if ((await sha256(u.id + ':' + $('#pin-in', c).value)) === u.pin) { fecharCamada(true); ok(true); } else { toast('PIN incorreto.', true); log('seguranca', 'PIN de aprovação incorreto'); salvar(); } };
      });
    });
  }

  // =====================================================================================
  // V8: várias lojas, auditor, privacidade (LGPD), manter ou vender, anúncio para portais
  // =====================================================================================
  function seletorLoja() {
    const s = $('#loja-sel'); if (!s) return;
    if (!estado.lojas.length) { s.hidden = true; return; }
    const permitidas = K.lojasPermitidas && K.lojasPermitidas.length ? K.lojasPermitidas : null;
    s.innerHTML = (permitidas ? '' : `<option value="">Todas as lojas</option>`) + (permitidas || estado.lojas).map((l) => `<option ${estado.lojaAtual === l ? 'selected' : ''}>${esc(l)}</option>`).join('');
    s.onchange = () => { estado.lojaAtual = s.value; K.lembrarLoja(s.value); salvar(); log('loja', s.value ? `Vendo a loja ${s.value}` : 'Vendo todas as lojas'); salvar(); K.recarregar(); };
  }
  const somenteLeitura = () => eu().perfil === 'auditor';
  // privacidade: contatos mascarados para quem não precisa ver
  const mascarar = (txt) => (estado.lgpd && estado.lgpd.mascarar && ['vendedor', 'oficina', 'auditor'].includes(eu().perfil) && txt ? String(txt).replace(/\d(?=\d{2})/g, '•') : txt);
  function blocoLGPD() {
    const g = estado.lgpd || { mascarar: true, retencao: 60 };
    return `<section class="painel bloco"><h2>${ICO.alvo}Privacidade e LGPD</h2>
      <div class="campos" style="margin-top:12px"><label class="check"><input type="checkbox" id="lg-masc" ${g.mascarar ? 'checked' : ''}> Esconder telefone e documentos de clientes para vendedor, oficina e auditor</label>
      <div class="campo"><label for="lg-ret">Guardar dados de clientes por (meses)</label><input id="lg-ret" inputmode="numeric" value="${g.retencao}"></div></div>
      <div class="campos" style="margin-top:12px"><div class="campo"><label for="lg-tit">Pedido de um titular (nome do cliente ou comprador)</label><input id="lg-tit" list="dl-titulares">${lista('dl-titulares', (A.compradores || []).map((c) => c.nome).concat(A.trocas.map((t) => t.origem)))}</div></div>
      <div class="acoes"><button class="btn btn-linha" type="button" id="lg-salvar">Salvar regras</button><button class="btn btn-linha" type="button" id="lg-exp">Exportar dados do titular</button><button class="btn btn-perigo" type="button" id="lg-anon">Anonimizar titular</button></div>
      <p class="nota-rodape">Atende os pedidos de acesso e de eliminação previstos na LGPD. A anonimização troca nome e contato por "Titular anonimizado" e fica registrada nas atividades.</p></section>`;
  }
  function ligarLGPD() {
    const b = $('#lg-salvar'); if (!b) return;
    b.onclick = () => { estado.lgpd = { mascarar: $('#lg-masc').checked, retencao: Math.max(1, num($('#lg-ret').value) || 60) }; log('lgpd', 'Regras de privacidade alteradas'); salvar(); toast('Regras de privacidade salvas.'); };
    const achar = () => { const n = $('#lg-tit').value.trim().toLowerCase(); if (!n) { toast('Informe o nome do titular.', true); return null; } return { n, comp: (A.compradores || []).filter((c) => c.nome.toLowerCase().includes(n)), trocas: A.todasTrocas.filter((t) => String(t.origem).toLowerCase().includes(n)) }; };
    $('#lg-exp').onclick = () => { const r = achar(); if (!r) return; const url = URL.createObjectURL(new Blob([JSON.stringify({ titular: r.n, compradores: r.comp, maquinas: r.trocas.map((t) => ({ id: t.id, origem: t.origem, entrada: t.entrada, modelo: t.modelo })) }, null, 1)], { type: 'application/json' })); const a = document.createElement('a'); a.href = url; a.download = 'dados-do-titular.json'; a.click(); log('lgpd', `Dados exportados a pedido do titular "${r.n}"`); salvar(); toast(`${r.comp.length + r.trocas.length} registros exportados.`); };
    $('#lg-anon').onclick = () => { const r = achar(); if (!r) return; confirmar('Anonimizar este titular?', `${r.comp.length + r.trocas.length} registros terão nome e contato apagados. Não dá para desfazer.`, 'Anonimizar', () => {
      r.comp.forEach((c) => { Object.assign(c, { nome: 'Titular anonimizado', telefone: '', fazenda: '', obs: '' }); const x = estado.extras.compradores.find((y) => y.id === c.id); if (x) Object.assign(x, c); });
      r.trocas.forEach((t) => { t.origem = 'Titular anonimizado'; [...estado.fechadas, ...(estado.historico || [])].filter((y) => y.id === t.id).forEach((y) => { y.origem = t.origem; }); });
      log('lgpd', `Titular anonimizado (${r.comp.length + r.trocas.length} registros)`); salvar(); toast('Titular anonimizado.'); rota(); }); };
  }
  function blocoLojas() {
    return `<section class="painel bloco"><h2>${ICO.camadas}Lojas e unidades</h2><p class="sub" style="margin:6px 0 10px">Cada máquina pertence a uma loja. O dono vê tudo junto ou uma loja por vez; o motor de avaliação aprende com todas.</p>
      <div class="cartoes-lojas">${estado.lojas.map((l) => { const ts = A.todasTrocas.filter((t) => t.loja === l); const p = ts.filter((t) => !t.vendido); return `<div class="loja-c"><b>${esc(l)}</b><span>${p.length} no pátio · ${mil(p.reduce((s, t) => s + t.pago, 0))} parados</span><span>${ts.filter((t) => t.vendido).length} vendidas</span></div>`; }).join('') || '<p class="vazio">Nenhuma loja cadastrada.</p>'}</div>
      <div class="acoes"><button class="btn btn-linha" type="button" id="lj-add">Adicionar loja</button></div></section>`;
  }
  function ligarLojas() { const b = $('#lj-add'); if (b) b.onclick = () => formulario('Adicionar loja', [{ k: 'nome', r: 'Nome da loja (cidade ou unidade)', lista: 'dl-cidade', obr: true }], {}, (v) => { if (estado.lojas.includes(v.nome)) { toast('Essa loja já existe.', true); return; } estado.lojas.push(v.nome); log('loja', `Loja ${v.nome} adicionada`); salvar(); fecharCamada(true); toast('Loja adicionada.'); K.recarregar(); }); }

  // manter ou vender agora (custo de ficar mais 6 ou 12 meses)
  function manterOuVender(i) {
    const t = i.t, h = historicoModelo(t.modelo);
    const cenario = (meses) => { const juros = C.custoFinanceiro(t, meses * 30), deprec = i.venda * (1 - Math.pow(0.9, meses / 12)), oficina = (h.reserva || t.preparo * 0.15) * meses / 12; return { meses, juros, deprec, oficina, total: juros + deprec + oficina }; };
    const c6 = cenario(6), c12 = cenario(12);
    return `<section class="painel" style="margin-top:6px"><h2>Manter ou vender agora?</h2><p class="sub" style="margin:4px 0 10px">Quanto custa segurar esta máquina, além do que já foi gasto.</p>
      <div class="tabela-wrap"><table class="tabela"><thead><tr><th></th><th class="n">Mais 6 meses</th><th class="n">Mais 12 meses</th></tr></thead><tbody>
      <tr><td>Custo do dinheiro</td><td class="n">${real(c6.juros)}</td><td class="n">${real(c12.juros)}</td></tr><tr><td>Perda de valor (≈10% ao ano)</td><td class="n">${real(c6.deprec)}</td><td class="n">${real(c12.deprec)}</td></tr>
      <tr><td>Oficina provável do modelo</td><td class="n">${real(c6.oficina)}</td><td class="n">${real(c12.oficina)}</td></tr><tr><td><b>Total de segurar</b></td><td class="n neg forte">${real(c6.total)}</td><td class="n neg forte">${real(c12.total)}</td></tr></tbody></table></div>
      <p class="conta">Vender hoje com desconto de até <b>${real(c6.total)}</b> ainda sai mais barato do que segurar 6 meses.</p></section>`;
  }
  // anúncio pronto para os portais
  function gerarAnuncio(t) {
    const i = infoPatio(t), f = [0, 1, 2].map((k) => F.de(t, k)), link = new URL('passaporte.html?id=' + t.id, location.href).href;
    const titulo = `${NOMES[t.tipo]} ${t.marca} ${t.modelo} ${t.ano} · ${t.horas.toLocaleString('pt-BR')} h`;
    const texto = `${titulo}\n\n${t.marca} ${t.modelo}, ano ${t.ano}, ${t.horas.toLocaleString('pt-BR')} horas. Inspeção da revenda: ${t.cond}/100.\n${(t.manutencoes || []).filter((m) => m.comNota).length} manutenções com nota fiscal.\nPreço: ${real(t.anuncio)}.\n\nFicha completa, fotos e histórico: ${link}\n${A.revenda.nome} · ${t.loja || A.revenda.cidade}`;
    abrirCamada('modal', `<h2>Anúncio pronto</h2><p class="sub">Copie e cole no Agrofy, Mercado Máquinas, Facebook ou WhatsApp. O link leva ao passaporte com QR Code.</p>
      <div class="campo" style="margin-top:12px"><label for="an-tit">Título</label><input id="an-tit" value="${esc(titulo)}"></div>
      <div class="campo" style="margin-top:10px"><label for="an-txt">Descrição</label><textarea id="an-txt" rows="9">${esc(texto)}</textarea></div>
      <div class="galeria-mini">${f.map((x) => `<img src="${x.propria ? x.u : F.mini(x.u)}" alt="">`).join('')}</div>
      <div class="acoes"><button class="btn btn-ouro" type="button" id="an-cp">Copiar anúncio</button><button class="btn btn-linha" type="button" id="an-csv">Baixar planilha para importar no portal</button></div>
      <p class="nota-rodape">Publicação automática nos portais depende de cada portal liberar integração.</p>`, (c) => {
      $('#an-cp', c).onclick = async () => { try { await navigator.clipboard.writeText($('#an-tit', c).value + '\n\n' + $('#an-txt', c).value); toast('Anúncio copiado.'); log('anuncio', `Anúncio gerado: ${titulo}`, { ref: t.id }); salvar(); } catch (e) { toast('Selecione o texto e copie.', true); } };
      $('#an-csv', c).onclick = () => baixarCSV(`anuncio-${t.id}.csv`, [['titulo', 'categoria', 'marca', 'modelo', 'ano', 'horas', 'preco', 'cidade', 'descricao', 'link'], [titulo, NOMES[t.tipo], t.marca, t.modelo, t.ano, t.horas, t.anuncio, t.loja || A.revenda.cidade, $('#an-txt', c).value, link]]);
    });
  }

  // =====================================================================================
  // V9: hábito e valor acumulado (ético): Central "Hoje", rotina por perfil, memória comercial,
  // histórico vivo, IA própria da revenda e avisos por e-mail. Nada prende dados: exportação continua livre.
  // =====================================================================================
  const PERFIL_NOME = (p) => K.PERFIS[p] || p;
  const primeiroNome = (u) => { if (u.apelido) return u.apelido; const l = String(u.nome || '').split(' ').filter(Boolean); return l.slice(0, /^(seu|dona|dr|dra|sr|sra)\.?$/i.test(l[0] || '') ? 2 : 1).join(' '); };
  const mesCurto = (m) => { const [a, b] = m.split('-'); return new Date(+a, +b - 1, 15).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '') + '/' + a.slice(2); };
  function ctxDia(perfil = eu().perfil) {
    const loja = estado.lojaAtual || '';
    const rascunho = rascunhoDe && av.horas && ['vendedor', 'gerente', 'dono'].includes(perfil) ? `${av.marca} ${av.modelo} ${av.ano} · passo ${av.passo} de 4 · guardada ${new Date(rascunhoDe).toLocaleString('pt-BR')}` : null;
    return { hoje: hojeISO(), perfil, nome: eu().nome, trocas: A.trocas, avaliacoes: estado.avaliacoes.filter((a) => !loja || !a.loja || a.loja === loja), pendentes: estado.pendentes,
      garantias: A.garantias, financiadas: A.financiadas, compradores: A.compradores, revenda: A.revenda.nome, podeLiberar, janela: 7, rascunho, margemDe: (t) => infoPatio(t).margem, feitos: estado.rituais || {} };
  }
  const CAT_NOME = { aprovar: 'Aprovação', pedido: 'Seu pedido', avaliacao: 'Avaliação', rascunho: 'Avaliação', comprador: 'Comprador', faixa: 'Pátio', margem: 'Margem', preparo: 'Oficina', garantia: 'Garantia', floor: 'Floor plan', comissao: 'Financeiro', conferir: 'Auditoria' };
  function botaoAcao(a, cls = 'btn-ouro') {
    const b = a.botao || {};
    if (b.href) return `<a class="btn ${cls}" href="${esc(b.href)}" target="_blank" rel="noopener" data-whats="${esc(a.id)}">${esc(b.rotulo)}</a>`;
    if (b.ir) return `<a class="btn ${cls}" href="${b.ir}">${esc(b.rotulo)}</a>`;
    return `<button class="btn ${cls}" type="button" data-acao="${esc(b.acao)}" data-ref="${esc(a.ref || '')}">${esc(b.rotulo)}</button>`;
  }
  function ligarAcoes(raiz) {
    $$('[data-acao="maquina"]', raiz).forEach((b) => b.onclick = () => detalheMaquina(b.dataset.ref));
    $$('[data-acao="avaliacao"]', raiz).forEach((b) => b.onclick = () => retornoAvaliacao(b.dataset.ref));
    $$('[data-whats]', raiz).forEach((b) => b.addEventListener('click', () => { log('contato', 'WhatsApp aberto para comprador compatível'); salvar(); }));
  }
  // retorno ao cliente de uma avaliação parada: virou troca, desistiu ou ainda negociando (lembra em 3 dias)
  function retornoAvaliacao(id) {
    const a = estado.avaliacoes.find((x) => x.id === id); if (!a) return;
    if (somenteLeitura()) { toast('Seu perfil é só de leitura.', true); return; }
    abrirCamada('modal', `<h2>Retorno da avaliação</h2><p class="sub">${esc(a.maq.marca + ' ' + a.maq.modelo + ' ' + a.maq.ano)} · máximo ${real(a.teto)} · ${data(a.data)}</p>
      <div class="acoes" style="flex-direction:column;align-items:stretch"><button class="btn btn-ouro" type="button" data-st="troca">Virou troca</button><button class="btn btn-linha" type="button" data-st="negociando">Ainda negociando (lembrar em 3 dias)</button><button class="btn btn-linha" type="button" data-st="desistiu">Cliente desistiu</button></div>`, (c) => {
      $$('[data-st]', c).forEach((b) => b.onclick = () => {
        const st = b.dataset.st, d = new Date(hojeISO() + 'T12:00:00'); d.setDate(d.getDate() + 3);
        if (st === 'negociando') a.lembrar = d.toISOString().slice(0, 10); else { a.status = st; delete a.lembrar; }
        a.retorno = { por: eu().nome, quando: new Date().toISOString(), status: st };
        log('avaliacao', `Retorno da avaliação ${a.maq.marca} ${a.maq.modelo}: ${{ troca: 'virou troca', desistiu: 'cliente desistiu', negociando: 'ainda negociando' }[st]}`); salvar(); fecharCamada(true); toast('Retorno registrado.'); rota();
      });
    });
  }

  // ---------- CENTRAL DO DIA ("Hoje") ----------
  function telaHoje() {
    if (!A.todasTrocas.length && !estado.avaliacoes.length) return semDados();
    const t0 = performance.now(), u = eu(), ctx = ctxDia(), { prioridades, acoes } = RT.acoesDoDia(ctx);
    const minhas = RT.rituais(ctx).filter((r) => r.perfil === u.perfil && (r.periodo === 'dia' || new Date().getDay() === 1 || r.qtd));
    const v = M.validar(), vend = A.todasTrocas.filter((t) => t.vendido && t.saida).length;
    const h = new Date().getHours(), saud = h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
    const grupos = {}; acoes.slice(3).forEach((a) => { (grupos[a.cat] = grupos[a.cat] || []).push(a); });
    tela.innerHTML = `
      <div class="titulo"><div><h1>Hoje</h1><p>${saud}, ${esc(primeiroNome(u))} · ${esc(PERFIL_NOME(u.perfil))} · ${estado.lojaAtual ? 'loja ' + esc(estado.lojaAtual) : estado.lojas.length ? 'todas as lojas' : esc(A.revenda.nome)} · ${new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}</p></div>
        <div class="acoes">${pode('avaliar') && !somenteLeitura() ? '<a class="btn btn-ouro" href="#avaliar">Nova avaliação</a>' : ''}${pode('visao') ? '<a class="btn btn-linha" href="#visao">Visão geral</a>' : ''}</div></div>
      <section class="prioridades" aria-label="As 3 prioridades de hoje">
        ${prioridades.length ? prioridades.map((a, i) => `<article class="prio n${a.nivel}"><span class="prio-n" aria-hidden="true">${i + 1}</span><div><span class="cat">${esc(CAT_NOME[a.cat] || a.cat)}</span><h2>${esc(a.titulo)}</h2><p>${esc(a.txt)}</p>
          <div class="acoes">${botaoAcao(a)}${a.extra ? `<a class="btn btn-linha" href="${a.extra.ir}">${esc(a.extra.rotulo)}</a>` : ''}${(a.whats || []).slice(1).map((w) => `<a class="btn btn-linha" href="${esc(w.href)}" target="_blank" rel="noopener" data-whats="${esc(a.id)}">WhatsApp de ${esc(String(w.nome).split(' ')[0])}</a>`).join('')}</div></div></article>`).join('')
          : `<article class="prio n3"><span class="prio-n" aria-hidden="true">${ICO.baixo}</span><div><span class="cat">Em dia</span><h2>Nada urgente para você hoje</h2><p>Nenhuma aprovação, avaliação parada ou máquina mudando de faixa no seu perfil. Bom momento para cadastrar compradores ou revisar o pátio.</p><div class="acoes"><a class="btn btn-linha" href="#${pode('patio') ? 'patio' : 'perfil'}">Abrir o pátio</a></div></div></article>`}
      </section>
      ${acoes.length > 3 ? `<section class="painel bloco"><div class="painel-cab"><h2>${ICO.alvo}Também para hoje</h2><p>${acoes.length - 3} ${acoes.length - 3 === 1 ? 'ação' : 'ações'}, cada uma com o botão que resolve</p></div>
        ${Object.entries(grupos).map(([cat, l]) => `<h3 class="grupo-acao">${esc(CAT_NOME[cat] || cat)} <span class="sub">${l.length}</span></h3><ul class="acoes-dia">${l.map((a) => `<li class="n${a.nivel}"><div><b>${esc(a.titulo)}</b><span>${esc(a.txt)}</span></div>${botaoAcao(a, 'btn-linha')}</li>`).join('')}</ul>`).join('')}</section>` : ''}
      <div class="grade-2 bloco">
        <section class="painel"><div class="painel-cab"><h2>${ICO.baixo}Sua rotina</h2><p>${esc(PERFIL_NOME(u.perfil))}</p></div>
          <ul class="rotina">${minhas.map((r) => itemRitual(r)).join('') || '<li class="vazio">Sem rotina para o seu perfil.</li>'}</ul>
          <div class="acoes"><a class="btn btn-linha" href="#rotina">Rotina da equipe</a></div></section>
        ${pode('memoria') ? `<section class="painel"><div class="painel-cab"><h2>${ICO.linha}O que a revenda já aprendeu</h2></div>
          <div class="numeros"><div><span>Trocas vendidas na memória</span><b>${vend}</b></div><div><span>Erro médio no teste às cegas</span><b>${v.n >= M.QUALIDADE.minimoValidacao ? pct(v.mape) : 'medindo'}</b></div><div><span>Avaliações feitas</span><b>${estado.avaliacoes.length}</b></div></div>
          <p class="conta">Cada troca vendida entra na referência interna da revenda e o erro é medido de novo. É a memória da revenda, não valor de mercado.</p>
          <div class="acoes"><a class="btn btn-linha" href="#memoria">Ver a memória comercial</a></div></section>` : ''}
      </div>
      <p class="nota-rodape" id="hoje-tempo">Montado em ${Math.max(1, Math.round(performance.now() - t0))} ms a partir dos dados da revenda. Cada item vem de um registro real; nada aqui é alerta inventado.</p>`;
    ligarAcoes(tela); ligarRituais(tela);
  }

  // ---------- ROTINA POR PERFIL ----------
  function itemRitual(r) {
    const meu = r.perfil === eu().perfil && !somenteLeitura();
    const st = r.feito ? `<span class="tag comprovado">Feito por ${esc(r.feito.por)} · ${new Date(r.feito.quando).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>` : r.emDia ? '<span class="tag comprovado">Em dia: nada pendente</span>' : '';
    return `<li class="${r.feito || r.emDia ? 'ok' : ''}">${meu && !r.emDia ? `<label class="check"><input type="checkbox" data-ritual="${esc(r.chave)}" ${r.feito ? 'checked' : ''} ${r.feito && r.feito.por !== eu().nome ? 'disabled' : ''}> <span>` : '<span>'}<b>${esc(r.titulo)}</b>${r.qtd ? ` <span class="pilula">${r.qtd}</span>` : ''} <span class="sub">${r.periodo === 'dia' ? 'hoje' : 'esta semana'}</span>${meu && !r.emDia ? '</span></label>' : '</span>'} <a class="link" href="${r.ir}">abrir</a> ${st}</li>`;
  }
  function ligarRituais(raiz) {
    $$('[data-ritual]', raiz).forEach((c) => c.onchange = () => {
      estado.rituais = estado.rituais || {};
      if (c.checked) estado.rituais[c.dataset.ritual] = { por: eu().nome, quando: new Date().toISOString() }; else delete estado.rituais[c.dataset.ritual];
      log('rotina', `${c.checked ? 'Concluiu' : 'Reabriu'}: ${c.closest('li').querySelector('b').textContent}`); salvar(); rota();
    });
  }
  function telaRotina() {
    const ctx = ctxDia(), todos = RT.rituais(ctx), ver = ['dono', 'gerente', 'auditor'].includes(eu().perfil);
    const exec = RT.execucaoRituais(estado.rituais, hojeISO(), 4);
    const perfis = ver ? Object.keys(K.PERFIS) : [eu().perfil];
    const resp = (p) => estado.usuarios.filter((x) => x.perfil === p).map((x) => x.nome);
    tela.innerHTML = `<div class="titulo"><div><h1>Rotina da equipe</h1><p>O que cada perfil faz todo dia e toda semana, gerado dos dados de hoje. ${ver ? 'Você vê o que foi feito, por quem e quando, sem precisar cobrar.' : 'Marque o que já fez: o gerente e o dono veem sem precisar perguntar.'}</p></div></div>
      <div class="grade-2">${perfis.map((p) => { const l = todos.filter((r) => r.perfil === p), feitos = l.filter((r) => r.feito || r.emDia).length; return `<section class="painel"><div class="painel-cab"><h2>${esc(PERFIL_NOME(p))}</h2><p>${feitos} de ${l.length} em dia</p></div>
        <p class="sub">Responsáveis: ${esc(resp(p).join(', ') || 'ninguém com este perfil ainda')}</p>
        <div class="progresso"><i style="width:${l.length ? feitos / l.length * 100 : 0}%"></i></div>
        <ul class="rotina">${l.map(itemRitual).join('')}</ul></section>`; }).join('')}</div>
      ${ver ? `<section class="painel bloco"><div class="painel-cab"><h2>${ICO.barras}Execução nas últimas 4 semanas</h2><p>Tarefas concluídas</p></div>
        <div class="tabela-wrap"><table class="tabela"><thead><tr><th>Perfil</th><th class="n">Concluídas</th><th>Quem fez</th></tr></thead><tbody>
        ${Object.keys(K.PERFIS).map((p) => { const e = exec[p]; return `<tr><td><b>${esc(PERFIL_NOME(p))}</b></td><td class="n">${e ? e.n : 0}</td><td>${e ? Object.entries(e.pessoas).map(([n, q]) => `${esc(n)} (${q})`).join(', ') : '<span class="sub">—</span>'}</td></tr>`; }).join('')}</tbody></table></div>
        <p class="nota-rodape">Só mostra o que foi feito. O Anshur não manda cobrança nem notificação para a equipe por causa da rotina.</p></section>` : ''}`;
    ligarRituais(tela);
  }

  // ---------- MEMÓRIA COMERCIAL ----------
  function telaMemoria() {
    const v = M.validar(), mem = RT.memoriaComercial(A.todasTrocas, v.testes), ev = mem.evolucao.slice(-12);
    const comErro = ev.filter((e) => e.erro != null);
    const largura = innerWidth >= 960 ? 1100 : 560;
    const tabela = (titulo, l, extra = '') => `<section class="painel bloco"><div class="painel-cab"><h2>${titulo}</h2><p>${l.length}</p></div><div class="tabela-wrap"><table class="tabela"><thead><tr><th>${extra || 'Grupo'}</th><th class="n">Vendas na memória</th><th class="n">Venda média</th><th class="n">Última venda</th><th class="n">Erro medido</th><th>Confiança</th></tr></thead><tbody>
      ${l.slice(0, 20).map((x) => `<tr><td><b>${esc(NOMES[x.chave] || x.chave)}</b></td><td class="n">${x.amostras}</td><td class="n">${mil(x.mediaVenda)}</td><td class="n">${data(x.ultima)} · ${mil(x.ultimoPreco)}</td><td class="n">${x.erro != null ? pct(x.erro) + ` <span class="sub">(${x.testes})</span>` : '<span class="sub">poucos testes</span>'}</td><td><span class="conf ${x.confianca}">${x.confianca}</span></td></tr>`).join('')}</tbody></table></div></section>`;
    tela.innerHTML = `<div class="titulo"><div><h1>Memória comercial</h1><p>A referência de preço que a ${esc(A.revenda.nome)} construiu com as próprias trocas vendidas. Cresce a cada venda e é testada às cegas. <b>Não é valor de mercado</b> nem tabela: é o histórico desta revenda.</p></div>
        <div class="acoes"><a class="btn btn-linha" href="#teste">Teste às cegas</a><button class="btn btn-linha" type="button" id="mem-csv">Exportar CSV</button></div></div>
      <div class="kpis escalonado">
        <div class="kpi k-marfim"><span class="rot">${ICO.camadas}Trocas vendidas na memória</span><span class="val">${conta(mem.total, 'int')}</span><span class="exp">Cada uma melhora a próxima avaliação</span></div>
        <div class="kpi k-salvia"><span class="rot">${ICO.alvo}Erro médio no teste às cegas</span><span class="val">${v.n >= M.QUALIDADE.minimoValidacao ? pct(v.mape) : '—'}</span><span class="exp">${v.n} vendas previstas sem ver o resultado</span></div>
        <div class="kpi k-marfim"><span class="rot">${ICO.moedas}Erro médio em reais</span><span class="val">${v.n >= M.QUALIDADE.minimoValidacao ? mil(v.mae) : '—'}</span><span class="exp">Por máquina, no preço de venda</span></div>
        <div class="kpi k-marfim"><span class="rot">${ICO.barras}Modelos com histórico</span><span class="val">${mem.porModelo.length}</span><span class="exp">${mem.porModelo.filter((m) => m.amostras >= 3).length} com 3 ou mais vendas</span></div>
      </div>
      <div class="grade-2">
        <section class="painel"><div class="painel-cab"><h2>${ICO.linha}Vendas acumuladas na memória</h2><p>Por mês</p></div>${ev.length > 1 ? G.linha(ev.map((e) => ({ r: mesCurto(e.mes), v: e.amostras })), { formato: (x) => Math.round(x) + '', altura: 170, largura: Math.min(560, largura) }) : '<p class="vazio">Ainda poucas vendas.</p>'}</section>
        <section class="painel"><div class="painel-cab"><h2>${ICO.alvo}Erro do teste às cegas ao longo do tempo</h2><p>Média das últimas 12 previsões</p></div>${comErro.length > 1 ? G.linha(comErro.map((e) => ({ r: mesCurto(e.mes), v: e.erro })), { formato: (x) => pct(x), altura: 170, largura: Math.min(560, largura) }) : '<p class="vazio">O erro aparece depois de algumas vendas testadas.</p>'}
          <p class="nota-rodape">Cada previsão usou só as vendas anteriores a ela. O gráfico mostra, sem maquiagem, se o erro está caindo ou subindo; com mais trocas registradas a tendência é cair.</p></section>
      </div>
      <section class="painel bloco"><div class="painel-cab"><h2>${ICO.baixo}Últimas vendas que entraram na memória</h2></div>
        <ul class="linha-tempo grande">${mem.recentes.map((x) => `<li><b>${esc(x.maq)} vendida por ${mil(x.vendido)}</b><span>${data(x.quando)} · agora ${x.doModelo} ${x.doModelo === 1 ? 'venda' : 'vendas'} deste modelo e ${x.doTipo} de ${esc(NOMES[x.tipo].toLowerCase())} na memória</span></li>`).join('') || '<li>Nenhuma venda ainda.</li>'}</ul></section>
      ${tabela(`${ICO.camadas}Por tipo de máquina`, mem.porTipo, 'Tipo')}${tabela(`${ICO.etiqueta}Por marca`, mem.porMarca, 'Marca')}${tabela(`${ICO.etiqueta}Por modelo`, mem.porModelo, 'Modelo')}
      <p class="nota-rodape">Confiança: alta = 12+ vendas e erro até 6%; moderada = 8+ vendas e erro até 10%; abaixo disso, baixa. Os dados são da revenda e saem em CSV ou na cópia de segurança quando ela quiser.</p>`;
    $('#mem-csv').onclick = () => baixarCSV(`anshur-memoria-${hojeISO()}.csv`, [['Grupo', 'Chave', 'Vendas', 'Venda média', 'Última venda', 'Último preço', 'Erro medido', 'Testes', 'Confiança']].concat(...[['tipo', mem.porTipo], ['marca', mem.porMarca], ['modelo', mem.porModelo]].map(([g, l]) => l.map((x) => [g, x.chave, x.amostras, Math.round(x.mediaVenda), x.ultima, x.ultimoPreco, x.erro != null ? pctCSV(x.erro) : '', x.testes, x.confianca]))));
    contar();
  }

  // ---------- HISTÓRICO VIVO ----------
  const fh = { tipo: '', marca: '', modelo: '', loja: '', de: '', ate: '' };
  function telaHistorico() {
    const tl = RT.linhaDoTempo(estado, A.todasTrocas.filter((t) => !K.lojasPermitidas || !K.lojasPermitidas.length || K.lojasPermitidas.includes(t.loja)), { ...fh, loja: fh.loja || estado.lojaAtual || '' });
    const marcas = [...new Set(A.todasTrocas.map((t) => t.marca).filter(Boolean))].sort(), modelos = [...new Set(A.todasTrocas.filter((t) => !fh.marca || t.marca === fh.marca).map((t) => t.modelo))].sort();
    const TIPOS_EV = { avaliacao: 'Avaliações', decisao: 'Decisões da IA', troca: 'Trocas', aprovacao: 'Aprovações', negociacao: 'Negociações de preço', venda: 'Vendas e margens' };
    const ind = (titulo, l) => `<section class="painel"><div class="painel-cab"><h2>${titulo}</h2></div><div class="tabela-wrap"><table class="tabela"><thead><tr><th></th><th class="n">Avaliações</th><th class="n">Trocas</th><th class="n">Vendas</th><th class="n">Margem média</th></tr></thead><tbody>${l.slice(0, 12).map((x) => `<tr><td><b>${esc(x.chave)}</b></td><td class="n">${x.avaliacoes}</td><td class="n">${x.trocas}</td><td class="n">${x.vendas}</td><td class="n ${x.margem != null && x.margem < 0.06 ? 'neg' : ''}">${x.margem != null ? pct(x.margem) : '—'}</td></tr>`).join('') || '<tr><td colspan="5" class="vazio">Nada no filtro.</td></tr>'}</tbody></table></div></section>`;
    const opt = (l, v, todos) => `<option value="">${todos}</option>` + l.map((x) => `<option ${x === v ? 'selected' : ''}>${esc(x)}</option>`).join('');
    tela.innerHTML = `<div class="titulo"><div><h1>Histórico vivo</h1><p>Tudo o que a revenda decidiu e aprendeu: avaliações, decisões, aprovações, negociações, vendas e margens, numa linha do tempo.</p></div><div class="acoes"><button class="btn btn-linha" type="button" id="hv-csv">Exportar CSV</button></div></div>
      <div class="filtros filtros-hist">
        <div class="campo"><label for="hv-tipo">Evento</label><select id="hv-tipo"><option value="">Todos</option>${Object.entries(TIPOS_EV).map(([k, n]) => `<option value="${k}" ${fh.tipo === k ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
        <div class="campo"><label for="hv-marca">Marca</label><select id="hv-marca">${opt(marcas, fh.marca, 'Todas')}</select></div>
        <div class="campo"><label for="hv-modelo">Modelo</label><select id="hv-modelo">${opt(modelos, fh.modelo, 'Todos')}</select></div>
        ${estado.lojas.length ? `<div class="campo"><label for="hv-loja">Loja</label><select id="hv-loja">${opt(K.lojasPermitidas && K.lojasPermitidas.length ? K.lojasPermitidas : estado.lojas, fh.loja || estado.lojaAtual, 'Todas')}</select></div>` : ''}
        <div class="campo"><label for="hv-de">De</label><input id="hv-de" type="date" value="${fh.de}"></div><div class="campo"><label for="hv-ate">Até</label><input id="hv-ate" type="date" value="${fh.ate}"></div>
      </div>
      <div class="grade-2">${ind(`${ICO.etiqueta}Por marca`, tl.porMarca)}${ind(`${ICO.etiqueta}Por modelo`, tl.porModelo)}</div>
      ${estado.lojas.length ? `<div class="bloco">${ind(`${ICO.camadas}Por loja`, tl.porLoja)}</div>` : ''}
      <section class="painel bloco"><div class="painel-cab"><h2>${ICO.linha}Linha do tempo</h2><p>${tl.eventos.length} ${tl.eventos.length === 1 ? 'registro' : 'registros'}${tl.eventos.length > 250 ? ' (mostrando os 250 mais recentes)' : ''}</p></div>
        <ul class="linha-tempo grande hv">${tl.eventos.slice(0, 250).map((e) => `<li class="ev-${e.tipo}"><b>${esc(e.titulo)}</b><span>${data(e.quando)} · ${esc(TIPOS_EV[e.tipo] || e.tipo)}${e.loja ? ' · ' + esc(e.loja) : ''} · ${esc(e.txt)}</span></li>`).join('') || '<li>Nada no filtro.</li>'}</ul></section>`;
    const ligar = (id, k) => { const el = $(id); if (el) el.onchange = () => { fh[k] = el.value; if (k === 'marca') fh.modelo = ''; telaHistorico(); }; };
    ligar('#hv-tipo', 'tipo'); ligar('#hv-marca', 'marca'); ligar('#hv-modelo', 'modelo'); ligar('#hv-loja', 'loja'); ligar('#hv-de', 'de'); ligar('#hv-ate', 'ate');
    $('#hv-csv').onclick = () => baixarCSV(`anshur-historico-${hojeISO()}.csv`, [['Data', 'Evento', 'Título', 'Detalhe', 'Marca', 'Modelo', 'Loja', 'Valor', 'Margem']].concat(tl.eventos.map((e) => [e.quando, TIPOS_EV[e.tipo] || e.tipo, e.titulo, e.txt, e.marca, e.modelo, e.loja, e.valor != null ? Math.round(e.valor) : '', e.margem != null ? pctCSV(e.margem) : ''])));
  }

  // ---------- CONFIGURAÇÕES › INTELIGÊNCIA ARTIFICIAL e › AVISOS (só o dono) ----------
  function blocoIAConfig() {
    if (eu().perfil !== 'dono') return '';
    return `<section class="painel bloco" id="cfg-ia"><h2>${ICO.alvo}Inteligência artificial</h2>
      <p class="sub" style="margin:6px 0 10px">Usada na avaliação das fotos. Padrão: <b>IA da Blue Rose (Gemini grátis)</b>, 30 análises por dia para a revenda. Se preferir, conecte a chave da sua conta do Gemini ou da OpenAI: ela fica cifrada no servidor, ninguém a vê de novo (só o final) e não há limite nosso.</p>
      <div id="ia-status" class="conta">${NV ? 'Carregando…' : 'Demonstração: usando a IA de exemplo (nada sai deste aparelho).'}</div>
      <div class="campos" style="margin-top:12px">
        <div class="campo"><label for="ia-prov">Provedor da chave própria</label><select id="ia-prov"><option value="gemini">Google Gemini</option><option value="openai">OpenAI</option></select></div>
        <div class="campo"><label for="ia-modelo">Modelo (opcional)</label><input id="ia-modelo" list="dl-ia-modelos" placeholder="gemini-3.5-flash-lite" autocomplete="off">${lista('dl-ia-modelos', ['gemini-3.5-flash-lite', 'gemini-3.5-flash', 'gpt-5-mini', 'gpt-5'])}</div>
        <div class="campo inteiro"><label for="ia-chave">Chave de API</label><input id="ia-chave" type="password" autocomplete="off" spellcheck="false" placeholder="Cole aqui a chave (AIza… ou sk-…)"></div>
      </div>
      <div class="acoes"><button class="btn btn-linha" type="button" id="ia-testar">Testar</button><button class="btn btn-ouro" type="button" id="ia-salvar">Salvar chave própria</button><button class="btn btn-linha" type="button" id="ia-voltar">Voltar para a IA da Blue Rose</button></div>
      <p class="nota-rodape">Testar faz uma chamada mínima e mostra se funcionou; nada é salvo no teste. O custo do uso da sua chave é cobrado pela sua conta no Google ou na OpenAI.</p></section>`;
  }
  function ligarIAConfig() {
    const box = $('#cfg-ia'); if (!box) return;
    const st = $('#ia-status'), chave = $('#ia-chave'), prov = $('#ia-prov'), mod = $('#ia-modelo');
    prov.onchange = () => { mod.placeholder = prov.value === 'openai' ? 'gpt-5-mini' : 'gemini-3.5-flash-lite'; };
    const mostra = (s) => { st.innerHTML = s.propria ? `Usando a <b>chave própria ${s.provedor === 'openai' ? 'da OpenAI' : 'do Gemini'}</b> (••••${esc(s.final || '')}), modelo ${esc(s.modelo)}. Sem limite nosso.` : `Usando a <b>IA da Blue Rose (Gemini grátis)</b>, modelo ${esc(s.modelo)} · ${s.restantes != null ? s.restantes + ' de ' + s.limite + ' análises restantes hoje' : ''}`; };
    const demo = () => estado.demoIA || { propria: false, provedor: 'blue_rose', modelo: 'gemini-3.5-flash-lite', restantes: 30, limite: 30 };
    const carregar = () => (NV ? NV.ia('status').then(mostra, (e) => { st.textContent = e.message; }) : mostra(demo()));
    carregar();
    const pronto = (b, sim, t) => { b.disabled = sim; if (t) b.textContent = t; };
    $('#ia-testar').onclick = async (e) => {
      const b = e.currentTarget; pronto(b, true, 'Testando…');
      try {
        if (!NV) { await new Promise((ok) => setTimeout(ok, 400)); toast(chave.value.trim() ? 'Demonstração: o teste real chama a IA só na conta da revenda. Formato da chave conferido.' : 'Demonstração: IA de exemplo funcionando.'); }
        else { const r = await NV.ia('testar', { provedor: prov.value, chave: chave.value.trim(), modelo: mod.value.trim() }); toast(r.ok ? `Funcionou (${r.provedor === 'blue_rose' ? 'IA da Blue Rose' : r.provedor === 'openai' ? 'OpenAI' : 'Gemini'}, ${r.modelo}).` : r.erro, !r.ok); }
      } catch (er) { toast(er.message, true); }
      pronto(b, false, 'Testar');
    };
    $('#ia-salvar').onclick = async (e) => {
      const k = chave.value.trim(); if (k.length < 20 || /\s/.test(k)) { toast('Cole a chave completa (sem espaços).', true); chave.focus(); return; }
      const b = e.currentTarget; pronto(b, true, 'Conferindo e salvando…');
      try {
        if (!NV) { estado.demoIA = { propria: true, provedor: prov.value, modelo: mod.value.trim() || (prov.value === 'openai' ? 'gpt-5-mini' : 'gemini-3.5-flash-lite'), final: k.slice(-4) }; salvar(); toast('Demonstração: só o final da chave foi guardado; a chave em si não sai daqui.'); }
        else { const r = await NV.ia('salvar', { provedor: prov.value, chave: k, modelo: mod.value.trim() }); if (!r.ok) throw new Error(r.erro); toast('Chave própria salva e cifrada no servidor.'); }
        chave.value = ''; carregar();
      } catch (er) { toast(er.message, true); }
      pronto(b, false, 'Salvar chave própria');
    };
    $('#ia-voltar').onclick = () => confirmar('Voltar para a IA da Blue Rose?', 'A chave própria é apagada do servidor. A revenda volta a usar o Gemini grátis da Blue Rose (30 análises por dia).', 'Voltar e apagar a chave', async () => {
      try { if (!NV) { delete estado.demoIA; salvar(); } else await NV.ia('remover'); toast('Voltou para a IA da Blue Rose; a chave própria foi apagada.'); carregar(); } catch (er) { toast(er.message, true); }
    });
  }
  function blocoAvisos() {
    if (eu().perfil !== 'dono') return '';
    return `<section class="painel bloco" id="cfg-avisos"><h2>${ICO.alerta}Avisos</h2>
      <p class="sub" style="margin:6px 0 10px">Um e-mail por dia útil às 7h com o que pede atenção (avaliação parada, aprovação esperando, máquina mudando de faixa, garantia perto de 60 dias, comprador para máquina nova, com o link do WhatsApp pronto). <b>Só sai quando há algo relevante</b>; dia sem nada, sem e-mail. Padrão: só para o dono.</p>
      <div class="campos"><div class="campo"><label for="av-freq">Frequência</label><select id="av-freq"><option value="diario">Diário (dias úteis, 7h)</option><option value="semanal">Semanal (segunda, 7h)</option><option value="desligado">Desligado</option></select></div></div>
      <span class="rot-campo" style="margin-top:12px;display:block">Quem recebe</span><div class="checks" id="av-dest">Carregando…</div>
      <div class="acoes"><button class="btn btn-ouro" type="button" id="av-salvar">Salvar avisos</button><button class="btn btn-linha" type="button" id="av-previa">Ver como fica o e-mail</button></div>
      <div id="av-envios"></div></section>`;
  }
  function ligarAvisos() {
    const box = $('#cfg-avisos'); if (!box) return;
    const pessoas = estado.usuarios.filter((u) => NV ? u.email : true);
    const desenha = (cfg) => {
      const dest = cfg && cfg.destinatarios && cfg.destinatarios.length ? cfg.destinatarios : pessoas.filter((u) => u.perfil === 'dono').map((u) => u.id);
      $('#av-freq').value = (cfg && cfg.frequencia) || 'diario';
      $('#av-dest').innerHTML = pessoas.map((u) => `<label class="check"><input type="checkbox" data-dest="${esc(u.id)}" ${dest.includes(u.id) ? 'checked' : ''}> ${esc(u.nome)} <span class="sub">· ${esc(PERFIL_NOME(u.perfil))}${u.email ? ' · ' + esc(u.email) : ''}</span></label>`).join('') || '<p class="sub">Ninguém com e-mail na equipe.</p>';
    };
    if (NV) {
      NV.avisos().then(desenha, (e) => { $('#av-dest').textContent = e.message; });
      NV.envios().then((l) => { $('#av-envios').innerHTML = l.length ? `<p class="conta">Últimos envios: ${l.slice(0, 6).map((x) => `${data(x.dia)} para ${esc((estado.usuarios.find((u) => u.id === x.usuario) || {}).nome || 'pessoa removida')} (${x.itens} ${x.itens === 1 ? 'item' : 'itens'}, ${x.status})`).join('; ')}.</p>` : '<p class="conta">Nenhum e-mail enviado ainda.</p>'; }, () => {});
    } else desenha(estado.avisos);
    $('#av-salvar').onclick = async () => {
      const freq = $('#av-freq').value, dest = $$('[data-dest]', box).filter((c) => c.checked).map((c) => c.dataset.dest);
      try { if (NV) await NV.salvarAvisos(freq, dest); else { estado.avisos = { frequencia: freq, destinatarios: dest }; log('config', `Avisos por e-mail: ${freq}`); salvar(); } toast(freq === 'desligado' ? 'Avisos desligados.' : 'Avisos salvos.'); } catch (e) { toast(e.message, true); }
    };
    $('#av-previa').onclick = () => {
      const u = eu(), { acoes } = RT.acoesDoDia(Object.assign(ctxDia('dono'), { rascunho: null, janela: 1 }));
      const em = RT.resumoEmail({ revenda: A.revenda.nome, nome: u.nome, acoes, link: location.origin + location.pathname, hoje: hojeISO(), frequencia: $('#av-freq').value });
      abrirCamada('modal', em ? `<h2>${esc(em.assunto)}</h2><p class="sub">Prévia com os dados de agora${OP ? '' : ' (demonstração: nenhum e-mail é enviado)'}.</p><div class="previa-email">${em.html}</div>` : '<h2>Nada a enviar agora</h2><p class="sub">Com os dados de hoje não há nada relevante: nesse caso o Anshur não manda e-mail.</p>');
    };
  }

  // ---------- demonstração: dados fictícios para a Central, a rotina, a IA e o histórico aparecerem funcionando ----------
  function semearDemo() {
    if (OP || estado.semente9) return;
    const dAtras = (n) => { const d = new Date(hojeISO() + 'T12:00:00'); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); };
    const mod = (tipo, i = 0) => A.modelos.filter((m) => m.tipo === tipo)[i] || A.modelos[0];
    const maqDe = (m, ano, horas, cond) => ({ tipo: m.tipo, marca: m.marca, modelo: m.modelo, ano, horas, cond, ficha: { motor: 4, transmissao: 4, hidraulico: 3, pneus: 3, cabine: 4, lataria: 3 } });
    const avs = [[mod('trator', 1), 2021, 3800, 70, 3, 'Rodrigo'], [mod('pulverizador', 0), 2020, 4100, 66, 6, 'Marcos'], [mod('trator', 3), 2019, 5200, 62, 12, 'Fernanda']];
    avs.forEach(([m, ano, h, c, d, por], i) => { const maq = maqDe(m, ano, h, c), r = M.avaliar(maq, { semValidacao: true }); if (!r) return;
      estado.avaliacoes.push({ id: 'AVD' + i, data: dAtras(d), por, loja: estado.lojas[i % estado.lojas.length] || '', status: i === 2 ? 'desistiu' : 'aberta', maq, teto: r.teto, venda: r.venda, preparo: r.preparo, faixa: r.faixa, confianca: r.confianca, amostras: r.base, premissas: { margemAlvo: r.margem },
        ...(i === 0 ? { ia: { exemplo: true, provedor: 'exemplo', fotos: 11, resumo: 'EXEMPLO (demonstração): IA sugeriu Motor 3, Transmissão 4, Hidráulico 3, Pneus 2, Cabine 4, Lataria 3; o avaliador aceitou 5, alterou 1 (Pneus: 2→3); avarias: 1 confirmadas, 0 descartadas.' } } : {}) }); });
    // troca recente que combina com um comprador cadastrado (para o "comprador compatível" aparecer)
    for (const c of A.compradores) {
      const ms = A.modelos.filter((m) => m.tipo === c.tipo && (!c.marcas || m.marca === c.marcas)); let feito = false;
      for (const m of ms) { const maq = maqDe(m, Math.max(+c.anoMin || 0, anoAtual - 4), 2800, 78), r = M.avaliar(maq, { semValidacao: true }); if (!r) continue;
        const t = K.fecharTroca(estado, maq, r, r.teto, dAtras(2), { vendedor: 'Rodrigo', origem: 'Faz. Recreio', loja: estado.lojas[0] || '' });
        if (RT.compradoresPara(t, A.compradores).length) { A.trocas.push({ ...t }); feito = true; break; } estado.fechadas.pop(); }
      if (feito) break;
    }
    // pedido de aprovação acima do teto esperando o gerente
    const mp = maqDe(mod('colhedora', 0), anoAtual - 5, 14000, 68), rp = M.avaliar(mp, { semValidacao: true });
    if (rp) estado.pendentes.push({ id: 'PD1', nivel: 'gerente', quando: new Date(Date.now() - 5 * 3600e3).toISOString(), por: 'Tiago', maq: mp, rec: { teto: rp.teto, venda: rp.venda, preparo: rp.preparo, dias: rp.dias, margem: rp.margem, margemSobreVenda: rp.margemSobreVenda, confianca: rp.confianca, doTipo: rp.doTipo }, valor: rp.teto + 25000, data: hojeISO(), motivo: 'Cliente fecha a colhedora nova se pagarmos isso no usado', status: 'pendente', extra: { vendedor: 'Tiago', origem: 'Usina fictícia', fotos: [] } });
    // rotina: o que a equipe fictícia já concluiu
    const ch = (per, perfil, id, dias) => RT.chavePeriodo(per, dAtras(dias)) + '|' + perfil + '|' + id;
    estado.rituais = Object.assign({}, estado.rituais, { [ch('dia', 'vendedor', 'compradores', 0)]: { por: 'Rodrigo', quando: new Date(Date.now() - 2 * 3600e3).toISOString() }, [ch('semana', 'financeiro', 'comissoes', 0)]: { por: 'Lúcia', quando: new Date(Date.now() - 26 * 3600e3).toISOString() },
      [ch('dia', 'gerente', 'faixas', 1)]: { por: 'Carlos', quando: new Date(Date.now() - 22 * 3600e3).toISOString() }, [ch('dia', 'vendedor', 'retorno', 1)]: { por: 'Marcos', quando: new Date(Date.now() - 25 * 3600e3).toISOString() }, [ch('dia', 'oficina', 'preparo', 2)]: { por: 'Zé da Oficina', quando: new Date(Date.now() - 50 * 3600e3).toISOString() } });
    estado.semente9 = true; salvar(); cacheLimpa();
  }

  // ---------- rotas com transição ----------
  const TELAS = { visao: telaVisao, avaliar: telaAvaliar, patio: telaPatio, trocas: telaTrocas, teste: telaTeste, passaportes: telaPassaportes, vendedores: telaVendedores, garantias: telaGarantias, financiamento: telaFinanciamento, relatorio: telaRelatorios, mensal: telaRelatorio, documentos: telaDocumentos, usuarios: telaUsuarios, config: telaConfig, atividades: telaAtividades, compradores: telaCompradores, mercado: telaMercado, aprovacoes: telaAprovacoes, perfil: telaPerfil, hoje: telaHoje, rotina: telaRotina, memoria: telaMemoria, historico: telaHistorico };
  function moverIndicador() {
    const ativo = $('.menu a[aria-current="page"]'), ind = $('.menu-indicador');
    if (!ativo || !ind) return;
    if (matchMedia('(min-width: 960px)').matches) { ind.style.transform = `translateY(${ativo.offsetTop}px)`; ind.style.width = ''; }
    else { ind.style.transform = `translateX(${ativo.offsetLeft}px)`; ind.style.width = ativo.offsetWidth + 'px'; }
  }
  let primeira = true;
  function rota() {
    const nome = (location.hash || '#hoje').slice(1);
    let ativa = TELAS[nome] ? nome : 'hoje';
    if (!pode(ativa)) { ativa = (PERM[eu().perfil] || [])[0] || 'hoje'; }
    $$('.menu a').forEach((a) => { if (a.dataset.aba === ativa) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    moverIndicador();
    fecharCamada(true);
    const desenhar = () => { tela.classList.remove('saindo'); TELAS[ativa](); tela.classList.remove('entrando'); void tela.offsetWidth; tela.classList.add('entrando'); };
    if (primeira || reduzido) { primeira = false; desenhar(); return; }
    tela.classList.add('saindo');
    setTimeout(() => { desenhar(); window.scrollTo(0, 0); }, 120);
  }
  $('#sino').onclick = abrirNotificacoes; seletorLoja(); if (somenteLeitura()) document.body.classList.add('so-leitura');
  $('#busca-btn').onclick = abrirBusca; $('#instalar-btn').onclick = simularInstalacao;
  // com conta, abrir o app não grava nada (evita versão nova a cada acesso e conflito com quem está usando)
  atualizarAvatar(); eu().ultimoAcesso = new Date().toISOString(); if (!K.nuvem) salvar();
  $$('.menu a').forEach((a) => { if (!pode(a.dataset.aba)) a.hidden = true; });
  $$('.menu-grupo').forEach((g) => { let x = g.nextElementSibling, algum = false; while (x && x.tagName === 'A') { if (!x.hidden) algum = true; x = x.nextElementSibling; } g.hidden = !algum; });
  if (OP) sincronizar(false).then((r) => { if (r === 'novas') { toast(`Sincronizado com o seu sistema: ${estado.ultimaSync.novas} trocas novas.`); setTimeout(() => K.recarregar(), 1200); } else if (r === 'permissao') toast('Toque em Teste às cegas › Importar planilha › Sincronizar agora para atualizar com o seu sistema.'); }).catch(() => {});
  semearDemo();
  atualizarSino();
  window.addEventListener('hashchange', rota);
  // celular: barra com 4 atalhos + "Mais", que abre todos os módulos por categoria
  (() => {
    const menu = $('#menu'); if (!menu || $('#menu-mais')) return;
    menu.insertAdjacentHTML('beforeend', '<button type="button" id="menu-mais" class="menu-mais" aria-expanded="false"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg><b>Mais</b></button>');
    document.body.insertAdjacentHTML('beforeend', '<div class="menu-fundo" id="menu-fundo"></div>');
    const abrir = (sim) => { document.body.classList.toggle('menu-aberto', sim); $('#menu-mais').setAttribute('aria-expanded', sim); $('#menu-mais b').textContent = sim ? 'Fechar' : 'Mais'; };
    $('#menu-mais').onclick = () => abrir(!document.body.classList.contains('menu-aberto'));
    $('#menu-fundo').onclick = () => abrir(false);
    menu.addEventListener('click', (e) => { if (e.target.closest('a')) abrir(false); });
    const marcar = () => { const a = $('.menu a[aria-current="page"]'); $('#menu-mais').classList.toggle('ativo', !!a && !['hoje', 'avaliar', 'patio', 'aprovacoes'].includes(a.dataset.aba)); };
    window.addEventListener('hashchange', () => setTimeout(marcar, 50)); setTimeout(marcar, 300);
  })();
  window.addEventListener('resize', moverIndicador);
  // com conta: o que o app ajustou só para abrir (padrões, lojas, perfis do servidor) não vira alteração a enviar
  if (NV && NV.marcarVista) NV.marcarVista(estado);
  rota();
})();
