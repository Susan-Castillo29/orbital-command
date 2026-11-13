# Entrega integrada: THE LAST HORIZON

Este documento reúne los cambios locales incorporados desde el repositorio original (`a8b2343`) para publicarlos en un único commit. Se conserva React, TypeScript, Vite, Three.js y la identidad de ORBITAL COMMAND. No se reemplazó el juego por una aplicación nueva.

## Funciones incorporadas

| Área | Implementación y archivos principales |
| --- | --- |
| Campaña | Desbloqueo progresivo de Tierra, Luna, Mercurio, Venus, Marte, Júpiter, Europa, Saturno, Titán, Urano, Neptuno y Sol. Se conserva asteroides. `src/systems/campaign.ts`, `src/data/missions.ts`. |
| Comandante | Guía de operaciones, narración contextual, SpeechSynthesis, selección de voces españolas, actualización de catálogo, volumen, ritmo, repetición, subtítulos y registro. `Commander.tsx`, `src/data/commander.ts`. |
| Ingeniería | Masa, presupuesto, nave, instrumentos, energía, antena, protección térmica y lanzadores interdependientes. Validación antes de despegar. `engineering.ts`, `MissionEngineering.tsx`. |
| Viajes | Cuenta regresiva, días simulados, perfiles orientativos, ventanas ficticias, pausa y aceleración, decisión obligatoria y recuperación de trayecto. `transit.ts`, `transitStorage.ts`, `MissionTransit.tsx`. |
| Superficies | Rover y terrenos diferenciados de Luna, Marte, Mercurio y Titán; caminata en Luna/Marte; zonas de aterrizaje, muestras, sensores, fotografías PNG y tormenta marciana simulada. `ExplorationScene.tsx`, `lunarCampaign.ts`, `weather.ts`. |
| Ciencia remota | Satélite terrestre, laboratorio de capas, sondas atmosféricas virtuales y observatorio solar. `PlanetaryLab.tsx`, `src/data/planetaryLab.ts`. |
| Datos y enlace | Búferes de observaciones, sensores y telemetría; prioridad de transmisión, límite de antena y tiempos de señal simplificados. Confirmación visible del coste de adquisición. `dataBuffers.ts`, `communications.ts`. |
| Resultados | Informes locales, gráficos, muestras, lecturas, decisiones, descargas, diez criterios y legado global condicionado al progreso. `science.ts`, `MissionReports.tsx`. |
| Cooperación | Globo de estaciones: referencias reales identificadas y estación dominicana ficticia, sin conexión con instalaciones reales. `TrackingGlobe.tsx`. |
| Arte y rendimiento | Texturas acreditadas, 13 ilustraciones SVG originales, cámara de detalle, control de calidad y límite de píxeles, escenas conservadas al seleccionar capas, respeto parcial al movimiento reducido, pausa de renderizado oculto. `public/`, `renderQuality.ts`, `observatory.css`. |
| Audio | Efectos y ambiente sintetizados; archivos opcionales solo se solicitan cuando existen. `audio.ts`. |
| Recuperación | Límite de errores para recuperar vistas sin retirar la navegación. `SceneBoundary.tsx`. |

## Correcciones finales de interfaz

### Claro y oscuro

`src/themes.css` define colores compartidos para fondo, paneles, texto, texto secundario, bordes, selección, enlaces, estados y foco. Informes, ingeniería, controles de tránsito, comandante, laboratorio y seguimiento responden a la preferencia guardada. El esquema de color del documento se sincroniza para los controles nativos. Las escenas espaciales mantienen un cielo oscuro como parte de la visualización astronómica.

### Informes grandes y adaptables

El informe aprovecha hasta 1600 px de ancho. En escritorio, el selector ocupa una columna menor y el documento el área principal. Texto de lectura de 18 px, títulos de sección de 22 px y botones de al menos 48 px de alto. En móvil, el cuerpo pasa a 16 px y una columna; los gráficos reorganizan etiquetas y barras para evitar desbordamiento. El estado sin informes conserva una presentación amplia.

### Pantalla completa

`FullscreenControl.tsx` amplía la visualización real mediante la API nativa, sin capturas ni duplicación de escenas. Está integrado en:

- Sistema solar.
- Exploración espacial y superficie.
- Laboratorio planetario.
- Globo de seguimiento.
- Gráfico de informe científico.

El botón cambia a «Salir · Esc». Los observadores de tamaño recalculan el canvas y el límite gráfico se mantiene. Si el navegador rechaza la operación o no la soporta, se informa del problema. La disponibilidad depende del navegador y del contexto de incrustación.

## Instalación y pruebas

```sh
npm ci
npm run dev
npm run build
npm test
npm run test:browser
node tests/browser-observatory.cjs
node tests/browser-themes.cjs
npm audit
```

Node.js 24 o superior. Las pruebas de navegador reutilizan Playwright del workspace por defecto. Fuera de él, instalar Playwright en el entorno de pruebas y definir `ORBITAL_PLAYWRIGHT_MODULE` con la ruta absoluta al módulo y `PLAYWRIGHT_BROWSERS_PATH` con la carpeta de navegadores instalada. `ORBITAL_TEST_URL` permite probar otro servidor, incluida una compilación con `npm run preview`.

- Las pruebas de dominio incluyen entrada inválida, recursos, campañas, persistencia, informes, calidad gráfica y selección de voz.
- La regresión de navegador verifica los recorridos descritos en `evolucion.md`, con fixtures para viajes largos y parte de la misión lunar.
- `browser-observatory.cjs` guarda capturas, solicitudes, errores y medidas de intervalos de animación en `artifacts/observatory/`.
- `browser-themes.cjs` verifica ambos temas, persistencia, texto de informe de al menos 16 px, ancho móvil y entrada/salida nativa de pantalla completa; guarda capturas en `artifacts/temas/`.

## Seguridad, fuentes y mantenimiento

La aplicación no incorpora API propia, cuentas ni base de datos. El progreso local no es confiable para clasificaciones compartidas. No se añaden claves de voz ni proveedores de pago. Las voces remotas pueden usar servicios del navegador. Se conserva CSP de producción, lockfile y permisos acotados de CI con acciones fijadas a SHA.

Los SVG son ilustraciones estáticas; las capturas 3D siguen siendo PNG. Los valores científicos simulados están identificados como tales y los textos incluyen referencias educativas. `public/textures/README.md` y `public/illustrations/README.md` registran el origen de los recursos.

El workflow de Pages se activa al publicar `main` o `master`. Un push no garantiza que Pages esté habilitado o que el despliegue termine correctamente; se debe revisar su ejecución.

Consultar:

- [Auditoría inicial y plan](auditoria-y-plan.md): registro histórico, no estado actual.
- [Estado de evolución](evolucion.md): implementación, límites y pruebas.
- [Seguridad](seguridad.md): alcance real de los controles.
- [Observatorio y rendimiento](auditoria-observatorio.md): mejoras, mediciones y limitaciones.

## Límites que se conservan

Esta entrega no se presenta como una producción AAA terminada. Aún faltan actividades específicas completas para cada capítulo, descenso continuo de sondas, regreso cinematográfico, doblaje profesional y pruebas amplias en hardware físico. No hay efemérides reales ni una simulación física aeroespacial de alta fidelidad. Las pruebas automáticas no certifican ausencia total de vulnerabilidades ni la naturalidad acústica de voces instaladas.

## Evidencia de temas e informes

- [Informe claro en escritorio](../artifacts/temas/informes-light-1440.png).
- [Informe oscuro en escritorio](../artifacts/temas/informes-dark-1440.png).
- [Informe claro en móvil](../artifacts/temas/informes-light-390.png).
- [Gráfico ampliado](../artifacts/temas/grafico-light-1440.png).

Las capturas de informes utilizan datos de prueba simulados, no resultados de una campaña del usuario. Las dos preferencias de tema y el tamaño de los gráficos se comprobaron en Chromium a 1440 px y 390 px.
