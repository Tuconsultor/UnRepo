# UnRepo Nexus — Auditoría de publicación y curaduría

**Fecha:** 21 de noviembre de 2026.  
**Estado de esta auditoría:** revisión de código y repositorio completada; prueba de experiencia pública en navegador pendiente.  
**Repositorio:** https://github.com/tuconsultor/UnRepo  
**Sitio esperado:** https://tuconsultor.github.io/UnRepo/

## Resultados comprobados

| Comprobación | Resultado | Evidencia/alcance |
|---|---|---|
| Recursos del catálogo | **361** | Coinciden `main` y `gh-pages` |
| URLs duplicadas | **0** | Comparación normalizada en index.html |
| IDs HTML repetidos en portada | **0** | Revisión de 27 IDs |
| Repositorios GitHub catalogados | **253** | Extracción de rutas `owner/repo` de las fichas |
| Repositorios presentes en caché | **230 de 253** | `data/github-metadata.json` |
| Repositorios con metadatos aún pendientes | **23** | Todos corresponden a la nueva tanda del 21/11/2026 |
| Sintaxis JavaScript | **Sin errores detectados** | Compilación sintáctica de scripts inline de `index.html`, `rea-roadmap.html` e `intelligence.html`; no equivale a prueba de navegación |
| Ruta REA | **Archivo presente** | `rea-roadmap.html` en ambas ramas |
| Intelligence Lab | **Archivo presente** | `intelligence.html` en ambas ramas |
| Easter Egg | **Conservado** | Diálogo `nexusSecret`, secuencia `xus` y cinco toques en el símbolo |
| HTML de pie de página | **Corregido** | Se retiró anidamiento roto de etiquetas/comentarios preservando el texto visible |
| Nueva categoría | **Habilidades de agentes** | Fichas etiquetadas en `index.html` |
| Dominio de riesgo | **Excluido** | `banxian888.vip` no se publica como recomendación |

## Cambios de integridad y prevención

- `scripts/validate_nexus.py` verifica archivos locales, URLs duplicadas, IDs, rutas, código JavaScript mediante Node.js, contenido requerido, esquema JSON de metadatos y preservación del Easter Egg.
- `.github/workflows/refresh-repo-metadata.yml` se amplió para ejecutar la validación, detectar cambios en `intelligence.html` y sincronizarlo junto con portada, guía REA y archivos de datos a `gh-pages`.
- Se corrigió la prioridad de licencias para conservar excepciones verificadas editorialmente (por ejemplo, **MIT con Commons Clause**, en vez de confundirla con una licencia MIT permisiva).
- La fuente riesgosa se documentó en `docs/knowledge/pending-external-sources.md`, no en el catálogo.

## Límites y puntos pendientes de verificación

**1. Acceso público:** los intentos de consultar GitHub Pages desde esta sesión no permitieron obtener la página. La existencia e igualdad de archivos entre ramas **no prueba** que GitHub Pages sirva el contenido esperado ni que el comportamiento responda correctamente a eventos reales.

**2. GitHub Actions:** el workflow quedó configurado, pero no fue posible leer un resultado de ejecución exitoso desde esta sesión. Los 23 repositorios nuevos todavía no aparecen en la caché, por lo que datos como estrellas o última actualización pueden faltar en sus tarjetas hasta completar el refresco.

**3. Intelligence Lab:** `data/intelligence/latest.json` declara `generated_at=2026-10-16T21:26:20.577355+00:00` y `verified=false`. El contenido debe tratarse como **informe histórico y no verificado**, no como inteligencia actualizada a noviembre.

**4. Seguridad externa:** la reputación de `banxian888.vip` fue señalada como posible phishing por una fuente de terceros. Es una alerta que justifica no catalogarlo, **no** una conclusión forense sobre su operador.

## Prueba final que debe realizarse en un navegador real

1. Abrir `https://tuconsultor.github.io/UnRepo/` y confirmar que el filtro **Habilidades de agentes** muestra las fichas nuevas (Superpowers, gstack, Beads y otras).
2. Buscar `GitHub MCP`, `Voicebox` y `Claude Academy`; comprobar que las tarjetas abren su destino correcto.
3. Activar el Easter Egg con `xus` fuera del buscador; verificar los enlaces personales y cerrar el diálogo.
4. Abrir `rea-roadmap.html`, marcar una etapa, recargar y comprobar que el progreso persiste; probar el botón copiar.
5. Abrir Intelligence Lab; confirmar que se ve la fecha del informe y no interpretarlo como informe de actualidad.
6. Revisar `GitHub → Actions → Refresh GitHub resource metadata`, confirmar que `Validate Nexus pages and JavaScript` terminó sin errores y que la caché pasó de 230 a 253 repositorios.

Si cualquiera de estos puntos falla, la publicación debe considerarse parcialmente operativa hasta corregir la causa. No instalar automáticamente scripts de los repositorios externos ni asumir que su código es seguro sólo porque GitHub confirma que el repositorio existe.
