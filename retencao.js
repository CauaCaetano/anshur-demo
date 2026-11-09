// Hábito e valor acumulado (partes puras, testadas em testes.js e usadas também pela Edge Function anshur-alertas):
// - acoesDoDia: a Central "Hoje" por perfil e loja (no máximo 3 prioridades + lista de ações, cada uma com o botão que resolve)
// - rituais: rotina diária/semanal de cada perfil, gerada dos dados reais
// - memoriaComercial: como a referência de preço da revenda evolui a cada troca vendida (nunca "valor de mercado")
// - linhaDoTempo: histórico vivo da revenda com filtros e indicadores por marca, modelo e loja
// - resumoEmail: o aviso por e-mail (só quando há algo relevante)
// - ANGULOS: fotos guiadas por tipo de máquina para a avaliação com IA
// Ético: nada aqui prende dados ou cria urgência falsa; cada item vem de um dado real da revenda.
(function (raiz) {
  'use strict';
  const DIA = 864e5;
  const diasEntre = (a, b) => Math.max(0, Math.round((new Date(String(b).slice(0, 10) + 'T12:00:00') - new Date(String(a).slice(0, 10) + 'T12:00:00')) / DIA));
  const real = (v) => (v < 0 ? '−' : '') + 'R$ ' + Math.abs(Math.round(v || 0)).toLocaleString('pt-BR');
  const NOMES = { trator: 'Trator', colhedora: 'Colhedora de cana', pulverizador: 'Pulverizador', plantadeira: 'Plantadeira' };
  const nomeMaq = (t) => [t && t.marca, t && t.modelo].filter(Boolean).join(' ') + (t && t.ano ? ' ' + t.ano : '');

  // ---------- fotos guiadas por tipo (10 a 15) e o que cada uma ajuda a avaliar na ficha ----------
  const BASE = [
    ['frente', 'Frente', 'De frente, a máquina inteira no quadro', ['lataria', 'pneus']],
    ['traseira', 'Traseira', 'De trás, a máquina inteira', ['lataria', 'hidraulico']],
    ['lat-esq', 'Lateral esquerda', 'Lado esquerdo inteiro, a uns 5 passos', ['lataria', 'pneus']],
    ['lat-dir', 'Lateral direita', 'Lado direito inteiro, a uns 5 passos', ['lataria', 'pneus']]
  ];
  const CABINE = [
    ['cabine', 'Cabine e painel', 'Painel ligado, bancos, monitor e comandos', ['cabine']],
    ['horimetro', 'Horímetro', 'Close do horímetro com o número legível', ['cabine']],
    ['motor', 'Motor', 'Capô aberto: bloco, mangueiras e radiador', ['motor']]
  ];
  const CHASSI = ['chassi', 'Placa / chassi', 'Plaqueta de identificação e número de série', []];
  const ANGULOS = {
    trator: [...BASE, ...CABINE,
      ['pneus-tras', 'Pneus traseiros', 'Garras e laterais dos pneus de trás', ['pneus']],
      ['pneus-diant', 'Pneus dianteiros', 'Garras e laterais dos pneus da frente', ['pneus']],
      ['hidraulico', 'Hidráulico e 3º ponto', 'Engates, cilindros e mangueiras de trás', ['hidraulico']],
      ['tdp', 'TDP e engate', 'Tomada de força e barra de tração', ['transmissao']],
      ['transmissao', 'Transmissão por baixo', 'Caixa e diferencial: procure vazamento de óleo', ['transmissao']],
      CHASSI],
    colhedora: [...BASE, ...CABINE,
      ['esteira', 'Esteira / rodado', 'Sapatas, roletes e rodas motrizes', ['pneus']],
      ['corte-base', 'Corte de base', 'Discos e facas do corte de base', ['hidraulico']],
      ['rolos', 'Rolos e picador', 'Rolos alimentadores e facas do picador', ['transmissao']],
      ['elevador', 'Elevador e extrator', 'Taliscas, corrente e extrator primário', ['transmissao']],
      ['hidraulico', 'Hidráulico', 'Bombas, cilindros e mangueiras', ['hidraulico']],
      CHASSI],
    pulverizador: [...BASE, ...CABINE,
      ['pneus', 'Pneus', 'Garras e laterais dos pneus', ['pneus']],
      ['barras', 'Barras e bicos', 'Barras abertas: soldas, bicos e mangueiras', ['hidraulico']],
      ['tanque', 'Tanque e bomba', 'Tanque de calda, bomba e filtros', ['hidraulico']],
      ['suspensao', 'Suspensão e bitola', 'Amortecedores e ajuste de bitola', ['transmissao']],
      ['hidraulico', 'Hidráulico das barras', 'Cilindros e mangueiras das barras', ['hidraulico']],
      CHASSI],
    // plantadeira é rebocada: sem cabine, motor nem horímetro próprios
    plantadeira: [...BASE,
      ['cabecalho', 'Cabeçalho e engate', 'Cabeçalho, engate e macaco', ['lataria']],
      ['linhas', 'Linhas de plantio', 'Discos de corte, sulcadores e rodas compactadoras', ['transmissao']],
      ['dosadores', 'Dosadores de semente', 'Caixas e discos dosadores', ['transmissao']],
      ['adubo', 'Caixas de adubo', 'Caixas, roscas e corrosão do adubo', ['lataria']],
      ['rodas', 'Rodas e transmissão', 'Pneus de transporte e correntes/engrenagens', ['pneus', 'transmissao']],
      ['hidraulico', 'Hidráulico e marcadores', 'Cilindros, mangueiras e marcadores de linha', ['hidraulico']],
      ['monitor', 'Monitor de plantio', 'Monitor e sensores (se tiver)', ['cabine']],
      CHASSI]
  };
  const angulosDe = (tipo) => (ANGULOS[tipo] || ANGULOS.trator).map(([id, nome, dica, itens]) => ({ id, nome, dica, itens }));

  // confere e limpa a resposta da IA (servidor e app): notas 1–5 ou null ("não dá para ver"), textos curtos
  const ITENS = ['motor', 'transmissao', 'hidraulico', 'pneus', 'cabine', 'lataria'];
  const curto = (s, n) => String(s == null ? '' : s).replace(/[\u0000-\u001f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n);
  function limparSugestao(o, angulosValidos) {
    const ok = new Set(angulosValidos || []);
    const r = { itens: {}, avarias: [], faltando: [], observacao: '' };
    const it = (o && o.itens) || {};
    ITENS.forEach((k) => {
      const x = it[k] || {}, n = Number(x.nota);
      r.itens[k] = { nota: Number.isInteger(n) && n >= 1 && n <= 5 ? n : null, justificativa: curto(x.justificativa, 220) || (Number.isInteger(n) ? '' : 'Não dá para ver nas fotos.') };
    });
    (Array.isArray(o && o.avarias) ? o.avarias : []).slice(0, 12).forEach((a) => {
      const d = curto(a && a.descricao, 200); if (!d) return;
      r.avarias.push({ descricao: d, foto: ok.has(a.foto) ? a.foto : '', gravidade: ['leve', 'moderada', 'grave'].includes(a.gravidade) ? a.gravidade : 'moderada' });
    });
    (Array.isArray(o && o.faltando) ? o.faltando : []).slice(0, 20).forEach((f) => {
      const m = curto(f && f.motivo, 160); if (!f || !(ok.has(f.angulo) || f.angulo === 'outra')) return;
      r.faltando.push({ angulo: f.angulo, motivo: m || 'Foto faltando ou sem nitidez.' });
    });
    r.observacao = curto(o && o.observacao, 300);
    return r;
  }

  // ---------- trocas a partir do estado salvo (o que o servidor guarda) ----------
  function trocasDoEstado(d) {
    const lista = [].concat(d.historico || [], d.fechadas || []).map((t) => Object.assign({}, t));
    lista.forEach((t) => {
      const p = (d.precos || {})[t.id]; if (Array.isArray(p) && p.length) { t.precos = (t.precos || []).concat(p); t.anuncio = p[p.length - 1].valor; }
      const pr = (d.preparos || {})[t.id]; if (pr) { t.preparo = pr.valor; t.preparoRegistrado = pr.data; }
      const c = (d.custos || {})[t.id]; if (c) t.custos = Object.assign({}, t.custos, c);
      const v = (d.vendas || {})[t.id]; if (v) { t.vendido = v.valor; t.saida = v.data; }
    });
    return lista;
  }
  function compradoresPara(t, compradores) {
    return (compradores || []).filter((c) => c.tipo === t.tipo && (!c.marcas || c.marcas === t.marca) && t.ano >= (+c.anoMin || 0) && (!c.precoMax || (t.anuncio || t.pago * 1.15) <= c.precoMax * 1.08))
      .map((c) => ({ c, folga: c.precoMax ? c.precoMax - (t.anuncio || 0) : 0 })).sort((a, b) => b.folga - a.folga).map((x) => x.c);
  }
  // link wa.me pronto (sem número quando o comprador não tem telefone cadastrado: a pessoa escolhe o contato)
  function linkWhats(comprador, t, revenda) {
    const fone = String((comprador && comprador.telefone) || '').replace(/\D/g, '');
    const num = fone.length >= 10 ? (fone.length <= 11 ? '55' + fone : fone) : '';
    const txt = `Olá${comprador && comprador.nome ? ', ' + String(comprador.nome).split(' ')[0] : ''}! Aqui é da ${revenda || 'revenda'}. Entrou no pátio um ${NOMES[t.tipo] ? NOMES[t.tipo].toLowerCase() : 'usado'} ${nomeMaq(t)}${t.horas ? ', ' + Number(t.horas).toLocaleString('pt-BR') + ' h' : ''}, do jeito que você procura. Quer ver fotos e a ficha?`;
    return `https://wa.me/${num}?text=${encodeURIComponent(txt)}`;
  }
  // faixas de idade do pátio (as mesmas das telas): entrou numa faixa nova dentro da janela?
  const FAIXAS = [[31, 'atencao', 'Atenção (31 a 60 dias)'], [61, 'alerta', 'Alerta (61 a 90 dias)'], [91, 'critico', 'Crítico (mais de 90 dias)']];
  function mudouFaixa(dias, janela) { for (let i = FAIXAS.length - 1; i >= 0; i--) { const [lim] = FAIXAS[i]; if (dias >= lim && dias - janela < lim) return { faixa: FAIXAS[i][1], nome: FAIXAS[i][2], ha: dias - lim }; } return null; }

  // ---------- CENTRAL DO DIA ----------
  // ctx: { hoje, perfil, nome, trocas (escopo da loja), avaliacoes, pendentes, garantias, financiadas, compradores, revenda,
  //        podeLiberar(nivel), janela (dias para "mudou de faixa" e "máquina nova"), rascunho (avaliação em andamento), margemDe(t) opcional }
  const QUEM = {
    aprovar: ['dono', 'gerente'], pedido: ['vendedor', 'gerente', 'dono'], avaliacao: ['vendedor', 'gerente', 'dono'], rascunho: ['vendedor', 'gerente', 'dono'],
    comprador: ['vendedor', 'gerente', 'dono'], faixa: ['vendedor', 'gerente', 'dono'], margem: ['gerente', 'dono'], preparo: ['oficina', 'gerente'],
    garantia: ['oficina', 'financeiro', 'dono'], floor: ['financeiro', 'dono', 'gerente'], comissao: ['financeiro'], conferir: ['auditor']
  };
  function acoesDoDia(ctx) {
    const hoje = ctx.hoje, perfil = ctx.perfil || 'dono', janela = ctx.janela || 7, out = [];
    const pode = (cat) => (QUEM[cat] || []).includes(perfil);
    const add = (cat, nivel, valor, o) => { if (pode(cat)) out.push(Object.assign({ cat, nivel, valor: Math.max(0, valor || 0) }, o)); };
    const trocas = ctx.trocas || [], patio = trocas.filter((t) => !t.vendido);
    // 1) aprovações: quem decide vê "Decidir"; quem pediu vê o andamento
    (ctx.pendentes || []).filter((p) => p.status === 'pendente').forEach((p) => {
      const ex = p.valor - ((p.rec && p.rec.teto) || 0);
      if (ctx.podeLiberar ? ctx.podeLiberar(p.nivel || 'gerente') : QUEM.aprovar.includes(perfil)) add('aprovar', 1, ex + 1e6, { id: 'ap-' + p.id, titulo: `Decidir troca acima do teto: ${nomeMaq(p.maq)}`, txt: `${p.por} quer pagar ${real(p.valor)}, ${real(ex)} acima do máximo. O vendedor está esperando.`, botao: { rotulo: 'Decidir agora', ir: '#aprovacoes' } });
      else if (p.por === ctx.nome) add('pedido', 3, ex, { id: 'pd-' + p.id, titulo: `Seu pedido espera aprovação: ${nomeMaq(p.maq)}`, txt: `${p.nivel === 'dono' ? 'Só o dono libera' : 'Aguardando gerente'} · ${real(p.valor)}`, botao: { rotulo: 'Ver pedido', ir: '#aprovacoes' } });
    });
    // 2) avaliação em andamento neste aparelho e avaliações paradas (sem retorno ao cliente)
    if (ctx.rascunho) add('rascunho', 1, 5e5, { id: 'rasc', titulo: 'Avaliação em andamento neste aparelho', txt: ctx.rascunho, botao: { rotulo: 'Continuar avaliação', ir: '#avaliar' } });
    (ctx.avaliacoes || []).forEach((a) => {
      const st = a.status || 'aberta', d = diasEntre(a.data, hoje);
      if (st !== 'aberta' || d < 2 || d > 30 || (a.lembrar && a.lembrar > hoje)) return;
      if (perfil === 'vendedor' && a.por && a.por !== ctx.nome) return;
      add('avaliacao', d >= 5 ? 1 : 2, a.teto || 0, { id: 'av-' + a.id, ref: a.id, titulo: `Avaliação parada há ${d} dias: ${nomeMaq(a.maq || {})}`, txt: `Máximo indicado ${real(a.teto)}${a.por ? ' · avaliada por ' + a.por : ''}. O cliente está esperando um retorno.`, botao: { rotulo: 'Dar retorno', acao: 'avaliacao' } });
    });
    // 3) comprador compatível com máquina que acabou de entrar no pátio
    patio.filter((t) => t.entrada && diasEntre(t.entrada, hoje) <= janela).forEach((t) => {
      const cs = compradoresPara(t, ctx.compradores); if (!cs.length) return;
      add('comprador', 1, t.anuncio || t.pago, { id: 'cp-' + t.id, ref: t.id, titulo: `${cs.length} ${cs.length === 1 ? 'comprador procura' : 'compradores procuram'} o ${nomeMaq(t)} que entrou há ${diasEntre(t.entrada, hoje)} ${diasEntre(t.entrada, hoje) === 1 ? 'dia' : 'dias'}`, txt: cs.slice(0, 3).map((c) => c.nome + (c.precoMax ? ' (até ' + real(c.precoMax) + ')' : '')).join(', '),
        botao: { rotulo: `Chamar ${String(cs[0].nome).split(' ')[0]} no WhatsApp`, href: linkWhats(cs[0], t, ctx.revenda) }, extra: { rotulo: 'Ver compradores', ir: '#compradores' }, whats: cs.slice(0, 3).map((c) => ({ nome: c.nome, href: linkWhats(c, t, ctx.revenda) })) });
    });
    // 4) máquinas que mudaram de faixa de idade
    patio.filter((t) => t.entrada).forEach((t) => {
      const d = diasEntre(t.entrada, hoje), m = mudouFaixa(d, janela); if (!m) return;
      add('faixa', m.faixa === 'critico' ? 2 : 3, t.pago, { id: 'fx-' + t.id + '-' + m.faixa, ref: t.id, titulo: `${nomeMaq(t)} entrou na faixa ${m.nome.split(' (')[0]}`, txt: `${d} dias no pátio · ${real(t.pago)} parados${t.loja ? ' · ' + t.loja : ''}. Revise preço e divulgação.`, botao: { rotulo: 'Revisar a máquina', acao: 'maquina' } });
      const mg = ctx.margemDe ? ctx.margemDe(t) : null;
      if (mg != null && mg < 0.06 && m.faixa === 'critico') add('margem', 2, t.pago, { id: 'mg-' + t.id, ref: t.id, titulo: `Margem baixa e +90 dias: ${nomeMaq(t)}`, txt: `Margem projetada de ${(mg * 100).toFixed(1).replace('.', ',')}%.`, botao: { rotulo: 'Manter ou vender?', acao: 'maquina' } });
    });
    // 5) oficina: máquina recém-chegada sem preparo lançado
    patio.filter((t) => t.previsto && !t.preparoRegistrado && t.entrada && diasEntre(t.entrada, hoje) <= 15).forEach((t) => add('preparo', 2, t.preparoEst || 0, { id: 'pr-' + t.id, ref: t.id, titulo: `Lançar o preparo de ${nomeMaq(t)}`, txt: `Entrou há ${diasEntre(t.entrada, hoje)} dias; previsto ${real(t.preparoEst || 0)}. Sem o preparo real a margem fica estimada.`, botao: { rotulo: 'Lançar preparo', acao: 'maquina' } }));
    // 6) garantias perto de vencer o prazo de cobrança (45–60 dias) e paradas (+60)
    const gs = (ctx.garantias || []).filter((g) => g.status === 'aguardando');
    const venc = gs.filter((g) => { const d = diasEntre(g.data, hoje); return d >= 45 && d <= 60; }), par = gs.filter((g) => diasEntre(g.data, hoje) > 60);
    if (venc.length) add('garantia', 2, venc.reduce((s, g) => s + g.valor, 0), { id: 'gv-' + venc.map((g) => g.os).join(','), titulo: `${venc.length} ${venc.length === 1 ? 'garantia chega' : 'garantias chegam'} a 60 dias sem pagamento`, txt: `${real(venc.reduce((s, g) => s + g.valor, 0))} a cobrar do fabricante antes que fique parado.`, botao: { rotulo: 'Cobrar garantias', ir: '#garantias' } });
    if (par.length) add('garantia', 2, par.reduce((s, g) => s + g.valor, 0), { id: 'gp-' + par.length, titulo: `${par.length} ${par.length === 1 ? 'garantia parada' : 'garantias paradas'} há mais de 60 dias`, txt: `${real(par.reduce((s, g) => s + g.valor, 0))} esperando o fabricante.`, botao: { rotulo: 'Ver garantias', ir: '#garantias' } });
    // 7) floor plan: vendida e não quitada (o juro continua correndo)
    (ctx.financiadas || []).filter((f) => f.venda && !f.quitacao).forEach((f) => add('floor', 1, f.valor, { id: 'fp-' + f.chassi, titulo: `Quitar ${nomeMaq(f)} com o banco`, txt: `Vendida em ${new Date(f.venda + 'T12:00:00').toLocaleDateString('pt-BR')}; o juro corre até quitar.`, botao: { rotulo: 'Ver financiamento', ir: '#financiamento' } }));
    // 8) financeiro: vendas recentes sem comissão lançada (margem fica estimada)
    const semCom = trocas.filter((t) => t.vendido && t.saida && diasEntre(t.saida, hoje) <= 30 && !(t.custos && typeof t.custos.comissao === 'number'));
    if (semCom.length) add('comissao', 3, semCom.reduce((s, t) => s + t.vendido, 0), { id: 'cm-' + semCom.length, titulo: `${semCom.length} ${semCom.length === 1 ? 'venda recente sem comissão lançada' : 'vendas recentes sem comissão lançada'}`, txt: 'Lançando a comissão, a margem dessas vendas deixa de ser estimada.', botao: { rotulo: 'Lançar custos', ir: '#relatorio' } });
    // 9) auditor: trocas acima do teto aprovadas na última semana
    trocas.filter((t) => t.aprovacao && t.entrada && diasEntre(t.entrada, hoje) <= 7).forEach((t) => add('conferir', 3, t.aprovacao.excesso || 0, { id: 'au-' + t.id, titulo: `Conferir troca acima do teto: ${nomeMaq(t)}`, txt: `${real(t.aprovacao.excesso || 0)} acima, aprovada por ${t.aprovacao.por}.`, botao: { rotulo: 'Ver aprovações', ir: '#aprovacoes' } }));
    // dentro do mesmo nível: quem está esperando uma decisão vem antes, depois venda possível, depois dinheiro correndo
    const ORDEM = { aprovar: 0, rascunho: 1, comprador: 2, floor: 3, avaliacao: 4 };
    const lista = out.filter((a) => !(ctx.resolvidos && ctx.resolvidos[a.id])).sort((a, b) => a.nivel - b.nivel || (ORDEM[a.cat] ?? 9) - (ORDEM[b.cat] ?? 9) || b.valor - a.valor);
    return { prioridades: lista.slice(0, 3), acoes: lista, total: lista.length };
  }

  // ---------- RITUAIS ----------
  const semanaISO = (iso) => { const d = new Date(iso + 'T12:00:00'); const dia = (d.getUTCDay() + 6) % 7; d.setUTCDate(d.getUTCDate() - dia + 3); const p = new Date(Date.UTC(d.getUTCFullYear(), 0, 4)); return d.getUTCFullYear() + '-S' + String(1 + Math.round(((d - p) / DIA - 3 + ((p.getUTCDay() + 6) % 7)) / 7)).padStart(2, '0'); };
  const chavePeriodo = (periodo, hoje) => (periodo === 'dia' ? 'D' + hoje : semanaISO(hoje));
  // cada perfil tem a sua rotina; a quantidade vem dos dados de hoje (0 = em dia, nada a fazer)
  function rituais(ctx) {
    const a = acoesDoDia(Object.assign({}, ctx, { perfil: 'dono', resolvidos: null })).acoes, conta = (cat) => a.filter((x) => x.cat === cat).length;
    const patio = (ctx.trocas || []).filter((t) => !t.vendido), velhas = patio.filter((t) => t.entrada && diasEntre(t.entrada, ctx.hoje) > 60).length;
    const avPar = (ctx.avaliacoes || []).filter((x) => (x.status || 'aberta') === 'aberta' && diasEntre(x.data, ctx.hoje) >= 2 && diasEntre(x.data, ctx.hoje) <= 30).length;
    const R = {
      vendedor: [['dia', 'retorno', 'Dar retorno nas avaliações paradas', avPar, '#hoje'], ['dia', 'compradores', 'Chamar compradores das máquinas novas', conta('comprador'), '#hoje'], ['semana', 'anuncios', 'Atualizar anúncio das máquinas com +60 dias', velhas, '#patio']],
      gerente: [['dia', 'aprovacoes', 'Decidir as aprovações pendentes', conta('aprovar'), '#aprovacoes'], ['dia', 'faixas', 'Revisar máquinas que mudaram de faixa', conta('faixa'), '#hoje'], ['semana', 'precos', 'Rever preços do pátio acima de 60 dias', velhas, '#patio'], ['semana', 'teste', 'Conferir o erro do motor (teste às cegas)', null, '#memoria']],
      oficina: [['dia', 'preparo', 'Lançar o preparo das máquinas que chegaram', conta('preparo'), '#patio'], ['semana', 'garantias', 'Mandar ao financeiro as OS de garantia da semana', null, '#garantias']],
      financeiro: [['dia', 'floor', 'Quitar o floor plan das máquinas vendidas', conta('floor'), '#financiamento'], ['semana', 'garantias', 'Cobrar garantias paradas ou perto de 60 dias', conta('garantia'), '#garantias'], ['semana', 'comissoes', 'Lançar comissões das vendas', conta('comissao'), '#relatorio']],
      auditor: [['semana', 'conferir', 'Conferir trocas acima do teto aprovadas', conta('conferir'), '#aprovacoes'], ['semana', 'trilha', 'Ler a trilha do servidor da semana', null, '#atividades']],
      dono: [['dia', 'prioridades', 'Olhar os avisos do dia no portal (todos os sistemas)', null, '#/hoje'], ['semana', 'relatorio', 'Ler o relatório semanal', null, '#relatorio'], ['semana', 'memoria', 'Ver a memória comercial da revenda', null, '#memoria']]
    };
    const out = [];
    Object.entries(R).forEach(([perfil, l]) => l.forEach(([periodo, id, titulo, qtd, ir]) => {
      const chave = chavePeriodo(periodo, ctx.hoje) + '|' + perfil + '|' + id, feito = (ctx.feitos || {})[chave] || null;
      out.push({ chave, perfil, periodo, id, titulo, qtd, ir, feito, emDia: !feito && qtd === 0 });
    }));
    return out;
  }
  // execução das últimas semanas (o dono vê o que foi feito, sem cobrar)
  function execucaoRituais(feitos, hoje, semanas = 4) {
    const res = {};
    Object.entries(feitos || {}).forEach(([chave, f]) => {
      const [per, perfil] = chave.split('|'); const dia = per[0] === 'D' ? per.slice(1) : null;
      if (dia && diasEntre(dia, hoje) > semanas * 7) return;
      if (!dia && per < semanaISO(new Date(new Date(hoje + 'T12:00:00') - semanas * 7 * DIA).toISOString().slice(0, 10))) return;
      res[perfil] = res[perfil] || { n: 0, pessoas: {} }; res[perfil].n++; res[perfil].pessoas[f.por] = (res[perfil].pessoas[f.por] || 0) + 1;
    });
    return res;
  }

  // ---------- MEMÓRIA COMERCIAL ----------
  // testes = M.validar().testes (cada venda prevista só com o que tinha sido vendido antes dela: walk-forward)
  function memoriaComercial(trocas, testes) {
    const vend = (trocas || []).filter((t) => t.vendido && t.saida).sort((a, b) => a.saida.localeCompare(b.saida));
    const meses = [...new Set(vend.map((t) => t.saida.slice(0, 7)))];
    const ts = (testes || []).filter((x) => x.t && x.t.saida).sort((a, b) => a.t.saida.localeCompare(b.t.saida));
    const evolucao = meses.map((m) => {
      const ate = vend.filter((t) => t.saida.slice(0, 7) <= m), tm = ts.filter((x) => x.t.saida.slice(0, 7) <= m).slice(-12);
      return { mes: m, amostras: ate.length, testes: tm.length, erro: tm.length >= 3 ? tm.reduce((s, x) => s + x.ape, 0) / tm.length : null };
    });
    const grupo = (f) => { const g = new Map(); vend.forEach((t) => { const k = f(t); if (!g.has(k)) g.set(k, []); g.get(k).push(t); }); return g; };
    const erroDe = (l) => { const ids = new Set(l.map((t) => t.id)); const e = ts.filter((x) => ids.has(x.t.id)); return e.length >= 3 ? { erro: e.reduce((s, x) => s + x.ape, 0) / e.length, n: e.length } : { erro: null, n: e.length }; };
    const confianca = (n, erro) => (n >= 12 && erro != null && erro <= 0.06 ? 'alta' : n >= 8 && erro != null && erro <= 0.10 ? 'moderada' : 'baixa');
    const linha = (k, l) => { const e = erroDe(l), ult = l[l.length - 1]; return { chave: k, amostras: l.length, ultima: ult.saida, ultimoPreco: ult.vendido, mediaVenda: l.reduce((s, t) => s + t.vendido, 0) / l.length, erro: e.erro, testes: e.n, confianca: confianca(l.length, e.erro) }; };
    const ord = (a, b) => b.amostras - a.amostras || String(a.chave).localeCompare(String(b.chave));
    return {
      total: vend.length, evolucao,
      porTipo: [...grupo((t) => t.tipo)].map(([k, l]) => linha(k, l)).sort(ord),
      porMarca: [...grupo((t) => t.marca || '—')].map(([k, l]) => linha(k, l)).sort(ord),
      porModelo: [...grupo((t) => (t.marca || '') + ' ' + t.modelo)].map(([k, l]) => Object.assign(linha(k, l), { tipo: l[0].tipo })).sort(ord),
      recentes: vend.slice(-6).reverse().map((t) => ({ id: t.id, quando: t.saida, maq: nomeMaq(t), tipo: t.tipo, vendido: t.vendido, doModelo: vend.filter((x) => x.modelo === t.modelo && x.saida <= t.saida).length, doTipo: vend.filter((x) => x.tipo === t.tipo && x.saida <= t.saida).length }))
    };
  }

  // ---------- HISTÓRICO VIVO ----------
  function linhaDoTempo(est, trocas, f = {}) {
    const ev = [];
    const T = (t) => ({ marca: t.marca || '—', modelo: t.modelo || '', tipoMaq: t.tipo, loja: t.loja || '' });
    (est.avaliacoes || []).forEach((a) => {
      const m = a.maq || {};
      ev.push(Object.assign({ quando: a.data, tipo: 'avaliacao', titulo: `Avaliação: ${nomeMaq(m)}`, txt: `Máximo indicado ${real(a.teto)}, venda estimada ${real(a.venda)}${a.por ? ' · ' + a.por : ''}${a.status && a.status !== 'aberta' ? ' · ' + ({ troca: 'virou troca', desistiu: 'cliente desistiu' }[a.status] || a.status) : ''}`, valor: a.teto }, T(m), { loja: a.loja || '' }));
      if (a.ia) ev.push(Object.assign({ quando: a.data, tipo: 'decisao', titulo: `IA nas fotos: ${nomeMaq(m)}`, txt: a.ia.resumo || 'Sugestões da IA revisadas pelo avaliador' }, T(m), { loja: a.loja || '' }));
    });
    (est.pendentes || []).forEach((p) => {
      const m = p.maq || {};
      ev.push(Object.assign({ quando: String(p.quando).slice(0, 10), tipo: 'aprovacao', titulo: `Pedido acima do teto: ${nomeMaq(m)}`, txt: `${p.por} pediu ${real(p.valor)} (máximo ${real(p.rec && p.rec.teto)})`, valor: p.valor }, T(m)));
      if (p.decisao) ev.push(Object.assign({ quando: String(p.decisao.quando).slice(0, 10), tipo: 'aprovacao', titulo: `${p.status === 'aprovada' ? 'Aprovada' : 'Recusada'}: ${nomeMaq(m)}`, txt: `Decisão de ${p.decisao.por}`, valor: p.valor }, T(m)));
    });
    (trocas || []).forEach((t) => {
      if (t.entrada) ev.push(Object.assign({ quando: t.entrada, tipo: 'troca', titulo: `Troca: ${nomeMaq(t)}`, txt: `Pago ${real(t.pago)}${t.previsto ? ' · máximo indicado ' + real(t.previsto.teto) : ''}${t.vendedor ? ' · ' + t.vendedor : ''}`, valor: t.pago, id: t.id }, T(t)));
      (t.precos || []).slice(1).forEach((p) => ev.push(Object.assign({ quando: p.data, tipo: 'negociacao', titulo: `Preço: ${nomeMaq(t)}`, txt: `Anúncio para ${real(p.valor)}${p.motivo ? ' · ' + p.motivo : ''}`, valor: p.valor, id: t.id }, T(t))));
      if (t.vendido && t.saida) {
        const mg = (t.vendido - t.pago - (t.preparo || 0)) / t.vendido;
        ev.push(Object.assign({ quando: t.saida, tipo: 'venda', titulo: `Venda: ${nomeMaq(t)}`, txt: `Vendido ${real(t.vendido)} · margem ${(mg * 100).toFixed(1).replace('.', ',')}%${t.diasPatio != null ? ' · ' + t.diasPatio + ' dias no pátio' : ''}`, valor: t.vendido, margem: mg, id: t.id }, T(t)));
      }
    });
    const ok = (e) => (!f.tipo || e.tipo === f.tipo) && (!f.marca || e.marca === f.marca) && (!f.modelo || e.modelo === f.modelo) && (!f.loja || e.loja === f.loja) && (!f.de || e.quando >= f.de) && (!f.ate || e.quando <= f.ate);
    const eventos = ev.filter((e) => e.quando && ok(e)).sort((a, b) => b.quando.localeCompare(a.quando));
    // indicadores do período filtrado
    const ind = (k) => { const m = new Map(); eventos.forEach((e) => { const c = e[k] || '—'; if (!m.has(c)) m.set(c, { chave: c, trocas: 0, vendas: 0, avaliacoes: 0, margemSoma: 0, valorVendas: 0 }); const x = m.get(c); if (e.tipo === 'troca') x.trocas++; if (e.tipo === 'avaliacao') x.avaliacoes++; if (e.tipo === 'venda') { x.vendas++; x.margemSoma += e.margem; x.valorVendas += e.valor; } }); return [...m.values()].map((x) => Object.assign(x, { margem: x.vendas ? x.margemSoma / x.vendas : null })).sort((a, b) => b.vendas - a.vendas || b.trocas - a.trocas); };
    return { eventos, porMarca: ind('marca'), porModelo: ind('modelo'), porLoja: ind('loja') };
  }

  // ---------- AVISO POR E-MAIL ----------
  const escH = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  // só manda quando há algo relevante (prioridade 1 ou 2); itens de rotina (nível 3) não geram e-mail sozinhos
  function resumoEmail({ revenda, nome, acoes, link, hoje, frequencia }) {
    const relevantes = (acoes || []).filter((a) => a.nivel <= 2);
    if (!relevantes.length) return null;
    const l = (acoes || []).slice(0, 10);
    const data = new Date(hoje + 'T12:00:00').toLocaleDateString('pt-BR');
    const assunto = `${revenda}: ${relevantes.length} ${relevantes.length === 1 ? 'ponto' : 'pontos'} para ${frequencia === 'semanal' ? 'esta semana' : 'hoje'}`;
    const item = (a) => `<li style="margin:0 0 12px"><b>${escH(a.titulo)}</b><br><span style="color:#5C676E">${escH(a.txt)}</span>${(a.whats || []).length ? '<br>' + a.whats.map((w) => `<a href="${escH(w.href)}" style="color:#7A6131">WhatsApp de ${escH(String(w.nome).split(' ')[0])}</a>`).join(' · ') : ''}</li>`;
    const html = `<div style="font-family:Arial,sans-serif;color:#111820;max-width:560px"><p style="font-size:13px;color:#5C676E;margin:0 0 4px">Anshur · ${escH(revenda)} · ${data}</p><h2 style="font-size:20px;margin:0 0 12px">Bom dia${nome ? ', ' + escH(String(nome).split(' ')[0]) : ''}. O que pede atenção ${frequencia === 'semanal' ? 'nesta semana' : 'hoje'}:</h2><ol style="padding-left:20px">${l.map(item).join('')}</ol>${acoes.length > l.length ? `<p>E mais ${acoes.length - l.length} no app.</p>` : ''}<p><a href="${escH(link)}" style="display:inline-block;background:#C1A36A;color:#111820;padding:10px 16px;border-radius:8px;text-decoration:none;font-weight:bold">Abrir o Anshur</a></p><p style="font-size:12px;color:#5C676E">Você recebe este aviso porque o dono da revenda ligou os avisos para você. Para mudar a frequência ou desligar: Configurações › Avisos. Só mandamos quando há algo para fazer.</p></div>`;
    const texto = `Anshur · ${revenda} · ${data}\n\n` + l.map((a, i) => `${i + 1}. ${a.titulo}\n   ${a.txt}${(a.whats || []).length ? '\n   ' + a.whats.map((w) => 'WhatsApp de ' + String(w.nome).split(' ')[0] + ': ' + w.href).join('\n   ') : ''}`).join('\n') + `\n\nAbrir o Anshur: ${link}\n\nPara mudar ou desligar: Configurações › Avisos.`;
    return { assunto, html, texto, itens: l.length };
  }

  const R = { ANGULOS, angulosDe, ITENS, limparSugestao, trocasDoEstado, compradoresPara, linkWhats, mudouFaixa, acoesDoDia, rituais, execucaoRituais, chavePeriodo, semanaISO, memoriaComercial, linhaDoTempo, resumoEmail, diasEntre };
  raiz.RETENCAO = R;
  if (typeof module !== 'undefined' && module.exports) module.exports = R;
})(typeof window !== 'undefined' ? window : globalThis);
