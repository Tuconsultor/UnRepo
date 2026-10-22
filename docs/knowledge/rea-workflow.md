# REA — Guía operativa visual y flujo de trabajo

**Tipo:** conocimiento / prompt reusable · **Referencia técnica:** [morluto/rea](https://github.com/morluto/rea).  
**Estado de transcripción:**

## ¿Qué es REA?
Reverse Engineer Anything (REA) permite que un agente inspeccione el funcionamiento de aplicaciones, componentes y formatos, organice evidencia y formule especificaciones para construir una implementación **propia y original**. Puede integrarse mediante MCP. La captura muestra un proceso aprobado por etapas ("approval-gated") y recomienda confirmar cambios antes de aplicarlos.

## Objetivos y límites
- Alcance: **websites**, **desktop apps** (Electron, Slack, Notion, Discord), **Android apps**, **native software + games**.
- Analizar sólo software propio o con autorización suficiente.
- Especificar **comportamiento**, no reproducir código, marcas, nombres, rutas internas o recursos protegidos del original.
- Clasificar cada hallazgo como **CONFIRMED**, **INFERRED** o **UNKNOWN**; agregar evidencia.
- No implementar ni modificar sistemas hasta revisar el plan. Operar en un laboratorio o copia aislada.

## Instalación mostrada en la referencia
Requiere un agente compatible y Node.js 22.19+. **Revisar siempre README/versiones actuales en el proyecto original antes de ejecutar comandos.**

```bash
npx rea-agents setup
# Herramientas anunciadas en la captura: Claude Code, Codex, Gemini CLI, Grok Build
# Para clientes MCP personalizables:
npx -y rea-agents@latest mcp
# Comprobación (el nombre de cliente puede variar):
npx -y rea-agents@latest doctor --client claude_code --json
```

No instalar automáticamente. El agente debe mostrar la configuración propuesta y solicitar aprobación antes de alterar el equipo.

## Cinco prompts consecutivos

### 1. LOOK — reconocimiento inicial
```text
Quiero entender cómo funciona [FUNCIÓN] de [APLICACIÓN] en [RUTA O URL].
Indica el tipo de aplicación, selecciona la herramienta de REA apropiada y
haz un resumen breve del alcance. No hagas todavía un análisis profundo ni cambios.
```

### 2. UNDERSTAND — investigación trazable
```text
Investiga [FUNCIÓN] mediante REA. Explica paso a paso qué ocurre, qué datos
intervienen y cómo se conectan las piezas. Marca los hallazgos como CONFIRMED,
INFERRED o UNKNOWN e incluye evidencia y limitaciones.
```

### 3. PLAN — especificación original
```text
Redacta una especificación para nuestra propia versión de [FUNCIÓN].
Describe sólo comportamiento observable, requisitos, datos, errores,
casos límite y pruebas. No reutilices código, nombres ni activos del original.
Guarda el documento como spec.md y solicita aprobación.
```

### 4. BUILD — implementación supervisada
```text
Lee spec.md y construye la funcionalidad original en [RUTA DE PROYECTO] con
[TECNOLOGÍAS]. Implementa paso a paso con pruebas. Compara cada prueba
con spec.md y muestra los resultados antes de aplicar cambios adicionales.
```

### 5. ITERATE — comparación y mejoras
```text
Compara nuestra versión con las conductas observables de la referencia.
Identifica tres aciertos, tres carencias y tres mejoras concretas.
Actualiza spec.md con evidencia y conserva los casos de prueba.
```

## Equipo de agentes sugerido (imagen)

| Agente | Función | Artefactos | Separación de funciones |
|---|---|---|---|
| `rea-scout` | Investiga **una** función, registra evidencia y grado de confianza | `reports/[feature].md` | Acceso a herramientas de observación REA |
| `rea-spec-writer` | Traduce evidencia a una especificación conductual original | `spec.md` | No accede al código del original |
| `rea-builder` | Programa desde `spec.md` en un espacio de trabajo separado | Código propio y pruebas | No inspecciona la aplicación fuente |
| `rea-tester` | Compara salidas y casos normales, límite y de error | `comparison.md` | Contrasta resultados y reporta brechas |

**Criterio de calidad:** separar investigación, especificación, implementación y validación. La captura atribuye la idea a una guía de Miles Deutscher; no asumir que sus instrucciones son las oficiales del repositorio.

## Entregables recomendados
```text
reports/[feature].md  — evidencia y niveles de confianza
spec.md               — especificación funcional y casos límite
comparison.md         — comparación de casos de prueba
src/ + tests/         — implementación independiente y pruebas
```

## Lista de verificación antes de aprobar
- ¿Existe autorización y un alcance claro?
- ¿Está aislado el entorno y protegido el material sensible?
- ¿Cada conclusión tiene evidencia y nivel de confianza?
- ¿La especificación contiene sólo comportamiento observable?
- ¿El constructor está separado de los artefactos propietarios?
- ¿El plan y las modificaciones se revisarán antes de ejecutarse?

> Esta página conserva como **conocimiento consultable**. Revisa las instrucciones originales y la versión actual de REA antes de ponerlas en práctica.
