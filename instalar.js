// Instalação do Anshur como aplicativo (PWA). Carrega cedo (antes do login) para não perder o evento beforeinstallprompt.
// Sem simulação: usa o pedido do próprio navegador quando ele oferece; quando não oferece (iPhone, Firefox, Safari no Mac),
// mostra o caminho certo daquele aparelho. Já instalado (aberto como app) = os botões somem.
(function (raiz) {
  let pedido = null;
  const ls = { get: (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* sem armazenamento */ } } };
  const avisar = () => { try { raiz.dispatchEvent(new Event('anshur:instalar')); } catch (e) { /* navegador antigo */ } };
  if (raiz.addEventListener) {
    raiz.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); pedido = e; avisar(); });
    raiz.addEventListener('appinstalled', () => { pedido = null; ls.set('anshur-instalado', new Date().toISOString()); avisar(); });
  }
  // plataforma e navegador a partir do userAgent (puro: testado em testes.js)
  function detectar(ua = (raiz.navigator && raiz.navigator.userAgent) || '', toque = (raiz.navigator && raiz.navigator.maxTouchPoints) || 0) {
    const ios = /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && toque > 1);
    const android = /Android/i.test(ua);
    const celular = ios || android || /Mobile/i.test(ua);
    const navegador = /SamsungBrowser/i.test(ua) ? 'samsung' : /EdgA?\//i.test(ua) ? 'edge' : /FxiOS|Firefox/i.test(ua) ? 'firefox' : /CriOS|Chrome|Chromium/i.test(ua) ? 'chrome' : /Safari/i.test(ua) ? 'safari' : 'outro';
    return { ios, android, celular, navegador, sistema: ios ? 'ios' : android ? 'android' : /Windows/i.test(ua) ? 'windows' : /Mac/i.test(ua) ? 'mac' : 'outro' };
  }
  function instalado() {
    const mm = (q) => { try { return raiz.matchMedia && raiz.matchMedia(q).matches; } catch (e) { return false; } };
    return !!(mm('(display-mode: standalone)') || mm('(display-mode: window-controls-overlay)') || mm('(display-mode: fullscreen)') || (raiz.navigator && raiz.navigator.standalone === true));
  }
  // o que fazer para instalar em cada caso: { modo: 'pedido' | 'passos' | 'outro-aparelho', titulo, passos: [] }
  function instrucoes(alvo, d = detectar(), temPedido = !!pedido) {
    const noCelular = alvo === 'celular';
    if (noCelular && !d.celular) return { modo: 'outro-aparelho', titulo: 'Instalar no celular', passos: ['Aponte a câmera do celular para o QR Code (ou abra o endereço abaixo no celular).', 'No iPhone: abra no Safari, toque em Compartilhar (quadrado com a seta para cima) › Adicionar à Tela de Início › Adicionar.', 'No Android: abra no Chrome e toque em "Instalar" ou no menu ⋮ › Instalar app (ou Adicionar à tela inicial).'] };
    if (!noCelular && d.celular) return { modo: 'outro-aparelho', titulo: 'Instalar no computador', passos: ['No computador, abra este mesmo endereço no Chrome ou no Edge.', 'Clique no ícone de instalar na barra de endereço (monitor com seta) ou no menu ⋮ › Instalar Anshur.', 'O Anshur ganha um ícone na área de trabalho e abre em janela própria.'] };
    if (temPedido) return { modo: 'pedido', titulo: noCelular ? 'Instalar no celular' : 'Instalar no computador', passos: ['O navegador vai perguntar se você quer instalar. Confirme em "Instalar".'] };
    if (d.ios) return { modo: 'passos', titulo: 'Instalar no iPhone ou iPad', passos: d.navegador === 'safari' ? ['Toque em Compartilhar (quadrado com a seta para cima), na barra de baixo ou de cima do Safari.', 'Role e toque em "Adicionar à Tela de Início".', 'Toque em "Adicionar". O Anshur aparece na tela inicial como aplicativo.'] : ['Toque em Compartilhar (quadrado com a seta) e em "Adicionar à Tela de Início".', 'Se a opção não aparecer neste navegador, abra este endereço no Safari e faça o mesmo.'] };
    if (d.android) return { modo: 'passos', titulo: 'Instalar no Android', passos: d.navegador === 'firefox' ? ['Toque no menu ⋮ e em "Instalar" (ou "Adicionar à tela inicial").'] : d.navegador === 'samsung' ? ['Toque no menu ☰ e em "Adicionar página a" › "Tela inicial".'] : ['Toque no menu ⋮ do navegador (canto de cima).', 'Toque em "Instalar app" (ou "Adicionar à tela inicial") e confirme.'] };
    if (d.navegador === 'safari') return { modo: 'passos', titulo: 'Instalar no Mac', passos: ['No Safari, abra o menu Arquivo › "Adicionar ao Dock" (macOS Sonoma ou mais novo).', 'Em versões antigas do Safari não dá: abra no Chrome ou no Edge e clique no ícone de instalar na barra de endereço.'] };
    if (d.navegador === 'firefox') return { modo: 'passos', titulo: 'Instalar no computador', passos: ['O Firefox para computador não instala sites como aplicativo.', 'Abra este endereço no Chrome ou no Edge e clique no ícone de instalar na barra de endereço (ou menu ⋮ › Instalar Anshur).'] };
    return { modo: 'passos', titulo: 'Instalar no computador', passos: d.navegador === 'edge' ? ['Clique no menu … › Aplicativos › "Instalar este site como aplicativo".', 'Ou no ícone de instalar que aparece na barra de endereço.'] : ['Clique no ícone de instalar na barra de endereço (monitor com seta), à direita.', 'Ou no menu ⋮ › "Transmitir, salvar e compartilhar" › "Instalar página como app".', 'Se a opção não aparecer, recarregue a página uma vez e tente de novo.'] };
  }
  async function pedir() {
    if (!pedido) return 'indisponivel';
    const p = pedido; pedido = null; avisar();
    try { await p.prompt(); const r = await p.userChoice; if (r && r.outcome === 'accepted') { ls.set('anshur-instalado', new Date().toISOString()); return 'aceito'; } return 'recusado'; }
    catch (e) { return 'indisponivel'; }
  }
  raiz.ANSHUR_INSTALAR = { detectar, instalado, instrucoes, pedir, temPedido: () => !!pedido, instaladoAntes: () => !!ls.get('anshur-instalado') };
})(typeof window !== 'undefined' ? window : globalThis);
