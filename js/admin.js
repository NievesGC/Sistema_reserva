
// Generar fechas relativas a hoy para datos de ejemplo
const hoy = new Date();
const en5dias = new Date(hoy);
en5dias.setDate(hoy.getDate() + 5);
const en10dias = new Date(hoy);
en10dias.setDate(hoy.getDate() + 10);
const en12dias = new Date(hoy);
en12dias.setDate(hoy.getDate() + 12);
const hace5dias = new Date(hoy);
hace5dias.setDate(hoy.getDate() - 5);

const formatFecha = (fecha) => fecha.toISOString().split('T')[0];

// Datos de ejemplo
let reservasData = [
    {id: '1', servicio: 'guarderia', fecha_desde: formatFecha(en5dias), fecha_hasta: formatFecha(en5dias), nombre_dueno: 'María García', telefono: '666777888', email: 'maria@email.com', nombre_perro: 'Max', raza: 'Labrador', tamano: 'grande', tarifa: 'normal', tramo_horario: 'completo', precio_total: 20, estado: 'pendiente', perro_extra: false, notas: '', created_at: new Date().toISOString()},
    {id: '2', servicio: 'alojamiento', fecha_desde: formatFecha(en10dias), fecha_hasta: formatFecha(en12dias), nombre_dueno: 'Juan Pérez', telefono: '655444333', email: 'juan@email.com', nombre_perro: 'Luna', raza: 'Golden', tamano: 'mediano', tarifa: 'normal', tramo_horario: 'recogida-entrega', precio_total: 90, estado: 'confirmada', perro_extra: false, direccion: 'Calle Mayor 123', notas: 'Alérgica al pollo', created_at: new Date().toISOString()},
    {id: '3', servicio: 'paseos', fecha_desde: formatFecha(hace5dias), fecha_hasta: formatFecha(hace5dias), nombre_dueno: 'Ana López', telefono: '644555666', email: 'ana@email.com', nombre_perro: 'Rocky', raza: 'Beagle', tamano: 'pequeño', tarifa: 'normal', tramo_horario: 'mañana', precio_total: 12, estado: 'confirmada', perro_extra: false, notas: '', created_at: new Date().toISOString()}
];

let festivosData = [{id: '1', fecha: '2025-12-25', nombre: 'Navidad', activo: true}, {id: '2', fecha: '2025-01-01', nombre: 'Año Nuevo', activo: true}];
let calendarioMes = new Date();
let calendarioServicio = 'paseos';
let modoCalendario = null; // null, 'bloquear', 'desbloquear'
let diasBloqueados = []; // Array para guardar los días bloqueados

// Inicializa el panel al cargar la página
function init() {
    actualizarEstadisticas();
    cargarReservas();
    cargarCalendario();
    cargarFestivos();
    setFechasExport();
}

// Cambia entre tabs
function cambiarTab(tab) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.tab-button').forEach(el => {
        el.classList.remove('active');
        el.classList.add('bg-white', 'text-gray-700');
    });
    document.getElementById(`content-${tab}`).classList.remove('hidden');
    const btn = document.getElementById(`tab-${tab}`);
    btn.classList.add('active');
    btn.classList.remove('bg-white', 'text-gray-700');
}

// Actualiza el contador de reservas pendientes
function actualizarEstadisticas() {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const hoyStr = hoy.toISOString().split('T')[0];
    const reservasActivas = reservasData.filter(r => r.fecha_hasta >= hoyStr);
    const pendientes = reservasActivas.filter(r => r.estado === 'pendiente').length;
    document.getElementById('stat-pendientes').textContent = pendientes;
}

// Carga y muestra las reservas según los filtros seleccionados
function cargarReservas() {
    const filtroEstado = document.getElementById('filtro-estado').value;
    const filtroServicio = document.getElementById('filtro-servicio').value;
    const hoy = new Date().toISOString().split('T')[0];
    let reservasFiltradas = reservasData;
    
    if (filtroEstado === 'pasadas') {
        reservasFiltradas = reservasFiltradas.filter(r => r.fecha_hasta < hoy);
    } else if (filtroEstado === 'activas') {
        reservasFiltradas = reservasFiltradas.filter(r => r.fecha_hasta >= hoy && (r.estado === 'pendiente' || r.estado === 'confirmada'));
    } else if (filtroEstado === 'todas') {
        reservasFiltradas = reservasFiltradas.filter(r => r.fecha_hasta >= hoy);
    } else {
        reservasFiltradas = reservasFiltradas.filter(r => r.fecha_hasta >= hoy && r.estado === filtroEstado);
    }
    
    if (filtroServicio !== 'todos') {
        reservasFiltradas = reservasFiltradas.filter(r => r.servicio === filtroServicio);
    }
    
    const container = document.getElementById('lista-reservas');
    
    if (reservasFiltradas.length === 0) {
        container.innerHTML = '<p class="text-center text-gray-500 py-8">No hay reservas que mostrar</p>';
        return;
    }
    
    container.innerHTML = reservasFiltradas.map(r => {
        const badgeClass = `badge-${r.estado}`;
        const servicioIcon = r.servicio === 'paseos' ? '🐕' : r.servicio === 'guarderia' ? '☀️' : '🏠';
        const esPasada = r.fecha_hasta < hoy;
        
        return `<div class="bg-white p-6 rounded-2xl shadow-md hover:shadow-lg transition ${esPasada ? 'opacity-75' : ''}"><div class="flex items-start justify-between"><div class="flex-1"><div class="flex items-center gap-2 mb-2"><span class="text-2xl">${servicioIcon}</span><h3 class="text-lg font-bold text-gray-800">${r.nombre_perro} (${r.nombre_dueno})</h3><span class="${badgeClass} text-white text-xs px-3 py-1 rounded-full font-semibold">${r.estado.toUpperCase()}</span>${esPasada ? '<span class="bg-gray-400 text-white text-xs px-3 py-1 rounded-full font-semibold">PASADA</span>' : ''}</div><div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 mt-3"><div><strong>Servicio:</strong> ${r.servicio}</div><div><strong>Fechas:</strong> ${r.fecha_desde}${r.fecha_hasta !== r.fecha_desde ? ' - ' + r.fecha_hasta : ''}</div><div><strong>Teléfono:</strong> ${r.telefono}</div><div><strong>Precio:</strong> ${r.precio_total}€</div></div></div><div class="flex gap-2 ml-4"><button onclick="verDetalle('${r.id}')" class="btn-action px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm">Ver</button>${!esPasada && r.estado === 'pendiente' ? `<button onclick="confirmarReserva('${r.id}')" class="btn-action px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm">✓</button><button onclick="rechazarReserva('${r.id}')" class="btn-action px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm">✗</button>` : ''}${!esPasada && r.estado === 'confirmada' ? `<button onclick="cancelarReserva('${r.id}')" class="btn-action px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 text-sm">Cancelar</button>` : ''}</div></div></div>`;
    }).join('');
}

// Aplica los filtros seleccionados
function filtrarReservas() {
    cargarReservas();
}

// Muestra el modal con el detalle completo de una reserva
function verDetalle(id) {
    const reserva = reservasData.find(r => r.id === id);
    if (!reserva) return;
    const servicioIcon = reserva.servicio === 'paseos' ? '🐕' : reserva.servicio === 'guarderia' ? '☀️' : '🏠';
    const badgeClass = `badge-${reserva.estado}`;
    const html = `<div class="space-y-4"><div class="flex items-center gap-3 mb-4"><span class="text-3xl">${servicioIcon}</span><div><h4 class="text-xl font-bold">${reserva.nombre_perro}</h4><span class="${badgeClass} text-white text-xs px-3 py-1 rounded-full font-semibold">${reserva.estado.toUpperCase()}</span></div></div><div class="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl"><div><strong>Servicio:</strong> ${reserva.servicio}</div><div><strong>Tarifa:</strong> ${reserva.tarifa}</div><div><strong>Horario/Transporte:</strong> ${reserva.tramo_horario}</div><div><strong>Precio Total:</strong> ${reserva.precio_total}€</div></div><div class="bg-gray-50 p-4 rounded-xl"><h5 class="font-bold mb-2">Fechas</h5><p>Desde: ${reserva.fecha_desde}</p><p>Hasta: ${reserva.fecha_hasta}</p></div><div class="bg-gray-50 p-4 rounded-xl"><h5 class="font-bold mb-2">Datos del Dueño</h5><p><strong>Nombre:</strong> ${reserva.nombre_dueno}</p><p><strong>Teléfono:</strong> ${reserva.telefono}</p><p><strong>Email:</strong> ${reserva.email}</p>${reserva.direccion ? `<p><strong>Dirección:</strong> ${reserva.direccion}</p>` : ''}</div><div class="bg-gray-50 p-4 rounded-xl"><h5 class="font-bold mb-2">Datos del Perro</h5><p><strong>Raza:</strong> ${reserva.raza || 'No especificada'}</p><p><strong>Tamaño:</strong> ${reserva.tamano}</p><p><strong>Perro extra:</strong> ${reserva.perro_extra ? 'Sí' : 'No'}</p>${reserva.notas ? `<p><strong>Notas:</strong> ${reserva.notas}</p>` : ''}</div><div class="flex gap-3 mt-6">${reserva.estado === 'pendiente' ? `<button onclick="confirmarReserva('${reserva.id}'); cerrarModal('modal-detalle');" class="flex-1 px-6 py-3 bg-green-500 text-white rounded-xl font-semibold hover:bg-green-600 transition">Confirmar</button><button onclick="rechazarReserva('${reserva.id}'); cerrarModal('modal-detalle');" class="flex-1 px-6 py-3 bg-red-500 text-white rounded-xl font-semibold hover:bg-red-600 transition">Rechazar</button>` : ''}${reserva.estado === 'confirmada' ? `<button onclick="editarReserva('${reserva.id}')" class="flex-1 px-6 py-3 bg-blue-500 text-white rounded-xl font-semibold hover:bg-blue-600 transition">Modificar</button><button onclick="cancelarReserva('${reserva.id}'); cerrarModal('modal-detalle');" class="flex-1 px-6 py-3 bg-orange-500 text-white rounded-xl font-semibold hover:bg-orange-600 transition">Cancelar</button>` : ''}</div></div>`;
    document.getElementById('detalle-content').innerHTML = html;
    abrirModal('modal-detalle');
}

// Abre el formulario de edición de una reserva
function editarReserva(id) {
    const reserva = reservasData.find(r => r.id === id);
    if (!reserva) return;
    const esPaseos = reserva.servicio === 'paseos';
    const esGuarderia = reserva.servicio === 'guarderia';
    const esAlojamiento = reserva.servicio === 'alojamiento';
    const html = `<div class="grid grid-cols-1 md:grid-cols-2 gap-4"><div><label class="block text-sm font-bold text-gray-700 mb-2">Servicio</label><input type="text" value="${reserva.servicio}" disabled class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-100"></div><div><label class="block text-sm font-bold text-gray-700 mb-2">Tarifa</label><select id="edit-tarifa" class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none"><option value="normal" ${reserva.tarifa === 'normal' ? 'selected' : ''}>Normal</option><option value="cachorros" ${reserva.tarifa === 'cachorros' ? 'selected' : ''}>Cachorros</option></select></div><div><label class="block text-sm font-bold text-gray-700 mb-2">Fecha Desde *</label><input type="date" id="edit-fecha-desde" value="${reserva.fecha_desde}" class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none"></div><div><label class="block text-sm font-bold text-gray-700 mb-2">Fecha Hasta *</label><input type="date" id="edit-fecha-hasta" value="${reserva.fecha_hasta}" class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none"></div><div><label class="block text-sm font-bold text-gray-700 mb-2">${esAlojamiento ? 'Transporte' : 'Horario'}</label><select id="edit-tramo" class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none">${esAlojamiento ? `<option value="sin-transporte" ${reserva.tramo_horario === 'sin-transporte' ? 'selected' : ''}>Sin transporte</option><option value="recogida" ${reserva.tramo_horario === 'recogida' ? 'selected' : ''}>Solo Recogida (+12€)</option><option value="recogida-entrega" ${reserva.tramo_horario === 'recogida-entrega' ? 'selected' : ''}>Recogida + Entrega (+20€)</option>` : `<option value="mañana" ${reserva.tramo_horario === 'mañana' ? 'selected' : ''}>Mañana (09:00-12:00)</option><option value="tarde" ${reserva.tramo_horario === 'tarde' ? 'selected' : ''}>Tarde (16:00-19:00)</option>${esGuarderia ? `<option value="completo" ${reserva.tramo_horario === 'completo' ? 'selected' : ''}>Todo el día (09:00-19:00)</option>` : ''}`}</select></div><div><label class="block text-sm font-bold text-gray-700 mb-2">Precio Total (€)</label><input type="number" id="edit-precio" value="${reserva.precio_total}" class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none"></div><div class="md:col-span-2"><label class="flex items-center cursor-pointer"><input type="checkbox" id="edit-perro-extra" ${reserva.perro_extra ? 'checked' : ''} class="mr-3"><span class="text-sm font-semibold text-gray-700">Perro extra</span></label></div></div><div class="mt-6 space-y-4"><h4 class="font-bold text-gray-800">Datos del Dueño</h4><div class="grid grid-cols-1 md:grid-cols-2 gap-4"><div><label class="block text-sm font-bold text-gray-700 mb-2">Nombre *</label><input type="text" id="edit-nombre-dueno" value="${reserva.nombre_dueno}" class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none"></div><div><label class="block text-sm font-bold text-gray-700 mb-2">Teléfono *</label><input type="tel" id="edit-telefono" value="${reserva.telefono}" class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none"></div><div class="md:col-span-2"><label class="block text-sm font-bold text-gray-700 mb-2">Email *</label><input type="email" id="edit-email" value="${reserva.email}" class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none"></div>${esAlojamiento && (reserva.tramo_horario === 'recogida' || reserva.tramo_horario === 'recogida-entrega') ? `<div class="md:col-span-2"><label class="block text-sm font-bold text-gray-700 mb-2">Dirección</label><input type="text" id="edit-direccion" value="${reserva.direccion || ''}" class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none"></div>` : ''}</div></div><div class="mt-6 space-y-4"><h4 class="font-bold text-gray-800">Datos del Perro</h4><div class="grid grid-cols-1 md:grid-cols-2 gap-4"><div><label class="block text-sm font-bold text-gray-700 mb-2">Nombre *</label><input type="text" id="edit-nombre-perro" value="${reserva.nombre_perro}" class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none"></div><div><label class="block text-sm font-bold text-gray-700 mb-2">Raza</label><input type="text" id="edit-raza" value="${reserva.raza || ''}" class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none"></div><div class="md:col-span-2"><label class="block text-sm font-bold text-gray-700 mb-2">Tamaño *</label><select id="edit-tamano" class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none"><option value="cachorro" ${reserva.tamano === 'cachorro' ? 'selected' : ''}>Cachorro</option><option value="pequeño" ${reserva.tamano === 'pequeño' ? 'selected' : ''}>Pequeño</option><option value="mediano" ${reserva.tamano === 'mediano' ? 'selected' : ''}>Mediano</option><option value="grande" ${reserva.tamano === 'grande' ? 'selected' : ''}>Grande</option></select></div><div class="md:col-span-2"><label class="block text-sm font-bold text-gray-700 mb-2">Notas</label><textarea id="edit-notas" rows="3" class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none">${reserva.notas || ''}</textarea></div></div></div><div class="flex gap-4 mt-8"><button onclick="guardarEdicion('${id}')" class="flex-1 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold hover:shadow-lg transition">Guardar Cambios</button><button onclick="cerrarModal('modal-editar')" class="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition">Cancelar</button></div>`;
    document.getElementById('form-editar').innerHTML = html;
    abrirModal('modal-editar');
}

// Guarda los cambios de una reserva editada
function guardarEdicion(id) {
    const reserva = reservasData.find(r => r.id === id);
    if (!reserva) return;
    reserva.tarifa = document.getElementById('edit-tarifa').value;
    reserva.fecha_desde = document.getElementById('edit-fecha-desde').value;
    reserva.fecha_hasta = document.getElementById('edit-fecha-hasta').value;
    reserva.tramo_horario = document.getElementById('edit-tramo').value;
    reserva.precio_total = parseFloat(document.getElementById('edit-precio').value);
    reserva.perro_extra = document.getElementById('edit-perro-extra').checked;
    reserva.nombre_dueno = document.getElementById('edit-nombre-dueno').value;
    reserva.telefono = document.getElementById('edit-telefono').value;
    reserva.email = document.getElementById('edit-email').value;
    reserva.nombre_perro = document.getElementById('edit-nombre-perro').value;
    reserva.raza = document.getElementById('edit-raza').value;
    reserva.tamano = document.getElementById('edit-tamano').value;
    reserva.notas = document.getElementById('edit-notas').value;
    if (document.getElementById('edit-direccion')) {
        reserva.direccion = document.getElementById('edit-direccion').value;
    }
    cargarReservas();
    cerrarModal('modal-editar');
    alert('Reserva actualizada correctamente');
}

// Confirma una reserva pendiente
function confirmarReserva(id) {
    if (!confirm('¿Confirmar esta reserva?')) return;
    const reserva = reservasData.find(r => r.id === id);
    if (reserva) {
        reserva.estado = 'confirmada';
        cargarReservas();
        actualizarEstadisticas();
        alert('Reserva confirmada correctamente');
    }
}

// Rechaza una reserva pendiente
function rechazarReserva(id) {
    if (!confirm('¿Rechazar esta reserva?')) return;
    const reserva = reservasData.find(r => r.id === id);
    if (reserva) {
        reserva.estado = 'rechazada';
        cargarReservas();
        actualizarEstadisticas();
        alert('Reserva rechazada');
    }
}

// Cancela una reserva confirmada
function cancelarReserva(id) {
    if (!confirm('¿Cancelar esta reserva?')) return;
    const reserva = reservasData.find(r => r.id === id);
    if (reserva) {
        reserva.estado = 'cancelada';
        cargarReservas();
        actualizarEstadisticas();
        alert('Reserva cancelada');
    }
}

// Carga el calendario de ocupación para el mes actual
function cargarCalendario() {
    calendarioServicio = document.getElementById('servicio-calendario').value;
    const year = calendarioMes.getFullYear();
    const month = calendarioMes.getMonth();
    document.getElementById('mes-actual').textContent = calendarioMes.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    const primerDia = new Date(year, month, 1);
    const ultimoDia = new Date(year, month + 1, 0);
    const dias = [];
    const primerDiaSemana = primerDia.getDay();
    const diasVaciosInicio = primerDiaSemana === 0 ? 6 : primerDiaSemana - 1;
    for (let i = diasVaciosInicio; i > 0; i--) {
        const diaAnterior = new Date(primerDia);
        diaAnterior.setDate(primerDia.getDate() - i);
        dias.push({ fecha: diaAnterior, mesActual: false });
    }
    for (let d = new Date(primerDia); d <= ultimoDia; d.setDate(d.getDate() + 1)) {
        dias.push({ fecha: new Date(d), mesActual: true });
    }
    const container = document.getElementById('calendario-admin');
    container.innerHTML = dias.map(dia => {
        const fechaStr = dia.fecha.toISOString().split('T')[0];
        const bloqueado = diasBloqueados.includes(fechaStr);
        const ocupacion = bloqueado ? 0 : Math.floor(Math.random() * 5);
        let colorClass = 'bg-green-100';
        if (bloqueado) {
            colorClass = 'bg-gray-300';
        } else if (ocupacion >= 4) {
            colorClass = 'bg-red-100';
        } else if (ocupacion >= 2) {
            colorClass = 'bg-yellow-100';
        }
        return `<div onclick="clickDiaCalendario('${fechaStr}')" class="calendar-day ${colorClass} p-3 rounded-xl border-2 border-gray-200 cursor-pointer ${!dia.mesActual ? 'opacity-40' : ''}"><div class="font-bold text-sm mb-1">${dia.fecha.getDate()}</div>${dia.mesActual && !bloqueado ? `<div class="text-xs text-gray-600">${ocupacion}/4</div>` : ''}${bloqueado ? '<div class="text-xs text-red-600">🔒</div>' : ''}</div>`;
    }).join('');
}

// Navega al mes anterior en el calendario
function mesAnterior() {
    calendarioMes.setMonth(calendarioMes.getMonth() - 1);
    cargarCalendario();
}

// Navega al mes siguiente en el calendario
function mesSiguiente() {
    calendarioMes.setMonth(calendarioMes.getMonth() + 1);
    cargarCalendario();
}

// Activa el modo de bloqueo de días en el calendario
function activarModoBloqueo() {
    modoCalendario = 'bloquear';
    document.getElementById('btn-bloquear').className = 'px-4 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition font-semibold';
    document.getElementById('btn-desbloquear').className = 'px-4 py-2 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition font-semibold';
}

// Activa el modo de desbloqueo de días en el calendario
function activarModoDesbloqueo() {
    modoCalendario = 'desbloquear';
    document.getElementById('btn-desbloquear').className = 'px-4 py-2 bg-green-500 text-white rounded-xl hover:bg-green-600 transition font-semibold';
    document.getElementById('btn-bloquear').className = 'px-4 py-2 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition font-semibold';
}

// Maneja el click en un día del calendario - guarda la fecha seleccionada globalmente
let fechaSeleccionada = null;

function clickDiaCalendario(fecha) {
    if (!modoCalendario) {
        alert('⚠️ Selecciona primero una acción: Bloquear o Desbloquear días');
        return;
    }
    
    const estaBloqueado = diasBloqueados.includes(fecha);
    
    if (modoCalendario === 'bloquear') {
        if (estaBloqueado) {
            alert('⚠️ Este día ya está bloqueado');
            return;
        }
        fechaSeleccionada = fecha;
        document.getElementById('bloquear-fecha').textContent = '';
        document.getElementById('bloquear-servicio').textContent = 'Todos los servicios';
        abrirModal('modal-bloquear');
    } else if (modoCalendario === 'desbloquear') {
        if (!estaBloqueado) {
            alert('⚠️ Este día no está bloqueado');
            return;
        }
        if (confirm('¿Quieres desbloquear este día?\n\nLa guardería volverá a estar disponible.')) {
            diasBloqueados = diasBloqueados.filter(d => d !== fecha);
            alert('Día desbloqueado correctamente');
            cargarCalendario();
        }
    }
}

// Confirma el bloqueo de un día
function confirmarBloqueo() {
    if (fechaSeleccionada) {
        diasBloqueados.push(fechaSeleccionada);
        alert('Día bloqueado correctamente');
        cerrarModal('modal-bloquear');
        cargarCalendario();
        fechaSeleccionada = null;
    }
}

// Carga la lista de días festivos
function cargarFestivos() {
    const container = document.getElementById('lista-festivos');
    container.innerHTML = festivosData.map(f => `<div class="bg-white p-4 rounded-xl shadow-md flex items-center justify-between"><div><p class="font-bold">${f.nombre}</p><p class="text-sm text-gray-600">${f.fecha}</p></div><button onclick="eliminarFestivo('${f.id}')" class="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600">Eliminar</button></div>`).join('');
}

// Abre el modal para añadir un nuevo festivo
function abrirModalFestivo() {
    document.getElementById('festivo-fecha').value = '';
    document.getElementById('festivo-nombre').value = '';
    abrirModal('modal-festivo');
}

// Guarda un nuevo día festivo
function guardarFestivo() {
    const fecha = document.getElementById('festivo-fecha').value;
    const nombre = document.getElementById('festivo-nombre').value;
    if (!fecha || !nombre) {
        alert('Completa todos los campos');
        return;
    }
    festivosData.push({
        id: Date.now().toString(),
        fecha,
        nombre,
        activo: true
    });
    cargarFestivos();
    cerrarModal('modal-festivo');
    alert('Festivo añadido correctamente');
}

// Elimina un día festivo
function eliminarFestivo(id) {
    if (!confirm('¿Eliminar este festivo?')) return;
    festivosData = festivosData.filter(f => f.id !== id);
    cargarFestivos();
}

// Guarda los cambios en los precios
function guardarPrecios() {
    alert('Precios guardados correctamente');
}

// Restablece los precios a sus valores por defecto
function resetearPrecios() {
    if (!confirm('¿Restablecer precios por defecto?')) return;
    document.getElementById('precio-paseos-normal').value = 12;
    document.getElementById('precio-paseos-cachorros').value = 14;
    document.getElementById('precio-paseos-festivos').value = 13;
    document.getElementById('precio-paseos-extra').value = 9;
    document.getElementById('plazas-paseos').value = 2;
    document.getElementById('precio-guarderia-normal').value = 20;
    document.getElementById('precio-guarderia-cachorros').value = 22;
    document.getElementById('precio-guarderia-festivos').value = 25;
    document.getElementById('precio-guarderia-extra').value = 15;
    document.getElementById('plazas-guarderia').value = 4;
    document.getElementById('precio-alojamiento-normal').value = 35;
    document.getElementById('precio-alojamiento-cachorros').value = 38;
    document.getElementById('precio-alojamiento-festivos').value = 40;
    document.getElementById('precio-alojamiento-extra').value = 25;
    document.getElementById('plazas-alojamiento').value = 4;
}



// Establece las fechas por defecto para exportación
function setFechasExport() {
    const hoy = new Date();
    const hace30dias = new Date();
    hace30dias.setDate(hace30dias.getDate() - 30);
    document.getElementById('export-desde').value = hace30dias.toISOString().split('T')[0];
    document.getElementById('export-hasta').value = hoy.toISOString().split('T')[0];
    actualizarTotalExport();
}

// Actualiza el total de registros a exportar
function actualizarTotalExport() {
    document.getElementById('total-export').textContent = reservasData.length;
}

// Exporta datos a formato Excel
function exportarExcel() {
    alert('Exportación a Excel en desarrollo');
}

// Exporta datos a formato CSV
function exportarCSV() {
    let csv = 'ID,Servicio,Fecha Desde,Fecha Hasta,Nombre Dueño,Teléfono,Email,Nombre Perro,Estado,Precio\n';
    reservasData.forEach(r => {
        csv += `${r.id},${r.servicio},${r.fecha_desde},${r.fecha_hasta},${r.nombre_dueno},${r.telefono},${r.email},${r.nombre_perro},${r.estado},${r.precio_total}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'reservas.csv';
    a.click();
}

// Exporta datos a formato PDF
function exportarPDF() {
    alert('Exportación a PDF en desarrollo');
}

// Abre un modal por su ID
function abrirModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

// Cierra un modal por su ID
function cerrarModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

// Cierra la sesión del administrador
function cerrarSesion() {
    if (confirm('¿Cerrar sesión?')) {
        window.location.href = 'login.html';
    }
}

// Ejecuta la inicialización cuando carga el DOM
window.addEventListener('DOMContentLoaded', init);
