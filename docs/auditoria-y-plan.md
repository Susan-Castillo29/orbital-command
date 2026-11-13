# Auditoría inicial y plan de evolución

Auditoría histórica del estado original: 12 de noviembre de 2026. Origen: [Susan-Castillo29/orbital-command](https://github.com/Susan-Castillo29/orbital-command), rama `main`, commit `a8b2343f65e4763a49717882c00fb87b0e857c61`. Las dependencias ya se instalaron y la evolución posterior está en [estado de implementación](evolucion.md).

## Migración y verificación

Se recuperaron los 21 archivos del árbol principal mediante el conector de GitHub. Cada archivo se comparó con el SHA-1 de su objeto blob Git y coincidió. La clonación HTTPS directa falló por resolución de `github.com`; como alternativa, se recuperaron los objetos del historial mediante el conector, se reconstruyeron y verificaron sus identificadores Git y se preparó el repositorio local con `origin`. Se conservan los seis commits y las dos ramas remotas existentes (`main` y `WC001`); GitHub no mostró etiquetas. `git fsck --full` terminó sin errores. Los archivos de integración local permanecen como cambios de trabajo sin publicar.

Node 24.22.0 y npm 11.19.1 están disponibles. `npm ci --offline --ignore-scripts --no-audit --no-fund` falló porque no está en caché `vite-6.4.6.tgz`. No se ejecutaron la compilación completa, el navegador ni `npm audit` contra el registro. No se ha establecido una línea base de funcionamiento del juego original.

El registro local añade `.devops-project` y `scripts/dev-local.mjs`. El gestor elige un puerto libre desde 4174 y el lanzador pasa ese puerto a Vite con escucha limitada a localhost. Con acceso al registro, ejecutar `npm ci`, `npm run build`, `npm audit` y el arranque por el gestor antes de trabajar sobre el juego.

Verificaciones de integración: `node --check scripts/dev-local.mjs` terminó correctamente; `PORT=1 node scripts/dev-local.mjs` rechazó el puerto inválido. `npm_config_offline=true npm_config_cache=/tmp/orbital-npm-cache ./scripts/gestor-local.sh start orbital-command` falló en la instalación por dependencias no disponibles en esa caché y no arrancó el servicio. `./scripts/gestor-local.sh check` reconoció 11 proyectos pero devolvió error por una incidencia de permisos en otro proyecto, ajeno a esta migración. No se modificó ese archivo.

## Inventario estático

- React 19, TypeScript estricto, Vite 6 y Three.js. No hay servidor, autenticación, base de datos ni API propios en el árbol revisado.
- `src/App.tsx` presenta ocho misiones, selección de nave, expediente, tema y navegación entre operaciones y exploración.
- `src/components/SolarSystemScene.tsx` construye la visualización tridimensional; `src/components/ExplorationScene.tsx` reúne vuelo, selección, órbita, navegación, recursos, superficie y controles.
- `src/systems/lunarCampaign.ts` conserva las etapas y recursos lunares; `playerProgress.ts` conserva puntos y créditos; `storage.ts` captura errores de almacenamiento local. Estas funciones existen en código, pero todavía no se han probado en ejecución.
- El escenario de superficie y rover solo está implementado para la Luna. Los otros siete destinos utilizan tres escaneos orbitales y transmisión simplificada. No hay caminata humana, sondas de descenso ni exploración de capas.
- El audio busca archivos opcionales que no están en el árbol y utiliza tonos Web Audio como alternativa. No hay voz, subtítulos sincronizados ni ajustes de audio. El tutorial existente se refiere a la misión lunar.
- Las duraciones de `src/data/missions.ts` son etiquetas, no un modelo de tránsito; el vuelo se realiza con tiempo comprimido. No hay ventanas de lanzamiento ni aceleración de tiempo de misión.
- La selección de nave es visual; no se observa diseño interconectado de instrumentos, masa, energía, lanzadores y comunicaciones. Créditos y presupuesto mostrados no constituyen validación de ingeniería previa al lanzamiento.
- La aplicación no contiene la campaña secuencial, informes científicos detallados, centro internacional ni panel de criterios solicitados.

## Hallazgos y riesgos a verificar

1. **Ciencia y comunicación:** el rótulo «órbitas en tiempo real» contradice la descripción de tiempo comprimido del README. La descripción lunar habla de iluminación permanente en el borde de Shackleton; debe precisarse y fundamentarse. Los resultados de las misiones son simulados y deben identificarse como tales.
2. **Audio en despliegue:** `src/systems/audio.ts` utiliza rutas absolutas `/audio/...`; pueden apuntar a una ubicación incorrecta bajo el subdirectorio de GitHub Pages. Los archivos opcionales no se incluyen en el árbol.
3. **Persistencia:** las preferencias y el progreso dependen de `localStorage`, modificable por el usuario y sin garantía de disponibilidad. `awardMission` vuelve a leer el almacenamiento; si escribir falla, no se ha demostrado persistencia ni idempotencia de la recompensa. No tratar estos valores como datos confiables ni guardar secretos ahí.
4. **Mantenibilidad y rendimiento:** `ExplorationScene.tsx` supera las 1.200 líneas y combina renderizado, físicas, entrada, lógica y UI. Hay que establecer pruebas antes de separarlo. El uso de WebGL y el rendimiento en equipos convencionales no se han medido.
5. **Cadena de suministro:** existe lockfile y CI usa `npm ci`, pero falta una auditoría de vulnerabilidades actualizada. El workflow concede permisos de Pages e ID token al nivel completo del flujo; revisar reducción por job y fijación de acciones antes de un despliegue. No hay evidencia de CSP o cabeceras de producción en este repositorio estático.
6. **Revisión de código:** la búsqueda estática no encontró `eval`, `innerHTML`, `dangerouslySetInnerHTML` ni llamadas `fetch` en `src`; esto no demuestra ausencia de vulnerabilidades. La revisión de secretos, dependencias transitivas, navegador y despliegue queda pendiente.

Como revisión puntual, el lockfile resuelve Vite `6.4.6`, versión corregida para [GHSA-p4f5-76q4-ffq7](https://github.com/vitejs/vite/security/advisories/GHSA-p4f5-76q4-ffq7); no se ha comprobado el conjunto completo de avisos. El aviso [GHSA-xqc2-xf4c-x3h3](https://github.com/advisories/GHSA-xqc2-xf4c-x3h3) afecta paquetes de React Server Components y no corresponde al frontend estático inspeccionado. Estos dos controles no sustituyen `npm audit` ni prueban que el proyecto esté libre de vulnerabilidades.

## Plan de integración

Antes de cada etapa: registrar pruebas de regresión de los flujos existentes, confirmar requisitos científicos con fuentes primarias, implementar incrementalmente y ejecutar compilación y pruebas relevantes. Ninguna etapa de juego figura como terminada.

### Primer avance de la etapa 1

Se añadieron `src/data/commander.ts`, `src/components/Commander.tsx`, `src/components/commander.css` y `tests/commander.test.mjs`, integrados en `src/App.tsx`. La guía describe las funciones actuales y reconoce que la ingeniería aún no está implementada. El panel utiliza `SpeechSynthesis`, permite repetir y detener, ajustar voz, subtítulos y volumen, consultar las transmisiones de la sesión y omitir o volver a abrir la guía. Las preferencias y la finalización de la guía se guardan localmente. El resaltado de palabras depende de los eventos `boundary` del navegador. La voz masculina, el acento y el efecto de radio no están garantizados ni implementados como audio grabado.

Verificaciones: `node tests/commander.test.mjs` pasó tres pruebas; el componente y sus módulos se comprobaron con TypeScript en aislamiento y se realizó una prueba DOM local de guía, ajustes, historial y eventos de voz simulados. No se ejecutó la app completa. Chromium no pudo arrancar por restricciones del entorno y la escucha en localhost también fue rechazada; quedan pendientes la prueba visual y sonora real, la compilación integral y la regresión de las escenas existentes. Esta etapa sigue parcial.

1. **Narrativa y comandante.** Añadir datos de capítulos, motor de transmisiones y UI accesible en módulos nuevos bajo `src/data`, `src/systems` y `src/components`; integrar eventos en `App.tsx` y `ExplorationScene.tsx`. Usar Web Speech API con inicio por interacción, selección de voz española disponible, controles y registro; contemplar ausencia de voz y sincronización de subtítulos. No prometer una voz masculina cuando el dispositivo no la proporcione. Proteger el tutorial con opción explícita de omitirlo.
2. **Universo y exploración 3D.** Mantener navegación y superficie lunar. Separar gradualmente responsabilidades de `ExplorationScene.tsx`; crear escenas y controles apropiados para cada tipo de destino, con límites de seguridad y rendimiento medidos.
3. **Viajes y tiempo.** Crear dominio de trayectos, recursos y eventos persistidos; conectar HUD y controles de pausa/velocidad sin saltar decisiones. Documentar fuentes y supuestos de ventanas y trayectorias; separar distancias visuales de magnitudes científicas.
4. **Campaña científica.** Ampliar `src/data/missions.ts` y los sistemas de progreso con capítulos desbloqueables y objetivos verificables, conservando misiones existentes. Diseñar modos de superficie, atmósfera, interior virtual y sonda solar coherentes con cada cuerpo.
5. **Ingeniería.** Añadir modelos tipados de instrumentos, vehículos, presupuesto, masa, energía, datos y enlace; validar combinaciones y explicar compensaciones antes del lanzamiento, con más de una estrategia viable.
6. **Datos y cooperación.** Generar mediciones etiquetadas como simuladas, visualizaciones y reportes reproducibles. Incorporar estación ficticia de República Dominicana y colaboración internacional, diferenciando observaciones, hipótesis y aplicaciones posibles.
7. **Arte y sonido.** Mejorar modelos, transiciones, música y efectos con licencias verificadas; ofrecer ajustes de accesibilidad y perfiles de calidad. Medir FPS y uso de memoria.
8. **Pruebas y evaluación.** Añadir pruebas de dominio, persistencia, accesibilidad y flujos de navegador; ejecutar regresiones de vuelo, órbita, rover y misiones, y documentar los diez criterios con evidencia de funciones verificadas.

Dependencias nuevas: ninguna aprobada ni necesaria para la primera aproximación de voz mediante la API del navegador. Evaluar y auditar cualquier biblioteca adicional antes de incorporarla; fijar su versión y actualizar el lockfile.
