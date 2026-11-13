# THE LAST HORIZON — estado de implementación

Estado y verificaciones: 12 de noviembre de 2026. Este documento actualiza la [auditoría inicial](auditoria-y-plan.md), que conserva los hallazgos de la versión original.

La [revisión del observatorio](auditoria-observatorio.md) añade atlas SVG, selección de voz, control de calidad gráfica y correcciones de interacción.

## Integración realizada

- El proyecto Git conserva los seis commits y las ramas remotas del origen. La rama local tiene cambios sin publicar. El gestor local lo inicia desde el puerto preferido 4174; Vite escucha en `127.0.0.1` y utiliza el puerto asignado por el gestor.
- La campaña muestra la Tierra inicialmente y desbloquea capítulos según las misiones completadas. Se añadieron destinos para Mercurio, Venus, Titán, Urano y Neptuno; la misión de asteroides original se conserva como actividad adicional.
- El comandante tiene guía opcional, síntesis de voz disponible en el navegador, subtítulos, reproducción, historial de sesión, volumen y controles de voz y efectos. Informa sobre la preparación, lanzamiento, maniobras, estado de viaje, descubrimiento y transmisión. La voz depende del dispositivo; no se garantiza timbre masculino ni existe un filtro de radio aplicado a la voz. La música ambiental es síntesis local sencilla y se inicia por decisión del jugador.
- La pantalla de ingeniería valida masa, capacidad del lanzador, presupuesto, potencia y protección térmica para Mercurio, Venus y el Sol. Las misiones atmosféricas y solares requieren sensores ambientales. El instrumento modifica consumo, volumen de datos, lecturas disponibles y valor científico; la antena determina la capacidad de transmisión parcial y el diseño influye en el modelo de viaje. El jugador prioriza observaciones, sensores o telemetría; los búferes se guardan y cada paquete libera únicamente la categoría elegida.
- El tránsito tiene cuenta regresiva, pausa, velocidades ×1/×10/×100/×1000, recursos y una decisión que no se omite por aceleración. Se guarda localmente y se recupera pausado con la misma configuración. La ventana usa una fase ficticia; la masa y la fase alteran el perfil educativo. El tiempo de señal se calcula mediante distancias de órbitas circulares aproximadas y velocidad de la luz, pero la espera de interfaz está comprimida.
- La misión terrestre despliega un satélite de observación antes de escanear. Luna, Marte, Mercurio y Titán tienen modelos de superficie con rover y terrenos procedurales diferenciados. En Luna y Marte se puede caminar y volver al rover. Marte incorpora un ciclo ficticio de tormentas de polvo que reduce la visibilidad y la energía. Se pueden desplegar sensores y descargar fotografías del modelo. Venus y los gigantes no permiten caminatas de superficie.
- El laboratorio permite seleccionar capas interiores virtuales y, en Venus, Júpiter, Saturno, Titán, Urano y Neptuno, capas atmosféricas simuladas. El observatorio solar es un modelo remoto que no permite entrar físicamente en el Sol. Las lecturas consumen energía y espacio y pueden aparecer en el informe.
- Las misiones transmitidas generan informes locales con observaciones, muestras, decisiones y referencias. El panel de cooperación muestra un globo con estaciones de la red real de NASA como contexto y una estación dominicana ficticia; ninguna está conectada a la simulación. El panel de criterios señala tanto las capacidades existentes como sus límites. El informe global se habilita al tener informes de todos los capítulos.
- Las imágenes planetarias proceden de recursos locales acreditados de NASA/JPL; algunos mapas son representaciones ficticias. Ver [créditos](../public/textures/README.md). Los componentes de exploración, ingeniería, tránsito e informes se cargan bajo demanda.

## Fuentes y modelo

Los perfiles se inspiran en ejemplos históricos, entre ellos [el viaje lunar de Apolo](https://science.nasa.gov/resource/journey-to-the-moon/), [el tránsito de Mars 2020](https://science.nasa.gov/planetary-science/programs/mars-exploration/mission-timeline/), [Galileo](https://science.nasa.gov/mission/galileo/) y [Cassini](https://science.nasa.gov/mission/cassini/the-journey/timeline/). La demora de la señal se basa en distancia dividida entre la velocidad de la luz; NASA explica el principio y sus variaciones en [Deep Space Communications](https://www.nasa.gov/wp-content/uploads/2023/03/ps-03435-deepspacecomm-508.pdf). Las estaciones reales usadas como contexto se describen en [NASA DSN](https://www.nasa.gov/directorates/somd/space-communications-navigation-program/dsn-complexes/).

Las posiciones orbitales del juego no usan efemérides y las ventanas no son fechas de lanzamiento reales. Las duraciones, distancias, consumo, masa, coste y telemetría son aproximaciones de diseño para una simulación. Las lecturas y los índices generados por el juego son sintéticos. No deben usarse para tomar decisiones científicas o de ingeniería reales.

## Límites y trabajo pendiente

- La campaña todavía no implementa todas las actividades específicas del encargo: por ejemplo, despliegue de sondas físicas con descenso continuo, experimentos específicos completos y regreso narrativo cinematográfico.
- Las misiones no lunares conservan la posibilidad original de completar observaciones orbitales; la exploración de superficie y el laboratorio añaden actividades, pero no todas son requisitos obligatorios para cerrar cada capítulo. Los terrenos y vehículos son modelos procedurales básicos, no escenarios fotorrealistas de producción AAA.
- No hay efemérides, comunicaciones en tiempo real, planificación de trayectorias de alta fidelidad ni modelo físico completo de presión, radiación, oxígeno, protección térmica o energía. Las capas y sensores se visualizan de forma didáctica.
- La voz depende de las voces instaladas y sus eventos de sincronización. No hay doblaje profesional ni filtro de radio sobre la voz sintetizada. La banda sonora no es una grabación orquestal y no sustituye un diseño sonoro cinematográfico completo.
- La estación dominicana y la colaboración de la historia son ficticias. No se ha integrado una red de estaciones real, una API científica ni una plataforma externa para compartir informes.
- No se ha completado una partida integral de todos los capítulos. Deben ampliarse las pruebas de terreno y ciencia para Mercurio, Titán, Júpiter, Europa, Saturno, Urano, Neptuno y el Sol, así como las pruebas de rendimiento y accesibilidad en dispositivos físicos.

## Comandos de verificación

En la carpeta del proyecto, con Node 24 o superior:

```sh
npm ci
npm run build
npm test
npm audit
```

Para probar los flujos del navegador en este workspace, iniciar el proyecto con el gestor y ejecutar:

```sh
npm run test:browser
```

La prueba usa el Playwright y Chromium de `infraestructura/herramientas-locales/browser`. `ORBITAL_TEST_URL` permite indicar otro servidor y `ORBITAL_PLAYWRIGHT_MODULE` otra instalación de Playwright. Se usan contextos aislados y datos de progreso de prueba; una prueba lunar prepara muestras mediante un fixture para comprobar análisis y transmisión.

La compilación y las pruebas unitarias pasan. La regresión de navegador cubre la misión terrestre y el desbloqueo de Luna, aterrizaje y caminata en Luna y Marte, la fase final lunar con muestras preparadas y la sonda atmosférica de Venus. También revisa el acceso a los otros destinos mediante trayectos guardados de prueba, incluidos los rovers de Mercurio y Titán y los laboratorios remotos. No equivale a completar todos los capítulos. Se comprobó la pantalla de ingeniería a 390 × 844 y una compilación de producción en navegador. El resultado más reciente de `npm audit` no reportó vulnerabilidades conocidas; esto es una comprobación puntual, no una garantía de seguridad.

El workflow fija las acciones a SHA, reduce permisos del trabajo de despliegue y pasa `actionlint`. El sitio estático incorpora una CSP mediante meta en producción; no reemplaza cabeceras de servidor como HSTS o protección contra enmarcado, que dependen del proveedor de alojamiento. No se ha publicado ningún cambio.
