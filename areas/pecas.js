// Área PEÇAS E ESTOQUE: telas. As regras (puras, testadas) estão em areas/pecas-regras.js (window.PECAS).
// Segue o padrão das áreas (README › Áreas): menu, telas, permissões, número da entrada, busca, dados (fila offline) e demonstração.
// Permissões: dono, gerente, oficina e financeiro lançam (compra, balcão, transferência); inventário com ajuste só dono e gerente;
// auditor só lê; vendedor não vê. Compra gera conta a pagar e venda de balcão gera conta a receber pelo FINANCEIRO.criar.
(function (raiz) {
  const P = raiz.PECAS, R = raiz.ANSHUR_AREAS;
  if (!R) return;
  // sem as regras (areas/pecas-regras.js não carregou): fica honesta como "Em breve", sem tela
  if (!P) { R.registrar({ id: 'pecas', nome: 'Peças e Estoque', curto: 'Peças', ordem: 50, pronta: false, perfis: ['dono', 'gerente', 'oficina', 'financeiro', 'auditor'], descricao: 'Catálogo, SKU, localização, entradas, saídas, inventário e compras.', icone: '<path d="M21 8l-9-5-9 5v8l9 5 9-5zM3 8l9 5 9-5M12 13v8"/>', previsto: ['Catálogo de peças com SKU e localização', 'Entradas, saídas, transferências entre lojas e inventário', 'Fornecedores, compras e estoque mínimo', 'Custos e compras no Financeiro'], hoje: 'Hoje: compras de peças podem ser lançadas como contas a pagar no Financeiro.' }); return; }
  const VER = ['dono', 'gerente', 'oficina', 'financeiro', 'auditor'];
  let U = null;
  const F = () => raiz.FINANCEIRO || null;
  const est = () => U.estado;
  const brl = (v) => (+v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const dBR = (iso) => (iso ? String(iso).slice(0, 10).split('-').reverse().join('/') : '—');
  const q3 = (v) => (+v || 0).toLocaleString('pt-BR', { maximumFractionDigits: 3 });
  const esc = (s) => U.esc(s);
  const quem = () => U.eu().nome;
  const leitura = () => !!(U.NV && U.NV.somenteLeitura);
  const editor = () => P.podeEditar(U.eu().perfil) && !leitura();
  const ajustador = () => P.podeAjustar(U.eu().perfil) && !leitura();
  const lojas = () => U.K.lojasPermitidas || U.estado.lojas || [];
  const fl = () => ({ loja: U.estado.lojaAtual || '', lojas: U.K.lojasPermitidas });
  const lojaPadrao = () => U.estado.lojaAtual || lojas()[0] || '';
  const opt = (pares, sel) => pares.map(([v, n]) => `<option value="${esc(v)}" ${String(sel) === String(v) ? 'selected' : ''}>${esc(n)}</option>`).join('');
  const optLojas = (sel, vazio) => (lojas().length ? opt((vazio ? [['', vazio]] : []).concat(lojas().map((l) => [l, l])), sel) : '<option value="">Loja principal</option>');
  const nomeForn = (id) => { const c = id && U.K.cad.fornecedor(id); return c ? c.nome : ''; };
  const nomeCli = (id) => { const c = id && U.K.cad.cliente(id); return c ? c.nome : ''; };
  const ic = (d) => `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
  const I = {
    caixa: ic('<path d="M21 8l-9-5-9 5v8l9 5 9-5zM3 8l9 5 9-5M12 13v8"/>'), entra: ic('<path d="M12 19V5M6 11l6-6 6 6"/>'), sai: ic('<path d="M12 5v14M6 13l6 6 6-6"/>'),
    alerta: ic('<path d="M12 3 2 20h20L12 3zM12 10v4M12 17v.5"/>'), troca: ic('<path d="M4 7h13l-3-3M20 17H7l3 3"/>'), lista: ic('<path d="M9 6h11M9 12h11M9 18h11M4 6h.5M4 12h.5M4 18h.5"/>'),
    carrinho: ic('<path d="M3 4h2l2.4 11h11L21 7H7M9 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM18 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"/>'), doc: ic('<path d="M6 3h9l4 4v14H6zM14 3v5h5M9 13h7M9 17h5"/>'),
    barras: ic('<path d="M4 20h16M7 16v-5M11 16V7M15 16v-7M19 16V5"/>'), mais: ic('<path d="M12 5v14M5 12h14"/>'), zap: ic('<path d="M4 20l1.3-4A8 8 0 1 1 8 18.7z"/>')
  };
  const cab = (t, s, b = '') => `<div class="titulo"><div><h1>${t}</h1><p>${s}</p></div>${b ? `<div class="fin-acoes">${b}</div>` : ''}</div>`;
  const vazio = (t) => `<p class="vazio">${t}</p>`;
  // registro: Atividades (ui.log) + trilha do servidor (anshur_eventos), pelo mesmo caminho do Financeiro (N.evento)
  function gravar(texto) {
    U.log('pecas', texto);
    if (U.K.nuvem && U.K.nuvem.evento) U.K.nuvem.evento('pecas', texto); // 'pecas' ainda não está em CRITICOS (comum.js): envia direto
    U.salvar();
  }
  const tentar = (fn) => { try { return fn(); } catch (e) { U.toast(e.message, true); return null; } };
  estilo();

  // ---------- campo de peça (busca por SKU, código do fabricante ou descrição) ----------
  const rotPeca = (p) => `${p.sku} · ${p.descricao}${p.codFab ? ' · ' + p.codFab : ''}`;
  const dlPecas = () => `<datalist id="dl-pc">${P.ativas(est()).map((p) => `<option value="${esc(rotPeca(p))}">`).join('')}</datalist>`;
  const lerPeca = (v) => { const s = String(v || '').trim(); if (!s) return null; const sku = s.split(' · ')[0]; return P.ativas(est()).find((p) => rotPeca(p) === s || P.normal(p.sku) === P.normal(sku) || (p.codFab && P.normal(p.codFab) === P.normal(s))) || null; };

  // ---------- PAINEL ----------
  function telaPainel() {
    P.garantir(est());
    const r = P.resumo(est(), fl()), ab = P.abaixoMinimo(est(), fl()), pp = P.garantir(est());
    const movs = pp.movimentos.filter((m) => !fl().loja || m.loja === fl().loja || m.para === fl().loja).slice().sort((a, b) => String(b.quando).localeCompare(String(a.quando))).slice(0, 10);
    const abc = P.curvaABC(est(), { hoje: U.hojeISO(), loja: fl().loja });
    U.tela.innerHTML = cab('Peças e Estoque', `Saldo e custo médio recalculados de cada movimento${fl().loja ? ' · loja ' + esc(fl().loja) : ''}. Compra vira conta a pagar; venda de balcão, conta a receber.`, botoes()) + `
      <div class="kpis fin-k">
        <a class="kpi k-marfim" href="#pc-catalogo"><span class="rot">${I.caixa}Estoque a custo</span><span class="val">${brl(r.valor)}</span><span class="exp">${r.itens} ${r.itens === 1 ? 'peça com saldo' : 'peças com saldo'}</span></a>
        <a class="kpi ${r.abaixo ? 'k-risco' : 'k-salvia'}" href="#pc-compras"><span class="rot">${I.alerta}Abaixo do mínimo</span><span class="val">${r.abaixo}</span><span class="exp">${r.abaixo ? 'veja o pedido sugerido' : 'tudo acima do mínimo'}</span></a>
        <a class="kpi" href="#pc-compras"><span class="rot">${I.carrinho}Pedidos em aberto</span><span class="val">${r.pedidosAbertos}</span><span class="exp">esperando o fornecedor</span></a>
        <a class="kpi" href="#pc-abc"><span class="rot">${I.barras}Consumo em 12 meses</span><span class="val">${brl(abc.total)}</span><span class="exp">${abc.resumo.A.n} itens fazem a classe A</span></a>
      </div>
      <div class="grade-2">
        <section class="painel"><div class="painel-cab"><h2>${I.alerta}Abaixo do mínimo</h2><p><a class="link" href="#pc-compras">Pedido sugerido</a></p></div>
          ${ab.length ? `<ul class="fin-saldos">${ab.slice(0, 8).map((x) => `<li><span><b>${esc(x.peca.descricao)}</b><span>${esc(x.peca.sku)}${x.loja ? ' · ' + esc(x.loja) : ''} · mínimo ${q3(x.minimo)}</span></span><b class="${x.saldo <= 0 ? 'neg' : ''}">${q3(x.saldo)} ${esc(x.peca.unidade)}</b></li>`).join('')}</ul>` : vazio('Nenhuma peça abaixo do mínimo.')}</section>
        <section class="painel"><div class="painel-cab"><h2>${I.lista}Últimas movimentações</h2><p><a class="link" href="#pc-mov">Ver todas</a></p></div>${tabelaMov(movs, true)}</section>
      </div>`;
    ligarBotoes();
  }
  const botoes = () => (editor() ? `<button class="btn btn-ouro" type="button" data-pc="entrada">${I.entra}<span>Entrada (compra)</span></button><button class="btn btn-linha" type="button" data-pc="xml">${I.doc}<span>Importar XML</span></button><button class="btn btn-linha" type="button" data-pc="balcao">${I.sai}<span>Venda de balcão</span></button><button class="btn btn-linha" type="button" data-pc="transf">${I.troca}<span>Transferir</span></button>` : '<span class="tag declarado">Só leitura</span>');
  function ligarBotoes(raizEl = U.tela) {
    U.$$('[data-pc]', raizEl).forEach((b) => b.onclick = () => ({ entrada: () => formEntrada(), xml: importarXML, balcao: () => formBalcao(), transf: () => formTransf(), peca: () => formPeca() })[b.dataset.pc]());
    U.$$('[data-peca]', raizEl).forEach((b) => { b.onclick = () => detalhePeca(b.dataset.peca); b.onkeydown = (e) => { if (e.key === 'Enter') detalhePeca(b.dataset.peca); }; });
  }
  function tabelaMov(movs, curto) {
    if (!movs.length) return vazio('Nenhum movimento ainda.');
    const nome = { entrada: 'Entrada', saida: 'Saída', transf: 'Transferência', ajuste: 'Ajuste', devolucao: 'Devolução' };
    return `<div class="tabela-wrap"><table class="tabela fin-tab"><thead><tr><th class="oc-esconde">Data</th><th>Peça</th><th class="n">Qtd</th>${curto ? '' : '<th class="n oc-esconde">Custo un.</th><th class="oc-esconde">Por</th>'}</tr></thead><tbody>
      ${movs.map((m) => { const p = P.peca(est(), m.peca), sinal = m.tipo === 'saida' || (m.tipo === 'ajuste' && m.qtd < 0) ? '−' : m.tipo === 'transf' ? '' : '+';
        return `<tr data-peca="${esc(m.peca)}" class="clicavel" tabindex="0"><td class="oc-esconde">${dBR(m.data)}</td><td><b>${esc(p ? p.descricao : 'Peça removida')}</b><span class="fin-sub"><span class="ofc-so-cel">${dBR(m.data)} · </span>${nome[m.tipo]} · ${esc(P.ORIGENS[m.origem] || '')}${m.obs ? ' · ' + esc(m.obs) : ''}${m.tipo === 'transf' ? ` · ${esc(m.loja)} → ${esc(m.para)}` : m.loja ? ' · ' + esc(m.loja) : ''}</span></td>
          <td class="n ${sinal === '−' ? 'neg' : sinal === '+' ? 'pos' : ''}">${sinal}${q3(Math.abs(m.qtd))}</td>${curto ? '' : `<td class="n oc-esconde">${brl(m.custo)}</td><td class="oc-esconde">${esc(m.por || '')}</td>`}</tr>`; }).join('')}</tbody></table></div>`;
  }

  // ---------- CATÁLOGO ----------
  const fc = { q: '', modelo: '', so: '' };
  function telaCatalogo() {
    const lista = P.estoque(est(), fl()).filter((e) => (!fc.q || P.buscar(est(), fc.q).some((p) => p.id === e.peca.id)) && (!fc.modelo || P.compativel(e.peca, fc.modelo)));
    const ab = new Set(P.abaixoMinimo(est(), fl()).map((x) => x.peca.id));
    const l2 = lista.filter((e) => fc.so !== 'abaixo' || ab.has(e.peca.id)).filter((e) => fc.so !== 'saldo' || e.qtd > 0).sort((a, b) => a.peca.descricao.localeCompare(b.peca.descricao));
    U.tela.innerHTML = cab('Catálogo de peças', 'Código (SKU), código do fabricante, compatibilidade, localização no almoxarifado, custo médio e preço de venda.', editor() ? `<button class="btn btn-ouro" type="button" data-pc="peca">${I.mais}<span>Nova peça</span></button>` + botoes().replace(/btn-ouro/, 'btn-linha') : '<span class="tag declarado">Só leitura</span>') + `
      <section class="painel"><div class="fin-filtros">
        <div class="abas-modo" role="group" aria-label="Mostrar">${[['', 'Todas'], ['saldo', 'Com saldo'], ['abaixo', 'Abaixo do mínimo']].map(([v, n]) => `<button type="button" data-so="${v}" aria-pressed="${fc.so === v}">${n}</button>`).join('')}</div>
        <div class="campos fin-campos"><div class="campo"><label for="pc-q">Buscar</label><input id="pc-q" value="${esc(fc.q)}" placeholder="SKU, código do fabricante, descrição, local"></div>
          <div class="campo"><label for="pc-mod">Serve no modelo</label><input id="pc-mod" list="dl-modelo-pc" value="${esc(fc.modelo)}" placeholder="Ex.: 6125J"><datalist id="dl-modelo-pc">${[...new Set(U.A.modelos.map((m) => m.modelo))].map((m) => `<option value="${esc(m)}">`).join('')}</datalist></div></div></div>
        ${l2.length ? `<div class="tabela-wrap"><table class="tabela fin-tab"><thead><tr><th>Peça</th><th class="oc-esconde">Local</th><th class="n">Saldo</th><th class="n oc-esconde">Custo médio</th><th class="n">Preço</th></tr></thead><tbody>
          ${l2.map((e) => `<tr data-peca="${esc(e.peca.id)}" class="clicavel" tabindex="0"><td><b>${esc(e.peca.descricao)}</b><span class="fin-sub">${esc(e.peca.sku)}${e.peca.codFab ? ' · ' + esc(e.peca.codFab) : ''}${e.peca.marca ? ' · ' + esc(e.peca.marca) : ''}${(e.peca.compat || []).length ? ' · serve em ' + esc(e.peca.compat.slice(0, 3).join(', ')) : ''}</span></td>
            <td class="oc-esconde">${esc(e.peca.local || '—')}</td><td class="n ${e.qtd < 0 ? 'neg' : ''}">${q3(e.qtd)} ${esc(e.peca.unidade)}${ab.has(e.peca.id) ? ' <span class="sit sit-vencido">mínimo</span>' : ''}</td><td class="n oc-esconde">${brl(e.custoMedio)}</td><td class="n">${brl(e.peca.preco)}</td></tr>`).join('')}</tbody></table></div>`
        : vazio(P.ativas(est()).length ? 'Nenhuma peça com estes filtros.' : 'Nenhuma peça cadastrada. Comece por "Nova peça" ou importe o XML de uma nota de compra.')}
        <div class="fin-rodape"><span>${l2.length} peças · ${brl(l2.reduce((s, e) => s + Math.max(0, e.valor), 0))} a custo</span><button class="btn btn-linha" type="button" id="pc-csv">Exportar planilha</button></div></section>`;
    U.$$('[data-so]', U.tela).forEach((b) => b.onclick = () => { fc.so = b.dataset.so; telaCatalogo(); });
    const at = (id, k) => { const el = U.$(id); el.oninput = () => { fc[k] = el.value; clearTimeout(at.t); at.t = setTimeout(() => { telaCatalogo(); const i = U.$(id); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }, 300); }; };
    at('#pc-q', 'q'); at('#pc-mod', 'modelo');
    U.$('#pc-csv').onclick = () => U.baixarCSV(`anshur-pecas-${U.hojeISO()}.csv`, [['SKU', 'Código do fabricante', 'Descrição', 'Marca', 'Compatível com', 'Local', 'Unidade', 'Saldo', 'Custo médio', 'Valor a custo', 'Preço de venda']]
      .concat(l2.map((e) => [e.peca.sku, e.peca.codFab, e.peca.descricao, e.peca.marca, (e.peca.compat || []).join(', '), e.peca.local, e.peca.unidade, String(e.qtd).replace('.', ','), String(e.custoMedio).replace('.', ','), String(e.valor).replace('.', ','), String(e.peca.preco).replace('.', ',')])));
    ligarBotoes();
  }
  function detalhePeca(id) {
    const p = P.peca(est(), id); if (!p) return;
    const pos = P.posicao(est(), id), movs = P.garantir(est()).movimentos.filter((m) => m.peca === id).slice().sort((a, b) => String(b.data).localeCompare(String(a.data)) || String(b.quando).localeCompare(String(a.quando)));
    U.abrirCamada('gaveta', `<span class="tag comprovado">${esc(p.sku)}</span><h2 style="font-size:22px;margin-top:10px">${esc(p.descricao)}</h2><p class="sub">${[p.codFab && 'Fabricante: ' + p.codFab, p.marca, p.local && 'Local ' + p.local, P.UNIDADES[p.unidade]].filter(Boolean).map(esc).join(' · ')}</p>
      <div class="det"><div><span>Saldo total</span><b>${q3(pos.qtd)} ${esc(p.unidade)}</b></div><div><span>Custo médio</span><b>${brl(pos.custoMedio)}</b></div><div><span>Valor a custo</span><b>${brl(pos.valor)}</b></div><div><span>Preço de venda</span><b>${brl(p.preco)}</b></div>
        ${Object.keys(Object.assign({}, pos.porLoja, p.minimos)).filter((l) => l).map((l) => `<div><span>${esc(l)}</span><b>${q3(pos.porLoja[l] || 0)}${p.minimos[l] ? ` <small class="sub">(mín. ${q3(p.minimos[l])})</small>` : ''}</b></div>`).join('')}</div>
      ${(p.compat || []).length ? `<p class="conta">Serve em: ${esc(p.compat.join(', '))}</p>` : ''}${p.fornecedor ? `<p class="conta">Fornecedor habitual: ${esc(nomeForn(p.fornecedor))}</p>` : ''}
      <div class="acoes">${editor() ? '<button class="btn btn-ouro" type="button" id="dp-ed">Editar</button><button class="btn btn-linha" type="button" id="dp-tr">Transferir</button><button class="btn btn-linha" type="button" id="dp-en">Entrada</button>' : ''}</div>
      <section style="margin-top:16px"><h2 style="font-size:18px;margin-bottom:8px">Movimentos (kardex)</h2>${tabelaMov(movs.slice(0, 60))}</section>`, (c) => {
      const b = (s, f) => { const el = U.$(s, c); if (el) el.onclick = f; };
      b('#dp-ed', () => formPeca(p)); b('#dp-tr', () => formTransf({ peca: p.id })); b('#dp-en', () => formEntrada({ itens: [{ peca: p.id, qtd: 1, custo: pos.custoMedio || '' }] }));
    });
  }
  function formPeca(p = null) {
    if (!editor()) { U.toast('Seu perfil não cadastra peças.', true); return; }
    const v = p || { unidade: 'un', minimos: {} }, ls = lojas().length ? lojas() : [''];
    U.abrirCamada('modal larga-modal', `<h2>${p ? 'Editar peça' : 'Nova peça'}</h2><form class="campos" style="margin-top:12px" novalidate>
      <div class="campo inteiro"><label for="fp-desc">Descrição *</label><input id="fp-desc" value="${esc(v.descricao || '')}" placeholder="Ex.: Filtro de óleo do motor"></div>
      <div class="campo"><label for="fp-sku">Código (SKU)</label><input id="fp-sku" value="${esc(v.sku || '')}" placeholder="Vazio = ${esc(P.proximoSku(est()))}"></div>
      <div class="campo"><label for="fp-fab">Código do fabricante</label><input id="fp-fab" value="${esc(v.codFab || '')}"></div>
      <div class="campo"><label for="fp-marca">Marca</label><input id="fp-marca" value="${esc(v.marca || '')}"></div>
      <div class="campo"><label for="fp-un">Unidade</label><select id="fp-un">${opt(Object.entries(P.UNIDADES), v.unidade)}</select></div>
      <div class="campo inteiro"><label for="fp-compat">Serve nos modelos (separe por vírgula)</label><input id="fp-compat" value="${esc((v.compat || []).join(', '))}" placeholder="Ex.: 6125J, MF 4709"></div>
      <div class="campo"><label for="fp-local">Localização no almoxarifado</label><input id="fp-local" value="${esc(v.local || '')}" placeholder="Ex.: Corredor A, prateleira 3"></div>
      <div class="campo"><label for="fp-preco">Preço de venda (R$)</label><input id="fp-preco" inputmode="decimal" value="${v.preco ? String(v.preco).replace('.', ',') : ''}" ${p && !ajustador() && p.preco ? 'disabled title="Só dono e gerente mudam preço"' : ''}></div>
      <div class="campo inteiro"><label for="fp-forn">Fornecedor habitual</label><input id="fp-forn" list="dl-fp-forn" value="${esc(nomeForn(v.fornecedor))}" autocomplete="off"><datalist id="dl-fp-forn">${U.K.cad.fornecedores().map((c) => `<option value="${esc(c.nome)}">`).join('')}</datalist></div>
      ${ls.map((l, i) => `<div class="campo"><label for="fp-min${i}">Estoque mínimo${l ? ' · ' + esc(l) : ''}</label><input id="fp-min${i}" inputmode="decimal" value="${(v.minimos || {})[l] || ''}" placeholder="0 = sem alerta"></div>`).join('')}
      </form><div class="acoes"><button class="btn btn-ouro" type="button" id="fp-ok">Salvar</button><button class="btn btn-linha" type="button" id="fp-nao">Cancelar</button></div>`, (c) => {
      U.$('#fp-nao', c).onclick = () => U.fecharCamada();
      U.$('#fp-ok', c).onclick = () => {
        const minimos = {}; ls.forEach((l, i) => { minimos[l] = U.num(U.$('#fp-min' + i, c).value); });
        const fn = U.$('#fp-forn', c).value.trim(), fo = fn ? U.K.cad.garantir('fornecedores', { nome: fn }) : null;
        const x = tentar(() => P.salvarPeca(est(), { id: p ? p.id : undefined, descricao: U.$('#fp-desc', c).value, sku: U.$('#fp-sku', c).value, codFab: U.$('#fp-fab', c).value, marca: U.$('#fp-marca', c).value, unidade: U.$('#fp-un', c).value,
          compat: U.$('#fp-compat', c).value, local: U.$('#fp-local', c).value, preco: U.$('#fp-preco', c).disabled ? p.preco : U.num(U.$('#fp-preco', c).value), minimos, fornecedor: fo ? fo.id : '' }, quem()));
        if (!x) return;
        gravar(`${p ? 'Peça alterada' : 'Peça cadastrada'}: ${x.sku} ${x.descricao}`); U.toast(p ? 'Peça salva.' : 'Peça cadastrada.'); U.fecharCamada(true); U.rota();
      };
    });
  }

  // ---------- linhas de itens (entrada e balcão) ----------
  function linhaItem(it = {}, preco) {
    const p = it.peca ? P.peca(est(), it.peca) : null;
    return `<div class="ofc-linha pc-item"><div class="campo"><label>Peça</label><input data-f="peca" list="dl-pc" value="${p ? esc(rotPeca(p)) : ''}" placeholder="SKU, código ou descrição" autocomplete="off"></div>
      <div class="campo"><label>Qtd</label><input data-f="qtd" inputmode="decimal" value="${it.qtd != null ? String(it.qtd).replace('.', ',') : '1'}"></div>
      <div class="campo"><label>${preco ? 'Preço un. (R$)' : 'Custo un. (R$)'}</label><input data-f="valor" inputmode="decimal" value="${it[preco ? 'preco' : 'custo'] != null && it[preco ? 'preco' : 'custo'] !== '' ? String(it[preco ? 'preco' : 'custo']).replace('.', ',') : ''}"></div>
      <button class="btn btn-linha btn-p" type="button" data-tirar aria-label="Tirar item">×</button></div>`;
  }
  function ligarItens(c, preco, aoMudar) {
    const box = U.$('#pc-itens', c);
    const ler = () => U.$$('.pc-item', c).map((l) => { const p = lerPeca(U.$('[data-f=peca]', l).value); return { linha: l, peca: p ? p.id : '', texto: U.$('[data-f=peca]', l).value.trim(), qtd: U.num(U.$('[data-f=qtd]', l).value), valor: U.num(U.$('[data-f=valor]', l).value) }; });
    box.addEventListener('input', (e) => {
      const l = e.target.closest('.pc-item');
      if (l && e.target.dataset.f === 'peca') { const p = lerPeca(e.target.value), v = U.$('[data-f=valor]', l); if (p && !v.value) v.value = String(preco ? p.preco : P.posicao(est(), p.id).custoMedio || '').replace('.', ','); }
      aoMudar(ler());
    });
    box.addEventListener('click', (e) => { const b = e.target.closest('[data-tirar]'); if (b) { if (U.$$('.pc-item', c).length > 1) b.closest('.pc-item').remove(); aoMudar(ler()); } });
    U.$('#pc-add', c).onclick = () => { box.insertAdjacentHTML('beforeend', linhaItem({}, preco)); U.$$('.pc-item', c).at(-1).querySelector('input').focus(); };
    aoMudar(ler()); return ler;
  }

  // ---------- ENTRADA (compra) ----------
  function formEntrada(pre = {}) {
    if (!editor()) { U.toast('Seu perfil não lança entradas.', true); return; }
    U.abrirCamada('modal larga-modal', `<h2>Entrada de peças (compra)</h2><p class="sub">Entra no estoque pelo custo (frete rateado) e vira conta a pagar no Financeiro, categoria "Compra de peças" (estoque).</p>${dlPecas()}
      <form class="campos" style="margin-top:12px" novalidate>
        <div class="campo"><label for="pe-forn">Fornecedor *</label><input id="pe-forn" list="dl-pe-forn" value="${esc(pre.fornecedorNome || nomeForn(pre.fornecedor))}" autocomplete="off" placeholder="Acha no cadastro ou cria"><datalist id="dl-pe-forn">${U.K.cad.fornecedores().map((c) => `<option value="${esc(c.nome)}">`).join('')}</datalist></div>
        <div class="campo"><label for="pe-nota">Nº da nota</label><input id="pe-nota" value="${esc(pre.nota || '')}"></div>
        <div class="campo"><label for="pe-data">Data da entrada</label><input id="pe-data" type="date" value="${pre.data || U.hojeISO()}"></div>
        <div class="campo"><label for="pe-loja">Loja</label><select id="pe-loja">${optLojas(pre.loja || lojaPadrao())}</select></div>
        <div class="campo"><label for="pe-frete">Frete (R$)</label><input id="pe-frete" inputmode="decimal" value="${pre.frete ? String(pre.frete).replace('.', ',') : ''}"></div>
        <div class="campo"><label for="pe-venc">Vencimento</label><input id="pe-venc" type="date" value="${pre.vencimento || P.somarDias(U.hojeISO(), 30)}"></div>
        <div class="campo"><label for="pe-parc">Parcelas</label><input id="pe-parc" inputmode="numeric" value="${pre.parcelas || 1}"></div>
      </form>
      <div id="pc-itens" style="display:grid;gap:8px;margin-top:14px">${(pre.itens && pre.itens.length ? pre.itens : [{}]).map((i) => linhaItem(i, false)).join('')}</div>
      <div class="acoes" style="margin-top:10px"><button class="btn btn-linha" type="button" id="pc-add">${I.mais}Mais uma peça</button><span class="conta" id="pe-tot" style="margin:0"></span></div>
      <div class="acoes"><button class="btn btn-ouro" type="button" id="pe-ok">Lançar entrada</button><button class="btn btn-linha" type="button" id="pe-nao">Cancelar</button></div>`, (c) => {
      const tot = (l) => { const s = l.reduce((a, i) => a + i.qtd * i.valor, 0) + U.num(U.$('#pe-frete', c).value); U.$('#pe-tot', c).innerHTML = `Total da nota: <b>${brl(s)}</b>`; };
      const ler = ligarItens(c, false, tot); U.$('#pe-frete', c).oninput = () => tot(ler());
      U.$('#pe-nao', c).onclick = () => U.fecharCamada();
      U.$('#pe-ok', c).onclick = () => {
        const itens = ler().filter((i) => i.texto || i.qtd);
        const semPeca = itens.find((i) => !i.peca); if (semPeca) { U.toast(`"${semPeca.texto || 'item'}" não está no catálogo. Cadastre a peça antes.`, true); return; }
        const fn = U.$('#pe-forn', c).value.trim(); if (!fn) { U.toast('Informe o fornecedor.', true); return; }
        const fo = U.K.cad.garantir('fornecedores', { nome: fn });
        const cp = tentar(() => P.entradaCompra(est(), { data: U.$('#pe-data', c).value, loja: U.$('#pe-loja', c).value, fornecedor: fo.id, fornecedorNome: fo.nome, nota: U.$('#pe-nota', c).value, frete: U.num(U.$('#pe-frete', c).value),
          vencimento: U.$('#pe-venc', c).value, parcelas: Math.max(1, Math.floor(U.num(U.$('#pe-parc', c).value) || 1)), pedido: pre.pedido || '', origem: pre.origem || 'manual', itens: itens.map((i) => ({ peca: i.peca, qtd: i.qtd, custo: i.valor })) }, quem(), undefined, F()));
        if (!cp) return;
        gravar(`Entrada de peças${cp.nota ? ' NF ' + cp.nota : ''} · ${fo.nome} · ${brl(cp.total)} (${cp.itens.length} itens)${cp.lancamentos.length ? ' · conta a pagar criada' : ''}`);
        U.toast(`Entrada lançada: ${brl(cp.total)}${cp.lancamentos.length ? ' · conta a pagar no Financeiro' : ''}.`); U.fecharCamada(true); U.rota();
      };
    });
  }
  // ---------- importar XML da NF-e de compra ----------
  function importarXML() {
    if (!editor()) return;
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.xml,text/xml,application/xml';
    inp.onchange = async () => {
      const arq = inp.files[0]; if (!arq) return;
      let nfe; try { nfe = P.lerNFe(await arq.text()); } catch (e) { U.toast(e.message, true); return; }
      const itens = P.casarNFe(est(), nfe), cat = P.ativas(est());
      U.abrirCamada('modal larga-modal', `<h2>NF-e ${esc(nfe.numero)} · ${esc(nfe.fornecedor.nome)}</h2><p class="sub">${dBR(nfe.data)} · ${itens.length} itens · total ${brl(nfe.total)}${nfe.frete ? ' · frete ' + brl(nfe.frete) : ''}${nfe.duplicatas.length ? ` · ${nfe.duplicatas.length} ${nfe.duplicatas.length === 1 ? 'vencimento' : 'parcelas'} a partir de ${dBR(nfe.duplicatas[0].vencimento)}` : ''}. Confira a peça de cada linha; sem par, o Anshur cadastra a peça nova.</p>
        <div style="display:grid;gap:10px;margin-top:12px">${itens.map((i, k) => `<div class="campo"><label for="nx-${k}">${esc(i.descricao)} · ${q3(i.qtd)} ${esc(i.unidade)} × ${brl(i.custo)}${i.cProd ? ' · cód. ' + esc(i.cProd) : ''}</label>
          <select id="nx-${k}">${opt([['', 'Cadastrar como peça nova']].concat(cat.map((p) => [p.id, rotPeca(p)])), i.peca)}</select></div>`).join('')}</div>
        <div class="campos" style="margin-top:12px"><div class="campo"><label for="nx-loja">Loja da entrada</label><select id="nx-loja">${optLojas(lojaPadrao())}</select></div></div>
        <div class="acoes"><button class="btn btn-ouro" type="button" id="nx-ok">Lançar entrada</button><button class="btn btn-linha" type="button" id="nx-nao">Cancelar</button></div>`, (c) => {
        U.$('#nx-nao', c).onclick = () => U.fecharCamada();
        U.$('#nx-ok', c).onclick = () => {
          const fo = U.K.cad.garantir('fornecedores', { nome: nfe.fornecedor.nome, documento: nfe.fornecedor.documento, cidade: nfe.fornecedor.cidade });
          let novas = 0;
          const linhas = itens.map((i, k) => {
            let id = U.$('#nx-' + k, c).value;
            if (!id) { const p = tentar(() => P.salvarPeca(est(), { descricao: i.descricao, codFab: i.cProd, unidade: P.UNIDADES[i.unidade] ? i.unidade : 'un', fornecedor: fo.id }, quem())); if (!p) return null; id = p.id; novas++; }
            return { peca: id, qtd: i.qtd, custo: i.custo };
          });
          if (linhas.some((x) => !x)) return;
          const cp = tentar(() => P.entradaCompra(est(), { data: nfe.data || U.hojeISO(), loja: U.$('#nx-loja', c).value, fornecedor: fo.id, fornecedorNome: fo.nome, nota: nfe.numero, frete: nfe.frete, origem: 'xml',
            vencimento: nfe.duplicatas.length ? nfe.duplicatas[0].vencimento : P.somarDias(nfe.data || U.hojeISO(), 30), parcelas: Math.max(1, nfe.duplicatas.length), itens: linhas }, quem(), undefined, F()));
          if (!cp) return;
          gravar(`NF-e ${nfe.numero} importada (XML) · ${fo.nome} · ${brl(cp.total)}${novas ? ` · ${novas} peças novas cadastradas` : ''}`);
          U.toast(`NF-e ${nfe.numero} lançada${novas ? ` (${novas} peças novas)` : ''}.`); U.fecharCamada(true); U.rota();
        };
      });
    };
    inp.click();
  }

  // ---------- VENDA DE BALCÃO ----------
  function formBalcao(pre = {}) {
    if (!editor()) { U.toast('Seu perfil não vende no balcão.', true); return; }
    const fin = F() ? F().garantir(est()) : null, contas = fin ? fin.contas.filter((x) => !x.inativa) : [];
    U.abrirCamada('modal larga-modal', `<h2>Venda de peças no balcão</h2><p class="sub">Sai do estoque pelo custo médio e vira conta a receber ("Venda de peças"), com o custo para a DRE.</p>${dlPecas()}
      <form class="campos" style="margin-top:12px" novalidate>
        <div class="campo"><label for="pb-cli">Cliente</label><input id="pb-cli" list="dl-pb-cli" autocomplete="off" placeholder="Acha no cadastro ou cria"><datalist id="dl-pb-cli">${U.K.cad.clientes().map((c) => `<option value="${esc(c.nome)}">`).join('')}</datalist></div>
        <div class="campo"><label for="pb-loja">Loja</label><select id="pb-loja">${optLojas(lojaPadrao())}</select></div>
        <div class="campo"><label for="pb-data">Data</label><input id="pb-data" type="date" value="${U.hojeISO()}"></div>
        <div class="campo"><label for="pb-venc">Vencimento</label><input id="pb-venc" type="date" value="${U.hojeISO()}"></div>
        <div class="campo"><label for="pb-desc">Desconto (R$)</label><input id="pb-desc" inputmode="decimal"></div>
        ${contas.length ? `<div class="campo"><label for="pb-conta">Já recebido em</label><select id="pb-conta">${opt([['', 'Ainda não (fica a receber)']].concat(contas.map((x) => [x.id, x.nome])), '')}</select></div>` : ''}
      </form>
      <div id="pc-itens" style="display:grid;gap:8px;margin-top:14px">${(pre.itens || [{}]).map((i) => linhaItem(i, true)).join('')}</div>
      <div class="acoes" style="margin-top:10px"><button class="btn btn-linha" type="button" id="pc-add">${I.mais}Mais uma peça</button><span class="conta" id="pb-tot" style="margin:0"></span></div>
      <div class="acoes"><button class="btn btn-ouro" type="button" id="pb-ok">Registrar venda</button><button class="btn btn-linha" type="button" id="pb-nao">Cancelar</button></div>`, (c) => {
      const tot = (l) => { const s = l.reduce((a, i) => a + i.qtd * i.valor, 0) - U.num(U.$('#pb-desc', c).value), loja = U.$('#pb-loja', c).value;
        const falta = l.filter((i) => i.peca && P.posicao(est(), i.peca, { loja }).qtd < i.qtd);
        U.$('#pb-tot', c).innerHTML = `Total: <b>${brl(Math.max(0, s))}</b>${falta.length ? ` · <span class="neg">sem saldo: ${falta.map((i) => esc(P.peca(est(), i.peca).descricao) + ' (tem ' + q3(P.posicao(est(), i.peca, { loja }).qtd) + ')').join(', ')}</span>` : ''}`; };
      const ler = ligarItens(c, true, tot); U.$('#pb-desc', c).oninput = () => tot(ler()); U.$('#pb-loja', c).onchange = () => tot(ler());
      U.$('#pb-nao', c).onclick = () => U.fecharCamada();
      U.$('#pb-ok', c).onclick = () => {
        const itens = ler().filter((i) => i.texto || i.qtd); const sem = itens.find((i) => !i.peca); if (sem) { U.toast(`"${sem.texto || 'item'}" não está no catálogo.`, true); return; }
        const cn = U.$('#pb-cli', c).value.trim(), cl = cn ? U.K.cad.garantir('clientes', { nome: cn }) : null, conta = U.$('#pb-conta', c) ? U.$('#pb-conta', c).value : '';
        const v = tentar(() => P.vendaBalcao(est(), { data: U.$('#pb-data', c).value, loja: U.$('#pb-loja', c).value, cliente: cl ? cl.id : '', clienteNome: cl ? cl.nome : '', desconto: U.num(U.$('#pb-desc', c).value), vencimento: U.$('#pb-venc', c).value,
          recebido: conta ? { conta, forma: 'pix' } : null, sufixo: U.NV ? '-' + Math.random().toString(36).slice(2, 5).toUpperCase() : '', itens: itens.map((i) => ({ peca: i.peca, qtd: i.qtd, preco: i.valor })) }, quem(), undefined, F()));
        if (!v) return;
        gravar(`Venda de balcão ${v.numero}${cl ? ' · ' + cl.nome : ''} · ${brl(v.total)} (custo ${brl(v.custo)})${conta ? ' · recebida' : ' · a receber'}`);
        U.toast(`Venda ${v.numero} registrada: ${brl(v.total)}.`); U.fecharCamada(true); U.rota();
      };
    });
  }
  // ---------- TRANSFERÊNCIA ----------
  function formTransf(pre = {}) {
    if (!editor()) return;
    if (lojas().length < 2) { U.toast('Transferência precisa de duas lojas (Configurações › Lojas).', true); return; }
    const p = pre.peca ? P.peca(est(), pre.peca) : null;
    U.abrirCamada('modal', `<h2>Transferir entre lojas</h2>${dlPecas()}<form class="campos" style="margin-top:12px" novalidate>
      <div class="campo inteiro"><label for="pt-peca">Peça</label><input id="pt-peca" list="dl-pc" value="${p ? esc(rotPeca(p)) : ''}" autocomplete="off"></div>
      <div class="campo"><label for="pt-de">De</label><select id="pt-de">${optLojas(lojaPadrao())}</select></div><div class="campo"><label for="pt-para">Para</label><select id="pt-para">${optLojas(lojas().find((l) => l !== lojaPadrao()))}</select></div>
      <div class="campo"><label for="pt-qtd">Quantidade</label><input id="pt-qtd" inputmode="decimal" value="1"></div><div class="campo"><label for="pt-data">Data</label><input id="pt-data" type="date" value="${U.hojeISO()}"></div>
      <p class="conta inteiro" id="pt-saldo" style="margin:0"></p></form>
      <div class="acoes"><button class="btn btn-ouro" type="button" id="pt-ok">Transferir</button><button class="btn btn-linha" type="button" id="pt-nao">Cancelar</button></div>`, (c) => {
      const saldo = () => { const x = lerPeca(U.$('#pt-peca', c).value); U.$('#pt-saldo', c).textContent = x ? `Saldo em ${U.$('#pt-de', c).value}: ${q3(P.posicao(est(), x.id, { loja: U.$('#pt-de', c).value }).qtd)} ${x.unidade}` : ''; };
      U.$('#pt-peca', c).oninput = saldo; U.$('#pt-de', c).onchange = saldo; saldo();
      U.$('#pt-nao', c).onclick = () => U.fecharCamada();
      U.$('#pt-ok', c).onclick = () => {
        const x = lerPeca(U.$('#pt-peca', c).value); if (!x) { U.toast('Escolha a peça do catálogo.', true); return; }
        const m = tentar(() => P.transferir(est(), { peca: x.id, qtd: U.num(U.$('#pt-qtd', c).value), de: U.$('#pt-de', c).value, para: U.$('#pt-para', c).value, data: U.$('#pt-data', c).value }, quem()));
        if (!m) return; gravar(`Transferência: ${q3(m.qtd)} × ${x.descricao} de ${m.loja} para ${m.para}`); U.toast('Transferência registrada.'); U.fecharCamada(true); U.rota();
      };
    });
  }

  // ---------- MOVIMENTAÇÕES ----------
  const fm = { tipo: '', q: '' };
  function telaMov() {
    const l = P.garantir(est()).movimentos.filter((m) => (!fl().loja || m.loja === fl().loja || m.para === fl().loja) && (!fm.tipo || m.tipo === fm.tipo) && (!fm.q || P.normal([P.nomePeca(P.peca(est(), m.peca)), m.obs, m.por].join(' ')).includes(P.normal(fm.q))))
      .sort((a, b) => String(b.data).localeCompare(String(a.data)) || String(b.quando).localeCompare(String(a.quando)));
    U.tela.innerHTML = cab('Movimentações', 'Entradas, saídas (OS e balcão), transferências, ajustes de inventário e devoluções. Nada é apagado: corrige-se com outro movimento.', botoes()) + `
      <section class="painel"><div class="fin-filtros"><div class="abas-modo" role="group" aria-label="Tipo">${[['', 'Todos'], ['entrada', 'Entradas'], ['saida', 'Saídas'], ['transf', 'Transferências'], ['ajuste', 'Ajustes'], ['devolucao', 'Devoluções']].map(([v, n]) => `<button type="button" data-tp="${v}" aria-pressed="${fm.tipo === v}">${n}</button>`).join('')}</div>
        <div class="campos fin-campos"><div class="campo"><label for="pm-q">Buscar</label><input id="pm-q" value="${esc(fm.q)}" placeholder="Peça, nota, OS, pessoa"></div></div></div>
        ${tabelaMov(l.slice(0, 300))}<div class="fin-rodape"><span>${l.length} movimentos${l.length > 300 ? ' (mostrando 300)' : ''}</span><button class="btn btn-linha" type="button" id="pm-csv">Exportar planilha</button></div></section>`;
    U.$$('[data-tp]', U.tela).forEach((b) => b.onclick = () => { fm.tipo = b.dataset.tp; telaMov(); });
    const q = U.$('#pm-q'); q.oninput = () => { fm.q = q.value; clearTimeout(telaMov.t); telaMov.t = setTimeout(() => { telaMov(); const i = U.$('#pm-q'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }, 300); };
    U.$('#pm-csv').onclick = () => U.baixarCSV(`anshur-movimentos-pecas-${U.hojeISO()}.csv`, [['Data', 'Tipo', 'Origem', 'SKU', 'Peça', 'Quantidade', 'Custo unitário', 'Loja', 'Para', 'Obs', 'Por', 'Id']]
      .concat(l.map((m) => { const p = P.peca(est(), m.peca) || {}; return [dBR(m.data), m.tipo, P.ORIGENS[m.origem] || '', p.sku, p.descricao, String(m.qtd).replace('.', ','), String(m.custo || '').replace('.', ','), m.loja, m.para || '', m.obs || '', m.por || '', m.id]; })));
    ligarBotoes();
  }

  // ---------- INVENTÁRIO ----------
  let invLoja = '';
  function telaInventario() {
    invLoja = invLoja || lojaPadrao();
    const lst = P.estoque(est(), { loja: invLoja }).filter((e) => e.qtd !== 0 || (e.peca.minimos || {})[invLoja]).sort((a, b) => String(a.peca.local).localeCompare(String(b.peca.local)) || a.peca.descricao.localeCompare(b.peca.descricao));
    const hist = P.garantir(est()).inventarios.slice().sort((a, b) => String(b.data).localeCompare(String(a.data)));
    const pode = ajustador();
    U.tela.innerHTML = cab('Inventário', 'Conte o que tem na prateleira. Cada diferença vira um ajuste com motivo (perda, quebra, erro de lançamento). Ordem por localização, para contar andando.', '') + `
      <section class="painel"><div class="campos fin-campos" style="margin-bottom:12px"><div class="campo"><label for="iv-loja">Loja</label><select id="iv-loja">${optLojas(invLoja)}</select></div>
        <div class="campo"><label for="iv-data">Data da contagem</label><input id="iv-data" type="date" value="${U.hojeISO()}"></div><div class="campo"><label for="iv-mot">Motivo geral das diferenças</label><input id="iv-mot" placeholder="Ex.: inventário mensal"></div></div>
        ${!pode ? '<p class="conta">Só o dono e o gerente fazem ajuste de inventário. Você pode conferir os saldos abaixo.</p>' : ''}
        ${lst.length ? `<div class="tabela-wrap"><table class="tabela fin-tab"><thead><tr><th>Peça</th><th class="n">Sistema</th><th class="n">Contado</th><th>Motivo da diferença</th></tr></thead><tbody>
          ${lst.map((e, i) => `<tr data-iv="${esc(e.peca.id)}"><td><b>${esc(e.peca.descricao)}</b><span class="fin-sub">${esc(e.peca.sku)}${e.peca.local ? ' · ' + esc(e.peca.local) : ''}</span></td><td class="n">${q3(e.qtd)}</td>
            <td class="n"><input class="ofc-num" data-cont aria-label="Contado de ${esc(e.peca.descricao)}" inputmode="decimal" ${pode ? '' : 'disabled'}></td><td><input class="ofc-mot" data-mot aria-label="Motivo ${i + 1}" placeholder="se diferente" ${pode ? '' : 'disabled'}></td></tr>`).join('')}</tbody></table></div>`
        : vazio('Nenhuma peça com saldo nesta loja.')}
        ${pode && lst.length ? '<div class="acoes"><button class="btn btn-ouro" type="button" id="iv-ok">Fechar inventário e ajustar</button></div>' : ''}</section>
      <section class="painel bloco"><div class="painel-cab"><h2>${I.lista}Inventários feitos</h2></div>
        ${hist.length ? `<ul class="fin-saldos">${hist.slice(0, 12).map((v) => `<li><span><b>${dBR(v.data)}${v.loja ? ' · ' + esc(v.loja) : ''}</b><span>${v.itens.length} peças contadas · ${v.itens.filter((i) => i.diferenca).length} diferenças · por ${esc(v.por)}${v.motivo ? ' · ' + esc(v.motivo) : ''}</span></span><b class="${v.ajuste < 0 ? 'neg' : ''}">${brl(v.ajuste)}</b></li>`).join('')}</ul>` : vazio('Nenhum inventário ainda.')}</section>`;
    U.$('#iv-loja').onchange = (e) => { invLoja = e.target.value; telaInventario(); };
    const b = U.$('#iv-ok'); if (b) b.onclick = () => {
      const contagens = U.$$('[data-iv]', U.tela).map((tr) => ({ peca: tr.dataset.iv, contado: U.$('[data-cont]', tr).value.trim() === '' ? '' : U.num(U.$('[data-cont]', tr).value), motivo: U.$('[data-mot]', tr).value.trim() })).filter((x) => x.contado !== '');
      const inv = tentar(() => P.inventario(est(), { loja: invLoja, data: U.$('#iv-data').value, motivo: U.$('#iv-mot').value, contagens }, quem()));
      if (!inv) return; gravar(`Inventário ${invLoja || ''} fechado: ${inv.itens.length} peças, ${inv.itens.filter((i) => i.diferenca).length} diferenças, ajuste ${brl(inv.ajuste)}`); U.toast('Inventário fechado.'); telaInventario();
    };
  }

  // ---------- COMPRAS: mínimo, pedido sugerido, pedidos e compras ----------
  function telaCompras() {
    const P0 = P.garantir(est()), ab = P.abaixoMinimo(est(), fl()), sug = P.pedidoSugerido(est(), fl());
    const abertos = P0.pedidos.filter((p) => p.status === 'aberto' && (!fl().loja || p.loja === fl().loja)), compras = P0.compras.slice().sort((a, b) => String(b.data).localeCompare(String(a.data))).slice(0, 15);
    const podeFin = F() && F().podeVer(U.eu().perfil) && raiz.FINANCEIRO_UI;
    U.tela.innerHTML = cab('Compras e estoque mínimo', 'O que está abaixo do mínimo, o pedido sugerido por fornecedor (repõe até 2× o mínimo) e as compras lançadas.', editor() ? `<button class="btn btn-ouro" type="button" data-pc="entrada">${I.entra}<span>Entrada (compra)</span></button><button class="btn btn-linha" type="button" data-pc="xml">${I.doc}<span>Importar XML</span></button>` : '') + `
      <section class="painel"><div class="painel-cab"><h2>${I.carrinho}Pedido sugerido</h2><p>${ab.length} ${ab.length === 1 ? 'peça abaixo' : 'peças abaixo'} do mínimo</p></div>
        ${sug.length ? sug.map((g, k) => { const fo = U.K.cad.fornecedor(g.fornecedor); return `<div class="ofc-bloco"><div class="painel-cab" style="margin-bottom:8px"><h3 style="font-size:17px">${esc(fo ? fo.nome : 'Sem fornecedor habitual')}${g.loja ? ' · ' + esc(g.loja) : ''}</h3><p>${brl(g.total)} a custo médio</p></div>
          <ul class="lista-motivos">${g.itens.map((i) => { const p = P.peca(est(), i.peca); return `<li><span>${esc(p.descricao)} <small class="sub">${esc(p.sku)}</small></span><b>${q3(i.qtd)} ${esc(p.unidade)}</b></li>`; }).join('')}</ul>
          ${editor() ? `<div class="acoes"><button class="btn btn-ouro btn-p" type="button" data-gerar="${k}">Gerar pedido</button>${fo && fo.telefone ? `<a class="btn btn-linha btn-p" target="_blank" rel="noopener" href="https://wa.me/${('55' + String(fo.telefone).replace(/\D/g, '')).replace(/^5555/, '55')}?text=${encodeURIComponent(P.textoPedido({ numero: 'sugerido', loja: g.loja, itens: g.itens }, { revenda: U.A.revenda.nome, nome: (id) => P.nomePeca(P.peca(est(), id)) }))}">${I.zap}Mandar ao fornecedor</a>` : ''}</div>` : ''}</div>`; }).join('') : vazio('Nada para pedir: nenhuma peça abaixo do mínimo (ou já está num pedido em aberto).')}</section>
      <div class="grade-2 bloco">
        <section class="painel"><div class="painel-cab"><h2>${I.lista}Pedidos em aberto</h2></div>
          ${abertos.length ? `<ul class="fin-saldos">${abertos.map((p) => `<li><span><b>${esc(p.numero)} · ${esc(nomeForn(p.fornecedor) || 'Sem fornecedor')}</b><span>${dBR(p.data)}${p.loja ? ' · ' + esc(p.loja) : ''} · ${p.itens.length} itens · ${brl(p.total)}</span>
            ${editor() ? `<span class="acoes" style="margin-top:6px"><button class="btn btn-ouro btn-p" type="button" data-receber="${esc(p.id)}">Receber</button><button class="btn btn-linha btn-p" type="button" data-cancelar="${esc(p.id)}">Cancelar</button></span>` : ''}</span></li>`).join('')}</ul>` : vazio('Nenhum pedido em aberto.')}</section>
        <section class="painel"><div class="painel-cab"><h2>${I.entra}Compras lançadas</h2></div>
          ${compras.length ? `<ul class="fin-saldos">${compras.map((c) => `<li><span><b>${c.nota ? 'NF ' + esc(c.nota) : 'Sem nota'} · ${esc(c.fornecedorNome || nomeForn(c.fornecedor) || '—')}</b><span>${dBR(c.data)}${c.loja ? ' · ' + esc(c.loja) : ''} · ${c.itens.length} itens${c.origem === 'xml' ? ' · XML' : ''}${c.lancamentos.length ? ` · ${podeFin ? `<button class="link" type="button" data-lanc-fin="${esc(c.lancamentos[0])}">conta a pagar</button>` : 'conta a pagar'}` : ''}</span></span><b>${brl(c.total)}</b></li>`).join('')}</ul>` : vazio('Nenhuma compra lançada.')}</section>
      </div>`;
    U.$$('[data-gerar]', U.tela).forEach((b) => b.onclick = () => { const g = sug[+b.dataset.gerar]; const p = tentar(() => P.criarPedido(est(), { fornecedor: g.fornecedor, loja: g.loja, itens: g.itens, sufixo: U.NV ? '-' + Math.random().toString(36).slice(2, 5).toUpperCase() : '' }, quem())); if (!p) return; gravar(`Pedido de compra ${p.numero} gerado · ${nomeForn(p.fornecedor) || 'sem fornecedor'} · ${brl(p.total)}`); U.toast(`Pedido ${p.numero} gerado.`); telaCompras(); });
    U.$$('[data-receber]', U.tela).forEach((b) => b.onclick = () => { const p = P0.pedidos.find((x) => x.id === b.dataset.receber); formEntrada({ fornecedor: p.fornecedor, loja: p.loja, pedido: p.id, origem: 'pedido', itens: p.itens.map((i) => ({ peca: i.peca, qtd: i.qtd, custo: i.custo })) }); });
    U.$$('[data-cancelar]', U.tela).forEach((b) => b.onclick = () => U.confirmar('Cancelar o pedido?', 'O pedido sai da lista de abertos e as peças voltam ao pedido sugerido.', 'Cancelar pedido', () => { const p = tentar(() => P.cancelarPedido(est(), b.dataset.cancelar, 'cancelado na tela', quem())); if (p) { gravar(`Pedido ${p.numero} cancelado`); telaCompras(); } }));
    U.$$('[data-lanc-fin]', U.tela).forEach((b) => b.onclick = () => raiz.FINANCEIRO_UI.detalhe(b.dataset.lancFin));
    ligarBotoes();
  }

  // ---------- CURVA ABC ----------
  let abcDias = 365;
  function telaABC() {
    const c = P.curvaABC(est(), { hoje: U.hojeISO(), dias: abcDias, loja: fl().loja });
    U.tela.innerHTML = cab('Curva ABC', 'Peças ordenadas pelo valor consumido (OS e balcão, a custo). A: até 80% do valor; B: até 95%; C: o resto e o que não girou. Estoque mínimo e compras devem olhar primeiro a classe A.', '') + `
      <div class="kpis fin-k fin-kpis3">${['A', 'B', 'C'].map((k) => `<div class="kpi ${k === 'A' ? 'k-marfim' : ''}"><span class="rot">${I.barras}Classe ${k}</span><span class="val">${c.resumo[k].n}</span><span class="exp">${brl(c.resumo[k].valor)} consumidos</span></div>`).join('')}</div>
      <section class="painel"><div class="fin-filtros"><div class="abas-modo" role="group" aria-label="Período">${[[90, '90 dias'], [180, '6 meses'], [365, '12 meses']].map(([v, n]) => `<button type="button" data-dias="${v}" aria-pressed="${abcDias === v}">${n}</button>`).join('')}</div></div>
        ${c.linhas.length ? `<div class="tabela-wrap"><table class="tabela fin-tab"><thead><tr><th>Classe</th><th>Peça</th><th class="n">Consumo</th><th class="n oc-esconde">% acumulado</th></tr></thead><tbody>
          ${c.linhas.map((l) => `<tr data-peca="${esc(l.peca.id)}" class="clicavel" tabindex="0"><td><span class="risco ${l.classe === 'A' ? 'alto' : l.classe === 'B' ? 'medio' : 'baixo'}">${l.classe}</span></td><td><b>${esc(l.peca.descricao)}</b><span class="fin-sub">${esc(l.peca.sku)}${l.semGiro ? ' · sem giro no período' : ''}</span></td><td class="n">${brl(l.valor)}</td><td class="n oc-esconde">${l.valor ? U.pct(l.acumulado) : '—'}</td></tr>`).join('')}</tbody></table></div>` : vazio('Nenhuma peça cadastrada.')}</section>`;
    U.$$('[data-dias]', U.tela).forEach((b) => b.onclick = () => { abcDias = +b.dataset.dias; telaABC(); });
    ligarBotoes();
  }

  // ---------- demonstração: dados fictícios coerentes com os modelos da demo ----------
  function semear(ui) {
    U = ui; const e = ui.estado; if (ui.OP) return; // nunca no ambiente real
    const PP = P.garantir(e); if (PP.semente) return;
    const Fin = raiz.FINANCEIRO, hoje = ui.hojeISO(), d = (n) => P.somarDias(hoje, -n), ag = (n) => new Date(Date.now() - n * 864e5).toISOString();
    const ls = e.lojas.length ? e.lojas : [''], l0 = ls[0], l1 = ls[1] || l0, l2 = ls[2] || l0;
    const fo = ['Distribuidora Agro Peças (fictícia)', 'Lubrificantes Mogiana (fictícia)', 'Pneus Campo Forte (fictícia)', 'Hidráulica Paulista (fictícia)']
      .map((n, i) => ui.K.garantirCadastro(e, 'fornecedores', { nome: n, cidade: ['Ribeirão Preto', 'Orlândia', 'Sertãozinho', 'Franca'][i], telefone: `(16) 3${String(721 + i * 13)}-${String(4100 + i * 77)}` }));
    // [descrição, cód. fabricante (fictício), marca, compatível, local, unidade, preço, mínimo loja 0, fornecedor]
    const CAT = [
      ['Filtro de óleo do motor', 'FX-10021', 'John Deere', '6125J, CH570', 'A-01-1', 'un', 189, 6, 0], ['Filtro de combustível primário', 'FX-10044', 'John Deere', '6125J, CH570', 'A-01-2', 'un', 236, 4, 0],
      ['Filtro de ar externo', 'FX-20310', 'Massey Ferguson', 'MF 4709', 'A-02-1', 'un', 412, 3, 0], ['Filtro hidráulico', 'FX-20377', 'New Holland', 'T7.245', 'A-02-2', 'un', 365, 3, 0],
      ['Óleo de motor 15W40 (balde 20 L)', 'LB-1540', 'Lubrax', 'todos', 'B-01-1', 'un', 640, 8, 1], ['Óleo hidráulico/transmissão (balde 20 L)', 'LB-HT20', 'Lubrax', 'todos', 'B-01-2', 'un', 720, 6, 1],
      ['Graxa de lítio (balde 20 kg)', 'LB-GX20', 'Lubrax', 'todos', 'B-02-1', 'un', 590, 2, 1], ['Correia do alternador', 'FX-30981', 'Valtra', 'A134', 'C-01-4', 'un', 318, 2, 0],
      ['Faca do picador (jogo)', 'FX-41200', 'Case IH', 'Austoft 8810, CH570', 'D-03-1', 'jg', 2480, 2, 0], ['Disco do corte de base', 'FX-41255', 'Case IH', 'Austoft 8810', 'D-03-2', 'un', 1350, 4, 0],
      ['Bico de pulverização leque 110°', 'FX-52010', 'Jacto', 'Uniport 3030, Imperador 3.0', 'E-01-1', 'un', 38, 40, 0], ['Mangueira hidráulica 1/2" (metro)', 'HD-12M', 'Hidráulica', 'todos', 'E-02-3', 'm', 74, 20, 3],
      ['Kit de vedação de cilindro', 'HD-KV80', 'Hidráulica', 'MF 4709, A134, Farmall 130A', 'E-02-4', 'kit', 289, 3, 3], ['Lâmpada de farol de trabalho LED', 'FX-60110', 'Universal', 'todos', 'F-01-1', 'un', 196, 4, 0],
      ['Pneu dianteiro 14.9-24', 'PN-14924', 'Pneus', '6125J, MF 4709, A134', 'Pátio coberto', 'un', 3890, 2, 2], ['Disco de corte da plantadeira 18"', 'FX-70318', 'Jumil', 'JM3090 Exacta, Absoluta 34', 'G-01-2', 'un', 412, 6, 0]
    ];
    const ps = CAT.map(([desc, cod, marca, compat, local, un, preco, min, f], ix) => P.salvarPeca(e, { descricao: desc, codFab: cod, marca, compat: compat === 'todos' ? '' : compat, local, unidade: un, preco, fornecedor: fo[f].id, minimos: Object.assign({ [l0]: min }, l1 !== l0 && [0, 1, 4, 11, 12].includes(ix) ? { [l1]: Math.ceil(min / 2) } : {}) }, 'Carlos', ag(120)));
    const custo = (i) => Math.round(CAT[i][6] * 0.62 * 100) / 100;
    const conta = Fin && Fin.conta(e, 'CT-BB') ? 'CT-BB' : '';
    const compra = (dias, f, loja, nota, itens) => { const c = P.entradaCompra(e, { data: d(dias), loja, fornecedor: fo[f].id, fornecedorNome: fo[f].nome, nota, frete: 120, vencimento: d(dias - 28), itens: itens.map(([i, q]) => ({ peca: ps[i].id, qtd: q, custo: custo(i) })) }, 'Lúcia', ag(dias), Fin);
      if (Fin && conta) c.lancamentos.forEach((id) => { const l = e.fin.lancamentos.find((x) => x.id === id); if (l && l.vencimento < d(2)) Fin.baixar(e, id, { data: l.vencimento, forma: 'boleto', conta }, 'Lúcia', ag(dias - 28)); }); return c; };
    compra(95, 0, l0, '58113', [[0, 18], [1, 10], [2, 6], [3, 5], [7, 4], [8, 3], [9, 8], [10, 80], [13, 8], [15, 10]]);
    compra(80, 1, l0, '20977', [[4, 16], [5, 10], [6, 4]]);
    compra(70, 2, l0, '7741', [[14, 4]]);
    compra(64, 3, l1, '3302', [[11, 30], [12, 6]]);
    compra(40, 0, l1, '58790', [[0, 8], [1, 4]]);
    compra(18, 1, l0, '21430', [[4, 6], [5, 4]]);
    if (l1 !== l0) P.transferir(e, { peca: ps[4].id, qtd: 4, de: l0, para: l1, data: d(30) }, 'Carlos', ag(30));
    if (l2 !== l0) P.transferir(e, { peca: ps[11].id, qtd: 10, de: l1, para: l2, data: d(25) }, 'Carlos', ag(25));
    // balcão: clientes do cadastro comum (os mesmos do Financeiro)
    const cli = ui.K.cad.clientes();
    [[33, [[10, 24], [4, 2]], 0, true], [12, [[0, 3], [5, 1]], 3, true], [3, [[8, 1]], 5, false]].forEach(([dias, its, ci, rec]) => {
      try { P.vendaBalcao(e, { data: d(dias), loja: l0, cliente: cli[ci] ? cli[ci].id : '', clienteNome: cli[ci] ? cli[ci].nome : '', vencimento: rec ? d(dias) : d(dias - 15), recebido: rec && conta ? { conta, forma: 'pix' } : null, itens: its.map(([i, q]) => ({ peca: ps[i].id, qtd: q, preco: CAT[i][6] })) }, 'Carlos', ag(dias), Fin); } catch (er) { /* sem saldo: ignora na demo */ }
    });
    try { P.inventario(e, { loja: l0, data: d(20), motivo: '', contagens: [{ peca: ps[10].id, contado: Math.max(0, P.posicao(e, ps[10].id, { loja: l0 }).qtd - 3), motivo: 'Bicos quebrados no manuseio' }, { peca: ps[13].id, contado: P.posicao(e, ps[13].id, { loja: l0 }).qtd }] }, 'Carlos', ag(20)); } catch (er) { /* nada */ }
    P.criarPedido(e, { fornecedor: fo[3].id, loja: l1, itens: [{ peca: ps[12].id, qtd: 4, custo: custo(12) }], data: d(2) }, 'Carlos', ag(2));
    PP.semente = true;
    return ps;
  }

  // ---------- estilo das duas áreas (Oficina e Peças), injetado uma vez; mesma paleta e classes base ----------
  function estilo() {
    if (typeof document === 'undefined' || document.getElementById('ofc-estilo')) return;
    const s = document.createElement('style'); s.id = 'ofc-estilo';
    s.textContent = `.ofc-quadro{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(min(100%,230px),1fr));margin-bottom:16px}
.ofc-col{background:#FDFBF6;border:1px solid var(--borda);border-radius:14px;padding:12px;display:grid;gap:10px;align-content:start;min-width:0}
.ofc-col h3{font-size:15.5px;display:flex;justify-content:space-between;gap:8px;align-items:center}
.ofc-card{display:grid;gap:3px;text-align:left;background:#fff;border:1px solid var(--borda);border-radius:12px;padding:12px;font:inherit;color:inherit;cursor:pointer;min-width:0;width:100%;transition:border-color var(--t)}
.ofc-card:hover,.ofc-card:focus-visible{border-color:var(--ouro);outline:none}
.ofc-card b{font-size:15.5px}.ofc-card span{color:var(--cinza);font-size:13.5px;overflow-wrap:anywhere}
.ofc-card .ofc-tags{display:flex;flex-wrap:wrap;gap:6px;margin-top:4px}
.ofc-linha{display:grid;grid-template-columns:minmax(0,3fr) minmax(0,1fr) minmax(0,1.3fr) auto;gap:8px;align-items:end}
.ofc-bloco{border:1px solid var(--borda);border-radius:14px;padding:14px;margin-top:10px;background:#FDFBF6}
.ofc-sec{margin-top:18px}.ofc-sec>h3{font-size:17px;margin-bottom:8px;display:flex;justify-content:space-between;gap:8px;align-items:baseline;flex-wrap:wrap}
.ofc-check{list-style:none;margin:0;padding:0;display:grid;gap:6px}.ofc-check li{display:grid;grid-template-columns:minmax(0,1fr) 150px;gap:8px;align-items:center;font-size:15px}
.ofc-check select{min-height:40px;padding:6px 8px;border-radius:8px;border:1px solid rgba(17,24,32,.16);background:var(--marinho);width:100%}
.ofc-num,.ofc-mot{min-height:40px;padding:6px 10px;border-radius:8px;border:1px solid rgba(17,24,32,.16);background:var(--marinho);width:100%}.ofc-num{max-width:110px;text-align:right}.ofc-mot{min-width:140px}
.ofc-assina{display:block;width:100%;height:150px;border:1px dashed var(--ouro);border-radius:12px;background:#fff;touch-action:none;cursor:crosshair}
.ofc-grande{min-height:56px;font-size:17px}
.ofc-aponta{display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between;padding:14px;border:1px solid var(--borda);border-radius:14px;background:#fff}
.ofc-aponta+.ofc-aponta{margin-top:10px}.ofc-aponta div{display:grid;min-width:0}.ofc-aponta span{color:var(--cinza);font-size:14px}
.ofc-so-cel{display:none}
.ofc-relogio{font-variant-numeric:tabular-nums;font-weight:800;font-size:22px}
.ofc-linha input,.ofc-linha select{min-width:0;width:100%}
@media (max-width:600px){.ofc-linha{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}.ofc-linha>:first-child,.ofc-linha>.btn{grid-column:1/-1}.oc-esconde{display:none}.ofc-so-cel{display:inline}.ofc-check li{grid-template-columns:1fr}}`;
    document.head.appendChild(s);
  }

  // ---------- busca global ----------
  function buscar(q, ui) {
    if (!q || q.length < 2 || !P.podeVer(ui.eu().perfil)) return [];
    U = ui;
    return P.buscar(ui.estado, q).slice(0, 6).map((p) => { const pos = P.posicao(ui.estado, p.id, { loja: ui.estado.lojaAtual || '' }); return { g: 'Peças', n: `${p.sku} · ${p.descricao}`, d: `${q3(pos.qtd)} ${p.unidade} em estoque · ${brl(p.preco)}${p.local ? ' · ' + p.local : ''}`, ir: () => { location.hash = '#pc-catalogo'; setTimeout(() => detalhePeca(p.id), 320); } }; });
  }

  const T = (fn) => (ui) => { U = ui; P.garantir(ui.estado); fn(); };
  const IT = (aba, rotulo, curto, icone) => ({ aba, rotulo, curto, icone });
  R.registrar({
    id: 'pecas', nome: 'Peças e Estoque', curto: 'Peças', ordem: 50, pronta: true, inicio: 'pc-painel', perfis: VER,
    descricao: 'Catálogo, SKU, localização, entradas, saídas, inventário e compras.',
    icone: '<path d="M21 8l-9-5-9 5v8l9 5 9-5zM3 8l9 5 9-5M12 13v8"/>',
    acao: { rotulo: 'Entrada de peças', href: '#pc-mov', novo: true },
    atalhos: ['pc-painel', 'pc-catalogo', 'pc-mov', 'pc-compras'],
    dados: { pecas: ['catalogo', 'movimentos', 'inventarios', 'pedidos', 'compras', 'vendas'], cadastros: ['clientes', 'fornecedores'] },
    menu: [
      { grupo: 'Estoque', itens: [IT('pc-painel', 'Painel de peças', 'Painel', '<path d="M4 13h6V4H4zM14 20h6V11h-6zM14 4v4h6V4zM4 20h6v-4H4z"/>'), IT('pc-catalogo', 'Catálogo de peças', 'Catálogo', '<path d="M21 8l-9-5-9 5v8l9 5 9-5zM3 8l9 5 9-5M12 13v8"/>'), IT('pc-mov', 'Movimentações', 'Movimentos', '<path d="M4 7h13l-3-3M20 17H7l3 3"/>')] },
      { grupo: 'Controle', itens: [IT('pc-compras', 'Compras e estoque mínimo', 'Compras', '<path d="M3 4h2l2.4 11h11L21 7H7M9 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM18 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"/>'), IT('pc-inventario', 'Inventário', 'Inventário', '<path d="M9 6h11M9 12h11M9 18h11M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2"/>'), IT('pc-abc', 'Curva ABC', 'ABC', '<path d="M4 20h16M7 16v-5M11 16V7M15 16v-7M19 16V5"/>')] }
    ],
    telas: { 'pc-painel': T(telaPainel), 'pc-catalogo': T(telaCatalogo), 'pc-mov': T(telaMov), 'pc-inventario': T(telaInventario), 'pc-compras': T(telaCompras), 'pc-abc': T(telaABC) },
    permissoes: { 'pc-painel': VER, 'pc-catalogo': VER, 'pc-mov': VER, 'pc-inventario': VER, 'pc-compras': VER, 'pc-abc': VER },
    numero: (ui) => { U = ui; P.garantir(ui.estado); const r = P.resumo(ui.estado, { loja: ui.estado.lojaAtual || '', lojas: ui.K.lojasPermitidas }); return { valor: String(r.abaixo), texto: `${r.abaixo === 1 ? 'peça abaixo' : 'peças abaixo'} do mínimo · ${brl(r.valor)} em estoque`, alerta: r.abaixo > 0 }; },
    buscar,
    novo: (ui) => { U = ui; if (!editor()) { ui.toast('Seu perfil não lança peças.', true); return; } ui.abrirCamada('modal', `<h2>Peças</h2><p class="sub">O que você vai lançar?</p><div class="acoes" style="flex-wrap:wrap">${botoes()}<button class="btn btn-linha" type="button" data-pc="peca">${I.mais}<span>Nova peça</span></button></div>`, (c) => ligarBotoes(c)); },
    iniciar: (ui) => { if (ui.OP) return; const antes = P.garantir(ui.estado).semente; semear(ui); if (!antes) ui.salvar(); }
  });
  raiz.PECAS_UI = { semear, detalhePeca: (id) => detalhePeca(id), formBalcao: (p) => formBalcao(p) };
})(typeof window !== 'undefined' ? window : globalThis);
