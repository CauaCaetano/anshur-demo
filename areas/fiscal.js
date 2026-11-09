// Área Fiscal: AINDA NÃO CONSTRUÍDA. Ponto de registro reservado para o agente que for construir esta área.
// Para construir: troque pronta:false por true e acrescente menu, telas, permissoes, numero, buscar e dados
// seguindo areas/financeiro.js e o README (seção "Áreas (módulos)"). Use os cadastros comuns de comum.js (K.cad).
(function (raiz) {
  const R = raiz.ANSHUR_AREAS; if (!R) return;
  R.registrar({
    id: 'fiscal', nome: 'Fiscal', curto: 'Fiscal', ordem: 70, pronta: false, perfis: ['dono', 'financeiro', 'auditor'],
    descricao: 'Notas fiscais. Só será liberado com emissão homologada na SEFAZ.',
    icone: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6M9 16h3"/>',
    previsto: ['Emissão de NF-e com certificado A1, só depois de homologada na SEFAZ', 'Cancelamento, contingência e XML', 'Enquanto isso, as notas continuam no sistema fiscal atual'],
    hoje: 'Hoje o Anshur não emite nota fiscal.'
  });
})(typeof window !== 'undefined' ? window : globalThis);
