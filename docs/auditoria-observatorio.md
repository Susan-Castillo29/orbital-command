# Revisión del observatorio, voz y funcionamiento

Esta revisión complementa `auditoria-y-plan.md`, `evolucion.md` y `seguridad.md`. El inventario reproducible está en `artifacts/auditoria/inventario.json`. Se revisaron los módulos de escenas, comandante, ingeniería, tránsito, persistencia, informes, audio y configuración; el análisis estático y las pruebas no equivalen a una auditoría independiente de cada posible ejecución.

## Hallazgos y correcciones

| Hallazgo | Cambio comprobable |
| --- | --- |
| El mapa restringía el clic a seis destinos | Todos los cuerpos seleccionables llegan al selector de campaña; los capítulos bloqueados conservan su validación. Un arrastre ya no se interpreta como clic. |
| Tierra/Marte tenían etiquetas HTML fijas sin relación con la cámara | Se retiraron esas etiquetas y las coordenadas decorativas. Se añadieron controles reales para observar el destino y volver al sistema. |
| El laboratorio reconstruía WebGL al cambiar una capa | La geometría permanece montada y cambia la iluminación de la selección. |
| El tamaño del framebuffer dependía principalmente del DPR | Presupuestos máximos: ahorro 800.000, equilibrado 1.600.000 y detalle 3.200.000 píxeles; se aplican a las cuatro escenas. |
| Renderizado innecesario con la pestaña oculta | Las escenas omiten renderizado cuando `document.hidden`; el tránsito conserva su modelo temporal separado. |
| Audio intentaba cargar archivos OGG ausentes | El manifiesto local detecta archivos realmente incluidos; en ausencia se usa síntesis directamente. Se desconectan nodos de tonos finalizados. |
| La voz era automática, lenta y sin actualización de catálogo | Se escucha `voiceschanged`, se permite elegir voz y ritmo, y se guardan preferencias. Se favorecen nombres de voces mejoradas si existen; no se inventa ninguna. |
| El escaneo mostraba mensajes poco explícitos sobre coste | La adquisición confirma volumen añadido y energía utilizada a partir del cambio real de recursos. |
| Un error de inicialización de escena podía interrumpir toda la pantalla | Un límite de errores ofrece reintento y mantiene disponible la navegación principal. |

## Interfaz e ilustraciones

La dirección conserva el observatorio oscuro: espacio `#06101b`, texto `#e6f0f2`, atmósfera `#86d7ed`, mineral `#e5bd80` y texto secundario `#a3b8c7`. Los planetas son la imagen principal; controles y datos tienen jerarquía legible. Se conserva la tipografía del proyecto y se aumenta el tamaño del texto de misión. Se añade foco de teclado visible y se reduce movimiento decorativo cuando el sistema lo solicita. Esto no desactiva las maniobras ni todas las rotaciones de la simulación.

El atlas contiene 13 SVG originales, estáticos, sin JavaScript ni enlaces externos. `python3 scripts/generate-atlas.py` los regenera. Son ilustraciones estilizadas, no fotos ni mapas científicos. Las fotos exportadas del juego siguen siendo PNG: convertir una captura a SVG no la convertiría en geometría vectorial. Se conservan las texturas acreditadas NASA/JPL del entorno 3D.

## Voz: naturalidad y límites

La lista depende de las voces del dispositivo y puede llegar después de cargar la página. El selector distingue voces locales y servicios del navegador. Estos últimos pueden requerir conexión y procesamiento remoto fuera de la aplicación. Se puede escuchar, cambiar voz, ajustar ritmo y repetir. No se ha añadido ningún proveedor de pago ni clave de API. Chromium de pruebas no acredita calidad vocal humana: la comprobación automática usa síntesis simulada y la escucha real depende del equipo del jugador.

Referencias técnicas: [catálogo de voces](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis/getVoices), [actualización del catálogo](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis/voiceschanged_event), [servicio local o remoto](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesisVoice/localService), [resolución de Three.js](https://threejs.org/manual/pages/responsive.html).

## API, ejecución y escala

- API propia: **0**. Servicios REST externos llamados por el código de juego: **0**. No hay autenticación, servidor de juego ni base de datos.
- Los enlaces NASA abren documentación al solicitarlos. Las imágenes, SVG y código se sirven desde el mismo origen. La voz puede utilizar el servicio del sistema/navegador.
- APIs del navegador: WebGL/Canvas, SpeechSynthesis, Web Audio, almacenamiento local, eventos/temporizadores, observadores de tamaño y descargas Blob. No son servicios propios que requieran claves.
- Desarrollo: Node 24, `npm ci`, `npm run dev` o gestor local. Producción: `npm run build`; alojar `dist/` como sitio estático. `npm run preview` sirve para verificar esa compilación, no sustituye el alojamiento de producción.
- El frontend puede distribuirse mediante alojamiento estático/CDN. El progreso continúa siendo local y editable por el usuario; no ofrece sincronización, clasificación confiable ni multijugador. Para añadirlos se necesita un diseño de backend y autorización separado.

## Versiones y seguridad

Los resultados de `npm audit --json` y `npm outdated --json` se conservan en `artifacts/auditoria/`. La revisión reporta cero avisos conocidos en el árbol instalado. Se detectan versiones mayores posteriores de Vite, su plugin, TypeScript y Three.js. Una versión antigua no prueba una vulnerabilidad, y una actualización mayor no debe hacerse sin comprobar compatibilidad. Esta entrega conserva el lockfile de ejecución y no afirma que todas las dependencias sean las últimas.

Se mantiene la CSP de producción, acciones de CI fijadas y ausencia de credenciales en frontend. Los SVG son generados desde datos constantes y no admiten carga de SVG arbitrario por el usuario. No se han añadido dependencias npm. La revisión no es una prueba de penetración ni garantiza ausencia de vulnerabilidades. Las cabeceras del alojamiento y las actualizaciones mayores siguen siendo trabajo de mantenimiento.

## Pruebas y mantenimiento

```sh
npm ci
npm test
npm run build
npm run test:browser
node tests/browser-observatory.cjs
npm audit
npm outdated
python3 scripts/generate-atlas.py
```

La regresión de campaña utiliza los fixtures documentados en `evolucion.md`; no demuestra una partida manual completa desde el primer capítulo hasta el último. La prueba de observatorio comprueba errores de página, respuestas HTTP fallidas, presupuesto gráfico, voz configurable, desbordamiento horizontal y capturas a 1440×900 y 390×844. Mide intervalos de animación con Chromium/SwiftShader y los guarda junto con peticiones en `artifacts/observatory/browser-audit.json`; esos tiempos no representan una GPU física ni una comparación contra una línea base histórica.

Para mantener el proyecto: revisar avisos de dependencias periódicamente; migrar primero el conjunto Vite/plugin en una rama y después Three.js con sus tipos; conservar pruebas de adquisición, consumo y guardado antes de extraer terreno, vuelo y UI del componente grande `ExplorationScene.tsx`. Las capturas y pruebas de escritorio no sustituyen pruebas táctiles, accesibilidad completa o rendimiento en equipos físicos.

La visión original sigue vigente. El atlas y el nuevo observatorio no completan por sí solos las actividades exclusivas de todos los capítulos, el regreso cinematográfico, doblaje profesional o una producción AAA. Sus límites están en `evolucion.md`.

## Resultado de esta revisión

- 24 pruebas unitarias aprobadas; TypeScript y compilación de producción aprobados. Three.js mantiene un chunk de aproximadamente 513 kB sin comprimir (129 kB gzip); la advertencia de tamaño de Vite sigue visible.
- Regresión de campaña aprobada: comandante con voz simulada, Tierra y desbloqueo lunar, superficies Luna/Marte, análisis lunar preparado, Venus, rovers Mercurio/Titán, laboratorios de los destinos exteriores/Sol y tormenta marciana.
- Producción probada a 1440×900 y 390×844: cero errores de página, cero respuestas HTTP fallidas y cero peticiones a dominios externos durante el recorrido de observatorio. La síntesis remota de voz no se ejercitó en esa prueba.
- En la vista de escritorio con DPR 2, ahorro usó 590.337 píxeles frente a 2.361.348 en detalle: 75% menos píxeles de framebuffer. Esto no demuestra una mejora proporcional de FPS. La mediana de intervalos de animación en modo equilibrado fue 33,3 ms en escritorio y 16,7 ms en móvil simulado con SwiftShader; no son mediciones de teléfonos ni GPU físicos.
- Capturas finales: [escritorio](../artifacts/observatory/observatorio-1440.png), [móvil](../artifacts/observatory/observatorio-390.png), [voz móvil](../artifacts/observatory/voz-390.png).
- No se publicó ni se enviaron cambios a GitHub. El juego de desarrollo continúa en el puerto del gestor local.
