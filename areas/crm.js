// Área Vendas e Clientes: AINDA NÃO CONSTRUÍDA. Ponto de registro reservado para o agente que for construir esta área.
// Para construir: troque pronta:false por true e acrescente menu, telas, permissoes, numero, buscar e dados
// seguindo areas/financeiro.js e o README (seção "Áreas (módulos)"). Use os cadastros comuns de comum.js (K.cad).
(function (raiz) {
  const R = raiz.ANSHUR_AREAS; if (!R) return;
  R.registrar({
    id: 'crm', nome: 'Vendas e Clientes', curto: 'CRM', ordem: 60, pronta: false, perfis: ['dono', 'gerente', 'vendedor', 'auditor'],
    descricao: 'Funil, leads, clientes, atividades, tarefas e follow-ups.',
    icone: '<path d="M3 4h18l-7 8v6l-4 2v-8z"/>',
    previsto: ['Funil do primeiro contato ao faturamento', 'Leads, clientes, atividades e tarefas', 'Follow-ups com WhatsApp', 'Ligado aos compradores de usados e às comissões'],
    hoje: 'Hoje já existe: Compradores (Usados) e o cadastro único de clientes.'
  });
})(typeof window !== 'undefined' ? window : globalThis);
