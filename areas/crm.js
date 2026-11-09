// Área VENDAS E CLIENTES (CRM): telas. As regras (puras, testadas) estão em areas/crm-regras.js (window.CRM).
// Leads por origem, funil por etapa, atividades e tarefas com responsável, follow-up com WhatsApp pronto, cliente do cadastro
// comum com perfil de produtor rural (IE, fazendas, culturas, máquinas por chassi), histórico do cliente, oportunidades pelo
// calendário de safra que o Anshur já usa, compradores de usados (casamento automático) e vendedores/comissões.
// Permissões: dono e gerente veem tudo; vendedor vê e edita os próprios; financeiro e auditor só leem.
(function (raiz) {
  const R = raiz.ANSHUR_AREAS; if (!R) return;
  const ICONE = '<path d="M3 4h18l-7 8v6l-4 2v-8z"/>';
  const PERFIS = ['dono', 'gerente', 'vendedor', 'financeiro', 'auditor'];
  R.registrar({
    id: 'crm', nome: 'Vendas e Clientes', curto: 'CRM', ordem: 60, pronta: false, perfis: PERFIS,
    descricao: 'Funil, leads, clientes, atividades, tarefas e follow-ups.', icone: ICONE,
    previsto: ['Funil do primeiro contato ao faturamento', 'Leads, clientes, atividades e tarefas', 'Follow-ups com WhatsApp', 'Ligado aos compradores de usados e às comissões'],
    jaExiste: 'Hoje já existe: Compradores (Usados) e o cadastro único de clientes.',
    dados: { crm: ['leads', 'atividades', 'perfis'], cadastros: ['clientes'] }
  });
  const CR = raiz.CRM;
  if (!CR || typeof document === 'undefined') return;

  let U = null;
  const est = () => U.estado;
  const eu = () => U.eu(), perfil = () => eu().perfil, nome = () => eu().nome;
  const leitura = () => !['dono', 'gerente', 'vendedor'].includes(perfil()) || U.somenteLeitura() || !!(U.NV && U.NV.somenteLeitura);
  const gestorP = () => ['dono', 'gerente'].includes(perfil());
  const podeMexer = (reg) => !leitura() && CR.podeEditar(reg, perfil(), nome());
  const ve = (reg) => CR.visivel(reg, perfil(), nome());
  const N = () => raiz.NOVAS, F = () => raiz.FINANCEIRO, NUI = () => raiz.NOVAS_UI;
  const hoje = () => U.hojeISO(), agora = () => new Date().toISOString();
  const brl = (v) => (+v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
  const dBR = (iso) => (iso ? String(iso).slice(0, 10).split('-').reverse().join('/') : '—');
  const cliente = (id) => U.K.cad.cliente(id) || { nome: 'Cliente removido' };
  const loja = () => est().lojaAtual || '';
  const opt = (pares, sel) => pares.map(([v, n]) => `<option value="${U.esc(v)}" ${String(sel) === String(v) ? 'selected' : ''}>${U.esc(n)}</option>`).join('');
  const ic = (d) => `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
  const I = {
    funil: ic(ICONE), tarefa: ic('<path d="M9 6h11M9 12h11M9 18h11M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2"/>'), alerta: ic('<path d="M12 3 2 20h20L12 3zM12 10v4M12 17v.5"/>'),
    pessoa: ic('<path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21v-1a8 8 0 0 1 16 0v1"/>'), safra: ic('<path d="M12 21V9M12 13c-4 0-6-3-6-7 4 0 6 3 6 7zM12 11c3 0 5-2 5-6-3 0-5 2-5 6zM5 21h14"/>'),
    zap: ic('<path d="M4 20l1.3-4A8 8 0 1 1 8 18.7z"/><path d="M9 9.5c.5 2.5 2.5 4.5 5 5l1.2-1.4 2 .9c-.3 1.4-1.4 2-2.6 2-3.9-.4-6.6-3.1-7-7 0-1.2.6-2.3 2-2.6l.9 2z"/>'),
    mais: ic('<path d="M12 5v14M5 12h14"/>'), moeda: ic('<path d="M12 3v18M17 7.5c0-1.9-2.2-3-5-3s-5 1.1-5 3 2.2 2.7 5 3.2 5 1.4 5 3.3-2.2 3-5 3-5-1.1-5-3"/>'), check: ic('<path d="M5 12.5l4.5 4.5L19 7.5"/>')
  };
  const vazio = (t) => `<p class="vazio">${t}</p>`;
  const cab = (titulo, sub, botoes = '') => `<div class="titulo"><div><h1>${titulo}</h1><p>${sub}</p></div>${botoes ? `<div class="fin-acoes">${botoes}</div>` : ''}</div>`;
  const soLeitura = () => (leitura() ? '<span class="tag declarado">Só leitura</span>' : '');
  function gravar(texto) { U.log('crm', texto); U.salvar(); }
  const tente = (fn) => { try { return fn(); } catch (e) { U.toast(e.message, true); return null; } };
  const vendedores = () => { const l = U.K.cad.usuarios().filter((u) => ['vendedor', 'gerente', 'dono'].includes(u.perfil)).map((u) => u.nome); return l.includes(nome()) ? l : [nome()].concat(l); };
  const SAFRA = () => U.SAFRA || {};
  const nomeTipo = (t) => (U.NOMES[t] || t || 'Máquina');
  const interesseTxt = (l) => `${l.interesse.condicao === 'usada' ? 'Usado' : 'Nova'} · ${nomeTipo(l.interesse.tipo)}${l.interesse.marca ? ' ' + l.interesse.marca : ''}${l.interesse.modelo ? ' ' + l.interesse.modelo : ''}`;
  const tagEtapa = (e) => `<span class="nc-tag ${e === 'ganho' ? 'ok' : e === 'perdido' ? 'risco' : ['proposta', 'negociacao'].includes(e) ? 'ouro' : ''}">${CR.NOME_ETAPA[e]}</span>`;
  const linkFollow = (l) => { const c = cliente(l.cliente), p = l.proposta && N() ? N().proposta(est(), l.proposta) : null; return CR.linkWhats(c.telefone, CR.mensagemFollowup({ nome: c.nome, revenda: U.A.revenda.nome, vendedor: l.vendedor, interesse: l.interesse, etapa: l.etapa, proposta: p && N().emAberto(p) ? N().nomeItem(N().item(est(), p.item)) : '' })); };
  const estilo = () => (NUI() ? NUI().estilo() : null);
  const fil = { vendedor: '', q: '' };
  const meus = () => CR.garantir(est()).leads.filter((l) => ve(l) && (!loja() || !l.loja || l.loja === loja()) && (!fil.vendedor || l.vendedor === fil.vendedor));
  const filtroVend = () => (gestorP() || ['financeiro', 'auditor'].includes(perfil()) ? `<div class="campo"><label for="crm-vend">Vendedor</label><select id="crm-vend">${opt([['', 'Todos']].concat(vendedores().map((v) => [v, v])), fil.vendedor)}</select></div>` : '');
  const ligarFiltro = (fn) => { const s = U.$('#crm-vend'); if (s) s.onchange = () => { fil.vendedor = s.value; fn(); }; };
  const botoesTopo = () => (leitura() ? soLeitura() : `<button class="btn btn-ouro" type="button" data-crm-novo="lead">${I.mais}<span>Nova oportunidade</span></button><button class="btn btn-linha" type="button" data-crm-novo="tarefa">${I.tarefa}<span>Tarefa</span></button>`);
  function ligarComuns(rerender) {
    U.$$('[data-crm-novo]', U.tela).forEach((b) => b.onclick = () => (b.dataset.crmNovo === 'lead' ? formLead() : formAtividade({ tarefa: true })));
    U.$$('[data-lead]', U.tela).forEach((x) => { x.onclick = (e) => { if (e.target.closest('a,button:not([data-lead])')) return; detalheLead(x.dataset.lead); }; x.onkeydown = (e) => { if (e.key === 'Enter' && e.target === x) detalheLead(x.dataset.lead); }; });
    U.$$('[data-cli]', U.tela).forEach((x) => { x.onclick = (e) => { if (e.target.closest('a,button:not([data-cli])')) return; fichaCliente(x.dataset.cli); }; x.onkeydown = (e) => { if (e.key === 'Enter' && e.target === x) fichaCliente(x.dataset.cli); }; });
    U.$$('[data-feita]', U.tela).forEach((b) => b.onclick = (e) => { e.stopPropagation(); concluirAtiv(b.dataset.feita, rerender); });
  }
  function concluirAtiv(id, depois) {
    const a = CR.garantir(est()).atividades.find((x) => x.id === id); if (!a) return;
    if (!podeMexer({ vendedor: a.responsavel })) { U.toast('Só o responsável, o gerente ou o dono concluem.', true); return; }
    U.abrirCamada('modal', `<h2>Concluir</h2><p class="sub">${U.esc(CR.TIPOS_ATIV[a.tipo])}: ${U.esc(a.texto)}</p><div class="campo" style="margin-top:12px"><label for="cc-r">Como foi</label><input id="cc-r" placeholder="Ex.: pediu proposta com troca"></div>
      <div class="campo"><label for="cc-prox">Próximo passo (cria tarefa)</label><input id="cc-prox" type="date" value=""></div><div class="acoes"><button class="btn btn-ouro" type="button" id="cc-ok">Concluir</button></div>`, (c) => {
      U.$('#cc-ok', c).onclick = () => {
        const r = U.$('#cc-r', c).value.trim(), prox = U.$('#cc-prox', c).value;
        CR.concluir(est(), id, { resultado: r, quem: nome(), agora: agora() });
        if (a.lead) { const l = CR.lead(est(), a.lead); if (l && l.etapa === 'novo') CR.mover(est(), l.id, 'contato', { quem: nome(), agora: agora() }); if (l && a.tipo === 'visita') CR.avancar(est(), l.id, 'visita', { quem: nome(), agora: agora() }); }
        if (prox) tente(() => CR.registrarAtividade(est(), { lead: a.lead, cliente: a.cliente, tipo: 'ligacao', texto: 'Próximo passo: ' + (r || a.texto), data: prox, responsavel: a.responsavel }, nome(), agora()));
        gravar(`Atividade concluída: ${a.texto}${r ? ' · ' + r : ''}`); U.toast('Concluída.'); U.fecharCamada(true); (depois || U.rota)();
      };
    });
  }

  // ---------- FUNIL ----------
  function telaFunil() {
    const ls = meus(), fn = CR.funil(est(), { vendedor: fil.vendedor, loja: loja(), perfil: perfil(), nome: nome() }), rs = CR.resumo(est(), { hoje: hoje(), perfil: perfil(), nome: nome(), loja: loja() });
    U.tela.innerHTML = cab('Funil de vendas', `Do primeiro contato até a venda faturada${perfil() === 'vendedor' ? ' · suas oportunidades' : ''}. Perdido sempre com o motivo.`, botoesTopo()) + `
      <div class="kpis fin-k">
        <div class="kpi k-marfim"><span class="rot">${I.funil}Oportunidades abertas</span><span class="val">${fn.abertos}</span><span class="exp">${brl(fn.valorAberto)} em negociação</span></div>
        <a class="kpi ${rs.atrasadas ? 'k-risco' : ''}" href="#crm-agenda"><span class="rot">${I.tarefa}Tarefas para hoje</span><span class="val">${rs.tarefasHoje}</span><span class="exp">${rs.atrasadas} atrasadas · ${rs.semFollowup} sem follow-up</span></a>
        <div class="kpi k-salvia"><span class="rot">${I.check}Ganhos e perdidos</span><span class="val">${fn.ganhos} / ${fn.perdidos}</span><span class="exp">conversão ${isFinite(fn.conversao) ? U.pct(fn.conversao) : '—'}</span></div>
        <div class="kpi"><span class="rot">${I.alerta}Principal motivo de perda</span><span class="val nc-txt">${U.esc((Object.entries(fn.motivos).sort((a, b) => b[1] - a[1])[0] || ['—'])[0])}</span><span class="exp">${Object.values(fn.motivos).reduce((a, b) => a + b, 0)} perdidas</span></div>
      </div>
      <section class="painel"><div class="campos fin-campos" style="margin-bottom:12px">${filtroVend()}</div>
        <div class="nc-kanban">${CR.ETAPAS.map(([k, n]) => { const col = ls.filter((l) => l.etapa === k).sort((a, b) => b.atualizadoEm.localeCompare(a.atualizadoEm)); const v = col.reduce((s, l) => s + (l.valor || 0), 0);
          return `<div class="nc-col"><h3>${n}<span>${col.length}${v ? ' · ' + U.mil(v) : ''}</span></h3>${col.slice(0, 30).map((l) => `<button type="button" class="nc-card" data-lead="${l.id}"><b>${U.esc(cliente(l.cliente).nome)}</b><span>${U.esc(interesseTxt(l))}</span><span>${brl(l.valor)} · ${U.esc(l.vendedor)} · ${U.esc(CR.ORIGENS[l.origem] || '')}</span>${l.perda ? `<span>Motivo: ${U.esc(l.perda.motivo)}</span>` : ''}</button>`).join('') || '<span class="sub" style="padding:4px">—</span>'}</div>`; }).join('')}</div></section>`;
    ligarFiltro(telaFunil); ligarComuns(telaFunil);
  }

  // ---------- LEADS (lista) ----------
  const fl = { etapa: 'abertas', origem: '' };
  function telaLeads() {
    const ls = meus().filter((l) => (fl.etapa === 'abertas' ? CR.ABERTAS.includes(l.etapa) : fl.etapa === 'todas' || l.etapa === fl.etapa) && (!fl.origem || l.origem === fl.origem)
      && (!fil.q || [cliente(l.cliente).nome, l.interesse.modelo, l.vendedor, cliente(l.cliente).cidade].join(' ').toLowerCase().includes(fil.q.toLowerCase()))).sort((a, b) => b.atualizadoEm.localeCompare(a.atualizadoEm));
    const at = CR.garantir(est()).atividades;
    U.tela.innerHTML = cab('Oportunidades', 'Cada lead é um cliente do cadastro comum (sem duplicar) com o que procura, a origem e o vendedor.', botoesTopo()) + `
      <section class="painel"><div class="fin-filtros"><div class="abas-modo" role="group" aria-label="Etapa">${[['abertas', 'Abertas']].concat(CR.ETAPAS).concat([['todas', 'Todas']]).map(([v, n]) => `<button type="button" data-fe="${v}" aria-pressed="${fl.etapa === v}">${n}</button>`).join('')}</div>
        <div class="campos fin-campos"><div class="campo"><label for="ld-q">Buscar</label><input id="ld-q" value="${U.esc(fil.q)}" placeholder="Cliente, cidade, modelo"></div><div class="campo"><label for="ld-o">Origem</label><select id="ld-o">${opt([['', 'Todas']].concat(Object.entries(CR.ORIGENS)), fl.origem)}</select></div>${filtroVend()}</div></div>
        ${ls.length ? `<div class="tabela-wrap"><table class="tabela fin-tab nc-t"><thead><tr><th>Cliente</th><th>Procura</th><th>Origem</th><th>Etapa</th><th class="n">Valor</th><th>Próximo passo</th></tr></thead><tbody>
          ${ls.map((l) => { const c = cliente(l.cliente), px = at.filter((a) => a.lead === l.id && !a.feita).sort((a, b) => a.data.localeCompare(b.data))[0]; return `<tr class="clicavel" tabindex="0" data-lead="${l.id}"><td><b>${U.esc(c.nome)}</b><span class="fin-sub">${U.esc([c.cidade, l.vendedor].filter(Boolean).join(' · '))}</span></td><td>${U.esc(interesseTxt(l))}</td><td>${U.esc(CR.ORIGENS[l.origem] || l.origem)}</td><td>${tagEtapa(l.etapa)}</td><td class="n">${brl(l.valor)}</td>
            <td>${px ? `<span class="${px.data < hoje() ? 'neg' : ''}">${dBR(px.data)}</span><span class="fin-sub">${U.esc(px.texto)}</span>` : CR.ABERTAS.includes(l.etapa) ? '<span class="nc-tag risco">Sem próximo passo</span>' : '—'}</td></tr>`; }).join('')}</tbody></table></div>` : vazio('Nenhuma oportunidade com estes filtros.')}
        <div class="fin-rodape"><span>${ls.length} oportunidades</span>${['dono', 'gerente', 'auditor'].includes(perfil()) ? '<button class="btn btn-linha" type="button" id="ld-csv">Exportar planilha</button>' : ''}</div></section>`;
    U.$$('[data-fe]', U.tela).forEach((b) => b.onclick = () => { fl.etapa = b.dataset.fe; telaLeads(); });
    U.$('#ld-o').onchange = (e) => { fl.origem = e.target.value; telaLeads(); };
    U.$('#ld-q').oninput = (e) => { fil.q = e.target.value; clearTimeout(telaLeads.t); telaLeads.t = setTimeout(() => { telaLeads(); const q = U.$('#ld-q'); q.focus(); q.setSelectionRange(q.value.length, q.value.length); }, 250); };
    const csv = U.$('#ld-csv'); if (csv) csv.onclick = () => U.baixarCSV(`anshur-oportunidades-${hoje()}.csv`, [['Cliente', 'Cidade', 'Procura', 'Origem', 'Etapa', 'Motivo da perda', 'Valor', 'Vendedor', 'Criado em', 'Id']].concat(ls.map((l) => [cliente(l.cliente).nome, cliente(l.cliente).cidade, interesseTxt(l), CR.ORIGENS[l.origem], CR.NOME_ETAPA[l.etapa], l.perda ? l.perda.motivo : '', l.valor, l.vendedor, dBR(l.criadoEm), l.id])));
    ligarFiltro(telaLeads); ligarComuns(telaLeads);
  }
  function formLead(pre = {}) {
    if (leitura()) { U.toast('Seu perfil só lê.', true); return; }
    const c0 = pre.cliente ? cliente(pre.cliente) : null;
    U.abrirCamada('modal larga-modal', `<h2>Nova oportunidade</h2><p class="sub">Se o cliente já existe (mesmo CPF/CNPJ ou mesmo nome), o Anshur usa o cadastro que já existe.</p>
      <form class="campos" style="margin-top:12px" novalidate>
        <div class="campo"><label for="nl-nome">Cliente *</label><input id="nl-nome" list="dl-nl" value="${U.esc(c0 ? c0.nome : '')}" autocomplete="off"><datalist id="dl-nl">${U.K.cad.clientes().map((x) => `<option value="${U.esc(x.nome)}">`).join('')}</datalist></div>
        <div class="campo"><label for="nl-tel">WhatsApp / telefone</label><input id="nl-tel" inputmode="tel" value="${U.esc(c0 ? c0.telefone : '')}"></div>
        <div class="campo"><label for="nl-doc">CPF / CNPJ</label><input id="nl-doc" value="${U.esc(c0 ? c0.documento : '')}"></div>
        <div class="campo"><label for="nl-cid">Cidade</label><input id="nl-cid" list="dl-cidade" value="${U.esc(c0 ? c0.cidade : '')}"></div>
        <div class="campo"><label for="nl-ori">Origem</label><select id="nl-ori">${opt(Object.entries(CR.ORIGENS), pre.origem || 'whatsapp')}</select></div>
        <div class="campo"><label for="nl-cond">Procura</label><select id="nl-cond">${opt([['nova', 'Máquina nova'], ['usada', 'Usado']], pre.condicao || 'nova')}</select></div>
        <div class="campo"><label for="nl-tipo">Tipo</label><select id="nl-tipo">${opt(Object.entries(U.NOMES), pre.tipo || 'trator')}</select></div>
        <div class="campo"><label for="nl-mod">Marca / modelo (opcional)</label><input id="nl-mod" list="dl-modelo" value="${U.esc(pre.modelo || '')}"></div>
        <div class="campo"><label for="nl-val">Valor estimado (R$)</label><input id="nl-val" inputmode="decimal" value="${pre.valor || ''}"></div>
        <div class="campo"><label for="nl-vend">Vendedor</label><select id="nl-vend" ${perfil() === 'vendedor' ? 'disabled' : ''}>${opt(vendedores().map((v) => [v, v]), nome())}</select></div>
        <div class="campo"><label for="nl-prox">Próximo contato</label><input id="nl-prox" type="date" value="${CR.somarDias(hoje(), 1)}"></div>
        <div class="campo inteiro"><label for="nl-obs">Observação</label><input id="nl-obs" placeholder="${U.esc(pre.obs || 'Ex.: quer para a próxima safra, aceita usado na troca')}" value="${U.esc(pre.obsValor || '')}"></div></form>
      <div class="acoes"><button class="btn btn-ouro" type="button" id="nl-ok">Salvar</button><button class="btn btn-linha" type="button" id="nl-nao">Cancelar</button></div>`, (c) => {
      const $ = (s) => U.$(s, c);
      $('#nl-nome').onchange = () => { const k = U.K.cad.achar(U.K.cad.clientes(), { nome: $('#nl-nome').value }); if (k) { if (!$('#nl-tel').value) $('#nl-tel').value = k.telefone || ''; if (!$('#nl-doc').value) $('#nl-doc').value = k.documento || ''; if (!$('#nl-cid').value) $('#nl-cid').value = k.cidade || ''; } };
      $('#nl-nao').onclick = () => U.fecharCamada();
      $('#nl-ok').onclick = () => {
        const nm = $('#nl-nome').value.trim(); if (!nm) { U.toast('Informe o cliente.', true); return; }
        const mod = $('#nl-mod').value.trim(), m = U.A.modelos.find((x) => x.modelo === mod);
        const r = tente(() => CR.criarLead(est(), { nome: nm, telefone: $('#nl-tel').value.trim(), documento: $('#nl-doc').value.trim(), cidade: $('#nl-cid').value.trim(), origem: $('#nl-ori').value,
          interesse: { tipo: $('#nl-tipo').value, condicao: $('#nl-cond').value, marca: m ? m.marca : '', modelo: mod }, valor: U.num($('#nl-val').value), vendedor: $('#nl-vend').value, loja: loja(), obs: $('#nl-obs').value.trim() },
          { garantirCliente: (d) => U.K.cad.garantir('clientes', d), quem: nome(), agora: agora() }));
        if (!r) return;
        if (r.duplicado) { U.toast(`${r.cliente.nome} já tem esta oportunidade aberta: abrindo a que existe.`); U.fecharCamada(true); detalheLead(r.lead.id); return; }
        const prox = $('#nl-prox').value; if (prox) CR.registrarAtividade(est(), { lead: r.lead.id, tipo: $('#nl-ori').value === 'whatsapp' ? 'whatsapp' : 'ligacao', texto: 'Primeiro contato', data: prox, responsavel: r.lead.vendedor }, nome(), agora());
        gravar(`Oportunidade: ${r.cliente.nome} · ${interesseTxt(r.lead)} (${CR.ORIGENS[r.lead.origem]})`); U.toast('Oportunidade criada.'); U.fecharCamada(true); U.rota(); setTimeout(() => detalheLead(r.lead.id), 260);
      };
    });
  }
  // comprador de usado: o mesmo cadastro que o pátio usa para o casamento automático (Usados › Compradores)
  function virarComprador(l) {
    const c = cliente(l.cliente), pf = CR.perfilDe(est(), l.cliente);
    U.formulario('Cadastrar como comprador de usado', [{ k: 'tipo', r: 'Procura', tipo: 'select', ops: Object.entries(U.NOMES) }, { k: 'marcas', r: 'Marca preferida (opcional)', lista: 'dl-marca' }, { k: 'anoMin', r: 'Ano mínimo', num: true }, { k: 'precoMax', r: 'Paga até (R$)', num: true, obr: true }, { k: 'obs', r: 'Observação', inteiro: true }],
      { tipo: l.interesse.tipo || 'trator', marcas: l.interesse.marca || '', precoMax: l.valor || '', obs: l.obs || '' }, (v) => {
        const comp = { id: 'C' + Date.now(), nome: c.nome, fazenda: pf && pf.fazendas[0] ? pf.fazendas[0].nome : '', cidade: c.cidade || '', telefone: c.telefone || '', tipo: v.tipo, marcas: v.marcas, anoMin: v.anoMin, precoMax: v.precoMax, obs: v.obs, desde: hoje(), cliente: c.id, lead: l.id };
        est().extras.compradores.push(comp); U.A.compradores.push(comp); CR.editarLead(est(), l.id, { comprador: comp.id });
        const m = U.C.patio().filter((t) => raiz.RETENCAO && raiz.RETENCAO.compradoresPara(t, [comp]).length);
        gravar(`Comprador de usado a partir do CRM: ${c.nome} procurando ${nomeTipo(comp.tipo).toLowerCase()}`); U.fecharCamada(true);
        U.toast(m.length ? `${c.nome} combina com ${m.length} ${m.length === 1 ? 'máquina' : 'máquinas'} do pátio.` : 'Comprador cadastrado: o Anshur avisa no Hoje quando entrar uma máquina que combine.'); detalheLead(l.id);
      }, 'Entra na lista de compradores do pátio: quando entrar um usado que combine, aparece no Hoje com o WhatsApp pronto.');
  }
  function detalheLead(id) {
    const l = CR.lead(est(), id); if (!l || !ve(l)) return;
    const c = cliente(l.cliente), mex = podeMexer(l), at = CR.garantir(est()).atividades.filter((a) => a.lead === l.id).sort((a, b) => b.data.localeCompare(a.data));
    const comp = l.comprador ? (U.A.compradores || []).find((x) => x.id === l.comprador) : null;
    const casam = comp && raiz.RETENCAO ? U.C.patio().filter((t) => raiz.RETENCAO.compradoresPara(t, [comp]).length) : [];
    const prop = l.proposta && N() ? N().proposta(est(), l.proposta) : null;
    const li = (r, v) => (v ? `<li><span>${r}</span><b>${v}</b></li>` : '');
    U.abrirCamada('gaveta', `<h2>${U.esc(c.nome)}</h2><p class="sub" style="margin:4px 0 12px">${tagEtapa(l.etapa)} ${U.esc(interesseTxt(l))}</p>
      <ul class="lista-motivos">${li('Telefone', U.esc(U.mascarar(c.telefone)))}${li('Cidade', U.esc(c.cidade))}${li('Origem', U.esc(CR.ORIGENS[l.origem]))}${li('Valor estimado', l.valor ? brl(l.valor) : '')}${li('Vendedor', U.esc(l.vendedor))}${li('Desde', dBR(l.criadoEm))}
        ${li('Proposta', prop ? `<a class="link" href="#nv-propostas" data-prop-l="${prop.id}">${brl(prop.preco)} · ${U.esc(N().SIT_PROP[N().situacaoProposta(prop, hoje())])}</a>` : '')}${li('Comprador de usado', comp ? `até ${brl(comp.precoMax)} · combina com ${casam.length} no pátio` : '')}${li('Perdida', l.perda ? U.esc(l.perda.motivo) : '')}${li('Observação', U.esc(l.obs))}</ul>
      ${casam.length ? `<p class="sub" style="margin-top:8px">No pátio: ${casam.slice(0, 4).map((t) => U.esc(`${t.marca} ${t.modelo} ${t.ano}`)).join(', ')}</p>` : ''}
      ${mex && CR.ABERTAS.includes(l.etapa) ? `<div class="campos" style="margin-top:12px"><div class="campo"><label for="dl-et">Mover para</label><select id="dl-et">${opt(CR.ETAPAS, l.etapa)}</select></div><div class="campo" id="dl-mo-c" hidden><label for="dl-mo">Motivo da perda *</label><select id="dl-mo">${opt(CR.MOTIVOS_PERDA.map((x) => [x, x]), '')}</select></div></div>` : ''}
      <h3 style="margin:14px 0 6px">Atividades</h3>${at.length ? `<ul class="nc-lista">${at.map((a) => `<li><div><b>${U.esc(CR.TIPOS_ATIV[a.tipo])} · ${U.esc(a.texto)}</b><span>${dBR(a.data)}${a.hora ? ' ' + a.hora : ''} · ${U.esc(a.responsavel)}${a.resultado ? ' · ' + U.esc(a.resultado) : ''}</span></div>${a.feita ? '<span class="nc-tag ok">Feita</span>' : mex ? `<button class="btn btn-linha btn-p" type="button" data-feita-l="${a.id}">Concluir</button>` : `<span class="nc-tag ${a.data < hoje() ? 'risco' : 'ouro'}">${a.data < hoje() ? 'Atrasada' : 'Marcada'}</span>`}</li>`).join('')}</ul>` : vazio('Nenhuma atividade ainda.')}
      <h3 style="margin:14px 0 6px">Etapas</h3><ul class="nc-tl">${l.etapas.slice().reverse().map((x) => `<li><span>${dBR(x.quando)}</span><b>${U.esc(CR.NOME_ETAPA[x.etapa])}${x.motivo ? ': ' + U.esc(x.motivo) : ''}</b><span>${U.esc(x.por || '')}</span></li>`).join('')}</ul>
      <div class="acoes" style="flex-wrap:wrap">${c.telefone ? `<a class="btn btn-ouro" target="_blank" rel="noopener" href="${U.esc(linkFollow(l))}" id="dl-wa">${I.zap}Follow-up no WhatsApp</a>` : ''}
        ${mex ? '<button class="btn btn-linha" type="button" id="dl-at">Registrar atividade</button><button class="btn btn-linha" type="button" id="dl-ta">Agendar tarefa</button>' : ''}
        ${mex && CR.ABERTAS.includes(l.etapa) && l.interesse.condicao !== 'usada' && NUI() && !(prop && N().emAberto(prop)) ? '<button class="btn btn-linha" type="button" id="dl-pp">Fazer proposta de nova</button>' : ''}
        ${mex && CR.ABERTAS.includes(l.etapa) && l.interesse.condicao === 'usada' && !comp ? '<button class="btn btn-linha" type="button" id="dl-cp">Cadastrar como comprador de usado</button>' : ''}
        <button class="btn btn-linha" type="button" id="dl-ficha">Ficha do cliente</button></div>`, (cx) => {
      const b = (s, fn) => { const e = U.$(s, cx); if (e) e.onclick = fn; };
      const et = U.$('#dl-et', cx);
      if (et) et.onchange = () => {
        U.$('#dl-mo-c', cx).hidden = et.value !== 'perdido';
        if (et.value === 'perdido') { U.$('#dl-mo-c', cx).insertAdjacentHTML('beforeend', U.$('#dl-mo-ok', cx) ? '' : '<button class="btn btn-perigo btn-p" type="button" id="dl-mo-ok" style="margin-top:8px">Marcar perdida</button>'); U.$('#dl-mo-ok', cx).onclick = () => mudar('perdido', U.$('#dl-mo', cx).value); return; }
        mudar(et.value);
      };
      const mudar = (etapa, motivo) => { const r = tente(() => CR.mover(est(), l.id, etapa, { motivo, quem: nome(), agora: agora() })); if (!r) return; if (etapa === 'perdido' && l.proposta && N()) { const p = N().proposta(est(), l.proposta); if (p && N().emAberto(p)) tente(() => N().perder(est(), p.id, motivo, { quem: nome(), agora: agora() })); } gravar(`Oportunidade ${c.nome}: ${CR.NOME_ETAPA[etapa]}${motivo ? ' (' + motivo + ')' : ''}`); U.toast('Etapa: ' + CR.NOME_ETAPA[etapa] + '.'); U.rota(); setTimeout(() => detalheLead(l.id), 260); };
      U.$$('[data-feita-l]', cx).forEach((x) => x.onclick = () => concluirAtiv(x.dataset.feitaL, () => { U.rota(); setTimeout(() => detalheLead(l.id), 260); }));
      b('#dl-at', () => formAtividade({ lead: l.id, feita: true }));
      b('#dl-ta', () => formAtividade({ lead: l.id, tarefa: true }));
      b('#dl-pp', () => NUI().formProposta({ lead: l.id, cliente: l.cliente }));
      b('#dl-cp', () => virarComprador(l));
      b('#dl-ficha', () => fichaCliente(l.cliente));
      const pl = U.$('[data-prop-l]', cx); if (pl) pl.onclick = (e) => { e.preventDefault(); NUI().detalheProposta(pl.dataset.propL); };
      const wa = U.$('#dl-wa', cx); if (wa && mex) wa.addEventListener('click', () => { CR.registrarAtividade(est(), { lead: l.id, tipo: 'whatsapp', texto: 'Follow-up enviado pelo WhatsApp', data: hoje(), feita: true, responsavel: nome() }, nome(), agora()); if (l.etapa === 'novo') CR.mover(est(), l.id, 'contato', { quem: nome(), agora: agora() }); gravar(`Follow-up no WhatsApp: ${c.nome}`); });
    });
  }
  // pre: { lead, cliente, tarefa (futura), feita (já aconteceu) }
  function formAtividade(pre = {}) {
    if (leitura()) return;
    const ls = CR.garantir(est()).leads.filter((l) => CR.ABERTAS.includes(l.etapa) && podeMexer(l));
    U.abrirCamada('modal', `<h2>${pre.feita ? 'Registrar atividade' : 'Agendar tarefa'}</h2><form class="campos" style="margin-top:12px" novalidate>
      <div class="campo inteiro"><label for="na-l">Oportunidade</label><select id="na-l">${opt([['', 'Sem oportunidade (tarefa solta)']].concat(ls.map((l) => [l.id, `${cliente(l.cliente).nome} · ${interesseTxt(l)}`])), pre.lead || '')}</select></div>
      <div class="campo"><label for="na-t">Tipo</label><select id="na-t">${opt(Object.entries(CR.TIPOS_ATIV), pre.feita ? 'ligacao' : 'tarefa')}</select></div>
      <div class="campo"><label for="na-d">Data</label><input id="na-d" type="date" value="${pre.feita ? hoje() : CR.somarDias(hoje(), 1)}"></div><div class="campo"><label for="na-h">Hora</label><input id="na-h" type="time"></div>
      <div class="campo"><label for="na-r">Responsável</label><select id="na-r" ${perfil() === 'vendedor' ? 'disabled' : ''}>${opt(vendedores().map((v) => [v, v]), nome())}</select></div>
      <div class="campo inteiro"><label for="na-x">${pre.feita ? 'O que aconteceu' : 'O que fazer'} *</label><input id="na-x" placeholder="${pre.feita ? 'Ex.: ligou, quer ver a máquina sábado' : 'Ex.: ligar para confirmar a visita'}"></div></form>
      <div class="acoes"><button class="btn btn-ouro" type="button" id="na-ok">Salvar</button></div>`, (c) => {
      U.$('#na-ok', c).onclick = () => {
        const lid = U.$('#na-l', c).value;
        const a = tente(() => CR.registrarAtividade(est(), { lead: lid, tipo: U.$('#na-t', c).value, data: U.$('#na-d', c).value, hora: U.$('#na-h', c).value, responsavel: U.$('#na-r', c).value, texto: U.$('#na-x', c).value, feita: !!pre.feita }, nome(), agora()));
        if (!a) return;
        if (pre.feita && lid) { const l = CR.lead(est(), lid); if (l && l.etapa === 'novo') CR.mover(est(), lid, 'contato', { quem: nome(), agora: agora() }); if (l && a.tipo === 'visita') CR.avancar(est(), lid, 'visita', { quem: nome(), agora: agora() }); }
        gravar(`${pre.feita ? 'Atividade' : 'Tarefa'}: ${a.texto}${a.lead ? ' · ' + cliente(a.cliente).nome : ''} (${dBR(a.data)}, ${a.responsavel})`); U.toast(pre.feita ? 'Atividade registrada.' : 'Tarefa agendada.'); U.fecharCamada(true); U.rota(); if (lid) setTimeout(() => detalheLead(lid), 260);
      };
    });
  }

  // ---------- AGENDA: tarefas e follow-ups ----------
  function telaAgenda() {
    const resp = perfil() === 'vendedor' ? '' : fil.vendedor;
    const ag = CR.agenda(est(), { hoje: hoje(), perfil: perfil(), nome: nome(), responsavel: resp }), sf = CR.semFollowup(est(), { hoje: hoje(), perfil: perfil(), nome: nome() }).filter((x) => !fil.vendedor || x.lead.vendedor === fil.vendedor);
    const linha = (a) => { const l = a.lead ? CR.lead(est(), a.lead) : null; return `<li ${l ? `class="clicavel" tabindex="0" data-lead="${l.id}"` : ''}><div><b>${U.esc(CR.TIPOS_ATIV[a.tipo])} · ${U.esc(a.texto)}</b><span>${dBR(a.data)}${a.hora ? ' ' + a.hora : ''} · ${U.esc(a.responsavel)}${l ? ' · ' + U.esc(cliente(l.cliente).nome) : ''}</span></div>
      <span class="fin-acoes">${l && cliente(l.cliente).telefone ? `<a class="btn btn-linha btn-p" target="_blank" rel="noopener" href="${U.esc(linkFollow(l))}">${I.zap}WhatsApp</a>` : ''}${podeMexer({ vendedor: a.responsavel }) ? `<button class="btn btn-linha btn-p" type="button" data-feita="${a.id}">Concluir</button>` : ''}</span></li>`; };
    U.tela.innerHTML = cab('Agenda comercial', `Tarefas com data e responsável${perfil() === 'vendedor' ? ' (as suas)' : ''} e oportunidades paradas que pedem follow-up.`, botoesTopo()) + `
      ${filtroVend() ? `<div class="campos fin-campos" style="margin-bottom:12px">${filtroVend()}</div>` : ''}
      <div class="grade-2"><section class="painel"><div class="painel-cab"><h2>${I.alerta}Atrasadas</h2><p>${ag.atrasadas.length}</p></div>${ag.atrasadas.length ? `<ul class="nc-lista">${ag.atrasadas.map(linha).join('')}</ul>` : vazio('Nada atrasado.')}</section>
        <section class="painel"><div class="painel-cab"><h2>${I.tarefa}Hoje</h2><p>${ag.hoje.length}</p></div>${ag.hoje.length ? `<ul class="nc-lista">${ag.hoje.map(linha).join('')}</ul>` : vazio('Nenhuma tarefa para hoje.')}</section></div>
      <section class="painel bloco"><div class="painel-cab"><h2>${I.zap}Sem follow-up há 5 dias ou mais</h2><p>Oportunidades abertas sem nada marcado. O botão abre o WhatsApp com a mensagem pronta; você confere e envia.</p></div>
        ${sf.length ? `<ul class="nc-lista">${sf.slice(0, 20).map((x) => { const c = cliente(x.lead.cliente); return `<li class="clicavel" tabindex="0" data-lead="${x.lead.id}"><div><b>${U.esc(c.nome)} · ${U.esc(interesseTxt(x.lead))}</b><span>${CR.NOME_ETAPA[x.lead.etapa]} · ${x.parado} dias sem contato · ${U.esc(x.lead.vendedor)}</span></div>${c.telefone ? `<a class="btn btn-ouro btn-p" target="_blank" rel="noopener" href="${U.esc(linkFollow(x.lead))}">${I.zap}Follow-up</a>` : '<span class="sub">sem telefone</span>'}</li>`; }).join('')}</ul>` : vazio('Todas as oportunidades abertas têm próximo passo.')}</section>
      <section class="painel bloco"><div class="painel-cab"><h2>${I.tarefa}Próximos 7 dias</h2><p>${ag.proximas.length}</p></div>${ag.proximas.length ? `<ul class="nc-lista">${ag.proximas.map(linha).join('')}</ul>` : vazio('Nada marcado.')}</section>`;
    ligarFiltro(telaAgenda); ligarComuns(telaAgenda);
  }

  // ---------- CLIENTES (cadastro comum + produtor rural) ----------
  const fc = { q: '' };
  function telaClientes() {
    const c = CR.garantir(est()), cs = U.K.cad.clientes();
    const meusIds = perfil() === 'vendedor' ? new Set(c.leads.filter((l) => l.vendedor === nome()).map((l) => l.cliente)) : null;
    const lista = cs.filter((x) => (!meusIds || meusIds.has(x.id)) && (!fc.q || [x.nome, x.documento, x.cidade].join(' ').toLowerCase().includes(fc.q.toLowerCase()))).sort((a, b) => a.nome.localeCompare(b.nome));
    U.tela.innerHTML = cab('Clientes', `O mesmo cadastro do Financeiro, da Oficina e das vendas: um cliente, uma ficha. ${meusIds ? 'Você vê os clientes das suas oportunidades.' : ''}`, botoesTopo()) + `
      <section class="painel"><div class="campos fin-campos" style="margin-bottom:12px"><div class="campo"><label for="cl-q">Buscar</label><input id="cl-q" value="${U.esc(fc.q)}" placeholder="Nome, CPF/CNPJ, cidade"></div></div>
        ${lista.length ? `<div class="tabela-wrap"><table class="tabela fin-tab nc-t"><thead><tr><th>Cliente</th><th>Fazendas</th><th class="n">Área</th><th>Culturas</th><th>Máquinas</th><th>Oportunidades</th></tr></thead><tbody>
          ${lista.slice(0, 200).map((x) => { const p = CR.perfilDe(est(), x.id), ab = c.leads.filter((l) => l.cliente === x.id && CR.ABERTAS.includes(l.etapa)).length; return `<tr class="clicavel" tabindex="0" data-cli="${x.id}"><td><b>${U.esc(x.nome)}</b><span class="fin-sub">${U.esc([x.documento && U.mascarar(x.documento), x.cidade].filter(Boolean).join(' · '))}</span></td>
            <td>${p && p.fazendas.length ? U.esc(p.fazendas.map((f) => f.nome).join(', ')) : '—'}</td><td class="n">${p && CR.areaTotal(p) ? CR.areaTotal(p).toLocaleString('pt-BR') + ' ha' : '—'}</td><td>${p ? U.esc(CR.culturas(p).join(', ')) || '—' : '—'}</td><td>${p ? p.maquinas.length : 0}</td><td>${ab ? `<span class="nc-tag ouro">${ab} aberta${ab > 1 ? 's' : ''}</span>` : '—'}</td></tr>`; }).join('')}</tbody></table></div>` : vazio('Nenhum cliente.')}</section>`;
    U.$('#cl-q').oninput = (e) => { fc.q = e.target.value; clearTimeout(telaClientes.t); telaClientes.t = setTimeout(() => { telaClientes(); const q = U.$('#cl-q'); q.focus(); q.setSelectionRange(q.value.length, q.value.length); }, 250); };
    ligarComuns(telaClientes);
  }
  // máquina do cliente: acha no cadastro comum (usados e floor plan) ou no catálogo de novas, sempre pelo chassi
  function resolverMaquina(m) {
    const k = (m.chassi && U.K.cad.maquina(m.chassi)) || (m.maquina && U.K.cad.maquina(m.maquina));
    if (k) return { nome: k.nome + (k.ano ? ' ' + k.ano : ''), origem: k.origem === 'nova' ? 'nova (floor plan)' : 'usado da revenda' };
    const nv = m.chassi && N() ? N().garantir(est()).catalogo.find((i) => i.chassi === m.chassi) : null;
    if (nv) return { nome: N().nomeItem(nv), origem: 'nova vendida pela revenda' };
    return { nome: m.descricao || 'Máquina', origem: 'de fora' };
  }
  // OS da Oficina no histórico (regra em crm-regras.js); vendedor vê só a situação, sem valores
  const osDoCliente = (cid) => CR.osParaHistorico((est().oficina && Array.isArray(est().oficina.os) ? est().oficina.os : []).filter((o) => o.cliente === cid), { semValor: perfil() === 'vendedor' });
  function historico(cid) {
    const c = cliente(cid), n = N() ? N().garantir(est()) : { propostas: [], vendas: [] }, f = F();
    const verFin = f && f.podeVer(perfil());
    return CR.historicoCliente(est(), cid, { avaliacoes: est().avaliacoes || [], propostas: n.propostas.filter(ve), vendasNovas: n.vendas.filter(ve), nomeItem: (id) => (N() ? N().nomeItem(N().item(est(), id)) : ''),
      trocas: (U.A.todasTrocas || U.A.trocas || []).filter((t) => t.vendido && t.comprador && U.K.normal(t.comprador) === U.K.normal(c.nome)),
      os: osDoCliente(cid), lancamentos: verFin ? f.garantir(est()).lancamentos : [] });
  }
  const NOME_H = { crm: 'CRM', atividade: 'Atividade', avaliacao: 'Avaliação', proposta: 'Proposta', compra: 'Compra', os: 'Oficina', financeiro: 'Financeiro' };
  function fichaCliente(cid) {
    const c = U.K.cad.cliente(cid); if (!c) return;
    const p = CR.perfilDe(est(), cid), ls = CR.garantir(est()).leads.filter((l) => l.cliente === cid && ve(l)), h = historico(cid);
    const mex = !leitura() && (gestorP() || ls.some((l) => l.vendedor === nome()) || !ls.length);
    const li = (r, v) => (v ? `<li><span>${r}</span><b>${v}</b></li>` : '');
    U.abrirCamada('gaveta', `<h2>${U.esc(c.nome)}</h2><p class="sub" style="margin:4px 0 12px">${U.esc([c.cidade, c.documento && U.mascarar(c.documento)].filter(Boolean).join(' · ')) || 'Cliente'}</p>
      <ul class="lista-motivos">${li('Telefone', U.esc(U.mascarar(c.telefone)))}${li('E-mail', U.esc(c.email))}${li('Inscrição estadual (produtor)', U.esc(p && p.ie))}${li('Área total', p && CR.areaTotal(p) ? CR.areaTotal(p).toLocaleString('pt-BR') + ' ha' : '')}${li('Culturas', p ? U.esc(CR.culturas(p).join(', ')) : '')}</ul>
      ${p && p.fazendas.length ? `<h3 style="margin:14px 0 6px">Fazendas</h3><ul class="nc-lista">${p.fazendas.map((f) => `<li><div><b>${U.esc(f.nome)}</b><span>${U.esc(f.cidade)} · ${(+f.area || 0).toLocaleString('pt-BR')} ha · ${U.esc(f.culturas.join(', '))}</span></div></li>`).join('')}</ul>` : ''}
      <h3 style="margin:14px 0 6px">Máquinas que tem</h3>${p && p.maquinas.length ? `<ul class="nc-lista">${p.maquinas.map((m) => { const r = resolverMaquina(m); return `<li><div><b>${U.esc(r.nome)}</b><span>${m.chassi ? 'Chassi ' + U.esc(m.chassi) + ' · ' : ''}${U.esc(r.origem)}${m.ano ? ' · ' + m.ano : ''}</span></div></li>`; }).join('')}</ul>` : vazio('Nenhuma máquina cadastrada.')}
      ${ls.length ? `<h3 style="margin:14px 0 6px">Oportunidades</h3><ul class="nc-lista">${ls.map((l) => `<li class="clicavel" tabindex="0" data-lead-f="${l.id}"><div><b>${U.esc(interesseTxt(l))}</b><span>${brl(l.valor)} · ${U.esc(l.vendedor)}</span></div>${tagEtapa(l.etapa)}</li>`).join('')}</ul>` : ''}
      <h3 style="margin:14px 0 6px">Histórico</h3>${h.length ? `<ul class="nc-tl">${h.slice(0, 40).map((x) => `<li><span>${dBR(x.data)}</span><b>${U.esc(x.texto)}</b><span>${NOME_H[x.tipo] || x.tipo}${x.valor != null ? ' · ' + brl(x.valor) : ''}</span></li>`).join('')}</ul>` : vazio('Nada registrado ainda.')}
      <div class="acoes" style="flex-wrap:wrap">${mex ? '<button class="btn btn-ouro" type="button" id="fc-ed">Editar dados de produtor</button><button class="btn btn-linha" type="button" id="fc-ld">Nova oportunidade</button>' : ''}</div>`, (cx) => {
      const b = (s, fn) => { const e = U.$(s, cx); if (e) e.onclick = fn; };
      b('#fc-ed', () => formPerfil(cid)); b('#fc-ld', () => formLead({ cliente: cid }));
      U.$$('[data-lead-f]', cx).forEach((x) => x.onclick = () => detalheLead(x.dataset.leadF));
    });
  }
  function formPerfil(cid) {
    const c = U.K.cad.cliente(cid), p = CR.perfilDe(est(), cid) || { ie: '', fazendas: [], maquinas: [] };
    let faz = p.fazendas.length ? p.fazendas.map((f) => Object.assign({}, f)) : [{ nome: '', cidade: c.cidade || '', area: '', culturas: [] }];
    let maq = p.maquinas.map((m) => Object.assign({}, m));
    const maqsCad = U.K.cad.maquinas().filter((m) => m.vendido);
    const desenhar = (cx) => {
      U.$('#pf-faz', cx).innerHTML = faz.map((f, k) => `<div class="nc-faz"><div class="campo"><label>Fazenda</label><input data-f="${k}|nome" value="${U.esc(f.nome)}"></div><div class="campo"><label>Cidade</label><input data-f="${k}|cidade" value="${U.esc(f.cidade)}"></div>
        <div class="campo"><label>Área (ha)</label><input data-f="${k}|area" inputmode="decimal" value="${f.area || ''}"></div><div class="campo"><label>Culturas (vírgula)</label><input data-f="${k}|culturas" list="dl-cult" value="${U.esc((f.culturas || []).join(', '))}"></div></div>`).join('');
      U.$('#pf-maq', cx).innerHTML = maq.map((m, k) => `<div class="nc-faz"><div class="campo"><label>Chassi</label><input data-m="${k}|chassi" value="${U.esc(m.chassi)}"></div><div class="campo"><label>Descrição</label><input data-m="${k}|descricao" value="${U.esc(m.descricao)}"></div>
        <div class="campo"><label>Tipo</label><select data-m="${k}|tipo">${opt([['', '—']].concat(Object.entries(U.NOMES)), m.tipo)}</select></div><div class="campo"><label>Ano</label><input data-m="${k}|ano" inputmode="numeric" value="${m.ano || ''}"></div></div>`).join('') || '<p class="sub">Nenhuma máquina.</p>';
    };
    const ler = (cx) => {
      U.$$('[data-f]', cx).forEach((i) => { const [k, campo] = i.dataset.f.split('|'); faz[+k][campo] = campo === 'culturas' ? i.value.split(',').map((x) => x.trim()).filter(Boolean) : campo === 'area' ? U.num(i.value) : i.value; });
      U.$$('[data-m]', cx).forEach((i) => { const [k, campo] = i.dataset.m.split('|'); maq[+k][campo] = campo === 'ano' ? U.num(i.value) : i.value; });
    };
    U.abrirCamada('modal larga-modal', `<h2>Produtor rural: ${U.esc(c.nome)}</h2><p class="sub">Complementa o cadastro comum (nome, CPF/CNPJ e telefone ficam lá). Máquinas ligadas pelo chassi.</p>
      <div class="campos" style="margin-top:12px"><div class="campo"><label for="pf-doc">CPF / CNPJ</label><input id="pf-doc" value="${U.esc(c.documento || '')}" ${c.documento ? 'disabled' : ''}></div><div class="campo"><label for="pf-ie">Inscrição estadual</label><input id="pf-ie" value="${U.esc(p.ie || '')}"></div></div>
      <datalist id="dl-cult">${CR.CULTURAS.map((x) => `<option value="${x}">`).join('')}</datalist>
      <h3 style="margin:14px 0 6px">Fazendas</h3><div id="pf-faz"></div><button class="btn btn-linha btn-p" type="button" id="pf-maisf">+ fazenda</button>
      <h3 style="margin:14px 0 6px">Máquinas que tem</h3><div id="pf-maq"></div>
      <div class="campos"><div class="campo"><label for="pf-lig">Ligar máquina vendida pela revenda</label><select id="pf-lig">${opt([['', 'Escolher…']].concat(maqsCad.map((m) => [m.id, `${m.nome}${m.ano ? ' ' + m.ano : ''}${m.chassi ? ' · ' + m.chassi : ''}`])), '')}</select></div></div>
      <button class="btn btn-linha btn-p" type="button" id="pf-maism">+ máquina de fora</button>
      <div class="acoes"><button class="btn btn-ouro" type="button" id="pf-ok">Salvar</button></div>`, (cx) => {
      desenhar(cx);
      U.$('#pf-maisf', cx).onclick = () => { ler(cx); faz.push({ nome: '', cidade: '', area: '', culturas: [] }); desenhar(cx); };
      U.$('#pf-maism', cx).onclick = () => { ler(cx); maq.push({ chassi: '', descricao: '', tipo: '', ano: '' }); desenhar(cx); };
      U.$('#pf-lig', cx).onchange = (e) => { const m = maqsCad.find((x) => x.id === e.target.value); if (!m) return; ler(cx); maq.push({ chassi: m.chassi || '', maquina: m.id, descricao: m.nome, tipo: m.tipo, marca: m.marca, ano: m.ano }); desenhar(cx); e.target.value = ''; };
      U.$('#pf-ok', cx).onclick = () => {
        ler(cx);
        const doc = U.$('#pf-doc', cx).value.trim();
        if (doc && !c.documento) { const outro = U.K.cad.achar(U.K.cad.clientes().filter((x) => x.id !== c.id), { documento: doc }); if (outro) { U.toast(`Este CPF/CNPJ já é de ${outro.nome}.`, true); return; } c.documento = doc; }
        const r = tente(() => CR.salvarPerfil(est(), cid, { ie: U.$('#pf-ie', cx).value, fazendas: faz, maquinas: maq }, nome(), agora())); if (!r) return;
        gravar(`Produtor rural atualizado: ${c.nome} (${r.fazendas.length} fazendas, ${CR.areaTotal(r).toLocaleString('pt-BR')} ha, ${r.maquinas.length} máquinas)`); U.toast('Dados de produtor salvos.'); U.fecharCamada(true); U.rota(); setTimeout(() => fichaCliente(cid), 260);
      };
    });
  }

  // ---------- SAFRA: calendário que o Anshur já usa → oportunidades ----------
  function telaSafra() {
    const S = SAFRA(), mes = new Date().getMonth(), MESES = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
    const cs = U.K.cad.clientes(), meusIds = perfil() === 'vendedor' ? new Set(CR.garantir(est()).leads.filter((l) => l.vendedor === nome()).map((l) => l.cliente)) : null;
    const ops = CR.oportunidadesSafra(est(), { safra: S, hoje: hoje(), clientes: cs.filter((c) => !meusIds || meusIds.has(c.id)) });
    U.tela.innerHTML = cab('Safra e oportunidades', 'O calendário de vendas da região (o mesmo da avaliação de usados) cruzado com as culturas e as máquinas de cada produtor.', soLeitura()) + `
      <section class="painel"><div class="painel-cab"><h2>${I.safra}Quando cada máquina tem procura</h2><p>Mês atual em destaque</p></div>
        ${Object.keys(S).length ? `<div class="nc-safra"><span></span>${MESES.map((m, k) => `<span class="m">${m}</span>`).join('')}${Object.entries(S).map(([t, s]) => `<b>${U.esc(nomeTipo(t))}</b>${MESES.map((m, k) => `<span class="c ${s.meses.includes(k) ? 'on' : ''} ${k === mes ? 'hoje' : ''}" title="${U.esc(s.janela)}"></span>`).join('')}`).join('')}</div>
        <ul class="nc-lista" style="margin-top:12px">${Object.entries(S).map(([t, s]) => `<li><div><b>${U.esc(nomeTipo(t))}: ${U.esc(s.janela)}</b><span>${U.esc(s.motivo)}</span></div><span class="nc-tag ${s.meses.includes(mes) ? 'ok' : ''}">${s.meses.includes(mes) ? 'Época agora' : 'em ' + CR.mesesAte(s.meses, mes) + ' ' + (CR.mesesAte(s.meses, mes) === 1 ? 'mês' : 'meses')}</span></li>`).join('')}</ul>` : vazio('Calendário de safra indisponível.')}</section>
      <section class="painel bloco"><div class="painel-cab"><h2>${I.alerta}Oportunidades da safra</h2><p>Máquina velha (8+ anos) ou cultura sem a máquina, com a época chegando em até 3 meses</p></div>
        ${ops.length ? `<ul class="nc-lista">${ops.slice(0, 30).map((o, k) => { const c = U.K.cad.cliente(o.cliente) || {}; return `<li><div><b>${U.esc(o.nome)} · ${U.esc(nomeTipo(o.tipo))}</b><span>${U.esc(o.motivo)} · ${U.esc(o.janela)}</span></div><span class="nc-tag ${o.agora ? 'ok' : 'ouro'}">${o.agora ? 'Época agora' : `em ${o.faltam} ${o.faltam === 1 ? 'mês' : 'meses'}`}</span>
          <span class="fin-acoes">${o.lead ? `<button class="btn btn-linha btn-p" type="button" data-abre="${o.lead}">Abrir oportunidade</button>` : !leitura() ? `<button class="btn btn-ouro btn-p" type="button" data-op="${k}">Criar oportunidade</button>` : ''}${c.telefone ? `<a class="btn btn-linha btn-p" target="_blank" rel="noopener" href="${U.esc(CR.linkWhats(c.telefone, `Olá, ${String(c.nome).split(' ')[0]}! Aqui é da ${U.A.revenda.nome}. ${o.agora ? 'Estamos na época' : 'A época está chegando'} (${o.janela}) e separamos condições para ${nomeTipo(o.tipo).toLowerCase()} nova. Quer que eu mande as opções?`))}">${I.zap}WhatsApp</a>` : ''}</span></li>`; }).join('')}</ul>` : vazio('Nenhuma oportunidade de safra agora. Cadastre culturas e máquinas dos produtores na ficha do cliente.')}</section>`;
    U.$$('[data-abre]', U.tela).forEach((b) => b.onclick = () => detalheLead(b.dataset.abre));
    U.$$('[data-op]', U.tela).forEach((b) => b.onclick = () => {
      const o = ops[+b.dataset.op];
      const r = tente(() => CR.criarLead(est(), { cliente: o.cliente, origem: 'visita', interesse: { tipo: o.tipo, condicao: 'nova' }, vendedor: nome(), loja: loja(), obs: 'Safra: ' + o.motivo }, { quem: nome(), agora: agora() })); if (!r) return;
      CR.registrarAtividade(est(), { lead: r.lead.id, tipo: 'ligacao', texto: `Oferecer ${nomeTipo(o.tipo).toLowerCase()} nova antes da safra (${o.janela})`, data: CR.somarDias(hoje(), 1), responsavel: r.lead.vendedor }, nome(), agora());
      gravar(`Oportunidade de safra: ${o.nome} · ${nomeTipo(o.tipo)}`); U.toast('Oportunidade criada com ligação marcada para amanhã.'); telaSafra();
    });
  }

  // ---------- EQUIPE: vendedores, funil e comissões ----------
  function telaEquipe() {
    const pv = CR.porVendedor(est(), { perfil: perfil(), nome: nome() }), n = N() ? N().garantir(est()) : { vendas: [] }, f = F();
    const vend = new Map(); n.vendas.filter(ve).forEach((v) => { const o = vend.get(v.vendedor) || { n: 0, valor: 0 }; o.n++; o.valor += v.preco; vend.set(v.vendedor, o); });
    const ctxF = { trocas: U.A.todasTrocas || U.A.trocas || [], financiadas: U.A.financiadas || [], cfg: U.K.cfg, hoje: hoje() };
    const com = f ? f.comissoes(est(), { ctx: ctxF }).filter((c) => perfil() !== 'vendedor' || c.vendedor === nome()) : [];
    const nomes = [...new Set(pv.map((x) => x.vendedor).concat([...vend.keys()]).concat(com.map((c) => c.vendedor)))].filter((x) => perfil() !== 'vendedor' || x === nome());
    U.tela.innerHTML = cab('Vendedores e comissões', 'Funil e vendas de novas por vendedor; comissões (usados e novas) vêm do Financeiro.', soLeitura()) + `
      <section class="painel">${nomes.length ? `<div class="tabela-wrap"><table class="tabela fin-tab nc-t"><thead><tr><th>Vendedor</th><th class="n">Abertas</th><th class="n">Em negociação</th><th class="n">Ganhas</th><th class="n">Perdidas</th><th class="n">Conversão</th><th class="n">Novas vendidas</th><th class="n">Comissão a pagar</th><th class="n">Comissão paga</th></tr></thead><tbody>
        ${nomes.map((v) => { const a = pv.find((x) => x.vendedor === v) || { abertos: 0, ganhos: 0, perdidos: 0, valorAberto: 0, conversao: NaN }, b = vend.get(v) || { n: 0, valor: 0 }, c = com.find((x) => x.vendedor === v) || { aPagar: 0, pago: 0 };
          return `<tr><td><b>${U.esc(v)}</b></td><td class="n">${a.abertos}</td><td class="n">${brl(a.valorAberto)}</td><td class="n">${a.ganhos}</td><td class="n">${a.perdidos}</td><td class="n">${isFinite(a.conversao) ? U.pct(a.conversao) : '—'}</td><td class="n">${b.n} · ${brl(b.valor)}</td><td class="n">${brl(c.aPagar)}</td><td class="n">${brl(c.pago)}</td></tr>`; }).join('')}</tbody></table></div>` : vazio('Nada registrado ainda.')}
        <p class="nota-rodape">Comissão = ${U.pct(U.K.cfg.comissaoPct)} da venda menos ${U.pct(U.K.cfg.descontoAcima, 0)} do que passou do limite (troca acima do máximo ou preço abaixo do mínimo), a mesma regra dos usados.</p></section>`;
  }

  // ---------- busca global ----------
  function buscar(q, ui) {
    if (!q || q.length < 2 || !CR.podeVer(ui.eu().perfil)) return [];
    U = ui; const s = U.K.normal(q), out = [];
    CR.garantir(ui.estado).leads.filter((l) => ve(l) && U.K.normal([cliente(l.cliente).nome, l.interesse.modelo, cliente(l.cliente).cidade].join(' ')).includes(s)).slice(0, 5)
      .forEach((l) => out.push({ g: 'Vendas e Clientes', n: cliente(l.cliente).nome, d: `${CR.NOME_ETAPA[l.etapa]} · ${interesseTxt(l)} · ${l.vendedor}`, ir: () => { location.hash = '#crm-leads'; setTimeout(() => detalheLead(l.id), 320); } }));
    return out;
  }

  const T = (fn) => (ui) => { U = ui; estilo(); CR.garantir(ui.estado); if (raiz.NOVAS) raiz.NOVAS.garantir(ui.estado); if (NUI()) NUI().usar(ui); fn(); };
  const ITEM = (aba, rotulo, curto, icone) => ({ aba, rotulo, curto, icone });
  const permissoes = {}; ['crm-funil', 'crm-leads', 'crm-agenda', 'crm-clientes', 'crm-safra', 'crm-equipe'].forEach((a) => { permissoes[a] = PERFIS; });
  R.registrar({
    id: 'crm', pronta: true, inicio: 'crm-funil', atalhos: ['crm-funil', 'crm-agenda', 'crm-leads', 'crm-clientes'],
    acao: { rotulo: 'Nova oportunidade', href: '#crm-leads', novo: true },
    menu: [
      { grupo: 'Vendas', itens: [ITEM('crm-funil', 'Funil de vendas', 'Funil', ICONE), ITEM('crm-agenda', 'Agenda e follow-ups', 'Agenda', '<path d="M4 6h16v14H4zM4 10h16M8 3v4M16 3v4M8 14l2.5 2.5L16 13"/>'), ITEM('crm-leads', 'Oportunidades', 'Leads', '<path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01"/>'), ITEM('nv-propostas', 'Propostas de novas', 'Propostas', '<path d="M6 3h9l4 4v14H6zM14 3v5h5M9 13h7M9 17h5"/>')] },
      { grupo: 'Clientes', itens: [ITEM('crm-clientes', 'Clientes e produtores', 'Clientes', '<path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21v-1a8 8 0 0 1 16 0v1"/>'), ITEM('crm-safra', 'Safra e oportunidades', 'Safra', '<path d="M12 21V9M12 13c-4 0-6-3-6-7 4 0 6 3 6 7zM12 11c3 0 5-2 5-6-3 0-5 2-5 6zM5 21h14"/>'), ITEM('compradores', 'Compradores de usados', 'Compradores', '<path d="M16 11a4 4 0 1 0-8 0 4 4 0 0 0 8 0zM3 21a9 9 0 0 1 18 0M19 4l2 2-2 2"/>')] },
      { grupo: 'Equipe', itens: [ITEM('crm-equipe', 'Vendedores e comissões', 'Equipe', '<path d="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21v-1a6 6 0 0 1 12 0v1M17 8v6M14 11h6"/>'), ITEM('vendedores', 'Desempenho em usados', 'Usados', '<path d="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21v-1a6 6 0 0 1 12 0v1M17 11a3 3 0 1 0 0-6M22 21v-1a5 5 0 0 0-4-4.9"/>')] }
    ],
    telas: { 'crm-funil': T(telaFunil), 'crm-leads': T(telaLeads), 'crm-agenda': T(telaAgenda), 'crm-clientes': T(telaClientes), 'crm-safra': T(telaSafra), 'crm-equipe': T(telaEquipe) },
    permissoes,
    numero: (ui) => { U = ui; const r = CR.resumo(ui.estado, { hoje: ui.hojeISO(), perfil: ui.eu().perfil, nome: ui.eu().nome, loja: ui.estado.lojaAtual || '' }); return { valor: String(r.abertos), texto: `${r.abertos === 1 ? 'oportunidade aberta' : 'oportunidades abertas'} · ${r.tarefasHoje} tarefas hoje${r.atrasadas ? ` · ${r.atrasadas} atrasadas` : ''}`, alerta: r.atrasadas > 0 }; },
    // tarefas do dia (portal e "Tarefas do dia") e rotina da equipe: retornos atrasados, agenda de hoje e oportunidades sem contato
    hoje: (estado, u, ui) => {
      if (!['dono', 'gerente', 'vendedor'].includes(u.perfil)) return [];
      const h = ui.hojeISO(), ag = CR.agenda(estado, { hoje: h, perfil: u.perfil, nome: u.nome }), sf = CR.semFollowup(estado, { hoje: h, perfil: u.perfil, nome: u.nome }), out = [];
      const cli = (id) => { const c = id && ui.K.cad.cliente(id); return c ? c.nome : ''; };
      const it = (a) => `${a.texto}${a.cliente && cli(a.cliente) ? ' (' + cli(a.cliente) + ')' : ''}`;
      const n = ag.atrasadas.length;
      if (n) out.push({ id: 'crm-atr-' + n, cat: 'crm', catNome: 'Vendas e Clientes', nivel: 1, valor: 4e5 + n, titulo: `${n} ${n === 1 ? 'retorno atrasado' : 'retornos atrasados'} com clientes`, txt: ag.atrasadas.slice(0, 3).map(it).join(' · '), botao: { rotulo: 'Abrir a agenda', ir: '#/crm/crm-agenda' } });
      if (ag.hoje.length) out.push({ id: 'crm-hoje-' + ag.hoje.length, cat: 'crm', catNome: 'Vendas e Clientes', nivel: 2, valor: 3e5, titulo: `${ag.hoje.length} ${ag.hoje.length === 1 ? 'contato marcado' : 'contatos marcados'} para hoje`, txt: ag.hoje.slice(0, 3).map((a) => (a.hora ? a.hora + ' ' : '') + it(a)).join(' · '), botao: { rotulo: 'Ver a agenda de hoje', ir: '#/crm/crm-agenda' } });
      if (sf.length) out.push({ id: 'crm-sf-' + sf.length, cat: 'crm', catNome: 'Vendas e Clientes', nivel: 2, valor: sf.reduce((s, x) => s + (x.lead.valor || 0), 0), titulo: `${sf.length} ${sf.length === 1 ? 'oportunidade parada' : 'oportunidades paradas'}, sem contato há 5 dias ou mais`, txt: sf.slice(0, 3).map((x) => `${cli(x.lead.cliente) || 'Cliente'} · ${x.parado} dias`).join(' · '), botao: { rotulo: 'Fazer o follow-up', ir: '#/crm/crm-agenda' } });
      return out;
    },
    rotina: (estado, u, ui) => {
      const h = ui.hojeISO(), ag = CR.agenda(estado, { hoje: h, perfil: 'dono' });
      return [{ perfil: 'vendedor', periodo: 'dia', id: 'crm-retornos', titulo: 'Fazer os retornos e follow-ups com os clientes', qtd: ag.atrasadas.length + ag.hoje.length + CR.semFollowup(estado, { hoje: h }).length, ir: '#/crm/crm-agenda' },
        { perfil: 'gerente', periodo: 'semana', id: 'crm-funil', titulo: 'Revisar o funil de vendas com os vendedores', qtd: null, ir: '#/crm/crm-funil' }];
    },
    buscar,
    novo: (ui) => { U = ui; estilo(); formLead(); },
    // a demonstração de Novas e CRM é uma história só (semeada depois do Financeiro): ver areas/novas.js › semear
    iniciar: (ui) => { if (NUI()) NUI().semear(ui); }
  });
  raiz.CRM_UI = { detalheLead: (id) => detalheLead(id), fichaCliente: (id) => fichaCliente(id) };
})(typeof window !== 'undefined' ? window : globalThis);
