// Área FISCAL: telas. As regras (puras, testadas em testes_fiscal.js) estão em areas/fiscal-regras.js (window.FISCAL).
// HONESTA: o Anshur NÃO emite nota fiscal. A emissão continua no emissor atual da revenda; aqui ficam o cadastro fiscal,
// as sugestões de natureza/CFOP/NCM (o contador confere), a lista do que precisa de nota, a exportação dos dados
// (CSV e XML de dados, que não é NF-e) e a importação do XML autorizado emitido fora, ligado à venda, compra ou OS.
// Auditoria da emissão (por que ainda não emite): relatorios/anshur-comercial/fiscal-viabilidade.md (repositório do escritório).
// Permissões: dono e financeiro editam; gerente vê; auditor só lê; vendedor e oficina não veem.
(function (raiz) {
  const R = raiz.ANSHUR_AREAS;
  if (!R) return;
  // se a página ainda não carregou as regras (index.html antigo em cache), carrega agora
  if (!raiz.FISCAL && typeof document !== 'undefined') {
    const s = document.createElement('script'); s.src = 'areas/fiscal-regras.js?v=18';
    s.onload = () => { try { if (raiz.ANSHUR_UI && /^#fs/.test(location.hash)) raiz.ANSHUR_UI.rota(); } catch (e) { /* nada */ } };
    document.head.appendChild(s);
  }
  const FS = () => raiz.FISCAL;
  let U = null; // contexto de interface que o app.js entrega a cada tela
  const VER = ['dono', 'financeiro', 'gerente', 'auditor'];
  const est = () => U.estado;
  const fis = () => FS().garantir(est());
  const editor = () => FS().podeEditar(U.eu().perfil) && !(U.NV && U.NV.somenteLeitura);
  const quem = () => U.eu().nome;
  const brl = (v) => (v == null ? '—' : FS().brl(v));
  const opt = (pares, sel) => pares.map(([v, n]) => `<option value="${U.esc(v)}" ${String(sel) === String(v) ? 'selected' : ''}>${U.esc(n)}</option>`).join('');
  const nomeCliente = (id) => { const c = id && U.K.cad && U.K.cad.cliente(id); return c ? c.nome : ''; };
  function ctx() {
    const trocas = U.A.todasTrocas || U.A.trocas || [], financiadas = U.A.financiadas || [], hoje = U.hojeISO(), F = raiz.FINANCEIRO;
    let lancamentos = [];
    try { lancamentos = F ? F.todos(est(), { trocas, financiadas, cfg: U.K.cfg, hoje }) : ((est().fin && est().fin.lancamentos) || []); } catch (e) { lancamentos = (est().fin && est().fin.lancamentos) || []; }
    const of = est().oficina, os = of && Array.isArray(of.os) ? of.os : [];
    return { trocas, financiadas, lancamentos, os, nomeCliente, hoje };
  }
  const daLoja = (d) => { const l = est().lojaAtual, perm = U.K.lojasPermitidas; if (perm && perm.length && d.loja && !perm.includes(d.loja)) return false; return !l || !d.loja || d.loja === l; };
  const docs = () => FS().documentos(est(), ctx()).filter(daLoja);
  // trilha: Atividades (no aparelho) + trilha do servidor anshur_eventos (tipo "fiscal"), como as outras áreas
  function gravar(texto) {
    U.log('fiscal', texto);
    try { if (U.OP && U.NV && typeof U.NV.evento === 'function') U.NV.evento('fiscal', texto); } catch (e) { /* a fila do servidor guarda sem internet */ }
    U.salvar();
  }
  const ic = (d) => `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
  const I = {
    nota: ic('<path d="M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6M9 16h3"/>'), alerta: ic('<path d="M12 3 2 20h20L12 3zM12 10v4M12 17v.5"/>'),
    entra: ic('<path d="M12 5v14M6 13l6 6 6-6"/>'), sai: ic('<path d="M12 19V5M6 11l6-6 6 6"/>'), check: ic('<path d="M5 12.5l4.5 4.5L19 7.5"/>'),
    chave: ic('<path d="M15 7a4 4 0 1 0-3.9 5H12l2 2h2v2h2v2h3v-3l-6.1-6.1A4 4 0 0 0 15 7z"/>'), baixar: ic('<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>'),
    subir: ic('<path d="M12 20V9M7 14l5-5 5 5M5 4h14"/>'), predio: ic('<path d="M4 21V5l8-2v18M12 9l8 2v10M8 8v.5M8 12v.5M8 16v.5M16 14v.5M16 18v.5M2 21h20"/>'),
    lista: ic('<path d="M9 6h11M9 12h11M9 18h11M4 6h.5M4 12h.5M4 18h.5"/>'), relogio: ic('<path d="M12 7v5l3 2M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z"/>'),
    oficina: ic('<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z"/>')
  };
  const cab = (titulo, sub, botoes = '') => `<div class="titulo"><div><h1>${titulo}</h1><p>${sub}</p></div>${botoes ? `<div class="fin-acoes">${botoes}</div>` : ''}</div>`;
  const vazio = (t) => `<p class="vazio">${t}</p>`;
  const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;
  const soLeitura = () => (!editor() ? '<span class="tag declarado">Só leitura</span>' : '');
  const SIT_CLASSE = { 'sem-nota': 'sit-hoje', vinculada: 'sit-pago', informada: 'sit-aberto', dispensada: 'fs-sit-disp' };
  const sitTag = (d) => `<span class="sit ${SIT_CLASSE[d.situacao]}">${FS().NOMES_SIT[d.situacao]}</span>`;
  function estilo() {
    if (document.getElementById('fs-css')) return;
    document.head.insertAdjacentHTML('beforeend', `<style id="fs-css">
      .fs-emissao { border: 1px dashed var(--borda, #E5DFD3); background: #FBF6EC; }
      .fs-emissao h2 { display: flex; align-items: center; gap: 10px; }
      .fs-emissao ul { margin: 8px 0 0 18px; color: var(--grafite); }
      .fs-aviso { display: flex; gap: 10px; align-items: flex-start; background: #F3EBD9; color: #5E4718; border-radius: 10px; padding: 12px 14px; margin: 0 0 14px; font-size: 15px; }
      .fs-aviso .ico { color: #7A5A1E; margin-top: 2px; }
      .fs-aviso.ruim { background: #FBEDEB; color: #6E2522; }
      .fs-sit-disp { background: #ECEAE6; color: var(--cinza); }
      .fs-acoes-linha { display: flex; gap: 6px; flex-wrap: wrap; justify-content: flex-end; }
      .fs-mono { font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 13px; word-break: break-all; }
      .fs-res li { padding: 10px 0; border-bottom: 1px solid var(--linha); list-style: none; }
      .fs-res { padding: 0; margin: 10px 0 0; max-height: 55vh; overflow: auto; }
      .fs-res .fs-cands { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 8px; align-items: center; }
      .fs-res select { min-height: 40px; max-width: 100%; }
      .fs-tab-sug td:first-child { white-space: nowrap; font-weight: 700; }
      .fs-sug { font-size: 12.5px; color: #7A5A1E; background: #F3EBD9; padding: 2px 8px; border-radius: 6px; font-weight: 700; white-space: nowrap; }
    </style>`);
  }
  const avisoContador = '<div class="fs-aviso">' + ic('<path d="M12 3 2 20h20L12 3zM12 10v4M12 17v.5"/>') + '<span><b>Sugestão, não regra fiscal.</b> NCM, natureza de operação e CFOP abaixo são pontos de partida para máquinas agrícolas e peças. A tributação (CST/CSOSN, ICMS, IPI, PIS/COFINS, IBS/CBS e benefícios como o Convênio ICMS 52/91) depende do estado, do regime e do produto: <b>o contador da revenda confere antes de usar.</b></span></div>';
  const blocoEmissao = () => `<section class="painel bloco fs-emissao" id="fs-emissao"><h2>${I.relogio}Emissão de NF-e direto pelo Anshur: em preparação</h2>
    <p class="sub">Hoje o Anshur <b>não emite</b> nota fiscal. Continue emitindo no seu emissor atual (ou pelo contador) e traga o XML autorizado para cá: ele fica ligado à venda, à compra ou à OS.</p>
    <ul><li>Para emitir daqui é preciso testar antes, em homologação na SEFAZ, com o certificado digital A1 da própria revenda.</li><li>Só será liberado depois de notas de teste autorizadas e conferidas pelo contador. Sem data prometida.</li></ul></section>`;

  // ---------- PAINEL ----------
  function telaPainel() {
    const r = FS().resumo(est(), ctx()), ds = docs(), pend = ds.filter((d) => d.situacao === 'sem-nota'), f = fis();
    const mes = U.hojeISO().slice(0, 7).split('-').reverse().join('/');
    U.tela.innerHTML = cab('Fiscal', 'O que precisa de nota, os dados prontos para o seu emissor e as notas autorizadas guardadas junto da operação.', (editor() ? `<button class="btn btn-ouro" type="button" data-fs-importar>${I.subir}<span>Importar XML</span></button>` : '') + `<a class="btn btn-linha" href="#fs-documentos">${I.lista}<span>Documentos fiscais</span></a>${soLeitura()}`) + `
      ${!r.perfilOk ? `<div class="fs-aviso ruim">${I.alerta}<span><b>Cadastro fiscal incompleto.</b> ${editor() ? '<a class="link" href="#fs-cadastro">Preencha CNPJ, inscrição estadual, regime, CNAE e município</a> para exportar os dados.' : 'Quem preenche é o dono ou o financeiro.'}</span></div>` : ''}
      <div class="kpis fin-k">
        <a class="kpi ${r.vendasMesSemNota ? 'k-risco' : 'k-salvia'}" href="#fs-documentos" data-fs-filtro="vendas-mes"><span class="rot">${I.sai}Vendas do mês sem nota</span><span class="val">${r.vendasMesSemNota}</span><span class="exp">${r.vendasMesSemNota ? brl(r.valorVendasMesSemNota) + ' · ' : ''}de ${plural(r.vendasMes, 'venda ou serviço', 'vendas e serviços')} em ${mes}</span></a>
        <a class="kpi ${r.comprasSemNota ? 'k-marfim' : ''}" href="#fs-documentos" data-fs-filtro="compra-usado"><span class="rot">${I.entra}Compras de usado sem nota</span><span class="val">${r.comprasSemNota}</span><span class="exp">NF-e de entrada do produtor</span></a>
        <a class="kpi" href="#fs-documentos" data-fs-filtro="os"><span class="rot">${I.oficina}Serviços (OS) sem nota</span><span class="val">${r.osSemNota}</span><span class="exp">nota de serviço da prefeitura</span></a>
        <a class="kpi" href="#fs-notas"><span class="rot">${I.nota}Notas guardadas</span><span class="val">${r.notas}</span><span class="exp">${r.notasSemVinculo ? plural(r.notasSemVinculo, 'sem operação ligada', 'sem operação ligada') : 'todas ligadas a uma operação'}${r.homologacao ? ` · ${r.homologacao} de homologação` : ''}</span></a>
      </div>
      <section class="painel bloco"><div class="painel-cab"><h2>${I.alerta}Emitir no seu emissor atual</h2><p>${pend.length ? `${plural(pend.length, 'operação', 'operações')} · ${brl(pend.reduce((s, d) => s + (+d.valor || 0), 0))}${f.desde ? ' desde ' + U.data(f.desde) : ''}` : ''}</p></div>
        ${tabelaDocs(pend.slice(0, 10), 'Tudo em dia: nenhuma operação esperando nota.')}${pend.length > 10 ? `<p style="margin-top:10px"><a class="link" href="#fs-documentos">Ver as ${pend.length}</a></p>` : ''}</section>
      ${blocoEmissao()}`;
    ligar();
    U.$$('[data-fs-filtro]', U.tela).forEach((a) => a.onclick = () => { const v = a.dataset.fsFiltro; Object.assign(filtro, { sit: 'sem-nota', tipo: v === 'vendas-mes' ? 'vendas' : v, mes: v === 'vendas-mes' ? U.hojeISO().slice(0, 7) : '', q: '' }); });
  }

  // ---------- tabela de documentos ----------
  function tabelaDocs(lista, msgVazio) {
    if (!lista.length) return vazio(msgVazio || 'Nada com estes filtros.');
    const pode = editor(), demo = !U.OP;
    return `<div class="tabela-wrap"><table class="tabela fin-tab"><thead><tr><th>Data</th><th>Operação</th><th>Nota</th><th class="n">Valor</th><th>Situação</th><th></th></tr></thead><tbody>
      ${lista.map((d) => { const T = FS().TIPOS[d.tipo]; return `<tr data-fs-doc="${U.esc(d.id)}" tabindex="0" class="clicavel"><td>${U.data(d.data)}</td>
        <td><b>${U.esc(T.nome)}${d.maquinaNome ? ' · ' + U.esc(d.maquinaNome) : d.os ? ' · ' + U.esc(d.os) : ''}</b><span class="fin-sub">${[d.pessoa && U.esc(d.pessoa), d.chassi && 'chassi ' + U.esc(d.chassi), d.descricao && !d.maquinaNome && U.esc(d.descricao), d.loja && U.esc(d.loja)].filter(Boolean).join(' · ')}</span></td>
        <td>${U.esc(T.doc)}</td><td class="n">${brl(d.valor)}</td><td>${sitTag(d)}</td>
        <td class="n"><div class="fs-acoes-linha">${pode && d.situacao === 'sem-nota' ? `<button class="btn btn-linha btn-p" type="button" data-fs-xml-doc="${U.esc(d.id)}">XML</button><button class="btn btn-linha btn-p" type="button" data-fs-informar="${U.esc(d.id)}" title="Informar o número da nota sem XML">Número</button>` : ''}${demo && pode && d.situacao === 'sem-nota' && T.doc !== 'NFS-e' ? `<button class="btn btn-linha btn-p" type="button" data-fs-exemplo="${U.esc(d.id)}" title="Baixa um XML de exemplo (homologação, sem valor fiscal) para testar a importação">Exemplo</button>` : ''}</div></td></tr>`; }).join('')}
      </tbody></table></div>`;
  }
  function ligar() {
    U.$$('[data-fs-importar]', U.tela).forEach((b) => b.onclick = () => abrirImportar());
    U.$$('[data-fs-doc]', U.tela).forEach((tr) => {
      tr.onclick = (e) => { if (e.target.closest('button, a')) return; detalheDoc(tr.dataset.fsDoc); };
      tr.onkeydown = (e) => { if (e.key === 'Enter' && e.target === tr) detalheDoc(tr.dataset.fsDoc); };
    });
    U.$$('[data-fs-xml-doc]', U.tela).forEach((b) => b.onclick = (e) => { e.stopPropagation(); abrirImportar(b.dataset.fsXmlDoc); });
    U.$$('[data-fs-informar]', U.tela).forEach((b) => b.onclick = (e) => { e.stopPropagation(); formInformar(b.dataset.fsInformar); });
    U.$$('[data-fs-exemplo]', U.tela).forEach((b) => b.onclick = (e) => { e.stopPropagation(); baixarExemplo(b.dataset.fsExemplo); });
  }
  const acharDoc = (id) => FS().documentos(est(), ctx()).find((d) => d.id === id);
  const acharNota = (id) => fis().notas.find((n) => n.id === id);
  const nomeDoc = (id) => { const d = acharDoc(id); return d ? `${FS().TIPOS[d.tipo].nome}${d.maquinaNome ? ' · ' + d.maquinaNome : d.os ? ' · ' + d.os : ''} (${U.data(d.data)})` : id; };

  // ---------- DOCUMENTOS FISCAIS ----------
  const filtro = { sit: 'sem-nota', tipo: '', mes: '', q: '' };
  function filtrar(lista) {
    const f = filtro, q = f.q.trim().toLowerCase();
    return lista.filter((d) => (f.sit === 'todas' || d.situacao === f.sit) && (!f.tipo || (f.tipo === 'vendas' ? FS().ehVenda(d.tipo) : d.tipo === f.tipo)) && (!f.mes || d.data.slice(0, 7) === f.mes)
      && (!q || [d.pessoa, d.maquinaNome, d.chassi, d.os, d.descricao, d.ref, d.loja].join(' ').toLowerCase().includes(q)));
  }
  function telaDocumentos() {
    const todos = docs(), lista = filtrar(todos), f = filtro, fz = fis();
    const meses = [...new Set(todos.map((d) => d.data.slice(0, 7)))].sort().reverse();
    const cont = (s) => todos.filter((d) => s === 'todas' || d.situacao === s).length;
    U.tela.innerHTML = cab('Documentos fiscais', `Tudo o que precisa de nota${fz.desde ? ' desde ' + U.data(fz.desde) : ''}. Emita no seu emissor atual, exporte os dados ou traga o XML autorizado.`, (editor() ? `<button class="btn btn-ouro" type="button" data-fs-importar>${I.subir}<span>Importar XML</span></button>` : '') + soLeitura()) + `
      <section class="painel">
        <div class="fin-filtros">
          <div class="abas-modo" role="group" aria-label="Situação">${[['sem-nota', 'Sem nota'], ['vinculada', 'Com XML'], ['informada', 'Só o número'], ['dispensada', 'Não precisa'], ['todas', 'Todas']].map(([v, n]) => `<button type="button" data-fs-sit="${v}" aria-pressed="${f.sit === v}">${n} (${cont(v)})</button>`).join('')}</div>
          <div class="campos fin-campos">
            <div class="campo"><label for="fd-q">Buscar</label><input id="fd-q" value="${U.esc(f.q)}" placeholder="Cliente, produtor, máquina, chassi, OS"></div>
            <div class="campo"><label for="fd-tipo">Operação</label><select id="fd-tipo">${opt([['', 'Todas'], ['vendas', 'Todas as vendas e serviços']].concat(Object.entries(FS().TIPOS).map(([k, v]) => [k, v.nome])), f.tipo)}</select></div>
            <div class="campo"><label for="fd-mes">Mês</label><select id="fd-mes">${opt([['', 'Todos']].concat(meses.map((m) => [m, m.split('-').reverse().join('/')])), f.mes)}</select></div>
          </div></div>
        <div>${tabelaDocs(lista)}</div>
        <div class="fin-rodape"><span>${plural(lista.length, 'operação', 'operações')} · ${brl(lista.reduce((s, d) => s + (+d.valor || 0), 0))}</span>
          <span class="fin-acoes"><button class="btn btn-linha" type="button" id="fd-csv">${I.baixar}<span>Planilha para o emissor/contador</span></button><button class="btn btn-linha" type="button" id="fd-xml">${I.baixar}<span>XML de dados</span></button></span></div>
        <p class="sub" style="margin-top:8px">A planilha e o XML de dados levam o que o emissor precisa (cliente, item, chassi, valor) e as <b>sugestões</b> de NCM, natureza e CFOP. O XML de dados <b>não é NF-e</b>: não é assinado e não vale como nota.</p>
      </section>`;
    U.$$('[data-fs-sit]', U.tela).forEach((b) => b.onclick = () => { f.sit = b.dataset.fsSit; telaDocumentos(); });
    U.$('#fd-tipo').onchange = (e) => { f.tipo = e.target.value; telaDocumentos(); };
    U.$('#fd-mes').onchange = (e) => { f.mes = e.target.value; telaDocumentos(); };
    U.$('#fd-q').oninput = (e) => { f.q = e.target.value; clearTimeout(telaDocumentos.t); telaDocumentos.t = setTimeout(() => { telaDocumentos(); const i = U.$('#fd-q'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }, 250); };
    U.$('#fd-csv').onclick = () => exportar(lista, 'csv');
    U.$('#fd-xml').onclick = () => exportar(lista, 'xml');
    ligar();
  }
  function exportar(lista, tipo) {
    if (!lista.length) { U.toast('Nada para exportar com estes filtros.', true); return; }
    if (!FS().perfilCompleto(fis().perfil)) U.toast('Atenção: o cadastro fiscal está incompleto; os dados da revenda vão em branco.', true);
    const nome = `anshur-fiscal-${U.hojeISO()}`;
    if (tipo === 'csv') U.baixarCSV(nome + '.csv', FS().linhasCSV(est(), lista));
    else baixarTexto(nome + '-dados.xml', FS().xmlDados(est(), lista), 'application/xml');
    gravar(`Exportou ${plural(lista.length, 'operação', 'operações')} para o emissor (${tipo === 'csv' ? 'planilha' : 'XML de dados'})`);
  }
  function baixarTexto(nome, texto, tipo) {
    const url = URL.createObjectURL(new Blob([texto], { type: (tipo || 'text/plain') + ';charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = nome; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000); U.toast('Arquivo gerado: ' + nome);
  }

  // ---------- detalhe de uma operação ----------
  function detalheDoc(id) {
    const d = acharDoc(id); if (!d) { U.toast('Operação não encontrada.', true); return; }
    const T = FS().TIPOS[d.tipo], s = FS().sugestaoDoc(est(), d), notas = d.notas.map(acharNota).filter(Boolean), pode = editor();
    const dec = fis().decisoes.find((x) => x.id === 'DEC:' + d.id && !x.desfeita);
    U.abrirCamada('modal larga-modal', `<h2>${U.esc(T.nome)}</h2><p class="sub">${U.data(d.data)} · ${brl(d.valor)} · ${sitTag(d)}</p>
      <div class="tabela-wrap" style="margin-top:12px"><table class="tabela"><tbody>
        <tr><th>Nota necessária</th><td>${U.esc(T.doc)}${d.tipo === 'compra-usado' ? ' (a revenda emite com o CPF do produtor; produtor com inscrição emite a dele)' : ''}</td></tr>
        <tr><th>${T.saida ? 'Cliente' : 'Produtor / vendedor'}</th><td>${U.esc(d.pessoa || '—')}</td></tr>
        <tr><th>Item</th><td>${U.esc(FS().descricaoItem(d) || '—')}</td></tr>
        <tr><th>NCM</th><td>${s.ncm ? `${FS().fmtNCM(s.ncm.ncm)} · ${U.esc(s.ncm.desc)} <span class="fs-sug">sugestão</span>` : d.tipo === 'os' ? 'Serviço: item 14.01 da LC 116 <span class="fs-sug">sugestão</span>' : '—'}</td></tr>
        <tr><th>Natureza / CFOP</th><td>${s.natureza ? `${U.esc(s.natureza.nome)}${s.cfop ? ' · ' + FS().fmtCFOP(s.cfop) + ' (dentro do estado)' : ''} <span class="fs-sug">sugestão</span>` : '—'}${s.natureza && s.natureza.obs ? `<span class="fin-sub">${U.esc(s.natureza.obs)}</span>` : ''}</td></tr>
        ${d.loja ? `<tr><th>Loja</th><td>${U.esc(d.loja)}</td></tr>` : ''}
        ${dec ? `<tr><th>Não precisa de nota</th><td>${U.esc(dec.motivo)}<span class="fin-sub">${U.esc(dec.por || '')} · ${U.data((dec.em || '').slice(0, 10))}</span></td></tr>` : ''}
      </tbody></table></div>
      ${notas.length ? `<h3 style="margin-top:14px">Notas ligadas</h3><ul class="fs-res">${notas.map((n) => `<li><b>${rotuloNota(n)}</b><span class="fin-sub">${U.esc(n.emitente ? n.emitente.nome || '' : '')}${n.tpAmb === 2 ? ' · HOMOLOGAÇÃO, sem valor fiscal' : ''}${n.exemplo ? ' · exemplo da demonstração' : ''}</span><div class="fs-cands"><button class="btn btn-linha btn-p" type="button" data-fs-ver-nota="${U.esc(n.id)}">Abrir</button>${pode ? `<button class="btn btn-linha btn-p" type="button" data-fs-desv="${U.esc(n.id)}">Desligar desta operação</button>` : ''}</div></li>`).join('')}</ul>` : ''}
      <p class="sub" style="margin-top:12px">Sugestões de NCM e CFOP: o contador confere. O Anshur não emite a nota.</p>
      <div class="acoes" style="flex-wrap:wrap">${pode && d.situacao === 'sem-nota' ? `<button class="btn btn-ouro" type="button" id="dd-xml">${I.subir}Importar o XML</button><button class="btn btn-linha" type="button" id="dd-num">Informar número sem XML</button><button class="btn btn-linha" type="button" id="dd-disp">Não precisa de nota</button>` : ''}
        ${pode && d.situacao === 'dispensada' ? '<button class="btn btn-linha" type="button" id="dd-reab">Voltar a pedir nota</button>' : ''}
        <button class="btn btn-linha" type="button" id="dd-csv">${I.baixar}Dados desta operação</button><button class="btn btn-linha" type="button" id="dd-fechar">Fechar</button></div>`, (c) => {
      const $ = (q) => U.$(q, c);
      $('#dd-fechar').onclick = () => U.fecharCamada();
      $('#dd-csv').onclick = () => U.baixarCSV(`anshur-fiscal-${d.id.replace(/[^A-Za-z0-9]+/g, '-')}.csv`, FS().linhasCSV(est(), [d]));
      if ($('#dd-xml')) $('#dd-xml').onclick = () => abrirImportar(d.id);
      if ($('#dd-num')) $('#dd-num').onclick = () => formInformar(d.id);
      if ($('#dd-disp')) $('#dd-disp').onclick = () => formDispensar(d.id);
      if ($('#dd-reab')) $('#dd-reab').onclick = () => { FS().reabrir(est(), d.id, quem()); gravar(`Voltou a pedir nota: ${nomeDoc(d.id)}`); U.fecharCamada(); U.toast('A operação voltou para "Sem nota".'); U.rota(); };
      U.$$('[data-fs-ver-nota]', c).forEach((b) => b.onclick = () => detalheNota(b.dataset.fsVerNota));
      U.$$('[data-fs-desv]', c).forEach((b) => b.onclick = () => { FS().desvincular(est(), b.dataset.fsDesv, d.id); gravar(`Desligou a nota ${rotuloNota(acharNota(b.dataset.fsDesv), true)} de ${nomeDoc(d.id)}`); U.fecharCamada(); U.rota(); });
    });
  }
  const MODELOS = { nfe: 'NF-e', nfse: 'NFS-e', nfce: 'NFC-e', produtor: 'Nota do produtor', outra: 'Outra', '55': 'NF-e', '65': 'NFC-e' };
  const rotuloNota = (n, texto) => { if (!n) return ''; const r = `${MODELOS[n.modelo] || 'Nota'} nº ${n.numero}${n.serie ? ' série ' + n.serie : ''} · ${U.data(n.emissao)}${n.valor != null ? ' · ' + brl(n.valor) : ''}${n.cancelada ? ' · CANCELADA' : ''}`; return texto ? r : U.esc(r); };

  function formInformar(docId) {
    if (!editor()) return;
    const d = acharDoc(docId); if (!d) return;
    const modelo = d.tipo === 'os' ? 'nfse' : d.tipo === 'compra-usado' ? 'nfe' : 'nfe';
    U.abrirCamada('modal', `<h2>Informar a nota sem XML</h2><p class="sub">${U.esc(nomeDoc(docId))}. Use quando a nota existe mas o XML não está à mão (ex.: nota de serviço da prefeitura, nota do produtor em papel). Prefira importar o XML quando puder.</p>
      <form class="campos" style="margin-top:12px" novalidate>
        <div class="campo"><label for="fi-mod">Tipo</label><select id="fi-mod">${opt([['nfe', 'NF-e (modelo 55)'], ['nfse', 'NFS-e (serviço)'], ['nfce', 'NFC-e (modelo 65)'], ['produtor', 'Nota do produtor rural'], ['outra', 'Outra']], modelo)}</select></div>
        <div class="campo"><label for="fi-num">Número *</label><input id="fi-num" inputmode="numeric"></div>
        <div class="campo"><label for="fi-serie">Série</label><input id="fi-serie" value="${d.tipo === 'os' ? '' : U.esc(fis().perfil.serieNFe || '')}"></div>
        <div class="campo"><label for="fi-data">Emissão *</label><input id="fi-data" type="date" value="${d.data}"></div>
        <div class="campo"><label for="fi-valor">Valor (R$)</label><input id="fi-valor" inputmode="decimal" value="${d.valor != null ? String(d.valor).replace('.', ',') : ''}"></div>
        <div class="campo inteiro"><label for="fi-chave">Chave de acesso (44 dígitos, se tiver)</label><input id="fi-chave" inputmode="numeric" class="fs-mono"></div>
        <div class="campo inteiro"><label for="fi-obs">Observação</label><input id="fi-obs"></div>
      </form><div class="acoes"><button class="btn btn-ouro" type="button" id="fi-ok">Salvar</button><button class="btn btn-linha" type="button" id="fi-nao">Cancelar</button></div>`, (c) => {
      const $ = (q) => U.$(q, c);
      $('#fi-nao').onclick = () => U.fecharCamada();
      $('#fi-ok').onclick = () => {
        try {
          const n = FS().informarNota(est(), docId, { modelo: $('#fi-mod').value, numero: $('#fi-num').value, serie: $('#fi-serie').value.trim(), emissao: $('#fi-data').value, valor: $('#fi-valor').value.trim() ? U.num($('#fi-valor').value) : null, chave: $('#fi-chave').value.trim(), obs: $('#fi-obs').value.trim() }, quem());
          gravar(`Informou a ${rotuloNota(n, true)} (sem XML) para ${nomeDoc(docId)}`); U.fecharCamada(); U.toast('Nota informada.'); U.rota();
        } catch (e) { U.toast(e.message, true); }
      };
    });
  }
  function formDispensar(docId) {
    if (!editor()) return;
    U.abrirCamada('modal', `<h2>Esta operação não precisa de nota?</h2><p class="sub">${U.esc(nomeDoc(docId))}. Escreva o motivo: fica na trilha de auditoria.</p>
      <div class="campo" style="margin-top:12px"><label for="fx-mot">Motivo *</label><input id="fx-mot" placeholder="Ex.: o produtor emitiu nota de produtor em papel; venda cancelada antes de faturar"></div>
      <div class="acoes"><button class="btn btn-ouro" type="button" id="fx-ok">Confirmar</button><button class="btn btn-linha" type="button" id="fx-nao">Cancelar</button></div>`, (c) => {
      U.$('#fx-nao', c).onclick = () => U.fecharCamada();
      U.$('#fx-ok', c).onclick = () => { try { const dd = FS().dispensar(est(), docId, U.$('#fx-mot', c).value, quem()); gravar(`Marcou "não precisa de nota": ${nomeDoc(docId)} (${dd.motivo})`); U.fecharCamada(); U.rota(); } catch (e) { U.toast(e.message, true); } };
    });
  }

  // ---------- IMPORTAR XML ----------
  function abrirImportar(docAlvo) {
    if (!editor()) { U.toast('Só o dono e o financeiro importam notas.', true); return; }
    U.abrirCamada('modal larga-modal', `<h2>Importar XML de nota autorizada</h2>
      <p class="sub">${docAlvo ? 'Para: <b>' + U.esc(nomeDoc(docAlvo)) + '</b>. ' : ''}Escolha o XML que o seu emissor entregou depois da autorização (procNFe). Pode escolher vários: o Anshur liga cada nota à venda, compra ou OS quando a ligação é certeira e pergunta quando não é. XML de cancelamento marca a nota como cancelada.</p>
      <div class="campo" style="margin-top:12px"><label for="fx-arq">Arquivos XML</label><input id="fx-arq" type="file" accept=".xml,text/xml,application/xml" multiple></div>
      <div id="fx-res"></div>
      <div class="acoes"><button class="btn btn-linha" type="button" id="fx-fim">Fechar</button></div>`, (c) => {
      U.$('#fx-fim', c).onclick = () => { U.fecharCamada(); U.rota(); };
      U.$('#fx-arq', c).onchange = async (e) => {
        const arqs = Array.from(e.target.files || []); if (!arqs.length) return;
        const res = U.$('#fx-res', c); res.innerHTML = '<p class="sub">Lendo…</p>';
        const linhas = [];
        for (const a of arqs.slice(0, 50)) linhas.push(await importarArquivo(a, docAlvo));
        if (arqs.length > 50) linhas.push({ nome: '', html: `<span class="sit sit-vencido">Só os 50 primeiros arquivos foram lidos.</span>` });
        res.innerHTML = `<ul class="fs-res">${linhas.map((l, i) => `<li data-i="${i}"><b>${U.esc(l.nome)}</b> ${l.html}</li>`).join('')}</ul>`;
        U.$$('[data-fs-ligar]', res).forEach((b) => b.onclick = () => {
          const sel = U.$('#' + b.dataset.fsLigar, res), notaId = b.dataset.nota; if (!sel.value) { U.toast('Escolha a operação.', true); return; }
          FS().vincular(est(), notaId, sel.value); gravar(`Ligou a ${rotuloNota(acharNota(notaId), true)} a ${nomeDoc(sel.value)}`);
          b.closest('.fs-cands').innerHTML = `<span class="sit sit-pago">Ligada a ${U.esc(nomeDoc(sel.value))}</span>`;
        });
        e.target.value = '';
      };
    });
  }
  async function importarArquivo(arq, docAlvo) {
    const nome = arq.name || 'arquivo.xml', F = FS();
    if (arq.size > 1024 * 1024) return { nome, html: '<span class="sit sit-vencido">Recusado: acima de 1 MB.</span>' };
    let texto = ''; try { texto = await arq.text(); } catch (e) { return { nome, html: '<span class="sit sit-vencido">Não foi possível ler o arquivo.</span>' }; }
    const n = F.lerXML(texto);
    if (n.erro) return { nome, html: `<span class="sit sit-vencido">Recusado: ${U.esc(n.erro)}</span>` };
    if (n.tipo === 'cancelamento') {
      try { const alvo = F.guardarNota(est(), n, {}, quem()); gravar(`Importou o cancelamento da ${rotuloNota(alvo, true)} (${n.justificativa || 'sem justificativa'})`); return { nome, html: `<span class="sit sit-cancelado">Nota ${U.esc(alvo.numero)} marcada como cancelada</span><span class="fin-sub">A operação ligada volta para "Sem nota".</span>` }; }
      catch (e) { return { nome, html: `<span class="sit sit-vencido">Recusado: ${U.esc(e.message)}</span>` }; }
    }
    if (n.tipo !== 'nfe') return { nome, html: `<span class="sit sit-aberto">Evento ${U.esc(n.tpEvento || '')} lido; este tipo ainda não é guardado.</span>` };
    const avisos = F.conferirNota(n, fis().perfil);
    if (!F.podeGuardar(avisos)) return { nome, html: `<span class="sit sit-vencido">Recusado: ${U.esc(avisos.find((a) => a.nivel === 'erro').msg)}</span>` };
    if (fis().notas.some((x) => x.id === 'NF' + n.chave)) return { nome, html: `<span class="sit sit-aberto">Já importada antes (nº ${U.esc(n.numero)}).</span>` };
    const abertos = F.documentos(est(), ctx()).filter((d) => d.situacao === 'sem-nota' || d.situacao === 'informada');
    const cands = F.sugerirVinculos(n, abertos, fis().perfil);
    const alvo = docAlvo ? abertos.find((d) => d.id === docAlvo) : F.vinculoCerteiro(cands);
    // com conta e internet, o XML original vai para a pasta privada da revenda; senão fica guardado no próprio estado
    let caminho = '';
    if (U.OP && U.NV && U.NV.subirDoc && !(U.NV.semInternet && U.NV.semInternet())) { try { caminho = await U.NV.subirDoc('nfe-' + n.chave, new File([texto], nome.replace(/\.xml$/i, '') + '.xml', { type: 'application/xml' })); } catch (e) { caminho = ''; } }
    let nota; try { nota = F.guardarNota(est(), n, { xml: texto, caminho, vinculos: alvo ? [alvo.id] : [], arquivo: nome }, quem()); } catch (e) { return { nome, html: `<span class="sit sit-vencido">Recusado: ${U.esc(e.message)}</span>` }; }
    gravar(`Importou o XML da ${rotuloNota(nota, true)}${alvo ? ' e ligou a ' + nomeDoc(alvo.id) : ' (sem operação ligada)'}${n.tpAmb === 2 ? ' · homologação' : ''}`);
    const avs = avisos.filter((a) => a.nivel !== 'erro').map((a) => `<span class="fin-sub">${I.alerta} ${U.esc(a.msg)}</span>`).join('');
    if (alvo) return { nome, html: `<span class="sit sit-pago">Nota ${U.esc(n.numero)} guardada e ligada a ${U.esc(nomeDoc(alvo.id))}</span>${avs}` };
    const sid = 'fs-sel-' + nota.id.slice(-10);
    return { nome, html: `<span class="sit sit-hoje">Nota ${U.esc(n.numero)} guardada sem operação ligada</span>${avs}<div class="fs-cands"><select id="${sid}" aria-label="Ligar a qual operação">${opt([['', cands.length ? 'Escolha a operação (mais provável primeiro)' : 'Escolha a operação']].concat((cands.length ? cands.map((x) => x.doc) : abertos).slice(0, 40).map((d) => [d.id, `${nomeDoc(d.id)} · ${brl(d.valor)}`])), '')}</select><button class="btn btn-linha btn-p" type="button" data-fs-ligar="${sid}" data-nota="${U.esc(nota.id)}">Ligar</button></div>` };
  }
  function baixarExemplo(docId) {
    const d = acharDoc(docId); if (!d) return;
    const p = fis().perfil; if (!FS().cnpjValido(p.cnpj)) { U.toast('Preencha o cadastro fiscal para gerar o exemplo.', true); return; }
    const numero = 9000 + fis().notas.length + Math.floor(Math.random() * 900);
    baixarTexto(`exemplo-homologacao-${numero}.xml`, FS().xmlExemplo(est(), d, numero), 'application/xml');
    U.toast('Exemplo de homologação (sem valor fiscal) baixado. Agora use "Importar XML" e escolha esse arquivo.');
  }

  // ---------- NOTAS GUARDADAS ----------
  const fn = { q: '', so: '' };
  function telaNotas() {
    const q = fn.q.trim().toLowerCase();
    const todas = fis().notas.slice().sort((a, b) => String(b.emissao).localeCompare(String(a.emissao)));
    const lista = todas.filter((n) => (!fn.so || (fn.so === 'sem' ? !(n.vinculos || []).length && !n.cancelada : fn.so === 'canc' ? n.cancelada : fn.so === 'homolog' ? n.tpAmb === 2 : true))
      && (!q || [n.numero, n.chave, n.emitente && n.emitente.nome, n.destinatario && n.destinatario.nome, n.natOp].join(' ').toLowerCase().includes(q)));
    U.tela.innerHTML = cab('Notas guardadas', 'XML autorizado emitido fora do Anshur (no seu emissor, pelo contador, pela fábrica ou pelo produtor), ligado à operação.', (editor() ? `<button class="btn btn-ouro" type="button" data-fs-importar>${I.subir}<span>Importar XML</span></button>` : '') + soLeitura()) + `
      <section class="painel">
        <div class="fin-filtros"><div class="abas-modo" role="group" aria-label="Filtro">${[['', 'Todas'], ['sem', 'Sem operação'], ['homolog', 'Homologação'], ['canc', 'Canceladas']].map(([v, n]) => `<button type="button" data-fs-so="${v}" aria-pressed="${fn.so === v}">${n}</button>`).join('')}</div>
          <div class="campos fin-campos"><div class="campo"><label for="fn-q">Buscar</label><input id="fn-q" value="${U.esc(fn.q)}" placeholder="Número, chave, emitente, destinatário"></div></div></div>
        ${lista.length ? `<div class="tabela-wrap"><table class="tabela fin-tab"><thead><tr><th>Emissão</th><th>Nota</th><th>Emitente → destinatário</th><th class="n">Valor</th><th>Operação</th></tr></thead><tbody>
          ${lista.map((n) => `<tr data-fs-nota="${U.esc(n.id)}" tabindex="0" class="clicavel"><td>${U.data(n.emissao)}</td><td><b>${U.esc(MODELOS[n.modelo] || 'Nota')} ${U.esc(n.numero)}</b><span class="fin-sub">${n.origem === 'manual' ? 'número informado, sem XML' : n.exemplo ? 'exemplo da demonstração' : 'XML'}${n.tpAmb === 2 ? ' · homologação' : ''}${n.cancelada ? ' · <b>cancelada</b>' : ''}</span></td>
            <td>${U.esc((n.emitente && n.emitente.nome) || '—')}<span class="fin-sub">→ ${U.esc((n.destinatario && n.destinatario.nome) || '—')}</span></td><td class="n">${brl(n.valor)}</td>
            <td>${(n.vinculos || []).length ? n.vinculos.map((v) => U.esc(nomeDoc(v))).join('<br>') : '<span class="sit sit-hoje">Sem operação</span>'}</td></tr>`).join('')}
        </tbody></table></div>` : vazio(todas.length ? 'Nenhuma nota com este filtro.' : 'Nenhuma nota guardada ainda. Importe o XML autorizado que o seu emissor entrega.')}
      </section>${blocoEmissao()}`;
    U.$$('[data-fs-so]', U.tela).forEach((b) => b.onclick = () => { fn.so = b.dataset.fsSo; telaNotas(); });
    U.$('#fn-q').oninput = (e) => { fn.q = e.target.value; clearTimeout(telaNotas.t); telaNotas.t = setTimeout(() => { telaNotas(); const i = U.$('#fn-q'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }, 250); };
    U.$$('[data-fs-nota]', U.tela).forEach((tr) => { tr.onclick = () => detalheNota(tr.dataset.fsNota); tr.onkeydown = (e) => { if (e.key === 'Enter') detalheNota(tr.dataset.fsNota); }; });
    ligar();
  }
  function detalheNota(id) {
    const n = acharNota(id); if (!n) return;
    const pode = editor(), abertos = docs().filter((d) => d.situacao === 'sem-nota' || d.situacao === 'informada').filter((d) => !(n.vinculos || []).includes(d.id));
    U.abrirCamada('modal larga-modal', `<h2>${rotuloNota(n)}</h2>${n.tpAmb === 2 ? '<div class="fs-aviso">' + I.alerta + '<span>Nota de <b>homologação</b> (teste): não tem valor fiscal.</span></div>' : ''}${n.exemplo ? '<div class="fs-aviso">' + I.alerta + '<span>Exemplo da demonstração, com dados fictícios.</span></div>' : ''}
      <div class="tabela-wrap"><table class="tabela"><tbody>
        ${n.chave ? `<tr><th>Chave de acesso</th><td class="fs-mono">${U.esc(n.chave.replace(/(\d{4})/g, '$1 ').trim())}</td></tr>` : ''}
        ${n.natOp ? `<tr><th>Natureza</th><td>${U.esc(n.natOp)}</td></tr>` : ''}
        ${n.emitente ? `<tr><th>Emitente</th><td>${U.esc(n.emitente.nome || '')}<span class="fin-sub">${U.esc(FS().fmtDoc(n.emitente.doc))}</span></td></tr>` : ''}
        ${n.destinatario ? `<tr><th>Destinatário</th><td>${U.esc(n.destinatario.nome || '')}<span class="fin-sub">${U.esc(FS().fmtDoc(n.destinatario.doc))}</span></td></tr>` : ''}
        ${n.protocolo ? `<tr><th>Protocolo</th><td class="fs-mono">${U.esc(n.protocolo)}</td></tr>` : ''}
        ${(n.itens || []).length ? `<tr><th>Itens</th><td>${n.itens.map((i) => `${U.esc(i.desc)}<span class="fin-sub">NCM ${U.esc(FS().fmtNCM(i.ncm))} · CFOP ${U.esc(FS().fmtCFOP(i.cfop))} · ${brl(i.valor)}</span>`).join('')}</td></tr>` : ''}
        ${n.obs ? `<tr><th>Observação</th><td>${U.esc(n.obs)}</td></tr>` : ''}
        ${n.cancelada ? `<tr><th>Cancelada</th><td>${U.data(n.cancelada.data)} · ${U.esc(n.cancelada.justificativa || '')}</td></tr>` : ''}
        <tr><th>Guardada</th><td>${U.esc(n.importadaPor || '')} · ${U.data(String(n.importadaEm || '').slice(0, 10))}${n.arquivo ? ' · ' + U.esc(n.arquivo) : ''}</td></tr>
        <tr><th>Operações</th><td>${(n.vinculos || []).length ? n.vinculos.map((v) => `${U.esc(nomeDoc(v))}${pode ? ` <button class="btn btn-linha btn-p" type="button" data-fs-desv="${U.esc(v)}">Desligar</button>` : ''}`).join('<br>') : 'Nenhuma'}</td></tr>
      </tbody></table></div>
      ${pode && !n.cancelada && abertos.length ? `<div class="fs-cands" style="margin-top:12px"><select id="dn-sel" aria-label="Ligar a outra operação">${opt([['', 'Ligar a uma operação…']].concat(abertos.slice(0, 60).map((d) => [d.id, `${nomeDoc(d.id)} · ${brl(d.valor)}`])), '')}</select><button class="btn btn-linha" type="button" id="dn-ligar">Ligar</button></div>` : ''}
      <div class="acoes" style="flex-wrap:wrap">${n.xml || n.caminho || n.exemplo ? `<button class="btn btn-linha" type="button" id="dn-xml">${I.baixar}Baixar o XML</button>` : ''}<button class="btn btn-linha" type="button" id="dn-fechar">Fechar</button></div>`, (c) => {
      const $ = (q) => U.$(q, c);
      $('#dn-fechar').onclick = () => U.fecharCamada();
      U.$$('[data-fs-desv]', c).forEach((b) => b.onclick = () => { FS().desvincular(est(), n.id, b.dataset.fsDesv); gravar(`Desligou a ${rotuloNota(n, true)} de ${nomeDoc(b.dataset.fsDesv)}`); U.fecharCamada(); U.rota(); });
      if ($('#dn-ligar')) $('#dn-ligar').onclick = () => { const v = $('#dn-sel').value; if (!v) { U.toast('Escolha a operação.', true); return; } FS().vincular(est(), n.id, v); gravar(`Ligou a ${rotuloNota(n, true)} a ${nomeDoc(v)}`); U.fecharCamada(); U.rota(); };
      if ($('#dn-xml')) $('#dn-xml').onclick = async () => {
        if (n.xml) return baixarTexto(`nfe-${n.chave || n.numero}.xml`, n.xml, 'application/xml');
        if (n.exemplo) { const d = acharDoc((n.vinculos || [])[0]) || { id: n.id, tipo: 'venda-usado', data: n.emissao, valor: n.valor, maquinaNome: (n.itens && n.itens[0] && n.itens[0].desc) || '' }; return baixarTexto(`exemplo-${n.numero}.xml`, FS().xmlExemplo(est(), d, +n.numero || 1), 'application/xml'); }
        try { const url = await U.NV.abrirDoc(n.caminho); window.open(url, '_blank', 'noopener'); } catch (e) { U.toast('Não foi possível abrir o XML: ' + e.message, true); }
      };
    });
  }

  // ---------- CADASTRO FISCAL ----------
  function telaCadastro() {
    const p = fis().perfil, pode = editor(), dis = pode ? '' : 'disabled', erros = FS().validarPerfil(p);
    const campo = (id, rot, val, extra = '') => `<div class="campo"><label for="fc-${id}">${rot}</label><input id="fc-${id}" value="${U.esc(val || '')}" ${dis} ${extra}></div>`;
    U.tela.innerHTML = cab('Cadastro fiscal da revenda', 'Os dados que vão para o emissor e para a planilha do contador. Não emite nota: só organiza.', soLeitura()) + `
      ${erros.length && p.atualizadoEm ? `<div class="fs-aviso ruim">${I.alerta}<span>${erros.map((e) => U.esc(e.msg)).join(' ')}</span></div>` : ''}
      <section class="painel"><h2>${I.predio}Empresa</h2>
        <form class="campos" style="margin-top:12px" novalidate id="fc-form">
          <div class="campo inteiro"><label for="fc-razao">Razão social *</label><input id="fc-razao" value="${U.esc(p.razao)}" ${dis}></div>
          ${campo('fantasia', 'Nome fantasia', p.fantasia)}
          ${campo('cnpj', 'CNPJ *', p.cnpj ? FS().fmtCNPJ(p.cnpj) : '', 'inputmode="numeric" placeholder="00.000.000/0000-00"')}
          ${campo('ie', 'Inscrição estadual *', p.ie, 'placeholder="Números ou ISENTO"')}
          ${campo('im', 'Inscrição municipal (para NFS-e)', p.im)}
          <div class="campo"><label for="fc-regime">Regime tributário *</label><select id="fc-regime" ${dis}>${opt([['', 'Escolha']].concat(Object.entries(FS().REGIMES)), p.regime)}</select></div>
          <div class="campo"><label for="fc-cnae">CNAE principal *</label><input id="fc-cnae" list="fc-cnaes" value="${U.esc(p.cnae ? FS().fmtCNAE(p.cnae) : '')}" ${dis} placeholder="4661-3/00"><datalist id="fc-cnaes">${FS().CNAES_SUGERIDOS.map((c) => `<option value="${FS().fmtCNAE(c.cnae)}">${U.esc(c.desc)}</option>`).join('')}</datalist></div>
          ${campo('cnaes2', 'CNAEs secundários', p.cnaes2, 'placeholder="Ex.: 3314-7/12 (oficina de tratores)"')}
          ${campo('municipio', 'Município *', p.municipio)}
          <div class="campo"><label for="fc-uf">UF *</label><select id="fc-uf" ${dis}>${opt([['', '—']].concat(FS().UFS.map((u) => [u, u])), p.uf)}</select></div>
          ${campo('ibge', 'Código IBGE do município', p.ibge, 'inputmode="numeric" placeholder="7 dígitos"')}
        </form></section>
      <section class="painel bloco"><h2>${I.nota}Séries e numeração no emissor atual</h2><p class="sub">Só para conferência: quem numera é o emissor. Serve para conferir a sequência das notas importadas.</p>
        <div class="campos" style="margin-top:12px">${campo('serieNFe', 'Série da NF-e', p.serieNFe, 'inputmode="numeric"')}${campo('proxNFe', 'Próximo número da NF-e', p.proxNFe, 'inputmode="numeric"')}${campo('serieNFSe', 'Série da NFS-e', p.serieNFSe)}${campo('proxNFSe', 'Próximo número da NFS-e', p.proxNFSe, 'inputmode="numeric"')}
          ${campo('emissor', 'Emissor usado hoje', p.emissor, 'placeholder="Ex.: sistema da contabilidade, emissor da SEFAZ"')}${campo('contador', 'Contador / escritório', p.contador)}${campo('emailContador', 'E-mail do contador', p.emailContador, 'type="email"')}</div></section>
      <section class="painel bloco"><h2>${I.relogio}A partir de quando controlar</h2><p class="sub">Vendas, compras de usado e OS a partir desta data entram em "Documentos fiscais". O que é mais antigo fica fora da lista.</p>
        <div class="campos" style="margin-top:12px"><div class="campo"><label for="fc-desde">Controlar a partir de</label><input id="fc-desde" type="date" value="${U.esc(fis().desde || '')}" ${dis}></div></div>
        ${pode ? `<div class="acoes"><button class="btn btn-ouro" type="button" id="fc-ok">Salvar</button></div>` : ''}
        ${p.atualizadoEm ? `<p class="sub" style="margin-top:8px">Atualizado por ${U.esc(p.atualizadoPor || '—')} em ${U.data(p.atualizadoEm.slice(0, 10))}.</p>` : ''}</section>
      ${blocoEmissao()}`;
    if (!pode) return;
    U.$('#fc-ok').onclick = () => {
      const v = (k) => U.$('#fc-' + k).value.trim();
      const dados = {}; ['razao', 'fantasia', 'cnpj', 'ie', 'im', 'regime', 'cnae', 'cnaes2', 'municipio', 'uf', 'ibge', 'serieNFe', 'proxNFe', 'serieNFSe', 'proxNFSe', 'emissor', 'contador', 'emailContador'].forEach((k) => { dados[k] = v(k); });
      try {
        FS().salvarPerfil(est(), dados, quem());
        const desde = v('desde'); if (desde && !/^\d{4}-\d{2}-\d{2}$/.test(desde)) throw new Error('Data inválida.');
        const mudouDesde = fis().desde !== desde; fis().desde = desde;
        gravar(`Cadastro fiscal salvo (CNPJ ${FS().fmtCNPJ(fis().perfil.cnpj)}, ${FS().REGIMES[fis().perfil.regime]})${mudouDesde ? `; controle a partir de ${desde ? U.data(desde) : 'todo o histórico'}` : ''}`);
        U.toast('Cadastro fiscal salvo.'); telaCadastro();
      } catch (e) {
        U.toast(e.message, true);
        (e.erros || []).forEach((x) => { const el = U.$('#fc-' + x.campo); if (el) el.setAttribute('aria-invalid', 'true'); });
        const el = e.erros && U.$('#fc-' + e.erros[0].campo); if (el) el.focus();
      }
    };
  }

  // ---------- NATUREZAS, CFOP E NCM ----------
  function telaTabelas() {
    const pode = editor(), nats = FS().naturezas(est()), ncms = FS().NCM_SUGERIDOS.concat(fis().ncms.filter((x) => !x.inativo).map((x) => Object.assign({ proprio: true }, x)));
    const TIPO_M = { trator: 'Trator', colhedora: 'Colhedora', pulverizador: 'Pulverizador', plantadeira: 'Plantadeira', peca: 'Peça', outro: 'Outro' };
    U.tela.innerHTML = cab('Natureza, CFOP e NCM', 'Sugestões para máquinas agrícolas, peças e oficina. A revenda pode cadastrar as suas.', soLeitura()) + avisoContador + `
      <section class="painel"><div class="painel-cab"><h2>${I.lista}Naturezas de operação e CFOP</h2>${pode ? '<p><button class="btn btn-linha btn-p" type="button" id="ft-nat">Nova natureza</button></p>' : ''}</div>
        <div class="tabela-wrap"><table class="tabela fs-tab-sug"><thead><tr><th>CFOP</th><th>Natureza</th><th>Nota</th><th>Observação</th></tr></thead><tbody>
          ${nats.map((n) => `<tr><td>${n.doc === 'nfse' ? '—' : `${FS().fmtCFOP(n.cfopDentro)}${n.cfopFora ? ' / ' + FS().fmtCFOP(n.cfopFora) : ''}`}</td><td><b>${U.esc(n.nome)}</b><span class="fin-sub">${n.proprio ? 'da revenda' : 'sugestão'} · ${n.tpNF === 0 ? 'entrada' : 'saída'}</span></td><td>${n.doc === 'nfse' ? 'NFS-e' : n.doc === 'nfce' ? 'NFC-e' : 'NF-e'}</td><td>${U.esc(n.obs || '')}</td></tr>`).join('')}
        </tbody></table></div><p class="sub" style="margin-top:8px">CFOP: o primeiro número é dentro do estado (5 saída, 1 entrada); o segundo, para outro estado (6 saída, 2 entrada).</p></section>
      <section class="painel bloco"><div class="painel-cab"><h2>${I.lista}NCM sugeridos</h2>${pode ? '<p><button class="btn btn-linha btn-p" type="button" id="ft-ncm">Novo NCM</button></p>' : ''}</div>
        <div class="tabela-wrap"><table class="tabela fs-tab-sug"><thead><tr><th>NCM</th><th>Descrição</th><th>Para</th></tr></thead><tbody>
          ${ncms.map((x) => `<tr><td>${FS().fmtNCM(x.ncm)}</td><td>${U.esc(x.desc)}${x.cest ? `<span class="fin-sub">CEST ${U.esc(x.cest)}</span>` : ''}</td><td>${U.esc(TIPO_M[x.tipo] || x.tipo)}<span class="fin-sub">${x.proprio ? (x.conferido ? 'da revenda, conferido pelo contador' : 'da revenda') : 'sugestão'}</span></td></tr>`).join('')}
        </tbody></table></div>
        <p class="sub" style="margin-top:8px">Trator: o NCM muda com a potência do motor (até 37 kW, 37 a 75 kW, 75 a 130 kW, acima de 130 kW; 1 cv ≈ 0,7355 kW). O Anshur sugere pela potência quando o modelo a indica (ex.: 6125J → 125 cv).</p></section>`;
    if (!pode) return;
    U.$('#ft-nat').onclick = () => U.abrirCamada('modal', `<h2>Nova natureza de operação</h2><p class="sub">Confira o CFOP com o contador.</p>
      <form class="campos" style="margin-top:12px" novalidate><div class="campo inteiro"><label for="nn-nome">Nome *</label><input id="nn-nome" placeholder="Ex.: Venda de implemento usado"></div>
        <div class="campo"><label for="nn-doc">Nota</label><select id="nn-doc">${opt([['nfe', 'NF-e'], ['nfce', 'NFC-e'], ['nfse', 'NFS-e (serviço)']], 'nfe')}</select></div>
        <div class="campo"><label for="nn-tp">Sentido</label><select id="nn-tp">${opt([['1', 'Saída'], ['0', 'Entrada']], '1')}</select></div>
        <div class="campo"><label for="nn-d">CFOP dentro do estado</label><input id="nn-d" inputmode="numeric" placeholder="5102"></div>
        <div class="campo"><label for="nn-f">CFOP outro estado</label><input id="nn-f" inputmode="numeric" placeholder="6102"></div>
        <div class="campo inteiro"><label for="nn-obs">Observação</label><input id="nn-obs"></div></form>
      <div class="acoes"><button class="btn btn-ouro" type="button" id="nn-ok">Salvar</button><button class="btn btn-linha" type="button" id="nn-nao">Cancelar</button></div>`, (c) => {
      U.$('#nn-nao', c).onclick = () => U.fecharCamada();
      U.$('#nn-ok', c).onclick = () => { try { const n = FS().salvarNatureza(est(), { nome: U.$('#nn-nome', c).value, doc: U.$('#nn-doc', c).value, tpNF: +U.$('#nn-tp', c).value, cfopDentro: U.$('#nn-d', c).value, cfopFora: U.$('#nn-f', c).value, obs: U.$('#nn-obs', c).value }, quem()); gravar(`Cadastrou a natureza "${n.nome}" (CFOP ${n.cfopDentro || '—'})`); U.fecharCamada(); telaTabelas(); } catch (e) { U.toast(e.message, true); } };
    });
    U.$('#ft-ncm').onclick = () => U.abrirCamada('modal', `<h2>Novo NCM da revenda</h2><p class="sub">Peça ou máquina que a revenda vende sempre. Marque "conferido" só depois que o contador confirmar.</p>
      <form class="campos" style="margin-top:12px" novalidate><div class="campo"><label for="nc-ncm">NCM *</label><input id="nc-ncm" inputmode="numeric" placeholder="8433.90.90"></div>
        <div class="campo"><label for="nc-tipo">Para</label><select id="nc-tipo">${opt(Object.entries(TIPO_M), 'peca')}</select></div>
        <div class="campo inteiro"><label for="nc-desc">Descrição *</label><input id="nc-desc" placeholder="Ex.: Faca do picador da colhedora"></div>
        <div class="campo"><label for="nc-cest">CEST (se tiver ST)</label><input id="nc-cest" inputmode="numeric"></div>
        <label class="check inteiro"><input type="checkbox" id="nc-conf"> Conferido pelo contador</label></form>
      <div class="acoes"><button class="btn btn-ouro" type="button" id="nc-ok">Salvar</button><button class="btn btn-linha" type="button" id="nc-nao">Cancelar</button></div>`, (c) => {
      U.$('#nc-nao', c).onclick = () => U.fecharCamada();
      U.$('#nc-ok', c).onclick = () => { try { const x = FS().salvarNCM(est(), { ncm: U.$('#nc-ncm', c).value, tipo: U.$('#nc-tipo', c).value, desc: U.$('#nc-desc', c).value, cest: U.$('#nc-cest', c).value, conferido: U.$('#nc-conf', c).checked }, quem()); gravar(`Cadastrou o NCM ${FS().fmtNCM(x.ncm)} (${x.desc})${x.conferido ? ', conferido pelo contador' : ''}`); U.fecharCamada(); telaTabelas(); } catch (e) { U.toast(e.message, true); } };
    });
  }

  // ---------- demonstração (dados fictícios; nunca no ambiente real) ----------
  function semearDemo(ui) {
    U = ui; const e = ui.estado;
    if (ui.OP || !FS() || (e.fiscal && e.fiscal.semente)) return;
    const F = FS(), f = F.garantir(e), hoje = ui.hojeISO(), lojas = e.lojas && e.lojas.length ? e.lojas : ['Orlândia'];
    f.perfil = Object.assign(F.PERFIL_VAZIO(), { razao: 'Revenda Modelo Máquinas Agrícolas Ltda (fictícia)', fantasia: 'Revenda Modelo', cnpj: '11222333000181', ie: '123456789110', im: '12345', regime: 'presumido', cnae: '4661300', cnaes2: '3314-7/12', municipio: lojas[0], uf: 'SP', ibge: '', serieNFe: '1', proxNFe: '1840', serieNFSe: '1', proxNFSe: '412', emissor: 'Emissor da contabilidade (fictício)', contador: 'Escritório Contábil Exemplo (fictício)', atualizadoEm: new Date(Date.now() - 20 * 864e5).toISOString(), atualizadoPor: 'Lúcia' });
    f.desde = (e.fin && e.fin.inicio) || F.hojeISO();
    const quem_ = 'Lúcia', mes = hoje.slice(0, 7);
    const lista = F.documentos(e, ctx());
    let num = 1700, nfse = 380;
    lista.slice().reverse().forEach((d, i) => {
      const doMes = d.data.slice(0, 7) === mes;
      if (doMes) return; // o mês corrente fica sem nota (é o trabalho do dia)
      if (!doMes && i % 9 === 4) return; // algumas antigas esquecidas, para a lista ter o que mostrar
      if (d.tipo === 'compra-usado' && i % 7 === 3) { F.dispensar(e, d.id, 'Produtor emitiu nota de produtor (papel); cópia na pasta do usado', quem_, new Date(d.data + 'T15:00:00').toISOString()); return; }
      if (d.tipo === 'os') { F.informarNota(e, d.id, { modelo: 'nfse', numero: String(nfse++), emissao: d.data, valor: d.valor, obs: 'NFS-e da prefeitura (exemplo)' }, quem_, new Date(d.data + 'T16:00:00').toISOString()); return; }
      const n = ++num, saida = F.TIPOS[d.tipo].saida, ch = F.chaveExemplo({ data: d.data, cnpj: f.perfil.cnpj, serie: 1, numero: n, codigo: String(n * 7919).slice(-8) }), s = F.sugestaoDoc(e, d);
      f.notas.push({ id: 'NF' + ch, origem: 'xml', exemplo: true, chave: ch, modelo: '55', serie: '1', numero: String(n), emissao: d.data, tpNF: saida ? 1 : 0, tpAmb: 2, natOp: s.natureza ? s.natureza.nome : '',
        emitente: { doc: f.perfil.cnpj, nome: f.perfil.razao, uf: 'SP' }, destinatario: { doc: '', nome: d.pessoa || (saida ? 'Cliente (fictício)' : 'Produtor (fictício)'), uf: 'SP' }, valor: d.valor, itens: [{ desc: F.descricaoItem(d), ncm: s.ncm ? s.ncm.ncm : '', cfop: s.cfop, valor: d.valor || 0 }],
        protocolo: '135' + String(n).padStart(12, '0'), vinculos: [d.id], arquivo: `nfe-${n}.xml`, importadaEm: new Date(d.data + 'T17:00:00').toISOString(), importadaPor: quem_ });
    });
    // nota recebida da fábrica (compra de máquina nova): guardada, sem operação para ligar
    const chF = F.chaveExemplo({ data: F.hojeISO(), cnpj: '11444777000161', serie: 3, numero: 552301, codigo: '55230101' });
    f.notas.push({ id: 'NF' + chF, origem: 'xml', exemplo: true, chave: chF, modelo: '55', serie: '3', numero: '552301', emissao: hoje.slice(8) >= '02' ? hoje.slice(0, 8) + '02' : hoje, tpNF: 1, tpAmb: 2, natOp: 'Venda de produção do estabelecimento', emitente: { doc: '11444777000161', nome: 'Fábrica de Implementos Exemplo S.A. (fictícia)', uf: 'SP' }, destinatario: { doc: f.perfil.cnpj, nome: f.perfil.razao, uf: 'SP' }, valor: 412000, itens: [{ desc: 'Plantadeira 13 linhas (fictícia)', ncm: '84323110', cfop: '5101', valor: 412000 }], protocolo: '135000000552301', vinculos: [], arquivo: 'nfe-fabrica.xml', importadaEm: new Date().toISOString(), importadaPor: quem_ });
    f.semente = true;
    ui.salvar();
  }

  // ---------- busca global ----------
  function buscar(q, ui) {
    if (!FS() || !q || q.length < 2 || !FS().podeVer(ui.eu().perfil)) return [];
    U = ui; const s = q.toLowerCase(), out = [];
    fis().notas.filter((n) => [n.numero, n.chave, n.emitente && n.emitente.nome, n.destinatario && n.destinatario.nome].join(' ').toLowerCase().includes(s)).slice(0, 4)
      .forEach((n) => out.push({ g: 'Fiscal', n: rotuloNota(n, true), d: (n.destinatario && n.destinatario.nome) || '', ir: () => { location.hash = '#fs-notas'; setTimeout(() => detalheNota(n.id), 320); } }));
    docs().filter((d) => d.situacao === 'sem-nota' && [d.pessoa, d.maquinaNome, d.chassi, d.os].join(' ').toLowerCase().includes(s)).slice(0, 4)
      .forEach((d) => out.push({ g: 'Fiscal', n: `Sem nota: ${FS().TIPOS[d.tipo].nome}${d.maquinaNome ? ' · ' + d.maquinaNome : ''}`, d: `${U.data(d.data)} · ${brl(d.valor)}`, ir: () => { location.hash = '#fs-documentos'; setTimeout(() => detalheDoc(d.id), 320); } }));
    return out;
  }

  const T = (fn) => (ui) => {
    U = ui;
    if (!FS()) { ui.tela.innerHTML = '<p class="vazio">Carregando a área Fiscal…</p>'; return; }
    estilo(); FS().garantir(ui.estado); fn();
  };
  const ITEM = (aba, rotulo, curto, icone) => ({ aba, rotulo, curto, icone });
  const ICO = {
    painel: '<path d="M4 13h6V4H4zM14 20h6V11h-6zM14 4v4h6V4zM4 20h6v-4H4z"/>', docs: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6M9 16h3"/>',
    notas: '<path d="M4 7h6l2 2h8v10H4zM12 17v-5M9.5 14.5 12 12l2.5 2.5"/>', cadastro: '<path d="M4 21V5l8-2v18M12 9l8 2v10M2 21h20"/>', tabelas: '<path d="M4 5h16v14H4zM4 10h16M10 10v9"/>'
  };
  R.registrar({
    id: 'fiscal', nome: 'Fiscal', curto: 'Fiscal', ordem: 70, pronta: true, inicio: 'fs', perfis: VER,
    descricao: 'O que precisa de nota, dados prontos para o seu emissor e XML autorizado guardado na operação. Emissão direto pelo Anshur: em preparação.',
    icone: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6M9 16h3"/>',
    previsto: ['Emissão de NF-e direto pelo Anshur: em preparação (só depois de homologada na SEFAZ com o certificado da revenda)'],
    hoje: 'O Anshur não emite nota: organiza, exporta os dados e guarda o XML autorizado emitido no seu emissor.',
    acao: { rotulo: 'Importar XML', href: '#fs-notas', novo: true },
    dados: { fiscal: ['naturezas', 'ncms', 'notas', 'decisoes'] },
    menu: [
      { grupo: 'Fiscal', itens: [ITEM('fs', 'Painel fiscal', 'Painel', ICO.painel), ITEM('fs-documentos', 'Documentos fiscais', 'Documentos', ICO.docs), ITEM('fs-notas', 'Notas guardadas (XML)', 'Notas', ICO.notas)] },
      { grupo: 'Cadastros', itens: [ITEM('fs-cadastro', 'Cadastro fiscal', 'Cadastro', ICO.cadastro), ITEM('fs-tabelas', 'Natureza, CFOP e NCM', 'CFOP/NCM', ICO.tabelas)] }
    ],
    telas: { fs: T(telaPainel), 'fs-documentos': T(telaDocumentos), 'fs-notas': T(telaNotas), 'fs-cadastro': T(telaCadastro), 'fs-tabelas': T(telaTabelas) },
    permissoes: { fs: VER, 'fs-documentos': VER, 'fs-notas': VER, 'fs-cadastro': VER, 'fs-tabelas': VER },
    numero: (ui) => {
      U = ui; if (!FS()) return null;
      const r = FS().resumo(ui.estado, ctx());
      return { valor: String(r.vendasMesSemNota), texto: `vendas do mês sem nota vinculada${r.vendasMesSemNota ? ' · ' + brl(r.valorVendasMesSemNota) : ''}${r.comprasSemNota ? ` · ${plural(r.comprasSemNota, 'compra de usado', 'compras de usado')} sem nota` : ''}${r.perfilOk ? '' : ' · cadastro fiscal incompleto'}`, alerta: r.vendasMesSemNota > 0 || !r.perfilOk };
    },
    buscar,
    novo: (ui) => { U = ui; if (!FS()) return; estilo(); abrirImportar(); },
    iniciar: (ui) => { try { if (FS()) semearDemo(ui); } catch (e) { console.error('Fiscal: demonstração', e); } }
  });
})(typeof window !== 'undefined' ? window : globalThis);
