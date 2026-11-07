// Camada de dados (fonte única) + regras de negócio puras + utilidades de formatação.
// Hoje grava no navegador (localStorage). A interface `repo` é o ponto que vira Supabase depois.
(function (raiz) {
  const A = raiz.ANSHUR;
  const temStorage = (() => { try { return typeof localStorage !== 'undefined'; } catch (e) { return false; } })();
  const getItem = (k) => { try { return temStorage ? localStorage.getItem(k) : null; } catch (e) { return null; } };
  const setItem = (k, v) => { try { if (!temStorage) return false; localStorage.setItem(k, v); return true; } catch (e) { return false; } };
  const delItem = (k) => { try { if (temStorage) localStorage.removeItem(k); } catch (e) { /* sem armazenamento */ } };

  // dois ambientes que nunca se misturam: demonstração (fictício, resetável) e operação (dados da revenda)
  const CHAVES = { demo: 'anshur-demo-v2', op: 'anshur-op-v1' };
  const ambiente = getItem('anshur-ambiente') === 'op' ? 'op' : 'demo';
  const vazio = () => ({ versao: 3, fechadas: [], avaliacoes: [], precos: {}, vendas: {}, preparos: {}, historico: [], config: {} });
  const repo = {
    ler: (amb = ambiente) => { try { return Object.assign(vazio(), JSON.parse(getItem(CHAVES[amb])) || {}); } catch (e) { return vazio(); } },
    gravar: (d, amb = ambiente) => setItem(CHAVES[amb], JSON.stringify(d)),
    apagar: (amb = ambiente) => delItem(CHAVES[amb]),
    trocarAmbiente: (amb) => setItem('anshur-ambiente', amb)
  };
  const estado = repo.ler();

  // premissas configuráveis pela revenda (nunca resultado garantido)
  const PADRAO = { margemAlvo: 0.14, jurosMes: 0.012, baseJuros: 'aquisicao' };
  const cfg = Object.assign({}, PADRAO, estado.config);
  if (typeof estado.margem === 'number') cfg.margemAlvo = estado.margem; // compatível com a v2
  A.margemAlvo = cfg.margemAlvo;

  if (ambiente === 'op') {
    A.revenda = { nome: estado.nomeRevenda || 'Minha revenda', cidade: estado.cidadeRevenda || 'dados reais', aviso: 'Dados da sua revenda, guardados só neste navegador' };
    A.trocas = (estado.historico || []).map((t) => ({ ...t })).concat(estado.fechadas.map((t) => ({ ...t })));
    // modelos que vieram na planilha e não estão no catálogo entram com a referência (Fipe) informada
    (estado.historico || []).forEach((t) => {
      if (!A.modelos.some((m) => m.modelo === t.modelo) && t.referencia) A.modelos.push({ tipo: t.tipo, marca: t.marca || '—', modelo: t.modelo, base: t.referencia, hAno: { trator: 750, colhedora: 2600, pulverizador: 820, plantadeira: 270 }[t.tipo] || 800, importado: true });
    });
  } else {
    estado.fechadas.forEach((t) => { if (!A.trocas.some((x) => x.id === t.id)) A.trocas.push({ ...t }); });
  }
  aplicarMovimentos(A.trocas, estado);

  function aplicarMovimentos(trocas, est) {
    Object.entries(est.precos || {}).forEach(([id, lista]) => { const t = trocas.find((x) => x.id === id); if (!t) return; t.precos = (t.precos || []).concat(lista); t.anuncio = t.precos[t.precos.length - 1].valor; });
    Object.entries(est.preparos || {}).forEach(([id, v]) => { const t = trocas.find((x) => x.id === id); if (t) { t.preparo = v.valor; t.preparoRegistrado = v.data; } });
    Object.entries(est.vendas || {}).forEach(([id, v]) => { const t = trocas.find((x) => x.id === id); if (t) { t.vendido = v.valor; t.saida = v.data; t.diasPatio = diasEntre(t.entrada, v.data); } });
  }

  // ---------- formatação ----------
  const real = (v) => (v < 0 ? '−' : '') + 'R$ ' + Math.abs(Math.round(v)).toLocaleString('pt-BR');
  const mil = (v) => {
    const s = v < 0 ? '−' : '', a = Math.abs(v);
    if (a >= 1e6) return s + 'R$ ' + (a / 1e6).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' mi';
    return s + 'R$ ' + Math.round(a / 1000).toLocaleString('pt-BR') + ' mil';
  };
  const pct = (v, casas = 1) => (isFinite(v) ? (v * 100).toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas }) + '%' : '—');
  const hojeISO = () => new Date().toISOString().slice(0, 10);
  function diasEntre(a, b) { return Math.max(0, Math.round((new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / 864e5)); }
  const diasDesde = (iso) => diasEntre(iso, hojeISO());
  const data = (iso) => (iso ? new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR') : '—');
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const NOMES = { trator: 'Trator', colhedora: 'Colhedora de cana', pulverizador: 'Pulverizador', plantadeira: 'Plantadeira' };
  const FICHA = [
    ['motor', 'Motor', 'Partida, fumaça, ruído, vazamentos e compressão aparente.'],
    ['transmissao', 'Transmissão', 'Troca de marchas, embreagem, folgas e ruídos.'],
    ['hidraulico', 'Hidráulico', 'Pressão, mangueiras, cilindros e engates.'],
    ['pneus', 'Pneus / rodado', 'Desgaste das garras, cortes, esteiras e rodas.'],
    ['cabine', 'Cabine e eletrônica', 'Painel, ar-condicionado, monitor e chicotes.'],
    ['lataria', 'Lataria e pintura', 'Amassados, ferrugem, solda e repintura.']
  ];
  // marca: A e N com a diagonal compartilhada; o topo dourado da haste é a valorização
  const logo = (tam = 32, claro = true) => `<svg width="${tam}" height="${tam}" viewBox="0 0 64 64" aria-hidden="true"><path d="M4 56 24 8h9l17 41V8h9v48H47L28.5 13 13 56Z" fill="${claro ? '#111820' : '#E9E2D4'}"/><path d="M50 8h9v14h-9z" fill="#C1A36A"/></svg>`;

  // ---------- regras de negócio (puras; testadas em testes.js) ----------
  const C = {
    vendidas: (lista = A.trocas) => lista.filter((t) => t.vendido),
    patio: (lista = A.trocas) => lista.filter((t) => !t.vendido),
    custo: (t) => t.pago + (t.preparo || 0),                                   // aquisição + preparação
    resultado: (t) => t.vendido - t.pago - (t.preparo || 0),                    // venda efetiva − custo total
    margem: (t) => (t.vendido - t.pago - (t.preparo || 0)) / t.vendido,         // resultado / venda efetiva
    margemProjetada: (vendaEst, custo) => (vendaEst - custo) / vendaEst,
    capitalImobilizado: (lista = A.trocas) => lista.filter((t) => !t.vendido).reduce((s, t) => s + t.pago, 0),
    permanencia: (t, hoje = hojeISO()) => diasEntre(t.entrada, t.saida || hoje),
    // custo de oportunidade: estimativa, não sai do caixa e não entra no custo da máquina
    custoFinanceiro: (t, dias, c = cfg) => (c.baseJuros === 'total' ? t.pago + (t.preparo || 0) : t.pago) * c.jurosMes * dias / 30,
    faixaIdade: (d) => (d <= 30 ? 'normal' : d <= 60 ? 'atencao' : d <= 90 ? 'alerta' : 'critico'),
    NOMES_IDADE: { normal: 'Normal', atencao: 'Atenção', alerta: 'Alerta', critico: 'Crítico' }
  };

  // fechar troca: grava o valor pago separado do recomendado e congela a avaliação daquele dia
  function fecharTroca(est, maq, rec, valorPago, dataTroca, extra = {}) {
    const id = 'D' + String(est.fechadas.length + 1).padStart(3, '0') + (ambiente === 'op' ? 'R' : '');
    const anuncio = Math.round(rec.venda * 1.08 / 1000) * 1000;
    const t = { ...maq, id, pago: Math.round(valorPago), preparo: rec.preparo, preparoEst: rec.preparo, vendido: null, entrada: dataTroca, saida: null, diasPatio: null, anuncio,
      precos: [{ data: dataTroca, valor: anuncio, motivo: 'Anúncio inicial' }], idAgro: false, manutencoes: [], fotos: [], ...extra,
      previsto: { data: dataTroca, teto: rec.teto, venda: rec.venda, preparo: rec.preparo, dias: rec.dias, margem: rec.margemSobreVenda, confianca: rec.confianca, mape: rec.qualidade ? rec.qualidade.mape : null, amostras: rec.doTipo, premissas: { margemAlvo: rec.margem, jurosMes: cfg.jurosMes } } };
    est.fechadas.push(t);
    return t;
  }
  function registrarPreparo(est, id, valor, dataReg) { est.preparos[id] = { valor: Math.round(valor), data: dataReg }; }
  function registrarVenda(est, id, valor, dataVenda) { est.vendas[id] = { valor: Math.round(valor), data: dataVenda }; }

  raiz.COMUM = { A, ambiente, repo, estado, cfg, PADRAO, real, mil, pct, hojeISO, diasEntre, diasDesde, data, esc, NOMES, FICHA, logo, C,
    fecharTroca, registrarPreparo, registrarVenda, aplicarMovimentos,
    gravar: (d) => repo.gravar(d), ler: () => repo.ler(), restaurar: () => { repo.apagar('demo'); delItem('anshur-demo-v1'); } };
})(typeof window !== 'undefined' ? window : globalThis);
