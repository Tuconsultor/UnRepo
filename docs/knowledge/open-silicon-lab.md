# Open Silicon Lab — democratizar el diseño de semiconductores

**Corte de fuentes:** 21 de noviembre de 2026  
**Estado:** implementación propuesta en rama de PR; **no desplegado** a producción.  
**Objetivo:** ofrecer una ruta didáctica desde lógica digital hasta un posible envío a fabricación compartida, con evidencia, límites y trazabilidad, sin prometer resultados no comprobados.

## Hipótesis de impacto

Herramientas abiertas de síntesis y diseño físico reducen una barrera de entrada histórica. Esa disponibilidad **no** elimina la necesidad de formación, verificación, bibliotecas de proceso, fondos, acceso a fabricación ni pruebas físicas. No afirmar que cualquier persona puede fabricar un chip puntero de forma gratuita.

## Cadena de capacidad documentada

1. **RTL / síntesis:** [Yosys](https://github.com/YosysHQ/yosys), licencia **ISC** documentada en [COPYING](https://github.com/YosysHQ/yosys/blob/main/COPYING), README de la rama principal. Transformación de RTL compatible en representación lógica. No equivale a verificación funcional.
2. **Flujo ASIC:** [LibreLane](https://github.com/librelane/librelane), licencia **Apache-2.0** documentada en [License](https://github.com/librelane/librelane/blob/main/License), [Readme.md](https://github.com/librelane/librelane/blob/main/Readme.md) y [documentación](https://librelane.readthedocs.io/en/stable/). Orquesta herramientas y etapas para diseños digitales; depende de tecnología, restricciones y PDK.
3. **Diseño físico:** [OpenROAD](https://github.com/The-OpenROAD-Project/OpenROAD), licencia **BSD-3-Clause** documentada en [LICENSE](https://github.com/The-OpenROAD-Project/OpenROAD/blob/master/LICENSE) y [README](https://github.com/The-OpenROAD-Project/OpenROAD/blob/master/README.md). Automatiza implementación física dentro de flujos compatibles; no fabrica chips.
4. **Fabricación compartida:** [Tiny Tapeout](https://www.tinytapeout.com/), [convocatorias y chips](https://www.tinytapeout.com/chips/), [guía de envío](https://www.tinytapeout.com/guides/advanced-workshop/submit-your-design/). Es un servicio/programa, **no** una licencia de software; cada shuttle tiene sus propios límites, costos y fechas.

## Evidencia de aplicación real

- [Competencia 2026 de emulador de protocolos ASIC](https://blog.janestreet.com/protocol-emulator-asic-competition/): caso real de convocatoria a diseñar hardware abierto con Tiny Tapeout. Un concurso **no** equivale a que todas las candidaturas sean aceptadas o fabricadas.
- El proyecto OpenROAD documenta su uso en flujos físicos y en tapeouts. Ese historial de proyecto **no** es una prueba de que nuestras herramientas se hayan instalado o ejecutado en UnRepo.

## Ejercicios diseñados

**Ejercicio A: circuito reversible de aprendizaje**

- Crear un contador de 4 bits y elaborar testbench para comprobar reset y secuencia.
- Ejecutar simulación y síntesis en entorno autorizado, si el usuario decide preparar ambiente local. No se ha hecho aquí.
- Registrar evidencia: código, tests, versiones, errores, netlist, diferencias entre simulación y RTL esperado.

**Ejercicio B: preparación de un chip pequeño**

- Elegir una función digital sencilla, definir entradas/salidas y restricciones.
- Usar el flujo de implementación que admita el PDK y shuttle seleccionado.
- Comprobar DRC/LVS, temporización y requisitos de entrega.
- Evaluar tarifa, proceso, plazo, disponibilidad y riesgos antes de considerar un pago o envío.
- No realizar solicitud de fabricación sin decisión expresa del propietario del diseño.

## Matriz de límites

| Afirmación | Estado |
| --- | --- |
| Existen herramientas abiertas para síntesis y diseño físico | Documentalmente contrastado |
| Los tres repositorios no estaban archivados al revisar | GitHub, consulta de metadatos en esta sesión |
| Los cuatro recursos se han probado ejecutándose en un equipo | **No** |
| El flujo propuesto pasa tests de un PDK concreto | **No** |
| El diseño RTL de ejemplo fue simulado y sintetizado | **No** |
| Tiny Tapeout acepta cualquier proyecto o no cobra | **Falso como garantía**; sujeto a condiciones |
| El contenido nuevo está publicado | Pendiente de PR, merge, despliegue y Chromium de producción |

## Neutralidad editorial y calidad

- Considerar evidencia de origen, metodología, mantenimiento, licencia y accesibilidad; no el prestigio de una institución como prueba suficiente.
- No afirmar ausencia absoluta de sesgos: exponer criterios, conflictos y omisiones para que puedan auditarse.
- Preservar IDs del catálogo, favoritos, Easter Egg, rutas y recursos anteriores.
- No ejecutar software de terceros, ni instalar paquetes, ni acceder a infraestructura externa de fabricación.
- Usar estados **IMPLEMENTADO**, **VALIDADO**, **PUBLICADO**, **OPERATIVO**, **PENDIENTE**, **BLOQUEADO** con evidencia separada.

## Plan de integración técnica

1. Crear `silicon-lab.html` autónomo y accesible, sin dependencias externas ejecutables.
2. Añadir cuatro fichas en `index.html`, categoría `silicon`, metadatos y banner; reflejar 1:1 en `data/catalog.json`.
3. Agregar ruta al validador y al flujo de publicación en `gh-pages`.
4. Añadir pruebas Chromium de la previsualización: 387 tarjetas, filtro silicon, cuatro enlaces y guía de laboratorio.
5. Abrir PR **sin auto-merge**. Validar CI y revisión antes de despliegue; repetir navegador real después del merge.
