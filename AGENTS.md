# AGENTS.md — Mapa de navegación para agentes de IA

> Este archivo es el **punto de entrada**. No es una biblia de reglas: es un
> **mapa**. Lee solo lo que necesites (divulgación progresiva).

---

## 1. Producto (qué es este repo)

Turnera — app web Next.js para gestión de turnos y reservas. Usuarios
comerciales gestionan sus turnos, clientes reservan via link público.

## 2. Cómo desarrollar

- **Instalar:** `npm install`
- **Desarrollo local:** `npm run dev`
- **Tests:** `npm test`
- **Build:** `npm run build`
- **Lint:** `npm run lint`

## 3. Cómo trabaja el agente aquí

### Al arrancar una sesión

1. Ejecutá `./init.sh` y verificá que termina sin errores. Si falla, pará.
2. Leé `docs/TASKS.md` para ver las tareas (link a Notion).
3. Conectate a Notion vía MCP, tomá una tarea pending, cambiá a in_progress.
4. Creá una página de sesión en Notion para documentar el progreso.

### Durante la sesión

- Una sola tarea a la vez.
- Documentá el progreso en Notion mientras trabajás, no al final.
- Antes de implementar, leé `docs/architecture.md` y `docs/conventions.md`.

### Al cerrar la sesión

1. Ejecutá `./init.sh` — todo verde.
2. Marcá la tarea como done en Notion.
3. No dejes archivos temporales ni console.log() de debug.

## 4. Arquitectura del proyecto

Next.js app con:

- `src/app/` — rutas y páginas
- `src/components/` — componentes React
- `src/lib/` — lógica de negocio, validaciones, Firebase

## 5. Reglas duras

- **Una tarea a la vez.** No mezcles cambios.
- **No declarations una tarea `done` sin `./init.sh` verde.**
- **Documentá el progreso en Notion mientras trabajás.**
- **Si no sabés algo, buscá en `docs/` antes de inventarlo.**
- **No edités código fuera del scope de la tarea actual.**
