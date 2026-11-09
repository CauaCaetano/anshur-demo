// Fiscal do Anshur: REGRAS PURAS (sem tela). Testadas em testes_fiscal.js. As telas ficam em areas/fiscal.js.
// O Anshur NÃO emite nota fiscal (ver relatorios/anshur-comercial/fiscal-viabilidade.md). Esta área:
//  - guarda o cadastro fiscal da revenda (CNPJ, IE, regime, CNAE, município, séries);
//  - SUGERE natureza de operação, CFOP e NCM (sempre com aviso: o contador confere);
//  - lista o que precisa de nota (vendas, compras de usado, OS, peças) para emitir no emissor atual;
//  - exporta os dados prontos (CSV e XML de DADOS, que não é NF-e) e importa o XML autorizado emitido fora, ligando à operação.
// Tudo mora em estado.fiscal = { perfil, desde, naturezas, ncms, notas, decisoes } (listas com id: fila offline idempotente).
(function (raiz) {
  const r2 = (v) => Math.round((+v || 0) * 100) / 100;
  const so = (s) => String(s == null ? '' : s).replace(/\D/g, '');
  const hojeISO = () => new Date().toISOString().slice(0, 10);
  const mesDe = (iso) => String(iso || '').slice(0, 7);
  const diasEntre = (a, b) => Math.round((new Date(b + 'T12:00:00') - new Date(a + 'T12:00:00')) / 864e5);
  const dataBR = (iso) => (iso ? String(iso).slice(0, 10).split('-').reverse().join('/') : '');
  const brl = (v) => (+v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const normal = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  let seq = 0;
  const novoId = (pre) => pre + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase() + (seq++).toString(36);

  // ---------- documentos de identificação ----------
  function cnpjValido(c) {
    const d = so(c); if (d.length !== 14 || /^(\d)\1+$/.test(d)) return false;
    const dv = (n) => { let s = 0, p = n - 7; for (let i = 0; i < n; i++) { s += +d[i] * p--; if (p < 2) p = 9; } const r = s % 11; return r < 2 ? 0 : 11 - r; };
    return dv(12) === +d[12] && dv(13) === +d[13];
  }
  function cpfValido(c) {
    const d = so(c); if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false;
    const dv = (n) => { let s = 0; for (let i = 0; i < n; i++) s += +d[i] * (n + 1 - i); const r = (s * 10) % 11; return r === 10 ? 0 : r; };
    return dv(9) === +d[9] && dv(10) === +d[10];
  }
  const fmtCNPJ = (c) => { const d = so(c); return d.length === 14 ? d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5') : String(c || ''); };
  const fmtCPF = (c) => { const d = so(c); return d.length === 11 ? d.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4') : String(c || ''); };
  const fmtDoc = (c) => (so(c).length === 14 ? fmtCNPJ(c) : so(c).length === 11 ? fmtCPF(c) : String(c || ''));
  // chave de acesso da NF-e: 44 dígitos, o último é o dígito verificador (módulo 11, pesos 2..9 da direita para a esquerda)
  function dvChave(c43) {
    const d = so(c43); if (d.length !== 43) return -1;
    let s = 0, p = 2; for (let i = 42; i >= 0; i--) { s += +d[i] * p; p = p === 9 ? 2 : p + 1; }
    const r = s % 11; return r < 2 ? 0 : 11 - r;
  }
  const chaveValida = (c) => { const d = so(c); return d.length === 44 && dvChave(d.slice(0, 43)) === +d[43]; };
  // partes da chave: cUF(2) AAMM(4) CNPJ(14) modelo(2) série(3) número(9) tpEmis(1) código(8) DV(1)
  const partesChave = (c) => { const d = so(c); return d.length === 44 ? { uf: d.slice(0, 2), aamm: d.slice(2, 6), cnpj: d.slice(6, 20), modelo: d.slice(20, 22), serie: +d.slice(22, 25), numero: +d.slice(25, 34), tpEmis: d[34] } : null; };

  // ---------- cadastro fiscal da revenda ----------
  const REGIMES = { simples: 'Simples Nacional', simples_excesso: 'Simples Nacional, excesso de sublimite', presumido: 'Lucro Presumido', real: 'Lucro Real' };
  const CRT = { simples: 1, simples_excesso: 2, presumido: 3, real: 3 };
  const UFS = ['AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MG', 'MS', 'MT', 'PA', 'PB', 'PE', 'PI', 'PR', 'RJ', 'RN', 'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO'];
  const CNAES_SUGERIDOS = [
    { cnae: '4661300', desc: 'Comércio atacadista de máquinas, aparelhos e equipamentos para uso agropecuário; partes e peças' },
    { cnae: '3314712', desc: 'Manutenção e reparação de tratores agrícolas' },
    { cnae: '3314713', desc: 'Manutenção e reparação de máquinas-ferramenta' },
    { cnae: '4530703', desc: 'Comércio a varejo de peças e acessórios novos para veículos automotores' }
  ];
  const fmtCNAE = (c) => { const d = so(c); return d.length === 7 ? d.replace(/^(\d{4})(\d)(\d{2})$/, '$1-$2/$3') : String(c || ''); };
  const PERFIL_VAZIO = () => ({ razao: '', fantasia: '', cnpj: '', ie: '', im: '', regime: '', cnae: '', cnaes2: '', municipio: '', uf: '', ibge: '', serieNFe: '1', proxNFe: '', serieNFSe: '1', proxNFSe: '', emissor: '', contador: '', emailContador: '', atualizadoEm: '', atualizadoPor: '' });
  // devolve [{ campo, msg }] (vazio = ok). Dados mínimos para exportar para o emissor.
  function validarPerfil(p) {
    const e = [], x = p || {};
    if (!String(x.razao || '').trim()) e.push({ campo: 'razao', msg: 'Informe a razão social.' });
    if (!cnpjValido(x.cnpj)) e.push({ campo: 'cnpj', msg: 'CNPJ inválido (confira os dígitos).' });
    const ie = String(x.ie || '').trim();
    if (!ie) e.push({ campo: 'ie', msg: 'Informe a inscrição estadual (ou ISENTO).' });
    else if (!/^isento$/i.test(ie) && !/^\d{2,14}$/.test(so(ie))) e.push({ campo: 'ie', msg: 'Inscrição estadual: só números ou ISENTO.' });
    if (!REGIMES[x.regime]) e.push({ campo: 'regime', msg: 'Escolha o regime tributário.' });
    if (so(x.cnae).length !== 7) e.push({ campo: 'cnae', msg: 'CNAE principal com 7 dígitos (ex.: 4661-3/00).' });
    if (!String(x.municipio || '').trim()) e.push({ campo: 'municipio', msg: 'Informe o município.' });
    if (!UFS.includes(String(x.uf || '').toUpperCase())) e.push({ campo: 'uf', msg: 'Escolha a UF.' });
    if (x.ibge && so(x.ibge).length !== 7) e.push({ campo: 'ibge', msg: 'Código IBGE do município tem 7 dígitos.' });
    if (!/^\d{1,3}$/.test(String(x.serieNFe || ''))) e.push({ campo: 'serieNFe', msg: 'Série da NF-e: de 0 a 999.' });
    if (x.proxNFe && !/^\d{1,9}$/.test(String(x.proxNFe))) e.push({ campo: 'proxNFe', msg: 'Próximo número da NF-e: só números (até 9 dígitos).' });
    if (x.proxNFSe && !/^\d{1,15}$/.test(String(x.proxNFSe))) e.push({ campo: 'proxNFSe', msg: 'Próximo número da NFS-e: só números.' });
    return e;
  }
  const perfilCompleto = (p) => validarPerfil(p).length === 0;

  // ---------- NCM sugeridos (SUGESTÃO: o contador confere a classificação de cada item) ----------
  const NCM_SUGERIDOS = [
    { ncm: '87019300', desc: 'Trator agrícola de 37 kW a 75 kW (≈ 50 a 100 cv)', tipo: 'trator', kwDe: 37, kwAte: 75, grupo: 'maquina' },
    { ncm: '87019400', desc: 'Trator agrícola de 75 kW a 130 kW (≈ 100 a 175 cv)', tipo: 'trator', kwDe: 75, kwAte: 130, grupo: 'maquina' },
    { ncm: '87019500', desc: 'Trator agrícola acima de 130 kW (≈ 175 cv ou mais)', tipo: 'trator', kwDe: 130, kwAte: 9999, grupo: 'maquina' },
    { ncm: '87019200', desc: 'Trator agrícola de 18 kW a 37 kW (≈ 25 a 50 cv)', tipo: 'trator', kwDe: 18, kwAte: 37, grupo: 'maquina' },
    { ncm: '84335100', desc: 'Colheitadeira de grãos (ceifeira-debulhadora)', tipo: 'colhedora', grupo: 'maquina' },
    { ncm: '84335990', desc: 'Outras colhedoras (ex.: colhedora de cana)', tipo: 'colhedora', grupo: 'maquina' },
    { ncm: '84244900', desc: 'Pulverizador agrícola (não portátil, inclusive autopropelido)', tipo: 'pulverizador', grupo: 'maquina' },
    { ncm: '84323110', desc: 'Semeadora-adubadora de plantio direto', tipo: 'plantadeira', grupo: 'maquina' },
    { ncm: '84323190', desc: 'Outras semeadoras e plantadeiras de plantio direto', tipo: 'plantadeira', grupo: 'maquina' },
    { ncm: '84323990', desc: 'Semeadora ou plantadeira (outras, não plantio direto)', tipo: 'plantadeira', grupo: 'maquina' },
    { ncm: '84339090', desc: 'Partes de colhedoras e máquinas de colheita', tipo: 'peca', grupo: 'peca' },
    { ncm: '84329000', desc: 'Partes de plantadeiras, semeadoras e implementos de solo', tipo: 'peca', grupo: 'peca' },
    { ncm: '84249090', desc: 'Partes de pulverizadores', tipo: 'peca', grupo: 'peca' },
    { ncm: '84212300', desc: 'Filtro de óleo ou de combustível para motor', tipo: 'peca', grupo: 'peca' },
    { ncm: '84213100', desc: 'Filtro de ar para motor', tipo: 'peca', grupo: 'peca' },
    { ncm: '40117090', desc: 'Pneu novo para trator e máquina agrícola', tipo: 'peca', grupo: 'peca' },
    { ncm: '40103900', desc: 'Correia de transmissão (outras)', tipo: 'peca', grupo: 'peca' },
    { ncm: '84821010', desc: 'Rolamento de esferas', tipo: 'peca', grupo: 'peca' },
    { ncm: '27101932', desc: 'Óleo lubrificante (sujeito a substituição tributária na maioria dos estados)', tipo: 'peca', grupo: 'peca' }
  ];
  const fmtNCM = (n) => { const d = so(n); return d.length === 8 ? d.replace(/^(\d{4})(\d{2})(\d{2})$/, '$1.$2.$3') : String(n || ''); };
  const ncmValido = (n) => so(n).length === 8;
  // potência: cv (o que o vendedor conhece) → kW
  const cvParaKw = (cv) => r2((+cv || 0) * 0.7355);
  // sugere NCMs para uma máquina { tipo, cv?, modelo? }: primeiro o mais provável. Sempre "sugestão".
  function sugerirNCM(m, extras) {
    const tipo = (m && m.tipo) || '', lista = NCM_SUGERIDOS.concat((extras || []).filter((x) => !x.inativo)).filter((x) => x.tipo === tipo);
    if (tipo === 'trator') {
      const cv = +(m && m.cv) || cvDoModelo(m && m.modelo), kw = cv ? cvParaKw(cv) : 0;
      if (kw) return lista.slice().sort((a, b) => (dentro(b, kw) - dentro(a, kw)) || ((a.kwDe || 0) - (b.kwDe || 0)));
      return lista.slice().sort((a, b) => (a.ncm === '87019400' ? -1 : b.ncm === '87019400' ? 1 : 0));
    }
    if (tipo === 'colhedora') { const pref = /cana|austoft|ch5\d\d|ch6\d\d/i.test((m && m.modelo) || '') ? '84335990' : '84335100'; return lista.slice().sort((a, b) => (a.ncm === pref ? -1 : b.ncm === pref ? 1 : 0)); }
    return lista;
  }
  const dentro = (x, kw) => (x.kwDe != null && kw > x.kwDe && kw <= x.kwAte ? 1 : 0);
  // tenta tirar a potência do nome do modelo (ex.: "6125J" → 125 cv; "T7.245" → 245; "MF 4709" → 4709 não serve)
  function cvDoModelo(modelo) {
    const m = String(modelo || '').match(/(\d{3})(?!\d)/g); if (!m) return 0;
    const v = +m[m.length - 1]; return v >= 40 && v <= 650 ? v : 0;
  }

  // ---------- naturezas de operação e CFOP sugeridos (SUGESTÃO: confira com o contador) ----------
  // doc: 'nfe' (NF-e modelo 55), 'nfse' (nota de serviço da prefeitura), 'nfce' (cupom modelo 65); tpNF: 0 entrada, 1 saída
  const NATUREZAS_PADRAO = [
    { id: 'nat-venda-nova', nome: 'Venda de máquina nova', cfopDentro: '5102', cfopFora: '6102', doc: 'nfe', tpNF: 1, uso: ['venda-nova'], obs: 'Máquinas e implementos agrícolas costumam ter base de cálculo do ICMS reduzida (Convênio ICMS 52/91) e IPI zero ou reduzido. Informe chassi e número de série na descrição.' },
    { id: 'nat-venda-usado', nome: 'Venda de máquina usada', cfopDentro: '5102', cfopFora: '6102', doc: 'nfe', tpNF: 1, uso: ['venda-usado'], obs: 'Alguns estados têm regra própria para bens usados (redução de base de cálculo). Informe chassi, ano e horímetro.' },
    { id: 'nat-entrada-usado', nome: 'Compra de usado de produtor rural (NF-e de entrada)', cfopDentro: '1102', cfopFora: '2102', doc: 'nfe', tpNF: 0, uso: ['compra-usado'], obs: 'Produtor pessoa física sem inscrição: a revenda emite a NF-e de entrada com o CPF dele. Produtor com inscrição estadual emite a própria nota: importe o XML dele.' },
    { id: 'nat-troca-usado', nome: 'Entrada de usado recebido na troca', cfopDentro: '1102', cfopFora: '2102', doc: 'nfe', tpNF: 0, uso: ['compra-usado'], obs: 'Mesmo tratamento da compra de usado; o valor da troca abate do preço da máquina vendida.' },
    { id: 'nat-venda-pecas', nome: 'Venda de peças', cfopDentro: '5102', cfopFora: '6102', doc: 'nfe', tpNF: 1, uso: ['venda-pecas'], obs: 'Peça sujeita a substituição tributária usa 5405 (dentro do estado). No balcão para consumidor final pode ser NFC-e (modelo 65).' },
    { id: 'nat-venda-pecas-st', nome: 'Venda de peças com ICMS já retido (ST)', cfopDentro: '5405', cfopFora: '6404', doc: 'nfe', tpNF: 1, uso: ['venda-pecas'], obs: 'Confira o CEST de cada peça.' },
    { id: 'nat-servico', nome: 'Serviço de oficina (mão de obra)', cfopDentro: '', cfopFora: '', doc: 'nfse', tpNF: 1, uso: ['os'], obs: 'Nota de serviço da prefeitura (NFS-e), item 14.01 da lista da LC 116/2003. Peças aplicadas na OS saem em NF-e à parte (5102/5405).' },
    { id: 'nat-remessa-conserto', nome: 'Retorno de máquina do cliente após conserto', cfopDentro: '5916', cfopFora: '6916', doc: 'nfe', tpNF: 1, uso: ['os'], obs: 'Quando o cliente com inscrição mandou a máquina com nota de remessa para conserto (5915).' },
    { id: 'nat-demonstracao', nome: 'Remessa de máquina para demonstração', cfopDentro: '5912', cfopFora: '6912', doc: 'nfe', tpNF: 1, uso: ['outros'], obs: 'Retorno da demonstração: 1913/2913.' },
    { id: 'nat-entrega-futura', nome: 'Venda para entrega futura (faturamento antecipado)', cfopDentro: '5922', cfopFora: '6922', doc: 'nfe', tpNF: 1, uso: ['venda-nova'], obs: 'Comum em venda financiada (Finame/BNDES). Na entrega da máquina: 5117/6117.' },
    { id: 'nat-devolucao-venda', nome: 'Devolução de venda (o cliente devolveu)', cfopDentro: '1202', cfopFora: '2202', doc: 'nfe', tpNF: 0, uso: ['outros'], obs: 'Referencie a chave da nota de venda original.' },
    { id: 'nat-compra-nova', nome: 'Compra de máquina nova da fábrica', cfopDentro: '1102', cfopFora: '2102', doc: 'nfe', tpNF: 0, uso: ['outros'], obs: 'Quem emite é a fábrica: importe o XML recebido.' }
  ];
  const naturezas = (est) => NATUREZAS_PADRAO.concat(((est && est.fiscal && est.fiscal.naturezas) || []).filter((n) => !n.inativo));
  const natureza = (est, id) => naturezas(est).find((n) => n.id === id) || null;
  // CFOP: 4 dígitos; o 1º diz entrada (1, 2, 3) ou saída (5, 6, 7) e dentro (1, 5) ou fora do estado (2, 6)
  const cfopValido = (c) => /^[123567]\d{3}$/.test(so(c));
  const fmtCFOP = (c) => { const d = so(c); return d.length === 4 ? d[0] + '.' + d.slice(1) : String(c || ''); };
  function cfopPara(nat, ufDestino, ufRevenda) {
    if (!nat) return '';
    const fora = ufDestino && ufRevenda && String(ufDestino).toUpperCase() !== String(ufRevenda).toUpperCase();
    return (fora ? nat.cfopFora : nat.cfopDentro) || '';
  }
  // natureza sugerida para cada tipo de documento da lista
  const NAT_DO_TIPO = { 'venda-nova': 'nat-venda-nova', 'venda-usado': 'nat-venda-usado', 'compra-usado': 'nat-entrada-usado', 'venda-pecas': 'nat-venda-pecas', os: 'nat-servico' };
  function validarNatureza(n) {
    const e = [];
    if (!String((n && n.nome) || '').trim()) e.push('Dê um nome para a natureza de operação.');
    if (n && n.doc !== 'nfse') { if (!cfopValido(n.cfopDentro)) e.push('CFOP dentro do estado inválido (4 dígitos, começa com 1, 2, 3, 5, 6 ou 7).'); if (n.cfopFora && !cfopValido(n.cfopFora)) e.push('CFOP fora do estado inválido.'); }
    return e;
  }

  // ---------- estado ----------
  const LISTAS = ['naturezas', 'ncms', 'notas', 'decisoes'];
  function garantir(est) {
    // completa no lugar (nunca troca o objeto)
    if (!est.fiscal || typeof est.fiscal !== 'object' || Array.isArray(est.fiscal)) est.fiscal = {};
    const f = est.fiscal;
    if (!f.perfil || typeof f.perfil !== 'object') f.perfil = PERFIL_VAZIO();
    else Object.keys(PERFIL_VAZIO()).forEach((k) => { if (f.perfil[k] === undefined) f.perfil[k] = PERFIL_VAZIO()[k]; });
    if (typeof f.desde !== 'string') f.desde = '';
    LISTAS.forEach((k) => { if (!Array.isArray(f[k])) f[k] = []; });
    return f;
  }
  function salvarPerfil(est, dados, quem = '', agora = new Date().toISOString()) {
    const f = garantir(est), p = Object.assign({}, f.perfil, dados);
    p.cnpj = so(p.cnpj); p.cnae = so(p.cnae); p.ibge = so(p.ibge); p.uf = String(p.uf || '').toUpperCase();
    p.ie = /^isento$/i.test(String(p.ie || '').trim()) ? 'ISENTO' : so(p.ie);
    const erros = validarPerfil(p); if (erros.length) { const er = new Error(erros[0].msg); er.erros = erros; throw er; }
    p.atualizadoEm = agora; p.atualizadoPor = quem;
    f.perfil = p; return p;
  }
  function salvarNatureza(est, d, quem = '', agora = new Date().toISOString()) {
    const f = garantir(est), erros = validarNatureza(d); if (erros.length) throw new Error(erros[0]);
    if (NATUREZAS_PADRAO.some((n) => n.id === d.id)) throw new Error('As naturezas sugeridas não são editadas: crie uma da revenda.');
    const ja = d.id && f.naturezas.find((n) => n.id === d.id);
    const n = Object.assign(ja || { id: novoId('NAT'), criadoEm: agora, criadoPor: quem }, { nome: String(d.nome).trim(), cfopDentro: so(d.cfopDentro), cfopFora: so(d.cfopFora), doc: d.doc === 'nfse' ? 'nfse' : d.doc === 'nfce' ? 'nfce' : 'nfe', tpNF: d.tpNF === 0 || d.tpNF === '0' ? 0 : 1, uso: d.uso && d.uso.length ? d.uso : ['outros'], obs: String(d.obs || '').trim(), proprio: true, atualizadoEm: agora });
    if (!ja) f.naturezas.push(n); return n;
  }
  function salvarNCM(est, d, quem = '', agora = new Date().toISOString()) {
    const f = garantir(est); if (!ncmValido(d.ncm)) throw new Error('NCM tem 8 dígitos (ex.: 8701.94.00).');
    if (!String(d.desc || '').trim()) throw new Error('Descreva o item.');
    const ja = (d.id && f.ncms.find((x) => x.id === d.id)) || f.ncms.find((x) => !x.inativo && so(x.ncm) === so(d.ncm) && normal(x.desc) === normal(d.desc));
    const x = Object.assign(ja || { id: novoId('NCM'), criadoEm: agora, criadoPor: quem }, { ncm: so(d.ncm), desc: String(d.desc).trim(), tipo: d.tipo || 'peca', grupo: d.tipo === 'peca' || !d.tipo ? 'peca' : 'maquina', cest: so(d.cest), conferido: !!d.conferido, proprio: true, atualizadoEm: agora });
    if (!ja) f.ncms.push(x); return x;
  }

  // ---------- o que precisa de nota ----------
  // ctx: { trocas, financiadas, lancamentos (do Financeiro, já com os automáticos), os (da Oficina, se existir), nomeCliente(id), hoje }
  // tipos: venda-usado (NF-e de saída), compra-usado (NF-e de entrada), venda-nova (NF-e), venda-pecas (NF-e/NFC-e), os (NFS-e)
  const TIPOS = {
    'venda-nova': { nome: 'Venda de máquina nova', doc: 'NF-e', saida: true },
    'venda-usado': { nome: 'Venda de usado', doc: 'NF-e', saida: true },
    'compra-usado': { nome: 'Compra de usado (entrada)', doc: 'NF-e de entrada', saida: false },
    'venda-pecas': { nome: 'Venda de peças', doc: 'NF-e', saida: true },
    os: { nome: 'Serviço de oficina (OS)', doc: 'NFS-e', saida: true }
  };
  const ehVenda = (tipo) => ['venda-nova', 'venda-usado', 'venda-pecas', 'os'].includes(tipo);
  const numOS = (s) => { const m = String(s || '').match(/OS[\s-]*(\d{2,})/i); return m ? 'OS-' + m[1] : ''; };
  function documentos(est, ctx = {}) {
    const f = garantir(est), hoje = ctx.hoje || hojeISO(), desde = f.desde || '', out = [];
    const ok = (d) => d && (!desde || d >= desde) && d <= hoje;
    const lanc = (ctx.lancamentos || []).filter((l) => l && !l.cancelado && l.tipo === 'receber');
    const nome = (id) => (ctx.nomeCliente ? ctx.nomeCliente(id) : '') || '';
    const clienteDaMaquina = (maq) => { const l = lanc.find((x) => x.maquina === maq && x.cliente); return l ? { id: l.cliente, nome: nome(l.cliente) } : null; };
    const valorDaMaquina = (maq, cats) => { const ls = lanc.filter((x) => x.maquina === maq && cats.includes(x.categoria)); return ls.length ? r2(ls.reduce((s, x) => s + (+x.valor || 0), 0)) : null; };
    (ctx.trocas || []).forEach((t) => {
      if (!t || !t.id) return;
      const maq = `${t.marca || ''} ${t.modelo || ''}`.trim() + (t.ano ? ' ' + t.ano : '');
      if (ok(t.entrada) && +t.pago > 0) out.push({ id: 'CU:' + t.id, tipo: 'compra-usado', data: t.entrada, valor: r2(t.pago), pessoa: t.origem || '', pessoaTipo: 'produtor', maquina: t.id, maquinaNome: maq, chassi: t.chassi || '', loja: t.loja || '', tipoMaquina: t.tipo, modelo: t.modelo, ano: t.ano, horas: t.horas, ref: t.id });
      if (t.vendido && ok(t.saida)) { const c = clienteDaMaquina(t.id); out.push({ id: 'VU:' + t.id, tipo: 'venda-usado', data: t.saida, valor: r2(t.vendido), pessoa: c ? c.nome : '', cliente: c ? c.id : '', maquina: t.id, maquinaNome: maq, chassi: t.chassi || '', loja: t.loja || '', tipoMaquina: t.tipo, modelo: t.modelo, ano: t.ano, horas: t.horas, ref: t.id }); }
    });
    (ctx.financiadas || []).forEach((n) => {
      if (!n || !n.chassi || !ok(n.venda)) return;
      const id = 'F:' + n.chassi, c = clienteDaMaquina(id);
      out.push({ id: 'VN:' + n.chassi, tipo: 'venda-nova', data: n.venda, valor: valorDaMaquina(id, ['rec-novas', 'rec-usados', 'rec-outras']), pessoa: c ? c.nome : '', cliente: c ? c.id : '', maquina: id, maquinaNome: `${n.marca} ${n.modelo}`, chassi: n.chassi, loja: n.loja || '', tipoMaquina: n.tipo, modelo: n.modelo, ano: n.ano || '', ref: n.chassi });
    });
    // OS da Oficina (se a área existir): concluídas/entregues/faturadas com valor
    const osVistas = new Set();
    (ctx.os || []).forEach((o) => {
      if (!o || !o.id || o.cancelada || o.status === 'cancelada') return;
      const fim = o.entregue || o.entrega || o.concluida || o.fechadaEm || o.data;
      const pronta = /entreg|conclu|fatur|fechad|finaliz/i.test(String(o.status || '')) || o.entregue || o.concluida;
      const valor = +(o.total != null ? o.total : o.valor) || 0;
      if (!pronta || !ok(String(fim || '').slice(0, 10)) || !(valor > 0)) return;
      const n = o.numero ? (String(o.numero).startsWith('OS') ? String(o.numero) : 'OS-' + o.numero) : o.id;
      osVistas.add(n);
      out.push({ id: 'OS:' + o.id, tipo: 'os', data: String(fim).slice(0, 10), valor: r2(valor), pessoa: o.clienteNome || nome(o.cliente) || '', cliente: o.cliente || '', maquina: o.maquina || '', maquinaNome: o.equipamento || o.maquinaNome || '', loja: o.loja || '', ref: n, os: n, valorPecas: +o.totalPecas || +o.pecas || 0 });
    });
    // receitas de oficina e peças lançadas no Financeiro (parcelas da mesma venda viram um documento só)
    const grupos = new Map();
    lanc.filter((l) => ['rec-oficina', 'rec-pecas'].includes(l.categoria) || (l.categoria === 'rec-novas' && !String(l.maquina || '').startsWith('F:'))).forEach((l) => {
      const raizId = String(l.restoDe || l.id).replace(/-R[0-9A-Z]+$/, '');
      const k = l.parcela && l.parcela.grupo ? 'G' + l.parcela.grupo : raizId;
      const g = grupos.get(k) || { ls: [] }; g.ls.push(l); grupos.set(k, g);
    });
    grupos.forEach((g, k) => {
      const l = g.ls.slice().sort((a, b) => String(a.competencia || a.vencimento).localeCompare(String(b.competencia || b.vencimento)))[0];
      const data = String(l.competencia || l.vencimento || '').slice(0, 10); if (!ok(data)) return;
      const os = numOS(l.os || l.documento || l.descricao);
      if (l.categoria === 'rec-oficina' && os && osVistas.has(os)) return; // a OS já veio da Oficina
      const tipo = l.categoria === 'rec-oficina' ? 'os' : l.categoria === 'rec-pecas' ? 'venda-pecas' : 'venda-nova';
      out.push({ id: 'LC:' + k, tipo, data, valor: r2(g.ls.reduce((s, x) => s + (+x.valor || 0), 0)), pessoa: nome(l.cliente), cliente: l.cliente || '', maquina: l.maquina || '', maquinaNome: '', loja: l.loja || '', ref: os || l.documento || '', os, descricao: l.descricao, lancamento: l.id });
    });
    // situação de cada um
    return out.map((d) => Object.assign(d, situacaoDoc(est, d))).sort((a, b) => String(b.data).localeCompare(String(a.data)) || a.id.localeCompare(b.id));
  }
  // situação: 'vinculada' (XML autorizado guardado) | 'informada' (número digitado, sem XML) | 'dispensada' | 'sem-nota'
  function situacaoDoc(est, d) {
    const f = garantir(est);
    const notas = f.notas.filter((n) => !n.cancelada && (n.vinculos || []).includes(d.id));
    const dec = f.decisoes.find((x) => x.id === 'DEC:' + d.id && !x.desfeita);
    if (notas.some((n) => n.xml || n.caminho || n.exemplo)) return { situacao: 'vinculada', notas: notas.map((n) => n.id) };
    if (notas.length) return { situacao: 'informada', notas: notas.map((n) => n.id) };
    if (dec && dec.tipo === 'dispensada') return { situacao: 'dispensada', notas: [], motivo: dec.motivo };
    return { situacao: 'sem-nota', notas: [] };
  }
  const NOMES_SIT = { 'sem-nota': 'Emitir no seu emissor', vinculada: 'Nota vinculada', informada: 'Número informado (sem XML)', dispensada: 'Não precisa de nota' };
  function resumo(est, ctx = {}) {
    const hoje = ctx.hoje || hojeISO(), mes = mesDe(hoje), docs = documentos(est, ctx);
    const doMes = docs.filter((d) => mesDe(d.data) === mes), pend = docs.filter((d) => d.situacao === 'sem-nota');
    const vendasMes = doMes.filter((d) => ehVenda(d.tipo)), vendasMesSem = vendasMes.filter((d) => d.situacao === 'sem-nota');
    const f = garantir(est);
    return {
      total: docs.length, pendentes: pend.length, valorPendente: r2(pend.reduce((s, d) => s + (+d.valor || 0), 0)),
      vendasMes: vendasMes.length, vendasMesSemNota: vendasMesSem.length, valorVendasMesSemNota: r2(vendasMesSem.reduce((s, d) => s + (+d.valor || 0), 0)),
      comprasSemNota: pend.filter((d) => d.tipo === 'compra-usado').length,
      osSemNota: pend.filter((d) => d.tipo === 'os').length,
      atrasadas: pend.filter((d) => diasEntre(d.data, hoje) > 5).length,
      notas: f.notas.filter((n) => !n.cancelada).length, notasSemVinculo: f.notas.filter((n) => !n.cancelada && !(n.vinculos || []).length).length,
      homologacao: f.notas.filter((n) => !n.cancelada && n.tpAmb === 2).length,
      perfilOk: perfilCompleto(f.perfil)
    };
  }

  // ---------- leitura do XML (NF-e autorizada, evento de cancelamento) ----------
  // Leitura simples por etiqueta (o XML da NF-e tem leiaute fixo). Não valida assinatura digital: confere a chave (DV),
  // o protocolo de autorização (cStat 100/150) e o ambiente (tpAmb 1 produção, 2 homologação: sem valor fiscal).
  const TAM_MAX_XML = 1024 * 1024;
  const desesc = (s) => String(s).replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
  const sem = (x) => String(x || '').replace(/<(\/?)[A-Za-z0-9_]+:/g, '<$1'); // tira prefixo de namespace (nfe:infNFe)
  function bloco(xml, tag) { const m = xml.match(new RegExp('<' + tag + '(?:\\s[^>]*)?>([\\s\\S]*?)</' + tag + '>')); return m ? m[1] : ''; }
  function blocos(xml, tag) { const r = [], re = new RegExp('<' + tag + '(?:\\s[^>]*)?>([\\s\\S]*?)</' + tag + '>', 'g'); let m; while ((m = re.exec(xml))) r.push(m[1]); return r; }
  const campo = (xml, tag) => { const m = String(xml || '').match(new RegExp('<' + tag + '(?:\\s[^>]*)?>([^<]*)</' + tag + '>')); return m ? desesc(m[1]).trim() : ''; };
  function lerXML(texto) {
    const bruto = String(texto || '');
    if (!bruto.trim()) return { erro: 'Arquivo vazio.' };
    if (bruto.length > TAM_MAX_XML) return { erro: 'Arquivo acima de 1 MB: não parece um XML de nota.' };
    if (/<!DOCTYPE|<!ENTITY/i.test(bruto)) return { erro: 'XML com DOCTYPE/ENTITY não é aceito.' };
    const x = sem(bruto);
    // evento (cancelamento, carta de correção)
    if (/<procEventoNFe|<evento[\s>]/.test(x) && !/<infNFe[\s>]/.test(x)) {
      const inf = bloco(x, 'infEvento'), ret = bloco(x, 'retEvento'), infRet = ret ? bloco(ret, 'infEvento') : '';
      const tp = campo(inf, 'tpEvento'), ch = so(campo(inf, 'chNFe')), cStat = campo(infRet, 'cStat');
      return { tipo: tp === '110111' ? 'cancelamento' : tp === '110110' ? 'correcao' : 'evento', tpEvento: tp, chave: ch, cStat, xMotivo: campo(infRet, 'xMotivo'), protocolo: campo(infRet, 'nProt'), data: campo(inf, 'dhEvento').slice(0, 10), justificativa: campo(inf, 'xJust') || campo(inf, 'xCorrecao'), registrado: ['135', '136', '155'].includes(cStat), tpAmb: +campo(inf, 'tpAmb') || 0 };
    }
    const inf = bloco(x, 'infNFe');
    if (!inf) return { erro: 'Não é XML de NF-e (falta o grupo infNFe). Nota de serviço da prefeitura: use "Informar número".' };
    const idAttr = (x.match(/<infNFe[^>]*\sId="NFe(\d{44})"/) || [])[1] || '';
    const ide = bloco(inf, 'ide'), emit = bloco(inf, 'emit'), dest = bloco(inf, 'dest'), tot = bloco(bloco(inf, 'total'), 'ICMSTot');
    const prot = bloco(x, 'protNFe'), infProt = prot ? bloco(prot, 'infProt') : '';
    const chave = so(campo(infProt, 'chNFe')) || idAttr;
    const pessoa = (b) => ({ cnpj: so(campo(b, 'CNPJ')), cpf: so(campo(b, 'CPF')), nome: campo(b, 'xNome'), ie: campo(b, 'IE'), uf: campo(bloco(b, 'enderEmit') || bloco(b, 'enderDest'), 'UF'), municipio: campo(bloco(b, 'enderEmit') || bloco(b, 'enderDest'), 'xMun') });
    const itens = blocos(inf, 'det').map((d) => { const p = bloco(d, 'prod'); return { codigo: campo(p, 'cProd'), desc: campo(p, 'xProd'), ncm: campo(p, 'NCM'), cfop: campo(p, 'CFOP'), qtd: +campo(p, 'qCom') || 0, valor: +campo(p, 'vProd') || 0, chassi: campo(bloco(d, 'veicProd'), 'chassi'), infAd: campo(d, 'infAdProd') }; });
    const cStat = campo(infProt, 'cStat');
    return {
      tipo: 'nfe', chave, chaveOk: chaveValida(chave), modelo: campo(ide, 'mod'), serie: campo(ide, 'serie'), numero: campo(ide, 'nNF'), emissao: (campo(ide, 'dhEmi') || campo(ide, 'dEmi')).slice(0, 10),
      tpNF: +campo(ide, 'tpNF'), tpAmb: +campo(ide, 'tpAmb') || +campo(infProt, 'tpAmb') || 0, natOp: campo(ide, 'natOp'),
      emit: pessoa(emit), dest: pessoa(dest), valor: +campo(tot, 'vNF') || r2(itens.reduce((s, i) => s + i.valor, 0)), itens, infCpl: campo(bloco(inf, 'infAdic'), 'infCpl'),
      autorizada: !!prot && ['100', '150'].includes(cStat), cStat, xMotivo: campo(infProt, 'xMotivo'), protocolo: campo(infProt, 'nProt'), temProtocolo: !!prot
    };
  }
  // avisos sobre a nota lida (nada impede guardar, exceto erro): [{ nivel: 'erro'|'alerta'|'info', msg }]
  function conferirNota(n, perfil) {
    const a = [], p = perfil || {}, cnpj = so(p.cnpj);
    if (!n || n.erro) return [{ nivel: 'erro', msg: (n && n.erro) || 'XML ilegível.' }];
    if (n.tipo !== 'nfe') return a;
    if (!n.chave) a.push({ nivel: 'erro', msg: 'Sem chave de acesso.' });
    else if (!n.chaveOk) a.push({ nivel: 'erro', msg: 'Chave de acesso com dígito verificador errado.' });
    if (!n.temProtocolo) a.push({ nivel: 'erro', msg: 'XML sem protocolo de autorização da SEFAZ: guarde o XML "procNFe" (o que o emissor entrega depois de autorizar).' });
    else if (!n.autorizada) a.push({ nivel: 'erro', msg: `A SEFAZ não autorizou esta nota (${n.cStat || '?'} ${n.xMotivo || ''}).`.trim() });
    if (n.tpAmb === 2) a.push({ nivel: 'alerta', msg: 'Nota de HOMOLOGAÇÃO (teste): não tem valor fiscal.' });
    if (cnpj && n.emit.cnpj !== cnpj && n.dest.cnpj !== cnpj) a.push({ nivel: 'alerta', msg: 'O CNPJ da revenda não aparece como emitente nem como destinatário.' });
    if (!['55', '65'].includes(n.modelo)) a.push({ nivel: 'alerta', msg: 'Modelo ' + (n.modelo || '?') + ': o esperado é 55 (NF-e) ou 65 (NFC-e).' });
    return a;
  }
  const podeGuardar = (avisos) => !avisos.some((x) => x.nivel === 'erro');

  // ---------- vínculo nota × operação ----------
  // pontua cada documento da lista para a nota lida; devolve os candidatos do melhor para o pior (pontos ≥ 30)
  function sugerirVinculos(n, docs, perfil) {
    if (!n || n.tipo !== 'nfe') return [];
    const cnpj = so((perfil || {}).cnpj), saidaDaRevenda = n.emit.cnpj === cnpj || (!cnpj && n.tpNF === 1);
    const entradaNaRevenda = (n.emit.cnpj === cnpj && n.tpNF === 0) || (cnpj && n.dest.cnpj === cnpj);
    const texto = normal([n.infCpl, n.natOp].concat(n.itens.map((i) => [i.desc, i.chassi, i.infAd].join(' '))).join(' '));
    return docs.map((d) => {
      let p = 0; const motivos = [];
      if (d.chassi && texto.includes(normal(d.chassi))) { p += 50; motivos.push('chassi'); }
      if (d.os && texto.includes(normal(d.os))) { p += 40; motivos.push('OS'); }
      if (d.valor != null && Math.abs(d.valor - n.valor) < 0.01) { p += 30; motivos.push('valor igual'); } else if (d.valor && Math.abs(d.valor - n.valor) / d.valor <= 0.01) { p += 15; motivos.push('valor próximo'); }
      const dd = Math.abs(diasEntre(d.data, n.emissao || d.data));
      if (dd <= 3) { p += 15; motivos.push('mesma data'); } else if (dd <= 15) { p += 8; motivos.push('data próxima'); } else if (dd > 60) p -= 20;
      const doc = so(d.documento || '');
      if (doc && (doc === n.dest.cnpj || doc === n.dest.cpf || doc === n.emit.cpf || doc === n.emit.cnpj)) { p += 25; motivos.push('CPF/CNPJ'); }
      if (d.pessoa && n.dest.nome && normal(n.dest.nome).includes(normal(d.pessoa).split(' ')[0]) && normal(d.pessoa).length > 3) { p += 8; motivos.push('nome'); }
      if (TIPOS[d.tipo]) { const s = TIPOS[d.tipo].saida; if ((s && saidaDaRevenda && n.tpNF === 1) || (!s && entradaNaRevenda)) p += 10; else p -= 25; }
      if (d.modelo && texto.includes(normal(d.modelo))) { p += 10; motivos.push('modelo'); }
      return { doc: d, pontos: p, motivos };
    }).filter((x) => x.pontos >= 30).sort((a, b) => b.pontos - a.pontos);
  }
  // vínculo automático só quando é certeiro: 1º com 60+ pontos e 25+ à frente do 2º
  function vinculoCerteiro(cands) {
    if (!cands.length || cands[0].pontos < 60) return null;
    if (cands[1] && cands[0].pontos - cands[1].pontos < 25) return null;
    return cands[0].doc;
  }
  // guarda uma nota lida. dados: resultado de lerXML; xml: texto (guardado se couber); vinculos: [docId]
  const TAM_XML_GUARDADO = 200 * 1024;
  function guardarNota(est, dados, { xml = '', caminho = '', vinculos = [], arquivo = '' } = {}, quem = '', agora = new Date().toISOString()) {
    const f = garantir(est);
    if (!dados || dados.erro) throw new Error((dados && dados.erro) || 'XML ilegível.');
    if (dados.tipo === 'cancelamento') {
      const alvo = f.notas.find((n) => n.chave && n.chave === dados.chave);
      if (!alvo) throw new Error('A nota cancelada não está no Anshur: importe primeiro o XML da nota.');
      if (!dados.registrado) throw new Error('O evento de cancelamento não foi registrado pela SEFAZ (' + (dados.cStat || '?') + ').');
      alvo.cancelada = { data: dados.data, protocolo: dados.protocolo, justificativa: dados.justificativa, por: quem, em: agora };
      return alvo;
    }
    if (dados.tipo !== 'nfe') throw new Error('Este tipo de evento ainda não é guardado (só nota e cancelamento).');
    const erros = conferirNota(dados, f.perfil).filter((x) => x.nivel === 'erro'); if (erros.length) throw new Error(erros[0].msg);
    const id = 'NF' + dados.chave;
    if (f.notas.some((n) => n.id === id)) throw new Error(`A nota ${dados.numero} (série ${dados.serie}) já foi importada.`);
    const n = { id, origem: 'xml', chave: dados.chave, modelo: dados.modelo, serie: dados.serie, numero: dados.numero, emissao: dados.emissao, tpNF: dados.tpNF, tpAmb: dados.tpAmb, natOp: dados.natOp,
      emitente: { doc: dados.emit.cnpj || dados.emit.cpf, nome: dados.emit.nome, uf: dados.emit.uf }, destinatario: { doc: dados.dest.cnpj || dados.dest.cpf, nome: dados.dest.nome, uf: dados.dest.uf },
      valor: r2(dados.valor), itens: dados.itens.slice(0, 30).map((i) => ({ desc: i.desc, ncm: i.ncm, cfop: i.cfop, valor: r2(i.valor), chassi: i.chassi })), protocolo: dados.protocolo,
      vinculos: [...new Set(vinculos)], arquivo: String(arquivo || '').slice(0, 120), importadaEm: agora, importadaPor: quem };
    if (caminho) n.caminho = caminho; else if (xml && xml.length <= TAM_XML_GUARDADO) n.xml = xml;
    f.notas.push(n); return n;
  }
  // nota sem XML: a pessoa digita o número (ex.: NFS-e da prefeitura, nota em papel do produtor)
  function informarNota(est, docId, d, quem = '', agora = new Date().toISOString()) {
    const f = garantir(est);
    if (!/^\d{1,15}$/.test(so(d.numero))) throw new Error('Informe o número da nota.');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d.emissao || '')) throw new Error('Informe a data de emissão.');
    const modelo = ['nfe', 'nfse', 'nfce', 'produtor', 'outra'].includes(d.modelo) ? d.modelo : 'nfe';
    const n = { id: novoId('NM'), origem: 'manual', modelo, serie: String(d.serie || '').slice(0, 5), numero: so(d.numero), emissao: d.emissao, valor: d.valor != null && d.valor !== '' ? r2(d.valor) : null, chave: chaveValida(d.chave) ? so(d.chave) : '', obs: String(d.obs || '').slice(0, 300), vinculos: [docId], importadaEm: agora, importadaPor: quem };
    if (d.chave && !n.chave) throw new Error('Chave de acesso inválida (44 dígitos, confira o último).');
    if (n.chave && f.notas.some((x) => x.chave === n.chave)) throw new Error('Esta chave já está no Anshur.');
    f.notas.push(n); return n;
  }
  function vincular(est, notaId, docId) {
    const n = garantir(est).notas.find((x) => x.id === notaId); if (!n) throw new Error('Nota não encontrada.');
    n.vinculos = [...new Set((n.vinculos || []).concat(docId))]; return n;
  }
  function desvincular(est, notaId, docId) {
    const n = garantir(est).notas.find((x) => x.id === notaId); if (!n) throw new Error('Nota não encontrada.');
    n.vinculos = (n.vinculos || []).filter((x) => x !== docId); return n;
  }
  function dispensar(est, docId, motivo, quem = '', agora = new Date().toISOString()) {
    if (!String(motivo || '').trim()) throw new Error('Escreva o motivo (ex.: o produtor emitiu nota em papel).');
    const f = garantir(est), id = 'DEC:' + docId, ja = f.decisoes.find((x) => x.id === id);
    const d = Object.assign(ja || { id }, { doc: docId, tipo: 'dispensada', motivo: String(motivo).trim().slice(0, 300), por: quem, em: agora, desfeita: false });
    if (!ja) f.decisoes.push(d); return d;
  }
  function reabrir(est, docId, quem = '', agora = new Date().toISOString()) {
    const d = garantir(est).decisoes.find((x) => x.id === 'DEC:' + docId); if (d) Object.assign(d, { desfeita: true, reabertoPor: quem, reabertoEm: agora }); return d;
  }

  // ---------- exportação (dados para o emissor atual ou o contador: NÃO é NF-e) ----------
  function sugestaoDoc(est, d) {
    const f = garantir(est), nat = natureza(est, NAT_DO_TIPO[d.tipo]);
    const ncm = d.tipoMaquina ? (sugerirNCM({ tipo: d.tipoMaquina, modelo: d.modelo }, f.ncms)[0] || null) : null;
    return { natureza: nat, cfop: nat ? cfopPara(nat, '', f.perfil.uf) : '', ncm };
  }
  function descricaoItem(d) {
    if (d.tipo === 'os') return `Serviço de manutenção e reparo${d.os ? ' · ' + d.os : ''}${d.maquinaNome ? ' · ' + d.maquinaNome : ''}`;
    if (d.tipo === 'venda-pecas') return d.descricao || 'Peças';
    return [d.maquinaNome, d.chassi && 'chassi ' + d.chassi, d.ano && 'ano ' + d.ano, d.horas && d.horas + ' h'].filter(Boolean).join(' · ');
  }
  const CAB_CSV = ['Operação', 'Documento fiscal', 'Data', 'Valor', 'Cliente / produtor', 'Descrição do item', 'Chassi', 'Ano', 'Horímetro', 'NCM sugerido', 'Natureza sugerida', 'CFOP sugerido', 'Loja', 'Situação', 'Referência Anshur', 'Aviso'];
  function linhasCSV(est, docs) {
    return [CAB_CSV].concat(docs.map((d) => { const s = sugestaoDoc(est, d); return [TIPOS[d.tipo].nome, TIPOS[d.tipo].doc, dataBR(d.data), d.valor == null ? '' : String(d.valor).replace('.', ','), d.pessoa, descricaoItem(d), d.chassi || '', d.ano || '', d.horas || '', s.ncm ? fmtNCM(s.ncm.ncm) : '', s.natureza ? s.natureza.nome : '', s.cfop ? fmtCFOP(s.cfop) : '', d.loja, NOMES_SIT[d.situacao], d.id, 'Sugestão: confira NCM, CFOP e tributação com o contador']; }));
  }
  const xe = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  // XML de DADOS (formato próprio do Anshur, para o contador ou para importar num emissor que aceite). NÃO é NF-e e não tem valor fiscal.
  function xmlDados(est, docs, agora = new Date().toISOString()) {
    const p = garantir(est).perfil;
    const linhas = docs.map((d) => { const s = sugestaoDoc(est, d); return `  <operacao ref="${xe(d.id)}" tipo="${xe(d.tipo)}" documentoFiscal="${xe(TIPOS[d.tipo].doc)}">
    <data>${xe(d.data)}</data><valor>${d.valor == null ? '' : d.valor.toFixed(2)}</valor>
    <pessoa>${xe(d.pessoa)}</pessoa><item>${xe(descricaoItem(d))}</item>${d.chassi ? `<chassi>${xe(d.chassi)}</chassi>` : ''}${d.ano ? `<ano>${xe(d.ano)}</ano>` : ''}${d.horas ? `<horimetro>${xe(d.horas)}</horimetro>` : ''}
    <sugestao conferirComContador="sim">${s.ncm ? `<ncm>${xe(s.ncm.ncm)}</ncm>` : ''}${s.natureza ? `<natureza>${xe(s.natureza.nome)}</natureza>` : ''}${s.cfop ? `<cfop>${xe(s.cfop)}</cfop>` : ''}</sugestao>
    <loja>${xe(d.loja)}</loja><situacao>${xe(d.situacao)}</situacao>
  </operacao>`; });
    return `<?xml version="1.0" encoding="UTF-8"?>
<!-- DADOS PARA O EMISSOR OU O CONTADOR. Este arquivo NÃO é NF-e, não é assinado e não tem valor fiscal. -->
<anshurDadosFiscais versao="1" geradoEm="${xe(agora)}">
  <revenda cnpj="${xe(p.cnpj)}" ie="${xe(p.ie)}" regime="${xe(p.regime)}" crt="${xe(CRT[p.regime] || '')}" cnae="${xe(p.cnae)}" municipio="${xe(p.municipio)}" uf="${xe(p.uf)}" ibge="${xe(p.ibge)}" serieNFe="${xe(p.serieNFe)}">${xe(p.razao)}</revenda>
${linhas.join('\n')}
</anshurDadosFiscais>
`;
  }

  // ---------- exemplo para a demonstração (sem valor fiscal, ambiente de homologação) ----------
  function chaveExemplo({ uf = '35', data, cnpj, modelo = '55', serie = 1, numero = 1, codigo = '12345678' }) {
    const d = String(data || hojeISO()), base = String(uf).padStart(2, '0') + d.slice(2, 4) + d.slice(5, 7) + so(cnpj).padStart(14, '0') + modelo + String(serie).padStart(3, '0') + String(numero).padStart(9, '0') + '1' + String(codigo).padStart(8, '0').slice(-8);
    return base + dvChave(base);
  }
  function xmlExemplo(est, d, numero) {
    const p = garantir(est).perfil, saida = TIPOS[d.tipo] ? TIPOS[d.tipo].saida : true, s = sugestaoDoc(est, d);
    const ch = chaveExemplo({ data: d.data, cnpj: p.cnpj, serie: +p.serieNFe || 1, numero, codigo: String(numero * 7919).slice(-8) });
    const outro = `<CPF>00000000191</CPF><xNome>NF-E EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL</xNome><enderDest><xMun>${xe(p.municipio)}</xMun><UF>${xe(p.uf)}</UF></enderDest>`;
    return `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00"><NFe><infNFe Id="NFe${ch}" versao="4.00">
<ide><cUF>35</cUF><natOp>${xe(s.natureza ? s.natureza.nome : 'Venda')}</natOp><mod>55</mod><serie>${+p.serieNFe || 1}</serie><nNF>${numero}</nNF><dhEmi>${d.data}T10:00:00-03:00</dhEmi><tpNF>${saida ? 1 : 0}</tpNF><tpAmb>2</tpAmb></ide>
<emit><CNPJ>${xe(p.cnpj)}</CNPJ><xNome>${xe(p.razao)}</xNome><enderEmit><xMun>${xe(p.municipio)}</xMun><UF>${xe(p.uf)}</UF></enderEmit><IE>${xe(p.ie)}</IE><CRT>${CRT[p.regime] || 3}</CRT></emit>
<dest>${outro}</dest>
<det nItem="1"><prod><cProd>1</cProd><xProd>${xe(descricaoItem(d))}</xProd><NCM>${s.ncm ? s.ncm.ncm : '00000000'}</NCM><CFOP>${s.cfop || (saida ? '5102' : '1102')}</CFOP><qCom>1</qCom><vProd>${(d.valor || 0).toFixed(2)}</vProd></prod></det>
<total><ICMSTot><vNF>${(d.valor || 0).toFixed(2)}</vNF></ICMSTot></total>
<infAdic><infCpl>EXEMPLO DA DEMONSTRACAO DO ANSHUR - SEM VALOR FISCAL. Ref. ${xe(d.id)}</infCpl></infAdic>
</infNFe></NFe><protNFe versao="4.00"><infProt><tpAmb>2</tpAmb><chNFe>${ch}</chNFe><dhRecbto>${d.data}T10:00:05-03:00</dhRecbto><nProt>135${String(numero).padStart(12, '0')}</nProt><cStat>100</cStat><xMotivo>Autorizado o uso da NF-e</xMotivo></infProt></protNFe></nfeProc>
`;
  }

  const podeEditar = (perfil) => ['dono', 'financeiro'].includes(perfil);
  const podeVer = (perfil) => ['dono', 'financeiro', 'gerente', 'auditor'].includes(perfil);

  const FISCAL = { r2, so, hojeISO, mesDe, diasEntre, dataBR, brl, novoId, cnpjValido, cpfValido, fmtCNPJ, fmtCPF, fmtDoc, dvChave, chaveValida, partesChave,
    REGIMES, CRT, UFS, CNAES_SUGERIDOS, fmtCNAE, PERFIL_VAZIO, validarPerfil, perfilCompleto, NCM_SUGERIDOS, fmtNCM, ncmValido, cvParaKw, cvDoModelo, sugerirNCM,
    NATUREZAS_PADRAO, naturezas, natureza, cfopValido, fmtCFOP, cfopPara, NAT_DO_TIPO, validarNatureza, garantir, salvarPerfil, salvarNatureza, salvarNCM,
    TIPOS, ehVenda, documentos, situacaoDoc, NOMES_SIT, resumo, lerXML, conferirNota, podeGuardar, sugerirVinculos, vinculoCerteiro, guardarNota, informarNota,
    vincular, desvincular, dispensar, reabrir, sugestaoDoc, descricaoItem, linhasCSV, xmlDados, chaveExemplo, xmlExemplo, podeEditar, podeVer, numOS };
  raiz.FISCAL = FISCAL;
  if (typeof module !== 'undefined' && module.exports) module.exports = FISCAL;
})(typeof window !== 'undefined' ? window : globalThis);
