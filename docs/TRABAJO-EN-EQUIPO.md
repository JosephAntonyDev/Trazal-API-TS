# Empezar a trabajar en Trazal

Actualizado: **16/11/2026**. El equipo puede revisar y desarrollar desde ahora; el piloto todavía no está certificado para datos reales ni venta. No es necesario esperar al ingeniero para preparar pruebas, resolver errores reproducibles y mejorar interfaces.

## Primera sesión del equipo

1. Obtener acceso a los repositorios y clonar únicamente los que requiera la tarea. Cada carpeta tiene su propio Git; no trabajar en el `backend/` histórico del escritorio.
2. Leer el README y CONTRIBUTING del repositorio. Ejecutar sus comprobaciones antes de editar y registrar el commit usado. Los tests locales no necesitan cuentas reales.
3. Revisar el mockup con **Cargar obra de ejemplo**. En escritorio, crear una obra ficticia y recorrer presupuesto → programa → avance → gastos → curva → exportación → respaldo/restauración.
4. Abrir un issue por problema con pasos, resultado esperado y versión. Usar la plantilla; no subir archivos ni datos del ingeniero.
5. Asignar responsable, criterio de aceptación y repositorios afectados. Trabajar en una rama y pedir revisión en un PR.

| Repositorio | Herramientas y comprobación | Para qué sirve |
| --- | --- | --- |
| [Trazal-app](https://github.com/JosephAntonyDev/Trazal-app) | Windows, Build Tools de Visual Studio con MSBuild/escritorio .NET; `./build.ps1 -Test` | Producto C# 7.3 / WPF / .NET Framework 4.8 / SQLite. `-Package` prepara el portable para revisión local. |
| [Trazal-API-TS](https://github.com/JosephAntonyDev/Trazal-API-TS) | Node 24; `npm ci` y `npm run check` | Backend hexagonal por módulos, Cloudflare Worker, Firebase ID tokens, PostgreSQL. Build es dry-run. |
| [Trazal-mockup](https://github.com/JosephAntonyDev/Trazal-mockup) | Node 24; `npm ci`, `npm test`, `npm run build`; `npm run dev` para revisar | React/TypeScript/Vite, propuesta visual. Acceso simulado, sin conexión al backend. |

Los scripts descargan dependencias al preparar un clon nuevo. No instalar Node ni herramientas de desarrollo en el equipo del ingeniero. Para Windows 7 revisar SP1, runtime .NET 4.8 y los requisitos descritos en el README de escritorio; la compatibilidad real sigue pendiente.

## Qué está listo y qué no

| Área | Estado y límite |
| --- | --- |
| Obras, presupuesto, programa, avances, gastos, curva S | Implementados en escritorio y representados en mockup; cálculos deben cotejarse con el ingeniero. Programa aprobado fijo, avances acumulados. |
| XLS/XLSX, PDF/Excel, respaldos | Escritorio implementa importación con revisión, exportación y restauración. No equivale a importar automáticamente todas las hojas/programas originales. |
| Interfaz adaptable | Mockup revisado por ancho/alto; escritorio por tamaños de ventana. Escala real de Windows y Windows 7 pendientes. |
| Google y correo | Cliente de escritorio implementado y configuración Google correcta recibida. Acceso/correos reales pendientes; el mockup es una simulación. |
| Sincronización | API desplegada y cliente implementado con revisiones, cola y aislamiento. Subida/descarga autenticada entre dos equipos pendiente de validación real. |
| Inventario y flujo de efectivo | Hay propuestas en mockup; no asumir paridad con escritorio/contrato remoto. El catálogo de insumos no representa existencias reales de almacén. |
| Perfil remoto, licencia, suscripción, cobro | Pendientes. Iniciar sesión no prueba que exista una licencia. La política de vencimiento aún no está aplicada comercialmente. |
| Instalador, actualización y recuperación remota | Pendientes. El ZIP portable no es un instalador; sincronizar no sustituye un respaldo. |

## Prioridades para repartir

Los responsables siguientes son roles propuestos, no personas ya asignadas. Convertir cada fila en una tarea antes de comenzar y registrar la evidencia al cerrarla.

| Orden / tarea | Responsable propuesto | Termina cuando… |
| --- | --- | --- |
| P0 · Autenticación real y sincronización | Escritorio + API + administrador | Correo, verificación, recuperación y Google probados con cuenta de prueba; misma obra descargada en segundo espacio/equipo y campos/importes idénticos. Probar desconexión/reintento, conflicto, cambio de UID y aislamiento. Conservar ambas copias ante conflicto. Registrar versión, fecha y resultado sin tokens. |
| P0 · Windows 7 y prueba de datos | QA + escritorio | Documentados SP1, x86/x64, RAM, escala y tiempos de abrir/importar/guardar. Funcionan SQLite, navegador de Google/TLS, PDF/XLSX y restauración; respaldo previo intacto. Cotejo contable con el ingeniero separado de compatibilidad técnica. |
| P0 · Proteger integración del equipo | Administrador de GitHub | Primera ejecución de Validate verde en cada repo; reglas de `main` requieren PR, revisión y su comprobación correspondiente. Verificar quién puede fusionar y que las ramas de prueba no despliegan en producción. |
| Implementado localmente · Copia de obras a una cuenta (0.6.5) | QA + escritorio | Selección, confirmación de cuenta, respaldo, copia atómica y detección de duplicados implementados; 7 pruebas nuevas, 116 de escritorio en total. Revisar el flujo con una sesión real y sincronización posterior. Originales conservados. Ver README de escritorio. |
| P1 · Resolver conflictos de sincronización | Escritorio + API | Muestra versiones local/remota, permite conservar ambas o elegir explícitamente; usa revisión vigente, guarda copia de seguridad y no sobrescribe silenciosamente. Una nueva edición remota vuelve a producir conflicto. |
| P1 · Migraciones futuras | API | Ejecutor descubre y ordena versiones, usa bloqueo/transacción, rechaza historial incoherente y prueba actualización desde esquema existente. Hoy solo ejecuta 001; agregar un archivo 002 por sí solo no lo aplica. Ensayar recuperación antes de producción. |
| P1 · Insumos e inventario | Producto + escritorio + API | Se acuerda si son fichas de referencia o almacén con entradas/salidas. Implementación local, respaldo y contrato remoto evolucionan juntos; compras no duplican gastos, precios de obra ni avance. Clientes anteriores tienen un comportamiento explícito. |
| P1 · Corrección de avances | Producto + escritorio | Regla acordada con ingeniero, historial de quién/cuándo/motivo y conservación de originales; recalcula curva/reportes sin superar límites ni reescribir línea base. |
| P2 · Suscripción y licencia | Producto + API | Definidos planes y proveedor de pago; autorización en servidor con eventos de pago verificados e idempotentes. Vencimiento permite consultar/descargar lo previo y bloquea nuevas escrituras de nube; SQLite sigue utilizable. No usar `accounts.disabled` como vencimiento. |
| P2 · Distribución y operación | Escritorio + infraestructura | Instalador y actualización con autenticidad/integridad, respaldo previo y recuperación ensayada; métricas de errores/latencia/CPU, volumen representativo y restauración remota probada. |

Para el primer reparto conviene separar: QA reproduce y documenta; escritorio atiende conflictos y valida la copia local; API prepara migraciones y contrato; UX corrige problemas acotados del mockup. No implementar simultáneamente inventario en tres lugares sin acordar el formato de datos.

## Ejercicio local reproducible

Usar una obra ficticia, con fechas pasadas válidas para registrar avance:

1. Crear «Prueba del equipo», IVA de obra confirmado en 0 %. Crear un trabajo «Construcción de banqueta», unidad m², cantidad 100, precio unitario sin IVA 200. Presupuesto esperado: 20,000 MXN.
2. Distribuir 50 unidades en cada uno de dos días y fijar el programa. Al primer día, registrar avance **acumulado** de 25 unidades.
3. En ese primer día registrar gasto por 3,000 MXN sin IVA. Al mismo corte, PV esperado 10,000; EV 5,000; AC 3,000; SPI 0.50 y CPI aproximadamente 1.67. Estas cifras prueban un caso simple; no sustituyen la validación contable del ingeniero.
4. Exportar PDF/Excel y comparar. Crear respaldo, modificar una copia de prueba y seguir restauración guiada; comprobar que la obra recuperada conserva los datos del respaldo. No restaurar sobre la única base con información útil.
5. Probar también IVA pendiente, cero y distinto de cero, importación inválida y desconexión. Crear un issue si el resultado difiere; no cambiar la regla para que pase una captura.

## Integración local entre API y escritorio

Tras compilar escritorio con `-Test`, desde la API:

```powershell
$env:TRAZAL_DESKTOP_TEST_EXE = 'C:\ruta\Trazal-app\build\output\Release\tests\Trazal.Tests.exe'
npm run test:desktop
```

Ejercita dos SQLite y PostgreSQL efímero con identidad de prueba, mediante servidor loopback. No valida Firebase/Neon reales. Las carpetas hermanas con los nombres locales de Joseph permiten autodetección; otros clones deben indicar la ruta.

## Validación antes de fusionar

- Pruebas del repositorio verdes y evidencia de la función cambiada. UI: teclado, claro/oscuro, ventana pequeña, zoom/escala y textos largos. No ocultar controles para eliminar scroll.
- Cálculos: ejemplo de entrada/salida, redondeo y corte; mantener IVA pendiente distinto de 0 % y no sumar acumulados como incrementos.
- Datos: apertura de base/respaldo anterior, migración y recuperación cuando corresponda; no mezclar UID ni enviar adjuntos al servidor.
- API: permisos por UID, conflictos, reintentos y compatibilidad del documento. Respetar [arquitectura](ARCHITECTURE.md) y [modelo local/nube](MODELO-LOCAL-Y-NUBE.md).
- Actualizar documentación de estado; no marcar pendiente real como resuelto por un test simulado.

## Integración continua y publicación

Cada repositorio incorpora `.github/workflows/validate.yml`: PR, push a `main` y ejecución manual. API usa `api-check`, mockup `mockup-check`, escritorio `desktop-check`. Son los nombres de trabajos que habrá que localizar en las reglas de protección después de su primera ejecución. Permisos de lectura, sin secretos ni despliegue/migración. Escritorio compila y prueba en Windows 2022; eso no certifica Windows 7.

La protección de ramas y la disponibilidad de Actions se configuran en GitHub, no en estos archivos. Cloudflare/Vercel mantienen sus integraciones existentes: un push a `main` puede desplegar. Antes de fusionar, verificar revisión y resultados; después comprobar commit desplegado. No hay despliegue de staging validado todavía. El Worker no actualiza el escritorio ni aplica SQL automáticamente.

## Configuración actual y pendientes externos

- OAuth correcto recibido e importado el 16/11 en la máquina de Joseph: **no hace falta volver a generar el JSON**. Cada clon configura su archivo local siguiendo la [guía de escritorio](https://github.com/JosephAntonyDev/Trazal-app/blob/main/docs/FIREBASE-Y-CUENTAS.md).
- Las pruebas reales requieren la intervención de una persona para elegir la cuenta Google, recibir correos y revisar sus datos de prueba.
- Para que un compañero trabaje en código local no necesita contraseñas de Neon ni credenciales administrativas de producción.
- Recursos, configuración de Cloudflare y procedimiento realizado: [Estado y continuidad](ESTADO-Y-CONTINUIDAD.md). Actualizar allí la evidencia operativa, no duplicar secretos en esta guía.


## Evidencia de preparación (16/11/2026)

Comprobaciones ejecutadas en el equipo de desarrollo: API `npm run check` (18 pruebas y dry-run), escritorio `./build.ps1 -Test` (109 pruebas más configuración local), mockup `npm test` (31) y `npm run build`. Integración `npm run test:desktop`: dos SQLite, manejador del Worker y PostgreSQL efímero; subida, descarga, actualización y conflicto aprobados. YAML de workflows y enlaces locales nuevos revisados.

Estos resultados son locales. La primera ejecución de GitHub Actions y la configuración de controles obligatorios se deben verificar en cada repositorio; no equivalen a despliegue ni pruebas con cuentas reales.
