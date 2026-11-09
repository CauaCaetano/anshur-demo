// Financeiro do Anshur: REGRAS PURAS (sem tela). Testadas em testes.js. As telas ficam em areas/financeiro.js.
// Tudo mora no estado da revenda em estado.fin = { contas, lancamentos, transferencias, extrato, categorias, centros, inicio }:
// listas com id (a fila offline grava item a item, idempotente). Saldo NUNCA é guardado: é sempre recalculado dos lançamentos.
(function (raiz) {
  const r2 = (v) => Math.round((+v || 0) * 100) / 100;
  const hojeISO = () => new Date().toISOString().slice(0, 10);
  const mesDe = (iso) => String(iso || '').slice(0, 7);
  const diasEntre = (a, b) => Math.round((new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / 864e5);
  function somarDias(iso, n) { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); }
  // soma meses mantendo o dia (31/01 + 1 mês = 28 ou 29/02)
  function somarMeses(iso, n) {
    const [a, m, d] = iso.split('-').map(Number), alvo = new Date(Date.UTC(a, m - 1 + n, 1)), ult = new Date(Date.UTC(alvo.getUTCFullYear(), alvo.getUTCMonth() + 1, 0)).getUTCDate();
    alvo.setUTCDate(Math.min(d, ult)); return alvo.toISOString().slice(0, 10);
  }
  let seq = 0;
  const novoId = (pre) => pre + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase() + (seq++).toString(36);

  const FORMAS = { pix: 'Pix', boleto: 'Boleto', cartao: 'Cartão', transferencia: 'Transferência', dinheiro: 'Dinheiro', cheque: 'Cheque', compensacao: 'Compensação (usado na troca)' };
  // compensação: o usado da troca paga parte da máquina nova. Não passa por banco nem caixa: fica fora dos saldos, do realizado e da conciliação.
  const COMPENSACAO = 'compensacao';
  const ehCompensacao = (l) => !!(l && l.pago && l.pago.forma === COMPENSACAO);
  const FORMAS_TELA = Object.keys(FORMAS).filter((k) => k !== COMPENSACAO); // a compensação só nasce do faturamento com troca
  // dre: receita | impostos | custo | despesa | financeiro | outras | estoque (compra de estoque: só caixa; na DRE entra o custo do que foi vendido)
  // margem: para onde vai na margem por marca quando pago e ligado a um usado (despesas | comissao | juros)
  const CATEGORIAS_PADRAO = [
    { id: 'rec-usados', nome: 'Venda de usados', tipo: 'receber', dre: 'receita' },
    { id: 'rec-novas', nome: 'Venda de máquinas novas', tipo: 'receber', dre: 'receita' },
    { id: 'rec-oficina', nome: 'Serviços de oficina', tipo: 'receber', dre: 'receita' },
    { id: 'rec-pecas', nome: 'Venda de peças', tipo: 'receber', dre: 'receita' },
    { id: 'rec-garantia', nome: 'Garantia paga pelo fabricante', tipo: 'receber', dre: 'receita' },
    { id: 'rec-outras', nome: 'Outras receitas', tipo: 'receber', dre: 'outras' },
    { id: 'rec-rendimentos', nome: 'Rendimentos e juros recebidos', tipo: 'receber', dre: 'financeiro' },
    { id: 'cus-aquisicao', nome: 'Compra de usado / troca', tipo: 'pagar', dre: 'estoque' },
    { id: 'cus-novas', nome: 'Compra de máquinas novas', tipo: 'pagar', dre: 'estoque' },
    { id: 'cus-pecas', nome: 'Compra de peças', tipo: 'pagar', dre: 'estoque' },
    { id: 'cus-frete', nome: 'Frete e transporte de máquina', tipo: 'pagar', dre: 'custo', margem: 'despesas' },
    { id: 'cus-documentacao', nome: 'Documentação e despachante', tipo: 'pagar', dre: 'custo', margem: 'despesas' },
    { id: 'cus-maquina', nome: 'Outras despesas com a máquina', tipo: 'pagar', dre: 'custo', margem: 'despesas' },
    { id: 'cus-comissao', nome: 'Comissões de venda', tipo: 'pagar', dre: 'custo', margem: 'comissao' },
    { id: 'des-pessoal', nome: 'Salários e encargos', tipo: 'pagar', dre: 'despesa' },
    { id: 'des-aluguel', nome: 'Aluguel e condomínio', tipo: 'pagar', dre: 'despesa' },
    { id: 'des-consumo', nome: 'Energia, água e internet', tipo: 'pagar', dre: 'despesa' },
    { id: 'des-marketing', nome: 'Marketing e anúncios', tipo: 'pagar', dre: 'despesa' },
    { id: 'des-veiculos', nome: 'Combustível e veículos', tipo: 'pagar', dre: 'despesa' },
    { id: 'des-admin', nome: 'Administrativo, contador e sistemas', tipo: 'pagar', dre: 'despesa' },
    { id: 'des-impostos', nome: 'Impostos sobre vendas', tipo: 'pagar', dre: 'impostos' },
    { id: 'fin-floor', nome: 'Juros do floor plan', tipo: 'pagar', dre: 'financeiro', margem: 'juros' },
    { id: 'fin-tarifas', nome: 'Tarifas e juros bancários', tipo: 'pagar', dre: 'financeiro' },
    { id: 'des-outras', nome: 'Outras despesas', tipo: 'pagar', dre: 'outras' }
  ];
  const CENTROS_PADRAO = [{ id: 'cc-usados', nome: 'Usados' }, { id: 'cc-novas', nome: 'Máquinas novas' }, { id: 'cc-oficina', nome: 'Oficina' }, { id: 'cc-pecas', nome: 'Peças' }, { id: 'cc-adm', nome: 'Administrativo' }];

  const vazio = () => ({ contas: [], lancamentos: [], transferencias: [], extrato: [], categorias: [], centros: [], inicio: '' });
  function garantir(est) {
    // completa no lugar (nunca troca o objeto: quem guardou est.fin continua apontando para o mesmo)
    if (!est.fin || typeof est.fin !== 'object' || Array.isArray(est.fin)) est.fin = vazio();
    const f = est.fin; if (typeof f.inicio !== 'string') f.inicio = '';
    ['contas', 'lancamentos', 'transferencias', 'extrato', 'categorias', 'centros'].forEach((k) => { if (!Array.isArray(f[k])) f[k] = []; });
    return f;
  }
  const categorias = (est) => CATEGORIAS_PADRAO.concat(((est.fin && est.fin.categorias) || []).filter((c) => !c.inativo));
  const categoria = (est, id) => categorias(est).find((c) => c.id === id) || null;
  const centros = (est) => CENTROS_PADRAO.concat(((est.fin && est.fin.centros) || []).filter((c) => !c.inativo));
  const conta = (est, id) => ((est.fin && est.fin.contas) || []).find((c) => c.id === id) || null;

  // ---------- situação ----------
  function situacao(l, hoje = hojeISO()) {
    if (l.cancelado) return 'cancelado';
    if (l.pago) return 'pago';
    if (l.vencimento < hoje) return 'vencido';
    if (l.vencimento === hoje) return 'hoje';
    return 'aberto';
  }
  const NOMES_SIT = { aberto: 'A vencer', hoje: 'Vence hoje', vencido: 'Vencido', pago: 'Pago', cancelado: 'Cancelado' };
  const valorEfetivo = (l) => (l.pago && typeof l.pago.valor === 'number' ? l.pago.valor : l.valor);

  // ---------- lançamentos automáticos (vindos de eventos que já existem) ----------
  // Ids fixos por evento (AUT-…): calcular de novo nunca duplica. Enquanto ninguém mexe, o automático é "virtual"
  // (aparece nas telas e nos saldos previstos sem gravar nada); ao baixar/editar/cancelar, passa a ser gravado com o mesmo id.
  function automaticos(est, { trocas = [], financiadas = [], cfg = {}, hoje = hojeISO() } = {}) {
    const f = garantir(est), inicio = f.inicio || hoje, out = [];
    const ja = new Set(f.lancamentos.map((l) => l.id));
    const add = (l) => { if (!ja.has(l.id)) { ja.add(l.id); out.push(Object.assign({ auto: true, virtual: true, criadoEm: l.competencia || l.vencimento }, l)); } };
    trocas.forEach((t) => {
      const maq = `${t.marca || ''} ${t.modelo || ''}`.trim() + (t.ano ? ' ' + t.ano : '');
      // troca/compra com parte em dinheiro ao cliente (t.aPagar): conta a pagar na entrada
      if (typeof t.aPagar === 'number' && t.aPagar > 0 && t.entrada && t.entrada >= inicio)
        add({ id: 'AUT-TR-' + t.id, tipo: 'pagar', descricao: 'Pagamento ao cliente pela troca · ' + maq, valor: r2(t.aPagar), vencimento: t.vencPagar || t.entrada, competencia: t.entrada, categoria: 'cus-aquisicao', centro: 'cc-usados', loja: t.loja || '', maquina: t.id, origem: 'troca', origemId: t.id, favorecido: t.origem || '' });
      if (!t.vendido || !t.saida || t.saida < inicio) return;
      add({ id: 'AUT-VR-' + t.id, tipo: 'receber', descricao: 'Venda do usado · ' + maq, valor: r2(t.vendido), vencimento: t.saida, competencia: t.saida, categoria: 'rec-usados', centro: 'cc-usados', loja: t.loja || '', maquina: t.id, venda: t.id, origem: 'venda', origemId: t.id, favorecido: t.comprador || '' });
      const manual = t.custos && typeof t.custos.comissao === 'number' && !t.custos.comissaoFin ? t.custos.comissao : null;
      const valor = manual != null ? manual : r2(t.vendido * (typeof cfg.comissaoPct === 'number' ? cfg.comissaoPct : 0.015));
      if (valor > 0) add({ id: 'AUT-CM-' + t.id, tipo: 'pagar', descricao: `Comissão ${t.vendedor ? 'de ' + t.vendedor + ' ' : ''}· ${maq}`, valor: r2(valor), vencimento: somarDias(somarMeses(t.saida.slice(0, 8) + '01', 1), 9), competencia: t.saida, categoria: 'cus-comissao', centro: 'cc-usados', loja: t.loja || '', maquina: t.id, venda: t.id, origem: 'comissao', origemId: t.id, favorecido: t.vendedor || '', margem: 'comissao', estimada: manual == null });
    });
    // juros do floor plan: um lançamento por máquina financiada e por mês, depois da carência e até a quitação (ou hoje)
    financiadas.forEach((fp) => {
      if (!fp.entrada || !fp.valor || !fp.taxaMes) return;
      const comeca = somarDias(fp.entrada, fp.carencia || 0), acaba = fp.quitacao || hoje;
      if (comeca >= acaba) return;
      let mes = mesDe(comeca > inicio ? comeca : inicio);
      while (mes <= mesDe(acaba)) {
        const ini = mes + '-01', fim = somarDias(somarMeses(ini, 1), -1);
        const a = comeca > ini ? comeca : ini, b = acaba < fim ? acaba : fim, dias = diasEntre(a, b) + (b === acaba ? 0 : 1);
        if (dias > 0) add({ id: `AUT-FP-${fp.chassi}-${mes}`, tipo: 'pagar', descricao: `Juros do floor plan · ${fp.marca} ${fp.modelo} (${fp.chassi})`, valor: r2(fp.valor * fp.taxaMes * dias / 30), vencimento: somarDias(somarMeses(ini, 1), 9), competencia: fim > acaba ? acaba : fim, categoria: 'fin-floor', centro: 'cc-novas', loja: fp.loja || '', maquina: 'F:' + fp.chassi, origem: 'floor', origemId: fp.chassi, favorecido: fp.banco || '', margem: 'juros' });
        mes = mesDe(somarMeses(ini, 1));
      }
    });
    return out;
  }
  // tudo o que o Financeiro mostra: gravados + automáticos ainda virtuais
  const todos = (est, ctx) => garantir(est).lancamentos.concat(automaticos(est, ctx || {}));

  // grava um automático virtual (ou devolve o já gravado) para poder mexer nele
  function materializar(est, l) {
    const f = garantir(est), ja = f.lancamentos.find((x) => x.id === l.id);
    if (ja) return ja;
    const n = Object.assign({}, l); delete n.virtual; f.lancamentos.push(n); return n;
  }

  // ---------- criar (com parcelas ou recorrência), baixar, estornar, cancelar ----------
  function validar(d) {
    const e = [];
    if (!['pagar', 'receber'].includes(d.tipo)) e.push('tipo');
    if (!String(d.descricao || '').trim()) e.push('descricao');
    if (!(+d.valor > 0)) e.push('valor');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d.vencimento || '')) e.push('vencimento');
    return e;
  }
  // d: { tipo, descricao, valor, vencimento, competencia?, categoria, centro, loja, cliente, fornecedor, maquina, os, venda, documento, obs,
  //      parcelas?: n (divide o valor), recorrencia?: { meses: n } (repete o valor todo mês) }
  function criar(est, d, quem = '', agora = new Date().toISOString()) {
    const erros = validar(d); if (erros.length) throw new Error('Campos inválidos: ' + erros.join(', '));
    const f = garantir(est), cat = categoria(est, d.categoria);
    const base = { ...(d.tipo === 'receber' && +d.custoVenda > 0 ? { custoVenda: r2(d.custoVenda) } : {}), tipo: d.tipo, descricao: String(d.descricao).trim(), categoria: d.categoria || '', centro: d.centro || '', loja: d.loja || '', cliente: d.cliente || '', fornecedor: d.fornecedor || '',
      favorecido: d.favorecido || '', maquina: d.maquina || '', os: d.os || '', venda: d.venda || '', documento: d.documento || '', obs: d.obs || '', origem: d.origem || 'manual', margem: cat && cat.margem ? cat.margem : '', criadoPor: quem, criadoEm: agora };
    const total = r2(d.valor), out = [];
    const nP = Math.max(1, Math.min(120, Math.floor(+d.parcelas || 1))), nR = d.recorrencia ? Math.max(1, Math.min(60, Math.floor(+d.recorrencia.meses || 1))) : 1;
    const grupo = (nP > 1 || nR > 1) ? novoId('G') : '';
    if (nP > 1) {
      const cada = Math.floor(total * 100 / nP) / 100, resto = r2(total - cada * nP);
      for (let i = 0; i < nP; i++) out.push(Object.assign({}, base, { id: novoId('LC'), valor: r2(cada + (i === 0 ? resto : 0)), vencimento: somarMeses(d.vencimento, i), competencia: d.competencia || d.vencimento, parcela: { n: i + 1, de: nP, grupo }, descricao: base.descricao }));
    } else {
      for (let i = 0; i < nR; i++) out.push(Object.assign({}, base, { id: novoId('LC'), valor: total, vencimento: somarMeses(d.vencimento, i), competencia: nR > 1 ? somarMeses(d.competencia || d.vencimento, i) : (d.competencia || d.vencimento), ...(nR > 1 ? { recorrencia: { n: i + 1, de: nR, grupo, freq: 'mensal' } } : {}) }));
    }
    out.forEach((l) => f.lancamentos.push(l));
    return out;
  }
  // b: { data, valor?, forma, conta, juros?, desconto?, parcial? } — parcial: paga parte e o resto vira outro lançamento em aberto
  function baixar(est, id, b, quem = '', agora = new Date().toISOString(), ctx) {
    const f = garantir(est);
    let l = f.lancamentos.find((x) => x.id === id);
    if (!l) { const v = automaticos(est, ctx || {}).find((x) => x.id === id); if (!v) throw new Error('Lançamento não encontrado.'); l = materializar(est, v); }
    if (l.cancelado) throw new Error('Lançamento cancelado.');
    if (l.pago) throw new Error('Este lançamento já foi baixado.');
    const comp = b.forma === COMPENSACAO;
    const c = comp ? null : conta(est, b.conta); if (!comp && (!c || c.inativa)) throw new Error('Escolha a conta ou o caixa.');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(b.data || '')) throw new Error('Data do pagamento inválida.');
    if (!FORMAS[b.forma]) throw new Error('Forma de pagamento inválida.');
    const juros = r2(b.juros || 0), desconto = r2(b.desconto || 0);
    let principal = l.valor;
    if (b.parcial) {
      principal = r2(b.valor); if (!(principal > 0 && principal < l.valor)) throw new Error('No pagamento parcial, o valor tem que ser menor que o total.');
      const resto = Object.assign({}, l, { id: l.id + '-R' + Date.now().toString(36).toUpperCase(), valor: r2(l.valor - principal), restoDe: l.id, criadoPor: quem, criadoEm: agora });
      delete resto.pago; delete resto.conciliado; delete resto.virtual;
      f.lancamentos.push(resto); l.valor = principal;
    }
    l.pago = { data: b.data, valor: r2(principal + juros - desconto), forma: b.forma, conta: c ? c.id : '', juros, desconto, por: quem, em: agora };
    return l;
  }
  function estornar(est, id) {
    const l = garantir(est).lancamentos.find((x) => x.id === id);
    if (!l || !l.pago) throw new Error('Nada para estornar.');
    if (l.conciliado) throw new Error('Desfaça a conciliação com o extrato antes de estornar.');
    delete l.pago; return l;
  }
  function cancelar(est, id, motivo, quem = '', agora = new Date().toISOString(), ctx) {
    const f = garantir(est);
    let l = f.lancamentos.find((x) => x.id === id);
    if (!l) { const v = automaticos(est, ctx || {}).find((x) => x.id === id); if (!v) throw new Error('Lançamento não encontrado.'); l = materializar(est, v); }
    if (l.pago) throw new Error('Estorne o pagamento antes de cancelar.');
    l.cancelado = { por: quem, em: agora, motivo: motivo || '' }; return l;
  }
  // divide um lançamento em aberto em N parcelas mensais (o original vira a 1ª)
  function parcelar(est, id, n, quem = '', ctx) {
    const f = garantir(est);
    let l = f.lancamentos.find((x) => x.id === id);
    if (!l) { const v = automaticos(est, ctx || {}).find((x) => x.id === id); if (!v) throw new Error('Lançamento não encontrado.'); l = materializar(est, v); }
    if (l.pago || l.cancelado) throw new Error('Só dá para parcelar o que está em aberto.');
    n = Math.floor(+n); if (!(n >= 2 && n <= 60)) throw new Error('Escolha de 2 a 60 parcelas.');
    const total = l.valor, cada = Math.floor(total * 100 / n) / 100, resto = r2(total - cada * n), grupo = novoId('G'), novos = [];
    l.valor = r2(cada + resto); l.parcela = { n: 1, de: n, grupo };
    for (let i = 1; i < n; i++) { const p = Object.assign({}, l, { id: l.id + '-P' + (i + 1), valor: cada, vencimento: somarMeses(l.vencimento, i), parcela: { n: i + 1, de: n, grupo }, criadoPor: quem }); delete p.virtual; f.lancamentos.push(p); novos.push(p); }
    return [l].concat(novos);
  }

  // ---------- contas, transferências e saldos ----------
  function criarConta(est, d) {
    const nome = String(d.nome || '').trim(); if (!nome) throw new Error('Dê um nome à conta.');
    const c = { id: d.id || novoId('CT'), nome, tipo: d.tipo === 'caixa' ? 'caixa' : 'banco', banco: d.banco || '', agencia: d.agencia || '', numero: d.numero || '', loja: d.loja || '', saldoInicial: r2(d.saldoInicial || 0), dataSaldo: d.dataSaldo || hojeISO() };
    garantir(est).contas.push(c); return c;
  }
  function transferir(est, d, quem = '', agora = new Date().toISOString()) {
    if (!conta(est, d.de) || !conta(est, d.para)) throw new Error('Escolha as duas contas.');
    if (d.de === d.para) throw new Error('A conta de origem e a de destino são a mesma.');
    if (!(+d.valor > 0)) throw new Error('Informe o valor.');
    const t = { id: novoId('TF'), de: d.de, para: d.para, valor: r2(d.valor), data: d.data || hojeISO(), descricao: d.descricao || 'Transferência entre contas', por: quem, em: agora };
    garantir(est).transferencias.push(t); return t;
  }
  // movimentos realizados de uma conta (ou de todas): entradas positivas, saídas negativas
  function movimentos(est, { conta: cid = '', de = '', ate = '' } = {}) {
    const f = garantir(est), out = [];
    f.lancamentos.forEach((l) => { if (l.cancelado || !l.pago || ehCompensacao(l) || (cid && l.pago.conta !== cid)) return; out.push({ data: l.pago.data, valor: l.tipo === 'receber' ? l.pago.valor : -l.pago.valor, descricao: l.descricao, conta: l.pago.conta, ref: l.id, origem: 'lancamento', conciliado: l.conciliado || '' }); });
    f.transferencias.forEach((t) => {
      if (!cid || t.de === cid) out.push({ data: t.data, valor: -t.valor, descricao: t.descricao + ' (saída)', conta: t.de, ref: t.id, origem: 'transferencia', conciliado: (t.conciliado || {})[t.de] || '' });
      if (!cid || t.para === cid) out.push({ data: t.data, valor: t.valor, descricao: t.descricao + ' (entrada)', conta: t.para, ref: t.id, origem: 'transferencia', conciliado: (t.conciliado || {})[t.para] || '' });
    });
    return out.filter((m) => (!de || m.data >= de) && (!ate || m.data <= ate)).sort((a, b) => a.data.localeCompare(b.data) || String(a.ref).localeCompare(String(b.ref)));
  }
  // saldo = saldo inicial (na data dele) + movimentos a partir dessa data, até "ate"
  function saldoConta(est, cid, ate = '') {
    const c = conta(est, cid); if (!c) return 0;
    return r2(movimentos(est, { conta: cid, ate }).filter((m) => m.data >= (c.dataSaldo || '')).reduce((s, m) => s + m.valor, c.saldoInicial || 0));
  }
  const saldos = (est, ate = '') => garantir(est).contas.filter((c) => !c.inativa).map((c) => ({ conta: c, saldo: saldoConta(est, c.id, ate) }));

  // ---------- filtros por loja ----------
  const daLoja = (loja, lojas) => (x) => (loja ? x.loja === loja : (!lojas || !lojas.length || !x.loja || lojas.includes(x.loja)));

  // ---------- fluxo de caixa: realizado e previsto ----------
  // Previsto parte do saldo de hoje das contas (da loja). Contas a pagar vencidas entram hoje (precisam sair);
  // contas a receber vencidas NÃO entram na curva (não dá para contar com elas): aparecem à parte, como "a cobrar".
  function fluxo(est, { dias = 30, hoje = hojeISO(), loja = '', lojas = null, ctx = {} } = {}) {
    const ok = daLoja(loja, lojas);
    const contas = garantir(est).contas.filter((c) => !c.inativa && ok(c));
    const saldoAtual = r2(contas.reduce((s, c) => s + saldoConta(est, c.id, hoje), 0));
    const fim = somarDias(hoje, dias), abertos = todos(est, ctx).filter((l) => !l.cancelado && !l.pago && ok(l));
    const porDia = new Map();
    const soma = (d, k, v) => { const o = porDia.get(d) || { entradas: 0, saidas: 0 }; o[k] = r2(o[k] + v); porDia.set(d, o); };
    let aCobrar = 0, pagarVencido = 0;
    abertos.forEach((l) => {
      if (l.tipo === 'receber') { if (l.vencimento < hoje) aCobrar = r2(aCobrar + l.valor); else if (l.vencimento <= fim) soma(l.vencimento, 'entradas', l.valor); }
      else { if (l.vencimento < hoje) { pagarVencido = r2(pagarVencido + l.valor); soma(hoje, 'saidas', l.valor); } else if (l.vencimento <= fim) soma(l.vencimento, 'saidas', l.valor); }
    });
    const linhas = []; let saldo = saldoAtual, menor = { saldo: saldoAtual, data: hoje };
    for (let i = 0; i <= dias; i++) {
      const d = somarDias(hoje, i), o = porDia.get(d) || { entradas: 0, saidas: 0 };
      saldo = r2(saldo + o.entradas - o.saidas);
      linhas.push({ data: d, entradas: o.entradas, saidas: o.saidas, saldo });
      if (saldo < menor.saldo) menor = { saldo, data: d };
    }
    const entradas = r2(linhas.reduce((s, x) => s + x.entradas, 0)), saidas = r2(linhas.reduce((s, x) => s + x.saidas, 0));
    return { saldoAtual, entradas, saidas, saldoFinal: saldo, menor, aCobrar, pagarVencido, linhas };
  }
  // realizado por mês (entradas e saídas das contas da loja; transferências entre contas não contam)
  function realizadoMensal(est, { meses = 6, hoje = hojeISO(), loja = '', lojas = null } = {}) {
    const ok = daLoja(loja, lojas), ini = somarMeses(mesDe(hoje) + '-01', -(meses - 1)), m = new Map();
    for (let i = 0; i < meses; i++) m.set(mesDe(somarMeses(ini, i)), { mes: mesDe(somarMeses(ini, i)), entradas: 0, saidas: 0 });
    garantir(est).lancamentos.forEach((l) => {
      if (l.cancelado || !l.pago || ehCompensacao(l) || !ok(l)) return; const o = m.get(mesDe(l.pago.data)); if (!o) return;
      if (l.tipo === 'receber') o.entradas = r2(o.entradas + l.pago.valor); else o.saidas = r2(o.saidas + l.pago.valor);
    });
    return [...m.values()].map((o) => Object.assign(o, { resultado: r2(o.entradas - o.saidas) }));
  }

  // ---------- DRE gerencial (regime de competência) ----------
  // Receitas e despesas pela competência (mês do fato, pago ou não). Compra de máquina e de peça é estoque: não entra;
  // entra o custo do usado vendido no mês (aquisição + preparo da troca cujo recebimento da venda está no mês).
  const LINHAS_DRE = [['receita', 'Receita bruta'], ['impostos', '(−) Impostos sobre vendas'], ['cmv', '(−) Custo das mercadorias vendidas'], ['custo', '(−) Custos das vendas'], ['despesa', '(−) Despesas operacionais'], ['financeiro', '(±) Resultado financeiro'], ['outras', '(±) Outras receitas e despesas']];
  function dre(est, { mes, loja = '', lojas = null, trocas = [], ctx = {} } = {}) {
    const ok = daLoja(loja, lojas), porTroca = new Map(trocas.map((t) => [t.id, t]));
    const g = {}; LINHAS_DRE.forEach(([k]) => { g[k] = { total: 0, itens: new Map() }; });
    const lanc = (k, nome, v) => { g[k].total = r2(g[k].total + v); g[k].itens.set(nome, r2((g[k].itens.get(nome) || 0) + v)); };
    let vendas = 0;
    todos(est, ctx).forEach((l) => {
      if (l.cancelado || mesDe(l.competencia || l.vencimento) !== mes || !ok(l)) return;
      const c = categoria(est, l.categoria) || { nome: 'Sem categoria', dre: l.tipo === 'receber' ? 'outras' : 'despesa' };
      if (c.dre === 'estoque') return;
      const sinal = l.tipo === 'receber' ? 1 : -1, v = valorEfetivo(l);
      lanc(c.dre, c.nome, sinal * v);
      // venda de máquina nova ou de peça com o custo informado (custoVenda): o custo entra junto, no mesmo mês
      if (l.tipo === 'receber' && typeof l.custoVenda === 'number' && l.custoVenda > 0) lanc('cmv', l.categoria === 'rec-novas' ? 'Custo das máquinas novas vendidas' : 'Custo de peças e outros vendidos', -l.custoVenda);
      if (l.origem === 'venda' && l.categoria === 'rec-usados' && porTroca.has(l.origemId)) {
        const t = porTroca.get(l.origemId); vendas++;
        lanc('cmv', 'Aquisição (valor pago na troca)', -(t.pago || 0));
        if (t.preparo) lanc('cmv', 'Preparo', -(t.preparo || 0));
      }
    });
    const T = (k) => g[k].total;
    const receitaLiquida = r2(T('receita') + T('impostos')), margemBruta = r2(receitaLiquida + T('cmv') + T('custo'));
    const operacional = r2(margemBruta + T('despesa')), liquido = r2(operacional + T('financeiro') + T('outras'));
    const linhas = LINHAS_DRE.map(([k, nome]) => ({ chave: k, nome, total: T(k), itens: [...g[k].itens].map(([n, v]) => ({ nome: n, valor: v })).sort((a, b) => Math.abs(b.valor) - Math.abs(a.valor)) }));
    return { mes, linhas, receitaBruta: T('receita'), receitaLiquida, margemBruta, operacional, liquido, vendasUsados: vendas };
  }

  // ---------- inadimplência e cobrança ----------
  function inadimplencia(est, { hoje = hojeISO(), loja = '', lojas = null, ctx = {}, nomeCliente = (id) => id } = {}) {
    const ok = daLoja(loja, lojas), grupos = new Map(), faixas = { '1-30': 0, '31-60': 0, '61-90': 0, '90+': 0 };
    todos(est, ctx).filter((l) => l.tipo === 'receber' && !l.cancelado && !l.pago && l.vencimento < hoje && ok(l)).forEach((l) => {
      const atraso = diasEntre(l.vencimento, hoje), chave = l.cliente || ('nome:' + (l.favorecido || 'Sem cliente'));
      const o = grupos.get(chave) || { cliente: l.cliente || '', nome: l.cliente ? nomeCliente(l.cliente) : (l.favorecido || 'Sem cliente informado'), total: 0, maiorAtraso: 0, itens: [] };
      o.total = r2(o.total + l.valor); o.maiorAtraso = Math.max(o.maiorAtraso, atraso); o.itens.push(Object.assign({ atraso }, l)); grupos.set(chave, o);
      faixas[atraso <= 30 ? '1-30' : atraso <= 60 ? '31-60' : atraso <= 90 ? '61-90' : '90+'] = r2(faixas[atraso <= 30 ? '1-30' : atraso <= 60 ? '31-60' : atraso <= 90 ? '61-90' : '90+'] + l.valor);
    });
    const clientes = [...grupos.values()].sort((a, b) => b.total - a.total);
    return { clientes, faixas, total: r2(clientes.reduce((s, c) => s + c.total, 0)), titulos: clientes.reduce((s, c) => s + c.itens.length, 0) };
  }
  const brl = (v) => (+v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const dataBR = (iso) => (iso ? iso.split('-').reverse().join('/') : '');
  // link wa.me com a mensagem pronta (o telefone é do cadastro do cliente; sem telefone, o WhatsApp pede o contato)
  function linkCobranca({ nome, telefone, itens, revenda, pix }) {
    const total = r2(itens.reduce((s, l) => s + l.valor, 0));
    const linhas = itens.slice(0, 6).map((l) => `• ${l.descricao}: ${brl(l.valor)} (venceu em ${dataBR(l.vencimento)})`).join('\n');
    const txt = `Olá, ${String(nome || '').split(' ')[0] || 'tudo bem'}! Aqui é da ${revenda}. Consta em aberto:\n${linhas}${itens.length > 6 ? `\n• e mais ${itens.length - 6}` : ''}\nTotal: ${brl(total)}.${pix ? `\nPix: ${pix}` : ''}\nSe já pagou, por favor desconsidere e nos envie o comprovante. Obrigado!`;
    let d = String(telefone || '').replace(/\D/g, '');
    if (d && d.length <= 11) d = '55' + d;
    return `https://wa.me/${d}?text=${encodeURIComponent(txt)}`;
  }

  // ---------- extrato bancário: OFX e CSV ----------
  function numeroBR(s) {
    let t = String(s == null ? '' : s).trim().replace(/R\$\s?/i, '').replace(/\s/g, '');
    if (!t) return NaN;
    let neg = /^\(.*\)$/.test(t) || /D$/i.test(t); t = t.replace(/[()]/g, '').replace(/[CD]$/i, '');
    if (t.startsWith('-')) { neg = !neg ? true : neg; t = t.slice(1); }
    if (/,\d{1,2}$/.test(t)) t = t.replace(/\./g, '').replace(',', '.'); else t = t.replace(/,/g, '');
    const v = parseFloat(t); return isFinite(v) ? (neg ? -v : v) : NaN;
  }
  function dataExtrato(s) {
    const t = String(s || '').trim(); let m;
    if ((m = t.match(/^(\d{4})-?(\d{2})-?(\d{2})/))) return `${m[1]}-${m[2]}-${m[3]}`;
    if ((m = t.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/))) return `${m[3].length === 2 ? '20' + m[3] : m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
    return '';
  }
  function lerOFX(texto) {
    const out = [];
    String(texto || '').replace(/<STMTTRN>([\s\S]*?)(<\/STMTTRN>|(?=<STMTTRN>)|<\/BANKTRANLIST>)/gi, (x, bloco) => {
      const tag = (n) => { const m = bloco.match(new RegExp('<' + n + '>([^<\\r\\n]*)', 'i')); return m ? m[1].trim() : ''; };
      const valor = numeroBR(tag('TRNAMT')), data = dataExtrato(tag('DTPOSTED'));
      if (data && isFinite(valor)) out.push({ data, valor: r2(valor), descricao: tag('MEMO') || tag('NAME') || tag('TRNTYPE'), fitid: tag('FITID') });
      return x;
    });
    return out;
  }
  function lerCSV(texto) {
    const ls = String(texto || '').replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim());
    if (!ls.length) return [];
    const sep = (ls[0].match(/;/g) || []).length >= (ls[0].match(/,/g) || []).length ? ';' : ',';
    const partir = (l) => { const r = []; let cur = '', q = false; for (const ch of l) { if (ch === '"') q = !q; else if (ch === sep && !q) { r.push(cur); cur = ''; } else cur += ch; } r.push(cur); return r.map((x) => x.trim()); };
    const cab = partir(ls[0]).map((c) => c.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase());
    const col = (...nomes) => cab.findIndex((c) => nomes.some((n) => c.includes(n)));
    const iD = col('data'), iV = col('valor', 'montante', 'quantia'), iDesc = col('descri', 'historico', 'lancamento', 'memo'), iC = col('credito', 'entrada'), iDb = col('debito', 'saida'), iId = col('id', 'documento', 'fitid');
    if (iD < 0 || (iV < 0 && iC < 0 && iDb < 0)) throw new Error('Não achei as colunas de data e valor no CSV.');
    return ls.slice(1).map(partir).map((c) => {
      let v = iV >= 0 ? numeroBR(c[iV]) : NaN;
      if (!isFinite(v)) { const cr = iC >= 0 ? numeroBR(c[iC]) : NaN, db = iDb >= 0 ? numeroBR(c[iDb]) : NaN; v = (isFinite(cr) ? Math.abs(cr) : 0) - (isFinite(db) ? Math.abs(db) : 0); if (!isFinite(cr) && !isFinite(db)) v = NaN; }
      return { data: dataExtrato(c[iD]), valor: r2(v), descricao: iDesc >= 0 ? c[iDesc] : '', fitid: iId >= 0 ? c[iId] : '' };
    }).filter((x) => x.data && isFinite(x.valor) && x.valor !== 0 && !/saldo/i.test(x.descricao));
  }
  const hash = (s) => [...String(s)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7).toString(36).toUpperCase();
  // importar de novo o mesmo arquivo não duplica: o id da linha vem do FITID (ou de data + valor + descrição + ordem no dia)
  function importarExtrato(est, contaId, linhas, quem = '', agora = new Date().toISOString()) {
    if (!conta(est, contaId)) throw new Error('Escolha a conta do extrato.');
    const f = garantir(est), ja = new Set(f.extrato.map((x) => x.id)), vistos = new Map(); let novas = 0, repetidas = 0;
    linhas.forEach((x) => {
      const base = x.fitid ? 'F' + x.fitid : [x.data, x.valor, x.descricao].join('|'), k = vistos.get(base) || 0; vistos.set(base, k + 1);
      const id = 'EX-' + contaId + '-' + hash(base + '#' + k);
      if (ja.has(id)) { repetidas++; return; }
      ja.add(id); novas++;
      f.extrato.push({ id, conta: contaId, data: x.data, valor: r2(x.valor), descricao: x.descricao || '', fitid: x.fitid || '', importadoPor: quem, importadoEm: agora, conciliado: null });
    });
    return { novas, repetidas };
  }
  // candidatos para uma linha do extrato: mesmo valor (com sinal) e data perto. Pagos nesta conta primeiro; em aberto depois.
  function sugestoes(est, linhaId, ctx = {}) {
    const f = garantir(est), x = f.extrato.find((e) => e.id === linhaId); if (!x) return [];
    const usados = new Set(f.extrato.filter((e) => e.conciliado && e.conciliado.tipo === 'lancamento').map((e) => e.conciliado.id));
    const out = [];
    todos(est, ctx).forEach((l) => {
      if (l.cancelado || usados.has(l.id) || l.conciliado || ehCompensacao(l)) return;
      const sinal = l.tipo === 'receber' ? 1 : -1;
      if (l.pago) {
        if (l.pago.conta !== x.conta || r2(sinal * l.pago.valor) !== x.valor) return;
        const d = Math.abs(diasEntre(l.pago.data, x.data)); if (d <= 5) out.push({ tipo: 'lancamento', id: l.id, l, dist: d, pago: true });
      } else if (r2(sinal * l.valor) === x.valor) {
        const d = Math.abs(diasEntre(l.vencimento, x.data)); if (d <= 10) out.push({ tipo: 'lancamento', id: l.id, l, dist: d + 3, pago: false });
      }
    });
    f.transferencias.forEach((t) => {
      if ((t.conciliado || {})[x.conta]) return;
      const v = t.de === x.conta ? -t.valor : t.para === x.conta ? t.valor : null;
      if (v !== null && r2(v) === x.valor && Math.abs(diasEntre(t.data, x.data)) <= 3) out.push({ tipo: 'transferencia', id: t.id, t, dist: Math.abs(diasEntre(t.data, x.data)) });
    });
    return out.sort((a, b) => a.dist - b.dist);
  }
  function conciliar(est, linhaId, alvo, quem = '', agora = new Date().toISOString(), ctx = {}) {
    const f = garantir(est), x = f.extrato.find((e) => e.id === linhaId);
    if (!x) throw new Error('Linha do extrato não encontrada.'); if (x.conciliado) throw new Error('Esta linha já está conciliada.');
    if (alvo.tipo === 'transferencia') {
      const t = f.transferencias.find((y) => y.id === alvo.id); if (!t) throw new Error('Transferência não encontrada.');
      t.conciliado = Object.assign({}, t.conciliado, { [x.conta]: x.id });
    } else {
      let l = f.lancamentos.find((y) => y.id === alvo.id);
      if (!l) { const v = automaticos(est, ctx).find((y) => y.id === alvo.id); if (!v) throw new Error('Lançamento não encontrado.'); l = materializar(est, v); }
      if (l.conciliado) throw new Error('Este lançamento já está conciliado.');
      if (ehCompensacao(l)) throw new Error('Compensação de usado na troca não passa pelo banco: não se concilia com o extrato.');
      if (!l.pago) baixar(est, l.id, { data: x.data, conta: x.conta, forma: l.tipo === 'receber' ? 'pix' : 'transferencia', ...(Math.abs(x.valor) !== l.valor ? { juros: r2(Math.max(0, Math.abs(x.valor) - l.valor)), desconto: r2(Math.max(0, l.valor - Math.abs(x.valor))) } : {}) }, quem, agora, ctx);
      else if (l.pago.conta !== x.conta) throw new Error('O pagamento foi baixado em outra conta.');
      l.conciliado = x.id;
    }
    x.conciliado = { tipo: alvo.tipo, id: alvo.id, por: quem, em: agora };
    return x;
  }
  function desconciliar(est, linhaId) {
    const f = garantir(est), x = f.extrato.find((e) => e.id === linhaId); if (!x || !x.conciliado) return null;
    if (x.conciliado.tipo === 'transferencia') { const t = f.transferencias.find((y) => y.id === x.conciliado.id); if (t && t.conciliado) delete t.conciliado[x.conta]; }
    else { const l = f.lancamentos.find((y) => y.id === x.conciliado.id); if (l) delete l.conciliado; }
    x.conciliado = null; return x;
  }
  // concilia sozinho só quando há UM candidato já pago, com o mesmo valor, na mesma conta, até 2 dias de diferença
  function autoConciliar(est, contaId, quem = '', agora = new Date().toISOString(), ctx = {}) {
    let n = 0;
    garantir(est).extrato.filter((x) => x.conta === contaId && !x.conciliado).forEach((x) => {
      const s = sugestoes(est, x.id, ctx).filter((c) => (c.tipo === 'transferencia' || c.pago) && c.dist <= 2);
      if (s.length === 1) { conciliar(est, x.id, s[0], quem, agora, ctx); n++; }
    });
    return n;
  }
  // linha do extrato sem par (tarifa, rendimento): vira lançamento já pago e conciliado
  function lancarDoExtrato(est, linhaId, { categoria: cat, descricao, loja = '' } = {}, quem = '', agora = new Date().toISOString()) {
    const f = garantir(est), x = f.extrato.find((e) => e.id === linhaId); if (!x || x.conciliado) throw new Error('Linha indisponível.');
    const c = conta(est, x.conta);
    const [l] = criar(est, { tipo: x.valor > 0 ? 'receber' : 'pagar', descricao: descricao || x.descricao || 'Lançamento do extrato', valor: Math.abs(x.valor), vencimento: x.data, categoria: cat || (x.valor > 0 ? 'rec-outras' : 'fin-tarifas'), centro: 'cc-adm', loja: loja || (c && c.loja) || '' }, quem, agora);
    l.pago = { data: x.data, valor: Math.abs(x.valor), forma: 'transferencia', conta: x.conta, juros: 0, desconto: 0, por: quem, em: agora };
    l.conciliado = x.id; x.conciliado = { tipo: 'lancamento', id: l.id, por: quem, em: agora };
    return l;
  }

  // ---------- comissões e despesas por máquina ----------
  function comissoes(est, { ctx = {}, loja = '', lojas = null } = {}) {
    const ok = daLoja(loja, lojas), m = new Map();
    todos(est, ctx).filter((l) => l.categoria === 'cus-comissao' && !l.cancelado && ok(l)).forEach((l) => {
      const k = l.favorecido || 'Sem vendedor'; const o = m.get(k) || { vendedor: k, aPagar: 0, pago: 0, itens: [] };
      if (l.pago) o.pago = r2(o.pago + l.pago.valor); else o.aPagar = r2(o.aPagar + l.valor); o.itens.push(l); m.set(k, o);
    });
    return [...m.values()].sort((a, b) => b.aPagar - a.aPagar || b.pago - a.pago);
  }
  function despesasPorMaquina(est, { ctx = {} } = {}) {
    const m = new Map();
    todos(est, ctx).filter((l) => l.tipo === 'pagar' && l.maquina && !l.cancelado && l.categoria !== 'cus-aquisicao').forEach((l) => {
      const o = m.get(l.maquina) || { maquina: l.maquina, pagas: 0, abertas: 0, porTipo: {}, itens: [] };
      const v = valorEfetivo(l); if (l.pago) o.pagas = r2(o.pagas + v); else o.abertas = r2(o.abertas + v);
      const k = l.margem || 'outras'; o.porTipo[k] = r2((o.porTipo[k] || 0) + v); o.itens.push(l); m.set(l.maquina, o);
    });
    return m;
  }

  // ---------- resumo (cartão da entrada e painel) ----------
  function resumo(est, { hoje = hojeISO(), loja = '', lojas = null, ctx = {} } = {}) {
    const ok = daLoja(loja, lojas), ab = todos(est, ctx).filter((l) => !l.cancelado && !l.pago && ok(l));
    const s = (f) => { const l = ab.filter(f); return { n: l.length, valor: r2(l.reduce((x, y) => x + y.valor, 0)) }; };
    return {
      pagarHoje: s((l) => l.tipo === 'pagar' && l.vencimento === hoje), receberHoje: s((l) => l.tipo === 'receber' && l.vencimento === hoje),
      pagarVencido: s((l) => l.tipo === 'pagar' && l.vencimento < hoje), receberVencido: s((l) => l.tipo === 'receber' && l.vencimento < hoje),
      pagar7: s((l) => l.tipo === 'pagar' && l.vencimento >= hoje && l.vencimento <= somarDias(hoje, 7)), receber7: s((l) => l.tipo === 'receber' && l.vencimento >= hoje && l.vencimento <= somarDias(hoje, 7)),
      saldo: r2(saldos(est, hoje).filter((x) => ok(x.conta)).reduce((a, b) => a + b.saldo, 0))
    };
  }
  const podeEditar = (perfil) => ['dono', 'financeiro'].includes(perfil);
  const podeVer = (perfil) => ['dono', 'financeiro', 'gerente', 'auditor'].includes(perfil);

  raiz.FINANCEIRO = { FORMAS, FORMAS_TELA, COMPENSACAO, ehCompensacao, CATEGORIAS_PADRAO, CENTROS_PADRAO, NOMES_SIT, LINHAS_DRE, r2, somarDias, somarMeses, mesDe, diasEntre, brl, dataBR, vazio, garantir, categorias, categoria, centros, conta,
    situacao, valorEfetivo, automaticos, todos, materializar, validar, criar, baixar, estornar, cancelar, parcelar, criarConta, transferir, movimentos, saldoConta, saldos,
    fluxo, realizadoMensal, dre, inadimplencia, linkCobranca, numeroBR, dataExtrato, lerOFX, lerCSV, importarExtrato, sugestoes, conciliar, desconciliar, autoConciliar, lancarDoExtrato,
    comissoes, despesasPorMaquina, resumo, podeEditar, podeVer, daLoja };
})(typeof window !== 'undefined' ? window : globalThis);
