// Motor de avaliação: aprende com as trocas vendidas da própria revenda.
// log(preço de venda / referência do modelo) = a + b·idade + c·desgaste de horas + d·condição
(function () {
  const A = window.ANSHUR;
  const modelo = (t) => A.modelos.find((m) => m.modelo === t.modelo);
  const feat = (t) => {
    const m = modelo(t);
    const idade = new Date().getFullYear() - t.ano;
    return [1, idade, t.horas / (m.hAno * 12), t.cond / 100];
  };

  function minimos(X, y) {
    const k = X[0].length;
    const M = Array.from({ length: k }, () => Array(k + 1).fill(0));
    X.forEach((x, i) => { for (let a = 0; a < k; a++) { for (let b = 0; b < k; b++) M[a][b] += x[a] * x[b]; M[a][k] += x[a] * y[i]; } });
    for (let a = 0; a < k; a++) M[a][a] += 1e-6; // estabilidade
    for (let c = 0; c < k; c++) {
      let p = c; for (let r = c + 1; r < k; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
      [M[c], M[p]] = [M[p], M[c]];
      for (let r = 0; r < k; r++) if (r !== c) { const f = M[r][c] / M[c][c]; for (let j = c; j <= k; j++) M[r][j] -= f * M[c][j]; }
    }
    return M.map((row, i) => row[k] / row[i]);
  }

  function treinar(vendidas) {
    const X = vendidas.map(feat), y = vendidas.map((t) => Math.log(t.vendido / modelo(t).base));
    const w = minimos(X, y);
    const res = X.map((x, i) => y[i] - x.reduce((s, v, j) => s + v * w[j], 0));
    const dp = Math.sqrt(res.reduce((s, r) => s + r * r, 0) / Math.max(1, res.length - 4));
    return { w, dp, n: vendidas.length };
  }

  // avalia uma máquina; "excluir" serve para o teste às cegas (não deixa a troca avaliar a si mesma)
  function avaliar(maq, excluir) {
    const vendidas = A.trocas.filter((t) => t.vendido && t.id !== excluir);
    const doTipo = vendidas.filter((t) => t.tipo === maq.tipo);
    const base = doTipo.length >= 8 ? doTipo : vendidas;
    const m = treinar(base);
    const ref = modelo(maq).base;
    const x = feat(maq);
    const venda = ref * Math.exp(x.reduce((s, v, j) => s + v * m.w[j], 0));
    const z = 2.0;
    const vendaMin = venda * Math.exp(-z * m.dp), vendaMax = venda * Math.exp(z * m.dp);
    const preparo = Math.round((100 - maq.cond) * ref * 0.0004 / 100) * 100;
    const margem = A.margemAlvo;
    const teto = Math.floor((venda * (1 - margem) - preparo) / 1000) * 1000;
    const faixa = [Math.floor((vendaMin * (1 - margem) - preparo) / 1000) * 1000, teto];

    // comparáveis: mesmas trocas que mais se parecem
    const comp = doTipo.map((t) => ({ t, d: (t.modelo === maq.modelo ? 0 : 3) + Math.abs(t.ano - maq.ano) * 0.6 + Math.abs(t.horas - maq.horas) / (modelo(t).hAno * 1.5) + Math.abs(t.cond - maq.cond) / 15 }))
      .sort((a, b) => a.d - b.d).slice(0, 4).map((c) => c.t);
    const dias = comp.length ? Math.round(comp.reduce((s, t) => s + t.diasPatio, 0) / comp.length) : null;

    // motivos: quanto cada característica puxa o preço, comparada à média das máquinas do mesmo tipo
    const media = [0, 1, 2, 3].map((j) => base.filter((t) => t.tipo === maq.tipo).reduce((s, t) => s + feat(t)[j], 0) / Math.max(1, base.filter((t) => t.tipo === maq.tipo).length));
    const nomes = ['', 'Ano', 'Horas de uso', 'Estado na inspeção'];
    const motivos = [1, 2, 3].map((j) => {
      const efeito = venda * (1 - Math.exp(-(x[j] - media[j]) * m.w[j]));
      return { nome: nomes[j], valor: Math.round(efeito / 1000) * 1000 };
    }).filter((mo) => Math.abs(mo.valor) >= 2000).sort((a, b) => Math.abs(b.valor) - Math.abs(a.valor));

    return { venda: Math.round(venda / 1000) * 1000, vendaMin, vendaMax, teto, faixa, preparo, comp, dias, motivos, base: m.n };
  }

  window.MOTOR = { avaliar, modelo };
})();
