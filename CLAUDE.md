# AI Progress

App de escritorio para seguir mi aprendizaje de IA: roadmap interactivo, tareas que marco con animaciones, racha de estudio y, más adelante, un coach con IA que lee mi progreso y me examina.

Es también mi primer proyecto serio con Claude Code. Además de construir la app, quiero aprender a trabajar bien con un agente de código.

## Contexto
- Especificación completa: @docs/SPEC.md
- Roadmap de estudio (fuente de los datos): @docs/ROADMAP.md
- Datos semilla de la app: `data/roadmap.json`

## Sobre mí
- Enrique, ingeniero de software junior. Sé C++; estoy aprendiendo Python, IA y el ecosistema web.
- No conozco bien React, TypeScript, Tauri ni Rust: explícame lo importante de cada uno cuando aparezca por primera vez.
- Háblame en español; código, nombres y commits en inglés.

## Stack
- Tauri 2 (núcleo en Rust) + React + TypeScript + Vite
- Tailwind CSS para estilos
- Motion (paquete `motion`, import desde `motion/react`) para animaciones
- React Flow (`@xyflow/react`) para el mapa de habilidades (fase 2)
- Datos en archivos JSON locales: `roadmap.json` (solo lectura) y `progress.json` (progreso del usuario)

## Arquitectura (no romper)
- La interfaz solo pinta y anima. Leer y escribir archivos y llamar a APIs externas se hace SIEMPRE desde el núcleo en Rust, mediante comandos de Tauri.
- `roadmap.json` y `progress.json` van separados. El progreso referencia tareas por `id`, nunca por título.
- Nunca escribir claves de API en el código ni subirlas a git.

## Diseño y animaciones
- Las animaciones comunican algo (progreso, logro, cambio de estado); nada decorativo sin motivo.
- Duraciones cortas (150-300 ms), muelles suaves para el progreso.
- Respetar `prefers-reduced-motion`.
- Tema claro y oscuro; un único color de acento para el progreso.

## Cómo trabajamos
- Fase actual: **Fase 2 (mapa de habilidades)**. No adelantes funcionalidades de fases futuras.
- Avanza lo máximo sin pararte a pedir OK en cada paso; haz commits locales por bloque. Pregunta solo antes de acciones externas (push) o irreversibles.
- Explica brevemente cada cambio importante: qué has hecho y por qué. Estoy aprendiendo.
- Cambios pequeños y verificables. Al terminar algo, dime cómo probarlo.
- Propón el mensaje de commit al acabar cada bloque de trabajo.
- Si no estás seguro de algo de mi entorno (sistema operativo, versiones instaladas), pregúntame.

## Comandos
- Instalar dependencias: `npm install`
- Arrancar en desarrollo (ventana de la app con recarga en caliente): `npm run tauri dev`
- Comprobar tipos y compilar solo la interfaz: `npm run build`
- Compilar el instalador: `npm run tauri build`
- Comprobar el núcleo en Rust: `cargo check --manifest-path src-tauri/Cargo.toml`
- Tests del núcleo en Rust: `cargo test --manifest-path src-tauri/Cargo.toml`
- Lint: aún no hay.
