# UnRepo Nexus — Etapa 4: auditoría de producción y calidad

**Estado:** IMPLEMENTADO y VALIDADO en la rama `audit/nexus-stage4-production-quality-20261121`. **NO PUBLICADO / NO FUSIONADO.**  
**Auditoría final:** 22 de noviembre de 2026.  
**Pull request:** https://github.com/Tuconsultor/UnRepo/pull/15  
**Evidencia principal (Chromium / Lighthouse / axe):** https://github.com/Tuconsultor/UnRepo/actions/runs/44981656430

## 1. Alcance y método

- **Paridad pública real:** desde GitHub Actions se realizó HTTP GET de `index.html`, seis páginas especializadas y `assets/css/nexus-stage3.css`. Se comparó SHA-256 del **cuerpo HTTP recibido** con `origin/main`: **8/8 archivos HTTP 200 e idénticos**.
- **Navegador:** Chromium (Playwright). Se conservaron y aprobaron las pruebas existentes de búsqueda, filtros, favoritos, catálogo, guías, laboratorios y páginas móviles.
- **Accesibilidad:** axe-core 4.14.1, etiquetas WCAG 2.0 A/AA, 2.1 A/AA y 2.2 AA, para las siete páginas públicas y las siete páginas propuestas.
- **Rendimiento:** Lighthouse 13.6.0, tres mediciones sintéticas de la candidata (portada móvil, portada escritorio y Space Lab móvil). Se archivaron JSON integrales.
- **Integridad:** la prueba `scripts/verify_nexus_stage4_preservation.cjs` elimina únicamente las adiciones autorizadas (semántica ARIA, foco, favicon, Google Fonts `display=optional`) y exige que los siete HTML resultantes sean idénticos byte por byte al `origin/main` inicial.
- **CLS:** instrumentación de PerformanceObserver a 390 y 1440 px con y sin fuentes remotas; archivos diagnósticos conservados.

## 2. Resultados de laboratorio — última ejecución aprobada

| Auditado | Rendimiento | Accesibilidad | Buenas prácticas | SEO | FCP | LCP | CLS | TBT |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Portada móvil | 93 | 100 | 100 | 100 | 2.438 s | 2.438 s | 0.0746 | 0 ms |
| Portada escritorio | 100 | 100 | 100 | 100 | 0.596 s | 0.596 s | 0.0208 | 0 ms |
| Space Lab móvil | 100 | 100 | 100 | 100 | 0.901 s | 0.901 s | 0 | 1 ms |

**Regla interpretativa:** estas cifras son resultados de una ejecución de Lighthouse en un corredor CI; no son Core Web Vitals medidos en usuarios reales ni percentiles p75 de CrUX. **INP de campo no medido.** Para una certificación de producción de Core Web Vitals se requiere CrUX o RUM con tráfico representativo y ventana temporal suficiente.

### Diagnóstico inicial (otra ejecución, no experimento A/B controlado)

| Auditado | Rendimiento | Accesibilidad | CLS |
|---|---:|---:|---:|
| Portada móvil | 84 | 96 | 0.2089 |
| Portada escritorio | 77 | 96 | 0.6760 |
| Space Lab móvil | 100 | 100 | 0 |

La instrumentación de despliegue mostró movimientos al cargar tipografía web (`display=swap`): en una prueba intermedia, desactivar su descarga eliminó los desplazamientos. Se cambió a `display=optional` en portada y Windows para minimizar sustituciones tardías. En la **última** prueba de PerformanceObserver, 390 y 1440 px, con fuentes permitidas y bloqueadas, los cuatro escenarios registraron **CLS 0**. Las diferencias entre ejecuciones de Lighthouse pueden contener variabilidad del entorno y no deben atribuirse en su totalidad a un cambio individual.

## 3. Accesibilidad y correcciones verificadas

axe-core en producción encontró **12 elementos** repartidos en cinco páginas, agrupados en tres reglas serias:

| Página | Hallazgo confirmado | Solución visual/semántica |
|---|---|---|
| Portada | `aria-prohibited-attr`: `aria-label` en `div#activeFilters` sin rol válido | `role="group"`, conservando etiqueta y contenido |
| REA | `scrollable-region-focusable`: bloque de prompt desplazable sin foco | `tabindex="0"` |
| Intelligence Lab | `label-content-name-mismatch`: nombre accesible no contiene texto visible | Nombre accesible que incluye `UNREPO · NEXUS` y el destino |
| Resiliencia | `scrollable-region-focusable` en bloque de código y tabla | Foco por teclado en contenedores desplazables |
| Windows | `scrollable-region-focusable` en siete bloques de código | Foco por teclado en los siete bloques |

**Candidata final:** **0 infracciones automáticas axe-core** en las siete páginas. Estas pruebas **no equivalen a una certificación manual de WCAG 2.2 AA**. Falta evaluar exhaustivamente lector de pantalla, foco complejo, zoom 200–400 %, navegación con teclado asistido y usuarios con discapacidades.

## 4. Otros fallos corregidos y límites

- Los tres informes iniciales de Lighthouse detectaron 404 para `favicon.ico` del servidor de prueba. Se añadió en cada página `<link rel="icon" ...>` utilizando un archivo de marca existente. **No se creó ni descargó un recurso nuevo.**
- No se modificaron textos visibles, advertencias, títulos, enlaces originales, catálogo de 391 recursos, lógica de búsqueda, favoritos, formularios, simulaciones ni scripts existentes.
- `assets/css/nexus-stage3.css` permanece intacto.
- Lighthouse da métricas de laboratorio; no existen datos CrUX verificados en esta auditoría.
- Se conservan las dependencias de producción: Playwright, axe-core y Lighthouse se instalan **únicamente en CI** con versiones explícitas, sin scripts de instalación.

## 5. Puerta de calidad automatizada

El PR agrega cuatro scripts:
- `scripts/audit_nexus_stage4.cjs`: paridad producción, axe, reporte y ausencia de regresiones; exige cero violaciones automáticas en candidata.
- `scripts/summarize_nexus_lighthouse.cjs`: consolida puntuaciones y métricas sin fabricar INP de campo.
- `scripts/probe_nexus_layout_shift.cjs`: fuentes/CLS en tamaños móvil y escritorio.
- `scripts/verify_nexus_stage4_preservation.cjs`: recuperación byte a byte de siete páginas tras retirar modificaciones autorizadas.

La CI guarda `nexus-stage4-quality` por 30 días con los JSON de auditoría, diagnósticos de CLS y Lighthouse. Corridas finales: **live-browser PASS, preview-browser PASS, quality-stage4 PASS**.

## 6. Pendientes y decisión de publicación

**P1 antes de declarar certificación WCAG 2.2 AA:** revisión manual con teclado, lector de pantalla y al menos un dispositivo móvil físico.  
**P1 para Core Web Vitals de campo:** obtener CrUX/RUM y comprobar p75 de LCP, CLS e INP cuando el tráfico lo permita.  
**P2 de rendimiento:** mediana de tres ejecuciones Lighthouse en red controlada y vigilancia de cambios en dependencias externas (Google Fonts).  
**P2 de cobertura:** Lighthouse móvil extendido a REA, Intelligence, Resiliencia, Windows y Silicon.

**Decisión actual:** mantener PR #15 sin fusionar ni publicar hasta revisión/consentimiento. Los resultados finales autorizan revisión técnica, no afirman certificación manual completa.
