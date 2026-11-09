// Dados FICTÍCIOS da demonstração: uma revenda inventada, com trocas inventadas.
// Gerados com semente fixa para que a demonstração mostre sempre os mesmos números.
(function () {
  let s = 20261107;
  const rnd = () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296);
  const entre = (a, b) => a + (b - a) * rnd();
  const escolhe = (l) => l[Math.floor(rnd() * l.length)];
  const normal = () => { let u = 0; for (let i = 0; i < 6; i++) u += rnd(); return (u - 3) / 1.2; };

  // base = referência do modelo seminovo (1 ano); na versão real vem da Tabela Fipe de máquinas.
  const MODELOS = [
    { tipo: 'trator', marca: 'John Deere', modelo: '6125J', base: 610000, hAno: 750 },
    { tipo: 'trator', marca: 'Massey Ferguson', modelo: 'MF 4709', base: 425000, hAno: 700 },
    { tipo: 'trator', marca: 'New Holland', modelo: 'T7.245', base: 960000, hAno: 900 },
    { tipo: 'trator', marca: 'Valtra', modelo: 'A134', base: 470000, hAno: 700 },
    { tipo: 'trator', marca: 'Case IH', modelo: 'Farmall 130A', base: 515000, hAno: 720 },
    { tipo: 'colhedora', marca: 'John Deere', modelo: 'CH570', base: 2850000, hAno: 2600 },
    { tipo: 'colhedora', marca: 'Case IH', modelo: 'Austoft 8810', base: 2950000, hAno: 2700 },
    { tipo: 'pulverizador', marca: 'Jacto', modelo: 'Uniport 3030', base: 1380000, hAno: 850 },
    { tipo: 'pulverizador', marca: 'Stara', modelo: 'Imperador 3.0', base: 1290000, hAno: 800 },
    { tipo: 'plantadeira', marca: 'Jumil', modelo: 'JM3090 Exacta', base: 410000, hAno: 260 },
    { tipo: 'plantadeira', marca: 'Stara', modelo: 'Absoluta 34', base: 640000, hAno: 280 }
  ];

  const CIDADES = ['Orlândia', 'Sertãozinho', 'Morro Agudo', 'Guaíra', 'Bebedouro', 'Jaboticabal', 'Ituverava', 'São Joaquim da Barra', 'Batatais', 'Franca', 'Nuporanga', 'Pontal'];
  const FAZENDAS = ['Santa Helena', 'Boa Vista', 'São Bento', 'Três Irmãos', 'Água Limpa', 'Santa Rita', 'Bela Aliança', 'Recreio', 'São José', 'Palmital', 'Cachoeira', 'Monte Alegre', 'Primavera', 'Santa Luzia'];
  const VENDEDORES = ['Rodrigo', 'Marcos', 'Tiago', 'Fernanda'];
  const SERVICOS = ['Troca de óleo e filtros', 'Revisão de 500 h', 'Troca de embreagem', 'Reforma de bomba injetora', 'Troca de pneus traseiros', 'Revisão do sistema hidráulico', 'Troca de correias', 'Revisão do ar-condicionado', 'Reforma do picador', 'Troca de facas do corte de base', 'Calibração de bicos', 'Troca de discos de corte'];

  // condição: nota de 0 a 100 tirada da ficha de inspeção
  function ficha(cond) {
    const nota = (peso) => Math.max(0, Math.min(5, Math.round((cond / 20) + normal() * 0.8 * peso)));
    return { motor: nota(1), transmissao: nota(1), hidraulico: nota(1), pneus: nota(1.3), cabine: nota(1.2), lataria: nota(1.4) };
  }

  const hoje = new Date();
  const diasAtras = (d) => { const x = new Date(hoje); x.setDate(x.getDate() - Math.round(d)); return x.toISOString().slice(0, 10); };

  function valorMercado(m, idade, horas, cond) {
    return m.base * Math.pow(0.9, idade - 1) * (1 - Math.min(0.45, (horas / (m.hAno * 12)) * 0.35)) * (0.72 + 0.4 * cond / 100);
  }

  const TROCAS = [];
  let n = 1;
  function nova(vendida) {
    const m = escolhe(MODELOS);
    const idade = Math.round(entre(2, 11));
    const ano = hoje.getFullYear() - idade;
    const horas = Math.round(m.hAno * idade * entre(0.65, 1.35) / 10) * 10;
    const cond = Math.round(Math.max(30, Math.min(97, 72 + normal() * 13)));
    const mercado = valorMercado(m, idade, horas, cond) * (1 + normal() * 0.05);
    // ~1 em cada 5 trocas a revenda pagou caro demais (avaliação no "olho")
    const caro = rnd() < 0.22;
    const fator = caro ? entre(0.93, 1.03) : entre(0.78, 0.88);
    const pago = Math.round(mercado * fator / 1000) * 1000;
    const preparoEst = Math.round((100 - cond) * m.base * 0.0004 / 100) * 100;
    // o preparo real varia: às vezes a oficina gasta bem mais que o previsto
    const preparo = Math.round(preparoEst * (rnd() < 0.15 ? entre(1.5, 2.2) : entre(0.8, 1.2)) / 100) * 100;
    const diasPatio = Math.round((m.tipo === 'colhedora' ? 70 : 35) + entre(0, 70) + (caro ? entre(20, 90) : 0));
    const entrada = vendida ? entre(diasPatio + 20, 1000) : entre(8, 160);
    const vendido = vendida ? Math.round(mercado * entre(0.97, 1.03) / 1000) * 1000 : null;
    const idTroca = 'T' + String(n++).padStart(3, '0');
    const mans = [];
    const qtd = Math.round(entre(1, 4));
    for (let i = 0; i < qtd; i++) mans.push({ servico: escolhe(SERVICOS), horas: Math.round(horas * entre(0.3, 0.98) / 10) * 10, comNota: rnd() < 0.6 });
    const anuncioIni = vendida ? null : Math.round(mercado * 1.08 / 1000) * 1000;
    const precos = [];
    if (!vendida) {
      precos.push({ data: diasAtras(entrada - 3), valor: anuncioIni, motivo: 'Anúncio inicial' });
      if (entrada > 75) precos.push({ data: diasAtras(entrada - 60), valor: Math.round(anuncioIni * 0.96 / 1000) * 1000, motivo: 'Redução após 60 dias' });
    }
    TROCAS.push({
      id: idTroca, tipo: m.tipo, marca: m.marca, modelo: m.modelo, ano, horas, cond, ficha: ficha(cond),
      pago, preparo, preparoEst, vendido, precos, entrada: diasAtras(entrada), saida: vendida ? diasAtras(entrada - diasPatio) : null,
      diasPatio: vendida ? diasPatio : null, anuncio: precos.length ? precos[precos.length - 1].valor : null,
      vendedor: escolhe(VENDEDORES), origem: 'Faz. ' + escolhe(FAZENDAS) + ', ' + escolhe(CIDADES),
      idAgro: rnd() < 0.55, manutencoes: mans.sort((a, b) => a.horas - b.horas)
    });
  }
  for (let i = 0; i < 52; i++) nova(true);
  for (let i = 0; i < 9; i++) nova(false);
  // custos lançados depois da venda (sem sorteio, para não mudar os números acima): em 2 de cada 3 vendas a comissão
  // foi registrada; em algumas, o usado ficou no floor plan da revenda e os juros também foram lançados
  TROCAS.filter((t) => t.vendido).forEach((t, i) => {
    if (i % 3 === 2) return;
    t.custos = { comissao: Math.round(t.vendido * 0.015 / 100) * 100 };
    if (i % 4 === 0 && t.diasPatio > 60) t.custos.juros = Math.round(t.pago * 0.011 * (t.diasPatio - 60) / 30 / 100) * 100;
  });

  // ---- garantias: serviços feitos na oficina em garantia e o que o fabricante pagou ----
  const GARANTIAS = [];
  const SERV_GAR = ['Troca de bomba hidráulica', 'Reparo do câmbio', 'Sensor do motor', 'Módulo eletrônico', 'Reparo do picador', 'Troca de turbina', 'Vazamento no cabeçote', 'Bicos e barra do pulverizador', 'Atuador do piloto automático', 'Embreagem da tomada de força'];
  for (let i = 0; i < 26; i++) {
    const valor = Math.round(entre(4500, 68000) / 100) * 100;
    const dias = Math.round(entre(5, 330));
    const s = rnd();
    const status = dias < 45 ? 'aguardando' : s < 0.55 ? 'pago' : s < 0.8 ? 'parcial' : s < 0.9 ? 'negado' : 'aguardando';
    const pago = status === 'pago' ? valor : status === 'parcial' ? Math.round(valor * entre(0.45, 0.85) / 100) * 100 : 0;
    const mg = escolhe(MODELOS.filter((x) => x.tipo !== 'plantadeira'));
    GARANTIAS.push({ os: 'OS-' + (4210 + i * 7), data: diasAtras(dias), marca: mg.marca, modelo: mg.modelo, servico: escolhe(SERV_GAR), cliente: 'Faz. ' + escolhe(FAZENDAS), valor, pago, status, motivo: status === 'negado' ? escolhe(['Prazo de envio vencido', 'Falta foto da peça', 'Horímetro sem registro']) : status === 'parcial' ? escolhe(['Mão de obra paga abaixo da tabela', 'Peça glosada', 'Deslocamento não pago']) : '' });
  }

  // ---- estoque novo financiado (floor plan): juros correm até a revenda quitar com o banco ----
  const FINANCIADAS = [];
  const NOVAS = MODELOS.filter((m) => m.tipo !== 'plantadeira');
  for (let i = 0; i < 16; i++) {
    const m = escolhe(NOVAS);
    const valor = Math.round(m.base * entre(1.05, 1.18) / 1000) * 1000;
    const entrada = entre(20, 300);
    const vendida = rnd() < 0.62 && entrada > 60;
    const venda = vendida ? entrada - entre(30, entrada - 10) : null;
    const atraso = vendida ? (rnd() < 0.45 ? entre(12, 75) : entre(0, 6)) : null; // dias entre a venda e a quitação
    const quitada = vendida && rnd() < 0.7;
    FINANCIADAS.push({ chassi: 'CH' + (88120 + i * 13), marca: m.marca, modelo: m.modelo, tipo: m.tipo, valor, banco: escolhe(['Banco da montadora', 'Banco do Brasil', 'Sicredi']), taxaMes: 0.011, carencia: 90,
      entrada: diasAtras(entrada), venda: vendida ? diasAtras(venda) : null, quitacao: vendida && quitada ? diasAtras(Math.max(0, venda - atraso)) : null });
  }

  // ---- compradores que procuram usados (CRM leve) ----
  const NOMES_C = ['José Carlos', 'Antônio Ribeiro', 'Paulo Mendes', 'Luiz Fernando', 'Ricardo Alves', 'Márcio Tavares', 'Sérgio Lopes', 'Fábio Rezende', 'Cláudio Prado', 'Renato Guimarães', 'Eduardo Faria', 'Gilberto Souza', 'Wagner Lima', 'Adriano Melo', 'Rogério Campos', 'Valdir Moreira', 'Joaquim Barros', 'Hélio Teixeira'];
  const COMPRADORES = NOMES_C.map((n, i) => {
    const m = escolhe(MODELOS); const ate = Math.round(m.base * entre(0.55, 0.95) / 10000) * 10000;
    return { id: 'C' + (i + 1), nome: n, fazenda: 'Faz. ' + escolhe(FAZENDAS), cidade: escolhe(CIDADES), tipo: m.tipo, marcas: rnd() < 0.5 ? m.marca : '', anoMin: hoje.getFullYear() - Math.round(entre(4, 10)), precoMax: ate, desde: diasAtras(entre(5, 200)), obs: escolhe(['Quer para a próxima safra', 'Aceita dar usado na troca', 'Paga à vista', 'Precisa de financiamento', 'Procura com piloto automático', '']) };
  });

  // ---- anúncios e leilões observados (mercado de fora) ----
  const ANUNCIOS = [];
  const FONTES = ['Agrofy', 'Mercado Máquinas', 'Leilão', 'Revenda concorrente'];
  for (let i = 0; i < 64; i++) {
    const m = escolhe(MODELOS), idade = Math.round(entre(2, 10)), quando = entre(3, 190);
    const horas = Math.round(m.hAno * idade * entre(0.7, 1.3) / 10) * 10;
    // colhedoras perdendo valor nos últimos 2 meses (sinal para a demonstração)
    const queda = m.tipo === 'colhedora' && quando < 60 ? entre(0.84, 0.9) : 1;
    const preco = Math.round(m.base * Math.pow(0.9, idade - 1) * (1 - Math.min(0.45, horas / (m.hAno * 12) * 0.35)) * entre(1.02, 1.14) * queda / 1000) * 1000;
    ANUNCIOS.push({ id: 'AN' + (i + 1), data: diasAtras(quando), fonte: escolhe(FONTES), tipo: m.tipo, marca: m.marca, modelo: m.modelo, ano: hoje.getFullYear() - idade, horas, preco, cidade: escolhe(CIDADES.concat(['Rio Verde, GO', 'Uberaba, MG', 'Ribeirão Preto, SP', 'Cascavel, PR'])) });
  }

  window.ANSHUR = {
    compradores: COMPRADORES,
    anuncios: ANUNCIOS,
    garantias: GARANTIAS,
    financiadas: FINANCIADAS,
    revenda: { nome: 'Mogiana Máquinas', cidade: 'Orlândia, SP', aviso: 'Revenda e dados fictícios, só para demonstração' },
    modelos: MODELOS,
    trocas: TROCAS,
    margemAlvo: 0.14
  };
})();
