(function () {
  const A = window.ANSHUR, M = window.MOTOR, G = window.GRAFICOS, K = window.COMUM;
  const { C, real, mil, pct, esc, data, diasDesde, diasEntre, hojeISO, NOMES, FICHA, estado } = K;
  const tela = document.getElementById('tela');
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  // ---------- cabeçalho ----------
  const marcaHTML = `${K.logo(30)}<span class="nome">ANSHUR</span>`;
  $('#marca').innerHTML = marcaHTML; $('#marca-movel').innerHTML = K.logo(28);
  $('#revenda').textContent = A.revenda.nome + ' · ' + A.revenda.cidade;
  $('#refdata').textContent = 'Posição de ' + new Date().toLocaleDateString('pt-BR');
  const btnPerfil = $('#perfil'), menuPerfil = $('#perfil-menu');
  btnPerfil.onclick = (e) => { e.stopPropagation(); const ab = menuPerfil.hidden; menuPerfil.hidden = !ab; btnPerfil.setAttribute('aria-expanded', ab); };
  document.addEventListener('click', (e) => { if (!menuPerfil.hidden && !menuPerfil.contains(e.target)) { menuPerfil.hidden = true; btnPerfil.setAttribute('aria-expanded', 'false'); } });
  $('#restaurar').onclick = () => {
    menuPerfil.hidden = true;
    confirmar('Restaurar dados demonstrativos?', 'As avaliações, trocas fechadas e preços alterados nesta demonstração serão apagados deste navegador.', 'Restaurar', () => { K.restaurar(); location.hash = '#visao'; location.reload(); });
  };

  // ---------- utilidades de interface ----------
  function toast(msg, erro) {
    const t = document.createElement('div'); t.className = 'toast' + (erro ? ' erro' : ''); t.setAttribute('role', erro ? 'alert' : 'status'); t.textContent = msg;
    $('#toasts').appendChild(t); setTimeout(() => { t.classList.add('saindo'); setTimeout(() => t.remove(), 220); }, 3200);
  }
  document.addEventListener('pointerdown', (e) => {
    const b = e.target.closest('.btn'); if (!b) return;
    const r = b.getBoundingClientRect(), o = document.createElement('span'), d = Math.max(r.width, r.height);
    o.className = 'onda'; o.style.cssText = `width:${d}px;height:${d}px;left:${e.clientX - r.left - d / 2}px;top:${e.clientY - r.top - d / 2}px`;
    b.appendChild(o); setTimeout(() => o.remove(), 520);
  });
  const reduzido = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FMT = { mil, pct: (v) => pct(v), int: (v) => Math.round(v).toLocaleString('pt-BR'), real, dias: (v) => Math.round(v) + ' dias' };
  function contar(raiz = tela) {
    $$('[data-conta]', raiz).forEach((el) => {
      const alvo = +el.dataset.conta, f = FMT[el.dataset.fmt || 'int'];
      if (reduzido) { el.textContent = f(alvo); return; }
      const t0 = performance.now(), dur = 800;
      const passo = (t) => { const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3); el.textContent = f(alvo * e); if (k < 1) requestAnimationFrame(passo); };
      requestAnimationFrame(passo);
      setTimeout(() => { el.textContent = f(alvo); }, dur + 150); // garante o número final mesmo com a aba em segundo plano
    });
  }
  const conta = (v, fmt) => `<span data-conta="${v}" data-fmt="${fmt}">${FMT[fmt](0)}</span>`;

  // modal e gaveta
  let fecharAtual = null;
  function abrirCamada(tipo, conteudo, aoAbrir) {
    fecharCamada(true);
    const camada = $('#camada');
    camada.innerHTML = `<div class="fundo-camada"></div><div class="${tipo}" role="dialog" aria-modal="true" tabindex="-1"><button class="fechar" type="button" aria-label="Fechar">×</button>${conteudo}</div>`;
    const fundo = camada.firstElementChild, caixa = fundo.nextElementSibling, antes = document.activeElement;
    requestAnimationFrame(() => { fundo.classList.add('aberta'); caixa.classList.add('aberta'); });
    const esc_ = (e) => { if (e.key === 'Escape') fecharCamada(); };
    document.addEventListener('keydown', esc_);
    fecharAtual = () => { document.removeEventListener('keydown', esc_); fundo.classList.remove('aberta'); caixa.classList.remove('aberta'); setTimeout(() => { if (camada.contains(caixa)) camada.innerHTML = ''; }, 280); if (antes && antes.focus) antes.focus(); };
    fundo.onclick = () => fecharCamada(); $('.fechar', caixa).onclick = () => fecharCamada();
    setTimeout(() => (caixa.querySelector('input,select,button:not(.fechar)') || caixa).focus(), 60);
    if (aoAbrir) aoAbrir(caixa);
    return caixa;
  }
  function fecharCamada(imediato) {
    if (!fecharAtual) return; const f = fecharAtual; fecharAtual = null;
    if (imediato) { $('#camada').innerHTML = ''; } else f();
  }
  function confirmar(titulo, texto, botao, aoConfirmar) {
    abrirCamada('modal', `<h2>${esc(titulo)}</h2><p class="sub">${esc(texto)}</p><div class="acoes"><button class="btn btn-ouro" type="button" id="sim">${esc(botao)}</button><button class="btn btn-linha" type="button" id="nao">Cancelar</button></div>`, (c) => {
      $('#sim', c).onclick = () => { fecharCamada(); aoConfirmar(); };
      $('#nao', c).onclick = () => fecharCamada();
    });
  }
  function baixarCSV(nome, linhas) {
    const csv = '﻿' + linhas.map((l) => l.map((c) => { const s = String(c ?? ''); return /[;"\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }).join(';')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = nome; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast('Planilha gerada: ' + nome);
  }
  const salvar = () => { if (!K.gravar(estado)) toast('Não foi possível salvar neste navegador.', true); };

  // ---------- contas ----------
  const recCache = new Map();
  // avaliação "às cegas" de uma troca: aprende com todas as outras, nunca com ela mesma
  const rec = (t) => { const k = t.id + '|' + A.margemAlvo; if (!recCache.has(k)) recCache.set(k, M.avaliar(t, { excluir: t.id })); return recCache.get(k); };

  function infoPatio(t) {
    const dias = diasDesde(t.entrada), r = rec(t), custo = C.custo(t);
    const venda = r ? r.venda : t.anuncio;
    const margem = (venda - custo) / venda;
    const faixa = C.faixaIdade(dias);
    const juros = t.pago * C.jurosMes * dias / 30;
    let acao = 'Acompanhar';
    if (dias > 90 && margem < 0.06) acao = 'Priorizar venda: margem já baixa';
    else if (t.anuncio > venda * 1.06 && dias > 45) acao = 'Revisar preço de venda';
    else if (t.preparoEst && t.preparo > t.preparoEst * 1.4) acao = 'Revisar custo de preparação';
    else if (dias > 90) acao = 'Priorizar negociação';
    else if (dias > 60) acao = 'Revisar anúncio e divulgação';
    const risco = custo * (dias / 90) * (1 + Math.max(0, 0.12 - margem) * 6);
    return { t, dias, venda, custo, margem, faixa, juros, acao, risco };
  }

  // ---------- VISÃO GERAL ----------
  function telaVisao() {
    const itens = C.patio().map(infoPatio);
    const vendidas = C.vendidas();
    const capital = itens.reduce((s, i) => s + i.t.pago, 0);
    const resultadoEst = itens.reduce((s, i) => s + i.venda - i.custo, 0);
    const margemReal = vendidas.reduce((s, t) => s + C.margem(t), 0) / Math.max(1, vendidas.length);
    const velhos = itens.filter((i) => i.dias > 90);
    const capVelho = velhos.reduce((s, i) => s + i.t.pago, 0);

    // capital imobilizado no fim de cada um dos últimos 6 meses
    const meses = [];
    for (let k = 5; k >= 0; k--) {
      const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - k + 1); d.setDate(0);
      const fim = k === 0 ? hojeISO() : d.toISOString().slice(0, 10);
      const v = A.trocas.filter((t) => t.entrada <= fim && (!t.saida || t.saida > fim)).reduce((s, t) => s + t.pago, 0);
      meses.push({ r: new Date(fim + 'T12:00:00').toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''), v });
    }
    // margem prevista x realizada nos meses com venda
    const porMes = {};
    vendidas.forEach((t) => { const k = t.saida.slice(0, 7); (porMes[k] = porMes[k] || []).push(t); });
    const ult = Object.keys(porMes).sort().slice(-6).map((k) => {
      const ts = porMes[k];
      const prev = ts.reduce((s, t) => { const r = rec(t); return s + (r ? (r.venda - t.pago - (t.preparoEst || t.preparo)) / r.venda : 0); }, 0) / ts.length;
      const realz = ts.reduce((s, t) => s + C.margem(t), 0) / ts.length;
      return { r: new Date(k + '-15T12:00:00').toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '') + ` (${ts.length})`, a: prev, b: realz };
    });
    const faixas = ['normal', 'atencao', 'alerta', 'critico'];
    const nomesF = { normal: '0–30 dias', atencao: '31–60 dias', alerta: '61–90 dias', critico: '+90 dias' };
    const idade = faixas.map((f) => { const g = itens.filter((i) => i.faixa === f); return { r: nomesF[f], v: g.reduce((s, i) => s + i.t.pago, 0), cls: f, extra: `${g.length} ${g.length === 1 ? 'máquina' : 'máquinas'}` }; });
    const agir = itens.slice().sort((a, b) => b.risco - a.risco).slice(0, 6);

    tela.innerHTML = `
      <div class="titulo"><div><h1>Visão geral</h1><p>Inteligência financeira da sua operação de usados.</p></div>
        <div class="acoes"><a class="btn btn-ouro" href="#avaliar">Nova avaliação</a><a class="btn btn-linha" href="#patio">Ver pátio completo</a></div></div>
      <div class="kpis escalonado">
        <div class="kpi"><span class="rot">Capital imobilizado</span><span class="val">${conta(capital, 'mil')}</span><span class="exp">Valor pago nas ${itens.length} máquinas ainda não vendidas.</span></div>
        <div class="kpi"><span class="rot">Margem média realizada</span><span class="val">${conta(margemReal, 'pct')}</span><span class="exp">Margem bruta das ${vendidas.length} trocas já vendidas, depois do preparo.</span></div>
        <div class="kpi"><span class="rot">Resultado bruto do estoque</span><span class="val">${conta(resultadoEst, 'mil')}</span><span class="exp">Venda estimada menos custo total. Estimativa, não lucro garantido.</span></div>
        <div class="kpi risco"><span class="rot">Estoque acima de 90 dias</span><span class="val">${velhos.length} · ${conta(capVelho, 'mil')}</span><span class="exp">Custo do dinheiro parado: ${mil(velhos.reduce((s, i) => s + i.juros, 0))} (premissa ${pct(C.jurosMes)} ao mês).</span></div>
      </div>
      <div class="grade-2">
        <section class="painel"><div class="painel-cab"><h2>Capital imobilizado nos últimos 6 meses</h2><p>Valor pago nas máquinas em estoque no fim de cada mês</p></div>${G.linha(meses)}</section>
        <section class="painel"><div class="painel-cab"><h2>Idade do estoque</h2><p>Capital por tempo de pátio</p></div>${G.horizontais(idade)}</section>
      </div>
      <section class="painel bloco"><div class="painel-cab"><h2>Margem prevista x realizada</h2><p>Por mês de venda (nº de vendas)</p></div>
        ${G.barrasDuplas(ult, ['Prevista', 'Realizada'], { largura: innerWidth >= 960 ? 1100 : 560, altura: 200 })}
        <div class="legenda"><span><i style="background:var(--cinza)"></i>Prevista pelo Anshur na entrada</span><span><i style="background:var(--ouro)"></i>Realizada na venda</span></div>
      </section>
      <section class="painel bloco"><div class="painel-cab"><h2>Onde você precisa agir</h2><p>Ordenado por risco financeiro, não só por dias</p></div>
        <div class="tabela-wrap"><table class="tabela"><thead><tr><th>Máquina</th><th class="n">Dias</th><th class="n">Capital preso</th><th class="n">Margem estimada</th><th>Risco</th><th>Recomendação</th></tr></thead>
        <tbody>${agir.map((i) => `<tr class="clicavel" tabindex="0" data-id="${i.t.id}"><td class="maq"><b>${esc(i.t.marca + ' ' + i.t.modelo)}</b><span>${NOMES[i.t.tipo]} · ${i.t.ano}</span></td>
          <td class="n">${i.dias}</td><td class="n">${mil(i.t.pago)}</td><td class="n ${i.margem < 0.06 ? 'neg' : ''}">${pct(i.margem)}</td><td><span class="tag ${i.faixa}">${C.NOMES_IDADE[i.faixa]}</span></td><td>${esc(i.acao)}</td></tr>`).join('')}</tbody></table></div>
      </section>`;
    $$('tr.clicavel', tela).forEach((tr) => { const abre = () => detalheMaquina(tr.dataset.id); tr.onclick = abre; tr.onkeydown = (e) => { if (e.key === 'Enter') abre(); }; });
    contar();
  }

  // ---------- AVALIAR ----------
  const anoAtual = new Date().getFullYear();
  const av = { passo: 1, tipo: 'trator', marca: 'Massey Ferguson', modelo: 'MF 4709', ano: anoAtual - 5, horas: 3900, local: 'Orlândia, SP', obs: '',
    ficha: { motor: 4, transmissao: 4, hidraulico: 3, pneus: 2, cabine: 4, lataria: 3 }, fotos: [], verif: { horimetro: false, notas: false, chassi: false }, declarado: '', fipe: '', anuncios: ['', '', ''] };
  const condDe = (f) => Math.round(FICHA.reduce((s, [k]) => s + f[k], 0) / FICHA.length * 20);
  const maqAv = () => ({ tipo: av.tipo, marca: av.marca, modelo: av.modelo, ano: av.ano, horas: av.horas, cond: condDe(av.ficha), ficha: { ...av.ficha } });
  const num = (s) => { const v = parseFloat(String(s).replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.')); return isFinite(v) ? v : 0; };

  function telaAvaliar() {
    const nomesPasso = ['Identificação', 'Inspeção', 'Evidências', 'Resultado'];
    tela.innerHTML = `
      <div class="titulo"><div><h1>Avaliar troca</h1><p>Quanto vale pagar no usado que o cliente oferece, com base nas trocas que a ${esc(A.revenda.nome)} já vendeu.</p></div></div>
      <nav class="etapas" aria-label="Etapas da avaliação">${nomesPasso.map((n, i) => `<button type="button" data-p="${i + 1}" ${av.passo === i + 1 ? 'aria-current="step"' : ''} class="${av.passo > i + 1 ? 'feita' : ''}">${n}</button>`).join('')}</nav>
      <div id="passo"></div>
      ${estado.avaliacoes.length ? `<section class="painel bloco"><div class="painel-cab"><h2>Avaliações registradas</h2><p>${estado.avaliacoes.length} nesta demonstração</p></div>
        <div class="tabela-wrap"><table class="tabela"><thead><tr><th>Data</th><th>Máquina</th><th class="n">Valor máximo</th><th class="n">Venda estimada</th></tr></thead><tbody>
        ${estado.avaliacoes.slice().reverse().map((a) => `<tr><td>${data(a.data)}</td><td class="maq"><b>${esc(a.maq.marca + ' ' + a.maq.modelo)}</b><span>${a.maq.ano} · ${a.maq.horas.toLocaleString('pt-BR')} h</span></td><td class="n">${mil(a.teto)}</td><td class="n">${mil(a.venda)}</td></tr>`).join('')}</tbody></table></div></section>` : ''}`;
    $$('.etapas button', tela).forEach((b) => b.onclick = () => irPasso(+b.dataset.p));
    desenharPasso();
  }
  function irPasso(p) {
    if (p > 1 && !(av.horas > 0)) { av.passo = 1; desenharPasso(); toast('Informe as horas do horímetro para continuar.', true); return; }
    av.passo = p;
    $$('.etapas button', tela).forEach((b) => { const n = +b.dataset.p; b.classList.toggle('feita', n < p); if (n === p) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current'); });
    desenharPasso(); window.scrollTo({ top: 0, behavior: reduzido ? 'auto' : 'smooth' });
  }
  const navPasso = (ultimo) => `<div class="acoes">${av.passo > 1 ? '<button class="btn btn-linha" type="button" data-ir="-1">Voltar</button>' : ''}${ultimo ? '' : '<button class="btn btn-ouro" type="button" data-ir="1">Continuar</button>'}</div>`;

  function desenharPasso() {
    const caixa = $('#passo'); if (!caixa) return;
    const tipos = Object.keys(NOMES);
    const marcas = [...new Set(A.modelos.filter((m) => m.tipo === av.tipo).map((m) => m.marca))];
    if (!marcas.includes(av.marca)) av.marca = marcas[0];
    const modelos = A.modelos.filter((m) => m.tipo === av.tipo && m.marca === av.marca);
    if (!modelos.some((m) => m.modelo === av.modelo)) av.modelo = modelos[0].modelo;
    const anos = []; for (let a = anoAtual; a >= anoAtual - 15; a--) anos.push(a);
    let h = '';
    if (av.passo === 1) h = `<section class="painel passo"><h2>Identificação da máquina</h2><div class="campos tres" style="margin-top:14px">
        <div class="campo"><label for="f-tipo">Categoria</label><select id="f-tipo">${tipos.map((k) => `<option value="${k}" ${k === av.tipo ? 'selected' : ''}>${NOMES[k]}</option>`).join('')}</select></div>
        <div class="campo"><label for="f-marca">Fabricante</label><select id="f-marca">${marcas.map((m) => `<option ${m === av.marca ? 'selected' : ''}>${esc(m)}</option>`).join('')}</select></div>
        <div class="campo"><label for="f-modelo">Modelo</label><select id="f-modelo">${modelos.map((m) => `<option ${m.modelo === av.modelo ? 'selected' : ''}>${esc(m.modelo)}</option>`).join('')}</select></div>
        <div class="campo"><label for="f-ano">Ano</label><select id="f-ano">${anos.map((a) => `<option ${a === av.ano ? 'selected' : ''}>${a}</option>`).join('')}</select></div>
        <div class="campo"><label for="f-horas">Horas trabalhadas</label><input id="f-horas" type="number" inputmode="numeric" min="0" step="10" value="${av.horas || ''}" required aria-describedby="e-horas"><span class="erro-campo" id="e-horas"></span></div>
        <div class="campo"><label for="f-local">Localização da máquina</label><input id="f-local" value="${esc(av.local)}" autocomplete="off"></div>
        <div class="campo inteiro"><label for="f-obs">Informações adicionais</label><textarea id="f-obs" rows="2" placeholder="Ex.: piloto automático, pneus novos há 1 safra">${esc(av.obs)}</textarea></div>
      </div>${navPasso()}</section>`;
    if (av.passo === 2) { const c = condDe(av.ficha); h = `<section class="painel passo"><div class="painel-cab"><h2>Inspeção</h2><p>Nota de 1 (ruim) a 5 (ótimo)</p></div>
        <p class="ajuda">Na versão da revenda, a IA lê as fotos e sugere as notas; o avaliador confere e corrige.</p>
        ${FICHA.map(([k, n, d]) => `<div class="criterio"><div><b id="r-${k}">${n}</b><p>${d}</p></div><div class="notas" role="group" aria-labelledby="r-${k}">${[1, 2, 3, 4, 5].map((v) => `<button type="button" data-k="${k}" data-v="${v}" aria-pressed="${av.ficha[k] === v}">${v}</button>`).join('')}</div></div>`).join('')}
        <div style="margin-top:16px"><span class="rot-campo">Nota geral</span> <b id="nota-geral">${c}/100</b><div class="medidor"><i id="medidor" style="width:${c}%"></i></div></div>${navPasso()}</section>`; }
    if (av.passo === 3) h = `<section class="painel passo"><h2>Documentação e evidências</h2>
        <div class="fotos" style="margin-top:14px">${['Frente', 'Lateral', 'Horímetro', 'Pneus'].map((n, i) => `<label class="foto ${av.fotos[i] ? 'tem' : ''}" style="${av.fotos[i] ? `background-image:url(${av.fotos[i]})` : ''}">${n}<input type="file" accept="image/*" capture="environment" data-i="${i}" aria-label="Foto: ${n}"></label>`).join('')}</div>
        <p class="ajuda" style="margin-top:6px">As fotos ficam só neste aparelho.</p>
        <div class="campos" style="margin-top:18px">
          <div class="campo inteiro"><span class="rot-campo">Verificado pela revenda</span><div class="checks">
            <label class="check"><input type="checkbox" data-v="horimetro" ${av.verif.horimetro ? 'checked' : ''}> Horímetro conferido com foto</label>
            <label class="check"><input type="checkbox" data-v="notas" ${av.verif.notas ? 'checked' : ''}> Notas ou ordens de serviço entregues</label>
            <label class="check"><input type="checkbox" data-v="chassi" ${av.verif.chassi ? 'checked' : ''}> Chassi e número de série conferidos</label></div></div>
          <div class="campo inteiro"><label for="f-decl">Declarado pelo cliente (ainda sem comprovante)</label><textarea id="f-decl" rows="2" placeholder="Ex.: motor retificado em 2023, sempre revisado na concessionária">${esc(av.declarado)}</textarea></div>
          <div class="campo"><label for="f-fipe">Tabela Fipe desta máquina (opcional)</label><input id="f-fipe" inputmode="numeric" placeholder="R$" value="${esc(av.fipe)}"></div>
          <div class="campo"><span class="rot-campo">Anúncios parecidos (opcional)</span><div style="display:flex;gap:6px">${av.anuncios.map((a, i) => `<input aria-label="Preço do anúncio ${i + 1}" data-an="${i}" inputmode="numeric" placeholder="R$" value="${esc(a)}" style="min-height:42px;padding:9px;border-radius:6px;border:1px solid rgba(242,238,229,.16);background:var(--marinho);width:100%">`).join('')}</div></div>
        </div>${navPasso()}</section>`;
    if (av.passo === 4) h = `<div class="passo" id="resultado"></div>`;
    caixa.innerHTML = h;
    $$('[data-ir]', caixa).forEach((b) => b.onclick = () => irPasso(av.passo + +b.dataset.ir));
    if (av.passo === 1) {
      $('#f-tipo').onchange = (e) => { av.tipo = e.target.value; desenharPasso(); };
      $('#f-marca').onchange = (e) => { av.marca = e.target.value; desenharPasso(); };
      $('#f-modelo').onchange = (e) => { av.modelo = e.target.value; };
      $('#f-ano').onchange = (e) => { av.ano = +e.target.value; };
      $('#f-horas').oninput = (e) => { av.horas = Math.max(0, +e.target.value || 0); $('#e-horas').textContent = av.horas > 0 ? '' : 'Informe as horas do horímetro.'; };
      $('#f-local').oninput = (e) => { av.local = e.target.value; };
      $('#f-obs').oninput = (e) => { av.obs = e.target.value; };
    }
    if (av.passo === 2) $$('.notas button', caixa).forEach((b) => b.onclick = () => {
      av.ficha[b.dataset.k] = +b.dataset.v; $$('button', b.parentNode).forEach((x) => x.setAttribute('aria-pressed', x === b));
      const c = condDe(av.ficha); $('#nota-geral').textContent = c + '/100'; $('#medidor').style.width = c + '%';
    });
    if (av.passo === 3) {
      $$('input[type=file]', caixa).forEach((inp) => inp.onchange = () => {
        const arq = inp.files[0]; if (!arq) return;
        const img = new Image(), url = URL.createObjectURL(arq);
        img.onload = () => {
          const cv = document.createElement('canvas'), k = Math.min(1, 640 / Math.max(img.width, img.height));
          cv.width = img.width * k; cv.height = img.height * k; cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
          av.fotos[+inp.dataset.i] = cv.toDataURL('image/jpeg', 0.72); URL.revokeObjectURL(url);
          const lab = inp.parentNode; lab.classList.add('tem'); lab.style.backgroundImage = `url(${av.fotos[+inp.dataset.i]})`;
          toast('Foto adicionada.');
        };
        img.onerror = () => toast('Não foi possível ler essa imagem.', true);
        img.src = url;
      });
      $$('[data-v]', caixa).forEach((c) => c.onchange = () => { av.verif[c.dataset.v] = c.checked; });
      $('#f-decl').oninput = (e) => { av.declarado = e.target.value; };
      $('#f-fipe').oninput = (e) => { av.fipe = e.target.value; };
      $$('[data-an]', caixa).forEach((i) => i.oninput = () => { av.anuncios[+i.dataset.an] = i.value; });
    }
    if (av.passo === 4) desenharResultado();
  }

  function desenharResultado() {
    const maq = maqAv(), r = M.avaliar(maq), caixa = $('#resultado');
    if (!r) { caixa.innerHTML = '<section class="painel vazio">Histórico insuficiente para avaliar esta máquina.</section>'; return; }
    const fipe = num(av.fipe), anuncios = av.anuncios.map(num).filter((v) => v > 0);
    const mediaAn = anuncios.length ? anuncios.reduce((s, v) => s + v, 0) / anuncios.length : 0;
    caixa.innerHTML = `
      <div class="grade-2">
        <div>
          <section class="res-topo">
            <span class="rot">VALOR MÁXIMO RECOMENDADO NA TROCA</span>
            <div class="grande">${conta(r.teto, 'real')}</div>
            <p class="sub">Faixa de negociação: ${real(r.faixa[0])} a ${real(r.faixa[1])}</p>
            <span class="conf ${r.confianca}">Confiança ${r.confianca} · ${r.doTipo} trocas de ${NOMES[maq.tipo].toLowerCase()}, ${r.mesmoModelo} do mesmo modelo</span>
          </section>
          <section class="painel bloco">
            <div class="numeros">
              <div><span>Venda estimada</span><b>${real(r.venda)}</b></div>
              <div><span>Preparação estimada</span><b>${real(r.preparo)}</b></div>
              <div><span>Resultado bruto projetado</span><b>${real(r.resultado)}</b></div>
              <div><span>Margem sobre a venda</span><b>${pct(r.margemSobreVenda, 2)}</b></div>
              <div><span>Tempo estimado de pátio</span><b>${r.dias ? r.dias + ' dias' : '—'}</b></div>
              <div><span>Margem-alvo (premissa)</span><b>${pct(r.margem, 0)}</b></div>
            </div>
            <p class="conta">Conta: ${real(r.venda)} de venda − ${real(r.teto)} pagos na troca − ${real(r.preparo)} de preparo = ${real(r.resultado)}.</p>
            ${fipe || mediaAn ? `<div class="conta">${fipe ? `Fipe informada: ${real(fipe)}. O valor máximo fica ${pct(1 - r.teto / fipe)} abaixo, porque a troca precisa deixar margem e pagar o preparo. ` : ''}${mediaAn ? `Média de ${anuncios.length} ${anuncios.length === 1 ? 'anúncio' : 'anúncios'}: ${real(mediaAn)}. Anúncio é preço pedido, não preço vendido; a venda estimada fica ${pct(Math.abs(1 - r.venda / mediaAn))} ${r.venda < mediaAn ? 'abaixo' : 'acima'}.` : ''}</div>` : ''}
          </section>
        </div>
        <div>
          <section class="painel"><h2>Por que recomendamos este valor?</h2>
            <ul class="lista-motivos" style="margin-top:10px">
              ${r.motivos.map((m) => `<li><span>${m.nome} comparado às máquinas do mesmo tipo</span><b class="${m.valor >= 0 ? 'pos' : 'neg'}">${m.valor >= 0 ? '+' : '−'} ${mil(Math.abs(m.valor))}</b></li>`).join('')}
              <li><span>Preparação pelo estado da inspeção (${maq.cond}/100)</span><b class="neg">− ${mil(r.preparo)}</b></li>
              <li><span>Margem-alvo da revenda</span><b class="neg">− ${mil(r.venda * r.margem)}</b></li>
            </ul>
            ${r.limites.length ? `<p class="nota-rodape"><b>Limitações:</b> ${r.limites.map(esc).join(' ')}</p>` : ''}
          </section>
          <section class="painel bloco"><h2>Trocas semelhantes já vendidas</h2><div class="comparaveis" style="margin-top:10px">
            ${r.comp.map((t) => `<div class="comp"><div><b>${esc(t.marca + ' ' + t.modelo)} · ${t.ano}</b><span>${t.horas.toLocaleString('pt-BR')} h · pago ${mil(t.pago)} · ${t.diasPatio} dias</span></div><div style="text-align:right"><b>${mil(t.vendido)}</b><span>vendido</span></div></div>`).join('')}
          </div></section>
        </div>
      </div>
      <div class="acoes"><button class="btn btn-linha" type="button" data-ir="-1">Voltar</button><button class="btn btn-linha" type="button" id="registrar">Registrar avaliação</button><button class="btn btn-linha" type="button" id="premissas">Ajustar premissas</button><button class="btn btn-ouro" type="button" id="fechar-troca">Fechar troca</button></div>
      <p class="nota-rodape">O valor máximo é uma recomendação. Quem decide o valor pago é o gerente.</p>`;
    $('[data-ir]', caixa).onclick = () => irPasso(3);
    $('#registrar').onclick = (e) => {
      const b = e.currentTarget; b.classList.add('carregando');
      setTimeout(() => { estado.avaliacoes.push({ id: 'AV' + Date.now(), data: hojeISO(), maq, teto: r.teto, venda: r.venda }); salvar(); b.classList.remove('carregando'); toast('Avaliação registrada.'); telaAvaliar(); }, 450);
    };
    $('#premissas').onclick = () => abrirCamada('modal', `<h2>Ajustar premissas</h2><p class="sub">A margem-alvo é uma decisão comercial da revenda. Ela muda o valor máximo de todas as avaliações.</p>
      <div class="campo" style="margin-top:16px"><label for="m-margem">Margem-alvo: <b id="m-val">${pct(A.margemAlvo, 0)}</b></label><input class="deslizar" id="m-margem" type="range" min="8" max="22" step="1" value="${Math.round(A.margemAlvo * 100)}"></div>
      <div class="acoes"><button class="btn btn-ouro" type="button" id="m-ok">Aplicar</button><button class="btn btn-linha" type="button" id="m-pad">Voltar para 14%</button></div>`, (c) => {
      const s = $('#m-margem', c); s.oninput = () => { $('#m-val', c).textContent = s.value + '%'; };
      const aplicar = (v) => { A.margemAlvo = v / 100; estado.margem = A.margemAlvo; salvar(); fecharCamada(); desenharResultado(); toast('Margem-alvo ajustada para ' + v + '%.'); };
      $('#m-ok', c).onclick = () => aplicar(+s.value); $('#m-pad', c).onclick = () => aplicar(14);
    });
    $('#fechar-troca').onclick = () => abrirCamada('modal', `<h2>Fechar troca</h2><p class="sub">Registre o valor efetivamente negociado. Ele pode ser diferente do valor máximo recomendado.</p>
      <div class="campos" style="margin-top:16px">
        <div class="campo"><label for="t-valor">Valor pago na troca</label><input id="t-valor" inputmode="numeric" value="${r.teto.toLocaleString('pt-BR')}"></div>
        <div class="campo"><label for="t-data">Data</label><input id="t-data" type="date" value="${hojeISO()}" max="${hojeISO()}"></div>
      </div>
      <p class="conta" id="t-aviso">Valor máximo recomendado: ${real(r.teto)}.</p>
      <div class="acoes"><button class="btn btn-ouro" type="button" id="t-ok">Confirmar troca</button><button class="btn btn-linha" type="button" id="t-nao">Cancelar</button></div>`, (c) => {
      const inp = $('#t-valor', c), aviso = $('#t-aviso', c);
      const checar = () => { const v = num(inp.value), d = v - r.teto; aviso.innerHTML = !(v > 0) ? '<span class="neg">Informe o valor pago.</span>' : d > 0 ? `<span class="neg">${real(d)} acima do valor máximo recomendado. A margem projetada cai para ${pct((r.venda - v - r.preparo) / r.venda)}.</span>` : `Dentro do valor máximo recomendado (${real(r.teto)}). Margem projetada: ${pct((r.venda - v - r.preparo) / r.venda)}.`; };
      inp.oninput = checar; checar();
      $('#t-nao', c).onclick = () => fecharCamada();
      $('#t-ok', c).onclick = (e) => {
        const v = num(inp.value), dt = $('#t-data', c).value || hojeISO();
        if (!(v > 0)) { inp.focus(); toast('Informe o valor pago na troca.', true); return; }
        const b = e.currentTarget; b.classList.add('carregando');
        setTimeout(() => {
          const id = 'D' + String(estado.fechadas.length + 1).padStart(3, '0');
          const anuncio = Math.round(r.venda * 1.08 / 1000) * 1000;
          const t = { ...maq, id, pago: Math.round(v), preparo: r.preparo, preparoEst: r.preparo, recomendado: r.teto, vendido: null, entrada: dt, saida: null, diasPatio: null, anuncio,
            precos: [{ data: dt, valor: anuncio, motivo: 'Anúncio inicial' }], vendedor: 'Avaliação da demonstração', origem: av.local || 'Troca da demonstração', idAgro: false,
            manutencoes: av.declarado ? [{ servico: av.declarado, horas: av.horas, comNota: av.verif.notas }] : [], fotos: av.fotos.filter(Boolean), verif: { ...av.verif } };
          estado.fechadas.push(t); A.trocas.push(t); salvar(); recCache.clear();
          fecharCamada(true);
          abrirCamada('modal', `<h2>Troca registrada</h2><p class="sub">${esc(t.marca + ' ' + t.modelo)} entrou no pátio por ${real(t.pago)}. O passaporte foi criado e a visão geral já foi atualizada.</p>
            <div class="acoes"><a class="btn btn-ouro" href="passaporte.html?id=${id}">Abrir passaporte</a><a class="btn btn-linha" href="#patio" id="ir-patio">Ver no pátio</a></div>`, (cc) => { $('#ir-patio', cc).onclick = () => fecharCamada(true); });
          toast('Troca registrada no pátio.');
        }, 500);
      };
    });
    contar(caixa);
  }

  // ---------- PÁTIO ----------
  const fp = { tipo: '', marca: '', idade: '', ordem: 'risco' };
  function telaPatio() {
    const todos = C.patio().map(infoPatio);
    let itens = todos.filter((i) => (!fp.tipo || i.t.tipo === fp.tipo) && (!fp.marca || i.t.marca === fp.marca) && (!fp.idade || i.faixa === fp.idade));
    const ord = { risco: (a, b) => b.risco - a.risco, capital: (a, b) => b.t.pago - a.t.pago, dias: (a, b) => b.dias - a.dias, margem: (a, b) => a.margem - b.margem };
    itens.sort(ord[fp.ordem]);
    const cap = itens.reduce((s, i) => s + i.t.pago, 0), velhos = itens.filter((i) => i.dias > 90);
    const marcas = [...new Set(todos.map((i) => i.t.marca))].sort();
    tela.innerHTML = `
      <div class="titulo"><div><h1>Pátio de máquinas</h1><p>Saiba onde seu capital está parado e quais equipamentos exigem atenção.</p></div>
        <div class="acoes"><button class="btn btn-linha" type="button" id="exportar"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg>Exportar planilha</button></div></div>
      <div class="kpis escalonado">
        <div class="kpi"><span class="rot">Máquinas no pátio</span><span class="val">${conta(itens.length, 'int')}</span></div>
        <div class="kpi"><span class="rot">Capital imobilizado</span><span class="val">${conta(cap, 'mil')}</span></div>
        <div class="kpi"><span class="rot">Permanência média</span><span class="val">${conta(itens.reduce((s, i) => s + i.dias, 0) / Math.max(1, itens.length), 'dias')}</span></div>
        <div class="kpi risco"><span class="rot">Acima de 90 dias</span><span class="val">${velhos.length} · ${mil(velhos.reduce((s, i) => s + i.t.pago, 0))}</span></div>
      </div>
      <div class="filtros">
        <div class="campo"><label for="p-tipo">Categoria</label><select id="p-tipo"><option value="">Todas</option>${Object.keys(NOMES).map((k) => `<option value="${k}" ${fp.tipo === k ? 'selected' : ''}>${NOMES[k]}</option>`).join('')}</select></div>
        <div class="campo"><label for="p-marca">Fabricante</label><select id="p-marca"><option value="">Todos</option>${marcas.map((m) => `<option ${fp.marca === m ? 'selected' : ''}>${esc(m)}</option>`).join('')}</select></div>
        <div class="campo"><label for="p-idade">Tempo de pátio</label><select id="p-idade"><option value="">Todos</option>${['normal', 'atencao', 'alerta', 'critico'].map((f) => `<option value="${f}" ${fp.idade === f ? 'selected' : ''}>${C.NOMES_IDADE[f]}</option>`).join('')}</select></div>
        <div class="campo"><label for="p-ordem">Ordenar por</label><select id="p-ordem">${[['risco', 'Maior risco de margem'], ['capital', 'Maior capital imobilizado'], ['dias', 'Maior tempo no pátio'], ['margem', 'Menor margem projetada']].map(([v, n]) => `<option value="${v}" ${fp.ordem === v ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
      </div>
      <section class="painel"><div class="tabela-wrap"><table class="tabela"><thead><tr><th>Máquina</th><th>Entrada</th><th class="n">Dias</th><th class="n">Aquisição</th><th class="n">Preparo</th><th class="n">Custo total</th><th class="n">Anunciado</th><th class="n">Venda estimada</th><th class="n">Margem</th><th>Situação</th></tr></thead>
        <tbody>${itens.length ? itens.map((i) => `<tr class="clicavel" tabindex="0" data-id="${i.t.id}"><td class="maq"><b>${esc(i.t.marca + ' ' + i.t.modelo)}</b><span>${NOMES[i.t.tipo]} · ${i.t.ano} · ${i.t.horas.toLocaleString('pt-BR')} h</span></td>
          <td>${data(i.t.entrada)}</td><td class="n">${i.dias} <span class="tag ${i.faixa}">${C.NOMES_IDADE[i.faixa]}</span></td><td class="n">${mil(i.t.pago)}</td><td class="n">${mil(i.t.preparo)}</td><td class="n">${mil(i.custo)}</td><td class="n">${mil(i.t.anuncio)}</td><td class="n">${mil(i.venda)}</td>
          <td class="n ${i.margem < 0.06 ? 'neg' : ''}">${pct(i.margem)}</td><td>${esc(i.acao)}</td></tr>`).join('') : '<tr><td colspan="10" class="vazio">Nenhuma máquina com esses filtros.</td></tr>'}</tbody></table></div>
        <p class="nota-rodape">Toque numa máquina para ver os detalhes, simular redução de preço e abrir o passaporte.</p></section>`;
    ['tipo', 'marca', 'idade', 'ordem'].forEach((k) => { $('#p-' + k).onchange = (e) => { fp[k] = e.target.value; telaPatio(); }; });
    $$('tr.clicavel', tela).forEach((tr) => { const abre = () => detalheMaquina(tr.dataset.id); tr.onclick = abre; tr.onkeydown = (e) => { if (e.key === 'Enter') abre(); }; });
    $('#exportar').onclick = () => baixarCSV('anshur-patio.csv', [['Máquina', 'Categoria', 'Ano', 'Horas', 'Entrada', 'Dias', 'Aquisição', 'Preparo', 'Custo total', 'Anunciado', 'Venda estimada', 'Margem projetada', 'Situação']]
      .concat(itens.map((i) => [i.t.marca + ' ' + i.t.modelo, NOMES[i.t.tipo], i.t.ano, i.t.horas, data(i.t.entrada), i.dias, i.t.pago, i.t.preparo, i.custo, i.t.anuncio, i.venda, (i.margem * 100).toFixed(1).replace('.', ',') + '%', i.acao])));
    contar();
  }

  function detalheMaquina(id) {
    const t = A.trocas.find((x) => x.id === id); if (!t) return;
    const i = infoPatio(t);
    const mov = [{ data: t.entrada, txt: `Entrada no pátio por ${real(t.pago)}` }, { data: t.entrada, txt: `Preparo: ${real(t.preparo)}${t.preparoEst ? ` (previsto ${real(t.preparoEst)})` : ''}` }]
      .concat((t.precos || []).map((p) => ({ data: p.data, txt: `${p.motivo}: ${real(p.valor)}` }))).sort((a, b) => a.data.localeCompare(b.data));
    abrirCamada('gaveta', `
      <span class="tag ${i.faixa}">${C.NOMES_IDADE[i.faixa]} · ${i.dias} dias</span>
      <h2 style="font-size:22px;margin-top:10px">${esc(t.marca + ' ' + t.modelo)}</h2><p class="sub">${NOMES[t.tipo]} · ${t.ano} · ${t.horas.toLocaleString('pt-BR')} h · ${esc(t.origem)}</p>
      <div class="det">
        <div><span>Aquisição</span><b>${real(t.pago)}</b></div><div><span>Preparação</span><b>${real(t.preparo)}</b></div>
        <div><span>Custo total</span><b>${real(i.custo)}</b></div><div><span>Preço anunciado</span><b>${real(t.anuncio)}</b></div>
        <div><span>Venda estimada</span><b>${real(i.venda)}</b></div><div><span>Margem projetada</span><b class="${i.margem < 0.06 ? 'neg' : ''}">${pct(i.margem)}</b></div>
        <div><span>Custo do dinheiro parado</span><b>${real(i.juros)}</b></div><div><span>Recomendação</span><b>${esc(i.acao)}</b></div>
      </div>
      <section class="painel" style="margin-top:6px"><h2>Simular redução de preço</h2>
        <p class="sub" style="margin:4px 0 12px">Só simula. Os valores da máquina não mudam até você aplicar.</p>
        <label class="rot-campo" for="sim">Redução sobre o anúncio: <b id="sim-pct">0%</b></label>
        <input class="deslizar" id="sim" type="range" min="0" max="15" step="1" value="0">
        <div class="det" id="sim-res"></div>
        <button class="btn btn-linha" type="button" id="aplicar" disabled>Aplicar novo preço</button>
      </section>
      <section style="margin-top:18px"><h2 style="font-size:15px;margin-bottom:12px">Histórico de movimentações</h2>
        <ul class="linha-tempo">${mov.map((m) => `<li>${esc(m.txt)}<span>${data(m.data)}</span></li>`).join('')}</ul></section>
      <div class="acoes"><a class="btn btn-ouro" href="passaporte.html?id=${t.id}">Abrir passaporte</a></div>`, (c) => {
      const s = $('#sim', c), res = $('#sim-res', c), ap = $('#aplicar', c);
      const atual = () => {
        const p = +s.value / 100, novo = Math.round(t.anuncio * (1 - p) / 1000) * 1000;
        // vendas costumam fechar abaixo do anúncio; usamos a mesma relação atual entre venda estimada e anúncio
        const vendaNova = Math.min(i.venda, novo * Math.min(1, i.venda / t.anuncio)) || novo;
        const m = (vendaNova - i.custo) / vendaNova;
        $('#sim-pct', c).textContent = s.value + '%';
        res.innerHTML = `<div><span>Novo anúncio</span><b>${real(novo)}</b></div><div><span>Margem projetada</span><b class="${m < 0.06 ? 'neg' : ''}">${pct(m)} <small class="sub">(hoje ${pct(i.margem)})</small></b></div><div><span>Resultado bruto</span><b>${real(vendaNova - i.custo)}</b></div><div><span>Diferença</span><b class="neg">${real(vendaNova - i.venda)}</b></div>`;
        ap.disabled = !(+s.value > 0); ap.dataset.novo = novo;
      };
      s.oninput = atual; atual();
      ap.onclick = () => confirmar('Aplicar novo preço?', `O anúncio passa de ${real(t.anuncio)} para ${real(+ap.dataset.novo)}.`, 'Aplicar', () => {
        const reg = { data: hojeISO(), valor: +ap.dataset.novo, motivo: 'Redução de preço' };
        (estado.precos[t.id] = estado.precos[t.id] || []).push(reg); t.precos = (t.precos || []).concat(reg); t.anuncio = reg.valor; salvar();
        toast('Novo preço aplicado.'); rota();
      });
    });
  }

  // ---------- INTELIGÊNCIA DE TROCAS ----------
  const ft = { periodo: 'tudo', tipo: '', resultado: '' };
  function telaTrocas() {
    const limite = ft.periodo === 'tudo' ? '' : (() => { const d = new Date(); d.setMonth(d.getMonth() - +ft.periodo); return d.toISOString().slice(0, 10); })();
    const vend = C.vendidas().filter((t) => (!limite || t.saida >= limite) && (!ft.tipo || t.tipo === ft.tipo) && (!ft.resultado || (ft.resultado === 'pos' ? C.resultado(t) >= 0 : C.resultado(t) < 0)))
      .sort((a, b) => b.saida.localeCompare(a.saida));
    const linhas = vend.map((t) => { const r = rec(t); return { t, r, dif: r ? t.pago - r.teto : 0, res: C.resultado(t), m: C.margem(t) }; });
    const prej = linhas.filter((l) => l.res < 0);
    const excesso = linhas.reduce((s, l) => s + Math.max(0, l.dif), 0);
    // fontes de perda calculadas dos registros
    const fontes = [
      { r: 'Pago acima do recomendado', v: excesso, cls: 'critico', extra: `${linhas.filter((l) => l.dif > 0).length} trocas` },
      { r: 'Preparo acima do previsto', v: linhas.reduce((s, l) => s + Math.max(0, l.t.preparo - (l.t.preparoEst || l.t.preparo)), 0), cls: 'alerta', extra: `${linhas.filter((l) => l.t.preparoEst && l.t.preparo > l.t.preparoEst).length} trocas` },
      { r: 'Venda abaixo da estimativa', v: linhas.reduce((s, l) => s + Math.max(0, (l.r ? l.r.venda : l.t.vendido) - l.t.vendido), 0), cls: 'atencao', extra: `${linhas.filter((l) => l.r && l.r.venda > l.t.vendido).length} trocas` },
      { r: 'Pátio acima de 90 dias', v: linhas.reduce((s, l) => s + l.t.pago * C.jurosMes * Math.max(0, l.t.diasPatio - 90) / 30, 0), cls: 'neutro', extra: `custo do dinheiro, premissa ${pct(C.jurosMes)} a.m.` }
    ].sort((a, b) => b.v - a.v);
    const porTri = {};
    vend.forEach((t) => { const d = new Date(t.saida + 'T12:00:00'), k = d.getFullYear() + ' T' + (Math.floor(d.getMonth() / 3) + 1); (porTri[k] = porTri[k] || []).push(C.margem(t)); });
    const tri = Object.keys(porTri).sort().map((k) => ({ r: k.slice(2), v: porTri[k].reduce((s, v) => s + v, 0) / porTri[k].length }));
    const perdasTipo = Object.keys(NOMES).map((k) => ({ r: NOMES[k].split(' ')[0], v: -prej.filter((l) => l.t.tipo === k).reduce((s, l) => s + l.res, 0), cls: 'critico', extra: `${prej.filter((l) => l.t.tipo === k).length} com prejuízo` })).filter((p) => p.v > 0);

    tela.innerHTML = `
      <div class="titulo"><div><h1>Inteligência de trocas</h1><p>Onde a revenda ganhou e onde perdeu dinheiro nas trocas já vendidas.</p></div>
        <div class="acoes"><button class="btn btn-linha" type="button" id="exportar"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg>Exportar planilha</button></div></div>
      <div class="filtros">
        <div class="campo"><label for="t-per">Período</label><select id="t-per">${[['12', 'Últimos 12 meses'], ['24', 'Últimos 24 meses'], ['tudo', 'Todo o histórico']].map(([v, n]) => `<option value="${v}" ${ft.periodo === v ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
        <div class="campo"><label for="t-tipo">Categoria</label><select id="t-tipo"><option value="">Todas</option>${Object.keys(NOMES).map((k) => `<option value="${k}" ${ft.tipo === k ? 'selected' : ''}>${NOMES[k]}</option>`).join('')}</select></div>
        <div class="campo"><label for="t-res">Resultado</label><select id="t-res"><option value="">Todos</option><option value="pos" ${ft.resultado === 'pos' ? 'selected' : ''}>Positivo</option><option value="neg" ${ft.resultado === 'neg' ? 'selected' : ''}>Negativo</option></select></div>
      </div>
      <div class="kpis escalonado">
        <div class="kpi"><span class="rot">Trocas vendidas</span><span class="val">${conta(linhas.length, 'int')}</span><span class="exp">Margem média ${pct(linhas.reduce((s, l) => s + l.m, 0) / Math.max(1, linhas.length))}</span></div>
        <div class="kpi"><span class="rot">Resultado bruto acumulado</span><span class="val">${conta(linhas.reduce((s, l) => s + l.res, 0), 'mil')}</span><span class="exp">Venda menos aquisição e preparo.</span></div>
        <div class="kpi risco"><span class="rot">Trocas com prejuízo</span><span class="val">${prej.length} · ${mil(-prej.reduce((s, l) => s + l.res, 0))}</span><span class="exp">Venderam por menos do que custaram.</span></div>
        <div class="kpi"><span class="rot">Pago acima do recomendado</span><span class="val">${conta(excesso, 'mil')}</span><span class="exp">Soma do que foi pago além do valor máximo que o Anshur indicaria.</span></div>
      </div>
      <div class="grade-3">
        <section class="painel"><div class="painel-cab"><h2>Principais fontes de perda</h2></div>${G.horizontais(fontes)}</section>
        <section class="painel"><div class="painel-cab"><h2>Margem realizada</h2><p>Por trimestre de venda</p></div>${tri.length > 1 ? G.linha(tri, { formato: (v) => pct(v), altura: 200 }) : '<p class="vazio">Poucos dados no período.</p>'}</section>
        <section class="painel"><div class="painel-cab"><h2>Perdas por categoria</h2></div>${perdasTipo.length ? G.horizontais(perdasTipo) : '<p class="vazio">Nenhuma troca com prejuízo no filtro.</p>'}</section>
      </div>
      <section class="painel bloco"><div class="tabela-wrap"><table class="tabela"><thead><tr><th>Venda</th><th>Máquina</th><th class="n">Recomendado</th><th class="n">Pago</th><th class="n">Diferença</th><th class="n">Preparo</th><th class="n">Venda</th><th class="n">Margem</th><th class="n">Resultado</th></tr></thead>
        <tbody>${linhas.length ? linhas.map((l) => `<tr><td>${data(l.t.saida)}</td><td class="maq"><b>${esc(l.t.marca + ' ' + l.t.modelo)}</b><span>${l.t.ano} · ${l.t.horas.toLocaleString('pt-BR')} h · ${l.t.diasPatio} dias</span></td>
          <td class="n">${l.r ? mil(l.r.teto) : '—'}</td><td class="n">${mil(l.t.pago)}</td><td class="n ${l.dif > 0 ? 'neg' : 'pos'}">${l.dif > 0 ? '+' : ''}${mil(l.dif)}</td><td class="n">${mil(l.t.preparo)}</td><td class="n">${mil(l.t.vendido)}</td>
          <td class="n ${l.m < 0 ? 'neg' : ''}">${pct(l.m)}</td><td class="n ${l.res < 0 ? 'neg' : 'pos'}">${mil(l.res)}</td></tr>`).join('') : '<tr><td colspan="9" class="vazio">Nenhuma troca com esses filtros.</td></tr>'}</tbody></table></div>
        <p class="nota-rodape">"Recomendado" é a avaliação às cegas: o Anshur avalia cada troca aprendendo só com as outras.</p></section>`;
    [['t-per', 'periodo'], ['t-tipo', 'tipo'], ['t-res', 'resultado']].forEach(([i, k]) => { $('#' + i).onchange = (e) => { ft[k] = e.target.value; telaTrocas(); }; });
    $('#exportar').onclick = () => baixarCSV('anshur-trocas.csv', [['Data da venda', 'Máquina', 'Categoria', 'Ano', 'Horas', 'Recomendado', 'Pago', 'Diferença', 'Preparo', 'Venda', 'Margem', 'Resultado', 'Dias no pátio']]
      .concat(linhas.map((l) => [data(l.t.saida), l.t.marca + ' ' + l.t.modelo, NOMES[l.t.tipo], l.t.ano, l.t.horas, l.r ? l.r.teto : '', l.t.pago, l.dif, l.t.preparo, l.t.vendido, (l.m * 100).toFixed(1).replace('.', ',') + '%', l.res, l.t.diasPatio])));
    contar();
  }

  // ---------- TESTE ÀS CEGAS ----------
  const tc = { modo: 'revenda', selecionadas: null, importadas: null, texto: '' };
  function telaTeste() {
    const recentes = C.vendidas().filter((t) => /^T/.test(t.id)).sort((a, b) => b.saida.localeCompare(a.saida)).slice(0, 16);
    if (!tc.selecionadas) tc.selecionadas = new Set(recentes.slice(0, 8).map((t) => t.id));
    tela.innerHTML = `
      <div class="titulo"><div><h1>Quanto você pagou a mais sem perceber?</h1><p>O Anshur avalia trocas antigas sem ver quanto foi pago. Depois revelamos e comparamos.</p></div></div>
      <div class="abas-modo" role="group" aria-label="Origem das trocas">
        <button type="button" data-m="revenda" aria-pressed="${tc.modo === 'revenda'}">Trocas da demonstração</button>
        <button type="button" data-m="minhas" aria-pressed="${tc.modo === 'minhas'}">Usar minhas trocas</button>
      </div>
      <div id="teste-corpo"></div>`;
    $$('.abas-modo button', tela).forEach((b) => b.onclick = () => { tc.modo = b.dataset.m; telaTeste(); });
    const corpo = $('#teste-corpo');
    if (tc.modo === 'revenda') {
      corpo.innerHTML = `<section class="painel passo"><div class="painel-cab"><h2>1. Escolha as trocas</h2><p><span id="qtd">${tc.selecionadas.size}</span> selecionadas</p></div>
        <div class="selecao">${recentes.map((t) => `<label><input type="checkbox" value="${t.id}" ${tc.selecionadas.has(t.id) ? 'checked' : ''}> ${esc(t.marca + ' ' + t.modelo)} · ${t.ano} · ${t.horas.toLocaleString('pt-BR')} h<span>vendida em ${data(t.saida)}</span></label>`).join('')}</div>
        <div class="acoes"><button class="btn btn-ouro" type="button" id="rodar">Avaliar sem ver o resultado</button></div></section><div id="revelacao"></div>`;
      $$('.selecao input', corpo).forEach((c) => c.onchange = () => { c.checked ? tc.selecionadas.add(c.value) : tc.selecionadas.delete(c.value); $('#qtd').textContent = tc.selecionadas.size; });
      $('#rodar').onclick = (e) => {
        const casos = recentes.filter((t) => tc.selecionadas.has(t.id));
        if (casos.length < 3) { toast('Escolha pelo menos 3 trocas.', true); return; }
        revelar(casos, null, e.currentTarget);
      };
    } else {
      corpo.innerHTML = `<section class="painel passo"><h2>Use as suas trocas de verdade</h2>
        <p class="sub" style="margin:6px 0 14px">Cole aqui de 5 a 30 trocas antigas da sua revenda, direto do Excel ou do relatório do seu sistema. Os dados ficam só neste navegador: nada é enviado.</p>
        <p class="ajuda">Colunas, nesta ordem: <b>categoria; fabricante; modelo; ano; horas; estado (1 a 5); valor pago na troca; valor vendido; dias no pátio; Fipe (opcional)</b>.</p>
        <div class="campo" style="margin-top:12px"><label for="cola">Trocas</label><textarea class="cola" id="cola" placeholder="Trator;Massey Ferguson;MF 4709;2019;5200;3;210000;265000;48">${esc(tc.texto)}</textarea></div>
        <div class="acoes"><button class="btn btn-ouro" type="button" id="processar">Avaliar sem ver o resultado</button><label class="btn btn-linha" style="cursor:pointer">Abrir arquivo CSV<input type="file" accept=".csv,.txt,text/csv" id="arquivo" class="sr"></label><button class="btn btn-linha" type="button" id="modelo">Baixar planilha modelo</button></div>
        <div id="erros"></div></section><div id="revelacao"></div>`;
      $('#cola').oninput = (e) => { tc.texto = e.target.value; };
      $('#modelo').onclick = () => baixarCSV('anshur-modelo-trocas.csv', [['Categoria', 'Fabricante', 'Modelo', 'Ano', 'Horas', 'Estado (1 a 5)', 'Valor pago na troca', 'Valor vendido', 'Dias no pátio', 'Fipe (opcional)'], ['Trator', 'Massey Ferguson', 'MF 4709', '2019', '5200', '3', '210000', '265000', '48', '']]);
      $('#arquivo').onchange = (e) => { const f = e.target.files[0]; if (!f) return; const rd = new FileReader(); rd.onload = () => { tc.texto = String(rd.result); $('#cola').value = tc.texto; toast('Arquivo carregado. Confira e clique em avaliar.'); }; rd.readAsText(f, 'utf-8'); };
      $('#processar').onclick = (e) => {
        const { linhas, erros } = lerTrocas(tc.texto);
        $('#erros').innerHTML = erros.length ? `<div class="conta neg" style="margin-top:12px">${erros.slice(0, 8).map(esc).join('<br>')}${erros.length > 8 ? '<br>…' : ''}</div>` : '';
        if (linhas.length < 5) { toast(`Precisamos de pelo menos 5 trocas válidas (encontramos ${linhas.length}).`, true); return; }
        revelar(linhas, linhas, e.currentTarget);
      };
    }
  }

  function lerTrocas(texto) {
    const linhas = [], erros = [];
    const brutas = String(texto || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const sep = (l) => (l.includes('\t') ? '\t' : l.includes(';') ? ';' : ',');
    const tipoDe = (s) => { s = s.toLowerCase(); return /trat/.test(s) ? 'trator' : /colh|colhe/.test(s) ? 'colhedora' : /pulv/.test(s) ? 'pulverizador' : /plant|semead/.test(s) ? 'plantadeira' : null; };
    brutas.forEach((l, n) => {
      const c = l.split(sep(l)).map((x) => x.trim());
      if (n === 0 && !/\d/.test(c[3] || '')) return; // cabeçalho
      const tipo = tipoDe(c[0] || ''), ano = parseInt(c[3], 10), horas = num(c[4]), estado = num(c[5]), pago = num(c[6]), vendido = num(c[7]), dias = num(c[8]), fipe = num(c[9]);
      const onde = `Linha ${n + 1}: `;
      if (!tipo) return erros.push(onde + 'categoria não reconhecida (use trator, colhedora, pulverizador ou plantadeira).');
      if (!(ano > 1990 && ano <= anoAtual)) return erros.push(onde + 'ano inválido.');
      if (!(pago > 0 && vendido > 0)) return erros.push(onde + 'informe valor pago e valor vendido.');
      const t = { id: 'I' + (n + 1), tipo, marca: c[1] || '', modelo: c[2] || '', ano, horas, cond: estado > 5 ? Math.min(100, estado) : Math.max(1, Math.min(5, estado || 3)) * 20, pago, vendido, diasPatio: dias || 0, preparo: 0 };
      if (fipe > 0) t.referencia = fipe;
      if (!M.refDe(t)) return erros.push(onde + `modelo "${t.modelo}" fora do catálogo da demonstração: informe a Fipe na última coluna.`);
      linhas.push(t);
    });
    return { linhas, erros };
  }

  function revelar(casos, historico, botao) {
    const caixa = $('#revelacao');
    const res = casos.map((t) => ({ t, r: M.avaliar(t, { excluir: t.id, historico: historico || undefined }) })).filter((c) => c.r);
    if (!res.length) { toast('Não foi possível avaliar essas trocas.', true); return; }
    botao.classList.add('carregando');
    caixa.innerHTML = `<section class="placar bloco" aria-live="polite"><span class="sub">Avaliando ${res.length} trocas sem ver o valor pago…</span><div class="grande" id="placar-val">—</div><p id="placar-txt"></p></section>
      <div class="cegas">${res.map((c, i) => `<article class="cega" id="cega-${i}"><h3>${esc(c.t.marca + ' ' + c.t.modelo)} · ${c.t.ano} · ${c.t.horas.toLocaleString('pt-BR')} h</h3>
        <div class="linhas"><div><span>Anshur recomendaria até</span><b class="oculto" data-a>calculando</b></div><div><span>A revenda pagou</span><b class="oculto" data-p>••••••</b></div><div><span>Vendeu por</span><b class="oculto" data-v>••••••</b></div><div><span>Diferença</span><b class="oculto" data-d>••••••</b></div></div></article>`).join('')}</div>`;
    caixa.scrollIntoView({ behavior: reduzido ? 'auto' : 'smooth', block: 'start' });
    const passo = reduzido ? 0 : 420;
    res.forEach((c, i) => {
      const card = $('#cega-' + i, caixa), dif = c.t.pago - c.r.teto;
      setTimeout(() => { const a = $('[data-a]', card); a.textContent = real(c.r.teto); a.className = 'revela'; }, passo * i + 200);
      setTimeout(() => {
        const p = $('[data-p]', card), v = $('[data-v]', card), d = $('[data-d]', card);
        p.textContent = real(c.t.pago); v.textContent = real(c.t.vendido);
        const margemSe = (c.t.vendido - Math.min(c.t.pago, c.r.teto) - c.t.preparo) / c.t.vendido, margemFoi = (c.t.vendido - c.t.pago - c.t.preparo) / c.t.vendido;
        d.innerHTML = dif > 0 ? `<span class="neg">${real(dif)} acima (${pct(dif / c.r.teto)})</span>` : `<span class="pos">${real(-dif)} abaixo</span>`;
        [p, v, d].forEach((x) => { x.className = 'revela'; });
        if (dif > 0) card.insertAdjacentHTML('beforeend', `<p class="nota-rodape revela">Margem foi ${pct(margemFoi)}; pagando o recomendado seria ${pct(margemSe)}.</p>`);
        card.classList.add('revelada', dif > 0 ? 'pagou-mais' : 'pagou-menos');
      }, passo * i + 200 + passo * 0.7);
    });
    setTimeout(() => {
      botao.classList.remove('carregando');
      const mais = res.filter((c) => c.t.pago > c.r.teto), menos = res.filter((c) => c.t.pago <= c.r.teto);
      const soma = mais.reduce((s, c) => s + c.t.pago - c.r.teto, 0);
      const el = $('#placar-val', caixa); el.dataset.conta = soma; el.dataset.fmt = 'real'; contar(caixa);
      $('.placar .sub', caixa).textContent = `Em ${mais.length} de ${res.length} trocas a revenda pagou acima do valor máximo recomendado`;
      $('#placar-txt', caixa).innerHTML = `Nas outras ${menos.length}, pagou dentro do recomendado. Diferença simulada: mostra onde a avaliação se afastou do histórico, não é prejuízo comprovado.${historico ? ' Com poucas trocas a estimativa é preliminar; no piloto usamos todo o histórico da revenda.' : ''}
        <span class="acoes" style="display:flex"><button class="btn btn-linha" type="button" id="repetir">Repetir com outras trocas</button>${historico ? '' : '<a class="btn btn-linha" href="#trocas">Ver inteligência de trocas</a>'}</span>`;
      $('#repetir', caixa).onclick = () => { caixa.innerHTML = ''; window.scrollTo({ top: 0, behavior: reduzido ? 'auto' : 'smooth' }); };
    }, passo * res.length + 200 + passo);
  }

  // ---------- PASSAPORTES ----------
  function telaPassaportes() {
    const itens = C.patio().map(infoPatio).sort((a, b) => b.t.entrada.localeCompare(a.t.entrada));
    tela.innerHTML = `
      <div class="titulo"><div><h1>Passaportes</h1><p>A ficha pública de cada usado do pátio: o comprador aponta o celular no QR Code e vê inspeção, documentos e manutenções.</p></div></div>
      <div class="cartoes escalonado">${itens.map((i) => {
        const comp = (i.t.manutencoes || []).filter((m) => m.comNota).length, tot = (i.t.manutencoes || []).length;
        return `<article class="cartao-pp"><span class="id">ANS-${esc(i.t.id)}</span><h2 style="font-size:17px">${esc(i.t.marca + ' ' + i.t.modelo)}</h2>
          <p class="sub">${NOMES[i.t.tipo]} · ${i.t.ano} · ${i.t.horas.toLocaleString('pt-BR')} h · anunciado ${mil(i.t.anuncio)}</p>
          <p class="sub"><span class="tag comprovado">${comp} comprovadas</span> <span class="tag declarado">${tot - comp} declaradas</span></p>
          <div class="acoes" style="margin-top:4px"><a class="btn btn-ouro" href="passaporte.html?id=${i.t.id}">Abrir</a><button class="btn btn-linha" type="button" data-copiar="${i.t.id}">Copiar link</button></div></article>`;
      }).join('')}</div>`;
    $$('[data-copiar]', tela).forEach((b) => b.onclick = async () => {
      const url = new URL('passaporte.html?id=' + b.dataset.copiar, location.href).href;
      try { await navigator.clipboard.writeText(url); toast('Link do passaporte copiado.'); } catch (e) { toast('Não foi possível copiar. Link: ' + url, true); }
    });
  }

  // ---------- rotas com transição ----------
  const TELAS = { visao: telaVisao, avaliar: telaAvaliar, patio: telaPatio, trocas: telaTrocas, teste: telaTeste, passaportes: telaPassaportes };
  function moverIndicador() {
    const ativo = $('.menu a[aria-current="page"]'), ind = $('.menu-indicador');
    if (!ativo || !ind) return;
    if (matchMedia('(min-width: 960px)').matches) { ind.style.transform = `translateY(${ativo.offsetTop}px)`; ind.style.width = ''; }
    else { ind.style.transform = `translateX(${ativo.offsetLeft}px)`; ind.style.width = ativo.offsetWidth + 'px'; }
  }
  let primeira = true;
  function rota() {
    const nome = (location.hash || '#visao').slice(1);
    const ativa = TELAS[nome] ? nome : 'visao';
    $$('.menu a').forEach((a) => { if (a.dataset.aba === ativa) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    moverIndicador();
    fecharCamada(true);
    const desenhar = () => { tela.classList.remove('saindo'); TELAS[ativa](); tela.classList.remove('entrando'); void tela.offsetWidth; tela.classList.add('entrando'); };
    if (primeira || reduzido) { primeira = false; desenhar(); return; }
    tela.classList.add('saindo');
    setTimeout(() => { desenhar(); window.scrollTo(0, 0); }, 120);
  }
  window.addEventListener('hashchange', rota);
  window.addEventListener('resize', moverIndicador);
  rota();
})();
