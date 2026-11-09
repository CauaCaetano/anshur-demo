// Área MÁQUINAS NOVAS: telas. As regras (puras, testadas) estão em areas/novas-regras.js (window.NOVAS).
// Catálogo, pedidos à fábrica, reservas com prazo, propostas (troca ligada à avaliação do Anshur, condição, alçada igual à dos usados),
// negociação, venda faturada (contas a receber + comissão no Financeiro) e entrega técnica.
// Permissões: dono e gerente fazem tudo; vendedor vê e mexe só no que é dele; financeiro e auditor só leem.
(function (raiz) {
  const R = raiz.ANSHUR_AREAS; if (!R) return;
  const ICONE = '<path d="M5 17V9h7l2 4h4v4"/><path d="M8 9V6"/><circle cx="8" cy="17" r="3"/><circle cx="18" cy="18" r="2"/><path d="M17 4v4M15 6h4"/>';
  const PERFIS = ['dono', 'gerente', 'vendedor', 'financeiro', 'auditor'];
  // registro básico (também no node, para a fila offline e os testes conhecerem as listas desta área)
  R.registrar({
    id: 'novas', nome: 'Máquinas Novas', curto: 'Novas', ordem: 20, pronta: false, perfis: PERFIS,
    descricao: 'Catálogo, pedidos, reservas, propostas e vendas de máquinas novas.', icone: ICONE,
    previsto: ['Catálogo com marca, modelo, versão, custo, preço e disponibilidade', 'Pedidos à fábrica e reservas', 'Propostas e negociações até a venda', 'Venda vira conta a receber e comissão no Financeiro'],
    hoje: 'Hoje já existe: Estoque financiado (floor plan das novas) no Financeiro e em Usados.',
    dados: { novas: ['catalogo', 'pedidos', 'reservas', 'propostas', 'vendas'], cadastros: ['clientes'] }
  });
  const N = raiz.NOVAS;
  if (!N || typeof document === 'undefined') return;

  let U = null;
  const VER = PERFIS;
  const est = () => U.estado;
  const eu = () => U.eu();
  const perfil = () => eu().perfil, nome = () => eu().nome;
  const leitura = () => !['dono', 'gerente', 'vendedor'].includes(perfil()) || U.somenteLeitura() || !!(U.NV && U.NV.somenteLeitura);
  const gestor = () => N.gestor(perfil()) && !leitura();
  const podeMexer = (reg) => !leitura() && N.podeEditar(reg, perfil(), nome());
  const ve = (reg) => N.visivel(reg, perfil(), nome());
  const F = () => raiz.FINANCEIRO;
  const CRM = () => raiz.CRM;
  const hoje = () => U.hojeISO();
  const agora = () => new Date().toISOString();
  const alc = () => (U.alcadas ? U.alcadas() : N.alcadas(est()));
  const ctxN = () => ({ perfil: perfil(), quem: nome(), agora: agora(), hoje: hoje(), alcadas: alc(), cfg: U.K.cfg });
  const brl = (v) => (+v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
  const dBR = (iso) => (iso ? String(iso).slice(0, 10).split('-').reverse().join('/') : '—');
  const nomeCliente = (id) => { const c = U.K.cad.cliente(id); return c ? c.nome : ''; };
  const nomeIt = (id) => N.nomeItem(N.item(est(), id)) || 'Máquina removida';
  const loja = () => est().lojaAtual || '';
  const daLoja = (x) => !loja() || !x.loja || x.loja === loja();
  const vendedores = () => { const l = U.K.cad.usuarios().filter((u) => ['vendedor', 'gerente', 'dono'].includes(u.perfil)).map((u) => u.nome); return l.includes(nome()) ? l : [nome()].concat(l); };
  const opt = (pares, sel) => pares.map(([v, n]) => `<option value="${U.esc(v)}" ${String(sel) === String(v) ? 'selected' : ''}>${U.esc(n)}</option>`).join('');
  const ic = (d) => `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
  const I = {
    maq: ic(ICONE), doc: ic('<path d="M6 3h9l4 4v14H6zM14 3v5h5M9 13h7M9 17h5"/>'), relogio: ic('<path d="M12 7v5l3 2M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z"/>'),
    alerta: ic('<path d="M12 3 2 20h20L12 3zM12 10v4M12 17v.5"/>'), check: ic('<path d="M5 12.5l4.5 4.5L19 7.5"/>'), fabrica: ic('<path d="M3 21V10l6 3V10l6 3V6l6 3v12zM7 17h2M12 17h2M17 17h2"/>'),
    trava: ic('<path d="M6 11h12v10H6zM8 11V7a4 4 0 0 1 8 0v4"/>'), moeda: ic('<path d="M12 3v18M17 7.5c0-1.9-2.2-3-5-3s-5 1.1-5 3 2.2 2.7 5 3.2 5 1.4 5 3.3-2.2 3-5 3-5-1.1-5-3"/>'),
    zap: ic('<path d="M4 20l1.3-4A8 8 0 1 1 8 18.7z"/><path d="M9 9.5c.5 2.5 2.5 4.5 5 5l1.2-1.4 2 .9c-.3 1.4-1.4 2-2.6 2-3.9-.4-6.6-3.1-7-7 0-1.2.6-2.3 2-2.6l.9 2z"/>'),
    entrega: ic('<path d="M3 7h11v9H3zM14 10h4l3 3v3h-7M7 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM17 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"/>')
  };
  const vazio = (t) => `<p class="vazio">${t}</p>`;
  const cab = (titulo, sub, botoes = '') => `<div class="titulo"><div><h1>${titulo}</h1><p>${sub}</p></div>${botoes ? `<div class="fin-acoes">${botoes}</div>` : ''}</div>`;
  const soLeitura = () => (leitura() ? '<span class="tag declarado">Só leitura</span>' : '');
  function gravar(texto) { U.log('novas', texto); U.salvar(); }
  const tente = (fn) => { try { return fn(); } catch (e) { U.toast(e.message, true); return null; } };

  // estilos próprios das áreas Novas e CRM (só o que não existe no estilo.css; mesmas variáveis da paleta)
  function estilo() {
    if (document.getElementById('nc-estilo')) return;
    const s = document.createElement('style'); s.id = 'nc-estilo';
    s.textContent = `
.nc-tag{display:inline-flex;align-items:center;gap:4px;padding:3px 9px;border-radius:999px;font-size:13px;font-weight:650;white-space:nowrap;background:var(--marfim);color:var(--grafite)}
.nc-tag.ok{background:rgba(113,135,123,.18);color:var(--verde-claro)}.nc-tag.ouro{background:rgba(193,163,106,.2);color:var(--ouro-texto)}
.nc-tag.risco{background:rgba(181,83,79,.13);color:var(--vermelho-claro)}.nc-tag.neutro{background:#EEF0F0;color:var(--cinza)}
.nc-calc{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,150px),1fr));gap:8px;margin:12px 0;padding:12px;border:1px solid var(--borda);border-radius:12px;background:#FDFBF6}
.nc-calc div{display:grid;gap:2px}.nc-calc span{color:var(--cinza);font-size:13px}.nc-calc b{font-size:17px}
.nc-lista{list-style:none;margin:0;padding:0;display:grid;gap:8px}
.nc-lista li{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;padding:12px 14px;border:1px solid var(--borda);border-radius:12px;background:#fff}
.nc-lista li>div{display:grid;gap:2px;min-width:0;flex:1 1 220px}.nc-lista li>div span{color:var(--cinza);font-size:14px;overflow-wrap:anywhere}
.nc-lista li.clicavel{cursor:pointer}.nc-lista li.clicavel:hover{border-color:var(--ouro)}
.nc-kanban{display:grid;grid-auto-flow:column;grid-auto-columns:minmax(230px,1fr);gap:12px;overflow-x:auto;padding-bottom:6px}
.nc-col{background:#F6F2EA;border:1px solid var(--borda);border-radius:14px;padding:10px;display:grid;align-content:start;gap:8px;min-width:0}
.nc-col h3{font-size:15px;margin:2px 4px 4px;display:flex;justify-content:space-between;gap:8px}.nc-col h3 span{color:var(--cinza);font-weight:600}
.nc-card{display:grid;gap:3px;text-align:left;padding:10px 12px;border-radius:10px;border:1px solid var(--borda);background:#fff;font:inherit;color:inherit;cursor:pointer;width:100%}
.nc-card:hover,.nc-card:focus-visible{border-color:var(--ouro);outline:none}.nc-card b{font-size:15px}.nc-card span{color:var(--cinza);font-size:13px;overflow-wrap:anywhere}
.nc-tl{list-style:none;margin:0;padding:0;display:grid;gap:0}.nc-tl li{display:grid;grid-template-columns:92px 1fr auto;gap:10px;padding:9px 0;border-bottom:1px dashed var(--borda);align-items:baseline}
.nc-tl li span{color:var(--cinza);font-size:13.5px}.nc-tl li b{font-weight:600;overflow-wrap:anywhere}
.nc-safra{display:grid;grid-template-columns:120px repeat(12,minmax(0,1fr));gap:3px;font-size:12.5px;align-items:center}
.nc-safra .m{text-align:center;color:var(--cinza)}.nc-safra .c{height:22px;border-radius:5px;background:#EFEAE0}.nc-safra .c.on{background:var(--verde)}.nc-safra .c.hoje{outline:2px solid var(--ouro);outline-offset:-2px}
.kpi .val.nc-txt{font-size:20px;white-space:normal;overflow-wrap:anywhere;line-height:1.25}.kpi{min-width:0}
.nc-check{display:grid;gap:8px;margin:10px 0}.nc-check label{display:flex;gap:10px;align-items:flex-start}
.nc-grade{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:16px}
.nc-faz{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,140px),1fr));gap:8px;padding:10px;border:1px dashed var(--borda);border-radius:10px;margin-bottom:8px}
@media (max-width:760px){.nc-t td{min-width:136px}.nc-t td.n{min-width:0}.nc-kanban{grid-auto-flow:row;grid-auto-columns:auto;overflow:visible}.nc-safra{grid-template-columns:82px repeat(12,minmax(0,1fr));font-size:11px}.nc-tl li{grid-template-columns:78px 1fr}.nc-tl li>:last-child{grid-column:2}}
`;
    document.head.appendChild(s);
  }
  raiz.NC_ESTILO = estilo;

  const tagSitItem = (s) => `<span class="nc-tag ${s === 'estoque' ? 'ok' : s === 'reservada' ? 'ouro' : s === 'vendida' ? 'neutro' : ''}">${N.SIT_ITEM[s] || s}</span>`;
  const tagSitProp = (s) => `<span class="nc-tag ${['aberta', 'negociacao', 'aprovada'].includes(s) ? 'ok' : s === 'aguardando' ? 'ouro' : ['vencida', 'recusada', 'perdida'].includes(s) ? 'risco' : 'neutro'}">${N.SIT_PROP[s] || s}</span>`;
  const faltam = (iso) => { const d = N.diasEntre(hoje(), iso); return d < 0 ? `venceu há ${-d} ${-d === 1 ? 'dia' : 'dias'}` : d === 0 ? 'vence hoje' : `vence em ${d} ${d === 1 ? 'dia' : 'dias'}`; };

  // ---------- PAINEL ----------
  function telaPainel() {
    const r = N.resumo(est(), { hoje: hoje(), perfil: perfil(), nome: nome(), loja: loja() }), n = N.garantir(est()), h = hoje(), lim = N.somarDias(h, 3);
    const props = n.propostas.filter((p) => ve(p) && daLoja(p));
    const pend = [];
    props.filter((p) => p.status === 'aguardando').forEach((p) => pend.push({ n: 1, t: `Aprovação: ${nomeCliente(p.cliente)} · ${nomeIt(p.item)}`, d: `${p.vendedor} pediu ${brl(p.preco)} · ${N.NOME_NIVEL[p.calc.nivel]} (${brl(p.calc.excesso)} além do limite)`, prop: p.id }));
    props.filter((p) => N.emAberto(p) && p.status !== 'aguardando' && p.validade <= lim).forEach((p) => pend.push({ n: p.validade < h ? 1 : 2, t: `Proposta ${faltam(p.validade)}: ${nomeCliente(p.cliente)}`, d: `${nomeIt(p.item)} · ${brl(p.preco)} · ${p.vendedor}`, prop: p.id }));
    n.reservas.filter((x) => ve(x) && daLoja(x) && x.status === 'ativa' && x.ate <= lim).forEach((x) => pend.push({ n: x.ate < h ? 1 : 2, t: `Reserva ${faltam(x.ate)}: ${nomeIt(x.item)}`, d: `${nomeCliente(x.cliente)} · ${x.vendedor || ''}`, item: x.item }));
    n.pedidos.filter((p) => p.status === 'aberto' && daLoja(p) && p.previsao && p.previsao < h).forEach((p) => pend.push({ n: 2, t: `Pedido atrasado: ${nomeIt(p.item)}`, d: `${p.fabrica} · previsto para ${dBR(p.previsao)}`, item: p.item }));
    n.vendas.filter((v) => ve(v) && daLoja(v) && !(v.entrega && v.entrega.completa)).forEach((v) => pend.push({ n: 3, t: `Entrega técnica pendente: ${nomeIt(v.item)}`, d: `${nomeCliente(v.cliente)} · vendida em ${dBR(v.data)}`, venda: v.id }));
    pend.sort((a, b) => a.n - b.n);
    const ult = n.vendas.filter((v) => ve(v) && daLoja(v)).sort((a, b) => b.data.localeCompare(a.data)).slice(0, 5);
    U.tela.innerHTML = cab('Máquinas Novas', `Catálogo, pedidos, reservas, propostas e vendas${loja() ? ' · loja ' + U.esc(loja()) : ''}. ${perfil() === 'vendedor' ? 'Você vê as suas propostas e reservas.' : ''}`, botoes()) + `
      <div class="kpis fin-k">
        <a class="kpi k-marfim" href="#nv-catalogo"><span class="rot">${I.maq}Em estoque</span><span class="val">${r.estoque}</span><span class="exp">${r.reservadas} reservadas${perfil() === 'vendedor' ? '' : ' · ' + brl(r.valorEstoque) + ' em custo'}</span></a>
        <a class="kpi ${r.pedidosAtrasados ? 'k-risco' : ''}" href="#nv-pedidos"><span class="rot">${I.fabrica}A caminho da fábrica</span><span class="val">${r.aCaminho}</span><span class="exp">${r.pedidosAbertos} ${r.pedidosAbertos === 1 ? 'pedido aberto' : 'pedidos abertos'}${r.pedidosAtrasados ? ` · ${r.pedidosAtrasados} atrasados` : ''}</span></a>
        <a class="kpi ${r.propostasVencendo || r.aguardando ? 'k-risco' : 'k-salvia'}" href="#nv-propostas"><span class="rot">${I.doc}Propostas abertas</span><span class="val">${r.propostasAbertas}</span><span class="exp">${brl(r.valorPropostas)} · ${r.propostasVencendo} vencendo em 3 dias${r.aguardando ? ` · ${r.aguardando} esperando aprovação` : ''}</span></a>
        <a class="kpi k-salvia" href="#nv-vendas"><span class="rot">${I.moeda}Vendas no mês</span><span class="val">${r.vendasMes}</span><span class="exp">${brl(r.valorVendasMes)}${r.entregasPendentes ? ` · ${r.entregasPendentes} entregas técnicas pendentes` : ''}</span></a>
      </div>
      <section class="painel bloco"><div class="painel-cab"><h2>${I.alerta}Precisa de atenção</h2><p>${pend.length ? 'Toque para abrir' : ''}</p></div>
        ${pend.length ? `<ul class="nc-lista">${pend.slice(0, 14).map((x, k) => `<li class="clicavel" tabindex="0" data-pend="${k}"><div><b>${U.esc(x.t)}</b><span>${U.esc(x.d)}</span></div><span class="nc-tag ${x.n === 1 ? 'risco' : x.n === 2 ? 'ouro' : ''}">${x.n === 1 ? 'Agora' : x.n === 2 ? 'Esta semana' : 'Pendente'}</span></li>`).join('')}</ul>` : vazio('Nada pendente: nenhuma proposta vencendo, reserva expirando, pedido atrasado ou entrega por fazer.')}</section>
      <section class="painel bloco"><div class="painel-cab"><h2>${I.moeda}Últimas vendas</h2><p><a class="link" href="#nv-vendas">Ver todas</a></p></div>
        ${ult.length ? `<ul class="nc-lista">${ult.map((v) => { const s = N.situacaoVenda(est(), v); return `<li class="clicavel" tabindex="0" data-venda="${v.id}"><div><b>${U.esc(nomeIt(v.item))} · ${U.esc(nomeCliente(v.cliente))}</b><span>${dBR(v.data)} · ${U.esc(v.vendedor)} · ${brl(v.preco)}</span></div><span class="nc-tag ${s.situacao === 'recebida' ? 'ok' : 'ouro'}">${s.situacao === 'recebida' ? 'Recebida' : 'Faturada · ' + brl(s.aberto) + ' a receber'}</span></li>`; }).join('')}</ul>` : vazio('Nenhuma venda de máquina nova ainda.')}</section>`;
    U.$$('[data-pend]', U.tela).forEach((li) => { const x = pend[+li.dataset.pend]; li.onclick = () => (x.prop ? detalheProposta(x.prop) : x.venda ? detalheVenda(x.venda) : detalheItem(x.item)); li.onkeydown = (e) => { if (e.key === 'Enter') li.onclick(); }; });
    ligar();
  }
  function botoes() {
    if (leitura()) return soLeitura();
    return `<button class="btn btn-ouro" type="button" data-nv-novo="proposta">${I.doc}<span>Nova proposta</span></button>${gestor() ? `<button class="btn btn-linha" type="button" data-nv-novo="item">${I.maq}<span>Máquina no catálogo</span></button><button class="btn btn-linha" type="button" data-nv-novo="pedido">${I.fabrica}<span>Pedido à fábrica</span></button>` : ''}`;
  }
  function ligar() {
    U.$$('[data-nv-novo]', U.tela).forEach((b) => b.onclick = () => ({ proposta: () => formProposta(), item: () => formItem(), pedido: () => formPedido() })[b.dataset.nvNovo]());
    U.$$('[data-venda]', U.tela).forEach((x) => { x.onclick = () => detalheVenda(x.dataset.venda); x.onkeydown = (e) => { if (e.key === 'Enter') detalheVenda(x.dataset.venda); }; });
    U.$$('[data-prop]', U.tela).forEach((x) => { x.onclick = () => detalheProposta(x.dataset.prop); x.onkeydown = (e) => { if (e.key === 'Enter') detalheProposta(x.dataset.prop); }; });
    U.$$('[data-item]', U.tela).forEach((x) => { x.onclick = (e) => { if (e.target.closest('button,a')) return; detalheItem(x.dataset.item); }; x.onkeydown = (e) => { if (e.key === 'Enter' && e.target === x) detalheItem(x.dataset.item); }; });
  }

  // ---------- CATÁLOGO ----------
  const fCat = { sit: 'disponiveis', q: '' };
  function telaCatalogo() {
    const h = hoje(), ver = perfil() !== 'vendedor';
    const todos = N.garantir(est()).catalogo.filter((i) => !i.inativo && daLoja(i));
    const lista = todos.filter((i) => { const s = N.situacaoItem(est(), i, h); if (fCat.sit === 'disponiveis' && !['estoque', 'pedido', 'reservada'].includes(s)) return false; if (!['disponiveis', 'todas'].includes(fCat.sit) && s !== fCat.sit) return false;
      return !fCat.q || [i.marca, i.modelo, i.versao, i.chassi, i.loja, i.anoModelo].join(' ').toLowerCase().includes(fCat.q.toLowerCase()); })
      .sort((a, b) => (a.marca + a.modelo).localeCompare(b.marca + b.modelo));
    U.tela.innerHTML = cab('Catálogo de novas', 'Cada máquina com custo, preço de tabela, preço mínimo, disponibilidade e chassi quando chega.', botoes()) + `
      <section class="painel"><div class="fin-filtros"><div class="abas-modo" role="group" aria-label="Situação">${[['disponiveis', 'Disponíveis'], ['estoque', 'Em estoque'], ['pedido', 'A caminho'], ['reservada', 'Reservadas'], ['vendida', 'Vendidas'], ['todas', 'Todas']].map(([v, n]) => `<button type="button" data-fs="${v}" aria-pressed="${fCat.sit === v}">${n}</button>`).join('')}</div>
        <div class="campos fin-campos"><div class="campo"><label for="nc-q">Buscar</label><input id="nc-q" value="${U.esc(fCat.q)}" placeholder="Marca, modelo, chassi, loja"></div></div></div>
        ${lista.length ? `<div class="tabela-wrap"><table class="tabela fin-tab nc-t"><thead><tr><th>Máquina</th><th>Chassi</th><th>Loja</th><th>Situação</th><th class="n">Tabela</th><th class="n">Mínimo</th>${ver ? '<th class="n">Custo</th>' : ''}</tr></thead><tbody>
          ${lista.map((i) => { const s = N.situacaoItem(est(), i, h), rs = N.reservaAtiva(est(), i.id, h); return `<tr class="clicavel" tabindex="0" data-item="${i.id}"><td><b>${U.esc(i.marca + ' ' + i.modelo)}</b><span class="fin-sub">${U.esc([i.versao, i.anoModelo && 'ano-modelo ' + i.anoModelo, U.NOMES[i.tipo]].filter(Boolean).join(' · '))}</span></td>
            <td>${i.chassi ? U.esc(i.chassi) : '<span class="sub">chega da fábrica</span>'}</td><td>${U.esc(i.loja || '—')}</td><td>${tagSitItem(s)}${rs ? `<span class="fin-sub">${U.esc(nomeCliente(rs.cliente))} até ${dBR(rs.ate)}</span>` : ''}</td>
            <td class="n">${brl(i.tabela)}</td><td class="n">${brl(i.minimo)}</td>${ver ? `<td class="n">${brl(i.custo)}</td>` : ''}</tr>`; }).join('')}</tbody></table></div>` : vazio(todos.length ? 'Nenhuma máquina com estes filtros.' : 'Nenhuma máquina nova cadastrada. ' + (gestor() ? 'Use "Máquina no catálogo" ou "Pedido à fábrica".' : ''))}
        <div class="fin-rodape"><span>${lista.length} ${lista.length === 1 ? 'máquina' : 'máquinas'}</span>${ver ? '<button class="btn btn-linha" type="button" id="nc-csv">Exportar planilha</button>' : ''}</div></section>`;
    U.$$('[data-fs]', U.tela).forEach((b) => b.onclick = () => { fCat.sit = b.dataset.fs; telaCatalogo(); });
    U.$('#nc-q').oninput = (e) => { fCat.q = e.target.value; clearTimeout(telaCatalogo.t); telaCatalogo.t = setTimeout(() => { telaCatalogo(); const q = U.$('#nc-q'); q.focus(); q.setSelectionRange(q.value.length, q.value.length); }, 250); };
    const csv = U.$('#nc-csv'); if (csv) csv.onclick = () => U.baixarCSV(`anshur-novas-catalogo-${hoje()}.csv`, [['Marca', 'Modelo', 'Versão', 'Ano-modelo', 'Tipo', 'Chassi', 'Loja', 'Situação', 'Tabela', 'Mínimo', 'Custo', 'Id']]
      .concat(lista.map((i) => [i.marca, i.modelo, i.versao, i.anoModelo, U.NOMES[i.tipo] || i.tipo, i.chassi, i.loja, N.SIT_ITEM[N.situacaoItem(est(), i, hoje())], i.tabela, i.minimo, i.custo, i.id])));
    ligar();
  }
  function camposItem(i = {}) {
    return `<div class="campo"><label for="ni-tipo">Tipo</label><select id="ni-tipo">${opt(Object.entries(U.NOMES), i.tipo || 'trator')}</select></div>
      <div class="campo"><label for="ni-marca">Marca *</label><input id="ni-marca" list="dl-ni-marca" value="${U.esc(i.marca || '')}" autocomplete="off"><datalist id="dl-ni-marca">${[...new Set(U.A.modelos.map((m) => m.marca))].map((m) => `<option value="${U.esc(m)}">`).join('')}</datalist></div>
      <div class="campo"><label for="ni-modelo">Modelo *</label><input id="ni-modelo" list="dl-ni-modelo" value="${U.esc(i.modelo || '')}" autocomplete="off"><datalist id="dl-ni-modelo">${[...new Set(U.A.modelos.map((m) => m.modelo))].map((m) => `<option value="${U.esc(m)}">`).join('')}</datalist></div>
      <div class="campo"><label for="ni-versao">Versão</label><input id="ni-versao" value="${U.esc(i.versao || '')}" placeholder="Ex.: PowerQuad, cabine"></div>
      <div class="campo"><label for="ni-ano">Ano-modelo</label><input id="ni-ano" inputmode="numeric" value="${U.esc(i.anoModelo || new Date().getFullYear())}"></div>
      <div class="campo"><label for="ni-custo">Custo (R$)</label><input id="ni-custo" inputmode="decimal" value="${i.custo ? U.esc(String(i.custo)) : ''}"></div>
      <div class="campo"><label for="ni-tabela">Preço de tabela (R$) *</label><input id="ni-tabela" inputmode="decimal" value="${i.tabela ? U.esc(String(i.tabela)) : ''}"></div>
      <div class="campo"><label for="ni-minimo">Preço mínimo (R$)</label><input id="ni-minimo" inputmode="decimal" value="${i.minimo ? U.esc(String(i.minimo)) : ''}" placeholder="Abaixo disso vai para a alçada"></div>
      <div class="campo"><label for="ni-loja">Loja</label><select id="ni-loja">${opt([['', '—']].concat((U.K.lojasPermitidas || est().lojas || []).map((l) => [l, l])), i.loja || loja())}</select></div>`;
  }
  const lerItem = (c) => ({ tipo: U.$('#ni-tipo', c).value, marca: U.$('#ni-marca', c).value.trim(), modelo: U.$('#ni-modelo', c).value.trim(), versao: U.$('#ni-versao', c).value.trim(), anoModelo: U.num(U.$('#ni-ano', c).value) || '',
    custo: U.num(U.$('#ni-custo', c).value), tabela: U.num(U.$('#ni-tabela', c).value), minimo: U.num(U.$('#ni-minimo', c).value) || U.num(U.$('#ni-tabela', c).value), loja: U.$('#ni-loja', c).value });
  const erroItem = (e) => (e.includes('tabela') ? 'Informe o preço de tabela.' : e.includes('minimo') ? 'O mínimo não pode passar da tabela.' : e.includes('marca') || e.includes('modelo') ? 'Informe marca e modelo.' : 'Confira os valores.');
  function formItem(editar = null) {
    if (!gestor()) { U.toast('Só o dono e o gerente mexem no catálogo.', true); return; }
    const i = editar || {};
    U.abrirCamada('modal larga-modal', `<h2>${editar ? 'Editar máquina' : 'Máquina no catálogo'}</h2><p class="sub">Para máquina que ainda vem da fábrica, use "Pedido à fábrica".</p>
      <form class="campos" style="margin-top:12px" novalidate>${camposItem(i)}
      <div class="campo"><label for="ni-chassi">Chassi${editar && !i.chassi ? ' (quando chegar)' : ''}</label><input id="ni-chassi" value="${U.esc(i.chassi || '')}" ${editar && i.chassi ? 'disabled' : ''}></div>
      <div class="campo inteiro"><label for="ni-obs">Observação</label><input id="ni-obs" value="${U.esc(i.obs || '')}"></div></form>
      <div class="acoes"><button class="btn btn-ouro" type="button" id="ni-ok">Salvar</button><button class="btn btn-linha" type="button" id="ni-nao">Cancelar</button></div>`, (c) => {
      U.$('#ni-nao', c).onclick = () => U.fecharCamada();
      U.$('#ni-ok', c).onclick = () => {
        const d = lerItem(c); d.obs = U.$('#ni-obs', c).value.trim(); const ch = U.$('#ni-chassi', c).value.trim();
        const e = N.validarItem(d); if (e.length) { U.toast(erroItem(e), true); return; }
        const r = tente(() => (editar ? N.editarItem(est(), editar.id, Object.assign(d, ch && !editar.chassi ? { chassi: ch } : {})) : N.criarItem(est(), Object.assign(d, { chassi: ch, disp: ch ? 'estoque' : 'pedido' }), nome(), agora())));
        if (!r) return;
        gravar(`${editar ? 'Máquina nova editada' : 'Máquina nova no catálogo'}: ${N.nomeItem(r)}${r.chassi ? ' (' + r.chassi + ')' : ''}`); U.toast(editar ? 'Máquina atualizada.' : 'Máquina cadastrada.'); U.fecharCamada(true); U.rota();
      };
    });
  }
  function detalheItem(id) {
    const i = N.item(est(), id); if (!i) return;
    const h = hoje(), s = N.situacaoItem(est(), i, h), rs = N.reservaAtiva(est(), i.id, h), n = N.garantir(est());
    const props = n.propostas.filter((p) => p.item === i.id && ve(p)), ped = n.pedidos.find((p) => p.item === i.id && p.status === 'aberto');
    const fp = (U.A.financiadas || []).find((f) => i.chassi && f.chassi === i.chassi);
    const li = (r, v) => (v ? `<li><span>${r}</span><b>${v}</b></li>` : '');
    U.abrirCamada('gaveta', `<h2>${U.esc(N.nomeItem(i))}</h2><p class="sub" style="margin:4px 0 12px">${tagSitItem(s)} ${U.esc(U.NOMES[i.tipo] || '')}</p>
      <ul class="lista-motivos">${li('Chassi', U.esc(i.chassi || 'ainda na fábrica'))}${li('Loja', U.esc(i.loja))}${li('Preço de tabela', brl(i.tabela))}${li('Preço mínimo', brl(i.minimo))}${perfil() !== 'vendedor' ? li('Custo', brl(i.custo)) : ''}
        ${li('Chegou em', i.chegada ? dBR(i.chegada) : '')}${li('Pedido à fábrica', ped ? `${U.esc(ped.fabrica)} · previsão ${dBR(ped.previsao)}` : '')}${li('Floor plan', fp ? `${U.esc(fp.banco)} · entrou em ${dBR(fp.entrada)}` : '')}
        ${li('Reservada para', rs ? `${U.esc(nomeCliente(rs.cliente))} até ${dBR(rs.ate)} (${U.esc(rs.vendedor)})` : '')}${li('Vendida', i.vendido ? `${dBR(i.vendido.data)} para ${U.esc(nomeCliente(i.vendido.cliente))}` : '')}${li('Observação', U.esc(i.obs))}</ul>
      ${props.length ? `<h3 style="margin:14px 0 8px">Propostas desta máquina</h3><ul class="nc-lista">${props.map((p) => `<li class="clicavel" tabindex="0" data-prop="${p.id}"><div><b>${U.esc(nomeCliente(p.cliente))}</b><span>${brl(p.preco)} · ${U.esc(p.vendedor)}</span></div>${tagSitProp(N.situacaoProposta(p, h))}</li>`).join('')}</ul>` : ''}
      <div class="acoes" style="flex-wrap:wrap">${!i.vendido && !leitura() ? `<button class="btn btn-ouro" type="button" id="di-prop">Nova proposta</button>${!rs ? '<button class="btn btn-linha" type="button" id="di-res">Reservar</button>' : ''}` : ''}
        ${gestor() ? `<button class="btn btn-linha" type="button" id="di-ed">Editar</button>${ped ? '<button class="btn btn-linha" type="button" id="di-chegou">Registrar chegada</button>' : ''}` : ''}</div>`, (c) => {
      const b = (sel, fn) => { const e = U.$(sel, c); if (e) e.onclick = fn; };
      b('#di-prop', () => formProposta({ item: i.id })); b('#di-res', () => formReserva({ item: i.id })); b('#di-ed', () => formItem(i)); b('#di-chegou', () => formChegada(ped.id));
      U.$$('[data-prop]', c).forEach((x) => x.onclick = () => detalheProposta(x.dataset.prop));
    });
  }

  // ---------- PEDIDOS À FÁBRICA ----------
  function telaPedidos() {
    const h = hoje(), l = N.garantir(est()).pedidos.filter(daLoja).sort((a, b) => (a.status === 'aberto' ? 0 : 1) - (b.status === 'aberto' ? 0 : 1) || (a.previsao || '').localeCompare(b.previsao || ''));
    U.tela.innerHTML = cab('Pedidos à fábrica', 'O que foi encomendado, a previsão de chegada e o chassi quando a máquina chega.', gestor() ? `<button class="btn btn-ouro" type="button" data-nv-novo="pedido">${I.fabrica}<span>Pedido à fábrica</span></button>` : soLeitura()) + `
      <section class="painel">${l.length ? `<div class="tabela-wrap"><table class="tabela fin-tab nc-t"><thead><tr><th>Máquina</th><th>Fábrica · nº</th><th>Pedido em</th><th>Previsão</th><th class="n">Valor</th><th>Situação</th><th></th></tr></thead><tbody>
        ${l.map((p) => `<tr class="clicavel" tabindex="0" data-item="${p.item}"><td><b>${U.esc(nomeIt(p.item))}</b><span class="fin-sub">${U.esc([p.loja, p.cliente && 'para ' + nomeCliente(p.cliente)].filter(Boolean).join(' · '))}</span></td><td>${U.esc(p.fabrica)}${p.numero ? ' · ' + U.esc(p.numero) : ''}</td><td>${dBR(p.data)}</td>
          <td>${dBR(p.previsao)}${p.status === 'aberto' && p.previsao && p.previsao < h ? ' <span class="nc-tag risco">atrasado</span>' : ''}</td><td class="n">${brl(p.valor)}</td>
          <td>${p.status === 'aberto' ? '<span class="nc-tag ouro">Aberto</span>' : p.status === 'recebido' ? `<span class="nc-tag ok">Chegou</span><span class="fin-sub">${U.esc(p.recebido.chassi)} · ${dBR(p.recebido.data)}</span>` : '<span class="nc-tag neutro">Cancelado</span>'}</td>
          <td class="n">${gestor() && p.status === 'aberto' ? `<button class="btn btn-linha btn-p" type="button" data-chegou="${p.id}">Chegou</button> <button class="btn btn-linha btn-p" type="button" data-cancp="${p.id}">Cancelar</button>` : ''}</td></tr>`).join('')}</tbody></table></div>` : vazio('Nenhum pedido à fábrica.')}</section>`;
    U.$$('[data-chegou]', U.tela).forEach((b) => b.onclick = (e) => { e.stopPropagation(); formChegada(b.dataset.chegou); });
    U.$$('[data-cancp]', U.tela).forEach((b) => b.onclick = (e) => { e.stopPropagation(); U.abrirCamada('modal', `<h2>Cancelar pedido?</h2><div class="campo" style="margin-top:12px"><label for="cp-m">Motivo</label><input id="cp-m"></div><div class="acoes"><button class="btn btn-perigo" type="button" id="cp-ok">Cancelar pedido</button></div>`, (c) => {
      U.$('#cp-ok', c).onclick = () => { const p = tente(() => N.cancelarPedido(est(), b.dataset.cancp, U.$('#cp-m', c).value.trim(), nome(), agora())); if (!p) return; gravar(`Pedido à fábrica cancelado: ${nomeIt(p.item)}`); U.fecharCamada(true); U.rota(); };
    }); });
    ligar();
  }
  function formPedido() {
    if (!gestor()) { U.toast('Só o dono e o gerente fazem pedido à fábrica.', true); return; }
    const cs = U.K.cad.clientes();
    U.abrirCamada('modal larga-modal', `<h2>Pedido à fábrica</h2><p class="sub">A máquina entra no catálogo como "a caminho" e ganha chassi quando chegar.</p>
      <form class="campos" style="margin-top:12px" novalidate>${camposItem({})}
        <div class="campo"><label for="np-fab">Fábrica / fornecedor *</label><input id="np-fab" placeholder="Ex.: John Deere Brasil"></div>
        <div class="campo"><label for="np-num">Nº do pedido</label><input id="np-num"></div>
        <div class="campo"><label for="np-prev">Previsão de chegada</label><input id="np-prev" type="date" value="${N.somarDias(hoje(), 45)}"></div>
        <div class="campo"><label for="np-cli">Pedido para o cliente (opcional)</label><input id="np-cli" list="dl-np-cli" autocomplete="off"><datalist id="dl-np-cli">${cs.map((x) => `<option value="${U.esc(x.nome)}">`).join('')}</datalist></div></form>
      <div class="acoes"><button class="btn btn-ouro" type="button" id="np-ok">Fazer pedido</button></div>`, (c) => {
      U.$('#np-ok', c).onclick = () => {
        const d = lerItem(c); const e = N.validarItem(d); if (e.length) { U.toast(erroItem(e), true); return; }
        const cn = U.$('#np-cli', c).value.trim(), cli = cn ? U.K.cad.garantir('clientes', { nome: cn }) : null;
        const r = tente(() => N.criarPedido(est(), Object.assign(d, { fabrica: U.$('#np-fab', c).value, numero: U.$('#np-num', c).value.trim(), previsao: U.$('#np-prev', c).value, cliente: cli ? cli.id : '', valor: d.custo }), nome(), agora()));
        if (!r) return; gravar(`Pedido à fábrica: ${N.nomeItem(r.item)} (${r.pedido.fabrica}), previsão ${dBR(r.pedido.previsao)}`); U.toast('Pedido registrado.'); U.fecharCamada(true); U.rota();
      };
    });
  }
  function formChegada(pedidoId) {
    const p = N.garantir(est()).pedidos.find((x) => x.id === pedidoId); if (!p) return;
    U.abrirCamada('modal', `<h2>Máquina chegou</h2><p class="sub">${U.esc(nomeIt(p.item))} · ${U.esc(p.fabrica)}</p><div class="campos" style="margin-top:12px"><div class="campo"><label for="ch-ch">Chassi *</label><input id="ch-ch"></div><div class="campo"><label for="ch-d">Data</label><input id="ch-d" type="date" value="${hoje()}"></div></div>
      <div class="acoes"><button class="btn btn-ouro" type="button" id="ch-ok">Registrar chegada</button></div>`, (c) => {
      U.$('#ch-ok', c).onclick = () => { const r = tente(() => N.receberPedido(est(), p.id, { chassi: U.$('#ch-ch', c).value, data: U.$('#ch-d', c).value }, nome(), agora())); if (!r) return; gravar(`Máquina nova chegou: ${N.nomeItem(r.item)} (${r.item.chassi})`); U.toast('Chegada registrada: máquina em estoque.'); U.fecharCamada(true); U.rota(); };
    });
  }

  // ---------- RESERVAS ----------
  function telaReservas() {
    const h = hoje(), l = N.garantir(est()).reservas.filter((r) => ve(r) && daLoja(r)).sort((a, b) => (a.status === 'ativa' ? 0 : 1) - (b.status === 'ativa' ? 0 : 1) || a.ate.localeCompare(b.ate));
    U.tela.innerHTML = cab('Reservas', 'Máquina segurada para um cliente até a data combinada. Depois do prazo, volta a ficar disponível sozinha.', leitura() ? soLeitura() : `<button class="btn btn-ouro" type="button" id="rs-nova">${I.trava}<span>Nova reserva</span></button>`) + `
      <section class="painel">${l.length ? `<ul class="nc-lista">${l.map((r) => { const s = N.situacaoReserva(r, h); return `<li><div><b>${U.esc(nomeIt(r.item))}</b><span>${U.esc(nomeCliente(r.cliente))} · ${U.esc(r.vendedor || '')} · de ${dBR(r.de)} até ${dBR(r.ate)}${r.sinal ? ' · sinal ' + brl(r.sinal) : ''}</span></div>
        <span class="nc-tag ${s === 'ativa' ? (r.ate <= N.somarDias(h, 3) ? 'ouro' : 'ok') : s === 'vencida' ? 'risco' : 'neutro'}">${s === 'ativa' ? faltam(r.ate) : s === 'vencida' ? 'Vencida' : s === 'convertida' ? 'Virou venda' : 'Cancelada'}</span>
        ${r.status === 'ativa' && podeMexer(r) ? `<span class="fin-acoes"><button class="btn btn-linha btn-p" type="button" data-prorr="${r.id}">Prorrogar</button><button class="btn btn-linha btn-p" type="button" data-canr="${r.id}">Cancelar</button></span>` : ''}</li>`; }).join('')}</ul>` : vazio('Nenhuma reserva.')}</section>`;
    const nv = U.$('#rs-nova'); if (nv) nv.onclick = () => formReserva();
    U.$$('[data-prorr]', U.tela).forEach((b) => b.onclick = () => U.abrirCamada('modal', `<h2>Prorrogar reserva</h2><div class="campo" style="margin-top:12px"><label for="pr-d">Nova data</label><input id="pr-d" type="date" value="${N.somarDias(hoje(), 7)}"></div><div class="acoes"><button class="btn btn-ouro" type="button" id="pr-ok">Prorrogar</button></div>`, (c) => {
      U.$('#pr-ok', c).onclick = () => { const r = tente(() => N.prorrogarReserva(est(), b.dataset.prorr, U.$('#pr-d', c).value)); if (!r) return; gravar(`Reserva prorrogada até ${dBR(r.ate)}: ${nomeIt(r.item)}`); U.fecharCamada(true); U.rota(); };
    }));
    U.$$('[data-canr]', U.tela).forEach((b) => b.onclick = () => U.confirmar('Cancelar a reserva?', 'A máquina volta a ficar disponível.', 'Cancelar reserva', () => { const r = tente(() => N.cancelarReserva(est(), b.dataset.canr, 'Cancelada', nome(), agora())); if (!r) return; gravar(`Reserva cancelada: ${nomeIt(r.item)}`); U.rota(); }));
  }
  const campoCliente = (id, valor = '') => `<div class="campo"><label for="${id}">Cliente *</label><input id="${id}" list="dl-${id}" value="${U.esc(valor)}" autocomplete="off" placeholder="Digite: acha no cadastro ou cria"><datalist id="dl-${id}">${U.K.cad.clientes().map((x) => `<option value="${U.esc(x.nome)}">`).join('')}</datalist></div>`;
  const itensLivres = (cliente) => N.garantir(est()).catalogo.filter((i) => !i.inativo && !i.vendido && daLoja(i)).filter((i) => { const r = N.reservaAtiva(est(), i.id, hoje()); return !r || !cliente || r.cliente === cliente; });
  const optItem = (i) => [i.id, `${N.nomeItem(i)} · ${i.chassi || 'a caminho'} · ${brl(i.tabela)}`];
  function formReserva(pre = {}) {
    if (leitura()) return;
    const its = itensLivres(pre.cliente).filter((i) => !N.reservaAtiva(est(), i.id, hoje()));
    if (!its.length) { U.toast('Nenhuma máquina livre para reservar.', true); return; }
    U.abrirCamada('modal', `<h2>Reservar máquina</h2><form class="campos" style="margin-top:12px" novalidate>
      <div class="campo inteiro"><label for="rv-it">Máquina</label><select id="rv-it">${opt(its.map(optItem), pre.item)}</select></div>${campoCliente('rv-cli', pre.cliente ? nomeCliente(pre.cliente) : '')}
      <div class="campo"><label for="rv-ate">Reservada até</label><input id="rv-ate" type="date" value="${N.somarDias(hoje(), 7)}"></div><div class="campo"><label for="rv-sinal">Sinal (R$, opcional)</label><input id="rv-sinal" inputmode="decimal"></div></form>
      <div class="acoes"><button class="btn btn-ouro" type="button" id="rv-ok">Reservar</button></div>`, (c) => {
      U.$('#rv-ok', c).onclick = () => {
        const cn = U.$('#rv-cli', c).value.trim(); if (!cn) { U.toast('Informe o cliente.', true); return; }
        const cli = U.K.cad.garantir('clientes', { nome: cn });
        const r = tente(() => N.reservar(est(), { item: U.$('#rv-it', c).value, cliente: cli.id, vendedor: nome(), ate: U.$('#rv-ate', c).value, sinal: U.num(U.$('#rv-sinal', c).value), proposta: pre.proposta || '' }, nome(), agora(), hoje()));
        if (!r) return; gravar(`Reserva: ${nomeIt(r.item)} para ${cli.nome} até ${dBR(r.ate)}`); U.toast('Máquina reservada.'); U.fecharCamada(true); U.rota();
      };
    });
  }

  // ---------- PROPOSTAS ----------
  const fProp = { sit: 'abertas', q: '' };
  function telaPropostas() {
    const h = hoje(), base = N.garantir(est()).propostas.filter((p) => ve(p) && daLoja(p));
    const lista = base.filter((p) => { const s = N.situacaoProposta(p, h); if (fProp.sit === 'abertas' && !['aberta', 'negociacao', 'aguardando', 'aprovada'].includes(s)) return false; if (!['abertas', 'todas'].includes(fProp.sit) && s !== fProp.sit) return false;
      return !fProp.q || [nomeCliente(p.cliente), nomeIt(p.item), p.vendedor].join(' ').toLowerCase().includes(fProp.q.toLowerCase()); }).sort((a, b) => (a.validade || '').localeCompare(b.validade || ''));
    U.tela.innerHTML = cab('Propostas', 'Preço, troca do usado (ligada à avaliação), condição de pagamento e alçada. Desconto abaixo do mínimo segue a mesma alçada dos usados.', botoes()) + `
      <section class="painel"><div class="fin-filtros"><div class="abas-modo" role="group" aria-label="Situação">${[['abertas', 'Em aberto'], ['aguardando', 'Aguardando aprovação'], ['vencida', 'Vencidas'], ['ganha', 'Faturadas'], ['perdida', 'Perdidas'], ['todas', 'Todas']].map(([v, n]) => `<button type="button" data-fp="${v}" aria-pressed="${fProp.sit === v}">${n}</button>`).join('')}</div>
        <div class="campos fin-campos"><div class="campo"><label for="pp-q">Buscar</label><input id="pp-q" value="${U.esc(fProp.q)}" placeholder="Cliente, máquina, vendedor"></div></div></div>
        ${lista.length ? `<div class="tabela-wrap"><table class="tabela fin-tab nc-t"><thead><tr><th>Cliente</th><th>Máquina</th><th class="n">Preço</th><th>Troca</th><th>Condição</th><th>Validade</th><th>Situação</th></tr></thead><tbody>
          ${lista.map((p) => { const s = N.situacaoProposta(p, h); return `<tr class="clicavel" tabindex="0" data-prop="${p.id}"><td><b>${U.esc(nomeCliente(p.cliente))}</b><span class="fin-sub">${U.esc(p.vendedor)}</span></td><td>${U.esc(nomeIt(p.item))}</td>
            <td class="n">${brl(p.preco)}<span class="fin-sub">${p.calc.desconto > 0 ? '−' + U.pct(p.calc.descontoPct) + ' da tabela' : 'tabela'}</span></td><td>${p.troca ? brl(p.troca.valor) : '—'}</td><td>${U.esc(N.CONDICOES[p.condicao.forma])}</td>
            <td>${dBR(p.validade)}${N.emAberto(p) ? `<span class="fin-sub">${faltam(p.validade)}</span>` : ''}</td><td>${tagSitProp(s)}</td></tr>`; }).join('')}</tbody></table></div>` : vazio('Nenhuma proposta com estes filtros.')}</section>`;
    U.$$('[data-fp]', U.tela).forEach((b) => b.onclick = () => { fProp.sit = b.dataset.fp; telaPropostas(); });
    U.$('#pp-q').oninput = (e) => { fProp.q = e.target.value; clearTimeout(telaPropostas.t); telaPropostas.t = setTimeout(() => { telaPropostas(); const q = U.$('#pp-q'); q.focus(); q.setSelectionRange(q.value.length, q.value.length); }, 250); };
    ligar();
  }
  // avaliações do Anshur ainda em negociação: viram a troca da proposta
  const avaliacoesAbertas = () => (est().avaliacoes || []).filter((a) => (a.status || 'aberta') === 'aberta' && a.maq).slice().reverse();
  const nomeAv = (a) => `${a.maq.marca} ${a.maq.modelo} ${a.maq.ano} · ${dBR(a.data)} · máximo ${brl(a.teto)}${a.por ? ' · ' + a.por : ''}`;
  function camposCondicao(cond = {}) {
    const c = Object.assign({ forma: 'avista', entrada: '', parcelas: 12, taxaMes: '', banco: '' }, cond);
    return `<div class="campo"><label for="pc-forma">Condição</label><select id="pc-forma">${opt(Object.entries(N.CONDICOES), c.forma)}</select></div>
      <div class="campo" data-cond><label for="pc-ent">Entrada (R$)</label><input id="pc-ent" inputmode="decimal" value="${c.entrada || ''}"></div>
      <div class="campo" data-cond><label for="pc-n">Parcelas</label><input id="pc-n" inputmode="numeric" value="${c.parcelas || ''}"></div>
      <div class="campo" data-cond="parcelado"><label for="pc-tx">Juros ao mês (%)</label><input id="pc-tx" inputmode="decimal" value="${c.taxaMes ? String(+(c.taxaMes * 100).toFixed(3)).replace('.', ',') : ''}"></div>
      <div class="campo" data-cond><label for="pc-banco">Banco / administradora</label><input id="pc-banco" list="dl-banco" value="${U.esc(c.banco || '')}" placeholder="Ex.: Banco do Brasil (FINAME)"></div>`;
  }
  const lerCondicao = (c) => ({ forma: U.$('#pc-forma', c).value, entrada: U.num(U.$('#pc-ent', c).value), parcelas: U.num(U.$('#pc-n', c).value) || 1, taxaMes: U.num(U.$('#pc-tx', c).value) / 100, banco: U.$('#pc-banco', c).value.trim() });
  const mostrarCondicao = (c) => { const f = U.$('#pc-forma', c).value; U.$$('[data-cond]', c).forEach((x) => { x.hidden = f === 'avista' || (x.dataset.cond === 'parcelado' && f !== 'parcelado'); }); };
  function caixaCalc(k, ver = perfil() !== 'vendedor') {
    return `<div class="nc-calc" aria-live="polite"><div><span>Desconto sobre a tabela</span><b>${brl(k.desconto)} (${U.pct(k.descontoPct)})</b></div>
      <div><span>Abaixo do mínimo</span><b class="${k.abaixoMinimo ? 'neg' : ''}">${brl(k.abaixoMinimo)}</b></div>${k.valorTroca ? `<div><span>Troca acima do máximo</span><b class="${k.excessoTroca ? 'neg' : ''}">${brl(k.excessoTroca)}</b></div>` : ''}
      <div><span>Alçada</span><b>${k.nivel === 'livre' ? 'Dentro da alçada' : k.nivel === 'gerente' ? 'Precisa do gerente' : 'Só o dono libera'}</b></div>
      <div><span>Saldo a pagar</span><b>${brl(k.saldo)}</b></div>${k.forma !== 'avista' && k.financiado ? `<div><span>${k.forma === 'parcelado' ? 'Parcelas' : 'Financiado'}</span><b>${k.forma === 'parcelado' ? `${k.parcelas}× ${brl(k.parcela)}` : brl(k.financiado)}</b></div>` : ''}
      ${ver ? `<div><span>Margem</span><b class="${k.margemPct < 0.05 ? 'neg' : ''}">${brl(k.margem)} (${U.pct(k.margemPct)})</b></div>` : ''}<div><span>Comissão</span><b>${brl(k.comissao)}${k.comissaoDesconto ? ` <small class="sub">(−${brl(k.comissaoDesconto)})</small>` : ''}</b></div></div>`;
  }
  // pre: { item, cliente, lead }
  function formProposta(pre = {}) {
    if (leitura()) { U.toast('Seu perfil só lê.', true); return; }
    const its = itensLivres(pre.cliente); if (!its.length) { U.toast('Nenhuma máquina disponível no catálogo.', true); return; }
    const C2 = CRM(), leads = C2 ? C2.garantir(est()).leads.filter((l) => C2.ABERTAS.includes(l.etapa) && ve(l)) : [];
    const ld = pre.lead && C2 ? C2.lead(est(), pre.lead) : null, cliIni = pre.cliente || (ld && ld.cliente) || '';
    const itIni = N.item(est(), pre.item) || its[0], avs = avaliacoesAbertas(), vend = perfil() === 'vendedor' ? [nome()] : vendedores();
    U.abrirCamada('modal larga-modal', `<h2>Nova proposta</h2><p class="sub">Preço abaixo do mínimo ou troca acima do máximo da avaliação seguem a alçada (Configurações › Alçadas).</p>
      <form class="campos" style="margin-top:12px" novalidate>
        <div class="campo inteiro"><label for="pp-it">Máquina</label><select id="pp-it">${opt(its.map(optItem), itIni.id)}</select></div>
        ${campoCliente('pp-cli', cliIni ? nomeCliente(cliIni) : '')}
        <div class="campo"><label for="pp-tel">Telefone</label><input id="pp-tel" inputmode="tel" value="${U.esc((U.K.cad.cliente(cliIni) || {}).telefone || '')}"></div>
        <div class="campo"><label for="pp-doc">CPF / CNPJ</label><input id="pp-doc" value="${U.esc((U.K.cad.cliente(cliIni) || {}).documento || '')}"></div>
        <div class="campo"><label for="pp-lead">Oportunidade (CRM)</label><select id="pp-lead">${opt([['', 'Nenhuma / criar']].concat(leads.map((l) => [l.id, `${nomeCliente(l.cliente)} · ${C2.NOME_ETAPA[l.etapa]}`])), pre.lead || '')}</select></div>
        <div class="campo"><label for="pp-vend">Vendedor</label><select id="pp-vend" ${perfil() === 'vendedor' ? 'disabled' : ''}>${opt(vend.map((v) => [v, v]), ld ? ld.vendedor : nome())}</select></div>
        <div class="campo"><label for="pp-preco">Preço (R$) *</label><input id="pp-preco" inputmode="decimal" value="${itIni.tabela}"><span class="fin-sub" id="pp-ref"></span></div>
        <div class="campo"><label for="pp-val">Válida até</label><input id="pp-val" type="date" value="${N.somarDias(hoje(), 10)}"></div>
        <div class="campo"><label for="pp-av">Usado na troca (avaliação)</label><select id="pp-av">${opt([['', 'Sem troca']].concat(avs.map((a) => [a.id, nomeAv(a)])), '')}</select></div>
        <div class="campo" id="pp-trc"><label for="pp-trv">Valor da troca (R$)</label><input id="pp-trv" inputmode="decimal"></div>
        ${camposCondicao({})}
        <div class="campo inteiro"><label for="pp-obs">Observação</label><input id="pp-obs" placeholder="Ex.: entrega em 30 dias, frete incluso"></div>
      </form><div id="pp-calc"></div>
      <div class="acoes"><button class="btn btn-ouro" type="button" id="pp-ok">Criar proposta</button><button class="btn btn-linha" type="button" id="pp-nao">Cancelar</button></div>`, (c) => {
      const $ = (s) => U.$(s, c);
      const troca = () => { const a = avs.find((x) => x.id === $('#pp-av').value); return a ? { avaliacao: a.id, valor: U.num($('#pp-trv').value), teto: a.teto, tipo: a.maq.tipo, descricao: `${a.maq.marca} ${a.maq.modelo} ${a.maq.ano}` } : null; };
      const atual = () => { const i = N.item(est(), $('#pp-it').value); return N.calcular({ item: i, preco: U.num($('#pp-preco').value), troca: troca(), condicao: lerCondicao(c), cfg: U.K.cfg, alcadas: alc() }); };
      const redesenhar = () => { const i = N.item(est(), $('#pp-it').value); $('#pp-ref').textContent = `Tabela ${brl(i.tabela)} · mínimo ${brl(i.minimo)}`; $('#pp-trc').hidden = !$('#pp-av').value; mostrarCondicao(c); $('#pp-calc').innerHTML = caixaCalc(atual()); };
      $('#pp-it').onchange = () => { $('#pp-preco').value = N.item(est(), $('#pp-it').value).tabela; redesenhar(); };
      $('#pp-av').onchange = () => { const a = avs.find((x) => x.id === $('#pp-av').value); $('#pp-trv').value = a ? a.teto : ''; redesenhar(); };
      $('#pp-cli').onchange = () => { const k = U.K.cad.achar(U.K.cad.clientes(), { nome: $('#pp-cli').value }); if (k) { if (!$('#pp-tel').value) $('#pp-tel').value = k.telefone || ''; if (!$('#pp-doc').value) $('#pp-doc').value = k.documento || ''; } };
      ['#pp-preco', '#pp-trv', '#pc-ent', '#pc-n', '#pc-tx', '#pc-forma'].forEach((s) => { $(s).oninput = redesenhar; $(s).onchange = redesenhar; });
      redesenhar();
      $('#pp-nao').onclick = () => U.fecharCamada();
      $('#pp-ok').onclick = () => {
        const cn = $('#pp-cli').value.trim(); if (!cn) { U.toast('Informe o cliente.', true); return; }
        const cli = U.K.cad.garantir('clientes', { nome: cn, telefone: $('#pp-tel').value.trim(), documento: $('#pp-doc').value.trim() });
        let leadId = $('#pp-lead').value;
        const i = N.item(est(), $('#pp-it').value);
        if (!leadId && C2) { const r = tente(() => C2.criarLead(est(), { cliente: cli.id, origem: 'visita', interesse: { tipo: i.tipo, condicao: 'nova', marca: i.marca, modelo: i.modelo }, valor: U.num($('#pp-preco').value), vendedor: $('#pp-vend').value, loja: i.loja }, { quem: nome(), agora: agora() })); if (r) leadId = r.lead.id; }
        const p = tente(() => N.criarProposta(est(), { item: i.id, cliente: cli.id, lead: leadId, vendedor: $('#pp-vend').value, preco: U.num($('#pp-preco').value), troca: troca(), condicao: lerCondicao(c), validade: $('#pp-val').value, obs: $('#pp-obs').value.trim() }, ctxN()));
        if (!p) return;
        if (C2 && leadId) { C2.avancar(est(), leadId, 'proposta', { quem: nome(), agora: agora() }); C2.editarLead(est(), leadId, { proposta: p.id, valor: p.preco }); }
        gravar(`Proposta: ${N.nomeItem(i)} para ${cli.nome} por ${brl(p.preco)}${p.troca ? ` com troca de ${brl(p.troca.valor)}` : ''}${p.status === 'aguardando' ? ` (aguarda ${p.aprovacao.nivel === 'dono' ? 'o dono' : 'o gerente'})` : ''}`);
        U.toast(p.status === 'aguardando' ? `Proposta criada. Fora da sua alçada: ${p.aprovacao.nivel === 'dono' ? 'o dono' : 'o gerente'} precisa aprovar.` : 'Proposta criada.'); U.fecharCamada(true); U.rota(); setTimeout(() => detalheProposta(p.id), 260);
      };
    });
  }
  function textoProposta(p) {
    const i = N.item(est(), p.item), k = p.calc, cli = U.K.cad.cliente(p.cliente) || {};
    return `Olá, ${String(cli.nome || '').split(' ')[0]}! Segue a proposta da ${U.A.revenda.nome}:\n• ${N.nomeItem(i)}${i.chassi ? ' (chassi ' + i.chassi + ')' : ' (pedido de fábrica)'}\n• Preço: ${brl(p.preco)}${p.troca ? `\n• Seu usado na troca: ${brl(p.troca.valor)} (${p.troca.descricao})` : ''}\n• Condição: ${N.CONDICOES[p.condicao.forma]}${k.forma !== 'avista' ? ` · entrada ${brl(k.entrada)} + ${k.forma === 'parcelado' ? `${k.parcelas}× ${brl(k.parcela)}` : brl(k.financiado) + ' ' + (p.condicao.banco || '')}` : ` · ${brl(k.saldo)}`}\n• Válida até ${dBR(p.validade)}\n${p.vendedor}`;
  }
  function detalheProposta(id) {
    const p = N.proposta(est(), id); if (!p || !ve(p)) return;
    const h = hoje(), s = N.situacaoProposta(p, h), k = p.calc, cli = U.K.cad.cliente(p.cliente) || {}, mex = podeMexer(p) && N.emAberto(p) || (podeMexer(p) && p.status === 'recusada');
    const li = (r, v) => (v ? `<li><span>${r}</span><b>${v}</b></li>` : '');
    const decide = p.status === 'aguardando' && !leitura() && N.podeLiberar(perfil(), p.aprovacao.nivel), fat = N.podeFaturar(perfil()) && !leitura() && N.liberada(p) && s !== 'vencida';
    const i = N.item(est(), p.item);
    U.abrirCamada('gaveta', `<h2>${U.esc(cli.nome || 'Cliente')}</h2><p class="sub" style="margin:4px 0 12px">${tagSitProp(s)} ${U.esc(nomeIt(p.item))}</p>
      <p class="fin-valor">${brl(p.preco)}</p>${caixaCalc(k)}
      <ul class="lista-motivos">${li('Tabela / mínimo', `${brl(k.tabela)} / ${brl(k.minimo)}`)}${li('Usado na troca', p.troca ? `${U.esc(p.troca.descricao)} · ${brl(p.troca.valor)} (máximo da avaliação ${brl(p.troca.teto)})` : '')}
        ${li('Condição', `${U.esc(N.CONDICOES[p.condicao.forma])}${p.condicao.banco ? ' · ' + U.esc(p.condicao.banco) : ''}`)}${li('Validade', `${dBR(p.validade)}${N.emAberto(p) ? ' · ' + faltam(p.validade) : ''}`)}${li('Vendedor', U.esc(p.vendedor))}
        ${li('Chassi', i && i.chassi ? U.esc(i.chassi) : 'a caminho da fábrica')}${li('Aprovação', p.aprovacao ? `${p.aprovacao.status === 'pendente' ? 'Esperando ' + (p.aprovacao.nivel === 'dono' ? 'o dono' : 'o gerente') : p.aprovacao.status === 'propria' ? 'Liberada por ' + U.esc(p.aprovacao.por) + ' (própria alçada)' : (p.aprovacao.status === 'aprovada' ? 'Aprovada' : 'Recusada') + ' por ' + U.esc(p.aprovacao.por)}` : '')}
        ${li('Perdida', p.perda ? U.esc(p.perda.motivo) : '')}${li('Venda', p.venda ? `<a class="link" href="#nv-vendas" data-vv="${p.venda}">${p.venda}</a>` : '')}${li('Observação', U.esc(p.obs))}</ul>
      <h3 style="margin:14px 0 6px">Negociação</h3><ul class="nc-tl">${p.historico.slice().reverse().map((x) => `<li><span>${dBR(x.quando)}</span><b>${U.esc(x.texto)}</b><span>${brl(x.preco)} · ${U.esc(x.por)}</span></li>`).join('')}</ul>
      <div class="acoes" style="flex-wrap:wrap">
        ${decide ? '<button class="btn btn-ouro" type="button" id="dp-apr">Aprovar</button><button class="btn btn-perigo" type="button" id="dp-rec">Recusar</button>' : ''}
        ${fat ? `<button class="btn btn-ouro" type="button" id="dp-fat">${I.moeda}Faturar venda</button>` : ''}
        ${mex ? '<button class="btn btn-linha" type="button" id="dp-neg">Negociar</button>' : ''}
        ${mex && !N.reservaAtiva(est(), p.item, h) ? '<button class="btn btn-linha" type="button" id="dp-res">Reservar a máquina</button>' : ''}
        ${cli.telefone ? `<a class="btn btn-linha" target="_blank" rel="noopener" href="${U.esc(CRM() ? CRM().linkWhats(cli.telefone, textoProposta(p)) : '#')}">${I.zap}Enviar no WhatsApp</a>` : ''}
        ${mex ? '<button class="btn btn-perigo" type="button" id="dp-perd">Marcar perdida</button>' : ''}</div>`, (c) => {
      const b = (sel, fn) => { const e = U.$(sel, c); if (e) e.onclick = fn; };
      b('#dp-apr', () => { const r = tente(() => N.decidir(est(), p.id, true, ctxN())); if (!r) return; U.log('aprovacao', `Proposta de nova aprovada na alçada: ${nomeIt(p.item)} para ${cli.nome} por ${brl(p.preco)}`); gravar(`Proposta aprovada: ${nomeIt(p.item)} · ${cli.nome}`); U.toast('Proposta aprovada.'); U.rota(); setTimeout(() => detalheProposta(p.id), 260); });
      b('#dp-rec', () => U.abrirCamada('modal', `<h2>Recusar na alçada</h2><div class="campo" style="margin-top:12px"><label for="rc-m">Motivo</label><input id="rc-m" placeholder="Ex.: desconto alto demais"></div><div class="acoes"><button class="btn btn-perigo" type="button" id="rc-ok">Recusar</button></div>`, (m) => {
        U.$('#rc-ok', m).onclick = () => { const r = tente(() => N.decidir(est(), p.id, false, Object.assign(ctxN(), { motivo: U.$('#rc-m', m).value.trim() }))); if (!r) return; U.log('aprovacao', `Proposta de nova recusada na alçada: ${nomeIt(p.item)} para ${cli.nome}`); gravar(`Proposta recusada: ${nomeIt(p.item)} · ${cli.nome}`); U.fecharCamada(true); U.rota(); };
      }));
      b('#dp-neg', () => formNegociar(p));
      b('#dp-res', () => formReserva({ item: p.item, cliente: p.cliente, proposta: p.id }));
      b('#dp-fat', () => formFaturar(p));
      b('#dp-perd', () => U.abrirCamada('modal', `<h2>Proposta perdida</h2><div class="campo" style="margin-top:12px"><label for="pd-m">Motivo *</label><select id="pd-m">${opt(N.MOTIVOS_PERDA.map((x) => [x, x]), '')}</select></div><div class="acoes"><button class="btn btn-perigo" type="button" id="pd-ok">Marcar perdida</button></div>`, (m) => {
        U.$('#pd-ok', m).onclick = () => { const mo = U.$('#pd-m', m).value, r = tente(() => N.perder(est(), p.id, mo, ctxN())); if (!r) return; if (p.lead && CRM()) tente(() => CRM().mover(est(), p.lead, 'perdido', { motivo: mo, quem: nome(), agora: agora() })); gravar(`Proposta perdida (${mo}): ${nomeIt(p.item)} · ${cli.nome}`); U.fecharCamada(true); U.rota(); };
      }));
      const vv = U.$('[data-vv]', c); if (vv) vv.onclick = (e) => { e.preventDefault(); detalheVenda(p.venda); };
    });
  }
  function formNegociar(p) {
    const avs = avaliacoesAbertas().concat((est().avaliacoes || []).filter((a) => p.troca && a.id === p.troca.avaliacao && (a.status || 'aberta') !== 'aberta'));
    U.abrirCamada('modal larga-modal', `<h2>Negociar</h2><p class="sub">${U.esc(nomeCliente(p.cliente))} · ${U.esc(nomeIt(p.item))}</p><form class="campos" style="margin-top:12px" novalidate>
      <div class="campo"><label for="ng-preco">Preço (R$)</label><input id="ng-preco" inputmode="decimal" value="${p.preco}"></div><div class="campo"><label for="ng-val">Válida até</label><input id="ng-val" type="date" value="${p.validade < hoje() ? N.somarDias(hoje(), 7) : p.validade}"></div>
      <div class="campo"><label for="ng-av">Usado na troca</label><select id="ng-av">${opt([['', 'Sem troca']].concat(avs.map((a) => [a.id, nomeAv(a)])), p.troca ? p.troca.avaliacao : '')}</select></div>
      <div class="campo"><label for="ng-trv">Valor da troca (R$)</label><input id="ng-trv" inputmode="decimal" value="${p.troca ? p.troca.valor : ''}"></div>
      ${camposCondicao(p.condicao)}<div class="campo inteiro"><label for="ng-txt">O que mudou</label><input id="ng-txt" placeholder="Ex.: cliente pediu 2% a mais de desconto"></div></form><div id="ng-calc"></div>
      <div class="acoes"><button class="btn btn-ouro" type="button" id="ng-ok">Salvar rodada</button></div>`, (c) => {
      const $ = (s) => U.$(s, c);
      const troca = () => { const a = avs.find((x) => x.id === $('#ng-av').value); return a ? { avaliacao: a.id, valor: U.num($('#ng-trv').value), teto: a.teto, tipo: a.maq.tipo, descricao: `${a.maq.marca} ${a.maq.modelo} ${a.maq.ano}` } : null; };
      const red = () => { mostrarCondicao(c); $('#ng-calc').innerHTML = caixaCalc(N.calcular({ item: N.item(est(), p.item), preco: U.num($('#ng-preco').value), troca: troca(), condicao: lerCondicao(c), cfg: U.K.cfg, alcadas: alc() })); };
      ['#ng-preco', '#ng-trv', '#pc-ent', '#pc-n', '#pc-tx', '#pc-forma', '#ng-av'].forEach((s) => { $(s).oninput = red; $(s).onchange = red; }); red();
      $('#ng-ok').onclick = () => {
        const r = tente(() => N.negociar(est(), p.id, { preco: U.num($('#ng-preco').value), troca: troca(), condicao: lerCondicao(c), validade: $('#ng-val').value, texto: $('#ng-txt').value.trim() || undefined }, ctxN()));
        if (!r) return; if (r.lead && CRM()) { CRM().avancar(est(), r.lead, 'negociacao', { quem: nome(), agora: agora() }); CRM().editarLead(est(), r.lead, { valor: r.preco }); }
        gravar(`Negociação: ${nomeIt(r.item)} · ${nomeCliente(r.cliente)} por ${brl(r.preco)}${r.status === 'aguardando' ? ' (aguarda aprovação)' : ''}`); U.toast(r.status === 'aguardando' ? 'Rodada salva. Fora da sua alçada: aguarda aprovação.' : 'Rodada salva.'); U.fecharCamada(true); U.rota(); setTimeout(() => detalheProposta(r.id), 260);
      };
    });
  }
  const contaPadrao = (lj) => { const f = F(); if (!f) return ''; const cs = f.garantir(est()).contas.filter((x) => !x.inativa); return (cs.find((x) => x.loja === lj && x.tipo === 'banco') || cs.find((x) => x.tipo === 'banco') || cs[0] || {}).id || ''; };
  function formFaturar(p) {
    const f = F(); if (!f) { U.toast('Financeiro indisponível.', true); return; }
    const cs = f.garantir(est()).contas.filter((x) => !x.inativa), k = p.calc;
    U.abrirCamada('modal', `<h2>Faturar venda</h2><p class="sub">${U.esc(nomeCliente(p.cliente))} · ${U.esc(nomeIt(p.item))} · ${brl(p.preco)}</p>
      <ul class="lista-motivos" style="margin-top:10px"><li><span>Contas a receber</span><b>${k.valorTroca ? brl(k.valorTroca) + ' do usado (compensação) + ' : ''}${k.forma === 'avista' ? brl(k.saldo) + ' à vista' : `${k.entrada ? brl(k.entrada) + ' de entrada + ' : ''}${k.forma === 'parcelado' ? `${k.parcelas}× ${brl(k.parcela)}` : brl(k.financiado) + ' do ' + (k.forma === 'consorcio' ? 'consórcio' : 'banco') + ' em 30 dias'}`}</b></li>
        <li><span>Comissão de ${U.esc(p.vendedor)}</span><b>${brl(k.comissao)} (dia 10 do mês seguinte)</b></li>${p.troca && p.troca.avaliacao ? '<li><span>Usado da troca</span><b>entra no pátio como troca fechada</b></li>' : ''}</ul>
      <div class="campos" style="margin-top:12px"><div class="campo"><label for="ft-d">Data da venda</label><input id="ft-d" type="date" value="${hoje()}"></div>
        ${k.valorTroca && cs.length ? `<div class="campo"><label for="ft-c">Conta da compensação do usado</label><select id="ft-c">${opt(cs.map((x) => [x.id, x.nome]), contaPadrao(p.loja))}</select></div>` : ''}</div>
      <div class="acoes"><button class="btn btn-ouro" type="button" id="ft-ok">Faturar</button><button class="btn btn-linha" type="button" id="ft-nao">Cancelar</button></div>`, (c) => {
      U.$('#ft-nao', c).onclick = () => U.fecharCamada();
      U.$('#ft-ok', c).onclick = () => {
        const data = U.$('#ft-d', c).value, contaSel = U.$('#ft-c', c) ? U.$('#ft-c', c).value : '';
        const chk = tente(() => N.conferirFaturar(est(), p.id, data)); if (!chk) return;
        const i = chk.i;
        // 1) o usado da troca entra no pátio pelo mesmo caminho das trocas (retrato da avaliação, alçada já decidida na proposta)
        let trocaId = '';
        const av = p.troca && p.troca.avaliacao ? (est().avaliacoes || []).find((a) => a.id === p.troca.avaliacao) : null;
        if (av && av.status !== 'troca') {
          const rec = { teto: av.teto, venda: av.venda, preparo: av.preparo || 0, dias: av.dias || null, margem: av.premissas ? av.premissas.margemAlvo : U.K.cfg.margemAlvo, margemSobreVenda: av.venda ? (av.venda - p.troca.valor - (av.preparo || 0)) / av.venda : null, confianca: av.confianca, qualidade: av.mape != null ? { mape: av.mape } : null, doTipo: av.amostras };
          const t = U.K.fecharTroca(est(), av.maq, rec, p.troca.valor, data, { retrato: av.retrato, vendedor: p.vendedor, origem: `Troca na venda de ${N.nomeItem(i)} · ${nomeCliente(p.cliente)}`, negociacao: 'nova:' + p.id,
            aprovacao: p.calc.excessoTroca > 0 ? { por: p.aprovacao ? p.aprovacao.por : nome(), motivo: 'Troca na venda de máquina nova', excesso: p.calc.excessoTroca, data } : null, loja: p.loja || i.loja || '' });
          U.A.trocas.push(Object.assign({}, t)); av.status = 'troca'; trocaId = t.id;
          U.log('troca', `Troca fechada na venda de nova: ${t.marca} ${t.modelo} por ${brl(t.pago)} (máximo recomendado ${brl(av.teto)})`, { ref: t.id });
        }
        // 2) floor plan: a máquina vendida sai do estoque financiado (juros param de correr na venda)
        const fp = (est().extras && est().extras.financiadas || []).find((x) => x.chassi === i.chassi);
        if (fp && !fp.venda) fp.venda = data;
        const maq = (U.A.financiadas || []).some((x) => x.chassi === i.chassi) ? 'F:' + i.chassi : '';
        const r = tente(() => N.faturar(est(), p.id, { F: f, data, quem: nome(), agora: agora(), cfg: U.K.cfg, conta: contaSel, maquina: maq, trocaId }));
        if (!r) return;
        U.log('venda', `Venda de máquina nova faturada: ${N.nomeItem(i)} (${i.chassi}) para ${nomeCliente(p.cliente)} por ${brl(p.preco)}`, { ref: r.venda.id });
        U.log('financeiro', `Venda ${r.venda.id}: ${r.lancamentos.length} lançamentos (a receber e comissão de ${p.vendedor})`);
        U.K.aplicarFinanceiro(U.A.todasTrocas || U.A.trocas, est());
        gravar(`Venda faturada: ${N.nomeItem(i)} · ${nomeCliente(p.cliente)} · ${brl(p.preco)}`); U.toast('Venda faturada: contas a receber e comissão lançadas no Financeiro.'); U.fecharCamada(true);
        location.hash = '#nv-vendas'; setTimeout(() => detalheVenda(r.venda.id), 320);
      };
    });
  }

  // ---------- VENDAS E ENTREGA TÉCNICA ----------
  function telaVendas() {
    const l = N.garantir(est()).vendas.filter((v) => ve(v) && daLoja(v)).sort((a, b) => b.data.localeCompare(a.data));
    const tot = l.reduce((s, v) => s + v.preco, 0), aRec = l.reduce((s, v) => s + N.situacaoVenda(est(), v).aberto, 0);
    U.tela.innerHTML = cab('Vendas de novas', 'Venda faturada vira conta a receber e comissão no Financeiro. "Recebida" quando todas as parcelas foram pagas.', soLeitura()) + `
      <div class="kpis fin-k fin-kpis3"><div class="kpi k-marfim"><span class="rot">${I.moeda}Vendido</span><span class="val">${brl(tot)}</span><span class="exp">${l.length} ${l.length === 1 ? 'venda' : 'vendas'}</span></div>
        <div class="kpi ${aRec ? 'k-risco' : 'k-salvia'}"><span class="rot">${I.relogio}A receber das vendas</span><span class="val">${brl(aRec)}</span></div>
        <div class="kpi"><span class="rot">${I.entrega}Entregas técnicas pendentes</span><span class="val">${l.filter((v) => !(v.entrega && v.entrega.completa)).length}</span></div></div>
      <section class="painel">${l.length ? `<div class="tabela-wrap"><table class="tabela fin-tab nc-t"><thead><tr><th>Data</th><th>Cliente</th><th>Máquina</th><th class="n">Preço</th><th class="n">Comissão</th><th>Recebimento</th><th>Entrega técnica</th></tr></thead><tbody>
        ${l.map((v) => { const s = N.situacaoVenda(est(), v); return `<tr class="clicavel" tabindex="0" data-venda="${v.id}"><td>${dBR(v.data)}</td><td><b>${U.esc(nomeCliente(v.cliente))}</b><span class="fin-sub">${U.esc(v.vendedor)}</span></td><td>${U.esc(nomeIt(v.item))}<span class="fin-sub">${U.esc(v.chassi)}</span></td>
          <td class="n">${brl(v.preco)}</td><td class="n">${brl(v.comissao)}</td><td><span class="nc-tag ${s.situacao === 'recebida' ? 'ok' : 'ouro'}">${s.situacao === 'recebida' ? 'Recebida' : 'Faturada'}</span>${s.aberto ? `<span class="fin-sub">${brl(s.aberto)} em aberto</span>` : ''}</td>
          <td>${v.entrega ? `<span class="nc-tag ${v.entrega.completa ? 'ok' : 'ouro'}">${v.entrega.completa ? 'Feita' : 'Incompleta'}</span><span class="fin-sub">${dBR(v.entrega.data)}</span>` : '<span class="nc-tag risco">Pendente</span>'}</td></tr>`; }).join('')}</tbody></table></div>` : vazio('Nenhuma venda de máquina nova.')}</section>`;
    ligar();
  }
  function detalheVenda(id) {
    const v = N.venda(est(), id); if (!v || !ve(v)) return;
    const s = N.situacaoVenda(est(), v), f = F(), verFin = f && f.podeVer(perfil()), cli = U.K.cad.cliente(v.cliente) || {};
    const lancs = f ? f.garantir(est()).lancamentos.filter((l) => l.venda === v.id && !l.cancelado) : [];
    const li = (r, x) => (x ? `<li><span>${r}</span><b>${x}</b></li>` : '');
    U.abrirCamada('gaveta', `<h2>${U.esc(nomeIt(v.item))}</h2><p class="sub" style="margin:4px 0 12px"><span class="nc-tag ${s.situacao === 'recebida' ? 'ok' : 'ouro'}">${s.situacao === 'recebida' ? 'Recebida' : 'Faturada'}</span> ${U.esc(v.chassi)} · ${dBR(v.data)}</p>
      <p class="fin-valor">${brl(v.preco)}</p>
      <ul class="lista-motivos">${li('Cliente', U.esc(cli.nome))}${li('Vendedor', U.esc(v.vendedor))}${li('Condição', U.esc(N.CONDICOES[v.condicao.forma]) + (v.condicao.banco ? ' · ' + U.esc(v.condicao.banco) : ''))}${li('Usado na troca', v.troca ? `${U.esc(v.troca.descricao)} · ${brl(v.troca.valor)}${v.trocaId ? ' · no pátio como ' + U.esc(v.trocaId) : ''}` : '')}
        ${li('Comissão', brl(v.comissao))}${perfil() !== 'vendedor' ? li('Margem', brl(v.margem)) : ''}${li('Recebido / em aberto', `${brl(s.recebido)} / ${brl(s.aberto)}`)}
        ${li('Entrega técnica', v.entrega ? `${dBR(v.entrega.data)} · ${U.esc(v.entrega.tecnico)}${v.entrega.completa ? '' : ' (checklist incompleto)'}` : 'pendente')}</ul>
      ${lancs.length ? `<h3 style="margin:14px 0 6px">No Financeiro</h3><ul class="nc-lista">${lancs.map((l) => `<li ${verFin ? `class="clicavel" tabindex="0" data-lanc="${l.id}"` : ''}><div><b>${U.esc(l.descricao)}</b><span>${l.tipo === 'pagar' ? 'A pagar' : 'A receber'} · vence ${dBR(l.vencimento)}${l.parcela ? ` · parcela ${l.parcela.n}/${l.parcela.de}` : ''}</span></div><span class="nc-tag ${l.pago ? 'ok' : l.vencimento < hoje() ? 'risco' : 'ouro'}">${l.pago ? (l.tipo === 'pagar' ? 'Pago' : 'Recebido') : 'Em aberto'} · ${brl(l.pago ? l.pago.valor : l.valor)}</span></li>`).join('')}</ul>` : ''}
      <div class="acoes" style="flex-wrap:wrap">${podeMexer(v) ? `<button class="btn btn-ouro" type="button" id="dv-ent">${I.entrega}${v.entrega ? 'Atualizar entrega técnica' : 'Registrar entrega técnica'}</button>` : ''}
        ${verFin && s.aberto ? '<a class="btn btn-linha" href="#fin-receber">Abrir contas a receber</a>' : ''}</div>`, (c) => {
      const e = U.$('#dv-ent', c); if (e) e.onclick = () => formEntrega(v);
      U.$$('[data-lanc]', c).forEach((x) => x.onclick = () => { if (raiz.FINANCEIRO_UI) { location.hash = '#fin-receber'; setTimeout(() => raiz.FINANCEIRO_UI.detalhe(x.dataset.lanc), 320); } });
    });
  }
  function formEntrega(v) {
    const e = v.entrega || {};
    U.abrirCamada('modal', `<h2>Entrega técnica</h2><p class="sub">${U.esc(nomeIt(v.item))} · ${U.esc(nomeCliente(v.cliente))}</p>
      <div class="campos" style="margin-top:12px"><div class="campo"><label for="et-d">Data</label><input id="et-d" type="date" value="${e.data || hoje()}"></div><div class="campo"><label for="et-t">Técnico *</label><input id="et-t" list="dl-et-t" value="${U.esc(e.tecnico || '')}"><datalist id="dl-et-t">${U.K.cad.usuarios().filter((u) => u.perfil === 'oficina').map((u) => `<option value="${U.esc(u.nome)}">`).join('')}</datalist></div>
        <div class="campo"><label for="et-h">Horímetro na entrega</label><input id="et-h" inputmode="numeric" value="${e.horimetro || ''}"></div></div>
      <div class="nc-check">${N.CHECKLIST_ENTREGA.map(([k, n]) => `<label class="check"><input type="checkbox" data-ck="${k}" ${e.checklist && e.checklist[k] ? 'checked' : ''}> ${U.esc(n)}</label>`).join('')}</div>
      <div class="campo"><label for="et-o">Observação</label><input id="et-o" value="${U.esc(e.obs || '')}"></div>
      <div class="acoes"><button class="btn btn-ouro" type="button" id="et-ok">Salvar entrega</button></div>`, (c) => {
      U.$('#et-ok', c).onclick = () => {
        const ck = {}; U.$$('[data-ck]', c).forEach((x) => { ck[x.dataset.ck] = x.checked; });
        const r = tente(() => N.registrarEntrega(est(), v.id, { data: U.$('#et-d', c).value, tecnico: U.$('#et-t', c).value, horimetro: U.num(U.$('#et-h', c).value), checklist: ck, obs: U.$('#et-o', c).value.trim() }, nome(), agora()));
        if (!r) return; gravar(`Entrega técnica ${r.completa ? 'feita' : 'registrada (checklist incompleto)'}: ${nomeIt(v.item)} · ${nomeCliente(v.cliente)}`); U.toast(r.completa ? 'Entrega técnica registrada.' : 'Entrega salva com itens pendentes no checklist.'); U.fecharCamada(true); U.rota();
      };
    });
  }

  // ---------- busca global ----------
  function buscar(q, ui) {
    if (!q || q.length < 2 || !N.podeVer(ui.eu().perfil)) return [];
    U = ui; const s = q.toLowerCase(), out = [], n = N.garantir(ui.estado);
    n.catalogo.filter((i) => !i.inativo && [i.marca, i.modelo, i.versao, i.chassi].join(' ').toLowerCase().includes(s)).slice(0, 4)
      .forEach((i) => out.push({ g: 'Máquinas Novas', n: N.nomeItem(i), d: `${N.SIT_ITEM[N.situacaoItem(ui.estado, i, ui.hojeISO())]} · ${i.chassi || 'a caminho'} · ${brl(i.tabela)}`, ir: () => { location.hash = '#nv-catalogo'; setTimeout(() => detalheItem(i.id), 320); } }));
    n.propostas.filter((p) => ve(p) && [nomeCliente(p.cliente), nomeIt(p.item)].join(' ').toLowerCase().includes(s)).slice(0, 4)
      .forEach((p) => out.push({ g: 'Máquinas Novas', n: `Proposta · ${nomeCliente(p.cliente)}`, d: `${nomeIt(p.item)} · ${brl(p.preco)} · ${N.SIT_PROP[N.situacaoProposta(p, ui.hojeISO())]}`, ir: () => { location.hash = '#nv-propostas'; setTimeout(() => detalheProposta(p.id), 320); } }));
    return out;
  }

  // ---------- demonstração: dados fictícios coerentes (clientes e vendedores da demo) ----------
  // Roda depois do Financeiro (que cria as contas e os clientes); semeia Novas e CRM juntos para a história ficar ligada.
  function semear(ui) {
    const e = ui.estado; if (ui.OP || (e.novas && e.novas.semente)) return;
    const f = raiz.FINANCEIRO, C2 = raiz.CRM; if (!f || !C2 || !(e.fin && e.fin.semente)) return;
    U = ui; N.garantir(e); C2.garantir(e);
    const h = ui.hojeISO(), d = (n) => N.somarDias(h, -n), ag = (n) => new Date(Date.now() - n * 864e5).toISOString(), lojas = e.lojas.length ? e.lojas : [''];
    const Q = (n) => ({ perfil: 'gerente', quem: n, agora: ag(0), hoje: h, alcadas: N.alcadas(e), cfg: ui.K.cfg });
    const cli = (nomeC) => ui.K.garantirCadastro(e, 'clientes', { nome: nomeC });
    const ano = +h.slice(0, 4);
    // catálogo: as novas do floor plan que ainda não foram vendidas (mesmo chassi) + pedidos à fábrica
    const fps = (ui.A.financiadas || []).filter((x) => !x.venda).slice(0, 7);
    const versoes = { trator: 'cabine, piloto automático', colhedora: 'esteira, AutoTrac', pulverizador: 'barra 30 m, piloto', plantadeira: 'pneumática' };
    const its = fps.map((fp, k) => N.criarItem(e, { id: 'NV-D' + (k + 1), tipo: fp.tipo, marca: fp.marca, modelo: fp.modelo, versao: versoes[fp.tipo] || '', anoModelo: ano, custo: fp.valor, tabela: Math.round(fp.valor * 1.16 / 1000) * 1000, minimo: Math.round(fp.valor * 1.08 / 1000) * 1000, chassi: fp.chassi, loja: lojas[k % lojas.length], chegada: fp.entrada }, 'Carlos', ag(30)));
    // estoque comprado à vista (fora do floor plan), com chassi fictício
    [['trator', 'Valtra', 'A134', 455000, 'VLT'], ['trator', 'Case IH', 'Farmall 130A', 498000, 'CSE'], ['pulverizador', 'Stara', 'Imperador 3.0', 1320000, 'STR'], ['trator', 'Massey Ferguson', 'MF 4709', 412000, 'MFG']].forEach(([tipo, marca, modelo, custo, pre], k) => {
      its.push(N.criarItem(e, { id: 'NV-DE' + (k + 1), tipo, marca, modelo, versao: versoes[tipo], anoModelo: ano, custo, tabela: Math.round(custo * 1.15 / 1000) * 1000, minimo: Math.round(custo * 1.07 / 1000) * 1000, chassi: `${pre}${ano % 100}-${String(31207 + k * 389)}`, loja: lojas[(k + 1) % lojas.length], chegada: d(20 + k * 11) }, 'Carlos', ag(20 + k * 11)));
    });
    const novosPed = [['plantadeira', 'Stara', 'Absoluta 34', 560000, 'Stara S.A.', 25, 'Orlândia'], ['trator', 'John Deere', '6125J', 640000, 'John Deere Brasil', 12, lojas[1] || lojas[0]], ['plantadeira', 'Jumil', 'JM3090 Exacta', 365000, 'Jumil', -6, lojas[0]]];
    const peds = novosPed.map(([tipo, marca, modelo, custo, fab, prev, lj], k) => N.criarPedido(e, { id: 'PF-D' + (k + 1), tipo, marca, modelo, versao: versoes[tipo], anoModelo: ano + (k === 1 ? 1 : 0), custo, tabela: Math.round(custo * 1.17 / 1000) * 1000, minimo: Math.round(custo * 1.09 / 1000) * 1000, loja: lj, fabrica: fab, numero: 'PED-' + (5310 + k * 17), previsao: N.somarDias(h, prev), data: d(40 - k * 9) }, 'Carlos', ag(40 - k * 9)));
    // um pedido que já chegou (com chassi)
    const pc = N.criarPedido(e, { id: 'PF-D9', tipo: 'pulverizador', marca: 'Jacto', modelo: 'Uniport 3030', versao: versoes.pulverizador, anoModelo: ano, custo: 1490000, tabela: 1720000, minimo: 1610000, loja: lojas[0], fabrica: 'Jacto', numero: 'PED-5288', previsao: d(4), data: d(70) }, 'Carlos', ag(70));
    N.receberPedido(e, pc.pedido.id, { chassi: 'JCT30-' + (77140 + ano % 100), data: d(3) }, 'Carlos', ag(3)); its.push(pc.item);
    // perfis de produtor rural (complementam o cadastro comum) e máquinas que já têm, ligadas por chassi
    const usadosVend = (ui.A.todasTrocas || ui.A.trocas).filter((t) => t.vendido);
    const fazendas = [['José Carlos', '123.456.789-01', 'Faz. Santa Helena', 'Orlândia', 820, ['Cana', 'Soja']], ['Antônio Ribeiro', '', 'Faz. Boa Vista', 'Morro Agudo', 1450, ['Cana']], ['Paulo Mendes', '', 'Faz. São Bento', 'Guaíra', 2300, ['Soja', 'Milho']],
      ['Luiz Fernando', '', 'Sítio Três Irmãos', 'Nuporanga', 180, ['Café', 'Milho']], ['Ricardo Alves', '', 'Faz. Água Limpa', 'Ituverava', 960, ['Soja', 'Milho', 'Sorgo']], ['Márcio Tavares', '', 'Faz. Santa Rita', 'Jaboticabal', 640, ['Cana', 'Amendoim']],
      ['Sérgio Lopes', '', 'Faz. Bela Aliança', 'Bebedouro', 410, ['Laranja']], ['Fábio Rezende', '', 'Faz. Recreio', 'Pontal', 1210, ['Cana', 'Soja']]];
    const C = fazendas.map(([n, , faz, cid, area, cul], k) => {
      const c = cli(n); const maqs = [];
      const u = usadosVend[k * 5 % Math.max(1, usadosVend.length)]; if (u) maqs.push({ chassi: 'USD-' + u.id, maquina: u.id, descricao: `${u.marca} ${u.modelo}`, tipo: u.tipo, marca: u.marca, ano: u.ano });
      const fv = (ui.A.financiadas || []).filter((x) => x.venda)[k]; if (fv && k % 2 === 0) maqs.push({ chassi: fv.chassi, maquina: 'F:' + fv.chassi, descricao: `${fv.marca} ${fv.modelo}`, tipo: fv.tipo, marca: fv.marca, ano: ano - 1 });
      if (k === 1) maqs.push({ chassi: 'CH9H' + (40021 + k), descricao: 'Case IH A8800 (comprada fora)', tipo: 'colhedora', marca: 'Case IH', ano: ano - 11 });
      if (k === 2) maqs.push({ chassi: 'PLT' + (12090 + k), descricao: 'Plantadeira 26 linhas (comprada fora)', tipo: 'plantadeira', marca: 'Semeato', ano: ano - 10 });
      C2.salvarPerfil(e, c.id, { ie: k % 3 === 0 ? `${480 + k}.${120 + k * 7}.${300 + k}.11${k}` : '', fazendas: [{ nome: faz, cidade: cid, area, culturas: cul }].concat(k === 2 ? [{ nome: 'Arrendamento Palmital', cidade: 'Miguelópolis', area: 650, culturas: ['Soja'] }] : []), maquinas: maqs }, 'Rodrigo', ag(60 - k));
      return c;
    });
    // leads em todas as etapas (vendedores da demo), com atividades e tarefas (algumas atrasadas, outras hoje)
    const VD = ['Rodrigo', 'Marcos', 'Tiago', 'Fernanda'];
    const L = (k, nomeC, origem, tipo, cond, modelo, valor, etapa, dias, extra = {}) => {
      const r = C2.criarLead(e, Object.assign({ id: 'LD-D' + k, nome: nomeC, origem, interesse: { tipo, condicao: cond, modelo }, valor, vendedor: VD[k % 4], loja: lojas[k % lojas.length] }, extra), { garantirCliente: (x) => ui.K.garantirCadastro(e, 'clientes', x), quem: VD[k % 4], agora: ag(dias) });
      const ordem = ['contato', 'visita', 'proposta', 'negociacao'], passos = etapa === 'perdido' ? 1 : ordem.indexOf(etapa) + 1;
      for (let j = 0; j < passos; j++) C2.mover(e, r.lead.id, ordem[j], { quem: VD[k % 4], agora: ag(Math.max(0, dias - 1 - j)) });
      if (etapa === 'perdido') C2.mover(e, r.lead.id, 'perdido', { motivo: extra.motivo || 'Preço', quem: VD[k % 4], agora: ag(Math.max(1, dias - 6)) });
      return r.lead;
    };
    const lds = [
      L(1, 'José Carlos', 'indicacao', 'pulverizador', 'nova', 'Uniport 3030', 1700000, 'negociacao', 21), L(2, 'Antônio Ribeiro', 'feira', 'colhedora', 'nova', 'CH570', 3300000, 'proposta', 16),
      L(3, 'Paulo Mendes', 'whatsapp', 'plantadeira', 'nova', 'Absoluta 34', 650000, 'visita', 9), L(4, 'Luiz Fernando', 'site', 'trator', 'usada', 'MF 4709', 380000, 'contato', 6),
      L(5, 'Ricardo Alves', 'visita', 'trator', 'nova', 'T7.245', 1150000, 'proposta', 12), L(6, 'Márcio Tavares', 'whatsapp', 'trator', 'nova', 'A134', 560000, 'novo', 1),
      L(7, 'Sérgio Lopes', 'feira', 'pulverizador', 'usada', '', 900000, 'novo', 2), L(8, 'Fábio Rezende', 'indicacao', 'trator', 'nova', '6125J', 740000, 'perdido', 35, { motivo: 'Comprou da concorrência' }),
      L(9, 'Cláudio Prado', 'site', 'plantadeira', 'nova', 'JM3090 Exacta', 420000, 'perdido', 40, { motivo: 'Crédito não aprovado' }), L(10, 'Renato Guimarães', 'whatsapp', 'trator', 'nova', 'Farmall 130A', 600000, 'contato', 8),
      L(11, 'Eduardo Faria', 'visita', 'colhedora', 'nova', 'Austoft 8810', 3400000, 'negociacao', 26), L(12, 'Gilberto Souza', 'feira', 'trator', 'nova', 'A134', 560000, 'proposta', 30)
    ];
    // lead de usado ligado ao comprador que já existe (casamento automático do pátio)
    const comp = (ui.A.compradores || []).find((x) => /Luiz Fernando/.test(x.nome)); if (comp) C2.editarLead(e, lds[3].id, { comprador: comp.id, agora: ag(6) });
    const A_ = (k, lead, tipo, texto, dataA, feita, resp) => C2.registrarAtividade(e, { id: 'AT-D' + k, lead: lead.id, tipo, texto, data: dataA, hora: ['08:30', '10:00', '14:00', '16:30'][k % 4], responsavel: resp || lead.vendedor, feita, resultado: feita ? 'Feito' : '' }, lead.vendedor, ag(feita ? 2 : 1));
    [[1, lds[0], 'visita', 'Demonstração do Uniport na fazenda', d(5), true], [2, lds[0], 'ligacao', 'Retornar sobre a taxa do FINAME', h, false], [3, lds[1], 'whatsapp', 'Mandar fotos da CH570 e prazo de entrega', d(2), false],
      [4, lds[2], 'visita', 'Visita para medir a área de plantio', N.somarDias(h, 1), false], [5, lds[3], 'ligacao', 'Oferecer o MF 4709 que entrou no pátio', h, false], [6, lds[4], 'reuniao', 'Reunião com o filho que toca a fazenda', N.somarDias(h, 3), false],
      [7, lds[5], 'whatsapp', 'Primeiro contato: veio pelo anúncio', h, false], [8, lds[9], 'ligacao', 'Saber se recebeu o catálogo', d(4), false], [9, lds[10], 'visita', 'Visita à usina com o gerente', d(10), true], [10, lds[10], 'tarefa', 'Montar proposta com troca da colhedora velha', d(1), false],
      [11, lds[11], 'ligacao', 'Proposta enviada: confirmar recebimento', d(12), true]].forEach((x) => A_(...x));
    // propostas: uma em negociação, uma esperando aprovação (abaixo do mínimo), uma vencendo, uma vencida; reservas
    const it = (re) => its.find((i) => re.test(i.marca + ' ' + i.modelo)) || its[0];
    const avs = (e.avaliacoes || []).filter((a) => (a.status || 'aberta') === 'aberta' && a.maq);
    const P = (lead, item, preco, val, extra = {}, quem = lead.vendedor, perfilP = 'vendedor') => {
      const p = N.criarProposta(e, Object.assign({ item: item.id, cliente: lead.cliente, lead: lead.id, vendedor: lead.vendedor, preco, validade: val, loja: item.loja }, extra), Object.assign(Q(quem), { perfil: perfilP, agora: ag(N.diasEntre(val, h) + 12) }));
      C2.editarLead(e, lead.id, { proposta: p.id, valor: preco }); return p;
    };
    const iPulv = pc.item, p1 = P(lds[0], iPulv, 1680000, N.somarDias(h, 6), { condicao: { forma: 'financiamento', entrada: 340000, parcelas: 1, banco: 'Banco do Brasil (FINAME)' } });
    N.negociar(e, p1.id, { preco: 1655000, texto: 'Cliente pediu desconto à vista da entrada' }, Object.assign(Q('Rodrigo'), { perfil: 'vendedor', agora: ag(3) }));
    const iCol = it(/CH570|Austoft/), p2 = P(lds[1], iCol, Math.round(iCol.minimo * 0.97 / 1000) * 1000, N.somarDias(h, 2), avs[0] ? { troca: { avaliacao: avs[0].id, valor: avs[0].teto, teto: avs[0].teto, tipo: avs[0].maq.tipo, descricao: `${avs[0].maq.marca} ${avs[0].maq.modelo} ${avs[0].maq.ano}` } } : {});
    const iT = it(/T7|A134|6125|Farmall|MF/), p3 = P(lds[4], iT, iT.tabela, N.somarDias(h, 1), { condicao: { forma: 'parcelado', entrada: Math.round(iT.tabela * 0.3 / 1000) * 1000, parcelas: 10, taxaMes: 0.009 } });
    const p4 = P(lds[11], it(/A134|Farmall|MF|6125/), it(/A134|Farmall|MF|6125/).tabela, d(4));
    void p2; void p4;
    N.reservar(e, { id: 'RS-D1', item: iT.id, cliente: lds[4].cliente, vendedor: lds[4].vendedor, proposta: p3.id, ate: N.somarDias(h, 2) }, 'Ricardo', ag(5), d(5));
    const iRes = its.find((i) => i.id !== iT.id && i.id !== iPulv.id && i.id !== iCol.id); if (iRes) N.reservar(e, { id: 'RS-D2', item: iRes.id, cliente: cli('Wagner Lima').id, vendedor: 'Fernanda', ate: d(3), de: d(13) }, 'Fernanda', ag(13), d(13));
    // vendas já faturadas: uma recebida, uma com o banco a receber, uma recente com entrega técnica pendente
    const contaL = (lj) => contaPadrao(lj);
    const vendas = [];
    [['Valdir Moreira', 40, 'avista'], ['Adriano Melo', 18, 'financiamento'], ['Rogério Campos', 2, 'parcelado']].forEach(([nomeC, dias, forma], k) => {
      const item = its.filter((i) => !i.vendido && !N.reservaAtiva(e, i.id, h) && ![iPulv.id, iCol.id, iT.id, iRes && iRes.id].includes(i.id))[0]; if (!item) return;
      const c = cli(nomeC);
      const ld = C2.criarLead(e, { id: 'LD-DV' + k, cliente: c.id, origem: ['indicacao', 'feira', 'whatsapp'][k], interesse: { tipo: item.tipo, condicao: 'nova', modelo: item.modelo }, valor: item.tabela, vendedor: VD[(k + 1) % 4], loja: item.loja }, { quem: VD[(k + 1) % 4], agora: ag(dias + 20) }).lead;
      ['contato', 'visita', 'proposta', 'negociacao'].forEach((et, j) => C2.mover(e, ld.id, et, { quem: ld.vendedor, agora: ag(dias + 18 - j * 4) }));
      const cond = forma === 'financiamento' ? { forma, entrada: Math.round(item.tabela * 0.2 / 1000) * 1000, parcelas: 1, banco: 'Sicredi (FINAME)' } : forma === 'parcelado' ? { forma, entrada: Math.round(item.tabela * 0.4 / 1000) * 1000, parcelas: 6, taxaMes: 0.008 } : { forma };
      const p = N.criarProposta(e, { id: 'PP-DV' + k, item: item.id, cliente: c.id, lead: ld.id, vendedor: ld.vendedor, preco: Math.round(item.tabela * 0.97 / 1000) * 1000, condicao: cond, validade: N.somarDias(d(dias), 10), loja: item.loja }, Object.assign(Q('Carlos'), { agora: ag(dias + 4) }));
      C2.editarLead(e, ld.id, { proposta: p.id, valor: p.preco });
      const r = N.faturar(e, p.id, { F: f, data: d(dias), quem: 'Carlos', agora: ag(dias), cfg: ui.K.cfg, maquina: (ui.A.financiadas || []).some((x) => x.chassi === item.chassi) ? 'F:' + item.chassi : '' });
      vendas.push(r.venda);
      r.lancamentos.filter((l) => l.tipo === 'receber').forEach((l) => { if (l.vencimento <= d(1) && (k === 0 || /Entrada/.test(l.descricao))) f.baixar(e, l.id, { data: l.vencimento, forma: 'transferencia', conta: contaL(l.loja) }, 'Lúcia', ag(Math.max(0, N.diasEntre(l.vencimento, h)))); });
      if (k < 2) N.registrarEntrega(e, r.venda.id, { data: N.somarDias(d(dias), 3), tecnico: 'Zé da Oficina', horimetro: 2 + k, checklist: Object.fromEntries(N.CHECKLIST_ENTREGA.map(([x]) => [x, true])) }, 'Zé da Oficina', ag(dias - 3));
    });
    e.novas.semente = true; e.crm.semente = true;
    ui.K.aplicarFinanceiro(ui.A.todasTrocas || ui.A.trocas, e);
    ui.salvar();
  }

  const T = (fn) => (ui) => { U = ui; estilo(); N.garantir(ui.estado); if (raiz.CRM) raiz.CRM.garantir(ui.estado); fn(); };
  const ITEM = (aba, rotulo, curto, icone) => ({ aba, rotulo, curto, icone });
  const permissoes = {}; ['nv-painel', 'nv-catalogo', 'nv-pedidos', 'nv-reservas', 'nv-propostas', 'nv-vendas'].forEach((a) => { permissoes[a] = VER; });
  R.registrar({
    id: 'novas', pronta: true, inicio: 'nv-painel', atalhos: ['nv-painel', 'nv-propostas', 'nv-catalogo', 'nv-vendas'],
    acao: { rotulo: 'Nova proposta', href: '#nv-propostas', novo: true },
    menu: [
      { grupo: 'Comercial', itens: [ITEM('nv-painel', 'Painel de novas', 'Painel', '<path d="M4 13h6V4H4zM14 20h6V11h-6zM14 4v4h6V4zM4 20h6v-4H4z"/>'), ITEM('nv-propostas', 'Propostas', 'Propostas', '<path d="M6 3h9l4 4v14H6zM14 3v5h5M9 13h7M9 17h5"/>'), ITEM('nv-reservas', 'Reservas', 'Reservas', '<path d="M6 11h12v10H6zM8 11V7a4 4 0 0 1 8 0v4"/>'), ITEM('nv-vendas', 'Vendas e entregas', 'Vendas', '<path d="M3 7h11v9H3zM14 10h4l3 3v3h-7M7 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM17 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"/>')] },
      { grupo: 'Estoque', itens: [ITEM('nv-catalogo', 'Catálogo', 'Catálogo', ICONE), ITEM('nv-pedidos', 'Pedidos à fábrica', 'Pedidos', '<path d="M3 21V10l6 3V10l6 3V6l6 3v12zM7 17h2M12 17h2M17 17h2"/>'), ITEM('financiamento', 'Estoque financiado', 'Floor plan', '<path d="M3 10l9-6 9 6M5 10v9M19 10v9M3 21h18"/>')] },
      { grupo: 'Clientes', itens: [ITEM('crm-clientes', 'Clientes', 'Clientes', '<path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21v-1a8 8 0 0 1 16 0v1"/>'), ITEM('crm-funil', 'Funil de vendas', 'Funil', '<path d="M3 4h18l-7 8v6l-4 2v-8z"/>')] }
    ],
    telas: { 'nv-painel': T(telaPainel), 'nv-catalogo': T(telaCatalogo), 'nv-pedidos': T(telaPedidos), 'nv-reservas': T(telaReservas), 'nv-propostas': T(telaPropostas), 'nv-vendas': T(telaVendas) },
    permissoes,
    numero: (ui) => { U = ui; const r = N.resumo(ui.estado, { hoje: ui.hojeISO(), perfil: ui.eu().perfil, nome: ui.eu().nome, loja: ui.estado.lojaAtual || '' }); return { valor: String(r.propostasAbertas), texto: `${r.propostasAbertas === 1 ? 'proposta aberta' : 'propostas abertas'} · ${r.propostasVencendo} vencendo em 3 dias · ${r.estoque} em estoque${r.aguardando ? ` · ${r.aguardando} esperando aprovação` : ''}`, alerta: r.propostasVencendo + r.aguardando + r.propostasVencidas > 0 }; },
    buscar,
    novo: (ui) => { U = ui; estilo(); if (leitura()) { ui.toast('Seu perfil só lê.', true); return; } ui.abrirCamada('modal', `<h2>Máquinas novas</h2><p class="sub">O que você vai registrar?</p><div class="acoes" style="flex-wrap:wrap"><button class="btn btn-ouro" type="button" data-nn="proposta">${I.doc}Proposta</button><button class="btn btn-linha" type="button" data-nn="reserva">${I.trava}Reserva</button>${gestor() ? `<button class="btn btn-linha" type="button" data-nn="item">${I.maq}Máquina no catálogo</button><button class="btn btn-linha" type="button" data-nn="pedido">${I.fabrica}Pedido à fábrica</button>` : ''}</div>`, (c) => { U.$$('[data-nn]', c).forEach((b) => b.onclick = () => ({ proposta: () => formProposta(), reserva: () => formReserva(), item: () => formItem(), pedido: () => formPedido() })[b.dataset.nn]()); }); },
    iniciar: semear
  });
  raiz.NOVAS_UI = { semear, formProposta: (pre) => formProposta(pre), detalheProposta: (id) => detalheProposta(id), detalheVenda: (id) => detalheVenda(id), estilo, usar: (ui) => { U = ui; } };
})(typeof window !== 'undefined' ? window : globalThis);
