# ORBITAL DEVELOPERS · API v1

ORBITAL COMMAND conserva la aplicación React/Three.js y sus escenarios educativos. La sección ORBITAL DEVELOPERS permite guardar el contexto científico o educativo como borrador, generar una propuesta de diseño determinista y compartir una vista previa de solo lectura.

## Estado

- Frontend integrado con Supabase Auth. El formulario permite registrar/iniciar sesión y guarda borradores privados por cuenta.
- Supabase Edge Function `orbital-gamification` implementa la API REST y accede a PostgreSQL con credenciales administradas por Supabase.
- El cliente deriva la URL de la función de `VITE_SUPABASE_URL`. GitHub Pages no necesita alojar Node ni una variable adicional `ORBITAL_PLATFORM_API_URL`.
- Para compatibilidad, el proyecto conserva `server/orbital-platform.mjs`, un servidor Node con API keys por equipo y MCP Streamable HTTP. El formulario web usa la Edge Function.
- Esta entrega incluye el código, pero no pudo desplegar la función ni aplicar migraciones en el proyecto real porque no tiene sus credenciales administrativas.

## Despliegue Supabase

1. En GitHub Actions configura los secretos de build existentes `SUPABASE_URL` y `SUPABASE_PUBLISHABLE_KEY`. Estos valores son públicos al compilar; nunca coloques `service_role`, `sb_secret_`, contraseñas ni tokens personales en GitHub Actions o en `VITE_*`.
2. En Supabase SQL Editor ejecuta `supabase/migrations/202611150005_external_gamification_projects.sql` y luego `202611150006_external_project_user_ownership.sql`. Si 005 ya estaba aplicada, ejecuta 006.
3. En un terminal autenticado mediante Supabase CLI, enlaza el proyecto y publica la función:

```sh
supabase link --project-ref <project-ref>
supabase functions deploy orbital-gamification --no-verify-jwt
supabase secrets set ORBITAL_APP_URL=https://susan-castillo29.github.io/orbital-command ORBITAL_ALLOWED_ORIGINS=https://susan-castillo29.github.io
```

`--no-verify-jwt` es necesario porque la función permite lecturas públicas. La función valida el JWT de Supabase en las operaciones que requieren sesión. Supabase provee `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` en el entorno de la función; la clave de servicio nunca se copia a GitHub ni al navegador.

4. Ejecuta de nuevo el workflow de GitHub Pages. El frontend llamará a `https://<project-ref>.supabase.co/functions/v1/orbital-gamification` automáticamente.
5. Verifica `https://<project-ref>.supabase.co/functions/v1/orbital-gamification/api/v1/capabilities`. Crea una cuenta, inicia sesión, guarda un borrador y prueba el enlace de vista previa desde una sesión/navegador aparte.

Supabase Auth debe tener habilitado email/contraseña y el correo de confirmación configurado. Añade `https://susan-castillo29.github.io/orbital-command/` a las URL de redirección permitidas. El usuario debe poder iniciar sesión antes de guardar. El formulario solicita consentimiento para almacenar el contexto y su archivo como borrador privado.

## REST

Base: `/functions/v1/orbital-gamification/api/v1`. Todas las solicitudes llevan `apikey: <publishable-key>`. Operaciones privadas llevan además `Authorization: Bearer <access-token-de-supabase>`. Nunca uses la `service_role` en una petición de cliente.

| Método y ruta | Propósito | Acceso |
| --- | --- | --- |
| `GET /capabilities` | Capacidades y estado de almacenamiento | Público |
| `GET /templates` | Plantillas reutilizables | Público |
| `POST /projects` | Validar, guardar contexto y generar propuesta | Usuario autenticado |
| `GET /projects/{id}` | Consultar proyecto propio | Propietario |
| `POST /projects/{id}/proposal` | Regenerar propuesta | Propietario |
| `POST /projects/{id}/preview` | Crear/rotar un enlace unlisted | Propietario |
| `DELETE /projects/{id}/share` | Revocar enlace y hacer privado | Propietario |
| `PATCH /projects/{id}/visibility` | Cambiar a private/public | Propietario; public exige consentimiento |
| `GET /previews/{id}` | Abrir vista pública | Público o token unlisted |

El POST de proyecto acepta `name`, `teamName`, `description` (25–5000 caracteres), `problem`, `objectives` (1–8, máximo 300 caracteres c/u), `audience`, `topic`, `learningGoals`, `sourceText` opcional (máximo 64 KB) y `visibility: private`. La propuesta no usa IA ni valida afirmaciones científicas.

La tabla activa RLS y niega permisos directos de lectura/escritura a `anon` y `authenticated`. Solo la Edge Function consulta/escribe usando el rol de servicio; antes de cualquier operación privada valida el token en Supabase Auth y filtra por `owner_user_id`. Proyectos preexistentes del backend Node pueden conservar `owner_key_hash`. Los enlaces unlisted almacenan SHA-256 del token, que solo se entrega al crearlos; revocar los vuelve privados.

## API Node/MCP alternativa

`server/orbital-platform.mjs` conserva API keys de servidor, configuración `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ORBITAL_API_KEYS`, `ORBITAL_APP_URL` y `ORBITAL_ALLOWED_ORIGINS`, además del endpoint MCP `/mcp`. Usa `docs/supabase-setup.md` para ejecutar el servidor Node. Las API keys son para integraciones server-to-server: nunca las insertes en JavaScript público.

Las propuestas son borradores editoriales. No sustituyen revisión científica, pedagógica, de accesibilidad o evaluación del equipo. La vista 3D de preview reutiliza el escenario existente como demostración, no crea una escena científica personalizada.
