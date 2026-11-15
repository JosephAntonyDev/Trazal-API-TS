# Trazal: escritorio local y nube opcional

Decisión acordada con el usuario el 15 de noviembre de 2026. Este documento define el comportamiento objetivo; no significa que ya exista cobro o autorización por suscripción en la API.

## Datos y almacenamiento

- SQLite conserva el trabajo del usuario en su computadora, con o sin suscripción de nube, sujeto a su licencia de escritorio.
- Firebase gestiona autenticación. PostgreSQL guardará perfil, licencia y estado de suscripción.
- La suscripción de nube permite sincronizar datos estructurados de las obras: conceptos, presupuesto, programa, avances, gastos, inventarios y seguimiento. El total de obras se obtiene de los registros correspondientes.
- No se almacenan en nuestros servidores fotos, PDFs, archivos Excel originales ni exportaciones. Importar un archivo procesa sus datos; no implica subir el archivo.
- Las exportaciones se generan a partir de los datos. Una posible integración futura podrá guardarlas en Drive o iCloud del usuario; no forma parte del alcance actual.

## Suscripción y conservación

| Estado | Obras locales | Datos remotos existentes | Altas y modificaciones remotas de obras |
| --- | --- | --- | --- |
| Activa y vigente | Crear, editar, consultar y exportar | Consultar y descargar | Permitidas dentro de las cuotas del plan |
| Vencida tras haber estado activa | Continúan disponibles y editables | Se conservan; lectura, descarga y exportación de lo ya sincronizado | Bloqueadas |
| Nunca contratada | Trabajo local disponible | No hay obras subidas automáticamente | Bloqueadas |

Cancelar la renovación conserva los derechos durante el periodo ya pagado. Al terminar ese periodo se congelan las escrituras de obras en la nube: no solo nuevas obras, también nuevos gastos, avances, conceptos, modificaciones y borrados remotos. Esto no bloquea actualizar el perfil ni renovar el servicio.

No se eliminan obras por vencer la suscripción ni se programa una caducidad automática por falta de pago. La retención sigue generando almacenamiento, que debe contemplarse en el modelo económico. Una futura eliminación solicitada expresamente por el titular es un flujo distinto.

El servidor debe comprobar vigencia y cuotas en cada escritura, usando información de pago verificada; no debe confiar en un indicador enviado por el escritorio. Una cuenta suspendida por seguridad es distinta de una suscripción vencida: no se debe reutilizar `accounts.disabled` para implementar la caducidad comercial.

## Sincronización y experiencia

- La app debe distinguir los cambios guardados solo en este equipo de los confirmados en la nube y mostrar la última sincronización exitosa.
- Una nueva computadora o la futura web pueden recuperar únicamente los datos que hayan llegado al servidor. No prometer recuperación de cambios que nunca se sincronizaron.
- Al reactivar una suscripción, comparar revisiones y resolver conflictos antes de subir los cambios locales acumulados; no sobrescribir la copia remota silenciosamente.
- Sincronización y recuperación mediante respaldos son mecanismos diferentes. Deben probarse ambos.

## Estado de implementación

La API actual contiene cuentas técnicas, documentos de obra y recibos de sincronización, con controles de identidad, revisión y reintentos. No incluye todavía perfiles remotos, licencias, facturación, webhooks de pago, permisos por suscripción ni cuotas comerciales de almacenamiento. Inventarios y otras ampliaciones deben incorporarse al contrato de sincronización y al escritorio; su presencia en el mockup no implica soporte remoto.

La instalación del esquema inicial y del Worker sirve para pruebas técnicas con datos ficticios. Antes de vender o habilitar sincronización pública, implementar y verificar las reglas anteriores.
