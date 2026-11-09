// Área FINANCEIRO: telas. As regras (puras, testadas) estão em areas/financeiro-regras.js (window.FINANCEIRO).
// Segue o padrão das áreas (README › Áreas): registra menu, telas, permissões, número da entrada, busca e dados.
// Permissões: dono e financeiro editam; gerente vê; auditor só lê; vendedor e oficina não veem.
(function (raiz) {
  const F = raiz.FINANCEIRO, R = raiz.ANSHUR_AREAS;
  if (!F || !R || typeof document === 'undefined') return;
  let U = null; // contexto de interface que o app.js entrega a cada tela
  const brl = F.brl;
  const VER = ['dono', 'financeiro', 'gerente', 'auditor'];
  const ctx = () => ({ trocas: U.A.todasTrocas || U.A.trocas || [], financiadas: U.A.financiadas || [], cfg: U.K.cfg, hoje: U.hojeISO() });
  const est = () => U.estado;
  const editor = () => F.podeEditar(U.eu().perfil) && !(U.NV && U.NV.somenteLeitura);
  const fl = () => ({ loja: U.estado.lojaAtual || '', lojas: U.K.lojasPermitidas });
  const quem = () => U.eu().nome;
  const fin = () => F.garantir(est());
  function gravar(texto) { U.log('financeiro', texto); U.K.aplicarFinanceiro(U.A.todasTrocas || U.A.trocas, est()); U.salvar(); }
  const nomeConta = (id) => { const c = F.conta(est(), id); return c ? c.nome : '—'; };
  const nomeCat = (id) => { const c = F.categoria(est(), id); return c ? c.nome : 'Sem categoria'; };
  const nomeCentro = (id) => { const c = F.centros(est()).find((x) => x.id === id); return c ? c.nome : ''; };
  const nomeCliente = (id) => { const c = U.K.cad.cliente(id); return c ? c.nome : ''; };
  const nomeForn = (id) => { const c = U.K.cad.fornecedor(id); return c ? c.nome : ''; };
  const pessoa = (l) => (l.tipo === 'receber' ? nomeCliente(l.cliente) : nomeForn(l.fornecedor)) || l.favorecido || '';
  const nomeMaq = (id) => { const m = id && U.K.cad.maquina(id); return m ? m.nome + (m.ano ? ' ' + m.ano : '') : ''; };
  const sitTag = (l) => { const s = F.situacao(l, U.hojeISO()); return `<span class="sit sit-${s}">${F.NOMES_SIT[s]}${s === 'vencido' ? ' · ' + F.diasEntre(l.vencimento, U.hojeISO()) + ' d' : ''}</span>`; };
  const opt = (pares, sel) => pares.map(([v, n]) => `<option value="${U.esc(v)}" ${String(sel) === String(v) ? 'selected' : ''}>${U.esc(n)}</option>`).join('');
  const lojasVer = () => U.K.lojasPermitidas || U.estado.lojas || [];
  const contaPadrao = (loja) => { const cs = fin().contas.filter((c) => !c.inativa); return (cs.find((c) => c.loja === loja && c.tipo === 'banco') || cs.find((c) => c.tipo === 'banco') || cs[0] || {}).id || ''; };
  const ic = (d) => `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
  const I = {
    carteira: ic('<path d="M3 7h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM3 7l2-3h12l2 3M16 13.5h2"/>'),
    entra: ic('<path d="M12 19V5M6 11l6-6 6 6"/>'), sai: ic('<path d="M12 5v14M6 13l6 6 6-6"/>'),
    alerta: ic('<path d="M12 3 2 20h20L12 3zM12 10v4M12 17v.5"/>'), linha: ic('<path d="M3 17l6-6 4 4 8-8M15 7h6v6"/>'),
    banco: ic('<path d="M3 10l9-6 9 6M5 10v9M19 10v9M9 10v9M15 10v9M3 21h18"/>'), check: ic('<path d="M5 12.5l4.5 4.5L19 7.5"/>'),
    zap: ic('<path d="M4 20l1.3-4A8 8 0 1 1 8 18.7z"/><path d="M9 9.5c.5 2.5 2.5 4.5 5 5l1.2-1.4 2 .9c-.3 1.4-1.4 2-2.6 2-3.9-.4-6.6-3.1-7-7 0-1.2.6-2.3 2-2.6l.9 2z"/>')
  };
  const vazio = (txt) => `<p class="vazio">${txt}</p>`;
  const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;
  const cab = (titulo, sub, botoes = '') => `<div class="titulo"><div><h1>${titulo}</h1><p>${sub}</p></div>${botoes ? `<div class="fin-acoes">${botoes}</div>` : ''}</div>`;
  const botoesNovo = () => (editor() ? `<button class="btn btn-ouro" type="button" data-fin-novo="receber">${I.entra}<span>A receber</span></button><button class="btn btn-ouro" type="button" data-fin-novo="pagar">${I.sai}<span>A pagar</span></button>` : (U.eu().perfil === 'auditor' || U.eu().perfil === 'gerente') ? '<span class="tag declarado">Só leitura</span>' : '');
  function ligarComuns() {
    U.$$('[data-fin-novo]', U.tela).forEach((b) => b.onclick = () => formLancamento({ tipo: b.dataset.finNovo }));
    U.$$('[data-lanc]', U.tela).forEach((b) => {
      b.onclick = (e) => { if (e.target.closest('[data-baixar], a')) return; detalhe(b.dataset.lanc); };
      b.onkeydown = (e) => { if (e.key === 'Enter' && e.target === b) detalhe(b.dataset.lanc); };
    });
    U.$$('[data-baixar]', U.tela).forEach((b) => b.onclick = (e) => { e.stopPropagation(); formBaixa(b.dataset.baixar); });
  }
  const acharLanc = (id) => F.todos(est(), ctx()).find((l) => l.id === id);

  // ---------- começo: data de início e primeira conta ----------
  function precisaComecar() { return !fin().inicio || !fin().contas.length; }
  function blocoComecar() {
    if (!precisaComecar()) return '';
    if (!editor()) return `<section class="painel fin-comecar"><h2>${I.carteira}O Financeiro ainda não foi configurado</h2><p class="sub">Quem configura é o dono ou o financeiro: data de início e as contas bancárias e o caixa.</p></section>`;
    return `<section class="painel fin-comecar"><h2>${I.carteira}Começar o Financeiro</h2><p class="sub">Dois passos: a partir de quando o Anshur controla o caixa (vendas e comissões a partir desta data viram lançamentos sozinhas) e as contas com o saldo de hoje.</p>
      <div class="campos" style="margin-top:12px"><div class="campo"><label for="fc-ini">Controlar a partir de</label><input id="fc-ini" type="date" value="${fin().inicio || U.hojeISO()}"></div>
      <div class="campo"><label for="fc-conta">Primeira conta (banco ou caixa)</label><input id="fc-conta" placeholder="Ex.: Banco do Brasil · Matriz" value="${fin().contas.length ? U.esc(fin().contas[0].nome) : ''}" ${fin().contas.length ? 'disabled' : ''}></div>
      ${fin().contas.length ? '' : `<div class="campo"><label for="fc-saldo">Saldo nessa data (R$)</label><input id="fc-saldo" inputmode="decimal" placeholder="0,00"></div><div class="campo"><label for="fc-loja">Loja</label><select id="fc-loja">${opt([['', 'Todas / matriz']].concat(lojasVer().map((l) => [l, l])), '')}</select></div>`}</div>
      <div class="acoes"><button class="btn btn-ouro" type="button" id="fc-ok">Começar</button></div></section>`;
  }
  function ligarComecar() {
    const b = U.$('#fc-ok'); if (!b) return;
    b.onclick = () => {
      const ini = U.$('#fc-ini').value; if (!ini) { U.toast('Escolha a data de início.', true); return; }
      fin().inicio = ini;
      if (!fin().contas.length) { const n = U.$('#fc-conta').value.trim(); if (!n) { U.toast('Dê um nome para a primeira conta.', true); return; } F.criarConta(est(), { nome: n, tipo: /caixa/i.test(n) ? 'caixa' : 'banco', saldoInicial: U.num(U.$('#fc-saldo').value), dataSaldo: ini, loja: U.$('#fc-loja').value }); }
      gravar('Financeiro configurado a partir de ' + F.dataBR(ini)); U.toast('Financeiro pronto.'); U.rota();
    };
  }

  // ---------- PAINEL ----------
  function telaPainel() {
    const hoje = U.hojeISO(), r = F.resumo(est(), Object.assign({ hoje, ctx: ctx() }, fl())), fx = F.fluxo(est(), Object.assign({ dias: 30, hoje, ctx: ctx() }, fl()));
    const prox = F.todos(est(), ctx()).filter((l) => !l.cancelado && !l.pago && F.daLoja(fl().loja, fl().lojas)(l) && l.vencimento <= F.somarDias(hoje, 7)).sort((a, b) => a.vencimento.localeCompare(b.vencimento)).slice(0, 12);
    const sal = F.saldos(est(), hoje).filter((x) => F.daLoja(fl().loja, fl().lojas)(x.conta));
    const inad = F.inadimplencia(est(), Object.assign({ hoje, ctx: ctx(), nomeCliente }, fl()));
    const pontos = fx.linhas.filter((x, i) => i % 3 === 0 || i === fx.linhas.length - 1).map((x) => ({ r: F.dataBR(x.data).slice(0, 5), v: x.saldo }));
    U.tela.innerHTML = cab('Financeiro', `Caixa, contas a pagar e a receber${fl().loja ? ' · loja ' + U.esc(fl().loja) : ''}. Saldos sempre recalculados dos lançamentos.`, botoesNovo()) + blocoComecar() + `
      <div class="kpis fin-k">
        <a class="kpi k-marfim" href="#fin-contas"><span class="rot">${I.banco}Saldo em contas</span><span class="val">${brl(r.saldo)}</span><span class="exp">${sal.length} ${sal.length === 1 ? 'conta' : 'contas e caixas'}</span></a>
        <a class="kpi k-salvia" href="#fin-receber"><span class="rot">${I.entra}A receber hoje</span><span class="val">${brl(r.receberHoje.valor)}</span><span class="exp">${plural(r.receberHoje.n, 'título', 'títulos')} · ${brl(r.receber7.valor)} em 7 dias</span></a>
        <a class="kpi ${r.pagarVencido.valor ? 'k-risco' : ''}" href="#fin-pagar"><span class="rot">${I.sai}A pagar hoje</span><span class="val">${brl(r.pagarHoje.valor)}</span><span class="exp">${plural(r.pagarHoje.n, 'conta', 'contas')}${r.pagarVencido.n ? ` · ${brl(r.pagarVencido.valor)} vencidas` : ''}</span></a>
        <a class="kpi ${fx.menor.saldo < 0 ? 'k-risco' : ''}" href="#fin-fluxo"><span class="rot">${I.linha}Saldo em 30 dias</span><span class="val">${brl(fx.saldoFinal)}</span><span class="exp">${fx.menor.saldo < 0 ? `Fica negativo em ${F.dataBR(fx.menor.data)}` : `Menor saldo ${brl(fx.menor.saldo)} em ${F.dataBR(fx.menor.data)}`}</span></a>
      </div>
      <div class="grade-2">
        <section class="painel"><h2>${I.linha}Saldo previsto, 30 dias</h2><p class="sub" style="margin:4px 0 8px">Entradas ${brl(fx.entradas)} · saídas ${brl(fx.saidas)}${fx.aCobrar ? ` · ${brl(fx.aCobrar)} vencidos a cobrar ficam fora da conta` : ''}</p>${pontos.length > 1 ? U.G.linha(pontos, { formato: (v) => U.mil(v) }) : ''}</section>
        <section class="painel"><div class="painel-cab"><h2>${I.banco}Contas e caixa</h2><p><a class="link" href="#fin-contas">Ver movimentos</a></p></div>
          ${sal.length ? `<ul class="fin-saldos">${sal.map((x) => `<li><span><b>${U.esc(x.conta.nome)}</b><span>${x.conta.tipo === 'caixa' ? 'Caixa' : 'Banco'}${x.conta.loja ? ' · ' + U.esc(x.conta.loja) : ''}</span></span><b class="${x.saldo < 0 ? 'neg' : ''}">${brl(x.saldo)}</b></li>`).join('')}</ul>` : vazio('Nenhuma conta cadastrada.')}</section>
      </div>
      <section class="painel bloco"><div class="painel-cab"><h2>${I.alerta}Vencidos e próximos 7 dias</h2><p>${prox.length ? 'Toque para ver; "Baixar" registra o pagamento.' : ''}</p></div>${tabelaLanc(prox, { semFiltro: true })}</section>
      ${inad.clientes.length ? `<section class="painel bloco"><div class="painel-cab"><h2>${I.zap}Inadimplência</h2><p>${brl(inad.total)} vencidos com ${inad.clientes.length} ${inad.clientes.length === 1 ? 'cliente' : 'clientes'} · <a class="link" href="#fin-inadimplencia">Cobrar</a></p></div></section>` : ''}`;
    ligarComecar(); ligarComuns();
  }

  // ---------- tabela de lançamentos ----------
  function tabelaLanc(lista, { semFiltro } = {}) {
    if (!lista.length) return vazio(semFiltro ? 'Nada vencendo nos próximos 7 dias.' : 'Nenhum lançamento com estes filtros.');
    const pode = editor();
    return `<div class="tabela-wrap"><table class="tabela fin-tab"><thead><tr><th>Vencimento</th><th>Descrição</th><th>Categoria</th><th class="n">Valor</th><th>Situação</th><th></th></tr></thead><tbody>
      ${lista.map((l) => { const p = pessoa(l), m = nomeMaq(l.maquina); return `<tr data-lanc="${U.esc(l.id)}" tabindex="0" class="clicavel"><td>${F.dataBR(l.vencimento)}</td>
        <td><b>${U.esc(l.descricao)}</b><span class="fin-sub">${[l.tipo === 'receber' ? 'Receber' : 'Pagar', p && U.esc(p), l.parcela && `parcela ${l.parcela.n}/${l.parcela.de}`, l.recorrencia && `mensal ${l.recorrencia.n}/${l.recorrencia.de}`, m && !l.descricao.includes(m.split(' ').slice(-2).join(' ')) && U.esc(m), l.loja && U.esc(l.loja), l.auto && 'automático', l.estimada && 'valor estimado'].filter(Boolean).join(' · ')}</span></td>
        <td>${U.esc(nomeCat(l.categoria))}</td><td class="n ${l.tipo === 'pagar' ? 'neg' : 'pos'}">${l.tipo === 'pagar' ? '−' : ''}${brl(F.valorEfetivo(l))}</td><td>${sitTag(l)}</td>
        <td class="n">${pode && !l.pago && !l.cancelado ? `<button class="btn btn-linha btn-p" type="button" data-baixar="${U.esc(l.id)}">Baixar</button>` : l.conciliado ? `<span class="tag comprovado" title="Conciliado com o extrato">${I.check}Extrato</span>` : ''}</td></tr>`; }).join('')}
      </tbody></table></div>`;
  }

  // ---------- CONTAS A PAGAR / A RECEBER ----------
  const filtros = { pagar: { sit: 'abertos', q: '', cat: '', centro: '', de: '', ate: '' }, receber: { sit: 'abertos', q: '', cat: '', centro: '', de: '', ate: '' } };
  function telaLista(tipo) {
    const f = filtros[tipo], hoje = U.hojeISO(), okLoja = F.daLoja(fl().loja, fl().lojas);
    const base = F.todos(est(), ctx()).filter((l) => l.tipo === tipo && okLoja(l));
    const passa = (l) => {
      const s = F.situacao(l, hoje);
      if (f.sit === 'abertos' && !['aberto', 'hoje', 'vencido'].includes(s)) return false;
      if (f.sit !== 'abertos' && f.sit !== 'todos' && s !== f.sit) return false;
      if (f.sit === 'todos' && s === 'cancelado') return false;
      if (f.cat && l.categoria !== f.cat) return false; if (f.centro && l.centro !== f.centro) return false;
      if (f.de && l.vencimento < f.de) return false; if (f.ate && l.vencimento > f.ate) return false;
      if (f.q && ![l.descricao, pessoa(l), nomeMaq(l.maquina), l.documento, l.loja].join(' ').toLowerCase().includes(f.q.toLowerCase())) return false;
      return true;
    };
    const lista = base.filter(passa).sort((a, b) => (f.sit === 'pago' ? (b.pago.data || '').localeCompare(a.pago.data || '') : a.vencimento.localeCompare(b.vencimento)));
    const tot = F.r2(lista.reduce((s, l) => s + F.valorEfetivo(l), 0));
    const abertos = base.filter((l) => !l.pago && !l.cancelado), venc = abertos.filter((l) => l.vencimento < hoje);
    const nome = tipo === 'pagar' ? 'Contas a pagar' : 'Contas a receber';
    U.tela.innerHTML = cab(nome, tipo === 'pagar' ? 'Fornecedores, despesas, comissões, juros do floor plan e compras. Baixe com a data e a forma do pagamento.' : 'Vendas de usados (automáticas), máquinas novas, oficina, peças e garantias. Parcele, receba e cobre.', botoesNovo()) + `
      <div class="kpis fin-k fin-kpis3">
        <div class="kpi"><span class="rot">${tipo === 'pagar' ? I.sai : I.entra}Em aberto</span><span class="val">${brl(abertos.reduce((s, l) => s + l.valor, 0))}</span><span class="exp">${plural(abertos.length, 'título', 'títulos')}</span></div>
        <div class="kpi ${venc.length ? 'k-risco' : ''}"><span class="rot">${I.alerta}Vencidos</span><span class="val">${brl(venc.reduce((s, l) => s + l.valor, 0))}</span><span class="exp">${plural(venc.length, 'título', 'títulos')}</span></div>
        <div class="kpi k-salvia"><span class="rot">${I.check}${tipo === 'pagar' ? 'Pago' : 'Recebido'} no mês</span><span class="val">${brl(base.filter((l) => l.pago && F.mesDe(l.pago.data) === F.mesDe(hoje)).reduce((s, l) => s + l.pago.valor, 0))}</span><span class="exp">${F.mesDe(hoje).split('-').reverse().join('/')}</span></div>
      </div>
      <section class="painel">
        <div class="fin-filtros">
          <div class="abas-modo" role="group" aria-label="Situação">${[['abertos', 'Em aberto'], ['vencido', 'Vencidos'], ['hoje', 'Hoje'], ['pago', tipo === 'pagar' ? 'Pagos' : 'Recebidos'], ['todos', 'Todos'], ['cancelado', 'Cancelados']].map(([v, n]) => `<button type="button" data-sit="${v}" aria-pressed="${f.sit === v}">${n}</button>`).join('')}</div>
          <div class="campos fin-campos">
            <div class="campo"><label for="lf-q">Buscar</label><input id="lf-q" value="${U.esc(f.q)}" placeholder="Descrição, ${tipo === 'pagar' ? 'fornecedor' : 'cliente'}, máquina, documento"></div>
            <div class="campo"><label for="lf-cat">Categoria</label><select id="lf-cat">${opt([['', 'Todas']].concat(F.categorias(est()).filter((c) => c.tipo === tipo).map((c) => [c.id, c.nome])), f.cat)}</select></div>
            <div class="campo"><label for="lf-cc">Centro de custo</label><select id="lf-cc">${opt([['', 'Todos']].concat(F.centros(est()).map((c) => [c.id, c.nome])), f.centro)}</select></div>
            <div class="campo"><label for="lf-de">Vencimento de</label><input id="lf-de" type="date" value="${f.de}"></div>
            <div class="campo"><label for="lf-ate">até</label><input id="lf-ate" type="date" value="${f.ate}"></div>
          </div></div>
        <div id="lf-tab">${tabelaLanc(lista)}</div>
        <div class="fin-rodape"><span>${lista.length} lançamentos · total <b>${brl(tot)}</b></span><button class="btn btn-linha" type="button" id="lf-csv">Exportar planilha</button></div>
      </section>`;
    U.$$('[data-sit]', U.tela).forEach((b) => b.onclick = () => { f.sit = b.dataset.sit; telaLista(tipo); });
    const at = (k, el, ev = 'onchange') => { el[ev] = () => { f[k] = el.value; if (k === 'q') { clearTimeout(at.t); at.t = setTimeout(() => { telaLista(tipo); const i = U.$('#lf-q'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }, 250); } else telaLista(tipo); }; };
    at('q', U.$('#lf-q'), 'oninput'); at('cat', U.$('#lf-cat')); at('centro', U.$('#lf-cc')); at('de', U.$('#lf-de')); at('ate', U.$('#lf-ate'));
    U.$('#lf-csv').onclick = () => U.baixarCSV(`anshur-${tipo}-${U.hojeISO()}.csv`, [['Vencimento', 'Competência', 'Descrição', tipo === 'pagar' ? 'Fornecedor' : 'Cliente', 'Categoria', 'Centro de custo', 'Loja', 'Máquina', 'Valor', 'Situação', 'Pago em', 'Valor pago', 'Forma', 'Conta', 'Conciliado', 'Id']]
      .concat(lista.map((l) => [F.dataBR(l.vencimento), F.dataBR(l.competencia), l.descricao, pessoa(l), nomeCat(l.categoria), nomeCentro(l.centro), l.loja, nomeMaq(l.maquina), String(l.valor).replace('.', ','), F.NOMES_SIT[F.situacao(l, U.hojeISO())], l.pago ? F.dataBR(l.pago.data) : '', l.pago ? String(l.pago.valor).replace('.', ',') : '', l.pago ? F.FORMAS[l.pago.forma] : '', l.pago ? nomeConta(l.pago.conta) : '', l.conciliado ? 'sim' : '', l.id])));
    ligarComuns();
  }

  // ---------- formulário de lançamento ----------
  function campoPessoa(tipo, valor) {
    const l = tipo === 'receber' ? U.K.cad.clientes() : U.K.cad.fornecedores();
    return `<div class="campo"><label for="fl-pessoa">${tipo === 'receber' ? 'Cliente' : 'Fornecedor / favorecido'}</label><input id="fl-pessoa" list="dl-fl-pessoa" value="${U.esc(valor || '')}" autocomplete="off" placeholder="Digite: acha no cadastro ou cria"><datalist id="dl-fl-pessoa">${l.map((c) => `<option value="${U.esc(c.nome)}">`).join('')}</datalist></div>`;
  }
  const opMaquinas = () => U.K.cad.maquinas().filter((m) => !m.vendido || (m.t && m.t.saida && F.diasEntre(m.t.saida, U.hojeISO()) < 120)).map((m) => [m.id, `${m.nome}${m.ano ? ' ' + m.ano : ''}${m.chassi ? ' · ' + m.chassi : ''}${m.origem === 'nova' ? ' (nova)' : m.vendido ? ' (vendida)' : ''}`]);
  function formLancamento(pre = {}, editar = null) {
    if (!editor()) { U.toast('Só o dono e o financeiro lançam.', true); return; }
    const l = editar || {}, tipo = l.tipo || pre.tipo || 'pagar', pago = !!l.pago;
    const v = Object.assign({ vencimento: U.hojeISO(), loja: fl().loja || '' }, pre, l);
    U.abrirCamada('modal larga-modal', `<h2>${editar ? 'Editar lançamento' : tipo === 'pagar' ? 'Nova conta a pagar' : 'Nova conta a receber'}</h2>${pago ? '<p class="sub">Já está baixado: valor e vencimento ficam como estão (estorne para mudar).</p>' : ''}
      <form class="campos" style="margin-top:12px" novalidate>
        <div class="campo inteiro"><label for="fl-desc">Descrição *</label><input id="fl-desc" value="${U.esc(v.descricao || '')}" placeholder="${tipo === 'pagar' ? 'Ex.: Frete da colhedora até Bebedouro' : 'Ex.: Venda do trator 6125J, entrada'}"></div>
        <div class="campo"><label for="fl-valor">Valor (R$) *</label><input id="fl-valor" inputmode="decimal" value="${v.valor ? String(v.valor).replace('.', ',') : ''}" ${pago ? 'disabled' : ''}></div>
        <div class="campo"><label for="fl-venc">Vencimento *</label><input id="fl-venc" type="date" value="${v.vencimento}" ${pago ? 'disabled' : ''}></div>
        <div class="campo"><label for="fl-cat">Categoria</label><select id="fl-cat">${opt(F.categorias(est()).filter((c) => c.tipo === tipo).map((c) => [c.id, c.nome]), v.categoria || (tipo === 'pagar' ? 'des-outras' : 'rec-outras'))}</select></div>
        <div class="campo"><label for="fl-cc">Centro de custo</label><select id="fl-cc">${opt([['', '—']].concat(F.centros(est()).map((c) => [c.id, c.nome])), v.centro || '')}</select></div>
        ${campoPessoa(tipo, l.id ? pessoa(l) : v.pessoa)}
        <div class="campo"><label for="fl-loja">Loja</label><select id="fl-loja">${opt([['', 'Geral / matriz']].concat(lojasVer().map((x) => [x, x])), v.loja || '')}</select></div>
        <div class="campo"><label for="fl-maq">Máquina (opcional)</label><select id="fl-maq">${opt([['', 'Nenhuma']].concat(opMaquinas()), v.maquina || '')}</select></div>
        <div class="campo"><label for="fl-doc">Nº do documento / nota / OS</label><input id="fl-doc" value="${U.esc(v.documento || v.os || '')}"></div>
        ${tipo === 'receber' ? `<div class="campo"><label for="fl-custo">Custo do que foi vendido (R$, opcional)</label><input id="fl-custo" inputmode="decimal" value="${v.custoVenda ? String(v.custoVenda).replace('.', ',') : ''}" placeholder="Máquina nova ou peça: entra na DRE"></div>` : ''}
        <div class="campo"><label for="fl-comp">Competência (mês do fato)</label><input id="fl-comp" type="date" value="${v.competencia || ''}" placeholder="igual ao vencimento"></div>
        ${editar ? '' : `<div class="campo"><label for="fl-rep">Repetição</label><select id="fl-rep">${opt([['1', 'Uma vez'], ['parc', 'Parcelado (divide o valor)'], ['rec', 'Todo mês (repete o valor)']], '1')}</select></div>
        <div class="campo" id="fl-n-c" hidden><label for="fl-n">Quantas vezes</label><input id="fl-n" inputmode="numeric" value="3"></div>
        <label class="check inteiro"><input type="checkbox" id="fl-pago"> Já foi ${tipo === 'pagar' ? 'pago' : 'recebido'} (baixar agora)</label>
        <div class="campos inteiro" id="fl-baixa" hidden><div class="campo"><label for="fl-bdata">Data do pagamento</label><input id="fl-bdata" type="date" value="${U.hojeISO()}"></div>
          <div class="campo"><label for="fl-bconta">Conta / caixa</label><select id="fl-bconta">${opt(fin().contas.filter((c) => !c.inativa).map((c) => [c.id, c.nome]), contaPadrao(v.loja))}</select></div>
          <div class="campo"><label for="fl-bforma">Forma</label><select id="fl-bforma">${opt(Object.entries(F.FORMAS), 'pix')}</select></div></div>`}
        <div class="campo inteiro"><label for="fl-obs">Observação</label><input id="fl-obs" value="${U.esc(v.obs || '')}"></div>
      </form><div class="acoes"><button class="btn btn-ouro" type="button" id="fl-ok">Salvar</button><button class="btn btn-linha" type="button" id="fl-nao">Cancelar</button></div>`, (c) => {
      const $ = (s) => U.$(s, c);
      if (!editar) {
        $('#fl-rep').onchange = () => { $('#fl-n-c').hidden = $('#fl-rep').value === '1'; };
        $('#fl-pago').onchange = () => { $('#fl-baixa').hidden = !$('#fl-pago').checked; };
        $('#fl-loja').onchange = () => { $('#fl-bconta').value = contaPadrao($('#fl-loja').value); };
      }
      $('#fl-nao').onclick = () => U.fecharCamada();
      $('#fl-ok').onclick = () => {
        const d = { tipo, descricao: $('#fl-desc').value.trim(), valor: pago ? l.valor : U.num($('#fl-valor').value), vencimento: pago ? l.vencimento : $('#fl-venc').value, categoria: $('#fl-cat').value, centro: $('#fl-cc').value, loja: $('#fl-loja').value, maquina: $('#fl-maq').value, documento: $('#fl-doc').value.trim(), competencia: $('#fl-comp').value || '', obs: $('#fl-obs').value.trim() };
        if (tipo === 'receber') { const cv = U.num($('#fl-custo').value); if (cv > 0) d.custoVenda = F.r2(cv); else if (editar) d.custoVenda = undefined; }
        const erros = F.validar(d); if (erros.length) { U.toast(erros.includes('valor') ? 'Informe o valor.' : erros.includes('descricao') ? 'Escreva a descrição.' : 'Confira o vencimento.', true); return; }
        if (!editar && $('#fl-pago').checked && !$('#fl-bconta').value) { U.toast('Cadastre uma conta ou caixa antes (Bancos e caixa).', true); return; }
        const nomeP = $('#fl-pessoa').value.trim();
        if (nomeP) { const p = U.K.cad.garantir(tipo === 'receber' ? 'clientes' : 'fornecedores', { nome: nomeP }); if (tipo === 'receber') d.cliente = p.id; else d.fornecedor = p.id; } else { d.cliente = ''; d.fornecedor = ''; }
        try {
          if (editar) {
            const alvo = F.materializar(est(), editar), cat = F.categoria(est(), d.categoria);
            Object.assign(alvo, d, { margem: cat && cat.margem ? cat.margem : '', editadoPor: quem(), editadoEm: new Date().toISOString() }); delete alvo.virtual;
            gravar(`Lançamento editado: ${alvo.descricao} (${brl(alvo.valor)})`); U.toast('Lançamento atualizado.');
          } else {
            const rep = $('#fl-rep').value, n = Math.max(1, Math.floor(U.num($('#fl-n').value) || 1));
            if (rep === 'parc') d.parcelas = n; if (rep === 'rec') d.recorrencia = { meses: n };
            const novos = F.criar(est(), d, quem());
            if ($('#fl-pago').checked) F.baixar(est(), novos[0].id, { data: $('#fl-bdata').value, conta: $('#fl-bconta').value, forma: $('#fl-bforma').value }, quem());
            gravar(`${tipo === 'pagar' ? 'Conta a pagar' : 'Conta a receber'} lançada: ${d.descricao} · ${brl(d.valor)}${novos.length > 1 ? ` (${novos.length}x)` : ''}`); U.toast(novos.length > 1 ? `${novos.length} lançamentos criados.` : 'Lançamento salvo.');
          }
          U.fecharCamada(true); U.rota();
        } catch (e) { U.toast(e.message, true); }
      };
    });
  }

  // ---------- baixa ----------
  function formBaixa(id) {
    const l = acharLanc(id); if (!l) return;
    if (!fin().contas.length) { U.toast('Cadastre uma conta ou caixa antes (Bancos e caixa).', true); location.hash = '#fin-contas'; return; }
    U.abrirCamada('modal', `<h2>${l.tipo === 'pagar' ? 'Registrar pagamento' : 'Registrar recebimento'}</h2><p class="sub">${U.esc(l.descricao)} · vence ${F.dataBR(l.vencimento)} · <b>${brl(l.valor)}</b></p>
      <div class="campos" style="margin-top:12px">
        <div class="campo"><label for="bx-data">Data</label><input id="bx-data" type="date" value="${U.hojeISO()}"></div>
        <div class="campo"><label for="bx-forma">Forma</label><select id="bx-forma">${opt(Object.entries(F.FORMAS), l.tipo === 'receber' ? 'pix' : 'boleto')}</select></div>
        <div class="campo inteiro"><label for="bx-conta">${l.tipo === 'pagar' ? 'Saiu da conta' : 'Entrou na conta'}</label><select id="bx-conta">${opt(fin().contas.filter((c) => !c.inativa).map((c) => [c.id, c.nome + (c.loja ? ' · ' + c.loja : '')]), contaPadrao(l.loja))}</select></div>
        <div class="campo"><label for="bx-juros">Juros / multa (R$)</label><input id="bx-juros" inputmode="decimal" placeholder="0,00"></div>
        <div class="campo"><label for="bx-desc">Desconto (R$)</label><input id="bx-desc" inputmode="decimal" placeholder="0,00"></div>
        <label class="check inteiro"><input type="checkbox" id="bx-parc"> Pagamento parcial (o resto continua em aberto)</label>
        <div class="campo" id="bx-v-c" hidden><label for="bx-valor">Valor pago agora (R$)</label><input id="bx-valor" inputmode="decimal"></div>
      </div><p class="conta" id="bx-tot"></p><div class="acoes"><button class="btn btn-ouro" type="button" id="bx-ok">Confirmar</button><button class="btn btn-linha" type="button" id="bx-nao">Cancelar</button></div>`, (c) => {
      const $ = (s) => U.$(s, c);
      const tot = () => { const pr = $('#bx-parc').checked ? U.num($('#bx-valor').value) : l.valor; $('#bx-tot').textContent = 'Total ' + (l.tipo === 'pagar' ? 'pago' : 'recebido') + ': ' + brl(F.r2(pr + U.num($('#bx-juros').value) - U.num($('#bx-desc').value))); };
      ['#bx-juros', '#bx-desc', '#bx-valor'].forEach((s) => { $(s).oninput = tot; }); $('#bx-parc').onchange = () => { $('#bx-v-c').hidden = !$('#bx-parc').checked; tot(); }; tot();
      $('#bx-nao').onclick = () => U.fecharCamada();
      $('#bx-ok').onclick = () => {
        try {
          const x = F.baixar(est(), l.id, { data: $('#bx-data').value, forma: $('#bx-forma').value, conta: $('#bx-conta').value, juros: U.num($('#bx-juros').value), desconto: U.num($('#bx-desc').value), parcial: $('#bx-parc').checked, valor: U.num($('#bx-valor').value) }, quem(), new Date().toISOString(), ctx());
          gravar(`${l.tipo === 'pagar' ? 'Pagamento' : 'Recebimento'} registrado: ${x.descricao} · ${brl(x.pago.valor)} em ${nomeConta(x.pago.conta)} (${F.FORMAS[x.pago.forma]})`);
          U.toast(l.tipo === 'pagar' ? 'Pagamento registrado.' : 'Recebimento registrado.'); U.fecharCamada(true); U.rota();
        } catch (e) { U.toast(e.message, true); }
      };
    });
  }

  // ---------- detalhe ----------
  function detalhe(id) {
    const l = acharLanc(id); if (!l) return;
    const pode = editor(), s = F.situacao(l, U.hojeISO()), cli = l.tipo === 'receber' && l.cliente ? U.K.cad.cliente(l.cliente) : null;
    const linha = (r, v) => (v ? `<li><span>${r}</span><b>${v}</b></li>` : '');
    U.abrirCamada('gaveta', `<h2>${U.esc(l.descricao)}</h2><p class="sub" style="margin:4px 0 12px">${l.tipo === 'pagar' ? 'Conta a pagar' : 'Conta a receber'} · ${sitTag(l)}${l.auto ? ' <span class="tag declarado">Automático</span>' : ''}</p>
      <p class="fin-valor ${l.tipo === 'pagar' ? 'neg' : 'pos'}">${brl(F.valorEfetivo(l))}</p>
      <ul class="lista-motivos">${linha('Vencimento', F.dataBR(l.vencimento))}${linha('Competência', F.dataBR(l.competencia))}${linha(l.tipo === 'pagar' ? 'Fornecedor' : 'Cliente', U.esc(pessoa(l)))}${linha('Categoria', U.esc(nomeCat(l.categoria)))}${linha('Centro de custo', U.esc(nomeCentro(l.centro)))}
        ${linha('Loja', U.esc(l.loja))}${linha('Máquina', U.esc(nomeMaq(l.maquina)))}${linha('Documento', U.esc(l.documento))}${linha('Parcela', l.parcela ? `${l.parcela.n} de ${l.parcela.de}` : '')}${linha('Recorrência', l.recorrencia ? `mensal, ${l.recorrencia.n} de ${l.recorrencia.de}` : '')}
        ${l.pago ? linha('Pago em', `${F.dataBR(l.pago.data)} · ${F.FORMAS[l.pago.forma]} · ${U.esc(nomeConta(l.pago.conta))}`) + linha('Juros / desconto', l.pago.juros || l.pago.desconto ? `${brl(l.pago.juros)} / ${brl(l.pago.desconto)}` : '') + linha('Baixado por', U.esc(l.pago.por)) : ''}
        ${linha('Conciliado com o extrato', l.conciliado ? 'Sim' : '')}${linha('Cancelado', l.cancelado ? `${U.esc(l.cancelado.por)} · ${U.esc(l.cancelado.motivo || 'sem motivo')}` : '')}${linha('Lançado por', U.esc(l.criadoPor || (l.auto ? 'Anshur (automático)' : '')))}${linha('Valor', l.estimada ? 'Comissão estimada pela regra da revenda; confira antes de pagar' : '')}${linha('Observação', U.esc(l.obs))}</ul>
      <div class="acoes" style="flex-wrap:wrap">
        ${pode && !l.pago && !l.cancelado ? `<button class="btn btn-ouro" type="button" id="dt-baixar">${l.tipo === 'pagar' ? 'Pagar' : 'Receber'}</button><button class="btn btn-linha" type="button" id="dt-editar">Editar</button><button class="btn btn-linha" type="button" id="dt-parcelar">Parcelar</button><button class="btn btn-perigo" type="button" id="dt-cancelar">Cancelar</button>` : ''}
        ${pode && l.pago ? `<button class="btn btn-linha" type="button" id="dt-editar">Editar descrição e categoria</button>${l.conciliado ? '' : '<button class="btn btn-perigo" type="button" id="dt-estornar">Estornar pagamento</button>'}` : ''}
        ${l.tipo === 'receber' && s === 'vencido' ? `<a class="btn btn-linha" target="_blank" rel="noopener" href="${U.esc(F.linkCobranca({ nome: pessoa(l), telefone: cli && cli.telefone, itens: [l], revenda: U.A.revenda.nome, pix: est().pixRevenda }))}">${I.zap}Cobrar no WhatsApp</a>` : ''}
      </div>`, (c) => {
      const b = (s, fn) => { const e = U.$(s, c); if (e) e.onclick = fn; };
      b('#dt-baixar', () => formBaixa(l.id));
      b('#dt-editar', () => formLancamento({}, l));
      b('#dt-parcelar', () => U.abrirCamada('modal', `<h2>Parcelar</h2><p class="sub">${U.esc(l.descricao)} · ${brl(l.valor)}. Vira parcelas mensais a partir de ${F.dataBR(l.vencimento)}.</p><div class="campo" style="margin-top:12px"><label for="pc-n">Número de parcelas</label><input id="pc-n" inputmode="numeric" value="3"></div><div class="acoes"><button class="btn btn-ouro" type="button" id="pc-ok">Parcelar</button></div>`, (m) => {
        U.$('#pc-ok', m).onclick = () => { try { const ps = F.parcelar(est(), l.id, U.num(U.$('#pc-n', m).value), quem(), ctx()); gravar(`Parcelado em ${ps.length}x: ${l.descricao} (${brl(l.valor)})`); U.toast(`Parcelado em ${ps.length}x.`); U.fecharCamada(true); U.rota(); } catch (e) { U.toast(e.message, true); } };
      }));
      b('#dt-cancelar', () => U.abrirCamada('modal', `<h2>Cancelar lançamento?</h2><p class="sub">Fica na lista de cancelados (não some) e sai dos saldos previstos.</p><div class="campo" style="margin-top:12px"><label for="cn-m">Motivo</label><input id="cn-m" placeholder="Ex.: venda desfeita"></div><div class="acoes"><button class="btn btn-perigo" type="button" id="cn-ok">Cancelar lançamento</button></div>`, (m) => {
        U.$('#cn-ok', m).onclick = () => { try { F.cancelar(est(), l.id, U.$('#cn-m', m).value.trim(), quem(), new Date().toISOString(), ctx()); gravar(`Lançamento cancelado: ${l.descricao} (${brl(l.valor)})`); U.toast('Lançamento cancelado.'); U.fecharCamada(true); U.rota(); } catch (e) { U.toast(e.message, true); } };
      }));
      b('#dt-estornar', () => U.confirmar('Estornar o pagamento?', 'O lançamento volta a ficar em aberto e o saldo da conta é recalculado.', 'Estornar', () => { try { F.estornar(est(), l.id); gravar(`Pagamento estornado: ${l.descricao}`); U.toast('Pagamento estornado.'); U.rota(); } catch (e) { U.toast(e.message, true); } }));
    });
  }

  // ---------- BANCOS E CAIXA ----------
  let contaSel = '';
  function telaContas() {
    const hoje = U.hojeISO(), sal = F.saldos(est(), hoje);
    if (!contaSel || !F.conta(est(), contaSel)) contaSel = (sal[0] && sal[0].conta.id) || '';
    const movs = contaSel ? F.movimentos(est(), { conta: contaSel }) : [];
    const c = F.conta(est(), contaSel); let acum = c ? c.saldoInicial : 0;
    const linhas = movs.filter((m) => !c || m.data >= (c.dataSaldo || '')).map((m) => { acum = F.r2(acum + m.valor); return Object.assign({ saldo: acum }, m); }).reverse().slice(0, 80);
    U.tela.innerHTML = cab('Bancos e caixa', 'Saldo de cada conta = saldo inicial + recebimentos − pagamentos ± transferências. Nada é digitado à mão.', editor() ? `<button class="btn btn-linha" type="button" id="ct-transf">Transferir entre contas</button><button class="btn btn-ouro" type="button" id="ct-nova">Nova conta ou caixa</button>` : '') + blocoComecar() + `
      <div class="fin-cartoes">${sal.map((x) => `<button type="button" class="fin-conta ${x.conta.id === contaSel ? 'sel' : ''}" data-conta="${x.conta.id}"><span>${x.conta.tipo === 'caixa' ? 'Caixa' : U.esc(x.conta.banco || 'Banco')}${x.conta.loja ? ' · ' + U.esc(x.conta.loja) : ''}</span><b>${U.esc(x.conta.nome)}</b><strong class="${x.saldo < 0 ? 'neg' : ''}">${brl(x.saldo)}</strong></button>`).join('') || vazio('Nenhuma conta ainda.')}</div>
      ${c ? `<section class="painel bloco"><div class="painel-cab"><h2>${I.banco}${U.esc(c.nome)}</h2><p>Saldo inicial ${brl(c.saldoInicial)} em ${F.dataBR(c.dataSaldo)}${c.agencia || c.numero ? ` · ag. ${U.esc(c.agencia)} cc ${U.esc(c.numero)}` : ''} · <a class="link" href="#fin-conciliacao">Conciliar extrato</a></p></div>
        ${linhas.length ? `<div class="tabela-wrap"><table class="tabela"><thead><tr><th>Data</th><th>Movimento</th><th class="n">Valor</th><th class="n">Saldo</th><th></th></tr></thead><tbody>${linhas.map((m) => `<tr><td>${F.dataBR(m.data)}</td><td>${U.esc(m.descricao)}</td><td class="n ${m.valor < 0 ? 'neg' : 'pos'}">${brl(m.valor)}</td><td class="n">${brl(m.saldo)}</td><td>${m.conciliado ? `<span class="tag comprovado">${I.check}Extrato</span>` : ''}</td></tr>`).join('')}</tbody></table></div>` : vazio('Sem movimentos nesta conta.')}</section>` : ''}
      ${fin().transferencias.length ? `<section class="painel bloco"><h2>Transferências</h2><div class="tabela-wrap"><table class="tabela"><thead><tr><th>Data</th><th>De</th><th>Para</th><th class="n">Valor</th><th>Por</th></tr></thead><tbody>${fin().transferencias.slice().sort((a, b) => b.data.localeCompare(a.data)).slice(0, 30).map((t) => `<tr><td>${F.dataBR(t.data)}</td><td>${U.esc(nomeConta(t.de))}</td><td>${U.esc(nomeConta(t.para))}</td><td class="n">${brl(t.valor)}</td><td>${U.esc(t.por || '')}</td></tr>`).join('')}</tbody></table></div></section>` : ''}`;
    ligarComecar();
    U.$$('[data-conta]', U.tela).forEach((b) => b.onclick = () => { contaSel = b.dataset.conta; telaContas(); });
    const nv = U.$('#ct-nova'); if (nv) nv.onclick = () => U.abrirCamada('modal', `<h2>Nova conta ou caixa</h2><div class="campos" style="margin-top:12px">
        <div class="campo inteiro"><label for="nc-nome">Nome *</label><input id="nc-nome" placeholder="Ex.: Sicredi · Sertãozinho"></div>
        <div class="campo"><label for="nc-tipo">Tipo</label><select id="nc-tipo">${opt([['banco', 'Conta bancária'], ['caixa', 'Caixa da loja']], 'banco')}</select></div>
        <div class="campo"><label for="nc-loja">Loja</label><select id="nc-loja">${opt([['', 'Geral / matriz']].concat(lojasVer().map((l) => [l, l])), fl().loja)}</select></div>
        <div class="campo"><label for="nc-banco">Banco</label><input id="nc-banco"></div><div class="campo"><label for="nc-ag">Agência e conta</label><input id="nc-ag" placeholder="0000 / 00000-0"></div>
        <div class="campo"><label for="nc-saldo">Saldo inicial (R$)</label><input id="nc-saldo" inputmode="decimal" placeholder="0,00"></div><div class="campo"><label for="nc-data">Na data</label><input id="nc-data" type="date" value="${U.hojeISO()}"></div>
      </div><div class="acoes"><button class="btn btn-ouro" type="button" id="nc-ok">Criar</button></div>`, (m) => {
      U.$('#nc-ok', m).onclick = () => { try { const [ag, nu] = U.$('#nc-ag', m).value.split('/').map((s) => s.trim()); const x = F.criarConta(est(), { nome: U.$('#nc-nome', m).value, tipo: U.$('#nc-tipo', m).value, loja: U.$('#nc-loja', m).value, banco: U.$('#nc-banco', m).value.trim(), agencia: ag || '', numero: nu || '', saldoInicial: U.num(U.$('#nc-saldo', m).value), dataSaldo: U.$('#nc-data', m).value }); if (!fin().inicio) fin().inicio = x.dataSaldo; contaSel = x.id; gravar(`Conta criada: ${x.nome} (saldo inicial ${brl(x.saldoInicial)})`); U.toast('Conta criada.'); U.fecharCamada(true); U.rota(); } catch (e) { U.toast(e.message, true); } };
    });
    const tf = U.$('#ct-transf'); if (tf) tf.onclick = () => {
      const cs = fin().contas.filter((x) => !x.inativa).map((x) => [x.id, x.nome]); if (cs.length < 2) { U.toast('Precisa de pelo menos duas contas.', true); return; }
      U.abrirCamada('modal', `<h2>Transferir entre contas</h2><div class="campos" style="margin-top:12px"><div class="campo"><label for="tf-de">De</label><select id="tf-de">${opt(cs, contaSel)}</select></div><div class="campo"><label for="tf-para">Para</label><select id="tf-para">${opt(cs, cs.find((x) => x[0] !== contaSel)[0])}</select></div>
        <div class="campo"><label for="tf-v">Valor (R$)</label><input id="tf-v" inputmode="decimal"></div><div class="campo"><label for="tf-d">Data</label><input id="tf-d" type="date" value="${U.hojeISO()}"></div><div class="campo inteiro"><label for="tf-desc">Descrição</label><input id="tf-desc" value="Transferência entre contas"></div></div>
        <div class="acoes"><button class="btn btn-ouro" type="button" id="tf-ok">Transferir</button></div>`, (m) => {
        U.$('#tf-ok', m).onclick = () => { try { const t = F.transferir(est(), { de: U.$('#tf-de', m).value, para: U.$('#tf-para', m).value, valor: U.num(U.$('#tf-v', m).value), data: U.$('#tf-d', m).value, descricao: U.$('#tf-desc', m).value.trim() }, quem()); gravar(`Transferência de ${brl(t.valor)}: ${nomeConta(t.de)} → ${nomeConta(t.para)}`); U.toast('Transferência registrada.'); U.fecharCamada(true); U.rota(); } catch (e) { U.toast(e.message, true); } };
      });
    };
  }

  // ---------- CONCILIAÇÃO ----------
  let concConta = '', concVer = 'pendentes';
  function telaConciliacao() {
    const cs = fin().contas.filter((c) => !c.inativa && c.tipo === 'banco');
    if (!concConta || !cs.some((c) => c.id === concConta)) concConta = (cs[0] || {}).id || '';
    const linhas = fin().extrato.filter((x) => x.conta === concConta).sort((a, b) => b.data.localeCompare(a.data));
    const pend = linhas.filter((x) => !x.conciliado), ver = concVer === 'pendentes' ? pend : linhas;
    const pode = editor();
    U.tela.innerHTML = cab('Conciliação bancária', 'Importe o extrato do banco (OFX ou CSV) e case cada linha com o lançamento do Anshur. Importar o mesmo arquivo de novo não duplica.') + `
      ${cs.length ? `<section class="painel"><div class="fin-filtros"><div class="campos fin-campos"><div class="campo"><label for="cc-conta">Conta</label><select id="cc-conta">${opt(cs.map((c) => [c.id, c.nome]), concConta)}</select></div>
        ${pode ? `<div class="campo"><label>Extrato do banco</label><label class="btn btn-linha" style="cursor:pointer">Importar OFX ou CSV<input type="file" id="cc-arq" accept=".ofx,.csv,.txt" class="sr"></label></div>` : ''}</div>
        <div class="abas-modo" role="group" aria-label="Mostrar"><button type="button" data-cv="pendentes" aria-pressed="${concVer === 'pendentes'}">A conciliar (${pend.length})</button><button type="button" data-cv="todas" aria-pressed="${concVer === 'todas'}">Todas (${linhas.length})</button></div>
        ${pode && pend.length ? '<button class="btn btn-ouro" type="button" id="cc-auto">Conciliar o que é certeiro</button>' : ''}</div>
        ${ver.length ? `<div class="tabela-wrap"><table class="tabela fin-tab"><thead><tr><th>Data</th><th>No extrato</th><th class="n">Valor</th><th>No Anshur</th><th></th></tr></thead><tbody>${ver.map((x) => linhaConc(x, pode)).join('')}</tbody></table></div>` : vazio(linhas.length ? 'Tudo conciliado nesta conta.' : 'Nenhum extrato importado nesta conta ainda. No internet banking, exporte o extrato em OFX (ou CSV) e importe aqui.')}
        <p class="nota-rodape">Casa pelo mesmo valor e data próxima (até 5 dias para o que já foi baixado; até 10 dias do vencimento para o que está em aberto, que é baixado na data do extrato). Só concilia sozinho quando existe um único par certeiro.</p></section>`
        : `<section class="painel">${vazio('Cadastre uma conta bancária em Bancos e caixa para conciliar.')}</section>`}`;
    const s = U.$('#cc-conta'); if (s) s.onchange = () => { concConta = s.value; telaConciliacao(); };
    U.$$('[data-cv]', U.tela).forEach((b) => b.onclick = () => { concVer = b.dataset.cv; telaConciliacao(); });
    const arq = U.$('#cc-arq'); if (arq) arq.onchange = (e) => { const f = e.target.files[0]; if (!f) return; f.text().then((tx) => {
      try { const ls = /<OFX>|<STMTTRN>/i.test(tx) ? F.lerOFX(tx) : F.lerCSV(tx); if (!ls.length) throw new Error('Não achei lançamentos neste arquivo.'); const r = F.importarExtrato(est(), concConta, ls, quem()); gravar(`Extrato importado em ${nomeConta(concConta)}: ${r.novas} linhas novas${r.repetidas ? `, ${r.repetidas} já existiam` : ''}`); U.toast(`${r.novas} linhas novas${r.repetidas ? ` (${r.repetidas} repetidas ignoradas)` : ''}.`); telaConciliacao(); } catch (er) { U.toast(er.message, true); }
    }); };
    const au = U.$('#cc-auto'); if (au) au.onclick = () => { const n = F.autoConciliar(est(), concConta, quem(), new Date().toISOString(), ctx()); if (n) gravar(`Conciliação automática: ${n} linhas em ${nomeConta(concConta)}`); U.toast(n ? `${n} linhas conciliadas.` : 'Nenhum par certeiro: concilie à mão.'); telaConciliacao(); };
    U.$$('[data-conc]', U.tela).forEach((b) => b.onclick = () => { const [lid, tipo, id] = b.dataset.conc.split('|'); try { F.conciliar(est(), lid, { tipo, id }, quem(), new Date().toISOString(), ctx()); gravar('Linha do extrato conciliada'); U.toast('Conciliado.'); telaConciliacao(); } catch (e) { U.toast(e.message, true); } });
    U.$$('[data-desc]', U.tela).forEach((b) => b.onclick = () => { F.desconciliar(est(), b.dataset.desc); gravar('Conciliação desfeita'); telaConciliacao(); });
    U.$$('[data-lext]', U.tela).forEach((b) => b.onclick = () => {
      const x = fin().extrato.find((e) => e.id === b.dataset.lext), tipo = x.valor > 0 ? 'receber' : 'pagar';
      U.abrirCamada('modal', `<h2>Lançar a partir do extrato</h2><p class="sub">${F.dataBR(x.data)} · ${U.esc(x.descricao)} · <b>${brl(x.valor)}</b>. Vira um lançamento já ${tipo === 'pagar' ? 'pago' : 'recebido'} e conciliado.</p>
        <div class="campos" style="margin-top:12px"><div class="campo inteiro"><label for="le-d">Descrição</label><input id="le-d" value="${U.esc(x.descricao)}"></div><div class="campo inteiro"><label for="le-c">Categoria</label><select id="le-c">${opt(F.categorias(est()).filter((c) => c.tipo === tipo).map((c) => [c.id, c.nome]), tipo === 'pagar' ? 'fin-tarifas' : 'rec-rendimentos')}</select></div></div>
        <div class="acoes"><button class="btn btn-ouro" type="button" id="le-ok">Lançar</button></div>`, (m) => {
        U.$('#le-ok', m).onclick = () => { try { F.lancarDoExtrato(est(), x.id, { categoria: U.$('#le-c', m).value, descricao: U.$('#le-d', m).value.trim() }, quem()); gravar(`Lançado do extrato: ${U.$('#le-d', m).value.trim()} (${brl(x.valor)})`); U.toast('Lançado e conciliado.'); U.fecharCamada(true); telaConciliacao(); } catch (e) { U.toast(e.message, true); } };
      });
    });
  }
  function linhaConc(x, pode) {
    let dir;
    if (x.conciliado) {
      const alvo = x.conciliado.tipo === 'transferencia' ? fin().transferencias.find((t) => t.id === x.conciliado.id) : fin().lancamentos.find((l) => l.id === x.conciliado.id);
      dir = `<span class="tag comprovado">${I.check}Conciliado</span> ${U.esc(alvo ? alvo.descricao : '')}</td><td>${pode ? `<button class="link" type="button" data-desc="${x.id}">Desfazer</button>` : ''}`;
    } else {
      const s = F.sugestoes(est(), x.id, ctx()).slice(0, 3);
      dir = (s.length ? s.map((c) => `<div class="fin-sug"><span>${U.esc(c.tipo === 'transferencia' ? c.t.descricao : c.l.descricao)}<small>${c.tipo === 'transferencia' ? 'transferência ' + F.dataBR(c.t.data) : c.pago ? 'baixado em ' + F.dataBR(c.l.pago.data) : 'em aberto, vence ' + F.dataBR(c.l.vencimento)}</small></span>${pode ? `<button class="btn btn-linha btn-p" type="button" data-conc="${x.id}|${c.tipo}|${U.esc(c.id)}">${c.pago || c.tipo === 'transferencia' ? 'Conciliar' : 'Baixar e conciliar'}</button>` : ''}</div>`).join('') : '<span class="sub">Sem par no Anshur</span>')
        + `</td><td>${pode ? `<button class="link" type="button" data-lext="${x.id}">Lançar</button>` : ''}`;
    }
    return `<tr><td>${F.dataBR(x.data)}</td><td>${U.esc(x.descricao)}</td><td class="n ${x.valor < 0 ? 'neg' : 'pos'}">${brl(x.valor)}</td><td>${dir}</td></tr>`;
  }

  // ---------- FLUXO DE CAIXA ----------
  let fluxoDias = 30;
  function telaFluxo() {
    const hoje = U.hojeISO(), fx = F.fluxo(est(), Object.assign({ dias: fluxoDias, hoje, ctx: ctx() }, fl())), rm = F.realizadoMensal(est(), Object.assign({ meses: 6, hoje }, fl()));
    const semanas = []; for (let i = 0; i < fx.linhas.length; i += 7) { const b = fx.linhas.slice(i, i + 7); semanas.push({ de: b[0].data, ate: b[b.length - 1].data, entradas: F.r2(b.reduce((s, x) => s + x.entradas, 0)), saidas: F.r2(b.reduce((s, x) => s + x.saidas, 0)), saldo: b[b.length - 1].saldo }); }
    const passo = Math.max(1, Math.round(fluxoDias / 15)), pontos = fx.linhas.filter((x, i) => i % passo === 0 || i === fx.linhas.length - 1).map((x) => ({ r: F.dataBR(x.data).slice(0, 5), v: x.saldo }));
    U.tela.innerHTML = cab('Fluxo de caixa', `Previsto a partir do saldo de hoje das contas${fl().loja ? ' da loja ' + U.esc(fl().loja) : ''} e realizado dos últimos meses.`) + `
      <div class="abas-modo" role="group" aria-label="Horizonte">${[30, 60, 90].map((d) => `<button type="button" data-dias="${d}" aria-pressed="${fluxoDias === d}">${d} dias</button>`).join('')}</div>
      <div class="kpis fin-k">
        <div class="kpi k-marfim"><span class="rot">${I.banco}Saldo hoje</span><span class="val">${brl(fx.saldoAtual)}</span><span class="exp">Contas e caixas</span></div>
        <div class="kpi k-salvia"><span class="rot">${I.entra}Entradas previstas</span><span class="val">${brl(fx.entradas)}</span><span class="exp">${fx.aCobrar ? `+ ${brl(fx.aCobrar)} vencidos a cobrar (fora da conta)` : 'Contas a receber no período'}</span></div>
        <div class="kpi"><span class="rot">${I.sai}Saídas previstas</span><span class="val">${brl(fx.saidas)}</span><span class="exp">${fx.pagarVencido ? `inclui ${brl(fx.pagarVencido)} vencidos (contados para hoje)` : 'Contas a pagar no período'}</span></div>
        <div class="kpi ${fx.menor.saldo < 0 ? 'k-risco' : ''}"><span class="rot">${I.linha}Saldo em ${fluxoDias} dias</span><span class="val">${brl(fx.saldoFinal)}</span><span class="exp">Menor saldo ${brl(fx.menor.saldo)} em ${F.dataBR(fx.menor.data)}</span></div>
      </div>
      <section class="painel"><h2>${I.linha}Saldo dia a dia</h2>${pontos.length > 1 ? U.G.linha(pontos, { formato: (v) => U.mil(v) }) : ''}</section>
      <div class="grade-2 bloco">
        <section class="painel"><h2>Previsto por semana</h2><div class="tabela-wrap"><table class="tabela"><thead><tr><th>Semana</th><th class="n">Entradas</th><th class="n">Saídas</th><th class="n">Saldo no fim</th></tr></thead><tbody>${semanas.map((s) => `<tr><td>${F.dataBR(s.de).slice(0, 5)} a ${F.dataBR(s.ate).slice(0, 5)}</td><td class="n pos">${brl(s.entradas)}</td><td class="n neg">${brl(s.saidas)}</td><td class="n ${s.saldo < 0 ? 'neg forte' : ''}">${brl(s.saldo)}</td></tr>`).join('')}</tbody></table></div></section>
        <section class="painel"><h2>Realizado por mês</h2><div class="tabela-wrap"><table class="tabela"><thead><tr><th>Mês</th><th class="n">Entradas</th><th class="n">Saídas</th><th class="n">Resultado</th></tr></thead><tbody>${rm.map((m) => `<tr><td>${m.mes.split('-').reverse().join('/')}</td><td class="n pos">${brl(m.entradas)}</td><td class="n neg">${brl(m.saidas)}</td><td class="n ${m.resultado < 0 ? 'neg' : 'pos'}">${brl(m.resultado)}</td></tr>`).join('')}</tbody></table></div><p class="nota-rodape">Transferências entre contas da revenda não contam como entrada nem saída.</p></section>
      </div>
      <p class="nota-rodape">Contas a pagar vencidas entram no dia de hoje (precisam sair). Contas a receber vencidas não entram na curva: o Anshur não conta com dinheiro atrasado; elas aparecem em Inadimplência.</p>`;
    U.$$('[data-dias]', U.tela).forEach((b) => b.onclick = () => { fluxoDias = +b.dataset.dias; telaFluxo(); });
  }

  // ---------- DRE ----------
  let dreMes = '';
  function telaDRE() {
    const hoje = U.hojeISO(); if (!dreMes) dreMes = F.mesDe(F.somarMeses(F.mesDe(hoje) + '-01', -1)); // abre no último mês fechado
    const meses = []; for (let i = 0; i < 12; i++) meses.push(F.mesDe(F.somarMeses(F.mesDe(hoje) + '-01', -i)));
    const trocas = U.A.todasTrocas || U.A.trocas, base = Object.assign({ trocas, ctx: ctx() }, fl());
    const d = F.dre(est(), Object.assign({ mes: dreMes }, base)), ant = F.dre(est(), Object.assign({ mes: F.mesDe(F.somarMeses(dreMes + '-01', -1)) }, base));
    const pc = (v) => (d.receitaBruta ? U.pct(v / d.receitaBruta) : '—');
    const linha = (nome, v, va, cls = '') => `<tr class="${cls}"><td>${nome}</td><td class="n ${v < 0 ? 'neg' : ''}">${brl(v)}</td><td class="n sub">${pc(v)}</td><td class="n sub">${brl(va)}</td></tr>`;
    const L = (k) => d.linhas.find((x) => x.chave === k), LA = (k) => ant.linhas.find((x) => x.chave === k);
    const bloco = (k) => { const x = L(k); return linha('<b>' + x.nome + '</b>', x.total, LA(k).total, 'dre-grupo') + x.itens.map((i) => linha('<span class="dre-item">' + U.esc(i.nome) + '</span>', i.valor, (LA(k).itens.find((y) => y.nome === i.nome) || { valor: 0 }).valor)).join(''); };
    U.tela.innerHTML = cab('DRE gerencial', `Resultado do mês por competência${fl().loja ? ', loja ' + U.esc(fl().loja) : ', todas as lojas'}. Gerencial: não substitui a contabilidade.`, `<button class="btn btn-linha" type="button" id="dre-csv">Planilha</button><button class="btn btn-linha" type="button" onclick="print()">Imprimir</button>`) + `
      <div class="campos fin-campos sem-impressao" style="max-width:420px;margin-bottom:14px"><div class="campo"><label for="dre-mes">Mês</label><select id="dre-mes">${opt(meses.map((m, i) => [m, m.split('-').reverse().join('/') + (i === 0 ? ' (mês em andamento)' : '')]), dreMes)}</select></div></div>
      <div class="kpis fin-k">
        <div class="kpi k-marfim"><span class="rot">${I.entra}Receita bruta</span><span class="val">${brl(d.receitaBruta)}</span><span class="exp">${d.vendasUsados} usados vendidos</span></div>
        <div class="kpi"><span class="rot">${I.linha}Margem bruta</span><span class="val">${brl(d.margemBruta)}</span><span class="exp">${pc(d.margemBruta)} da receita</span></div>
        <div class="kpi"><span class="rot">${I.sai}Despesas operacionais</span><span class="val">${brl(-L('despesa').total)}</span><span class="exp">${pc(-L('despesa').total)} da receita</span></div>
        <div class="kpi ${d.liquido < 0 ? 'k-risco' : 'k-salvia'}"><span class="rot">${I.check}Resultado do mês</span><span class="val">${brl(d.liquido)}</span><span class="exp">Mês anterior ${brl(ant.liquido)}</span></div>
      </div>
      <section class="painel"><div class="tabela-wrap"><table class="tabela grande dre"><thead><tr><th>${dreMes.split('-').reverse().join('/')}</th><th class="n">Valor</th><th class="n">% receita</th><th class="n">Mês anterior</th></tr></thead><tbody>
        ${bloco('receita')}${bloco('impostos')}${linha('<b>= Receita líquida</b>', d.receitaLiquida, ant.receitaLiquida, 'dre-total')}
        ${bloco('cmv')}${bloco('custo')}${linha('<b>= Margem bruta</b>', d.margemBruta, ant.margemBruta, 'dre-total')}
        ${bloco('despesa')}${linha('<b>= Resultado operacional</b>', d.operacional, ant.operacional, 'dre-total')}
        ${bloco('financeiro')}${bloco('outras')}${linha('<b>= Resultado líquido</b>', d.liquido, ant.liquido, 'dre-total dre-final')}
      </tbody></table></div>
      <p class="nota-rodape">Competência: cada lançamento entra no mês do fato, pago ou não. Compra de usado, de máquina nova e de peças é estoque (aparece no fluxo de caixa); aqui entra o custo do usado quando ele é vendido (valor pago na troca + preparo). Lançamentos cancelados não entram.</p></section>`;
    U.$('#dre-mes').onchange = (e) => { dreMes = e.target.value; telaDRE(); };
    U.$('#dre-csv').onclick = () => U.baixarCSV(`anshur-dre-${dreMes}.csv`, [['Linha', 'Item', 'Valor', 'Mês anterior']].concat(d.linhas.flatMap((x) => [[x.nome, '', String(x.total).replace('.', ','), String(LA(x.chave).total).replace('.', ',')]].concat(x.itens.map((i) => [x.nome, i.nome, String(i.valor).replace('.', ','), ''])))).concat([['Resultado líquido', '', String(d.liquido).replace('.', ','), String(ant.liquido).replace('.', ',')]]));
  }

  // ---------- INADIMPLÊNCIA ----------
  function telaInad() {
    const r = F.inadimplencia(est(), Object.assign({ hoje: U.hojeISO(), ctx: ctx(), nomeCliente }, fl()));
    U.tela.innerHTML = cab('Inadimplência', 'Contas a receber vencidas, por cliente. "Cobrar" abre o WhatsApp com a mensagem pronta; você confere e envia.') + `
      <div class="kpis fin-k">
        <div class="kpi ${r.total ? 'k-risco' : ''}"><span class="rot">${I.alerta}Vencido</span><span class="val">${brl(r.total)}</span><span class="exp">${r.titulos} títulos · ${r.clientes.length} clientes</span></div>
        ${Object.entries(r.faixas).map(([k, v]) => `<div class="kpi"><span class="rot">${k === '90+' ? 'Mais de 90 dias' : k.replace('-', ' a ') + ' dias'}</span><span class="val">${brl(v)}</span><span class="exp">${r.total ? U.pct(v / r.total, 0) + ' do vencido' : ''}</span></div>`).slice(0, 3).join('')}
      </div>
      <section class="painel">${r.clientes.length ? `<div class="tabela-wrap"><table class="tabela fin-tab"><thead><tr><th>Cliente</th><th class="n">Títulos</th><th class="n">Maior atraso</th><th class="n">Total vencido</th><th></th></tr></thead><tbody>
        ${r.clientes.map((c, i) => { const cad = c.cliente ? U.K.cad.cliente(c.cliente) : null; return `<tr><td><b>${U.esc(c.nome)}</b><span class="fin-sub">${cad && cad.telefone ? U.esc(U.mascarar ? U.mascarar(cad.telefone) : cad.telefone) : 'sem telefone no cadastro'}${cad && cad.cidade ? ' · ' + U.esc(cad.cidade) : ''}</span></td><td class="n">${c.itens.length}</td><td class="n"><span class="sit sit-vencido">${c.maiorAtraso} dias</span></td><td class="n neg forte">${brl(c.total)}</td>
          <td class="n"><a class="btn btn-linha btn-p" target="_blank" rel="noopener" href="${U.esc(F.linkCobranca({ nome: c.nome, telefone: cad && cad.telefone, itens: c.itens, revenda: U.A.revenda.nome, pix: est().pixRevenda }))}" data-cobrar="${i}">${I.zap}Cobrar</a> <button class="link" type="button" data-ver="${i}">Títulos</button></td></tr>`; }).join('')}
      </tbody></table></div>` : vazio('Nenhuma conta a receber vencida.')}
      ${editor() ? `<div class="campos fin-campos" style="margin-top:14px;max-width:520px"><div class="campo"><label for="in-pix">Chave Pix da revenda (vai na mensagem)</label><input id="in-pix" value="${U.esc(est().pixRevenda || '')}" placeholder="CNPJ, e-mail ou celular"></div></div>` : ''}</section>`;
    U.$$('[data-ver]', U.tela).forEach((b) => b.onclick = () => { const c = r.clientes[+b.dataset.ver]; U.abrirCamada('gaveta', `<h2>${U.esc(c.nome)}</h2><p class="sub" style="margin-bottom:12px">${brl(c.total)} vencidos</p>${tabelaLanc(c.itens)}`, () => { U.$$('#camada [data-lanc]').forEach((x) => x.onclick = () => detalhe(x.dataset.lanc)); U.$$('#camada [data-baixar]').forEach((x) => x.onclick = (e) => { e.stopPropagation(); formBaixa(x.dataset.baixar); }); }); });
    U.$$('[data-cobrar]', U.tela).forEach((a) => a.addEventListener('click', () => { const c = r.clientes[+a.dataset.cobrar]; U.log('financeiro', `Cobrança aberta no WhatsApp: ${c.nome} (${brl(c.total)})`); U.salvar(); }));
    const px = U.$('#in-pix'); if (px) px.onchange = () => { est().pixRevenda = px.value.trim(); gravar('Chave Pix da cobrança alterada'); telaInad(); };
  }

  // ---------- COMISSÕES ----------
  function telaComissoes() {
    const l = F.comissoes(est(), Object.assign({ ctx: ctx() }, fl())), tot = l.reduce((s, x) => s + x.aPagar, 0);
    U.tela.innerHTML = cab('Comissões', `Vindas das vendas de usados: o valor lançado em "Lançar custos" ou, sem ele, ${U.pct(U.K.cfg.comissaoPct)} da venda (estimado). Ao pagar aqui, a margem por marca passa a usar o valor pago.`) + `
      <div class="kpis fin-k fin-kpis3"><div class="kpi k-marfim"><span class="rot">${I.sai}A pagar</span><span class="val">${brl(tot)}</span><span class="exp">${l.filter((x) => x.aPagar).length} vendedores</span></div>
        <div class="kpi k-salvia"><span class="rot">${I.check}Já pago</span><span class="val">${brl(l.reduce((s, x) => s + x.pago, 0))}</span><span class="exp">desde o início do Financeiro</span></div></div>
      ${l.length ? l.map((v) => `<section class="painel bloco"><div class="painel-cab"><h2>${U.esc(v.vendedor)}</h2><p>A pagar <b>${brl(v.aPagar)}</b> · pago ${brl(v.pago)}</p></div>${tabelaLanc(v.itens.filter((x) => !x.pago).sort((a, b) => a.vencimento.localeCompare(b.vencimento)))}</section>`).join('') : `<section class="painel">${vazio('Nenhuma comissão desde o início do Financeiro.')}</section>`}`;
    ligarComuns();
  }

  // ---------- DESPESAS POR MÁQUINA ----------
  function telaMaquinas() {
    const m = F.despesasPorMaquina(est(), { ctx: ctx() }), okL = F.daLoja(fl().loja, fl().lojas);
    const linhas = [...m.values()].map((o) => Object.assign({ cad: U.K.cad.maquina(o.maquina) }, o)).filter((o) => o.cad && okL(o.cad)).sort((a, b) => (b.pagas + b.abertas) - (a.pagas + a.abertas));
    const NOMES = { despesas: 'Frete, documentação e outras', comissao: 'Comissão', juros: 'Juros do floor plan', outras: 'Outras' };
    U.tela.innerHTML = cab('Despesas por máquina', 'Tudo o que foi lançado ligado a uma máquina. As despesas pagas de usados entram na margem por marca (Relatórios › Margem por marca).', editor() ? '<button class="btn btn-ouro" type="button" id="dm-nova">Lançar despesa de máquina</button>' : '') + `
      <section class="painel">${linhas.length ? `<div class="tabela-wrap"><table class="tabela fin-tab"><thead><tr><th>Máquina</th><th>Situação</th><th>Composição</th><th class="n">Pago</th><th class="n">Em aberto</th></tr></thead><tbody>
        ${linhas.map((o) => `<tr class="clicavel" data-maq="${U.esc(o.maquina)}"><td><b>${U.esc(o.cad.nome)}${o.cad.ano ? ' ' + o.cad.ano : ''}</b><span class="fin-sub">${o.cad.chassi ? U.esc(o.cad.chassi) + ' · ' : ''}${o.cad.origem === 'nova' ? 'Nova (floor plan)' : 'Usado'}${o.cad.loja ? ' · ' + U.esc(o.cad.loja) : ''}</span></td><td>${o.cad.vendido ? '<span class="tag comprovado">Vendida</span>' : '<span class="tag declarado">No pátio</span>'}</td>
          <td>${Object.entries(o.porTipo).map(([k, v]) => `<span class="fin-sub">${NOMES[k] || k}: ${brl(v)}</span>`).join('')}</td><td class="n">${brl(o.pagas)}</td><td class="n">${o.abertas ? brl(o.abertas) : '—'}</td></tr>`).join('')}</tbody></table></div>` : vazio('Nenhuma despesa ligada a máquina ainda.')}
      <p class="nota-rodape">Margem: só entram despesas pagas e ligadas a um usado. Comissão e juros lançados à mão em "Lançar custos" continuam valendo; o Financeiro preenche só o que estiver faltando.</p></section>`;
    const nv = U.$('#dm-nova'); if (nv) nv.onclick = () => formLancamento({ tipo: 'pagar', categoria: 'cus-frete', centro: 'cc-usados' });
    U.$$('[data-maq]', U.tela).forEach((tr) => tr.onclick = () => { const o = m.get(tr.dataset.maq); U.abrirCamada('gaveta', `<h2>${U.esc(nomeMaq(o.maquina))}</h2><p class="sub" style="margin-bottom:12px">Pago ${brl(o.pagas)} · em aberto ${brl(o.abertas)}</p>${tabelaLanc(o.itens)}`, () => { U.$$('#camada [data-lanc]').forEach((x) => x.onclick = () => detalhe(x.dataset.lanc)); }); });
  }

  // ---------- CADASTROS (clientes, fornecedores, categorias, centros) ----------
  let cadAba = 'clientes';
  function telaCadastros() {
    const pode = editor() || ['gerente'].includes(U.eu().perfil) && cadAba !== 'categorias' && cadAba !== 'centros';
    const abas = [['clientes', 'Clientes'], ['fornecedores', 'Fornecedores'], ['categorias', 'Categorias'], ['centros', 'Centros de custo']];
    let corpo = '';
    if (cadAba === 'clientes' || cadAba === 'fornecedores') {
      const l = (cadAba === 'clientes' ? U.K.cad.clientes() : U.K.cad.fornecedores()).slice().sort((a, b) => a.nome.localeCompare(b.nome));
      corpo = l.length ? `<div class="tabela-wrap"><table class="tabela"><thead><tr><th>Nome</th><th>CPF / CNPJ</th><th>Telefone</th><th>Cidade</th><th></th></tr></thead><tbody>${l.map((c) => `<tr><td><b>${U.esc(c.nome)}</b></td><td>${U.esc(U.mascarar ? U.mascarar(c.documento) : c.documento)}</td><td>${U.esc(U.mascarar ? U.mascarar(c.telefone) : c.telefone)}</td><td>${U.esc(c.cidade)}</td><td>${pode ? `<button class="link" type="button" data-edcad="${c.id}">Editar</button>` : ''}</td></tr>`).join('')}</tbody></table></div>` : vazio('Nenhum cadastro ainda. Eles também são criados ao lançar contas.');
    } else {
      const l = cadAba === 'categorias' ? F.categorias(est()) : F.centros(est()), proprias = new Set(((cadAba === 'categorias' ? fin().categorias : fin().centros) || []).map((x) => x.id));
      const DRE = { receita: 'Receita', impostos: 'Impostos', custo: 'Custo das vendas', despesa: 'Despesa operacional', financeiro: 'Financeiro', outras: 'Outras', estoque: 'Estoque (só caixa)' };
      corpo = `<div class="tabela-wrap"><table class="tabela"><thead><tr><th>Nome</th>${cadAba === 'categorias' ? '<th>Tipo</th><th>Na DRE</th><th>Na margem da máquina</th>' : ''}<th>Origem</th></tr></thead><tbody>${l.map((c) => `<tr><td><b>${U.esc(c.nome)}</b></td>${cadAba === 'categorias' ? `<td>${c.tipo === 'pagar' ? 'A pagar' : 'A receber'}</td><td>${DRE[c.dre] || ''}</td><td>${c.margem ? { despesas: 'Despesa', comissao: 'Comissão', juros: 'Juros' }[c.margem] : '—'}</td>` : ''}<td>${proprias.has(c.id) ? 'Da revenda' : 'Padrão'}</td></tr>`).join('')}</tbody></table></div>`;
    }
    U.tela.innerHTML = cab('Cadastros', 'Clientes, fornecedores, categorias e centros de custo. Um cadastro só, usado por todas as áreas do Anshur.', pode ? `<button class="btn btn-ouro" type="button" id="cad-novo">Adicionar</button>` : '') + `
      <div class="abas-modo" role="group" aria-label="Cadastro">${abas.map(([v, n]) => `<button type="button" data-cad="${v}" aria-pressed="${cadAba === v}">${n}</button>`).join('')}</div><section class="painel">${corpo}</section>`;
    U.$$('[data-cad]', U.tela).forEach((b) => b.onclick = () => { cadAba = b.dataset.cad; telaCadastros(); });
    const formPessoa = (c) => U.abrirCamada('modal', `<h2>${c ? 'Editar' : 'Novo'} ${cadAba === 'clientes' ? 'cliente' : 'fornecedor'}</h2><div class="campos" style="margin-top:12px">
      <div class="campo inteiro"><label for="cp-nome">Nome *</label><input id="cp-nome" value="${U.esc(c ? c.nome : '')}"></div><div class="campo"><label for="cp-doc">CPF / CNPJ</label><input id="cp-doc" inputmode="numeric" value="${U.esc(c ? c.documento : '')}"></div>
      <div class="campo"><label for="cp-tel">Telefone / WhatsApp</label><input id="cp-tel" inputmode="tel" value="${U.esc(c ? c.telefone : '')}"></div><div class="campo"><label for="cp-cid">Cidade</label><input id="cp-cid" value="${U.esc(c ? c.cidade : '')}"></div><div class="campo"><label for="cp-mail">E-mail</label><input id="cp-mail" type="email" value="${U.esc(c ? c.email : '')}"></div></div>
      <div class="acoes"><button class="btn btn-ouro" type="button" id="cp-ok">Salvar</button></div>`, (m) => {
      U.$('#cp-ok', m).onclick = () => {
        const d = { nome: U.$('#cp-nome', m).value.trim(), documento: U.$('#cp-doc', m).value.trim(), telefone: U.$('#cp-tel', m).value.trim(), cidade: U.$('#cp-cid', m).value.trim(), email: U.$('#cp-mail', m).value.trim() };
        if (!d.nome) { U.toast('Informe o nome.', true); return; }
        if (c) { const outro = U.K.acharCadastro(est().cadastros[cadAba].filter((x) => x.id !== c.id), { documento: d.documento }); if (d.documento && outro) { U.toast('Já existe um cadastro com este documento: ' + outro.nome, true); return; } Object.assign(c, d); }
        else { const ja = U.K.acharCadastro(est().cadastros[cadAba], d); if (ja) { U.toast('Já existe: ' + ja.nome + '. Abri o cadastro dele.', true); U.fecharCamada(true); formPessoa(ja); return; } U.K.cad.garantir(cadAba, d); }
        U.log('cadastro', `${cadAba === 'clientes' ? 'Cliente' : 'Fornecedor'} ${c ? 'alterado' : 'cadastrado'}: ${d.nome}`); U.salvar(); U.toast('Cadastro salvo.'); U.fecharCamada(true); telaCadastros();
      };
    });
    U.$$('[data-edcad]', U.tela).forEach((b) => b.onclick = () => formPessoa(est().cadastros[cadAba].find((x) => x.id === b.dataset.edcad)));
    const nv = U.$('#cad-novo'); if (nv) nv.onclick = () => {
      if (cadAba === 'clientes' || cadAba === 'fornecedores') return formPessoa(null);
      if (!editor()) { U.toast('Só o dono e o financeiro mudam categorias e centros.', true); return; }
      U.abrirCamada('modal', `<h2>${cadAba === 'categorias' ? 'Nova categoria' : 'Novo centro de custo'}</h2><div class="campos" style="margin-top:12px"><div class="campo inteiro"><label for="nk-nome">Nome *</label><input id="nk-nome"></div>
        ${cadAba === 'categorias' ? `<div class="campo"><label for="nk-tipo">Tipo</label><select id="nk-tipo">${opt([['pagar', 'A pagar'], ['receber', 'A receber']], 'pagar')}</select></div><div class="campo"><label for="nk-dre">Na DRE</label><select id="nk-dre">${opt([['despesa', 'Despesa operacional'], ['custo', 'Custo das vendas'], ['receita', 'Receita'], ['financeiro', 'Financeiro'], ['impostos', 'Impostos'], ['outras', 'Outras'], ['estoque', 'Estoque (só caixa)']], 'despesa')}</select></div>` : ''}</div>
        <div class="acoes"><button class="btn btn-ouro" type="button" id="nk-ok">Criar</button></div>`, (m) => {
        U.$('#nk-ok', m).onclick = () => { const nome = U.$('#nk-nome', m).value.trim(); if (!nome) { U.toast('Informe o nome.', true); return; } const id = (cadAba === 'categorias' ? 'cat-' : 'cc-') + U.K.normal(nome).replace(/[^a-z0-9]+/g, '-').slice(0, 24) + '-' + Math.random().toString(36).slice(2, 5);
          if (cadAba === 'categorias') fin().categorias.push({ id, nome, tipo: U.$('#nk-tipo', m).value, dre: U.$('#nk-dre', m).value }); else fin().centros.push({ id, nome });
          gravar(`${cadAba === 'categorias' ? 'Categoria' : 'Centro de custo'} criado: ${nome}`); U.toast('Criado.'); U.fecharCamada(true); telaCadastros(); };
      });
    };
  }

  // ---------- demonstração: dados fictícios coerentes ----------
  function semearDemo(ui) {
    const e = ui.estado; if (ui.OP || (e.fin && e.fin.semente)) return;
    const f = F.garantir(e), hoje = ui.hojeISO(), d = (n) => F.somarDias(hoje, -n), lojas = e.lojas.length ? e.lojas : ['Orlândia'];
    const quem = 'Lúcia', agora = new Date(Date.now() - 864e5).toISOString();
    f.inicio = d(120);
    const cB = F.criarConta(e, { id: 'CT-BB', nome: 'Banco do Brasil · ' + lojas[0], tipo: 'banco', banco: 'Banco do Brasil', agencia: '0451', numero: '22.871-3', loja: lojas[0], saldoInicial: 412000, dataSaldo: f.inicio });
    const cS = F.criarConta(e, { id: 'CT-SI', nome: 'Sicredi · ' + (lojas[1] || lojas[0]), tipo: 'banco', banco: 'Sicredi', agencia: '0712', numero: '41.090-8', loja: lojas[1] || lojas[0], saldoInicial: 238000, dataSaldo: f.inicio });
    const cI = F.criarConta(e, { id: 'CT-BR', nome: 'Bradesco · ' + (lojas[2] || lojas[0]), tipo: 'banco', banco: 'Bradesco', agencia: '1188', numero: '7.402-1', loja: lojas[2] || lojas[0], saldoInicial: 161000, dataSaldo: f.inicio });
    const cX = F.criarConta(e, { id: 'CT-CX', nome: 'Caixa da loja ' + lojas[0], tipo: 'caixa', loja: lojas[0], saldoInicial: 6500, dataSaldo: f.inicio });
    const contaLoja = (l) => (l === lojas[1] ? cS : l === lojas[2] ? cI : cB).id;
    // clientes fictícios (compradores da demonstração) com telefone fictício
    const cli = (ui.A.compradores || []).slice(0, 14).map((c, i) => ui.K.garantirCadastro(e, 'clientes', { nome: c.nome, cidade: c.cidade, telefone: `(16) 9${String(8100 + i * 37).padStart(4, '0')}-${String(1200 + i * 211).slice(-4)}`, documento: `${String(100 + i * 7).padStart(3, '0')}.${String(200 + i * 3).padStart(3, '0')}.${String(300 + i).padStart(3, '0')}-${String(10 + i).slice(-2)}` }));
    const forn = ['Transportadora Campo Forte (fictícia)', 'Despachante Mogiana (fictício)', 'Imobiliária Centro (fictícia)', 'Energia Paulista (fictícia)', 'Agência Safra Digital (fictícia)', 'Contabilidade Orlândia (fictícia)', 'Auto Posto Rodovia (fictício)'].map((n, i) => ui.K.garantirCadastro(e, 'fornecedores', { nome: n, cidade: lojas[i % lojas.length] }));
    // automáticos (vendas, comissões, floor plan) gravados: quase tudo pago, recentes em aberto, um vencido parcelado
    const ctx0 = { trocas: ui.A.todasTrocas || ui.A.trocas, financiadas: ui.A.financiadas || [], cfg: ui.K.cfg, hoje };
    let nr = 0;
    F.automaticos(e, ctx0).forEach((a) => {
      const l = F.materializar(e, a);
      if (l.tipo === 'receber') {
        const i = nr++; l.cliente = cli[(i * 5 + 2) % cli.length].id; l.favorecido = '';
        const idade = F.diasEntre(l.vencimento, hoje);
        if (i === 1 && idade > 20) { F.parcelar(e, l.id, 3, quem); return; } // vendido a prazo: 1ª parcela vencida
        if (idade < 4 && i % 2) return;                                     // vendido agora, ainda não entrou
        F.baixar(e, l.id, { data: F.somarDias(l.vencimento, i % 3), forma: ['pix', 'transferencia', 'boleto'][i % 3], conta: contaLoja(l.loja) }, quem, agora);
      } else if (l.vencimento < d(2)) F.baixar(e, l.id, { data: l.vencimento, forma: l.categoria === 'fin-floor' ? 'transferencia' : 'pix', conta: contaLoja(l.loja) }, quem, agora);
    });
    // máquinas novas vendidas (floor plan): receita com o custo, e a quitação com o banco (estoque: só caixa)
    (ui.A.financiadas || []).filter((fp) => fp.venda && fp.venda >= f.inicio).forEach((fp, i) => {
      const loja = lojas[i % lojas.length];
      const [r] = F.criar(e, { tipo: 'receber', descricao: `Venda de máquina nova · ${fp.marca} ${fp.modelo} (${fp.chassi})`, valor: Math.round(fp.valor * 1.11 / 100) * 100, custoVenda: fp.valor, vencimento: fp.venda, categoria: 'rec-novas', centro: 'cc-novas', loja, maquina: 'F:' + fp.chassi, cliente: cli[(i * 3 + 1) % cli.length].id }, quem, agora);
      if (F.diasEntre(fp.venda, hoje) > 3) F.baixar(e, r.id, { data: F.somarDias(fp.venda, 2), forma: 'transferencia', conta: contaLoja(loja) }, quem, agora);
      const [q] = F.criar(e, { tipo: 'pagar', descricao: `Quitação do floor plan · ${fp.marca} ${fp.modelo} (${fp.chassi})`, valor: fp.valor, vencimento: fp.quitacao || F.somarDias(fp.venda, 5), categoria: 'cus-novas', centro: 'cc-novas', loja, maquina: 'F:' + fp.chassi, favorecido: fp.banco }, quem, agora);
      if (fp.quitacao) F.baixar(e, q.id, { data: fp.quitacao, forma: 'transferencia', conta: contaLoja(loja) }, quem, agora);
    });
    // a prazo vencidos (inadimplência com clientes diferentes)
    [[18, 'Serviço de oficina a prazo · OS-4388', 'rec-oficina', 'cc-oficina', 14800, 3], [41, 'Peças a prazo · pedido 2291', 'rec-pecas', 'cc-pecas', 6350, 6], [76, 'Revisão de colhedora · OS-4402', 'rec-oficina', 'cc-oficina', 23900, 9], [9, 'Peças a prazo · pedido 2317', 'rec-pecas', 'cc-pecas', 3120, 6]]
      .forEach(([n, desc, cat, cc, v, ci]) => F.criar(e, { tipo: 'receber', descricao: desc, valor: v, vencimento: d(n), categoria: cat, centro: cc, loja: lojas[0], cliente: cli[ci % cli.length].id }, quem, agora));
    // despesas fixas mensais (3 meses para trás e 2 para frente), por loja
    const mes0 = F.somarMeses(F.mesDe(hoje) + '-01', -3);
    const fixas = [['Aluguel do galpão', 'des-aluguel', 'cc-adm', [9800, 6400, 5200], 5, 2], ['Folha de pagamento', 'des-pessoal', 'cc-adm', [38000, 21000, 16500], 5, -1], ['Energia, água e internet', 'des-consumo', 'cc-adm', [2900, 1900, 1500], 12, 3], ['Anúncios em portais e redes', 'des-marketing', 'cc-usados', [4200, 0, 0], 15, 4], ['Contador e sistemas', 'des-admin', 'cc-adm', [3600, 0, 0], 10, 5], ['Combustível e veículos', 'des-veiculos', 'cc-adm', [2600, 1500, 1100], 20, 6]];
    fixas.forEach(([desc, cat, cc, vals, dia, fo]) => vals.forEach((v, li) => {
      if (!v || !lojas[li]) return;
      const ls = F.criar(e, { tipo: 'pagar', descricao: `${desc} · ${lojas[li]}`, valor: v, vencimento: F.somarDias(mes0, dia - 1), categoria: cat, centro: cc, loja: lojas[li], fornecedor: fo >= 0 && forn[fo] ? forn[fo].id : '', recorrencia: { meses: 6 } }, quem, agora);
      ls.forEach((l) => { if (l.vencimento < d(1)) F.baixar(e, l.id, { data: l.vencimento, forma: 'boleto', conta: contaLoja(l.loja) }, quem, agora); });
    }));
    // impostos sobre vendas (simplificado, fictício) e receitas de oficina / garantia
    for (let i = 0; i < 4; i++) {
      const m = F.somarMeses(mes0, i);
      F.criar(e, { tipo: 'pagar', descricao: 'Impostos sobre vendas (fictício)', valor: 14800 + i * 950, vencimento: F.somarDias(m, 19), competencia: F.somarDias(m, -5), categoria: 'des-impostos', centro: 'cc-adm', loja: lojas[0] }, quem, agora).forEach((l) => { if (l.vencimento < hoje) F.baixar(e, l.id, { data: l.vencimento, forma: 'boleto', conta: cB.id }, quem, agora); });
      F.criar(e, { tipo: 'receber', descricao: 'Serviços de oficina do mês', valor: 46800 + i * 2900, vencimento: F.somarDias(m, 27), categoria: 'rec-oficina', centro: 'cc-oficina', loja: lojas[0] }, quem, agora).forEach((l) => { if (l.vencimento < hoje) F.baixar(e, l.id, { data: l.vencimento, forma: 'pix', conta: cB.id }, quem, agora); });
    }
    (ui.A.garantias || []).filter((g) => g.status === 'pago' && g.data >= f.inicio).slice(0, 5).forEach((g) => { const [l] = F.criar(e, { tipo: 'receber', descricao: `Garantia ${g.os} · ${g.servico}`, valor: g.pago, vencimento: F.somarDias(g.data, 30), categoria: 'rec-garantia', centro: 'cc-oficina', loja: lojas[0], documento: g.os }, quem, agora); if (l.vencimento < hoje) F.baixar(e, l.id, { data: l.vencimento, forma: 'transferencia', conta: cB.id }, quem, agora); });
    // despesas ligadas a máquinas (frete e documentação), umas pagas e outras em aberto
    (ui.A.todasTrocas || ui.A.trocas).filter((t) => t.entrada >= f.inicio || (t.saida && t.saida >= f.inicio)).slice(0, 12).forEach((t, i) => {
      const [l] = F.criar(e, { tipo: 'pagar', descricao: (i % 2 ? 'Documentação e transferência · ' : 'Frete da máquina · ') + t.marca + ' ' + t.modelo, valor: i % 2 ? 1450 + i * 40 : 2800 + i * 150, vencimento: F.somarDias(t.entrada < f.inicio ? f.inicio : t.entrada, 6), categoria: i % 2 ? 'cus-documentacao' : 'cus-frete', centro: 'cc-usados', loja: t.loja || lojas[0], maquina: t.id, fornecedor: forn[i % 2].id }, quem, agora);
      if (l.vencimento < d(3)) F.baixar(e, l.id, { data: l.vencimento, forma: 'pix', conta: contaLoja(l.loja) }, quem, agora);
    });
    // contas para os próximos dias (para o painel e o fluxo terem o que mostrar)
    [[0, 'pagar', 'Peças para revisão de usados', 'cus-pecas', 7400, 'cc-oficina'], [0, 'receber', 'Revisão de pulverizador · OS-4415', 'rec-oficina', 9600, 'cc-oficina'], [2, 'pagar', 'Seguro do pátio', 'des-admin', 3150, 'cc-adm'], [4, 'receber', 'Peças vendidas no balcão (a prazo)', 'rec-pecas', 12600, 'cc-pecas'], [9, 'pagar', 'Compra de máquina nova · entrada', 'cus-novas', 140000, 'cc-novas']].forEach(([dd, tipo, desc, cat, v, cc], i) => F.criar(e, { tipo, descricao: desc, valor: v, vencimento: F.somarDias(hoje, dd), categoria: cat, centro: cc, loja: lojas[i % lojas.length], cliente: tipo === 'receber' && cli[i] ? cli[i].id : '' }, quem, agora));
    F.transferir(e, { de: cB.id, para: cS.id, valor: 60000, data: d(40), descricao: 'Reforço de caixa da filial' }, quem, agora);
    F.transferir(e, { de: cB.id, para: cX.id, valor: 3000, data: d(12), descricao: 'Troco do caixa da loja' }, quem, agora);
    // extrato do BB dos últimos 20 dias: o que foi pago + uma tarifa sem par (para a conciliação ter o que fazer)
    const linhas = F.movimentos(e, { conta: cB.id, de: d(20) }).map((m) => ({ data: m.data, valor: m.valor, descricao: m.valor > 0 ? 'PIX RECEBIDO ' + m.descricao.toUpperCase().slice(0, 28) : 'PAGTO ' + m.descricao.toUpperCase().slice(0, 30), fitid: 'BB' + m.ref }));
    linhas.push({ data: d(3), valor: -89.9, descricao: 'TARIFA PACOTE SERVICOS', fitid: 'BBTAR1' }, { data: d(1), valor: 1.37 * 100, descricao: 'RENDIMENTO APLIC AUTOMATICA', fitid: 'BBREN1' });
    F.importarExtrato(e, cB.id, linhas, quem, agora);
    F.autoConciliar(e, cB.id, quem, agora, ctx0);
    // deixa 3 linhas sem conciliar para mostrar o trabalho manual
    f.extrato.filter((x) => x.conciliado).slice(0, 3).forEach((x) => F.desconciliar(e, x.id));
    f.semente = true;
    ui.K.aplicarFinanceiro(ui.A.todasTrocas || ui.A.trocas, e);
    ui.salvar();
  }

  // ---------- busca global ----------
  function buscar(q, ui) {
    if (!q || q.length < 2 || !F.podeVer(ui.eu().perfil)) return [];
    U = ui; const s = q.toLowerCase();
    return F.todos(ui.estado, ctx()).filter((l) => !l.cancelado && [l.descricao, pessoa(l), l.documento, nomeMaq(l.maquina)].join(' ').toLowerCase().includes(s)).slice(0, 6)
      .map((l) => ({ g: 'Financeiro', n: l.descricao, d: `${l.tipo === 'pagar' ? 'A pagar' : 'A receber'} · ${brl(l.valor)} · ${F.NOMES_SIT[F.situacao(l, ui.hojeISO())].toLowerCase()} · ${F.dataBR(l.vencimento)}`, ir: () => { location.hash = '#fin-' + l.tipo; setTimeout(() => detalhe(l.id), 320); } }));
  }

  const T = (fn) => (ui) => { U = ui; F.garantir(ui.estado); fn(); };
  const ITEM = (aba, rotulo, curto, icone) => ({ aba, rotulo, curto, icone });
  R.registrar({
    id: 'financeiro', nome: 'Financeiro', curto: 'Financeiro', ordem: 30, pronta: true, inicio: 'fin', perfis: VER,
    descricao: 'Contas a pagar e a receber, bancos, conciliação, fluxo de caixa e DRE por loja.',
    icone: '<path d="M3 7h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM3 7l2-3h12l2 3M16 13.5h2"/>',
    acao: { rotulo: 'Novo lançamento', href: '#fin-pagar', novo: true },
    dados: { fin: ['contas', 'lancamentos', 'transferencias', 'extrato', 'categorias', 'centros'], cadastros: ['clientes', 'fornecedores'] },
    menu: [
      { grupo: 'Visão', itens: [ITEM('fin', 'Painel financeiro', 'Painel', '<path d="M4 13h6V4H4zM14 20h6V11h-6zM14 4v4h6V4zM4 20h6v-4H4z"/>'), ITEM('fin-fluxo', 'Fluxo de caixa', 'Fluxo', '<path d="M3 17l6-6 4 4 8-8M15 7h6v6"/>'), ITEM('fin-dre', 'DRE gerencial', 'DRE', '<path d="M6 3h9l4 4v14H6zM14 3v5h5M9 13h7M9 17h5"/>')] },
      { grupo: 'Contas', itens: [ITEM('fin-receber', 'Contas a receber', 'Receber', '<path d="M12 19V5M6 11l6-6 6 6"/>'), ITEM('fin-pagar', 'Contas a pagar', 'Pagar', '<path d="M12 5v14M6 13l6 6 6-6"/>'), ITEM('fin-inadimplencia', 'Inadimplência', 'Atrasos', '<path d="M12 3 2 20h20L12 3zM12 10v4M12 17v.5"/>'), ITEM('fin-comissoes', 'Comissões', 'Comissões', '<path d="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21v-1a6 6 0 0 1 12 0v1M17 8v6M14 11h6"/>')] },
      { grupo: 'Bancos', itens: [ITEM('fin-contas', 'Bancos e caixa', 'Bancos', '<path d="M3 10l9-6 9 6M5 10v9M19 10v9M9 10v9M15 10v9M3 21h18"/>'), ITEM('fin-conciliacao', 'Conciliação', 'Extrato', '<path d="M9 12l2 2 4-4M4 4h16v16H4z"/>')] },
      { grupo: 'Custos', itens: [ITEM('fin-maquinas', 'Despesas por máquina', 'Máquinas', '<path d="M5 17V9h7l2 4h4v4"/><circle cx="8" cy="17" r="3"/><circle cx="18" cy="18" r="2"/>'), ITEM('financiamento', 'Estoque financiado', 'Floor plan', '<path d="M3 10l9-6 9 6M5 10v9M19 10v9M3 21h18"/>'), ITEM('garantias', 'Garantias a receber', 'Garantias', '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6zM8.5 12l2.5 2.5 4.5-5"/>'), ITEM('cadastros', 'Cadastros', 'Cadastros', '<path d="M4 5h16v14H4zM8 9h8M8 13h5"/>')] }
    ],
    telas: { fin: T(telaPainel), 'fin-receber': T(() => telaLista('receber')), 'fin-pagar': T(() => telaLista('pagar')), 'fin-contas': T(telaContas), 'fin-conciliacao': T(telaConciliacao), 'fin-fluxo': T(telaFluxo), 'fin-dre': T(telaDRE), 'fin-inadimplencia': T(telaInad), 'fin-comissoes': T(telaComissoes), 'fin-maquinas': T(telaMaquinas), cadastros: T(telaCadastros) },
    permissoes: { fin: VER, 'fin-receber': VER, 'fin-pagar': VER, 'fin-contas': VER, 'fin-conciliacao': VER, 'fin-fluxo': VER, 'fin-dre': VER, 'fin-inadimplencia': VER, 'fin-comissoes': VER, 'fin-maquinas': VER, cadastros: ['dono', 'financeiro', 'gerente', 'auditor', 'vendedor'] },
    numero: (ui) => { U = ui; F.garantir(ui.estado); const r = F.resumo(ui.estado, Object.assign({ hoje: ui.hojeISO(), ctx: ctx() }, fl())); const n = r.pagarHoje.n + r.receberHoje.n; return { valor: brl(r.pagarHoje.valor), texto: `a pagar hoje · ${brl(r.receberHoje.valor)} a receber${r.pagarVencido.n ? ` · ${r.pagarVencido.n} vencidas` : ''}`, alerta: r.pagarVencido.n > 0, n }; },
    buscar,
    novo: (ui) => { U = ui; if (!editor()) { ui.toast('Só o dono e o financeiro lançam.', true); return; } ui.abrirCamada('modal', `<h2>Novo lançamento</h2><p class="sub">O que você vai lançar?</p><div class="acoes" style="flex-wrap:wrap"><button class="btn btn-ouro" type="button" data-nt="receber">${I.entra}Conta a receber</button><button class="btn btn-ouro" type="button" data-nt="pagar">${I.sai}Conta a pagar</button>${fin().contas.length > 1 ? '<a class="btn btn-linha" href="#fin-contas">Transferência entre contas</a>' : ''}</div>`, (c) => { U.$$('[data-nt]', c).forEach((b) => b.onclick = () => formLancamento({ tipo: b.dataset.nt })); }); },
    iniciar: semearDemo
  });
  raiz.FINANCEIRO_UI = { detalhe: (id) => detalhe(id) };
})(typeof window !== 'undefined' ? window : globalThis);
