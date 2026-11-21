# UnRepo Nexus — Auditoría de publicación y curaduría

**Fecha:** 21 de noviembre de 2026.  
**Estado de esta auditoría:** revisión de código y repositorio completada; prueba de experiencia pública en navegador pendiente.  
**Repositorio:** https://github.com/tuconsultor/UnRepo  
**Sitio esperado:** https://tuconsultor.github.io/UnRepo/

## Resultados comprobados

| Comprobación | Resultado | Evidencia/alcance |
|---|---|---|
| Recursos del catálogo | **375** | Coinciden `main` y `gh-pages` |
| URLs duplicadas | **0** | Comparación normalizada en index.html |
| IDs HTML repetidos en portada | **0** | Revisión de 27 IDs |
| Repositorios GitHub catalogados | **267** | Extracción de rutas `owner/repo` de las fichas |
| Repositorios presentes en caché | **267 de 267** | Caché renovada en ambas ramas el 21/11/2026 a las 21:36:59 UTC |
| Repositorios con metadatos aún pendientes | **0** | La actualización posterior incorporó los 14 nuevos; ninguno quedó `not_verified` |
| Sintaxis JavaScript | **Sin errores detectados** | Compilación sintáctica de scripts inline de `index.html`, `rea-roadmap.html`, `intelligence.html` y `soporte-remoto-windows.html`; `resiliencia-agentes.html` no lleva script inline; no equivale a prueba de navegación |
| Ruta REA | **Archivo presente** | `rea-roadmap.html` en ambas ramas |
| Páginas adicionales | **Presentes** | `resiliencia-agentes.html` y `soporte-remoto-windows.html` en ambas ramas |
| Imagen social | **Restaurada y verificada** | Blob original `assets/social/unrepo-icon-2026.png` con SHA idéntica en `main` y `gh-pages` |
| Intelligence Lab | **Archivo presente** | `intelligence.html` en ambas ramas |
| Easter Egg | **Conservado** | Diálogo `nexusSecret`, secuencia `xus` y cinco toques en el símbolo |
| HTML de pie de página | **Corregido** | Se retiró anidamiento roto de etiquetas/comentarios preservando el texto visible |
| Nuevas categorías | **Habilidades de agentes, sonido, montaje y exportación** | Fichas etiquetadas en `index.html` |
| Dominio de riesgo | **Excluido** | `banxian888.vip` no se publica como recomendación |

## Cambios de integridad y prevención

- `scripts/validate_nexus.py` verifica archivos locales, URLs duplicadas, IDs, rutas, código JavaScript mediante Node.js, contenido requerido, esquema JSON de metadatos y preservación del Easter Egg.
- `.github/workflows/refresh-repo-metadata.yml` se amplió para ejecutar la validación y sincronizar las cinco páginas, la imagen social original y los archivos de datos en `gh-pages`.
- Se corrigió la prioridad de licencias para conservar excepciones verificadas editorialmente (por ejemplo, **MIT con Commons Clause**, en vez de confundirla con una licencia MIT permisiva).
- La fuente riesgosa se documentó en `docs/knowledge/pending-external-sources.md`, no en el catálogo.


## Verificación adicional: prueba pública automatizada

Se incorporó `scripts/smoke_public_site.cjs` y el workflow `.github/workflows/live-site-smoke.yml`. Está configurado para ejecutarse **al editar Nexus, bajo demanda y diariamente a las 07:15 UTC** mediante Chromium/Playwright real en GitHub Actions.

La prueba verifica HTTP 200, representación del catálogo (375+ recursos), las tres nuevas categorías de audiovisual, búsqueda de AudioCraft, filtro de sonido, activación del Easter Egg con teclado y toques de móvil, los dos vínculos ocultos, metadatos públicos de los 267 repositorios y las cinco rutas públicas de páginas/imagen. Guarda `result.json` y captura de pantalla como artefactos del workflow.

**Estado de evidencia:** la definición y sintaxis del test están verificadas, pero en esta sesión no fue posible consultar el resultado de ejecución de GitHub Actions ni utilizar un navegador conectado para certificar que el test haya pasado. Un workflow existente no equivale a una ejecución exitosa. Comprobar la marca verde y los artefactos en [Public Nexus browser smoke test](https://github.com/Tuconsultor/UnRepo/actions/workflows/live-site-smoke.yml).

## Límites y puntos pendientes de verificación

**1. Acceso público:** los intentos de consultar GitHub Pages desde esta sesión no permitieron obtener la página. La existencia e igualdad de archivos entre ramas **no prueba** que GitHub Pages sirva el contenido esperado ni que el comportamiento responda correctamente a eventos reales.

**2. GitHub Actions:** la caché se regeneró y pasó de 253 a 267 repositorios, sincronizada en ambas ramas. Esa actualización confirma funcionamiento del refresco de metadatos. Aun así, la herramienta no permitió inspeccionar los registros detallados del paso nuevo `Validate Nexus pages and JavaScript`, por lo que no se declara una ejecución completa de CI verificada.

**3. Intelligence Lab:** `data/intelligence/latest.json` declara `generated_at=2026-10-16T21:26:20.577355+00:00` y `verified=false`. El contenido debe tratarse como **informe histórico y no verificado**, no como inteligencia actualizada a noviembre.

**4. Seguridad externa:** la reputación de `banxian888.vip` fue señalada como posible phishing por una fuente de terceros. Es una alerta que justifica no catalogarlo, **no** una conclusión forense sobre su operador.

## Prueba final que debe realizarse en un navegador real

1. Abrir `https://tuconsultor.github.io/UnRepo/` y confirmar que el filtro **Habilidades de agentes** muestra las fichas nuevas (Superpowers, gstack, Beads y otras).
2. Buscar `GitHub MCP`, `Voicebox` y `Claude Academy`; comprobar que las tarjetas abren su destino correcto.
3. Activar el Easter Egg con `xus` fuera del buscador; verificar los enlaces personales y cerrar el diálogo.
4. Abrir `rea-roadmap.html`, marcar una etapa, recargar y comprobar que el progreso persiste; probar el botón copiar.
5. Abrir Intelligence Lab; confirmar que se ve la fecha del informe y no interpretarlo como informe de actualidad.
6. Revisar `GitHub → Actions → Refresh GitHub resource metadata`, confirmar que `Validate Nexus pages and JavaScript` terminó sin errores y que la caché contiene 267 de 267 repositorios.

Si cualquiera de estos puntos falla, la publicación debe considerarse parcialmente operativa hasta corregir la causa. No instalar automáticamente scripts de los repositorios externos ni asumir que su código es seguro sólo porque GitHub confirma que el repositorio existe.
