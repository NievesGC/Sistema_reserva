<h2 align="center">SISTEMA DE RESERVAS</h2>

<h2 align="center">Sistema de Reservas para Guardería Canina</h2>

Sistema completo de gestión de reservas para guarderías caninas con interfaz de cliente y panel de administración. Incluye gestión en tiempo real de disponibilidad, múltiples servicios, tarifas personalizables y exportación de datos.

Este proyecto ha sido desarrollado como parte de mi proceso de aprendizaje y formación como Full Stack Developer. Utilizando Claude como herramienta de asistencia y pair programming, he trabajado en la implementación de funcionalidades reales que refuerzan tanto conocimientos previos como nuevas tecnologías.

<h4>Objetivos de Aprendizaje</h4>

Práctica con tecnologías modernas: Integración de Supabase, manipulación avanzada del DOM, y gestión de estado en JavaScript vanilla
Diseño UI/UX: Implementación de interfaces modernas con Tailwind CSS y efectos visuales contemporáneos
Lógica de negocio: Desarrollo de sistemas de reservas con validaciones, disponibilidad en tiempo real y gestión de datos
Arquitectura de aplicaciones: Separación de responsabilidades entre cliente y administración
Resolución de problemas reales: Implementación de funcionalidades que una guardería canina necesitaría en producción

Este proyecto forma parte de mi portfolio profesional y demuestra mi capacidad para desarrollar aplicaciones web completas y funcionales. Cada línea de código ha sido revisada, comprendida e implementada como parte de mi proceso de aprendizaje continuo

<h3>Características Principales</h3>

<h4></h4>
Para Clientes

Selección de servicios: Paseos, Guardería y Alojamiento
Calendario interactivo con disponibilidad en tiempo real
Sistema de tarifas: Normal y Cachorros
Opciones de horario: Mañana, Tarde o Día completo (según servicio)
Transporte opcional para alojamiento (recogida/entrega)
Perro extra: Opción para traer un segundo perro
Proceso guiado en 3 pasos con validación
Confirmación por email

<h4></h4>
Para Administradores

Gestión completa de reservas: Ver, editar, confirmar, rechazar o cancelar
Calendario de ocupación visual por servicio
Bloqueo de días: Control manual de disponibilidad
Gestión de festivos: Días con tarifas especiales
Configuración de precios: Personalización por servicio y tarifa
Exportación de datos: Excel, CSV y PDF
Filtros avanzados: Por estado, servicio y fechas
Estadísticas en tiempo real

<h3>Tecnologías Utilizadas</h3>

Frontend: HTML5, Tailwind CSS, JavaScript (Vanilla)
Backend: Supabase (PostgreSQL)
Estilos: CSS personalizado con glassmorphism y gradientes modernos
Animaciones: Transiciones CSS fluidas

<h3>Estructura del Proyecto</h3>

proyecto/ <br>
├── css/ <br>
│   ├── styles_index.css      # Estilos del cliente <br>
│   └── styles_admin.css      # Estilos del panel admin <br>
├── js/ <br>
│   ├── client.js             # Lógica del cliente <br>
│   └── admin.js              # Lógica del panel admin <br>
├── html/ <br>
│   ├── index.html            # Página de reservas <br>
│   └── admin.html            # Panel de administración <br>
└── settings.json             # Configuración del servidor local <br>

<h3>Uso</h3>

<h4>Cliente (index.html)</h4>

Paso 1: Selecciona el servicio y las fechas

Elige entre Paseos, Guardería o Alojamiento
Selecciona fechas desde el calendario o inputs
El sistema muestra plazas disponibles en tiempo real


Paso 2: Configura tarifa y horario

Selecciona tarifa Normal o Cachorros
Elige horario (mañana/tarde/completo)
Marca si traes un perro extra


Paso 3: Completa tus datos

Información del dueño (nombre, teléfono, email)
Datos del perro (nombre, raza, tamaño)
Acepta la política de privacidad
Confirma la reserva


<h4>Administrador (admin.html)</h4>


<strong> Pestaña Reservas </strong>


Visualiza todas las reservas con filtros
Confirma, rechaza o cancela reservas
Edita detalles de reservas confirmadas
Ve información completa de cada reserva

<strong> Pestaña Calendario </strong>

Visualiza ocupación por servicio y mes
Bloquea/desbloquea días manualmente
Controla la disponibilidad visualmente

<strong> Pestaña Festivos </strong>

Añade días festivos con tarifas especiales
Gestiona el listado de festivos activos

<strong> 
Pestaña Precios </strong>

Configura precios por servicio y tarifa
Ajusta plazas disponibles
Restablece precios por defecto

<strong>Pestaña Exportar </strong>

Exporta reservas a Excel, CSV o PDF
Filtra por fechas, servicio y estado

<h3>Personalización</h3>

<strong> Colores </strong>

Los colores principales se definen en los archivos CSS usando gradientes:
Primario: #667eea → #764ba2
Badges se pueden modificar en las clases .badge-*

<strong> Precios </strong>

Los precios se muestran en client.js en el objeto preciosPorServicio. Estos son solo visuales; los reales se calculan en el servidor.
Plazas Disponibles
Modifica en la tabla configuracion de Supabase o desde el panel admin.


<h3>Notas Importantes</h3>

No usa localStorage: Todo se guarda en Supabase
Validación en tiempo real: Verifica disponibilidad antes de confirmar
Responsive: Funciona en móvil, tablet y escritorio
Festivos: Los días festivos pueden tener tarifas diferentes (configurar lógica de cálculo según necesidad)


<h3>Estado del Proyecto</h3>

Este proyecto está actualmente en desarrollo. Algunas funcionalidades pueden estar incompletas o en proceso de implementación.
