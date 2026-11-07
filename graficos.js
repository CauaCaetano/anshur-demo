// Gráficos em SVG puro, com animação de entrada (respeita prefers-reduced-motion pelo CSS).
(function () {
  const { mil, pct, esc } = window.COMUM;

  function linha(pontos, { formato = mil, altura = 190, largura = 560 } = {}) {
    const L = largura, H = altura, pe = 34, pd = 12, ps = 14, pi = 28;
    // escala com folga dos dois lados; funciona com valores negativos e com todos iguais
    const ys = pontos.map((p) => p.v), lo = Math.min(...ys), hi = Math.max(...ys), folga = (hi - lo) * 0.12 || Math.abs(hi) * 0.1 || 1;
    const min = lo - folga, max = hi + folga * 1.6;
    const x = (i) => pe + (i / Math.max(1, pontos.length - 1)) * (L - pe - pd);
    const y = (v) => ps + (1 - (v - min) / (max - min || 1)) * (H - ps - pi);
    const d = pontos.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(p.v).toFixed(1)}`).join(' ');
    const area = `${d} L${x(pontos.length - 1)} ${H - pi} L${x(0)} ${H - pi} Z`;
    const grade = [0, 0.5, 1].map((f) => { const v = min + (max - min) * f; return `<line x1="${pe}" x2="${L - pd}" y1="${y(v)}" y2="${y(v)}" class="g-grade"/><text x="${pe - 6}" y="${y(v) + 4}" class="g-eixo" text-anchor="end">${esc(formato(v)).replace('R$ ', '')}</text>`; }).join('');
    return `<svg viewBox="0 0 ${L} ${H}" class="grafico" role="img" aria-label="${esc(pontos.map((p) => p.r + ': ' + formato(p.v)).join('; '))}">
      ${grade}<path d="${area}" class="g-area"/><path d="${d}" class="g-linha" pathLength="1"/>
      ${pontos.map((p, i) => `<circle cx="${x(i)}" cy="${y(p.v)}" r="${i === pontos.length - 1 ? 6 : 4}" class="g-ponto${i === pontos.length - 1 ? ' g-ultimo' : ''}" style="animation-delay:${0.5 + i * 0.06}s"><title>${esc(p.r)}: ${esc(formato(p.v))}</title></circle><text x="${x(i)}" y="${H - 8}" class="g-eixo" text-anchor="middle">${esc(p.r)}</text>`).join('')}
      ${pontos.length ? (() => { const i = pontos.length - 1, tx = esc(formato(pontos[i].v)), w = tx.length * 7.4 + 18, cx = Math.min(x(i), L - pd - w / 2), cy = Math.max(ps + 2, y(pontos[i].v) - 34); return `<g class="g-balao"><rect x="${cx - w / 2}" y="${cy}" width="${w}" height="24" rx="6"/><text x="${cx}" y="${cy + 16.5}" text-anchor="middle">${tx}</text></g>`; })() : ''}
    </svg>`;
  }

  // barras agrupadas: [{r, a, b}] com legenda [nomeA, nomeB]
  function barrasDuplas(grupos, nomes, { formato = (v) => pct(v), altura = 190, largura = 560 } = {}) {
    const L = largura, H = altura, pe = 34, pd = 8, ps = 12, pi = 28;
    const todos = grupos.flatMap((g) => [g.a, g.b]).filter((v) => v != null);
    const max = Math.max(0.01, ...todos) * 1.15, min = Math.min(0, ...todos);
    const y = (v) => ps + (1 - (v - min) / (max - min)) * (H - ps - pi);
    const w = (L - pe - pd) / grupos.length, bw = Math.min(22, w * 0.3);
    const zero = y(0);
    const barra = (v, cx, cls, i) => { const yy = y(Math.max(v, 0)), hh = Math.abs(y(v) - zero); return `<rect x="${cx}" y="${v >= 0 ? yy : zero}" width="${bw}" height="${Math.max(1, hh)}" rx="3" class="${cls}" style="animation-delay:${0.1 + i * 0.05}s"><title>${esc(formato(v))}</title></rect>`; };
    return `<svg viewBox="0 0 ${L} ${H}" class="grafico" role="img" aria-label="${esc(grupos.map((g) => `${g.r}: ${nomes[0]} ${formato(g.a)}, ${nomes[1]} ${formato(g.b)}`).join('; '))}">
      <line x1="${pe}" x2="${L - pd}" y1="${zero}" y2="${zero}" class="g-grade"/>
      ${[max * 0.5, max * 0.9].map((v) => `<line x1="${pe}" x2="${L - pd}" y1="${y(v)}" y2="${y(v)}" class="g-grade"/><text x="${pe - 6}" y="${y(v) + 4}" class="g-eixo" text-anchor="end">${esc(formato(v))}</text>`).join('')}
      ${grupos.map((g, i) => { const cx = pe + w * i + w / 2; return `${barra(g.a, cx - bw - 2, 'g-barra-a', i)}${barra(g.b, cx + 2, 'g-barra-b', i)}<text x="${cx}" y="${H - 8}" class="g-eixo" text-anchor="middle">${esc(g.r)}</text>`; }).join('')}
    </svg>`;
  }

  // barras horizontais: [{r, v, cls?, extra?}]
  function horizontais(itens, { formato = mil } = {}) {
    const max = Math.max(1, ...itens.map((i) => Math.abs(i.v)));
    return `<div class="hbarras">${itens.map((i, k) => `
      <div class="hb"><span class="hb-r">${esc(i.r)}</span><span class="hb-trilho"><i class="${i.cls || ''}" style="width:${(Math.abs(i.v) / max * 100).toFixed(1)}%;animation-delay:${0.08 * k}s"></i></span><b>${esc(formato(i.v))}</b>${i.extra ? `<small>${esc(i.extra)}</small>` : ''}</div>`).join('')}</div>`;
  }

  // rosca: [{r, v, cor}] com total no meio
  function rosca(itens, { formato = mil, rotuloTotal = 'total' } = {}) {
    const total = itens.reduce((s, i) => s + i.v, 0) || 1, R = 82, r = 62, C = 2 * Math.PI * ((R + r) / 2), esp = R - r;
    let acum = 0;
    const arcos = itens.map((i, k) => {
      const frac = i.v / total, comp = frac * C, d = `<circle cx="90" cy="90" r="${(R + r) / 2}" fill="none" stroke="${i.cor}" stroke-width="${esp}" stroke-dasharray="${comp} ${C - comp}" stroke-dashoffset="${-acum}" transform="rotate(-90 90 90)" class="g-arco" style="animation-delay:${0.1 + k * 0.12}s"><title>${esc(i.r)}: ${esc(formato(i.v))}</title></circle>`;
      acum += comp; return d;
    }).join('');
    return `<div class="rosca"><svg viewBox="0 0 180 180" class="rosca-svg" role="img" aria-label="${esc(itens.map((i) => i.r + ': ' + formato(i.v)).join('; '))}">${arcos}
      <text x="90" y="84" text-anchor="middle" class="rosca-rot">R$</text><text x="90" y="104" text-anchor="middle" class="rosca-total" textLength="${Math.min(96, String(formato(total)).replace('R$ ', '').length * 11)}" lengthAdjust="spacingAndGlyphs">${esc(String(formato(total)).replace('R$ ', ''))}</text><text x="90" y="122" text-anchor="middle" class="rosca-rot">${esc(rotuloTotal)}</text></svg>
      <ul class="rosca-leg">${itens.map((i) => `<li><i style="background:${i.cor}"></i><span>${esc(i.r)}</span><b>${pct(i.v / total, 0)}</b><b>${esc(formato(i.v))}</b></li>`).join('')}</ul></div>`;
  }

  window.GRAFICOS = { linha, barrasDuplas, horizontais, rosca };
})();
