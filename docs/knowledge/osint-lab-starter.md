# OSINT Lab — primera cohorte editorial (propuesta)

**Proyecto:** UnRepo Nexus  
**Fecha de preparación:** 2026-11-21  
**Estado:** IMPLEMENTADO EN RAMA DE PR / NO PUBLICADO. Tres fichas y un acceso visible a OSINT Lab ya se incorporaron al \`index.html\` y al espejo \`data/catalog.json\` en la rama de revisión; aún falta prueba de CI, aprobación, despliegue y verificación posterior. No se instalaron ni ejecutaron las herramientas externas.  
**Alcance:** tres herramientas complementarias a las entradas OSINT ya presentes en `data/catalog.json`.

## Propósito

Facilitar acceso comprensible y verificable a técnicas de investigación de fuentes abiertas: geolocalización de elementos públicos, reconocimiento de activos de una organización propia y análisis de metadatos de archivos.

**Límites editoriales:** el catálogo explica métodos y su alcance sin presentar como auténtica una evidencia que no ha sido corroborada. No publicar información privada de terceros ni tratar afirmaciones de un proveedor como prueba independiente.

## Herramientas candidatas

### 1. Overpass Turbo — exploración geoespacial

- **Canónica:** https://overpass-turbo.eu/
- **Código fuente:** https://github.com/tyrasd/overpass-turbo
- **Categoría propuesta:** OSINT / Geolocalización
- **Capacidad:** consultar, filtrar y visualizar objetos registrados en OpenStreetMap mediante Overpass API.
- **Uso reproducible:** identificar edificios, vialidades y elementos cartografiados en una zona para contrastarlos con pistas de una fotografía pública.
- **Nivel orientativo:** intermedio; interfaz web, consultas Overpass QL.
- **Limitaciones:** datos colaborativos que pueden estar incompletos, desactualizados o mal clasificados. La herramienta **no** demuestra por sí misma dónde fue tomada una imagen.
- **Verificado documentalmente:** README y licencia MIT del repositorio consultados. **No** se ejecutó una consulta.

### 2. SpiderFoot — reconocimiento OSINT automatizado

- **Canónica:** https://github.com/smicallef/spiderfoot
- **Documentación:** https://github.com/smicallef/spiderfoot/blob/master/README.md
- **Categoría propuesta:** OSINT / Investigación digital
- **Capacidad:** combinar fuentes públicas para mapear dominios, subdominios, direcciones IP y exposición digital. Interfaz web y CLI; módulos e integraciones opcionales.
- **Uso reproducible:** elaborar inventario de activos digitales de un dominio propio, contrastando los hallazgos con DNS y registros que controla su responsable.
- **Nivel orientativo:** avanzado; requiere instalación y conocimiento de redes.
- **Limitaciones:** algunos módulos requieren claves de API, devuelven falsos positivos o pueden realizar consultas activas. Restringir exploración activa a sistemas propios o expresamente autorizados. No inferir identidad o culpabilidad por coincidencias.
- **Licencia comprobada:** MIT en el archivo LICENSE del repositorio.
- **Verificado documentalmente:** README del proyecto consultado. **No** se instaló ni ejecutó.

### 3. ExifTool — lectura de metadatos

- **Canónica:** https://exiftool.org/
- **Código fuente:** https://github.com/exiftool/exiftool
- **Categoría propuesta:** OSINT / Verificación forense
- **Capacidad:** leer, extraer y escribir metadatos de múltiples formatos; entre ellos EXIF, XMP y datos GPS cuando existen.
- **Uso reproducible:** examinar una fotografía original de prueba para registrar cámara, fecha y coordenadas **si** esos campos están presentes; contrastar con evidencias independientes.
- **Nivel orientativo:** intermedio; línea de comandos.
- **Limitaciones:** redes sociales pueden eliminar metadatos; los campos pueden faltar, ser erróneos o modificarse. La presencia de una fecha o GPS **no** autentica una imagen ni prueba que represente un acontecimiento.
- **Fuente principal:** sitio del autor, Phil Harvey, y repositorio del proyecto.
- **Verificado documentalmente:** README y LICENSE del repositorio consultados; el README indica licencia Perl Artistic o GPL. **No** se descargó ni analizó archivo alguno.

## Recurso didáctico transversal

- [Bellingcat — Online Investigation Toolkit](https://bellingcat.gitbook.io/toolkit)
- [Código y contenido editorial](https://github.com/bellingcat/toolkit)
- Uso previsto: itinerarios de aprendizaje, contraste de métodos y descubrimiento de técnicas, **no** sustituto de validación individual de las herramientas.

## Dos ejercicios iniciales, sin datos privados

1. **Geolocalización contextual:** usar una fotografía publicada de un edificio público y contrastar elementos visibles con OpenStreetMap/Overpass y fuentes municipales; entregar hipótesis de ubicación, evidencias, contraejemplos y grado de confianza.
2. **Auditoría de evidencia digital:** examinar una fotografía de prueba creada por el propio investigador con ExifTool y contrastar los campos con su origen, explicando qué permiten concluir y qué no. Como módulo siguiente, usar SpiderFoot únicamente sobre un dominio propio.

## Integración propuesta en Nexus

1. Revisar manualmente si los tres URL canónicos ya constan en `data/catalog.json` / `index.html` para evitar duplicados.
2. [x] Consultar fuentes primarias y licencias; reflejar requisitos, límites y advertencias, con la revisión técnica aún pendiente.
3. [x] Añadir fichas a PR #9, conservando los IDs heredados y la ruta de favoritos.
4. [ ] Confirmar resultados de validadores del catálogo y del sitio + prueba Chromium de escritorio/móvil antes del merge.
5. Aprobar y desplegar por el flujo documentado; confirmar publicación efectiva y funcionamiento real.

## Evidencia y responsabilidades

- **IMPLEMENTADO (esta rama):** documento editorial, tres fichas en el catálogo espejo e inline, categoría OSINT y banner con filtro funcional en código; pruebas de navegador en CI añadidas.
- **VALIDADO:** lectura documental, comprobación preliminar de deduplicación y consistencia entre URL de los dos inventarios; pendiente constancia de CI/Chromium para declarar validación funcional.
- **PUBLICADO:** no.
- **OPERATIVO en navegador real:** no comprobado para esta nueva sección.
- **PENDIENTE:** resultados de CI y Chromium de previsualización, aprobación, despliegue y smoke posterior.

La neutralidad del conocimiento no elimina la necesidad de documentar límites, condiciones de uso y confiabilidad de la evidencia.
