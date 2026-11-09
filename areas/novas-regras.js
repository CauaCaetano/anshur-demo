// Máquinas Novas do Anshur: REGRAS PURAS (sem tela). Testadas em testes_novas_crm.js. As telas ficam em areas/novas.js.
// Tudo mora no estado da revenda em estado.novas = { catalogo, pedidos, reservas, propostas, vendas }:
// listas com id (a fila offline grava item a item, idempotente). Dinheiro vai para o Financeiro por FINANCEIRO.criar.
(function (raiz) {
  const r2 = (v) => Math.round((+v || 0) * 100) / 100;
  const hojeISO = () => new Date().toISOString().slice(0, 10);
  const mesDe = (iso) => String(iso || '').slice(0, 7);
  const diasEntre = (a, b) => Math.round((new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / 864e5);
  function somarDias(iso, n) { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); }
  function somarMeses(iso, n) {
    const [a, m, d] = iso.split('-').map(Number), alvo = new Date(Date.UTC(a, m - 1 + n, 1)), ult = new Date(Date.UTC(alvo.getUTCFullYear(), alvo.getUTCMonth() + 1, 0)).getUTCDate();
    alvo.setUTCDate(Math.min(d, ult)); return alvo.toISOString().slice(0, 10);
  }
  let seq = 0;
  const novoId = (pre) => pre + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase() + (seq++).toString(36);
  const dataOk = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s || '');

  const DISP = { estoque: 'Em estoque', pedido: 'Pedido de fábrica' };
  const SIT_ITEM = { estoque: 'Em estoque', pedido: 'A caminho (fábrica)', reservada: 'Reservada', vendida: 'Vendida' };
  const CONDICOES = { avista: 'À vista', financiamento: 'Financiamento (banco / FINAME)', parcelado: 'Parcelado direto', consorcio: 'Consórcio' };
  const SIT_PROP = { aberta: 'Aberta', negociacao: 'Em negociação', aguardando: 'Aguardando aprovação', aprovada: 'Aprovada', recusada: 'Recusada na alçada', vencida: 'Vencida', ganha: 'Faturada', perdida: 'Perdida' };
  const MOTIVOS_PERDA = ['Preço', 'Comprou da concorrência', 'Crédito não aprovado', 'Adiou a compra', 'Prazo de entrega', 'Sem resposta', 'Outro'];
  const CHECKLIST_ENTREGA = [
    ['manual', 'Manual, garantia e nota entregues'],
    ['revisao', 'Revisão de entrega (níveis, filtros, pressão dos pneus, aperto)'],
    ['operacao', 'Operação e segurança explicadas ao operador'],
    ['monitor', 'Monitor, piloto e telemetria configurados'],
    ['termo', 'Termo de entrega técnica assinado pelo cliente']
  ];
  // mesmas alçadas dos usados (app.js › ALCADA_PADRAO, Configurações › Alçadas): quanto acima do limite cada um libera
  const ALCADA_PADRAO = { trator: { vendedor: 5000, gerente: 40000 }, colhedora: { vendedor: 0, gerente: 0 }, pulverizador: { vendedor: 3000, gerente: 30000 }, plantadeira: { vendedor: 3000, gerente: 20000 } };
  const NOME_NIVEL = { livre: 'dentro da alçada do vendedor', gerente: 'precisa do gerente', dono: 'só o dono libera' };

  const vazio = () => ({ catalogo: [], pedidos: [], reservas: [], propostas: [], vendas: [] });
  function garantir(est) {
    if (!est.novas || typeof est.novas !== 'object' || Array.isArray(est.novas)) est.novas = vazio();
    const n = est.novas; ['catalogo', 'pedidos', 'reservas', 'propostas', 'vendas'].forEach((k) => { if (!Array.isArray(n[k])) n[k] = []; });
    return n;
  }
  const item = (est, id) => garantir(est).catalogo.find((x) => x.id === id) || null;
  const proposta = (est, id) => garantir(est).propostas.find((x) => x.id === id) || null;
  const venda = (est, id) => garantir(est).vendas.find((x) => x.id === id) || null;
  const nomeItem = (i) => (i ? `${i.marca} ${i.modelo}${i.versao ? ' ' + i.versao : ''}${i.anoModelo ? ' ' + i.anoModelo : ''}` : '');

  // ---------- permissões ----------
  const EDITAM = ['dono', 'gerente', 'vendedor'];
  const podeVer = (perfil) => ['dono', 'gerente', 'vendedor', 'financeiro', 'auditor'].includes(perfil);
  const gestor = (perfil) => perfil === 'dono' || perfil === 'gerente';
  // vendedor vê e mexe só no que é dele; dono e gerente veem tudo; financeiro e auditor só leem
  const visivel = (reg, perfil, nome) => perfil !== 'vendedor' || !reg || !reg.vendedor || reg.vendedor === nome;
  const podeEditar = (reg, perfil, nome) => EDITAM.includes(perfil) && (perfil !== 'vendedor' || !reg || reg.vendedor === nome);
  const podeCatalogo = (perfil) => gestor(perfil);
  const podeFaturar = (perfil) => gestor(perfil);

  // ---------- catálogo ----------
  function validarItem(d) {
    const e = [];
    if (!String(d.marca || '').trim()) e.push('marca');
    if (!String(d.modelo || '').trim()) e.push('modelo');
    if (!(+d.tabela > 0)) e.push('tabela');
    if (+d.minimo > +d.tabela) e.push('minimo');
    if (+d.custo < 0) e.push('custo');
    if (d.disp && !DISP[d.disp]) e.push('disp');
    return e;
  }
  function chassiEmUso(est, chassi, exceto) {
    const c = String(chassi || '').trim().toUpperCase(); if (!c) return false;
    return garantir(est).catalogo.some((x) => x.id !== exceto && String(x.chassi || '').toUpperCase() === c);
  }
  function criarItem(est, d, quem = '', agora = new Date().toISOString()) {
    const e = validarItem(d); if (e.length) throw new Error('Campos inválidos: ' + e.join(', '));
    if (d.chassi && chassiEmUso(est, d.chassi)) throw new Error('Já existe máquina com este chassi.');
    const i = { id: d.id || novoId('NV'), tipo: d.tipo || 'trator', marca: String(d.marca).trim(), modelo: String(d.modelo).trim(), versao: String(d.versao || '').trim(), anoModelo: +d.anoModelo || '',
      custo: r2(d.custo), tabela: r2(d.tabela), minimo: r2(d.minimo || d.tabela), disp: d.chassi ? 'estoque' : (d.disp || 'pedido'), chassi: String(d.chassi || '').trim().toUpperCase(), loja: d.loja || '',
      chegada: d.chassi ? (d.chegada || agora.slice(0, 10)) : '', pedido: d.pedido || '', obs: d.obs || '', criadoPor: quem, criadoEm: agora };
    garantir(est).catalogo.push(i); return i;
  }
  function editarItem(est, id, d) {
    const i = item(est, id); if (!i) throw new Error('Máquina não encontrada.');
    const n = Object.assign({}, i, d); const e = validarItem(n); if (e.length) throw new Error('Campos inválidos: ' + e.join(', '));
    if (n.chassi && chassiEmUso(est, n.chassi, id)) throw new Error('Já existe máquina com este chassi.');
    ['tipo', 'marca', 'modelo', 'versao', 'anoModelo', 'custo', 'tabela', 'minimo', 'loja', 'obs'].forEach((k) => { if (d[k] !== undefined) i[k] = ['custo', 'tabela', 'minimo'].includes(k) ? r2(d[k]) : d[k]; });
    if (d.chassi !== undefined && d.chassi) { i.chassi = String(d.chassi).trim().toUpperCase(); i.disp = 'estoque'; i.chegada = i.chegada || hojeISO(); }
    return i;
  }
  function reservaAtiva(est, itemId, hoje = hojeISO()) {
    return garantir(est).reservas.find((r) => r.item === itemId && r.status === 'ativa' && r.ate >= hoje && (!r.de || r.de <= hoje)) || null;
  }
  function situacaoItem(est, i, hoje = hojeISO()) {
    if (!i) return '';
    if (i.vendido) return 'vendida';
    if (reservaAtiva(est, i.id, hoje)) return 'reservada';
    return i.disp === 'estoque' ? 'estoque' : 'pedido';
  }

  // ---------- pedidos à fábrica ----------
  // d: { item? (já no catálogo) ou os campos do catálogo, fabrica, previsao, data, cliente?, vendedor? }
  function criarPedido(est, d, quem = '', agora = new Date().toISOString()) {
    const n = garantir(est);
    if (!String(d.fabrica || '').trim()) throw new Error('Informe a fábrica / fornecedor.');
    const id = d.id || novoId('PF');
    let i = d.item ? item(est, d.item) : null;
    if (d.item && !i) throw new Error('Máquina não encontrada.');
    if (!i) i = criarItem(est, Object.assign({}, d, { disp: 'pedido', chassi: '', pedido: id }), quem, agora);
    else if (!i.pedido) i.pedido = id;
    const p = { id, item: i.id, fabrica: String(d.fabrica).trim(), numero: d.numero || '', data: d.data || agora.slice(0, 10), previsao: d.previsao || '', valor: r2(d.valor || i.custo), loja: d.loja || i.loja || '', cliente: d.cliente || '', vendedor: d.vendedor || '', status: 'aberto', criadoPor: quem, criadoEm: agora };
    n.pedidos.push(p); return { pedido: p, item: i };
  }
  function receberPedido(est, pedidoId, { chassi, data } = {}, quem = '', agora = new Date().toISOString()) {
    const p = garantir(est).pedidos.find((x) => x.id === pedidoId); if (!p) throw new Error('Pedido não encontrado.');
    if (p.status !== 'aberto') throw new Error('Este pedido não está aberto.');
    const c = String(chassi || '').trim().toUpperCase(); if (!c) throw new Error('Informe o chassi que chegou.');
    if (chassiEmUso(est, c, p.item)) throw new Error('Já existe máquina com este chassi.');
    const i = item(est, p.item); if (!i) throw new Error('Máquina do pedido não encontrada.');
    p.status = 'recebido'; p.recebido = { data: data || agora.slice(0, 10), chassi: c, por: quem, em: agora };
    i.chassi = c; i.disp = 'estoque'; i.chegada = p.recebido.data;
    return { pedido: p, item: i };
  }
  function cancelarPedido(est, pedidoId, motivo, quem = '', agora = new Date().toISOString()) {
    const p = garantir(est).pedidos.find((x) => x.id === pedidoId); if (!p) throw new Error('Pedido não encontrado.');
    if (p.status !== 'aberto') throw new Error('Só dá para cancelar pedido aberto.');
    p.status = 'cancelado'; p.cancelado = { motivo: motivo || '', por: quem, em: agora };
    const i = item(est, p.item); if (i && !i.chassi && !i.vendido) i.inativo = true;
    return p;
  }

  // ---------- reservas para cliente (com prazo) ----------
  function reservar(est, d, quem = '', agora = new Date().toISOString(), hoje = agora.slice(0, 10)) {
    const i = item(est, d.item); if (!i || i.inativo) throw new Error('Máquina não encontrada.');
    if (i.vendido) throw new Error('Esta máquina já foi vendida.');
    if (!d.cliente) throw new Error('Escolha o cliente da reserva.');
    const ja = reservaAtiva(est, i.id, hoje);
    if (ja && ja.cliente !== d.cliente) throw new Error(`Já reservada até ${ja.ate.split('-').reverse().join('/')}.`);
    if (ja) return ja; // a mesma reserva não duplica
    const ate = d.ate || somarDias(hoje, Math.max(1, Math.min(90, +d.dias || 7)));
    if (!dataOk(ate) || ate < hoje) throw new Error('Prazo da reserva inválido.');
    const r = { id: d.id || novoId('RS'), item: i.id, cliente: d.cliente, vendedor: d.vendedor || '', proposta: d.proposta || '', de: hoje, ate, sinal: r2(d.sinal || 0), status: 'ativa', obs: d.obs || '', criadoPor: quem, criadoEm: agora };
    garantir(est).reservas.push(r); return r;
  }
  function situacaoReserva(r, hoje = hojeISO()) { return r.status === 'ativa' && r.ate < hoje ? 'vencida' : r.status; }
  function cancelarReserva(est, id, motivo, quem = '', agora = new Date().toISOString()) {
    const r = garantir(est).reservas.find((x) => x.id === id); if (!r) throw new Error('Reserva não encontrada.');
    if (r.status !== 'ativa') throw new Error('Esta reserva não está ativa.');
    r.status = 'cancelada'; r.cancelada = { motivo: motivo || '', por: quem, em: agora }; return r;
  }
  function prorrogarReserva(est, id, ate) {
    const r = garantir(est).reservas.find((x) => x.id === id); if (!r || r.status !== 'ativa') throw new Error('Reserva não encontrada.');
    if (!dataOk(ate)) throw new Error('Data inválida.'); r.ate = ate; return r;
  }

  // ---------- alçada (a mesma dos usados) ----------
  const alcadas = (est) => Object.assign({}, ALCADA_PADRAO, (est && est.alcadas) || {});
  function nivelExigido(tab, tipo, excesso) {
    if (!(excesso > 0)) return 'livre';
    const a = (tab || ALCADA_PADRAO)[tipo] || { vendedor: 0, gerente: 0 };
    return excesso <= a.vendedor ? 'livre' : excesso <= a.gerente ? 'gerente' : 'dono';
  }
  const podeLiberar = (perfil, nivel) => nivel === 'livre' || perfil === 'dono' || (nivel === 'gerente' && perfil === 'gerente');

  // ---------- condição de pagamento ----------
  // parcela fixa (tabela Price); taxa 0 = valor / n
  function parcela(valor, taxaMes, n) {
    n = Math.max(1, Math.floor(+n || 1)); const i = +taxaMes || 0;
    if (!(valor > 0)) return 0;
    if (!i) return r2(valor / n);
    return r2(valor * i / (1 - Math.pow(1 + i, -n)));
  }
  // calcula a proposta: desconto, troca, alçada, margem e comissão (regra da revenda: pct da venda menos parte do que passou do limite)
  // d: { item, preco, troca: { valor, teto }, condicao: { forma, entrada, parcelas, taxaMes }, cfg: { comissaoPct, descontoAcima }, alcadas }
  function calcular(d) {
    const i = d.item || {}, preco = r2(d.preco), tabela = r2(i.tabela), minimo = r2(i.minimo || i.tabela), custo = r2(i.custo);
    const tr = d.troca && +d.troca.valor > 0 ? d.troca : null, valorTroca = tr ? r2(tr.valor) : 0;
    const excessoTroca = tr && +tr.teto > 0 ? r2(Math.max(0, valorTroca - tr.teto)) : 0;
    const abaixoMinimo = r2(Math.max(0, minimo - preco)), excesso = r2(abaixoMinimo + excessoTroca);
    const nivel = nivelExigido(d.alcadas, i.tipo, excesso);
    const saldo = r2(preco - valorTroca);
    const c = Object.assign({ forma: 'avista', entrada: 0, parcelas: 1, taxaMes: 0 }, d.condicao || {});
    const entrada = c.forma === 'avista' ? saldo : r2(Math.min(saldo, Math.max(0, +c.entrada || 0)));
    const financiado = r2(saldo - entrada), n = c.forma === 'avista' ? 0 : Math.max(1, Math.floor(+c.parcelas || 1));
    const vParcela = c.forma === 'avista' || !financiado ? 0 : parcela(financiado, c.forma === 'parcelado' ? c.taxaMes : 0, n);
    const cfg = Object.assign({ comissaoPct: 0.015, descontoAcima: 0.5 }, d.cfg || {});
    const comissaoBruta = r2(preco * cfg.comissaoPct), desconto = r2(Math.min(comissaoBruta, excesso * cfg.descontoAcima));
    const margem = r2(preco - custo - excessoTroca);
    return { preco, tabela, minimo, custo, desconto: r2(tabela - preco), descontoPct: tabela ? (tabela - preco) / tabela : 0, abaixoMinimo, valorTroca, excessoTroca, excesso, nivel,
      saldo, entrada, financiado, parcelas: n, parcela: vParcela, totalParcelado: r2(vParcela * n), margem, margemPct: preco ? margem / preco : 0,
      comissaoBruta, comissaoDesconto: desconto, comissao: r2(comissaoBruta - desconto), forma: c.forma };
  }
  function validarProposta(d) {
    const e = [];
    if (!d.item) e.push('item'); if (!d.cliente) e.push('cliente'); if (!(+d.preco > 0)) e.push('preco');
    if (d.validade && !dataOk(d.validade)) e.push('validade');
    if (d.condicao && !CONDICOES[d.condicao.forma]) e.push('condicao');
    if (d.troca && +d.troca.valor > 0 && +d.troca.valor >= +d.preco) e.push('troca');
    return e;
  }
  const emAberto = (p) => ['aberta', 'negociacao', 'aguardando', 'aprovada'].includes(p.status);
  function situacaoProposta(p, hoje = hojeISO()) { return emAberto(p) && p.validade && p.validade < hoje ? 'vencida' : p.status; }
  // liberada para faturar: dentro da alçada de quem fez, ou aprovada por quem pode
  const liberada = (p) => ['aberta', 'negociacao', 'aprovada'].includes(p.status)
    && (p.calc.nivel === 'livre' || !!(p.aprovacao && ['aprovada', 'propria'].includes(p.aprovacao.status) && p.aprovacao.nivel === p.calc.nivel));
  function aplicarAlcada(p, perfil, quem, agora) {
    const nv = p.calc.nivel;
    if (nv === 'livre') { p.aprovacao = null; return; }
    if (podeLiberar(perfil, nv)) { p.aprovacao = { status: 'propria', nivel: nv, por: quem, em: agora }; return; }
    p.aprovacao = { status: 'pendente', nivel: nv, pedidoPor: quem, em: agora }; p.status = 'aguardando';
  }
  // ctx: { perfil, quem, agora, hoje, alcadas, cfg }
  function criarProposta(est, d, ctx = {}) {
    const e = validarProposta(d); if (e.length) throw new Error('Campos inválidos: ' + e.join(', '));
    const i = item(est, d.item); if (!i || i.inativo) throw new Error('Máquina não encontrada.');
    if (i.vendido) throw new Error('Esta máquina já foi vendida.');
    const hoje = ctx.hoje || hojeISO(), agora = ctx.agora || new Date().toISOString(), quem = ctx.quem || '';
    const rs = reservaAtiva(est, i.id, hoje); if (rs && rs.cliente !== d.cliente) throw new Error('Máquina reservada para outro cliente.');
    const troca = d.troca && +d.troca.valor > 0 ? { avaliacao: d.troca.avaliacao || '', descricao: d.troca.descricao || '', tipo: d.troca.tipo || '', valor: r2(d.troca.valor), teto: r2(d.troca.teto || 0) } : null;
    const condicao = Object.assign({ forma: 'avista', entrada: 0, parcelas: 1, taxaMes: 0, banco: '' }, d.condicao || {});
    const calc = calcular({ item: i, preco: d.preco, troca, condicao, cfg: ctx.cfg, alcadas: ctx.alcadas });
    const p = { id: d.id || novoId('PP'), item: i.id, cliente: d.cliente, lead: d.lead || '', vendedor: d.vendedor || quem, loja: d.loja || i.loja || '', preco: calc.preco, troca, condicao, calc,
      validade: d.validade || somarDias(hoje, 10), status: 'aberta', obs: d.obs || '', historico: [{ quando: agora, por: quem, texto: 'Proposta criada', preco: calc.preco }], criadoPor: quem, criadoEm: agora };
    aplicarAlcada(p, ctx.perfil, quem, agora);
    garantir(est).propostas.push(p); return p;
  }
  // nova rodada: muda preço, troca, condição ou validade; recalcula e volta para a alçada se precisar
  function negociar(est, id, m = {}, ctx = {}) {
    const p = proposta(est, id); if (!p) throw new Error('Proposta não encontrada.');
    if (!emAberto(p) && p.status !== 'recusada') throw new Error('Proposta encerrada.');
    const agora = ctx.agora || new Date().toISOString(), quem = ctx.quem || '';
    const n = { item: p.item, cliente: p.cliente, preco: m.preco !== undefined ? m.preco : p.preco, troca: m.troca !== undefined ? m.troca : p.troca, condicao: Object.assign({}, p.condicao, m.condicao || {}), validade: m.validade || p.validade };
    const e = validarProposta(n); if (e.length) throw new Error('Campos inválidos: ' + e.join(', '));
    const i = item(est, p.item);
    p.preco = r2(n.preco); p.troca = n.troca && +n.troca.valor > 0 ? Object.assign({}, p.troca, n.troca, { valor: r2(n.troca.valor), teto: r2(n.troca.teto || (p.troca && p.troca.teto) || 0) }) : null;
    p.condicao = n.condicao; p.validade = n.validade;
    p.calc = calcular({ item: i, preco: p.preco, troca: p.troca, condicao: p.condicao, cfg: ctx.cfg, alcadas: ctx.alcadas });
    p.status = 'negociacao';
    p.historico.push({ quando: agora, por: quem, texto: m.texto || 'Nova rodada de negociação', preco: p.preco });
    aplicarAlcada(p, ctx.perfil, quem, agora);
    return p;
  }
  function decidir(est, id, aprovar, ctx = {}) {
    const p = proposta(est, id); if (!p) throw new Error('Proposta não encontrada.');
    if (p.status !== 'aguardando' || !p.aprovacao) throw new Error('Esta proposta não espera aprovação.');
    if (!podeLiberar(ctx.perfil, p.aprovacao.nivel)) throw new Error(p.aprovacao.nivel === 'dono' ? 'Só o dono libera este valor.' : 'Só o gerente ou o dono libera.');
    const agora = ctx.agora || new Date().toISOString();
    p.aprovacao = Object.assign({}, p.aprovacao, { status: aprovar ? 'aprovada' : 'recusada', por: ctx.quem || '', decididoEm: agora, motivo: ctx.motivo || '' });
    p.status = aprovar ? 'aprovada' : 'recusada';
    p.historico.push({ quando: agora, por: ctx.quem || '', texto: (aprovar ? 'Aprovada' : 'Recusada') + ' na alçada' + (ctx.motivo ? ': ' + ctx.motivo : ''), preco: p.preco });
    return p;
  }
  function perder(est, id, motivo, ctx = {}) {
    const p = proposta(est, id); if (!p) throw new Error('Proposta não encontrada.');
    if (p.status === 'ganha') throw new Error('Proposta já faturada.');
    if (!String(motivo || '').trim()) throw new Error('Informe o motivo da perda.');
    const agora = ctx.agora || new Date().toISOString();
    p.status = 'perdida'; p.perda = { motivo: String(motivo).trim(), por: ctx.quem || '', em: agora };
    p.historico.push({ quando: agora, por: ctx.quem || '', texto: 'Perdida: ' + motivo, preco: p.preco });
    garantir(est).reservas.filter((r) => r.proposta === p.id && r.status === 'ativa').forEach((r) => { r.status = 'cancelada'; r.cancelada = { motivo: 'Proposta perdida', por: ctx.quem || '', em: agora }; });
    return p;
  }

  // ---------- faturar a venda: contas a receber + comissão no Financeiro ----------
  // confere tudo antes de faturar (a tela chama antes de fechar a troca do usado, para não ficar nada pela metade)
  function conferirFaturar(est, propostaId, data = hojeISO()) {
    const n = garantir(est), p = proposta(est, propostaId); if (!p) throw new Error('Proposta não encontrada.');
    if (n.vendas.some((v) => v.proposta === p.id)) throw new Error('Esta proposta já foi faturada.');
    if (!liberada(p)) throw new Error(p.status === 'aguardando' ? 'A proposta espera aprovação na alçada.' : 'Proposta não está liberada para faturar.');
    const i = item(est, p.item); if (!i) throw new Error('Máquina não encontrada.');
    if (i.vendido) throw new Error('Esta máquina já foi vendida.');
    if (!i.chassi) throw new Error('A máquina ainda não chegou da fábrica: registre o chassi antes de faturar.');
    if (!dataOk(data)) throw new Error('Data da venda inválida.');
    const rs = reservaAtiva(est, i.id, data); if (rs && rs.cliente !== p.cliente) throw new Error('Máquina reservada para outro cliente.');
    return { p, i };
  }
  // ctx: { F (FINANCEIRO), data, quem, agora, hoje, cfg, nomeItem, maquina (id do cadastro comum, ex.: F:<chassi>), trocaId }
  function faturar(est, propostaId, ctx = {}) {
    const F = ctx.F || raiz.FINANCEIRO; if (!F) throw new Error('Financeiro indisponível.');
    const n = garantir(est);
    const ja = n.vendas.find((v) => v.proposta === propostaId); if (ja) return { venda: ja, nova: false };
    const agora = ctx.agora || new Date().toISOString(), data = ctx.data || agora.slice(0, 10), quem = ctx.quem || '';
    const { p, i } = conferirFaturar(est, propostaId, data);
    const c = p.calc, cond = p.condicao, id = 'VN-' + p.id, nomeM = `${nomeItem(i)} (${i.chassi})`;
    // competência = data da venda: a receita e o custo entram na DRE no mês da venda, mesmo com o banco pagando depois
    const base = { categoria: 'rec-novas', centro: 'cc-novas', loja: p.loja || i.loja || '', cliente: p.cliente, maquina: ctx.maquina || '', venda: id, documento: id, origem: 'venda-nova', competencia: data };
    const lanc = []; let custoPosto = false;
    const receber = (d) => { const ls = F.criar(est, Object.assign({}, base, custoPosto ? {} : { custoVenda: c.custo }, d, { tipo: 'receber' }), quem, agora); custoPosto = true; ls.forEach((l) => lanc.push(l)); return ls; };
    // usado recebido na troca: é parte do pagamento da nova (receita pelo preço cheio na DRE) e entra no estoque de usados (compra, fora da DRE).
    // As duas pontas nascem quitadas por COMPENSAÇÃO: não passam por banco nem caixa, não mexem no saldo e ficam fora da conciliação.
    if (c.valorTroca > 0) {
      const comp = { data, forma: F.COMPENSACAO || 'compensacao' };
      const [rT] = receber({ descricao: `Usado recebido na troca · venda ${nomeM}`, valor: c.valorTroca, vencimento: data, obs: 'Compensação: o usado da troca é parte do pagamento (não passa pelo banco).' });
      const [pT] = F.criar(est, Object.assign({}, base, { tipo: 'pagar', descricao: `Compra do usado na troca · ${p.troca.descricao || 'usado'}`, valor: c.valorTroca, vencimento: data, categoria: 'cus-aquisicao', centro: 'cc-usados', maquina: ctx.trocaId || '', origem: 'troca-nova', obs: 'Compensação com a venda ' + id }), quem, agora);
      lanc.push(pT);
      F.baixar(est, rT.id, comp, quem, agora); F.baixar(est, pT.id, comp, quem, agora);
    }
    if (cond.forma === 'avista') { if (c.saldo > 0) receber({ descricao: `Venda de máquina nova · ${nomeM}`, valor: c.saldo, vencimento: ctx.vencimento || data }); }
    else {
      if (c.entrada > 0) receber({ descricao: `Entrada · venda de máquina nova · ${nomeM}`, valor: c.entrada, vencimento: data });
      if (c.financiado > 0) {
        if (cond.forma === 'financiamento') receber({ descricao: `Financiamento ${cond.banco || 'do banco'} · ${nomeM}`, valor: c.financiado, vencimento: somarDias(data, 30), favorecido: cond.banco || '' });
        else if (cond.forma === 'consorcio') receber({ descricao: `Carta de consórcio ${cond.banco || ''} · ${nomeM}`.replace('  ', ' '), valor: c.financiado, vencimento: somarDias(data, 30), favorecido: cond.banco || '' });
        else receber({ descricao: `Parcelado direto · ${nomeM}`, valor: c.totalParcelado || c.financiado, parcelas: c.parcelas, vencimento: somarMeses(data, 1), competencia: data });
      }
    }
    // comissão: mesma regra dos usados (pct da venda menos parte do que passou do limite), vence dia 10 do mês seguinte
    let comissao = null;
    if (c.comissao > 0) {
      [comissao] = F.criar(est, { tipo: 'pagar', descricao: `Comissão de ${p.vendedor || 'vendedor'} · ${nomeM}`, valor: c.comissao, vencimento: somarDias(somarMeses(data.slice(0, 8) + '01', 1), 9), competencia: data, categoria: 'cus-comissao', centro: 'cc-novas', loja: base.loja, maquina: base.maquina, venda: id, documento: id, favorecido: p.vendedor || '', origem: 'comissao-nova' }, quem, agora);
      lanc.push(comissao);
    }
    const v = { id, proposta: p.id, item: i.id, chassi: i.chassi, cliente: p.cliente, lead: p.lead || '', vendedor: p.vendedor, loja: base.loja, data, preco: c.preco, custo: c.custo, troca: p.troca, trocaId: ctx.trocaId || '', condicao: cond,
      comissao: c.comissao, margem: c.margem, lancamentos: lanc.map((l) => l.id), entrega: null, criadoPor: quem, criadoEm: agora };
    n.vendas.push(v);
    i.vendido = { venda: id, data, cliente: p.cliente };
    p.status = 'ganha'; p.venda = id; p.historico.push({ quando: agora, por: quem, texto: 'Venda faturada', preco: p.preco });
    n.reservas.filter((r) => r.item === i.id && r.status === 'ativa').forEach((r) => { r.status = r.cliente === p.cliente ? 'convertida' : 'cancelada'; r.venda = id; });
    const CRM = ctx.CRM || raiz.CRM;
    if (CRM) {
      if (p.lead) { try { CRM.mover(est, p.lead, 'ganho', { quem, agora, texto: 'Venda faturada ' + id }); } catch (e) { /* lead já fechado */ } }
      // a máquina passa a constar no cadastro do produtor, ligada pelo chassi
      CRM.ligarMaquina(est, p.cliente, { chassi: i.chassi, maquina: ctx.maquina || '', descricao: nomeItem(i), tipo: i.tipo, marca: i.marca, ano: i.anoModelo }, quem, agora);
    }
    return { venda: v, nova: true, lancamentos: lanc };
  }
  // faturada → recebida quando todas as contas a receber da venda estão pagas (inclui o resto de pagamento parcial)
  function situacaoVenda(est, v) {
    const ls = ((est.fin && est.fin.lancamentos) || []).filter((l) => l.venda === v.id && l.tipo === 'receber' && !l.cancelado);
    const total = r2(ls.reduce((s, l) => s + l.valor, 0)), recebido = r2(ls.filter((l) => l.pago).reduce((s, l) => s + l.pago.valor, 0));
    const aberto = r2(ls.filter((l) => !l.pago).reduce((s, l) => s + l.valor, 0));
    return { situacao: ls.length && !aberto ? 'recebida' : 'faturada', total, recebido, aberto, itens: ls };
  }
  function registrarEntrega(est, vendaId, d = {}, quem = '', agora = new Date().toISOString()) {
    const v = venda(est, vendaId); if (!v) throw new Error('Venda não encontrada.');
    if (!dataOk(d.data)) throw new Error('Informe a data da entrega.');
    if (!String(d.tecnico || '').trim()) throw new Error('Informe o técnico.');
    const check = {}; CHECKLIST_ENTREGA.forEach(([k]) => { check[k] = !!(d.checklist && d.checklist[k]); });
    v.entrega = { data: d.data, tecnico: String(d.tecnico).trim(), horimetro: +d.horimetro || 0, checklist: check, completa: CHECKLIST_ENTREGA.every(([k]) => check[k]), obs: d.obs || '', por: quem, em: agora };
    return v.entrega;
  }

  // ---------- números da tela e do cartão da entrada ----------
  function resumo(est, { hoje = hojeISO(), perfil = 'dono', nome = '', loja = '', dias = 3 } = {}) {
    const n = garantir(est), okL = (x) => !loja || !x.loja || x.loja === loja, vis = (x) => visivel(x, perfil, nome) && okL(x);
    const cat = n.catalogo.filter((i) => !i.inativo && okL(i));
    const sit = (i) => situacaoItem(est, i, hoje);
    const props = n.propostas.filter(vis), abertas = props.filter((p) => emAberto(p) && p.validade >= hoje);
    const vendasMes = n.vendas.filter((v) => vis(v) && mesDe(v.data) === mesDe(hoje));
    const reservas = n.reservas.filter((r) => vis(r) && r.status === 'ativa');
    return {
      estoque: cat.filter((i) => sit(i) === 'estoque').length, aCaminho: cat.filter((i) => sit(i) === 'pedido').length, reservadas: cat.filter((i) => sit(i) === 'reservada').length,
      valorEstoque: r2(cat.filter((i) => ['estoque', 'reservada'].includes(sit(i))).reduce((s, i) => s + i.custo, 0)),
      pedidosAbertos: n.pedidos.filter((p) => p.status === 'aberto' && okL(p)).length,
      pedidosAtrasados: n.pedidos.filter((p) => p.status === 'aberto' && okL(p) && p.previsao && p.previsao < hoje).length,
      propostasAbertas: abertas.length, valorPropostas: r2(abertas.reduce((s, p) => s + p.preco, 0)),
      propostasVencendo: abertas.filter((p) => p.validade <= somarDias(hoje, dias)).length,
      propostasVencidas: props.filter((p) => situacaoProposta(p, hoje) === 'vencida').length,
      aguardando: props.filter((p) => p.status === 'aguardando').length,
      reservasAtivas: reservas.filter((r) => r.ate >= hoje).length, reservasVencendo: reservas.filter((r) => r.ate >= hoje && r.ate <= somarDias(hoje, dias)).length, reservasVencidas: reservas.filter((r) => r.ate < hoje).length,
      vendasMes: vendasMes.length, valorVendasMes: r2(vendasMes.reduce((s, v) => s + v.preco, 0)),
      entregasPendentes: n.vendas.filter((v) => vis(v) && !(v.entrega && v.entrega.completa)).length
    };
  }

  raiz.NOVAS = { DISP, SIT_ITEM, CONDICOES, SIT_PROP, MOTIVOS_PERDA, CHECKLIST_ENTREGA, ALCADA_PADRAO, NOME_NIVEL, r2, somarDias, somarMeses, diasEntre, mesDe, novoId, vazio, garantir, item, proposta, venda, nomeItem,
    podeVer, visivel, podeEditar, podeCatalogo, podeFaturar, gestor, validarItem, criarItem, editarItem, chassiEmUso, reservaAtiva, situacaoItem, criarPedido, receberPedido, cancelarPedido,
    reservar, situacaoReserva, cancelarReserva, prorrogarReserva, alcadas, nivelExigido, podeLiberar, parcela, calcular, validarProposta, emAberto, situacaoProposta, liberada, criarProposta, negociar, decidir, perder,
    conferirFaturar, faturar, situacaoVenda, registrarEntrega, resumo };
  if (typeof module !== 'undefined' && module.exports) module.exports = raiz.NOVAS;
})(typeof window !== 'undefined' ? window : globalThis);
