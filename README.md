<div align="center">

# 🏭 Sistema de Planillas — La Próspera, S.A.

**Software de planillas de salario de Panamá** 🇵🇦
Examen Semestral · Contabilidad General · Universidad Tecnológica de Panamá

[![Demo en vivo](https://img.shields.io/badge/🌐_Demo_en_vivo-GitHub_Pages-0f4c81?style=for-the-badge)](https://joelapl.github.io/sistema-planillas-la-prospera/)
&nbsp;
![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)

*100 % web · sin instalación · sin base de datos · los datos se guardan en tu navegador*

</div>

---

## ✨ ¿Qué hace?

Sistema completo de planillas para la empresa **La Próspera, S.A.** (fábrica de cemento,
Juan Díaz, Calle 200 — jornada de 45 h semanales, riesgo profesional 0.56 %), siguiendo
el flujograma del examen semestral:

| Módulo | Descripción |
|---|---|
| 👥 **Captura de Datos del Personal** | Registrar, **editar** y eliminar colaboradores: nombre completo, cédula, estado civil, cargo, salario base, año de inicio de labores y descuentos recurrentes autorizados. Todo queda **guardado** en el navegador. |
| 📋 **P — Reporte grupal** | Listado de todos los colaboradores con totales de nómina. |
| 🗂️ **E — Expediente individual** | Ficha de cada colaborador con años de servicio, descuentos e historial de planillas. |
| 🧮 **B — Cálculo de planilla** | Busca los datos almacenados de cada colaborador y calcula: salario base, otros ingresos, salario total, Seguro Social, Seguro Educativo, I.S.R., otros descuentos, total de descuentos y **salario neto a pagar**. |
| 📊 **C — Informes** | Informe de Planilla de Salarios (con aportes patronales), Reporte para el pago de la **Caja de Seguro Social** y **Comprobantes de pago** para los colaboradores. |
| 🖨️ ✉️ | **Todos los reportes tienen opción de imprimir y enviar por correo.** |
| ⚙️ **Configuración** | Tasas de CSS, Seguro Educativo, riesgo profesional, salario mínimo y tramos del I.S.R., todo editable. |

### 🎓 Datos del semestral incluidos

Dos botones de demostración cargan al instante:

- **12 colaboradores de los Grupos 1–4** (horas extras · comisiones · dietas · primas de producción)
- **Novedades de la 2.ª quincena de junio de 2015** (extras, ventas, dietas, primas, adelantos y bonificación general del 10 %)

## 📐 Metodología de cálculo (Teoría de Planillas 2025)

| Concepto | Empleado | Patrono |
|---|:-:|:-:|
| Seguro Social (Ley 462 · 13-mar-2025 → 31-dic-2026) | **9.75 %** | **13.25 %** |
| Seguro Educativo | **1.25 %** | **1.50 %** |
| Riesgo Profesional (Clase I, grado medio) | — | **0.56 %** |

- **I.S.R.** (Ley 8 de 2010): renta anual = salario mensual × 13 (incluye décimo tercer mes) →
  0 % hasta B/.11,000 · 15 % del exceso hasta B/.50,000 · 25 % sobre el exceso de B/.50,000.
  Deducción de **B/.800** al declarar conjuntamente (Art. 709 del Código Fiscal).
- **Art. 91 (CSS)**: las **dietas** cotizan solo en el exceso del **25 %** del salario mensual;
  las **primas de producción**, en el exceso del **50 %**; comisiones y bonificaciones cotizan completas.
- **Horas extras**: tarifa hora = salario mensual ÷ 4.3333 ÷ 45 h, con recargos de 25 % (diurna),
  50 % o 75 % (nocturna).
- Los descuentos mensuales autorizados (mueblería, ahorro, préstamos) se dividen ÷ 2 por quincena;
  los adelantos se descuentan completos en el período.

## 🚀 Usarlo

**En línea:** 👉 **<https://joelapl.github.io/sistema-planillas-la-prospera/>**

**En local:** clona el repo y abre `index.html` en el navegador, o sirve la carpeta:

```bash
git clone https://github.com/JoelAPL/sistema-planillas-la-prospera.git
cd sistema-planillas-la-prospera
python -m http.server 8123   # → http://localhost:8123
```

> 💡 Los datos se guardan en el `localStorage` de **tu** navegador: cada persona que abra
> la app tiene su propio almacén — puedes registrar, editar y borrar sin afectar a nadie.

## 🗺️ Flujo sugerido para la demostración

1. **Inicio** → «Cargar colaboradores del semestral (Grupos 1–4)»
2. **Personal** → editar un colaborador y guardar (se actualiza al instante)
3. **Planilla** → «Precargar novedades del semestral» → «Calcular y guardar planilla»
4. **Informes** → recorrer las 3 pestañas → **Imprimir** / **Enviar por correo**
5. **Personal → Expediente** → ver el historial de planillas del colaborador

## 🧱 Tecnología

Vanilla **HTML + CSS + JavaScript** (≈ 40 KB en total). Sin frameworks, sin build,
sin servidor: por eso puede publicarse gratis en GitHub Pages, Netlify o cualquier
hosting estático.

---

<div align="center">
<sub>Desarrollado por <b>Joel</b> (<a href="https://github.com/JoelAPL">@JoelAPL</a>) · UTP · Contabilidad General · Semestre 1-2026</sub>
</div>
