/* =====================================================================
   Sistema de Planillas — La Próspera, S.A.
   UTP · Examen Semestral · Contabilidad General
   Metodología según "Teoría de Planillas 2025" (material de clase):
   - CSS empleado 9.75% / patrono 13.25% (período 13-mar-2025 a 31-dic-2026)
   - Seguro Educativo 1.25% / 1.5%
   - Riesgo Profesional 0.56% (Clase I, grado medio — fábrica de cemento)
   - ISR: renta anual = salario mensual x 13 (incluye XIII);
     0% hasta 11,000 · 15% de 11,000 a 50,000 · 25% sobre exceso de 50,000
     Deducción de B/.800 si declara conjuntamente (Art. 709 CF / Ley 8 de 2010)
   - Art. 91 CSS: dietas cotizan solo el exceso del 25% del salario mensual;
     primas de producción solo el exceso del 50%; comisiones y
     bonificaciones cotizan en su totalidad.
   ===================================================================== */
"use strict";

/* ---------------- Persistencia ---------------- */
const DB = {
  read(key, fallback){ try{ const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }catch(e){ return fallback; } },
  write(key, val){ localStorage.setItem(key, JSON.stringify(val)); }
};
const K_EMP = "prospera_empleados";
const K_PLA = "prospera_planillas";
const K_CFG = "prospera_config";

const DEFAULT_CFG = {
  empresa: "La Próspera, S.A.",
  actividad: "Fábrica de Cemento",
  direccion: "Juan Díaz, Calle 200, Ciudad de Panamá",
  horasSemana: 45,
  cssEmpleado: 9.75,
  cssPatrono: 13.25,
  seEmpleado: 1.25,
  sePatrono: 1.5,
  riesgoProf: 0.56,
  salarioMinimoHora: 2.36,   // ajustable según decreto vigente (región/actividad)
  deduccionConjunta: 800,
  isrTramo1: 11000,          // hasta aquí 0%
  isrTramo2: 50000,          // 15% del exceso de tramo1 hasta tramo2
  isrTasa2: 15,
  isrTasa3: 25               // 25% sobre exceso de tramo2
};

let state = {
  empleados: DB.read(K_EMP, []),
  planillas: DB.read(K_PLA, []),
  config: Object.assign({}, DEFAULT_CFG, DB.read(K_CFG, {}))
};
function saveEmp(){ DB.write(K_EMP, state.empleados); }
function savePla(){ DB.write(K_PLA, state.planillas); }
function saveCfg(){ DB.write(K_CFG, state.config); }

/* ---------------- Utilidades ---------------- */
const $ = sel => document.querySelector(sel);
const fmt = n => "B/. " + (Number(n)||0).toLocaleString("en-US",{minimumFractionDigits:2, maximumFractionDigits:2});
const fnum = n => (Number(n)||0).toLocaleString("en-US",{minimumFractionDigits:2, maximumFractionDigits:2});
const r2 = n => Math.round((Number(n)||0) * 100) / 100;
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2,7);

function toast(msg){
  const t = $("#toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(t._h);
  t._h = setTimeout(()=>t.classList.remove("show"), 2600);
}

function salarioMensualDe(emp){
  const cfg = state.config;
  if(emp.esSalarioMinimo){
    return r2(cfg.salarioMinimoHora * cfg.horasSemana * 4.3333);
  }
  return Number(emp.salarioBase)||0;
}

/* ---------------- Datos del Grupo 6 (semestral) ---------------- */
const SEED = [
  {nombre:"Omero Urriola", cedula:"8-320-344", estadoCivil:"casado", declaraConjunta:true, cargo:"Agente de Planta", salarioBase:680, esSalarioMinimo:false, anioInicio:null, grupo:6,
   descuentos:[{concepto:"Préstamo hipotecario", monto:200, periodicidad:"mensual"}]},
  {nombre:"Judith Villalobos", cedula:"9-410-390", estadoCivil:"casado", declaraConjunta:true, cargo:"Supervisora de Planta", salarioBase:910, esSalarioMinimo:false, anioInicio:null, grupo:6,
   descuentos:[{concepto:"Mueblería", monto:280, periodicidad:"mensual"}]},
  {nombre:"Ana María Bustamante", cedula:"4-590-678", estadoCivil:"casado", declaraConjunta:false, cargo:"Asistente de Gerencia", salarioBase:1100, esSalarioMinimo:false, anioInicio:null, grupo:6,
   descuentos:[{concepto:"Mueblería", monto:120, periodicidad:"mensual"}]},
  {nombre:"Luisa Sanjur", cedula:"4-500-500", estadoCivil:"soltero", declaraConjunta:false, cargo:"Agente de Ventas", salarioBase:1000, esSalarioMinimo:false, anioInicio:null, grupo:6,
   descuentos:[{concepto:"Préstamo de auto", monto:400, periodicidad:"mensual"}]}
];
// Novedades del Grupo 6 (2da quincena junio 2026) por cédula+grupo
const SEED_NOVEDADES = {
  // Omero: 4 horas extra el día 23 + 4 horas el día 30 = 8 horas (recargo 25% asumido, el documento no lo especifica)
  "6|Omero Urriola":        {horasDiurnas:8, adelanto:0},
  // Judith: prima de producción — después de 100,000 kilos, $2.00 por cada 400 kilos; producción adicional 70,000 kilos
  // (70,000 / 400) x $2.00 = $350.00
  "6|Judith Villalobos":    {primaProd:350, adelanto:0},
  // Ana María: dieta de $670 por supervisión en provincias
  "6|Ana María Bustamante": {dietas:670, adelanto:0},
  // Luisa: comisión 3% sobre ventas de la quincena ($10,990)
  "6|Luisa Sanjur":         {ventas:10990, comisionPct:3, adelanto:0}
};

/* =====================================================================
   MOTOR DE CÁLCULO DE PLANILLA (quincenal)
   ===================================================================== */
function calcularFila(emp, nov, bonifMonto){
  const cfg = state.config;
  const mensual = salarioMensualDe(emp);
  const salarioBaseQ = r2(mensual / 2);

  // --- Horas extras: hora ordinaria = mensual / 4.3333 / horas semanales
  // Recargos del Código de Trabajo: diurna 25%, mixta o día de descanso 50%, nocturna 75%.
  // Se capturan por separado porque un mismo colaborador puede tener horas de varios tipos.
  const tarifaHora = mensual / 4.3333 / cfg.horasSemana;
  const hDiurnas   = Number(nov.horasDiurnas)   || Number(nov.horasExtras) || 0; // horasExtras: formato anterior
  const hMixtas    = Number(nov.horasMixtas)    || 0;
  const hNocturnas = Number(nov.horasNocturnas) || 0;
  const extrasDiurnas   = r2(hDiurnas   * tarifaHora * 1.25);
  const extrasMixtas    = r2(hMixtas    * tarifaHora * 1.50);
  const extrasNocturnas = r2(hNocturnas * tarifaHora * 1.75);
  const horas  = r2(hDiurnas + hMixtas + hNocturnas);
  const extras = r2(extrasDiurnas + extrasMixtas + extrasNocturnas);

  // --- Comisión sobre ventas
  const ventas = Number(nov.ventas)||0;
  const comisionPct = Number(nov.comisionPct)||0;
  const comision = r2(ventas * comisionPct/100);

  // --- Bonificación (monto fijo por colaborador en el período)
  const bonif = r2(Number(bonifMonto)||0);

  // --- Dietas: Art.91 — cotiza CSS solo el exceso del 25% del salario mensual
  const dietas = Number(nov.dietas)||0;
  const dietaExenta = r2(Math.min(dietas, mensual * 0.25));
  const dietaGravable = r2(dietas - dietaExenta);

  // --- Prima de producción: cotiza solo el exceso del 50% del salario mensual
  const prima = Number(nov.primaProd)||0;
  const primaExenta = r2(Math.min(prima, mensual * 0.50));
  const primaGravable = r2(prima - primaExenta);

  const otrosIngresos = r2(extras + comision + bonif + dietas + prima);
  const salarioTotal = r2(salarioBaseQ + otrosIngresos);

  // Base para CSS / SE / Riesgo Profesional (salario gravable del período)
  const baseCSS = r2(salarioBaseQ + extras + comision + bonif + dietaGravable + primaGravable);

  const css = r2(baseCSS * cfg.cssEmpleado/100);
  const se  = r2(baseCSS * cfg.seEmpleado/100);

  // --- ISR: proyección anual sobre el salario gravable
  const mensualGravable = baseCSS * 2;
  const isrDet = calcularISR(mensualGravable, emp.declaraConjunta);
  const isr = isrDet.quincenal;

  // --- Otros descuentos: recurrentes (mensuales/2) + adelanto del período
  const descRec = (emp.descuentos||[]).map(d => ({
    concepto: d.concepto,
    monto: d.periodicidad === "mensual" ? r2(d.monto/2) : r2(d.monto)
  }));
  const adelanto = r2(Number(nov.adelanto)||0);
  if(adelanto > 0) descRec.push({concepto:"Adelanto de salario", monto: adelanto});
  const otrosDesc = r2(descRec.reduce((s,d)=>s+d.monto,0));

  const totalDesc = r2(css + se + isr + otrosDesc);
  const neto = r2(salarioTotal - totalDesc);

  // --- Aportes del patrono (sobre la base gravable)
  const cssPat = r2(baseCSS * cfg.cssPatrono/100);
  const sePat  = r2(baseCSS * cfg.sePatrono/100);
  const riesgo = r2(baseCSS * cfg.riesgoProf/100);

  return {
    empleadoId: emp.id, nombre: emp.nombre, cedula: emp.cedula, cargo: emp.cargo,
    estadoCivil: emp.estadoCivil, declaraConjunta: !!emp.declaraConjunta,
    salarioMensual: r2(mensual), salarioBase: salarioBaseQ,
    horasExtras: horas, extras, tarifaHora: r2(tarifaHora),
    hDiurnas, hMixtas, hNocturnas, extrasDiurnas, extrasMixtas, extrasNocturnas,
    ventas, comisionPct, comision, bonif, bonifMonto: r2(Number(bonifMonto)||0),
    dietas, dietaExenta, dietaGravable, prima, primaExenta, primaGravable,
    otrosIngresos, salarioTotal, baseCSS,
    css, se, isr, isrDetalle: isrDet,
    descuentosDetalle: descRec, otrosDesc, totalDesc, neto,
    cssPat, sePat, riesgo
  };
}

function calcularISR(mensualGravable, conjunta){
  const cfg = state.config;
  const rentaBruta = r2(mensualGravable * 13); // 12 meses + décimo tercer mes
  let base = rentaBruta;
  const deduccion = conjunta ? cfg.deduccionConjunta : 0;
  base = Math.max(0, base - deduccion);
  let anual = 0;
  if(base > cfg.isrTramo2){
    anual = (cfg.isrTramo2 - cfg.isrTramo1) * cfg.isrTasa2/100 + (base - cfg.isrTramo2) * cfg.isrTasa3/100;
  } else if(base > cfg.isrTramo1){
    anual = (base - cfg.isrTramo1) * cfg.isrTasa2/100;
  }
  anual = r2(anual);
  const mensualISR = r2(anual / 12);
  const quincenal = r2(mensualISR / 2);
  return {rentaBruta, deduccion, baseGravable: r2(base), anual, mensual: mensualISR, quincenal};
}

function totalesPlanilla(filas){
  const t = {salarioBase:0, otrosIngresos:0, salarioTotal:0, baseCSS:0, css:0, se:0, isr:0, otrosDesc:0, totalDesc:0, neto:0, cssPat:0, sePat:0, riesgo:0};
  filas.forEach(f => { for(const k in t) t[k] = r2(t[k] + (f[k]||0)); });
  return t;
}

/* =====================================================================
   ROUTER Y VISTAS
   ===================================================================== */
const routes = {
  "inicio": viewInicio,
  "personal": viewPersonal,
  "expediente": viewExpediente,
  "reporte-grupal": viewReporteGrupal,
  "planilla": viewPlanilla,
  "informes": viewInformes,
  "informe": viewInforme,
  "config": viewConfig
};

function navigate(){
  const hash = location.hash.replace(/^#\//,"") || "inicio";
  const [route, ...args] = hash.split("/");
  const fn = routes[route] || viewInicio;
  document.querySelectorAll("#mainNav a").forEach(a=>{
    const r = a.dataset.route;
    const activo = r === route ||
      (r==="personal" && ["expediente","reporte-grupal"].includes(route)) ||
      (r==="informes" && route==="informe");
    a.classList.toggle("active", activo);
  });
  window.scrollTo(0,0);
  $("#app").innerHTML = fn(...args) || "";
  if(window._afterRender){ const f = window._afterRender; window._afterRender = null; f(); }
}
window.addEventListener("hashchange", navigate);

/* ---------------- INICIO ---------------- */
function viewInicio(){
  const cfg = state.config;
  const nEmp = state.empleados.length;
  const nPla = state.planillas.length;
  const seedBtn = nEmp === 0
    ? `<button class="btn success" onclick="cargarEjemplo()">⬇ Cargar colaboradores del Grupo 6</button>`
    : "";
  return `
  <div class="hero">
    <h2>Bienvenido al Sistema de Planillas</h2>
    <p>${esc(cfg.empresa)} · ${esc(cfg.actividad)} · ${esc(cfg.direccion)}.
       Jornada de ${cfg.horasSemana} horas semanales · Riesgo profesional ${cfg.riesgoProf}%.</p>
    <div class="stats">
      <div class="stat"><b>${nEmp}</b><span>Colaboradores registrados</span></div>
      <div class="stat"><b>${nPla}</b><span>Planillas calculadas</span></div>
      <div class="stat"><b>${cfg.cssEmpleado}%</b><span>CSS empleado</span></div>
      <div class="stat"><b>${cfg.cssPatrono}%</b><span>CSS patrono</span></div>
    </div>
    <div class="btn-row mt">${seedBtn}</div>
  </div>

  <div class="menu-grid">
    <a class="menu-card" href="#/personal">
      <span class="icon">👥</span><span class="tag">CAPTURA</span>
      <b>Datos del Personal</b>
      <span>Registre nombre completo, cédula, estado civil, cargo, salario base y año de inicio de labores.</span>
    </a>
    <a class="menu-card" href="#/reporte-grupal">
      <span class="icon">📋</span><span class="tag">P — REPORTE GRUPAL</span>
      <b>Reporte de Colaboradores</b>
      <span>Listado grupal de todos los colaboradores, con opción de imprimir y enviar por correo.</span>
    </a>
    <a class="menu-card" href="#/personal">
      <span class="icon">🗂️</span><span class="tag">E — REPORTE INDIVIDUAL</span>
      <b>Expediente del Colaborador</b>
      <span>Consulte el expediente individual desde la lista de personal.</span>
    </a>
    <a class="menu-card" href="#/planilla">
      <span class="icon">🧮</span><span class="tag">B — CÁLCULO</span>
      <b>Captura y Cálculo de Planilla</b>
      <span>Busca los datos almacenados de cada colaborador y calcula CSS, S.E., I.S.R., descuentos y salario neto.</span>
    </a>
    <a class="menu-card" href="#/informes">
      <span class="icon">📊</span><span class="tag">C — INFORMES</span>
      <b>Informe de la Planilla</b>
      <span>Reporte de planilla, reporte para el pago de la Caja de Seguro Social y comprobantes para los colaboradores.</span>
    </a>
    <a class="menu-card" href="#/config">
      <span class="icon">⚙️</span><span class="tag">PARÁMETROS</span>
      <b>Configuración</b>
      <span>Tasas de CSS, Seguro Educativo, riesgo profesional, salario mínimo y tramos del I.S.R.</span>
    </a>
  </div>`;
}

window.cargarEjemplo = function(){
  SEED.forEach(e => state.empleados.push(Object.assign({id: uid()}, e, {descuentos: e.descuentos.map(d=>({...d}))})));
  saveEmp();
  toast("4 colaboradores del Grupo 6 cargados");
  navigate();
};

/* ---------------- PERSONAL (captura + lista) ---------------- */
function viewPersonal(){
  const rows = state.empleados.map(e => {
    const mensual = salarioMensualDe(e);
    return `<tr>
      <td><b>${esc(e.nombre)}</b><br><span class="small muted">${esc(e.cargo)}</span></td>
      <td class="nowrap">${esc(e.cedula)}</td>
      <td>${e.estadoCivil === "casado" ? "Casado(a)" : "Soltero(a)"}${e.declaraConjunta ? '<br><span class="badge green">Declara conjuntamente</span>' : ""}</td>
      <td class="center"><span class="badge">Grupo ${e.grupo||"—"}</span></td>
      <td class="num">${fmt(mensual)}${e.esSalarioMinimo ? '<br><span class="badge orange">Salario mínimo</span>' : ""}</td>
      <td class="center">${esc(e.anioInicio||"—")}</td>
      <td class="nowrap">
        <a class="btn sm secondary" href="#/expediente/${e.id}">Expediente</a>
        <button class="btn sm ghost" onclick="editarEmp('${e.id}')">Editar</button>
        <button class="btn sm danger" onclick="borrarEmp('${e.id}')">Eliminar</button>
      </td>
    </tr>`;
  }).join("");

  return `
  <h2 class="page-title">👥 Datos del Personal</h2>
  <p class="page-sub">Captura de datos de los colaboradores. Estos datos quedan almacenados y son buscados automáticamente al calcular la planilla.</p>

  <div class="card" id="empFormCard">
    <h3 id="empFormTitle">Registrar colaborador</h3>
    <form id="empForm" onsubmit="return guardarEmp(event)">
      <input type="hidden" id="f_id">
      <div class="form-grid">
        <div class="field wide"><label>Nombre completo *</label><input id="f_nombre" required placeholder="Ej. Omero Urriola"></div>
        <div class="field"><label>Cédula *</label><input id="f_cedula" required placeholder="Ej. 8-320-344"></div>
        <div class="field"><label>Estado civil</label>
          <select id="f_estado"><option value="soltero">Soltero(a)</option><option value="casado">Casado(a) / Unido(a)</option></select>
        </div>
        <div class="field"><label>Cargo *</label><input id="f_cargo" required placeholder="Ej. Supervisor de Planta"></div>
        <div class="field"><label>Año de inicio de labores</label><input id="f_anio" type="number" min="1950" max="2100" placeholder="Ej. 2012"></div>
        <input type="hidden" id="f_grupo" value="6">
        <div class="field"><label>Salario base mensual (B/.)</label><input id="f_salario" type="number" step="0.01" min="0" placeholder="0.00"></div>
        <div class="field"><label class="check" style="margin-top:1.4rem"><input type="checkbox" id="f_minimo"> Devenga salario mínimo</label></div>
        <div class="field"><label class="check" style="margin-top:1.4rem"><input type="checkbox" id="f_conjunta"> Declara I.S.R. conjuntamente (−B/.800)</label></div>
      </div>
      <h3 class="mt">Descuentos recurrentes autorizados</h3>
      <div id="descList"></div>
      <button type="button" class="btn sm ghost" onclick="agregarDescFila()">＋ Agregar descuento</button>
      <div class="btn-row mt">
        <button class="btn" type="submit">💾 Guardar colaborador</button>
        <button class="btn ghost" type="button" onclick="limpiarForm()">Limpiar</button>
      </div>
    </form>
  </div>

  <div class="card">
    <div class="btn-row" style="justify-content:space-between">
      <h3 style="margin:0">Colaboradores registrados (${state.empleados.length})</h3>
      <div class="btn-row">
        <a class="btn secondary sm" href="#/reporte-grupal">📋 Reporte grupal (P)</a>
        ${state.empleados.length===0 ? `<button class="btn success sm" onclick="cargarEjemplo()">⬇ Cargar colaboradores del Grupo 6</button>`:""}
      </div>
    </div>
    <div class="table-wrap mt">
      ${state.empleados.length ? `<table>
        <thead><tr><th>Colaborador</th><th>Cédula</th><th>Estado civil</th><th>Grupo</th><th class="num">Salario mensual</th><th>Inicio</th><th>Acciones</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>` : `<div class="empty"><div class="icon">🗃️</div>No hay colaboradores registrados todavía.</div>`}
    </div>
  </div>`;
}

window.agregarDescFila = function(d){
  d = d || {concepto:"", monto:"", periodicidad:"mensual"};
  const div = document.createElement("div");
  div.className = "form-grid";
  div.style.marginBottom = ".5rem";
  div.innerHTML = `
    <div class="field"><label>Concepto</label><input class="d_concepto" value="${esc(d.concepto)}" placeholder="Ej. Mueblería"></div>
    <div class="field"><label>Monto (B/.)</label><input class="d_monto" type="number" step="0.01" min="0" value="${d.monto}"></div>
    <div class="field"><label>Periodicidad</label>
      <select class="d_per">
        <option value="mensual" ${d.periodicidad==="mensual"?"selected":""}>Mensual (÷2 por quincena)</option>
        <option value="quincenal" ${d.periodicidad==="quincenal"?"selected":""}>Quincenal</option>
      </select></div>
    <div class="field"><label>&nbsp;</label><button type="button" class="btn sm danger" onclick="this.closest('.form-grid').remove()">Quitar</button></div>`;
  $("#descList").appendChild(div);
};

window.guardarEmp = function(ev){
  ev.preventDefault();
  const id = $("#f_id").value;
  const emp = {
    id: id || uid(),
    nombre: $("#f_nombre").value.trim(),
    cedula: $("#f_cedula").value.trim(),
    estadoCivil: $("#f_estado").value,
    cargo: $("#f_cargo").value.trim(),
    anioInicio: Number($("#f_anio").value)||null,
    grupo: Number($("#f_grupo").value),
    salarioBase: Number($("#f_salario").value)||0,
    esSalarioMinimo: $("#f_minimo").checked,
    declaraConjunta: $("#f_conjunta").checked,
    descuentos: [...document.querySelectorAll("#descList .form-grid")].map(row => ({
      concepto: row.querySelector(".d_concepto").value.trim(),
      monto: Number(row.querySelector(".d_monto").value)||0,
      periodicidad: row.querySelector(".d_per").value
    })).filter(d => d.concepto && d.monto > 0)
  };
  if(!emp.esSalarioMinimo && emp.salarioBase <= 0){
    toast("Indique el salario base o marque salario mínimo"); return false;
  }
  const i = state.empleados.findIndex(e => e.id === id);
  if(i >= 0) state.empleados[i] = emp; else state.empleados.push(emp);
  saveEmp();
  toast(i >= 0 ? "Colaborador actualizado" : "Colaborador registrado");
  navigate();
  return false;
};

window.editarEmp = function(id){
  const e = state.empleados.find(x => x.id === id);
  if(!e) return;
  $("#empFormTitle").textContent = "Editar colaborador";
  $("#f_id").value = e.id;
  $("#f_nombre").value = e.nombre; $("#f_cedula").value = e.cedula;
  $("#f_estado").value = e.estadoCivil; $("#f_cargo").value = e.cargo;
  $("#f_anio").value = e.anioInicio||""; $("#f_grupo").value = e.grupo||1;
  $("#f_salario").value = e.salarioBase||""; $("#f_minimo").checked = !!e.esSalarioMinimo;
  $("#f_conjunta").checked = !!e.declaraConjunta;
  $("#descList").innerHTML = "";
  (e.descuentos||[]).forEach(d => agregarDescFila(d));
  $("#empFormCard").scrollIntoView({behavior:"smooth"});
};

window.limpiarForm = function(){
  $("#empForm").reset(); $("#f_id").value = "";
  $("#descList").innerHTML = "";
  $("#empFormTitle").textContent = "Registrar colaborador";
};

window.borrarEmp = function(id){
  const e = state.empleados.find(x => x.id === id);
  if(!e) return;
  if(!confirm(`¿Eliminar a ${e.nombre}? Esta acción no se puede deshacer.`)) return;
  state.empleados = state.empleados.filter(x => x.id !== id);
  saveEmp(); toast("Colaborador eliminado"); navigate();
};

/* ---------------- E: EXPEDIENTE INDIVIDUAL ---------------- */
function viewExpediente(id){
  const e = state.empleados.find(x => x.id === id);
  if(!e) return `<div class="empty"><div class="icon">❓</div>Colaborador no encontrado. <a href="#/personal">Volver</a></div>`;
  const mensual = salarioMensualDe(e);
  const anios = e.anioInicio ? (new Date().getFullYear() - e.anioInicio) : null;
  const historial = state.planillas
    .map(p => ({p, f: p.filas.find(f => f.empleadoId === id)}))
    .filter(x => x.f);

  const histRows = historial.map(({p,f}) => `<tr>
      <td>${esc(p.nombre)}</td>
      <td class="num">${fnum(f.salarioBase)}</td>
      <td class="num">${fnum(f.otrosIngresos)}</td>
      <td class="num">${fnum(f.salarioTotal)}</td>
      <td class="num">${fnum(f.totalDesc)}</td>
      <td class="num"><b>${fnum(f.neto)}</b></td>
      <td><a class="btn sm secondary" href="#/informe/${p.id}">Ver planilla</a></td>
    </tr>`).join("");

  const descs = (e.descuentos||[]).map(d =>
    `<tr><td>${esc(d.concepto)}</td><td class="num">${fmt(d.monto)}</td><td>${d.periodicidad === "mensual" ? "Mensual" : "Quincenal"}</td><td class="num">${fmt(d.periodicidad==="mensual" ? d.monto/2 : d.monto)}</td></tr>`).join("");

  const cuerpoCorreo = `EXPEDIENTE DEL COLABORADOR%0D%0A${encodeURIComponent(e.nombre)}%0D%0ACédula: ${encodeURIComponent(e.cedula)}%0D%0ACargo: ${encodeURIComponent(e.cargo)}%0D%0ASalario mensual: ${encodeURIComponent(fmt(mensual))}%0D%0AEstado civil: ${e.estadoCivil}%0D%0AAño de inicio: ${e.anioInicio||"—"}`;

  return `
  <div class="btn-row no-print" style="margin-bottom:1rem;justify-content:space-between">
    <a class="btn ghost" href="#/personal">← Volver al personal</a>
    <div class="btn-row">
      <button class="btn secondary" onclick="window.print()">🖨️ Imprimir</button>
      <a class="btn secondary" href="mailto:?subject=Expediente — ${encodeURIComponent(e.nombre)}&body=${cuerpoCorreo}">✉️ Enviar por correo</a>
    </div>
  </div>

  <div class="report">
    <div class="report-head">
      <h2>${esc(state.config.empresa)}</h2>
      <h3>Expediente Individual del Colaborador (E)</h3>
      <p>${esc(state.config.actividad)} · ${esc(state.config.direccion)}</p>
    </div>

    <div class="card" style="box-shadow:none">
      <h3>Datos personales</h3>
      <div class="exp-grid">
        <div class="exp-item"><b>Nombre completo</b><span>${esc(e.nombre)}</span></div>
        <div class="exp-item"><b>Cédula</b><span>${esc(e.cedula)}</span></div>
        <div class="exp-item"><b>Estado civil</b><span>${e.estadoCivil==="casado"?"Casado(a) / Unido(a)":"Soltero(a)"}${e.declaraConjunta?" — declara conjuntamente":""}</span></div>
        <div class="exp-item"><b>Cargo</b><span>${esc(e.cargo)}</span></div>
        <div class="exp-item"><b>Grupo de pago</b><span>Grupo ${e.grupo||"—"}</span></div>
        <div class="exp-item"><b>Año de inicio de labores</b><span>${e.anioInicio||"—"}${anios!==null?` (${anios} años de servicio)`:""}</span></div>
        <div class="exp-item"><b>Salario base mensual</b><span>${fmt(mensual)}${e.esSalarioMinimo?" (salario mínimo)":""}</span></div>
        <div class="exp-item"><b>Salario quincenal</b><span>${fmt(mensual/2)}</span></div>
      </div>
    </div>

    <div class="card" style="box-shadow:none">
      <h3>Descuentos recurrentes autorizados</h3>
      ${descs ? `<div class="table-wrap"><table>
        <thead><tr><th>Concepto</th><th class="num">Monto</th><th>Periodicidad</th><th class="num">Por quincena</th></tr></thead>
        <tbody>${descs}</tbody></table></div>` : `<p class="muted">Sin descuentos recurrentes.</p>`}
    </div>

    <div class="card" style="box-shadow:none">
      <h3>Historial de planillas</h3>
      ${historial.length ? `<div class="table-wrap"><table>
        <thead><tr><th>Período</th><th class="num">Salario base</th><th class="num">Otros ingresos</th><th class="num">Salario total</th><th class="num">Total desc.</th><th class="num">Neto</th><th class="no-print"></th></tr></thead>
        <tbody>${histRows}</tbody></table></div>`
      : `<p class="muted">Este colaborador aún no aparece en ninguna planilla calculada.</p>`}
    </div>
  </div>`;
}

/* ---------------- P: REPORTE GRUPAL ---------------- */
function viewReporteGrupal(){
  if(!state.empleados.length) return `<div class="empty"><div class="icon">🗃️</div>No hay colaboradores. <a href="#/personal">Registrar personal</a></div>`;
  const rows = state.empleados.map((e,i) => {
    const mensual = salarioMensualDe(e);
    return `<tr>
      <td class="center">${i+1}</td>
      <td>${esc(e.nombre)}</td>
      <td class="nowrap">${esc(e.cedula)}</td>
      <td>${e.estadoCivil==="casado"?"Casado(a)":"Soltero(a)"}</td>
      <td>${esc(e.cargo)}</td>
      <td class="center">${e.grupo||"—"}</td>
      <td class="center">${e.anioInicio||"—"}</td>
      <td class="num">${fnum(mensual)}</td>
    </tr>`;
  }).join("");
  const totalNomina = state.empleados.reduce((s,e)=>s+salarioMensualDe(e),0);

  let body = `REPORTE GRUPAL DE COLABORADORES — ${state.config.empresa}%0D%0A%0D%0A`;
  state.empleados.forEach((e,i)=>{ body += `${i+1}. ${encodeURIComponent(e.nombre)} | ${encodeURIComponent(e.cedula)} | ${encodeURIComponent(e.cargo)} | ${encodeURIComponent(fmt(salarioMensualDe(e)))}%0D%0A`; });

  return `
  <div class="btn-row no-print" style="margin-bottom:1rem;justify-content:space-between">
    <a class="btn ghost" href="#/personal">← Volver al personal</a>
    <div class="btn-row">
      <button class="btn secondary" onclick="window.print()">🖨️ Imprimir</button>
      <a class="btn secondary" href="mailto:?subject=Reporte grupal de colaboradores — ${encodeURIComponent(state.config.empresa)}&body=${body}">✉️ Enviar por correo</a>
    </div>
  </div>
  <div class="report">
    <div class="report-head">
      <h2>${esc(state.config.empresa)}</h2>
      <h3>Reporte Grupal de Colaboradores (P)</h3>
      <p>${esc(state.config.direccion)} · Emitido: ${new Date().toLocaleDateString("es-PA",{day:"numeric",month:"long",year:"numeric"})}</p>
    </div>
    <div class="table-wrap"><table>
      <thead><tr><th>#</th><th>Nombre completo</th><th>Cédula</th><th>Estado civil</th><th>Cargo</th><th>Grupo</th><th>Año inicio</th><th class="num">Salario mensual B/.</th></tr></thead>
      <tbody>${rows}
        <tr class="total-row"><td colspan="7">TOTAL DE NÓMINA MENSUAL (${state.empleados.length} colaboradores)</td><td class="num">${fnum(totalNomina)}</td></tr>
      </tbody>
    </table></div>
    <div class="sig-row"><div class="sig">Preparado por</div><div class="sig">Revisado por</div><div class="sig">Gerencia</div></div>
  </div>`;
}

/* ---------------- B: CAPTURA / CÁLCULO DE PLANILLA ---------------- */
function viewPlanilla(){
  if(!state.empleados.length) return `<div class="empty"><div class="icon">🗃️</div>Primero registre a los colaboradores. <a href="#/personal">Ir a Personal</a></div>`;

  const grupos = [...new Set(state.empleados.map(e=>e.grupo||1))].sort();
  const opts = `<option value="todos">Todos los grupos</option>` + grupos.map(g=>`<option value="${g}">Grupo ${g}</option>`).join("");

  window._afterRender = () => renderCaptura();

  return `
  <h2 class="page-title">🧮 Captura y Cálculo de la Planilla (B)</h2>
  <p class="page-sub">Al capturar la planilla, el sistema busca los datos de los colaboradores en su almacenamiento y calcula: salario base, otros ingresos, salario total, seguro social, seguro educativo, impuesto sobre la renta, otros descuentos, total de descuentos y salario neto a pagar.</p>

  <div class="card">
    <div class="form-grid">
      <div class="field wide"><label>Nombre del período *</label><input id="p_nombre" value="Segunda quincena de junio de 2026"></div>
      <div class="field"><label>Fecha de pago</label><input id="p_fecha" type="date" value="2026-06-30"></div>
      <div class="field"><label>Bonificación general (monto fijo B/.)</label><input id="p_bonif" type="number" step="0.01" min="0" value="120"></div>
      <div class="field"><label>Grupo a incluir</label><select id="p_grupo" onchange="renderCaptura()">${opts}</select></div>
      <div class="field"><label>&nbsp;</label><button class="btn sm ghost" onclick="precargarNovedades()">⬇ Precargar novedades del semestral</button></div>
    </div>
  </div>

  <div id="capturaZona"></div>

  <div class="btn-row" style="margin:1.2rem 0 2rem">
    <button class="btn success" onclick="calcularPlanilla()">🧮 Calcular y guardar planilla</button>
    <a class="btn ghost" href="#/informes">Ver informes existentes</a>
  </div>`;
}

window.renderCaptura = function(){
  const g = $("#p_grupo").value;
  const emps = state.empleados.filter(e => g==="todos" || String(e.grupo)===g);
  $("#capturaZona").innerHTML = emps.map(e => {
    const mensual = salarioMensualDe(e);
    const tHora = mensual / 4.3333 / state.config.horasSemana;
    const descTxt = (e.descuentos||[]).map(d=>`${esc(d.concepto)} ${fmt(d.periodicidad==="mensual"?d.monto/2:d.monto)}/quincena`).join(" · ") || "Sin descuentos recurrentes";
    return `<div class="emp-capture" data-id="${e.id}">
      <header>
        <div><b>${esc(e.nombre)}</b> <span class="muted small">· ${esc(e.cargo)} · ${esc(e.cedula)} · Grupo ${e.grupo||"—"}</span></div>
        <span class="badge">Salario: ${fmt(mensual)}/mes → ${fmt(mensual/2)}/quincena</span>
      </header>
      <p class="small muted" style="margin:-.2rem 0 .5rem">
        Tarifa por hora calculada automáticamente:
        <b>${fmt(tHora)}</b> (${fnum(mensual)} ÷ 4.3333 semanas ÷ ${state.config.horasSemana} h) ·
        diurna ${fmt(tHora*1.25)} · mixta ${fmt(tHora*1.5)} · nocturna ${fmt(tHora*1.75)}
      </p>
      <div class="inputs">
        <div class="field"><label>H. extras diurnas <span class="muted">(+25%)</span></label><input class="n_hdiurnas" type="number" step="0.5" min="0" value="0"></div>
        <div class="field"><label>H. extras mixtas <span class="muted">(+50%)</span></label><input class="n_hmixtas" type="number" step="0.5" min="0" value="0"></div>
        <div class="field"><label>H. extras nocturnas <span class="muted">(+75%)</span></label><input class="n_hnocturnas" type="number" step="0.5" min="0" value="0"></div>
        <div class="field"><label>Ventas del período (B/.)</label><input class="n_ventas" type="number" step="0.01" min="0" value="0"></div>
        <div class="field"><label>% Comisión</label><input class="n_compct" type="number" step="0.1" min="0" value="${e.grupo===2?2:0}"></div>
        <div class="field"><label>Dietas (B/.)</label><input class="n_dietas" type="number" step="0.01" min="0" value="0"></div>
        <div class="field"><label>Prima de producción (B/.)</label><input class="n_prima" type="number" step="0.01" min="0" value="0"></div>
        <div class="field"><label>Adelanto de salario (B/.)</label><input class="n_adelanto" type="number" step="0.01" min="0" value="0"></div>
      </div>
      <p class="small muted mt">Descuentos recurrentes: ${descTxt}</p>
    </div>`;
  }).join("") || `<div class="empty">No hay colaboradores en este grupo.</div>`;
};

window.precargarNovedades = function(){
  let n = 0;
  document.querySelectorAll(".emp-capture").forEach(div => {
    const e = state.empleados.find(x => x.id === div.dataset.id);
    if(!e) return;
    const nov = SEED_NOVEDADES[`${e.grupo}|${e.nombre}`];
    if(!nov) return;
    n++;
    div.querySelector(".n_hdiurnas").value   = nov.horasDiurnas||0;
    div.querySelector(".n_hmixtas").value    = nov.horasMixtas||0;
    div.querySelector(".n_hnocturnas").value = nov.horasNocturnas||0;
    div.querySelector(".n_ventas").value = nov.ventas||0;
    div.querySelector(".n_compct").value = nov.comisionPct||(e.grupo===2?2:0);
    div.querySelector(".n_dietas").value = nov.dietas||0;
    div.querySelector(".n_prima").value = nov.primaProd||0;
    div.querySelector(".n_adelanto").value = nov.adelanto||0;
  });
  toast(n ? `Novedades del semestral precargadas para ${n} colaboradores` : "No hay novedades para los colaboradores mostrados");
};

window.calcularPlanilla = function(){
  const nombre = $("#p_nombre").value.trim();
  if(!nombre){ toast("Indique el nombre del período"); return; }
  const bonif = Number($("#p_bonif").value)||0;
  const filas = [];
  document.querySelectorAll(".emp-capture").forEach(div => {
    const e = state.empleados.find(x => x.id === div.dataset.id);
    if(!e) return;
    const nov = {
      horasDiurnas:   div.querySelector(".n_hdiurnas").value,
      horasMixtas:    div.querySelector(".n_hmixtas").value,
      horasNocturnas: div.querySelector(".n_hnocturnas").value,
      ventas: div.querySelector(".n_ventas").value,
      comisionPct: div.querySelector(".n_compct").value,
      dietas: div.querySelector(".n_dietas").value,
      primaProd: div.querySelector(".n_prima").value,
      adelanto: div.querySelector(".n_adelanto").value
    };
    filas.push(calcularFila(e, nov, bonif));
  });
  if(!filas.length){ toast("No hay colaboradores para calcular"); return; }
  const pla = {
    id: uid(),
    nombre,
    fechaPago: $("#p_fecha").value,
    bonifMonto: bonif,
    grupo: $("#p_grupo").value,
    creada: new Date().toISOString(),
    config: {...state.config},
    filas,
    totales: totalesPlanilla(filas)
  };
  state.planillas.unshift(pla);
  savePla();
  toast("Planilla calculada y guardada");
  location.hash = `#/informe/${pla.id}`;
};

/* ---------------- LISTA DE INFORMES ---------------- */
function viewInformes(){
  if(!state.planillas.length) return `<div class="empty"><div class="icon">📊</div>No hay planillas calculadas todavía.<br><br><a class="btn" href="#/planilla">Calcular una planilla</a></div>`;
  const rows = state.planillas.map(p => `<tr>
    <td><b>${esc(p.nombre)}</b><br><span class="small muted">${p.grupo==="todos"?"Todos los grupos":"Grupo "+p.grupo} · ${p.filas.length} colaboradores</span></td>
    <td class="nowrap">${p.fechaPago||"—"}</td>
    <td class="num">${fnum(p.totales.salarioTotal)}</td>
    <td class="num">${fnum(p.totales.totalDesc)}</td>
    <td class="num"><b>${fnum(p.totales.neto)}</b></td>
    <td class="nowrap">
      <a class="btn sm" href="#/informe/${p.id}">Ver informes</a>
      <button class="btn sm danger" onclick="borrarPlanilla('${p.id}')">Eliminar</button>
    </td>
  </tr>`).join("");
  return `
  <h2 class="page-title">📊 Informes de Planilla (C)</h2>
  <p class="page-sub">Seleccione una planilla para ver el informe de planilla, el reporte para la Caja de Seguro Social y los comprobantes para los colaboradores.</p>
  <div class="card"><div class="table-wrap"><table>
    <thead><tr><th>Período</th><th>Fecha de pago</th><th class="num">Salario total B/.</th><th class="num">Descuentos B/.</th><th class="num">Neto B/.</th><th></th></tr></thead>
    <tbody>${rows}</tbody>
  </table></div></div>`;
}

window.borrarPlanilla = function(id){
  const p = state.planillas.find(x=>x.id===id);
  if(!p) return;
  if(!confirm(`¿Eliminar la planilla "${p.nombre}"?`)) return;
  state.planillas = state.planillas.filter(x=>x.id!==id);
  savePla(); toast("Planilla eliminada"); navigate();
};

/* ---------------- C: INFORME DE PLANILLA (3 reportes) ---------------- */
function viewInforme(id, tab){
  const p = state.planillas.find(x => x.id === id);
  if(!p) return `<div class="empty"><div class="icon">❓</div>Planilla no encontrada. <a href="#/informes">Volver</a></div>`;
  tab = tab || "planilla";
  const cfg = p.config || state.config;
  const t = p.totales;

  const tabs = `
  <div class="tabs no-print">
    <button class="${tab==="planilla"?"active":""}" onclick="location.hash='#/informe/${id}/planilla'">📄 Informe de Planilla</button>
    <button class="${tab==="css"?"active":""}" onclick="location.hash='#/informe/${id}/css'">🏥 Reporte Caja de Seguro Social</button>
    <button class="${tab==="colillas"?"active":""}" onclick="location.hash='#/informe/${id}/colillas'">🧾 Comprobantes para Colaboradores</button>
  </div>`;

  const mailBtn = (subject, body) =>
    `<a class="btn secondary" href="mailto:?subject=${encodeURIComponent(subject)}&body=${body}">✉️ Enviar por correo</a>`;

  let contenido = "", correo = "";

  if(tab === "planilla"){
    const rows = p.filas.map((f,i)=>`<tr>
      <td class="center">${i+1}</td>
      <td>${esc(f.nombre)}<br><span class="small muted">${esc(f.cargo)}</span></td>
      <td class="nowrap">${esc(f.cedula)}</td>
      <td class="num">${fnum(f.salarioBase)}</td>
      <td class="num">${fnum(f.otrosIngresos)}</td>
      <td class="num"><b>${fnum(f.salarioTotal)}</b></td>
      <td class="num">${fnum(f.css)}</td>
      <td class="num">${fnum(f.se)}</td>
      <td class="num">${fnum(f.isr)}</td>
      <td class="num">${fnum(f.otrosDesc)}</td>
      <td class="num">${fnum(f.totalDesc)}</td>
      <td class="num"><b>${fnum(f.neto)}</b></td>
    </tr>`).join("");

    correo = `INFORME DE PLANILLA — ${encodeURIComponent(p.nombre)}%0D%0A${encodeURIComponent(cfg.empresa)}%0D%0A%0D%0A`;
    p.filas.forEach(f=>{ correo += `${encodeURIComponent(f.nombre)}: Total ${encodeURIComponent(fnum(f.salarioTotal))} | Desc. ${encodeURIComponent(fnum(f.totalDesc))} | Neto ${encodeURIComponent(fnum(f.neto))}%0D%0A`; });
    correo += `%0D%0ATOTAL NETO A PAGAR: B/. ${encodeURIComponent(fnum(t.neto))}`;

    contenido = `
    <div class="report">
      <div class="report-head">
        <h2>${esc(cfg.empresa)}</h2>
        <h3>Informe de Planilla de Salarios (C)</h3>
        <p>${esc(p.nombre)} · Fecha de pago: ${p.fechaPago||"—"} · ${esc(cfg.direccion)}</p>
      </div>
      <div class="table-wrap"><table>
        <thead><tr>
          <th>#</th><th>Colaborador</th><th>Cédula</th>
          <th class="num">Salario base</th><th class="num">Otros ingresos</th><th class="num">Salario total</th>
          <th class="num">S. Social ${cfg.cssEmpleado}%</th><th class="num">S. Educ. ${cfg.seEmpleado}%</th><th class="num">I.S.R.</th>
          <th class="num">Otros desc.</th><th class="num">Total desc.</th><th class="num">Salario neto</th>
        </tr></thead>
        <tbody>${rows}
          <tr class="total-row">
            <td colspan="3">TOTALES</td>
            <td class="num">${fnum(t.salarioBase)}</td><td class="num">${fnum(t.otrosIngresos)}</td><td class="num">${fnum(t.salarioTotal)}</td>
            <td class="num">${fnum(t.css)}</td><td class="num">${fnum(t.se)}</td><td class="num">${fnum(t.isr)}</td>
            <td class="num">${fnum(t.otrosDesc)}</td><td class="num">${fnum(t.totalDesc)}</td><td class="num">${fnum(t.neto)}</td>
          </tr>
        </tbody>
      </table></div>

      <div class="card mt" style="box-shadow:none">
        <h3>Aportes patronales del período (gasto del empleador)</h3>
        <div class="table-wrap"><table>
          <thead><tr><th>Concepto</th><th class="num">Tasa</th><th class="num">Base B/.</th><th class="num">Monto B/.</th></tr></thead>
          <tbody>
            <tr><td>Seguro Social — patrono</td><td class="num">${cfg.cssPatrono}%</td><td class="num">${fnum(t.baseCSS)}</td><td class="num">${fnum(t.cssPat)}</td></tr>
            <tr><td>Seguro Educativo — patrono</td><td class="num">${cfg.sePatrono}%</td><td class="num">${fnum(t.baseCSS)}</td><td class="num">${fnum(t.sePat)}</td></tr>
            <tr><td>Riesgo Profesional</td><td class="num">${cfg.riesgoProf}%</td><td class="num">${fnum(t.baseCSS)}</td><td class="num">${fnum(t.riesgo)}</td></tr>
            <tr class="total-row"><td colspan="3">TOTAL DE APORTES PATRONALES</td><td class="num">${fnum(r2(t.cssPat+t.sePat+t.riesgo))}</td></tr>
          </tbody>
        </table></div>
      </div>
      <div class="sig-row"><div class="sig">Preparado por</div><div class="sig">Revisado por</div><div class="sig">Autorizado por</div></div>
    </div>`;
  }

  if(tab === "css"){
    const rows = p.filas.map((f,i)=>{
      const cuotaEmp = r2(f.css + f.se);
      const cuotaPat = r2(f.cssPat + f.sePat + f.riesgo);
      return `<tr>
        <td class="center">${i+1}</td>
        <td>${esc(f.nombre)}</td>
        <td class="nowrap">${esc(f.cedula)}</td>
        <td class="num">${fnum(f.baseCSS)}</td>
        <td class="num">${fnum(f.css)}</td>
        <td class="num">${fnum(f.se)}</td>
        <td class="num">${fnum(f.cssPat)}</td>
        <td class="num">${fnum(f.sePat)}</td>
        <td class="num">${fnum(f.riesgo)}</td>
        <td class="num"><b>${fnum(r2(cuotaEmp+cuotaPat))}</b></td>
      </tr>`;
    }).join("");
    const totalCaja = r2(t.css + t.se + t.cssPat + t.sePat + t.riesgo);

    correo = `REPORTE PARA EL PAGO DE LA CAJA DE SEGURO SOCIAL%0D%0A${encodeURIComponent(cfg.empresa)} — ${encodeURIComponent(p.nombre)}%0D%0A%0D%0ACuota empleados (CSS %2B SE): B/. ${encodeURIComponent(fnum(r2(t.css+t.se)))}%0D%0ACuota patronal (CSS %2B SE %2B RP): B/. ${encodeURIComponent(fnum(r2(t.cssPat+t.sePat+t.riesgo)))}%0D%0ATOTAL A PAGAR A LA CSS: B/. ${encodeURIComponent(fnum(totalCaja))}`;

    contenido = `
    <div class="report">
      <div class="report-head">
        <h2>${esc(cfg.empresa)}</h2>
        <h3>Reporte para el Pago de la Caja de Seguro Social</h3>
        <p>${esc(p.nombre)} · Riesgo profesional: ${cfg.riesgoProf}% · Emitido: ${new Date().toLocaleDateString("es-PA")}</p>
      </div>
      <div class="table-wrap"><table>
        <thead><tr>
          <th rowspan="2">#</th><th rowspan="2">Colaborador</th><th rowspan="2">Cédula</th><th rowspan="2" class="num">Salario gravable</th>
          <th colspan="2" class="center">Cuota del empleado</th>
          <th colspan="3" class="center">Cuota del patrono</th>
          <th rowspan="2" class="num">Total</th>
        </tr><tr>
          <th class="num">CSS ${cfg.cssEmpleado}%</th><th class="num">S.E. ${cfg.seEmpleado}%</th>
          <th class="num">CSS ${cfg.cssPatrono}%</th><th class="num">S.E. ${cfg.sePatrono}%</th><th class="num">R.P. ${cfg.riesgoProf}%</th>
        </tr></thead>
        <tbody>${rows}
          <tr class="total-row">
            <td colspan="3">TOTALES</td>
            <td class="num">${fnum(t.baseCSS)}</td>
            <td class="num">${fnum(t.css)}</td><td class="num">${fnum(t.se)}</td>
            <td class="num">${fnum(t.cssPat)}</td><td class="num">${fnum(t.sePat)}</td><td class="num">${fnum(t.riesgo)}</td>
            <td class="num">${fnum(totalCaja)}</td>
          </tr>
        </tbody>
      </table></div>
      <div class="card mt" style="box-shadow:none">
        <h3>Resumen para pago</h3>
        <div class="colilla" style="max-width:460px">
          <div class="line"><span>Retenido a empleados (CSS + S.E.)</span><b>${fmt(r2(t.css+t.se))}</b></div>
          <div class="line"><span>Aporte patronal (CSS + S.E. + R.P.)</span><b>${fmt(r2(t.cssPat+t.sePat+t.riesgo))}</b></div>
          <div class="line total"><span>TOTAL A PAGAR A LA CSS</span><span>${fmt(totalCaja)}</span></div>
        </div>
      </div>
      <div class="sig-row"><div class="sig">Preparado por</div><div class="sig">Representante legal</div></div>
    </div>`;
  }

  if(tab === "colillas"){
    correo = `COMPROBANTES DE PAGO — ${encodeURIComponent(p.nombre)}%0D%0A${encodeURIComponent(cfg.empresa)}%0D%0A%0D%0A`;
    const cards = p.filas.map(f => {
      correo += `${encodeURIComponent(f.nombre)} — Neto: B/. ${encodeURIComponent(fnum(f.neto))}%0D%0A`;
      const descLines = f.descuentosDetalle.map(d=>`<div class="line"><span>${esc(d.concepto)}</span><span>${fnum(d.monto)}</span></div>`).join("");
      const ingresoLines = [
        f.extrasDiurnas>0   ? `<div class="line"><span>H. extras diurnas (${f.hDiurnas} h × ${fnum(f.tarifaHora)} + 25%)</span><span>${fnum(f.extrasDiurnas)}</span></div>`:"",
        f.extrasMixtas>0    ? `<div class="line"><span>H. extras mixtas (${f.hMixtas} h × ${fnum(f.tarifaHora)} + 50%)</span><span>${fnum(f.extrasMixtas)}</span></div>`:"",
        f.extrasNocturnas>0 ? `<div class="line"><span>H. extras nocturnas (${f.hNocturnas} h × ${fnum(f.tarifaHora)} + 75%)</span><span>${fnum(f.extrasNocturnas)}</span></div>`:"",
        // planillas guardadas con el formato anterior (un solo tipo de hora)
        (f.extras>0 && f.extrasDiurnas===undefined) ? `<div class="line"><span>Horas extras (${f.horasExtras} h × ${fnum(f.tarifaHora)})</span><span>${fnum(f.extras)}</span></div>`:"",
        f.comision>0 ? `<div class="line"><span>Comisión (${f.comisionPct}% de ${fnum(f.ventas)})</span><span>${fnum(f.comision)}</span></div>`:"",
        f.bonif>0 ? `<div class="line"><span>Bonificación (monto fijo)</span><span>${fnum(f.bonif)}</span></div>`:"",
        f.dietas>0 ? `<div class="line"><span>Dietas</span><span>${fnum(f.dietas)}</span></div>`:"",
        f.prima>0 ? `<div class="line"><span>Prima de producción</span><span>${fnum(f.prima)}</span></div>`:""
      ].join("");
      return `<div class="colilla">
        <div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:.3rem">
          <div><h4>${esc(f.nombre)}</h4><span class="small muted">${esc(f.cargo)} · Cédula ${esc(f.cedula)}</span></div>
          <div class="right"><b>${esc(cfg.empresa)}</b><br><span class="small muted">${esc(p.nombre)}</span></div>
        </div>
        <div class="cols mt">
          <div>
            <b class="small">INGRESOS</b>
            <div class="line"><span>Salario base (quincena)</span><span>${fnum(f.salarioBase)}</span></div>
            ${ingresoLines}
            <div class="line total"><span>SALARIO TOTAL</span><span>${fnum(f.salarioTotal)}</span></div>
          </div>
          <div>
            <b class="small">DESCUENTOS</b>
            <div class="line"><span>Seguro Social (${cfg.cssEmpleado}%)</span><span>${fnum(f.css)}</span></div>
            <div class="line"><span>Seguro Educativo (${cfg.seEmpleado}%)</span><span>${fnum(f.se)}</span></div>
            <div class="line"><span>Impuesto sobre la Renta</span><span>${fnum(f.isr)}</span></div>
            ${descLines}
            <div class="line total"><span>TOTAL DESCUENTOS</span><span>${fnum(f.totalDesc)}</span></div>
          </div>
        </div>
        <div class="line total" style="font-size:1.05rem"><span>SALARIO NETO A PAGAR</span><span>${fmt(f.neto)}</span></div>
        <details class="calc no-print">
          <summary>Ver detalle del cálculo del I.S.R. y bases</summary>
          <div class="calc-body">
            <div>Salario mensual gravable: ${fmt(f.baseCSS*2)} → Renta anual (×13, incluye XIII): ${fmt(f.isrDetalle.rentaBruta)}</div>
            ${f.isrDetalle.deduccion?`<div>Deducción por declaración conjunta: −${fmt(f.isrDetalle.deduccion)} → Base: ${fmt(f.isrDetalle.baseGravable)}</div>`:""}
            <div>I.S.R. anual: ${fmt(f.isrDetalle.anual)} → mensual: ${fmt(f.isrDetalle.mensual)} → quincenal: ${fmt(f.isrDetalle.quincenal)}</div>
            ${f.dietaExenta>0?`<div>Dietas exentas de CSS (≤25% del salario mensual): ${fmt(f.dietaExenta)} · gravables: ${fmt(f.dietaGravable)}</div>`:""}
            ${f.primaExenta>0?`<div>Prima exenta de CSS (≤50% del salario mensual): ${fmt(f.primaExenta)} · gravable: ${fmt(f.primaGravable)}</div>`:""}
            <div>Base CSS/S.E. del período: ${fmt(f.baseCSS)}</div>
          </div>
        </details>
        <div class="sig-row" style="margin-top:1.5rem"><div class="sig">Recibido conforme — Firma del colaborador</div></div>
      </div>`;
    }).join("");

    contenido = `
    <div class="report">
      <div class="report-head">
        <h2>${esc(cfg.empresa)}</h2>
        <h3>Reporte para los Colaboradores — Comprobantes de Pago</h3>
        <p>${esc(p.nombre)} · Fecha de pago: ${p.fechaPago||"—"}</p>
      </div>
      ${cards}
    </div>`;
  }

  const subjects = {planilla:`Informe de Planilla — ${p.nombre}`, css:`Reporte CSS — ${p.nombre}`, colillas:`Comprobantes de pago — ${p.nombre}`};

  return `
  <div class="btn-row no-print" style="margin-bottom:1rem;justify-content:space-between">
    <a class="btn ghost" href="#/informes">← Todas las planillas</a>
    <div class="btn-row">
      <button class="btn secondary" onclick="window.print()">🖨️ Imprimir</button>
      ${mailBtn(subjects[tab], correo)}
    </div>
  </div>
  ${tabs}
  ${contenido}`;
}

/* ---------------- CONFIGURACIÓN ---------------- */
function viewConfig(){
  const c = state.config;
  const smMensual = r2(c.salarioMinimoHora * c.horasSemana * 4.3333);
  return `
  <h2 class="page-title">⚙️ Configuración del sistema</h2>
  <p class="page-sub">Parámetros legales usados en los cálculos, según la teoría de planillas del curso. Ajústelos si cambia la legislación.</p>
  <form onsubmit="return guardarConfig(event)">
    <div class="grid cols-2">
      <div class="card">
        <h3>Empresa</h3>
        <div class="form-grid">
          <div class="field wide"><label>Nombre</label><input id="c_empresa" value="${esc(c.empresa)}"></div>
          <div class="field"><label>Actividad</label><input id="c_actividad" value="${esc(c.actividad)}"></div>
          <div class="field"><label>Dirección</label><input id="c_direccion" value="${esc(c.direccion)}"></div>
          <div class="field"><label>Horas por semana</label><input id="c_horas" type="number" step="0.5" value="${c.horasSemana}"></div>
          <div class="field"><label>Riesgo profesional (%)</label><input id="c_riesgo" type="number" step="0.01" value="${c.riesgoProf}"></div>
        </div>
      </div>
      <div class="card">
        <h3>Cuotas obrero-patronales</h3>
        <div class="form-grid">
          <div class="field"><label>CSS empleado (%)</label><input id="c_cssE" type="number" step="0.01" value="${c.cssEmpleado}"></div>
          <div class="field"><label>CSS patrono (%)</label><input id="c_cssP" type="number" step="0.01" value="${c.cssPatrono}"></div>
          <div class="field"><label>Seguro Educativo empleado (%)</label><input id="c_seE" type="number" step="0.01" value="${c.seEmpleado}"></div>
          <div class="field"><label>Seguro Educativo patrono (%)</label><input id="c_seP" type="number" step="0.01" value="${c.sePatrono}"></div>
        </div>
        <p class="small muted mt">Ley 462 de 2025: empleado 9.75% y patrono 13.25% hasta el 31-dic-2026; 14.25% desde 2027; 15.25% desde marzo 2029.</p>
      </div>
      <div class="card">
        <h3>Salario mínimo</h3>
        <div class="form-grid">
          <div class="field"><label>Tarifa por hora (B/.)</label><input id="c_sm" type="number" step="0.01" value="${c.salarioMinimoHora}"></div>
        </div>
        <p class="small muted mt">Con ${c.horasSemana} h/semana equivale a ≈ ${fmt(smMensual)} mensuales (tarifa × horas semanales × 4.3333). Ajuste la tarifa según el Decreto Ejecutivo N.º 13 del 31 de diciembre de 2025 (salario mínimo vigente) para la región y actividad económica.</p>
      </div>
      <div class="card">
        <h3>Impuesto sobre la renta (Ley 8 de 2010)</h3>
        <div class="form-grid">
          <div class="field"><label>Tramo exento hasta (B/.)</label><input id="c_t1" type="number" step="1" value="${c.isrTramo1}"></div>
          <div class="field"><label>Límite 2do tramo (B/.)</label><input id="c_t2" type="number" step="1" value="${c.isrTramo2}"></div>
          <div class="field"><label>Tasa 2do tramo (%)</label><input id="c_ta2" type="number" step="0.1" value="${c.isrTasa2}"></div>
          <div class="field"><label>Tasa 3er tramo (%)</label><input id="c_ta3" type="number" step="0.1" value="${c.isrTasa3}"></div>
          <div class="field"><label>Deducción declaración conjunta (B/.)</label><input id="c_conj" type="number" step="1" value="${c.deduccionConjunta}"></div>
        </div>
      </div>
    </div>
    <div class="btn-row" style="margin:1rem 0 2rem">
      <button class="btn" type="submit">💾 Guardar configuración</button>
      <button class="btn ghost" type="button" onclick="restaurarConfig()">Restaurar valores del curso</button>
      <button class="btn danger" type="button" onclick="borrarTodo()">🗑️ Borrar todos los datos</button>
    </div>
  </form>`;
}

window.guardarConfig = function(ev){
  ev.preventDefault();
  Object.assign(state.config, {
    empresa: $("#c_empresa").value.trim(),
    actividad: $("#c_actividad").value.trim(),
    direccion: $("#c_direccion").value.trim(),
    horasSemana: Number($("#c_horas").value)||45,
    riesgoProf: Number($("#c_riesgo").value)||0.56,
    cssEmpleado: Number($("#c_cssE").value)||9.75,
    cssPatrono: Number($("#c_cssP").value)||13.25,
    seEmpleado: Number($("#c_seE").value)||1.25,
    sePatrono: Number($("#c_seP").value)||1.5,
    salarioMinimoHora: Number($("#c_sm").value)||2.36,
    isrTramo1: Number($("#c_t1").value)||11000,
    isrTramo2: Number($("#c_t2").value)||50000,
    isrTasa2: Number($("#c_ta2").value)||15,
    isrTasa3: Number($("#c_ta3").value)||25,
    deduccionConjunta: Number($("#c_conj").value)||800
  });
  saveCfg(); toast("Configuración guardada"); navigate();
  return false;
};

window.restaurarConfig = function(){
  state.config = {...DEFAULT_CFG};
  saveCfg(); toast("Configuración restaurada"); navigate();
};

window.borrarTodo = function(){
  if(!confirm("Esto eliminará TODOS los colaboradores, planillas y configuración. ¿Continuar?")) return;
  localStorage.removeItem(K_EMP); localStorage.removeItem(K_PLA); localStorage.removeItem(K_CFG);
  state = {empleados:[], planillas:[], config:{...DEFAULT_CFG}};
  toast("Datos eliminados"); location.hash = "#/inicio"; navigate();
};

/* ---------------- arranque ---------------- */
navigate();
