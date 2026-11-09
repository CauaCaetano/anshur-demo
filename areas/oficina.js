// Área Oficina: AINDA NÃO CONSTRUÍDA. Ponto de registro reservado para o agente que for construir esta área.
// Para construir: troque pronta:false por true e acrescente menu, telas, permissoes, numero, buscar e dados
// seguindo areas/financeiro.js e o README (seção "Áreas (módulos)"). Use os cadastros comuns de comum.js (K.cad).
(function (raiz) {
  const R = raiz.ANSHUR_AREAS; if (!R) return;
  R.registrar({
    id: 'oficina', nome: 'Oficina', curto: 'Oficina', ordem: 40, pronta: false, perfis: ['dono', 'gerente', 'oficina', 'financeiro', 'auditor'],
    descricao: 'Ordens de serviço, orçamento, mecânicos, horas, garantia e entrega.',
    icone: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z"/>',
    previsto: ['OS com diagnóstico, orçamento e aprovação do cliente', 'Mecânicos, horas, serviços e checklist', 'Peças consumidas do estoque real', 'Garantia e entrega; custo e faturamento no Financeiro'],
    hoje: 'Hoje já existe: preparo dos usados (Pátio) e Garantias a receber.'
  });
})(typeof window !== 'undefined' ? window : globalThis);
