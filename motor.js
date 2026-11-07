// Motor de avaliação: aprende com as trocas vendidas da própria revenda.
// log(preço de venda / referência do modelo) = a + b·idade + c·desgaste de horas + d·condição
(function () {
  const A = window.ANSHUR;
  const catalogo = (t) => A.modelos.find((m) => m.modelo === t.modelo);
  const refDe = (t) => t.referencia || (catalogo(t) || {}).base;
  const hAnoDe = (t) => (catalogo(t) || { hAno: { trator: 750, colhedora: 2600, pulverizador: 820, plantadeira: 270 }[t.tipo] || 800 }).hAno;
  const anoRef = () => new Date().getFullYear();
  const feat = (t) => [1, anoRef() - t.ano, t.horas / (hAnoDe(t) * 12), t.cond / 100];
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

  function treinar(vendidas) {
    const X = vendidas.map(feat), y = vendidas.map((t) => Math.log(t.vendido / refDe(t)));
    const w = minimos(X, y);
    const res = X.map((x, i) => y[i] - x.reduce((s, v, j) => s + v * w[j], 0));
    const dp = Math.sqrt(res.reduce((s, r) => s + r * r, 0) / Math.max(1, res.length - 4));
    return { w, dp: Math.max(0.03, dp), n: vendidas.length };
  }

  // opts.excluir: id que não pode avaliar a si mesmo (teste às cegas)
  // opts.historico: trocas usadas para aprender (padrão: as da revenda)
  // opts.margem: margem-alvo (premissa configurável)
  function avaliar(maq, opts = {}) {
    const hist = (opts.historico || A.trocas).filter((t) => t.vendido && t.id !== opts.excluir && refDe(t));
    const doTipo = hist.filter((t) => t.tipo === maq.tipo);
    const base = doTipo.length >= 8 ? doTipo : hist;
    if (base.length < 5 || !refDe(maq)) return null;
    const m = treinar(base);
    const ref = refDe(maq);
    const x = feat(maq);
    const venda = ref * Math.exp(x.reduce((s, v, j) => s + v * m.w[j], 0));
    const margem = opts.margem ?? A.margemAlvo;
    const preparo = preparoPrevisto(maq);
    const teto = Math.floor((venda * (1 - margem) - preparo) / 1000) * 1000;
    const piso = Math.floor((venda * Math.exp(-1.5 * Math.max(0.05, m.dp)) * (1 - margem) - preparo) / 1000) * 1000;
    const vendaR = Math.round(venda / 1000) * 1000;
    const resultado = vendaR - teto - preparo; // mesma conta que aparece na tela

    const comp = doTipo.map((t) => ({ t, d: (t.modelo === maq.modelo ? 0 : t.marca === maq.marca ? 5 : 7) + Math.abs(t.ano - maq.ano) * 0.6 + Math.abs(t.horas - maq.horas) / (hAnoDe(t) * 1.5) + Math.abs(t.cond - maq.cond) / 15 }))
      .sort((a, b) => a.d - b.d).slice(0, 4).map((c) => c.t);
    const dias = comp.length ? Math.round(comp.reduce((s, t) => s + (t.diasPatio || 0), 0) / comp.length) : null;
    const mesmoModelo = doTipo.filter((t) => t.modelo === maq.modelo).length;

    const confianca = mesmoModelo >= 4 && doTipo.length >= 12 ? 'alta' : doTipo.length >= 8 ? 'média' : 'baixa';
    const limites = [];
    if (mesmoModelo < 3) limites.push(`Só ${mesmoModelo} ${mesmoModelo === 1 ? 'troca' : 'trocas'} do mesmo modelo no histórico.`);
    if (doTipo.length < 8) limites.push('Poucas trocas deste tipo: usamos o histórico geral da revenda.');
    if (maq.horas > Math.max(...doTipo.map((t) => t.horas), 0)) limites.push('Horas acima de todas as máquinas vendidas: estimativa menos segura.');

    const media = [0, 1, 2, 3].map((j) => doTipo.reduce((s, t) => s + feat(t)[j], 0) / Math.max(1, doTipo.length));
    const nomes = ['', 'Ano', 'Horas de uso', 'Estado na inspeção'];
    const motivos = [1, 2, 3].map((j) => {
      const efeito = venda * (1 - Math.exp(-(x[j] - media[j]) * m.w[j]));
      return { nome: nomes[j], valor: Math.round(efeito / 1000) * 1000 };
    }).filter((mo) => Math.abs(mo.valor) >= 2000).sort((a, b) => Math.abs(b.valor) - Math.abs(a.valor));

    return { venda: vendaR, teto, faixa: [Math.min(piso, teto), teto], preparo, resultado, margem, margemSobreVenda: resultado / vendaR,
      comp, dias, motivos, base: m.n, doTipo: doTipo.length, mesmoModelo, confianca, limites, ref };
  }

  window.MOTOR = { avaliar, catalogo, refDe, preparoPrevisto };
})();
