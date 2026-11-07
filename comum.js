// Partes usadas pelo app e pela página do passaporte.
(function () {
  const A = window.ANSHUR;
  const CHAVE = 'anshur-demo-v1';
  const ler = () => { try { return JSON.parse(localStorage.getItem(CHAVE)) || { extras: [] }; } catch (e) { return { extras: [] }; } };
  const gravar = (d) => { try { localStorage.setItem(CHAVE, JSON.stringify(d)); return true; } catch (e) { return false; } };
  // trocas criadas na demonstração entram junto com as fictícias
  const salvo = ler();
  (salvo.extras || []).forEach((t) => { if (!A.trocas.some((x) => x.id === t.id)) A.trocas.push(t); });

  const real = (v) => 'R$ ' + Math.round(v).toLocaleString('pt-BR');
  const mil = (v) => {
    if (Math.abs(v) >= 1e6) return 'R$ ' + (v / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 2 }) + ' mi';
    return 'R$ ' + Math.round(v / 1000).toLocaleString('pt-BR') + ' mil';
  };
  const diasDesde = (iso) => Math.max(0, Math.round((Date.now() - new Date(iso + 'T12:00:00').getTime()) / 864e5));
  const data = (iso) => new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR');
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const NOMES = { trator: 'Trator', colhedora: 'Colhedora de cana', pulverizador: 'Pulverizador', plantadeira: 'Plantadeira' };
  const ICONES = {
    trator: '<svg viewBox="0 0 48 48" aria-hidden="true"><g fill="none" stroke="#1d2220" stroke-width="2.2" stroke-linejoin="round"><path d="M14 30V14h12l4 10h8v6"/><path d="M18 14v-4"/><circle cx="16" cy="32" r="8" fill="#a2452a" stroke="#1d2220"/><circle cx="16" cy="32" r="3" fill="#e9ece8"/><circle cx="37" cy="35" r="5"/></g></svg>',
    colhedora: '<svg viewBox="0 0 48 48" aria-hidden="true"><g fill="none" stroke="#1d2220" stroke-width="2.2" stroke-linejoin="round"><path d="M6 30h30V18H22l-3 6H6z"/><path d="M36 22l8-10M40 12h5"/><circle cx="13" cy="34" r="5" fill="#a2452a"/><circle cx="30" cy="34" r="5" fill="#a2452a"/></g></svg>',
    pulverizador: '<svg viewBox="0 0 48 48" aria-hidden="true"><g fill="none" stroke="#1d2220" stroke-width="2.2" stroke-linejoin="round"><path d="M10 30V16h10l3 6h12v8z"/><path d="M4 26h40M8 26v4M16 26v4M32 26v4M40 26v4"/><circle cx="14" cy="34" r="5" fill="#a2452a"/><circle cx="34" cy="34" r="5" fill="#a2452a"/></g></svg>',
    plantadeira: '<svg viewBox="0 0 48 48" aria-hidden="true"><g fill="none" stroke="#1d2220" stroke-width="2.2" stroke-linejoin="round"><path d="M4 18h40M6 18l4-6h28l4 6"/><path d="M10 18v10M20 18v10M30 18v10M40 18v10"/><circle cx="10" cy="31" r="3" fill="#a2452a"/><circle cx="20" cy="31" r="3" fill="#a2452a"/><circle cx="30" cy="31" r="3" fill="#a2452a"/><circle cx="40" cy="31" r="3" fill="#a2452a"/></g></svg>'
  };
  const FICHA = [['motor', 'Motor'], ['transmissao', 'Transmissão'], ['hidraulico', 'Hidráulico'], ['pneus', 'Pneus / rodado'], ['cabine', 'Cabine e eletrônica'], ['lataria', 'Lataria e pintura']];

  window.COMUM = { ler, gravar, real, mil, diasDesde, data, esc, NOMES, ICONES, FICHA };
})();
