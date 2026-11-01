# AI Progress: especificación

> Borrador mínimo creado en la Fase 0. Ampliar cuando se defina cada fase.

## Objetivo
App de escritorio para seguir el aprendizaje de IA: roadmap interactivo, tareas que se marcan con animaciones, racha de estudio y, más adelante, un coach con IA que lee el progreso y examina.

## Datos
- `data/roadmap.json`: roadmap de estudio, de solo lectura. Contiene habilidades (`skills`, con dependencias `requires`), fases, semanas y tareas, cada una con su `id` estable.
- `progress.json`: progreso del usuario. Vive en la carpeta de datos de la app (en Windows, `%APPDATA%\com.enrique.aiprogress\progress.json`), no en el repo. Referencia tareas solo por `id`:

  ```json
  { "version": 1, "completed": { "w1-setup": "2026-11-02T18:30:00Z" } }
  ```

  Cada tarea completada guarda cuándo se completó (UTC). Desmarcarla la borra.

## Fases
- **Fase 0, arranque:** proyecto Tauri + React + TypeScript, Tailwind, Motion y un comando en Rust que carga el roadmap y lo muestra.
- **Fase 1, progreso:**
  - Marcar y desmarcar tareas; se guarda al momento en `progress.json` desde Rust (escritura atómica: archivo temporal y renombrado).
  - Rust rechaza ids de tarea que no existan en el roadmap.
  - Barra de progreso global y por semana; aviso animado al completar una semana.
  - Racha de estudio: días seguidos (hora local) con al menos una tarea completada. Sigue viva si el último día fue hoy o ayer. También se muestra la racha más larga.
  - Se marca la semana actual según la fecha de hoy.
  - Si `progress.json` está corrupto, se renombra a `progress.corrupt-<fecha>.json` y se empieza de cero sin perder el archivo.
- **Fase 2, mapa de habilidades:**
  - Pestañas "Roadmap" y "Habilidades"; la cabecera (racha y progreso total) es común.
  - Grafo con React Flow: un nodo por habilidad y una flecha de cada requisito (`requires`) a la habilidad que lo necesita, ordenados en columnas por profundidad.
  - El progreso de una habilidad son las tareas que la incluyen en `skills`. Estados: bloqueada (algún requisito sin completar), disponible, en curso, completada.
  - Al pulsar un nodo se ven sus requisitos y sus tareas, que se pueden marcar desde ahí.
  - Un test de Rust garantiza que el roadmap solo referencia habilidades que existen y que el grafo no tiene ciclos.
- **Fase 3, coach con IA (Claude):**
  - Pestaña "Coach". Todas las llamadas a la API de Claude se hacen desde Rust (HTTP a `POST /v1/messages`, modelo `claude-opus-5-5`, salida estructurada con JSON Schema).
  - Clave de API: se guarda en el Administrador de credenciales de Windows (crate `keyring`), nunca en archivos ni en git. Si existe la variable de entorno `ANTHROPIC_API_KEY`, tiene prioridad.
  - **Revisión:** el coach recibe el roadmap, las tareas hechas y pendientes, la racha y la fecha de hoy, y devuelve un resumen, un consejo y hasta 3 tareas siguientes (ids validados contra el roadmap).
  - **Examen:** para una habilidad elegida, genera 5 preguntas tipo test (4 opciones, una correcta, con explicación) adaptadas a las tareas de esa habilidad. Se corrigen en la interfaz; de momento no se guardan los resultados.
  - Errores claros en español: falta la clave, clave no válida, límite de uso, sin conexión, respuesta rechazada.
