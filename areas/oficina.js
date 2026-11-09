// Área OFICINA: telas. As regras (puras, testadas) estão em areas/oficina-regras.js (window.OFICINA).
// Segue o padrão das áreas (README › Áreas): menu, telas, permissões, número da entrada, busca, dados (fila offline) e demonstração.
// Permissões: oficina, gerente e dono abrem e mexem nas OS e nos apontamentos; financeiro e auditor só leem;
// vendedor vê só a situação das OS dos clientes dele (sem valores). Peças saem do estoque real (window.PECAS);
// ao entregar, a OS vira conta a receber (FINANCEIRO.criar) ou, no preparo de usado, custo da máquina (estado.preparos).
(function (raiz) {
  const O = raiz.OFICINA, R = raiz.ANSHUR_AREAS;
  if (!R) return;
  // sem as regras (areas/oficina-regras.js não carregou): fica honesta como "Em breve", sem tela
  if (!O) { R.registrar({ id: 'oficina', nome: 'Oficina', curto: 'Oficina', ordem: 40, pronta: false, perfis: ['dono', 'gerente', 'oficina', 'financeiro', 'auditor'], descricao: 'Ordens de serviço, orçamento, mecânicos, horas, garantia e entrega.', icone: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z"/>', previsto: ['OS com diagnóstico, orçamento e aprovação do cliente', 'Mecânicos, horas, serviços e checklist', 'Peças consumidas do estoque real', 'Garantia e entrega; custo e faturamento no Financeiro'], jaExiste: 'Hoje já existe: preparo dos usados (Pátio) e Garantias a receber.' }); return; }
  const VER = ['dono', 'gerente', 'oficina', 'financeiro', 'auditor'];
  let U = null;
  const P = () => raiz.PECAS || null;
  const F = () => raiz.FINANCEIRO || null;
  const est = () => U.estado;
  const brl = O.brl, dBR = (iso) => (iso ? String(iso).slice(0, 10).split('-').reverse().join('/') : '—');
  const hora = (iso) => (iso ? new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—');
  const hs = (h) => (+h || 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' h';
  const esc = (s) => U.esc(s);
  const quem = () => U.eu().nome;
  const leitura = () => !!(U.NV && U.NV.somenteLeitura);
  const editor = () => O.podeEditar(U.eu().perfil) && !leitura();
  const lojas = () => U.K.lojasPermitidas || U.estado.lojas || [];
  const fl = () => ({ loja: U.estado.lojaAtual || '', lojas: U.K.lojasPermitidas });
  const lojaPadrao = () => U.estado.lojaAtual || lojas()[0] || '';
  const vh = () => +U.K.cfg.valorHora || 180;
  const opt = (pares, sel) => pares.map(([v, n]) => `<option value="${esc(v)}" ${String(sel) === String(v) ? 'selected' : ''}>${esc(n)}</option>`).join('');
  const optLojas = (sel) => (lojas().length ? opt(lojas().map((l) => [l, l]), sel) : '<option value="">Loja principal</option>');
  const nomeCli = (id) => { const c = id && U.K.cad.cliente(id); return c ? c.nome : ''; };
  const maq = (id) => (id ? U.K.cad.maquina(id) : null);
  const nomeMaqId = (id) => { const m = maq(id); return m ? `${m.nome}${m.ano ? ' ' + m.ano : ''}` : ''; };
  const nomeMaq = (os) => nomeMaqId(os.maquina) || os.maqTexto || 'Máquina não informada';
  const nomeMec = (id) => { const m = O.garantir(est()).mecanicos.find((x) => x.id === id); return m ? m.nome : 'Mecânico'; };
  const ic = (d) => `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
  const I = {
    chave: ic('<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z"/>'), mais: ic('<path d="M12 5v14M5 12h14"/>'),
    relogio: ic('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'), alerta: ic('<path d="M12 3 2 20h20L12 3zM12 10v4M12 17v.5"/>'), check: ic('<path d="M5 12.5l4.5 4.5L19 7.5"/>'),
    caixa: ic('<path d="M21 8l-9-5-9 5v8l9 5 9-5zM3 8l9 5 9-5M12 13v8"/>'), zap: ic('<path d="M4 20l1.3-4A8 8 0 1 1 8 18.7z"/>'), lista: ic('<path d="M9 6h11M9 12h11M9 18h11M4 6h.5M4 12h.5M4 18h.5"/>')
  };
  const cab = (t, s, b = '') => `<div class="titulo"><div><h1>${t}</h1><p>${s}</p></div>${b ? `<div class="fin-acoes">${b}</div>` : ''}</div>`;
  const vazio = (t) => `<p class="vazio">${t}</p>`;
  const SIT = { aberta: 'aberto', aguardando: 'hoje', execucao: 'aberto', pronta: 'pago', entregue: 'pago', cancelada: 'cancelado' };
  const tagSt = (os) => `<span class="sit sit-${SIT[os.status]}">${O.STATUS[os.status]}</span>`;
  const atrasada = (os) => O.ABERTOS.includes(os.status) && os.previsao && os.previsao < U.hojeISO();
  // registro: Atividades (ui.log, com ref da máquina para a linha do tempo do Pátio); 'oficina' está em CRITICOS (comum.js) e vai para a trilha do servidor
  function gravar(texto, os) {
    U.log('oficina', texto, os && os.maquina ? { ref: os.maquina } : undefined);
    U.salvar();
  }
  const tentar = (fn) => { try { return fn(); } catch (e) { U.toast(e.message, true); return null; } };
  const sufixo = () => (U.NV ? '-' + Math.random().toString(36).slice(2, 4).toUpperCase() : ''); // duas pessoas sem internet não colidem no número
  const visiveis = () => O.garantir(est()).os.filter(O.daLoja(fl().loja, fl().lojas));
  const ctxFechar = () => ({ PECAS: P(), F: F(), valorHora: vh(), quem: quem(), garantias: est().extras.garantias, maquina: (id) => { const m = maq(id); return m ? { nome: nomeMaqId(id), marca: m.marca, modelo: m.modelo } : null; } });
  // preparo fechado: o objeto vivo do usado passa a mostrar o preparo real (o mesmo que o Pátio faz ao salvar a ordem de preparo)
  function preparoVivo(os) {
    const m = maq(os.maquina), p = (est().preparos || {})[os.maquina];
    if (m && m.t && p) { m.t.preparo = p.valor; m.t.preparoRegistrado = p.data; m.t.preparoItens = p.itens; }
  }
  function garantiaViva(os) {
    const g = est().extras.garantias.find((x) => x.origemOS === os.id);
    if (g && U.A.garantias && !U.A.garantias.includes(g)) U.A.garantias.push(g);
  }

  // ---------- PAINEL (quadro por situação) ----------
  function telaPainel() {
    const r = O.resumo(est(), Object.assign({ hoje: U.hojeISO() }, fl())), l = visiveis();
    const ab = O.garantir(est()).apontamentos.filter((a) => !a.fim);
    const cols = ['aberta', 'aguardando', 'execucao', 'pronta'];
    U.tela.innerHTML = cab('Oficina', `Ordens de serviço por situação${fl().loja ? ' · loja ' + esc(fl().loja) : ''}. Toque numa OS para orçar, apontar horas, baixar peças e entregar.`, botoes()) + `
      <div class="kpis fin-k">
        <a class="kpi k-marfim" href="#of-os"><span class="rot">${I.chave}OS abertas</span><span class="val">${r.abertas}</span><span class="exp">${r.atrasadas ? `<b class="neg">${r.atrasadas} atrasadas</b>` : 'nenhuma atrasada'}</span></a>
        <div class="kpi ${r.semAprovacao ? 'k-risco' : ''}"><span class="rot">${I.zap}Esperando o cliente</span><span class="val">${r.semAprovacao}</span><span class="exp">orçamentos sem aprovação</span></div>
        <div class="kpi ${r.por.aguardando ? 'k-risco' : ''}"><span class="rot">${I.caixa}Aguardando peça</span><span class="val">${r.por.aguardando}</span><span class="exp"><a class="link" href="#pc-compras">ver compras</a></span></div>
        <div class="kpi k-salvia"><span class="rot">${I.check}Prontas para entregar</span><span class="val">${r.por.pronta}</span><span class="exp">${r.entreguesMes} entregues no mês · ${brl(r.faturadoMes)}</span></div>
      </div>
      <div class="ofc-quadro">${cols.map((st) => { const os = l.filter((o) => o.status === st).sort((a, b) => String(a.previsao || '9').localeCompare(String(b.previsao || '9'))); return `<section class="ofc-col" aria-label="${O.STATUS[st]}"><h3>${O.STATUS[st]} <span class="sub">${os.length}</span></h3>${os.map(cartao).join('') || '<p class="sub">Nenhuma.</p>'}</section>`; }).join('')}</div>
      <section class="painel"><div class="painel-cab"><h2>${I.relogio}Trabalhando agora</h2><p><a class="link" href="#of-apont">Apontar horas</a></p></div>
        ${ab.length ? `<ul class="fin-saldos">${ab.map((a) => { const os = O.acharOS(est(), a.os); return `<li><span><b>${esc(nomeMec(a.mecanico))}</b><span>${os ? esc(os.numero + ' · ' + nomeMaq(os)) : ''} · desde ${hora(a.inicio)}</span></span><b>${hs((Date.now() - new Date(a.inicio)) / 3.6e6)}</b></li>`; }).join('')}</ul>` : vazio('Ninguém apontando agora.')}</section>`;
    ligar();
  }
  const cartao = (os) => `<button type="button" class="ofc-card" data-os="${esc(os.id)}"><b>${esc(os.numero)} · ${esc(O.TIPOS[os.tipo])}</b><span>${esc(nomeMaq(os))}</span><span>${esc(os.tipo === 'preparo' ? 'Usado do pátio' : nomeCli(os.cliente) || '—')}</span>
    <span class="ofc-tags">${atrasada(os) ? `<span class="sit sit-vencido">Atrasada · ${dBR(os.previsao)}</span>` : os.previsao ? `<span class="sit sit-aberto">Prev. ${dBR(os.previsao)}</span>` : ''}${os.aprovacao && os.aprovacao.status === 'pendente' && os.itens.length ? '<span class="sit sit-hoje">Sem aprovação</span>' : ''}${os.aprovacao && os.aprovacao.status === 'recusado' ? '<span class="sit sit-vencido">Recusado</span>' : ''}</span></button>`;
  const botoes = () => (editor() ? `<button class="btn btn-ouro" type="button" data-of-nova>${I.mais}<span>Nova OS</span></button><a class="btn btn-linha" href="#of-apont">${I.relogio}<span>Apontar horas</span></a>` : '<span class="tag declarado">Só leitura</span>');
  function ligar(raizEl = U.tela) {
    U.$$('[data-of-nova]', raizEl).forEach((b) => b.onclick = () => formNova());
    U.$$('[data-os]', raizEl).forEach((b) => { b.onclick = (e) => { if (e.target.closest('a,[data-aponta]')) return; detalhe(b.dataset.os); }; if (b.tagName === 'TR') b.onkeydown = (e) => { if (e.key === 'Enter') detalhe(b.dataset.os); }; });
  }

  // ---------- LISTA DE OS ----------
  const fo = { sit: 'abertas', tipo: '', q: '' };
  function telaLista() {
    const antigos = O.preparosAntigos(est(), nomeMaqId, vh()).filter((x) => { const m = maq(x.maquina); return !fl().loja || !m || !m.loja || m.loja === fl().loja; });
    let l = visiveis().concat(fo.sit === 'entregues' || fo.sit === 'todas' ? antigos : []);
    l = l.filter((o) => (fo.sit === 'abertas' ? O.ABERTOS.includes(o.status) : fo.sit === 'entregues' ? o.status === 'entregue' : fo.sit === 'canceladas' ? o.status === 'cancelada' : true)
      && (!fo.tipo || o.tipo === fo.tipo) && (!fo.q || U.K.normal([o.numero, nomeMaq(o), nomeCli(o.cliente), o.chassi, o.problema, o.diagnostico, o.vendedor].join(' ')).includes(U.K.normal(fo.q))));
    l.sort((a, b) => String(b.abertura).localeCompare(String(a.abertura)) || String(b.numero).localeCompare(String(a.numero)));
    const ver = U.eu().perfil !== 'oficina' || true;
    U.tela.innerHTML = cab('Ordens de serviço', 'Preparo de usado, revisão, garantia de fábrica, conserto externo e entrega técnica. Preparos registrados antes no Pátio aparecem como "Preparo antigo".', botoes()) + `
      <section class="painel"><div class="fin-filtros">
        <div class="abas-modo" role="group" aria-label="Situação">${[['abertas', 'Em aberto'], ['entregues', 'Entregues'], ['canceladas', 'Canceladas'], ['todas', 'Todas']].map(([v, n]) => `<button type="button" data-sit="${v}" aria-pressed="${fo.sit === v}">${n}</button>`).join('')}</div>
        <div class="campos fin-campos"><div class="campo"><label for="ol-q">Buscar</label><input id="ol-q" value="${esc(fo.q)}" placeholder="Número, máquina, cliente, chassi"></div>
          <div class="campo"><label for="ol-tipo">Tipo</label><select id="ol-tipo">${opt([['', 'Todos']].concat(Object.entries(O.TIPOS)), fo.tipo)}</select></div></div></div>
        ${l.length ? `<div class="tabela-wrap"><table class="tabela fin-tab"><thead><tr><th>OS</th><th>Máquina e cliente</th><th class="oc-esconde">Abertura</th><th class="n">${ver ? 'Valor' : ''}</th><th>Situação</th></tr></thead><tbody>
          ${l.map((o) => `<tr data-os="${esc(o.id)}" class="clicavel" tabindex="0"><td><b>${esc(o.numero)}</b><span class="fin-sub">${esc(O.TIPOS[o.tipo])}</span></td><td><b>${esc(nomeMaq(o))}</b><span class="fin-sub">${esc(o.tipo === 'preparo' ? 'Usado do pátio' : nomeCli(o.cliente))}${o.loja ? ' · ' + esc(o.loja) : ''}</span></td>
            <td class="oc-esconde">${dBR(o.abertura)}</td><td class="n">${o.virtual ? brl(o.fechamento.custo) : brl(O.totais(o).total)}</td><td>${tagSt(o)}${atrasada(o) ? ' <span class="sit sit-vencido">Atrasada</span>' : ''}</td></tr>`).join('')}</tbody></table></div>` : vazio('Nenhuma OS com estes filtros.')}
        <div class="fin-rodape"><span>${l.length} ordens</span><button class="btn btn-linha" type="button" id="ol-csv">Exportar planilha</button></div></section>`;
    U.$$('[data-sit]', U.tela).forEach((b) => b.onclick = () => { fo.sit = b.dataset.sit; telaLista(); });
    U.$('#ol-tipo').onchange = (e) => { fo.tipo = e.target.value; telaLista(); };
    const q = U.$('#ol-q'); q.oninput = () => { fo.q = q.value; clearTimeout(telaLista.t); telaLista.t = setTimeout(() => { telaLista(); const i = U.$('#ol-q'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }, 300); };
    U.$('#ol-csv').onclick = () => U.baixarCSV(`anshur-os-${U.hojeISO()}.csv`, [['OS', 'Tipo', 'Situação', 'Abertura', 'Previsão', 'Loja', 'Cliente', 'Máquina', 'Chassi', 'Horímetro', 'Vendedor', 'Peças', 'Serviços', 'Terceiros', 'Total', 'Entregue em', 'Custo', 'Id']]
      .concat(l.map((o) => { const t = o.virtual ? { pecas: '', servicos: '', terceiros: '', total: '' } : O.totais(o); return [o.numero, O.TIPOS[o.tipo], O.STATUS[o.status], dBR(o.abertura), dBR(o.previsao), o.loja, nomeCli(o.cliente), nomeMaq(o), o.chassi || '', o.horimetro || '', o.vendedor || '', t.pecas, t.servicos, t.terceiros, t.total, o.fechamento ? dBR(o.fechamento.data) : '', o.fechamento ? (o.virtual ? o.fechamento.custo : o.fechamento.custo.total) : '', o.id]; })));
    ligar();
  }

  // ---------- NOVA OS ----------
  function formNova(pre = {}) {
    if (!editor()) { U.toast('Só a oficina, o gerente e o dono abrem OS.', true); return; }
    const maqs = U.K.cad.maquinas(), patio = maqs.filter((m) => m.origem === 'usado' && !m.vendido), vendedores = U.estado.usuarios.filter((u) => u.perfil === 'vendedor').map((u) => u.nome);
    const tipo = pre.tipo || 'revisao';
    U.abrirCamada('modal larga-modal', `<h2>Nova ordem de serviço</h2><p class="sub">O cliente e a máquina vêm do cadastro comum (nada duplicado). Preparo de usado vira custo da máquina; os outros tipos, conta a receber na entrega.</p>
      <form class="campos" style="margin-top:12px" novalidate>
        <div class="campo"><label for="on-tipo">Tipo *</label><select id="on-tipo">${opt(Object.entries(O.TIPOS), tipo)}</select></div>
        <div class="campo"><label for="on-loja">Loja</label><select id="on-loja">${optLojas(pre.loja || lojaPadrao())}</select></div>
        <div class="campo inteiro" data-so="preparo"><label for="on-usado">Usado do pátio *</label><select id="on-usado">${opt([['', 'Escolha']].concat(patio.map((m) => [m.id, `${m.nome} ${m.ano || ''}${m.chassi ? ' · ' + m.chassi : ''}${m.loja ? ' · ' + m.loja : ''}`])), pre.maquina || '')}</select></div>
        <div class="campo" data-nao="preparo"><label for="on-cli">Cliente *</label><input id="on-cli" list="dl-on-cli" autocomplete="off" value="${esc(nomeCli(pre.cliente))}" placeholder="Acha no cadastro ou cria"><datalist id="dl-on-cli">${U.K.cad.clientes().map((c) => `<option value="${esc(c.nome)}">`).join('')}</datalist></div>
        <div class="campo" data-nao="preparo"><label for="on-tel">Telefone (WhatsApp)</label><input id="on-tel" inputmode="tel" placeholder="Para mandar o orçamento"></div>
        <div class="campo inteiro" data-nao="preparo"><label for="on-maq">Máquina do cadastro</label><select id="on-maq">${opt([['', 'Máquina do cliente (escrever abaixo)']].concat(maqs.filter((m) => m.origem === 'nova' || m.vendido).map((m) => [m.id, `${m.nome} ${m.ano || ''}${m.chassi ? ' · ' + m.chassi : ''}${m.origem === 'nova' ? ' (nova)' : ' (vendida pela revenda)'}`])), pre.maquina || '')}</select></div>
        <div class="campo inteiro" data-nao="preparo" id="on-txt-c"><label for="on-txt">Máquina (marca, modelo, ano)</label><input id="on-txt" placeholder="Ex.: Valtra A134 2018"></div>
        <div class="campo"><label for="on-tm">Tipo de máquina</label><select id="on-tm">${opt(Object.entries(U.NOMES).concat([['outro', 'Outra']]), 'trator')}</select></div>
        <div class="campo"><label for="on-ch">Chassi / série</label><input id="on-ch"></div>
        <div class="campo"><label for="on-hr">Horímetro (h)</label><input id="on-hr" inputmode="numeric"></div>
        <div class="campo"><label for="on-prev">Previsão de entrega</label><input id="on-prev" type="date" value="${O.somarDias(U.hojeISO(), 3)}"></div>
        <div class="campo" data-nao="preparo"><label for="on-vend">Vendedor do cliente</label><select id="on-vend">${opt([['', '—']].concat(vendedores.map((n) => [n, n])), '')}</select></div>
        <div class="campo" data-so="garantia"><label for="on-fab">Fabricante (garantia)</label><input id="on-fab"></div>
        <div class="campo inteiro"><label for="on-prob">Relato do cliente / o que fazer</label><input id="on-prob" placeholder="Ex.: perdendo força e soltando fumaça preta"></div>
      </form><div class="acoes"><button class="btn btn-ouro" type="button" id="on-ok">Abrir OS</button><button class="btn btn-linha" type="button" id="on-nao">Cancelar</button></div>`, (c) => {
      const $ = (s) => U.$(s, c);
      const mostra = () => { const t = $('#on-tipo').value; U.$$('[data-so]', c).forEach((x) => { x.hidden = x.dataset.so !== t; }); U.$$('[data-nao]', c).forEach((x) => { x.hidden = x.dataset.nao === t; }); $('#on-txt-c').hidden = t === 'preparo' || !!$('#on-maq').value; };
      const preencher = (id) => { const m = maq(id); if (!m) return; $('#on-tm').value = m.tipo || 'outro'; $('#on-ch').value = m.chassi || ''; if (m.t && m.t.horas) $('#on-hr').value = m.t.horas; if (m.t && m.t.vendedor && $('#on-vend').querySelector(`option[value="${m.t.vendedor}"]`)) $('#on-vend').value = m.t.vendedor; $('#on-fab').value = m.marca || ''; };
      $('#on-tipo').onchange = mostra; $('#on-maq').onchange = () => { preencher($('#on-maq').value); mostra(); }; $('#on-usado').onchange = () => preencher($('#on-usado').value);
      $('#on-cli').oninput = () => { const cl = U.K.cad.clientes().find((x) => x.nome === $('#on-cli').value.trim()); if (cl && cl.telefone && !$('#on-tel').value) $('#on-tel').value = cl.telefone; };
      if (pre.maquina) preencher(pre.maquina); mostra();
      $('#on-nao').onclick = () => U.fecharCamada();
      $('#on-ok').onclick = () => {
        const t = $('#on-tipo').value, preparo = t === 'preparo';
        let cli = null; const cn = $('#on-cli').value.trim();
        if (!preparo && cn) { cli = U.K.cad.garantir('clientes', { nome: cn, telefone: $('#on-tel').value.trim() }); if ($('#on-tel').value.trim() && !cli.telefone) cli.telefone = $('#on-tel').value.trim(); }
        const os = tentar(() => O.criarOS(est(), { tipo: t, loja: $('#on-loja').value, cliente: cli ? cli.id : '', maquina: preparo ? $('#on-usado').value : $('#on-maq').value, maqTexto: preparo ? '' : $('#on-txt').value, tipoMaquina: $('#on-tm').value,
          chassi: $('#on-ch').value, horimetro: U.num($('#on-hr').value), previsao: $('#on-prev').value, vendedor: preparo ? '' : $('#on-vend').value, problema: $('#on-prob').value, garantiaFabricante: t === 'garantia' ? $('#on-fab').value.trim() : '', sufixo: sufixo() }, quem()));
        if (!os) return;
        gravar(`OS ${os.numero} aberta (${O.TIPOS[os.tipo]}) · ${nomeMaq(os)}${cli ? ' · ' + cli.nome : ''}`, os); U.toast(`OS ${os.numero} aberta.`); U.fecharCamada(true);
        if (!/^#of-/.test(location.hash)) location.hash = '#of-painel'; else U.rota();
        setTimeout(() => detalhe(os.id), 340);
      };
    });
  }

  // ---------- DETALHE DA OS ----------
  function detalheVirtual(o) {
    U.abrirCamada('gaveta', `<span class="tag declarado">Preparo antigo</span><h2 style="font-size:22px;margin-top:10px">${esc(nomeMaq(o))}</h2><p class="sub">Registrado no Pátio em ${dBR(o.abertura)}, antes da Oficina. Continua valendo como custo da máquina; novas OS de preparo somam a ele.</p>
      <ul class="lista-motivos" style="margin-top:12px">${o.itensAntigos.map((it) => `<li><span>${esc(it.desc || 'Item')}${it.horas ? ` · ${hs(it.horas)}` : ''}</span><b>${brl((+it.pecas || 0) + (+it.horas || 0) * vh())}</b></li>`).join('')}</ul>
      <p class="conta">Total: <b>${brl(o.fechamento.custo)}</b></p>${editor() ? `<div class="acoes"><button class="btn btn-ouro" type="button" id="dv-nova">Nova OS de preparo desta máquina</button></div>` : ''}`, (c) => { const b = U.$('#dv-nova', c); if (b) b.onclick = () => formNova({ tipo: 'preparo', maquina: o.maquina }); });
  }
  function detalhe(id, rolar = 0) {
    if (String(id).startsWith('OSP-')) { const v = O.preparosAntigos(est(), nomeMaqId, vh()).find((x) => x.id === id); if (v) detalheVirtual(v); return; }
    const os = O.acharOS(est(), id); if (!os) return;
    const PP = P(), ed = editor() && O.podeMexer(os), t = O.totais(os), cu = O.custo(est(), os, PP, { valorHora: vh() });
    const cli = U.K.cad.cliente(os.cliente), pend = PP ? O.pendentes(est(), os, PP) : [], aps = O.apontamentosDa(est(), os.id).slice().sort((a, b) => String(b.inicio).localeCompare(String(a.inicio)));
    const mecs = O.garantir(est()).mecanicos.filter((m) => !m.inativo), servs = O.garantir(est()).servicos.filter((s) => !s.tipoMaquina || s.tipoMaquina === os.tipoMaquina);
    const ck = O.checklistDe(est(), os.tipoMaquina), modelo = (maq(os.maquina) || {}).modelo || os.maqTexto;
    const docs = (os.docs || []).map((d) => est().documentos.find((x) => x.id === d)).filter(Boolean);
    const podeFin = F() && F().podeVer(U.eu().perfil) && raiz.FINANCEIRO_UI;
    const fch = os.fechamento;
    const pecasCat = PP ? PP.ativas(est()).slice().sort((a, b) => (PP.compativel(b, modelo) ? 1 : 0) - (PP.compativel(a, modelo) ? 1 : 0) || a.descricao.localeCompare(b.descricao)) : [];
    U.abrirCamada('gaveta larga', `
      <div class="ofc-tags" style="display:flex;gap:8px;flex-wrap:wrap"><span class="tag comprovado">${esc(O.TIPOS[os.tipo])}</span>${tagSt(os)}${atrasada(os) ? '<span class="sit sit-vencido">Atrasada</span>' : ''}</div>
      <h2 style="font-size:24px;margin-top:10px">${esc(os.numero)} · ${esc(nomeMaq(os))}</h2>
      <p class="sub">${[os.tipo === 'preparo' ? 'Usado do pátio' : cli ? cli.nome + (cli.telefone ? ' · ' + cli.telefone : '') : '', os.loja, 'aberta ' + dBR(os.abertura), os.previsao && 'previsão ' + dBR(os.previsao), os.chassi && 'chassi ' + os.chassi, os.horimetro && os.horimetro.toLocaleString('pt-BR') + ' h', os.vendedor && 'vendedor ' + os.vendedor].filter(Boolean).map(esc).join(' · ')}</p>
      ${ed ? `<div class="acoes">${(O.PASSOS[os.status] || []).map((s) => `<button class="btn btn-linha" type="button" data-st="${s}">${{ execucao: 'Em execução', aguardando: 'Aguardando peça', pronta: 'Marcar como pronta', aberta: 'Voltar para aberta' }[s]}</button>`).join('')}${os.status === 'pronta' ? '<button class="btn btn-ouro" type="button" id="od-entregar">Entregar e fechar</button>' : ''}<button class="btn btn-linha" type="button" id="od-cancelar">Cancelar OS</button></div>` : ''}
      ${os.status === 'cancelada' ? `<p class="conta neg">Cancelada por ${esc(os.cancelada.por)}: ${esc(os.cancelada.motivo)}${os.cancelada.devolvidas ? ' · peças devolvidas ao estoque' : ''}.</p>` : ''}
      ${fch ? `<section class="painel ofc-sec" style="margin-top:12px"><h2>${I.check}Entregue em ${dBR(fch.data)}</h2>
        <div class="det"><div><span>${os.tipo === 'preparo' ? 'Custo lançado na máquina' : 'Valor da OS'}</span><b>${brl(os.tipo === 'preparo' ? fch.custo.total : fch.venda)}</b></div><div><span>Custo (peças ${brl(fch.custo.pecas)} + ${hs(fch.custo.horas)} ${fch.custo.horasFonte})</span><b>${brl(fch.custo.total)}</b></div>
          <div><span>Recebido por</span><b>${esc(os.entrega.recebidoPor)}${os.entrega.documento ? ' · ' + esc(os.entrega.documento) : ''}</b></div><div><span>Garantia do serviço</span><b>${os.garantiaServico ? `${os.garantiaServico.dias} dias, até ${dBR(os.garantiaServico.ate)}` : 'Sem garantia'}</b></div></div>
        ${os.tipo === 'preparo' ? `<p class="conta">Preparo total desta máquina agora: <b>${brl(fch.custoMaquina)}</b> (entra no custo, na margem por marca e na DRE quando for vendida).</p>` : ''}
        ${fch.lancamentos.length ? `<p class="conta">No Financeiro: ${fch.lancamentos.map((l, i) => podeFin ? `<button class="link" type="button" data-lanc="${esc(l)}">conta a receber ${fch.lancamentos.length > 1 ? i + 1 : ''}</button>` : 'conta a receber').join(', ')}${fch.garantia ? ' · em Garantias a receber' : ''}.</p>` : os.tipo !== 'preparo' ? '<p class="conta">Sem cobrança (valor zero).</p>' : ''}
        ${os.entrega.assinatura ? `<img src="${esc(os.entrega.assinatura)}" alt="Assinatura de ${esc(os.entrega.recebidoPor)}" style="max-width:280px;width:100%;border:1px solid var(--borda);border-radius:10px;background:#fff">` : ''}</section>` : ''}

      <section class="ofc-sec"><h3>Diagnóstico</h3>
        <div class="campos"><div class="campo inteiro"><label for="od-prob">Relato do cliente</label><input id="od-prob" value="${esc(os.problema)}" ${ed ? '' : 'disabled'}></div>
          <div class="campo inteiro"><label for="od-diag">Diagnóstico da oficina</label><textarea id="od-diag" rows="3" ${ed ? '' : 'disabled'}>${esc(os.diagnostico)}</textarea></div>
          <div class="campo"><label for="od-prev">Previsão de entrega</label><input id="od-prev" type="date" value="${os.previsao || ''}" ${ed ? '' : 'disabled'}></div><div class="campo"><label for="od-hr">Horímetro (h)</label><input id="od-hr" inputmode="numeric" value="${os.horimetro || ''}" ${ed ? '' : 'disabled'}></div></div>
        ${ed ? '<div class="acoes"><button class="btn btn-linha btn-p" type="button" id="od-diag-ok">Salvar diagnóstico</button></div>' : ''}</section>

      <section class="ofc-sec"><h3>Checklist · ${esc(U.NOMES[os.tipoMaquina] || 'Máquina')} <span class="sub">${Object.values(os.checklist || {}).filter(Boolean).length} de ${ck.length} conferidos</span></h3>
        <ul class="ofc-check">${ck.map((it, i) => `<li><span>${esc(it)}</span><select data-ck="${i}" aria-label="${esc(it)}" ${ed ? '' : 'disabled'}>${opt([['', '—']].concat(Object.entries(O.NOTAS_CHECK)), (os.checklist || {})[it] || '')}</select></li>`).join('')}</ul>
        ${ed ? '<div class="acoes"><button class="btn btn-linha btn-p" type="button" id="od-ck-ok">Salvar checklist</button></div>' : ''}</section>

      <section class="ofc-sec"><h3>Orçamento <span class="sub">Total ${brl(t.total)}</span></h3>
        ${os.itens.length ? `<div class="tabela-wrap"><table class="tabela fin-tab"><thead><tr><th>Item</th><th class="n">Qtd</th><th class="n">Valor</th>${ed ? '<th></th>' : ''}</tr></thead><tbody>${os.itens.map((i) => `<tr><td><b>${esc(i.descricao)}</b><span class="fin-sub">${{ peca: 'Peça do estoque', servico: 'Serviço · ' + hs(i.horas), terceiro: 'Terceiro · custo ' + brl(i.custo) }[i.tipo]}</span></td><td class="n">${i.tipo === 'peca' ? (+i.qtd).toLocaleString('pt-BR') : '1'}</td><td class="n">${brl(i.qtd * i.preco)}</td>${ed ? `<td class="n"><button class="btn btn-linha btn-p" type="button" data-tirar="${esc(i.id)}" aria-label="Tirar ${esc(i.descricao)}">×</button></td>` : ''}</tr>`).join('')}</tbody></table></div>
          <p class="conta">Peças ${brl(t.pecas)} · serviços ${brl(t.servicos)} (${hs(t.horas)}) · terceiros ${brl(t.terceiros)}${t.desconto ? ' · desconto ' + brl(t.desconto) : ''} · <b>total ${brl(t.total)}</b></p>` : '<p class="sub">Nenhum item ainda.</p>'}
        ${ed ? `<datalist id="dl-od-pc">${pecasCat.map((p) => { const s = PP.posicao(est(), p.id, { loja: os.loja }).qtd; return `<option value="${esc(p.sku + ' · ' + p.descricao)}">${PP.compativel(p, modelo) ? 'serve neste modelo · ' : ''}${s} em estoque</option>`; }).join('')}</datalist>
          <div class="ofc-bloco"><div class="ofc-linha"><div class="campo"><label for="oi-pc">Peça do estoque</label><input id="oi-pc" list="dl-od-pc" autocomplete="off" placeholder="SKU ou descrição${modelo ? ' (as que servem no ' + esc(modelo) + ' vêm primeiro)' : ''}"></div><div class="campo"><label for="oi-pq">Qtd</label><input id="oi-pq" inputmode="decimal" value="1"></div><div class="campo"><label for="oi-pp">Preço un.</label><input id="oi-pp" inputmode="decimal" placeholder="do catálogo"></div><button class="btn btn-ouro btn-p" type="button" id="oi-pc-ok">Incluir</button></div></div>
          <div class="ofc-bloco"><div class="ofc-linha"><div class="campo"><label for="oi-sv">Serviço padrão ou mão de obra</label><select id="oi-sv">${opt([['', 'Mão de obra (escrever)']].concat(servs.map((s) => [s.id, `${s.nome} · ${hs(s.horas)}`])), servs[0] ? servs[0].id : '')}</select></div><div class="campo"><label for="oi-sh">Horas</label><input id="oi-sh" inputmode="decimal" value="${servs[0] ? String(servs[0].horas).replace('.', ',') : ''}"></div><div class="campo"><label for="oi-sd">Descrição</label><input id="oi-sd" placeholder="se for mão de obra"></div><button class="btn btn-ouro btn-p" type="button" id="oi-sv-ok">Incluir</button></div><p class="nota-rodape" style="margin:6px 0 0">Valor da hora: ${brl(vh())} (Configurações).</p></div>
          <div class="ofc-bloco"><div class="ofc-linha"><div class="campo"><label for="oi-td">Serviço de terceiro</label><input id="oi-td" placeholder="Ex.: retífica, torno, capotaria"></div><div class="campo"><label for="oi-tc">Custo</label><input id="oi-tc" inputmode="decimal"></div><div class="campo"><label for="oi-tp">Cobrar</label><input id="oi-tp" inputmode="decimal"></div><button class="btn btn-ouro btn-p" type="button" id="oi-tr-ok">Incluir</button></div></div>
          ${os.tipo !== 'preparo' ? `<div class="campos" style="margin-top:10px"><div class="campo"><label for="oi-desc">Desconto (R$)</label><input id="oi-desc" inputmode="decimal" value="${os.desconto ? String(os.desconto).replace('.', ',') : ''}"></div></div>` : ''}` : ''}</section>

      ${os.aprovacao && os.aprovacao.status !== 'dispensado' ? `<section class="ofc-sec"><h3>Aprovação do cliente <span class="sit sit-${os.aprovacao.status === 'aprovado' ? 'pago' : os.aprovacao.status === 'recusado' ? 'vencido' : 'hoje'}">${O.APROVACAO[os.aprovacao.status]}</span></h3>
        ${os.aprovacao.em ? `<p class="conta">${esc(O.APROVACAO[os.aprovacao.status])} em ${hora(os.aprovacao.em)} por ${esc(os.aprovacao.por || '')} · ${esc(os.aprovacao.via || '')} · ${brl(os.aprovacao.valor)}</p>` : ''}
        ${ed && os.itens.length ? `<div class="acoes"><a class="btn btn-ouro" id="od-zap" target="_blank" rel="noopener" href="${esc(O.linkAprovacao(os, { telefone: cli ? cli.telefone : '', revenda: U.A.revenda.nome, cliente: cli ? cli.nome : '', maquina: nomeMaq(os) }))}">${I.zap}Mandar orçamento no WhatsApp</a><button class="btn btn-linha" type="button" data-aprov="aprovado">Cliente aprovou</button><button class="btn btn-linha" type="button" data-aprov="recusado">Recusou</button></div><p class="nota-rodape">Abre o WhatsApp com o orçamento pronto${cli && cli.telefone ? '' : ' (sem telefone no cadastro: o WhatsApp pede o contato)'}. Você confere e envia.</p>` : ''}</section>` : ''}

      ${PP && os.itens.some((i) => i.tipo === 'peca') ? `<section class="ofc-sec"><h3>Peças do estoque <span class="sub">${os.loja ? 'loja ' + esc(os.loja) : ''}</span></h3>
        <ul class="lista-motivos">${[...new Set(os.itens.filter((i) => i.tipo === 'peca').map((i) => i.peca))].map((pid) => { const p = PP.peca(est(), pid), c = O.consumido(est(), os, pid, PP), orc = os.itens.filter((i) => i.peca === pid).reduce((s, i) => s + i.qtd, 0), s = PP.posicao(est(), pid, { loja: os.loja }).qtd;
          return `<li><span>${esc(p ? p.descricao : 'Peça')} <small class="sub">${esc(p ? p.sku : '')} · ${s} em estoque</small></span><b class="${c >= orc ? 'pos' : s < orc - c ? 'neg' : ''}">${c} de ${orc} baixadas</b></li>`; }).join('')}</ul>
        ${ed ? `<div class="acoes">${pend.length ? '<button class="btn btn-ouro btn-p" type="button" id="od-baixar">Baixar peças do estoque agora</button>' : ''}${os.itens.some((i) => i.tipo === 'peca' && O.consumido(est(), os, i.peca, PP) > 0) ? '<button class="btn btn-linha btn-p" type="button" id="od-devolver">Devolver ao estoque</button>' : ''}</div><p class="nota-rodape">O que faltar sai sozinho na entrega. Peça sem saldo: marque "Aguardando peça" e veja Peças › Compras.</p>` : ''}</section>` : ''}

      <section class="ofc-sec"><h3>Mecânicos e horas <span class="sub">${hs(O.horasApontadas(est(), os.id))} apontadas · ${hs(t.horas)} orçadas</span></h3>
        ${aps.length ? `<ul class="fin-saldos">${aps.map((a) => `<li><span><b>${esc(nomeMec(a.mecanico))}</b><span>${hora(a.inicio)} → ${a.fim ? hora(a.fim) : 'agora'}${a.manual ? ' · à mão' : ''}${a.obs ? ' · ' + esc(a.obs) : ''}</span></span>${a.fim ? `<b>${hs(a.horas)}</b>` : ed ? `<button class="btn btn-ouro btn-p" type="button" data-encerrar="${esc(a.id)}">Encerrar</button>` : '<b>em andamento</b>'}</li>`).join('')}</ul>` : '<p class="sub">Nenhum apontamento.</p>'}
        ${ed ? `<div class="ofc-bloco"><div class="ofc-linha"><div class="campo"><label for="oa-mec">Mecânico</label><select id="oa-mec">${opt(mecs.map((m) => [m.id, m.nome]), (mecs.find((m) => m.usuario === U.eu().id) || {}).id)}</select></div><div class="campo"><label for="oa-ini">Início (à mão)</label><input id="oa-ini" type="datetime-local"></div><div class="campo"><label for="oa-fim">Fim (à mão)</label><input id="oa-fim" type="datetime-local"></div><button class="btn btn-linha btn-p" type="button" id="oa-manual">Lançar</button></div>
          <div class="acoes" style="margin-top:8px"><button class="btn btn-ouro" type="button" id="oa-iniciar">${I.relogio}Iniciar agora</button></div></div>` : ''}</section>

      <section class="ofc-sec"><h3>Fotos e anexos <span class="sub">${docs.length}</span></h3>
        ${docs.length ? `<ul class="lista-motivos">${docs.map((d) => `<li><span>${esc(d.nome)} <small class="sub">${hora(d.quando)} · ${esc(d.usuario)}</small></span><button class="link" type="button" data-ver="${esc(d.id)}">Ver</button></li>`).join('')}</ul>` : '<p class="sub">Nenhum anexo. Foto da máquina na chegada, da peça trocada e da nota ajudam na garantia.</p>'}
        ${!leitura() && O.podeEditar(U.eu().perfil) ? '<label class="btn btn-linha" style="margin-top:8px">Anexar foto ou PDF<input type="file" id="od-arq" accept="image/*,.pdf" multiple class="sr"></label>' : ''}</section>

      ${['dono', 'gerente', 'financeiro', 'auditor', 'oficina'].includes(U.eu().perfil) && !fch ? `<section class="ofc-sec"><h3>Custo até agora</h3><div class="det"><div><span>Peças baixadas (custo médio)</span><b>${brl(cu.pecas)}</b></div><div><span>Mão de obra (${hs(cu.horas)} ${cu.horasFonte} × ${brl(vh())})</span><b>${brl(cu.maoDeObra)}</b></div><div><span>Terceiros</span><b>${brl(cu.terceiros)}</b></div><div><span>${os.tipo === 'preparo' ? 'Vai para o custo da máquina' : 'Resultado previsto'}</span><b>${brl(os.tipo === 'preparo' ? cu.total : t.total - cu.pecas - cu.terceiros)}</b></div></div></section>` : ''}

      <section class="ofc-sec"><h3>Histórico</h3><ul class="linha-tempo">${(os.historico || []).slice().reverse().map((h) => `<li>${esc(h.txt)}<span>${hora(h.quando)} · ${esc(h.por || '')}</span></li>`).join('')}</ul></section>`, (c) => {
      const $ = (s) => U.$(s, c), b = (s, f) => { const el = $(s); if (el) el.onclick = f; };
      setTimeout(() => { if (rolar) c.scrollTop = rolar; }, 80);
      const de_novo = (msg) => { if (msg) U.toast(msg); const y = c.scrollTop; U.rota(); setTimeout(() => detalhe(os.id, y), 300); };
      const salvarOS = (txt, msg) => { gravar(`${os.numero}: ${txt}`, os); de_novo(msg); };
      U.$$('[data-st]', c).forEach((x) => x.onclick = () => { if (tentar(() => O.mudarStatus(os, x.dataset.st, quem()))) salvarOS(`situação → ${O.STATUS[os.status]}`, 'Situação: ' + O.STATUS[os.status] + '.'); });
      b('#od-entregar', () => formEntregar(os));
      b('#od-cancelar', () => U.abrirCamada('modal', `<h2>Cancelar ${esc(os.numero)}?</h2><p class="sub">As peças já baixadas voltam ao estoque pelo mesmo custo. Nada vai para o Financeiro.</p><div class="campo" style="margin-top:12px"><label for="oc-mot">Motivo *</label><input id="oc-mot"></div><div class="acoes"><button class="btn btn-ouro" type="button" id="oc-ok">Cancelar OS</button><button class="btn btn-linha" type="button" id="oc-nao">Voltar</button></div>`, (m) => {
        U.$('#oc-nao', m).onclick = () => detalhe(os.id);
        U.$('#oc-ok', m).onclick = () => { if (tentar(() => O.cancelarOS(est(), os.id, U.$('#oc-mot', m).value, { PECAS: P(), quem: quem() }))) { gravar(`${os.numero} cancelada: ${os.cancelada.motivo}`, os); U.toast('OS cancelada.'); U.fecharCamada(true); U.rota(); } };
      }));
      b('#od-diag-ok', () => { os.problema = $('#od-prob').value.trim(); os.diagnostico = $('#od-diag').value.trim(); os.previsao = $('#od-prev').value; os.horimetro = U.num($('#od-hr').value) || os.horimetro; O.historico(os, quem(), 'Diagnóstico atualizado'); salvarOS('diagnóstico atualizado', 'Diagnóstico salvo.'); });
      b('#od-ck-ok', () => { const r = {}; U.$$('[data-ck]', c).forEach((s) => { if (s.value) r[ck[+s.dataset.ck]] = s.value; }); os.checklist = r; O.historico(os, quem(), `Checklist: ${Object.keys(r).length} de ${ck.length} itens`); salvarOS('checklist conferido', 'Checklist salvo.'); });
      U.$$('[data-tirar]', c).forEach((x) => x.onclick = () => { const it = tentar(() => O.removerItem(est(), os, x.dataset.tirar, P())); if (it) salvarOS(`item retirado do orçamento: ${it.descricao}`); });
      b('#oi-pc-ok', () => { const v = $('#oi-pc').value.trim(), sku = v.split(' · ')[0], p = PP && PP.ativas(est()).find((x) => x.sku === sku || PP.normal(x.descricao) === PP.normal(v) || (x.codFab && PP.normal(x.codFab) === PP.normal(v)));
        if (!p) { U.toast('Escolha a peça do catálogo (Peças › Catálogo).', true); return; }
        const it = tentar(() => O.adicionarItem(est(), os, { tipo: 'peca', peca: p.id, qtd: U.num($('#oi-pq').value), preco: $('#oi-pp').value.trim() ? U.num($('#oi-pp').value) : '' }, { PECAS: PP })); if (it) salvarOS(`peça no orçamento: ${it.qtd} × ${it.descricao}`); });
      const sv = $('#oi-sv'); if (sv) sv.onchange = () => { const s = servs.find((x) => x.id === sv.value); $('#oi-sh').value = s ? String(s.horas).replace('.', ',') : ''; };
      b('#oi-sv-ok', () => { const it = tentar(() => O.adicionarItem(est(), os, { tipo: 'servico', servico: sv.value, horas: U.num($('#oi-sh').value), descricao: $('#oi-sd').value }, { valorHora: vh() })); if (it) salvarOS(`serviço no orçamento: ${it.descricao} (${hs(it.horas)})`); });
      b('#oi-tr-ok', () => { const it = tentar(() => O.adicionarItem(est(), os, { tipo: 'terceiro', descricao: $('#oi-td').value, custo: U.num($('#oi-tc').value), preco: $('#oi-tp').value.trim() ? U.num($('#oi-tp').value) : '' })); if (it) salvarOS(`terceiro no orçamento: ${it.descricao}`); });
      const dsc = $('#oi-desc'); if (dsc) dsc.onchange = () => { os.desconto = Math.max(0, U.num(dsc.value)); if (os.aprovacao && os.aprovacao.status === 'aprovado') os.aprovacao = { status: 'pendente', antes: os.aprovacao }; salvarOS(`desconto ${brl(os.desconto)}`); };
      const z = $('#od-zap'); if (z) z.addEventListener('click', () => { O.historico(os, quem(), 'Orçamento enviado ao cliente pelo WhatsApp'); gravar(`${os.numero}: orçamento enviado pelo WhatsApp (${brl(t.total)})`, os); });
      U.$$('[data-aprov]', c).forEach((x) => x.onclick = () => { O.registrarAprovacao(os, x.dataset.aprov, { via: 'WhatsApp', quem: quem() }); salvarOS(`orçamento ${O.APROVACAO[x.dataset.aprov].toLowerCase()} pelo cliente`, 'Registrado.'); });
      b('#od-baixar', () => { const ms = tentar(() => O.consumir(est(), os, P(), {}, quem())); if (ms) salvarOS(`${ms.length} peças baixadas do estoque`, `${ms.length} ${ms.length === 1 ? 'peça baixada' : 'peças baixadas'}.`); });
      b('#od-devolver', () => U.confirmar('Devolver as peças?', 'Tudo o que saiu do estoque para esta OS volta pelo mesmo custo. O orçamento continua igual.', 'Devolver', () => { const ms = O.devolver(est(), os, P(), {}, quem()); O.historico(os, quem(), `${ms.length} peças devolvidas ao estoque`); gravar(`${os.numero}: ${ms.length} peças devolvidas ao estoque`, os); de_novo('Peças devolvidas.'); }));
      b('#oa-iniciar', () => { const a = tentar(() => O.iniciar(est(), { os: os.id, mecanico: $('#oa-mec').value }, quem())); if (a) salvarOS(`${nomeMec(a.mecanico)} começou`, 'Apontamento iniciado.'); });
      b('#oa-manual', () => { const i = $('#oa-ini').value, f = $('#oa-fim').value; if (!i || !f) { U.toast('Preencha início e fim.', true); return; }
        const a = tentar(() => O.apontarManual(est(), { os: os.id, mecanico: $('#oa-mec').value, inicio: new Date(i).toISOString(), fim: new Date(f).toISOString() }, quem())); if (a) salvarOS(`${nomeMec(a.mecanico)}: ${hs(a.horas)} lançadas à mão`, 'Horas lançadas.'); });
      U.$$('[data-encerrar]', c).forEach((x) => x.onclick = () => { const a = tentar(() => O.encerrar(est(), x.dataset.encerrar)); if (a) salvarOS(`${nomeMec(a.mecanico)} encerrou (${hs(a.horas)})`, 'Apontamento encerrado: ' + hs(a.horas) + '.'); });
      U.$$('[data-lanc]', c).forEach((x) => x.onclick = () => raiz.FINANCEIRO_UI.detalhe(x.dataset.lanc));
      const arq = $('#od-arq'); if (arq) arq.onchange = () => anexar(os, [...arq.files]);
      U.$$('[data-ver]', c).forEach((x) => x.onclick = () => verDoc(x.dataset.ver));
    });
  }

  // ---------- anexos: o mesmo mecanismo da Central de documentos (aparelho + pasta privada da revenda) ----------
  const idb = (modo, fn) => new Promise((ok, erro) => {
    const req = indexedDB.open('anshur', 1); req.onupgradeneeded = () => req.result.createObjectStore('kv'); req.onerror = () => erro(req.error);
    req.onsuccess = () => { const tx = req.result.transaction('kv', modo), st = tx.objectStore('kv'); const r = fn(st); tx.oncomplete = () => ok(r && r.result); tx.onerror = () => erro(tx.error); };
  });
  async function anexar(os, arquivos) {
    const NV = U.K.nuvem; let n = 0;
    for (const arq of arquivos) {
      if (arq.size > (NV ? NV.limiteDoc : 15 * 1024 * 1024)) { U.toast(`${arq.name}: arquivo grande demais.`, true); continue; }
      const id = 'd' + Date.now() + Math.random().toString(36).slice(2, 5);
      try { await idb('readwrite', (st) => st.put(arq, 'doc:' + id)); } catch (e) { /* original fica só nesta sessão */ }
      const doc = { id, nome: arq.name, tamanho: arq.size, tipo: /pdf$/i.test(arq.name) ? 'PDF' : 'Foto', quando: new Date().toISOString(), usuario: quem(), virou: 'OS ' + os.numero, os: os.id };
      if (NV) { try { doc.caminho = await NV.subirDoc(id, arq); } catch (e) { U.toast(`${arq.name}: não foi para o servidor (${e.message}).`, true); } }
      est().documentos.push(doc); os.docs = (os.docs || []).concat([id]); n++;
    }
    if (n) { O.historico(os, quem(), `${n} ${n === 1 ? 'anexo' : 'anexos'}`); gravar(`${os.numero}: ${n} ${n === 1 ? 'anexo' : 'anexos'}`, os); U.toast('Anexado.'); detalhe(os.id); }
  }
  async function verDoc(id) {
    const d = est().documentos.find((x) => x.id === id), NV = U.K.nuvem;
    if (NV && d && d.caminho) { const w = window.open('', '_blank'); try { const url = await NV.abrirDoc(d.caminho); if (w) w.location = url; else location.href = url; } catch (e) { if (w) w.close(); U.toast(e.message, true); } return; }
    try { const blob = await idb('readonly', (st) => st.get('doc:' + id)); if (!blob) { U.toast('O original não está neste aparelho.', true); return; } window.open(URL.createObjectURL(blob), '_blank'); } catch (e) { U.toast('Não foi possível abrir.', true); }
  }

  // ---------- ENTREGA com assinatura simples ----------
  function formEntregar(os) {
    const t = O.totais(os), cli = U.K.cad.cliente(os.cliente), preparo = os.tipo === 'preparo', PP = P();
    const pend = PP ? O.pendentes(est(), os, PP) : [];
    U.abrirCamada('modal larga-modal', `<h2>Entregar ${esc(os.numero)}</h2><p class="sub">${preparo ? 'O custo (peças a custo médio + horas × valor da hora + terceiros) entra no preparo do usado.' : t.total ? `Gera conta a receber de ${brl(t.total)} no Financeiro${os.tipo === 'garantia' ? ' (do fabricante) e entra em Garantias a receber' : ''}.` : 'Valor zero: não gera cobrança.'}${pend.length ? ` ${pend.length} ${pend.length === 1 ? 'peça ainda sai' : 'peças ainda saem'} do estoque agora.` : ''}</p>
      <form class="campos" style="margin-top:12px" novalidate>
        <div class="campo"><label for="oe-rec">Quem recebeu *</label><input id="oe-rec" value="${esc(preparo ? 'Pátio · ' + quem() : cli ? cli.nome : '')}"></div>
        <div class="campo"><label for="oe-doc">Documento (opcional)</label><input id="oe-doc" placeholder="CPF ou RG de quem retirou"></div>
        <div class="campo"><label for="oe-data">Data da entrega</label><input id="oe-data" type="date" value="${U.hojeISO()}"></div>
        <div class="campo"><label for="oe-gar">Garantia do serviço (dias)</label><input id="oe-gar" inputmode="numeric" value="${preparo ? 0 : 90}"></div>
        ${!preparo && t.total ? `<div class="campo"><label for="oe-venc">Vencimento</label><input id="oe-venc" type="date" value="${U.hojeISO()}"></div>${os.tipo !== 'garantia' ? '<div class="campo"><label for="oe-parc">Parcelas</label><input id="oe-parc" inputmode="numeric" value="1"></div>' : ''}` : ''}
        <div class="campo inteiro"><label>Assinatura de quem recebeu</label><canvas class="ofc-assina" id="oe-ass" aria-label="Área para assinar com o dedo ou o mouse"></canvas><button class="link" type="button" id="oe-limpa" style="justify-self:start">Limpar assinatura</button></div>
      </form><div class="acoes"><button class="btn btn-ouro" type="button" id="oe-ok">Entregar e fechar a OS</button><button class="btn btn-linha" type="button" id="oe-nao">Voltar</button></div>`, (c) => {
      const cv = U.$('#oe-ass', c), g = cv.getContext('2d'); let riscou = false, des = false;
      const ajusta = () => { const r = cv.getBoundingClientRect(); cv.width = Math.round(r.width); cv.height = Math.round(r.height); g.lineWidth = 2.2; g.lineCap = 'round'; g.strokeStyle = '#111820'; };
      setTimeout(ajusta, 60);
      const pt = (e) => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
      cv.onpointerdown = (e) => { des = true; cv.setPointerCapture(e.pointerId); const [x, y] = pt(e); g.beginPath(); g.moveTo(x, y); };
      cv.onpointermove = (e) => { if (!des) return; const [x, y] = pt(e); g.lineTo(x, y); g.stroke(); riscou = true; };
      cv.onpointerup = () => { des = false; };
      U.$('#oe-limpa', c).onclick = () => { g.clearRect(0, 0, cv.width, cv.height); riscou = false; };
      U.$('#oe-nao', c).onclick = () => detalhe(os.id);
      U.$('#oe-ok', c).onclick = () => {
        // assinatura reduzida (PNG pequeno) para caber no estado da revenda
        let ass = ''; if (riscou) { const m = document.createElement('canvas'); m.width = 320; m.height = Math.round(320 * cv.height / cv.width) || 100; m.getContext('2d').drawImage(cv, 0, 0, m.width, m.height); ass = m.toDataURL('image/png'); }
        const v = (s) => (U.$(s, c) ? U.$(s, c).value : '');
        const f = tentar(() => O.fechar(est(), os.id, { data: v('#oe-data'), recebidoPor: v('#oe-rec'), documento: v('#oe-doc'), garantiaDias: U.num(v('#oe-gar')), vencimento: v('#oe-venc') || v('#oe-data'), parcelas: Math.max(1, Math.floor(U.num(v('#oe-parc')) || 1)), assinatura: ass }, Object.assign(ctxFechar(), { clienteNome: cli ? cli.nome : '' })));
        if (!f) return;
        if (preparo) preparoVivo(os); if (os.tipo === 'garantia') garantiaViva(os);
        if (F()) U.K.aplicarFinanceiro(U.A.todasTrocas || U.A.trocas, est());
        gravar(`${os.numero} entregue a ${os.entrega.recebidoPor} · ${preparo ? 'preparo da máquina agora ' + brl(f.custoMaquina) : 'valor ' + brl(f.venda) + (f.lancamentos.length ? ' · conta a receber criada' : '')} · custo ${brl(f.custo.total)}`, os);
        U.toast(preparo ? `Preparo lançado na máquina: ${brl(f.custoMaquina)}.` : `OS entregue${f.lancamentos.length ? ' e conta a receber criada' : ''}.`); U.fecharCamada(true); U.rota(); setTimeout(() => detalhe(os.id), 320);
      };
    });
  }

  // ---------- APONTAR HORAS (tela do mecânico, botões grandes) ----------
  let mecSel = '';
  function telaApont() {
    const ms = O.garantir(est()).mecanicos.filter((m) => !m.inativo);
    if (!ms.length) { U.tela.innerHTML = cab('Apontar horas', 'Cadastre os mecânicos primeiro.', editor() ? '<a class="btn btn-ouro" href="#of-mecanicos">Cadastrar mecânicos</a>' : '') ; return; }
    if (!ms.some((m) => m.id === mecSel)) mecSel = (ms.find((m) => m.usuario === U.eu().id) || ms[0]).id;
    const ab = O.apontamentoAberto(est(), mecSel), osAb = ab ? O.acharOS(est(), ab.os) : null, ed = editor();
    const lista = visiveis().filter((o) => ['aberta', 'aguardando', 'execucao'].includes(o.status)).sort((a, b) => (b.status === 'execucao') - (a.status === 'execucao') || String(a.numero).localeCompare(String(b.numero)));
    const hoje = O.garantir(est()).apontamentos.filter((a) => a.mecanico === mecSel && String(a.inicio).slice(0, 10) === U.hojeISO());
    U.tela.innerHTML = cab('Apontar horas', 'Toque em Iniciar quando começar e em Encerrar quando parar. As horas apontadas viram o custo de mão de obra da OS.', '') + `
      <section class="painel"><div class="campos fin-campos" style="margin-bottom:14px"><div class="campo"><label for="ap-mec">Mecânico</label><select id="ap-mec">${opt(ms.map((m) => [m.id, m.nome]), mecSel)}</select></div></div>
        ${ab ? `<div class="ofc-aponta" style="border-color:var(--ouro)"><div><b>Trabalhando em ${esc(osAb ? osAb.numero : '')}</b><span>${esc(osAb ? nomeMaq(osAb) : '')} · desde ${hora(ab.inicio)}</span></div><span class="ofc-relogio" id="ap-rel" data-ini="${esc(ab.inicio)}"></span>${ed ? `<button class="btn btn-ouro ofc-grande" type="button" data-fim="${esc(ab.id)}">Encerrar</button>` : ''}</div>`
        : '<p class="conta">Nenhum apontamento aberto. Escolha a OS e toque em Iniciar.</p>'}</section>
      <section class="painel bloco"><div class="painel-cab"><h2>${I.chave}OS para trabalhar</h2><p>${lista.length}</p></div>
        ${lista.length ? lista.map((o) => `<div class="ofc-aponta" data-os="${esc(o.id)}"><div><b>${esc(o.numero)} · ${esc(nomeMaq(o))}</b><span>${esc(O.TIPOS[o.tipo])} · ${esc(O.STATUS[o.status])}${o.diagnostico ? ' · ' + esc(o.diagnostico.slice(0, 60)) : ''}</span></div>${ed && !ab ? `<button class="btn btn-ouro ofc-grande" type="button" data-aponta="${esc(o.id)}">Iniciar</button>` : ''}</div>`).join('') : vazio('Nenhuma OS aberta.')}</section>
      <section class="painel bloco"><div class="painel-cab"><h2>${I.relogio}Hoje</h2><p>${hs(hoje.reduce((s, a) => s + (a.fim ? a.horas : (Date.now() - new Date(a.inicio)) / 3.6e6), 0))}</p></div>
        ${hoje.length ? `<ul class="fin-saldos">${hoje.map((a) => { const o = O.acharOS(est(), a.os); return `<li><span><b>${esc(o ? o.numero : '')}</b><span>${hora(a.inicio)} → ${a.fim ? hora(a.fim) : 'agora'}</span></span><b>${a.fim ? hs(a.horas) : 'em andamento'}</b></li>`; }).join('')}</ul>` : vazio('Nada apontado hoje.')}</section>`;
    U.$('#ap-mec').onchange = (e) => { mecSel = e.target.value; telaApont(); };
    U.$$('[data-aponta]', U.tela).forEach((b) => b.onclick = (e) => { e.stopPropagation(); const o = O.acharOS(est(), b.dataset.aponta); const a = tentar(() => O.iniciar(est(), { os: o.id, mecanico: mecSel }, quem())); if (a) { gravar(`${o.numero}: ${nomeMec(mecSel)} começou`, o); U.toast('Iniciado.'); telaApont(); } });
    U.$$('[data-fim]', U.tela).forEach((b) => b.onclick = () => { const a = tentar(() => O.encerrar(est(), b.dataset.fim)); if (a) { gravar(`${osAb ? osAb.numero : 'OS'}: ${nomeMec(a.mecanico)} encerrou (${hs(a.horas)})`, osAb); U.toast('Encerrado: ' + hs(a.horas) + '.'); telaApont(); } });
    const rel = U.$('#ap-rel');
    if (rel) { const tick = () => { if (!document.body.contains(rel)) return; const s = Math.max(0, Math.floor((Date.now() - new Date(rel.dataset.ini)) / 1000)); rel.textContent = `${String(Math.floor(s / 3600)).padStart(2, '0')}:${String(Math.floor(s / 60) % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; setTimeout(tick, 1000); }; tick(); }
    ligar();
  }

  // ---------- VENDEDOR: só a situação das OS dos clientes dele ----------
  function telaStatus() {
    const l = O.garantir(est()).os.filter((o) => O.doVendedor(o, quem())).sort((a, b) => (O.ABERTOS.includes(b.status) - O.ABERTOS.includes(a.status)) || String(b.abertura).localeCompare(String(a.abertura)));
    U.tela.innerHTML = cab('OS dos meus clientes', 'A situação das máquinas dos seus clientes na oficina. Valores e detalhes ficam com a oficina e o gerente.', '') + `
      <section class="painel">${l.length ? `<div class="tabela-wrap"><table class="tabela fin-tab"><thead><tr><th>OS</th><th>Cliente e máquina</th><th>Situação</th><th class="oc-esconde">Previsão</th></tr></thead><tbody>
        ${l.map((o) => `<tr><td><b>${esc(o.numero)}</b><span class="fin-sub">${esc(O.TIPOS[o.tipo])}</span></td><td><b>${esc(nomeCli(o.cliente) || '—')}</b><span class="fin-sub">${esc(nomeMaq(o))}</span></td><td>${tagSt(o)}${o.aprovacao && o.aprovacao.status === 'pendente' && o.itens.length && O.ABERTOS.includes(o.status) ? ' <span class="sit sit-hoje">Esperando o cliente aprovar</span>' : ''}</td><td class="oc-esconde">${o.status === 'entregue' ? 'Entregue ' + dBR(o.entrega && o.entrega.data) : dBR(o.previsao)}</td></tr>`).join('')}</tbody></table></div>`
        : vazio('Nenhuma OS de cliente seu. Quando a oficina abrir uma OS e marcar você como vendedor do cliente, ela aparece aqui.')}</section>`;
  }

  // ---------- CADASTROS DA OFICINA: serviços padrão, mecânicos e checklists ----------
  function telaServicos() {
    const l = O.garantir(est()).servicos.slice().sort((a, b) => a.nome.localeCompare(b.nome)), ed = editor();
    U.tela.innerHTML = cab('Serviços padrão', `Tempo padrão de cada serviço: entra no orçamento como horas × valor da hora (${brl(vh())}) ou pelo preço fixo.`, ed ? `<button class="btn btn-ouro" type="button" id="sv-novo">${I.mais}<span>Novo serviço</span></button>` : '') + `
      <section class="painel">${l.length ? `<div class="tabela-wrap"><table class="tabela fin-tab"><thead><tr><th>Serviço</th><th class="n">Tempo</th><th class="n">Preço</th></tr></thead><tbody>${l.map((s) => `<tr ${ed ? `data-sv="${esc(s.id)}" class="clicavel" tabindex="0"` : ''}><td><b>${esc(s.nome)}</b><span class="fin-sub">${esc(s.tipoMaquina ? U.NOMES[s.tipoMaquina] || s.tipoMaquina : 'Qualquer máquina')}</span></td><td class="n">${hs(s.horas)}</td><td class="n">${brl(s.preco || s.horas * vh())}${s.preco ? '' : ' <small class="sub">por hora</small>'}</td></tr>`).join('')}</tbody></table></div>` : vazio('Nenhum serviço padrão.')}</section>`;
    const form = (s = {}) => U.formulario(s.id ? 'Editar serviço' : 'Novo serviço padrão', [{ k: 'nome', r: 'Serviço', obr: true, inteiro: true }, { k: 'horas', r: 'Tempo padrão (horas)', num: true, obr: true }, { k: 'tipoMaquina', r: 'Tipo de máquina', tipo: 'select', ops: [['', 'Qualquer']].concat(Object.entries(U.NOMES)) }, { k: 'preco', r: 'Preço fixo (R$, opcional)', num: true }],
      Object.assign({}, s, { horas: s.horas ? String(s.horas).replace('.', ',') : '', preco: s.preco ? String(s.preco).replace('.', ',') : '' }), (v) => { const x = tentar(() => O.salvarServico(est(), Object.assign({ id: s.id }, v))); if (!x) return; gravar(`Serviço padrão ${s.id ? 'alterado' : 'criado'}: ${x.nome} (${hs(x.horas)})`); U.fecharCamada(true); telaServicos(); });
    const n = U.$('#sv-novo'); if (n) n.onclick = () => form();
    U.$$('[data-sv]', U.tela).forEach((r) => r.onclick = () => form(O.garantir(est()).servicos.find((s) => s.id === r.dataset.sv)));
  }
  function telaMecanicos() {
    const l = O.garantir(est()).mecanicos, ed = editor(), us = U.estado.usuarios;
    U.tela.innerHTML = cab('Mecânicos', 'Quem trabalha na oficina. Ligue ao usuário do sistema para a tela de apontamento já abrir no nome dele.', ed ? `<button class="btn btn-ouro" type="button" id="mc-novo">${I.mais}<span>Novo mecânico</span></button>` : '') + `
      <section class="painel">${l.length ? `<ul class="fin-saldos">${l.map((m) => { const h = O.garantir(est()).apontamentos.filter((a) => a.mecanico === m.id && a.fim && U.diasDesde(a.inicio.slice(0, 10)) <= 30).reduce((s, a) => s + a.horas, 0); return `<li ${ed ? `data-mc="${esc(m.id)}" style="cursor:pointer"` : ''}><span><b>${esc(m.nome)}${m.inativo ? ' (inativo)' : ''}</b><span>${[m.especialidade, m.loja, m.usuario && 'usuário ' + ((us.find((u) => u.id === m.usuario) || {}).nome || '')].filter(Boolean).map(esc).join(' · ') || '—'}</span></span><b>${hs(h)} <small class="sub">em 30 dias</small></b></li>`; }).join('')}</ul>` : vazio('Nenhum mecânico cadastrado.')}</section>`;
    const form = (m = {}) => U.formulario(m.id ? 'Editar mecânico' : 'Novo mecânico', [{ k: 'nome', r: 'Nome', obr: true }, { k: 'especialidade', r: 'Especialidade' }, { k: 'loja', r: 'Loja', tipo: 'select', ops: [['', '—']].concat(lojas().map((x) => [x, x])) }, { k: 'usuario', r: 'Usuário do sistema', tipo: 'select', ops: [['', 'Nenhum']].concat(us.map((u) => [u.id, u.nome])) }, { k: 'inativo', r: 'Situação', tipo: 'select', ops: [['', 'Ativo'], ['1', 'Inativo']] }],
      Object.assign({}, m, { inativo: m.inativo ? '1' : '' }), (v) => { const x = tentar(() => O.salvarMecanico(est(), Object.assign({ id: m.id }, v, { inativo: v.inativo === '1' }))); if (!x) return; gravar(`Mecânico ${m.id ? 'alterado' : 'cadastrado'}: ${x.nome}`); U.fecharCamada(true); telaMecanicos(); });
    const n = U.$('#mc-novo'); if (n) n.onclick = () => form();
    U.$$('[data-mc]', U.tela).forEach((r) => r.onclick = () => form(l.find((m) => m.id === r.dataset.mc)));
  }
  function telaChecklists() {
    const ed = editor(), tipos = Object.keys(O.CHECKLISTS_PADRAO);
    U.tela.innerHTML = cab('Checklists', 'O que conferir em cada tipo de máquina. Um item por linha. Aparece em toda OS daquele tipo.', '') + `<div class="grade-2">${tipos.map((t) => `<section class="painel"><h2>${esc(U.NOMES[t] || 'Outras máquinas')}</h2>
      <div class="campo" style="margin-top:10px"><label for="ck-${t}">Itens</label><textarea id="ck-${t}" rows="${O.checklistDe(est(), t).length + 1}" ${ed ? '' : 'disabled'}>${esc(O.checklistDe(est(), t).join('\n'))}</textarea></div>
      ${ed ? `<div class="acoes"><button class="btn btn-linha btn-p" type="button" data-ck="${t}">Salvar</button></div>` : ''}</section>`).join('')}</div>`;
    U.$$('[data-ck]', U.tela).forEach((b) => b.onclick = () => { const t = b.dataset.ck, x = tentar(() => O.salvarChecklist(est(), t, U.$('#ck-' + t).value.split('\n'))); if (x) { gravar(`Checklist de ${U.NOMES[t] || t} atualizado (${x.itens.length} itens)`); U.toast('Checklist salvo.'); } });
  }

  // ---------- demonstração: OS fictícias ligadas às máquinas, clientes e peças da demo ----------
  function semear(ui) {
    U = ui; const e = ui.estado; if (ui.OP) return; // nunca no ambiente real
    if (raiz.PECAS_UI) raiz.PECAS_UI.semear(ui);
    const OF = O.garantir(e); if (OF.semente) return;
    const PP = P(), Fin = F(), hoje = ui.hojeISO(), d = (n) => O.somarDias(hoje, -n), ag = (n, h = 0) => new Date(Date.now() - n * 864e5 - h * 3600e3).toISOString();
    const loja = e.lojas[0] || '', vhr = +ui.K.cfg.valorHora || 180;
    const zé = e.usuarios.find((u) => u.perfil === 'oficina');
    const mz = O.salvarMecanico(e, { nome: zé ? zé.nome : 'Zé da Oficina', usuario: zé ? zé.id : '', loja, especialidade: 'Motor e transmissão' });
    const mp = O.salvarMecanico(e, { nome: 'Paulo Henrique (fictício)', loja, especialidade: 'Hidráulica e elétrica' });
    const me = O.salvarMecanico(e, { nome: 'Edson Lima (fictício)', loja: e.lojas[1] || loja, especialidade: 'Colhedoras' });
    const SV = [['Revisão de 500 h', 5, 'trator'], ['Revisão de 1.000 h', 8, 'trator'], ['Troca de embreagem', 12, 'trator'], ['Preparo para venda (revisão e limpeza)', 6, ''], ['Revisão de entressafra da colhedora', 24, 'colhedora'],
      ['Troca de facas do picador', 4, 'colhedora'], ['Calibração e troca de bicos', 3, 'pulverizador'], ['Revisão da plantadeira', 6, 'plantadeira'], ['Entrega técnica', 3, ''], ['Diagnóstico eletrônico', 1.5, '']]
      .map(([nome, horas, tm]) => O.salvarServico(e, { nome, horas, tipoMaquina: tm }));
    const sv = (nome) => SV.find((s) => s.nome.startsWith(nome)).id;
    const pc = (cod) => (PP ? (PP.ativas(e).find((p) => p.codFab === cod) || {}).id : '');
    const cli = ui.K.cad.clientes().length ? ui.K.cad.clientes() : (ui.A.compradores || []).slice(0, 8).map((c) => ui.K.garantirCadastro(e, 'clientes', { nome: c.nome, cidade: c.cidade }));
    const trocas = ui.A.todasTrocas || ui.A.trocas || [], patio = trocas.filter((t) => !t.vendido && !(e.preparos || {})[t.id]), vendidas = trocas.filter((t) => t.vendido).slice(-12);
    const novas = (ui.A.financiadas || []).filter((f) => f.venda);
    const contaBB = Fin && Fin.conta(e, 'CT-BB') ? 'CT-BB' : '';
    const nova = (dias, dd) => { const os = O.criarOS(e, Object.assign({ loja, abertura: d(dias), previsao: d(dias - 4) }, dd), 'Zé da Oficina', ag(dias)); return os; };
    const itens = (os, l) => l.forEach((it) => { try { O.adicionarItem(e, os, it, { PECAS: PP, valorHora: vhr }); } catch (er) { /* peça sem cadastro na demo */ } });
    const apontar = (os, mec, dias, h, inicioH = 8) => { const i = new Date(d(dias) + `T${String(inicioH).padStart(2, '0')}:00:00`); O.apontarManual(e, { os: os.id, mecanico: mec.id, inicio: i.toISOString(), fim: new Date(i.getTime() + h * 3600e3).toISOString() }, mec.nome); };
    const entregar = (os, dias, rec, extra = {}) => { O.registrarAprovacao(os, os.aprovacao.status === 'dispensado' ? 'dispensado' : 'aprovado', { via: 'WhatsApp', quem: 'Carlos', agora: ag(dias + 2) }); os.status = 'pronta';
      const f = O.fechar(e, os.id, Object.assign({ data: d(dias), recebidoPor: rec, garantiaDias: os.tipo === 'preparo' ? 0 : 90, vencimento: d(dias) }, extra), { PECAS: PP, F: Fin, valorHora: vhr, quem: 'Zé da Oficina', agora: ag(dias), garantias: e.extras.garantias, clienteNome: nomeCliE(os.cliente), maquina: (id) => { const m = id && ui.K.cad.maquina(id); return m ? { nome: m.nome, marca: m.marca, modelo: m.modelo } : null; } });
      return f; };
    const nomeCliE = (id) => { const c = id && ui.K.cad.cliente(id); return c ? c.nome : ''; };
    // 1) preparo de usado entregue: vira custo da máquina
    if (patio[0]) { const t = patio[0], os = nova(20, { tipo: 'preparo', maquina: t.id, tipoMaquina: t.tipo, chassi: t.chassi || '', horimetro: t.horas, problema: 'Preparo para venda: revisão, filtros e lavagem' });
      os.diagnostico = 'Filtros vencidos, óleo escuro, farol de trabalho queimado.'; itens(os, [{ tipo: 'peca', peca: pc('FX-10021'), qtd: 1 }, { tipo: 'peca', peca: pc('LB-1540'), qtd: 2 }, { tipo: 'peca', peca: pc('FX-60110'), qtd: 1 }, { tipo: 'servico', servico: sv('Preparo para venda') }, { tipo: 'terceiro', descricao: 'Lavagem com polimento (fictício)', custo: 350, preco: 350 }]);
      apontar(os, mz, 19, 4); apontar(os, mp, 18, 3); try { entregar(os, 16, 'Pátio · Carlos'); preparoVivoE(os); } catch (er) { /* demo */ } }
    // 2) preparo em execução, com peça já baixada e mecânico apontando agora
    if (patio[1]) { const t = patio[1], os = nova(3, { tipo: 'preparo', maquina: t.id, tipoMaquina: t.tipo, horimetro: t.horas, problema: 'Preparo para venda' });
      os.diagnostico = 'Vazamento no cilindro do levante; correia do alternador gasta.'; itens(os, [{ tipo: 'peca', peca: pc('HD-KV80'), qtd: 1 }, { tipo: 'peca', peca: pc('FX-30981'), qtd: 1 }, { tipo: 'servico', servico: sv('Preparo para venda') }]);
      try { O.mudarStatus(os, 'execucao', 'Zé da Oficina', ag(2)); O.consumir(e, os, PP, { data: d(2), so: [pc('FX-30981')] }, 'Zé da Oficina', ag(2)); } catch (er) { /* sem saldo na demo */ }
      apontar(os, mz, 2, 3); O.garantir(e).apontamentos.push({ id: O.novoId('AP'), os: os.id, mecanico: mp.id, inicio: ag(0, 1.5), fim: '', horas: 0, obs: '', por: mp.nome }); if (!os.mecanicos.includes(mp.id)) os.mecanicos.push(mp.id); }
    // 3) revisão de cliente entregue e recebida
    const v0 = vendidas[0];
    if (v0 && cli[0]) { const os = nova(12, { tipo: 'revisao', cliente: cli[0].id, maquina: v0.id, tipoMaquina: v0.tipo, horimetro: (v0.horas || 0) + 480, vendedor: v0.vendedor || 'Rodrigo', problema: 'Revisão de 500 h' });
      os.diagnostico = 'Revisão conforme manual; nada fora do normal.'; itens(os, [{ tipo: 'peca', peca: pc('FX-10021'), qtd: 1 }, { tipo: 'peca', peca: pc('FX-10044'), qtd: 1 }, { tipo: 'peca', peca: pc('LB-1540'), qtd: 2 }, { tipo: 'servico', servico: sv('Revisão de 500') }]);
      apontar(os, mz, 10, 5);
      try { const f = entregar(os, 9, cli[0].nome); if (Fin && contaBB && f.lancamentos[0]) Fin.baixar(e, f.lancamentos[0], { data: d(8), forma: 'pix', conta: contaBB }, 'Lúcia', ag(8)); } catch (er) { /* demo */ } }
    // 4) revisão esperando o cliente aprovar (cliente do vendedor Rodrigo)
    const v1 = vendidas[1];
    if (v1 && cli[1]) { const os = nova(2, { tipo: 'revisao', cliente: cli[1].id, maquina: v1.id, tipoMaquina: v1.tipo, horimetro: (v1.horas || 0) + 960, vendedor: 'Rodrigo', problema: 'Revisão de 1.000 h e barulho no câmbio', previsao: O.somarDias(hoje, 3) });
      os.diagnostico = 'Rolamento da caixa com folga; trocar filtro hidráulico.'; os.checklist = { 'Nível e vazamento de óleo do motor': 'ok', 'Embreagem e transmissão': 'trocar' };
      itens(os, [{ tipo: 'peca', peca: pc('FX-20377'), qtd: 1 }, { tipo: 'peca', peca: pc('LB-HT20'), qtd: 3 }, { tipo: 'servico', servico: sv('Revisão de 1.000') }, { tipo: 'terceiro', descricao: 'Usinagem do eixo (torno, fictício)', custo: 900, preco: 1250 }]); }
    // 5) conserto externo aguardando peça (kit de vedação está em outra loja)
    if (cli[2]) { const os = nova(5, { tipo: 'conserto', cliente: cli[2].id, maqTexto: 'Jacto Uniport 3030 2017 (do cliente)', tipoMaquina: 'pulverizador', horimetro: 6210, vendedor: 'Rodrigo', problema: 'Vazando óleo no cilindro da barra' });
      os.diagnostico = 'Retentores do cilindro da barra direita vencidos.'; itens(os, [{ tipo: 'peca', peca: pc('HD-KV80'), qtd: 2 }, { tipo: 'peca', peca: pc('HD-12M'), qtd: 3 }, { tipo: 'servico', descricao: 'Troca de vedação dos cilindros', horas: 4 }]);
      O.registrarAprovacao(os, 'aprovado', { via: 'WhatsApp', quem: 'Carlos', agora: ag(4) }); O.mudarStatus(os, 'execucao', 'Zé da Oficina', ag(4)); O.mudarStatus(os, 'aguardando', 'Zé da Oficina', ag(4)); apontar(os, mp, 4, 1.5); }
    // 6) garantia de fábrica pronta para entregar (máquina nova vendida)
    if (novas[0] && cli[3]) { const f0 = novas[0], os = nova(6, { tipo: 'garantia', cliente: cli[3].id, maquina: 'F:' + f0.chassi, tipoMaquina: f0.tipo, chassi: f0.chassi, horimetro: 310, garantiaFabricante: f0.marca, problema: 'Sensor de rotação com falha intermitente' });
      os.diagnostico = 'Chicote do sensor rompido; troca em garantia.'; itens(os, [{ tipo: 'peca', peca: pc('FX-60110'), qtd: 1 }, { tipo: 'servico', servico: sv('Diagnóstico eletrônico') }, { tipo: 'servico', descricao: 'Troca do chicote do sensor', horas: 3 }]);
      O.mudarStatus(os, 'execucao', 'Zé da Oficina', ag(5)); apontar(os, mz, 5, 4.5); O.mudarStatus(os, 'pronta', 'Zé da Oficina', ag(1)); }
    // 7) entrega técnica de máquina nova (sem cobrança: faz parte da venda)
    if (novas[1] && cli[4]) { const f1 = novas[1], os = nova(15, { tipo: 'entrega', cliente: cli[4].id, maquina: 'F:' + f1.chassi, tipoMaquina: f1.tipo, chassi: f1.chassi, horimetro: 2, problema: 'Entrega técnica na fazenda' });
      itens(os, [{ tipo: 'servico', servico: sv('Entrega técnica'), preco: 0 }]); apontar(os, mz, 14, 3, 7); try { entregar(os, 14, cli[4].nome, { garantiaDias: 0 }); } catch (er) { /* demo */ } }
    // 8) conserto entregue a prazo, ainda em aberto (aparece na inadimplência do Financeiro)
    const v2 = vendidas[2];
    if (v2 && cli[5]) { const os = nova(26, { tipo: 'conserto', cliente: cli[5].id, maquina: v2.id, tipoMaquina: v2.tipo, horimetro: (v2.horas || 0) + 300, vendedor: 'Rodrigo', problema: 'Não liga o farol e luz do painel piscando' });
      os.diagnostico = 'Relé queimado e conector oxidado.'; itens(os, [{ tipo: 'peca', peca: pc('FX-60110'), qtd: 2 }, { tipo: 'servico', descricao: 'Revisão elétrica', horas: 3 }]); apontar(os, mp, 25, 3);
      try { entregar(os, 23, cli[5].nome, { vencimento: d(8) }); } catch (er) { /* demo */ } }
    // 9) colhedora em execução na outra loja
    const col = vendidas.find((t) => t.tipo === 'colhedora');
    if (col && cli[6]) { const os = nova(4, { tipo: 'revisao', loja: e.lojas[0] || '', cliente: cli[6].id, maquina: col.id, tipoMaquina: 'colhedora', horimetro: (col.horas || 0) + 1200, vendedor: col.vendedor || '', problema: 'Revisão de entressafra' });
      itens(os, [{ tipo: 'peca', peca: pc('FX-41200'), qtd: 1 }, { tipo: 'peca', peca: pc('FX-41255'), qtd: 4 }, { tipo: 'servico', servico: sv('Revisão de entressafra') }]);
      O.registrarAprovacao(os, 'aprovado', { via: 'Presencial', quem: 'Carlos', agora: ag(3) }); O.mudarStatus(os, 'execucao', 'Edson', ag(3)); apontar(os, me, 3, 8, 7); apontar(os, me, 2, 8, 7); try { O.consumir(e, os, PP, { data: d(2) }, me.nome, ag(2)); } catch (er) { /* demo */ } }
    function preparoVivoE(os) { const m = ui.K.cad.maquina(os.maquina), p = e.preparos[os.maquina]; if (m && m.t && p) { m.t.preparo = p.valor; m.t.preparoRegistrado = p.data; m.t.preparoItens = p.itens; } }
    e.extras.garantias.filter((g) => g.origemOS && ui.A.garantias && !ui.A.garantias.includes(g)).forEach((g) => ui.A.garantias.push(g));
    if (Fin) ui.K.aplicarFinanceiro(trocas, e);
    OF.semente = true;
    ui.salvar();
  }

  // ---------- busca global ----------
  function buscar(q, ui) {
    if (!q || q.length < 2) return [];
    U = ui; const perfil = ui.eu().perfil, s = ui.K.normal(q);
    const l = O.garantir(ui.estado).os.filter((o) => (O.podeVer(perfil) || (perfil === 'vendedor' && O.doVendedor(o, ui.eu().nome))) && ui.K.normal([o.numero, nomeMaq(o), nomeCli(o.cliente), o.chassi, o.problema].join(' ')).includes(s)).slice(0, 6);
    return l.map((o) => ({ g: 'Oficina', n: `${o.numero} · ${nomeMaq(o)}`, d: `${O.TIPOS[o.tipo]} · ${O.STATUS[o.status]}${o.cliente ? ' · ' + nomeCli(o.cliente) : ''}`, ir: () => { if (perfil === 'vendedor') { location.hash = '#of-status'; return; } location.hash = '#of-os'; setTimeout(() => detalhe(o.id), 320); } }));
  }

  const T = (fn) => (ui) => { U = ui; O.garantir(ui.estado); fn(); };
  const IT = (aba, rotulo, curto, icone) => ({ aba, rotulo, curto, icone });
  R.registrar({
    id: 'oficina', nome: 'Oficina', curto: 'Oficina', ordem: 40, pronta: true, inicio: 'of-painel', perfis: VER.concat(['vendedor']),
    descricao: 'Ordens de serviço, orçamento, mecânicos, horas, garantia e entrega.',
    icone: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z"/>',
    acao: { rotulo: 'Nova OS', href: '#of-os', novo: true },
    atalhos: ['of-painel', 'of-os', 'of-apont', 'of-status'],
    dados: { oficina: ['os', 'servicos', 'apontamentos', 'mecanicos', 'checklists'], cadastros: ['clientes', 'fornecedores'] },
    menu: [
      { grupo: 'Dia a dia', itens: [IT('of-painel', 'Painel da oficina', 'Painel', '<path d="M4 13h6V4H4zM14 20h6V11h-6zM14 4v4h6V4zM4 20h6v-4H4z"/>'), IT('of-os', 'Ordens de serviço', 'OS', '<path d="M6 3h9l4 4v14H6zM14 3v5h5M9 13h7M9 17h5"/>'), IT('of-apont', 'Apontar horas', 'Horas', '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'), IT('of-status', 'OS dos meus clientes', 'Minhas OS', '<path d="M16 11a4 4 0 1 0-8 0 4 4 0 0 0 8 0zM3 21a9 9 0 0 1 18 0"/>')] },
      { grupo: 'Cadastros', itens: [IT('of-servicos', 'Serviços padrão', 'Serviços', '<path d="M9 6h11M9 12h11M9 18h11M4 6h.5M4 12h.5M4 18h.5"/>'), IT('of-mecanicos', 'Mecânicos', 'Mecânicos', '<path d="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21v-1a6 6 0 0 1 12 0v1"/>'), IT('of-checklists', 'Checklists', 'Checklists', '<path d="M9 6h11M9 12h11M9 18h11M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2"/>')] },
      { grupo: 'Ligado à oficina', itens: [IT('garantias', 'Garantias a receber', 'Garantias', '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6zM8.5 12l2.5 2.5 4.5-5"/>')] }
    ],
    telas: { 'of-painel': T(telaPainel), 'of-os': T(telaLista), 'of-apont': T(telaApont), 'of-status': T(telaStatus), 'of-servicos': T(telaServicos), 'of-mecanicos': T(telaMecanicos), 'of-checklists': T(telaChecklists) },
    permissoes: { 'of-painel': VER, 'of-os': VER, 'of-apont': VER, 'of-status': ['vendedor'], 'of-servicos': VER, 'of-mecanicos': VER, 'of-checklists': VER },
    numero: (ui) => {
      U = ui; O.garantir(ui.estado);
      if (ui.eu().perfil === 'vendedor') { const n = ui.estado.oficina.os.filter((o) => O.doVendedor(o, ui.eu().nome) && O.ABERTOS.includes(o.status)).length; return { valor: String(n), texto: `${n === 1 ? 'OS aberta' : 'OS abertas'} de clientes seus` }; }
      const r = O.resumo(ui.estado, { loja: ui.estado.lojaAtual || '', lojas: ui.K.lojasPermitidas, hoje: ui.hojeISO() });
      return { valor: String(r.abertas), texto: `OS abertas · ${r.por.aguardando} aguardando peça · ${r.por.pronta} prontas${r.atrasadas ? ` · ${r.atrasadas} atrasadas` : ''}`, alerta: r.atrasadas > 0 };
    },
    // tarefas do dia e rotina: OS atrasadas, máquinas prontas para entregar e orçamentos esperando o cliente
    hoje: (estado, u, ui) => {
      if (!['dono', 'gerente', 'oficina'].includes(u.perfil)) return [];
      const h = ui.hojeISO(), l = O.garantir(estado).os.filter(O.daLoja(estado.lojaAtual || '', ui.K.lojasPermitidas)).filter((o) => O.ABERTOS.includes(o.status)), out = [];
      const nm = (o) => { const m = o.maquina && ui.K.cad.maquina(o.maquina); return (m ? m.nome : o.maqTexto) || 'máquina'; };
      const atr = l.filter((o) => o.previsao && o.previsao < h), pr = l.filter((o) => o.status === 'pronta'), ap = l.filter((o) => o.aprovacao && o.aprovacao.status === 'pendente' && o.itens.length);
      if (atr.length) out.push({ id: 'of-atr-' + atr.map((o) => o.id).join(','), cat: 'os', catNome: 'Oficina', nivel: 1, valor: 2e5 + atr.length, titulo: `${atr.length} ${atr.length === 1 ? 'OS atrasada' : 'OS atrasadas'} (passou da data prometida)`, txt: atr.slice(0, 3).map((o) => `${o.numero} · ${nm(o)} · prometida para ${O.dataBR(o.previsao)}`).join(' · '), botao: { rotulo: 'Ver as OS', ir: '#/oficina/of-os' } });
      if (pr.length) out.push({ id: 'of-pr-' + pr.length, cat: 'os', catNome: 'Oficina', nivel: 2, valor: 1e5, titulo: `${pr.length} ${pr.length === 1 ? 'máquina pronta' : 'máquinas prontas'} para entregar`, txt: pr.slice(0, 3).map((o) => `${o.numero} · ${nm(o)}`).join(' · ') + '. Avise o cliente e feche a OS na entrega.', botao: { rotulo: 'Entregar', ir: '#/oficina/of-os' } });
      if (ap.length) out.push({ id: 'of-ap-' + ap.length, cat: 'os', catNome: 'Oficina', nivel: 2, valor: ap.reduce((s, o) => s + O.totais(o).total, 0), titulo: `${ap.length} ${ap.length === 1 ? 'orçamento esperando' : 'orçamentos esperando'} o cliente aprovar`, txt: ap.slice(0, 3).map((o) => `${o.numero} · ${O.brl(O.totais(o).total)}`).join(' · '), botao: { rotulo: 'Cobrar a aprovação', ir: '#/oficina/of-os' } });
      return out;
    },
    rotina: (estado, u, ui) => {
      const h = ui.hojeISO(), ab = O.garantir(estado).os.filter((o) => O.ABERTOS.includes(o.status));
      return [{ perfil: 'oficina', periodo: 'dia', id: 'of-situacao', titulo: 'Atualizar a situação das OS e apontar as horas', qtd: ab.filter((o) => o.previsao && o.previsao < h).length, ir: '#/oficina/of-apont' }];
    },
    buscar,
    novo: (ui) => { U = ui; formNova(); },
    iniciar: (ui) => { if (ui.OP) return; semear(ui); }
  });
  raiz.OFICINA_UI = { detalhe: (id) => detalhe(id), nova: (p) => formNova(p) };
})(typeof window !== 'undefined' ? window : globalThis);
