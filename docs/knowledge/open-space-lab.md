# Open Space Lab — dossier de implementación

**Proyecto:** UnRepo Nexus  
**Preparación:** 22 de noviembre de 2026 (UTC)  
**Rama:** feat/open-space-lab-20261122  
**Publicación:** pendiente de pruebas, PR y despliegue.

## Objetivo

Abrir el acceso a observaciones de satélites, cálculo orbital y arquitectura de software de misión mediante herramientas abiertas, sin confundir observar, simular, visualizar, transmitir o controlar.

## Cuatro fuentes complementarias

| Recurso | Evidencia primaria | Acceso y límites |
| --- | --- | --- |
| SatNOGS Network | https://network.satnogs.org/ ; https://docs.satnogs.org/projects/satnogs-network/en/latest/api.html | Observaciones públicas y API de consulta. Datos CC BY-SA según proyecto; las observaciones pueden ser incompletas, erróneas o no decodificadas. La recepción y transmisión son actividades distintas. |
| Orekit | https://github.com/CS-SI/Orekit/blob/develop/README.md ; https://github.com/CS-SI/Orekit/blob/develop/LICENSE.txt | Biblioteca Java de astrodinámica; Apache-2.0. GitHub es espejo oficial del proyecto en GitLab. Para una posición real necesita fecha, efemérides y modelo apropiados. |
| Open MCT | https://github.com/nasa/openmct/blob/master/README.md ; https://github.com/nasa/openmct/blob/master/LICENSE.md | Framework de visualización de misión de NASA; Apache-2.0. No suministra datos de una nave sin integración propia. |
| NASA cFS | https://github.com/nasa/cFS/blob/dev/README.md ; https://github.com/nasa/cFS/blob/dev/LICENSE | Bundle de demostración de software de vuelo; Apache-2.0 según el repositorio; submódulos con términos propios. NASA declara explícitamente que no es una distribución lista para vuelo ni totalmente verificada. |

## Experiencia interactiva propia

Página \`space-lab.html\`, sin librerías JavaScript externas ni solicitudes de red.

- Perfiles didácticos: LEO 420 km / 51.6°, SSO 550 km / 97.6° y MEO 20,200 km / 55°. Son **ejemplos ideales**, no datos en vivo ni asignaciones a satélites reales.
- Controles de altitud (200–36,000 km) e inclinación (0–180°), selección y reset; animación orbital pausada cuando se solicita movimiento reducido.
- Periodo bajo gravedad central esférica: \`T=2*pi*sqrt((R+h)^3/mu)\`.
- Velocidad circular: \`v=sqrt(mu/(R+h))\`.
- Revoluciones/día ideal: \`N=86400/T\`.
- Radio de horizonte geográfico sobre superficie, como longitud de arco: \`d=R*acos(R/(R+h))\`.
- Constantes: \`mu=398600.4418 km^3/s^2\`, \`R=6371 km\`.
- El diagrama no está a escala ni calcula coordenadas, latitud/longitud, TLE, Doppler, elevación sobre estación, perturbaciones o propagación real.

### Ejemplo numérico reproducible

Para \`h=420 km\`, \`r=6791 km\`. Periodo ideal cercano a 93 minutos y velocidad circular cercana a 7.66 km/s. Los valores definitivos se generan al modificar controles; **un test en navegador deberá comprobar el comportamiento**, no se afirma que la simulación haya sido probada todavía.

### No confundir con acceso real

El botón "Explorar observaciones reales" abre \`https://network.satnogs.org/observations/\` en una nueva pestaña; el usuario consulta la fuente original. No se representa información real en el panel, y no se programan estaciones ni se envían señales.

## Dos ejercicios

1. **Diario de una observación SatNOGS:** objeto, fecha UTC, estación, resultados, archivo disponible y nivel de confianza. Debe citarse la licencia y atribución del material.
2. **Prototipo orbital educativo:** comparar perfiles, anotar supuestos y traducir requerimientos de telemetría hacia arquitectura con Orekit, Open MCT y eventualmente cFS sólo en un entorno aislado y autorizado.

## Criterios editoriales de imparcialidad

- Evaluar recursos por funciones, fuentes, licencias y límites técnicos; ni patrocinios ni nacionalidad son criterios de calidad.
- Identificar conflictos, datos faltantes y verificaciones pendientes.
- No presentar "sin sesgos" como garantía absoluta: publicar criterios auditables y permitir corrección basada en evidencia.
- No ejecutar código ajeno ni requerir credenciales o permisos de transmisor.

## Estados esperados

- **IMPLEMENTADO**: código en rama con HTML, script y recursos del catálogo.
- **VALIDADO**: validadores CI y Chromium con pruebas reales, incluida interacción con controles.
- **PUBLICADO**: commit presente en gh-pages y despliegue de Pages exitoso.
- **OPERATIVO**: página pública probada en navegador real después del último despliegue.
- **PENDIENTE**: verificación de un dato o condición concreta.
- **BLOQUEADO**: indisponibilidad de API, permisos o infraestructura.

La publicación no depende de adquirir hardware, establecer comunicación con un satélite ni instalar bibliotecas externas.
