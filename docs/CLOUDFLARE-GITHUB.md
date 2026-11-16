# Publicar Trazal API desde GitHub

Estado al 15/11/2026: el Worker ya está publicado. Consulta [Estado y continuidad](ESTADO-Y-CONTINUIDAD.md) para los identificadores reales, el procedimiento realizado y las pruebas pendientes. Esta guía sirve para reproducir o mantener la instalación; no repetir la creación de tablas/roles sobre la base ya configurada.

El flujo configurado es: push a `main` → Cloudflare instala dependencias → ejecuta las comprobaciones → despliega `trazal-api`. Si falla una comprobación, no se ejecuta el despliegue. El escritorio no se actualiza con este flujo.

El [modelo local y de suscripción](MODELO-LOCAL-Y-NUBE.md) guarda solo datos estructurados. Al vencer la suscripción se conservará lo sincronizado y se bloquearán nuevas escrituras de obras; el control comercial todavía está pendiente de implementar. Este despliegue inicial es para pruebas técnicas.

## 1. PostgreSQL

El piloto utiliza Neon PostgreSQL. Cloudflare Hyperdrive conecta PostgreSQL; no crea ni aloja la base. No se necesita D1, Firestore, KV o R2 para esta API.

1. En [Neon](https://console.neon.tech/), la opción **Startup** del cuestionario corresponde a este proyecto. En la creación del proyecto usa `trazal`, plan **Free**, proveedor **AWS** y **US East (N. Virginia), us-east-1** como punto de partida; la latencia se medirá después. Conserva la versión estable predeterminada de PostgreSQL y el nombre real de la base (puede ser `neondb`). Neon Auth no es necesario porque ya usamos Firebase. El cuestionario de uso no sustituye la elección del plan.
2. Abre **SQL Editor** con el propietario de la base. En una base nueva, ejecuta el contenido de [`migrations/001_sync.sql`](../migrations/001_sync.sql) poniendo `BEGIN;` antes y `COMMIT;` después. No lo ejecutes otra vez si ya existen las tablas; `SELECT * FROM schema_migrations;` debe mostrar versión 1.
3. Para migraciones desde un equipo administrador, la alternativa es `npm run migrate` con `DATABASE_URL` en su entorno. Ese comando comprueba la versión y utiliza transacción/bloqueo. No se ejecuta automáticamente en cada despliegue ni se conecta a PostgreSQL en las pruebas de CI.
4. Crea un usuario de ejecución separado. En SQL Editor, reemplaza la contraseña y el nombre real de la base antes de ejecutar:

```sql
CREATE ROLE trazal_runtime LOGIN PASSWORD 'REEMPLAZAR_POR_CONTRASENA_UNICA';
GRANT CONNECT ON DATABASE neondb TO trazal_runtime;
GRANT USAGE ON SCHEMA public TO trazal_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON accounts, works, sync_requests TO trazal_runtime;
```

5. En **Connect**, elige esa base y `trazal_runtime`; desactiva **Connection pooling** y copia la conexión directa. La contraseña se pega únicamente en Hyperdrive. No la pongas en GitHub, en el escritorio ni en un mensaje del chat.

## 2. Hyperdrive

1. En Cloudflare: **Storage & databases → Postgres & MySQL (Hyperdrive) → Connect database** (en otras versiones del panel, **Create configuration**). Para la base existente en Neon usa esa opción; **Create PlanetScale database** crea una base con otro proveedor.
2. Nombre: `trazal-postgres`. Usa la conexión directa del paso anterior; conserva TLS y los datos del proveedor.
3. Desactiva **Query caching / Caché de consultas**. La sincronización necesita leer inmediatamente lo que acaba de guardar.
4. Crea la configuración y copia su **ID** (32 caracteres). Se obtiene del último segmento de la URL del panel `/workers/hyperdrive/<ID>`, sin parámetros posteriores. El ID no es el host ni la contraseña de PostgreSQL. En el piloto es `53b66912c5c94cbbbbc49a00eff3e535`.

## 3. Conectar GitHub a Workers Builds

Desde la pantalla inicial de Cloudflare pulsa **Create app**, o entra a **Compute → Workers & Pages → Create application**. Elige importar/conectar un repositorio GitHub para un **Worker**.

Autoriza acceso al repositorio `JosephAntonyDev/Trazal-API-TS`. No elijas `Trazal-app`, `Trazal-mockup` ni una carpeta `backend` del escritorio.

| Campo | Valor |
| --- | --- |
| Nombre del Worker | `trazal-api` (debe coincidir con Wrangler) |
| Rama de producción | `main` |
| Directorio raíz | `/` (la raíz del repositorio) |
| Build command | `npm run check` |
| Deploy command | `npm run deploy` |
| Builds de otras ramas / previews | Desactivados durante este piloto |

En las **variables del build** (opciones avanzadas al crear, o **Settings → Build → Variables and secrets**) añade:

| Variable | Valor |
| --- | --- |
| `HYPERDRIVE_ID` | `53b66912c5c94cbbbbc49a00eff3e535` en el piloto; usar el nuevo ID si se crea otro entorno |
| `FIREBASE_PROJECT_ID` | `trazal-773ba` |
| `NODE_VERSION` | `24` |

Estas variables son del **build**, no solo variables de ejecución del Worker. Si la pantalla inicial no permite agregarlas, crea el proyecto, añádelas en Settings y reintenta el build. Un despliegue mediante `npm run deploy` sin `HYPERDRIVE_ID` fallará de forma explícita. El comando predeterminado `npx wrangler deploy` omite nuestro generador y puede terminar con éxito sin configurar los recursos: no usarlo para publicar este piloto.

La sección **Runtime variables and secrets** es distinta. Nuestro script genera allí `FIREBASE_PROJECT_ID`; también crea el binding de recurso `HYPERDRIVE`. No duplicar manualmente estas entradas ni agregar `DATABASE_URL`, contraseña SQL o API key de Firebase. `NODE_VERSION` se utiliza solo en el build.

Cloudflare gestiona la autorización del despliegue al conectar GitHub. No agregues un token de Cloudflare al repositorio. La instalación de dependencias es parte del sistema de builds; el repo incluye `package-lock.json` y `.nvmrc`.

`npm run deploy` genera `wrangler.production.jsonc` con el binding `HYPERDRIVE`, Firebase y `workers_dev: true`, y después ejecuta Wrangler. El archivo generado está ignorado por Git. No incluye contraseña de base ni tokens del entorno de build. Editar bindings solo en el panel puede desalinearlos del siguiente despliegue: conserva el ID en las variables del build.

## 4. Comprobar y conectar escritorio

1. Espera un despliegue exitoso y abre el enlace `https://trazal-api.trazaldev.workers.dev/health` que te da Cloudflare. Debe devolver JSON del servicio. `/` puede responder 404; usa `/health`.
2. `/health` solo prueba que el Worker responde, **no** verifica PostgreSQL ni Firebase. Sin token, `/v1/me` debe rechazar la petición.
3. Pon el origen HTTPS real en `apiOrigin` de `authsettings.json`, junto al ejecutable; sin `/health` ni `/v1`. Reinicia Trazal.
4. Inicia sesión con correo confirmado, crea una obra ficticia en ese espacio y pulsa sincronizar. Comprueba descarga desde un segundo espacio/equipo. No migres obras reales antes de esta prueba.
5. Revisa errores y consumo de CPU en Cloudflare. El límite del plan gratis debe medirse con las peticiones reales.

Cada push posterior a `main` debe producir un build con el mismo commit visible en GitHub. La migración de la base es un paso administrativo separado; futuras migraciones requieren revisión y respaldo.

## Estado verificado y siguiente paso

El 15/11/2026 pasaron las 18 pruebas de CI y se desplegó con Firebase e Hyperdrive. Se comprobó en vivo `/health` con HTTP 200 y `/v1/me` sin token con HTTP 401. La migración 001 y la caché desactivada están confirmadas mediante el panel.

Falta configurar el origen en cada instalación del escritorio y probar login, subida y descarga reales. La prueba de salud no consulta la base. Sigue el ejercicio de [Estado y continuidad](ESTADO-Y-CONTINUIDAD.md#próxima-prueba-real-paso-a-paso). No hace falta compartir contraseña PostgreSQL, token de Cloudflare ni cuenta de servicio Firebase.

Referencias: [Workers Builds](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/), [ramas](https://developers.cloudflare.com/workers/ci-cd/builds/build-branches/), [Hyperdrive con Neon](https://developers.cloudflare.com/hyperdrive/examples/connect-to-postgres/postgres-database-providers/neon/), [caché](https://developers.cloudflare.com/hyperdrive/concepts/query-caching/).
