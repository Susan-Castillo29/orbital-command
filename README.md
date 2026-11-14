# ORBITAL COMMAND

[Documentación completa de esta entrega](docs/entrega-the-last-horizon.md): funciones, temas claro/oscuro, informes ampliados, pantalla completa, pruebas y límites.

> Proyecto local: desde la raíz del workspace, `./scripts/gestor-local.sh start orbital-command` inicia el juego en el puerto libre a partir de 4174. El historial y las ramas del repositorio original se conservan. Consulta la [auditoría inicial](docs/auditoria-y-plan.md) y el [estado de evolución y verificaciones](docs/evolucion.md).

La [revisión de seguridad](docs/seguridad.md) registra controles comprobados, alcance y pendientes.

Simulador educativo de operaciones espaciales en React, TypeScript, Vite y Three.js. **THE LAST HORIZON** conserva el centro de misión y la navegación 3D del proyecto y añade preparación, trayectos, investigación y narrativa.

Consulta la [revisión del observatorio, voz, API y rendimiento](docs/auditoria-observatorio.md) para los últimos cambios y sus pruebas.

El menú **NASA** consulta observaciones reales mediante un servidor local o muestra datos publicados con fecha cuando solo se usa GitHub Pages; configuración, catálogo y requisitos de publicación en [APIs de NASA y JPL](docs/apis-nasa.md).

## THE LAST HORIZON

La campaña comienza en la Tierra y desbloquea los capítulos siguientes al completar una misión. El comandante explica los controles, la ingeniería y el lanzamiento; la guía puede omitirse o revisarse. Su panel permite escuchar transmisiones mediante la síntesis de voz del navegador, ajustar el volumen, activar o desactivar voz, efectos y subtítulos, reproducir música ambiental sintetizada y consultar el historial de la sesión. La selección favorece las voces españolas latinoamericanas disponibles; su timbre y disponibilidad dependen del sistema. Los subtítulos resaltan palabras cuando el navegador proporciona eventos de posición, y permanecen legibles si no los proporciona. La reproducción de voz requiere una primera interacción del jugador.

En ingeniería se seleccionan nave, instrumento, fuente de energía, antena, protección térmica y lanzador. El juego valida masa, presupuesto y potencia; las elecciones afectan al viaje, los escaneos y la capacidad de transmisión. Los datos de observación, sensores y telemetría se almacenan por separado: en órbita el jugador elige qué categoría enviar y cada paquete respeta la capacidad de la antena. El trayecto muestra tiempo, distancia y recursos con controles de pausa y aceleración; una maniobra obligatoria detiene el avance. Si se abandona la vista, el trayecto puede recuperarse pausado con la misma configuración.

Los informes contienen índices y lecturas **simulados**, registros de muestras, fotografías exportadas y referencias educativas. Una estación de seguimiento dominicana es ficticia; las estaciones reales que aparecen como contexto no están conectadas al juego. Las texturas locales tienen [créditos y limitaciones](public/textures/README.md).

El juego sigue siendo un simulador educativo simplificado: las trayectorias, las ventanas de lanzamiento, los terrenos, los instrumentos y las mediciones no son predicciones ni datos científicos reales. Las funciones aún pendientes se enumeran en [estado de evolución](docs/evolucion.md).

## Ejecutar en local

Requiere Node.js 24 o superior y un navegador con WebGL. Las voces disponibles dependen del navegador y del sistema operativo.

```sh
npm ci
npm run dev
npm run build
npm test
```

Abre la URL local que indique Vite. Para la prueba de navegador del workspace, inicia primero el proyecto con el gestor y ejecuta `npm run test:browser`; usa el Playwright de `infraestructura/herramientas-locales/browser`. Puede cambiarse la dirección con `ORBITAL_TEST_URL` y la ruta del módulo con `ORBITAL_PLAYWRIGHT_MODULE`.

## Controles de exploración

- Arrastrar con el botón izquierdo: orientar nave; en órbita, girar cámara; en superficie, orientar el rover.
- Clic en un astro: seleccionarlo y ver sus datos.
- Clic en espacio vacío: fijar un punto de ruta.
- **Iniciar ruta**: viajar automáticamente a la órbita segura del cuerpo objetivo; la ruta usa un corredor elevado y WASD cancela el piloto automático. Clic en espacio vacío fija una ruta manual.
- **W/S**: aplicar empuje hacia delante/atrás; **A/D**: empuje lateral en vuelo y giro del rover en superficie. La nave conserva inercia en el vacío, y el empuje consume combustible.
- **Shift**: impulso temporal; **F**: alternar cámara de cabina; rueda: acercar/alejar.
- En un destino con superficie compatible, elige una de las zonas y confirma el aterrizaje del rover.
- Las misiones de Luna, Marte, Mercurio y Titán ofrecen descensos y rover; en Luna y Marte se puede bajar y volver a subir. Venus y los gigantes gaseosos se estudian con sondas y observación, sin caminata humana.
- En órbita, abre el laboratorio 3D para seleccionar capas, registrar lecturas virtuales y, donde corresponda, descender una sonda atmosférica. Las lecturas consumen energía y almacenamiento.
- En superficie se pueden instalar hasta tres sensores y exportar fotografías de la simulación. La cámara también funciona desde órbita.
- En superficie, conduce hasta un beacon, selecciónalo con clic y pulsa **E** o usa su acción contextual: primer uso escanea la formación; el siguiente recolecta una muestra. Repite en tres lugares distintos.
- Vuelve a la estación, pulsa **E** para analizar las tres muestras y recargar la batería cuando esté baja. Desde la antena inicia la transmisión; el uplink tiene un retraso educativo de 4 segundos.
- El HUD muestra combustible, energía, integridad, datos, comunicaciones y tiempo. Viajar y conducir consumen recursos; el rover puede recargarse en la estación.
- En campañas remotas, pulsa **E** o activa el instrumento desde el panel para escanear tres sectores únicos; cada análisis consume energía y almacenamiento. Después transmite el informe con su retraso simulado.
- El sistema calcula gravedad educativa con una aproximación de $1/r^2$, conserva casi toda la inercia y asigna velocidades orbitales con la relación de Kepler $T^2\propto a^3$. Las órbitas se muestran con el tiempo comprimido; no son efemérides reales.
- Una frontera de exclusión bloquea acercamientos al Sol y colisiones con cuerpos/los anillos de Saturno, con alertas preventivas. El zoom orbital también respeta el radio seguro.
- Si el combustible llega a nivel crítico, el panel permite confirmar el aborto y reinicio desde Tierra; se restauran recursos y se descarta el progreso de esa campaña.

Los planetas, distancias, terrenos y velocidades son modelos educativos simplificados; no están a escala ni sustituyen datos astronómicos reales. El vuelo libre 3D comprime el tiempo. El tramo de viaje representa días de misión mediante perfiles históricos aproximados y una ventana ficticia; no calcula efemérides. El retardo de señal se estima con órbitas circulares simplificadas y se comprime para la espera en pantalla.

## Estructura

- `src/components/SolarSystemScene.tsx`: visualización del sistema solar del centro de operaciones.
- `src/components/ExplorationScene.tsx`: vuelo, selección de destinos, órbita y exploración lunar de superficie.
- `src/systems/lunarCampaign.ts`: etapas de objetivos, zonas de aterrizaje, recursos y persistencia local de la campaña.
- `src/systems/engineering.ts`, `transit.ts` y `communications.ts`: diseño y validación, tiempo simulado y estimación de comunicación.
- `src/components/Commander.tsx`, `PlanetaryLab.tsx`, `MissionReports.tsx`: transmisiones, modelos virtuales e informes.
- `src/data/celestialBodies.ts`: catálogo visual e información de cuerpos celestes.
- `src/data/missions.ts`: campañas disponibles.
- `src/App.tsx` y `src/styles.css`: navegación e interfaz.
- `.github/workflows/pages.yml`: compilación y publicación automática en GitHub Pages.

## Publicar en GitHub Pages

1. Usa el repositorio de origen `Susan-Castillo29/orbital-command`. No subas `node_modules` ni `dist` (están excluidos por `.gitignore`).
2. En el repositorio, abre **Settings → Pages** y elige **GitHub Actions** como fuente de publicación.
3. Envía los cambios a la rama `main` o `master`, o ejecuta manualmente el flujo **Deploy ORBITAL COMMAND to GitHub Pages** en la pestaña **Actions**.
4. Cuando el flujo termine en verde, GitHub mostrará la dirección pública en **Settings → Pages**.
