(function () {
  const A = window.ANSHUR, K = window.COMUM;
  const { real, esc, data, NOMES, FICHA } = K;
  document.getElementById('marca').innerHTML = '<img src="logo/anshur-logo.png?v=5" alt="Anshur" width="150" height="38" style="display:block;height:auto">';
  const tela = document.getElementById('tela');
  const id = new URLSearchParams(location.search).get('id');
  const t = A.trocas.find((x) => x.id === id && !x.vendido) || A.trocas.find((x) => x.id === id) || K.C.patio()[0];
  document.title = `${t.marca} ${t.modelo} ${t.ano} · Passaporte Anshur`;
  const mans = t.manutencoes || [];
  const comNota = mans.filter((m) => m.comNota), semNota = mans.filter((m) => !m.comNota);
  const v = t.verif || { horimetro: true, notas: comNota.length > 0, chassi: true };
  const docs = [
    ['Horímetro conferido na entrada', v.horimetro], ['Chassi e número de série conferidos', v.chassi],
    ['Notas ou ordens de serviço entregues', v.notas], ['Registro no ID Agro (Renagro)', t.idAgro]
  ];
  const galeria = [0, 1, 2, 3].map((k) => { const f = window.FOTOS.de(t, k); return `<div style="background-image:url('${f.propria ? f.u : (k ? window.FOTOS.mini(f.u) : f.u)}')" role="img" aria-label="Foto da máquina"></div>`; }).join('');
  const mov = [{ d: t.entrada, x: 'Entrada no pátio da revenda' }].concat((t.precos || []).map((p) => ({ d: p.data, x: `${p.motivo}: ${real(p.valor)}` }))).sort((a, b) => a.d.localeCompare(b.d));

  tela.innerHTML = `
    <section class="capa">
      <div class="ficha-topo">
        <span class="id">PASSAPORTE ANS-${esc(t.id)} · ${NOMES[t.tipo].toUpperCase()}</span>
        <h1>${esc(t.marca + ' ' + t.modelo)}</h1>
        <div class="linha"><span>Ano ${t.ano}</span><span>${t.horas.toLocaleString('pt-BR')} horas</span><span>Inspeção ${t.cond}/100</span></div>
        ${t.anuncio ? `<span class="preco">${real(t.anuncio)}</span>` : ''}
        <div class="galeria">${galeria}</div>
      </div>
      <aside class="qr-caixa">
        <h2 style="font-size:16px">QR Code deste passaporte</h2>
        <div class="qr" id="qr" aria-label="QR Code que abre esta página"></div>
        <p style="font-size:13px;color:var(--cinza)">Cole no vidro da máquina e use o mesmo link no anúncio. Quem escanear abre esta página.</p>
        <div class="acoes"><button class="btn" type="button" id="copiar">Copiar link</button><button class="btn linha" type="button" onclick="print()">Imprimir</button></div>
      </aside>
    </section>
    <div class="secoes">
      <section class="sec"><h2>Identificação</h2><div class="det">
        <div><span>Categoria</span><b>${NOMES[t.tipo]}</b></div><div><span>Fabricante</span><b>${esc(t.marca)}</b></div>
        <div><span>Modelo</span><b>${esc(t.modelo)}</b></div><div><span>Ano</span><b>${t.ano}</b></div>
        <div><span>Horas</span><b>${t.horas.toLocaleString('pt-BR')}</b></div><div><span>Revenda</span><b>${esc(A.revenda.nome)}</b></div></div></section>
      <section class="sec"><h2>Inspeção da revenda</h2>
        <div class="notas">${FICHA.map(([k, n]) => `<div><span>${n}</span><div class="pontos" aria-label="${t.ficha[k]} de 5">${[1, 2, 3, 4, 5].map((i) => `<i class="${i <= t.ficha[k] ? 'on' : ''}"></i>`).join('')}</div></div>`).join('')}</div>
        <p class="aviso">Inspeção visual feita pela equipe da revenda na entrada da máquina.</p></section>
      <section class="sec"><h2>Documentação</h2><ul class="lista">
        ${docs.map(([n, ok]) => `<li><span>${n}</span>${ok ? '<span class="tag comprovado">Comprovado</span>' : '<span class="tag pendente">Pendente</span>'}</li>`).join('')}</ul></section>
      <section class="sec"><h2>Histórico de movimentações</h2><ul class="tempo">${mov.map((m) => `<li>${esc(m.x)}<span>${data(m.d)}</span></li>`).join('')}</ul></section>
      <section class="sec inteira"><h2>Histórico de manutenção</h2>
        <div class="legenda"><span class="tag comprovado">Comprovado: tem nota ou ordem de serviço</span><span class="tag declarado">Declarado: informado pelo dono anterior</span></div>
        ${mans.length ? `<ul class="lista">${[...comNota, ...semNota].map((m) => `<li><span>${esc(m.servico)} <span style="color:var(--cinza);font-size:13px">· com ${Number(m.horas).toLocaleString('pt-BR')} h</span></span><span class="tag ${m.comNota ? 'comprovado' : 'declarado'}">${m.comNota ? 'Comprovado' : 'Declarado'}</span></li>`).join('')}</ul>`
          : '<p style="color:var(--cinza)">Nenhuma manutenção registrada ainda.</p>'}
        <p class="aviso">${comNota.length} de ${mans.length} manutenções têm comprovante.</p></section>
    </div>
    <p class="aviso">Este passaporte organiza informações da revenda. Não é laudo técnico nem certificação. Revenda e dados fictícios, só para demonstração. Fotos de demonstração: Wikimedia Commons, licenças livres.</p>`;

  const url = location.href;
  try { const qr = window.qrcode(0, 'M'); qr.addData(url); qr.make(); document.getElementById('qr').innerHTML = qr.createSvgTag({ cellSize: 4, margin: 0, scalable: true }); }
  catch (e) { document.getElementById('qr').textContent = 'QR Code indisponível sem internet.'; }
  document.getElementById('copiar').onclick = async (e) => {
    try { await navigator.clipboard.writeText(url); e.currentTarget.textContent = 'Link copiado'; } catch (err) { prompt('Copie o link:', url); }
  };
})();
