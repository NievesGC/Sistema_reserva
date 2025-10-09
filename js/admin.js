
// ========================================
// CONFIGURACIÓN INICIAL DE SUPABASE
// ========================================
// ⚠️ IMPORTANTE: Reemplaza estas credenciales con las de tu proyecto
const SUPABASE_URL = 'https://zfrotbrayayvlpflpeha.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpmcm90YnJheWF5dmxwZmxwZWhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzMzY0MDUsImV4cCI6MjA3NDkxMjQwNX0.dRnztaxi-gtgZei0OIao7pAGV51Zy6luRd0RSjHREfg';

// Inicializar cliente de Supabase
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ========================================
// VARIABLES GLOBALES
// ========================================
let reservasData = [];
let festivosData = [];
let calendarioMes = new Date();
let calendarioServicio = 'paseos';
let modoCalendario = null;
let diasBloqueados = [];
let fechaSeleccionada = null;

// ========================================
// FUNCIONES DE UTILIDAD
// ========================================
function formatearFecha(fecha) {
    if (typeof fecha === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
        return fecha;
    }
    const d = fecha instanceof Date ? fecha : new Date(fecha);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function mostrarError(mensaje) {
    alert('❌ Error: ' + mensaje);
    console.error(mensaje);
}

function mostrarExito(mensaje) {
    alert('✅ ' + mensaje);
}

// ========================================
// INICIALIZACIÓN
// ========================================
async function init() {
    try {
        console.log('🔄 Cargando datos...');
        await Promise.all([
            cargarReservas(),
            cargarFestivos(),
            cargarDisponibilidad()
        ]);
        actualizarEstadisticas();
        cargarCalendario();
        setFechasExport();
        console.log('✅ Datos cargados correctamente');
    } catch (error) {
        console.error('Error en inicialización:', error);
        mostrarError('No se pudieron cargar los datos. Verifica la conexión a la base de datos.');
    }
}

// ========================================
// GESTIÓN DE TABS
// ========================================
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
    
    if (tab === 'calendario') cargarCalendario();
    else if (tab === 'festivos') cargarFestivos();
}

// ========================================
// ESTADÍSTICAS
// ========================================
function actualizarEstadisticas() {
    const hoy = formatearFecha(new Date());
    const reservasActivas = reservasData.filter(r => r.fecha_hasta >= hoy);
    const pendientes = reservasActivas.filter(r => r.estado === 'pendiente').length;
    document.getElementById('stat-pendientes').textContent = pendientes;
}

// ========================================
// GESTIÓN DE RESERVAS
// ========================================
async function cargarReservas() {
    try {
        const { data, error } = await supabase
            .from('reservas')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        reservasData = data || [];
        renderizarReservas();
    } catch (error) {
        console.error('Error cargando reservas:', error);
        mostrarError('No se pudieron cargar las reservas: ' + error.message);
    }
}

function renderizarReservas() {
    const filtroEstado = document.getElementById('filtro-estado').value;
    const filtroServicio = document.getElementById('filtro-servicio').value;
    const hoy = formatearFecha(new Date());
    
    let reservasFiltradas = reservasData;
    
    if (filtroEstado === 'pasadas') {
        reservasFiltradas = reservasFiltradas.filter(r => r.fecha_hasta < hoy);
    } else if (filtroEstado === 'activas') {
        reservasFiltradas = reservasFiltradas.filter(r => r.fecha_hasta >= hoy && (r.estado === 'pendiente' || r.estado === 'confirmada'));
    } else if (filtroEstado === 'todas') {
        reservasFiltradas = reservasFiltradas.filter(r => r.fecha_hasta >= hoy);
    } else if (filtroEstado !== 'todas') {
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
        
        return `
            <div class="bg-white p-6 rounded-2xl shadow-md hover:shadow-lg transition ${esPasada ? 'opacity-75' : ''}">
                <div class="flex items-start justify-between">
                    <div class="flex-1">
                        <div class="flex items-center gap-2 mb-2">
                            <span class="text-2xl">${servicioIcon}</span>
                            <h3 class="text-lg font-bold text-gray-800">${r.nombre_perro} (${r.nombre_dueno})</h3>
                            <span class="${badgeClass} text-white text-xs px-3 py-1 rounded-full font-semibold">${r.estado.toUpperCase()}</span>
                            ${esPasada ? '<span class="bg-gray-400 text-white text-xs px-3 py-1 rounded-full font-semibold">PASADA</span>' : ''}
                        </div>
                        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 mt-3">
                            <div><strong>Servicio:</strong> ${r.servicio}</div>
                            <div><strong>Fechas:</strong> ${r.fecha_desde}${r.fecha_hasta !== r.fecha_desde ? ' - ' + r.fecha_hasta : ''}</div>
                            <div><strong>Teléfono:</strong> ${r.telefono}</div>
                            <div><strong>Precio:</strong> ${r.precio_total}€</div>
                        </div>
                    </div>
                    <div class="flex gap-2 ml-4">
                        <button onclick="verDetalle('${r.id}')" class="btn-action px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm">Ver</button>
                        ${!esPasada && r.estado === 'pendiente' ? `
                            <button onclick="confirmarReserva('${r.id}')" class="btn-action px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm">✓</button>
                            <button onclick="rechazarReserva('${r.id}')" class="btn-action px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm">✗</button>
                        ` : ''}
                        ${!esPasada && r.estado === 'confirmada' ? `
                            <button onclick="cancelarReserva('${r.id}')" class="btn-action px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 text-sm">Cancelar</button>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function filtrarReservas() {
    renderizarReservas();
}

function verDetalle(id) {
    const reserva = reservasData.find(r => r.id === id);
    if (!reserva) {
        mostrarError('No se encontró la reserva');
        return;
    }
    
    const servicioIcon = reserva.servicio === 'paseos' ? '🐕' : reserva.servicio === 'guarderia' ? '☀️' : '🏠';
    const badgeClass = `badge-${reserva.estado}`;
    
    const html = `
        <div class="space-y-4">
            <div class="flex items-center gap-3 mb-4">
                <span class="text-3xl">${servicioIcon}</span>
                <div>
                    <h4 class="text-xl font-bold">${reserva.nombre_perro}</h4>
                    <span class="${badgeClass} text-white text-xs px-3 py-1 rounded-full font-semibold">${reserva.estado.toUpperCase()}</span>
                </div>
            </div>
            <div class="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl">
                <div><strong>Servicio:</strong> ${reserva.servicio}</div>
                <div><strong>Tarifa:</strong> ${reserva.tarifa}</div>
                <div><strong>Horario/Transporte:</strong> ${reserva.tramo_horario}</div>
                <div><strong>Precio Total:</strong> ${reserva.precio_total}€</div>
            </div>
            <div class="bg-gray-50 p-4 rounded-xl">
                <h5 class="font-bold mb-2">Fechas</h5>
                <p>Desde: ${reserva.fecha_desde}</p>
                <p>Hasta: ${reserva.fecha_hasta}</p>
            </div>
            <div class="bg-gray-50 p-4 rounded-xl">
                <h5 class="font-bold mb-2">Datos del Dueño</h5>
                <p><strong>Nombre:</strong> ${reserva.nombre_dueno}</p>
                <p><strong>Teléfono:</strong> ${reserva.telefono}</p>
                <p><strong>Email:</strong> ${reserva.email}</p>
                ${reserva.direccion ? `<p><strong>Dirección:</strong> ${reserva.direccion}</p>` : ''}
            </div>
            <div class="bg-gray-50 p-4 rounded-xl">
                <h5 class="font-bold mb-2">Datos del Perro</h5>
                <p><strong>Raza:</strong> ${reserva.raza || 'No especificada'}</p>
                <p><strong>Tamaño:</strong> ${reserva.tamano}</p>
                <p><strong>Perro extra:</strong> ${reserva.perro_extra ? 'Sí' : 'No'}</p>
                ${reserva.notas ? `<p><strong>Notas:</strong> ${reserva.notas}</p>` : ''}
            </div>
            <div class="flex gap-3 mt-6">
                ${reserva.estado === 'pendiente' ? `
                    <button onclick="confirmarReserva('${reserva.id}'); cerrarModal('modal-detalle');" class="flex-1 px-6 py-3 bg-green-500 text-white rounded-xl font-semibold hover:bg-green-600 transition">Confirmar</button>
                    <button onclick="rechazarReserva('${reserva.id}'); cerrarModal('modal-detalle');" class="flex-1 px-6 py-3 bg-red-500 text-white rounded-xl font-semibold hover:bg-red-600 transition">Rechazar</button>
                ` : ''}
                ${reserva.estado === 'confirmada' ? `
                    <button onclick="editarReserva('${reserva.id}')" class="flex-1 px-6 py-3 bg-blue-500 text-white rounded-xl font-semibold hover:bg-blue-600 transition">Modificar</button>
                    <button onclick="cancelarReserva('${reserva.id}'); cerrarModal('modal-detalle');" class="flex-1 px-6 py-3 bg-orange-500 text-white rounded-xl font-semibold hover:bg-orange-600 transition">Cancelar</button>
                ` : ''}
            </div>
        </div>
    `;
    
    document.getElementById('detalle-content').innerHTML = html;
    abrirModal('modal-detalle');
}

async function confirmarReserva(id) {
    if (!confirm('¿Confirmar esta reserva?')) return;
    
    try {
        const { error } = await supabase
            .from('reservas')
            .update({ estado: 'confirmada' })
            .eq('id', id);
        
        if (error) throw error;
        await cargarReservas();
        actualizarEstadisticas();
        mostrarExito('Reserva confirmada correctamente');
    } catch (error) {
        console.error('Error confirmando reserva:', error);
        mostrarError('No se pudo confirmar la reserva: ' + error.message);
    }
}

async function rechazarReserva(id) {
    if (!confirm('¿Rechazar esta reserva?')) return;
    
    try {
        const { error } = await supabase
            .from('reservas')
            .update({ estado: 'rechazada' })
            .eq('id', id);
        
        if (error) throw error;
        await cargarReservas();
        actualizarEstadisticas();
        mostrarExito('Reserva rechazada');
    } catch (error) {
        console.error('Error rechazando reserva:', error);
        mostrarError('No se pudo rechazar la reserva: ' + error.message);
    }
}

async function cancelarReserva(id) {
    if (!confirm('¿Cancelar esta reserva?')) return;
    
    try {
        const { error } = await supabase
            .from('reservas')
            .update({ estado: 'cancelada' })
            .eq('id', id);
        
        if (error) throw error;
        await cargarReservas();
        actualizarEstadisticas();
        mostrarExito('Reserva cancelada');
    } catch (error) {
        console.error('Error cancelando reserva:', error);
        mostrarError('No se pudo cancelar la reserva: ' + error.message);
    }
}

// ========================================
// EDICIÓN DE RESERVAS
// ========================================
function editarReserva(id) {
    const reserva = reservasData.find(r => r.id === id);
    if (!reserva) return;
    
    const esAlojamiento = reserva.servicio === 'alojamiento';
    const esGuarderia = reserva.servicio === 'guarderia';
    
    const html = `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label class="block text-sm font-bold text-gray-700 mb-2">Servicio</label><input type="text" value="${reserva.servicio}" disabled class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-100"></div>
            <div><label class="block text-sm font-bold text-gray-700 mb-2">Tarifa</label><select id="edit-tarifa" class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none"><option value="normal" ${reserva.tarifa === 'normal' ? 'selected' : ''}>Normal</option><option value="cachorros" ${reserva.tarifa === 'cachorros' ? 'selected' : ''}>Cachorros</option></select></div>
            <div><label class="block text-sm font-bold text-gray-700 mb-2">Fecha Desde *</label><input type="date" id="edit-fecha-desde" value="${reserva.fecha_desde}" class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none"></div>
            <div><label class="block text-sm font-bold text-gray-700 mb-2">Fecha Hasta *</label><input type="date" id="edit-fecha-hasta" value="${reserva.fecha_hasta}" class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none"></div>
            <div><label class="block text-sm font-bold text-gray-700 mb-2">${esAlojamiento ? 'Transporte' : 'Horario'}</label><select id="edit-tramo" class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none">${esAlojamiento ? `<option value="sin-transporte" ${reserva.tramo_horario === 'sin-transporte' ? 'selected' : ''}>Sin transporte</option><option value="recogida" ${reserva.tramo_horario === 'recogida' ? 'selected' : ''}>Solo Recogida (+12€)</option><option value="recogida-entrega" ${reserva.tramo_horario === 'recogida-entrega' ? 'selected' : ''}>Recogida + Entrega (+20€)</option>` : `<option value="mañana" ${reserva.tramo_horario === 'mañana' ? 'selected' : ''}>Mañana (09:00-12:00)</option><option value="tarde" ${reserva.tramo_horario === 'tarde' ? 'selected' : ''}>Tarde (16:00-19:00)</option>${esGuarderia ? `<option value="completo" ${reserva.tramo_horario === 'completo' ? 'selected' : ''}>Todo el día (09:00-19:00)</option>` : ''}`}</select></div>
            <div><label class="block text-sm font-bold text-gray-700 mb-2">Precio Total (€)</label><input type="number" id="edit-precio" value="${reserva.precio_total}" class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none"></div>
            <div class="md:col-span-2"><label class="flex items-center cursor-pointer"><input type="checkbox" id="edit-perro-extra" ${reserva.perro_extra ? 'checked' : ''} class="mr-3"><span class="text-sm font-semibold text-gray-700">Perro extra</span></label></div>
        </div>
        <div class="mt-6 space-y-4">
            <h4 class="font-bold text-gray-800">Datos del Dueño</h4>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label class="block text-sm font-bold text-gray-700 mb-2">Nombre *</label><input type="text" id="edit-nombre-dueno" value="${reserva.nombre_dueno}" class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none"></div>
                <div><label class="block text-sm font-bold text-gray-700 mb-2">Teléfono *</label><input type="tel" id="edit-telefono" value="${reserva.telefono}" class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none"></div>
                <div class="md:col-span-2"><label class="block text-sm font-bold text-gray-700 mb-2">Email *</label><input type="email" id="edit-email" value="${reserva.email}" class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none"></div>
                ${esAlojamiento ? `<div class="md:col-span-2"><label class="block text-sm font-bold text-gray-700 mb-2">Dirección</label><input type="text" id="edit-direccion" value="${reserva.direccion || ''}" class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none"></div>` : ''}
            </div>
        </div>
        <div class="mt-6 space-y-4">
            <h4 class="font-bold text-gray-800">Datos del Perro</h4>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label class="block text-sm font-bold text-gray-700 mb-2">Nombre *</label><input type="text" id="edit-nombre-perro" value="${reserva.nombre_perro}" class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none"></div>
                <div><label class="block text-sm font-bold text-gray-700 mb-2">Raza</label><input type="text" id="edit-raza" value="${reserva.raza || ''}" class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none"></div>
                <div class="md:col-span-2"><label class="block text-sm font-bold text-gray-700 mb-2">Tamaño *</label><select id="edit-tamano" class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none"><option value="cachorro" ${reserva.tamano === 'cachorro' ? 'selected' : ''}>Cachorro</option><option value="pequeño" ${reserva.tamano === 'pequeño' ? 'selected' : ''}>Pequeño</option><option value="mediano" ${reserva.tamano === 'mediano' ? 'selected' : ''}>Mediano</option><option value="grande" ${reserva.tamano === 'grande' ? 'selected' : ''}>Grande</option></select></div>
                <div class="md:col-span-2"><label class="block text-sm font-bold text-gray-700 mb-2">Notas</label><textarea id="edit-notas" rows="3" class="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none">${reserva.notas || ''}</textarea></div>
            </div>
        </div>
        <div class="flex gap-4 mt-8">
            <button onclick="guardarEdicion('${id}')" class="flex-1 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold hover:shadow-lg transition">Guardar Cambios</button>
            <button onclick="cerrarModal('modal-editar')" class="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-300 transition">Cancelar</button>
        </div>
    `;
    
    document.getElementById('form-editar').innerHTML = html;
    cerrarModal('modal-detalle');
    abrirModal('modal-editar');
}

async function guardarEdicion(id) {
    try {
        const datosActualizados = {
            tarifa: document.getElementById('edit-tarifa').value,
            fecha_desde: document.getElementById('edit-fecha-desde').value,
            fecha_hasta: document.getElementById('edit-fecha-hasta').value,
            tramo_horario: document.getElementById('edit-tramo').value,
            precio_total: parseFloat(document.getElementById('edit-precio').value),
            perro_extra: document.getElementById('edit-perro-extra').checked,
            nombre_dueno: document.getElementById('edit-nombre-dueno').value,
            telefono: document.getElementById('edit-telefono').value,
            email: document.getElementById('edit-email').value,
            nombre_perro: document.getElementById('edit-nombre-perro').value,
            raza: document.getElementById('edit-raza').value,
            tamano: document.getElementById('edit-tamano').value,
            notas: document.getElementById('edit-notas').value,
            updated_at: new Date().toISOString()
        };
        
        const direccionField = document.getElementById('edit-direccion');
        if (direccionField) {
            datosActualizados.direccion = direccionField.value;
        }
        
        const { error } = await supabase
            .from('reservas')
            .update(datosActualizados)
            .eq('id', id);
        
        if (error) throw error;
        
        await cargarReservas();
        cerrarModal('modal-editar');
        mostrarExito('Reserva actualizada correctamente');
    } catch (error) {
        console.error('Error guardando edición:', error);
        mostrarError('No se pudo actualizar la reserva: ' + error.message);
    }
}

// ========================================
// CALENDARIO Y DISPONIBILIDAD
// ========================================
async function cargarDisponibilidad() {
    try {
        const { data, error } = await supabase
            .from('disponibilidad')
            .select('*');
        
        if (error) throw error;
        
        diasBloqueados = [];
        if (data) {
            data.forEach(item => {
                if (item.bloqueado) {
                    diasBloqueados.push(item.fecha);
                }
            });
        }
    } catch (error) {
        console.error('Error cargando disponibilidad:', error);
        mostrarError('No se pudo cargar la disponibilidad: ' + error.message);
    }
}

function cargarCalendario() {
    calendarioServicio = document.getElementById('servicio-calendario').value;
    
    const year = calendarioMes.getFullYear();
    const month = calendarioMes.getMonth();
    
    document.getElementById('mes-actual').textContent = calendarioMes.toLocaleDateString('es-ES', { 
        month: 'long', 
        year: 'numeric' 
    });
    
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
        const fechaStr = formatearFecha(dia.fecha);
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
        
        return `
            <div onclick="clickDiaCalendario('${fechaStr}')" class="calendar-day ${colorClass} p-3 rounded-xl border-2 border-gray-200 cursor-pointer ${!dia.mesActual ? 'opacity-40' : ''}">
                <div class="font-bold text-sm mb-1">${dia.fecha.getDate()}</div>
                ${dia.mesActual && !bloqueado ? `<div class="text-xs text-gray-600">${ocupacion}/4</div>` : ''}
                ${bloqueado ? '<div class="text-xs text-red-600">🔒</div>' : ''}
            </div>
        `;
    }).join('');
}

function mesAnterior() {
    calendarioMes.setMonth(calendarioMes.getMonth() - 1);
    cargarCalendario();
}

function mesSiguiente() {
    calendarioMes.setMonth(calendarioMes.getMonth() + 1);
    cargarCalendario();
}

function activarModoBloqueo() {
    modoCalendario = 'bloquear';
    document.getElementById('btn-bloquear').className = 'px-4 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition font-semibold';
    document.getElementById('btn-desbloquear').className = 'px-4 py-2 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition font-semibold';
}

function activarModoDesbloqueo() {
    modoCalendario = 'desbloquear';
    document.getElementById('btn-desbloquear').className = 'px-4 py-2 bg-green-500 text-white rounded-xl hover:bg-green-600 transition font-semibold';
    document.getElementById('btn-bloquear').className = 'px-4 py-2 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition font-semibold';
}

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
        document.getElementById('bloquear-fecha').textContent = fecha;
        document.getElementById('bloquear-servicio').textContent = 'Todos los servicios';
        abrirModal('modal-bloquear');
    } else if (modoCalendario === 'desbloquear') {
        if (!estaBloqueado) {
            alert('⚠️ Este día no está bloqueado');
            return;
        }
        if (confirm('¿Quieres desbloquear este día?\n\nLa guardería volverá a estar disponible.')) {
            desbloquearDia(fecha);
        }
    }
}

async function confirmarBloqueo() {
    if (!fechaSeleccionada) return;
    
    try {
        // Obtener las plazas totales según el servicio seleccionado
        const plazasPorServicio = {
            'paseos': 2,
            'guarderia': 4,
            'alojamiento': 4
        };
        
        // Datos a insertar en la base de datos
        const datos = {
            servicio: calendarioServicio,          // Servicio seleccionado (paseos, guarderia, alojamiento)
            fecha: fechaSeleccionada,              // Fecha a bloquear (formato YYYY-MM-DD)
            bloqueado: true,                       // Marca el día como bloqueado
            plazas_ocupadas: 0,                    // No hay plazas ocupadas al bloquear
            plazas_totales: plazasPorServicio[calendarioServicio] || 4  // ✅ AÑADIDO: Plazas totales del servicio
        };
        
        console.log('📤 Bloqueando día con datos:', datos);
        
        // upsert = INSERT o UPDATE si ya existe
        // Si ya existe un registro con el mismo servicio y fecha, lo actualiza
        // Si no existe, lo crea nuevo
        const { error } = await supabase
            .from('disponibilidad')
            .upsert(datos, {
                onConflict: 'servicio,fecha'  // Identifica registros únicos por servicio+fecha
            });
        
        if (error) throw error;
        
        // Añade el día a la lista de bloqueados en memoria
        diasBloqueados.push(fechaSeleccionada);
        
        // Cierra el modal y actualiza el calendario visual
        cerrarModal('modal-bloquear');
        cargarCalendario();
        
        mostrarExito('Día bloqueado correctamente');
        fechaSeleccionada = null;  // Limpia la selección
    } catch (error) {
        console.error('Error bloqueando día:', error);
        mostrarError('No se pudo bloquear el día: ' + error.message);
    }
}

async function desbloquearDia(fecha) {
    try {
        const { error } = await supabase
        .from('disponibilidad')
        .update({ bloqueado: false })  // Cambia bloqueado a false
        .eq('servicio', calendarioServicio)  // Solo para el servicio seleccionado
        .eq('fecha', fecha);                  // Solo para esta fecha
    
        if (error) throw error;
        
            // Elimina la fecha de la lista de bloqueados en memoria
            diasBloqueados = diasBloqueados.filter(d => d !== fecha);
            
            // Actualiza el calendario visual
            cargarCalendario();
            
            mostrarExito('Día desbloqueado correctamente');
    } catch (error) {
        console.error('Error desbloqueando día:', error);
        mostrarError('No se pudo desbloquear el día: ' + error.message);
    }
}

// ========================================
// FESTIVOS
// ========================================
async function cargarFestivos() {
    try {
        const { data, error } = await supabase
            .from('festivos')
            .select('*')
            .eq('activo', true)
            .order('fecha', { ascending: true });
        
        if (error) throw error;
        festivosData = data || [];
        renderizarFestivos();
    } catch (error) {
        console.error('Error cargando festivos:', error);
        mostrarError('No se pudieron cargar los festivos: ' + error.message);
    }
}

function renderizarFestivos() {
    const container = document.getElementById('lista-festivos');
    
    if (festivosData.length === 0) {
        container.innerHTML = '<p class="text-center text-gray-500 py-8">No hay festivos registrados</p>';
        return;
    }
    
    container.innerHTML = festivosData.map(f => `
        <div class="bg-white p-4 rounded-xl shadow-md flex items-center justify-between">
            <div>
                <p class="font-bold">${f.nombre}</p>
                <p class="text-sm text-gray-600">${f.fecha}</p>
            </div>
            <button onclick="eliminarFestivo('${f.id}')" class="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600">Eliminar</button>
        </div>
    `).join('');
}

function abrirModalFestivo() {
    document.getElementById('festivo-fecha').value = '';
    document.getElementById('festivo-nombre').value = '';
    abrirModal('modal-festivo');
}

async function guardarFestivo() {
    const fecha = document.getElementById('festivo-fecha').value;
    const nombre = document.getElementById('festivo-nombre').value;
    
    if (!fecha || !nombre) {
        alert('Completa todos los campos');
        return;
    }
    
    try {
        const { error } = await supabase
            .from('festivos')
            .insert({ fecha, nombre, activo: true });
        
        if (error) throw error;
        await cargarFestivos();
        cerrarModal('modal-festivo');
        mostrarExito('Festivo añadido correctamente');
    } catch (error) {
        console.error('Error guardando festivo:', error);
        mostrarError('No se pudo guardar el festivo: ' + error.message);
    }
}

async function eliminarFestivo(id) {
    if (!confirm('¿Eliminar este festivo?')) return;
    
    try {
        const { error } = await supabase
            .from('festivos')
            .delete()
            .eq('id', id);
        
        if (error) throw error;
        await cargarFestivos();
        mostrarExito('Festivo eliminado');
    } catch (error) {
        console.error('Error eliminando festivo:', error);
        mostrarError('No se pudo eliminar el festivo: ' + error.message);
    }
}

// ========================================
// PRECIOS
// ========================================
async function guardarPrecios() {
    try {
        const precios = {
            plazas_paseos: document.getElementById('plazas-paseos').value,
            plazas_guarderia: document.getElementById('plazas-guarderia').value,
            plazas_alojamiento: document.getElementById('plazas-alojamiento').value,
            precio_paseos_normal: document.getElementById('precio-paseos-normal').value,
            precio_paseos_cachorros: document.getElementById('precio-paseos-cachorros').value,
            precio_paseos_festivos: document.getElementById('precio-paseos-festivos').value,
            precio_paseos_extra: document.getElementById('precio-paseos-extra').value,
            precio_guarderia_normal: document.getElementById('precio-guarderia-normal').value,
            precio_guarderia_cachorros: document.getElementById('precio-guarderia-cachorros').value,
            precio_guarderia_festivos: document.getElementById('precio-guarderia-festivos').value,
            precio_guarderia_extra: document.getElementById('precio-guarderia-extra').value,
            precio_alojamiento_normal: document.getElementById('precio-alojamiento-normal').value,
            precio_alojamiento_cachorros: document.getElementById('precio-alojamiento-cachorros').value,
            precio_alojamiento_festivos: document.getElementById('precio-alojamiento-festivos').value,
            precio_alojamiento_extra: document.getElementById('precio-alojamiento-extra').value
        };
        
        const promesas = Object.entries(precios).map(([clave, valor]) => {
            return supabase
                .from('configuracion')
                .upsert({
                    clave: clave,
                    valor: valor,
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'clave'
                });
        });
        
        const resultados = await Promise.all(promesas);
        const errores = resultados.filter(r => r.error);
        if (errores.length > 0) throw new Error('Error actualizando algunos precios');
        
        mostrarExito('Precios guardados correctamente');
    } catch (error) {
        console.error('Error guardando precios:', error);
        mostrarError('No se pudieron guardar los precios: ' + error.message);
    }
}

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

// ========================================
// EXPORTACIÓN
// ========================================
function setFechasExport() {
    const hoy = new Date();
    const hace30dias = new Date();
    hace30dias.setDate(hace30dias.getDate() - 30);
    document.getElementById('export-desde').value = formatearFecha(hace30dias);
    document.getElementById('export-hasta').value = formatearFecha(hoy);
    actualizarTotalExport();
}

function actualizarTotalExport() {
    document.getElementById('total-export').textContent = reservasData.length;
}

function exportarExcel() {
    alert('Exportación a Excel en desarrollo');
}

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

function exportarPDF() {
    alert('Exportación a PDF en desarrollo');
}

// ========================================
// MODALES
// ========================================
function abrirModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

function cerrarModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

// ========================================
// SESIÓN
// ========================================
function cerrarSesion() {
    if (confirm('¿Cerrar sesión?')) {
        window.location.href = 'login.html';
    }
}

// ========================================
// INICIAR AL CARGAR
// ========================================
window.addEventListener('DOMContentLoaded', init);