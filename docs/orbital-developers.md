# ORBITAL DEVELOPERS · API v1

ORBITAL COMMAND conserva su aplicación React/Three.js y sus escenas educativas. La nueva capa permite registrar contextos de terceros, producir una propuesta de diseño estructurada y usar esas estructuras en una vista de lectura dentro de la misma app. No crea un juego independiente ni valida afirmaciones científicas.

## Estado de esta entrega

- **Frontend:** nueva sección `ORBITAL DEVELOPERS`, capacidades, plantillas, formulario, revisión antes de compartir y ruta de vista previa `/#/preview/<uuid>?token=...`. La vista utiliza `SolarSystemScene` como demostración 3D de plantilla (escenario de referencia terrestre) y un selector interactivo de misiones; no lo presenta como render derivado de datos del proyecto.
- **REST v1:** capacidades, plantillas, escritura autenticada, regeneración de propuesta, enlaces públicos/unlisted y revocación.
- **Persistencia:** migración Supabase nueva, con RLS activada y acceso exclusivamente de servidor mediante `service_role`.
- **Propuesta:** reglas deterministas (`orbital-rule-based-v1`), sin modelo de IA. Expone faltantes y advierte que los resultados educativos propuestos requieren evaluación humana.
- **MCP:** Streamable HTTP JSON-RPC 2.0 por `POST /mcp`; el servidor responde JSON. `GET` responde 405 (no ofrece SSE de servidor). Tools read-only públicas para capacidades/plantillas y tools privadas con API key.
- **No desplegado aquí:** no hay credenciales Supabase, claves de API por equipo ni backend de producción en este checkout. GitHub Pages sirve el frontend estático y no ejecuta el servidor Node. No se debe decir que los enlaces remotos ya son persistentes hasta desplegar el backend y aplicar la migración.

## Configurar almacenamiento y backend

1. Crea un proyecto Supabase independiente para el backend (puede ser el ya usado por la app, pero comparte el mismo límite operativo).
2. Ejecuta `supabase/migrations/202611150005_external_gamification_projects.sql` en el SQL Editor o con Supabase CLI.
3. En un host Node 24+ con almacenamiento de variables secretas, configura:

```dotenv
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-jwt-solo-en-el-servidor>
ORBITAL_API_KEYS=<una-clave-aleatoria-distinta-por-equipo>
ORBITAL_APP_URL=https://susan-castillo29.github.io/orbital-command
ORBITAL_ALLOWED_ORIGINS=https://susan-castillo29.github.io
```

Genera cada clave de API en un gestor seguro con al menos 32 bytes aleatorios, compártela por un canal privado y guárdala como entrada separada por comas en `ORBITAL_API_KEYS`. El servidor guarda SHA-256 de la clave propietaria, no la clave. No la incluyas en el frontend, GitHub, logs, issues o documentación.

4. Despliega el backend detrás de HTTPS. El módulo `server/orbital-platform.mjs` se monta en el servidor Node que ya sirve la app y el proxy científico. Para un backend separado, móntalo con el mismo middleware `orbitalHandler`; configúralo en `ORBITAL_ALLOWED_ORIGINS`.
5. Para modo local: `npm run build`, establece esas variables en `.env.local`, luego `npm run serve`. El servidor del proyecto escucha en localhost. Para probar API en desarrollo Vite, sus middleware llaman al mismo handler; la escritura necesita las variables anteriores.
6. Define `VITE_ORBITAL_PLATFORM_API_URL` con el origen (o URL base) del backend al compilar el frontend. Para GitHub Pages, guarda la URL pública sin secreto en el **repository variable** `ORBITAL_PLATFORM_API_URL`; el workflow de este repositorio la pasa al build y añade su origin al `connect-src` de CSP. No la guardes como un API key. El workflow estándar de Pages no configura credenciales ni despliega el backend por sí solo.
7. Publica el frontend y verifica `/api/v1/capabilities` en el backend, `https://<sitio>/openapi.yaml` y un enlace de preview desde un navegador privado/dispositivo diferente.

La columna `owner_key_hash` asocia cada proyecto a la clave de API que lo creó. Los tokens `unlisted` se generan aleatoriamente, solo el hash se guarda en base de datos y el valor plano se entrega una vez en el enlace. Revocar el enlace vuelve el proyecto privado. `public` sí puede verse sin token; activarlo requiere confirmación expresa en la API/UI.

## REST

Base path: `/api/v1`. Todas las escrituras y la gestión/lectura de proyectos propios requieren `Authorization: Bearer <ORBITAL_API_KEY>`. Rutas públicas: `GET /capabilities`, `GET /templates` y `GET /previews/{uuid}` (solo si el proyecto es público; para `unlisted` requiere `?token=`). La clave jamás debe llamarse desde JavaScript público de una integración externa: haz las escrituras desde su servidor. El formulario de ORBITAL solicita una clave emitida por el administrador y solo la mantiene en memoria de la pestaña.

| Método y ruta | Propósito | Acceso |
| --- | --- | --- |
| `GET /api/v1/capabilities` | Funciones, estado de persistencia y versión | Público |
| `GET /api/v1/templates` | Plantillas reutilizables | Público |
| `POST /api/v1/projects` | Validar, almacenar contexto y generar propuesta | API key |
| `GET /api/v1/projects/{id}` | Consultar un proyecto creado con esa misma API key | Propietario |
| `POST /api/v1/projects/{id}/proposal` | Regenerar propuesta desde el contexto almacenado | Propietario |
| `POST /api/v1/projects/{id}/preview` | Crear/rotar un enlace unlisted de solo lectura | Propietario |
| `DELETE /api/v1/projects/{id}/share` | Revocar y hacer privado | Propietario |
| `PATCH /api/v1/projects/{id}/visibility` | `private` o `public` (requiere `publishConsent: true`) | Propietario |
| `GET /api/v1/previews/{id}?token=…` | Obtener la vista filtrada y autorizada | Público/token |

### Crear un proyecto desde Node

```js
const api = process.env.ORBITAL_API_URL;
const key = process.env.ORBITAL_API_KEY; // secreto del servidor del integrador
const draftResponse = await fetch(`${api}/api/v1/projects`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Observatorio de arrecifes', teamName: 'Aula Oceánica',
    description: 'Proyecto educativo para registrar observaciones y aprender a comunicar evidencia.',
    problem: 'Cómo analizar observaciones marinas y explicar los límites de los datos.',
    objectives: ['Registrar observaciones', 'Explicar límites de las fuentes'],
    audience: 'Estudiantes', topic: 'Conservación marina',
    learningGoals: 'Diferenciar observaciones de conclusiones y citar las fuentes.',
    visibility: 'private'
  })
});
if (!draftResponse.ok) throw new Error((await draftResponse.json()).error.message);
const { project } = await draftResponse.json();
const previewResponse = await fetch(`${api}/api/v1/projects/${project.id}/preview`, {
  method: 'POST', headers: { Authorization: `Bearer ${key}` }
});
const { url } = await previewResponse.json(); // copiar/enviar solo con autorización
```

Los campos admiten longitudes limitadas; `objectives` debe contener 1–8 objetivos (300 caracteres cada uno). El formulario acepta `.txt`, `.md` o `.json` de hasta 64 KB. Otros cuerpos tienen límite 128 KB. No se ejecutan ni se interpretan instrucciones adjuntas; el generador no emplea un LLM.

Errores JSON comunes: `400 invalid_request`, `401 unauthorized`, `403 origin_denied`, `404 not_found` (también oculta recursos no autorizados), `413` cuerpo demasiado grande, `429 rate_limit` y `503 service_unavailable` si falta configuración. El límite inicial por proceso es 30 solicitudes por minuto/IP; requiere Redis/gateway para escalar horizontalmente.

## MCP

URL: `/mcp`. Implementa **Streamable HTTP** del protocolo MCP 2025-11-25: POST JSON-RPC, cabecera `Accept: application/json, text/event-stream`, respuesta JSON; GET responde 405 porque no se habilita un flujo server-to-client SSE. Las notificaciones aceptadas responden 202. El backend valida `Origin`, liga su proceso local a localhost en modo local y permite configurar origins exactos. Escrituras requieren la misma clave Bearer.

Herramientas: `get_platform_capabilities`, `get_project_templates`, `submit_project_context`, `generate_gamification_proposal`, `create_project_preview` y `get_project_preview`. Ejemplo de descubrimiento:

```bash
curl -X POST "$ORBITAL_API_URL/mcp" \
  -H 'Accept: application/json, text/event-stream' \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $ORBITAL_API_KEY" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

Registra la URL del backend en un cliente MCP que admita Streamable HTTP. No configures `SUPABASE_SERVICE_ROLE_KEY` en el cliente MCP; solo el backend la conoce. MCP y REST comparten servicios y permisos, pero son interfaces diferentes.

## Diagnóstico y límites

La aplicación original sigue usando React 19, TypeScript, Vite 6, Three.js y Supabase Realtime para colaboración. Las escenas y módulos continúan en el enrutador actual; el nuevo flujo reutiliza contratos de misiones/roles conceptuales, no genera contenido Three.js arbitrario desde proyectos externos. Las capacidades cooperativas se etiquetan experimental porque integrar una nueva vista de proyecto en una sesión 3D multiusuario aún no está implementado. Las propuestas son borradores editoriales; no sustituyen revisión científica, pedagógica, de accesibilidad ni la evaluación del equipo. No existe una alianza institucional implícita.

**Estado del despliegue:** este checkout deja API, MCP, migración, formulario y página listos. El sitio estático GitHub Pages solo puede servir la interfaz/documentación; para persistencia compartida deben desplegar Node y Supabase, aplicar la migración y configurar variables secretas, URL/origin del cliente, clave por equipo y CSP. Sin esto, la UI informa que el API no está configurado y no crea enlaces vacíos.
