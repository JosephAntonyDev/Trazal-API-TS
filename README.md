# Trazal-API-TS · 0.6.0

Para trabajar con el equipo: [guía de contribución, comprobaciones y tareas](CONTRIBUTING.md).

Backend TypeScript para Cloudflare Workers. PostgreSQL conserva documentos JSONB de obra con revisiones; SQLite sigue siendo la base de trabajo del escritorio. No requiere un servidor Node permanente. Este repositorio contiene la API independiente; el cliente C# / SQLite está en [Trazal-app](https://github.com/JosephAntonyDev/Trazal-app). Desplegado en Cloudflare el 15 de noviembre de 2026: [estado público](https://trazal-api.trazaldev.workers.dev/health). Hyperdrive y Firebase están configurados; la lectura/escritura remota con sesión real sigue pendiente de prueba.

## Empezar aquí

Lee [Estado y continuidad](docs/ESTADO-Y-CONTINUIDAD.md): recursos actuales, procedimiento realizado, variables de build/runtime, incorporación de compañeros, evidencia y próximos pasos. Para reproducir la instalación usa [Cloudflare y GitHub](docs/CLOUDFLARE-GITHUB.md); para las reglas comerciales, [modelo local y nube](docs/MODELO-LOCAL-Y-NUBE.md).

## Qué funciona

Arquitectura hexagonal por módulos de identidad y sincronización: [estructura y puertos](docs/ARCHITECTURE.md). HTTP, Firebase, PostgreSQL y SHA-256 son adaptadores; las reglas y casos de uso no dependen de esos proveedores.

- Verificación de Firebase ID tokens mediante RS256, claves públicas oficiales con caché, issuer, audience, expiración, issued-at, auth_time, UID y correo confirmado. No acepta custom tokens ni tiene modo anónimo de escritura.
- Aislamiento por UID autenticado en cada consulta. El cliente no elige un propietario ni envía cadenas SQL.
- Subida y descarga de obras completas, línea base, avances y gastos; cantidades e importes viajan como cadenas decimales. La validación utiliza enteros escalados, no aritmética binaria para comparar cantidades.
- Revisión optimista: `If-Match` debe coincidir con la obra del servidor. Dos equipos no se sobrescriben silenciosamente. Una solicitud repetida con la misma clave y contenido conserva el resultado; una clave reutilizada con otro contenido se rechaza.
- Cursor por cuenta ordenado bajo bloqueo transaccional. El reloj se confirma junto con el documento para no omitir cambios entre transacciones concurrentes.
- Catálogo/programa fijados inmutables, avances existentes conservados, límite del 100 %, categorías y cantidades validadas.
- El cliente de Trazal-app implementa cola SQLite durable, reintento después de perder una respuesta, descarga transaccional y detección de una edición local durante la descarga. Restaurar un `.trazal` borra cola/cursor/vinculación de la copia, evitando reproducir solicitudes antiguas.

## Desarrollo sin cuentas de nube

Requiere Node 22.12 o posterior en el equipo de desarrollo. Esto **no se instala en el Windows 7 del ingeniero**; allí corre únicamente C# / WPF / .NET Framework 4.8.

```powershell
npm ci
npm run typecheck
npm test
npm run build
```

`build` empaqueta con Wrangler `--dry-run`; no publica. La telemetría de Wrangler se desactiva solo para estos comandos y los logs se escriben en `.wrangler/logs`, ignorado por Git.

Las pruebas de datos usan PGlite: motor PostgreSQL embebido para validar SQL y transacciones, sin Docker ni datos reales. No se distribuye en el Worker. Las pruebas de autenticación firman JWT de prueba con claves generadas durante la ejecución. No se simula Google dentro del Worker publicado.

La API y sus pruebas se ejecutan independientemente del escritorio. Para la prueba adicional de integración con .NET en Windows, compila primero Trazal-app con `.\build.ps1 -Test`. Después, desde este repositorio, indica la ubicación del ejecutable y ejecuta:

```powershell
$env:TRAZAL_DESKTOP_TEST_EXE = 'C:\ruta\Trazal-app\build\output\Release\tests\Trazal.Tests.exe'
npm run test:desktop
```

Si conservas las carpetas locales hermanas `Trazal_API_TS` y `Trazal_Desktop`, el script encuentra el ejecutable automáticamente y no necesitas definir esa variable.

Arranca un servidor de pruebas exclusivamente en `127.0.0.1`, crea PostgreSQL efímero y ejecuta dos SQLite separados a través de `CloudClient`. Prueba subida, descarga, actualización y conflicto. El autenticador fijo existe únicamente en ese script de pruebas; el entrypoint de producción usa Firebase.

`npm run dev` arranca el Worker local. `/health` funciona sin configuración; las rutas privadas responden 503 mientras falte Firebase/PostgreSQL. Para una conexión real local, copia `.env.example` a `.dev.vars` y configura un PostgreSQL de desarrollo y el proyecto Firebase. La URL de la base y los tokens nunca se guardan en Git.

## Despliegue automático desde GitHub

Sigue la [guía paso a paso de Cloudflare, PostgreSQL y GitHub](docs/CLOUDFLARE-GITHUB.md). Conecta `JosephAntonyDev/Trazal-API-TS`, rama `main`, Worker `trazal-api`, raíz `/`, build `npm run check` y deploy `npm run deploy`. En las variables del **build** configura `HYPERDRIVE_ID`, `FIREBASE_PROJECT_ID=trazal-773ba` y `NODE_VERSION=24`. Desactiva previews de otras ramas durante el piloto.

El deploy genera la configuración de producción desde esos valores; ya no depende de un archivo local no versionado. Las comprobaciones no usan una base real. Las migraciones siguen siendo un paso administrativo separado.

### Preparación de infraestructura

1. Crear PostgreSQL en el proveedor elegido, con TLS. El plan de Workers no incluye alojamiento PostgreSQL. Separar el usuario de migraciones del usuario de ejecución; este último solo necesita SELECT/INSERT/UPDATE/DELETE sobre `accounts`, `works`, `sync_requests` y acceso al esquema. No exponer la base directamente al escritorio.
2. Con `DATABASE_URL` en el entorno del equipo administrador, ejecutar `npm run migrate`. La migración usa transacción y bloqueo; no borra tablas y solo se aplica una vez. No correr migraciones desde peticiones HTTP.
3. Crear Hyperdrive apuntando a esa base con **query caching desactivado** para lecturas de sincronización consistentes. No hace falta contratar Durable Objects, KV ni R2 para este alcance.
4. `npm run prepare:deploy` genera `wrangler.production.jsonc` (ignorado por Git) a partir de `wrangler.jsonc` y las variables de build. Activa `workers_dev: true`, desactiva URLs de preview y añade:

```json
{
  "vars": { "FIREBASE_PROJECT_ID": "proyecto-real" },
  "hyperdrive": [{ "binding": "HYPERDRIVE", "id": "id-real-de-hyperdrive" }]
}
```

La generación conserva `main`, flags y cron. El ID del proyecto es público; la contraseña de PostgreSQL se guarda en Hyperdrive. `DATABASE_URL` es el fallback local, no debe ponerse en `vars` de producción. El escritorio no necesita CORS; al habilitar un cliente web será necesario extender la configuración con orígenes concretos.

5. Iniciar sesión en Wrangler y ejecutar `npm run deploy` después de revisar el destino. Verificar `/health`, sesión Firebase real, PostgreSQL y límites de CPU antes de habilitar a un usuario.
6. Configurar `apiKey`, `projectId=trazal-773ba` y `apiOrigin=https://trazal-api.trazaldev.workers.dev` en el cliente Trazal-app 0.6.4. El módulo de identidad de escritorio ya implementa login/registro/recuperación, renovación y persistencia opcional mediante Windows DPAPI; falta validarlo con el proyecto real. `CloudClient` recibe ID tokens en memoria. El Worker rechaza un correo sin confirmar con `403 email_unverified`. Registro y contraseñas van directamente a Firebase, nunca a esta API.

Para la verificación básica de ID tokens el Worker usa claves públicas, no necesita un JSON de cuenta de servicio. Todavía no se consulta revocación individual de Firebase: un token firmado es válido hasta expirar. `accounts.disabled` permite bloquear la sincronización de una cuenta de inmediato; la administración de ese campo es externa por ahora.

## API v1

Todas las rutas `/v1` requieren `Authorization: Bearer <Firebase ID token>`. Respuestas privadas con `Cache-Control: no-store`. Errores incluyen `error.code` y `error.message`; un conflicto de revisión también entrega la revisión remota. Cada respuesta lleva `X-Request-Id`, sin registrar documentos, contraseñas ni tokens.

| Ruta | Resultado |
| --- | --- |
| GET `/health` | Servicio y versión, sin consulta a PostgreSQL. |
| GET `/v1/me` | UID verificado y habilitación de la cuenta. |
| GET `/v1/sync/changes?cursor=0` | Hasta 100 IDs/revisiones, `nextCursor` y `hasMore`; sin documentos completos. |
| GET `/v1/works/{id}` | `{ revision, document }` y ETag. |
| PUT `/v1/works/{id}` | Documento schemaVersion 1. Cabeceras `If-Match: "0"` para crear o revisión conocida para editar, e `Idempotency-Key` de 32 caracteres hexadecimales. Retorna `{ revision }`. |

Las revisiones/cursor son cadenas enteras para conservar precisión. El ID local de 32 hexadecimales se conserva. Los perfiles, temas, archivos Excel originales, PDFs y adjuntos no se suben.

## Decisiones y límites del piloto

- Sincronización manual de las obras del espacio local: no hay consultas continuas ni una petición por pulsación de teclado. Obras sin cambios no se vuelven a subir. La unidad de conflicto y escritura es la obra completa; **aún no hay deltas por registro**. Es una primera versión conservadora para no mezclar presupuestos y líneas base de equipos distintos.
- Máximo 512 KiB por documento, 100 obras por cuenta, 2,000 conceptos, 10,000 días programados, 5,000 avances y 5,000 gastos por obra; rige también el límite de bytes. Al superar un límite, la obra permanece en SQLite. Debemos medir obras reales antes de ampliar límites o pasar a deltas.
- El cron elimina hasta 1,000 recibos de idempotencia de más de 30 días cada hora. No borra obras. Reintentar después de esa ventana mantiene la protección por revisión y puede requerir revisar un conflicto.
- 120 operaciones exitosas por minuto/cuenta; respuesta 429 con `Retry-After`. No es una protección global contra abuso del endpoint. Revisar métricas reales y reglas de acceso antes de abrir registro público.
- Actualmente cada usuario tiene un espacio propio; no hay organizaciones, permisos entre compañeros, invitaciones, eliminaciones remotas ni resolución visual de conflictos. Cuando hay conflicto, una copia queda en cada lado y la obra deja de sincronizarse hasta implementar/revisar la resolución.
- Un espacio SQLite se vincula a un UID y un servidor. Cambiar de cuenta exige un espacio separado; se rechaza reutilizar la misma cola con otra identidad.
- Workers Free tiene actualmente 100,000 peticiones/día y 10 ms de CPU por petición; Hyperdrive Free tiene 100,000 consultas/día. Autenticación, JSON y validación deben medirse en Cloudflare: las pruebas locales **no certifican** esos 10 ms. PostgreSQL tiene costos y límites propios. Se configuraron servicios remotos para el piloto el 15/11/2026; no se contrataron planes de pago en ese procedimiento.

Fuentes: [Workers Free](https://developers.cloudflare.com/workers/platform/limits/), [Hyperdrive](https://developers.cloudflare.com/hyperdrive/platform/pricing/), [Postgres.js en Workers](https://developers.cloudflare.com/hyperdrive/examples/connect-to-postgres/postgres-drivers-and-libraries/postgres-js/), [Firebase ID tokens](https://firebase.google.com/docs/auth/admin/verify-id-tokens).
