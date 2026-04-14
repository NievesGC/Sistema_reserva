# Documento de Requisitos

## Introducción

Sistema web de reservas para una guardería canina que permite a los clientes reservar servicios para sus mascotas (paseos, guardería diurna y alojamiento), y al empresario gestionar dichas reservas, configurar servicios y precios, y controlar la disponibilidad. El sistema automatiza las notificaciones por correo electrónico y garantiza la seguridad y privacidad de los datos de los usuarios.

El sistema cuenta con tres actores principales:
- **Cliente**: propietario de mascotas que realiza reservas a través de la interfaz pública.
- **Empresario**: administrador del negocio que gestiona reservas, servicios, precios y disponibilidad.
- **Sistema**: componente automatizado que gestiona envíos de correo y operaciones en segundo plano.

---

## Glosario

- **Sistema**: La aplicación web de reservas de guardería canina en su conjunto.
- **Cliente**: Usuario registrado o no registrado que realiza reservas de servicios.
- **Empresario**: Usuario administrador con acceso al panel de gestión.
- **Reserva**: Solicitud de un cliente para utilizar un servicio en un rango de fechas determinado.
- **Servicio**: Tipo de atención ofrecida: Paseos, Guardería o Alojamiento.
- **Disponibilidad**: Número de plazas libres para un servicio en una fecha concreta.
- **Tarifa**: Precio aplicado a una reserva según el tipo (Normal o Cachorros).
- **Tramo_Horario**: Franja horaria seleccionada para un servicio (Mañana, Tarde, Todo el día).
- **Transporte**: Opción de recogida y/o entrega del animal para el servicio de Alojamiento.
- **Festivo**: Día marcado por el Empresario con tarifa especial.
- **Panel_Admin**: Interfaz exclusiva del Empresario para gestión del negocio.
- **Notificacion_Email**: Correo electrónico enviado automáticamente por el Sistema a clientes y/o al Empresario.
- **Perro_Extra**: Opción que permite incluir un segundo animal en la misma reserva con coste adicional.

---

## Requisitos

### Requisito 1: Registro y Autenticación de Usuarios

**Historia de Usuario:** Como empresario, quiero que el acceso al panel de administración esté protegido por autenticación, para que solo yo pueda gestionar las reservas y la configuración del negocio.

#### Criterios de Aceptación

1. THE Sistema SHALL requerir credenciales válidas (usuario y contraseña) para acceder al Panel_Admin.
2. WHEN un usuario introduce credenciales incorrectas, THE Sistema SHALL mostrar un mensaje de error y denegar el acceso.
3. WHEN un Empresario cierra sesión, THE Sistema SHALL invalidar la sesión activa y redirigir a la página de inicio de sesión.
4. WHILE una sesión de Empresario está activa, THE Panel_Admin SHALL mantener el acceso sin requerir nueva autenticación.
5. IF una sesión permanece inactiva durante más de 60 minutos, THEN THE Sistema SHALL cerrar la sesión automáticamente.
6. THE Sistema SHALL almacenar las contraseñas de forma cifrada, sin guardar texto plano en la base de datos.

---

### Requisito 2: Selección de Servicio y Fechas por el Cliente

**Historia de Usuario:** Como cliente, quiero seleccionar el tipo de servicio y las fechas deseadas, para poder iniciar el proceso de reserva de forma guiada.

#### Criterios de Aceptación

1. THE Sistema SHALL ofrecer al Cliente tres tipos de servicio seleccionables: Paseos, Guardería y Alojamiento.
2. WHEN el Cliente selecciona un servicio, THE Sistema SHALL mostrar un calendario con la disponibilidad de plazas en tiempo real para ese servicio.
3. WHEN el Cliente selecciona el servicio de Alojamiento, THE Sistema SHALL solicitar una fecha de entrada y una fecha de salida distintas.
4. WHEN el Cliente selecciona Paseos o Guardería, THE Sistema SHALL permitir seleccionar un rango de fechas o marcar la opción de un solo día.
5. IF el Cliente selecciona una fecha de fin anterior a la fecha de inicio, THEN THE Sistema SHALL mostrar un mensaje de error y requerir corrección antes de continuar.
6. WHEN el Cliente selecciona un rango de fechas, THE Sistema SHALL verificar la disponibilidad en cada día del rango y mostrar una advertencia si algún día no tiene plazas libres.
7. THE Sistema SHALL deshabilitar en el calendario los días anteriores a la fecha actual.
8. THE Sistema SHALL mostrar el número de plazas disponibles por día en el calendario cuando hay un servicio seleccionado.

---

### Requisito 3: Configuración de Tarifa, Horario y Opciones Adicionales

**Historia de Usuario:** Como cliente, quiero configurar la tarifa, el horario y las opciones adicionales de mi reserva, para ajustar el servicio a las necesidades de mi mascota.

#### Criterios de Aceptación

1. THE Sistema SHALL ofrecer al Cliente dos tarifas seleccionables: Normal y Cachorros.
2. WHEN el Cliente selecciona el servicio de Paseos o Guardería, THE Sistema SHALL mostrar opciones de Tramo_Horario: Mañana (09:00–12:00) y Tarde (16:00–19:00).
3. WHEN el Cliente selecciona el servicio de Guardería, THE Sistema SHALL mostrar adicionalmente la opción de Tramo_Horario Todo el día (09:00–19:00).
4. WHEN el Cliente selecciona el servicio de Alojamiento, THE Sistema SHALL mostrar opciones de Transporte: Sin transporte, Solo recogida (+12€) y Recogida y entrega (+20€).
5. THE Sistema SHALL ofrecer al Cliente la opción de incluir un Perro_Extra con coste adicional por día o noche.
6. WHEN el Cliente selecciona una opción de Transporte que incluye recogida, THE Sistema SHALL requerir que el Cliente introduzca una dirección de recogida.

---

### Requisito 4: Cálculo y Presentación del Precio Total

**Historia de Usuario:** Como cliente, quiero ver el precio total de mi reserva antes de confirmarla, para tomar una decisión informada.

#### Criterios de Aceptación

1. THE Sistema SHALL calcular el precio total de la reserva sumando: precio base por tarifa y número de días o noches, coste de Perro_Extra si aplica, y coste de Transporte si aplica.
2. WHEN el servicio es Alojamiento, THE Sistema SHALL calcular el número de noches como la diferencia en días entre la fecha de salida y la fecha de entrada.
3. WHEN el servicio es Paseos o Guardería, THE Sistema SHALL calcular el número de días incluyendo ambas fechas del rango seleccionado.
4. THE Sistema SHALL mostrar el desglose del precio total al Cliente en el paso de resumen antes de confirmar la reserva.
5. THE Sistema SHALL indicar al Cliente que el precio mostrado puede estar sujeto a variaciones por días festivos.

---

### Requisito 5: Recogida de Datos del Cliente y Confirmación de Reserva

**Historia de Usuario:** Como cliente, quiero introducir mis datos personales y los de mi mascota para completar la reserva, para que la guardería disponga de toda la información necesaria.

#### Criterios de Aceptación

1. THE Sistema SHALL solicitar al Cliente los siguientes datos obligatorios: nombre completo, teléfono, correo electrónico y nombre del perro.
2. THE Sistema SHALL solicitar al Cliente los siguientes datos opcionales: raza del perro, tamaño del perro (Cachorro, Pequeño, Mediano, Grande) y notas adicionales.
3. THE Sistema SHALL requerir que el Cliente acepte la política de privacidad antes de poder confirmar la reserva.
4. IF el Cliente no completa todos los campos obligatorios, THEN THE Sistema SHALL impedir el envío del formulario y señalar los campos pendientes.
5. WHEN el Cliente confirma la reserva, THE Sistema SHALL registrar la reserva en la base de datos con estado "pendiente".
6. WHEN la reserva se registra correctamente, THE Sistema SHALL mostrar al Cliente una pantalla de confirmación con el resumen de la reserva.
7. WHEN la reserva se registra correctamente, THE Sistema SHALL actualizar la disponibilidad de plazas para las fechas reservadas.

---

### Requisito 6: Notificaciones por Correo Electrónico

**Historia de Usuario:** Como cliente, quiero recibir notificaciones por correo electrónico sobre el estado de mi reserva, para estar informado en todo momento.

#### Criterios de Aceptación

1. WHEN una reserva es creada por el Cliente, THE Sistema SHALL enviar un correo electrónico de confirmación de recepción al correo del Cliente.
2. WHEN el Empresario confirma una reserva, THE Sistema SHALL enviar un correo electrónico de confirmación al correo del Cliente.
3. WHEN el Empresario rechaza una reserva, THE Sistema SHALL enviar un correo electrónico de notificación de rechazo al correo del Cliente.
4. WHEN el Empresario cancela una reserva confirmada, THE Sistema SHALL enviar un correo electrónico de notificación de cancelación al correo del Cliente.
5. WHEN una nueva reserva es creada, THE Sistema SHALL enviar una notificación al correo del Empresario informando de la nueva solicitud pendiente.
6. IF el envío de un correo electrónico falla, THEN THE Sistema SHALL registrar el error en el log del sistema sin interrumpir el flujo de la reserva.

---

### Requisito 7: Gestión de Reservas por el Empresario

**Historia de Usuario:** Como empresario, quiero gestionar todas las reservas desde el panel de administración, para confirmar, rechazar, modificar o cancelar reservas según las necesidades del negocio.

#### Criterios de Aceptación

1. THE Panel_Admin SHALL mostrar al Empresario un listado de todas las reservas con su estado actual.
2. THE Panel_Admin SHALL permitir al Empresario filtrar reservas por estado (Todas, Activas, Pendientes, Confirmadas, Rechazadas, Canceladas, Pasadas) y por tipo de servicio.
3. WHEN el Empresario selecciona una reserva, THE Panel_Admin SHALL mostrar el detalle completo de la reserva incluyendo datos del cliente, datos del perro, fechas, tarifa, horario y precio.
4. WHEN una reserva tiene estado "pendiente", THE Panel_Admin SHALL permitir al Empresario confirmarla o rechazarla.
5. WHEN una reserva tiene estado "confirmada", THE Panel_Admin SHALL permitir al Empresario modificar sus datos o cancelarla.
6. WHEN el Empresario modifica una reserva, THE Sistema SHALL guardar los cambios y actualizar el listado de reservas.
7. THE Panel_Admin SHALL mostrar en todo momento el número de reservas pendientes de gestión.

---

### Requisito 8: Gestión de Disponibilidad y Calendario

**Historia de Usuario:** Como empresario, quiero controlar la disponibilidad de plazas y bloquear días en el calendario, para gestionar la capacidad del negocio de forma manual.

#### Criterios de Aceptación

1. THE Panel_Admin SHALL mostrar un calendario mensual con el nivel de ocupación por servicio y por día.
2. THE Panel_Admin SHALL permitir al Empresario navegar entre meses en el calendario de ocupación.
3. THE Panel_Admin SHALL permitir al Empresario seleccionar el servicio a visualizar en el calendario (Paseos, Guardería, Alojamiento).
4. WHEN el Empresario activa el modo de bloqueo y selecciona un día, THE Sistema SHALL marcar ese día como no disponible para el servicio seleccionado.
5. WHEN el Empresario activa el modo de desbloqueo y selecciona un día bloqueado, THE Sistema SHALL restaurar la disponibilidad de ese día.
6. IF el Empresario intenta bloquear un día ya bloqueado, THEN THE Sistema SHALL mostrar un mensaje informativo sin realizar cambios.
7. IF el Empresario intenta desbloquear un día que no está bloqueado, THEN THE Sistema SHALL mostrar un mensaje informativo sin realizar cambios.
8. WHEN un día es bloqueado, THE Sistema SHALL impedir que los Clientes realicen nuevas reservas en ese día para el servicio afectado.

---

### Requisito 9: Configuración de Precios y Plazas

**Historia de Usuario:** Como empresario, quiero configurar los precios de cada servicio y el número de plazas disponibles, para adaptar la oferta a las condiciones del negocio.

#### Criterios de Aceptación

1. THE Panel_Admin SHALL permitir al Empresario configurar el precio de tarifa Normal, tarifa Cachorros, tarifa Festivos y coste de Perro_Extra para cada uno de los tres servicios.
2. THE Panel_Admin SHALL permitir al Empresario configurar el número máximo de plazas disponibles por servicio.
3. WHEN el Empresario guarda los cambios de precios, THE Sistema SHALL actualizar los valores en la base de datos y aplicarlos a las nuevas reservas.
4. THE Panel_Admin SHALL ofrecer al Empresario la opción de restablecer los precios a sus valores por defecto.
5. WHEN el Empresario restablece los precios, THE Sistema SHALL solicitar confirmación antes de aplicar los valores por defecto.

---

### Requisito 10: Gestión de Días Festivos

**Historia de Usuario:** Como empresario, quiero gestionar los días festivos del calendario, para aplicar tarifas especiales en esas fechas.

#### Criterios de Aceptación

1. THE Panel_Admin SHALL mostrar al Empresario el listado de días festivos registrados con su fecha y nombre.
2. THE Panel_Admin SHALL permitir al Empresario añadir un nuevo festivo indicando fecha y nombre descriptivo.
3. IF el Empresario intenta guardar un festivo sin fecha o sin nombre, THEN THE Sistema SHALL mostrar un mensaje de error y requerir los campos obligatorios.
4. THE Panel_Admin SHALL permitir al Empresario eliminar un festivo existente previa confirmación.
5. WHEN el Cliente visualiza el resumen de su reserva, THE Sistema SHALL indicar si alguna de las fechas seleccionadas coincide con un día festivo y que el precio puede variar.

---

### Requisito 11: Exportación de Datos

**Historia de Usuario:** Como empresario, quiero exportar el listado de reservas en distintos formatos, para poder analizar los datos del negocio fuera de la aplicación.

#### Criterios de Aceptación

1. THE Panel_Admin SHALL permitir al Empresario exportar reservas en formato CSV.
2. THE Panel_Admin SHALL permitir al Empresario exportar reservas en formato Excel (.xlsx).
3. THE Panel_Admin SHALL permitir al Empresario exportar reservas en formato PDF.
4. THE Panel_Admin SHALL permitir al Empresario filtrar las reservas a exportar por rango de fechas, tipo de servicio y estado.
5. WHEN el Empresario aplica filtros de exportación, THE Panel_Admin SHALL mostrar el número total de registros que se exportarán.

---

### Requisito 12: Seguridad y Protección de Datos

**Historia de Usuario:** Como cliente, quiero que mis datos personales estén protegidos, para confiar en que la aplicación cumple con la normativa de privacidad.

#### Criterios de Aceptación

1. THE Sistema SHALL transmitir todos los datos entre el cliente y el servidor mediante conexión cifrada (HTTPS).
2. THE Sistema SHALL requerir que el Cliente acepte explícitamente la política de privacidad antes de registrar cualquier dato personal.
3. THE Sistema SHALL restringir el acceso a los datos personales de los Clientes exclusivamente al Empresario autenticado.
4. THE Sistema SHALL almacenar únicamente los datos personales necesarios para la prestación del servicio de reservas.
5. IF se produce un error en el sistema, THEN THE Sistema SHALL registrar el error en un log interno sin exponer datos personales en mensajes visibles al usuario.

---

### Requisito 13: Rendimiento y Disponibilidad

**Historia de Usuario:** Como cliente, quiero que la aplicación responda con rapidez, para completar mi reserva sin esperas innecesarias.

#### Criterios de Aceptación

1. WHEN el Cliente accede a la página de reservas, THE Sistema SHALL cargar la disponibilidad del mes actual en menos de 3 segundos bajo condiciones normales de red.
2. WHEN el Cliente confirma una reserva, THE Sistema SHALL registrar la reserva y mostrar la pantalla de confirmación en menos de 5 segundos.
3. THE Sistema SHALL mostrar un indicador visual de carga mientras se realizan operaciones asíncronas con la base de datos.
4. IF la conexión con la base de datos falla durante la carga inicial, THEN THE Sistema SHALL mostrar un mensaje de error claro al Cliente indicando que recargue la página.
