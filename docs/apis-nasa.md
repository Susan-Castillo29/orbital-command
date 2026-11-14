# Fuentes reales NASA y JPL

El menú **NASA** abre un observatorio separado de las misiones simuladas. Los resultados proceden de los servicios indicados y conservan su estructura original; no sustituyen el modelo orbital del juego ni se presentan como mediciones propias. La imagen del día se muestra cuando NASA devuelve una imagen compatible, y enlaza a su publicación original.

## Configuración local

Node.js 24 o superior. La clave se ha guardado en `.env.local` con permisos `0600` y el archivo está excluido de Git. No se incluye en el código, compilación, documentación ni respuestas de la API local. Para otra instalación, crear `.env.local` con:

```dotenv
NASA_API_KEY=coloca_aqui_tu_clave
```

No compartir el archivo ni incorporar la clave a `VITE_*`, porque Vite expone esas variables al navegador. El PDF original contiene una clave y debe conservarse en una ubicación privada. Si la clave se comparte por accidente, solicitar su sustitución.

```sh
npm ci
npm run dev
# O compilación y servidor local de producción:
npm run build
PORT=4175 npm run serve
```

El gestor local inicia Vite en el puerto asignado. En desarrollo y preview, `vite.config.ts` registra el intermediario; `npm run serve` sirve `dist/` y la API en el mismo origen, solo en `127.0.0.1`. El puerto de `serve` puede cambiarse con `PORT`. Variables de entorno ya configuradas tienen prioridad sobre el archivo local.

GitHub Pages solo publica archivos estáticos: **no ejecuta el intermediario**. Por ello, si la consulta en vivo no está disponible, el observatorio utiliza las respuestas públicas guardadas en `public/nasa-data/`. Muestra la fecha de consulta y aclara que son archivos publicados, no datos en vivo. Si una fuente no tiene archivo, informa del fallo. La actualización de la página no renueva automáticamente estas respuestas.

Para renovar los archivos localmente con la clave privada:

```sh
npm run nasa:update
# Solo fuentes concretas:
node scripts/update-nasa-snapshots.mjs apod neows
```

El script solicita a NASA desde el servidor, verifica que la clave no aparezca en los archivos, guarda respuestas exitosas y conserva la versión anterior si una fuente falla. La imagen APOD solo se descarga del origen autorizado. Antes de hacer públicos archivos científicos o imágenes, revisar sus derechos de uso y créditos.

Para actualizar durante cada ejecución del despliegue de GitHub Pages, la persona administradora del repositorio debe crear el secreto de Actions `NASA_API_KEY` en **Settings → Secrets and variables → Actions**. El workflow lo pasa al proceso de actualización; si no existe, conserva los archivos fechados. GitHub cifra los secretos, pero las personas con capacidad de modificar el workflow podrían diseñar código que los lea: limitar ese acceso. Nunca guardar la clave ni la clave de descifrado en archivos del repositorio. La configuración del secreto no se ha realizado desde esta entrega.

Para consultas en vivo se necesita un servidor Node o función equivalente y un proxy inverso en el mismo origen hacia `/api/nasa`, con `NASA_API_KEY` configurada como secreto del proveedor. No se ha desplegado ese servicio ni se ha configurado un proxy público.

## Catálogo implementado

El selector consulta opciones predefinidas; las fechas de NeoWs y DONKI se calculan a partir del día actual. Se muestra el resultado JSON y la hora de consulta; no son formularios genéricos para todos los parámetros del PDF.

| Servicio | Opciones de la interfaz | Clave |
| --- | --- | --- |
| APOD | Publicación e imagen actual; API nueva `science.nasa.gov/wp-json/wp/v2/apod-basic/` | Sí |
| NeoWs | Feed de siete días anteriores, Eros y primera página del catálogo | Sí |
| DONKI | FLR, CME, GST, IPS, SEP, MPC, RBE, HSS y notificaciones, últimos siete días | Sí |
| EPIC | Metadatos de imágenes naturales recientes | Sí |
| TechPort | Listado de proyectos | Sí |
| TechTransfer | Búsqueda de patentes por motor en la API pública actual | No |
| NASA Images | Búsqueda de imágenes de la Tierra y rovers marcianos | No |
| EONET | Eventos abiertos y categorías | No |
| Exoplanet Archive | 20 registros recientes de la tabla planetaria | No |
| Earthdata CMR | Diez colecciones relacionadas con nivel del mar | No |
| Earthdata GIBS | Comprobación de capacidades WMTS y tamaño recibido | No |
| JPL Horizons | Vector heliocéntrico de Marte; fechas recientes | No |
| JPL CAD, SBDB, Sentry, Fireball, Scout | Aproximaciones, Ceres, riesgos, bólidos y objetos recientes | No |

EPIC muestra imágenes JPG públicas de su archivo oficial a partir de los metadatos; la biblioteca de NASA presenta miniaturas con enlaces al original. Las imágenes se cargan desde los dominios oficiales, por lo que el navegador debe poder acceder a ellos. El navegador no monta aún capas WMTS de GIBS ni realiza búsquedas libres, consultas históricas arbitrarias o navegación del catálogo. El punto de fotos antiguas de rovers está archivado por NASA y se señala como tal; no se presenta como un servicio operativo. El clima InSight y la API terrestre antigua tampoco se ofrecen.

## Seguridad y comportamiento

`server/nasa-proxy.mjs` acepta únicamente identificadores conocidos y construye las URL del lado del servidor; no acepta URL proporcionadas por el cliente. Solo admite GET, rechaza solicitudes marcadas como provenientes de otro sitio, aplica un límite local de 30 consultas por minuto por dirección, caché de cinco minutos, tiempo máximo de 12 segundos, límites de tamaño y no sigue redirecciones. Los errores no devuelven la URL con la clave. Las respuestas JSON se revisan para ocultar cualquier aparición literal de la clave. La imagen APOD solo se obtiene desde `assets.science.nasa.gov`, después de consultar APOD, y admite formatos de imagen permitidos y tamaño limitado. No interpreta HTML remoto.

Estos controles son adecuados para la ejecución local; antes de exponer el servicio públicamente se necesita configurar TLS, cabeceras HTTP, límites compartidos y controles del proxy inverso. Una clave enviada por query string a NASA puede aparecer en registros del proveedor o infraestructura de red; la aplicación no registra esa URL. El límite de NASA también se aplica y puede producir respuestas 429. Los servicios externos pueden cambiar, fallar, responder sin datos o quedar archivados.

## Verificación

- `npm test`: 27 pruebas aprobadas, incluidas rutas no permitidas, método, caché, rechazo de solicitudes entre sitios y ocultación de la clave mediante un proveedor simulado.
- `npm run build`: compilación aprobada.
- Consulta real local: 26 de 28 conjuntos predefinidos respondieron correctamente durante esta revisión. `DONKI/FLR` respondió 404 y el antiguo enlace de TechTransfer redirigió a otro dominio; se sustituyó por la API pública actual documentada por NASA, probada con éxito, sin enviarle la clave. No se garantiza su disponibilidad futura. Una respuesta correcta puede contener una lista vacía.
- APOD y la imagen JPEG real devolvieron 200. El navegador comprobó el panel, APOD y EONET; capturas en `artifacts/nasa-1440.png` y `artifacts/nasa-390.png` si la prueba se ejecutó completamente.
- Los datos de NASA pueden estar sujetos a sus propios derechos de autor o atribución; consultar la publicación original.

Referencias oficiales: [NASA Open APIs](https://api.nasa.gov/), [aviso de APOD y API de rovers](https://api.nasa.gov/assets/html/header.html), [NASA EONET v3](https://eonet.gsfc.nasa.gov/docs/v3), [JPL Horizons](https://ssd-api.jpl.nasa.gov/doc/horizons.html), [NASA Technology Transfer](https://technology.nasa.gov/api/).

## Última preparación para Pages

Se guardaron respuestas de 28 conjuntos e imagen APOD mediante consultas reales. La fuente `DONKI/FLR` respondió 404 durante la preparación, por lo que no hay archivo para esa opción. Los datos tienen sus propias fechas de consulta y pueden quedar obsoletos; en el modelo estático no se actualizan en vivo. No se incluye la clave en estos archivos.

## Galería y respuestas completas

APOD, EPIC y la biblioteca de imágenes presentan galerías con títulos, fechas y enlaces a sus originales. Las imágenes se cargan de forma diferida; «Mostrar más imágenes» amplía los resultados de la respuesta actual. El botón «Descargar datos completos» exporta todo el JSON recibido, aunque la vista previa se limite para mantener el rendimiento. Las consultas siguen usando parámetros predefinidos y no recorren automáticamente todas las páginas de un catálogo.

La política CSP permite imágenes solo desde el propio sitio, `images-assets.nasa.gov`, `assets.science.nasa.gov` y `epic.gsfc.nasa.gov`. La clave no se añade a las URL de estas imágenes. Si NASA o la red no las sirven, la tarjeta ofrece un enlace al original. Ver [documentación oficial de EPIC](https://epic.gsfc.nasa.gov/about/api) y [biblioteca de NASA](https://images.nasa.gov/docs/images.nasa.gov_api_docs.pdf).
