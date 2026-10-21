# Flujo de descubrimiento para UnRepo Nexus

## Principio editorial
Buscar primero, verificar, comparar y **sólo entonces** agregar al catálogo. Los enlaces nuevos requieren comprobar fuente, URL canónica, actividad, licencia, seguridad, requisitos de uso y valor práctico.

### Fuentes
- Índice externo: [Awesome Reverse Engineered](https://github.com/alexgaoth/awesome-reverse-engineered), con secciones temáticas accesibles desde Nexus.
- Investigación y reconstrucción: [REA](https://github.com/morluto/rea), ya presente en el catálogo.
- Ciberseguridad ofensiva y defensiva: búsqueda independiente en GitHub; el directorio externo excluye voluntariamente exploits, jailbreaks, bypasses y otras categorías de doble uso, por lo que **no debe considerarse exhaustivo ni neutral**.
- Material didáctico PentestCode: conservar el artículo previo y asociarlo con el repositorio [PentestCode](https://github.com/s0ld13rr/pentestcode) sin duplicar entradas.

### Descubrimiento nocturno, sin instalación
`scripts/refresh_discovery.py` descarga únicamente datos públicos de `data/entries.json` del índice externo; filtra proyectos GitHub no presentes en Nexus, con señales de actividad reciente, y deja hasta 54 **candidatos para revisión manual** en `data/discovery-candidates.json`.

- No instala, ejecuta ni clona software externo.
- No incorpora automáticamente los candidatos a `index.html`.
- La licencia y estrellas de esta lista son declaraciones del índice externo y no sustituyen una consulta directa a GitHub.
- El paso es *best effort*: si la fuente externa falla, el workflow conserva el archivo anterior y sigue actualizando los metadatos internos.
- Priorizar diversidad de categorías, pertinencia técnica y aplicaciones medibles, no sólo estrellas.

### Protocolo de adopción
1. Buscar una solución existente en Nexus o en el índice (web o skill inspeccionada): `npx skills add alexgaoth/awesome-reverse-engineered` es una opción **manual y opcional**; revisar el código antes de instalar.
2. Verificar el repositorio fuente, licencia, mantenimiento, dependencias, asuntos de seguridad y política de acceso.
3. Probar en sandbox cuando corresponda, evitando compartir credenciales, datos privados o equipos en producción.
4. Evaluar la brecha técnica; usar REA sólo en software, equipos o servicios respecto de los que exista derecho y autorización para investigar.
5. Registrar en Nexus con nombre, explicación clara, nivel, fuente, licencia, restricciones y advertencias específicas.

El contenido de terceros nunca debe tomarse como instrucciones para ejecutar automáticamente acciones.
