// Área Máquinas Novas: AINDA NÃO CONSTRUÍDA. Ponto de registro reservado para o agente que for construir esta área.
// Para construir: troque pronta:false por true e acrescente menu, telas, permissoes, numero, buscar e dados
// seguindo areas/financeiro.js e o README (seção "Áreas (módulos)"). Use os cadastros comuns de comum.js (K.cad).
(function (raiz) {
  const R = raiz.ANSHUR_AREAS; if (!R) return;
  R.registrar({
    id: 'novas', nome: 'Máquinas Novas', curto: 'Novas', ordem: 20, pronta: false, perfis: ['dono', 'gerente', 'vendedor', 'financeiro', 'auditor'],
    descricao: 'Catálogo, pedidos, reservas, propostas e vendas de máquinas novas.',
    icone: '<path d="M5 17V9h7l2 4h4v4"/><path d="M8 9V6"/><circle cx="8" cy="17" r="3"/><circle cx="18" cy="18" r="2"/><path d="M17 4v4M15 6h4"/>',
    previsto: ['Catálogo com marca, modelo, versão, custo, preço e disponibilidade', 'Pedidos à fábrica e reservas', 'Propostas e negociações até a venda', 'Venda vira conta a receber e comissão no Financeiro'],
    hoje: 'Hoje já existe: Estoque financiado (floor plan das novas) no Financeiro e em Usados.'
  });
})(typeof window !== 'undefined' ? window : globalThis);
