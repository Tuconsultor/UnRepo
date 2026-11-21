# UnRepo Nexus — Continuidad operativa

**Fecha de corte:** 2026-11-21  
**Rama de intervención:** `audit/nexus-p0-continuity-20261121`  
**Origen (main):** `ea0e0351412f01c0f90b31ce08c86e00a6c51b49`  
**Commit de trabajo revisado:** `718f38df2a14890e1aae96c697fbc378c74c66f7` (los commits posteriores de documentación/PR se consultan en la rama)  
**Rama de despliegue existente (gh-pages):** `051787f6fb7862d57f68478941617bf94dea48f3`  
**PR:** por vincular tras su creación.

## Estado comprobado

| Ámbito | Estado | Evidencia | Alcance |
|---|---|---|---|
| GitHub Pages deploy | PASS | [run 44953141253](https://github.com/Tuconsultor/UnRepo/actions/runs/44953141253) | Build/deploy exitosos de `main`; no demuestra por sí solo interacción |
| Render del catálogo público | PASS | [log Chromium run 44953095050](https://github.com/Tuconsultor/UnRepo/actions/runs/44953095050) | Al menos 375 tarjetas disponibles en navegador real |
| Caché pública GitHub | PASS | Mismo run, paso de metadata | 267 registros y 14 incorporaciones previas presentes |
| Búsqueda y categoría en escritorio | PASS | Mismo run | AudioCraft y filtro sonido |
| Easter Egg escritorio | PASS | Mismo run | Secuencia xus y dos enlaces |
| Easter Egg móvil | FAIL (test histórico) | Mismo run | `locator.click: Element is outside of the viewport` mientras el sidebar entraba en pantalla; aún no prueba defecto real del usuario |
| Favoritos, recarga, orden, paginación, vacío | NOT RUN contra producción | Test ampliado en PR | Requiere ejecución del nuevo smoke |
| Sitio sin caché de metadatos | NOT RUN | Test añadido en PR | Requiere ejecución del nuevo smoke |
| Integridad de catálogo JSON | NOT RUN en GitHub Actions | `scripts/validate_catalog.py` y workflow propuestos | Pendiente resultado de CI sobre el PR |
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
- **P1:** no había prueba de persistencia de favoritos ni navegación móvil completa; se ampliaron los checks, pendientes CI.
- **P2:** fallo del smoke móvil por iniciar clicks durante transición visual del menú lateral; se incluyó espera geométrica real antes del click.
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

1. GitHub Actions `Nexus catalog integrity`: PASS para validador anterior y nuevo; 380 URLs únicas y equivalencia sin pérdida.
2. `Public Nexus browser smoke test` sobre PR: PASS para producción existente (el PR aún no despliega sus cinco recursos).
3. Revisión de diff de 5 nuevas fichas, metadatos y cautelas.
4. Aprobación del PR antes de merge (sin auto-merge).
5. Tras merge y publicación, repetir Chromium de producción y confirmar 380 recursos + 272 repositorios únicos GitHub si las cinco URLs se incorporan y la cache se renueva; **272 es una expectativa, no un resultado confirmado**.
6. Verificar integridad y persistencia de favoritos mediante una prueba con datos preexistentes.

## Reversión

- **Antes del merge:** cerrar el PR y descartar la rama; producción no cambia.
- **Tras merge:** revertir el merge desde GitHub mediante nuevo PR, ejecutar tests de integridad y forzar sincronización estándar desde `main` al sitio; no realizar `push --force` a `gh-pages`.

## Próximas tres acciones

1. Consultar los resultados de los dos workflows del PR, logs, captura y JSON de Chromium; corregir cualquier FAIL con evidencia.
2. Reconciliar por ruta la configuración Pages/branch, verificar HEAD de `main` y `gh-pages`, y aprobar solo una publicación trazable.
3. Migrar `RESOURCE_METADATA` al esquema sin pérdida; después empezar adaptadores públicos GitLab, Codeberg y arXiv con deduplicación y cola reproducible.

## Cómo retomar este trabajo en otra conversación

Abrir `docs/CONTINUIDAD.md` y el PR asociado. Leer `main`, `gh-pages`, el HEAD de esta rama y el último run de los workflows. No asumir que los conteos de este documento siguen vigentes. Clasificar como IMPLEMENTADO, VALIDADO, PUBLICADO u OPERATIVO por evidencia, y retomar en la primera acción inconclusa.
