# Plan de Implementación: Sistema de Reservas de Guardería Canina

## Visión General

Implementación incremental de un monolito modular con Clean Architecture. El backend en Python (FastAPI) expone una API REST consumida por el frontend en React (JavaScript). Se construye módulo a módulo, comenzando por la infraestructura compartida y el dominio central, hasta llegar a la integración completa.

## Tareas

- [x] 1. Infraestructura compartida y estructura del proyecto
  - Crear la estructura de carpetas `backend/` y `frontend/` según el diseño
  - Implementar `backend/shared/domain/result.py` con las clases `Ok`, `Err` y `DomainError`
  - Implementar `backend/shared/infrastructure/supabase_client.py` con el cliente Supabase singleton
  - Implementar `backend/shared/infrastructure/logger.py` con logs estructurados JSON que enmascaren PII
  - Crear `backend/main.py` con la app FastAPI base y registro de routers vacíos
  - Crear `backend/requirements.txt` con las dependencias del proyecto
  - Crear `frontend/package.json` con las dependencias React base
  - Crear el esquema SQL en `backend/migrations/001_initial.sql` con las tablas `reservas`, `disponibilidad`, `configuracion` y `festivos`
  - _Requisitos: 12.1, 12.5, 13.4_

- [x] 2. Módulo de Autenticación
  - [x] 2.1 Implementar dominio y caso de uso de autenticación
    - Crear `backend/modules/autenticacion/domain/auth_service.py` con el Protocol `IAuthService`
    - Crear `backend/modules/autenticacion/infrastructure/supabase_auth.py` implementando login, logout y validación de sesión con Supabase Auth
    - Crear `backend/modules/autenticacion/infrastructure/auth_middleware.py` con el middleware FastAPI que valida el token JWT en endpoints privados
    - _Requisitos: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

  - [x] 2.2 Escribir test de propiedad para credenciales inválidas
    - **Propiedad 23: Credenciales inválidas deniegan acceso**
    - **Valida: Requisito 1.2**

  - [x] 2.3 Escribir test de propiedad para sesión tras logout
    - **Propiedad 24: Sesión invalidada tras logout**
    - **Valida: Requisito 1.3**

- [x] 3. Módulo de Precios — Dominio y Cálculo
  - [x] 3.1 Implementar entidades y calculador de precios
    - Crear `backend/modules/precios/domain/tarifa.py` con los enums `TipoTarifa`, `TipoTransporte` y el dataclass `ConfiguracionPrecios`
    - Crear `backend/modules/precios/domain/festivo.py` con el dataclass `Festivo`
    - Crear `backend/modules/precios/domain/calculador_precio.py` con la función pura `calcular_precio(params: ParametrosCalculo) -> DesglosePrecio`
    - Implementar la lógica de días (Paseos/Guardería: ambos extremos incluidos) y noches (Alojamiento: diferencia de fechas)
    - _Requisitos: 4.1, 4.2, 4.3_

  - [x] 3.2 Escribir test de propiedad para cálculo de días y noches
    - **Propiedad 4: Cálculo correcto de días y noches**
    - **Valida: Requisitos 4.1, 4.2, 4.3**

  - [x] 3.3 Implementar caso de uso y repositorio de precios
    - Crear `backend/modules/precios/application/calcular_precio.py` con el use case `CalcularPrecioUseCase`
    - Crear `backend/modules/precios/application/gestionar_festivos.py` con los use cases de CRUD de festivos
    - Crear `backend/modules/precios/infrastructure/supabase_precios_repository.py`
    - Crear `backend/modules/precios/infrastructure/precios_router.py` con los endpoints `GET /api/precios/:servicio`, `PUT /api/admin/precios`, `GET /api/festivos`, `POST /api/admin/festivos`, `DELETE /api/admin/festivos/:id`
    - _Requisitos: 9.1, 9.2, 9.3, 9.4, 9.5, 10.1, 10.2, 10.3, 10.4_

  - [x] 3.4 Escribir test de propiedad para round-trip de configuración de precios
    - **Propiedad 15: Round-trip de configuración de precios**
    - **Valida: Requisito 9.3**

  - [x] 3.5 Escribir test de propiedad para round-trip de gestión de festivos
    - **Propiedad 16: Round-trip de gestión de festivos**
    - **Valida: Requisitos 10.2, 10.4**

  - [x] 3.6 Escribir test de propiedad para validación de festivos
    - **Propiedad 17: Validación de festivos**
    - **Valida: Requisito 10.3**

- [x] 4. Módulo de Disponibilidad
  - [x] 4.1 Implementar dominio y casos de uso de disponibilidad
    - Crear `backend/modules/disponibilidad/domain/disponibilidad.py` con los dataclasses `ResultadoDisponibilidad`, `BloqueoCalendario` y el Protocol `IDisponibilidadService`
    - Crear `backend/modules/disponibilidad/application/verificar_disponibilidad.py`
    - Crear `backend/modules/disponibilidad/application/bloquear_dia.py` y `desbloquear_dia.py`
    - _Requisitos: 2.2, 2.6, 2.8, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8_

  - [x] 4.2 Escribir test de propiedad para coherencia de disponibilidad
    - **Propiedad 2: Coherencia de disponibilidad con el estado de la base de datos**
    - **Valida: Requisitos 2.2, 2.6, 2.8**

  - [x] 4.3 Escribir test de propiedad para bloqueo que impide reservas
    - **Propiedad 13: Bloqueo impide disponibilidad y nuevas reservas**
    - **Valida: Requisitos 8.4, 8.8**

  - [x] 4.4 Escribir test de propiedad para round-trip de bloqueo/desbloqueo
    - **Propiedad 14: Round-trip de bloqueo y desbloqueo**
    - **Valida: Requisito 8.5**

  - [x] 4.5 Implementar repositorio e infraestructura de disponibilidad
    - Crear `backend/modules/disponibilidad/infrastructure/supabase_disponibilidad_repository.py`
    - Crear `backend/modules/disponibilidad/infrastructure/disponibilidad_router.py` con los endpoints `GET /api/disponibilidad/:servicio/:mes`, `POST /api/admin/disponibilidad/bloquear`, `POST /api/admin/disponibilidad/desbloquear`
    - _Requisitos: 2.2, 8.4, 8.5_

- [x] 5. Checkpoint — Verificar módulos base
  - Asegurarse de que todos los tests pasan. Consultar al usuario si surgen dudas.

- [x] 6. Módulo de Reservas — Dominio y Validaciones
  - [x] 6.1 Implementar entidades de dominio de reservas
    - Crear `backend/modules/reservas/domain/reserva.py` con los enums `EstadoReserva`, `TipoServicio`, `TipoTarifa`, `TipoTransporte` y los dataclasses `DatosCliente`, `DatosMascota`, `Reserva`
    - Implementar la función de validación de fechas por servicio (Alojamiento: fecha_desde < fecha_hasta; Paseos/Guardería: fecha_desde <= fecha_hasta)
    - Implementar la función de validación de campos obligatorios (nombre, teléfono, email, nombre_perro, acepta_privacidad)
    - Implementar la función de validación de dirección obligatoria cuando el transporte incluye recogida
    - Crear `backend/modules/reservas/domain/reserva_repository.py` con el Protocol `IReservaRepository`
    - _Requisitos: 2.3, 2.4, 2.5, 2.7, 5.1, 5.2, 5.3, 5.4, 3.6_

  - [x] 6.2 Escribir test de propiedad para validación de fechas por servicio
    - **Propiedad 1: Validación de fechas por servicio**
    - **Valida: Requisitos 2.3, 2.4, 2.5**

  - [x] 6.3 Escribir test de propiedad para fechas pasadas no reservables
    - **Propiedad 3: Fechas pasadas no son reservables**
    - **Valida: Requisito 2.7**

  - [x] 6.4 Escribir test de propiedad para validación de campos obligatorios
    - **Propiedad 5: Validación de campos obligatorios**
    - **Valida: Requisitos 5.1, 5.3**

  - [x] 6.5 Escribir test de propiedad para dirección obligatoria con recogida
    - **Propiedad 25: Dirección obligatoria con transporte de recogida**
    - **Valida: Requisito 3.6**

- [x] 7. Módulo de Notificaciones
  - [x] 7.1 Implementar servicio de notificaciones por email
    - Crear `backend/modules/notificaciones/domain/notificaciones_service.py` con el Protocol `INotificacionesService`
    - Crear `backend/modules/notificaciones/application/enviar_notificacion.py` con los use cases para cada tipo de evento
    - Crear `backend/modules/notificaciones/infrastructure/email_service.py` implementando el envío via SMTP/SendGrid; los fallos deben registrarse en el logger sin propagar la excepción
    - _Requisitos: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

  - [x] 7.2 Escribir test de propiedad para notificaciones por cambio de estado
    - **Propiedad 8: Notificaciones por cambio de estado**
    - **Valida: Requisitos 6.1, 6.2, 6.3, 6.4, 6.5**

  - [x] 7.3 Escribir test de propiedad para resiliencia ante fallos de notificación
    - **Propiedad 9: Resiliencia ante fallos de notificación**
    - **Valida: Requisito 6.6**

- [x] 8. Módulo de Reservas — Casos de Uso y API
  - [x] 8.1 Implementar caso de uso CrearReserva
    - Crear `backend/modules/reservas/application/crear_reserva.py` orquestando: validación de dominio → verificar disponibilidad → calcular precio → persistir reserva (estado "pendiente") → actualizar disponibilidad → notificar cliente y empresario
    - La actualización de disponibilidad debe ser atómica con la creación de la reserva
    - _Requisitos: 5.5, 5.6, 5.7, 6.1, 6.5_

  - [x] 8.2 Escribir test de propiedad para estado inicial de reserva
    - **Propiedad 6: Estado inicial de reserva es "pendiente"**
    - **Valida: Requisito 5.5**

  - [x] 8.3 Escribir test de propiedad para consistencia reserva-disponibilidad
    - **Propiedad 7: Consistencia entre reservas y disponibilidad**
    - **Valida: Requisito 5.7**

  - [x] 8.4 Implementar casos de uso de gestión de reservas (Confirmar, Rechazar, Cancelar, Modificar)
    - Crear `backend/modules/reservas/application/confirmar_reserva.py` con la transición pendiente → confirmada
    - Crear `backend/modules/reservas/application/rechazar_reserva.py` con la transición pendiente → rechazada y liberación de plazas
    - Crear `backend/modules/reservas/application/cancelar_reserva.py` con la transición confirmada → cancelada y liberación de plazas
    - Implementar la modificación de reserva confirmada en el use case correspondiente
    - Cada use case debe invocar el servicio de notificaciones tras el cambio de estado
    - _Requisitos: 7.4, 7.5, 7.6, 6.2, 6.3, 6.4_

  - [x] 8.5 Escribir test de propiedad para transiciones de estado válidas
    - **Propiedad 11: Transiciones de estado válidas**
    - **Valida: Requisitos 7.4, 7.5**

  - [x] 8.6 Escribir test de propiedad para round-trip de modificación de reserva
    - **Propiedad 12: Round-trip de modificación de reserva**
    - **Valida: Requisito 7.6**

  - [x] 8.7 Implementar repositorio e infraestructura de reservas
    - Crear `backend/modules/reservas/infrastructure/supabase_reserva_repository.py`
    - Crear `backend/modules/reservas/infrastructure/reserva_router.py` con los endpoints `POST /api/reservas`, `GET /api/admin/reservas`, `GET /api/admin/reservas/:id`, `PATCH /api/admin/reservas/:id/confirmar`, `PATCH /api/admin/reservas/:id/rechazar`, `PATCH /api/admin/reservas/:id/cancelar`, `PUT /api/admin/reservas/:id`
    - Aplicar el middleware de autenticación a todos los endpoints `/api/admin/*`
    - _Requisitos: 7.1, 7.2, 7.3, 7.7, 12.3_

  - [x] 8.8 Escribir test de propiedad para filtrado correcto de reservas
    - **Propiedad 10: Filtrado correcto de reservas**
    - **Valida: Requisito 7.2**

  - [x] 8.9 Escribir test de propiedad para control de acceso a datos personales
    - **Propiedad 20: Control de acceso a datos personales**
    - **Valida: Requisito 12.3**

- [x] 9. Seguridad, Logs y Resiliencia
  - [x] 9.1 Implementar logs sin PII y manejo de errores de base de datos
    - Actualizar `backend/shared/infrastructure/logger.py` para filtrar/enmascarar campos PII (`email`, `telefono`, `nombre`, `direccion`) en niveles ERROR y WARN
    - Implementar el manejador global de excepciones en FastAPI que captura `DomainError` y errores de BD y devuelve respuestas HTTP controladas sin exponer detalles técnicos
    - _Requisitos: 12.5, 13.4_

  - [x] 9.2 Escribir test de propiedad para logs sin datos personales
    - **Propiedad 21: Logs sin datos personales identificables**
    - **Valida: Requisito 12.5**

  - [x] 9.3 Escribir test de propiedad para resiliencia ante fallo de base de datos
    - **Propiedad 22: Resiliencia ante fallo de base de datos**
    - **Valida: Requisito 13.4**

- [x] 10. Checkpoint — Verificar backend completo
  - Asegurarse de que todos los tests pasan. Consultar al usuario si surgen dudas.

- [x] 11. Módulo de Exportación
  - [x] 11.1 Implementar exportación en CSV, Excel y PDF
    - Crear `backend/modules/exportacion/application/exportar_reservas.py` con los use cases `ExportarCSV`, `ExportarExcel` (openpyxl) y `ExportarPDF` (reportlab)
    - Crear `backend/modules/exportacion/infrastructure/exportacion_router.py` con el endpoint `GET /api/admin/exportar` que acepta filtros de rango de fechas, servicio y estado
    - _Requisitos: 11.1, 11.2, 11.3, 11.4, 11.5_

  - [x] 11.2 Escribir test de propiedad para filtrado correcto en exportación
    - **Propiedad 19: Filtrado correcto en exportación**
    - **Valida: Requisitos 11.4, 11.5**

- [x] 12. Frontend React — Flujo de Reserva del Cliente
  - [x] 12.1 Implementar cliente HTTP y hooks de datos
    - Crear `frontend/src/services/api.js` con las funciones fetch hacia todos los endpoints del backend
    - Crear `frontend/src/hooks/useDisponibilidad.js`, `useReservas.js` y `usePrecios.js`
    - Incluir indicador visual de carga durante operaciones asíncronas
    - _Requisitos: 13.3_

  - [x] 12.2 Implementar componente SelectorServicio y CalendarioDisponibilidad
    - Crear `frontend/src/components/reserva/SelectorServicio.jsx` con los tres tipos de servicio
    - Crear `frontend/src/components/reserva/CalendarioDisponibilidad.jsx` mostrando plazas disponibles por día, deshabilitando días pasados y días sin disponibilidad
    - Mostrar advertencia si algún día del rango seleccionado no tiene plazas
    - _Requisitos: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8_

  - [x] 12.3 Implementar componente de configuración de tarifa y opciones adicionales
    - Crear `frontend/src/components/reserva/FormularioOpciones.jsx` con selección de tarifa, tramo horario (según servicio) y opciones de transporte/perro extra
    - Mostrar campo de dirección de recogida cuando el transporte incluye recogida
    - _Requisitos: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

  - [x] 12.4 Implementar componente ResumenReserva y FormularioCliente
    - Crear `frontend/src/components/reserva/ResumenReserva.jsx` mostrando el desglose de precio y advertencia de festivos si aplica
    - Crear `frontend/src/components/reserva/FormularioCliente.jsx` con campos obligatorios y opcionales, checkbox de política de privacidad y validación de campos antes del envío
    - _Requisitos: 4.4, 4.5, 5.1, 5.2, 5.3, 5.4, 5.6, 10.5_

  - [x] 12.5 Implementar página de reserva completa con flujo guiado
    - Crear `frontend/src/pages/ReservaPage.jsx` orquestando los pasos: selección de servicio → calendario → opciones → datos del cliente → resumen → confirmación
    - Mostrar pantalla de confirmación con resumen tras reserva exitosa
    - Mostrar mensaje de error claro si la conexión con el backend falla
    - _Requisitos: 5.6, 13.4_

- [x] 13. Frontend React — Panel de Administración
  - [x] 13.1 Implementar autenticación en el panel admin
    - Crear la pantalla de login en `frontend/src/pages/AdminPage.jsx` con formulario de credenciales
    - Implementar la protección de rutas admin: redirigir a login si no hay sesión activa
    - _Requisitos: 1.1, 1.2, 1.3, 1.4_

  - [x] 13.2 Implementar ListaReservas con filtros y detalle
    - Crear `frontend/src/components/admin/ListaReservas.jsx` con listado, filtros por estado y servicio, contador de pendientes y vista de detalle completo
    - Incluir botones de acción (confirmar, rechazar, cancelar, modificar) según el estado de cada reserva
    - _Requisitos: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_

  - [x] 13.3 Implementar CalendarioOcupacion con gestión de bloqueos
    - Crear `frontend/src/components/admin/CalendarioOcupacion.jsx` con vista mensual de ocupación por servicio, navegación entre meses y modo bloqueo/desbloqueo
    - _Requisitos: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7_

  - [x] 13.4 Implementar ConfiguracionPrecios y GestionFestivos
    - Crear `frontend/src/components/admin/ConfiguracionPrecios.jsx` con formulario de precios por servicio y botón de restablecer con confirmación
    - Crear `frontend/src/components/admin/GestionFestivos.jsx` con listado, formulario de alta y eliminación con confirmación
    - _Requisitos: 9.1, 9.2, 9.3, 9.4, 9.5, 10.1, 10.2, 10.3, 10.4_

  - [x] 13.5 Implementar panel de exportación
    - Añadir sección de exportación en el panel admin con filtros de rango de fechas, servicio y estado, contador de registros a exportar y botones CSV/Excel/PDF
    - _Requisitos: 11.1, 11.2, 11.3, 11.4, 11.5_

- [x] 14. Checkpoint final — Verificar integración completa
  - Asegurarse de que todos los tests pasan y el flujo completo funciona de extremo a extremo. Consultar al usuario si surgen dudas.

## Notas

- Las tareas marcadas con `*` son opcionales y pueden omitirse para un MVP más rápido
- Cada tarea referencia los requisitos específicos para trazabilidad
- Los tests de propiedad usan `hypothesis` con `@settings(max_examples=100)` y la etiqueta `# Feature: sistema-reservas-guarderia-canina, Propiedad N: <texto>`
- Los tests unitarios usan `pytest` con mocks para las dependencias externas
- La regla de dependencia de Clean Architecture debe respetarse: el dominio no importa nada de aplicación ni infraestructura
