/* ============ PANTALLA DIVIDIDA + TABLERO (al darle play) ============
   Al correr una de las 12 simulaciones la pantalla se parte en dos:
   · IZQUIERDA  axonometría: la MISMA escena 3D (foto 3D, edificios, huertas, mercados, plan parcial, carros) con cámara paralela
                (ortográfica) que sigue el giro y el zoom de la cámara principal; encima, volúmenes de color por zona de 500 m
                cuya altura es el indicador espacial del par en esa semana.
   · DERECHA    planta: la misma escena vista desde arriba (norte arriba, escala gráfica) con el mismo indicador como mancha de color
                por zona y los puntos del modelo (mercados, Corabastos, estaciones de compostaje, basura, refugios, humedales, barrios),
                con tamaño proporcional a su cifra de la semana.
   Todo sale de ind() de data3d/simulaciones12.js (vía window.KEN_SIMUI.R.hist): aquí no se inventa ningún dato.
   El tablero (arriba, izquierda, derecha) imita la composición de un panel de gemelo digital: barra superior con pestañas, fichas de
   los 6 pares, paneles con anillos, barras y gráfica de barras, ficha de control y leyenda. */
import { RELOJ } from './reloj.js?v=5';

const FIN = 1040, AÑO0 = 2026;
const FASES = [{ n: 'Corto plazo', a0: 1, a1: 5 }, { n: 'Mediano plazo', a0: 6, a1: 10 }, { n: 'Largo plazo', a0: 11, a1: 20 }];
const PAR_N = ['', 'Abastecimiento', 'Movilidad', 'Residuos', 'Biodiversidad', 'Población y suelo', 'Gobernanza'];
const pct = (v) => v == null || !isFinite(v) ? '—' : Math.round(v * 100) + '%';
const num = (v, d = 0) => v == null || !isFinite(v) ? '—' : (+v).toLocaleString('es-CO', { maximumFractionDigits: d, minimumFractionDigits: d });
const cl01 = (v) => Math.max(0, Math.min(1, v));

/* indicador clave de cada par para la gráfica de barras (por año, sin vs con propuesta) */
const CLAVE = {
  1: { n: 'Corabastos frente a su tope', u: '%', v: (I) => I.abasto && I.abasto.cora ? I.abasto.cora.carga * 100 : null },
  2: { n: 'Congestión', u: '%', v: (I) => I.congestion },
  3: { n: 'Basura sin recoger', u: '%', v: (I) => I.basura && I.basura.fraccionSinRecoger != null ? I.basura.fraccionSinRecoger * 100 : null },
  4: { n: 'Interacciones entre especies', u: 'miles', v: (I) => I.red != null ? I.red / 1000 : null },
  5: { n: 'Hogares en riesgo', u: 'miles', v: (I) => I.especulacion ? I.especulacion.hogaresRiesgo / 1000 : null },
  6: { n: 'Comida en la zona peor', u: '%', v: (I) => I.comidaMin != null ? I.comidaMin * 100 : null }
};

export function iniciarDividida({ T3, ESC }) {
  const THREE = T3.THREE;
  const D = window.KEN_DIVIDIDA = { on: false, salio: false, zoom: 2.2 };

  /* ---------------- fuentes y estilos ---------------- */
  if (!document.getElementById('dv-fuentes')) { const l = document.createElement('link'); l.id = 'dv-fuentes'; l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700&family=Barlow+Condensed:ital,wght@1,600;1,700;1,800&display=swap'; document.head.appendChild(l); }
  const css = document.createElement('style'); css.id = 'dv-css';
  css.textContent = `
  :root{--dv-az:#1e88ff;--dv-az2:#0b5fd1;--dv-ci:#4fc3ff;--dv-am:#ffc23d;--dv-fondo:rgba(5,16,34,.80);--dv-borde:rgba(79,195,255,.28);--dv-tx:#dcecff;--dv-tx2:#8fb0d6}
  #dv{position:fixed;inset:0;z-index:38;pointer-events:none;font-family:Rajdhani,'Barlow Condensed',system-ui,sans-serif;color:var(--dv-tx);display:none}
  html.dv-on #dv{display:block}
  #dv *{box-sizing:border-box}
  #dv button{font-family:inherit}
  /* ---- barra superior ---- */
  #dv-top{position:absolute;left:0;right:0;top:0;height:62px;pointer-events:auto;background:linear-gradient(180deg,rgba(3,12,28,.96),rgba(4,18,40,.82) 70%,rgba(4,18,40,0));display:flex;align-items:center;padding:0 22px;gap:14px}
  #dv-top .clima{display:flex;align-items:center;gap:14px;font:600 15px Rajdhani;color:#e8f3ff;white-space:nowrap}
  #dv-top .clima i{font-style:normal;opacity:.35}
  #dv-top .tabs{display:flex;gap:10px}
  #dv-top .tab{position:relative;width:116px;height:38px;border:0;cursor:pointer;color:#a9c6ea;background:linear-gradient(180deg,rgba(18,58,118,.55),rgba(10,34,74,.75));clip-path:polygon(12% 0,100% 0,88% 100%,0 100%);display:flex;flex-direction:column;align-items:center;justify-content:center;line-height:1}
  #dv-top .tab b{font:italic 800 15px 'Barlow Condensed';letter-spacing:.02em}
  #dv-top .tab small{font:600 7.5px Rajdhani;letter-spacing:.08em;opacity:.65;margin-top:2px}
  #dv-top .tab.on{color:#fff;background:linear-gradient(180deg,#2e9bff,#0a55c9);box-shadow:inset 0 -2px 0 #9fe0ff}
  #dv-top .tit{flex:1;display:flex;justify-content:center;align-self:stretch}
  #dv-top .tit div{position:relative;min-width:460px;height:62px;display:flex;flex-direction:column;align-items:center;justify-content:center;background:linear-gradient(180deg,rgba(17,74,160,.85),rgba(6,32,80,.9));clip-path:polygon(0 0,100% 0,92% 100%,8% 100%);border-bottom:2px solid var(--dv-ci)}
  #dv-top .tit b{font:italic 800 23px 'Barlow Condensed';letter-spacing:.14em;color:#fff;text-shadow:0 0 12px rgba(79,195,255,.6)}
  #dv-top .tit small{font:700 9px Rajdhani;letter-spacing:.34em;color:#cfe6ff;margin-top:1px}
  #dv-top .tit div:before{content:'';position:absolute;left:24px;top:16px;width:26px;height:28px;background:repeating-linear-gradient(90deg,#4fc3ff 0 4px,transparent 4px 7px);opacity:.9}
  #dv-top .der{display:flex;align-items:center;gap:14px;font:600 15px Rajdhani;white-space:nowrap}
  #dv-top .der i{font-style:normal;opacity:.35}
  #dv-top .der button{background:none;border:0;color:#e8f3ff;font:600 15px Rajdhani;cursor:pointer;display:flex;align-items:center;gap:6px}
  /* ---- fichas de los pares ---- */
  #dv-chips{position:absolute;left:50%;top:74px;transform:translateX(-50%);display:flex;gap:8px;pointer-events:auto}
  #dv-chips button{white-space:nowrap;height:30px;padding:0 12px;border-radius:5px;border:1px solid rgba(79,195,255,.55);background:linear-gradient(180deg,rgba(12,48,104,.86),rgba(6,26,60,.9));color:#d6e9ff;font:italic 700 13.5px 'Barlow Condensed';letter-spacing:.03em;cursor:pointer;display:flex;align-items:center;gap:8px;box-shadow:0 0 0 1px rgba(0,0,0,.35)}
  #dv-chips button:before,#dv-chips button:after{content:'';width:0;height:0;border:4px solid transparent;opacity:.75}
  #dv-chips button:before{border-right-color:#7fd0ff;margin-left:-6px}#dv-chips button:after{border-left-color:#7fd0ff;margin-right:-6px}
  #dv-chips button.on{background:linear-gradient(180deg,#1f8fff,#0a4fbf);color:#fff;border-color:#9fe0ff;box-shadow:0 0 14px rgba(47,155,255,.65)}
  /* ---- paneles ---- */
  .dv-col{position:absolute;top:74px;bottom:58px;width:292px;display:flex;flex-direction:column;gap:10px;pointer-events:auto}
  #dv-izq{left:16px}#dv-der{right:16px}
  .dv-p{background:var(--dv-fondo);border:1px solid var(--dv-borde);display:flex;flex-direction:column;min-height:0;backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)}
  .dv-h{height:36px;flex:none;display:flex;align-items:center;gap:8px;padding:0 10px;background:linear-gradient(90deg,#0d63d6,rgba(13,99,214,.55) 70%,rgba(13,99,214,.15));border-bottom:1px solid #3aa8ff}
  .dv-h:before{content:'';width:0;height:0;border:6px solid transparent;border-left:9px solid #fff;margin-right:-4px}
  .dv-h div{display:flex;flex-direction:column;line-height:1}
  .dv-h b{font:italic 800 17px 'Barlow Condensed';letter-spacing:.04em;color:#fff}
  .dv-h small{font:700 7.5px Rajdhani;letter-spacing:.12em;color:#d4e8ff;margin-top:2px}
  .dv-c{padding:10px 12px;flex:1;min-height:0;position:relative}
  .dv-anillo{position:relative;display:inline-grid;place-items:center}
  .dv-anillo svg{display:block;transform:rotate(-90deg)}
  .dv-anillo span{position:absolute;font:700 15px Rajdhani;color:#fff}
  .dv-big{font:700 24px Rajdhani;color:#fff;line-height:1}.dv-big small{font:600 11px Rajdhani;color:var(--dv-tx2);margin-left:3px}
  .dv-lbl{font:600 12px/1.2 Rajdhani;color:#cfe0f5}
  .dv-sub{font:500 11px/1.25 Rajdhani;color:var(--dv-tx2)}
  .dv-ico{width:34px;height:30px;flex:none;display:grid;place-items:center;border-radius:4px;background:linear-gradient(180deg,#2e9bff,#0a55c9);font-size:17px}
  /* barras */
  .dv-bar{display:grid;grid-template-columns:76px 1fr 46px;align-items:center;gap:6px;margin:0 0 9px}
  .dv-bar .t{font:600 11.5px/1.05 Rajdhani;color:#cfe0f5}
  .dv-bar .p{position:relative;height:4px;background:rgba(120,170,230,.18);border-radius:2px}
  .dv-bar .p i{position:absolute;left:0;top:0;bottom:0;border-radius:2px;background:linear-gradient(90deg,#0a5fd8,#2fa4ff)}
  .dv-bar .p u{position:absolute;top:50%;width:12px;height:12px;margin:-6px 0 0 -6px;border-radius:50%;background:#0b2c5c;border:2px solid #8fd6ff;box-shadow:0 0 8px #2fa4ff}
  .dv-bar .p s{position:absolute;left:50%;top:-4px;bottom:-4px;border-left:1px dashed rgba(255,255,255,.35)}
  .dv-bar .v{font:600 12px Rajdhani;color:#fff;text-align:right}
  .dv-bar.bien .p i{background:linear-gradient(90deg,#0aa86a,#3ee6a0)}.dv-bar.mal .p i{background:linear-gradient(90deg,#c0392b,#ff7a59)}
  .dv-eje{display:flex;justify-content:space-between;margin-left:82px;margin-right:52px;font:600 9.5px Rajdhani;color:var(--dv-tx2)}
  /* grilla de anillos */
  .dv-g2{display:grid;grid-template-columns:1fr 1fr;gap:10px 8px}
  .dv-ai{display:flex;align-items:center;gap:8px}
  .dv-ai .dv-anillo span{font-size:12.5px}
  /* gráfica */
  .dv-graf svg{width:100%;height:100%}
  .dv-ley{display:flex;gap:10px;justify-content:flex-end;font:600 10px Rajdhani;color:#cfe0f5}
  .dv-ley i{display:inline-block;width:8px;height:8px;margin-right:4px;vertical-align:0}
  /* ficha de control (centro de la planta) */
  #dv-ficha{position:absolute;width:236px;pointer-events:auto;background:rgba(12,22,38,.78);border:1px solid rgba(79,195,255,.25);backdrop-filter:blur(5px);-webkit-backdrop-filter:blur(5px)}
  #dv-ficha h5{margin:0;padding:8px 12px;font:700 14px Rajdhani;color:#fff;background:linear-gradient(90deg,#0d63d6,rgba(13,99,214,.35))}
  #dv-ficha dl{margin:0;padding:8px 12px 10px;display:grid;grid-template-columns:auto 1fr;gap:5px 6px;font:600 12px/1.25 Rajdhani}
  #dv-ficha dt{color:#e3efff}#dv-ficha dd{margin:0;color:#9fc4ee}
  /* leyenda */
  #dv-leyenda{position:absolute;width:150px;pointer-events:none;background:rgba(5,16,34,.7);border:1px solid rgba(79,195,255,.2);padding:8px 10px;font:600 11.5px Rajdhani;color:#dcecff}
  #dv-leyenda div{display:flex;align-items:center;gap:7px;margin:3px 0}
  #dv-leyenda i{flex:none;width:26px;height:11px;border-radius:2px;font:700 7.5px/11px Rajdhani;color:#fff;text-align:center;font-style:normal}
  #dv-leyenda .rampa{height:8px;border-radius:2px;margin:3px 0 1px}
  #dv-leyenda .rl{display:flex;justify-content:space-between;font-size:9.5px;color:var(--dv-tx2);margin:0}
  /* etiquetas de cada mitad, norte y escala */
  .dv-vista{position:absolute;top:116px;pointer-events:none;display:flex;flex-direction:column;gap:2px}
  .dv-vista b{font:italic 800 15px 'Barlow Condensed';letter-spacing:.16em;color:#fff;text-shadow:0 1px 6px #000}
  .dv-vista small{font:600 10px Rajdhani;letter-spacing:.12em;color:#bcd8f7;text-shadow:0 1px 4px #000}
  #dv-norte{position:absolute;pointer-events:none;width:38px;height:52px;text-align:center;font:800 13px Rajdhani;color:#fff;text-shadow:0 1px 4px #000}
  #dv-escala{position:absolute;pointer-events:none;font:600 10px Rajdhani;color:#fff;text-shadow:0 1px 3px #000}
  #dv-escala i{display:block;height:6px;border:2px solid #fff;border-top:0;margin-top:2px;background:linear-gradient(90deg,#fff 50%,transparent 50%) bottom/100% 2px no-repeat}
  #dv-raya{position:absolute;top:62px;bottom:0;left:50%;width:2px;margin-left:-1px;background:linear-gradient(180deg,rgba(79,195,255,0),#4fc3ff 12%,#4fc3ff 88%,rgba(79,195,255,0));box-shadow:0 0 12px #2fa4ff}
  /* abajo: botones y llave */
  #dv-pills{position:absolute;bottom:16px;display:flex;flex-direction:column;gap:8px;pointer-events:auto}
  #dv-pills button{height:28px;padding:0 16px;border-radius:14px;border:1px solid rgba(79,195,255,.55);background:rgba(8,30,66,.85);color:#dcecff;font:600 12.5px Rajdhani;cursor:pointer}
  #dv-pills button.on{background:linear-gradient(180deg,#1f8fff,#0a4fbf);color:#fff}
  #dv-llave{position:absolute;bottom:16px;pointer-events:auto;display:flex;align-items:center;gap:10px;height:30px;padding:0 8px 0 18px;border-radius:15px;border:1px solid rgba(79,195,255,.6);background:linear-gradient(180deg,rgba(18,70,150,.9),rgba(6,30,72,.92));font:700 13px Rajdhani;color:#fff;cursor:pointer}
  #dv-llave u{width:34px;height:16px;border-radius:8px;background:rgba(255,255,255,.25);position:relative}
  #dv-llave u:after{content:'';position:absolute;top:2px;left:20px;width:12px;height:12px;border-radius:50%;background:#fff;transition:left .2s}
  #dv-llave.off u:after{left:2px}
  /* lo de la vista limpia que estorba en la pantalla dividida */
  html.dv-on #gs-izq,html.dv-on #su-hist,html.dv-on #foco-ley,html.dv-on .es-et,html.dv-on .og-et,html.dv-on .mr-et,html.dv-on .merc-et,html.dv-on .lp-et,html.dv-on .cp-et,html.dv-on .ac-et,html.dv-on .be,html.dv-on #cont-et,html.dv-on #ojo-t{display:none!important}
  html.dv-on #su-der{display:none!important}
  html.dv-on.dv-var #su-der{display:block!important;left:calc(50% - 160px);right:auto;top:118px;width:320px;max-height:calc(100vh - 210px);z-index:45;background:rgba(5,16,34,.94);border:1px solid rgba(79,195,255,.45);border-radius:4px}
  html.dv-on #su-avisos{top:150px;left:calc(50% + 18px);transform:none;width:min(320px,calc(50vw - 340px))}
  html.dv-on #lp-anos{bottom:14px;width:min(560px,calc(100vw - 680px));min-width:420px;border-radius:24px;background:linear-gradient(180deg,rgba(14,52,112,.92),rgba(5,22,52,.94));border:1px solid rgba(79,195,255,.55);box-shadow:0 0 18px rgba(30,136,255,.35);font-family:Rajdhani}
  html.dv-on #lp-anos button.play{width:46px;height:46px;min-width:46px;margin:-14px 0;border-radius:50%;background:radial-gradient(circle at 50% 40%,#3fb0ff,#0a4fbf 70%);color:#fff;border:2px solid #9fe0ff;box-shadow:0 0 16px #1e88ff;font-size:16px}
  html.dv-on #lp-anos .tit{display:none}
  html.dv-on #lp-anos .pista b{background:linear-gradient(90deg,#1e88ff,#4fc3ff)}
  html.dv-on #lp-anos button{border-color:rgba(79,195,255,.45);background:rgba(20,70,140,.5)}
  @media (max-width:1180px){.dv-col{width:236px}.dv-bar{grid-template-columns:62px 1fr 40px}#dv-top .tab{width:96px}#dv-top .tit div{min-width:330px}#dv-chips button{padding:0 9px;font-size:12px}html.dv-on #lp-anos{width:calc(100vw - 560px);min-width:300px}}
  @media (max-width:900px){.dv-col,#dv-chips,#dv-top .tabs,#dv-top .clima,#dv-ficha,#dv-leyenda{display:none!important}#dv-raya{top:50%;left:0;right:0;bottom:auto;width:auto;height:2px;margin:0}html.dv-on #lp-anos{width:calc(100vw - 24px);min-width:0}}`;
  document.head.appendChild(css);

  /* ---------------- HTML del tablero ---------------- */
  const raiz = document.createElement('div'); raiz.id = 'dv';
  const anillo = (id, r = 26, w = 5) => { const C = 2 * Math.PI * r, s = 2 * (r + w); return `<div class="dv-anillo" data-a="${id}"><svg width="${s}" height="${s}"><circle cx="${s / 2}" cy="${s / 2}" r="${r}" fill="none" stroke="rgba(80,140,220,.22)" stroke-width="${w}"/><circle cx="${s / 2}" cy="${s / 2}" r="${r}" fill="none" stroke="url(#dvGrad)" stroke-width="${w}" stroke-linecap="round" stroke-dasharray="0 ${C}" data-c="${C}"/></svg><span>—</span></div>`; };
  raiz.innerHTML = `<svg width="0" height="0" style="position:absolute"><defs><linearGradient id="dvGrad" x1="0" x2="1"><stop offset="0" stop-color="#4fc3ff"/><stop offset="1" stop-color="#1565ff"/></linearGradient><linearGradient id="dvGradA" x1="0" x2="1"><stop offset="0" stop-color="#ffe07a"/><stop offset="1" stop-color="#ffab1f"/></linearGradient></defs></svg>
  <div id="dv-raya"></div>
  <div class="dv-vista" id="dv-v1"><b>AXONOMETRÍA</b><small>VISTA PARALELA · ALTURA = INDICADOR DEL PAR</small></div>
  <div class="dv-vista" id="dv-v2"><b>PLANTA</b><small>VISTA CENITAL · NORTE ARRIBA</small></div>
  <div id="dv-norte"><svg width="38" height="34" viewBox="0 0 38 34"><circle cx="19" cy="19" r="13" fill="rgba(5,16,34,.6)" stroke="#9fe0ff"/><path d="M19 4 L25 24 L19 20 L13 24Z" fill="#fff"/></svg>N</div>
  <div id="dv-escala"><span>500 m</span><i></i></div>
  <div id="dv-top">
    <div class="clima"><span>☁ 14°C</span><i>|</i><span data-k="reloj">--:--:--</span><i>|</i><span data-k="fecha">2026/11/23</span></div>
    <div class="tabs"><button class="tab" data-vista="una"><b>Vista 3D</b><small>SINGLE VIEW</small></button><button class="tab on" data-vista="div"><b>Dividida</b><small>SPLIT VIEW</small></button></div>
    <div class="tit"><div><b>KENNEDY · GEMELO DIGITAL</b><small>SIMULADOR TERRITORIAL · 12 ESCENARIOS · 20 AÑOS</small></div></div>
    <div class="tabs"><button class="tab" data-prop="0"><b>Sin propuesta</b><small>BASELINE</small></button><button class="tab" data-prop="1"><b>Con propuesta</b><small>PROPOSAL</small></button></div>
    <div class="der"><span>Congestión <b data-k="cong">—</b></span><i>|</i><button data-k="var">Variables ⚙</button></div>
  </div>
  <div id="dv-chips">${[1, 2, 3, 4, 5, 6].map(p => `<button data-par="${p}">${String(p).padStart(2, '0')} ${PAR_N[p]}</button>`).join('')}</div>
  <div class="dv-col" id="dv-izq">
    <section class="dv-p" style="flex:0 0 172px"><div class="dv-h"><div><b>Abastecimiento local</b><small>LOCAL FOOD SUPPLY</small></div></div>
      <div class="dv-c" style="display:flex;align-items:center;gap:14px">
        <div style="text-align:center">${anillo('comida', 36, 7)}<div class="dv-lbl" style="margin-top:6px">Comida de<br>huertas y mercados</div></div>
        <div style="display:flex;flex-direction:column;gap:12px">
          <div style="display:flex;gap:8px;align-items:center"><span class="dv-ico">🌱</span><div><div class="dv-big" data-k="huertas">—<small>huertas</small></div><div class="dv-sub">activas en Kennedy</div></div></div>
          <div style="display:flex;gap:8px;align-items:center"><span class="dv-ico">🏬</span><div><div class="dv-big" data-k="cora">—</div><div class="dv-sub">Corabastos frente<br>a su tope</div></div></div>
        </div></div></section>
    <section class="dv-p" style="flex:1 1 300px"><div class="dv-h"><div><b>Red ecológica</b><small>ECOLOGICAL NETWORK · HOY = LÍNEA</small></div></div>
      <div class="dv-c"><div class="dv-sub" style="margin-bottom:8px">Frente a hoy (año 1). Unidad: conteo del modelo</div><div data-k="barras"></div>
      <div class="dv-eje"><span>0</span><span>hoy</span><span>×2</span></div></div></section>
    <section class="dv-p" style="flex:0 0 240px"><div class="dv-h"><div><b>Recursos básicos</b><small>BASIC RESOURCE USAGE</small></div></div>
      <div class="dv-c"><div class="dv-g2">
        <div class="dv-ai">${anillo('circ')}<div class="dv-lbl">Economía<br>circular</div></div>
        <div class="dv-ai">${anillo('sinrec')}<div class="dv-lbl">Basura<br>sin recoger</div></div>
        <div class="dv-ai">${anillo('humf')}<div class="dv-lbl">Humedales<br>que funcionan</div></div>
        <div class="dv-ai">${anillo('ruid')}<div class="dv-lbl">Calles<br>ruidosas ≥65 dB</div></div>
        <div class="dv-ai"><span class="dv-ico">🗑</span><div><div class="dv-big" data-k="basura">—<small>t/día</small></div><div class="dv-sub">basura generada</div></div></div>
        <div class="dv-ai"><span class="dv-ico">🔊</span><div><div class="dv-big" data-k="db">—<small>dB</small></div><div class="dv-sub">ruido promedio</div></div></div>
      </div></div></section>
  </div>
  <div class="dv-col" id="dv-der">
    <section class="dv-p" style="flex:0 0 150px"><div class="dv-h"><div><b>Población y suelo</b><small>POPULATION PLANNING</small></div></div>
      <div class="dv-c" style="display:flex;align-items:center;gap:12px">
        <span class="dv-ico" style="width:40px;height:40px;font-size:22px">👪</span><div><div class="dv-big" data-k="hog">—</div><div class="dv-sub">hogares en riesgo<br>de desplazamiento</div></div>
        <div style="margin-left:auto;text-align:center">${anillo('suelo', 28, 6)}<div class="dv-sub">precio del suelo</div></div></div></section>
    <section class="dv-p" style="flex:1 1 250px"><div class="dv-h"><div><b>Tendencia del par</b><small>CONSTRUCTION SCALE · POR AÑO</small></div></div>
      <div class="dv-c" style="display:flex;flex-direction:column"><div style="display:flex;justify-content:space-between;align-items:center;gap:6px"><span class="dv-sub" data-k="gtit">—</span><div class="dv-ley"><span><i style="background:#ffc23d"></i>Sin propuesta</span><span><i style="background:#1e88ff"></i>Con propuesta</span></div></div>
      <div class="dv-graf" data-k="graf" style="flex:1;min-height:110px"></div></div></section>
    <section class="dv-p" style="flex:0 0 300px"><div class="dv-h"><div><b>Sin / con propuesta</b><small>LAND PLANNING PROPORTION</small></div></div>
      <div class="dv-c"><div class="dv-g2">
        <div class="dv-ai">${anillo('k1', 22, 5)}<div><div class="dv-lbl">Congestión</div><div class="dv-big" style="font-size:19px" data-k="k1">—</div><div class="dv-sub" data-k="k1b"></div></div></div>
        <div class="dv-ai">${anillo('k2', 22, 5)}<div><div class="dv-lbl">Comida zona peor</div><div class="dv-big" style="font-size:19px" data-k="k2">—</div><div class="dv-sub" data-k="k2b"></div></div></div>
        <div class="dv-ai">${anillo('k3', 22, 5)}<div><div class="dv-lbl">Humedales</div><div class="dv-big" style="font-size:19px" data-k="k3">—</div><div class="dv-sub" data-k="k3b"></div></div></div>
        <div class="dv-ai">${anillo('k4', 22, 5)}<div><div class="dv-lbl">Economía circular</div><div class="dv-big" style="font-size:19px" data-k="k4">—</div><div class="dv-sub" data-k="k4b"></div></div></div>
        <div class="dv-ai">${anillo('k5', 22, 5)}<div><div class="dv-lbl">Sin recoger</div><div class="dv-big" style="font-size:19px" data-k="k5">—</div><div class="dv-sub" data-k="k5b"></div></div></div>
        <div class="dv-ai">${anillo('k6', 22, 5)}<div><div class="dv-lbl">Árboles perdidos</div><div class="dv-big" style="font-size:19px" data-k="k6">—</div><div class="dv-sub" data-k="k6b"></div></div></div>
      </div></div></section>
  </div>
  <div id="dv-ficha"><h5>Indicadores de control</h5><dl data-k="ficha"></dl></div>
  <div id="dv-leyenda" data-k="leyenda"></div>
  <div id="dv-pills"><button data-p="byn" title="La ciudad en blanco y negro; solo la propuesta en color">Blanco y negro</button><button data-p="var">Variables</button><button data-p="inf">Informe</button></div>
  <div id="dv-llave">Pantalla dividida<u></u></div>`;
  document.body.appendChild(raiz);
  const $ = (k) => raiz.querySelector(`[data-k="${k}"]`);

  /* ---------------- controles ---------------- */
  const html = document.documentElement;
  raiz.querySelectorAll('[data-vista]').forEach(b => b.onclick = () => { if (b.dataset.vista === 'una') salir(); else activar(); });
  raiz.querySelector('#dv-llave').onclick = () => { if (D.on) salir(); else activar(); };
  raiz.querySelectorAll('[data-par]').forEach(b => b.onclick = () => { const S = ESC.sim, con = S ? S.id % 2 === 0 : false; elegir(2 * +b.dataset.par - (con ? 0 : 1)); });
  raiz.querySelectorAll('[data-prop]').forEach(b => b.onclick = () => { const S = ESC.sim; if (!S) return; elegir(2 * S.par - (b.dataset.prop === '1' ? 0 : 1)); });
  const variables = () => { html.classList.toggle('dv-var'); raiz.querySelector('[data-p="var"]').classList.toggle('on', html.classList.contains('dv-var')); };
  $('var').onclick = variables; raiz.querySelector('[data-p="var"]').onclick = variables;
  raiz.querySelector('[data-p="byn"]').onclick = () => D.ponerByN(!D.byn);
  raiz.querySelector('[data-p="inf"]').onclick = () => { const U = window.KEN_SIMUI; if (U && U.abrirInforme) U.abrirInforme(); };
  function elegir(id) { // misma acción que los botones de la vista limpia (#lp-sims), y sigue corriendo
    const b = document.querySelector(`#lp-sims button[data-s="${id}"]`); if (!b) return;
    const corria = !RELOJ.pausaSem; b.click();
    if (corria) setTimeout(() => { const p = document.querySelector('#lp-anos .play'); if (p && RELOJ.pausaSem) p.click(); }, 400);
  }

  /* ---------------- cámaras paralelas ---------------- */
  const axo = new THREE.OrthographicCamera(-1, 1, 1, -1, -30000, 30000);
  const planta = new THREE.OrthographicCamera(-1, 1, 1, -1, -30000, 30000);
  const CAPA_PL = 10, CAPA_AX = 11; // capa temática: la mancha plana solo en planta, los volúmenes solo en la axonometría
  const v = new THREE.Vector3(), FONDO = new THREE.Color('#06122a');
  const caja = () => { // rectángulos visibles de cada mitad (en px CSS, origen arriba-izquierda), sin los paneles
    const W = innerWidth, H = innerHeight, vert = W < 900;
    if (vert) return { vert, a: { x: 0, y: 0, w: W, h: Math.floor(H / 2), vx0: 0, vx1: W, vy0: 62, vy1: Math.floor(H / 2) }, b: { x: 0, y: Math.floor(H / 2), w: W, h: H - Math.floor(H / 2), vx0: 0, vx1: W, vy0: 0, vy1: H - Math.floor(H / 2) - 80 } };
    const col = W < 1180 ? 252 : 308, m = Math.floor(W / 2);
    return { vert, a: { x: 0, y: 0, w: m, h: H, vx0: col, vx1: m, vy0: 110, vy1: H - 70 }, b: { x: m, y: 0, w: W - m, h: H, vx0: 0, vx1: W - m - col, vy0: 110, vy1: H - 70 } };
  };
  function encuadrar(cam, r, medio) { // frustum ortográfico con el punto mirado en el centro de la parte visible
    const asp = r.w / r.h, h = medio, w = h * asp;
    const fx = ((r.vx0 + r.vx1) / 2) / r.w, fy = ((r.vy0 + r.vy1) / 2) / r.h;
    cam.left = -2 * w * fx; cam.right = 2 * w * (1 - fx); cam.top = 2 * h * fy; cam.bottom = -2 * h * (1 - fy);
    cam.updateProjectionMatrix();
  }
  D.render = function (cam) {
    if (!D.on || !T3.orbit) return false;
    const R = T3.renderer, tg = T3.orbit.target, dist = cam.position.distanceTo(tg), fov = (cam.fov || 50) * Math.PI / 180;
    const medio = Math.max(600, dist * Math.tan(fov / 2) * D.zoom), K = caja(); // las vistas paralelas abarcan más que la perspectiva: Kennedy casi entera
    // axonometría: el mismo rumbo que la cámara principal, elevación fija de 35° (vista paralela, sin fuga)
    v.copy(cam.position).sub(tg); const az = Math.atan2(v.x, v.z), el = 35 * Math.PI / 180;
    axo.position.set(tg.x + Math.sin(az) * Math.cos(el) * dist, tg.y + Math.sin(el) * dist, tg.z + Math.cos(az) * Math.cos(el) * dist);
    axo.up.set(0, 1, 0); axo.lookAt(tg); axo.layers.mask = cam.layers.mask; axo.layers.enable(CAPA_AX); axo.layers.disable(CAPA_PL);
    encuadrar(axo, K.a, medio * 0.92);
    // planta: cenital, norte arriba (en el mundo z va al sur)
    planta.position.set(tg.x, tg.y + dist, tg.z); planta.up.set(0, 0, -1); planta.lookAt(tg.x, tg.y, tg.z);
    planta.layers.mask = cam.layers.mask; planta.layers.enable(CAPA_PL); planta.layers.disable(CAPA_AX);
    encuadrar(planta, K.b, medio * 1.15);
    D.escalaPlanta = (planta.top - planta.bottom) / K.b.h; // m por px CSS
    const H = innerHeight, auto = R.autoClear;
    R.setScissorTest(true);
    const dib = (c, r) => { const y = H - r.y - r.h;
      if (D.byn) return dibByN(c, r, y);
      R.setViewport(r.x, y, r.w, r.h); R.setScissor(r.x, y, r.w, r.h); R.render(T3.scene, c); };
    const sc = T3.scene, nb = sc.fog, bg = sc.background; sc.fog = null; sc.background = FONDO;
    dib(axo, K.a); dib(planta, K.b);
    sc.fog = nb; sc.background = bg;
    R.setScissorTest(false); R.setViewport(0, 0, innerWidth, H); R.autoClear = auto;
    return true;
  };
  T3.dividida = D;

  /* ---------------- BLANCO Y NEGRO: la ciudad en gris y SOLO la propuesta en color ----------------
     1) la escena se dibuja en un búfer con su profundidad; 2) se pasa a pantalla en escala de grises (escribiendo también la profundidad,
     así los edificios siguen tapando lo que está detrás); 3) encima se dibujan, a color, solo los objetos de la propuesta (capa CAPA_COLOR)
     y la capa de datos de esta vista. Grupos de la propuesta: los mismos que pinta data3d/foco.js (huertas, mercados, instituto,
     compostaje, parque Corabastos) + la red de mercados y las capas de cada par; el plan parcial también va en color (es el cambio de
     las simulaciones sin propuesta). */
  const CAPA_COLOR = 8;
  const GRUPOS_PROP = new Set(['huertas-hidroponicas', 'huertasTecho', 'huertas-barrio', 'huerta-circular', 'huerta-tintal', 'bavaria_huertas', 'huerta_circular',
    'mercados-barrio', 'mercados-mallas', 'red-mercados', 'bavaria_distrito', 'residuos', 'red_produccion', 'parque_corabastos', 'predio', 'abasto_cont']);
  const esPlanParcial = (o) => o.isGroup && !o.name && o.children.some(c => { const m = c.material; return m && m.customProgramCacheKey && /fachadaPlanBav/.test(String(m.customProgramCacheKey())); });
  const COL_GRUPO = { huerta: '#3faa4c', mercado: '#2f6bdc', instituto: '#f2c63a', compost: '#9a6a34', parque: '#7fc47c', plan: '#e23b3b' };
  const CAT_GRUPO = { 'huertas-hidroponicas': 'huerta', huertasTecho: 'huerta', 'huertas-barrio': 'huerta', 'huerta-circular': 'huerta', 'huerta-tintal': 'huerta', bavaria_huertas: 'huerta', huerta_circular: 'huerta',
    'mercados-barrio': 'mercado', 'mercados-mallas': 'mercado', bavaria_distrito: 'instituto', residuos: 'compost', red_produccion: 'compost', parque_corabastos: 'parque', predio: 'plan' };
  const MAT_CAT = {}; for (const k in COL_GRUPO) MAT_CAT[k] = new THREE.MeshLambertMaterial({ color: new THREE.Color(COL_GRUPO[k]), emissive: new THREE.Color(COL_GRUPO[k]).multiplyScalar(0.45), side: THREE.DoubleSide });
  let PINTAR = []; // [malla, material de su categoría]: solo durante el pase de color (después se devuelve el suyo)
  function marcarColor() {
    PINTAR = [];
    for (const g of T3.scene.children) { const cat = CAT_GRUPO[g.name] || (esPlanParcial(g) ? 'plan' : null); if (!cat) continue;
      g.traverse(o => { if (o.isMesh && !o.isPoints && o.material && !(o.material.transparent && o.material.opacity < 0.3)) PINTAR.push([o, MAT_CAT[cat]]); }); }
    T3.scene.traverse(o => { if (o.isLight) o.layers.enable(CAPA_COLOR); }); // three.js filtra también las luces por capa: sin esto lo de color sale negro
    for (const g of T3.scene.children) if (GRUPOS_PROP.has(g.name) || esPlanParcial(g)) g.traverse(o => o.layers.enable(CAPA_COLOR));
  }
  let rtB = null, quadB = null;
  function armarByN() {
    rtB = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, depthBuffer: true });
    rtB.depthTexture = new THREE.DepthTexture(4, 4); rtB.depthTexture.type = THREE.UnsignedIntType;
    const mat = new THREE.ShaderMaterial({ uniforms: { tC: { value: rtB.texture }, tD: { value: rtB.depthTexture } }, depthTest: true, depthWrite: true, depthFunc: THREE.AlwaysDepth, toneMapped: true,
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: `uniform sampler2D tC, tD; varying vec2 vUv;
        void main(){ gl_FragColor = vec4(texture2D(tC, vUv).rgb, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
          float l = dot(gl_FragColor.rgb, vec3(0.2126, 0.7152, 0.0722)); l = mix(l, l * l * (3.0 - 2.0 * l), 0.35); // gris con algo de contraste
          gl_FragColor = vec4(vec3(l * 0.92 + 0.03), 1.0); gl_FragDepth = min(1.0, texture2D(tD, vUv).r + 0.0004); } // +0,0004 = ~24 m en la vista paralela: lo de la propuesta al ras de la foto 3D (huertas, plazoletas) queda encima del gris` });
    quadB = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat); quadB.frustumCulled = false;
    D._qs = new THREE.Scene(); D._qs.add(quadB); D._qc = new THREE.Camera();
  }
  function dibByN(c, r, y) {
    const R = T3.renderer, pr = R.getPixelRatio(), sc = T3.scene; if (!rtB) armarByN();
    const w = Math.max(1, Math.round(r.w * pr)), h = Math.max(1, Math.round(r.h * pr));
    if (rtB.width !== w || rtB.height !== h) rtB.setSize(w, h);
    const st = R.getScissorTest(); R.setScissorTest(false);
    R.setRenderTarget(rtB); R.setViewport(0, 0, r.w, r.h); R.clear(); R.render(sc, c); // 1) todo, a color, con profundidad
    R.setRenderTarget(null); R.setScissorTest(true); R.setViewport(r.x, y, r.w, r.h); R.setScissor(r.x, y, r.w, r.h);
    R.render(D._qs, D._qc);                                                           // 2) en gris, con la misma profundidad
    const mk = c.layers.mask, bg = sc.background, auto = R.autoClear;
    c.layers.disableAll(); c.layers.enable(CAPA_COLOR); c.layers.enable(6); /* 6: lo que resalta data3d/foco.js (la historia del par) */ if (mk & (1 << CAPA_PL)) c.layers.enable(CAPA_PL); if (mk & (1 << CAPA_AX)) c.layers.enable(CAPA_AX);
    sc.background = null; R.autoClear = false; // 3) solo la propuesta, a color, sobre el gris (sin la mancha de datos: se vería todo de color)
    const vc = celdas && celdas.visible, vp = prismas && prismas.visible; if (celdas) celdas.visible = prismas.visible = false;
    for (const p of PINTAR) { p[2] = p[0].material; p[0].material = p[1]; }
    try { R.render(sc, c); } finally { for (const p of PINTAR) p[0].material = p[2]; }
    if (celdas) { celdas.visible = vc; prismas.visible = vp; }
    c.layers.mask = mk; sc.background = bg; R.autoClear = auto; R.setScissorTest(st);
  }
  setInterval(() => { if (D.on && D.byn) marcarColor(); }, 1000);
  D.ponerByN = (on) => { D.byn = !!on; if (on) marcarColor(); const b = raiz.querySelector('[data-p="byn"]'); if (b) b.classList.toggle('on', D.byn); };

  /* ---------------- capa temática (datos espaciales del modelo) ---------------- */
  let ZXZ = null, NZ = 0;
  const grupo = new THREE.Group(); grupo.name = 'dividida_capa'; T3.scene.add(grupo); grupo.visible = false;
  let celdas = null, prismas = null, discos = null, aros = null;
  const MAXP = 260;
  function armar(M) {
    ZXZ = M.ZONAS_XZ; NZ = ZXZ.length; const Y = (T3.sueloY != null ? T3.sueloY : 0.3);
    const gC = new THREE.PlaneGeometry(470, 470); gC.rotateX(-Math.PI / 2);
    celdas = new THREE.InstancedMesh(gC, new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.34, depthTest: false, depthWrite: false, toneMapped: false }), NZ);
    const gP = new THREE.BoxGeometry(430, 1, 430); gP.translate(0, 0.5, 0);
    prismas = new THREE.InstancedMesh(gP, new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.3, depthWrite: false, toneMapped: false }), NZ);
    const gD = new THREE.CylinderGeometry(1, 1, 1, 40, 1); gD.translate(0, 0.5, 0);
    discos = new THREE.InstancedMesh(gD, new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.88, depthTest: false, depthWrite: false, toneMapped: false }), MAXP);
    const gA = new THREE.RingGeometry(0.86, 1, 48); gA.rotateX(-Math.PI / 2);
    aros = new THREE.InstancedMesh(gA, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95, depthTest: false, depthWrite: false, toneMapped: false }), MAXP);
    const m4 = new THREE.Matrix4(), c = new THREE.Color('#1e88ff');
    for (let i = 0; i < NZ; i++) { m4.makeTranslation(ZXZ[i][0], Y + 2, ZXZ[i][1]); celdas.setMatrixAt(i, m4); celdas.setColorAt(i, c); prismas.setMatrixAt(i, m4); prismas.setColorAt(i, c); }
    for (let i = 0; i < MAXP; i++) { discos.setColorAt(i, c); }
    celdas.layers.set(CAPA_PL); prismas.layers.set(CAPA_AX); discos.layers.set(CAPA_PL); discos.layers.enable(CAPA_AX); aros.layers.set(CAPA_PL);
    celdas.renderOrder = 20; prismas.renderOrder = 19; discos.renderOrder = 22; aros.renderOrder = 23;
    for (const o of [celdas, prismas, discos, aros]) { o.frustumCulled = false; grupo.add(o); }
    D.Y = Y;
  }
  const cerca = (x, z) => { let b = 0, bd = 1e18; for (let i = 0; i < NZ; i++) { const d = (ZXZ[i][0] - x) ** 2 + (ZXZ[i][1] - z) ** 2; if (d < bd) { bd = d; b = i; } } return b; };
  const RAMPAS = { // [colores de 0 a 1], textos de los extremos
    malo: { c: ['#1e88ff', '#7c4dff', '#ff9e40', '#ff3b30'], a: 'bajo', b: 'alto' },
    bueno: { c: ['#ff3b30', '#ff9e40', '#9be15d', '#21c46b'], a: 'bajo', b: 'alto' }
  };
  const colRampa = (R, t, out) => { const c = R.c, k = cl01(t) * (c.length - 1), i = Math.min(c.length - 2, Math.floor(k)); return out.set(c[i]).lerp(new THREE.Color(c[i + 1]), k - i); };
  /* qué muestra cada par: valor 0–1 por zona + puntos (x, z, radio m, color) */
  function tema(I, par) {
    const Z = I.zonas || {}, T = { val: null, rampa: RAMPAS.malo, t: '', pts: [], ley: [] };
    if (par === 1) {
      T.fmt = pct; T.rango = [0, 0.6]; T.min = 0.02; T.rampa = RAMPAS.bueno; T.t = 'Comida comprada en la red local'; T.val = Z.comercio ? Array.from(Z.comercio) : null;
      const A = I.abasto; if (A) { for (const m of A.mercados || []) if (m.activo !== false) T.pts.push([m.x, m.z, 40 + 22 * Math.sqrt(m.t_dia || 0), '#2f6bdc', m.carga]);
        if (A.cora) T.pts.push([A.cora.x, A.cora.z, 120 + 200 * cl01(A.cora.carga), A.cora.carga > 0.95 ? '#ff3b30' : '#ff9e40', A.cora.carga]); }
      T.ley = [['#2f6bdc', 'Mercado / acopio'], ['#ff9e40', 'Corabastos (carga)']];
    } else if (par === 2) {
      T.fmt = pct; T.rango = [0, 0.6]; T.min = 0.02; T.t = 'Comida comprada en la red local'; T.rampa = RAMPAS.bueno; T.val = Z.comercio ? Array.from(Z.comercio) : null;
      const Me = I.metro; if (Me && Me.estaciones) for (const e of Me.estaciones) T.pts.push([e.x, e.z, e.terminada ? 70 + 0.002 * (e.peatonesDia || 0) : 45, e.terminada ? '#ffd60a' : '#8a8f98', 1]);
      T.ley = [['#ffd60a', 'Estación metro L1'], ['#8a8f98', 'Estación en obra']];
    } else if (par === 3) {
      T.t = 'Basura por zona (t/día)'; const B = I.basura, v = new Array(NZ).fill(0);
      if (B && B.puntos) for (const p of B.puntos) { v[cerca(p.x, p.z)] += p.t_dia || 0; }
      T.val = v; T.rango = [0, 20]; T.min = 0.3; T.fmt = (x) => num(x, 0) + ' t/día';
      for (const e of I.estaciones || []) T.pts.push([e.x, e.z, 35 + 14 * Math.sqrt(e.tratado_t_dia || 0), e.tipo === 'relleno' ? '#6b6f76' : '#9a6a34', 1]);
      T.ley = [['#9a6a34', 'Compostaje barrial'], ['#6b6f76', 'Relleno Doña Juana']];
    } else if (par === 4) {
      T.fmt = pct; T.rango = [0, 0.8]; T.min = 0.03; T.t = 'Soporte ecológico (fauna a 300 m)'; T.rampa = RAMPAS.bueno; T.val = Z.soporteEco ? Array.from(Z.soporteEco) : null;
      for (const h of I.humedales || []) T.pts.push([h.x, h.z, 60 + 18 * Math.sqrt(h.ha || 0), (h.calidad == null || h.calidad > 0.6) ? '#26c6da' : '#ff7043', 1]);
      for (const r of I.refugios || []) T.pts.push([r.x, r.z, 45, '#3faa4c', 1]);
      if (I.fragmento) T.pts.push([I.fragmento.x, I.fragmento.z, 140, '#ff3b30', 1]);
      T.ley = [['#26c6da', 'Humedal'], ['#3faa4c', 'Refugio de fauna'], ['#ff3b30', 'Parche fragmentado']];
    } else if (par === 5) {
      T.t = 'Presión sobre el precio del suelo'; const v = new Array(NZ).fill(null), Es = I.especulacion;
      if (Es && Es.zonas) for (const z of Es.zonas) v[cerca(z.x, z.z)] = z.indice || 1; T.fmt = (x) => '×' + num(x, 2); T.rango = [1, 1.15]; T.min = 1.002;
      T.val = v; T.ley = [];
    } else if (par === 6) {
      T.t = 'Cobertura de recursos por barrio'; T.rampa = RAMPAS.bueno; const G = I.gobernanza;
      if (G && G.barrios && G.barrios.length) { T.fmt = pct; T.rango = [0, 1]; T.val = ZXZ.map(([x, z]) => { let b = G.barrios[0], bd = 1e18; for (const q of G.barrios) { const d = (q.x - x) ** 2 + (q.z - z) ** 2; if (d < bd) { bd = d; b = q; } } return cl01(b.cobertura); });
        for (const q of G.barrios) T.pts.push([q.x, q.z, 40 + 9 * Math.sqrt(q.necesidad || 0), q.cobertura > 0.8 ? '#21c46b' : q.cobertura > 0.5 ? '#ffc23d' : '#ff3b30', 1]); }
      else T.val = Z.comercio ? Array.from(Z.comercio) : null;
      T.ley = [['#21c46b', 'Barrio cubierto'], ['#ff3b30', 'Barrio sin recursos']];
    }
    // basura acumulada en bordes de humedal: en todos los pares si hay
    if (par !== 3 && I.basura && I.basura.puntos) for (const p of I.basura.puntos) if (p.fuente === 'humedal' && (p.t_dia || 0) > 0.5) T.pts.push([p.x, p.z, 30 + 10 * Math.sqrt(p.t_dia), '#a1887f', 1]);
    return T;
  }
  function normalizar(T) { // rango FIJO por par: sin y con propuesta se leen con la misma escala; las zonas por debajo de T.min no se pintan
    if (!T.val) return; const [lo, hi] = T.rango || [0, 1], r = Math.max(1e-6, hi - lo);
    T.val = T.val.map(x => x == null || !isFinite(x) || (T.min != null && x < T.min) ? null : cl01((x - lo) / r));
    T.rampa = Object.assign({}, T.rampa, { a: T.fmt ? T.fmt(lo) : String(lo), b: T.fmt ? T.fmt(hi) : String(hi) });
  }
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), ps = new THREE.Vector3(), cc = new THREE.Color();
  let temaAct = null;
  function pintarCapa(I, par) {
    if (!celdas || !I) return; const T = temaAct = tema(I, par), Y = D.Y; normalizar(T);
    for (let i = 0; i < NZ; i++) {
      const t = T.val ? T.val[i] : null, ok = t != null && isFinite(t);
      colRampa(T.rampa, ok ? t : 0, cc); celdas.setColorAt(i, cc); prismas.setColorAt(i, cc);
      ps.set(ZXZ[i][0], Y + 1, ZXZ[i][1]); sc.set(1, 1, 1); m4.compose(ps, q, ok ? sc : sc.set(0, 0, 0)); celdas.setMatrixAt(i, m4);
      sc.set(1, ok ? 6 + 210 * t : 0, 1); if (!ok) sc.set(0, 0, 0); m4.compose(ps, q, sc); prismas.setMatrixAt(i, m4);
    }
    const n = Math.min(MAXP, T.pts.length);
    for (let i = 0; i < MAXP; i++) {
      if (i < n) { const [x, z, r, col] = T.pts[i]; ps.set(x, Y + 3, z); sc.set(r, 40 + r * 0.6, r); m4.compose(ps, q, sc); discos.setMatrixAt(i, m4); discos.setColorAt(i, cc.set(col));
        sc.set(r * 1.25, 1, r * 1.25); ps.y = Y + 4; m4.compose(ps, q, sc); aros.setMatrixAt(i, m4); }
      else { m4.makeScale(0, 0, 0); discos.setMatrixAt(i, m4); aros.setMatrixAt(i, m4); }
    }
    for (const o of [celdas, prismas, discos, aros]) { o.instanceMatrix.needsUpdate = true; if (o.instanceColor) o.instanceColor.needsUpdate = true; }
  }

  /* ---------------- corrida pareja (la otra mitad del par, mismos valores) ---------------- */
  const PAREJA = { id: null, s: null, H: [], idRun: 0 };
  function pareja(U) {
    const R = U.R, M = U.M; if (!R || !R.sim || !M) return;
    const otra = R.sim % 2 === 0 ? R.sim - 1 : R.sim + 1;
    if (PAREJA.id === otra && PAREJA.vals === JSON.stringify(R.valores)) return;
    PAREJA.id = otra; PAREJA.vals = JSON.stringify(R.valores); PAREJA.H = []; const id = ++PAREJA.idRun;
    const d = M.SIMS.find(x => x.id === otra), v = {}; (d && d.sliders || []).forEach(s => { v[s.k] = R.valores[s.k] != null ? R.valores[s.k] : s.val; });
    let s; try { s = M.crear(otra, 1, v); } catch (e) { console.warn('pareja:', e); return; }
    const lote = () => { if (id !== PAREJA.idRun) return; try { for (let k = 0; k < 60 && PAREJA.H.length < FIN; k++) { M.paso(s); const I = M.ind(s); PAREJA.H.push(I); if (M.gameOver(s)) return; } } catch (e) { console.warn('pareja:', e); return; } if (PAREJA.H.length < FIN) setTimeout(lote, 40); };
    setTimeout(lote, 200);
  }

  /* ---------------- tablero: actualizar ---------------- */
  const ponerAnillo = (id, t, txt, ambar) => { const a = raiz.querySelector(`[data-a="${id}"]`); if (!a) return; const c = a.querySelectorAll('circle')[1], C = +c.dataset.c;
    c.setAttribute('stroke-dasharray', `${(cl01(t) * C).toFixed(1)} ${C}`); c.setAttribute('stroke', ambar ? 'url(#dvGradA)' : 'url(#dvGrad)'); a.querySelector('span').textContent = txt; };
  const BARRAS = [['fauna', 'Fauna'], ['flora', 'Flora'], ['poliniz', 'Polinizadores'], ['red', 'Interacciones'], ['pares', 'Territorio con fauna'], ['aves', 'Aves']];
  function grafica(H, P, par) {
    const K = CLAVE[par]; if (!K) return '';
    const años = Math.max(1, Math.ceil(H.length / 52)), desde = Math.max(1, años - 5), filas = [];
    const val = (arr, a) => { const i = Math.min(arr.length, a * 52) - 1; return i >= 0 && arr[i] ? K.v(arr[i]) : null; };
    const esCon = (H[0] && H[0].propuesta);
    for (let a = desde; a <= Math.max(desde + 5, años); a++) { const yo = a <= años ? val(H, a) : null, otro = P.length >= Math.min(a * 52, FIN) - 1 && a <= años ? val(P, a) : null;
      filas.push({ a, sin: esCon ? otro : yo, con: esCon ? yo : otro }); }
    const todos = filas.flatMap(f => [f.sin, f.con]).filter(x => x != null && isFinite(x)), mx = Math.max(1, ...todos) * 1.15;
    const W = 260, Hh = 140, x0 = 30, y0 = 12, ah = Hh - 34, bw = 9, paso = (W - x0 - 6) / filas.length;
    const ticks = [0, 0.25, 0.5, 0.75, 1].map(t => `<line x1="${x0}" x2="${W}" y1="${y0 + ah * (1 - t)}" y2="${y0 + ah * (1 - t)}" stroke="rgba(120,170,230,.15)"/><text x="${x0 - 4}" y="${y0 + ah * (1 - t) + 3}" text-anchor="end" fill="#8fb0d6" font-size="8">${num(mx * t, mx < 10 ? 1 : 0)}</text>`).join('');
    const barras = filas.map((f, i) => { const cx = x0 + paso * (i + 0.5), h1 = f.sin == null ? 0 : ah * f.sin / mx, h2 = f.con == null ? 0 : ah * f.con / mx;
      return `<rect x="${cx - bw - 1}" y="${y0 + ah - h1}" width="${bw}" height="${h1}" fill="url(#dvBA)"/><rect x="${cx + 1}" y="${y0 + ah - h2}" width="${bw}" height="${h2}" fill="url(#dvBB)"/><text x="${cx}" y="${Hh - 10}" text-anchor="middle" fill="#cfe0f5" font-size="9" transform="rotate(-30 ${cx} ${Hh - 10})">Año ${f.a}</text>`; }).join('');
    return `<svg viewBox="0 0 ${W} ${Hh}" preserveAspectRatio="none"><defs><linearGradient id="dvBA" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd23d"/><stop offset="1" stop-color="#ff9d1f"/></linearGradient><linearGradient id="dvBB" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4fc3ff"/><stop offset="1" stop-color="#0a55c9"/></linearGradient></defs>${ticks}${barras}</svg>`;
  }
  let ultSem = -1, ultCapa = -99, ultTab = 0;
  function actualizar() {
    const U = window.KEN_SIMUI, R = U && U.R; if (!R) return;
    const H = R.hist, I = H[H.length - 1], I0 = H[0], S = ESC.sim, par = S ? S.par : 1;
    // barra superior
    const now = new Date(); $('reloj').textContent = now.toLocaleTimeString('es-CO', { hour12: false });
    const sem = Math.min(FIN, RELOJ.semanas || RELOJ.sem || 0), f = new Date(Date.UTC(AÑO0, 10, 23) + sem * 7 * 864e5);
    $('fecha').textContent = `${f.getUTCFullYear()}/${String(f.getUTCMonth() + 1).padStart(2, '0')}/${String(f.getUTCDate()).padStart(2, '0')}`;
    raiz.querySelectorAll('[data-par]').forEach(b => b.classList.toggle('on', +b.dataset.par === par));
    raiz.querySelectorAll('[data-prop]').forEach(b => b.classList.toggle('on', S && (+b.dataset.prop === (S.id % 2 === 0 ? 1 : 0))));
    if (U.M) pareja(U);
    if (!I) { $('ficha').innerHTML = `<dt>Simulación:</dt><dd>${S ? S.id + ' · ' + S.n : '—'}</dd><dt>Estado:</dt><dd>en el año 1 · dale play</dd>`; return; }
    $('cong').textContent = Math.round(I.congestion) + '%';
    // izquierda
    ponerAnillo('comida', I.comidaLocal || 0, pct(I.comidaLocal));
    $('huertas').innerHTML = `${num(I.huertas)}<small>huertas</small>`;
    $('cora').innerHTML = I.abasto && I.abasto.cora ? `${Math.round(I.abasto.cora.carga * 100)}<small>%</small>` : '—';
    $('barras').innerHTML = BARRAS.filter(([k]) => I[k] != null && I0 && I0[k]).map(([k, n]) => { const r = I[k] / I0[k], t = cl01(r / 2), est = r > 1.02 ? 'bien' : r < 0.98 ? 'mal' : '';
      return `<div class="dv-bar ${est}"><span class="t">${n}</span><span class="p"><s></s><i style="width:${(t * 100).toFixed(1)}%"></i><u style="left:${(t * 100).toFixed(1)}%"></u></span><span class="v">${num(I[k])}</span></div>`; }).join('');
    const circ = I.circular ? I.circular.indice : 0, sr = I.basura && I.basura.fraccionSinRecoger != null ? I.basura.fraccionSinRecoger : 0;
    ponerAnillo('circ', circ, pct(circ)); ponerAnillo('sinrec', sr, pct(sr), true);
    ponerAnillo('humf', (I.humedalFuncional || 0) / 100, Math.round(I.humedalFuncional || 0) + '%'); ponerAnillo('ruid', (I.callesRuidosas || 0) / 100, Math.round(I.callesRuidosas || 0) + '%', true);
    $('basura').innerHTML = `${num(I.basura ? I.basura.total_t_dia : null)}<small>t/día</small>`; $('db').innerHTML = `${num(I.ruidoDb, 1)}<small>dB</small>`;
    // derecha
    const Es = I.especulacion || {}; $('hog').textContent = num(Es.hogaresRiesgo);
    ponerAnillo('suelo', cl01(((Es.indice || 1) - 1) / 1), '×' + num(Es.indice || 1, 2), true);
    $('gtit').textContent = CLAVE[par] ? `${CLAVE[par].n} (${CLAVE[par].u})` : '';
    if (sem !== ultSem || Date.now() - ultTab > 1500) { $('graf').innerHTML = grafica(H, PAREJA.H, par); ultTab = Date.now(); }
    const P = PAREJA.H[Math.min(PAREJA.H.length, H.length) - 1], esCon = !!I.propuesta, otroN = esCon ? 'sin' : 'con';
    const K6 = [['k1', (x) => x.congestion / 100, (x) => Math.round(x.congestion) + '%'], ['k2', (x) => x.comidaMin, (x) => pct(x.comidaMin)], ['k3', (x) => (x.humedalFuncional || 0) / 100, (x) => Math.round(x.humedalFuncional || 0) + '%'],
      ['k4', (x) => x.circular ? x.circular.indice : 0, (x) => pct(x.circular ? x.circular.indice : 0)], ['k5', (x) => x.basura ? x.basura.fraccionSinRecoger || 0 : 0, (x) => pct(x.basura ? x.basura.fraccionSinRecoger || 0 : 0)], ['k6', (x) => x.arbolesPerdidos || 0, (x) => pct(x.arbolesPerdidos || 0)]];
    for (const [k, fv, ft] of K6) { const t = fv(I); ponerAnillo(k, t, pct(t), !esCon); $(k).textContent = ft(I); $(k + 'b').textContent = P ? `${otroN} propuesta: ${ft(P)}` : 'calculando el par…'; }
    // ficha de control
    const a = Math.min(20, Math.floor(sem / 52) + 1), fa = FASES.find(x => a >= x.a0 && a <= x.a1) || FASES[0], ev = (R.eventos || []).slice(-1)[0];
    const Ii = (U.M && U.M.SIMS || []).find(x => x.id === R.sim) || {};
    $('ficha').innerHTML = `<dt>Simulación:</dt><dd>${R.sim} · ${S ? S.n : ''}</dd><dt>Prueba:</dt><dd>${Ii.prueba || '—'}</dd><dt>Semana:</dt><dd>${Math.floor(sem)} de ${FIN}</dd><dt>Año:</dt><dd>${a} · ${fa.n}</dd>
      <dt>Capa:</dt><dd>${temaAct ? temaAct.t : '—'}</dd><dt>Estado:</dt><dd>${R.go ? '<b style="color:#ff6b5b">GAME OVER · ' + (R.go.motivo || R.go.regla || '') + '</b>' : ev ? 'Año ' + (Math.floor((ev.sem || 0) / 52) + 1) + ': ' + ev.titulo : 'sin game over'}</dd>`;
    // capa temática (cada 2 semanas o al cambiar de par)
    if (Math.abs(I.sem - ultCapa) >= 2 || I.sem < ultCapa || D._par !== par) { ultCapa = I.sem; D._par = par; pintarCapa(I, par); leyenda(); }
    ultSem = sem;
  }
  function leyenda() {
    const T = temaAct; if (!T) return; const g = `linear-gradient(90deg,${T.rampa.c.join(',')})`;
    const foco = [['#3faa4c', 'Huertas'], ['#2f6bdc', 'Mercados'], ['#f2c63a', 'Instituto'], ['#e23b3b', 'Plan parcial']];
    $('leyenda').innerHTML = `<div style="display:block;margin:0 0 2px;color:#fff">${T.t}</div><div class="rampa" style="background:${g}"></div><p class="rl"><span>${T.rampa.a}</span><span>${T.rampa.b}</span></p>`
      + T.ley.map(([c, t]) => `<div><i style="background:${c};border-radius:50%;width:11px"></i>${t}</div>`).join('')
      + foco.map(([c, t]) => `<div><i style="background:${c}"></i>${t}</div>`).join('');
  }
  function colocar() { // ficha, leyenda, norte, escala y textos de cada mitad según el tamaño de la ventana
    const K = caja(), W = innerWidth, H = innerHeight;
    const v1 = raiz.querySelector('#dv-v1'), v2 = raiz.querySelector('#dv-v2');
    v1.style.left = (K.a.x + K.a.vx0 + 14) + 'px'; v2.style.left = (K.b.x + 18) + 'px'; v1.style.top = v2.style.top = (K.vert ? 70 : 116) + 'px';
    if (K.vert) v2.style.top = (K.b.y + 10) + 'px';
    const n = raiz.querySelector('#dv-norte'); n.style.left = (K.b.x + K.b.vx1 - 54) + 'px'; n.style.top = (K.vert ? K.b.y + 10 : 114) + 'px';
    const fi = raiz.querySelector('#dv-ficha'); fi.style.left = (K.b.x + 18) + 'px'; fi.style.top = (H - 300) + 'px';
    const le = raiz.querySelector('#dv-leyenda'); le.style.left = (K.b.x + K.b.vx1 - 166) + 'px'; le.style.bottom = '78px'; le.style.top = 'auto';
    const pi = raiz.querySelector('#dv-pills'); pi.style.left = (K.a.vx0 + 14) + 'px';
    const ll = raiz.querySelector('#dv-llave'); ll.style.left = (K.b.x + K.b.vx1 - 180) + 'px';
    const es = raiz.querySelector('#dv-escala'); if (D.escalaPlanta) { const m = [100, 200, 250, 500, 1000, 2000].find(x => x / D.escalaPlanta > 70) || 2000; es.firstChild.textContent = m >= 1000 ? m / 1000 + ' km' : m + ' m';
      es.querySelector('i').style.width = (m / D.escalaPlanta).toFixed(0) + 'px'; } es.style.left = (K.b.x + K.b.vx1 - 54 - 130) + 'px'; es.style.top = (K.vert ? K.b.y + 24 : 128) + 'px';
  }
  addEventListener('resize', colocar);

  /* ---------------- entrar / salir ---------------- */
  function activar() {
    const U = window.KEN_SIMUI; if (U && U.M && !celdas) armar(U.M);
    D.on = true; D.salio = false; html.classList.add('dv-on'); grupo.visible = true;
    raiz.querySelectorAll('[data-vista]').forEach(b => b.classList.toggle('on', b.dataset.vista === 'div')); raiz.querySelector('#dv-llave').classList.remove('off');
    ultCapa = -99; colocar(); actualizar();
    // si la vista limpia ya puso el territorio en blanco y negro (data3d/foco.js), las dos vistas arrancan igual: gris y solo la propuesta en color
    if (window.KEN_FOCO && window.KEN_FOCO.activo) D.ponerByN(true);
  }
  function salir() {
    D.on = false; D.salio = true; html.classList.remove('dv-on', 'dv-var'); grupo.visible = false;
    raiz.querySelectorAll('[data-vista]').forEach(b => b.classList.toggle('on', b.dataset.vista === 'una')); raiz.querySelector('#dv-llave').classList.add('off');
    const R = T3.renderer; R.setScissorTest(false); R.setViewport(0, 0, innerWidth, innerHeight);
  }
  D.activar = activar; D.salir = salir;
  // al darle play (botón, barra espaciadora o cualquier otro camino) la pantalla se divide
  RELOJ.alDibujar(() => { if (!D.on && !D.salio && !RELOJ.pausaSem && ESC.activo) activar(); });
  setInterval(() => { if (D.on) { actualizar(); colocar(); } }, 250);
  return D;
}
