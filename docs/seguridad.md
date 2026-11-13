# Seguridad: alcance y evidencia

Revisión del 12 de noviembre de 2026 para la aplicación local estática. El navegador ejecuta React y Three.js; el proyecto no incluye cuentas, API propia ni base de datos. La puntuación, el progreso y los informes en `localStorage` son datos manipulables por el usuario, no registros confiables ni secretos.

| Control | Estado y evidencia |
| --- | --- |
| Dependencias | `npm ci` usa el lockfile. `npm audit` informó cero vulnerabilidades conocidas en la fecha indicada; el resultado cambia cuando cambian los avisos y no demuestra ausencia de fallos. |
| Datos guardados | Se valida la forma y los límites del trayecto, las zonas de aterrizaje y los informes. Se rechazan enlaces de informes ajenos al dominio científico esperado. Si el almacenamiento falla, las recompensas mantienen idempotencia durante la sesión; la persistencia entre sesiones no está garantizada. |
| Inyección en interfaz | Los textos se renderizan con React; una búsqueda estática no encontró usos de `eval`, `innerHTML` ni `dangerouslySetInnerHTML`. No sustituye una prueba de penetración. |
| Política de contenido | La compilación de producción inserta una CSP que restringe scripts y conexiones al origen. Se permite `unsafe-inline` en estilos por los estilos dinámicos existentes. Una meta CSP no proporciona HSTS ni `frame-ancestors`; el alojamiento debe establecer las cabeceras correspondientes. |
| Flujo de publicación | Las acciones están fijadas por SHA, el checkout no persiste credenciales y los permisos de Pages e identidad se conceden al job de despliegue. `actionlint` pasó. El workflow no se ejecutó ni se publicó desde esta revisión. |
| Secretos | La búsqueda estática de patrones de claves privadas, claves AWS y tokens GitHub no encontró coincidencias en los archivos del proyecto. Es una revisión parcial y no garantiza que no existan otros secretos. |
| Acceso local | El lanzador del gestor usa `127.0.0.1` y el puerto asignado; no expone deliberadamente Vite a otras interfaces. Para producción se necesita una revisión del proveedor y su configuración. |
| Voz | La síntesis usa las voces que proporciona el navegador o el sistema. Su disponibilidad, calidad y procesamiento dependen de ese entorno. |

No hay autenticación, autorización ni sesiones de servidor que probar en esta versión. Si se añaden cuentas, datos personales, API o servicios externos, deben diseñarse y probarse esos controles antes de habilitarlos. No se ha realizado una auditoría independiente ni se declara cumplimiento normativo.
