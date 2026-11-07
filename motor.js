// Motor de avaliação: aprende com as trocas vendidas da própria revenda.
// log(preço de venda / referência do modelo) = a + b·idade + c·desgaste de horas + d·condição
// Validação temporal: cada troca é avaliada só com vendas concluídas ANTES da data em que ela entrou.
(function (raiz) {
  const A = raiz.ANSHUR;
  // limites de qualidade da estimativa (documentados e configuráveis)
  const QUALIDADE = {
    alta: { amostras: 12, mape: 0.06 },     // ≥ 12 vendas do tipo e erro validado ≤ 6%
    moderada: { amostras: 8, mape: 0.10 },  // ≥ 8 vendas do tipo e erro validado ≤ 10%
    minimoValidacao: 5,                     // previsões testadas necessárias para medir o erro
    minimoTreino: 5,                        // vendas mínimas para recomendar alguma coisa
    corteAtipico: 2.5                       // resíduo acima de 2,5 desvios = venda atípica (fora do treino)
  };
  const HANO = { trator: 750, colhedora: 2600, pulverizador: 820, plantadeira: 270 };
  const catalogo = (t) => A.modelos.find((m) => m.modelo === t.modelo);
  const refDe = (t) => t.referencia || (catalogo(t) || {}).base;
  const hAnoDe = (t) => (catalogo(t) || {}).hAno || HANO[t.tipo] || 800;
  const anoDe = (iso) => (iso ? +iso.slice(0, 4) : new Date().getFullYear());
  // idade na data da avaliação (para validar o passado com a idade daquele dia)
  const feat = (t, dataRef) => [1, anoDe(dataRef) - t.ano, t.horas / (hAnoDe(t) * 12), t.cond / 100];
  const preparoPrevisto = (t) => Math.round((100 - t.cond) * refDe(t) * 0.0004 / 100) * 100;

  function minimos(X, y) {
    const k = X[0].length;
    const M = Array.from({ length: k }, () => Array(k + 1).fill(0));
    X.forEach((x, i) => { for (let a = 0; a < k; a++) { for (let b = 0; b < k; b++) M[a][b] += x[a] * x[b]; M[a][k] += x[a] * y[i]; } });
    for (let a = 0; a < k; a++) M[a][a] += 1e-3; // regularização leve: estável com poucas trocas
    for (let c = 0; c < k; c++) {
      let p = c; for (let r = c + 1; r < k; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
      [M[c], M[p]] = [M[p], M[c]];
      for (let r = 0; r < k; r++) if (r !== c) { const f = M[r][c] / M[c][c]; for (let j = c; j <= k; j++) M[r][j] -= f * M[c][j]; }
    }
    return M.map((row, i) => row[k] / row[i]);
  }
  function ajustar(lista) {
    const X = lista.map((t) => feat(t, t.saida)), y = lista.map((t) => Math.log(t.vendido / refDe(t)));
    const w = minimos(X, y);
    const res = X.map((x, i) => y[i] - x.reduce((s, v, j) => s + v * w[j], 0));
    const dp = Math.sqrt(res.reduce((s, r) => s + r * r, 0) / Math.max(1, res.length - 4));
    return { w, dp: Math.max(0.03, dp), res };
  }
  // treina e tira vendas atípicas (ex.: máquina vendida com defeito escondido) para não puxarem a média
  function treinar(vendidas) {
    let m = ajustar(vendidas), atipicas = [];
    if (vendidas.length >= 10) {
      const lim = QUALIDADE.corteAtipico * m.dp;
      atipicas = vendidas.filter((t, i) => Math.abs(m.res[i]) > lim);
      if (atipicas.length && vendidas.length - atipicas.length >= QUALIDADE.minimoTreino) m = ajustar(vendidas.filter((t) => !atipicas.includes(t)));
      else atipicas = [];
    }
    return { ...m, n: vendidas.length - atipicas.length, atipicas };
  }

  // opts.historico: trocas usadas para aprender (padrão: as da revenda)
  // opts.excluir: id que não pode avaliar a si mesmo
  // opts.ate: só usa vendas concluídas antes desta data (validação temporal, sem vazamento)
  // opts.margem: margem-alvo
  function avaliar(maq, opts = {}) {
    const hist = (opts.historico || A.todasTrocas || A.trocas).filter((t) => t.vendido && t.id !== opts.excluir && refDe(t) && (!opts.ate || (t.saida && t.saida < opts.ate)));
    const doTipo = hist.filter((t) => t.tipo === maq.tipo);
    const base = doTipo.length >= 8 ? doTipo : hist;
    if (base.length < QUALIDADE.minimoTreino || !refDe(maq)) return null;
    const m = treinar(base);
    const ref = refDe(maq);
    const x = feat(maq, opts.ate);
    const vendaBruta = ref * Math.exp(x.reduce((s, v, j) => s + v * m.w[j], 0));
    const margem = opts.margem ?? A.margemAlvo;
    const preparo = preparoPrevisto(maq);
    const venda = Math.round(vendaBruta / 1000) * 1000;
    const teto = Math.floor((venda * (1 - margem) - preparo) / 1000) * 1000;
    const piso = Math.floor((venda * Math.exp(-1.5 * Math.max(0.05, m.dp)) * (1 - margem) - preparo) / 1000) * 1000;
    const resultado = venda - teto - preparo; // mesma conta que aparece na tela

    const usados = base.filter((t) => !m.atipicas.includes(t)).filter((t) => t.tipo === maq.tipo);
    const comp = usados.map((t) => ({ t, d: (t.modelo === maq.modelo ? 0 : t.marca === maq.marca ? 5 : 7) + Math.abs(t.ano - maq.ano) * 0.6 + Math.abs(t.horas - maq.horas) / (hAnoDe(t) * 1.5) + Math.abs(t.cond - maq.cond) / 15 }))
      .sort((a, b) => a.d - b.d).slice(0, 4).map((c) => c.t);
    const dias = comp.length ? Math.round(comp.reduce((s, t) => s + (t.diasPatio || 0), 0) / comp.length) : null;
    const mesmoModelo = usados.filter((t) => t.modelo === maq.modelo).length;

    // qualidade: erro medido em previsões passadas que o motor não conhecia
    const qualidade = opts.semValidacao ? null : validar(opts.historico || A.todasTrocas || A.trocas).porTipo[maq.tipo] || null;
    let confianca = 'baixa';
    if (qualidade && qualidade.n >= QUALIDADE.minimoValidacao) {
      if (doTipo.length >= QUALIDADE.alta.amostras && qualidade.mape <= QUALIDADE.alta.mape) confianca = 'alta';
      else if (doTipo.length >= QUALIDADE.moderada.amostras && qualidade.mape <= QUALIDADE.moderada.mape) confianca = 'moderada';
    } else if (opts.semValidacao && doTipo.length >= QUALIDADE.moderada.amostras) confianca = 'moderada';
    const limites = [];
    if (!qualidade || qualidade.n < QUALIDADE.minimoValidacao) limites.push('Ainda não há previsões passadas suficientes para medir o erro deste tipo de máquina.');
    if (mesmoModelo < 3) limites.push(`Só ${mesmoModelo} ${mesmoModelo === 1 ? 'venda' : 'vendas'} do mesmo modelo no histórico.`);
    if (doTipo.length < 8) limites.push('Poucas vendas deste tipo: usamos o histórico geral da revenda.');
    if (usados.length && maq.horas > Math.max(...usados.map((t) => t.horas))) limites.push('Horas acima de todas as máquinas vendidas: estimativa menos segura.');
    if (m.atipicas.length) limites.push(`${m.atipicas.length} ${m.atipicas.length === 1 ? 'venda atípica ficou' : 'vendas atípicas ficaram'} fora do cálculo.`);

    const media = [0, 1, 2, 3].map((j) => usados.reduce((s, t) => s + feat(t, opts.ate)[j], 0) / Math.max(1, usados.length));
    const nomes = ['', 'Ano', 'Horas de uso', 'Estado na inspeção'];
    const motivos = [1, 2, 3].map((j) => ({ nome: nomes[j], valor: Math.round(venda * (1 - Math.exp(-(x[j] - media[j]) * m.w[j])) / 1000) * 1000 }))
      .filter((mo) => Math.abs(mo.valor) >= 2000).sort((a, b) => Math.abs(b.valor) - Math.abs(a.valor));

    return { venda, teto, faixa: [Math.min(piso, teto), teto], preparo, resultado, margem, margemSobreVenda: resultado / venda, dispersao: m.dp,
      comp, dias, motivos, base: m.n, doTipo: doTipo.length, mesmoModelo, atipicas: m.atipicas.length, confianca, limites, qualidade, ref };
  }

  // validação temporal (walk-forward): para cada venda, o motor só conhece o que tinha sido vendido antes da troca
  const cacheVal = new Map();
  function validar(historico = A.todasTrocas || A.trocas) {
    const vend = historico.filter((t) => t.vendido && t.entrada && t.saida);
    const chave = vend.length + '|' + vend.map((t) => t.id + t.vendido).join(',').length + '|' + A.margemAlvo;
    if (cacheVal.has(chave)) return cacheVal.get(chave);
    const testes = [];
    vend.forEach((t) => {
      const r = avaliar(t, { historico, excluir: t.id, ate: t.entrada, semValidacao: true });
      if (r) testes.push({ t, prev: r.venda, erro: r.venda - t.vendido, ape: Math.abs(r.venda - t.vendido) / t.vendido });
    });
    const resumo = (lista) => lista.length ? { n: lista.length, mae: lista.reduce((s, x) => s + Math.abs(x.erro), 0) / lista.length, mape: lista.reduce((s, x) => s + x.ape, 0) / lista.length, vies: lista.reduce((s, x) => s + x.erro / x.t.vendido, 0) / lista.length } : { n: 0, mae: NaN, mape: NaN, vies: NaN };
    const porTipo = {};
    [...new Set(testes.map((x) => x.t.tipo))].forEach((k) => { porTipo[k] = resumo(testes.filter((x) => x.t.tipo === k)); });
    const out = { ...resumo(testes), porTipo, testes, total: vend.length };
    cacheVal.set(chave, out);
    return out;
  }

  raiz.MOTOR = { avaliar, validar, catalogo, refDe, preparoPrevisto, QUALIDADE };
})(typeof window !== 'undefined' ? window : globalThis);
