// Vendas e Clientes (CRM) do Anshur: REGRAS PURAS (sem tela). Testadas em testes_novas_crm.js. As telas ficam em areas/crm.js.
// Dados em estado.crm = { leads, atividades, perfis } (listas com id; a fila offline grava item a item).
// O cliente é SEMPRE o do cadastro comum (estado.cadastros.clientes, via COMUM.garantirCadastro): o CRM guarda só o id dele.
// perfis = o que é de produtor rural (IE, fazendas, área, culturas, máquinas por chassi), um por cliente (id 'PF-<cliente>').
(function (raiz) {
  const r2 = (v) => Math.round((+v || 0) * 100) / 100;
  const hojeISO = () => new Date().toISOString().slice(0, 10);
  const mesDe = (iso) => String(iso || '').slice(0, 7);
  const diasEntre = (a, b) => Math.round((new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / 864e5);
  function somarDias(iso, n) { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); }
  let seq = 0;
  const novoId = (pre) => pre + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase() + (seq++).toString(36);
  const dataOk = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s || '');
  const normal = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

  const ETAPAS = [['novo', 'Novo'], ['contato', 'Contato feito'], ['visita', 'Visita'], ['proposta', 'Proposta'], ['negociacao', 'Negociação'], ['ganho', 'Ganho'], ['perdido', 'Perdido']];
  const NOME_ETAPA = Object.fromEntries(ETAPAS);
  const ABERTAS = ['novo', 'contato', 'visita', 'proposta', 'negociacao'];
  const ORIGENS = { whatsapp: 'WhatsApp', feira: 'Feira / evento', indicacao: 'Indicação', site: 'Site', visita: 'Visita (loja ou fazenda)' };
  const MOTIVOS_PERDA = ['Preço', 'Comprou da concorrência', 'Crédito não aprovado', 'Adiou a compra', 'Sem resposta', 'Não tinha a máquina', 'Outro'];
  const TIPOS_ATIV = { ligacao: 'Ligação', whatsapp: 'WhatsApp', visita: 'Visita', reuniao: 'Reunião', tarefa: 'Tarefa', email: 'E-mail' };
  const CULTURAS = ['Cana', 'Soja', 'Milho', 'Café', 'Laranja', 'Amendoim', 'Sorgo', 'Pastagem', 'Feijão'];
  // que máquina cada cultura pede (para oportunidades de safra: tem a cultura e não tem a máquina)
  const MAQ_CULTURA = { Cana: ['colhedora', 'trator'], Soja: ['plantadeira', 'pulverizador', 'trator'], Milho: ['plantadeira', 'pulverizador', 'trator'], Amendoim: ['plantadeira', 'trator'], Sorgo: ['plantadeira', 'trator'], Café: ['pulverizador', 'trator'], Laranja: ['pulverizador', 'trator'], Feijão: ['plantadeira', 'pulverizador'], Pastagem: ['trator'] };

  const vazio = () => ({ leads: [], atividades: [], perfis: [] });
  function garantir(est) {
    if (!est.crm || typeof est.crm !== 'object' || Array.isArray(est.crm)) est.crm = vazio();
    const c = est.crm; ['leads', 'atividades', 'perfis'].forEach((k) => { if (!Array.isArray(c[k])) c[k] = []; });
    return c;
  }
  const lead = (est, id) => garantir(est).leads.find((x) => x.id === id) || null;
  const perfilDe = (est, clienteId) => garantir(est).perfis.find((p) => p.cliente === clienteId) || null;

  // ---------- permissões ----------
  const podeVer = (perfil) => ['dono', 'gerente', 'vendedor', 'financeiro', 'auditor'].includes(perfil);
  const visivel = (reg, perfil, nome) => perfil !== 'vendedor' || !reg || !reg.vendedor || reg.vendedor === nome;
  const podeEditar = (reg, perfil, nome) => ['dono', 'gerente', 'vendedor'].includes(perfil) && (perfil !== 'vendedor' || !reg || !reg.vendedor || reg.vendedor === nome);
  const podeCriar = (perfil) => ['dono', 'gerente', 'vendedor'].includes(perfil);

  // ---------- leads ----------
  // d: { nome, documento, telefone, cidade, email, origem, interesse: { tipo, condicao: 'nova'|'usada', marca, modelo }, valor, vendedor, loja, obs, comprador }
  // ctx: { garantirCliente(dados) → cliente do cadastro comum, quem, agora }
  // Nunca duplica: o cliente vem do cadastro comum (acha por CPF/CNPJ ou nome) e, se já existe oportunidade aberta do mesmo
  // cliente para o mesmo tipo de máquina, devolve a que existe (duplicado: true).
  function criarLead(est, d, ctx = {}) {
    if (!String(d.nome || '').trim() && !d.cliente) throw new Error('Informe o nome do cliente.');
    if (d.origem && !ORIGENS[d.origem]) throw new Error('Origem inválida.');
    const agora = ctx.agora || new Date().toISOString(), quem = ctx.quem || '';
    const cli = d.cliente ? { id: d.cliente } : (ctx.garantirCliente ? ctx.garantirCliente({ nome: d.nome, documento: d.documento, telefone: d.telefone, cidade: d.cidade, email: d.email }) : null);
    if (!cli) throw new Error('Cadastro do cliente indisponível.');
    const c = garantir(est), it = Object.assign({ tipo: '', condicao: 'nova', marca: '', modelo: '' }, d.interesse || {});
    const ja = c.leads.find((l) => l.cliente === cli.id && ABERTAS.includes(l.etapa) && (l.interesse.tipo || '') === (it.tipo || '') && (l.interesse.condicao || 'nova') === it.condicao);
    if (ja) return { lead: ja, cliente: cli, duplicado: true };
    const l = { id: d.id || novoId('LD'), cliente: cli.id, origem: d.origem || 'whatsapp', interesse: it, valor: r2(d.valor || 0), vendedor: d.vendedor || quem, loja: d.loja || '', etapa: 'novo', comprador: d.comprador || '',
      proposta: '', obs: d.obs || '', etapas: [{ etapa: 'novo', quando: agora, por: quem }], criadoPor: quem, criadoEm: agora, atualizadoEm: agora };
    c.leads.push(l); return { lead: l, cliente: cli, duplicado: false };
  }
  function mover(est, id, etapa, ctx = {}) {
    const l = lead(est, id); if (!l) throw new Error('Oportunidade não encontrada.');
    if (!NOME_ETAPA[etapa]) throw new Error('Etapa inválida.');
    if (etapa === 'perdido' && !String(ctx.motivo || '').trim()) throw new Error('Informe o motivo da perda.');
    if (l.etapa === etapa) return l;
    const agora = ctx.agora || new Date().toISOString();
    l.etapa = etapa; l.atualizadoEm = agora;
    if (etapa === 'perdido') l.perda = { motivo: String(ctx.motivo).trim(), detalhe: ctx.detalhe || '', em: agora }; else delete l.perda;
    l.etapas.push({ etapa, quando: agora, por: ctx.quem || '', ...(ctx.motivo ? { motivo: ctx.motivo } : {}), ...(ctx.texto ? { texto: ctx.texto } : {}) });
    return l;
  }
  // avança sem voltar (ex.: criar proposta leva o lead para "proposta" se ele estava antes)
  function avancar(est, id, etapa, ctx = {}) {
    const l = lead(est, id); if (!l) return null;
    const ordem = ETAPAS.map((e) => e[0]);
    if (ABERTAS.includes(l.etapa) && ordem.indexOf(etapa) > ordem.indexOf(l.etapa)) mover(est, id, etapa, ctx);
    return l;
  }
  function editarLead(est, id, d) {
    const l = lead(est, id); if (!l) throw new Error('Oportunidade não encontrada.');
    ['origem', 'valor', 'vendedor', 'loja', 'obs', 'comprador', 'proposta'].forEach((k) => { if (d[k] !== undefined) l[k] = k === 'valor' ? r2(d[k]) : d[k]; });
    if (d.interesse) l.interesse = Object.assign({}, l.interesse, d.interesse);
    l.atualizadoEm = d.agora || new Date().toISOString(); return l;
  }

  // ---------- atividades e tarefas ----------
  function registrarAtividade(est, d, quem = '', agora = new Date().toISOString()) {
    if (!TIPOS_ATIV[d.tipo]) throw new Error('Tipo de atividade inválido.');
    if (!dataOk(d.data)) throw new Error('Informe a data.');
    if (!String(d.texto || '').trim()) throw new Error('Descreva a atividade.');
    const l = d.lead ? lead(est, d.lead) : null;
    const a = { id: d.id || novoId('AT'), lead: d.lead || '', cliente: d.cliente || (l ? l.cliente : ''), tipo: d.tipo, texto: String(d.texto).trim(), data: d.data, hora: d.hora || '', responsavel: d.responsavel || quem,
      feita: !!d.feita, feitaEm: d.feita ? agora : '', resultado: d.resultado || '', criadoPor: quem, criadoEm: agora };
    garantir(est).atividades.push(a);
    if (l && a.feita) l.atualizadoEm = agora; // só o que aconteceu conta como contato (tarefa marcada não é follow-up feito)
    return a;
  }
  function concluir(est, id, { resultado = '', quem = '', agora = new Date().toISOString() } = {}) {
    const a = garantir(est).atividades.find((x) => x.id === id); if (!a) throw new Error('Atividade não encontrada.');
    a.feita = true; a.feitaEm = agora; a.feitaPor = quem; if (resultado) a.resultado = resultado; return a;
  }
  function reabrir(est, id) { const a = garantir(est).atividades.find((x) => x.id === id); if (!a) throw new Error('Atividade não encontrada.'); a.feita = false; a.feitaEm = ''; return a; }
  // agenda de quem está usando: vendedor vê as dele; dono e gerente veem as de todos (ou de um responsável)
  function agenda(est, { hoje = hojeISO(), perfil = 'dono', nome = '', responsavel = '', dias = 7 } = {}) {
    const de = (a) => (responsavel ? a.responsavel === responsavel : perfil !== 'vendedor' || a.responsavel === nome);
    const abertas = garantir(est).atividades.filter((a) => !a.feita && de(a)).sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora));
    return { atrasadas: abertas.filter((a) => a.data < hoje), hoje: abertas.filter((a) => a.data === hoje), proximas: abertas.filter((a) => a.data > hoje && a.data <= somarDias(hoje, dias)), depois: abertas.filter((a) => a.data > somarDias(hoje, dias)) };
  }
  // oportunidades abertas sem nada marcado e sem contato há N dias: follow-up sugerido
  function semFollowup(est, { hoje = hojeISO(), dias = 5, perfil = 'dono', nome = '' } = {}) {
    const c = garantir(est);
    return c.leads.filter((l) => ABERTAS.includes(l.etapa) && visivel(l, perfil, nome)).map((l) => {
      const at = c.atividades.filter((a) => a.lead === l.id);
      const futura = at.some((a) => !a.feita && a.data >= hoje);
      const ult = [l.atualizadoEm.slice(0, 10)].concat(at.filter((a) => a.feita).map((a) => (a.feitaEm || a.data).slice(0, 10))).sort().pop();
      return { lead: l, ultimo: ult, parado: diasEntre(ult, hoje), futura };
    }).filter((x) => !x.futura && x.parado >= dias).sort((a, b) => b.parado - a.parado);
  }
  const NOMES_TIPO = { trator: 'trator', colhedora: 'colhedora', pulverizador: 'pulverizador', plantadeira: 'plantadeira' };
  // mensagem pronta (a pessoa confere e envia no WhatsApp; nada sai sozinho)
  function mensagemFollowup({ nome, revenda, vendedor, interesse, proposta, etapa } = {}) {
    const pn = String(nome || '').split(' ')[0] || 'tudo bem';
    const maq = interesse ? [interesse.condicao === 'usada' ? 'usado' : '', NOMES_TIPO[interesse.tipo] || 'máquina', interesse.marca, interesse.modelo].filter(Boolean).join(' ') : 'a máquina';
    const quem = vendedor ? `${vendedor}, da ${revenda || 'revenda'}` : `da ${revenda || 'revenda'}`;
    if (proposta) return `Olá, ${pn}! Aqui é ${quem}. Passando para saber se conseguiu olhar a proposta do ${proposta}. Posso ajudar com alguma dúvida sobre condição, troca ou prazo de entrega?`;
    if (etapa === 'novo') return `Olá, ${pn}! Aqui é ${quem}. Vi que você tem interesse em ${maq}. Quando é um bom horário para conversarmos?`;
    return `Olá, ${pn}! Aqui é ${quem}. Sobre ${maq}: quer que eu separe as opções e as condições desta semana para você?`;
  }
  function linkWhats(telefone, texto) {
    let d = String(telefone || '').replace(/\D/g, '');
    if (d && d.length <= 11) d = '55' + d;
    return `https://wa.me/${d}?text=${encodeURIComponent(texto || '')}`;
  }

  // ---------- funil ----------
  function funil(est, { de = '', ate = '', vendedor = '', loja = '', perfil = 'dono', nome = '' } = {}) {
    const ls = garantir(est).leads.filter((l) => visivel(l, perfil, nome) && (!vendedor || l.vendedor === vendedor) && (!loja || !l.loja || l.loja === loja)
      && (!de || l.criadoEm.slice(0, 10) >= de) && (!ate || l.criadoEm.slice(0, 10) <= ate));
    const etapas = ETAPAS.map(([k, n]) => { const x = ls.filter((l) => l.etapa === k); return { etapa: k, nome: n, n: x.length, valor: r2(x.reduce((s, l) => s + (l.valor || 0), 0)) }; });
    const ganhos = ls.filter((l) => l.etapa === 'ganho').length, perdidos = ls.filter((l) => l.etapa === 'perdido').length;
    const motivos = {}; ls.filter((l) => l.etapa === 'perdido').forEach((l) => { const m = (l.perda && l.perda.motivo) || 'Sem motivo'; motivos[m] = (motivos[m] || 0) + 1; });
    const origens = {}; ls.forEach((l) => { const o = origens[l.origem] = origens[l.origem] || { n: 0, ganhos: 0 }; o.n++; if (l.etapa === 'ganho') o.ganhos++; });
    const abertos = ls.filter((l) => ABERTAS.includes(l.etapa));
    return { etapas, total: ls.length, abertos: abertos.length, valorAberto: r2(abertos.reduce((s, l) => s + (l.valor || 0), 0)), ganhos, perdidos, conversao: ganhos + perdidos ? ganhos / (ganhos + perdidos) : NaN, motivos, origens };
  }
  // por vendedor: oportunidades, ganhos, perdidos, conversão
  function porVendedor(est, { perfil = 'dono', nome = '' } = {}) {
    const m = new Map();
    garantir(est).leads.filter((l) => visivel(l, perfil, nome)).forEach((l) => {
      const k = l.vendedor || 'Sem vendedor', o = m.get(k) || { vendedor: k, abertos: 0, ganhos: 0, perdidos: 0, valorAberto: 0 };
      if (ABERTAS.includes(l.etapa)) { o.abertos++; o.valorAberto = r2(o.valorAberto + (l.valor || 0)); } else if (l.etapa === 'ganho') o.ganhos++; else o.perdidos++;
      m.set(k, o);
    });
    return [...m.values()].map((o) => Object.assign(o, { conversao: o.ganhos + o.perdidos ? o.ganhos / (o.ganhos + o.perdidos) : NaN })).sort((a, b) => b.ganhos - a.ganhos || b.abertos - a.abertos);
  }

  // ---------- produtor rural (complementa o cadastro comum, nunca duplica) ----------
  // d: { ie, fazendas: [{ nome, cidade, area, culturas: [] }], maquinas: [{ chassi, maquina (id do cadastro comum), descricao, tipo, marca, ano }] }
  function salvarPerfil(est, clienteId, d = {}, quem = '', agora = new Date().toISOString()) {
    if (!clienteId) throw new Error('Cliente não informado.');
    const c = garantir(est); let p = perfilDe(est, clienteId);
    if (!p) { p = { id: 'PF-' + clienteId, cliente: clienteId, ie: '', fazendas: [], maquinas: [], criadoEm: agora }; c.perfis.push(p); }
    if (d.ie !== undefined) p.ie = String(d.ie || '').trim();
    if (d.fazendas) p.fazendas = d.fazendas.filter((f) => String(f.nome || '').trim()).map((f) => ({ nome: String(f.nome).trim(), cidade: f.cidade || '', area: r2(f.area || 0), culturas: (f.culturas || []).filter(Boolean) }));
    if (d.maquinas) {
      const vistos = new Set();
      p.maquinas = d.maquinas.filter((m) => String(m.chassi || m.maquina || m.descricao || '').trim()).map((m) => ({ chassi: String(m.chassi || '').trim().toUpperCase(), maquina: m.maquina || '', descricao: m.descricao || '', tipo: m.tipo || '', marca: m.marca || '', ano: +m.ano || '' }))
        .filter((m) => { const k = m.chassi || m.maquina || normal(m.descricao); if (vistos.has(k)) return false; vistos.add(k); return true; });
    }
    p.atualizadoPor = quem; p.atualizadoEm = agora; return p;
  }
  // liga a máquina ao cliente pelo chassi (sem repetir): usada na venda de nova e na entrega
  function ligarMaquina(est, clienteId, m, quem = '', agora = new Date().toISOString()) {
    const p = perfilDe(est, clienteId) || salvarPerfil(est, clienteId, {}, quem, agora);
    const ch = String(m.chassi || '').trim().toUpperCase();
    if (ch && p.maquinas.some((x) => x.chassi === ch)) return p;
    p.maquinas.push({ chassi: ch, maquina: m.maquina || '', descricao: m.descricao || '', tipo: m.tipo || '', marca: m.marca || '', ano: +m.ano || '' });
    p.atualizadoEm = agora; return p;
  }
  const areaTotal = (p) => r2(((p && p.fazendas) || []).reduce((s, f) => s + (+f.area || 0), 0));
  const culturas = (p) => [...new Set(((p && p.fazendas) || []).flatMap((f) => f.culturas || []))];

  // ---------- histórico do cliente (avaliações, compras, OS, financeiro, CRM) ----------
  // fontes: { avaliacoes, propostas, vendasNovas, trocas (usados comprados pelo cliente), os (oficina), lancamentos (Financeiro), nomeItem }
  function historicoCliente(est, clienteId, fontes = {}) {
    const c = garantir(est), out = [], add = (data, tipo, texto, valor, ref) => { if (data) out.push({ data: String(data).slice(0, 10), tipo, texto, valor: valor == null ? null : r2(valor), ref: ref || '' }); };
    const meusLeads = c.leads.filter((l) => l.cliente === clienteId);
    meusLeads.forEach((l) => { add(l.criadoEm, 'crm', `Oportunidade (${ORIGENS[l.origem] || l.origem}): ${l.interesse.condicao === 'usada' ? 'usado' : 'nova'} ${l.interesse.tipo || ''} ${l.interesse.modelo || ''}`.replace(/\s+/g, ' ').trim(), l.valor || null, l.id); if (l.etapa === 'ganho' || l.etapa === 'perdido') add(l.atualizadoEm, 'crm', l.etapa === 'ganho' ? 'Oportunidade ganha' : `Oportunidade perdida: ${(l.perda && l.perda.motivo) || ''}`, null, l.id); });
    c.atividades.filter((a) => a.cliente === clienteId && a.feita).forEach((a) => add(a.feitaEm || a.data, 'atividade', `${TIPOS_ATIV[a.tipo]}: ${a.texto}${a.resultado ? ' · ' + a.resultado : ''}`, null, a.id));
    const avIds = new Set((fontes.propostas || []).filter((p) => p.cliente === clienteId && p.troca && p.troca.avaliacao).map((p) => p.troca.avaliacao));
    (fontes.avaliacoes || []).filter((a) => avIds.has(a.id) || a.cliente === clienteId).forEach((a) => add(a.data, 'avaliacao', `Avaliação do usado ${a.maq ? `${a.maq.marca} ${a.maq.modelo} ${a.maq.ano}` : ''}: máximo indicado`, a.teto, a.id));
    (fontes.propostas || []).filter((p) => p.cliente === clienteId).forEach((p) => add(p.criadoEm, 'proposta', `Proposta ${fontes.nomeItem ? fontes.nomeItem(p.item) : ''} · ${p.status}`, p.preco, p.id));
    (fontes.vendasNovas || []).filter((v) => v.cliente === clienteId).forEach((v) => add(v.data, 'compra', `Comprou máquina nova ${fontes.nomeItem ? fontes.nomeItem(v.item) : ''} (${v.chassi})`, v.preco, v.id));
    (fontes.trocas || []).forEach((t) => add(t.saida, 'compra', `Comprou usado ${t.marca} ${t.modelo} ${t.ano}`, t.vendido, t.id));
    (fontes.os || []).filter((o) => o.cliente === clienteId).forEach((o) => add(o.abertura || o.data || o.criadoEm, 'os', `OS ${o.numero || o.id}${o.descricao ? ': ' + o.descricao : ''}`, o.total != null ? o.total : o.valor, o.id));
    (fontes.lancamentos || []).filter((l) => l.cliente === clienteId && !l.cancelado && l.tipo === 'receber').forEach((l) => add(l.pago ? l.pago.data : l.vencimento, 'financeiro', `${l.pago ? 'Pagou' : 'A receber'}: ${l.descricao}`, l.pago ? l.pago.valor : l.valor, l.id));
    return out.sort((a, b) => b.data.localeCompare(a.data));
  }

  // ---------- calendário de safra → oportunidades ----------
  // safra: o calendário que o Anshur já usa (app.js › SAFRA: { tipo: { janela, motivo, meses: [0..11] } })
  const mesesAte = (meses, mesAtual) => { if (!meses || !meses.length) return 99; return Math.min(...meses.map((m) => (m - mesAtual + 12) % 12)); };
  // ctx: { safra, hoje, clientes: [{ id, nome }], idadeRenovar (anos), antecedencia (meses), nomeMaquina(chassi|id) }
  function oportunidadesSafra(est, ctx = {}) {
    const safra = ctx.safra || {}, hoje = ctx.hoje || hojeISO(), mes = +hoje.slice(5, 7) - 1, ano = +hoje.slice(0, 4), renovar = ctx.idadeRenovar || 8, ant = ctx.antecedencia == null ? 3 : ctx.antecedencia;
    const c = garantir(est), nomes = new Map((ctx.clientes || []).map((x) => [x.id, x.nome])), out = [];
    const abertoPara = (cli, tipo) => c.leads.find((l) => l.cliente === cli && ABERTAS.includes(l.etapa) && l.interesse.tipo === tipo);
    c.perfis.forEach((p) => {
      if (ctx.clientes && !nomes.has(p.cliente)) return;
      const tipos = new Set(p.maquinas.map((m) => m.tipo).filter(Boolean));
      const add = (tipo, motivo, peso, extra = {}) => {
        const s = safra[tipo]; if (!s) return;
        const faltam = mesesAte(s.meses, mes); if (faltam > ant) return;
        if (out.some((o) => o.cliente === p.cliente && o.tipo === tipo)) return;
        const ld = abertoPara(p.cliente, tipo);
        out.push(Object.assign({ cliente: p.cliente, nome: nomes.get(p.cliente) || '', tipo, motivo, janela: s.janela, porque: s.motivo, faltam, agora: faltam === 0, peso: peso + (faltam === 0 ? 2 : 0) + areaTotal(p) / 1000, lead: ld ? ld.id : '' }, extra));
      };
      p.maquinas.forEach((m) => { if (m.tipo && m.ano && ano - m.ano >= renovar) add(m.tipo, `${m.descricao || m.tipo} de ${m.ano} (${ano - m.ano} anos): hora de renovar`, 3, { chassi: m.chassi }); });
      culturas(p).forEach((cu) => (MAQ_CULTURA[cu] || []).forEach((t) => { if (!tipos.has(t)) add(t, `Planta ${cu.toLowerCase()} e não tem ${NOMES_TIPO[t]} cadastrado`, 2); }));
    });
    return out.sort((a, b) => a.faltam - b.faltam || b.peso - a.peso);
  }

  // ---------- números da tela e do cartão da entrada ----------
  function resumo(est, { hoje = hojeISO(), perfil = 'dono', nome = '', loja = '' } = {}) {
    const c = garantir(est), ls = c.leads.filter((l) => visivel(l, perfil, nome) && (!loja || !l.loja || l.loja === loja));
    const ab = ls.filter((l) => ABERTAS.includes(l.etapa)), ag = agenda(est, { hoje, perfil, nome });
    return { abertos: ab.length, valorAberto: r2(ab.reduce((s, l) => s + (l.valor || 0), 0)), novos: ab.filter((l) => l.etapa === 'novo').length,
      tarefasHoje: ag.hoje.length, atrasadas: ag.atrasadas.length, semFollowup: semFollowup(est, { hoje, perfil, nome }).length,
      ganhosMes: ls.filter((l) => l.etapa === 'ganho' && mesDe(l.atualizadoEm) === mesDe(hoje)).length };
  }

  raiz.CRM = { ETAPAS, NOME_ETAPA, ABERTAS, ORIGENS, MOTIVOS_PERDA, TIPOS_ATIV, CULTURAS, MAQ_CULTURA, r2, somarDias, diasEntre, novoId, vazio, garantir, lead, perfilDe, podeVer, visivel, podeEditar, podeCriar,
    criarLead, mover, avancar, editarLead, registrarAtividade, concluir, reabrir, agenda, semFollowup, mensagemFollowup, linkWhats, funil, porVendedor, salvarPerfil, ligarMaquina, areaTotal, culturas,
    historicoCliente, mesesAte, oportunidadesSafra, resumo };
  if (typeof module !== 'undefined' && module.exports) module.exports = raiz.CRM;
})(typeof window !== 'undefined' ? window : globalThis);
