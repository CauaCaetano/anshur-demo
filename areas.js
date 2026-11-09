// Registro central das ÁREAS do Anshur (Usados e Trocas, Financeiro, Oficina...).
// Cada área vive no próprio arquivo em areas/ e chama ANSHUR_AREAS.registrar({...}). O app.js monta, a partir daqui,
// a tela de entrada (escolha de área), o menu lateral de cada área, as permissões das telas novas e a busca global.
// Padrão completo para quem for criar uma área: README.md › "Áreas (módulos)".
(function (raiz) {
  const lista = [];
  const grupos = {}; // dados guardados no estado da revenda, por grupo: { fin: ['lancamentos', ...] } (vira operação por id na fila offline)

  // def: {
  //   id, nome, curto, descricao, icone (miolo de um <svg viewBox="0 0 24 24">), ordem,
  //   pronta (false = "Em breve": aparece honesto na entrada, sem tela), previsto: ['o que vai ter', ...], hoje: 'o que já existe',
  //   perfis: ['dono', ...]            perfis que veem a área na entrada (padrão: quem pode abrir alguma tela dela),
  //   inicio: 'aba'                    primeira tela ao entrar na área,
  //   acao: { rotulo, href }           botão principal do cabeçalho enquanto a área está aberta,
  //   menu: [{ grupo, itens: [{ aba, rotulo, curto, icone }] }],
  //   telas: { aba: (ui) => {} }        telas novas (desenham em ui.tela); abas antigas do app.js não precisam estar aqui,
  //   permissoes: { aba: ['dono', ...] } quem abre cada tela nova,
  //   numero: (ui) => ({ valor, texto, alerta })  número vivo do cartão da entrada,
  //   buscar: (q, ui) => [{ g, n, d, ir }]        resultados na busca global (Ctrl+K),
  //   dados: { grupo: ['lista', ...] }  listas com id dentro de estado[grupo] (fila offline idempotente),
  //   iniciar: (ui) => {}               roda uma vez quando o app abre (ex.: semear a demonstração),
  //   hoje: (estado, usuario, ui) => [{ id, cat, catNome, nivel (1 urgente · 2 hoje · 3 rotina), valor, titulo, txt, botao: { rotulo, ir: '#/area/aba' } }]
  //                                     tarefas e alertas da área que entram na tela "Tarefas do dia" e nos avisos do portal (filtrar pelo perfil do usuario),
  //   rotina: (estado, usuario, ui) => [{ perfil, periodo: 'dia' | 'semana', id, titulo, qtd (0 = em dia; null = sem contagem), ir }]
  //                                     o que cada perfil faz todo dia/semana nesta área (entra na "Rotina da equipe"),
  //   jaExiste: 'texto'                 (só para área "Em breve": o que já existe hoje no Anshur) }
  function registrar(def) {
    if (!def || !def.id) throw new Error('Área sem id');
    const i = lista.findIndex((a) => a.id === def.id);
    const base = i >= 0 ? lista[i] : { ordem: 50, pronta: true, menu: [], telas: {}, permissoes: {}, previsto: [] };
    const a = Object.assign({}, base, def, { telas: Object.assign({}, base.telas, def.telas), permissoes: Object.assign({}, base.permissoes, def.permissoes) });
    if (i >= 0) lista[i] = a; else lista.push(a);
    Object.entries(def.dados || {}).forEach(([g, ls]) => { grupos[g] = [...new Set((grupos[g] || []).concat(ls))]; });
    return a;
  }
  const ordenadas = () => lista.slice().sort((a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome));
  const area = (id) => lista.find((a) => a.id === id) || null;
  const itens = (a) => (a ? a.menu.flatMap((g) => g.itens.map((x) => Object.assign({ grupo: g.grupo }, x))) : []);
  const abas = (id) => itens(area(id)).map((x) => x.aba);
  // a tela pode estar em mais de uma área (ex.: Estoque financiado em Usados e no Financeiro): fica na área atual se puder
  function areaDaAba(aba, atual) {
    if (atual && abas(atual).includes(aba)) return atual;
    const a = ordenadas().find((x) => x.pronta && abas(x.id).includes(aba));
    return a ? a.id : null;
  }
  function tela(aba) { for (const a of lista) if (a.telas[aba]) return a.telas[aba]; return null; }
  function permissao(aba) { for (const a of lista) if (a.permissoes[aba]) return a.permissoes[aba]; return null; }
  function item(aba) { for (const a of ordenadas()) { const x = itens(a).find((y) => y.aba === aba); if (x) return Object.assign({ area: a.id }, x); } return null; }

  // junta as tarefas do dia e a rotina de todas as áreas prontas (uma área com erro não derruba as outras)
  const juntar = (campo) => (estado, usuario, ui, filtro) => ordenadas().filter((a) => a.pronta && typeof a[campo] === 'function' && (!filtro || filtro(a))).flatMap((a) => {
    try { return (a[campo](estado, usuario, ui) || []).map((x) => Object.assign({ area: a.id, areaNome: a.nome }, x)); } catch (e) { if (typeof console !== 'undefined') console.error('Área ' + a.id + ' (' + campo + ')', e); return []; }
  });
  raiz.ANSHUR_AREAS = { registrar, lista: ordenadas, area, itens, abas, areaDaAba, tela, permissao, item, gruposDados: () => grupos, tarefas: juntar('hoje'), rotinas: juntar('rotina') };
})(typeof window !== 'undefined' ? window : globalThis);
