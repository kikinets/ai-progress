# AI Progress: especificación

> Borrador mínimo creado en la Fase 0. Ampliar cuando se defina cada fase.

## Objetivo
App de escritorio para seguir el aprendizaje de IA: roadmap interactivo, tareas que se marcan con animaciones, racha de estudio y, más adelante, un coach con IA que lee el progreso y examina.

## Datos
- `data/roadmap.json`: roadmap de estudio, de solo lectura. Contiene habilidades (`skills`, con dependencias `requires`), fases, semanas y tareas, cada una con su `id` estable.
- `progress.json`: progreso del usuario (tareas completadas, fechas, racha). Referencia tareas solo por `id`. Aún sin definir.

## Fases
- **Fase 0, arranque:** proyecto Tauri + React + TypeScript, Tailwind, Motion y un comando en Rust que carga el roadmap y lo muestra.
- **Fase 1:** por definir (marcar tareas, `progress.json`, racha).
- **Fase 2:** mapa de habilidades con React Flow.
- **Fase 3:** coach con IA.
