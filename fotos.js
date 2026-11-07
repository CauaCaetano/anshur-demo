// Fotos reais de máquinas (Wikimedia Commons, licenças livres) só para a demonstração.
// Na revenda, entram as fotos tiradas na inspeção.
(function (raiz) {
  const W = 'https://thumb.wikimedia.org/wikipedia/commons/thumb/';
  const F = {
    trator: [
      { u: W + '8/80/A_John_Deere_tractor_-_geograph.org.uk_-_6135147.jpg/960px-A_John_Deere_tractor_-_geograph.org.uk_-_6135147.jpg', a: 'Philip Halling', l: 'CC BY-SA 2.0', p: 'https://commons.wikimedia.org/wiki/File:A_John_Deere_tractor_-_geograph.org.uk_-_6135147.jpg' },
      { u: W + 'd/d1/Modern_John_Deere_Tractor_IMG_0401.JPG/960px-Modern_John_Deere_Tractor_IMG_0401.JPG', a: 'Elcajonfarms', l: 'CC BY 3.0', p: 'https://commons.wikimedia.org/wiki/File:Modern_John_Deere_Tractor_IMG_0401.JPG' },
      { u: W + 'd/d4/Massey_Ferguson_3050_Traktor.jpg/960px-Massey_Ferguson_3050_Traktor.jpg', a: 'JoachimKohler-HB', l: 'CC BY-SA 4.0', p: 'https://commons.wikimedia.org/wiki/File:Massey_Ferguson_3050_Traktor.jpg' }
    ],
    colhedora: [
      { u: W + '2/25/Case_IH_Sugar_Cane_Harvester_%281%29.jpg/960px-Case_IH_Sugar_Cane_Harvester_%281%29.jpg', a: 'HEPCO worker', l: 'CC BY-SA 4.0', p: 'https://commons.wikimedia.org/wiki/File:Case_IH_Sugar_Cane_Harvester_(1).jpg' },
      { u: W + 'e/e6/Piracicaba_10_2008_Sugarcane_harvester_199.jpg/960px-Piracicaba_10_2008_Sugarcane_harvester_199.jpg', a: 'Mario Roberto Duran Ortiz', l: 'CC BY-SA 3.0', p: 'https://commons.wikimedia.org/wiki/File:Piracicaba_10_2008_Sugarcane_harvester_199.jpg' },
      { u: W + 'e/eb/Case_IH_Sugar_Cane_Harvester_%282%29.jpg/960px-Case_IH_Sugar_Cane_Harvester_%282%29.jpg', a: 'HEPCO worker', l: 'CC BY-SA 4.0', p: 'https://commons.wikimedia.org/wiki/File:Case_IH_Sugar_Cane_Harvester_(2).jpg' },
      { u: W + 'd/de/SugarCaneMechanizedHarvest.JPG/960px-SugarCaneMechanizedHarvest.JPG', a: 'Gregory Lesturgez', l: 'CC BY 3.0', p: 'https://commons.wikimedia.org/wiki/File:SugarCaneMechanizedHarvest.JPG' }
    ],
    pulverizador: [
      { u: W + 'e/ea/Agrifac_Condor_self-propelled_sprayer_at_IndAgra_Farm_Romexpo_2010.JPG/960px-Agrifac_Condor_self-propelled_sprayer_at_IndAgra_Farm_Romexpo_2010.JPG', a: 'Gabinho', l: 'CC BY 3.0', p: 'https://commons.wikimedia.org/wiki/File:Agrifac_Condor_self-propelled_sprayer_at_IndAgra_Farm_Romexpo_2010.JPG' },
      { u: W + '0/04/Self_Propelled_Sprayer_made_by_Equipment_Technologies.jpg/960px-Self_Propelled_Sprayer_made_by_Equipment_Technologies.jpg', a: 'ShellieChatt', l: 'CC BY-SA 4.0', p: 'https://commons.wikimedia.org/wiki/File:Self_Propelled_Sprayer_made_by_Equipment_Technologies.jpg' },
      { u: W + 'a/a2/Tecnoma_Laser_3240_Self-propelled_sprayer_at_IndAgra_Farm_Romexpo_2010_%28front_view%29.JPG/960px-Tecnoma_Laser_3240_Self-propelled_sprayer_at_IndAgra_Farm_Romexpo_2010_%28front_view%29.JPG', a: 'Gabinho', l: 'CC BY 3.0', p: 'https://commons.wikimedia.org/wiki/File:Tecnoma_Laser_3240_Self-propelled_sprayer_at_IndAgra_Farm_Romexpo_2010_(front_view).JPG' }
    ],
    plantadeira: [
      { u: W + '6/6b/John_Deere_16_row_planter_a.jpg/960px-John_Deere_16_row_planter_a.jpg', a: 'Terren', l: 'CC BY 2.0', p: 'https://commons.wikimedia.org/wiki/File:John_Deere_16_row_planter_a.jpg' },
      { u: W + 'b/bc/John_Deere_Planter_with_Case_IH_Tractor.JPG/960px-John_Deere_Planter_with_Case_IH_Tractor.JPG', a: 'Kowloonese', l: 'CC BY 3.0', p: 'https://commons.wikimedia.org/wiki/File:John_Deere_Planter_with_Case_IH_Tractor.JPG' }
    ]
  };
  const hash = (s) => [...String(s)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
  // foto principal de uma máquina: a da inspeção, se houver; senão uma de demonstração do mesmo tipo
  function de(t, i = 0) {
    if (t && t.fotos && t.fotos[i]) return { u: t.fotos[i], propria: true };
    const l = F[t && t.tipo] || F.trator;
    return l[(hash(t && (t.id || t.chassi || t.modelo)) + i) % l.length];
  }
  const mini = (url) => url.replace('/960px-', '/330px-');
  raiz.FOTOS = { F, de, mini, todas: () => Object.values(F).flat() };
})(typeof window !== 'undefined' ? window : globalThis);
