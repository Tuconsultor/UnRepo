# UnRepo Nexus — Continuidad operativa

**Fecha de corte:** 2026-11-21; validación de CI finalizada 2026-11-22 00:01 UTC  
**Rama de intervención:** `audit/nexus-p0-continuity-20261121`  
**Origen (main):** `ea0e0351412f01c0f90b31ce08c86e00a6c51b49`  
**Último commit funcional validado:** `18a4c2fad946faeef2e23c302dddd16083da9f57` (consultar HEAD de la rama para cambios de documentación posteriores)  
**Rama de despliegue existente (gh-pages):** `051787f6fb7862d57f68478941617bf94dea48f3`  
**PR:** [#7 — audit(nexus): browser P0 repair](https://github.com/Tuconsultor/UnRepo/pull/7), **draft**, no fusionado.

## Estado comprobado

| Ámbito | Estado | Evidencia | Alcance |
|---|---|---|---|
| GitHub Pages deploy | PASS | [run 44953141253](https://github.com/Tuconsultor/UnRepo/actions/runs/44953141253) | Build/deploy exitosos de `main`; no demuestra por sí solo interacción |
| Render del catálogo público | PASS | [log Chromium run 44953095050](https://github.com/Tuconsultor/UnRepo/actions/runs/44953095050) | Al menos 375 tarjetas disponibles en navegador real |
| Caché pública GitHub | PASS | Mismo run, paso de metadata | 267 registros y 14 incorporaciones previas presentes |
| Búsqueda y categoría en escritorio | PASS | Mismo run | AudioCraft y filtro sonido |
| Easter Egg escritorio | PASS | Mismo run | Secuencia xus y dos enlaces |
| Easter Egg móvil | PASS | [run 44964512024](https://github.com/Tuconsultor/UnRepo/actions/runs/44964512024) | Chromium real; se corrigió sincronización del test con sidebar |
| Favoritos, recarga, orden, paginación, vacío | PASS | [run 44964512024](https://github.com/Tuconsultor/UnRepo/actions/runs/44964512024) | Pruebas funcionales reales de producción |
| Sitio sin caché de metadatos | PASS | [run 44964512024](https://github.com/Tuconsultor/UnRepo/actions/runs/44964512024) | Catálogo carga aunque fetch de metadata falle |
| Integridad de catálogo JSON | PASS | [run 44964512010](https://github.com/Tuconsultor/UnRepo/actions/runs/44964512010) | 380 recursos únicos, 272 GitHub, 267 en caché; equivalencia exacta con HTML |
| Configuración exacta de Pages | NOT VERIFIED | La API de configuración no estuvo disponible desde esta conexión | No inferir desde nombres de ramas |

**Nota de evidencia:** una extracción web almacenada mostró una portada antigua `AgentSec` con `0 recursos`, mientras la ejecución real posterior en Chromium de GitHub Actions sí renderizó UnRepo Nexus con 375+. Para evaluar producción se privilegia el navegador real más reciente; la captura estática no es prueba actual de fallo.

## Inventarios

- `main` al inicio: **375 fichas, 20 categorías**, 267 repositorios únicos con datos GitHub y 54 candidatos en cola; auditoría histórica: `docs/site-health-2026-11-21.md`.
- `main` y `gh-pages`: `index.html` y `data/github-metadata.json` mostraron blobs SHA idénticos en esta lectura. Los historiales están divergidos; no fusionar ramas automáticamente.
- **Rama de intervención:** 380 fichas en `index.html` y 380 registros espejo en `data/catalog.json`. Ninguno de estos cinco recursos nuevos está aún confirmado como PUBLICADO.
- **Primera cohorte:** cantools, evcc, Zigbee2MQTT, fq y Legacy Update. Se consultaron su ficha de repositorio GitHub y README primario; sin instalación ni ejecución. `data/discovery-review-log.json` registra las comprobaciones.
- **Cola restante:** 54 fichas históricas, de las cuales cinco han recibido revisión primaria en esta intervención y 49 no. El generador de descubrimiento reescribe periódicamente la cola: el registro separado evita perder las revisiones.

## Decisiones y restricciones vigentes

1. **Nada directo a producción:** revisar cambios y evidencias antes de merge. Esta rama no debe apuntar a `gh-pages`.
2. **Preservar IDs y favoritos:** en el esquema v1 cada `id` coincide exactamente con la URL histórica usada por `localStorage` (`unrepo-nexus-favorites-v1`).
3. **Migración por sombra:** `data/catalog.json` NO se consume todavía en producción. `index.html` sigue siendo la fuente de la interfaz. La metadata editorial enriquecida `RESOURCE_METADATA` y el estado GitHub remoto siguen en sus mecanismos actuales y requieren migración separada.
4. **Campos desconocidos explícitos:** se usa `null` y `pending_review`. No sustituirlos por conjeturas, ni tratar licencias de API como asesoría jurídica.
5. **Se conserva el Easter Egg** y las páginas REA, Intelligence, Resiliencia y Soporte.
6. **Neutralidad editorial:** los riesgos documentados no implican aprobación o condena; la integridad del catálogo tiene precedencia frente a metas numéricas.
7. **No se fusionan `main` y `gh-pages`:** las ramas divergen; publicar solo con el procedimiento validado.

## Incidencias priorizadas

- **P0: no se ha demostrado caída global del sitio.** La prueba pública evidencia funcionamiento de núcleo en escritorio.
- **P1 resuelto en cobertura:** favoritos, recarga, navegación móvil, orden y carga incremental superaron Chromium en el PR (sobre producción vigente).
- **P2 resuelto:** fallo del smoke móvil por intentar clicks durante la transición del sidebar y luego sobre el menú ya cerrado; secuencia reparada y PASS en Chromium.
- **P2:** la ingesta está limitada a índice externo de ingeniería inversa; falta pipeline multifuente y criterios de adopción trazables.
- **P2:** metadatos editoriales y recursos viven en HTML; la exportación JSON es **sólo primer tramo** de desacoplamiento.
- **P3:** comprobar en producción la fecha real de la información de Intelligence Lab: el informe previo está marcado como no verificado y fechado en octubre de 2026.

## Arquitectura incremental propuesta

```text
GitHub / GitLab / Codeberg / HF / arXiv / Zenodo / estándares
       |
       v
discovery adapters -> cola de candidatos (con fuente + timestamp)
       |
       v
normalización / canonical URL / deduplicación
       |
       v
validación primaria y revisión editorial (no autoinstalación)
       |
       v
data/catalog.json (schema v1, fuente auditable)
       |
       +--> metadata GitHub incremental (resiste fallos)
       |
       +--> frontend Nexus estático (migración futura, sin romper IDs)
       |
       v
PR + pruebas estáticas + Chromium móvil/escritorio + aprobación
       |
       v
GitHub Pages + smoke post-despliegue + rollback
```

**Fases de migración:** (1) snapshot y test de igualdad 1:1 con índice vigente; (2) migrar `RESOURCE_METADATA` sin perder licencia, advertencias ni estado; (3) introducir carga JSON con fallback comprobado; (4) después habilitar nuevas fuentes de descubrimiento y publicar por PR; (5) considerar automatización editorial únicamente con controles explícitos.

## Archivos introducidos o modificados

- `scripts/smoke_public_site.cjs`: sincronización real del menú móvil, favoritos persistentes, ordenar, paginar, vacío, cache GitHub caída, navegación móvil.
- `.github/workflows/live-site-smoke.yml`: ejecutar test también sobre PR.
- `index.html`: cinco fichas nuevas en rama de revisión con cautelas y metadata de procedencia.
- `data/catalog.json`, `data/catalog.schema.json`: espejo v1 con 380 entradas; la app actual **no** carga este archivo.
- `scripts/validate_catalog.py`: comprueba correspondencia con HTML y URLs duplicadas.
- `.github/workflows/catalog-integrity.yml`: gate estático en PR.
- `data/discovery-review-log.json`: registro de primera cohorte con evidencia primaria.
- `docs/CONTINUIDAD.md`: este registro de continuidad.

## Pruebas y criterios para aprobar merge

1. [x] GitHub Actions `Nexus catalog integrity`: PASS para validador anterior y nuevo; 380 URLs únicas y equivalencia sin pérdida.
2. [x] `Public Nexus browser smoke test` sobre PR: PASS para producción existente (el PR aún no despliega sus cinco recursos).
3. Revisión de diff de 5 nuevas fichas, metadatos y cautelas.
4. Aprobación del PR antes de merge (sin auto-merge).
5. Tras merge y publicación, repetir Chromium de producción y confirmar 380 recursos + 272 repositorios únicos GitHub si las cinco URLs se incorporan y la cache se renueva; **272 es una expectativa, no un resultado confirmado**.
6. Verificar integridad y persistencia de favoritos mediante una prueba con datos preexistentes.

## Reversión

- **Antes del merge:** cerrar el PR y descartar la rama; producción no cambia.
- **Tras merge:** revertir el merge desde GitHub mediante nuevo PR, ejecutar tests de integridad y forzar sincronización estándar desde `main` al sitio; no realizar `push --force` a `gh-pages`.

## Próximas tres acciones

1. Revisar diff y licencias de las cinco fichas, aprobar o corregir el [PR #7](https://github.com/Tuconsultor/UnRepo/pull/7) sin auto-merge.
2. Confirmar fuente configurada de Pages y, sólo tras merge aprobado, verificar en Chromium los 380 recursos publicados y el refresco de 272 repositorios GitHub.
3. Migrar `RESOURCE_METADATA` al esquema sin pérdida; después implementar adaptadores GitLab, Codeberg y arXiv con deduplicación y cola trazable.

## Cómo retomar este trabajo en otra conversación

Abrir `docs/CONTINUIDAD.md` y el PR asociado. Leer `main`, `gh-pages`, el HEAD de esta rama y el último run de los workflows. No asumir que los conteos de este documento siguen vigentes. Clasificar como IMPLEMENTADO, VALIDADO, PUBLICADO u OPERATIVO por evidencia, y retomar en la primera acción inconclusa.

## Continuación: revisión de fuentes y preview — 2026-11-21 (hora local)

**Último commit de código sometido a CI:** `b199dac61feaba52517e61e438b1b20e5c077f5a`. El HEAD posterior puede contener solamente cambios documentales; consultar el PR #7.

### Nuevas verificaciones de esta sesión

| Comprobación | Estado | Evidencia | Observaciones |
|---|---|---|---|
| CI de inventario versión propuesta | PASS | [GitHub Actions 44964986163](https://github.com/Tuconsultor/UnRepo/actions/runs/44964986163) | 380 fichas, 380 URLs únicas, sin pérdida de 375 originales |
| Intelligence Lab CI | PASS | [GitHub Actions 44964986158](https://github.com/Tuconsultor/UnRepo/actions/runs/44964986158) | Control de CI del PR |
| Chromium contra **rama propuesta** | PASS | [GitHub Actions 44964986154](https://github.com/Tuconsultor/UnRepo/actions/runs/44964986154), trabajo `preview-browser` | Sirvió archivos en servidor local efímero; 380 recursos y cinco fichas consultables; no publica |
| Chromium contra producción actual | PASS | Mismo run, trabajo `live-browser` | Regresiones del sitio de 375 fichas, con escritorio y móvil |
| Licencia raíz de las cinco fichas | DOCUMENTO VERIFICADO | `data/discovery-review-log.json` (enlaces oficiales) | MIT para cantools, evcc y fq; GPL-3.0 para Zigbee2MQTT; Apache-2.0 para Legacy Update |
| Revisión de dependencias, activos y uso en producción de herramientas externas | NOT RUN | No se ejecutó código de las fuentes catalogadas | Mantener alcance de la licencia raíz separado de modelos, datos y dependencias |
| Despliegue de 380 fichas | PENDIENTE | PR #7 sigue como borrador | No fusionar ni publicar sin autorización |

**Mejora de calidad:** antes las pruebas en PR sólo consultaban la URL de producción. Ahora el workflow tiene un trabajo Chromium aislado contra los archivos exactos de la rama propuesta, e inspecciona las cinco fichas nuevas mediante búsqueda y enlace de origen.

**Control de continuidad:** mantener el PR #7 en `draft` hasta aprobación. Si se aprueba, seguir el workflow existente de publicación y verificar el sitio desplegado con 380 recursos; después revisar que `data/github-metadata.json` cubra 272 repositorios. El total 272 es un conteo del catálogo propuesto, no un dato confirmado de metadatos publicados.

**Tres próximas acciones ajustadas:**
1. Revisar y aprobar explícitamente el PR #7 para su posible integración, manteniendo la lista histórica íntegra y las licencias documentadas.
2. Tras el merge autorizado, verificar despliegue, 380 tarjetas, 272 repositorios con metadatos actualizados y registrar la prueba Chromium post-publicación.
3. Hacer la migración incremental de `RESOURCE_METADATA` al JSON con validador de equivalencia, más adaptadores multifuente controlados sin autopublicación.
