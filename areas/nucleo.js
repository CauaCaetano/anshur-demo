// Áreas que usam as telas que já existiam no app.js: Usados e Trocas, Relatórios e Configurações.
// Aqui só ficam o menu, o número vivo da entrada e quem vê cada área (as telas continuam no app.js, em TELAS).
(function (raiz) {
  const R = raiz.ANSHUR_AREAS; if (!R) return;
  const I = (aba, rotulo, curto, icone) => ({ aba, rotulo, curto, icone });
  const ICO = {
    hoje: '<path d="M4 6h16v14H4zM4 10h16M8 3v4M16 3v4M8 14l2.5 2.5L16 13"/>', visao: '<path d="M4 13h6V4H4zM14 20h6V11h-6zM14 4v4h6V4zM4 20h6v-4H4z"/>',
    relatorio: '<path d="M6 3h9l4 4v14H6zM14 3v5h5M9 13h7M9 17h5"/>', atividades: '<path d="M12 7v5l3 2M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z"/>',
    historico: '<path d="M3 12a9 9 0 1 0 3-6.7M3 4v4h4M12 8v4l3 2"/>', rotina: '<path d="M9 6h11M9 12h11M9 18h11M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2"/>',
    avaliar: '<path d="M4 19h16M6 15l4-4 3 3 5-6"/>', aprovacoes: '<path d="M9 12l2 2 4-4M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7z"/>',
    compradores: '<path d="M16 11a4 4 0 1 0-8 0 4 4 0 0 0 8 0zM3 21a9 9 0 0 1 18 0M19 4l2 2-2 2"/>', vendedores: '<path d="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21v-1a6 6 0 0 1 12 0v1M17 11a3 3 0 1 0 0-6M22 21v-1a5 5 0 0 0-4-4.9"/>',
    teste: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"/>', memoria: '<path d="M12 3c-4.4 0-8 1.3-8 3v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6c0-1.7-3.6-3-8-3zM4 12c0 1.7 3.6 3 8 3s8-1.3 8-3M4 6c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
    patio: '<path d="M3 20V9l9-5 9 5v11M7 20v-6h10v6"/>', passaportes: '<path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 18h2v2h-2zM14 18h2M18 14h2"/>',
    mercado: '<path d="M3 17l5-5 4 3 8-8M16 7h4v4"/>', trocas: '<path d="M4 7h13l-3-3M20 17H7l3 3"/>',
    garantias: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6zM8.5 12l2.5 2.5 4.5-5"/>', financiamento: '<path d="M3 10l9-6 9 6M5 10v9M19 10v9M9 10v9M15 10v9M3 21h18"/>',
    documentos: '<path d="M4 7h6l2 2h8v10H4zM12 12v5M9.5 14.5 12 12l2.5 2.5"/>', usuarios: '<path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21v-1a8 8 0 0 1 16 0v1"/>',
    perfil: '<path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM5 21a7 7 0 0 1 14 0"/><path d="M19 4h3M20.5 2.5v3"/>',
    config: '<path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM4 12h2M18 12h2M12 4v2M12 18v2M6.3 6.3l1.4 1.4M16.3 16.3l1.4 1.4M6.3 17.7l1.4-1.4M16.3 7.7l1.4-1.4"/>',
    cadastros: '<path d="M4 5h16v14H4zM8 9h8M8 13h5"/>'
  };
  const it = (aba, rotulo, curto) => I(aba, rotulo, curto, ICO[aba]);

  R.registrar({
    id: 'usados', nome: 'Usados e Trocas', curto: 'Usados', ordem: 10, inicio: 'visao',
    descricao: 'Avaliação com IA, pátio, aprovações, passaportes, compradores e teste às cegas.',
    icone: '<path d="M4 7h13l-3-3M20 17H7l3 3"/>',
    acao: { rotulo: 'Nova avaliação', href: '#avaliar' }, atalhos: ['visao', 'avaliar', 'patio', 'aprovacoes'],
    menu: [
      { grupo: 'Painel', itens: [it('visao', 'Painel dos usados', 'Painel')] },
      { grupo: 'Comercial', itens: [it('avaliar', 'Avaliar troca', 'Avaliar'), it('aprovacoes', 'Aprovações', 'Aprovações'), it('compradores', 'Compradores', 'Compradores'), it('vendedores', 'Vendedores', 'Vendedores'), it('teste', 'Teste às cegas', 'Teste'), it('memoria', 'Memória comercial', 'Memória')] },
      { grupo: 'Estoque', itens: [it('patio', 'Pátio', 'Pátio'), it('passaportes', 'Passaportes', 'Passaportes'), it('mercado', 'Monitor de mercado', 'Mercado')] },
      { grupo: 'Resultado', itens: [it('trocas', 'Inteligência de trocas', 'Trocas'), it('garantias', 'Garantias a receber', 'Garantias'), it('financiamento', 'Estoque financiado', 'Financiado')] }
    ],
    numero: (ui) => { const p = ui.C.patio(); const v = p.filter((t) => ui.diasDesde(t.entrada) > 90).length; return { valor: String(p.length), texto: `máquinas no pátio · ${ui.mil(ui.C.capitalImobilizado())} parados${v ? ` · ${v} há mais de 90 dias` : ''}`, alerta: v > 0 }; }
  });

  R.registrar({
    id: 'relatorios', nome: 'Relatórios', curto: 'Relatórios', ordem: 80, inicio: 'relatorio',
    descricao: 'Relatórios do período, margem por marca, histórico vivo e trilha de atividades.',
    icone: ICO.relatorio,
    menu: [{ grupo: 'Relatórios', itens: [it('relatorio', 'Relatórios e margem', 'Relatórios'), it('historico', 'Histórico vivo', 'Histórico'), it('memoria', 'Memória comercial', 'Memória'), it('atividades', 'Atividades', 'Atividades')] },
      { grupo: 'Financeiro', itens: [I('fin-dre', 'DRE gerencial', 'DRE', ICO.relatorio), I('fin-fluxo', 'Fluxo de caixa', 'Fluxo', '<path d="M3 17l6-6 4 4 8-8M15 7h6v6"/>')] }],
    numero: (ui) => { const v = ui.C.vendidas().filter((t) => t.saida && ui.diasDesde(t.saida) <= 30); return { valor: String(v.length), texto: `usados vendidos em 30 dias · ${ui.mil(v.reduce((s, t) => s + t.vendido, 0))} em vendas` }; }
  });

  R.registrar({
    id: 'config', nome: 'Configurações', curto: 'Ajustes', ordem: 90, inicio: 'config', perfis: ['dono', 'gerente', 'vendedor', 'oficina', 'financeiro', 'auditor'],
    descricao: 'Dados da revenda, lojas, equipe e perfis, cadastros, documentos, IA, avisos e instalação.',
    icone: ICO.config,
    menu: [{ grupo: 'Sistema', itens: [it('config', 'Configurações', 'Ajustes'), it('usuarios', 'Usuários', 'Usuários'), it('cadastros', 'Clientes e fornecedores', 'Cadastros'), it('documentos', 'Documentos', 'Documentos'), it('perfil', 'Meu perfil', 'Perfil')] }],
    numero: (ui) => ({ valor: String(ui.estado.usuarios.length), texto: `pessoas na equipe · ${ui.estado.lojas.length || 1} ${ui.estado.lojas.length === 1 ? 'loja' : 'lojas'}` })
  });
})(typeof window !== 'undefined' ? window : globalThis);
