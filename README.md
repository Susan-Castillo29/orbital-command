# ORBITAL COMMAND

Simulador educativo de operaciones espaciales en React, TypeScript, Vite y Three.js. La entrega actual conserva el centro de misión y añade navegación libre, selección de destinos, órbita y una primera misión de superficie lunar.

## Ejecutar en local

Requiere Node.js 20.19+ o 22.12+.

```sh
npm ci
npm run dev
```

Abre la URL local que indique Vite. Comprueba la versión de producción con `npm run build`.

## Controles de exploración

- Arrastrar con el botón izquierdo: orientar nave; en órbita, girar cámara; en superficie, orientar el rover.
- Clic en un astro: seleccionarlo y ver sus datos.
- Clic en espacio vacío: fijar un punto de ruta.
- **Iniciar ruta**: viajar automáticamente a la órbita segura del cuerpo objetivo; la ruta usa un corredor elevado y WASD cancela el piloto automático. Clic en espacio vacío fija una ruta manual.
- **W/S**: aplicar empuje hacia delante/atrás; **A/D**: empuje lateral en vuelo y giro del rover en superficie. La nave conserva inercia en el vacío, y el empuje consume combustible.
- **Shift**: impulso temporal; **F**: alternar cámara de cabina; rueda: acercar/alejar.
- En órbita lunar, elige una de las dos zonas y confirma el aterrizaje. El rover solo puede desplegarse en este escenario.
- En superficie, conduce hasta un beacon, selecciónalo con clic y pulsa **E** o usa su acción contextual: primer uso escanea la formación; el siguiente recolecta una muestra. Repite en tres lugares distintos.
- Vuelve a la estación, pulsa **E** para analizar las tres muestras y recargar la batería cuando esté baja. Desde la antena inicia la transmisión; el uplink tiene un retraso educativo de 4 segundos.
- El HUD muestra combustible, energía, integridad, datos, comunicaciones y tiempo. Viajar y conducir consumen recursos; el rover puede recargarse en la estación.
- En campañas remotas, pulsa **E** o activa el instrumento desde el panel para escanear tres sectores únicos; cada análisis consume energía y almacenamiento. Después transmite el informe con su retraso simulado.
- El sistema calcula gravedad educativa con una aproximación de $1/r^2$, conserva casi toda la inercia y asigna velocidades orbitales con la relación de Kepler $T^2\propto a^3$. Las órbitas se muestran con el tiempo comprimido; no son efemérides reales.
- Una frontera de exclusión bloquea acercamientos al Sol y colisiones con cuerpos/los anillos de Saturno, con alertas preventivas. El zoom orbital también respeta el radio seguro.
- Si el combustible llega a nivel crítico, el panel permite confirmar el aborto y reinicio desde Tierra; se restauran recursos y se descarta el progreso de esa campaña.

Los planetas, distancias, terrenos y velocidades son modelos educativos simplificados; no están a escala ni sustituyen datos astronómicos reales. **LUNAR FRONTIER** ofrece aterrizaje y rover. **RED PLANET**, **EUROPA DEEP**, **SATURN OBSERVER**, **ASTEROID SEEKER**, **JUPITER STORM**, **EARTH GUARDIAN** y **Solar Watch** permiten viaje, órbita y muestreo remoto; no se habilita aterrizaje en cuerpos sin escenario de superficie correspondiente.

## Estructura

- `src/components/SolarSystemScene.tsx`: visualización del sistema solar del centro de operaciones.
- `src/components/ExplorationScene.tsx`: vuelo, selección de destinos, órbita y exploración lunar de superficie.
- `src/systems/lunarCampaign.ts`: etapas de objetivos, zonas de aterrizaje, recursos y persistencia local de la campaña.
- `src/data/celestialBodies.ts`: catálogo visual e información de cuerpos celestes.
- `src/data/missions.ts`: campañas disponibles.
- `src/App.tsx` y `src/styles.css`: navegación e interfaz.
- `.github/workflows/pages.yml`: compilación y publicación automática en GitHub Pages.

## Publicar en GitHub Pages

1. Crea un repositorio en GitHub y sube a él los archivos de esta carpeta. No subas `node_modules` ni `dist` (están excluidos por `.gitignore`).
2. En el repositorio, abre **Settings → Pages** y elige **GitHub Actions** como fuente de publicación.
3. Envía los cambios a la rama `main` o `master`, o ejecuta manualmente el flujo **Deploy ORBITAL COMMAND to GitHub Pages** en la pestaña **Actions**.
4. Cuando el flujo termine en verde, GitHub mostrará la dirección pública en **Settings → Pages**.
