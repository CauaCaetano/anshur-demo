// Fonte única de dados da demonstração + utilidades compartilhadas pelo app e pelo passaporte.
(function () {
  const A = window.ANSHUR;
  const CHAVE = 'anshur-demo-v2';
  const vazio = () => ({ fechadas: [], avaliacoes: [], precos: {}, margem: null });
  const ler = () => { try { return Object.assign(vazio(), JSON.parse(localStorage.getItem(CHAVE)) || {}); } catch (e) { return vazio(); } };
  const gravar = (d) => { try { localStorage.setItem(CHAVE, JSON.stringify(d)); return true; } catch (e) { return false; } };
  const restaurar = () => { try { localStorage.removeItem(CHAVE); localStorage.removeItem('anshur-demo-v1'); } catch (e) { /* sem armazenamento */ } };

  // aplica o que o usuário fez na demonstração por cima dos dados fictícios
  const estado = ler();
  estado.fechadas.forEach((t) => { if (!A.trocas.some((x) => x.id === t.id)) A.trocas.push(t); });
  Object.entries(estado.precos).forEach(([id, lista]) => {
    const t = A.trocas.find((x) => x.id === id); if (!t) return;
    t.precos = (t.precos || []).concat(lista); t.anuncio = t.precos[t.precos.length - 1].valor;
  });
  if (typeof estado.margem === 'number') A.margemAlvo = estado.margem;

  const real = (v) => (v < 0 ? '−' : '') + 'R$ ' + Math.abs(Math.round(v)).toLocaleString('pt-BR');
  const mil = (v) => {
    const s = v < 0 ? '−' : '', a = Math.abs(v);
    if (a >= 1e6) return s + 'R$ ' + (a / 1e6).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' mi';
    return s + 'R$ ' + Math.round(a / 1000).toLocaleString('pt-BR') + ' mil';
  };
  const pct = (v, casas = 1) => (v * 100).toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas }) + '%';
  const hojeISO = () => new Date().toISOString().slice(0, 10);
  const diasEntre = (a, b) => Math.max(0, Math.round((new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / 864e5));
  const diasDesde = (iso) => diasEntre(iso, hojeISO());
  const data = (iso) => new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR');
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
  const logo = (tam = 32, claro = true) => `<svg width="${tam}" height="${tam}" viewBox="0 0 64 64" aria-hidden="true"><path d="M4 56 24 8h9l17 41V8h9v48H47L28.5 13 13 56Z" fill="${claro ? '#F2EEE5' : '#101B2B'}"/><path d="M50 8h9v14h-9z" fill="#C4A46A"/></svg>`;

  // contas da revenda — uma regra só para todas as telas
  const C = {
    vendidas: () => A.trocas.filter((t) => t.vendido),
    patio: () => A.trocas.filter((t) => !t.vendido),
    custo: (t) => t.pago + t.preparo,
    resultado: (t) => t.vendido - t.pago - t.preparo,
    margem: (t) => (t.vendido - t.pago - t.preparo) / t.vendido,
    faixaIdade: (d) => (d <= 30 ? 'normal' : d <= 60 ? 'atencao' : d <= 90 ? 'alerta' : 'critico'),
    NOMES_IDADE: { normal: 'Normal', atencao: 'Atenção', alerta: 'Alerta', critico: 'Crítico' },
    jurosMes: 0.012 // premissa: custo do dinheiro parado ao mês
  };

  window.COMUM = { estado, ler, gravar, restaurar, real, mil, pct, hojeISO, diasEntre, diasDesde, data, esc, NOMES, FICHA, logo, C };
})();
