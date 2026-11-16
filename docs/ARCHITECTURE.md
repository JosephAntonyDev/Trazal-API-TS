# Arquitectura hexagonal por módulos

Estado operativo, destinos y pruebas pendientes: [Estado y continuidad](ESTADO-Y-CONTINUIDAD.md). Reglas comerciales objetivo: [modelo local/nube](MODELO-LOCAL-Y-NUBE.md).

La composición se realiza únicamente en `src/worker.ts`. El dominio y la aplicación no importan HTTP, PostgreSQL, jose ni adaptadores; una prueba comprueba esta dirección de dependencias.

```text
modules/identity/
  application/authenticate.ts       Caso de uso + puerto TokenVerifier
  adapters/firebase/token-verifier  RS256, certificados oficiales y claims
modules/sync/
  domain/work-document.ts           Documento y reglas de negocio
  application/ports.ts              SyncStore, WorkTransaction y Fingerprint
  application/sync-service.ts       Lectura, cambios, revisión e idempotencia
  adapters/postgres/sync-store.ts   SQL parametrizado y transacción por UID
adapters/http/                      Parsing, rutas, CORS y códigos HTTP
shared/domain/                     Errores sin dependencia de HTTP
shared/adapters/                    PostgreSQL y SHA-256
worker.ts                          Composición y mantenimiento programado
```

El puerto de almacenamiento define una transacción por cuenta. Su adaptador mantiene el bloqueo de la fila de cuenta para que ninguna revisión posterior se confirme antes de una previa. Validación de transiciones y cuota de obras están en el caso de uso; SQL y almacenamiento de documentos quedan en el adaptador. No se introduce un ORM ni un contenedor de inyección.

El cliente usa Firebase directamente para login, registro, recuperación y renovación; el Worker no recibe contraseñas ni refresh tokens. Solo acepta ID tokens firmados del proyecto configurado y con `email_verified: true`. El resultado de una verificación se vincula al UID; nunca se toma el propietario del cuerpo de la petición. Las operaciones privadas rechazan correos sin confirmar con `403 email_unverified`.

Los casos de uso pueden probarse con puertos en memoria; las pruebas PostgreSQL existentes siguen ejercitando las transacciones, conflictos y aislamiento reales con PGlite. No se modificó el esquema SQL ni el formato del documento de sincronización.
