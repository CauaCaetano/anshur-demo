// Conta e servidor do ambiente real (Supabase). A demonstração não usa nada daqui: segue 100% no navegador.
// Fluxo do ambiente real: entrar → escolher (ou criar) a revenda → carregar o estado do servidor → abrir o app.
// Cada gravação vira operações pequenas com id numa fila guardada no aparelho (revenda + pessoa); a fila é enviada com
// número de versão e, em conflito, reaplicada sobre a versão nova do servidor. Sem internet, abre a última cópia e continua
// consultando e cadastrando; o que for feito espera a internet voltar.
(function (raiz) {
  'use strict';
  // ---------- partes puras (testadas em testes.js) ----------
  const LISTAS = ['avaliacoes', 'documentos', 'atividades', 'pendentes', 'modelosExtra'];
  const MAPAS = ['precos', 'vendas', 'preparos', 'resolvidos', 'config', 'rituais'];
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
  // ---------- fila de alterações (modo offline do pátio) ----------
  // Cada gravação do app vira uma lista de operações pequenas, com id, calculadas pela diferença entre o que o app
  // tinha e o que tem agora. As operações são reaplicadas sobre a versão ATUAL do servidor: inserir/atualizar um item
  // pelo id, tirar um item pelo id, gravar uma chave de mapa, anexar um preço. Reaplicar a mesma operação não duplica
  // nada (idempotente) e o que outra pessoa salvou nos outros itens continua lá.
  const LISTAS_ID = ['avaliacoes', 'fechadas', 'historico', 'documentos', 'atividades', 'pendentes', 'usuarios', 'modelosExtra'];
  const EXTRAS = ['garantias', 'financiadas', 'compradores', 'anuncios'];
  const MAPAS_OP = ['precos', 'vendas', 'preparos', 'resolvidos', 'retratos', 'custos', 'rituais'];
  const js = (x) => JSON.stringify(x);
  const copia = (x) => (x === undefined ? undefined : JSON.parse(JSON.stringify(x)));
  let seqOp = 0;
  const novoId = () => Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8) + (seqOp++).toString(36);
  function diferenca(antes, depois, lote) {
    const a = antes || {}, d = depois || {}, ops = [], lt = lote || novoId();
    const add = (o) => ops.push(Object.assign({ oid: novoId(), lote: lt }, o));
    const listas = (la, ld, nome) => {
      la = Array.isArray(la) ? la : []; ld = Array.isArray(ld) ? ld : [];
      const ma = new Map(la.map((x) => [idDe(x), x])), vistos = new Set();
      // atividades novas entram no começo da lista: gera do mais antigo para o mais novo
      (nome === 'atividades' ? ld.slice().reverse() : ld).forEach((x) => {
        const id = idDe(x); vistos.add(id);
        if (!ma.has(id) || js(ma.get(id)) !== js(x)) add({ t: 'item', l: nome, id, v: copia(x) });
      });
      ma.forEach((x, id) => { if (!vistos.has(id)) add({ t: 'tirar', l: nome, id }); });
    };
    LISTAS_ID.forEach((k) => { if (a[k] !== undefined || d[k] !== undefined) listas(a[k], d[k], k); });
    const ea = a.extras || {}, ed = d.extras || {};
    EXTRAS.forEach((k) => { if (ea[k] !== undefined || ed[k] !== undefined) listas(ea[k], ed[k], 'extras.' + k); });
    new Set([...Object.keys(ea), ...Object.keys(ed)]).forEach((k) => { if (!EXTRAS.includes(k) && js(ea[k]) !== js(ed[k])) add({ t: 'campo', c: 'extras.' + k, v: copia(ed[k]) }); });
    MAPAS_OP.forEach((m) => {
      const ma = (a[m] && typeof a[m] === 'object') ? a[m] : {}, md = (d[m] && typeof d[m] === 'object') ? d[m] : {};
      Object.keys(md).forEach((k) => {
        const va = ma[k], vd = md[k];
        if (js(va) === js(vd)) return;
        // preços: o histórico só cresce; anexar não apaga o preço que outra pessoa lançou na mesma máquina
        if (m === 'precos' && Array.isArray(vd) && (va === undefined || (Array.isArray(va) && vd.length > va.length && js(vd.slice(0, va.length)) === js(va)))) {
          vd.slice(va ? va.length : 0).forEach((v) => add({ t: 'anexar', m, k, v: copia(v) }));
        } else add({ t: 'chave', m, k, v: copia(vd) });
      });
      Object.keys(ma).forEach((k) => { if (!(k in md)) add({ t: 'apagar', m, k }); });
    });
    const fixos = new Set([...LISTAS_ID, ...MAPAS_OP, 'extras']);
    new Set([...Object.keys(a), ...Object.keys(d)]).forEach((k) => { if (!fixos.has(k) && js(a[k]) !== js(d[k])) add({ t: 'campo', c: k, v: copia(d[k]) }); });
    return ops;
  }
  function aplicarOps(base, ops) {
    const r = copia(base || {}) || {};
    const lista = (nome) => {
      if (nome.startsWith('extras.')) { const k = nome.slice(7); r.extras = r.extras && typeof r.extras === 'object' ? r.extras : {}; if (!Array.isArray(r.extras[k])) r.extras[k] = []; return r.extras[k]; }
      if (!Array.isArray(r[nome])) r[nome] = [];
      return r[nome];
    };
    const mapa = (m) => { if (!r[m] || typeof r[m] !== 'object' || Array.isArray(r[m])) r[m] = {}; return r[m]; };
    (ops || []).forEach((o) => {
      if (o.t === 'item') { const L = lista(o.l), i = L.findIndex((x) => idDe(x) === o.id); if (i >= 0) L[i] = copia(o.v); else if (o.l === 'atividades') L.unshift(copia(o.v)); else L.push(copia(o.v)); }
      else if (o.t === 'tirar') { const L = lista(o.l); for (let i = L.length - 1; i >= 0; i--) if (idDe(L[i]) === o.id) L.splice(i, 1); }
      else if (o.t === 'chave') mapa(o.m)[o.k] = copia(o.v);
      else if (o.t === 'apagar') { if (r[o.m] && typeof r[o.m] === 'object') delete r[o.m][o.k]; }
      else if (o.t === 'anexar') { const M = mapa(o.m); if (!Array.isArray(M[o.k])) M[o.k] = []; if (!M[o.k].some((x) => js(x) === js(o.v))) M[o.k].push(copia(o.v)); }
      else if (o.t === 'campo') {
        const alvo = o.c.startsWith('extras.') ? (r.extras = r.extras && typeof r.extras === 'object' ? r.extras : {}) : r, k = o.c.startsWith('extras.') ? o.c.slice(7) : o.c;
        if (o.v === undefined) delete alvo[k]; else alvo[k] = copia(o.v);
      }
    });
    if (Array.isArray(r.atividades) && r.atividades.length > 600) r.atividades.length = 600;
    return r;
  }
  // quantas alterações (gravações do app) ainda esperam o servidor
  const alteracoes = (fila) => new Set((fila || []).map((o) => o.lote)).size;
  const PURO = { mesclar, temDados, mensagem, chaveTroca, diferenca, aplicarOps, alteracoes };
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
  .nv-faixa.erro{background:#9E3F3B}.nv-faixa.espera{background:#7A6131}.nv-faixa[hidden]{display:none}
  .nv-faixa-bt{margin-left:10px;background:#F4F0E8;color:#111820;border:0;border-radius:999px;padding:4px 10px;font:inherit;font-size:12px;cursor:pointer}
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

  function criarCliente() {
    sb = raiz.supabase.createClient(CFG.url, CFG.chave, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'anshur-auth' } });
    N.sb = sb;
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

  // cópia do aparelho: só o que o servidor CONFIRMOU (dados + versão). O que ainda não foi confirmado fica na fila.
  function gravarCache() {
    ls.set(CHAVE_CACHE, JSON.stringify({ usuario: N.usuario.id, email: N.usuario.email, revenda: N.revenda, eu: N.eu, membros: N.membros, dados: N.dados, versao: N.versao, quando: new Date().toISOString() }));
  }

  // sem internet: abre a última cópia desta conta neste aparelho; consulta e cadastro continuam e vão para a fila
  function abrirOffline() {
    let c = null; try { c = JSON.parse(ls.get(CHAVE_CACHE)); } catch (e) { c = null; }
    let sessao = null; try { sessao = JSON.parse(ls.get('anshur-auth')); } catch (e) { sessao = null; }
    const uid = sessao && (sessao.user ? sessao.user.id : sessao.currentSession && sessao.currentSession.user && sessao.currentSession.user.id);
    if (!c || !uid || c.usuario !== uid) { telaErro('Sem internet, e não há uma cópia desta conta neste aparelho. Conecte-se e tente de novo.'); return; }
    Object.assign(N, { revenda: c.revenda, eu: c.eu, membros: c.membros || [], dados: c.dados, versao: c.versao, usuario: { id: c.usuario, email: c.email } });
    N.offline = true; N.copiaDe = c.quando; semConexao = true;
    N.somenteLeitura = (c.eu && c.eu.perfil === 'auditor') || (c.revenda && c.revenda.plano === 'suspenso');
    N.motivoLeitura = !N.somenteLeitura ? '' : c.eu && c.eu.perfil === 'auditor' ? 'Perfil de auditor: só leitura.' : 'Conta suspensa: só leitura.';
    iniciar();
  }

  // ---------- faixa de situação (enviando, salvo no servidor, esperando internet, só leitura) ----------
  let faixa = null, faixaTimer = null;
  function situacao(texto, tipo = '', fixo = false, acao = null) {
    if (!faixa) { faixa = document.createElement('div'); faixa.className = 'nv-faixa'; faixa.id = 'nv-faixa'; faixa.setAttribute('role', 'status'); faixa.setAttribute('aria-live', 'polite'); document.body.appendChild(faixa); }
    faixa.textContent = texto; faixa.className = 'nv-faixa' + (tipo ? ' ' + tipo : ''); faixa.hidden = !texto;
    if (acao) { const b = document.createElement('button'); b.type = 'button'; b.className = 'nv-faixa-bt'; b.textContent = acao.rotulo; b.onclick = acao.fn; faixa.appendChild(b); }
    clearTimeout(faixaTimer); if (!fixo && texto) faixaTimer = setTimeout(() => { faixa.hidden = true; }, 2500);
  }

  // ---------- fila de alterações: guardada no aparelho por revenda + pessoa, enviada quando há internet ----------
  let fila = [], vista = {}, filaNoAparelho = true, timer = null, sincronizando = null, deNovo = false, tentativas = 0, semConexao = false;
  const chaveFila = () => 'anshur-fila:' + N.revenda.id + ':' + N.usuario.id;
  const semRede = () => !navigator.onLine || semConexao;
  function lerFila() { try { const f = JSON.parse(ls.get(chaveFila())); return Array.isArray(f && f.ops) ? f.ops : []; } catch (e) { return []; } }
  function gravarFila() {
    if (!fila.length) { ls.del(chaveFila()); filaNoAparelho = true; return true; }
    filaNoAparelho = ls.set(chaveFila(), JSON.stringify({ ops: fila, quando: new Date().toISOString() }));
    return filaNoAparelho;
  }
  // o app abre com o que o servidor confirmou + o que ainda está na fila deste aparelho
  function prepararVista() { fila = lerFila(); N.vista = fila.length ? aplicarOps(N.dados, fila) : N.dados; vista = copia(N.vista) || {}; }
  N.marcarVista = (d) => { vista = copia(d) || {}; };
  N.pendentes = () => alteracoes(fila);
  N.semInternet = () => semRede();
  const avisar = () => { try { window.dispatchEvent(new CustomEvent('anshur:nuvem', { detail: { pendentes: alteracoes(fila), offline: semRede() } })); } catch (e) { /* sem evento */ } };
  function mostrarFila() {
    const n = alteracoes(fila);
    N.offline = semRede();
    if (n && semRede()) situacao(`${n} ${n === 1 ? 'alteração esperando' : 'alterações esperando'} internet · guardada${n === 1 ? '' : 's'} neste aparelho`, 'espera', true);
    else if (n) situacao(`Enviando ${n} ${n === 1 ? 'alteração' : 'alterações'}…`, '', true);
    else if (semRede()) situacao(N.somenteLeitura ? N.motivoLeitura : 'Sem internet: o que você cadastrar fica guardado neste aparelho e é enviado quando a internet voltar.', 'espera', true);
    avisar();
  }
  // nunca diz "salvo" antes da resposta do servidor: aqui só entra na fila
  N.salvar = (d) => {
    if (N.somenteLeitura) { situacao(N.motivoLeitura || 'Só leitura.', 'erro', true); return false; }
    const ops = diferenca(vista, d);
    vista = copia(d) || {};
    if (!ops.length) return true;
    fila.push(...ops);
    if (!gravarFila()) situacao('Sem espaço neste aparelho para guardar as alterações. Não feche o Anshur até a internet voltar.', 'erro', true);
    else mostrarFila();
    clearTimeout(timer); timer = null;
    if (navigator.onLine) timer = setTimeout(sincronizar, semConexao ? 3000 : 1200);
    return true;
  };
  async function conectar() {
    if (!sb) { await carregarLib(); criarCliente(); }
    const { data: { session } } = await sb.auth.getSession();
    if (!session) throw new Error('sem_sessao');
  }
  async function buscarServidor() {
    const { data, error } = await sb.from('anshur_estado').select('dados,versao').eq('revenda', N.revenda.id).maybeSingle();
    if (error || !data) return false;
    N.dados = data.dados || {}; N.versao = data.versao; return true;
  }
  function falhaRede() {
    tentativas++; semConexao = true; mostrarFila();
    clearTimeout(timer); timer = navigator.onLine ? setTimeout(() => { semConexao = false; sincronizar(); }, Math.min(30000, 3000 * tentativas)) : null;
  }
  // envia a fila: aplica as operações sobre a versão do servidor; em conflito, busca a versão nova e reaplica
  async function sincronizar() {
    clearTimeout(timer); timer = null;
    if (sincronizando) { deNovo = true; return sincronizando; }
    if (!fila.length || N.somenteLeitura) { mostrarFila(); return; }
    if (!navigator.onLine) { semConexao = true; mostrarFila(); return; }
    let juntou = false;
    sincronizando = (async () => {
      try { await conectar(); } catch (e) {
        if (String(e && e.message) === 'sem_sessao') { situacao('Sessão vencida: entre de novo para enviar as alterações guardadas neste aparelho.', 'erro', true, { rotulo: 'Entrar', fn: () => location.reload() }); return; }
        falhaRede(); return;
      }
      for (let volta = 0; volta < 6; volta++) {
        const lote = fila.slice(), dados = aplicarOps(N.dados, lote);
        let resp; try { resp = await sb.rpc('anshur_salvar', { p_revenda: N.revenda.id, p_dados: dados, p_versao_esperada: N.versao }); } catch (e) { resp = { error: e }; }
        const { data, error } = resp;
        if (!error) {
          N.dados = dados; N.versao = data; semConexao = false; tentativas = 0;
          const enviados = new Set(lote.map((o) => o.oid)); fila = fila.filter((o) => !enviados.has(o.oid));
          gravarCache(); gravarFila();
          if (fila.length) { deNovo = true; return; }
          N.offline = false;
          enviarEventosGuardados();
          if (juntou) situacao('Salvo no servidor, junto com o que outra pessoa salvou ao mesmo tempo.', '', true, { rotulo: 'Atualizar a tela', fn: () => location.reload() });
          else situacao('Salvo no servidor');
          avisar();
          return;
        }
        const m = String(error.message || error || '');
        if (/anshur_conflito/.test(m)) {
          let ok = false; try { ok = await buscarServidor(); } catch (e) { ok = false; }
          if (!ok) { falhaRede(); return; }
          juntou = true; continue;
        }
        if (/anshur_(somente_leitura|sem_acesso|suspensa)/.test(m)) { N.somenteLeitura = true; N.motivoLeitura = mensagem(error); situacao(N.motivoLeitura + ' As alterações guardadas não foram enviadas.', 'erro', true); return; }
        if (/anshur_grande_demais|anshur_dados_invalidos/.test(m)) { situacao(mensagem(error), 'erro', true); return; }
        falhaRede(); return;
      }
      situacao('Muitas pessoas salvando ao mesmo tempo. Tentando de novo…', 'erro', true);
      timer = setTimeout(sincronizar, 4000);
    })();
    try { await sincronizando; } finally { sincronizando = null; }
    if (deNovo && fila.length && !semRede()) { deNovo = false; return sincronizar(); }
    deNovo = false;
  }
  // termina de enviar antes de recarregar a página (sem internet, a fila já está guardada no aparelho)
  N.descarregar = async () => { if (fila.length && !semRede()) { clearTimeout(timer); await sincronizar(); } return !fila.length; };
  N.recarregar = async () => { await N.descarregar(); location.reload(); };
  window.addEventListener('beforeunload', (e) => { if (fila.length && !filaNoAparelho) { e.preventDefault(); e.returnValue = ''; } });
  window.addEventListener('online', () => { if (!N.revenda) return; semConexao = false; N.offline = false; tentativas = 0; if (fila.length) sincronizar(); else { situacao('Internet de volta.'); avisar(); } });
  window.addEventListener('offline', () => { if (!N.revenda) return; semConexao = true; mostrarFila(); });

  // ---------- auditoria no servidor (atividades críticas) ----------
  // sem internet, o evento espera no aparelho e vai para a trilha depois que a fila for salva no servidor
  const chaveEventos = () => 'anshur-eventos:' + N.revenda.id + ':' + N.usuario.id;
  function guardarEvento(tipo, texto, jaMarcado) {
    let l = []; try { l = JSON.parse(ls.get(chaveEventos())) || []; } catch (e) { l = []; }
    l.push({ tipo, texto: jaMarcado ? texto : String(texto).slice(0, 440) + ' (feito sem internet em ' + new Date().toLocaleString('pt-BR') + ')' });
    ls.set(chaveEventos(), JSON.stringify(l.slice(-200)));
  }
  async function enviarEventosGuardados() {
    let l = []; try { l = JSON.parse(ls.get(chaveEventos())) || []; } catch (e) { l = []; }
    if (!l.length || !sb) return;
    ls.del(chaveEventos());
    for (const ev of l) { try { const { error } = await sb.rpc('anshur_registrar_evento', { p_revenda: N.revenda.id, p_tipo: ev.tipo, p_texto: ev.texto.slice(0, 500) }); if (error) throw error; } catch (e) { guardarEvento(ev.tipo, ev.texto, true); } }
  }
  function evento(tipo, texto) {
    if (!N.revenda) return;
    if (!sb || semRede()) { guardarEvento(tipo, texto); return; }
    sb.rpc('anshur_registrar_evento', { p_revenda: N.revenda.id, p_tipo: tipo, p_texto: String(texto).slice(0, 500) }).then((r) => { if (r && r.error && /fetch|network/i.test(String(r.error.message))) guardarEvento(tipo, texto); }, () => guardarEvento(tipo, texto));
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

  // ---------- IA das fotos e IA própria da revenda (Edge Function anshur-ia; a chave nunca volta ao navegador) ----------
  N.ia = async (acao, corpo = {}) => {
    if (!sb) { await carregarLib(); criarCliente(); }
    const { data, error } = await sb.functions.invoke('anshur-ia', { body: Object.assign({}, corpo, { acao, revenda: N.revenda.id }) });
    if (error) {
      let m = ''; try { const j = await error.context.json(); m = j && j.erro; } catch (e) { /* sem corpo */ }
      throw new Error(m || (/fetch|network/i.test(String(error.message)) ? 'Sem conexão com o servidor.' : 'A IA não respondeu agora. Tente de novo.'));
    }
    if (data && data.erro) throw new Error(data.erro);
    return data || {};
  };
  // ---------- avisos por e-mail (só o dono muda; destinatários são da equipe) ----------
  N.avisos = async () => {
    const { data, error } = await sb.from('anshur_avisos').select('frequencia,destinatarios,atualizado').eq('revenda', N.revenda.id).maybeSingle();
    if (error) throw new Error(mensagem(error));
    return data;
  };
  N.salvarAvisos = async (frequencia, destinatarios) => { const { error } = await sb.rpc('anshur_salvar_avisos', { p_revenda: N.revenda.id, p_frequencia: frequencia, p_destinatarios: destinatarios }); if (error) throw new Error(mensagem(error)); };
  N.envios = async () => {
    const { data, error } = await sb.from('anshur_avisos_envios').select('dia,usuario,itens,status,enviado').eq('revenda', N.revenda.id).order('enviado', { ascending: false }).limit(20);
    if (error) throw new Error(mensagem(error));
    return data || [];
  };

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
    fila = []; ls.del(chaveFila()); ls.del(chaveEventos());
    ls.del(CHAVE_CACHE); ls.del(CHAVE_REVENDA);
  };
  async function sair() {
    await N.descarregar().catch(() => {});
    if (fila.length && !confirm(`${alteracoes(fila)} alterações ainda não foram enviadas ao servidor. Elas continuam guardadas neste aparelho e são enviadas quando você entrar de novo com internet. Sair mesmo assim?`)) return;
    ls.del(CHAVE_CACHE); ls.del(CHAVE_REVENDA);
    try { await sb.auth.signOut(); } catch (e) { /* sai mesmo sem rede */ }
    ls.del('anshur-auth');
    location.hash = ''; location.reload();
  }
  N.sair = sair;
  N.trocarRevenda = async () => { await N.descarregar(); ls.del(CHAVE_REVENDA); location.reload(); };

  function iniciar() {
    tela.hidden = true; tela.innerHTML = '';
    prepararVista();
    raiz.ANSHUR_NUVEM = N;
    if (N.somenteLeitura) situacao(N.motivoLeitura + (fila.length ? ` ${alteracoes(fila)} alterações guardadas neste aparelho não podem ser enviadas.` : ''), N.offline ? 'erro' : '', true);
    else if (N.offline) {
      if (fila.length) mostrarFila();
      else situacao(`Sem internet: usando a cópia deste aparelho (${new Date(N.copiaDe).toLocaleString('pt-BR')}). O que você cadastrar fica guardado e é enviado quando a internet voltar.`, 'espera', true);
    }
    carregarApp();
    // abriu com alterações guardadas de antes (aba fechada sem internet): envia agora
    if (fila.length && !N.somenteLeitura && navigator.onLine) setTimeout(sincronizar, 600);
    else if (!N.offline && sb) setTimeout(enviarEventosGuardados, 1500);
  }

  // ---------- partida ----------
  (async () => {
    carregando('Conectando…');
    try { await carregarLib(); } catch (e) { abrirOffline(); return; }
    criarCliente();
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
