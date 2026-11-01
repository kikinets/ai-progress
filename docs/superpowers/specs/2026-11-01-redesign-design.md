# Rediseño de AI Progress (v2)

Fecha: 2026-11-01 · Estado: pendiente de revisión

## 1. Objetivo

La v1 funciona pero se queda corta: es una lista con poco detalle y poca vida. La v2 debe ser una app de escritorio **moderna, interactiva y muy cuidada visualmente**, más completa y con un **plan de estudio mucho más rico**.

**Criterios de éxito**

- Al abrir la app, en menos de 5 segundos sé qué toca hoy, cuánto llevo y cómo va mi racha.
- Cada tarea me dice qué hacer, por qué, con qué recursos, cuánto tiempo y cuándo está hecha.
- Estudiar se nota: el tiempo cuenta, subo de nivel y los logros se celebran.
- La app se ve al nivel de Linear o Raycast: oscura, nítida, con microanimaciones con sentido.
- No pierdo el progreso que ya tengo en la v1.

**Fuera de alcance**

- Contenido de la fase del bootcamp (sigue pendiente del temario de Ironhack).
- Sincronización entre dispositivos, cuentas o nube.
- Cambiar el modo gratis del coach por la API como opción por defecto.

## 2. Restricciones (no cambian)

- Tauri 2 + React + TypeScript + Vite + Tailwind CSS v4 + Motion.
- La interfaz solo pinta y anima. Leer y escribir archivos, red, portapapeles, notificaciones y **toda la lógica de dominio** (racha, XP, niveles, logros, estadísticas) viven en Rust y se testean con `cargo test`.
- `roadmap.json` (solo lectura, incrustado en el binario) y `progress.json` (datos del usuario, en `%APPDATA%\com.enrique.aiprogress\`) van separados; el progreso referencia tareas por `id`.
- Claves de API fuera del código y de git.
- Animaciones de 150 a 300 ms, muelles suaves para el progreso y respeto a `prefers-reduced-motion`.

## 3. Enfoque elegido

Evolucionar la app actual con un **sistema de diseño propio**. Se descartan shadcn/ui, porque su estética es muy reconocible e introduce mucho código ajeno, y SQLite, porque JSON basta para un único usuario.

**Dependencias nuevas**

| Paquete | Para qué |
| --- | --- |
| `@fontsource-variable/geist`, `@fontsource-variable/geist-mono` | Tipografía local, sin depender de la red |
| `lucide-react` | Iconos |
| `@radix-ui/react-dialog`, `@radix-ui/react-tooltip` | Panel lateral, modales y tooltips accesibles |
| `cmdk` | Paleta de comandos |
| `canvas-confetti` | Celebraciones |
| `react-markdown` | Vista previa de notas |
| `tauri-plugin-notification` (Rust y JS) | Aviso al terminar un pomodoro |

## 4. Estilo visual

- **Tema oscuro por defecto**, con el claro equivalente según `prefers-color-scheme` y un interruptor manual guardado en `localStorage`.
- **Tokens** en `index.css`:
  - Superficies: `bg` #0B0B0F, `surface-1` #121218, `surface-2` #1A1A22.
  - Bordes: `line` en blanco al 8 %.
  - Texto: `ink` #EDEDF2, `muted` #8B8B99.
  - Acento de progreso en degradado de `#8B5CF6` (violeta) a `#22D3EE` (cian).
  - Colores de estado: `success`, `warning` y `danger`.
- **Superficies:** borde de 1 px con un brillo superior sutil (sombra interior), radios de 10 a 14 px y una textura de ruido muy leve en el fondo.
- **Tipografía:** Geist para la interfaz y Geist Mono para números, temporizador y XP, con cifras tabulares.
- **Movimiento:**
  - Entrada de pantallas con fundido y 8 px de desplazamiento, 200 ms.
  - Listas con escalonado de 30 ms.
  - Barras y anillos con muelle (visualDuration 0.4, bounce 0.15).
  - Checkbox con trazo dibujado.
  - Contadores que cuentan hasta su valor.
  - Con movimiento reducido solo quedan los fundidos.

## 5. Estructura de la ventana

- **Barra lateral fija** de 220 px: logo, las secciones (Hoy, Plan, Habilidades, Logros, Coach), un mini temporizador (visible cuando hay una sesión activa) y el nivel con su barra de XP.
- **Paleta de comandos** con `Ctrl+K`: ir a una sección, buscar y abrir una tarea, iniciar o parar el temporizador y cambiar de tema.
- **Atajos:** `1` a `5` para las secciones, `Espacio` para pausar o reanudar el temporizador cuando no se está escribiendo, `Esc` para cerrar paneles.
- **Navegación** con un estado en `App` (sin router). La sección activa se marca con un indicador animado (`layoutId`).
- **Ventana** de 1280×820, con un mínimo de 1024×700.

## 6. Pantallas

### 6.1 Hoy

- Cabecera con saludo según la hora y la fecha ("Buenas tardes, Enrique · lunes 2 de noviembre").
- **Tareas de hoy:** las que el plan asigna a la fecha actual, más las de días anteriores que siguen pendientes, marcadas como "atrasada". Cada fila muestra el tipo, la estimación, una checkbox, el progreso de subtareas y un botón ▶ para estudiarla. Al pulsar la fila se abre el panel de tarea.
- **Temporizador:** una tarjeta grande con anillo animado (§7).
- **Racha:** número con un icono de llama que se anima al sumar un día, récord y aviso si hoy todavía no cuenta.
- **Semana:** anillo de minutos estudiados frente al objetivo semanal (`dailyTargetMinutes` × 6) y barras por día.
- **Nivel:** nivel actual, XP y barra hasta el siguiente nivel.
- **Actividad:** mapa de calor de las últimas 12 semanas (minutos por día, 5 tonos del acento) con un tooltip por día ("3 nov · 95 min · 4 tareas").
- **Próximo hito:** el siguiente entregable o la siguiente insignia más cercana, con lo que falta para conseguirla.
- **Sin tareas para hoy:** se muestra un estado vacío útil (por ejemplo, "Hoy es día de repaso" o "El plan empieza el 2 de nov").

### 6.2 Plan

- Encabezado con el progreso total en anillo y en barra.
- Una **línea de tiempo** vertical por semanas, plegables, con la actual abierta y resaltada. Cada semana lleva su objetivo, su progreso, sus horas reales frente a las estimadas y sus días.
- Cada **día** muestra la fecha, el título y el tipo (estudio o repaso), con sus tareas. Los días pasados con tareas pendientes llevan un aviso discreto.
- Filtros: todas, pendientes, entregables.
- Al pulsar una tarea se abre el **panel de tarea**.

### 6.3 Panel de tarea

Es un panel lateral derecho de 480 px, hecho con Radix Dialog con la presentación de un drawer. Se abre desde cualquier pantalla. Contiene:

- Título, tipo, habilidades (como chips), día asignado y una checkbox grande.
- **Qué es** (`description`) y **Por qué importa** (`why`).
- **Recursos:** una lista con un icono según el tipo (documentación, vídeo, curso, artículo o práctica). Se abren en el navegador mediante el plugin opener.
- **Subtareas:** una checklist. Completarlas todas no marca la tarea; la app lo sugiere con un botón "Marcar tarea como hecha".
- **Está hecha cuando…** (`doneWhen`).
- **Tiempo:** el estimado frente al real (la suma de sesiones de la tarea) y el botón "Estudiar ahora".
- **Notas:** un editor Markdown con pestañas Escribir y Vista previa. Se guarda solo, 600 ms después de dejar de escribir, y muestra el estado "Guardado".

### 6.4 Habilidades

- El mismo grafo de React Flow con el nuevo estilo: nodos con anillo de progreso, aristas con el degradado cuando el requisito está completado y fondo de puntos sutil.
- Un panel lateral con la descripción de la habilidad, sus requisitos y sus tareas (que abren el panel de tarea).

### 6.5 Logros

- Una cabecera grande con el nivel: un anillo con la XP y lo que falta para el siguiente nivel.
- Una cuadrícula con las 15 insignias. Las bloqueadas aparecen en gris, con su condición y su progreso ("4/7 días"); las desbloqueadas, a color y con su fecha.
- Un historial de las últimas 10 insignias.

### 6.6 Coach

Las mismas funciones que la v1 con el nuevo estilo:

- Revisión de progreso y examen por habilidad, en modo gratis (copiar y abrir claude.ai).
- La API como opción plegada.
- El prompt de revisión añade los minutos estudiados por semana, las tareas atrasadas y, por cada tarea, si tiene notas (solo si las tiene, no su contenido).

## 7. Temporizador de estudio

- **Modos:**
  - Pomodoro: 25 min de estudio y 5 de descanso; cada 4 pomodoros, 15 de descanso.
  - Libre: cronómetro sin límite.
- **Siempre asociado a una tarea.** Si se inicia sin elegir una, se usa la primera pendiente de hoy.
- **La sesión activa vive en Rust** (`progress.activeSession`), con su inicio y su tarea, así que sobrevive a cerrar la app. La interfaz solo calcula el tiempo transcurrido.
- **Pausa:** guarda la parte ya hecha como un tramo y la reanudación abre uno nuevo. Al parar, la sesión se registra con sus minutos netos.
- **Descansos:** no se registran como estudio.
- **Fin de un pomodoro:** notificación del sistema y un sonido corto (Web Audio, se puede desactivar). La interfaz propone el descanso.
- **Sesiones largas olvidadas:** al cargar, si hay una sesión activa de hace más de 4 horas, se cierra y se registra con un máximo de 4 horas, y se avisa al usuario.
- **Sesiones cortas:** las de menos de 1 minuto no se guardan.

## 8. Gamificación

### 8.1 XP

| Acción | XP |
| --- | --- |
| Subtarea completada | 5 |
| Tarea `concept` o `practice` completada | 20 |
| Tarea `review` completada | 30 |
| Tarea `deliverable` completada | 80 |
| Estudio | 1 por cada 5 minutos completos de sesión |

La XP se **recalcula siempre a partir de los datos**: desmarcar una tarea resta su XP. No se guarda un total.

### 8.2 Niveles

- Para pasar del nivel *n* al *n*+1 hacen falta `100 × n` XP; se empieza en el nivel 1 con 0 XP.
- Para cada nivel, Rust devuelve `level`, `xpIntoLevel` y `xpForNextLevel`.

### 8.3 Insignias

Las 15 insignias, con su id y su condición:

| id | Nombre | Condición |
| --- | --- | --- |
| `first-step` | Primer paso | 1 tarea completada |
| `first-deliverable` | Primer entregable | 1 tarea `deliverable` completada |
| `streak-3` | En marcha | Racha de 3 días |
| `streak-7` | Una semana seguida | Racha de 7 días |
| `streak-14` | Imparable | Racha de 14 días |
| `focus-1h` | Primera hora | 60 min de estudio acumulados |
| `focus-10h` | Diez horas | 600 min acumulados |
| `focus-25h` | Veinticinco horas | 1500 min acumulados |
| `marathon` | Maratón | 180 min estudiados en un mismo día |
| `deep-work` | Trabajo profundo | Una sesión de 90 min o más |
| `early-bird` | Madrugador | Una sesión iniciada antes de las 8:00 |
| `night-owl` | Búho | Una sesión iniciada a las 23:00 o después |
| `week-complete` | Semana redonda | Todas las tareas de una semana completadas |
| `skill-mastered` | Habilidad dominada | Todas las tareas de una habilidad completadas |
| `note-taker` | Apuntes al día | Notas en 5 tareas distintas |

- Una insignia, **una vez desbloqueada, se queda** aunque después se desmarquen tareas. Se guarda su fecha en `progress.badges`.
- Cada comando que cambia el progreso devuelve las `newBadges` desbloqueadas en esa acción y la `levelUp` si la hay. La interfaz celebra con confeti (o un simple fundido con movimiento reducido) y un aviso que se cierra solo.

## 9. Racha y estadísticas

- **Un día cuenta para la racha** si ese día (en hora local) se completó al menos una tarea o subtarea, o se estudiaron 10 minutos o más.
- La racha actual sigue viva hasta que pasa un día entero sin estudiar, igual que en la v1, y se guarda también el récord.
- **Estadísticas que calcula Rust:**
  - `todayMinutes` y `weekMinutes` (semana de lunes a domingo);
  - `weekTargetMinutes`;
  - `minutesByDay` de los últimos 84 días (`{ date, minutes, tasksDone }`);
  - `totalMinutes`;
  - minutos reales por tarea.

## 10. Datos

### 10.1 `roadmap.json` v2

```jsonc
{
  "version": 2,
  "title": "Roadmap AI Engineering",
  "goal": "…",
  "dailyTargetMinutes": 150,
  "skills": [{ "id": "python", "name": "Python", "description": "…", "requires": [] }],
  "phases": [{
    "id": "prep", "name": "…", "start": "2026-11-02", "end": "2026-11-29", "note": null,
    "weeks": [{
      "id": "w1", "number": 1, "title": "…", "goal": "Qué sabré hacer al acabar la semana",
      "start": "2026-11-02", "end": "2026-11-08",
      "days": [{
        "date": "2026-11-02", "title": "Entorno de trabajo", "kind": "study", // study | review
        "tasks": [{
          "id": "w1-setup", "title": "…",
          "type": "practice",            // concept | practice | deliverable | review
          "skills": ["tooling"],
          "estimateMinutes": 60,
          "description": "Qué hay que hacer, 2-4 frases.",
          "why": "Por qué importa para la IA o el bootcamp, 1-2 frases.",
          "resources": [{ "title": "…", "url": "https://…", "kind": "doc" }], // doc | video | course | article | practice
          "subtasks": [{ "id": "w1-setup-1", "title": "…" }],
          "doneWhen": "Criterio comprobable."
        }]
      }]
    }]
  }]
}
```

**Contenido**

- 4 semanas, cada una con 6 días de estudio (de lunes a sábado) y 1 de repaso (domingo).
- Unos 150 minutos al día, entre 2 y 4 tareas por día y 1 entregable por semana.
- Se **conservan todos los ids de tareas de la v1**, para que el progreso migre, y se añaden tareas nuevas.
- Cada tarea lleva entre 2 y 4 recursos reales y gratuitos: documentación oficial de Python, uv, Git, pandas, scikit-learn, SHAP y Claude; Kaggle Learn; SQLBolt; 3Blue1Brown; StatQuest; *Neural Networks: Zero to Hero* de Karpathy; *The Illustrated Transformer* de Jay Alammar; la guía de prompt engineering de Anthropic.
- La fase `bootcamp` queda con `weeks: []`.
- `docs/ROADMAP.md` se regenera para que coincida con el JSON.

**Validación en tests de Rust**

- Los ids son únicos (tareas y subtareas).
- Las fechas de los días caen dentro de su semana.
- Las habilidades referenciadas existen y el grafo no tiene ciclos.
- Todas las URLs empiezan por `https://`.
- Toda tarea tiene `estimateMinutes > 0` y `doneWhen`.

### 10.2 `progress.json` v2

```jsonc
{
  "version": 2,
  "tasks": {
    "w1-setup": {
      "completedAt": "2026-11-02T18:30:00Z", // o null
      "subtasks": { "w1-setup-1": "2026-11-02T17:00:00Z" },
      "notes": "Markdown…"
    }
  },
  "sessions": [{ "taskId": "w1-setup", "start": "…Z", "end": "…Z", "minutes": 25, "mode": "pomodoro" }],
  "activeSession": { "taskId": "w1-setup", "mode": "pomodoro", "segmentStart": "…Z", "accumulatedSeconds": 0, "paused": false }, // o null
  "badges": { "first-step": "2026-11-02T18:30:00Z" }
}
```

- **Migración desde la v1:** cada entrada de `completed` pasa a ser `tasks[id].completedAt`. Antes de migrar se guarda una copia en `progress.v1.backup.json`. Se testea.
- Se mantienen la escritura atómica y el apartado de archivos corruptos de la v1.

## 11. Comandos de Tauri

| Comando | Devuelve |
| --- | --- |
| `load_roadmap` | `Roadmap` v2 |
| `load_progress` | `ProgressView` |
| `set_task_done(taskId, done)` | `ProgressUpdate` |
| `set_subtask_done(taskId, subtaskId, done)` | `ProgressUpdate` |
| `save_notes(taskId, notes)` | `ProgressUpdate` |
| `start_session(taskId, mode)` / `pause_session` / `resume_session` / `stop_session` | `ProgressUpdate` |
| `copy_review_prompt`, `copy_quiz_prompt(skillId)` | `()` |
| `api_key_status`, `set_api_key`, `delete_api_key`, `coach_review`, `coach_quiz` | igual que en la v1 |

- `ProgressView` = `{ tasks, activeSession, streak, xp: { total, level, xpIntoLevel, xpForNextLevel }, badges: [{ id, unlockedAt }], stats }`.
- `ProgressUpdate` = `{ view: ProgressView, newBadges: string[], levelUp: number | null }`.
- Los nombres de las insignias y su texto viven en la interfaz (`src/lib/badges.ts`); Rust solo conoce los ids y las condiciones.

## 12. Organización del código

**Rust (`src-tauri/src/`)**

| Archivo | Contenido |
| --- | --- |
| `roadmap.rs` | Tipos v2 con serde y validación |
| `progress/store.rs` | Carga, migración y guardado |
| `progress/streak.rs` | Racha |
| `progress/xp.rs` | XP y niveles |
| `progress/badges.rs` | Insignias |
| `progress/stats.rs` | Estadísticas |
| `progress/session.rs` | Temporizador |
| `coach.rs`, `secrets.rs` | Coach y clave de API |
| `lib.rs` | Comandos |

**Interfaz (`src/`)**

| Ruta | Contenido |
| --- | --- |
| `app/` | `App`, `Sidebar`, `CommandPalette`, `useProgress` (estado global y acciones) |
| `screens/` | `Today`, `Plan`, `Skills`, `Achievements`, `Coach` |
| `components/` | Piezas reutilizables: `Ring`, `ProgressBar`, `Heatmap`, `WeekBars`, `Checkbox`, `Card`, `TaskRow`, `TaskDrawer`, `TimerCard`, `MiniTimer`, `BadgeTile`, `Toast`, `Celebration`, `CountUp` |
| `lib/` | `api.ts`, `dates.ts`, `badges.ts`, `format.ts` |
| `dev/mockBackend.ts` | Simula los comandos con `mockIPC` de `@tauri-apps/api/mocks` y datos de ejemplo. Solo se carga con `import.meta.env.DEV` y sin Tauri, para revisar pantallas en el navegador. |

## 13. Errores

- **Comandos que fallan:** aparece un aviso rojo con el mensaje en español y la interfaz revierte la actualización optimista.
- **Guardado de notas fallido:** el estado pasa a "No se pudo guardar · Reintentar".
- **Sin notificaciones:** el temporizador sigue funcionando y solo se omite la notificación.
- **Roadmap inválido:** es un error de compilación o de test, nunca de usuario.

## 14. Pruebas

- **Rust:**
  - migración de la v1 a la v2 y copia de seguridad;
  - XP y niveles (límites);
  - cada una de las 15 insignias;
  - persistencia de insignias tras desmarcar;
  - racha con sesiones y con subtareas;
  - estadísticas por día y por semana;
  - pausa y reanudación de sesiones y el máximo de 4 horas;
  - validación del roadmap;
  - prompts del coach.
- **Vitest:** formateo de fechas y duraciones, y los cálculos que la interfaz hace para pintar (escala del mapa de calor y posiciones del grafo).
- **Verificación visual:** cada pantalla se revisa en el navegador con `mockBackend` (temas claro y oscuro, 1280 px y 1024 px) antes de cada commit.

## 15. Orden de construcción

Un commit por bloque. Cada bloque deja la app funcionando.

1. **Base:** tokens y tipografía, estructura de la ventana con barra lateral, `mockBackend`, datos v2 en Rust (tipos, migración, validación) y el plan de estudio nuevo.
2. **Hoy y temporizador:** sesiones en Rust, estadísticas, pantalla Hoy y mini temporizador.
3. **Plan y panel de tarea:** línea de tiempo, panel, subtareas y notas.
4. **Logros:** XP, niveles e insignias en Rust, pantalla Logros y celebraciones.
5. **Habilidades, Coach y pulido:** rediseño de ambas pantallas, paleta de comandos, atajos y repaso de animaciones y accesibilidad.
