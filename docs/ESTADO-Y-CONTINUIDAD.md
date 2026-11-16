# Trazal · estado y guía para continuar

Actualizado el **16 de noviembre de 2026**. Punto de entrada para compañeros y agentes que no tienen el historial del chat. Este documento registra el despliegue del piloto, no una aprobación para uso comercial.

Para incorporarse, repartir tareas y revisar PR: [Trabajo en equipo](TRABAJO-EN-EQUIPO.md).

## Repositorios y responsabilidades

| Proyecto | Repositorio | Responsabilidad |
| --- | --- | --- |
| API | [Trazal-API-TS](https://github.com/JosephAntonyDev/Trazal-API-TS) | TypeScript, Worker, identidad verificada y sincronización PostgreSQL. Arquitectura hexagonal por módulos. |
| Escritorio | [Trazal-app](https://github.com/JosephAntonyDev/Trazal-app) | C# / WPF / .NET Framework 4.8, SQLite y cliente Firebase REST. Vista previa 0.6.5. |
| Mockup | [Trazal-mockup](https://github.com/JosephAntonyDev/Trazal-mockup) | React / Vite para revisar flujos con el ingeniero. Cuenta/login/registro solo visuales, sin Firebase ni conexión al backend. |
| Marca | [Trazal-kit](https://github.com/JosephAntonyDev/Trazal-kit) | Kit de marca; propuesta amarilla seleccionada. |

El mockup está en https://trazal-mockup.vercel.app/. No todo lo mostrado allí existe en el escritorio ni en el contrato de sincronización. La carpeta `backend/` dentro de Trazal-app es histórica: el desarrollo y despliegue de API se hacen únicamente en este repositorio.

Flutter fue la preferencia inicial; se inició WPF por el requisito del primer usuario de utilizar Windows 7. La compatibilidad real con Windows 7 SP1, su arquitectura y rendimiento siguen pendientes. No cambiar de tecnología basándose en el plan antiguo del mockup.

## Infraestructura configurada

Los siguientes son identificadores de configuración, no contraseñas. Acceder a los paneles requiere que el responsable conceda acceso a cada compañero con su propia cuenta.

| Recurso | Valor observado |
| --- | --- |
| Worker | `trazal-api` |
| Origen público | `https://trazal-api.trazaldev.workers.dev` |
| API desplegada | `0.6.0` |
| Versión del despliegue comprobado | `2cf20154-d28b-4eb1-b4b6-803099667e88` |
| Firebase project ID | `trazal-773ba` |
| Firebase Auth | Correo/contraseña y Google habilitados en consola |
| Neon, nombre del proyecto | `trazal` (antes `my-first-project`) |
| Neon project ID | `solitary-hat-88632140` |
| Neon rama / base | `production` / `neondb` |
| Neon región / plan observado | AWS US East 1, N. Virginia (`us-east-1`) / Free |
| Esquema instalado | Migración `001_sync.sql`, versión `1` |
| Usuario de ejecución PostgreSQL | `trazal_runtime` |
| Hyperdrive | `trazal-postgres` |
| Hyperdrive ID | `53b66912c5c94cbbbbc49a00eff3e535` |
| Binding dentro del Worker | `HYPERDRIVE` |
| Caché de consultas Hyperdrive | Desactivada |
| Origen de Hyperdrive | Conexión directa de Neon, sin el pooling de Neon, con TLS |
| Git conectado a Workers Builds | `JosephAntonyDev/Trazal-API-TS`, rama `main`, raíz `/` |

El ID de Hyperdrive se puede recuperar del último segmento de la dirección del panel al abrir `trazal-postgres`: `/workers/hyperdrive/<ID>`. No es el host de Neon, la contraseña ni la cadena `postgresql://...`.

## Qué se verificó y qué no

| Comprobación | Resultado y alcance |
| --- | --- |
| TypeScript y 18 pruebas de API | Pasaron en Cloudflare Builds el 15/11/2026. Los tests usan claves de prueba y PGlite; no prueban la base remota. |
| Despliegue | Exitoso a las 21:49 UTC (15:49 de Ciudad de México); utilizó `npm run deploy`. El log muestra ambos bindings de producción. |
| `GET /health` real | HTTP 200 a las 21:50 UTC; cuerpo `{"service":"trazal-api","version":"0.6.0"}`. Esta ruta no consulta Neon. |
| `GET /v1/me` real sin token | HTTP 401, código `authentication_required`, mensaje `Inicia sesión para sincronizar.` |
| Esquema Neon | La captura del SQL Editor muestra versión 1 aplicada a las 21:21:25 UTC y cuatro tablas en la consulta de comprobación. |
| Login real Firebase / Google | Pendiente de prueba completa desde el escritorio. Habilitar proveedores no equivale a comprobar el flujo. |
| Lectura/escritura real Worker → Hyperdrive → Neon | Pendiente de prueba autenticada. El despliegue y `/health` no la certifican. |
| Recuperación en otro equipo y conflicto remoto | Probados con entorno local de integración anteriormente; pendiente con la infraestructura real. |
| Windows 7, CPU del Worker y costos reales | Pendientes de medir. El `Worker Startup Time` del log no es la CPU de cada petición. |

## Procedimiento que se realizó

1. En Firebase `trazal-773ba` se habilitaron Correo/contraseña y Google. Se obtuvo la configuración de app Web para el cliente REST del escritorio; no se creó Firestore.
2. En Neon se eligió una base PostgreSQL y la región N. Virginia, rama `production`, base `neondb`. Después se renombró el proyecto a `trazal`; el ID del proyecto se conservó.
3. En SQL Editor se ejecutó la migración 001 dentro de `BEGIN;` / `COMMIT;`. Al repetirla apareció `relation "accounts" already exists`. Se hizo `ROLLBACK;` y consultas de solo lectura; se confirmó que la primera aplicación ya estaba guardada. No se borraron ni recrearon tablas.
4. Se creó `trazal_runtime`, con conexión a `neondb`, uso de `public` y SELECT/INSERT/UPDATE/DELETE sobre `accounts`, `works` y `sync_requests`. El propietario se reserva para migraciones. La contraseña se configuró fuera del repositorio.
5. En Neon Connect se seleccionó `trazal_runtime`, se desactivó Connection pooling y se copió la conexión directa. En Cloudflare Hyperdrive se eligió conexión a base pública, nombre `trazal-postgres`, y se dejó desactivada la caché de consultas. La contraseña se almacena en Hyperdrive.
6. Se conectó GitHub al Worker. El primer deploy ejecutó `npx wrangler deploy`: publicó la configuración base, sin Firebase/Hyperdrive y sin la URL pública configurada por nuestro script. No fue suficiente aunque el build salió verde.
7. Se cambió el comando a `npm run deploy`, se agregaron las variables de **Builds** descritas abajo y se repitió el build. La configuración generada añadió Firebase, Hyperdrive y `workers_dev: true`.
8. Se verificaron los endpoints públicos/protegidos con solicitudes HTTPS. No se crearon usuarios ni obras remotas durante esa comprobación.

Para repetir la instalación desde cero, consultar [Cloudflare y GitHub](CLOUDFLARE-GITHUB.md). En la instalación actual no volver a crear la migración ni el rol.

Para comprobar el esquema desde el SQL Editor con el propietario, usar consultas de solo lectura:

```sql
SELECT version, applied_at FROM public.schema_migrations ORDER BY version;
SELECT tablename FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('schema_migrations', 'accounts', 'works', 'sync_requests')
ORDER BY tablename;
```

Si el editor muestra una transacción fallida, pulsar **ROLLBACK** antes de estas consultas. La versión esperada hoy es 1 y la segunda consulta devuelve cuatro tablas; esto confirma presencia, no valida por sí solo cada permiso o columna. `npm run migrate` comprueba/aplica actualmente solo la migración 001; al añadir migraciones futuras habrá que ampliar el ejecutor, no basta con crear otro archivo SQL.

## Variables: ubicación exacta

En **Worker → Settings → Builds → Production → Variables and secrets**, como texto:

| Nombre | Valor actual | Uso |
| --- | --- | --- |
| `HYPERDRIVE_ID` | `53b66912c5c94cbbbbc49a00eff3e535` | Generar el binding de producción |
| `FIREBASE_PROJECT_ID` | `trazal-773ba` | Generar la variable del Worker |
| `NODE_VERSION` | `24` | Versión de Node del build |

Build: `npm run check`. Deploy: `npm run deploy`. Directorio raíz: `/`. Rama: `main`.

`scripts/production-config.mjs` lee esos valores y genera `wrangler.production.jsonc`, ignorado por Git. El despliegue crea automáticamente:

- **Runtime variable:** `FIREBASE_PROJECT_ID=trazal-773ba`.
- **Binding de recurso:** `HYPERDRIVE`, asociado al ID anterior. No es una variable de texto con una URL SQL.
- URL `workers.dev` habilitada, URLs de preview desactivadas y cron conservado.

No es necesario duplicar estas variables manualmente en Runtime. La API no necesita la API key Web de Firebase, JSON de cuenta de servicio ni credenciales OAuth de Google. Tampoco necesita `DATABASE_URL` en producción: usa la conexión del binding. `DATABASE_URL` se reserva para desarrollo y migraciones administrativas.

Configurar builds de ramas de prueba para no desplegar contra esta base. La configuración generada desactiva URLs de preview; comprobar también en el panel los disparadores de ramas. No se ha validado un entorno staging separado.

## Incorporación de un compañero

1. Obtener acceso al repositorio y, según su tarea, a los proyectos correctos de Firebase, Cloudflare y Neon. No compartir una cuenta personal ni pasar contraseñas por el README.
2. Clonar el repositorio de API, instalar Node 24 y ejecutar desde su raíz:

   ```powershell
   npm ci
   npm run check
   ```

   Esto no publica ni necesita Neon. Para trabajo diario usar una base de desarrollo separada con `.dev.vars` a partir de `.env.example`; no usar la rama `production` para tests destructivos.
3. Clonar Trazal-app y seguir sus requisitos WPF/.NET 4.8. Ejecutar `./build.ps1 -Test -Package` en PowerShell desde el repositorio de escritorio.
4. Seguir [Firebase y cuentas del escritorio](https://github.com/JosephAntonyDev/Trazal-app/blob/main/docs/FIREBASE-Y-CUENTAS.md). Configurar localmente `authsettings.json`; el origen es `https://trazal-api.trazaldev.workers.dev`, sin `/health`, `/v1` ni barra final. Reiniciar la app. El paquete local 0.6.4 ya se prepara con ese origen; los paquetes anteriores no cambian. `configure-auth.ps1` permite preparar el archivo e importar OAuth con validación de proyecto.
5. Leer el [modelo local/nube](MODELO-LOCAL-Y-NUBE.md) antes de implementar suscripciones o ampliar el documento de obra. El sistema comercial aún no está implementado.

Los compañeros que solo revisan UX pueden usar el mockup sin cuentas. No conectar ese repositorio a Firebase por accidente.

## Próxima prueba real, paso a paso

1. Configurar el escritorio para Firebase `trazal-773ba` y el origen publicado. Primero se puede probar correo/contraseña sin esperar el cliente OAuth de Google.
2. Crear una cuenta de prueba desde Mi cuenta, recibir y confirmar correo, y comprobar la sesión. No escribir tokens en logs, capturas ni documentación.
3. En **Sincronización**, usar primero **Comprobar conexión** (0.6.2): valida `/v1/me` y el UID del espacio, sin enviar/descargar obras ni vincular la SQLite. Puede crear la cuenta técnica en el servidor. Después, dentro del espacio SQLite de esa cuenta, crear una obra ficticia identificada como prueba; agregar concepto, programa, avance y gasto según las validaciones de la aplicación. Las obras del espacio local original no se trasladan automáticamente.
4. Sincronizar y verificar el resultado. Revisar con el administrador que la cuenta y obra corresponden al UID esperado en Neon, sin publicar documentos ni datos personales.
5. En un segundo usuario de Windows/equipo con datos separados, entrar con la misma cuenta, sincronizar y comprobar cantidades, programa, avance y gasto descargados. No borrar la SQLite original para simular un equipo vacío.
6. Probar un cambio en cada copia con la misma revisión remota: debe detectarse conflicto y conservarse cada copia. No forzar sobrescrituras. La resolución visual está pendiente.
7. Registrar fecha, versiones, resultados, latencia, CPU, errores y consumo; no afirmar sincronización validada hasta completar subida y descarga reales.

Google: el cliente OAuth Desktop correcto de `trazal-773ba` ya fue recibido e importado el 16/11. Falta probar el acceso real y el retorno por navegador; no volver a generar el JSON. Un clon nuevo necesita su configuración local. No documentar ni subir el secreto.

## Diagnóstico rápido

| Síntoma | Qué comprobar |
| --- | --- |
| `Configura HYPERDRIVE_ID...` | Variable en Builds/Production, 32 hexadecimales; no poner el host ni la conexión SQL. |
| Build exitoso pero sin bindings | El deploy debe ser `npm run deploy`; `No bindings found` en el dry-run de `npm run check` es normal. Revisar el bloque del despliegue real. |
| `/` devuelve 404 | Usar `/health`; la API no sirve una página web. |
| `/v1/me` devuelve 401 sin sesión | Es el comportamiento esperado. Usar el login del escritorio; no desactivar autenticación. |
| `403 email_unverified` | Confirmar correo y comprobar/renovar sesión. |
| Fallo autenticado de base de datos | Revisar binding, rol, permisos, TLS, credenciales de Hyperdrive y esquema. Un 200 de `/health` no descarta este problema. |
| `accounts already exists` al instalar | Ejecutar `ROLLBACK;` si la transacción falló; consultar versión y tablas antes de actuar. No borrar ni insertar versión a ciegas. |
| Cambio de variable no surte efecto | Guardar y ejecutar un nuevo build/despliegue; las variables de build alimentan el archivo generado. |

## Orden de trabajo pendiente

1. Completar la prueba real anterior y Google; validar Windows 7 SP1 y transporte HTTPS.
2. Medir CPU/latencia con obras representativas y revisar el cron horario, que puede despertar Neon aun sin usuarios. Actualmente limpia recibos de idempotencia; no borra obras.
3. Implementar perfiles remotos, licencia y suscripción con pagos verificados y bloqueo de escrituras al vencer. No reutilizar `accounts.disabled` para vencimientos comerciales.
4. Incorporar inventario/otras ampliaciones al escritorio y al contrato de sincronización, con migraciones y pruebas; resolver conflictos y traslado explícito de obras locales.
5. Instalador, actualización segura, respaldos remotos/recuperación operativa, monitoreo y pruebas de volumen antes de la venta.

No se contrataron planes de pago en este procedimiento. Conservar datos de suscripciones vencidas es una decisión de producto que debe presupuestarse; no prometer almacenamiento sin costo ni asumir cuotas permanentes del proveedor.

## Mantener esta guía

Ante cada cambio registrar fecha, versión/commit desplegado, entorno y evidencia. Actualizar este documento y la guía de escritorio si cambia el origen o la autenticación. Las credenciales van en la configuración local o servicios correspondientes, nunca en Git. Un `push` a `main` de API puede desplegar automáticamente incluso si solo modifica documentación; no aplica migraciones ni actualiza el escritorio.

Para cambios de código, trabajar en una rama, ejecutar `npm run check`, revisar el diff y llevar el cambio aprobado a `main`. En **Workers → trazal-api → Deployments**, comprobar que el commit coincide con GitHub, que el build pasó y que el despliegue real muestra `env.HYPERDRIVE` y `env.FIREBASE_PROJECT_ID`. Volver a comprobar `/health` y, si cambió autenticación o datos, el flujo real de prueba.

Un despliegue de código no modifica el esquema. Antes de una migración futura, preparar recuperación y verificar compatibilidad con la versión anterior del Worker. Volver a una versión previa de código no revierte PostgreSQL ni SQLite. Todavía no se ha ensayado la recuperación operativa de la base remota; no asumir que la sincronización reemplaza los respaldos.

## Historial: avance de escritorio posterior al despliegue (15/11/2026)

La vista previa 0.6.2 prepara el origen publicado en la configuración local, incorpora **Comprobar conexión**, muestra causas concretas cuando la sincronización no está disponible y exige que el UID devuelto por el backend coincida con la sesión antes de enviar obras. Los errores de red mantienen los datos locales y no exponen excepciones internas en pantalla.

Se aprobaron 104 pruebas de escritorio y pruebas adicionales del importador `configure-auth.ps1` (proyecto OAuth correcto, cliente Desktop, HTTPS y preservación del archivo ante errores). Se revisó el renderizado de la pantalla de sincronización en claro y oscuro. Las pruebas OAuth usan un servidor loopback y respuestas de prueba; no demuestran Google real ni lectura/escritura en Neon. En esa fecha faltaba el JSON correcto; se recibió el 16/11. No se añadieron endpoints ni cambió el contrato del backend para este avance.

## Continuidad: cuenta y contraseña (15/11/2026, escritorio 0.6.3)

Escritorio añade **Mi cuenta → Acceso y seguridad → Enviar enlace para cambiar contraseña** para cuentas con proveedor password. El caso de uso vuelve a comprobar UID y proveedores antes del correo; cuentas solo Google se gestionan en Google. 109 pruebas locales aprobadas y revisión de render en claro/oscuro. Sin nuevos endpoints ni migraciones; Firebase recibe la solicitud de correo directamente. No se probaron correos ni login reales.

Por petición posterior, el mockup incluye login, registro, recuperación/cambio y cuenta/licencia **de ejemplo**; no crea usuarios, no llama a Firebase y no persiste credenciales. El acceso a obras continúa libre. La licencia y los estados de nube mostrados son propuestas visuales; cobro y autorización comercial permanecen pendientes.

En las capturas del 15/11 el cliente OAuth pertenecía a `trazal-773ba-514820`. Ese bloqueo se resolvió el 16/11 con el cliente Desktop de **trazal-773ba**; no regenerar Firebase ni la API key. La coincidencia de nombres visibles no demuestra coincidencia de IDs. El importador local rechaza el proyecto distinto. El cliente correcto ya quedó configurado y empaquetado localmente; falta probar con una cuenta del equipo autorizada.

## Google configurado y diseño adaptable (16/11/2026)

**El pendiente del JSON correcto ya se resolvió.** Joseph creó el cliente OAuth Desktop en `trazal-773ba` desde la cuenta que administra Firebase. Se validó e importó a la configuración local de escritorio; nuevo cliente público `648308444976-b6mbfvqiqm5au5lbsojhu3eguadomb2n.apps.googleusercontent.com`. No se guardan su JSON ni secreto en los repositorios. Las notas anteriores describen el bloqueo histórico, no hay que volver a pedirle crear el cliente.

Escritorio 0.6.4 empaqueta localmente esa configuración y mejora ventanas pequeñas, menús, modales y tablas. Mockup corrige anchura y organización del inicio, probado entre 320 y 1920 px. Permanece pendiente el login Google real con el usuario, correo real, sincronización autenticada y Windows 7. No se modificó el código de API ni el esquema de Neon para estos cambios.


## Copia local a cuenta (16/11/2026, escritorio 0.6.5)

Implementada en el escritorio: desde Mi cuenta o Sincronización, selección de obras del espacio original, confirmación del correo destino, respaldo previo y lote SQLite atómico. Conserva IDs, originales y programa aprobado; omite obras ya presentes, no copia perfil ni estado de nube, y no envía datos al servidor. 116 pruebas de escritorio aprobadas; la prueba real de sesión y sincronización posterior sigue pendiente. No cambia el contrato API, el esquema PostgreSQL ni el esquema SQLite. La resolución visual de conflictos continúa pendiente.
