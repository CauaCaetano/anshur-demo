// Oficina do Anshur: REGRAS PURAS (sem tela). Testadas em testes_oficina_pecas.js. Telas em areas/oficina.js.
// Dados em estado.oficina = { os, servicos, apontamentos, mecanicos, checklists } (listas com id: a fila offline grava item a item).
// Peças consumidas saem do estoque real (window.PECAS); ao entregar, o dinheiro vai para o Financeiro (window.FINANCEIRO.criar)
// ou, no preparo de usado, vira custo da máquina (estado.preparos, o mesmo registro da "Ordem de preparo" do Pátio).
(function (raiz) {
  const r2 = (v) => Math.round((+v || 0) * 100) / 100;
  const hojeISO = () => new Date().toISOString().slice(0, 10);
  function somarDias(iso, n) { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); }
  let seq = 0;
  const novoId = (pre) => pre + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase() + (seq++).toString(36);

  const TIPOS = { preparo: 'Preparo de usado', revisao: 'Revisão', garantia: 'Garantia de fábrica', conserto: 'Conserto externo', entrega: 'Entrega técnica' };
  const STATUS = { aberta: 'Aberta', aguardando: 'Aguardando peça', execucao: 'Em execução', pronta: 'Pronta', entregue: 'Entregue', cancelada: 'Cancelada' };
  const ABERTOS = ['aberta', 'aguardando', 'execucao', 'pronta'];
  // para onde cada situação pode ir pela tela (entregar é pelo fechamento; cancelar é pela função própria)
  const PASSOS = { aberta: ['execucao', 'aguardando'], aguardando: ['execucao', 'aberta'], execucao: ['aguardando', 'pronta'], pronta: ['execucao'], entregue: [], cancelada: [] };
  const APROVACAO = { pendente: 'Esperando o cliente', aprovado: 'Aprovado', recusado: 'Recusado', dispensado: 'Não precisa' };
  // checklist padrão por tipo de máquina (a revenda pode trocar em Oficina › Checklists)
  const CHECKLISTS_PADRAO = {
    trator: ['Nível e vazamento de óleo do motor', 'Filtros de ar, óleo e combustível', 'Arrefecimento e radiador', 'Embreagem e transmissão', 'Hidráulico e engate de 3 pontos', 'Tomada de força', 'Pneus e rodas', 'Freios', 'Elétrica, painel e luzes', 'Cabine e ar-condicionado'],
    colhedora: ['Motor e arrefecimento', 'Picador e facas', 'Corte de base e discos', 'Elevador e taliscas', 'Extratores primário e secundário', 'Hidráulico e mangueiras', 'Esteiras ou rodado', 'Divisores de linha', 'Elétrica e monitor', 'Cabine e ar-condicionado'],
    pulverizador: ['Motor e transmissão', 'Bomba e válvulas', 'Bicos e filtros de linha', 'Barras e articulação', 'Tanque e agitador', 'Controlador e GPS', 'Pneus e suspensão', 'Elétrica e luzes', 'Cabine e filtro de carvão'],
    plantadeira: ['Discos de corte', 'Sulcadores e hastes', 'Dosadores de semente', 'Dosadores de adubo', 'Correntes e engrenagens', 'Rolamentos', 'Pneus e rodas compactadoras', 'Monitor de plantio', 'Engate e estrutura'],
    outro: ['Estado geral', 'Vazamentos', 'Elétrica', 'Estrutura e soldas', 'Pneus ou rodado']
  };
  const NOTAS_CHECK = { ok: 'OK', atencao: 'Atenção', trocar: 'Trocar / reparar', na: 'Não se aplica' };

  const vazio = () => ({ os: [], servicos: [], apontamentos: [], mecanicos: [], checklists: [] });
  function garantir(est) {
    if (!est.oficina || typeof est.oficina !== 'object' || Array.isArray(est.oficina)) est.oficina = vazio();
    const o = est.oficina; ['os', 'servicos', 'apontamentos', 'mecanicos', 'checklists'].forEach((k) => { if (!Array.isArray(o[k])) o[k] = []; });
    return o;
  }
  const acharOS = (est, id) => garantir(est).os.find((x) => x.id === id) || null;
  function checklistDe(est, tipoMaquina) {
    const c = garantir(est).checklists.find((x) => x.tipoMaquina === tipoMaquina && !x.inativo);
    return c ? c.itens.slice() : (CHECKLISTS_PADRAO[tipoMaquina] || CHECKLISTS_PADRAO.outro).slice();
  }
  function salvarChecklist(est, tipoMaquina, itens) {
    const l = (itens || []).map((s) => String(s).trim()).filter(Boolean); if (!l.length) throw new Error('O checklist precisa de ao menos um item.');
    const o = garantir(est), c = o.checklists.find((x) => x.tipoMaquina === tipoMaquina);
    if (c) { c.itens = l; delete c.inativo; return c; }
    const n = { id: 'CK-' + tipoMaquina, tipoMaquina, itens: l }; o.checklists.push(n); return n;
  }
  function salvarServico(est, d) {
    const nome = String(d.nome || '').trim(); if (!nome) throw new Error('Dê um nome ao serviço.');
    if (!(+d.horas > 0)) throw new Error('Informe o tempo padrão em horas.');
    const o = garantir(est), base = { nome, horas: r2(d.horas), tipoMaquina: d.tipoMaquina || '', preco: d.preco ? r2(d.preco) : 0 };
    if (d.id) { const s = o.servicos.find((x) => x.id === d.id); if (!s) throw new Error('Serviço não encontrado.'); return Object.assign(s, base); }
    const s = Object.assign({ id: novoId('SV') }, base); o.servicos.push(s); return s;
  }
  function salvarMecanico(est, d) {
    const nome = String(d.nome || '').trim(); if (!nome) throw new Error('Dê o nome do mecânico.');
    const o = garantir(est), base = { nome, usuario: d.usuario || '', loja: d.loja || '', especialidade: String(d.especialidade || '').trim(), inativo: !!d.inativo };
    if (d.id) { const m = o.mecanicos.find((x) => x.id === d.id); if (!m) throw new Error('Mecânico não encontrado.'); return Object.assign(m, base); }
    const m = Object.assign({ id: novoId('MC') }, base); o.mecanicos.push(m); return m;
  }

  // ---------- abrir OS ----------
  function proximoNumero(est, sufixo = '') {
    const n = garantir(est).os.map((x) => +(String(x.numero).match(/^OS-(\d+)/) || [])[1] || 0);
    return 'OS-' + (Math.max(5000, ...n) + 1) + sufixo;
  }
  // d: { tipo, loja, cliente (id do cadastro comum), maquina (id de K.cad: troca ou F:<chassi>), maqTexto, tipoMaquina, chassi, horimetro,
  //      problema, previsao, vendedor, garantiaFabricante, sufixo }
  function criarOS(est, d, quem = '', agora = new Date().toISOString()) {
    if (!TIPOS[d.tipo]) throw new Error('Escolha o tipo da OS.');
    if (d.tipo === 'preparo' && !d.maquina) throw new Error('No preparo, escolha o usado do pátio.');
    if (d.tipo !== 'preparo' && !d.cliente) throw new Error('Escolha o cliente.');
    if (!d.maquina && !String(d.maqTexto || '').trim()) throw new Error('Informe a máquina (do cadastro ou escrita).');
    const o = garantir(est), hoje = agora.slice(0, 10);
    const os = { id: novoId('OS'), numero: d.numero || proximoNumero(est, d.sufixo || ''), tipo: d.tipo, status: 'aberta', loja: d.loja || '', cliente: d.tipo === 'preparo' ? '' : d.cliente,
      maquina: d.maquina || '', maqTexto: String(d.maqTexto || '').trim(), tipoMaquina: d.tipoMaquina || 'outro', chassi: String(d.chassi || '').trim(), horimetro: +d.horimetro || 0,
      problema: String(d.problema || '').trim(), diagnostico: '', checklist: {}, itens: [], abertura: d.abertura || hoje, previsao: d.previsao || '', vendedor: d.vendedor || '',
      mecanicos: [], docs: [], aprovacao: { status: d.tipo === 'preparo' || d.tipo === 'garantia' || d.tipo === 'entrega' ? 'dispensado' : 'pendente' },
      garantiaFabricante: d.garantiaFabricante || '', criadoPor: quem, criadoEm: agora, historico: [{ quando: agora, por: quem, txt: 'OS aberta' }] };
    o.os.push(os); return os;
  }
  const hist = (os, quem, txt, agora = new Date().toISOString()) => { os.historico = (os.historico || []).concat([{ quando: agora, por: quem, txt }]).slice(-80); };

  // ---------- orçamento: peças, serviços padrão e mão de obra ----------
  // item: { tipo: 'peca' | 'servico' | 'terceiro', peca?, servico?, descricao, qtd, preco (unitário de venda), horas? (serviço), custo? (terceiro) }
  function adicionarItem(est, os, it, { valorHora = 180, PECAS = null } = {}) {
    if (!podeMexer(os)) throw new Error('OS fechada: não muda mais.');
    const qtd = +it.qtd || 1; if (!(qtd > 0)) throw new Error('Quantidade inválida.');
    let x;
    if (it.tipo === 'peca') {
      const p = PECAS && PECAS.peca(est, it.peca); if (!p) throw new Error('Escolha a peça do catálogo.');
      x = { tipo: 'peca', peca: p.id, descricao: `${p.sku} · ${p.descricao}`, qtd, preco: r2(it.preco != null && it.preco !== '' ? it.preco : p.preco) };
    } else if (it.tipo === 'servico') {
      const s = it.servico ? garantir(est).servicos.find((y) => y.id === it.servico) : null;
      const horas = r2(it.horas != null && it.horas !== '' ? it.horas : s ? s.horas : 0); if (!(horas > 0)) throw new Error('Informe as horas do serviço.');
      const desc = String(it.descricao || (s && s.nome) || '').trim(); if (!desc) throw new Error('Descreva o serviço.');
      x = { tipo: 'servico', servico: s ? s.id : '', descricao: desc, qtd: 1, horas, preco: r2(it.preco != null && it.preco !== '' ? it.preco : s && s.preco ? s.preco : horas * valorHora) };
    } else if (it.tipo === 'terceiro') {
      const desc = String(it.descricao || '').trim(); if (!desc) throw new Error('Descreva o serviço de terceiro.');
      x = { tipo: 'terceiro', descricao: desc, qtd: 1, custo: r2(it.custo), preco: r2(it.preco != null && it.preco !== '' ? it.preco : it.custo) };
    } else throw new Error('Tipo de item inválido.');
    x.id = novoId('IT'); os.itens.push(x);
    if (os.aprovacao && os.aprovacao.status === 'aprovado') os.aprovacao = { status: 'pendente', antes: os.aprovacao }; // orçamento mudou depois de aprovado
    return x;
  }
  function removerItem(est, os, itemId, PECAS) {
    if (!podeMexer(os)) throw new Error('OS fechada: não muda mais.');
    const it = os.itens.find((x) => x.id === itemId); if (!it) return null;
    if (it.tipo === 'peca' && PECAS && consumido(est, os, it.peca, PECAS) > 0) throw new Error('Esta peça já saiu do estoque. Devolva antes de tirar do orçamento.');
    os.itens = os.itens.filter((x) => x.id !== itemId); return it;
  }
  const podeMexer = (os) => ABERTOS.includes(os.status);
  function totais(os) {
    const s = (f) => r2(os.itens.filter(f).reduce((a, i) => a + i.qtd * i.preco, 0));
    const pecas = s((i) => i.tipo === 'peca'), servicos = s((i) => i.tipo === 'servico'), terceiros = s((i) => i.tipo === 'terceiro');
    const desconto = r2(os.desconto || 0);
    return { pecas, servicos, terceiros, desconto, total: r2(Math.max(0, pecas + servicos + terceiros - desconto)), horas: r2(os.itens.filter((i) => i.tipo === 'servico').reduce((a, i) => a + i.horas, 0)) };
  }

  // ---------- aprovação do cliente (WhatsApp com o orçamento pronto) ----------
  const brl = (v) => (+v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const dataBR = (iso) => (iso ? iso.split('-').reverse().join('/') : '');
  function textoOrcamento(os, { revenda = '', cliente = '', maquina = '' } = {}) {
    const t = totais(os);
    const linhas = os.itens.map((i) => `• ${i.tipo === 'servico' ? i.descricao + ' (' + String(i.horas).replace('.', ',') + ' h)' : (i.qtd !== 1 ? i.qtd + ' × ' : '') + i.descricao}: ${brl(i.qtd * i.preco)}`).join('\n');
    return `Olá, ${String(cliente || '').split(' ')[0] || 'tudo bem'}! Aqui é da oficina da ${revenda}.\nOrçamento da ${os.numero}${maquina ? ' · ' + maquina : ''}:\n${os.diagnostico ? 'Diagnóstico: ' + os.diagnostico + '\n' : ''}${linhas}\n${t.desconto ? 'Desconto: ' + brl(t.desconto) + '\n' : ''}Total: ${brl(t.total)}${os.previsao ? '\nPrevisão de entrega: ' + dataBR(os.previsao) : ''}\nPosso seguir com o serviço? Responda SIM para aprovar.`;
  }
  function linkAprovacao(os, { telefone = '', ...o } = {}) {
    let d = String(telefone || '').replace(/\D/g, ''); if (d && d.length <= 11) d = '55' + d;
    return `https://wa.me/${d}?text=${encodeURIComponent(textoOrcamento(os, o))}`;
  }
  function registrarAprovacao(os, status, { via = 'WhatsApp', quem = '', agora = new Date().toISOString(), obs = '' } = {}) {
    if (!APROVACAO[status]) throw new Error('Situação de aprovação inválida.');
    os.aprovacao = { status, via, por: quem, em: agora, valor: totais(os).total, obs };
    hist(os, quem, `Orçamento ${APROVACAO[status].toLowerCase()} (${via}) · ${brl(os.aprovacao.valor)}`, agora); return os.aprovacao;
  }

  // ---------- situação ----------
  function mudarStatus(os, novo, quem = '', agora = new Date().toISOString()) {
    if (!(PASSOS[os.status] || []).includes(novo)) throw new Error(`Não dá para ir de "${STATUS[os.status]}" para "${STATUS[novo] || novo}".`);
    if (novo === 'execucao' && os.aprovacao && os.aprovacao.status === 'pendente' && os.itens.length) throw new Error('O cliente ainda não aprovou o orçamento.');
    if (novo === 'execucao' && os.aprovacao && os.aprovacao.status === 'recusado') throw new Error('O cliente recusou o orçamento.');
    hist(os, quem, `${STATUS[os.status]} → ${STATUS[novo]}`, agora); os.status = novo; return os;
  }

  // ---------- mecânicos: apontamento de início e fim ----------
  function apontamentoAberto(est, mecanico) { return garantir(est).apontamentos.find((a) => a.mecanico === mecanico && !a.fim) || null; }
  function iniciar(est, { os: osId, mecanico, obs = '' }, quem = '', agora = new Date().toISOString()) {
    const os = acharOS(est, osId); if (!os) throw new Error('OS não encontrada.');
    if (!podeMexer(os)) throw new Error('OS fechada.');
    if (!mecanico) throw new Error('Escolha o mecânico.');
    const ja = apontamentoAberto(est, mecanico); if (ja) throw new Error('Este mecânico já está apontando em outra OS. Encerre antes.');
    const a = { id: novoId('AP'), os: osId, mecanico, inicio: agora, fim: '', horas: 0, obs, por: quem };
    garantir(est).apontamentos.push(a);
    if (!os.mecanicos.includes(mecanico)) os.mecanicos.push(mecanico);
    if (os.status === 'aberta' || os.status === 'aguardando') { try { mudarStatus(os, 'execucao', quem, agora); } catch (e) { /* aprovação pendente: aponta, mas a OS fica como está */ } }
    return a;
  }
  function encerrar(est, id, agora = new Date().toISOString(), obs = '') {
    const a = garantir(est).apontamentos.find((x) => x.id === id); if (!a) throw new Error('Apontamento não encontrado.');
    if (a.fim) return a;
    if (agora < a.inicio) throw new Error('O fim não pode ser antes do início.');
    a.fim = agora; a.horas = r2((new Date(agora) - new Date(a.inicio)) / 3.6e6); if (obs) a.obs = obs; return a;
  }
  // apontamento à mão (esqueceu de iniciar): início e fim informados
  function apontarManual(est, { os: osId, mecanico, inicio, fim, obs = '' }, quem = '') {
    const os = acharOS(est, osId); if (!os) throw new Error('OS não encontrada.');
    if (!mecanico) throw new Error('Escolha o mecânico.');
    if (!inicio || !fim || fim <= inicio) throw new Error('O fim tem que ser depois do início.');
    const a = { id: novoId('AP'), os: osId, mecanico, inicio, fim, horas: r2((new Date(fim) - new Date(inicio)) / 3.6e6), obs, por: quem, manual: true };
    if (a.horas > 24) throw new Error('Apontamento acima de 24 horas: divida por dia.');
    garantir(est).apontamentos.push(a); if (!os.mecanicos.includes(mecanico)) os.mecanicos.push(mecanico); return a;
  }
  const apontamentosDa = (est, osId) => garantir(est).apontamentos.filter((a) => a.os === osId);
  const horasApontadas = (est, osId) => r2(apontamentosDa(est, osId).reduce((s, a) => s + (a.fim ? a.horas : 0), 0));

  // ---------- peças: consumo real do estoque ----------
  function consumido(est, os, pecaId, PECAS) {
    return PECAS.r3(PECAS.garantir(est).movimentos.filter((m) => m.ref === os.id && m.peca === pecaId).reduce((s, m) => s + (m.tipo === 'saida' ? m.qtd : m.tipo === 'devolucao' ? -m.qtd : 0), 0));
  }
  function pendentes(est, os, PECAS) {
    const orc = {}; os.itens.filter((i) => i.tipo === 'peca').forEach((i) => { orc[i.peca] = (orc[i.peca] || 0) + i.qtd; });
    return Object.entries(orc).map(([peca, qtd]) => ({ peca, orcado: qtd, consumido: consumido(est, os, peca, PECAS), falta: PECAS.r3(qtd - consumido(est, os, peca, PECAS)) })).filter((x) => x.falta > 0);
  }
  // baixa no estoque o que falta das peças do orçamento (todas ou só as informadas). Confere o saldo de tudo antes de tirar.
  function consumir(est, os, PECAS, { loja = os.loja, data = hojeISO(), so = null } = {}, quem = '', agora = new Date().toISOString()) {
    if (!podeMexer(os)) throw new Error('OS fechada.');
    const l = pendentes(est, os, PECAS).filter((x) => !so || so.includes(x.peca));
    const faltam = l.filter((x) => PECAS.posicao(est, x.peca, { loja }).qtd < x.falta);
    if (faltam.length) { const e = new Error('Sem saldo: ' + faltam.map((x) => `${PECAS.peca(est, x.peca).descricao} (tem ${PECAS.posicao(est, x.peca, { loja }).qtd}, precisa ${x.falta})`).join('; ')); e.faltam = faltam; throw e; }
    const movs = l.map((x) => PECAS.saida(est, { peca: x.peca, qtd: x.falta, loja, data, origem: 'os', ref: os.id, obs: os.numero }, quem, agora));
    if (movs.length) hist(os, quem, `${movs.length} ${movs.length === 1 ? 'peça baixada' : 'peças baixadas'} do estoque`, agora);
    return movs;
  }
  // devolve ao estoque (pelo mesmo custo da saída) o que foi consumido desta OS
  function devolver(est, os, PECAS, { peca = null, qtd = null, loja = os.loja, data = hojeISO() } = {}, quem = '', agora = new Date().toISOString()) {
    const ids = [...new Set(PECAS.garantir(est).movimentos.filter((m) => m.ref === os.id && m.tipo === 'saida' && (!peca || m.peca === peca)).map((m) => m.peca))];
    const out = [];
    ids.forEach((id) => {
      const c = consumido(est, os, id, PECAS), q = peca && qtd != null ? Math.min(+qtd, c) : c; if (!(q > 0)) return;
      const saidas = PECAS.garantir(est).movimentos.filter((m) => m.ref === os.id && m.tipo === 'saida' && m.peca === id);
      const custo = saidas.length ? saidas[saidas.length - 1].custo : PECAS.posicao(est, id).custoMedio;
      out.push(PECAS.movimento(est, { tipo: 'devolucao', peca: id, qtd: q, custo, loja, data, origem: 'devolucao', ref: os.id, obs: 'Devolução da ' + os.numero }, quem, agora));
    });
    return out;
  }
  // custo real: peças que saíram (a custo médio) + horas × valor da hora + terceiros
  function custo(est, os, PECAS, { valorHora = 180 } = {}) {
    const movs = PECAS ? PECAS.garantir(est).movimentos.filter((m) => m.ref === os.id) : [];
    const pecas = r2(movs.reduce((s, m) => s + (m.tipo === 'saida' ? 1 : m.tipo === 'devolucao' ? -1 : 0) * m.qtd * (m.custo || 0), 0));
    const apont = horasApontadas(est, os.id), orc = totais(os).horas, horas = apont > 0 ? apont : orc;
    const terceiros = r2(os.itens.filter((i) => i.tipo === 'terceiro').reduce((s, i) => s + (i.custo || 0), 0));
    return { pecas, horas, horasFonte: apont > 0 ? 'apontadas' : 'orçadas', maoDeObra: r2(horas * valorHora), terceiros, total: r2(pecas + horas * valorHora + terceiros) };
  }

  // ---------- preparo de usado: o mesmo registro da "Ordem de preparo" do Pátio (estado.preparos[troca]) ----------
  // Os itens de cada OS ficam marcados com { os } e substituídos ao fechar de novo (idempotente). Preparo já registrado antes
  // sem itens vira um item "Preparo registrado antes" (nada se perde). valor = peças + horas × valor da hora (regra do Pátio).
  function aplicarPreparo(est, trocaId, os, c, { valorHora = 180, data = hojeISO() } = {}) {
    est.preparos = est.preparos || {};
    const ant = est.preparos[trocaId];
    let itens = ant && Array.isArray(ant.itens) && ant.itens.length ? ant.itens.slice() : ant && ant.valor ? [{ desc: 'Preparo registrado antes', pecas: ant.valor, horas: 0 }] : [];
    itens = itens.filter((it) => it.os !== os.id);
    const terc = os.itens.filter((i) => i.tipo === 'terceiro').map((i) => i.descricao).join(', ');
    itens.push({ desc: `${os.numero}: ${os.diagnostico || os.problema || 'preparo na oficina'}`.slice(0, 120), pecas: r2(c.pecas + c.terceiros), horas: c.horas, os: os.id, terceiros: terc || undefined });
    const valor = Math.round(itens.reduce((s, it) => s + (+it.pecas || 0) + (+it.horas || 0) * valorHora, 0));
    est.preparos[trocaId] = { valor, data, itens };
    return est.preparos[trocaId];
  }
  // migração sem mexer nos dados: preparo registrado no Pátio (fora de OS) aparece como OS antiga, só leitura
  function preparosAntigos(est, nomeMaq = () => '', valorHora = 180) {
    garantir(est);
    return Object.entries(est.preparos || {}).map(([id, p]) => {
      const soltos = (p.itens || []).filter((it) => !it.os);
      if (p.itens && p.itens.length && !soltos.length) return null;
      if (!p.itens || !p.itens.length) { if (!p.valor) return null; }
      return { id: 'OSP-' + id, numero: 'Preparo antigo', virtual: true, migrada: true, tipo: 'preparo', status: 'entregue', maquina: id, maqTexto: nomeMaq(id), cliente: '', loja: '', abertura: p.data || '', itens: [],
        itensAntigos: soltos.length ? soltos : [{ desc: 'Preparo registrado (sem itens)', pecas: p.valor, horas: 0 }], fechamento: { data: p.data, custo: soltos.length ? Math.round(soltos.reduce((t, it) => t + (+it.pecas || 0) + (+it.horas || 0) * valorHora, 0)) : p.valor, preparo: true }, historico: [] };
    }).filter(Boolean);
  }

  // ---------- fechar (entregar) a OS ----------
  // e: { data, vencimento, recebidoPor, documento, assinatura, garantiaDias, obs }
  // ctx: { PECAS, F, valorHora, maquina: (id) => ({ t, nome, marca, modelo }) , clienteNome, quem, agora, garantias (lista estado.extras.garantias) }
  function fechar(est, osId, e = {}, ctx = {}) {
    const os = acharOS(est, osId); if (!os) throw new Error('OS não encontrada.');
    if (os.fechamento) return os.fechamento; // fechar de novo não duplica nada
    if (os.status === 'cancelada') throw new Error('OS cancelada.');
    if (os.status !== 'pronta') throw new Error('Marque a OS como pronta antes de entregar.');
    if (os.aprovacao && os.aprovacao.status === 'pendente' && os.itens.length) throw new Error('O orçamento ainda não foi aprovado.');
    if (!String(e.recebidoPor || '').trim()) throw new Error('Quem recebeu a máquina?');
    const { PECAS, F, quem = '', agora = new Date().toISOString() } = ctx, valorHora = ctx.valorHora || 180, data = e.data || agora.slice(0, 10);
    if (PECAS) consumir(est, os, PECAS, { data }, quem, agora);
    const t = totais(os), c = custo(est, os, PECAS, { valorHora });
    const m = ctx.maquina ? ctx.maquina(os.maquina) : null, nomeM = (m && m.nome) || os.maqTexto || '';
    const fch = { data, venda: t.total, custo: c, lancamentos: [], por: quem, em: agora };
    if (os.tipo === 'preparo') {
      const pr = aplicarPreparo(est, os.maquina, os, c, { valorHora, data }); fch.preparo = true; fch.custoMaquina = pr.valor;
    } else {
      const base = { valor: t.total, custoVenda: r2(c.pecas + c.terceiros), vencimento: e.vencimento || data, competencia: data, centro: 'cc-oficina', loja: os.loja, maquina: os.maquina || '', os: os.numero, documento: os.numero, origem: 'oficina' };
      if (os.tipo === 'garantia') {
        const marca = os.garantiaFabricante || (m && m.marca) || 'Fabricante';
        const g = { id: 'GAR-' + os.id, os: os.numero, data, marca, modelo: (m && m.modelo) || '', servico: (os.diagnostico || os.problema || 'Serviço em garantia').slice(0, 80), cliente: ctx.clienteNome || '', valor: Math.round(t.total), pago: 0, status: 'aguardando', motivo: '', origemOS: os.id };
        if (ctx.garantias && !ctx.garantias.some((x) => x.origemOS === os.id)) { ctx.garantias.push(g); fch.garantia = g.id; }
        if (F && t.total > 0) { const ls = F.criar(est, Object.assign({ tipo: 'receber', descricao: `Garantia ${os.numero} · ${marca}${nomeM ? ' · ' + nomeM : ''}`, categoria: 'rec-garantia', favorecido: marca }, base), quem, agora); ls.forEach((l) => { l.origemId = os.id; }); fch.lancamentos = ls.map((l) => l.id); }
      } else if (F && t.total > 0) {
        const ls = F.criar(est, Object.assign({ tipo: 'receber', descricao: `${TIPOS[os.tipo]} ${os.numero}${nomeM ? ' · ' + nomeM : ''}`, categoria: 'rec-oficina', cliente: os.cliente, parcelas: e.parcelas || 1 }, base), quem, agora);
        ls.forEach((l) => { l.origemId = os.id; }); fch.lancamentos = ls.map((l) => l.id);
      }
    }
    const dias = Math.max(0, Math.floor(+e.garantiaDias || 0));
    os.garantiaServico = dias ? { dias, ate: somarDias(data, dias) } : null;
    os.entrega = { data, recebidoPor: String(e.recebidoPor).trim(), documento: String(e.documento || '').trim(), assinatura: e.assinatura || '', obs: e.obs || '', por: quem, em: agora };
    os.fechamento = fch; hist(os, quem, `Entregue a ${os.entrega.recebidoPor}${t.total ? ' · ' + brl(t.total) : ''}`, agora); os.status = 'entregue';
    return fch;
  }
  function cancelarOS(est, osId, motivo, ctx = {}) {
    const os = acharOS(est, osId); if (!os) throw new Error('OS não encontrada.');
    if (!podeMexer(os)) throw new Error('Só dá para cancelar OS em aberto.');
    if (!String(motivo || '').trim()) throw new Error('Informe o motivo do cancelamento.');
    const { PECAS, quem = '', agora = new Date().toISOString() } = ctx;
    const dev = PECAS ? devolver(est, os, PECAS, {}, quem, agora) : [];
    garantir(est).apontamentos.filter((a) => a.os === os.id && !a.fim).forEach((a) => encerrar(est, a.id, agora));
    os.cancelada = { motivo: String(motivo).trim(), por: quem, em: agora, devolvidas: dev.length };
    hist(os, quem, 'OS cancelada: ' + os.cancelada.motivo, agora); os.status = 'cancelada'; return os;
  }

  // ---------- visão geral ----------
  const daLoja = (loja, lojas) => (x) => (loja ? x.loja === loja : (!lojas || !lojas.length || !x.loja || lojas.includes(x.loja)));
  function resumo(est, { loja = '', lojas = null, hoje = hojeISO() } = {}) {
    const l = garantir(est).os.filter(daLoja(loja, lojas)), ab = l.filter((o) => ABERTOS.includes(o.status));
    const por = {}; Object.keys(STATUS).forEach((k) => { por[k] = l.filter((o) => o.status === k).length; });
    return { abertas: ab.length, por, atrasadas: ab.filter((o) => o.previsao && o.previsao < hoje).length, semAprovacao: ab.filter((o) => o.aprovacao && o.aprovacao.status === 'pendente' && o.itens.length).length,
      entreguesMes: l.filter((o) => o.status === 'entregue' && o.fechamento && String(o.fechamento.data).slice(0, 7) === hoje.slice(0, 7)).length,
      faturadoMes: r2(l.filter((o) => o.status === 'entregue' && o.fechamento && String(o.fechamento.data).slice(0, 7) === hoje.slice(0, 7)).reduce((s, o) => s + (o.fechamento.venda || 0), 0)) };
  }
  // vendedor vê só a situação das OS dos clientes dele (sem valores)
  const doVendedor = (os, nome) => !!nome && os.vendedor === nome;
  const podeVer = (perfil) => ['dono', 'gerente', 'oficina', 'financeiro', 'auditor'].includes(perfil);
  const podeEditar = (perfil) => ['dono', 'gerente', 'oficina'].includes(perfil);

  raiz.OFICINA = { TIPOS, STATUS, ABERTOS, PASSOS, APROVACAO, CHECKLISTS_PADRAO, NOTAS_CHECK, r2, somarDias, novoId, vazio, garantir, acharOS, checklistDe, salvarChecklist, salvarServico, salvarMecanico,
    proximoNumero, criarOS, adicionarItem, removerItem, podeMexer, totais, textoOrcamento, linkAprovacao, registrarAprovacao, mudarStatus, apontamentoAberto, iniciar, encerrar, apontarManual,
    apontamentosDa, horasApontadas, consumido, pendentes, consumir, devolver, custo, aplicarPreparo, preparosAntigos, fechar, cancelarOS, resumo, doVendedor, podeVer, podeEditar, daLoja, historico: hist, brl, dataBR };
})(typeof window !== 'undefined' ? window : globalThis);
