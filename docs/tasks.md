# Tareas y progreso
Este repo usa **Notion** para gestionar tareas y registrar el progreso de sesión.
## Base de tareas
Cada tarea está en la base de Notion con su estado (`pending` / `in_progress` / `done` / `blocked`),
criterios de aceptación y repo asociado.
🔗 **[Abrir base de tareas en Notion](https://www.notion.so/Turnera-3610132398da809294d6f063a57a8f43)**
> Si estás en Cursor con MCP de Notion configurado, podés consultar esta base
> usando el MCP tool. Pedí "mostrame las tareas pendientes" o "cambiá la tarea
> #7 a in_progress".
## Sesión activa
Cada vez que el agente trabaja en una tarea, crea su propia página dentro de la base de tareas de Notion para documentar el progreso (feature en curso, plan, bitácora, estado al cierre).
## Instrucciones para el agente
1. Al arrancar: abrí la base de tareas, encontrá una `pending`, cambiala a `in_progress`
2. Creá una nueva página dentro de la base de tareas con la fecha, el plan, y la tarea asignada
3. Durante la implementación: actualizá la bitácora en esa página
4. Al cerrar: marcá la tarea como `done` o `blocked` y completá el resumen