(function () {
  const A = window.ANSHUR, M = window.MOTOR, C = window.COMUM;
  const { real, mil, diasDesde, esc, NOMES, ICONES, FICHA } = C;
  const tela = document.getElementById('tela');
  document.getElementById('revenda').textContent = A.revenda.nome + ' · ' + A.revenda.cidade;
  document.getElementById('aviso').textContent = 'Demonstração: ' + A.revenda.aviso.toLowerCase() + '.';

  const anoAtual = new Date().getFullYear();
  const form = { tipo: 'trator', modelo: 'MF 4709', ano: anoAtual - 5, horas: 3900, ficha: { motor: 4, transmissao: 4, hidraulico: 3, pneus: 2, cabine: 4, lataria: 3 }, fotos: [] };
  const condDe = (f) => Math.round(FICHA.reduce((s, [k]) => s + f[k], 0) / FICHA.length * 20);

  function toast(msg) {
    const t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); t.textContent = msg;
    document.body.appendChild(t); setTimeout(() => t.remove(), 2800);
  }

  // ---------- Avaliar ----------
  function telaAvaliar() {
    const modelos = A.modelos.filter((m) => m.tipo === form.tipo);
    if (!modelos.some((m) => m.modelo === form.modelo)) form.modelo = modelos[0].modelo;
    const anos = []; for (let a = anoAtual; a >= anoAtual - 15; a--) anos.push(a);
    tela.innerHTML = `
      <div class="cabeca"><h1>Quanto pagar no usado?</h1>
      <p>Preencha a máquina que o cliente quer dar na troca. O Anshur compara com as trocas que a ${esc(A.revenda.nome)} já vendeu e diz até quanto vale pagar.</p></div>
      <div class="grade duas">
        <form class="bloco" id="f" novalidate>
          <h2>A máquina</h2>
          <div class="campos">
            <div class="campo"><label for="tipo">Tipo</label><select id="tipo">${Object.keys(NOMES).map((k) => `<option value="${k}" ${k === form.tipo ? 'selected' : ''}>${NOMES[k]}</option>`).join('')}</select></div>
            <div class="campo"><label for="modelo">Modelo</label><select id="modelo">${modelos.map((m) => `<option value="${esc(m.modelo)}" ${m.modelo === form.modelo ? 'selected' : ''}>${esc(m.marca + ' ' + m.modelo)}</option>`).join('')}</select></div>
            <div class="campo"><label for="ano">Ano</label><select id="ano">${anos.map((a) => `<option ${a === form.ano ? 'selected' : ''}>${a}</option>`).join('')}</select></div>
            <div class="campo"><label for="horas">Horas no horímetro</label><input id="horas" type="number" inputmode="numeric" min="0" step="10" value="${form.horas}"></div>
          </div>
          <h2 style="margin-top:20px">Inspeção</h2>
          <p class="nota" style="margin-bottom:10px">De 1 (ruim) a 5 (ótimo). Na versão da revenda, a IA lê as fotos e sugere essas notas; o vendedor só confere.</p>
          <div class="ficha">${FICHA.map(([k, nome]) => `
            <div class="item"><span class="rotulo" id="r-${k}">${nome}</span>
              <div class="estrelas" role="group" aria-labelledby="r-${k}">${[1, 2, 3, 4, 5].map((n) => `<button type="button" data-k="${k}" data-n="${n}" aria-pressed="${form.ficha[k] === n}">${n}</button>`).join('')}</div>
            </div>`).join('')}
          </div>
          <h2 style="margin-top:20px">Fotos</h2>
          <div class="fotos">${['Frente', 'Lateral', 'Horímetro', 'Pneus'].map((n, i) => `
            <label class="foto ${form.fotos[i] ? 'tem' : ''}" style="${form.fotos[i] ? `background-image:url(${form.fotos[i]})` : ''}">${n}<input type="file" accept="image/*" capture="environment" data-i="${i}" aria-label="Foto: ${n}"></label>`).join('')}
          </div>
          <p class="nota" style="margin-top:8px">Pode tirar fotos de verdade aqui. Elas ficam só neste aparelho.</p>
        </form>
        <section class="bloco resultado" id="res" aria-live="polite"></section>
      </div>`;
    const f = document.getElementById('f');
    f.tipo.onchange = (e) => { form.tipo = e.target.value; telaAvaliar(); };
    f.modelo.onchange = (e) => { form.modelo = e.target.value; calcular(); };
    f.ano.onchange = (e) => { form.ano = +e.target.value; calcular(); };
    f.horas.oninput = (e) => { form.horas = Math.max(0, +e.target.value || 0); calcular(); };
    f.querySelectorAll('.estrelas button').forEach((b) => b.onclick = () => {
      form.ficha[b.dataset.k] = +b.dataset.n;
      b.parentNode.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', x === b));
      calcular();
    });
    f.querySelectorAll('input[type=file]').forEach((inp) => inp.onchange = () => {
      const arq = inp.files[0]; if (!arq) return;
      const img = new Image(); const url = URL.createObjectURL(arq);
      img.onload = () => {
        const c = document.createElement('canvas'), k = Math.min(1, 640 / Math.max(img.width, img.height));
        c.width = img.width * k; c.height = img.height * k; c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        form.fotos[+inp.dataset.i] = c.toDataURL('image/jpeg', 0.72); URL.revokeObjectURL(url);
        const lab = inp.parentNode; lab.classList.add('tem'); lab.style.backgroundImage = `url(${form.fotos[+inp.dataset.i]})`;
      };
      img.src = url;
    });
    calcular();
  }

  function maquinaDoForm() {
    return { tipo: form.tipo, modelo: form.modelo, marca: M.modelo({ modelo: form.modelo }).marca, ano: form.ano, horas: form.horas, cond: condDe(form.ficha), ficha: { ...form.ficha } };
  }

  function calcular() {
    const maq = maquinaDoForm();
    const r = M.avaliar(maq);
    const res = document.getElementById('res');
    const lo = r.faixa[0] * 0.9, hi = r.venda;
    const pos = (v) => Math.max(0, Math.min(100, (v - lo) / (hi - lo) * 100));
    res.innerHTML = `
      <p class="teto">Pague até<strong>${real(r.teto)}</strong>na troca, para vender com ${Math.round(A.margemAlvo * 100)}% de margem.</p>
      <div class="faixa" aria-hidden="true"><i style="left:${pos(r.faixa[0])}%"></i><i style="left:calc(${pos(r.teto)}% - 3px)"></i></div>
      <div class="faixa-rotulos"><span>Seguro: ${mil(r.faixa[0])}</span><span>Limite: ${mil(r.teto)}</span><span>Venda: ${mil(r.venda)}</span></div>
      <div class="numeros">
        <div><span>Venda prevista</span><b>${mil(r.venda)}</b></div>
        <div><span>Preparo estimado</span><b>${mil(r.preparo)}</b></div>
        <div><span>Tempo de pátio</span><b>${r.dias ? r.dias + ' dias' : '—'}</b></div>
      </div>
      ${r.motivos.length ? `<h2>Por que esse valor</h2><ul class="motivos">${r.motivos.map((m) => `<li><span>${m.nome}</span><span class="${m.valor >= 0 ? 'mais' : 'menos'}">${m.valor >= 0 ? '+' : '−'} ${mil(Math.abs(m.valor))}</span></li>`).join('')}</ul>` : ''}
      <h2>Trocas parecidas que a revenda já vendeu</h2>
      <div class="lista">${r.comp.map((t) => `
        <div class="maq" style="box-shadow:none;background:var(--chapa)"><span class="icone" style="background:#fff">${ICONES[t.tipo]}</span>
          <div><h3>${esc(t.marca + ' ' + t.modelo)} · ${t.ano}</h3><p>${t.horas.toLocaleString('pt-BR')} h · pago ${mil(t.pago)} · ${t.diasPatio} dias no pátio</p></div>
          <div class="valor">${mil(t.vendido)}<small>vendido</small></div></div>`).join('')}
      </div>
      <p class="nota" style="margin-top:12px">Calculado com ${r.base} trocas vendidas da própria revenda. Quem decide o valor é o gerente.</p>
      <div class="acoes"><button class="botao" id="aceitar" type="button">Fechar troca e criar passaporte</button></div>`;
    document.getElementById('aceitar').onclick = () => aceitar(maq, r);
  }

  function aceitar(maq, r) {
    const d = C.ler(); d.extras = d.extras || [];
    const id = 'D' + String(d.extras.length + 1).padStart(3, '0');
    const t = { ...maq, id, pago: r.teto, preparo: r.preparo, vendido: null, entrada: new Date().toISOString().slice(0, 10), saida: null, diasPatio: null,
      anuncio: Math.round(r.venda * 1.06 / 1000) * 1000, vendedor: 'Você (demonstração)', origem: 'Troca feita na demonstração', idAgro: false, manutencoes: [], fotos: form.fotos.filter(Boolean) };
    d.extras.push(t);
    if (!C.gravar(d)) { toast('Não deu para salvar neste navegador.'); return; }
    A.trocas.push(t);
    location.href = 'passaporte.html?id=' + id;
  }

  // ---------- Pátio ----------
  function telaPatio() {
    const itens = A.trocas.filter((t) => !t.vendido).map((t) => ({ t, dias: diasDesde(t.entrada) })).sort((a, b) => b.dias - a.dias);
    const capital = itens.reduce((s, i) => s + i.t.pago + i.t.preparo, 0);
    const velhos = itens.filter((i) => i.dias > 90);
    tela.innerHTML = `
      <div class="cabeca"><h1>Usados no pátio</h1><p>Cada dia parado é dinheiro da revenda preso. Toque numa máquina para abrir o passaporte que vai para o comprador.</p></div>
      <div class="resumo">
        <div><span>Máquinas no pátio</span><b>${itens.length}</b></div>
        <div><span>Dinheiro parado</span><b>${mil(capital)}</b></div>
        <div><span>Média parada</span><b>${Math.round(itens.reduce((s, i) => s + i.dias, 0) / Math.max(1, itens.length))} dias</b></div>
        <div class="destaque"><span>Há mais de 90 dias</span><b>${velhos.length}</b></div>
      </div>
      <div class="lista">${itens.map(({ t, dias }) => `
        <a class="maq" href="passaporte.html?id=${t.id}"><span class="icone">${ICONES[t.tipo]}</span>
          <div><h3>${esc(t.marca + ' ' + t.modelo)} · ${t.ano}</h3>
          <p>${t.horas.toLocaleString('pt-BR')} h · custo ${mil(t.pago + t.preparo)} · <span class="selo ${dias > 90 ? 'ruim' : ''}">${dias} dias</span></p></div>
          <div class="valor">${mil(t.anuncio)}<small>anunciado</small></div></a>`).join('')}
      </div>`;
  }

  // ---------- Trocas ----------
  let filtro = 'todos';
  function telaHistorico() {
    const vendidas = A.trocas.filter((t) => t.vendido && (filtro === 'todos' || t.tipo === filtro)).sort((a, b) => b.saida.localeCompare(a.saida));
    const lucro = (t) => t.vendido - t.pago - t.preparo;
    const prej = vendidas.filter((t) => lucro(t) < 0);
    const margem = vendidas.reduce((s, t) => s + lucro(t) / t.vendido, 0) / Math.max(1, vendidas.length);
    tela.innerHTML = `
      <div class="cabeca"><h1>Trocas vendidas</h1><p>O histórico que ensina o Anshur. Quanto mais trocas a revenda registra, mais certa fica a avaliação.</p></div>
      <div class="filtros" role="group" aria-label="Filtrar por tipo">${['todos', ...Object.keys(NOMES)].map((k) => `<button type="button" data-f="${k}" aria-pressed="${filtro === k}">${k === 'todos' ? 'Todas' : NOMES[k]}</button>`).join('')}</div>
      <div class="resumo">
        <div><span>Trocas vendidas</span><b>${vendidas.length}</b></div>
        <div><span>Margem média</span><b>${(margem * 100).toFixed(1).replace('.', ',')}%</b></div>
        <div><span>Trocas no prejuízo</span><b>${prej.length}</b></div>
        <div class="destaque"><span>Prejuízo nessas trocas</span><b>${mil(-prej.reduce((s, t) => s + lucro(t), 0))}</b></div>
      </div>
      <div class="bloco rolar"><table class="tabela">
        <thead><tr><th>Máquina</th><th class="n">Pago</th><th class="n">Vendido</th><th class="n">Resultado</th><th class="n">Pátio</th></tr></thead>
        <tbody>${vendidas.map((t) => { const l = lucro(t); return `<tr><td><b>${esc(t.marca + ' ' + t.modelo)}</b><br><span class="nota">${t.ano} · ${t.horas.toLocaleString('pt-BR')} h · ${esc(t.vendedor)}</span></td>
          <td class="n">${mil(t.pago)}</td><td class="n">${mil(t.vendido)}</td><td class="n ${l < 0 ? 'menos' : 'mais'}">${l < 0 ? '−' : ''}${mil(Math.abs(l))}<br><span class="nota">${(l / t.vendido * 100).toFixed(1).replace('.', ',')}%</span></td><td class="n">${t.diasPatio} d</td></tr>`; }).join('')}</tbody>
      </table></div>`;
    tela.querySelectorAll('.filtros button').forEach((b) => b.onclick = () => { filtro = b.dataset.f; telaHistorico(); });
  }

  // ---------- Teste às cegas ----------
  function telaTeste() {
    const casos = A.trocas.filter((t) => t.vendido && /^T/.test(t.id)).map((t) => ({ t, r: M.avaliar(t, t.id) }))
      .filter((c) => c.t.pago > c.r.teto).sort((a, b) => (b.t.pago - b.r.teto) - (a.t.pago - a.r.teto)).slice(0, 5);
    const total = casos.reduce((s, c) => s + c.t.pago - c.r.teto, 0);
    const maior = Math.max(...casos.map((c) => Math.max(c.t.pago, c.t.vendido)));
    tela.innerHTML = `
      <div class="cabeca"><h1>Teste às cegas</h1><p>Escondemos do Anshur o resultado de trocas antigas e pedimos a avaliação, como se fosse hoje. Depois comparamos com o que a revenda pagou de verdade.</p></div>
      <div class="placar"><span>Nas 5 trocas abaixo, a revenda pagou acima do que o Anshur recomendaria</span><strong>${mil(total)}</strong><span>a mais, só nessas 5 máquinas.</span></div>
      <div class="cegas">${casos.map(({ t, r }) => `
        <article class="cega"><h3>${esc(t.marca + ' ' + t.modelo)} · ${t.ano} · ${t.horas.toLocaleString('pt-BR')} h</h3>
          <p class="nota">Troca de ${C.data(t.entrada)} · ficou ${t.diasPatio} dias no pátio</p>
          <div class="barras">
            <div class="barra pago"><span>Revenda pagou</span><div style="width:${t.pago / maior * 100}%"></div><b>${mil(t.pago)}</b></div>
            <div class="barra sug"><span>Anshur diria</span><div style="width:${r.teto / maior * 100}%"></div><b>${mil(r.teto)}</b></div>
            <div class="barra"><span>Vendeu por</span><div style="width:${t.vendido / maior * 100}%"></div><b>${mil(t.vendido)}</b></div>
          </div></article>`).join('')}
      </div>
      <section class="bloco" style="margin-top:18px"><h2>Como fazemos esse teste com a sua revenda</h2>
        <ol class="passos">
          <li>Você separa 5 trocas antigas: a ficha ou fotos da máquina, quanto pagou e por quanto vendeu.</li>
          <li>Em até 24 horas devolvemos a avaliação de cada uma, sem ver o resultado.</li>
          <li>Mostramos a diferença em reais, troca por troca, com o motivo de cada avaliação.</li>
        </ol></section>`;
  }

  const TELAS = { avaliar: telaAvaliar, patio: telaPatio, historico: telaHistorico, teste: telaTeste };
  function rota() {
    const nome = (location.hash || '#avaliar').slice(1);
    const fn = TELAS[nome] || telaAvaliar;
    const ativa = TELAS[nome] ? nome : 'avaliar';
    document.querySelectorAll('.abas a').forEach((a) => { if (a.dataset.aba === ativa) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    fn(); window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', rota);
  rota();
})();
