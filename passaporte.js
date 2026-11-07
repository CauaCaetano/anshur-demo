(function () {
  const A = window.ANSHUR, C = window.COMUM;
  const { mil, esc, NOMES, ICONES, FICHA } = C;
  document.getElementById('revenda').textContent = A.revenda.nome + ' · ' + A.revenda.cidade;
  document.getElementById('aviso').textContent = 'Demonstração: ' + A.revenda.aviso.toLowerCase() + '.';
  const tela = document.getElementById('tela');
  const id = new URLSearchParams(location.search).get('id');
  const t = A.trocas.find((x) => x.id === id) || A.trocas.find((x) => !x.vendido);
  document.title = `${t.marca} ${t.modelo} ${t.ano} · Passaporte Anshur`;

  const galeria = (t.fotos && t.fotos.length)
    ? t.fotos.slice(0, 4).map((f) => `<div style="background-image:url(${f})" role="img" aria-label="Foto da máquina"></div>`).join('')
    : [0, 1].map(() => `<div>${ICONES[t.tipo]}</div>`).join('');
  const comNota = t.manutencoes.filter((m) => m.comNota), semNota = t.manutencoes.filter((m) => !m.comNota);

  tela.innerHTML = `
    <div class="pp-topo">
      <section class="pp-capa">
        <span class="rot">Passaporte do usado · ${NOMES[t.tipo]}</span>
        <h1>${esc(t.marca + ' ' + t.modelo)}</h1>
        <div class="linha"><span>Ano ${t.ano}</span><span>${t.horas.toLocaleString('pt-BR')} horas</span><span>${esc(t.origem.replace(/^Faz\. .*?, /, 'Veio de '))}</span></div>
        ${t.anuncio ? `<span class="preco">${mil(t.anuncio)}</span>` : ''}
        <div class="pp-galeria">${galeria}</div>
        ${t.fotos && t.fotos.length ? '' : '<p class="rot">Na revenda, aqui entram as fotos tiradas na inspeção.</p>'}
      </section>
      <aside class="pp-qr">
        <h2 style="font-size:17px">Cole no vidro da máquina</h2>
        <div class="qr" id="qr" aria-label="QR Code deste passaporte"></div>
        <p class="nota">Quem passa no pátio aponta o celular e vê tudo isto. O mesmo link vai no anúncio e no WhatsApp.</p>
        <div class="acoes" style="margin-top:0"><button class="botao secundario" id="copiar" type="button">Copiar link</button><button class="botao secundario" type="button" onclick="print()">Imprimir</button></div>
      </aside>
    </div>
    <div class="grade duas">
      <section class="bloco"><h2>Inspeção da revenda</h2>
        <div class="notas">${FICHA.map(([k, n]) => `<div><span>${n}</span><div class="pontos" aria-label="${t.ficha[k]} de 5">${[1, 2, 3, 4, 5].map((i) => `<i class="${i <= t.ficha[k] ? 'on' : ''}"></i>`).join('')}</div></div>`).join('')}</div>
        <p class="nota" style="margin-top:12px">Nota geral ${t.cond}/100. Inspeção feita pela equipe da revenda na entrada da máquina.</p>
      </section>
      <section class="bloco"><h2>Documentos</h2>
        <ul class="prova">
          <li><span>Registro no ID Agro (Renagro)</span>${t.idAgro ? '<span class="selo">Registrado</span>' : '<span class="selo ruim">Pendente</span>'}</li>
          <li><span>Nota fiscal de origem</span><span class="selo">Com a revenda</span></li>
          <li><span>Horímetro conferido na entrada</span><span class="selo">Foto guardada</span></li>
        </ul>
      </section>
    </div>
    <section class="bloco" style="margin-top:16px"><h2>Manutenções</h2>
      <div class="legenda"><span class="selo">Com nota ou ordem de serviço</span><span class="selo ruim">Só declarado pelo dono anterior</span></div>
      ${t.manutencoes.length ? `<ul class="prova">${[...comNota, ...semNota].map((m) => `<li><span>${esc(m.servico)} <span class="nota">· com ${m.horas.toLocaleString('pt-BR')} h</span></span><span class="selo ${m.comNota ? '' : 'ruim'}">${m.comNota ? 'Comprovado' : 'Declarado'}</span></li>`).join('')}</ul>`
        : '<p class="nota">Nenhuma manutenção registrada ainda. A IA lê as notas e ordens de serviço que o dono anterior entregar.</p>'}
      <p class="nota" style="margin-top:12px">${comNota.length} de ${t.manutencoes.length} manutenções têm comprovante. O passaporte nunca mistura o que é provado com o que é só falado.</p>
    </section>
    <div class="acoes"><a class="botao secundario" href="./#patio">Voltar ao pátio</a></div>`;

  const url = location.href;
  try {
    const qr = window.qrcode(0, 'M'); qr.addData(url); qr.make();
    document.getElementById('qr').innerHTML = qr.createSvgTag({ cellSize: 4, margin: 0, scalable: true });
  } catch (e) { document.getElementById('qr').textContent = 'QR indisponível sem internet.'; }
  document.getElementById('copiar').onclick = async () => {
    try { await navigator.clipboard.writeText(url); document.getElementById('copiar').textContent = 'Link copiado'; } catch (e) { prompt('Copie o link:', url); }
  };
})();
