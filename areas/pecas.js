// Área Peças e Estoque: AINDA NÃO CONSTRUÍDA. Ponto de registro reservado para o agente que for construir esta área.
// Para construir: troque pronta:false por true e acrescente menu, telas, permissoes, numero, buscar e dados
// seguindo areas/financeiro.js e o README (seção "Áreas (módulos)"). Use os cadastros comuns de comum.js (K.cad).
(function (raiz) {
  const R = raiz.ANSHUR_AREAS; if (!R) return;
  R.registrar({
    id: 'pecas', nome: 'Peças e Estoque', curto: 'Peças', ordem: 50, pronta: false, perfis: ['dono', 'gerente', 'oficina', 'financeiro', 'auditor'],
    descricao: 'Catálogo, SKU, localização, entradas, saídas, inventário e compras.',
    icone: '<path d="M21 8l-9-5-9 5v8l9 5 9-5zM3 8l9 5 9-5M12 13v8"/>',
    previsto: ['Catálogo de peças com SKU e localização', 'Entradas, saídas, transferências entre lojas e inventário', 'Fornecedores, compras e estoque mínimo', 'Custos e compras no Financeiro'],
    hoje: 'Hoje: compras de peças podem ser lançadas como contas a pagar no Financeiro.'
  });
})(typeof window !== 'undefined' ? window : globalThis);
