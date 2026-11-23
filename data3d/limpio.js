/* ============ VISTA LIMPIA (por defecto) ============
   Al entrar solo se ve el territorio, el panel de la izquierda (reloj, SIMULACIONES 1–12, sintaxis espacial con su barra de
   colores, flujo de carros con su barra, capas: ruido, foto, etc.) y abajo la barra de años con play.
   Se esconden: paneles de escenarios A·B·C, agentes, red biótica (panel), barra de render/noche/…, años/día y los textos largos.
   ?modo=completo vuelve a la interfaz de antes.

   SIMULACIONES: al escoger una se prepara el territorio (proyecto dibujado, cámara) y se queda en el año 1 esperando PLAY.
   La 7 es el Metro Línea 1: en obra desde ya (data3d/metro_l1.js) y opera desde marzo de 2028 = semana 114 del modelo (año 3;
   Empresa Metro de Bogotá). Desde que opera bajan los carros que se dibujan durante un año hasta METRO_MENOS_CARROS.
   [SUP] METRO_MENOS_CARROS = 0,10: no hay cifra oficial de cuánto tráfico quita la Línea 1. */
import { RELOJ } from './reloj.js?v=5';
import { iniciarSimUI } from './sim_ui.js?v=43';

export const METRO_SEM_OP = 114;
export const SEMANAS_FIN = 1040;
/* dos escenarios: Kennedy como está (sin la propuesta de la tesis) y Kennedy con la propuesta */
/* SEIS PARES: cada par pone a prueba lo mismo, con las mismas variables; uno corre Kennedy sin la propuesta y el otro con la
   infraestructura propuesta (id impar = sin, id par = con). */
const PARES = [
  { par: 1, n: 'Abastecimiento', prueba: 'La demanda de comida crece y Corabastos tiene un tope' },
  { par: 2, n: 'Movilidad', prueba: 'Se cierra temporalmente una vía estratégica' },
  { par: 3, n: 'Residuos', prueba: 'Aumentan los residuos orgánicos' },
  { par: 4, n: 'Biodiversidad', prueba: 'Se fragmenta o se pierde un parche ecológico' },
  { par: 5, n: 'Población y especulación', prueba: 'Sube la presión inmobiliaria' },
  { par: 6, n: 'Gobernanza', prueba: 'No alcanzan los recursos para todos los barrios' }
];
export const METRO_MENOS_CARROS = 0.10;   // [SUP] ver arriba
/* UN SOLO TIEMPO. La barra corre 20 años (1040 semanas) en tres plazos. 1× = un año en 12 s reales (20 años ≈ 4 min); 2× y 4× lo
   comprimen. El día (carros, fauna, cielo, reloj de la izquierda) corre con la MISMA velocidad: al subir la velocidad de los años suben
   también los carros (VEL_DIA = segundos simulados del día por segundo real). Un año real a 1× no es viable en una presentación. */
const FIN_SEM = 1040, AÑOS = 20;
const VELS = [52 / 12, 52 / 6, 52 / 3];   // semanas del modelo por segundo real: 1× = 1 año / 12 s, 2× = 6 s, 4× = 3 s
const VEL_DIA = [40, 80, 160];            // el día corre al mismo ritmo relativo (en pausa vuelve a tiempo real: 1×). Tope real: cada segundo
                                          // simulado del día cuesta ~4 ms (boids 2, carros 1, agentes 0,7, aves 0,4): con 10 ms por cuadro a 60 fps
                                          // caben ~150 s simulados por segundo; más que eso el reloj recorta (no hay pasos más grandes).
const VEL_TXT = ['1 año = 12 s', '1 año = 6 s', '1 año = 3 s']; // la simulación no va en tiempo real: el botón dice cuánto dura un año
const AÑO0 = 2026, MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const FASES = [{ n: 'Corto plazo', a0: 1, a1: 5 }, { n: 'Mediano plazo', a0: 6, a1: 10 }, { n: 'Largo plazo', a0: 11, a1: 20 }];

// las 12 simulaciones (nombre corto; base = escenario del modelo semanal que se prende en el mapa)
export const SIMS = [
  { id: 1, par: 1, n: 'Abastecimiento · sin propuesta', base: 'D', cam: 'general' },
  { id: 2, par: 1, n: 'Abastecimiento · con propuesta', base: 'C', cam: 'general' },
  { id: 3, par: 2, n: 'Movilidad · sin propuesta', base: 'D', cam: 'general' },
  { id: 4, par: 2, n: 'Movilidad · con propuesta', base: 'C', cam: 'general' },
  { id: 5, par: 3, n: 'Residuos · sin propuesta', base: 'D', cam: 'general' },
  { id: 6, par: 3, n: 'Residuos · con propuesta', base: 'C', cam: 'general' },
  { id: 7, par: 4, n: 'Biodiversidad · sin propuesta', base: 'D', cam: 'general' },
  { id: 8, par: 4, n: 'Biodiversidad · con propuesta', base: 'C', cam: 'general' },
  { id: 9, par: 5, n: 'Población y especulación · sin propuesta', base: 'D', cam: 'general' },
  { id: 10, par: 5, n: 'Población y especulación · con propuesta', base: 'C', cam: 'general' },
  { id: 11, par: 6, n: 'Gobernanza · sin propuesta', base: 'D', cam: 'general' },
  { id: 12, par: 6, n: 'Gobernanza · con propuesta', base: 'C', cam: 'general' }
];

const OCULTAR = ['#ci-toast', '#in-btn', '#ind-panel', '#esc', '#dock', '#esim', '#trafficHud', '#hud-c', '#c50-pill', '#ms-volver', '#ms', '#ms-intro', '#ms-cmp', '#cvMarca', '#pz-panel', '#cvAyuda', '#cvMini', '#c50-nuevo', '#c50-pan', '#c50-cmp', '#toast', '.es-et', '.esc-pt', '#vm-panel', '.vaca-et', '#mercred-ley', '.mr-et', '.merc-et'];

export function iniciarLimpio({ T3 }) {
  const html = document.documentElement;
  html.classList.add('limpio');
  const css = document.createElement('style'); css.id = 'limpio-css';
  css.textContent = `html.limpio ${OCULTAR.join(', html.limpio ')} { display: none !important; }
    html.limpio .lp-off, html.limpio #gs-izq .lp-off, html.limpio #gs-izq button.lp-off, html.limpio #gs-izq > .lp-off { display: none !important; }
    html.limpio #gs-izq { max-height: calc(100vh - 118px); overflow-y: auto; }
    #lp-sims { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-top: 6px; }
    #lp-sims button { padding: 7px 4px; font-size: 12.5px; letter-spacing: .01em; }
    #lp-sims button.on { box-shadow: inset 0 0 0 1px rgba(255,190,90,.9); }
#lp-sims .lp-gr { grid-column: 1 / -1; display: flex; align-items: baseline; justify-content: space-between; gap: 8px; margin: 8px 0 1px; padding-top: 7px; border-top: 1px solid rgba(255,255,255,.1); }
#lp-sims .lp-gr:first-child { margin-top: 0; padding-top: 0; border-top: 0; }
#lp-sims .lp-gr b { font: 600 11px system-ui, sans-serif; letter-spacing: .06em; text-transform: uppercase; color: #ffd28a; }
#lp-sims .lp-gr { display: block !important; } #lp-sims .lp-gr span { display: block; font: 400 10.5px/1.3 system-ui, sans-serif; opacity: .6; margin-top: 2px; text-align: left; }
#lp-sims button.con { border-color: rgba(142,230,168,.35); } #lp-sims button.con.on { box-shadow: inset 0 0 0 1px rgba(142,230,168,.95); }
    #lp-simn { margin: 6px 2px 2px; font: 500 12px/1.3 system-ui, sans-serif; opacity: .75; min-height: 16px; }
    /* barra de años (abajo, mismo vidrio de los paneles) */
    #lp-anos { position: fixed; left: 50%; bottom: 16px; transform: translateX(-50%); z-index: 40; display: flex; align-items: center; gap: 12px;
      padding: 10px 14px; width: min(760px, calc(100vw - 32px)); box-sizing: border-box; border-radius: 16px;
      background: linear-gradient(180deg, rgba(40,44,52,.62), rgba(20,22,28,.72)); border: 1px solid rgba(255,255,255,.14);
      backdrop-filter: blur(14px) saturate(1.2); -webkit-backdrop-filter: blur(14px) saturate(1.2); box-shadow: 0 10px 30px rgba(0,0,0,.35); color: #eef1f4; }
    #lp-anos button { flex: none; height: 34px; min-width: 34px; border-radius: 10px; border: 1px solid rgba(255,255,255,.18); background: rgba(255,255,255,.08); color: inherit; font: 600 13px system-ui, sans-serif; cursor: pointer; }
    #lp-anos button:hover { background: rgba(255,255,255,.16); }
    #lp-anos button.play { min-width: 44px; background: rgba(255,170,70,.9); color: #1c1205; border-color: transparent; }
    #lp-anos .tit { flex: none; max-width: 230px; font: 600 13px/1.2 system-ui, sans-serif; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    #lp-anos .vel { min-width: 92px !important; font-size: 11.5px !important; }
#lp-anos .ano { flex: none; font: 600 20px/1 'Barlow Condensed', system-ui, sans-serif; letter-spacing: .03em; min-width: 62px; text-align: right; }
    #lp-anos .pista { position: relative; flex: 1; height: 26px; }
    #lp-anos .pista i { position: absolute; left: 0; right: 0; top: 11px; height: 4px; border-radius: 3px; background: rgba(255,255,255,.16); }
    #lp-anos .pista b { position: absolute; left: 0; top: 11px; height: 4px; border-radius: 3px; background: linear-gradient(90deg, #ffb347, #ffd86b); width: 0; }
    #lp-anos .pista u { position: absolute; top: -3px; height: 12px; border-left: 1px solid rgba(255,255,255,.28); padding-left: 5px; box-sizing: border-box; font: 600 9px/12px system-ui, sans-serif; letter-spacing: .06em; text-transform: uppercase; text-decoration: none; opacity: .6; white-space: nowrap; overflow: hidden; }
#lp-anos .ano small { display: block; font: 600 9px/1.2 system-ui, sans-serif; letter-spacing: .08em; text-transform: uppercase; opacity: .6; text-align: right; }
#lp-anos .pista s { position: absolute; top: 18px; transform: translateX(-50%); font: 500 10px system-ui, sans-serif; opacity: .55; text-decoration: none; }
    #lp-anos.vacia .play, #lp-anos.vacia .vel, #lp-anos.vacia .rei { opacity: .45; pointer-events: none; }
    @media (max-width: 640px) { #lp-anos .tit { display: none; } #lp-anos { gap: 8px; padding: 8px 10px; } }`;
  document.head.appendChild(css);

  /* ---------- panel de la izquierda: se quita poco (ángulo, textos largos, flujo de agentes, ¿de dónde vienen?, agentes) ---------- */
  const limpiarPanel = () => {
    const g = document.getElementById('gs-izq'); if (!g) return false;
    const off = (el) => el && el.classList.add('lp-off');
    for (const s of g.querySelectorAll('.gs-sub')) {
      const t = (s.textContent || '').trim().toUpperCase();
      if (t.startsWith('ÁNGULO') || t.startsWith('FLUJO DE AGENTES')) off(s);
      if (t.startsWith('CORABASTOS')) { off(s); if (s.parentElement !== g && s.parentElement.children.length < 8) off(s.parentElement); for (let k = s.nextElementSibling; k && !k.classList.contains('gs-sub') && !k.classList.contains('ui-capas-h'); k = k.nextElementSibling) off(k); } // «Estado actual / Con la propuesta»: lo deciden las simulaciones
    }
    const ang = document.getElementById('gs-ang'); off(ang); if (ang && ang.nextElementSibling && /⟲|＋/.test(ang.nextElementSibling.textContent)) off(ang.nextElementSibling);
    g.querySelectorAll(':scope > h3, :scope > p').forEach(off); off(document.getElementById('gs-dia')); off(document.getElementById('gs-jor'));
    g.querySelectorAll('.gs-reloj em, .gs-reloj small').forEach(off);
    g.querySelectorAll('.ci-sx').forEach(off);                         // el párrafo largo de la sintaxis (la barra de colores se queda)
    off(document.getElementById('gs-flujo')); off(document.getElementById('gs-og'));
    const ag = document.getElementById('gs-ag'); if (ag) off(ag.closest('.gs-fila'));
    g.querySelectorAll(':scope > div:not([id]):not([class])').forEach(d => { if (!d.querySelector('button') && (d.textContent || '').trim().length > 60) off(d); });
    // SIMULACIONES
    if (!document.getElementById('lp-sims')) {
      const h = document.createElement('div'); h.className = 'gs-sub'; h.textContent = 'SIMULACIONES';
      const f = document.createElement('div'); f.id = 'lp-sims';
      f.innerHTML = PARES.map(P => `<div class="lp-gr"><b>${String(P.par).padStart(2, '0')} · ${P.n}</b><span>${P.prueba}</span></div><button type="button" data-s="${2 * P.par - 1}" title="${P.n} sin propuesta">Sin propuesta</button><button type="button" data-s="${2 * P.par}" class="con" title="${P.n} con propuesta">Con propuesta</button>`).join('');
      const nm = document.createElement('div'); nm.id = 'lp-simn';
      const ancla = g.querySelector('.gs-reloj'); (ancla ? ancla.parentNode : g).insertBefore(h, ancla ? ancla.nextSibling : g.firstChild); h.after(f); f.after(nm);
      f.querySelectorAll('button').forEach(b => { b.onclick = () => escoger(+b.dataset.s); });
    }
    return true;
  };
  const intentar = () => { if (!limpiarPanel()) setTimeout(intentar, 300); };
  intentar();
  // el tablero de interacciones (su panel está escondido en esta vista) no necesita correr: libera ~0,2 ms por segundo simulado
  let nTb = 0; const apTb = setInterval(() => { const s = RELOJ.sistemas.find(x => x.nombre === 'tablero'); if (s && !s._lp) { s._lp = 1; s.step = () => {}; } if (s || ++nTb > 60) clearInterval(apTb); }, 1000);
  let nRep = 0; const rep = setInterval(() => { limpiarPanel(); if (++nRep > 30) clearInterval(rep); }, 1000);

  /* sin la franja verde de la orilla del humedal ni los rellenos planos verdes de zonas (se veían raros sobre la foto) */
  const esVerdePlano = (o) => { if (!o.isMesh || !o.material || o.material.type !== 'MeshBasicMaterial' || !o.material.color) return false; const c = o.material.color;
    if (!(c.g > 0.5 && c.g > c.r * 1.25 && c.g > c.b * 1.6)) return false; if (!o.geometry.boundingBox) o.geometry.computeBoundingBox(); const b = o.geometry.boundingBox; return b && (b.max.y - b.min.y) < 0.5; };
  // sin los anillos naranjas de entrada ni los halos de camiones (data3d/origenes.js): la autora no los quiere (solo los carros)
  setInterval(() => { { const og = T3.scene.getObjectByName('origenes'); if (og) og.visible = false; } for (const nm of ['picos_zonas', 'picos_ind']) T3.scene.traverse(o => { if (o.name === nm && o.material) o.material.visible = false; }); /* sin anillos naranjas ni agujas azules */ document.querySelectorAll('.og-et').forEach(e => { e.style.display = 'none'; }); }, 500);
  setInterval(() => { T3.scene.traverse(o => {
    if (o.name && /^orilla_/.test(o.name)) o.traverse(x => { if (x.material) (Array.isArray(x.material) ? x.material : [x.material]).forEach(m => { m.visible = false; }); });
    else if (o.userData.lpVerde !== false && esVerdePlano(o)) { o.material.visible = false; o.userData.lpVerde = true; } }); }, 1500);

  /* ---------- barra de años ---------- */
  const bar = document.createElement('div'); bar.id = 'lp-anos'; bar.className = 'vacia';
  bar.innerHTML = `<button type="button" class="play" title="Correr la simulación (barra espaciadora)">▶</button>
    <button type="button" class="rei" title="Volver al año 1">⟲</button>
    <span class="tit">Escoge una simulación</span>
    <div class="pista"><i></i><b></b>${FASES.map(f => `<u title="${f.n} · años ${f.a0}–${f.a1}" style="left:${(f.a0 - 1) / AÑOS * 100}%;width:${(f.a1 - f.a0 + 1) / AÑOS * 100}%">${f.n.replace(' plazo', '')}</u>`).join('')}${[1, 5, 10, 15, 20].map(a => `<s style="left:${(a - 0.5) / AÑOS * 100}%">${a}</s>`).join('')}</div>
    <span class="ano">Año 1<small>Corto plazo</small></span>
    <button type="button" class="vel" title="Velocidad: cuánto dura un año de la simulación (no es tiempo real)">${VEL_TXT[0]}</button>`;
  document.body.appendChild(bar);
  const $b = (s) => bar.querySelector(s);
  let vel = 0;
  $b('.play').onclick = () => alternar();
  $b('.rei').onclick = () => { if (!ESC.activo) return; reiniciar(); };
  $b('.vel').onclick = () => { vel = (vel + 1) % VELS.length; $b('.vel').textContent = VEL_TXT[vel]; if (!RELOJ.pausaSem) { RELOJ.ponerVelAños(VELS[vel]); RELOJ.ponerVel(VEL_DIA[vel]); } };
  addEventListener('keydown', (e) => { if (e.code === 'Space' && !/INPUT|TEXTAREA|SELECT|BUTTON/.test(document.activeElement && document.activeElement.tagName)) { e.preventDefault(); alternar(); } });
  function alternar() {
    if (!ESC.activo) return;
    if (RELOJ.pausaSem) { if (RELOJ.sem >= FIN_SEM) reiniciar(); RELOJ.detenerSemEn = FIN_SEM; RELOJ.ponerVelAños(VELS[vel]); RELOJ.pausarAños(false); RELOJ.presupuestoMs = 10; RELOJ.ponerVel(VEL_DIA[vel]); }
    else { RELOJ.pausarAños(true); RELOJ.presupuestoMs = 6; RELOJ.ponerVel(1); }
  }
  function reiniciar() { if (RELOJ.saltando) return; RELOJ.reiniciarModelo(); RELOJ.pausarAños(true); RELOJ.ponerVel(1); dispatchEvent(new Event('lp-reinicio')); }
  RELOJ.alDibujar(() => {
    const s = Math.min(FIN_SEM, RELOJ.semanas || RELOJ.sem), corre = !RELOJ.pausaSem;
    if (RELOJ.pausaSem && RELOJ.vel > 1 && !RELOJ.saltando) { RELOJ.ponerVel(1); RELOJ.presupuestoMs = 6; } // la pausa al llegar al final (o por un aviso) también vuelve el día a tiempo real
    $b('.pista b').style.width = (s / FIN_SEM * 100).toFixed(2) + '%';
    const a = Math.min(AÑOS, Math.floor(s / 52) + 1), fa = FASES.find(f => a >= f.a0 && a <= f.a1) || FASES[0], txa = `Año ${a}<small>${MESES[Math.min(11, Math.floor((s % 52) / 52 * 12))]} ${AÑO0 + Math.floor(s / 52)} · ${fa.n.replace(' plazo', '')} plazo</small>`;
    if ($b('.ano').innerHTML !== txa) $b('.ano').innerHTML = txa;
    const p = $b('.play'), txt = corre ? '❚❚' : '▶'; if (p.textContent !== txt) p.textContent = txt;
  });

  /* ---------- escoger simulación: prepara el territorio y espera PLAY ---------- */
  const ESC = window.KEN_LIMPIO = { activo: 0, sim: null, factorCarros: () => factorCarros(), SIMS };
  let UI = null; iniciarSimUI({ T3, SIMS_UI: SIMS }).then(u => { UI = window.KEN_SIMUI = u; if (ESC.activo) u.preparar(ESC.activo); }).catch(e => console.warn('interfaz de simulaciones:', e));
  /* PANTALLA DIVIDIDA (data3d/pantalla_dividida.js): al darle play, axonometría a la izquierda y planta a la derecha, con el tablero */
  if (!/[?&]dividida=0/.test(location.search)) import('./pantalla_dividida.js?v=2').then(m => m.iniciarDividida({ T3, ESC })).catch(e => console.warn('pantalla dividida:', e));
  function factorCarros() { // multiplica la demanda de tráfico que se dibuja (index.html, updateTraffic)
    if (window.KEN_TRAF_F) return window.KEN_TRAF_F; // más carros (los mismos de la simulación SUMO) cuando el modelo dice que hay más tráfico
    return 1; // el metro está en todas las simulaciones: su efecto lo lleva el modelo semanal
    if (ESC.activo !== 7) return 1;
    const d = RELOJ.sem - METRO_SEM_OP; if (d < 0) return 1;
    return 1 - METRO_MENOS_CARROS * Math.min(1, d / 52);
  }
  function escoger(id) {
    const S = SIMS.find(s => s.id === id); if (!S) return;
    ESC.activo = id; ESC.sim = S; bar.classList.remove('vacia');
    document.querySelectorAll('#lp-sims button').forEach(b => b.classList.toggle('on', +b.dataset.s === id));
    const nm = document.getElementById('lp-simn'); if (nm) nm.textContent = S.n;
    $b('.tit').textContent = `Simulación ${id} · ${S.n}`;
    // escenario del modelo en el mapa (los botones del panel A·B·C·D, escondido)
    const btn = document.querySelector(`#esim .seg button[data-e="${S.base}"]`); if (btn) btn.click();
    if (window.KEN_PLANBAV) window.KEN_PLANBAV.ver(S.base === 'D');
    // queda en el año 1, en pausa: corre al darle play
    setTimeout(() => { reiniciar(); if (UI) UI.preparar(id); }, 60);
    // rutas y vehículos de reparto de «Viajes de abastecimiento» (panel escondido): apagados, tiñen el mapa de naranja y pesan
    for (const ms of [400, 1500, 3500]) setTimeout(() => { const vm = document.getElementById('vm-panel'); if (vm) vm.querySelectorAll('button').forEach(b => { if (/^Apagar$/.test(b.textContent.trim()) && !b.classList.contains('on')) b.click(); }); }, ms);
    // la cámara NO se mueve al escoger una simulación: el panel escondido A·B·C·D pide su «vista general» 250 ms después del clic; se cancela
    setTimeout(() => { if (T3.anim) T3.anim = null; }, 300); setTimeout(() => { if (T3.anim) T3.anim = null; }, 600);
  }
  /* VISTA INICIAL FIJA: la cámara aparece ya en la vista de pájaro final (la misma de la «vista general»: Bavaria, El Burro, la Av. Ciudad de
     Cali y Corabastos en un cuadro), sin el vuelo de llegada de index.html (T3.llegada) ni zoom. */
  const MOVIL = matchMedia('(max-width: 760px)').matches || /Mobi|Android/i.test(navigator.userAgent);
  const VISTA = { c: [MOVIL ? 2162 : 2412, 0, 420], d: [270, 2250, 1012] };
  function ponerVista() { if (!T3.camera || !T3.orbit) return; T3.anim = null; T3.llegada = null; T3.orbit.target.set(VISTA.c[0], VISTA.c[1], VISTA.c[2]); T3.camera.position.set(VISTA.c[0] + VISTA.d[0], VISTA.d[1], VISTA.c[2] + VISTA.d[2]); T3.orbit.update(); }
  ponerVista();
  { let k = 0; const fija = setInterval(() => { const L = document.getElementById('loader'); if (L && !L.classList.contains('hidden')) { ponerVista(); return; } if (++k < 12) ponerVista(); else clearInterval(fija); }, 250); } // mientras carga y el primer segundo y medio después de abrir
  /* PRECOMPILAR lo que aparece más tarde (estaciones, catenaria y letreros del metro, que se prenden al abrir en la semana 114): si se
     compilan sus sombreadores en ese momento la imagen se congela ~0,5 s; se hace una vez al cargar, con esos grupos visibles un instante */
  setTimeout(function precompilar() {
    const L = document.getElementById('loader'); if (L && !L.classList.contains('hidden')) return void setTimeout(precompilar, 800);
    try { const g = ['metro_l1_estaciones', 'metro_l1_catenaria', 'metro_l1_letreros', 'metro_l1_obra'].map(n => T3.scene.getObjectByName(n)).filter(Boolean);
      const antes = g.map(o => o.visible); g.forEach(o => { o.visible = true; }); if (T3.renderer.compile) T3.renderer.compile(T3.scene, T3.camera); g.forEach((o, i) => { o.visible = antes[i]; }); } catch (e) { /* sin precompilar */ }
  }, 2500);  /* PRECARGA: los módulos de las simulaciones se bajan mientras está la portada, para que nada cargue (ni trabe) al darle play */
  for (const m of ['./basura.js?v=2', './cierre_gradual.js?v=4', './predio_trafico.js?v=3', './caminos_instituto.js?v=1', './degradacion.js?v=1', './indicadores.js?v=12', './informe.js?v=2', './capas_pares.js?v=1', './abasto_contenedor.js?v=6']) import(m).catch(() => {});

  /* al entrar queda escogida la simulación 1 (estado actual), en el año 1 y en pausa: la misma vista y el mismo panel que al darle «Simulación 1» */
  const autoUno = () => { if (ESC.activo) return; const L = document.getElementById('loader');
    if ((L && !L.classList.contains('hidden')) || !document.querySelector('#esim .seg button[data-e="A"]') || !document.getElementById('lp-sims')) return void setTimeout(autoUno, 400);
    setTimeout(() => { if (!ESC.activo) escoger(1); }, 900); };
  /* al entrar NO queda escogida ninguna simulación: solo la vista normal (pedido de la autora); se escoge con los botones */
  function volar(cual) {
    if (!T3.camera || !T3.orbit) return; const V = T3.THREE.Vector3; let c, d;
    if (cual === 'metro') {
      const M = window.KEN_METRO; let cx, cz;
      if (M && M.punto) { let sx = 0, sz = 0, n = 0; for (let f = 0.2; f <= 0.8; f += 0.1) { const q = M.punto(f * M.largo); sx += q.x != null ? q.x : q[0]; sz += q.z != null ? q.z : q[1]; n++; } cx = sx / n; cz = sz / n; }
      else [cx, cz] = T3.lw(6325, 560);
      c = new V(cx, 0, cz); d = new V(-700, 1500, 1500);
    } else if (cual === 'bavaria') { c = new V(3950, 0, 180); d = new V(-620, 620, 760); }
    else if (cual === 'corabastos') { const [x, z] = T3.lw(5900, 2850); c = new V(x, 0, z); d = new V(-500, 640, 820); }
    else if (cual === 'general') { c = new V(2600, 0, 300); d = new V(-1300, 1700, 2000); }
    else { c = new V(2320, 25, -100); d = new V(-580, 305, 800); }
    T3.anim = { t: 0, dur: 3.0, p0: T3.camera.position.clone(), c0: T3.orbit.target.clone(), p1: c.clone().add(d), c1: c };
  }

  /* trazo de la Línea 1 (simulación 7): naranja tenue mientras está en obra, amarillo encendido desde que opera */
  let trazo = null;
  const armarTrazo = () => {
    const M = window.KEN_METRO; if (trazo || !M || !M.punto) return;
    const THREE = T3.THREE, pts = [], G = (T3.sueloY != null ? T3.sueloY : 0.3) + 13;
    for (let s = 0; s <= M.largo; s += 25) { const q = M.punto(s); pts.push(new THREE.Vector3(q.x != null ? q.x : q[0], G, q.z != null ? q.z : q[1])); }
    if (pts.length < 2) return;
    const geo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), pts.length * 2, 7, 6, false);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffb02e, transparent: true, opacity: 0.5, depthWrite: false, toneMapped: false });
    trazo = new THREE.Mesh(geo, mat); trazo.renderOrder = 9; trazo.frustumCulled = false; trazo.visible = false; T3.scene.add(trazo);
  };
  RELOJ.alDibujar(() => {
    if (!trazo) { armarTrazo(); if (!trazo) return; }
    trazo.visible = !!ESC.activo; if (!trazo.visible) return; // el metro está en todas
    const m = trazo.material;
    if (RELOJ.sem >= METRO_SEM_OP) { m.color.setHex(0xfff04a); m.opacity = 0.95; }
    else { m.color.setHex(0xff8a1e); m.opacity = 0.35 + 0.25 * (0.5 + 0.5 * Math.sin(RELOJ.tAnim * 3)); }
  });
  return ESC;
}
