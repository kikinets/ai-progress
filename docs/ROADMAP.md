# Roadmap AI Engineering

Objetivo: Llegar al bootcamp de AI Engineering de Ironhack con una base sólida.

Los datos que usa la app están en `data/roadmap.json`; este archivo es la versión legible y se genera a partir del mismo origen.
Objetivo diario: 150 minutos, de lunes a sábado; el domingo es de repaso.

## Semana 1 (2026-11-02 a 2026-11-08): Python de verdad y entorno de trabajo

**Meta:** Programar en Python con soltura, con un entorno profesional y tu código en GitHub.

### Lunes 02: Entorno de trabajo (150 min)

- Instalar Python 3.12+, VS Code, Git y crear cuenta de GitHub (60 min). Hecho cuando: `python --version`, `git --version` funcionan y puedes hacer `git push` a un repo tuyo.
- Entornos virtuales (venv o uv) y gestión de dependencias (45 min). Hecho cuando: Tienes un proyecto que otra persona puede recrear con un solo comando.
- Git y GitHub en el día a día (45 min). Hecho cuando: Tienes un repo en GitHub con varias ramas fusionadas y un pull request.

### Martes 03: Tipos y colecciones (150 min)

- Tipos, listas, diccionarios, sets, comprehensions, f-strings (90 min). Hecho cuando: Resuelves sin mirar: contar palabras de un texto con un diccionario y filtrar una lista con una comprehension.
- Empezar el prework oficial de Ironhack (60 min). Hecho cuando: Has completado al menos el primer módulo del prework.

### Miércoles 04: Funciones, errores y archivos (150 min)

- Funciones, args/kwargs, excepciones, módulos e imports (90 min). Hecho cuando: Tienes un pequeño paquete con 2 módulos, funciones documentadas y manejo de errores.
- Archivos, CSV y JSON (60 min). Hecho cuando: Un script lee un CSV, calcula un total y lo guarda en JSON.

### Jueves 05: POO y estilo (150 min)

- Clases y POO en Python (comparado con C++) (90 min). Hecho cuando: Modelas un gasto como dataclass y una cartera de gastos como clase con métodos.
- Type hints y estilo PEP 8 (60 min). Hecho cuando: Tu código pasa el formateador y mypy sin errores.

### Viernes 06: Notebooks y tests (150 min)

- Jupyter notebooks: cuándo usarlos y cuándo no (45 min). Hecho cuando: Tienes un notebook que importa funciones de tu propio módulo.
- Tests con pytest (60 min). Hecho cuando: `pytest` pasa con al menos 3 tests propios.
- Diseñar la CLI del entregable (45 min). Hecho cuando: Tienes un README con los comandos y la estructura del proyecto.

### Sábado 07: Entregable: gestor de gastos (150 min)

- Entregable: herramienta CLI (gestor de gastos con CSV) en un repo con README (150 min). Hecho cuando: El repo está en GitHub, los tests pasan y el README explica cómo usarlo.

### Domingo 08: Repaso (60 min)

- Repaso de la semana: Python y entorno (60 min). Hecho cuando: Has hecho el examen del coach y tienes una lista de dudas apuntada.

## Semana 2 (2026-11-09 a 2026-11-15): Datos y las matemáticas justas

**Meta:** Explorar y limpiar un dataset real con pandas y SQL y entender las matemáticas que usa el ML.

### Lunes 09: NumPy (150 min)

- NumPy: arrays, vectorización, broadcasting (90 min). Hecho cuando: Explicas el broadcasting con un ejemplo propio y tu versión vectorizada es más rápida que el bucle.
- Ejercicios de NumPy (60 min). Hecho cuando: Resuelves los ejercicios sin bucles de Python.

### Martes 10: Pandas I (150 min)

- Pandas: cargar, filtrar, agrupar, unir y limpiar datos (90 min). Hecho cuando: Respondes 3 preguntas sobre un dataset real usando solo pandas.
- Agrupar y resumir con groupby (60 min). Hecho cuando: Sacas un resumen por grupos que responde a una pregunta concreta.

### Miércoles 11: Limpieza y visualización (150 min)

- Limpieza de datos (60 min). Hecho cuando: Tu dataset no tiene nulos sin justificar ni tipos incorrectos.
- Visualización básica con Matplotlib o Seaborn (90 min). Hecho cuando: Tienes 4 gráficos distintos, cada uno respondiendo a una pregunta.

### Jueves 12: SQL (150 min)

- SQL básico: SELECT, WHERE, GROUP BY, JOIN (90 min). Hecho cuando: Escribes sin ayuda una consulta con JOIN y GROUP BY.
- SQL desde Python (60 min). Hecho cuando: Un script crea la base, la consulta y muestra el resultado en pandas.

### Viernes 13: Matemáticas para IA (150 min)

- Vectores, matrices, producto escalar, gradiente, probabilidad (90 min). Hecho cuando: Explicas con tus palabras qué es una matriz como transformación y qué mide el producto escalar.
- Gradiente y probabilidad básica (60 min). Hecho cuando: Explicas por qué bajar por el gradiente reduce el error de un modelo.

### Sábado 14: Entregable: análisis exploratorio (150 min)

- Entregable: EDA de un dataset de Kaggle con 3-5 conclusiones (150 min). Hecho cuando: El notebook está en GitHub y tiene 3-5 conclusiones apoyadas en gráficos.

### Domingo 15: Repaso (60 min)

- Repaso de la semana: datos y matemáticas (60 min). Hecho cuando: Has hecho el examen del coach y tienes una lista de dudas apuntada.

## Semana 3 (2026-11-16 a 2026-11-22): Machine learning clásico

**Meta:** Entrenar, validar, evaluar y explicar un modelo de principio a fin con scikit-learn.

### Lunes 16: Qué significa aprender (150 min)

- Aprendizaje supervisado vs no supervisado (60 min). Hecho cuando: Clasificas correctamente 5 problemas como regresión, clasificación o clustering.
- Train/test split, overfitting, validación cruzada (90 min). Hecho cuando: Muestras con números un caso de overfitting y cómo lo detecta la validación cruzada.

### Martes 17: Modelos clásicos (150 min)

- Regresión lineal y logística, árboles y random forest (90 min). Hecho cuando: Explicas cuándo usarías regresión logística frente a random forest.
- Curso Intro to Machine Learning de Kaggle (60 min). Hecho cuando: Tienes el curso completo y un envío en la competición de Kaggle.

### Miércoles 18: Métricas y features (150 min)

- Métricas: accuracy, precision, recall, F1, matriz de confusión (90 min). Hecho cuando: Explicas qué métrica elegirías para detectar fraude y por qué.
- Preprocesado y feature engineering (60 min). Hecho cuando: Una feature nueva mejora la métrica de validación de tu modelo.

### Jueves 19: scikit-learn de principio a fin (150 min)

- scikit-learn de principio a fin (90 min). Hecho cuando: Tienes un notebook que va de los datos crudos a una métrica de test justificada.
- Pipelines de scikit-learn (60 min). Hecho cuando: Un único objeto pipeline entrena y predice desde los datos crudos.

### Viernes 20: Redes neuronales (135 min)

- Redes neuronales a nivel intuitivo (90 min). Hecho cuando: Explicas con tus palabras cómo una red ajusta sus pesos.
- Experimentar en TensorFlow Playground (45 min). Hecho cuando: Resuelves el dataset espiral y explicas qué cambio lo hizo posible.

### Sábado 21: Entregable: clasificador explicado (150 min)

- Entregable: clasificador con scikit-learn explicado con SHAP (150 min). Hecho cuando: El repo tiene el modelo, su métrica en test y una explicación con gráficos SHAP.

### Domingo 22: Repaso (60 min)

- Repaso de la semana: machine learning (60 min). Hecho cuando: Has hecho el examen del coach y tienes una lista de dudas apuntada.

## Semana 4 (2026-11-23 a 2026-11-29): LLMs y tu primera app con IA

**Meta:** Entender cómo funciona un LLM y construir una app en Python que lo use, con RAG y herramientas.

### Lunes 23: Cómo funciona un LLM (150 min)

- Tokens, embeddings, transformers y atención (intuición) (90 min). Hecho cuando: Explicas qué es un token, un embedding y para qué sirve la atención.
- Curso de LLMs de Hugging Face (capítulo 1) (60 min). Hecho cuando: Ejecutas dos pipelines de transformers en tu máquina o en Colab.

### Martes 24: Prompt engineering (150 min)

- Prompt engineering: instrucciones, ejemplos, roles, formato (90 min). Hecho cuando: Tienes un antes y después de un prompt con resultados claramente mejores.
- Laboratorio de prompts (60 min). Hecho cuando: Tienes 3 prompts probados con casos y una nota de por qué funcionan.

### Miércoles 25: LLMs desde Python (165 min)

- API de un LLM desde Python: system prompt, streaming, JSON (120 min). Hecho cuando: Un script mantiene una conversación con streaming y extrae datos en JSON válido.
- Salida estructurada y validación (45 min). Hecho cuando: Tu código nunca falla con una respuesta mal formada: la detecta y la gestiona.

### Jueves 26: RAG (150 min)

- Qué es RAG y por qué existe (90 min). Hecho cuando: Explicas el flujo completo de RAG y por qué reduce las alucinaciones.
- Embeddings y búsqueda por similitud (60 min). Hecho cuando: Un script devuelve las frases más parecidas a una pregunta.

### Viernes 27: Agentes y prework (150 min)

- Qué es un agente: un LLM que usa herramientas en bucle (90 min). Hecho cuando: Explicas la diferencia entre un workflow y un agente con un ejemplo.
- Terminar el prework oficial de Ironhack (60 min). Hecho cuando: El prework aparece como completado en la plataforma.

### Sábado 28: Entregable: mini app con IA (150 min)

- Entregable: mini app en Python que use la API de un LLM (150 min). Hecho cuando: La app responde preguntas sobre tus apuntes citando las fuentes y está en GitHub.

### Domingo 29: Repaso (60 min)

- Repaso de la semana: LLMs y apps con IA (60 min). Hecho cuando: Has hecho el examen del coach y tienes una lista de dudas apuntada.

## Bootcamp Ironhack

Fechas y semanas pendientes hasta que Ironhack pase el temario.
