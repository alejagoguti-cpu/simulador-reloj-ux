/* ============ INTERFAZ DE LAS 12 SIMULACIONES (vista limpia) ============
   Corre el modelo semanal de data3d/simulaciones12.js al mismo paso que la barra de años (RELOJ.sem) y muestra:
   · panel de la derecha (vidrio): variables (sliders) de la simulación, indicadores en vivo con su gráfica, picos en el piso y foco;
   · GAME OVER: la pantalla se pone roja y titila con la regla que se cumplió, y luego sale el informe;
   · informe final (al año 20 o en el game over): veredicto, tabla inicio → final, gráficas, especies que desaparecieron y por qué,
     comparación con «Hoy» (simulación 1, misma semilla) e imprimir/guardar en PDF.
   Todo lo que se muestra sale del modelo (simulaciones.js); aquí no se calcula ningún dato. (ind().sem va de 1 a 520) */
import { RELOJ } from './reloj.js?v=5';

const SEMILLA = 1; let FIN = 1040; // 20 años (M.SEMANAS_FIN si el modelo lo trae)
const IND = [ // resultados en vivo: clave en ind(), nombre, formato, mejor si sube (true) o baja (false)
  { k: 'fauna', n: 'Especies de fauna', f: (v, I) => `${v} de ${I.fauna0}`, sube: true },
  { k: 'red', n: 'Interacciones entre especies', f: (v) => fmt(v), sube: true, ayuda: 'relaciones de la red biótica que ocurren en cada lugar' },
  { k: 'poliniz', n: 'Polinizadores', f: (v) => fmt(v), sube: true, ayuda: 'lugares con abejas, colibríes y otros polinizadores' },
  { k: 'huertas', n: 'Huertas activas', f: (v) => fmt(v), sube: true },
  { k: 'pares', n: 'Territorio con fauna', f: (v) => fmt(v), sube: true, ayuda: 'pares especie × lugar ocupados' },
  { k: 'trafico', n: 'Tráfico', f: (v) => (v * 100).toFixed(0) + ' %', sube: false, ayuda: '100 % = hoy' },
  { k: 'ruidoDb', n: 'Ruido promedio', f: (v) => v == null ? '—' : v.toFixed(1) + ' dB', sube: false },
  { k: 'atropellos', n: 'Fauna atropellada', f: (v) => v == null ? '—' : fmt(v), sube: false, ayuda: 'índice por semana' },
  { k: 'comidaMin', n: 'Comida en la zona peor', f: (v) => (v * 100).toFixed(0) + ' %', sube: true, pts: 100 },
  { k: 'basuraT', n: 'Basura generada', f: (v) => fmt(v) + ' t/día', sube: false, ayuda: 'Corabastos, plaza de flores y viviendas alrededor' },
  { k: 'ratas', n: 'Ratas', f: (v, I) => I.ratas0 ? '×' + (v / I.ratas0).toFixed(1) : (+v).toFixed(2), sube: false, ayuda: 'veces las de hoy' },
  { k: 'humedalHa', n: 'Humedales', f: (v) => (+v).toFixed(1) + ' ha', sube: true },
  { k: 'humedalFuncional', n: 'Humedales que funcionan', f: (v) => Math.round(v) + ' %', sube: true, pts: 1, ayuda: 'área sin rellenar × calidad frente a la basura del borde (game over si cae 30 %)' },
  { k: 'congestion', n: 'Congestión', f: (v) => Math.round(v) + ' %', sube: false, ayuda: 'tiempo extra de viaje frente a vía libre' },
  { k: 'sinRecoger', n: 'Basura sin recoger', f: (v) => (v * 100).toFixed(0) + ' %', sube: false, pts: 100, ayuda: 'fracción de la basura que nadie recoge (termina en calles y bordes de humedales)' },
  { k: 'arbolesPerdidos', n: 'Árboles perdidos en parques', f: (v) => (v * 100).toFixed(1) + ' %', sube: false, pts: 100 },
  { k: 'circularIdx', n: 'Economía circular', f: (v) => (v * 100).toFixed(1) + ' %', sube: true, pts: 100, ayuda: 'orgánicos que vuelven como abono a las huertas' },
  { k: 'sueloIdx', n: 'Precio del suelo (cerca del metro y proyectos)', f: (v) => '×' + (+v).toFixed(2), sube: false, ayuda: '1 = hoy; sube con el metro y el plan parcial (especulación)' },
  { k: 'hogaresRiesgo', n: 'Hogares en riesgo de desplazamiento', f: (v) => fmt(v), sube: false },
  { k: 'residuos', n: 'Orgánicos sin compostar', f: (v) => (v * 100).toFixed(0) + ' %', sube: false, ayuda: '% de la capacidad de las composteras de la red', soloSi: (H) => H.some(h => h.residuos > 0.005) }
];
const fmt = (v) => v == null || isNaN(v) ? '—' : Math.round(v).toLocaleString('es-CO');
const derivar = (I) => { if (I.circular) I.circularIdx = I.circular.indice; if (I.especulacion) { I.sueloIdx = I.especulacion.indice; I.hogaresRiesgo = I.especulacion.hogaresRiesgo; } if (I.basura) { I.basuraT = I.basura.total_t_dia; if (I.basura.fraccionSinRecoger != null) I.sinRecoger = I.basura.fraccionSinRecoger; } return I; };

export async function iniciarSimUI({ T3, SIMS_UI }) {
  let M = null; // módulo del modelo
  try { M = await import('./simulaciones12.js?v=16'); if (M.cargarDatos) await M.cargarDatos(); }
  catch (e) { console.warn('simulaciones (modelo):', e); M = null; }
  if (M && M.SEMANAS_FIN) FIN = M.SEMANAS_FIN;

  /* ---------- estilos (vidrio, como los paneles del simulador) ---------- */
  const st = document.createElement('style'); st.id = 'simui-css';
  st.textContent = `
  .su-glass { background: linear-gradient(180deg, rgba(40,44,52,.62), rgba(20,22,28,.74)); border: 1px solid rgba(255,255,255,.14); border-radius: 16px;
    backdrop-filter: blur(14px) saturate(1.2); -webkit-backdrop-filter: blur(14px) saturate(1.2); box-shadow: 0 10px 30px rgba(0,0,0,.35); color: #eef1f4; font-family: Geist, system-ui, sans-serif; }
  #su-der { position: fixed; right: 16px; top: 16px; width: 300px; max-height: calc(100vh - 200px); overflow-y: auto; z-index: 39; padding: 12px 14px; display: none; }
  #su-der.on { display: block; }
  #su-der h4 { margin: 10px 0 6px; font: 600 10.5px/1 Geist, system-ui, sans-serif; letter-spacing: .18em; text-transform: uppercase; opacity: .6; }
  #su-der .pre { margin: 0 0 4px; font: 500 12px/1.35 system-ui, sans-serif; opacity: .8; }
  .su-sl { margin: 8px 0 10px; }
  .su-sl label { display: flex; justify-content: space-between; font: 500 12px system-ui, sans-serif; margin-bottom: 4px; }
  .su-sl label b { font-weight: 600; color: #ffcf7a; }
  .su-sl input[type=range] { width: 100%; -webkit-appearance: none; appearance: none; height: 4px; border-radius: 3px; background: linear-gradient(90deg, #ffb347 var(--p,50%), rgba(255,255,255,.18) var(--p,50%)); outline: none; }
  .su-sl input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; width: 16px; height: 16px; border-radius: 50%; background: #fff; border: 3px solid #ffb347; box-shadow: 0 2px 6px rgba(0,0,0,.4); cursor: pointer; }
  .su-sl input[type=range]::-moz-range-thumb { width: 12px; height: 12px; border-radius: 50%; background: #fff; border: 3px solid #ffb347; cursor: pointer; }
  #su-inds { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
  .su-ind { display: grid; grid-template-columns: 1fr auto; grid-template-areas: 'n n' 'v c' 's s'; gap: 2px 6px; align-items: end; padding: 7px 8px 5px; border-radius: 10px; background: rgba(255,255,255,.045); border: 1px solid rgba(255,255,255,.07); border-left: 2px solid transparent; }
  .su-ind.mueve.bien { border-left-color: #8ee6a8; } .su-ind.mueve.mal { border-left-color: #ff8a80; }
  .su-ind i.ch { grid-area: c; font: 600 10.5px system-ui, sans-serif; font-style: normal; opacity: .8; white-space: nowrap; } .su-ind i.ch.bien { color: #8ee6a8; opacity: 1; } .su-ind i.ch.mal { color: #ff8a80; opacity: 1; }
  .su-ind span { grid-area: n; font: 500 10.5px/1.25 system-ui, sans-serif; opacity: .75; min-height: 2.5em; }
  .su-ind b { grid-area: v; font: 600 19px/1 'Barlow Condensed', system-ui, sans-serif; letter-spacing: .02em; }
  
  .su-ind svg { grid-area: s; width: 100%; height: 26px; margin-top: 2px; }
  .su-picos { display: grid; gap: 4px; } .su-picos button { position: relative; display: flex; align-items: center; gap: 8px; width: 100%; text-align: left; padding: 6px 8px 6px 15px; border-radius: 8px; border: 1px solid rgba(255,255,255,.09); background: rgba(255,255,255,.04); color: inherit; font: 500 12px system-ui, sans-serif; cursor: pointer; overflow: hidden; }
  .su-picos button.on { background: rgba(255,255,255,.12); border-color: rgba(255,255,255,.55); } .su-picos i { position: absolute; left: 0; top: 0; bottom: 0; width: 6px; } .su-picos b { font: 600 11px 'JetBrains Mono', ui-monospace, monospace; min-width: 30px; }
  .su-que { margin: 9px 0 2px; font: 400 12px/1.4 system-ui, sans-serif; opacity: .9; } .su-que b { font-weight: 600; } .su-que span { opacity: .6; font-size: 11px; }
  #ojo-t { right: auto !important; left: 296px !important; transform: none; top: auto !important; bottom: 92px !important; z-index: 46 !important; } @media (max-width: 760px) { #ojo-t { left: 50% !important; transform: translateX(-50%); } } /* abajo a la izquierda: a la derecha va la leyenda de la maqueta */ /* la tarjeta del Ojo de Dios abajo al centro: arriba a la derecha la tapaba el panel */
  .su-lug { display: flex; flex-wrap: wrap; gap: 5px; } .su-lug button { border: 1px solid rgba(255,255,255,.16); background: rgba(255,255,255,.06); color: inherit; border-radius: 8px; font: 500 11.5px system-ui, sans-serif; padding: 5px 9px; cursor: pointer; } .su-lug button:hover { background: rgba(255,207,122,.18); border-color: rgba(255,207,122,.5); }
  #su-hist { position: fixed; left: 296px; top: 16px; z-index: 43; width: 330px; max-width: calc(100vw - 640px); padding: 11px 13px 9px; border-radius: 14px; color: #f2f3f5; background: linear-gradient(180deg, rgba(40,44,52,.74), rgba(20,22,28,.86)); border: 1px solid rgba(255,255,255,.14); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); box-shadow: 0 10px 30px rgba(0,0,0,.35); display: none; font: 400 11.5px/1.35 system-ui, sans-serif; }
  #su-hist.on { display: block; } #su-hist h5 { margin: 0 0 2px; font: 600 10.5px system-ui, sans-serif; letter-spacing: .08em; text-transform: uppercase; color: #ffd28a; } #su-hist p { margin: 0 0 7px; opacity: .75; }
  #su-hist .cab, #su-hist li { display: grid; grid-template-columns: 1fr 86px 78px; gap: 6px; align-items: baseline; } #su-hist .cab { font: 600 9.5px system-ui, sans-serif; letter-spacing: .06em; text-transform: uppercase; opacity: .6; padding-bottom: 3px; border-bottom: 1px solid rgba(255,255,255,.1); }
  #su-hist ul { list-style: none; margin: 0; padding: 0; } #su-hist li { padding: 4px 0; border-bottom: 1px solid rgba(255,255,255,.05); } #su-hist li .n { opacity: .85; } #su-hist li b { font: 600 15px 'Barlow Condensed', system-ui, sans-serif; color: #8ee6a8; text-align: right; } #su-hist li i { font: 500 13px 'Barlow Condensed', system-ui, sans-serif; font-style: normal; opacity: .55; text-align: right; }
  @media (max-width: 1100px) { #su-hist { display: none !important; } }
  #su-previa { margin: 4px 0 8px; padding: 7px 9px; border-radius: 8px; background: rgba(255,207,122,.12); border: 1px solid rgba(255,207,122,.3); font: 500 11.5px/1.35 system-ui, sans-serif; color: #ffe3ad; }
  #su-cambio { margin: 7px 0 0; font: 500 11.5px system-ui, sans-serif; opacity: .9; } #su-cambio b { font: 600 14px 'Barlow Condensed', system-ui, sans-serif; } #su-cambio.bien b { color: #8ee6a8; } #su-cambio.mal b { color: #ff8a80; }
  .su-alto { display: flex; align-items: center; gap: 10px; margin-top: 8px; font: 500 11px system-ui, sans-serif; opacity: .85; } .su-alto input { flex: 1; accent-color: #ffcf7a; }
  .su-rampa { height: 8px; border-radius: 3px; margin-top: 8px; } .su-rampa-t { display: flex; justify-content: space-between; font: 500 10px system-ui, sans-serif; opacity: .6; margin-top: 2px; }
  .su-seg { display: flex; gap: 6px; flex-wrap: wrap; } .su-seg button { flex: 1; min-width: 70px; padding: 6px 4px; border-radius: 9px; border: 1px solid rgba(255,255,255,.16); background: rgba(255,255,255,.07); color: inherit; font: 500 12px system-ui, sans-serif; cursor: pointer; }
  .su-seg button.on { background: rgba(255,176,70,.88); color: #1b1206; border-color: transparent; }
  /* GAME OVER */
  #su-go { position: fixed; inset: 0; z-index: 70; pointer-events: none; display: none; align-items: center; justify-content: center; flex-direction: column; text-align: center; }
  #su-go.on { display: flex; animation: suRojo 0.9s ease-in-out infinite alternate; }
  @keyframes suRojo { from { background: rgba(200,20,20,.18); } to { background: rgba(200,20,20,.42); } }
  #su-go h1 { margin: 0; font: 800 clamp(54px, 10vw, 132px)/0.95 'Barlow Condensed', system-ui, sans-serif; letter-spacing: .04em; color: #fff; text-shadow: 0 0 30px rgba(255,40,40,.9), 0 4px 0 rgba(0,0,0,.25); animation: suTit 0.5s steps(2) infinite; }
  @keyframes suTit { 50% { opacity: .55; } }
  #su-go p { margin: 14px 0 0; padding: 10px 18px; border-radius: 12px; background: rgba(20,10,10,.6); font: 600 clamp(14px, 1.6vw, 19px)/1.35 system-ui, sans-serif; color: #ffe2df; max-width: 80vw; }
  /* INFORME */
  #su-inf { position: fixed; inset: 0; z-index: 80; display: none; align-items: center; justify-content: center; background: rgba(6,8,12,.55); }
  #su-inf.on { display: flex; }
  #su-inf .caja { width: min(980px, calc(100vw - 24px)); max-height: calc(100vh - 32px); overflow-y: auto; padding: 22px 26px 26px; }
  #su-inf header { display: flex; align-items: flex-start; gap: 12px; }
  #su-inf header div { flex: 1; } #su-inf h2 { margin: 0; font: 600 26px/1.1 'Barlow Condensed', system-ui, sans-serif; letter-spacing: .02em; }
  #su-inf .sub { margin: 4px 0 0; font: 500 13px system-ui, sans-serif; opacity: .7; }
  #su-inf .ver { margin: 16px 0; padding: 12px 16px; border-radius: 12px; font: 600 16px/1.4 system-ui, sans-serif; }
  #su-inf .ver.go { background: rgba(220,40,40,.22); border: 1px solid rgba(255,90,90,.5); } #su-inf .ver.ok { background: rgba(60,180,110,.18); border: 1px solid rgba(110,220,150,.45); }
  #su-inf table { width: 100%; border-collapse: collapse; font: 500 13px system-ui, sans-serif; margin: 8px 0 4px; }
  #su-inf th, #su-inf td { padding: 7px 8px; border-bottom: 1px solid rgba(255,255,255,.08); text-align: right; } #su-inf th:first-child, #su-inf td:first-child { text-align: left; }
  #su-inf th { font: 600 10.5px/1 Geist, system-ui, sans-serif; letter-spacing: .14em; text-transform: uppercase; opacity: .6; }
  #su-inf td.bien { color: #8ee6a8; } #su-inf td.mal { color: #ff8a80; }
  #su-inf .graf { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 12px; margin: 14px 0; }
  #su-inf .graf figure { margin: 0; padding: 10px 12px; border-radius: 12px; background: rgba(255,255,255,.05); }
  #su-inf .graf figcaption { font: 600 11px Geist, system-ui, sans-serif; letter-spacing: .12em; text-transform: uppercase; opacity: .65; margin-bottom: 6px; }
  #su-inf .graf svg { width: 100%; height: 90px; }
  #su-inf ul { margin: 6px 0; padding-left: 18px; font: 500 13px/1.5 system-ui, sans-serif; }
  #su-inf h3 { margin: 18px 0 4px; font: 600 11px Geist, system-ui, sans-serif; letter-spacing: .16em; text-transform: uppercase; opacity: .6; }
  #su-inf .bot { display: flex; gap: 8px; } #su-inf .bot button { padding: 8px 14px; border-radius: 10px; border: 1px solid rgba(255,255,255,.18); background: rgba(255,255,255,.08); color: inherit; font: 600 13px system-ui, sans-serif; cursor: pointer; }
  #su-inf .bot button.pri { background: rgba(255,176,70,.9); color: #1b1206; border-color: transparent; }
  #su-avisos { position: fixed; top: 14px; left: calc(50% + 130px); transform: translateX(-50%); z-index: 44; width: min(370px, calc(100vw - 32px)); display: flex; flex-direction: column; gap: 6px; pointer-events: none; }
  .su-av { pointer-events: auto; display: flex; gap: 9px; align-items: flex-start; padding: 7px 8px 7px 10px; border-radius: 14px; color: #f2f3f5;
    background: linear-gradient(180deg, rgba(40,44,52,.72), rgba(20,22,28,.84)); border: 1px solid rgba(255,255,255,.14); border-left: 3px solid #ffcf7a;
    backdrop-filter: blur(14px) saturate(1.3); -webkit-backdrop-filter: blur(14px) saturate(1.3); box-shadow: 0 10px 30px rgba(0,0,0,.35);
    opacity: 0; transform: translateY(-8px); transition: opacity .35s, transform .35s; font: 400 11px/1.35 system-ui, sans-serif; }
  .su-av.on { opacity: 1; transform: none; } .su-av.bien { border-left-color: #8ee6a8; } .su-av.mal { border-left-color: #ff8a80; } .su-av.viendo { box-shadow: 0 0 0 1px rgba(255,255,255,.4), 0 10px 30px rgba(0,0,0,.4); }
  .su-av > i { font-style: normal; font-size: 14px; line-height: 1; margin-top: 2px; } .su-av > div:nth-child(2) { flex: 1; min-width: 0; }
  .su-av small { display: block; font: 600 10px system-ui, sans-serif; letter-spacing: .06em; text-transform: uppercase; opacity: .6; }
  .su-av b { display: block; font: 600 12px/1.25 system-ui, sans-serif; margin: 1px 0 2px; } .su-av p { margin: 0; opacity: .8; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; } .su-av.viendo p { -webkit-line-clamp: unset; display: block; }
  .su-av .bt { display: flex; gap: 4px; align-items: center; } .su-av button { border: 1px solid rgba(255,255,255,.2); background: rgba(255,255,255,.08); color: inherit; border-radius: 7px; font: 600 11px system-ui, sans-serif; padding: 3px 8px; cursor: pointer; }
  .su-av button.ver { background: rgba(255,176,70,.92); color: #1b1206; border-color: transparent; } .su-av button.x { padding: 2px 8px; opacity: .7; }
  @media (max-width: 760px) { #su-der { width: calc(100vw - 32px); top: auto; bottom: 86px; max-height: 40vh; } #su-inf .caja { padding: 16px; } }
  @media print { body > *:not(#su-inf) { display: none !important; } #su-inf { position: static; background: none; } #su-inf .caja { max-height: none; color: #111; background: #fff; box-shadow: none; } #su-inf .bot { display: none; } }`;
  document.head.appendChild(st);

  /* ---------- elementos ---------- */
  const der = document.createElement('div'); der.id = 'su-der'; der.className = 'su-glass'; document.body.appendChild(der);
  const go = document.createElement('div'); go.id = 'su-go'; go.innerHTML = '<h1>GAME OVER</h1><p></p>'; document.body.appendChild(go);
  const inf = document.createElement('div'); inf.id = 'su-inf'; inf.innerHTML = '<div class="caja su-glass"></div>'; document.body.appendChild(inf);
  inf.addEventListener('click', (e) => { if (e.target === inf) cerrarInforme(); });

  /* ---------- estado de la corrida ---------- */
  const R = { sim: null, def: null, valores: {}, s: null, hist: [], go: null, fin: false, base: null, picos: 'soporte', foco: null, extinciones: [], eventos: [] };
  const defDe = (id) => (M && M.SIMS ? M.SIMS.find(x => x.id === id) : null);
  function preparar(id) {
    setTimeout(() => mostrarInd(), 400);
    R.sim = id; R.def = defDe(id); R.valores = {}; (R.def && R.def.sliders || []).forEach(s => { R.valores[s.k] = s.val; });
    reiniciarModelo(); pintarPanel(); der.classList.add('on');
    setTimeout(() => { const H = HISTORIA[R.def && R.def.par]; const rb = document.getElementById('rc-btn'); if (H && rb && rb.classList.contains('on') !== H.ruido) rb.click(); pintarHistoria(); focoHistoria(5);
      // sin propuesta (plan parcial): capa «Flujo de carros» prendida para ver las vías internas de Bavaria y Boyacá congestionadas
      if (R.def && R.def.par != null && !R.def.propuesta) { const fv = document.querySelector('#gs-fc button[data-v="1"]'); if (fv && !fv.classList.contains('on')) fv.click(); }
      // el indicador del par se prende solo, bajo y transparente para no tapar la vista
      const IND_PAR = { 1: 'CCL', 2: 'PM', 3: 'SE', 4: 'SE', 5: 'CV', 6: 'OC' }, ci = IND_PAR[R.def && R.def.par];
      if (ci) { R.ind = ci; R.alto = 0.09; indApi().then(A => { if (A.estilo) A.estilo({ opacidad: 0.72, base: 4 }); A.altura(R.alto); }); mostrarInd(); pintarPicos(); } }, 900);
    if (R.def && R.def.par === 1) setTimeout(() => { // abastecimiento: tráfico y concentración comercial y logística (CCL) prendidos
      // el tráfico se ve con la capa de RUIDO de carros (no con el flujo de puntos): ruido prendido, flujo apagado
      const fo = document.querySelector('#gs-fc button[data-v=""]'); if (fo && !fo.classList.contains('on')) fo.click();
      const rb = document.getElementById('rc-btn'); if (rb && !rb.classList.contains('on')) rb.click();
      }, 700); // la capa de comercio (CCL) se prende a mano en «Indicadores»
    R.base = null; if (M) setTimeout(calcularBase, 300); // la otra mitad del par (sin propuesta), con los mismos valores, para comparar
  }
  function reiniciarModelo() {
    R.hist = []; R.go = null; R.fin = false; R.previa = false; R.extinciones = []; R.eventos = []; go.classList.remove('on'); cerrarInforme(); limpiarAvisos(); ponerPredio(null); ponerBasura(null); ponerCierre(null); ponerDegrada(null); ponerCaminos(null); ponerCapaPar(null); window.KEN_TRAF_F = 1; if (window.KEN_FOCO) window.KEN_FOCO.off(); // el blanco y negro de un game over no queda puesto en la siguiente
    R.s = M && R.sim ? M.crear(R.sim, SEMILLA, R.valores) : null;
    refrescarPicos(); // año 1: los picos vuelven a como está hoy
  }
  /* mover una variable: el modelo se vuelve a correr con el valor nuevo hasta la semana en que va la barra (por lotes, sin avisos ni
     game over de lo ya pasado) y los picos y resultados cambian ahí mismo. En el año 1 (sin nada corrido) los picos muestran una vista
     previa de cómo quedaría al año 20 con ese valor; al darle play vuelven a seguir la barra. */
  let idRe = 0;
  function recalcularAqui() {
    if (!M || !R.sim) return;
    const id = ++idRe, meta = R.hist.length, previa = meta < 4, hasta = previa ? FIN : meta;
    const s = M.crear(R.sim, SEMILLA, R.valores), H = [];
    pintarPrevia(previa ? 'Calculando la vista previa…' : '');
    const lote = () => { if (id !== idRe) return;
      for (let k = 0; k < 120 && H.length < hasta; k++) { M.paso(s); const I = M.ind(s); derivar(I); H.push(I); }
      if (H.length < hasta) return void setTimeout(lote, 0);
      R.base = null; calcularBase(); // la pareja sin propuesta se vuelve a correr con los mismos valores
      if (previa) { R.previa = true; R.s = M.crear(R.sim, SEMILLA, R.valores); R.hist = []; refrescarPicos(H[H.length - 1]); pintarPrevia(`Vista previa: así quedarían los picos al año ${Math.round(FIN / 52)} con estos valores. Dale play para verlo pasar.`); }
      else { R.s = s; R.hist = H; refrescarPicos(); pintarIndicadores(true); pintarPrevia(''); const L = H[H.length - 1]; if (L) { ponerPredio(L.predio); ponerBasura(L); ponerCierre(L.cierre); ponerDegrada(L); ponerCaminos(L); ponerCapaPar(L); } }
    };
    lote();
  }
  function pintarPrevia(txt) { let e = document.getElementById('su-previa'); const box = document.getElementById('su-picos'); if (!box) return;
    if (!e) { e = document.createElement('p'); e.id = 'su-previa'; box.before(e); } e.textContent = txt; e.style.display = txt ? '' : 'none'; }
  /* COMPARACIÓN DEL PAR: cada simulación «con propuesta» (id par) se compara con su pareja «sin propuesta» (id impar), corrida con los
     MISMOS valores de las variables; la «sin propuesta» no tiene contra qué compararse (es el punto de partida). Sin pares en el modelo
     (versión vieja) se compara con la simulación 1. */
  let idBase = 0;
  function parejaSin() { const d = R.def || {}; if (d.par != null) return d.propuesta ? R.sim - 1 : null; return R.sim !== 1 ? 1 : null; }
  function calcularBase() {
    const otra = parejaSin(); if (!M || otra == null) { R.base = null; return; }
    try { const id = ++idBase, d = defDe(otra), v = {}; (d && d.sliders || []).forEach(s => { v[s.k] = R.valores[s.k] != null ? R.valores[s.k] : s.val; }); const s = M.crear(otra, SEMILLA, v); const H = [];
      const lote = () => { if (id !== idBase) return; try { for (let k = 0; k < 80 && H.length < FIN; k++) { M.paso(s); H.push(derivar(M.ind(s))); if (M.gameOver(s)) { R.base = H; return; } } if (H.length < FIN) setTimeout(lote, 30); else R.base = H; } catch (e) { console.warn('base:', e); } };
      lote(); } // por lotes: 20 años de una vez trabarían la página
    catch (e) { console.warn('base del par:', e); }
  }
  /* avanzar el modelo al paso de la barra de años */
  /* RUIDO QUE SE MUEVE: el mapa de ruido sigue a los carros de la simulación (KEN_TRAF_F: con propuesta baja, sin propuesta sube),
     a la hora del día (picos de la mañana y la tarde) y, en el par 01, suma ruido alrededor de Corabastos cuando se llena. */
  RELOJ.alDibujar(() => {
    if (!R.sim) { T3.ruidoExtraDb = 0; T3.ruidoFoco = null; T3.ruidoSig = ''; return; }
    const h = ((RELOJ.minutoDia != null ? RELOJ.minutoDia : (RELOJ.t % 86400) / 60) / 60) % 24, pico = (c, w) => Math.exp(-((h - c) * (h - c)) / (2 * w * w));
    const fh = 0.35 + 0.75 * Math.max(pico(7.5, 1.3), pico(18, 1.6)) + 0.25 * pico(13, 2.5);
    const ex = 10 * Math.log10(Math.max(0.2, (window.KEN_TRAF_F || 1) * fh)), L = ultimo(), C = L && L.abasto && L.abasto.cora;
    T3.ruidoExtraDb = Math.round(ex * 2) / 2;
    T3.ruidoFoco = C ? { x: C.x, z: C.z, r: 1100, db: Math.round(8 * Math.max(0, (C.carga - 0.7) / 0.3) * 2) / 2 } : null;
    T3.ruidoSig = T3.ruidoExtraDb + '|' + (T3.ruidoFoco ? T3.ruidoFoco.db : 0);
  });
  RELOJ.alDibujar(() => {
    if (!R.s || R.go || R.fin) return;
    if (R.previa && !RELOJ.pausaSem) { R.previa = false; pintarPrevia(''); } // al darle play la vista previa se va y los picos siguen la barra
    let n = 0;
    while (R.s && R.hist.length < Math.max(1, Math.min(FIN, RELOJ.sem)) && n++ < 30) {
      M.paso(R.s); const I = M.ind(R.s); derivar(I); R.hist.push(I);
      for (const x of I.extinciones || []) { R.extinciones.push(x); avisarExtincion(x); }
      for (const ev of I.eventos || []) avisar(ev);
      if (I.predio || PRE) ponerPredio(I.predio);
      if (I.basura || BAS) ponerBasura(I);
      if (I.cierre || CIE) ponerCierre(I.cierre);
      if (I.sem % 4 === 0 || R.hist.length === 1) { ponerDegrada(I); ponerCaminos(I); }
      ponerCapaPar(I);
      if (I.sem % 4 === 0 || R.hist.length === 1) pintarHistoria();
      // más carros (los mismos de la grabación SUMO) a medida que el modelo sube el tráfico y Corabastos se llena: el flujo se pone rojo
      window.KEN_TRAF_F = Math.max(0.6, 1 + ((I.trafico || 1) - 1) * 2.5 + (I.abasto && I.abasto.cora ? 1.2 * Math.max(0, I.abasto.cora.carga - 0.8) : 0));
      const g = M.gameOver(R.s); if (g) { gameOver(g); return; }
      if (I.sem % 13 === 0 || (R.hist.length === 1 && !R.previa)) refrescarPicos(); // cada trimestre: los picos se recalculan con lo que ya pasó // cada medio año: los picos se recalculan con lo que ya pasó
    }
    if (R.hist.length >= FIN && !R.fin) { R.fin = true; RELOJ.pausarAños(true); setTimeout(() => abrirInforme(), 700); }
    if (n) pintarIndicadores();
  });
  addEventListener('lp-reinicio', () => { reiniciarModelo(); pintarIndicadores(true); });

  /* ---------- panel de la derecha ---------- */
  function pintarPanel() {
    const d = R.def;
    if (!M) { der.innerHTML = '<h4>Simulación</h4><p class="pre">El modelo de las simulaciones todavía no está disponible.</p>'; return; }
    der.innerHTML = `<h4>${d && d.par != null ? `Par ${String(d.par).padStart(2, '0')} · ${d.propuesta ? 'con propuesta' : 'sin propuesta'}` : d && d.grupo === 'propuesta' ? 'Escenario · con la propuesta' : 'Escenario · Kennedy estado actual'}</h4>${d && d.prueba ? `<p class="pre" style="opacity:.75;margin-bottom:4px">Prueba: ${d.prueba}</p>` : ''}<p class="pre">${d ? d.pregunta || d.desc || '' : ''}</p>
      ${(d && d.sliders && d.sliders.length) ? '<h4>Variables</h4>' + d.sliders.map(s => `<div class="su-sl"><label>${s.n}<b data-v="${s.k}">${vfmt(s, R.valores[s.k])}</b></label><input type="range" min="${s.min}" max="${s.max}" step="${s.paso}" value="${R.valores[s.k]}" data-k="${s.k}" title="${s.ayuda || ''}"></div>`).join('') : ''}
      <h4>Mira en el territorio</h4><div class="su-lug">${lugares().map((l, i) => `<button type="button" data-l="${i}">${l.n}</button>`).join('')}</div>
      <h4>Indicadores · picos sobre Kennedy</h4><div id="su-picos"></div>
      <h4>Resultados en vivo</h4><div id="su-inds"></div>
      <h4>Resaltar</h4><div class="su-seg" data-g="foco"><button data-v="especies">Especies</button><button data-v="ruido">Ruido</button><button data-v="trafico">Tráfico</button><button data-v="" class="on">Normal</button></div>
      <h4>Informe</h4><div class="su-seg"><button data-inf>Ver informe ahora</button></div>`;
    der.querySelectorAll('input[type=range]').forEach(inp => {
      const pinta = () => { const s = d.sliders.find(x => x.k === inp.dataset.k); inp.style.setProperty('--p', ((inp.value - s.min) / (s.max - s.min) * 100) + '%'); der.querySelector(`[data-v="${s.k}"]`).textContent = vfmt(s, +inp.value); };
      pinta();
      inp.oninput = pinta;
      inp.onchange = () => { R.valores[inp.dataset.k] = +inp.value; recalcularAqui(); }; // la simulación se recalcula hasta el año en que va (sin volver al año 1) y los picos cambian
    });
    der.querySelectorAll('.su-lug button').forEach(b => b.onclick = () => irLugar(lugares()[+b.dataset.l], b));
    der.querySelectorAll('.su-seg[data-g] button').forEach(b => b.onclick = () => {
      const g = b.parentNode.dataset.g; b.parentNode.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
      if (g === 'picos') { R.picos = b.dataset.v || null; const I = R.hist[R.hist.length - 1]; if (R.picos && I) ponerPicos(I); else if (window.KEN_PICOS_IND) window.KEN_PICOS_IND.ver(false); }
      if (g === 'foco' && window.KEN_FOCO) { if (b.dataset.v === 'ruido') { const rc = document.getElementById('rc-btn'); if (rc && !rc.classList.contains('on')) rc.click(); } if (b.dataset.v) window.KEN_FOCO.on(b.dataset.v); else window.KEN_FOCO.off(); }
    });
    const bi = der.querySelector('[data-inf]'); if (bi) bi.onclick = () => abrirInforme();
    pintarIndicadores(true); pintarPicos();
  }
  const vfmt = (s, v) => (s.unidad === '%' ? Math.round(v * (s.max <= 1 ? 100 : 1)) + ' %' : (Math.round(v * 100) / 100).toLocaleString('es-CO') + (s.unidad ? ' ' + s.unidad : ''));
  /* RESULTADOS EN VIVO: una tarjeta por dato con el valor, cuánto cambió desde el año 1 (flecha y color: verde mejora, rojo empeora) y
     su curva con la línea punteada del año 1. Se compara con el año 1 (semana 52) y no con la semana 0: el modelo tarda ~40 semanas en
     asentarse. Se repinta como mucho 4 veces por segundo. */
  let tPint = 0;
  function pintarIndicadores(forzar) {
    const box = document.getElementById('su-inds'); if (!box) return;
    const ahora = performance.now(); if (!forzar && ahora - tPint < 250) return; tPint = ahora;
    const H = R.hist; if (!H.length) { box.innerHTML = '<p class="pre">Dale play para ver cómo cambian.</p>'; return; }
    const I = H[H.length - 1], iR = H.length > 52 ? 51 : 0, I0 = H[iR];
    box.innerHTML = IND.filter(x => I[x.k] != null && (!x.soloSi || x.soloSi(H))).map(x => {
      const v = I[x.k], v0 = I0[x.k], d = v - v0, rel = Math.abs(v0) > 1e-9 ? d / Math.abs(v0) : (Math.abs(d) > 1e-9 ? 1 : 0);
      const clase = Math.abs(rel) < 0.005 ? '' : ((d > 0) === x.sube ? 'bien' : 'mal');
      const chip = H.length <= 52 ? '<i class="ch">año 1</i>' : `<i class="ch ${clase}">${d > 0 ? '▲' : d < 0 ? '▼' : '='} ${x.pts ? (Math.abs(d * x.pts)).toFixed(1) + ' pts' : (Math.abs(rel * 100) < 10 ? Math.abs(rel * 100).toFixed(1) : Math.round(Math.abs(rel * 100))) + ' %'}</i>`;
      return `<div class="su-ind ${Math.abs(rel) >= 0.05 ? 'mueve ' + clase : ''}" title="${x.ayuda || ''}"><span>${x.n}</span><b>${x.f(v, I)}</b>${chip}${chispa(H.map(h => h[x.k]), clase, iR)}</div>`;
    }).join('');
  }  const chispa = (vals, clase, iR = 0) => { // curva con área y la línea punteada del año 1
    const v = vals.map(x => (x != null && isFinite(x) ? x : null)); const ok = v.filter(x => x != null); if (ok.length < 2) return '<svg></svg>';
    const mn = Math.min(...ok), mx = Math.max(...ok), r = mx - mn || 1, W = 120, Hh = 26, n = Math.min(v.length, 90), paso = (v.length - 1) / (n - 1);
    const Y = (y) => (Hh - 2 - (y - mn) / r * (Hh - 5)).toFixed(1), xs = (i) => (i / (n - 1) * W).toFixed(1);
    const pts = Array.from({ length: n }, (_, i) => v[Math.round(i * paso)]).map((y, i) => y == null ? null : `${xs(i)},${Y(y)}`).filter(Boolean);
    const col = clase === 'bien' ? '#8ee6a8' : clase === 'mal' ? '#ff8a80' : '#ffcf7a', b = v[iR] != null ? Y(v[iR]) : null;
    return `<svg viewBox="0 0 ${W} ${Hh}" preserveAspectRatio="none"><polygon points="0,${Hh} ${pts.join(' ')} ${W},${Hh}" fill="${col}" fill-opacity=".14"/>${b != null ? `<line x1="0" x2="${W}" y1="${b}" y2="${b}" stroke="rgba(255,255,255,.35)" stroke-dasharray="3 3" vector-effect="non-scaling-stroke"/>` : ''}<polyline points="${pts.join(' ')}" fill="none" stroke="${col}" stroke-width="1.6" vector-effect="non-scaling-stroke"/></svg>`;
  };

  /* ---------- INDICADORES como en la versión anterior: los picos 3D de las láminas (data3d/indicadores.js) ----------
     Soporte ecológico, islas de calor, presión sobre el aire, exposición, comercio y logística, organización, conocimiento…
     Con una simulación de la propuesta (B, C) cada indicador se recalcula donde actúa lo que se va construyendo (huertas, árboles,
     mercados, Corabastos): cada año se vuelve a calcular y los picos se mueven. */
  const QUE_IND = { // qué mide cada lámina y si alto es bueno, en una línea, para leer los picos sin explicación
    SE: ['Dónde la fauna encuentra hábitat: árboles, humedales, huertas.', true], EPO: ['Cuánta gente vive expuesta a tráfico, ruido y carga.', false],
    IC: ['Dónde se acumula calor: asfalto y techos sin sombra.', false], PA: ['Presión sobre el aire por tráfico y falta de árboles.', false],
    OC: ['Juntas, colectivos y organizaciones que cuidan el barrio.', true], CO: ['Colegios, bibliotecas y lugares donde se aprende.', true],
    CCL: ['Dónde se concentra el comercio y la logística (Corabastos).', null], PM: ['Presión de carros y camiones sobre las vías.', false], CV: ['Choque entre vivienda y bodegas o carga.', false] };
  let pInd = null; R.ind = null; /* los picos empiezan apagados: se prenden escogiendo un indicador */ R.alto = 0.2; // picos bajos, pegados al piso y transparentes: se lee la ciudad debajo y dónde está cada cosa
  const indApi = async () => { if (window.KEN_IND) return window.KEN_IND; if (!pInd) pInd = import('./indicadores.js?v=12').then(m => m.crearIndicadores({ THREE: T3.THREE, T3 })); return pInd; };
  async function pintarPicos() {
    const box = document.getElementById('su-picos'); if (!box) return;
    let A; try { A = await indApi(); } catch (e) { box.innerHTML = '<p class="pre">No se pudieron cargar los indicadores.</p>'; return; }
    const grad = (r, d) => `linear-gradient(${d},${r.join(',')})`;
    box.innerHTML = `<div class="su-picos">${A.lista.map(x => `<button data-c="${x.code}" class="${x.code === R.ind ? 'on' : ''}"><i style="background:${grad(x.ramp, 'to top')}"></i><b>${x.code}</b><span>${x.name.replace(/\s*\([A-Z]+\)\s*$/, '')}</span></button>`).join('')}
      <button data-c="" class="${!R.ind ? 'on' : ''}"><i style="background:rgba(255,255,255,.15)"></i><b>—</b><span>Apagar picos</span></button></div>
      ${R.ind ? (() => { const it = A.lista.find(x => x.code === R.ind); const q = QUE_IND[it && it.code] || ['', null]; return it ? `<p class="su-que">${q[0]} <b>${q[1] === true ? 'Más alto = mejor.' : q[1] === false ? 'Más alto = peor.' : 'Lo sano es repartido, sin un solo pico.'}</b><br><span>Los picos cambian año a año con lo que la simulación va construyendo.</span></p><div class="su-rampa" style="background:${grad(it.ramp, '90deg')}"></div><div class="su-rampa-t"><span>bajo</span><span>alto</span></div><p id="su-cambio"></p><label class="su-alto"><span>Altura de los picos</span><input type="range" min="0.01" max="0.3" step="0.005" value="${R.alto}"></label>` : ''; })() : ''}`;
    const ra = box.querySelector('.su-alto input'); if (ra) ra.oninput = () => { R.alto = +ra.value; A.altura(R.alto); }; pintarCambio(A);
    box.querySelectorAll('button[data-c]').forEach(b => b.onclick = () => { R.ind = b.dataset.c || null; mostrarInd(); pintarPicos(); });
  }
  async function mostrarInd() { const A = await indApi(); if (!R.altoIni) { R.altoIni = 1; if (A.estilo) A.estilo({ opacidad: 0.66, base: 4 }); A.altura(R.alto); } A.ver(!!R.ind); await A.mostrar(R.ind || null, false); }
  const prom = (A) => { if (!A || !A.length) return 0; let s = 0, n = 0; for (const v of A) if (isFinite(v)) { s += v; n++; } return n ? s / n : 0; };
  const c01 = (v) => Math.max(0, Math.min(1, v || 0));
  function factoresSim(I) { // cuánto de cada intervención existe en esta semana del modelo (0–1) -> T3.simInd para indicadores.js
    const d = R.def || {}, b = d.base || 'A', id = R.sim, sem = I ? I.sem : 0, I0 = R.hist[0];
    const h = I ? I.huertas : 120, HA = 120;                                                 // ~120 huertas que ya existen hoy en el modelo
    const huerta = id === 12 ? 0 : c01((h - HA) / 1500);                                   // 1500: sim 11 llega a ~0,7 y la red de mercados (sim 3) se llena hacia el año 5
    const techo = id === 12 ? c01((h - HA) / 950) : 0.4 * huerta;                          // sim 12: ~1070 huertas equivalentes en techos al tercer año
    const merc = c01(I && I.zonas ? prom(I.zonas.comercio) / 0.3 : 0);                     // fracción que vende la red local (0,3 = lo máximo de sim 3 y 10)
    const cora = id === 5 ? (sem >= (R.valores.sinCora || 52) ? 1 : 0) : id === 6 ? 0.5 * c01(sem / 156) * (R.valores.desmLib != null ? R.valores.desmLib : 1) : 0.8 * merc;    const bav = b === 'B' ? c01(sem / 104) : b === 'D' ? 0.6 * c01(sem / 260) : 0;
    const verde = b === 'B' || b === 'C' ? c01(sem / 156) : id === 6 ? 0.5 * c01(sem / 156) : 0; // parches nativos que maduran en ~3 años
    // tendencia: presión urbana (sube sola si no se hace nada) y red ecológica recuperada (las intervenciones). Si el modelo las trae
    // (ind().presion / ind().recuperacion) se usan; si no: presión = tráfico sobre hoy + paso del tiempo [SUP], recuperación =
    // interacciones de la red frente al estado actual en la misma semana.
    let pres = I && I.presion != null ? I.presion : c01(0.55 * ((I ? I.trafico : 1) - 1) / 0.3 + 0.45 * sem / FIN);
    const B = R.base && I ? R.base[Math.min(R.base.length - 1, Math.max(0, sem - 1))] : null;
    let rec = I && I.recuperacion != null ? I.recuperacion : (B && B.red && I.red != null && id !== 1 ? c01(I.red / B.red - 1) : 0);
    if (I && I.recuperacion == null) pres = pres * (1 - 0.6 * rec); // lo recuperado amortigua la presión
    return { huerta, techo, merc, cora, bav, verde, pres, rec };
  }
  function refrescarPicos(Iv) { T3.simInd = factoresSim(Iv || R.hist[R.hist.length - 1]); if (!R.ind || !pInd && !window.KEN_IND) return; indApi().then(async A => { if (A.recalcular) await A.recalcular(true); pintarCambio(A); }); }
  function pintarCambio(A) { // cuánto cambió la lámina en promedio frente a como está hoy (sobre todo Kennedy)
    const e = document.getElementById('su-cambio'); if (!e) return; const r = A.resumen && A.resumen(); const q = QUE_IND[R.ind] || ['', null];
    if (!r || Math.abs(r.prom) < 0.3) { e.innerHTML = 'Igual que hoy: dale play para ver cómo cambia.'; e.className = ''; return; }
    const mejor = q[1] == null ? null : (r.prom > 0) === q[1]; e.className = mejor == null ? '' : mejor ? 'bien' : 'mal';
    e.innerHTML = `Promedio sobre Kennedy: <b>${r.prom > 0 ? '▲' : '▼'} ${Math.abs(r.prom).toFixed(Math.abs(r.prom) < 10 ? 1 : 0)} %</b> frente a hoy${mejor == null ? '' : mejor ? ' · mejora' : ' · empeora'}`;
  } // indicadores.js recalcula y anima con lo construido hasta ahora
  /* ---------- picos en el piso (data3d/picos_indicadores.js) ---------- */
  function ponerPicos(I) {
    const P = window.KEN_PICOS_IND; if (!P || !R.picos || !I.zonas || !M.ZONAS_XZ) return;
    if (R.picos === 'soporte' && I.zonas.soporteEco) P.poner('soporte', I.zonas.soporteEco, M.ZONAS_XZ, '#5fd38a', 'Soporte ecológico');
    if (R.picos === 'comercio' && I.zonas.comercio) P.poner('comercio', I.zonas.comercio, M.ZONAS_XZ, '#ffb347', 'Comercio de alimentos');
    P.ver(true);
  }

  /* ---------- especie que desaparece: cámara tipo God's Eye (data3d/ojo_dios.js) ---------- */
  function avisarExtincion(x) { // una especie que desaparece también es un aviso (con «Ver» vuela al lugar)
    avisar({ sem: x.sem, tipo: 'especies', capa: 'especies', signo: -1, x: x.x, z: x.z, especies: [x.nombre || x.especie], titulo: `Desapareció ${x.nombre || x.especie}`, texto: `Motivo: ${x.motivo}${x.parche ? ' · ' + x.parche : ''}.` });
  }

  /* ---------- AVISOS: lo que va pasando (ind().eventos del modelo) ----------
     Una tarjeta de vidrio por evento, arriba al centro (máximo 3; se van solas a los 14 s). «Ver» pausa la barra, pone el resto del
     territorio en blanco y negro con lo que importa en color (KEN_FOCO: especies, ruido o tráfico) y vuela con el Ojo de Dios al lugar.
     «Seguir» (o cerrar la tarjeta del Ojo) devuelve la cámara, quita el foco y sigue corriendo si estaba corriendo. */
  const avs = document.createElement('div'); avs.id = 'su-avisos'; document.body.appendChild(avs);
  const ICO = { especies: '🐦', polinizadores: '🐝', ruido: '🔊', trafico: '🚗', huertas: '🌱', comida: '🍎', residuos: '♻', metro: '🚇', corabastos: '🏭', obra: '🏗' };
  const escH = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  let viendo = null;
  /* cola: como mucho 2 tarjetas a la vez, una nueva cada 5 s (reales) como mínimo, cada una dura 9 s; si se acumulan más de 3 en espera se
     descartan (siguen en el informe final, «Lo que pasó, año por año»), primero las que no son de especies que se pierden */
  const cola = []; let tUlt = 0;
  setInterval(() => { if (!cola.length || viendo) return; const ahora = performance.now(); if (ahora - tUlt < 5000 || avs.children.length >= 2) return; tUlt = ahora; mostrarAviso(cola.shift()); }, 400);
  /* cuando una especie desaparece o se va de un lugar, el aviso se abre SOLO con «Ver» (pausa + Ojo de Dios al lugar), como mucho una
     vez cada año simulado para no interrumpir todo el tiempo */
  let semAuto = -999;
  const esMuerte = (ev) => ev.tipo === 'especies' && ev.signo < 0 && ev.x != null && /desapareci|deja |dejan |se van|se fue/i.test(ev.titulo || '');
  function avisar(ev) {
    if (!ev || !ev.titulo) return; R.eventos.push(ev);
    if (esMuerte(ev) && (ev.sem || 0) - semAuto >= 52 && !viendo) { semAuto = ev.sem || 0; ev.auto = true; cola.unshift(ev); tUlt = 0; return; }
    cola.push(ev); while (cola.length > 3) { const k = cola.findIndex(e => !(e.tipo === 'especies' && e.signo < 0)); cola.splice(k >= 0 ? k : 0, 1); }
  }
  function mostrarAviso(ev) {
    const c = document.createElement('div'); c.className = 'su-av ' + (ev.signo > 0 ? 'bien' : ev.signo < 0 ? 'mal' : '');
    const año = ev.sem != null ? Math.floor(ev.sem / 52) + 1 : null;
    c.innerHTML = `<i>${ICO[ev.tipo] || '•'}</i><div><small>${año ? 'Año ' + año : ''}${ev.especies && ev.especies.length ? ' · ' + escH(ev.especies.slice(0, 3).join(', ')) : ''}</small><b>${escH(ev.titulo)}</b><p>${escH(ev.texto)}</p></div>
      <div class="bt">${ev.x != null || ev.capa ? '<button type="button" class="ver">Ver</button>' : ''}<button type="button" class="x" aria-label="Cerrar">×</button></div>`;
    c.querySelector('.x').onclick = () => quitar(c);
    const bv = c.querySelector('.ver'); if (bv) bv.onclick = () => verEvento(ev, c);
    avs.prepend(c); requestAnimationFrame(() => c.classList.add('on'));
    while (avs.children.length > 2) avs.lastElementChild.remove();
    c._t = setTimeout(() => { if (viendo !== c) quitar(c); }, 9000);
    if (ev.auto) setTimeout(() => verEvento(ev, c), 300); // muerte de una especie: se muestra sola (Ojo de Dios)
  }
  function quitar(c) { clearTimeout(c._t); c.classList.remove('on'); setTimeout(() => c.remove(), 350); }
  function limpiarAvisos() { avs.innerHTML = ''; cola.length = 0; if (viendo) seguir(); }
  let corria = false;
  async function verEvento(ev, c) {
    if (viendo) await seguir(true);
    viendo = c; clearTimeout(c._t); c.classList.add('viendo');
    corria = !RELOJ.pausaSem; RELOJ.pausarAños(true);
    if (pInd || window.KEN_IND) indApi().then(A => A.ver(false)); // de cerca los picos tapan todo: se esconden mientras se muestra
    const capa = ev.capa || (ev.tipo === 'ruido' ? 'ruido' : ev.tipo === 'trafico' ? 'trafico' : 'especies');
    if (capa === 'ruido') { const rb = document.getElementById('rc-btn'); if (rb && !rb.classList.contains('on')) rb.click(); if (window.KEN_PREDIO && ultimo() && ultimo().predio) window.KEN_PREDIO.ruido(true); }
    if (window.KEN_FOCO) window.KEN_FOCO.on([capa, 'predio', 'cierre', 'basura', 'degradacion', 'caminos', 'abasto', 'residuos', 'biodiversidad', 'suelo', 'gobernanza']); // lo que explica el aviso queda en color
    const bv = c.querySelector('.ver'); if (bv) { bv.textContent = 'Seguir'; bv.onclick = () => seguir(); }
    if (window.KEN_OJO && ev.x != null) {
      await window.KEN_OJO.ir({ x: ev.x, z: ev.z, titulo: ev.titulo, texto: ev.texto, color: ev.signo > 0 ? '#8ee6a8' : '#ff8a80' });
      const bo = document.querySelector('#ojo-t button'); if (bo) bo.addEventListener('click', () => { if (viendo === c) seguir(false, true); }, { once: true });
    }
  }
  async function seguir(sinCorrer, yaCerrado) {
    const c = viendo; viendo = null; if (!c) return;
    focoHistoria(1); if (R.ind) indApi().then(A => A.ver(true));
    if (window.KEN_OJO && !yaCerrado) window.KEN_OJO.cerrar();
    quitar(c);
    if (corria && !sinCorrer && !R.go && !R.fin) { const p = document.querySelector('#lp-anos .play'); if (p && RELOJ.pausaSem) p.click(); }
  }

  /* ---------- PREDIO (simulación 4): carros por las vías nuevas y ruido adentro (data3d/predio_trafico.js, si está) ---------- */
  let PRE = null, pPre = null;
  function ponerPredio(P) {
    if (!P) { if (PRE) { PRE.ver(false); } return; }
    if (!PRE) { if (!pPre) pPre = import('./predio_trafico.js?v=4').then(m => { PRE = m.crearPredio({ T3, RELOJ }); return PRE; }).catch(() => null); pPre.then(x => { if (x && R.sim) ponerPredio(R.hist.length ? R.hist[R.hist.length - 1].predio : null); }); return; }
    PRE.ver(true); PRE.poner({ trafico: P.trafico, trafico0: P.trafico0, ruidoDb: P.ruidoDb, ruidoDb0: P.ruidoDb0, vias: P.vias, sem: R.hist.length, vehiculosDia: P.vehiculosDia });
  }
  /* ---------- BASURA Y RATAS (data3d/basura.js) y CIERRE GRADUAL DE VÍA (data3d/cierre_gradual.js), si están ---------- */
  let BAS = null, pBas = null, CIE = null, pCie = null;
  function ponerBasura(I) {
    if (!I || !I.basura) { if (BAS) BAS.ver(false); return; }
    if (!BAS) { if (!pBas) pBas = import('./basura.js?v=2').then(m => { BAS = m.crearBasura({ T3, RELOJ }); const L = R.hist[R.hist.length - 1]; if (L && L.basura) ponerBasura(L); }).catch(() => null); return; }
    BAS.ver(true); BAS.poner({ puntos: I.basura.puntos, total_t_dia: I.basura.total_t_dia, acumulada: I.basura.acumulada, ratas: I.ratas, ratas0: I.ratas0 });
  }
  function ponerCierre(C) {
    if (!C || !(C.fase > 0)) { if (CIE) CIE.quitar(); return; }
    if (!CIE) { if (!pCie) pCie = import('./cierre_gradual.js?v=4').then(m => { CIE = m.crearCierre({ T3, RELOJ }); const L = R.hist[R.hist.length - 1]; if (L && L.cierre) ponerCierre(L.cierre); }).catch(() => null); return; }
    CIE.poner({ via: C.via, fase: C.fase, ruidoExtraDb: C.ruidoExtraDb, traficoDesvio: C.traficoDesvio });
  }

  /* ---------- HUMEDALES QUE SE ENCOGEN Y ÁRBOLES QUE SE PIERDEN (data3d/degradacion.js) y CAMINOS DEL INSTITUTO (data3d/caminos_instituto.js) ---------- */
  let DEG = null, pDeg = null, CAM = null, pCam = null;
  const ultimo = () => R.hist[R.hist.length - 1];
  function ponerDegrada(I) {
    if (!I || !I.humedales) { if (DEG) DEG.ver(false); return; }
    if (!DEG) { if (!pDeg) pDeg = import('./degradacion.js?v=1').then(m => { DEG = m.crearDegradacion({ T3, RELOJ }); const L = ultimo(); if (L) ponerDegrada(L); }).catch(() => null); return; }
    DEG.ver(true); DEG.poner({ humedales: I.humedales, humedalFuncional: I.humedalFuncional, arbolesPerdidos: Math.floor((I.arbolesPerdidos || 0) / 0.025) * 0.025, // en escalones de 2,5 %: los árboles caen en tandas (cada tanda sube todo el bosque a la tarjeta de video; cada 4 semanas trababa)
      basuraHumedal: ((I.basura && I.basura.puntos) || []).filter(p => p.fuente === 'humedal').map(p => ({ x: p.x, z: p.z, acumulada: p.acumulada })) });
  }
  function ponerCaminos(I) { // con el instituto (B) o la red (C) o los techos con Bavaria Común (12): se abren en los primeros dos años
    const b = (R.def && R.def.base) || 'A', con = I && (b === 'B' || b === 'C' || R.sim === 12);
    if (!con) { if (CAM) CAM.ver(false); return; }
    if (!CAM) { if (!pCam) pCam = import('./caminos_instituto.js?v=1').then(m => { CAM = m.crearCaminos({ T3, RELOJ }); setTimeout(() => { const g = T3.scene.getObjectByName('caminos'); if (g) g.traverse(o => { if (o.isMesh || o.isPoints || o.isLine) o.renderOrder = 30 + (o.renderOrder || 0); }); }, 1500); /* encima de los picos transparentes */ const L = ultimo(); if (L) ponerCaminos(L); }).catch(() => null); return; }
    CAM.ver(true); CAM.poner({ fase: Math.max(0.05, Math.min(1, (I.sem || 0) / 104)) });
  }

  /* ---------- CAPA PRINCIPAL DE CADA PAR (data3d/capas_pares.js): abasto, residuos, biodiversidad, suelo, gobernanza ---------- */
  let PAR = null, pPar = null;
  const capaPar = () => { const c = R.def && R.def.capa; return c && c !== 'movilidad' ? c : null; };
  let CONT = null, pCont = null;
  function ponerCapaPar(I) {
    const c = I ? capaPar() : null;
    // par 01: contenedores (Corabastos con su tope y los mercados) en vez de nodos y rutas
    if (c === 'abasto') { if (PAR) PAR.quitar(); if (!CONT) { if (!pCont) pCont = import('./abasto_contenedor.js?v=6').then(m => { CONT = m.crearContenedores({ T3 }); const L = ultimo(); if (L) ponerCapaPar(L); }).catch(e => console.warn('contenedores:', e)); return; } CONT.ver(true); CONT.poner(I.abasto); return; }
    if (CONT) CONT.ver(false);
    if (!c) { if (PAR) PAR.quitar(); return; }
    if (!PAR) { if (!pPar) pPar = import('./capas_pares.js?v=1').then(m => { PAR = m.crearCapasPares({ T3, RELOJ }); const L = ultimo(); if (L) ponerCapaPar(L); }).catch(() => null); return; }
    PAR.poner(c, I);
  }

  /* ---------- CLARIDAD: UNA HISTORIA POR PAR ----------
     1) Solo quedan visibles las capas que explican la prueba del par (lo demás se apaga mientras corre esa simulación).
     2) Tarjeta «¿Qué está pasando?»: la cadena causa → efecto con cifras en vivo, y la misma cifra en la otra mitad del par
        (sin propuesta / con propuesta, mismos valores, misma semana) para ver cómo la arquitectura cambia la dinámica. */
  const TODAS = ['abasto_cont', 'abasto', 'residuos', 'biodiversidad', 'suelo', 'gobernanza', 'basura', 'degradacion', 'cierre', 'caminos', 'predio', 'biotica', 'indicadores'];
  const HISTORIA = {
    1: { capas: ['abasto_cont', 'basura', 'degradacion', 'biotica', 'predio', 'caminos'], ruido: true, etq: ['bas'] },
    2: { capas: ['cierre', 'biotica', 'predio', 'caminos'], ruido: true, etq: [] },
    3: { capas: ['residuos', 'basura', 'degradacion', 'predio', 'caminos'], ruido: false, etq: ['bas', 'pares'] },
    4: { capas: ['biodiversidad', 'biotica', 'degradacion', 'predio', 'caminos'], ruido: false, etq: ['pares'] },
    5: { capas: ['suelo', 'predio', 'caminos'], ruido: false, etq: ['pares'] },
    6: { capas: ['gobernanza', 'caminos'], ruido: false, etq: ['pares'] }
  };
  const pct = (a, b) => (b ? (a / b - 1) * 100 : 0), sg = (v, d = 0) => (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v).toFixed(d);
  const CADENA = { // pasos de la historia: [texto, valor(I, I1), formato]
    1: [['Lo que se le pide a Corabastos', (I, I1) => sg(pct(I.abasto && I.abasto.cora ? I.abasto.cora.pedido_t_dia : 0, I1.abasto && I1.abasto.cora ? I1.abasto.cora.pedido_t_dia : 0)) + ' %'],
        ['Corabastos frente a su tope', (I) => I.abasto && I.abasto.cora ? Math.round(I.abasto.cora.carga * 100) + ' %' : '—'],
        ['Basura sin recoger', (I) => fmt(I.basura ? I.basura.acumulada : 0) + ' t'],
        ['Humedales que funcionan', (I) => Math.round(I.humedalFuncional || 0) + ' %'],
        ['Interacciones entre especies', (I, I1) => sg(pct(I.red, I1.red)) + ' %']],
    2: [['Vía cerrada', (I) => I.cierre && I.cierre.fase ? Math.round(I.cierre.fase * 100) + ' % cerrada' : 'abierta'],
        ['Tráfico en las calles del desvío', (I) => I.cierre && I.cierre.traficoDesvio ? '+' + Math.round((I.cierre.traficoDesvio - 1) * 100) + ' %' : '—'],
        ['Comida en la zona peor servida', (I) => Math.round((I.comidaMin || 0) * 100) + ' %'],
        ['Ruido promedio', (I) => (I.ruidoDb || 0).toFixed(1) + ' dB'],
        ['Interacciones entre especies', (I, I1) => sg(pct(I.red, I1.red)) + ' %']],
    3: [['Orgánicos generados', (I, I1) => sg(pct(I.basuraT, I1.basuraT)) + ' %'],
        ['Tratados en estaciones / relleno', (I) => I.estaciones ? fmt(I.estaciones.reduce((a, e) => a + (e.tratado_t_dia || 0), 0)) + ' t/día' : '—'],
        ['Economía circular', (I) => ((I.circularIdx || 0) * 100).toFixed(1) + ' %'],
        ['Basura sin recoger', (I) => fmt(I.basura ? I.basura.acumulada : 0) + ' t'],
        ['Humedales que funcionan', (I) => Math.round(I.humedalFuncional || 0) + ' %']],
    4: [['Parche perdido', (I) => I.fragmento ? (I.fragmento.nombre || 'parche') + ' · ' + (I.fragmento.haPerdidas || 0).toFixed(1) + ' ha' : '—'],
        ['Corredores y refugios', (I) => (I.corredores ? I.corredores.length : 0) + ' corredores · ' + (I.refugios ? I.refugios.length : 0) + ' refugios'],
        ['Territorio con fauna', (I, I1) => sg(pct(I.pares, I1.pares)) + ' %'],
        ['Especies de fauna', (I) => I.fauna + ' de ' + I.fauna0],
        ['Interacciones entre especies', (I, I1) => sg(pct(I.red, I1.red)) + ' %']],
    5: [['Precio del suelo', (I) => '×' + (I.sueloIdx || 1).toFixed(2)],
        ['Zonas desplazadas / que cambian de uso', (I) => I.suelo && typeof I.suelo === 'object' ? I.suelo.desplazadas + ' / ' + I.suelo.cambian : (I.especulacion ? '' : '—')],
        ['Hogares en riesgo de desplazamiento', (I) => fmt(I.hogaresRiesgo || 0)],
        ['Tráfico', (I) => Math.round((I.trafico || 1) * 100) + ' % de hoy']],
    6: [['Recursos que alcanzan', (I) => I.gobernanza ? Math.round(I.gobernanza.coberturaMedia * 100) + ' % de la necesidad' : '—'],
        ['Equidad entre barrios', (I) => I.gobernanza ? I.gobernanza.equidad.toFixed(2) : '—'],
        ['Decisiones tomadas', (I) => I.gobernanza ? fmt(I.gobernanza.decisiones) : '—'],
        ['Equipamientos habilitados', (I) => I.gobernanza ? fmt(I.gobernanza.equipamientos.length) : '—']]
  };
  const hist = document.createElement('div'); hist.id = 'su-hist'; document.body.appendChild(hist);
  function pintarHistoria() {
    const d = R.def || {}, P = d.par, C = CADENA[P], I = ultimo(); if (!C || !I) { hist.classList.remove('on'); return; }
    const I1 = R.hist[Math.min(R.hist.length - 1, 51)] || I, B = R.base ? R.base[Math.min(R.base.length - 1, R.hist.length - 1)] : null, B1 = R.base ? R.base[51] || R.base[0] : null;
    const otra = d.propuesta ? 'Sin propuesta' : null; // la «sin» no tiene base calculada: se muestra sola
    const filas = C.map(([n, f], k) => { let a = '—', b = ''; try { a = f(I, I1); } catch (e) { /* sin dato */ } if (B && B1) { try { b = f(B, B1); } catch (e) { /* */ } }
      return `<li><span class="n">${k ? '↓ ' : ''}${n}</span><b>${a}</b>${otra && b ? `<i>${b}</i>` : ''}</li>`; }).join('');
    hist.innerHTML = `<h5>¿Qué está pasando? · ${d.parN || ''}</h5><p>${d.prueba || ''}</p>${otra ? '<div class="cab"><span></span><b>Con propuesta</b><i>Sin propuesta</i></div>' : `<div class="cab"><span></span><b>${d.propuesta ? 'Con propuesta' : 'Sin propuesta'}</b></div>`}<ul>${filas}</ul>`;
    hist.classList.add('on');
  }
  function aplicarHistoria() {
    const P = R.def && R.def.par, H = HISTORIA[P]; if (!H) return;
    for (const nm of TODAS) { const g = T3.scene.getObjectByName(nm); if (!g) continue; const si = H.capas.includes(nm) || (nm === 'indicadores' && R.ind); if (!si && g.visible) g.visible = false; }
    for (const e of ['bas', 'pares']) { const el = document.getElementById(e + '-etq'); if (el) el.style.display = H.etq.includes(e) ? '' : 'none'; }
  }
  setInterval(() => { if (R.sim && !viendo) aplicarHistoria(); }, 400);
  /* BLANCO Y NEGRO DE LA HISTORIA: al prender una simulación el territorio se va volviendo blanco y negro de a poco (5 s) y quedan en
     color solo las capas de su historia (y el ruido o las especies si son parte de ella). «Ver» y «Mira en el territorio» lo cambian un
     rato y al cerrar vuelve a este. */
  /* OSCURECER SOLO LA CIUDAD (pedido de la autora): en vez de oscurecer toda la pantalla, se oscurecen de a poco los edificios (la malla
     de Google y los edificios propios); las capas, el ruido, los indicadores y los animales quedan como están. KEN_FOCO se reemplaza por
     este atenuador mientras está la vista limpia, así «Ver», «Mira en el territorio» y el game over también usan esto. */
  let kCiu = 1, metaCiu = 1, durCiu = 5, tCiu = 0, tRec = 0; const matsCiu = new Set();
  function recolectar() { matsCiu.clear(); const add = (o) => o.traverse(x => { const ms = x.material ? (Array.isArray(x.material) ? x.material : [x.material]) : []; for (const m of ms) if (m && m.color) matsCiu.add(m); });
    const tg = T3.tiles && T3.tiles.group; if (tg) add(tg); for (const e of (T3.edificios || [])) if (e && e.mesh) add(e.mesh); }
  function aplicarCiu() { for (const m of matsCiu) { if (!m.userData._c0) m.userData._c0 = m.color.clone(); m.color.copy(m.userData._c0).multiplyScalar(kCiu); } }
  RELOJ.alDibujar(() => { const ahora = performance.now(), dt = tCiu ? Math.min(0.1, (ahora - tCiu) / 1000) : 0; tCiu = ahora;
    if (kCiu === metaCiu && kCiu === 1) return;
    if (ahora - tRec > 600) { tRec = ahora; recolectar(); } // la malla de Google carga teselas nuevas: se recogen cada 0,6 s
    const paso = dt / Math.max(0.2, durCiu) * 0.55; kCiu = kCiu > metaCiu ? Math.max(metaCiu, kCiu - paso) : Math.min(metaCiu, kCiu + paso); aplicarCiu(); });
  const ciudad = (on, dur = 1) => { metaCiu = on ? 0.45 : 1; durCiu = dur; };
  const FOCO_CIU = { on: (c, o) => { ciudad(true, o && o.dur ? o.dur : 1); return Promise.resolve(true); }, off: (o) => ciudad(false, o && o.dur ? o.dur : 1), get activo() { return metaCiu < 1; }, get nivel() { return (1 - kCiu) / 0.55; } };
  setInterval(() => { if (window.KEN_FOCO !== FOCO_CIU) window.KEN_FOCO = FOCO_CIU; }, 500);
  function focoHistoria(dur = 5) { const H = HISTORIA[R.def && R.def.par]; if (!H || !window.KEN_FOCO) return;
    window.KEN_FOCO.on([...H.capas, ...(H.ruido ? ['ruido'] : []), ...(H.capas.includes('biotica') ? ['especies'] : []), 'indicadores', ...(R.def && !R.def.propuesta ? ['plan_parcial', 'bavaria'] : ['bavaria', 'bavaria_distrito'])], { dur }); } // sin propuesta: Bavaria y su plan parcial también en color

  /* ---------- MIRA EN EL TERRITORIO: botones que vuelan (Ojo de Dios) a lo que importa en cada simulación y lo dejan en color ---------- */
  const centroDe = (nombre) => { const g = T3.scene.getObjectByName(nombre); if (!g || !g.visible) return null; const b = new T3.THREE.Box3().setFromObject(g); if (b.isEmpty()) return null; const c = b.getCenter(new T3.THREE.Vector3()); return [c.x, c.z]; };
  function lugares() {
    const b = (R.def && R.def.base) || 'A', L = [], I = ultimo() || {};
    { const c = capaPar(); const NOM = { abasto: 'Corabastos y mercados (tope)', residuos: 'Estaciones y residuos', biodiversidad: 'Parche, corredores y refugios', suelo: 'Usos del suelo y presión', gobernanza: 'Barrios, asambleas y recursos' };
      if (c) L.push({ n: NOM[c] || c, donde: c === 'abasto' ? 'abasto_cont' : c, alto: true, capa: c === 'abasto' ? ['abasto_cont', 'especies', 'basura', 'degradacion', 'trafico'] : [c], t: (R.def && R.def.parN) || NOM[c], tx: (R.def && R.def.prueba) || '' }); }
    const [cx, cz] = T3.lw ? T3.lw(6330, 2170) : [989, 992];
    L.push({ n: 'Basura en Corabastos', x: cx, z: cz, capa: ['basura'], t: 'Basura alrededor de Corabastos', tx: I.basura ? `${Math.round(I.basura.total_t_dia)} t/día en Kennedy; ${Math.round((I.sinRecoger || 0) * 100)} % no se recoge.` : '' });
    L.push({ n: 'Humedal El Burro', x: 2095, z: -109, capa: ['degradacion', 'basura', 'especies'], t: 'Humedal El Burro', tx: I.humedalFuncional != null ? `Los humedales funcionan al ${Math.round(I.humedalFuncional)} % de hoy.` : '' });
    { const E = I.metro && I.metro.estaciones && I.metro.estaciones.find(e => /Kennedy/.test(e.n)) || (I.metro && I.metro.estaciones && I.metro.estaciones[0]);
      const q = E ? { x: E.x, z: E.z } : (window.KEN_METRO && window.KEN_METRO.punto ? window.KEN_METRO.punto(window.KEN_METRO.largo * 0.5) : null);
      if (q) L.push({ n: 'Metro Línea 1', x: q.x != null ? q.x : q[0], z: q.z != null ? q.z : q[1], capa: ['metro', 'trafico'], t: 'Metro Línea 1' + (E ? ' · estación ' + E.n : ''), tx: I.metro && I.metro.fase === 'opera' ? `Ya opera: ${Math.round((I.metro.reduccion || 0) * 100)} % menos carros junto al corredor${E && E.peatonesDia ? '; ' + fmt(E.peatonesDia) + ' personas caminan al día hacia la estación' : ''}.` : 'En obra: empieza a operar en el año 3 (2028).' }); }
    if (I.especulacion && I.especulacion.zonas && I.especulacion.zonas.length) { const Z = I.especulacion.zonas.reduce((a, b) => (b.indice > a.indice ? b : a)); L.push({ n: 'Especulación del suelo', x: Z.x, z: Z.z, capa: ['metro'], t: 'Donde más sube el suelo', tx: `El suelo sube ×${Z.indice.toFixed(2)} aquí; ${fmt(I.especulacion.hogaresRiesgo)} hogares en riesgo de desplazamiento en Kennedy.` }); }
    if (I.predio || (R.def && R.def.par != null && !R.def.propuesta)) L.push({ n: 'Plan parcial Bavaria', x: 4058, z: 214, capa: ['predio', 'ruido', 'trafico'], t: 'Plan parcial Bavaria', tx: I.predio ? `${fmt(I.predio.habitantes)} habitantes nuevos; ${fmt(I.predio.vehiculosDia)} vehículos/día; ruido ${(I.predio.ruidoDb - I.predio.ruidoDb0).toFixed(1)} dB más.` : '' });
    if (b === 'B' || b === 'C' || R.sim === 12) L.push({ n: 'Bavaria Común', x: 3950, z: 180, capa: ['caminos', 'especies'], t: 'Bavaria Común · instituto', tx: 'Pasajes nuevos que abren el predio al barrio.' });
    if (R.def && R.def.par === 2) L.push({ n: 'Vía cerrada', donde: 'cierre', capa: ['cierre', 'trafico', 'ruido'], t: 'Cierre de la Av. de las Américas', tx: 'El tráfico se desvía por las calles vecinas (en rojo).' });
    return L;
  }
  async function irLugar(l, boton) {
    if (!l) return; let x = l.x, z = l.z; if (l.donde) { const c = centroDe(l.donde); if (!c) return; [x, z] = c; }
    const corria = !RELOJ.pausaSem; RELOJ.pausarAños(true);
    if (window.KEN_FOCO) window.KEN_FOCO.on(l.capa);
    if (l.capa.includes('ruido')) { const rb = document.getElementById('rc-btn'); if (rb && !rb.classList.contains('on')) rb.click(); }
    if (l.alto) { // capa que cubre todo Kennedy: vista alta de toda el área (no el Ojo de Dios, que se acerca demasiado)
      const g = T3.scene.getObjectByName(l.donde), bx = g ? new T3.THREE.Box3().setFromObject(g) : null, s = bx && !bx.isEmpty() ? bx.getSize(new T3.THREE.Vector3()) : { x: 3000, z: 3000 }, D = Math.min(4200, Math.max(1600, Math.max(s.x, s.z) * 0.95));
      T3.anim = { t: 0, dur: 2.2, p0: T3.camera.position.clone(), c0: T3.orbit.target.clone(), p1: new T3.THREE.Vector3(x + D * 0.12, D * 0.82, z + D * 0.5), c1: new T3.THREE.Vector3(x, 0, z) };
      const c = document.createElement('div'); c.className = 'su-av on'; c.style.cssText = 'position:fixed;left:296px;bottom:92px;z-index:46;max-width:360px'; c.innerHTML = `<div><small>${l.t}</small><b>${l.tx}</b></div><div class="bt"><button type="button">Cerrar</button></div>`;
      document.body.appendChild(c); c.querySelector('button').onclick = () => { c.remove(); focoHistoria(1); if (corria && !R.go && !R.fin) { const p = document.querySelector('#lp-anos .play'); if (p && RELOJ.pausaSem) p.click(); } };
      return;
    }
    if (window.KEN_OJO) { await window.KEN_OJO.ir({ x, z, titulo: l.t, texto: l.tx, color: '#ffcf7a' });
      const bo = document.querySelector('#ojo-t button'); if (bo) bo.addEventListener('click', () => { focoHistoria(1); if (corria && !R.go && !R.fin) { const p = document.querySelector('#lp-anos .play'); if (p && RELOJ.pausaSem) p.click(); } }, { once: true }); }
  }

  /* ---------- GAME OVER ---------- */
  function gameOver(g) {
    R.go = g; RELOJ.pausarAños(true);
    go.querySelector('p').textContent = `Año ${(g.sem / 52 + 1).toFixed(1)} · ${g.motivo || g.regla}`;
    go.classList.add('on'); if (window.KEN_FOCO) window.KEN_FOCO.on([g.regla === 'ruido' ? 'ruido' : g.regla === 'trafico' ? 'trafico' : 'especies', 'cierre', 'predio', 'basura', 'degradacion', 'abasto', 'residuos', 'biodiversidad', 'suelo', 'gobernanza']); // la causa queda en color: el cierre, el predio o la basura
    setTimeout(() => { go.classList.remove('on'); abrirInforme(); }, 4200);
  }

  /* ---------- INFORME ---------- */
  /* informe nuevo (data3d/informe.js): veredicto «¿Fue sostenible?», antes → después, estado actual vs esta simulación, gráficas por año,
     red de interacciones en bola y lo que pasó año por año. Si no carga, queda el informe anterior (abrirInformeViejo). */
  async function abrirInforme() {
    const H = R.hist; if (!H.length) return;
    try { const { abrirInforme2 } = await import('./informe.js?v=3');
      abrirInforme2({ cont: inf.querySelector('.caja'), sim: R.sim, def: R.def || {}, hist: H, base: parejaSin() != null ? R.base : null, reglas: (M && M.REGLAS) || [], go: R.go, eventos: R.eventos, extinciones: R.extinciones, ind: IND, semilla: SEMILLA, onCerrar: cerrarInforme });
      inf.classList.add('on'); return;
    } catch (e) { console.warn('informe nuevo:', e); }
    abrirInformeViejo();
  }
  function abrirInformeViejo() {
    const H = R.hist; if (!H.length) return;
    const I0 = H[0], I = H[H.length - 1], d = R.def || {}, nombre = (SIMS_UI.find(s => s.id === R.sim) || {}).n || d.n || '';
    const B = R.base && R.base[Math.min(R.base.length - 1, H.length - 1)];
    const filas = IND.filter(x => I[x.k] != null).map(x => {
      const c = I[x.k] - I0[x.k], cl = Math.abs(c) < 1e-9 ? '' : ((c > 0) === x.sube ? 'bien' : 'mal');
      const cb = B && B[x.k] != null && R.sim !== 1 ? I[x.k] - B[x.k] : null, clb = cb == null || Math.abs(cb) < 1e-9 ? '' : ((cb > 0) === x.sube ? 'bien' : 'mal');
      return `<tr><td>${x.n}</td><td>${x.f(I0[x.k], I0)}</td><td>${x.f(I[x.k], I)}</td><td class="${cl}">${signo(c, x)}</td><td class="${clb}">${cb == null ? '—' : signo(cb, x)}</td></tr>`;
    }).join('');
    const graf = ['fauna', 'red', 'trafico', 'ruidoDb', 'comidaMin', 'poliniz'].filter(k => I[k] != null).map(k => { const x = IND.find(z => z.k === k); return `<figure><figcaption>${x.n}</figcaption>${grafica(H.map(h => h[k]), R.base && R.sim !== 1 ? R.base.slice(0, H.length).map(h => h[k]) : null, x)}</figure>`; }).join('');
    const ext = R.extinciones.length ? `<ul>${R.extinciones.map(x => `<li><b>${x.nombre || x.especie}</b> · año ${(x.sem / 52 + 1).toFixed(1)} · ${x.motivo}${x.parche ? ' · ' + x.parche : ''}</li>`).join('')}</ul>` : '<p class="sub">Ninguna especie desapareció de Kennedy en esta corrida.</p>';
    const fasesN = (a) => a <= 5 ? 'corto plazo' : a <= 10 ? 'mediano plazo' : 'largo plazo';
    const linea = R.eventos.length ? `<ul>${R.eventos.map(e => { const a = Math.floor((e.sem || 0) / 52) + 1; return `<li><b>Año ${a}</b> <span class="sub">(${fasesN(a)})</span> · ${escH(e.titulo)}${e.texto ? ' — ' + escH(e.texto) : ''}</li>`; }).join('')}</ul>` : '<p class="sub">Sin avisos en esta corrida.</p>';
    const reglas = M && M.REGLAS ? `<ul>${M.REGLAS.map(r => `<li><b>${r.n}:</b> ${r.txt}${r.fuente ? ` <span class="sub">(${r.fuente})</span>` : ''}</li>`).join('')}</ul>` : '';
    const ver = R.go ? `<div class="ver go">GAME OVER en el año ${(R.go.sem / 52 + 1).toFixed(1)}: ${R.go.motivo || R.go.regla}.</div>`
      : `<div class="ver ok">Kennedy aguanta los ${Math.round(FIN / 52)} años en esta simulación: no se cumplió ninguna regla de game over.</div>`;
    inf.querySelector('.caja').innerHTML = `<header><div><h2>Simulación ${R.sim} · ${nombre}</h2><p class="sub">${d.pregunta || d.desc || ''} · ${(H.length - 1)} semanas (${((H.length - 1) / 52).toFixed(1)} años) · semilla ${SEMILLA}</p></div>
      <div class="bot"><button data-imp>Imprimir / PDF</button><button class="pri" data-x>Cerrar</button></div></header>${ver}
      <h3>Indicadores · inicio → final${R.sim !== 1 && B ? ' · comparado con el estado actual' : ''}</h3>
      <table><thead><tr><th>Indicador</th><th>Inicio</th><th>Final</th><th>Cambio</th><th>vs. estado actual</th></tr></thead><tbody>${filas}</tbody></table>
      <h3>Cómo cambió${R.sim !== 1 && B ? ' (línea punteada: estado actual)' : ''}</h3><div class="graf">${graf}</div>
      <h3>Lo que pasó, año por año</h3>${linea}
      <h3>Especies que desaparecieron</h3>${ext}
      <h3>Reglas de game over (iguales para las 12)</h3>${reglas}`;
    inf.querySelector('[data-x]').onclick = cerrarInforme; inf.querySelector('[data-imp]').onclick = () => window.print();
    inf.classList.add('on');
  }
  function cerrarInforme() { inf.classList.remove('on'); }
  const signo = (c, x) => { if (c == null || isNaN(c)) return '—'; const s = c > 0 ? '+' : c < 0 ? '−' : ''; const a = Math.abs(c);
    if (x.k === 'trafico' || x.k === 'comidaMin' || x.k === 'residuos') return s + (a * 100).toFixed(0) + ' pts'; if (x.k === 'ruidoDb') return s + a.toFixed(1) + ' dB'; if (x.k === 'callesRuidosas') return s + a.toFixed(0) + ' pts'; return s + fmt(a); };
  function grafica(v, vb, x) {
    const W = 300, Hh = 90, todos = v.concat(vb || []).filter(z => z != null && isFinite(z)); if (todos.length < 2) return '<svg></svg>';
    const mn = Math.min(...todos), mx = Math.max(...todos), r = mx - mn || 1, n = v.length;
    const linea = (arr) => arr.map((y, i) => y == null ? '' : `${(i / Math.max(1, n - 1) * W).toFixed(1)},${(Hh - 6 - (y - mn) / r * (Hh - 14)).toFixed(1)}`).filter(Boolean).join(' ');
    const años = Math.max(1, Math.round(n / 52)), ejes = Array.from({ length: años + 1 }, (_, k) => `<line x1="${k / años * W}" y1="${Hh - 4}" x2="${k / años * W}" y2="${Hh - 1}" stroke="rgba(255,255,255,.25)"/>`).join('');
    return `<svg viewBox="0 0 ${W} ${Hh}" preserveAspectRatio="none">${ejes}${vb ? `<polyline points="${linea(vb)}" fill="none" stroke="rgba(255,255,255,.45)" stroke-dasharray="4 3" stroke-width="1.4" vector-effect="non-scaling-stroke"/>` : ''}<polyline points="${linea(v)}" fill="none" stroke="#ffcf7a" stroke-width="2" vector-effect="non-scaling-stroke"/></svg>`;
  }

  return { preparar, reiniciarModelo, abrirInforme, avisar, get disponible() { return !!M; }, get R() { return R; }, get M() { return M; } }; // R y M: para el tablero de la pantalla dividida
}
