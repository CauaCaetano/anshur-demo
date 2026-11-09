// Conta e servidor do ambiente real (Supabase). A demonstração não usa nada daqui: segue 100% no navegador.
// Fluxo do ambiente real: entrar → escolher (ou criar) a revenda → carregar o estado do servidor → abrir o app.
// Salva com espera curta e número de versão (concorrência otimista). Sem internet, abre a última cópia só para leitura.
(function (raiz) {
  'use strict';
  // ---------- partes puras (testadas em testes.js) ----------
  const LISTAS = ['avaliacoes', 'documentos', 'atividades', 'pendentes', 'modelosExtra'];
  const MAPAS = ['precos', 'vendas', 'preparos', 'resolvidos', 'config'];
  const chaveTroca = (t) => [t.tipo, t.modelo, t.ano, t.horas, t.pago, t.vendido || '', t.entrada || ''].join('|');
  const idDe = (x) => (x && (x.id || x.modelo)) || JSON.stringify(x);
  // junta os dados deste navegador com os da conta sem duplicar: o servidor vence quando o mesmo item existe nos dois
  function mesclar(servidor, local) {
    const s = JSON.parse(JSON.stringify(servidor || {})), l = JSON.parse(JSON.stringify(local || {}));
    const r = Object.assign({}, l, s);
    // trocas: mesma máquina (conteúdo) não entra de novo; id repetido com conteúdo diferente ganha id novo
    ['historico', 'fechadas'].forEach((k) => {
      const base = (s[k] || []).slice(), vistos = new Set(base.map(chaveTroca)), ids = new Set(base.map((t) => t.id));
      (l[k] || []).forEach((t) => {
        if (vistos.has(chaveTroca(t))) return;
        let novo = t.id;
        if (ids.has(novo)) {
          let i = base.length + 1; do { novo = (k === 'historico' ? 'H' : 'D') + String(i++).padStart(3, '0') + 'L'; } while (ids.has(novo));
          MAPAS.slice(0, 3).forEach((m) => { if (l[m] && l[m][t.id] !== undefined) { l[m][novo] = l[m][t.id]; delete l[m][t.id]; } });
        }
        base.push({ ...t, id: novo }); ids.add(novo); vistos.add(chaveTroca(t));
      });
      if (base.length) r[k] = base;
    });
    LISTAS.forEach((k) => {
      const base = (s[k] || []).slice(), ids = new Set(base.map(idDe));
      (l[k] || []).forEach((x) => { if (!ids.has(idDe(x))) { base.push(x); ids.add(idDe(x)); } });
      if (base.length) r[k] = base;
    });
    MAPAS.forEach((k) => { if (s[k] || l[k]) r[k] = Object.assign({}, l[k] || {}, s[k] || {}); });
    if (s.extras || l.extras) {
      r.extras = Object.assign({}, l.extras || {}, s.extras || {});
      ['garantias', 'financiadas', 'compradores', 'anuncios'].forEach((k) => {
        const base = ((s.extras || {})[k] || []).slice(), ids = new Set(base.map(idDe));
        ((l.extras || {})[k] || []).forEach((x) => { if (!ids.has(idDe(x))) { base.push(x); ids.add(idDe(x)); } });
        r.extras[k] = base;
      });
    }
    if (s.lojas || l.lojas) r.lojas = [...new Set([...(s.lojas || []), ...(l.lojas || [])])];
    return r;
  }
  // os dados locais valem a pena ser enviados?
  const temDados = (d) => !!d && ['historico', 'fechadas', 'avaliacoes', 'documentos'].some((k) => Array.isArray(d[k]) && d[k].length) ||
    !!(d && d.extras && ['garantias', 'financiadas', 'compradores', 'anuncios'].some((k) => (d.extras[k] || []).length));
  // tradução das mensagens do servidor
  function mensagem(erro) {
    const m = String((erro && (erro.message || erro.error_description || erro)) || '');
    const T = [
      [/anshur_conflito/, 'Outra pessoa salvou alterações ao mesmo tempo.'],
      [/anshur_somente_leitura/, 'Seu perfil é só de leitura (auditor).'],
      [/anshur_suspensa/, 'A conta desta revenda está suspensa. Fale com a Blue Rose.'],
      [/anshur_sem_acesso|anshur_sem_permissao/, 'Você não tem permissão para isso.'],
      [/anshur_grande_demais/, 'Os dados ficaram grandes demais para salvar. Fale com o suporte.'],
      [/anshur_limite_revendas/, 'Limite de revendas criadas por esta conta atingido.'],
      [/anshur_limite_convites/, 'Muitos convites em aberto. Cancele alguns antes.'],
      [/anshur_convite_outro_email/, 'Este convite foi feito para outro e-mail. Entre com o e-mail convidado.'],
      [/anshur_convite_invalido/, 'Convite inválido, já usado ou vencido. Peça um novo.'],
      [/anshur_copia_inexistente/, 'Cópia não encontrada.'],
      [/anshur_ultimo_dono/, 'A revenda precisa ter pelo menos um dono.'],
      [/anshur_confirmacao/, 'O nome digitado não confere.'],
      [/anshur_docs_restantes/, 'Ainda há documentos guardados. Tente de novo.'],
      [/Invalid login credentials/i, 'E-mail ou senha incorretos.'],
      [/Email not confirmed/i, 'Confirme o seu e-mail pelo link que enviamos antes de entrar.'],
      [/email_address_invalid|Email address .* is invalid/i, 'Este e-mail não é aceito. Confira o endereço.'],
      [/Error sending|confirmation email/i, 'Não conseguimos enviar o e-mail de confirmação agora. Tente mais tarde.'],
      [/User already registered/i, 'Já existe conta com este e-mail. Use Entrar ou Esqueci a senha.'],
      [/Password should be|weak/i, 'Senha fraca: use pelo menos 8 caracteres, com letras e números.'],
      [/rate limit|too many/i, 'Muitas tentativas. Espere alguns minutos e tente de novo.'],
      [/Failed to fetch|NetworkError|network|Load failed/i, 'Sem conexão com o servidor.']
    ];
    const achou = T.find(([re]) => re.test(m));
    return achou ? achou[1] : 'Não foi possível concluir. Tente de novo.';
  }
  const PURO = { mesclar, temDados, mensagem, chaveTroca };
  raiz.NUVEM_PURO = PURO;
  if (typeof module !== 'undefined' && module.exports) module.exports = PURO;
  if (typeof document === 'undefined') return;

  // ---------- configuração pública (chave publicável: pode ficar no navegador; a proteção é o RLS) ----------
  const CFG = {
    url: 'https://yihnfzwtkqdfnwziutqa.supabase.co',
    chave: 'sb_publishable_nrMgwLCtiojWE-yWMeZK7g_iinpfY_5',
    lib: 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js',
    sri: 'sha384-GFr3yTh5lJznCbZfpTtXnwboFsxqtTQoeTZCRHhE0579KrRmlCzen5AA8ohaB5ug'
  };
  const LIMITE_DOC = 10 * 1024 * 1024;
  const CHAVE_CACHE = 'anshur-cache-v1', CHAVE_REVENDA = 'anshur-revenda', CHAVE_LOCAL = 'anshur-op-v1';
  const ls = {
    get: (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } },
    del: (k) => { try { localStorage.removeItem(k); } catch (e) { /* sem armazenamento */ } }
  };
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const eu = document.currentScript;
  const APP = (eu && eu.dataset.app ? eu.dataset.app.split(/\s+/) : []).filter(Boolean);

  // link de convite (?convite=…) ou de acesso (?entrar) levam direto ao ambiente real
  const q = new URLSearchParams(location.search);
  if (q.has('convite')) { try { sessionStorage.setItem('anshur-convite', q.get('convite')); } catch (e) { /* segue sem */ } }
  if (q.has('convite') || q.has('entrar')) {
    ls.set('anshur-ambiente', 'op');
    history.replaceState(null, '', location.pathname + (location.hash || ''));
  }
  const recuperando = /type=recovery/.test(location.hash);
  const ambiente = ls.get('anshur-ambiente') === 'op' ? 'op' : 'demo';

  function carregarApp() {
    APP.forEach((src) => { const s = document.createElement('script'); s.src = src; s.async = false; document.body.appendChild(s); });
  }
  if (ambiente !== 'op') { carregarApp(); return; }

  // ---------- interface da conta (sobreposição própria, funciona no app e no passaporte) ----------
  const css = document.createElement('style');
  css.textContent = `
  .nv{position:fixed;inset:0;z-index:80;background:#F4F0E8;display:grid;place-items:center;padding:16px;overflow:auto;font-family:Inter,system-ui,sans-serif;color:#111820}
  .nv[hidden]{display:none}
  .nv-caixa{width:100%;max-width:420px;background:#fff;border:1px solid rgba(17,24,32,.1);border-radius:14px;padding:28px 24px;box-shadow:0 30px 60px -40px rgba(17,24,32,.45)}
  .nv-caixa img{display:block;height:34px;width:auto;margin-bottom:18px}
  .nv h1{font-size:22px;margin:0 0 6px;font-weight:650}.nv p{margin:0 0 14px;color:#5C676E;font-size:15px;line-height:1.5}
  .nv label{display:block;font-size:14px;font-weight:600;margin:12px 0 6px}
  .nv input{width:100%;box-sizing:border-box;border:1px solid rgba(17,24,32,.22);border-radius:8px;padding:11px 12px;font:inherit;font-size:16px;background:#fff}
  .nv input:focus{outline:2px solid #C1A36A;outline-offset:1px}
  .nv-bt{display:flex;width:100%;justify-content:center;align-items:center;gap:8px;margin-top:18px;border:0;border-radius:8px;padding:12px 14px;font:inherit;font-weight:650;background:#C1A36A;color:#111820;cursor:pointer;min-height:46px}
  .nv-bt:hover{background:#AD8E55}.nv-bt[disabled]{opacity:.55;pointer-events:none}
  .nv-bt.linha{background:transparent;border:1px solid rgba(17,24,32,.22)}
  .nv-links{display:flex;flex-wrap:wrap;gap:6px 16px;margin-top:16px;font-size:14px}
  .nv-links button,.nv-link{background:none;border:0;padding:6px 0;color:#7A6131;font:inherit;font-weight:600;cursor:pointer;text-decoration:none}
  .nv-msg{margin-top:12px;font-size:14px;padding:10px 12px;border-radius:8px;background:#F4F0E8}.nv-msg.erro{background:#F6E3E1;color:#9E3F3B}.nv-msg.ok{background:#E3ECE6;color:#4A6154}
  .nv-lista{display:grid;gap:8px;margin-top:8px}.nv-lista button{text-align:left;border:1px solid rgba(17,24,32,.15);border-radius:10px;background:#fff;padding:12px 14px;font:inherit;cursor:pointer}
  .nv-lista button:hover{border-color:#C1A36A}.nv-lista b{display:block}.nv-lista span{font-size:13px;color:#5C676E}
  .nv-giro{width:22px;height:22px;border:3px solid rgba(17,24,32,.15);border-top-color:#C1A36A;border-radius:50%;animation:nvg 1s linear infinite;margin:0 auto 12px}
  @keyframes nvg{to{transform:rotate(360deg)}}
  .nv-faixa{position:fixed;left:50%;bottom:14px;transform:translateX(-50%);z-index:70;background:#111820;color:#F4F0E8;font:600 13px/1.3 Inter,system-ui,sans-serif;padding:8px 14px;border-radius:999px;box-shadow:0 10px 30px -12px rgba(0,0,0,.5);max-width:calc(100% - 32px);text-align:center}
  .nv-faixa.erro{background:#9E3F3B}.nv-faixa[hidden]{display:none}
  @media (max-width:900px){.nv-faixa{bottom:84px}}
  @media (prefers-reduced-motion:reduce){.nv-giro{animation:none}}`;
  document.head.appendChild(css);
  const tela = document.createElement('div');
  tela.className = 'nv'; tela.setAttribute('role', 'dialog'); tela.setAttribute('aria-modal', 'true'); tela.setAttribute('aria-labelledby', 'nv-t');
  document.body.appendChild(tela);
  const LOGO = '<img src="logo/anshur-logo.png?v=5" alt="Anshur" width="136" height="34">';
  const caixa = (html) => { tela.hidden = false; tela.innerHTML = `<div class="nv-caixa">${LOGO}${html}</div>`; const f = tela.querySelector('input'); if (f) f.focus(); };
  const msg = (texto, tipo = 'erro') => { const m = tela.querySelector('.nv-msg'); if (m) { m.className = 'nv-msg ' + tipo; m.textContent = texto; m.hidden = false; m.setAttribute('role', tipo === 'erro' ? 'alert' : 'status'); } };
  const ocupado = (bt, sim, texto) => { if (!bt) return; bt.disabled = sim; if (texto) bt.textContent = texto; };
  const carregando = (texto) => caixa(`<div class="nv-giro" aria-hidden="true"></div><p id="nv-t" style="text-align:center" role="status">${esc(texto)}</p>`);
  const voltarDemo = () => { ls.set('anshur-ambiente', 'demo'); location.hash = '#visao'; location.reload(); };
  const linkDemo = '<button type="button" data-demo>Ver a demonstração</button>';
  const ligarDemo = () => { const b = tela.querySelector('[data-demo]'); if (b) b.onclick = voltarDemo; };

  let sb = null;
  const N = {
    sb: null, revenda: null, eu: null, membros: [], dados: null, versao: 0, offline: false, somenteLeitura: false, motivoLeitura: '',
    revendas: [], salvando: false
  };

  function carregarLib() {
    return new Promise((ok, erro) => {
      if (raiz.supabase) return ok();
      const s = document.createElement('script');
      s.src = CFG.lib; s.integrity = CFG.sri; s.crossOrigin = 'anonymous';
      s.onload = () => ok(); s.onerror = () => erro(new Error('Failed to fetch'));
      document.head.appendChild(s);
    });
  }

  // ---------- telas de conta ----------
  function telaEntrar(aviso) {
    caixa(`<h1 id="nv-t">Entrar no Anshur</h1><p>Acesso aos dados da sua revenda.</p>
      <form id="nv-f" novalidate><label for="nv-email">E-mail</label><input id="nv-email" type="email" autocomplete="email" required>
      <label for="nv-senha">Senha</label><input id="nv-senha" type="password" autocomplete="current-password" required>
      <button class="nv-bt" type="submit">Entrar</button></form>
      <p class="nv-msg" hidden></p>
      <div class="nv-links"><button type="button" id="nv-criar">Criar conta</button><button type="button" id="nv-esqueci">Esqueci a senha</button>${linkDemo}</div>`);
    if (aviso) msg(aviso.texto, aviso.tipo);
    ligarDemo();
    tela.querySelector('#nv-criar').onclick = telaCriar;
    tela.querySelector('#nv-esqueci').onclick = telaEsqueci;
    tela.querySelector('#nv-f').onsubmit = async (e) => {
      e.preventDefault();
      const email = tela.querySelector('#nv-email').value.trim(), senha = tela.querySelector('#nv-senha').value, bt = e.target.querySelector('button');
      if (!email || !senha) { msg('Preencha e-mail e senha.'); return; }
      ocupado(bt, true, 'Entrando…');
      const { error } = await sb.auth.signInWithPassword({ email, password: senha });
      if (error) { ocupado(bt, false, 'Entrar'); msg(mensagem(error)); return; }
      depoisDoLogin();
    };
  }
  function telaCriar() {
    caixa(`<h1 id="nv-t">Criar conta</h1><p>Uma conta por pessoa. Depois você cria a revenda ou entra com o convite que recebeu.</p>
      <form id="nv-f" novalidate><label for="nv-nome">Seu nome</label><input id="nv-nome" autocomplete="name" required maxlength="120">
      <label for="nv-email">E-mail</label><input id="nv-email" type="email" autocomplete="email" required>
      <label for="nv-senha">Senha (mínimo 8, com letras e números)</label><input id="nv-senha" type="password" autocomplete="new-password" minlength="8" required>
      <button class="nv-bt" type="submit">Criar conta</button></form>
      <p class="nv-msg" hidden></p>
      <div class="nv-links"><button type="button" id="nv-voltar">Já tenho conta</button>${linkDemo}</div>`);
    ligarDemo();
    tela.querySelector('#nv-voltar').onclick = () => telaEntrar();
    tela.querySelector('#nv-f').onsubmit = async (e) => {
      e.preventDefault();
      const nome = tela.querySelector('#nv-nome').value.trim(), email = tela.querySelector('#nv-email').value.trim(), senha = tela.querySelector('#nv-senha').value, bt = e.target.querySelector('button');
      if (!nome) { msg('Informe o seu nome.'); return; }
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { msg('Confira o e-mail.'); return; }
      if (senha.length < 8 || !/[a-zA-Z]/.test(senha) || !/\d/.test(senha)) { msg('A senha precisa de pelo menos 8 caracteres, com letras e números.'); return; }
      ocupado(bt, true, 'Criando…');
      const { data, error } = await sb.auth.signUp({ email, password: senha, options: { data: { nome }, emailRedirectTo: location.origin + location.pathname + '?entrar' } });
      if (error) { ocupado(bt, false, 'Criar conta'); msg(mensagem(error)); return; }
      if (data && data.session) { depoisDoLogin(); return; }
      telaEntrar({ texto: `Enviamos um link de confirmação para ${email}. Abra o e-mail, confirme e depois entre aqui.`, tipo: 'ok' });
    };
  }
  function telaEsqueci() {
    caixa(`<h1 id="nv-t">Esqueci a senha</h1><p>Mandamos um link para você criar uma senha nova.</p>
      <form id="nv-f" novalidate><label for="nv-email">E-mail da conta</label><input id="nv-email" type="email" autocomplete="email" required>
      <button class="nv-bt" type="submit">Enviar link</button></form><p class="nv-msg" hidden></p>
      <div class="nv-links"><button type="button" id="nv-voltar">Voltar para Entrar</button></div>`);
    tela.querySelector('#nv-voltar').onclick = () => telaEntrar();
    tela.querySelector('#nv-f').onsubmit = async (e) => {
      e.preventDefault();
      const email = tela.querySelector('#nv-email').value.trim(), bt = e.target.querySelector('button');
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { msg('Confira o e-mail.'); return; }
      ocupado(bt, true, 'Enviando…');
      const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname + '?entrar' });
      ocupado(bt, false, 'Enviar link');
      // mesma resposta exista ou não a conta (não revela quem é cliente)
      if (error && /rate limit|too many/i.test(error.message)) { msg(mensagem(error)); return; }
      msg('Se existir conta com este e-mail, o link chega em alguns minutos. Confira também o spam.', 'ok');
    };
  }
  function telaNovaSenha() {
    caixa(`<h1 id="nv-t">Criar senha nova</h1><p>Escolha a nova senha da sua conta.</p>
      <form id="nv-f" novalidate><label for="nv-senha">Nova senha</label><input id="nv-senha" type="password" autocomplete="new-password" minlength="8" required>
      <label for="nv-senha2">Repita a senha</label><input id="nv-senha2" type="password" autocomplete="new-password" required>
      <button class="nv-bt" type="submit">Salvar senha</button></form><p class="nv-msg" hidden></p>`);
    tela.querySelector('#nv-f').onsubmit = async (e) => {
      e.preventDefault();
      const s1 = tela.querySelector('#nv-senha').value, s2 = tela.querySelector('#nv-senha2').value, bt = e.target.querySelector('button');
      if (s1.length < 8 || !/[a-zA-Z]/.test(s1) || !/\d/.test(s1)) { msg('A senha precisa de pelo menos 8 caracteres, com letras e números.'); return; }
      if (s1 !== s2) { msg('As duas senhas não são iguais.'); return; }
      ocupado(bt, true, 'Salvando…');
      const { error } = await sb.auth.updateUser({ password: s1 });
      if (error) { ocupado(bt, false, 'Salvar senha'); msg(mensagem(error)); return; }
      history.replaceState(null, '', location.pathname + '#visao');
      depoisDoLogin();
    };
  }
  function telaCriarRevenda(lista) {
    caixa(`<h1 id="nv-t">${lista.length ? 'Nova revenda' : 'Criar a sua revenda'}</h1>
      <p>${lista.length ? 'Uma revenda separada, com dados próprios.' : 'Você será o dono e poderá convidar gerente, vendedores, oficina, financeiro e auditor. Recebeu um convite? Abra o link do convite que o dono mandou.'}</p>
      <form id="nv-f" novalidate><label for="nv-nome">Nome da revenda</label><input id="nv-nome" required maxlength="120" placeholder="Ex.: Mogiana Máquinas">
      <label for="nv-cid">Cidade</label><input id="nv-cid" maxlength="120" placeholder="Ex.: Orlândia (SP)">
      <button class="nv-bt" type="submit">Criar revenda</button></form><p class="nv-msg" hidden></p>
      <div class="nv-links">${lista.length ? '<button type="button" id="nv-voltar">Voltar</button>' : ''}<button type="button" id="nv-sair">Sair da conta</button>${linkDemo}</div>`);
    ligarDemo();
    tela.querySelector('#nv-sair').onclick = sair;
    const v = tela.querySelector('#nv-voltar'); if (v) v.onclick = () => telaEscolher(lista);
    tela.querySelector('#nv-f').onsubmit = async (e) => {
      e.preventDefault();
      const nome = tela.querySelector('#nv-nome').value.trim(), cidade = tela.querySelector('#nv-cid').value.trim(), bt = e.target.querySelector('button');
      if (nome.length < 2) { msg('Informe o nome da revenda.'); return; }
      ocupado(bt, true, 'Criando…');
      const { data, error } = await sb.rpc('anshur_criar_revenda', { p_nome: nome, p_cidade: cidade || null });
      if (error) { ocupado(bt, false, 'Criar revenda'); msg(mensagem(error)); return; }
      ls.set(CHAVE_REVENDA, data);
      depoisDoLogin();
    };
  }
  function telaEscolher(lista) {
    caixa(`<h1 id="nv-t">Escolha a revenda</h1><p>Sua conta tem acesso a mais de uma revenda.</p>
      <div class="nv-lista">${lista.map((r) => `<button type="button" data-r="${esc(r.id)}"><b>${esc(r.nome)}</b><span>${esc(r.cidade || '')}${r.cidade ? ' · ' : ''}${esc(PERFIL_NOME[r.perfil] || r.perfil)}</span></button>`).join('')}</div>
      <div class="nv-links"><button type="button" id="nv-nova">Criar outra revenda</button><button type="button" id="nv-sair">Sair da conta</button></div>`);
    tela.querySelectorAll('[data-r]').forEach((b) => { b.onclick = () => { ls.set(CHAVE_REVENDA, b.dataset.r); abrirRevenda(lista.find((r) => r.id === b.dataset.r)); }; });
    tela.querySelector('#nv-nova').onclick = () => telaCriarRevenda(lista);
    tela.querySelector('#nv-sair').onclick = sair;
  }
  function telaErro(texto, tentar) {
    caixa(`<h1 id="nv-t">Não foi possível abrir</h1><p class="nv-msg erro" role="alert">${esc(texto)}</p>
      <button class="nv-bt" type="button" id="nv-de-novo">Tentar de novo</button>
      <div class="nv-links"><button type="button" id="nv-sair">Sair da conta</button>${linkDemo}</div>`);
    ligarDemo();
    tela.querySelector('#nv-de-novo').onclick = tentar || (() => location.reload());
    tela.querySelector('#nv-sair').onclick = sair;
  }
  const PERFIL_NOME = { dono: 'Dono', gerente: 'Gerente', vendedor: 'Vendedor', oficina: 'Oficina', financeiro: 'Financeiro', auditor: 'Auditor (só leitura)' };

  // ---------- sessão e revenda ----------
  async function depoisDoLogin() {
    carregando('Abrindo a sua revenda…');
    const { data: { session } } = await sb.auth.getSession();
    if (!session) { telaEntrar(); return; }
    N.usuario = session.user;
    let convite = null; try { convite = sessionStorage.getItem('anshur-convite'); } catch (e) { /* sem */ }
    if (convite) {
      const { data, error } = await sb.rpc('anshur_aceitar_convite', { p_token: convite });
      try { sessionStorage.removeItem('anshur-convite'); } catch (e) { /* sem */ }
      if (error) { telaErro(mensagem(error) + ` (conta: ${session.user.email})`, () => depoisDoLogin()); return; }
      ls.set(CHAVE_REVENDA, data);
    }
    const { data: lista, error } = await sb.rpc('anshur_minhas_revendas');
    if (error) { if (/Failed to fetch|network/i.test(error.message)) { abrirOffline(); return; } telaErro(mensagem(error)); return; }
    N.revendas = lista || [];
    if (!N.revendas.length) { telaCriarRevenda([]); return; }
    const salva = ls.get(CHAVE_REVENDA), achou = N.revendas.find((r) => r.id === salva);
    if (achou) { abrirRevenda(achou); return; }
    if (N.revendas.length === 1) { ls.set(CHAVE_REVENDA, N.revendas[0].id); abrirRevenda(N.revendas[0]); return; }
    telaEscolher(N.revendas);
  }

  async function abrirRevenda(r) {
    carregando(`Carregando ${r.nome}…`);
    const [est, mem] = await Promise.all([
      sb.from('anshur_estado').select('dados,versao,atualizado').eq('revenda', r.id).maybeSingle(),
      sb.rpc('anshur_membros_da_revenda', { p_revenda: r.id })
    ]);
    const erro = est.error || mem.error;
    if (erro) { if (/Failed to fetch|network/i.test(erro.message)) { abrirOffline(); return; } telaErro(mensagem(erro), () => abrirRevenda(r)); return; }
    if (!est.data) { ls.del(CHAVE_REVENDA); telaErro('Revenda não encontrada ou sem acesso.', () => depoisDoLogin()); return; }
    N.revenda = { id: r.id, nome: r.nome, cidade: r.cidade || '', plano: r.plano };
    N.membros = (mem.data || []).map((m) => ({ usuario: m.usuario, email: m.email, nome: m.nome || (m.email || '').split('@')[0], perfil: m.perfil, lojas: m.lojas }));
    const meu = N.membros.find((m) => m.usuario === N.usuario.id) || { usuario: N.usuario.id, email: N.usuario.email, nome: r.nome_membro, perfil: r.perfil, lojas: r.lojas };
    N.eu = meu;
    N.dados = est.data.dados || {};
    N.versao = est.data.versao;
    N.somenteLeitura = meu.perfil === 'auditor' || r.plano === 'suspenso';
    N.motivoLeitura = meu.perfil === 'auditor' ? 'Perfil de auditor: só leitura.' : r.plano === 'suspenso' ? 'Conta suspensa: só leitura.' : '';
    gravarCache();
    // dados que ficaram só neste navegador (antes da conta): oferecer enviar uma vez, sem duplicar
    let local = null; try { local = JSON.parse(ls.get(CHAVE_LOCAL)); } catch (e) { local = null; }
    if (!N.somenteLeitura && temDados(local) && ['dono', 'gerente'].includes(meu.perfil)) { oferecerEnvio(local); return; }
    iniciar();
  }

  function oferecerEnvio(local) {
    const n = (k) => (local[k] || []).length;
    caixa(`<h1 id="nv-t">Dados neste navegador</h1>
      <p>Encontramos dados da revenda guardados só neste navegador, de antes da conta: ${n('historico')} trocas do histórico, ${n('fechadas')} trocas fechadas, ${n('avaliacoes')} avaliações e ${n('documentos')} documentos.</p>
      <p>Enviar junta esses dados aos de <b>${esc(N.revenda.nome)}</b>. O que já está na conta não é duplicado nem substituído.</p>
      <button class="nv-bt" type="button" id="nv-enviar">Enviar meus dados deste navegador para a conta</button>
      <button class="nv-bt linha" type="button" id="nv-depois">Agora não</button><p class="nv-msg" hidden></p>`);
    tela.querySelector('#nv-depois').onclick = iniciar;
    tela.querySelector('#nv-enviar').onclick = async (e) => {
      ocupado(e.target, true, 'Enviando…');
      const juntos = mesclar(N.dados, local);
      const { data, error } = await sb.rpc('anshur_salvar', { p_revenda: N.revenda.id, p_dados: juntos, p_versao_esperada: N.versao });
      if (error) { ocupado(e.target, false, 'Enviar meus dados deste navegador para a conta'); msg(mensagem(error)); return; }
      N.dados = juntos; N.versao = data;
      // já está na conta: a cópia local é apagada (não é oferecida de novo nem fica dado real solto no navegador)
      ls.del(CHAVE_LOCAL); ls.del(CHAVE_LOCAL + '-enviado');
      evento('importacao', 'Dados do navegador enviados para a conta');
      gravarCache(); iniciar();
    };
  }

  function gravarCache() {
    ls.set(CHAVE_CACHE, JSON.stringify({ usuario: N.usuario.id, email: N.usuario.email, revenda: N.revenda, eu: N.eu, membros: N.membros, dados: N.dados, versao: N.versao, quando: new Date().toISOString() }));
  }

  // sem internet: abre a última cópia desta conta neste aparelho, só para leitura
  function abrirOffline() {
    let c = null; try { c = JSON.parse(ls.get(CHAVE_CACHE)); } catch (e) { c = null; }
    let sessao = null; try { sessao = JSON.parse(ls.get('anshur-auth')); } catch (e) { sessao = null; }
    const uid = sessao && (sessao.user ? sessao.user.id : sessao.currentSession && sessao.currentSession.user && sessao.currentSession.user.id);
    if (!c || !uid || c.usuario !== uid) { telaErro('Sem internet, e não há uma cópia desta conta neste aparelho. Conecte-se e tente de novo.'); return; }
    Object.assign(N, { revenda: c.revenda, eu: c.eu, membros: c.membros || [], dados: c.dados, versao: c.versao, usuario: { id: c.usuario, email: c.email } });
    N.offline = true; N.somenteLeitura = true;
    N.motivoLeitura = `Sem internet: só leitura (cópia de ${new Date(c.quando).toLocaleString('pt-BR')}).`;
    iniciar();
  }

  // ---------- faixa de situação (salvando, salvo, sem internet, só leitura) ----------
  let faixa = null, faixaTimer = null;
  function situacao(texto, tipo = '', fixo = false) {
    if (!faixa) { faixa = document.createElement('div'); faixa.className = 'nv-faixa'; faixa.setAttribute('role', 'status'); faixa.setAttribute('aria-live', 'polite'); document.body.appendChild(faixa); }
    faixa.textContent = texto; faixa.className = 'nv-faixa' + (tipo ? ' ' + tipo : ''); faixa.hidden = !texto;
    clearTimeout(faixaTimer); if (!fixo && texto) faixaTimer = setTimeout(() => { faixa.hidden = true; }, 2500);
  }

  // ---------- salvar: espera curta, um envio por vez, versão esperada ----------
  let pendente = null, timer = null, enviando = null, tentativas = 0;
  N.salvar = (d) => {
    if (N.somenteLeitura) { situacao(N.motivoLeitura || 'Só leitura.', 'erro', N.offline); return false; }
    pendente = d; clearTimeout(timer); timer = setTimeout(enviar, 1200);
    situacao('Salvando…', '', true);
    return true;
  };
  async function enviar() {
    clearTimeout(timer);
    if (enviando) { await enviando; if (pendente) return enviar(); return; }
    if (!pendente) return;
    const dados = JSON.parse(JSON.stringify(pendente)); pendente = null;
    enviando = (async () => {
      const { data, error } = await sb.rpc('anshur_salvar', { p_revenda: N.revenda.id, p_dados: dados, p_versao_esperada: N.versao });
      if (!error) { N.versao = data; N.dados = dados; tentativas = 0; gravarCache(); if (!pendente) situacao('Salvo'); return; }
      const m = String(error.message || '');
      if (/anshur_conflito/.test(m)) { conflito(); return; }
      if (/anshur_(somente_leitura|sem_acesso|suspensa)/.test(m)) { N.somenteLeitura = true; N.motivoLeitura = mensagem(error); situacao(N.motivoLeitura, 'erro', true); return; }
      if (/anshur_grande_demais|anshur_dados_invalidos/.test(m)) { situacao(mensagem(error), 'erro', true); return; }
      // falha de rede: guarda e tenta de novo
      if (!pendente) pendente = dados;
      tentativas++;
      situacao('Sem conexão: alterações ainda não enviadas. Não feche o Anshur.', 'erro', true);
      timer = setTimeout(enviar, Math.min(30000, 3000 * tentativas));
    })();
    await enviando; enviando = null;
    if (pendente && !timer) timer = setTimeout(enviar, 400);
  }
  function conflito() {
    pendente = null; clearTimeout(timer);
    tela.hidden = false;
    caixa(`<h1 id="nv-t">Os dados mudaram</h1><p>Outra pessoa da revenda salvou alterações enquanto você trabalhava. Para não apagar o que ela fez, vamos abrir a versão mais nova. Confira e refaça a sua última alteração, se ela não aparecer.</p>
      <button class="nv-bt" type="button" id="nv-rec">Abrir a versão mais nova</button>`);
    tela.querySelector('#nv-rec').onclick = () => location.reload();
  }
  // termina de salvar antes de recarregar a página
  N.descarregar = async () => { if (pendente || enviando) { situacao('Salvando…', '', true); await enviar(); if (enviando) await enviando; } return !pendente; };
  N.recarregar = async () => { await N.descarregar(); location.reload(); };
  window.addEventListener('beforeunload', (e) => { if (pendente || enviando) { e.preventDefault(); e.returnValue = ''; } });
  window.addEventListener('online', () => { if (N.offline) situacao('Internet de volta. Recarregue para editar.', '', true); else if (pendente) enviar(); });
  window.addEventListener('offline', () => { if (!N.offline) situacao('Sem internet: o que você mudar fica esperando para ser enviado.', 'erro', true); });

  // ---------- auditoria no servidor (atividades críticas) ----------
  function evento(tipo, texto) {
    if (!sb || N.offline || !N.revenda) return;
    sb.rpc('anshur_registrar_evento', { p_revenda: N.revenda.id, p_tipo: tipo, p_texto: String(texto).slice(0, 500) }).then(() => {}, () => {});
  }
  N.evento = evento;

  // ---------- equipe e convites ----------
  N.convidar = async (email, perfil) => {
    const { data, error } = await sb.rpc('anshur_convidar', { p_revenda: N.revenda.id, p_email: email, p_perfil: perfil });
    if (error) throw new Error(mensagem(error));
    return location.origin + location.pathname + '?convite=' + encodeURIComponent(data);
  };
  N.convites = async () => {
    const { data, error } = await sb.from('anshur_convites').select('id,email,perfil,criado,expira,aceito').eq('revenda', N.revenda.id).is('aceito', null).order('criado', { ascending: false });
    if (error) throw new Error(mensagem(error));
    return data || [];
  };
  N.cancelarConvite = async (id) => { const { error } = await sb.rpc('anshur_cancelar_convite', { p_convite: id }); if (error) throw new Error(mensagem(error)); };
  N.alterarMembro = async (usuario, perfil, lojas, nome) => { const { error } = await sb.rpc('anshur_alterar_membro', { p_revenda: N.revenda.id, p_usuario: usuario, p_perfil: perfil, p_lojas: lojas && lojas.length ? lojas : null, p_nome: nome || null }); if (error) throw new Error(mensagem(error)); };
  N.removerMembro = async (usuario) => { const { error } = await sb.rpc('anshur_remover_membro', { p_revenda: N.revenda.id, p_usuario: usuario }); if (error) throw new Error(mensagem(error)); };
  N.eventosServidor = async () => {
    const { data, error } = await sb.from('anshur_eventos').select('tipo,texto,quando,usuario').eq('revenda', N.revenda.id).order('quando', { ascending: false }).limit(300);
    if (error) throw new Error(mensagem(error));
    return data || [];
  };
  // cópias diárias no servidor (30 dias): dono, gerente e auditor veem; só o dono restaura
  N.copias = async () => {
    const { data, error } = await sb.from('anshur_copias').select('dia,versao,criado').eq('revenda', N.revenda.id).order('dia', { ascending: false }).limit(31);
    if (error) throw new Error(mensagem(error));
    return data || [];
  };
  N.restaurarCopia = async (dia) => { await N.descarregar(); const { error } = await sb.rpc('anshur_restaurar_copia', { p_revenda: N.revenda.id, p_dia: dia }); if (error) throw new Error(mensagem(error)); };
  N.renomear = async (nome, cidade) => { const { error } = await sb.rpc('anshur_renomear_revenda', { p_revenda: N.revenda.id, p_nome: nome, p_cidade: cidade || null }); if (error) throw new Error(mensagem(error)); N.revenda.nome = nome; N.revenda.cidade = cidade; gravarCache(); };

  // ---------- documentos (Storage privado, pasta = id da revenda) ----------
  const nomeSeguro = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9._-]+/g, '-').slice(-80);
  N.limiteDoc = LIMITE_DOC;
  N.subirDoc = async (id, arquivo) => {
    if (arquivo.size > LIMITE_DOC) throw new Error('Arquivo acima de 10 MB.');
    const caminho = `${N.revenda.id}/${id}-${nomeSeguro(arquivo.name)}`;
    const { error } = await sb.storage.from('anshur-docs').upload(caminho, arquivo, { upsert: false, contentType: arquivo.type || undefined });
    if (error) throw new Error(/mime|type/i.test(error.message) ? 'Tipo de arquivo não aceito.' : mensagem(error));
    return caminho;
  };
  N.abrirDoc = async (caminho) => {
    const { data, error } = await sb.storage.from('anshur-docs').createSignedUrl(caminho, 120);
    if (error) throw new Error(mensagem(error));
    return data.signedUrl;
  };
  // exclusão a pedido do titular (LGPD): apaga os arquivos e depois a revenda inteira no servidor
  N.excluirRevenda = async (confirmacao) => {
    for (let i = 0; i < 20; i++) {
      const { data, error } = await sb.storage.from('anshur-docs').list(N.revenda.id, { limit: 100 });
      if (error) throw new Error(mensagem(error));
      if (!data || !data.length) break;
      const { error: e2 } = await sb.storage.from('anshur-docs').remove(data.map((f) => `${N.revenda.id}/${f.name}`));
      if (e2) throw new Error(mensagem(e2));
    }
    const { error } = await sb.rpc('anshur_excluir_revenda', { p_revenda: N.revenda.id, p_confirmacao: confirmacao });
    if (error) throw new Error(mensagem(error));
    ls.del(CHAVE_CACHE); ls.del(CHAVE_REVENDA);
  };
  async function sair() {
    await N.descarregar().catch(() => {});
    ls.del(CHAVE_CACHE); ls.del(CHAVE_REVENDA);
    try { await sb.auth.signOut(); } catch (e) { /* sai mesmo sem rede */ }
    ls.del('anshur-auth');
    location.hash = ''; location.reload();
  }
  N.sair = sair;
  N.trocarRevenda = async () => { await N.descarregar(); ls.del(CHAVE_REVENDA); location.reload(); };

  function iniciar() {
    tela.hidden = true; tela.innerHTML = '';
    raiz.ANSHUR_NUVEM = N;
    if (N.somenteLeitura) situacao(N.motivoLeitura, N.offline ? 'erro' : '', true);
    carregarApp();
  }

  // ---------- partida ----------
  (async () => {
    carregando('Conectando…');
    try { await carregarLib(); } catch (e) { abrirOffline(); return; }
    sb = raiz.supabase.createClient(CFG.url, CFG.chave, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'anshur-auth' } });
    N.sb = sb;
    if (recuperando) {
      sb.auth.onAuthStateChange((ev) => { if (ev === 'PASSWORD_RECOVERY') telaNovaSenha(); });
      const { data: { session } } = await sb.auth.getSession();
      if (session) { telaNovaSenha(); return; }
    }
    let sessao;
    try { sessao = (await sb.auth.getSession()).data.session; } catch (e) { abrirOffline(); return; }
    if (!sessao) { telaEntrar(); return; }
    if (!navigator.onLine) { abrirOffline(); return; }
    depoisDoLogin().catch((e) => { if (/Failed to fetch|network/i.test(String(e && e.message))) abrirOffline(); else telaErro(mensagem(e)); });
  })();
})(typeof window !== 'undefined' ? window : globalThis);
