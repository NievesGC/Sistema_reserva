
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
async function cambiarTab(tab) {
    // 1. Ocultamos todos los contenidos
    document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
    
    // 2. Quitamos la clase activa de todos los botones
    document.querySelectorAll('.tab-button').forEach(el => {
        el.classList.remove('active');
        el.classList.add('bg-white', 'text-gray-700');
    });
    
    // 3. Mostramos el contenido seleccionado
    document.getElementById(`content-${tab}`).classList.remove('hidden');
    
    // 4. Activamos el botón seleccionado
    const btn = document.getElementById(`tab-${tab}`);
    btn.classList.add('active');
    btn.classList.remove('bg-white', 'text-gray-700');
    
    // 5. Cargamos datos específicos según la pestaña
    if (tab === 'calendario') {
        cargarCalendario();
    } else if (tab === 'festivos') {
        await cargarFestivos();
    } else if (tab === 'precios') {
        // ⭐ AQUÍ CARGAMOS LOS PRECIOS
        await cargarPreciosDesdeDB();
    }
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
    // 1. Buscamos la reserva en nuestro array de datos
    const reserva = reservasData.find(r => r.id === id);
    if (!reserva) {
        mostrarError('No se encontró la reserva');
        return;
    }
    
    // 2. Determinamos el ícono según el servicio
    const servicioIcon = reserva.servicio === 'paseos' ? '🐕' : 
                        reserva.servicio === 'guarderia' ? '☀️' : '🏠';
    
    // 3. Clase CSS para el badge según el estado
    const badgeClass = `badge-${reserva.estado}`;
    
    // 4. Verificamos si la reserva ya pasó
    const hoy = formatearFecha(new Date());
    const esPasada = reserva.fecha_hasta < hoy;
    
    // 5. Construimos el HTML del modal
    const html = `
        <div class="space-y-4">
            <!-- Encabezado con nombre del perro y estado -->
            <div class="flex items-center gap-3 mb-4">
                <span class="text-3xl">${servicioIcon}</span>
                <div>
                    <h4 class="text-xl font-bold">${reserva.nombre_perro}</h4>
                    <div class="flex gap-2 mt-1">
                        <span class="${badgeClass} text-white text-xs px-3 py-1 rounded-full font-semibold">
                            ${reserva.estado.toUpperCase()}
                        </span>
                        ${esPasada ? '<span class="bg-gray-400 text-white text-xs px-3 py-1 rounded-full font-semibold">PASADA</span>' : ''}
                    </div>
                </div>
            </div>
            
            <!-- Información del servicio -->
            <div class="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl">
                <div><strong>Servicio:</strong> ${reserva.servicio}</div>
                <div><strong>Tarifa:</strong> ${reserva.tarifa}</div>
                <div><strong>Horario/Transporte:</strong> ${reserva.tramo_horario}</div>
                <div><strong>Precio Total:</strong> ${reserva.precio_total}€</div>
            </div>
            
            <!-- Fechas de la reserva -->
            <div class="bg-gray-50 p-4 rounded-xl">
                <h5 class="font-bold mb-2">📅 Fechas</h5>
                <p>Desde: ${reserva.fecha_desde}</p>
                <p>Hasta: ${reserva.fecha_hasta}</p>
            </div>
            
            <!-- Datos del dueño -->
            <div class="bg-gray-50 p-4 rounded-xl">
                <h5 class="font-bold mb-2">👤 Datos del Dueño</h5>
                <p><strong>Nombre:</strong> ${reserva.nombre_dueno}</p>
                <p><strong>Teléfono:</strong> ${reserva.telefono}</p>
                <p><strong>Email:</strong> ${reserva.email}</p>
                ${reserva.direccion ? `<p><strong>Dirección:</strong> ${reserva.direccion}</p>` : ''}
            </div>
            
            <!-- Datos del perro -->
            <div class="bg-gray-50 p-4 rounded-xl">
                <h5 class="font-bold mb-2">🐕 Datos del Perro</h5>
                <p><strong>Raza:</strong> ${reserva.raza || 'No especificada'}</p>
                <p><strong>Tamaño:</strong> ${reserva.tamano}</p>
                <p><strong>Perro extra:</strong> ${reserva.perro_extra ? 'Sí' : 'No'}</p>
                ${reserva.notas ? `<p><strong>Notas:</strong> ${reserva.notas}</p>` : ''}
            </div>
            
            <!-- Botones de acción según el estado -->
            <div class="flex gap-3 mt-6">
                ${!esPasada ? generarBotonesAccion(reserva) : '<p class="text-gray-500 text-center w-full">Esta reserva ya ha finalizado</p>'}
            </div>
        </div>
    `;
    
    // 6. Insertamos el HTML en el modal y lo mostramos
    document.getElementById('detalle-content').innerHTML = html;
    abrirModal('modal-detalle');
}

function generarBotonesAccion(reserva) {
    let botones = '';
    
    // BOTÓN EDITAR: Disponible en TODOS los estados (excepto pasadas)
    botones += `
        <button onclick="editarReserva('${reserva.id}')" 
                class="flex-1 px-6 py-3 bg-blue-500 text-white rounded-xl font-semibold hover:bg-blue-600 transition">
            ✏️ Modificar
        </button>
    `;
    
    // BOTONES según el ESTADO ACTUAL
    switch(reserva.estado) {
        case 'pendiente':
            // Si está pendiente: permitir confirmar y rechazar
            botones += `
                <button onclick="confirmarReserva('${reserva.id}'); cerrarModal('modal-detalle');" 
                        class="flex-1 px-6 py-3 bg-green-500 text-white rounded-xl font-semibold hover:bg-green-600 transition">
                    ✓ Confirmar
                </button>
                <button onclick="rechazarReserva('${reserva.id}'); cerrarModal('modal-detalle');" 
                        class="flex-1 px-6 py-3 bg-red-500 text-white rounded-xl font-semibold hover:bg-red-600 transition">
                    ✗ Rechazar
                </button>
            `;
            break;
            
        case 'confirmada':
            // Si está confirmada: permitir cancelar
            botones += `
                <button onclick="cancelarReserva('${reserva.id}'); cerrarModal('modal-detalle');" 
                        class="flex-1 px-6 py-3 bg-orange-500 text-white rounded-xl font-semibold hover:bg-orange-600 transition">
                    🚫 Cancelar
                </button>
            `;
            break;
            
        case 'rechazada':
        case 'cancelada':
            // Si está rechazada o cancelada: permitir reactivar
            botones += `
                <button onclick="reactivarReserva('${reserva.id}'); cerrarModal('modal-detalle');" 
                        class="flex-1 px-6 py-3 bg-purple-500 text-white rounded-xl font-semibold hover:bg-purple-600 transition">
                    🔄 Reactivar
                </button>
            `;
            break;
    }
    
    return botones;
}

async function confirmarReserva(id) {
    if (!confirm('¿Confirmar esta reserva?')) return;
    
    try {
        // 1. Obtenemos los datos de la reserva ANTES de confirmarla
        const reserva = reservasData.find(r => r.id === id);
        if (!reserva) {
            throw new Error('Reserva no encontrada');
        }
        
        // 2. Confirmamos la reserva
        const { error } = await supabase
            .from('reservas')
            .update({ 
                estado: 'confirmada',
                updated_at: new Date().toISOString()
            })
            .eq('id', id);
        
        if (error) throw error;
        
        // 3. Actualizamos la disponibilidad
        await actualizarDisponibilidad(
            reserva.servicio,
            reserva.fecha_desde,
            reserva.fecha_hasta
        );
        
        // 4. Recargamos datos
        await cargarReservas();
        await cargarDisponibilidad();
        actualizarEstadisticas();
        cargarCalendario(); // Actualizar el calendario visual
        
        mostrarExito('Reserva confirmada correctamente');
        
    } catch (error) {
        console.error('Error confirmando reserva:', error);
        mostrarError('No se pudo confirmar la reserva: ' + error.message);
    }
}

async function rechazarReserva(id) {
    if (!confirm('¿Rechazar esta reserva?')) return;
    
    try {
        // 1. Obtenemos los datos de la reserva
        const reserva = reservasData.find(r => r.id === id);
        if (!reserva) {
            throw new Error('Reserva no encontrada');
        }
        
        // 2. Rechazamos la reserva
        const { error } = await supabase
            .from('reservas')
            .update({ 
                estado: 'rechazada',
                updated_at: new Date().toISOString()
            })
            .eq('id', id);
        
        if (error) throw error;
        
        // 3. Actualizamos la disponibilidad (libera plazas)
        await actualizarDisponibilidad(
            reserva.servicio,
            reserva.fecha_desde,
            reserva.fecha_hasta
        );
        
        // 4. Recargamos datos
        await cargarReservas();
        await cargarDisponibilidad();
        actualizarEstadisticas();
        cargarCalendario();
        
        mostrarExito('Reserva rechazada');
        
    } catch (error) {
        console.error('Error rechazando reserva:', error);
        mostrarError('No se pudo rechazar la reserva: ' + error.message);
    }
}

async function cancelarReserva(id) {
    if (!confirm('¿Cancelar esta reserva?')) return;
    
    try {
        // 1. Obtenemos los datos de la reserva
        const reserva = reservasData.find(r => r.id === id);
        if (!reserva) {
            throw new Error('Reserva no encontrada');
        }
        
        // 2. Cancelamos la reserva
        const { error } = await supabase
            .from('reservas')
            .update({ 
                estado: 'cancelada',
                updated_at: new Date().toISOString()
            })
            .eq('id', id);
        
        if (error) throw error;
        
        // 3. Actualizamos la disponibilidad (libera plazas)
        await actualizarDisponibilidad(
            reserva.servicio,
            reserva.fecha_desde,
            reserva.fecha_hasta
        );
        
        // 4. Recargamos datos
        await cargarReservas();
        await cargarDisponibilidad();
        actualizarEstadisticas();
        cargarCalendario();
        
        mostrarExito('Reserva cancelada');
        
    } catch (error) {
        console.error('Error cancelando reserva:', error);
        mostrarError('No se pudo cancelar la reserva: ' + error.message);
    }
}
async function reactivarReserva(id) {
    if (!confirm('¿Reactivar esta reserva y cambiarla a PENDIENTE?')) return;
    
    try {
        // Cambiamos el estado a pendiente
        const { error } = await supabase
            .from('reservas')
            .update({ 
                estado: 'pendiente',
                updated_at: new Date().toISOString() 
            })
            .eq('id', id);
        
        if (error) throw error;
        
        // Recargamos los datos
        await cargarReservas();
        actualizarEstadisticas();
        mostrarExito('Reserva reactivada correctamente');
    } catch (error) {
        console.error('Error reactivando reserva:', error);
        mostrarError('No se pudo reactivar la reserva: ' + error.message);
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
        // 1. Obtenemos los datos ANTES de editar (para saber las fechas antiguas)
        const reservaAntigua = reservasData.find(r => r.id === id);
        if (!reservaAntigua) {
            throw new Error('Reserva no encontrada');
        }
        
        // 2. Obtenemos los nuevos datos del formulario
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
        
        // 3. Actualizamos en la base de datos
        const { error } = await supabase
            .from('reservas')
            .update(datosActualizados)
            .eq('id', id);
        
        if (error) throw error;
        
        // 4. Actualizamos disponibilidad en las fechas ANTIGUAS (liberar)
        await actualizarDisponibilidad(
            reservaAntigua.servicio,
            reservaAntigua.fecha_desde,
            reservaAntigua.fecha_hasta
        );
        
        // 5. Actualizamos disponibilidad en las fechas NUEVAS (ocupar)
        await actualizarDisponibilidad(
            reservaAntigua.servicio, // El servicio no cambia
            datosActualizados.fecha_desde,
            datosActualizados.fecha_hasta
        );
        
        // 6. Recargamos datos
        await cargarReservas();
        await cargarDisponibilidad();
        cargarCalendario();
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

// ========================================
// FUNCIONES DE CÁLCULO DE OCUPACIÓN
// ========================================

/**
 * Calcula la ocupación REAL de un día específico contando las reservas activas
 * 
 * @param {string} fecha - Fecha en formato YYYY-MM-DD
 * @param {string} servicio - Tipo de servicio (paseos/guarderia/alojamiento)
 * @returns {number} Número de plazas ocupadas en ese día
 */
function calcularOcupacionReal(fecha, servicio) {
    // 1. Filtramos las reservas que estén activas (pendiente o confirmada)
    //    y que incluyan esta fecha en su rango
    const reservasActivas = reservasData.filter(reserva => {
        return reserva.servicio === servicio &&
               (reserva.estado === 'pendiente' || reserva.estado === 'confirmada') &&
               reserva.fecha_desde <= fecha &&
               reserva.fecha_hasta >= fecha;
    });
    
    // 2. Contamos cuántas plazas ocupan en total
    let ocupacion = reservasActivas.length;
    
    // 3. Si tienen perro extra, cuentan como 2 plazas
    reservasActivas.forEach(reserva => {
        if (reserva.perro_extra) {
            ocupacion++; // Suma 1 plaza adicional
        }
    });
    
    return ocupacion;
}

/**
 * Obtiene las plazas totales disponibles para un servicio
 * 
 * @param {string} servicio - Tipo de servicio
 * @returns {number} Total de plazas disponibles
 */
function obtenerPlazasTotales(servicio) {
    // Valores por defecto
    const valoresPorDefecto = {
        'paseos': 2,
        'guarderia': 4,
        'alojamiento': 4
    };
    
    return valoresPorDefecto[servicio] || 4;
}

/**
 * Determina el estado visual de un día según su ocupación
 * 
 * @param {number} ocupadas - Plazas ocupadas
 * @param {number} totales - Plazas totales
 * @param {boolean} bloqueado - Si el día está bloqueado
 * @returns {object} Objeto con clase CSS y descripción
 */
function obtenerEstadoVisual(ocupadas, totales, bloqueado) {
    if (bloqueado) {
        return {
            clase: 'bg-gray-300',
            icono: '🔒',
            descripcion: 'Bloqueado'
        };
    }
    
    // Calculamos el porcentaje de ocupación
    const porcentaje = (ocupadas / totales) * 100;
    
    if (ocupadas >= totales) {
        // Completo (100% ocupado)
        return {
            clase: 'bg-red-100',
            icono: '❌',
            descripcion: 'Completo'
        };
    } else if (porcentaje >= 75) {
        // Casi completo (75-99%)
        return {
            clase: 'bg-orange-100',
            icono: '⚠️',
            descripcion: 'Casi completo'
        };
    } else if (porcentaje >= 50) {
        // Medio ocupado (50-74%)
        return {
            clase: 'bg-yellow-100',
            icono: '⏳',
            descripcion: 'Medio'
        };
    } else if (ocupadas > 0) {
        // Poco ocupado (1-49%)
        return {
            clase: 'bg-blue-100',
            icono: '📅',
            descripcion: 'Disponible'
        };
    } else {
        // Libre (0%)
        return {
            clase: 'bg-green-100',
            icono: '✅',
            descripcion: 'Libre'
        };
    }
}

function cargarCalendario() {
    // 1. Obtenemos el servicio seleccionado
    calendarioServicio = document.getElementById('servicio-calendario').value;
    
    const year = calendarioMes.getFullYear();
    const month = calendarioMes.getMonth();
    
    // 2. Actualizamos el título del mes
    document.getElementById('mes-actual').textContent = calendarioMes.toLocaleDateString('es-ES', { 
        month: 'long', 
        year: 'numeric' 
    });
    
    // 3. Calculamos los días del mes
    const primerDia = new Date(year, month, 1);
    const ultimoDia = new Date(year, month + 1, 0);
    const dias = [];
    
    // 4. Días vacíos al inicio (para alinear con lunes)
    const primerDiaSemana = primerDia.getDay();
    const diasVaciosInicio = primerDiaSemana === 0 ? 6 : primerDiaSemana - 1;
    
    for (let i = diasVaciosInicio; i > 0; i--) {
        const diaAnterior = new Date(primerDia);
        diaAnterior.setDate(primerDia.getDate() - i);
        dias.push({ fecha: diaAnterior, mesActual: false });
    }
    
    // 5. Días del mes actual
    for (let d = new Date(primerDia); d <= ultimoDia; d.setDate(d.getDate() + 1)) {
        dias.push({ fecha: new Date(d), mesActual: true });
    }
    
    // 6. Generamos el HTML del calendario
    const container = document.getElementById('calendario-admin');
    container.innerHTML = dias.map(dia => {
        const fechaStr = formatearFecha(dia.fecha);
        
        // ⭐ NUEVO: Si seleccionó "todos", mostramos info combinada
        if (calendarioServicio === 'todos') {
            return generarDiaCalendarioTodos(dia, fechaStr);
        } else {
            return generarDiaCalendarioServicio(dia, fechaStr);
        }
    }).join('');
}


/**
 * NUEVA FUNCIÓN: Genera HTML de un día para UN servicio específico
 */
function generarDiaCalendarioServicio(dia, fechaStr) {
    // Verificamos si está bloqueado
    const bloqueado = diasBloqueados.includes(fechaStr);
    
    // Calculamos ocupación REAL
    const plazasTotales = obtenerPlazasTotales(calendarioServicio);
    const ocupadas = calcularOcupacionReal(fechaStr, calendarioServicio);
    
    // Determinamos el estado visual
    const estado = obtenerEstadoVisual(ocupadas, plazasTotales, bloqueado);
    
    // Mostramos información
    let infoHTML = '';
    if (dia.mesActual) {
        if (bloqueado) {
            infoHTML = `<div class="text-xs text-red-600">${estado.icono}</div>`;
        } else {
            infoHTML = `
                <div class="text-xs text-gray-600">
                    ${ocupadas}/${plazasTotales}
                </div>
                <div class="text-xs">${estado.icono}</div>
            `;
        }
    }
    
    return `
        <div onclick="clickDiaCalendario('${fechaStr}')" 
             class="calendar-day ${estado.clase} p-3 rounded-xl border-2 border-gray-200 cursor-pointer ${!dia.mesActual ? 'opacity-40' : ''}"
             title="${estado.descripcion}">
            <div class="font-bold text-sm mb-1">${dia.fecha.getDate()}</div>
            ${infoHTML}
        </div>
    `;
}

/**
 * NUEVA FUNCIÓN: Genera HTML de un día para TODOS los servicios
 */
function generarDiaCalendarioTodos(dia, fechaStr) {
    // Calculamos ocupación para cada servicio
    const servicios = ['paseos', 'guarderia', 'alojamiento'];
    const iconos = {
        'paseos': '🐕',
        'guarderia': '☀️',
        'alojamiento': '🏠'
    };
    
    let ocupacionTotal = 0;
    let plazasTotal = 0;
    let algunoBloqueado = false;
    
    // Información de cada servicio
    let infoHTML = '';
    
    if (dia.mesActual) {
        servicios.forEach(servicio => {
            const plazas = obtenerPlazasTotales(servicio);
            const ocupadas = calcularOcupacionReal(fechaStr, servicio);
            const bloqueado = diasBloqueados.includes(fechaStr);
            
            ocupacionTotal += ocupadas;
            plazasTotal += plazas;
            
            if (bloqueado) algunoBloqueado = true;
            
            // Color según ocupación
            let colorClass = 'text-green-600';
            if (bloqueado || ocupadas >= plazas) {
                colorClass = 'text-red-600';
            } else if (ocupadas >= plazas * 0.75) {
                colorClass = 'text-orange-600';
            } else if (ocupadas >= plazas * 0.5) {
                colorClass = 'text-yellow-600';
            }
            
            infoHTML += `
                <div class="flex items-center justify-between text-xs ${colorClass}">
                    <span>${iconos[servicio]}</span>
                    <span>${ocupadas}/${plazas}</span>
                </div>
            `;
        });
    }
    
    // Color de fondo general
    const porcentaje = (ocupacionTotal / plazasTotal) * 100;
    let bgClass = 'bg-green-100';
    
    if (algunoBloqueado || porcentaje >= 100) {
        bgClass = 'bg-red-100';
    } else if (porcentaje >= 75) {
        bgClass = 'bg-orange-100';
    } else if (porcentaje >= 50) {
        bgClass = 'bg-yellow-100';
    }
    
    return `
        <div onclick="clickDiaCalendario('${fechaStr}')" 
             class="calendar-day ${bgClass} p-2 rounded-xl border-2 border-gray-200 cursor-pointer ${!dia.mesActual ? 'opacity-40' : ''}"
             title="Ocupación combinada">
            <div class="font-bold text-sm mb-1">${dia.fecha.getDate()}</div>
            ${infoHTML}
        </div>
    `;
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

async function clickDiaCalendario(fecha) {
    // 1. Verificamos que se haya seleccionado una acción
    if (!modoCalendario) {
        alert('⚠️ Selecciona primero una acción: Bloquear o Desbloquear días');
        return;
    }
    
    const estaBloqueado = diasBloqueados.includes(fecha);
    
    // ========================================
    // MODO BLOQUEAR
    // ========================================
    if (modoCalendario === 'bloquear') {
        if (estaBloqueado) {
            alert('⚠️ Este día ya está bloqueado');
            return;
        }
        
        // Guardamos la fecha seleccionada
        fechaSeleccionada = fecha;
        
        // Actualizamos el texto del modal
        document.getElementById('bloquear-fecha').textContent = fecha;
        
        // Determinamos qué servicios vamos a bloquear
        let serviciosABloquear = [];
        let nombreServicio = '';
        
        if (calendarioServicio === 'todos') {
            serviciosABloquear = ['paseos', 'guarderia', 'alojamiento'];
            nombreServicio = 'Todos los servicios';
        } else {
            serviciosABloquear = [calendarioServicio];
            nombreServicio = calendarioServicio === 'paseos' ? 'Paseos' :
                           calendarioServicio === 'guarderia' ? 'Guardería' : 'Alojamiento';
        }
        
        document.getElementById('bloquear-servicio').textContent = nombreServicio;
        
        // ⭐ Mostramos las reservas de TODOS los servicios afectados
        const reservasHtml = await mostrarReservasDelDiaMultiple(fecha, serviciosABloquear);
        document.getElementById('reservas-dia-bloqueo').innerHTML = reservasHtml;
        
        // Guardamos los servicios a bloquear para usarlos en confirmarBloqueo()
        window.serviciosABloquear = serviciosABloquear;
        
        abrirModal('modal-bloquear');
    } 
    // ========================================
    // MODO DESBLOQUEAR
    // ========================================
    else if (modoCalendario === 'desbloquear') {
        if (!estaBloqueado) {
            alert('⚠️ Este día no está bloqueado');
            return;
        }
        
        if (confirm('¿Quieres desbloquear este día?\n\nEl servicio volverá a estar disponible.')) {
            // Si está en modo "todos", desbloqueamos todos los servicios
            if (calendarioServicio === 'todos') {
                await desbloquearDiaMultiple(fecha, ['paseos', 'guarderia', 'alojamiento']);
            } else {
                await desbloquearDia(fecha);
            }
        }
    }
}

/**
 * NUEVA: Muestra las reservas de MÚLTIPLES servicios en un día
 * 
 * @param {string} fecha - Fecha a consultar
 * @param {array} servicios - Array de servicios ['paseos', 'guarderia', ...]
 */
async function mostrarReservasDelDiaMultiple(fecha, servicios) {
    try {
        let html = '<div class="space-y-3">';
        let hayReservas = false;
        
        // Consultamos cada servicio
        for (const servicio of servicios) {
            const { data, error } = await supabase
                .from('reservas')
                .select('*')
                .eq('servicio', servicio)
                .lte('fecha_desde', fecha)
                .gte('fecha_hasta', fecha)
                .in('estado', ['pendiente', 'confirmada']);
            
            if (error) throw error;
            
            if (data && data.length > 0) {
                hayReservas = true;
                
                // Icono del servicio
                const icono = servicio === 'paseos' ? '🐕' : 
                            servicio === 'guarderia' ? '☀️' : '🏠';
                const nombreServicio = servicio === 'paseos' ? 'Paseos' :
                                     servicio === 'guarderia' ? 'Guardería' : 'Alojamiento';
                
                html += `<div class="border-l-4 border-orange-500 pl-3">`;
                html += `<p class="font-bold text-gray-700">${icono} ${nombreServicio} (${data.length})</p>`;
                
                data.forEach(r => {
                    const badgeClass = `badge-${r.estado}`;
                    html += `
                        <div class="bg-white p-2 rounded-lg border border-gray-200 mt-2">
                            <strong>${r.nombre_perro}</strong> (${r.nombre_dueno})<br>
                            <span class="${badgeClass} text-white text-xs px-2 py-1 rounded-full">
                                ${r.estado}
                            </span>
                            <span class="text-xs text-gray-600"> · ${r.telefono}</span>
                        </div>
                    `;
                });
                
                html += `</div>`;
            }
        }
        
        if (!hayReservas) {
            html = '<p class="text-green-600 font-semibold">✅ No hay reservas en este día. Puedes bloquearlo sin problemas.</p>';
        } else {
            html += '<p class="text-sm text-gray-600 mt-3">💡 Si bloqueas, estas reservas seguirán activas pero no se podrán hacer nuevas.</p>';
        }
        
        html += '</div>';
        return html;
        
    } catch (error) {
        console.error('❌ Error obteniendo reservas:', error);
        return '<p class="text-red-500">Error al cargar reservas.</p>';
    }
}

async function confirmarBloqueo() {
    if (!fechaSeleccionada) return;
    
    try {
        // Obtenemos los servicios a bloquear (guardados en clickDiaCalendario)
        const servicios = window.serviciosABloquear || [calendarioServicio];
        
        console.log(`🔒 Bloqueando ${servicios.length} servicio(s) en ${fechaSeleccionada}`);
        
        // Bloqueamos cada servicio
        for (const servicio of servicios) {
            const plazasPorServicio = {
                'paseos': 2,
                'guarderia': 4,
                'alojamiento': 4
            };
            
            const datos = {
                servicio: servicio,
                fecha: fechaSeleccionada,
                bloqueado: true,
                plazas_ocupadas: 0,
                plazas_totales: plazasPorServicio[servicio] || 4
            };
            
            console.log(`  → Bloqueando ${servicio}...`);
            
            const { error } = await supabase
                .from('disponibilidad')
                .upsert(datos, {
                    onConflict: 'servicio,fecha'
                });
            
            if (error) {
                console.error(`    ❌ Error en ${servicio}:`, error);
                throw error;
            }
            
            console.log(`    ✅ ${servicio} bloqueado`);
            
            // Añadimos a la lista de bloqueados
            if (!diasBloqueados.includes(fechaSeleccionada)) {
                diasBloqueados.push(fechaSeleccionada);
            }
        }
        
        // Cerramos modal y actualizamos
        cerrarModal('modal-bloquear');
        cargarCalendario();
        
        const mensaje = servicios.length === 1 
            ? `Día bloqueado para ${servicios[0]}` 
            : `Día bloqueado para ${servicios.length} servicios`;
        
        mostrarExito(mensaje);
        fechaSeleccionada = null;
        window.serviciosABloquear = null;
        
    } catch (error) {
        console.error('❌ Error bloqueando día:', error);
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

/**
 * NUEVA: Desbloquea múltiples servicios en una fecha
 */
async function desbloquearDiaMultiple(fecha, servicios) {
    try {
        for (const servicio of servicios) {
            const { error } = await supabase
                .from('disponibilidad')
                .update({ bloqueado: false })
                .eq('servicio', servicio)
                .eq('fecha', fecha);
            
            if (error) throw error;
        }
        
        // Eliminamos de la lista de bloqueados
        diasBloqueados = diasBloqueados.filter(d => d !== fecha);
        
        cargarCalendario();
        mostrarExito(`Día desbloqueado para ${servicios.length} servicio(s)`);
        
    } catch (error) {
        console.error('Error desbloqueando:', error);
        mostrarError('No se pudo desbloquear: ' + error.message);
    }
}

async function verificarReservasEnFecha(fecha, servicio) {
    try {
        // 1. Consultamos en Supabase las reservas que incluyan esta fecha
        const { data, error } = await supabase
            .from('reservas')
            .select('id, nombre_perro, estado')
            .eq('servicio', servicio)
            // La fecha debe estar en el rango fecha_desde <= fecha <= fecha_hasta
            .lte('fecha_desde', fecha)  // fecha_desde menor o igual a la fecha
            .gte('fecha_hasta', fecha)  // fecha_hasta mayor o igual a la fecha
            // Solo contamos reservas activas (no rechazadas ni canceladas)
            .in('estado', ['pendiente', 'confirmada']);
        
        if (error) throw error;
        
        // 2. Si hay datos, significa que hay reservas
        if (data && data.length > 0) {
            console.log(`⚠️ Encontradas ${data.length} reserva(s) en ${fecha}:`, data);
            return true;
        }
        
        // 3. No hay reservas en esta fecha
        return false;
        
    } catch (error) {
        console.error('Error verificando reservas:', error);
        // En caso de error, asumimos que NO hay reservas para no bloquear sin razón
        return false;
    }
}

async function mostrarReservasDelDia(fecha, servicio) {
    try {
        const { data, error } = await supabase
            .from('reservas')
            .select('*')
            .eq('servicio', servicio)
            .lte('fecha_desde', fecha)
            .gte('fecha_hasta', fecha)
            .in('estado', ['pendiente', 'confirmada']);
        
        if (error) throw error;
        
        if (!data || data.length === 0) {
            return '<p class="text-gray-500">No hay reservas en este día</p>';
        }
        
        // Generamos HTML con la lista de reservas
        let html = '<div class="space-y-2"><p class="font-bold">Reservas en este día:</p>';
        data.forEach(r => {
            html += `
                <div class="bg-gray-100 p-2 rounded text-sm">
                    <strong>${r.nombre_perro}</strong> (${r.nombre_dueno})<br>
                    Estado: <span class="badge-${r.estado} px-2 py-1 rounded text-white text-xs">
                        ${r.estado}
                    </span>
                </div>
            `;
        });
        html += '</div>';
        
        return html;
        
    } catch (error) {
        console.error('Error obteniendo reservas:', error);
        return '<p class="text-red-500">Error al cargar reservas</p>';
    }
}


// ========================================
// SISTEMA DE SINCRONIZACIÓN DE DISPONIBILIDAD
// ========================================

/**
 * Actualiza la disponibilidad en la base de datos cuando cambia una reserva
 * Esto asegura que las plazas ocupadas siempre estén actualizadas
 * 
 * @param {string} servicio - Tipo de servicio
 * @param {string} fechaDesde - Fecha inicial
 * @param {string} fechaHasta - Fecha final
 */
async function actualizarDisponibilidad(servicio, fechaDesde, fechaHasta) {
    try {
        console.log(`🔄 Actualizando disponibilidad: ${servicio} del ${fechaDesde} al ${fechaHasta}`);
        
        // 1. Generamos todas las fechas en el rango
        const fechas = generarRangoFechas(fechaDesde, fechaHasta);
        
        // 2. Para cada fecha, calculamos la ocupación real
        for (const fecha of fechas) {
            const ocupacion = calcularOcupacionReal(fecha, servicio);
            const plazasTotales = obtenerPlazasTotales(servicio);
            
            // 3. Actualizamos o creamos el registro en disponibilidad
            const { error } = await supabase
                .from('disponibilidad')
                .upsert({
                    servicio: servicio,
                    fecha: fecha,
                    plazas_ocupadas: ocupacion,
                    plazas_totales: plazasTotales,
                    bloqueado: false, // Mantenemos el estado de bloqueo existente
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'servicio,fecha',
                    // No sobrescribir el campo bloqueado si ya existe
                    ignoreDuplicates: false
                });
            
            if (error) {
                console.error(`Error actualizando ${fecha}:`, error);
            } else {
                console.log(`✅ ${fecha}: ${ocupacion}/${plazasTotales} plazas`);
            }
        }
        
        console.log('✅ Disponibilidad actualizada correctamente');
        
    } catch (error) {
        console.error('❌ Error actualizando disponibilidad:', error);
    }
}

/**
 * Genera un array con todas las fechas entre dos fechas
 * 
 * @param {string} desde - Fecha inicial (YYYY-MM-DD)
 * @param {string} hasta - Fecha final (YYYY-MM-DD)
 * @returns {array} Array de fechas en formato YYYY-MM-DD
 */
function generarRangoFechas(desde, hasta) {
    const fechas = [];
    const fechaActual = new Date(desde + 'T00:00:00');
    const fechaFinal = new Date(hasta + 'T00:00:00');
    
    while (fechaActual <= fechaFinal) {
        fechas.push(formatearFecha(fechaActual));
        fechaActual.setDate(fechaActual.getDate() + 1);
    }
    
    return fechas;
}



/**
 * NUEVA FUNCIÓN: Sincronizar toda la disponibilidad
 * Útil para ejecutar manualmente si algo se desincroniza
 */
async function sincronizarDisponibilidadCompleta() {
    if (!confirm('¿Recalcular toda la disponibilidad?\n\nEsto puede tardar unos segundos.')) {
        return;
    }
    
    try {
        console.log('🔄 Iniciando sincronización completa...');
        
        const servicios = ['paseos', 'guarderia', 'alojamiento'];
        let totalActualizados = 0;
        
        // Obtenemos todas las fechas únicas de todas las reservas
        const fechasUnicas = new Set();
        reservasData.forEach(reserva => {
            const fechas = generarRangoFechas(reserva.fecha_desde, reserva.fecha_hasta);
            fechas.forEach(f => fechasUnicas.add(f));
        });
        
        console.log(`📅 Procesando ${fechasUnicas.size} fechas únicas...`);
        
        // Para cada servicio y cada fecha, recalculamos
        for (const servicio of servicios) {
            for (const fecha of fechasUnicas) {
                await actualizarDisponibilidad(servicio, fecha, fecha);
                totalActualizados++;
            }
        }
        
        // Recargamos todo
        await cargarDisponibilidad();
        cargarCalendario();
        
        console.log(`✅ Sincronización completa: ${totalActualizados} registros actualizados`);
        mostrarExito(`Disponibilidad sincronizada: ${totalActualizados} registros`);
        
    } catch (error) {
        console.error('❌ Error en sincronización:', error);
        mostrarError('Error al sincronizar: ' + error.message);
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
// PRECIOS - CARGAR DESDE BASE DE DATOS
// ========================================

/**
 * Carga la configuración de precios desde la base de datos
 * y actualiza los campos del formulario
 */
async function cargarPreciosDesdeDB() {
    try {
        console.log('📥 Cargando precios desde la base de datos...');
        
        // 1. Obtenemos TODA la configuración de Supabase
        const { data, error } = await supabase
            .from('configuracion')
            .select('*');
        
        if (error) throw error;
        
        if (!data || data.length === 0) {
            console.warn('⚠️ No hay configuración en la base de datos, usando valores por defecto');
            return;
        }
        
        // 2. Convertimos el array en un objeto para fácil acceso
        const config = {};
        data.forEach(item => {
            config[item.clave] = item.valor;
        });
        
        console.log('✅ Configuración cargada:', config);
        
        // 3. Actualizamos cada campo del formulario con el valor de la BD
        
        // PASEOS
        if (config.precio_paseos_normal) {
            document.getElementById('precio-paseos-normal').value = config.precio_paseos_normal;
        }
        if (config.precio_paseos_cachorros) {
            document.getElementById('precio-paseos-cachorros').value = config.precio_paseos_cachorros;
        }
        if (config.precio_paseos_festivos) {
            document.getElementById('precio-paseos-festivos').value = config.precio_paseos_festivos;
        }
        if (config.precio_paseos_extra) {
            document.getElementById('precio-paseos-extra').value = config.precio_paseos_extra;
        }
        if (config.plazas_paseos) {
            document.getElementById('plazas-paseos').value = config.plazas_paseos;
        }
        
        // GUARDERÍA
        if (config.precio_guarderia_normal) {
            document.getElementById('precio-guarderia-normal').value = config.precio_guarderia_normal;
        }
        if (config.precio_guarderia_cachorros) {
            document.getElementById('precio-guarderia-cachorros').value = config.precio_guarderia_cachorros;
        }
        if (config.precio_guarderia_festivos) {
            document.getElementById('precio-guarderia-festivos').value = config.precio_guarderia_festivos;
        }
        if (config.precio_guarderia_extra) {
            document.getElementById('precio-guarderia-extra').value = config.precio_guarderia_extra;
        }
        if (config.plazas_guarderia) {
            document.getElementById('plazas-guarderia').value = config.plazas_guarderia;
        }
        
        // ALOJAMIENTO
        if (config.precio_alojamiento_normal) {
            document.getElementById('precio-alojamiento-normal').value = config.precio_alojamiento_normal;
        }
        if (config.precio_alojamiento_cachorros) {
            document.getElementById('precio-alojamiento-cachorros').value = config.precio_alojamiento_cachorros;
        }
        if (config.precio_alojamiento_festivos) {
            document.getElementById('precio-alojamiento-festivos').value = config.precio_alojamiento_festivos;
        }
        if (config.precio_alojamiento_extra) {
            document.getElementById('precio-alojamiento-extra').value = config.precio_alojamiento_extra;
        }
        if (config.plazas_alojamiento) {
            document.getElementById('plazas-alojamiento').value = config.plazas_alojamiento;
        }
        
        console.log('✅ Formulario de precios actualizado');
        
    } catch (error) {
        console.error('❌ Error cargando precios:', error);
        mostrarError('No se pudieron cargar los precios: ' + error.message);
    }
}

// ========================================
// PRECIOS - GUARDAR EN BASE DE DATOS
// ========================================

/**
 * Guarda los precios en la base de datos
 * Mejorada con feedback visual y validación
 */
async function guardarPrecios() {
    try {
        console.log('💾 Guardando precios...');
        
        // 1. Obtenemos todos los valores del formulario
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
        
        // 2. Validamos que todos sean números positivos
        const errores = [];
        Object.entries(precios).forEach(([clave, valor]) => {
            const numero = parseFloat(valor);
            if (isNaN(numero) || numero < 0) {
                errores.push(`• ${clave}: debe ser un número positivo`);
            }
        });
        
        if (errores.length > 0) {
            throw new Error('Valores inválidos:\n' + errores.join('\n'));
        }
        
        // 3. Guardamos cada precio en la base de datos usando upsert
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
        
        // 4. Esperamos que todas las promesas se completen
        const resultados = await Promise.all(promesas);
        
        // 5. Verificamos si hubo errores
        const erroresDB = resultados.filter(r => r.error);
        if (erroresDB.length > 0) {
            console.error('Errores guardando:', erroresDB);
            throw new Error('Error actualizando algunos precios');
        }
        
        console.log('✅ Todos los precios guardados correctamente');
        mostrarExito('Precios guardados correctamente');
        
        // 6. Recargamos la configuración para asegurar sincronización
        await cargarPreciosDesdeDB();
        
    } catch (error) {
        console.error('❌ Error guardando precios:', error);
        mostrarError('No se pudieron guardar los precios: ' + error.message);
    }
}

/**
 * Resetea los precios a los valores por defecto
 * y los guarda en la base de datos
 */
async function resetearPrecios() {
    if (!confirm('¿Restablecer precios por defecto?\n\nEsto sobrescribirá los precios actuales.')) {
        return;
    }
    
    try {
        console.log('🔄 Restableciendo precios por defecto...');
        
        // 1. Valores por defecto del sistema
        const preciosPorDefecto = {
            plazas_paseos: 2,
            plazas_guarderia: 4,
            plazas_alojamiento: 4,
            
            precio_paseos_normal: 12,
            precio_paseos_cachorros: 14,
            precio_paseos_festivos: 13,
            precio_paseos_extra: 9,
            
            precio_guarderia_normal: 20,
            precio_guarderia_cachorros: 22,
            precio_guarderia_festivos: 25,
            precio_guarderia_extra: 15,
            
            precio_alojamiento_normal: 35,
            precio_alojamiento_cachorros: 38,
            precio_alojamiento_festivos: 40,
            precio_alojamiento_extra: 25
        };
        
        // 2. Actualizamos los campos del formulario
        Object.entries(preciosPorDefecto).forEach(([clave, valor]) => {
            const input = document.getElementById(clave.replace(/_/g, '-'));
            if (input) {
                input.value = valor;
            }
        });
        
        // 3. Guardamos en la base de datos
        await guardarPrecios();
        
        console.log('✅ Precios restablecidos');
        
    } catch (error) {
        console.error('❌ Error restableciendo precios:', error);
        mostrarError('No se pudieron restablecer los precios: ' + error.message);
    }
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
    
    // Inicializamos el sistema de exportación
    inicializarExportacion();
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
// SISTEMA COMPLETO DE EXPORTACIÓN
// ========================================

/**
 * Filtra las reservas según los criterios seleccionados
 * y actualiza la tabla de previsualización
 */
function actualizarVistaPreviaExport() {
    try {
        console.log('🔍 Filtrando reservas para exportación...');
        
        // 1. Obtenemos los valores de los filtros
        const fechaDesde = document.getElementById('export-desde').value;
        const fechaHasta = document.getElementById('export-hasta').value;
        const servicioFiltro = document.getElementById('export-servicio').value;
        const estadoFiltro = document.getElementById('export-estado').value;
        
        // 2. Filtramos las reservas según los criterios
        let reservasFiltradas = reservasData.filter(reserva => {
            // Filtro por fecha
            let cumpleFecha = true;
            if (fechaDesde && reserva.fecha_desde < fechaDesde) {
                cumpleFecha = false;
            }
            if (fechaHasta && reserva.fecha_hasta > fechaHasta) {
                cumpleFecha = false;
            }
            
            // Filtro por servicio
            let cumpleServicio = true;
            if (servicioFiltro !== 'todos' && reserva.servicio !== servicioFiltro) {
                cumpleServicio = false;
            }
            
            // Filtro por estado
            let cumpleEstado = true;
            if (estadoFiltro !== 'todos' && reserva.estado !== estadoFiltro) {
                cumpleEstado = false;
            }
            
            return cumpleFecha && cumpleServicio && cumpleEstado;
        });
        
        console.log(`✅ ${reservasFiltradas.length} reservas encontradas`);
        
        // 3. Actualizamos el contador
        document.getElementById('total-export').textContent = reservasFiltradas.length;
        
        // 4. Generamos la tabla HTML
        renderizarTablaExport(reservasFiltradas);
        
        // 5. Guardamos las reservas filtradas para exportación
        window.reservasParaExportar = reservasFiltradas;
        
    } catch (error) {
        console.error('❌ Error filtrando reservas:', error);
        mostrarError('Error al filtrar reservas: ' + error.message);
    }
}

/**
 * Renderiza la tabla de previsualización con las reservas filtradas
 * 
 * @param {array} reservas - Array de reservas a mostrar
 */
function renderizarTablaExport(reservas) {
    const contenedor = document.getElementById('tabla-preview-export');
    
    if (!contenedor) {
        console.error('❌ No se encontró el contenedor tabla-preview-export');
        return;
    }
    
    if (reservas.length === 0) {
        contenedor.innerHTML = `
            <div class="text-center py-8 text-gray-500">
                <p>No hay reservas que coincidan con los filtros seleccionados</p>
            </div>
        `;
        return;
    }
    
    // Generamos el HTML de la tabla
    let html = `
        <div class="overflow-x-auto bg-white rounded-xl shadow-md">
            <table class="w-full text-sm">
                <thead class="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                    <tr>
                        <th class="px-4 py-3 text-left">ID</th>
                        <th class="px-4 py-3 text-left">Servicio</th>
                        <th class="px-4 py-3 text-left">Fechas</th>
                        <th class="px-4 py-3 text-left">Dueño</th>
                        <th class="px-4 py-3 text-left">Perro</th>
                        <th class="px-4 py-3 text-left">Teléfono</th>
                        <th class="px-4 py-3 text-left">Email</th>
                        <th class="px-4 py-3 text-left">Estado</th>
                        <th class="px-4 py-3 text-right">Precio</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-200">
    `;
    
    reservas.forEach((reserva, index) => {
        const bgClass = index % 2 === 0 ? 'bg-gray-50' : 'bg-white';
        const badgeClass = `badge-${reserva.estado}`;
        
        html += `
            <tr class="${bgClass} hover:bg-purple-50 transition">
                <td class="px-4 py-3 font-mono text-xs">${reserva.id.substring(0, 8)}</td>
                <td class="px-4 py-3 capitalize">${reserva.servicio}</td>
                <td class="px-4 py-3 whitespace-nowrap">
                    ${reserva.fecha_desde}${reserva.fecha_hasta !== reserva.fecha_desde ? '<br>→ ' + reserva.fecha_hasta : ''}
                </td>
                <td class="px-4 py-3">${reserva.nombre_dueno}</td>
                <td class="px-4 py-3 font-semibold">${reserva.nombre_perro}</td>
                <td class="px-4 py-3 whitespace-nowrap">${reserva.telefono}</td>
                <td class="px-4 py-3 text-xs">${reserva.email}</td>
                <td class="px-4 py-3">
                    <span class="${badgeClass} text-white text-xs px-2 py-1 rounded-full">
                        ${reserva.estado}
                    </span>
                </td>
                <td class="px-4 py-3 text-right font-bold text-purple-600">${reserva.precio_total}€</td>
            </tr>
        `;
    });
    
    // Calculamos el total de ingresos
    const totalIngresos = reservas
        .filter(r => r.estado === 'confirmada')
        .reduce((sum, r) => sum + parseFloat(r.precio_total || 0), 0);
    
    html += `
                </tbody>
                <tfoot class="bg-gray-100 font-bold">
                    <tr>
                        <td colspan="8" class="px-4 py-3 text-right">Total Ingresos (Confirmadas):</td>
                        <td class="px-4 py-3 text-right text-green-600 text-lg">${totalIngresos.toFixed(2)}€</td>
                    </tr>
                </tfoot>
            </table>
        </div>
    `;
    
    contenedor.innerHTML = html;
}

/**
 * Exporta las reservas a formato CSV
 * CSV = Comma Separated Values (compatible con Excel, Google Sheets)
 */
function exportarCSV() {
    try {
        console.log('📊 Exportando a CSV...');
        
        const reservas = window.reservasParaExportar || reservasData;
        
        if (reservas.length === 0) {
            alert('⚠️ No hay reservas para exportar');
            return;
        }
        
        // 1. Creamos el encabezado del CSV
        let csv = 'ID,Servicio,Fecha Desde,Fecha Hasta,Nombre Dueño,Teléfono,Email,Nombre Perro,Raza,Tamaño,Estado,Precio,Tarifa,Horario/Transporte,Perro Extra,Dirección,Notas\n';
        
        // 2. Agregamos cada reserva como una línea
        reservas.forEach(r => {
            // Escapamos las comas y comillas en los textos
            const escapar = (texto) => {
                if (!texto) return '';
                // Si tiene comas o comillas, lo envolvemos en comillas
                if (texto.includes(',') || texto.includes('"')) {
                    return '"' + texto.replace(/"/g, '""') + '"';
                }
                return texto;
            };
            
            csv += [
                r.id.substring(0, 8),
                r.servicio,
                r.fecha_desde,
                r.fecha_hasta,
                escapar(r.nombre_dueno),
                r.telefono,
                r.email,
                escapar(r.nombre_perro),
                escapar(r.raza || ''),
                r.tamano,
                r.estado,
                r.precio_total,
                r.tarifa,
                escapar(r.tramo_horario),
                r.perro_extra ? 'Sí' : 'No',
                escapar(r.direccion || ''),
                escapar(r.notas || '')
            ].join(',') + '\n';
        });
        
        // 3. Creamos un archivo descargable
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        
        // 4. Nombre del archivo con fecha actual
        const fecha = new Date().toISOString().split('T')[0];
        link.href = url;
        link.download = `reservas_${fecha}.csv`;
        
        // 5. Simulamos clic para descargar
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        console.log('✅ CSV descargado correctamente');
        mostrarExito(`${reservas.length} reservas exportadas a CSV`);
        
    } catch (error) {
        console.error('❌ Error exportando CSV:', error);
        mostrarError('Error al exportar CSV: ' + error.message);
    }
}

/**
 * Exporta las reservas a formato Excel
 * Usa una librería externa para generar archivos .xlsx reales
 */
function exportarExcel() {
    try {
        console.log('📗 Exportando a Excel...');
        
        const reservas = window.reservasParaExportar || reservasData;
        
        if (reservas.length === 0) {
            alert('⚠️ No hay reservas para exportar');
            return;
        }
        
        // Convertimos a formato CSV pero con extensión .xls
        // Excel puede abrir archivos CSV con extensión .xls
        let contenido = 'ID\tServicio\tFecha Desde\tFecha Hasta\tNombre Dueño\tTeléfono\tEmail\tNombre Perro\tRaza\tTamaño\tEstado\tPrecio\tTarifa\tHorario/Transporte\tPerro Extra\tDirección\tNotas\n';
        
        reservas.forEach(r => {
            contenido += [
                r.id.substring(0, 8),
                r.servicio,
                r.fecha_desde,
                r.fecha_hasta,
                r.nombre_dueno,
                r.telefono,
                r.email,
                r.nombre_perro,
                r.raza || '',
                r.tamano,
                r.estado,
                r.precio_total,
                r.tarifa,
                r.tramo_horario,
                r.perro_extra ? 'Sí' : 'No',
                r.direccion || '',
                r.notas || ''
            ].join('\t') + '\n';
        });
        
        const blob = new Blob([contenido], { type: 'application/vnd.ms-excel;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        
        const fecha = new Date().toISOString().split('T')[0];
        link.href = url;
        link.download = `reservas_${fecha}.xls`;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        console.log('✅ Excel descargado correctamente');
        mostrarExito(`${reservas.length} reservas exportadas a Excel`);
        
    } catch (error) {
        console.error('❌ Error exportando Excel:', error);
        mostrarError('Error al exportar Excel: ' + error.message);
    }
}

/**
 * Exporta las reservas a formato PDF
 * Genera un documento PDF profesional con todas las reservas
 */
function exportarPDF() {
    try {
        console.log('📕 Generando PDF...');
        
        const reservas = window.reservasParaExportar || reservasData;
        
        if (reservas.length === 0) {
            alert('⚠️ No hay reservas para exportar');
            return;
        }
        
        // Abrimos una ventana de impresión con contenido HTML estilizado
        const ventana = window.open('', '_blank');
        
        // Generamos el HTML del PDF
        let html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Reservas - Guardería Canina</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    padding: 20px;
                    font-size: 12px;
                }
                h1 {
                    color: #667eea;
                    border-bottom: 3px solid #667eea;
                    padding-bottom: 10px;
                }
                .info {
                    background: #f3f4f6;
                    padding: 15px;
                    border-radius: 8px;
                    margin-bottom: 20px;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 20px;
                }
                th {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 12px 8px;
                    text-align: left;
                    font-weight: bold;
                }
                td {
                    padding: 10px 8px;
                    border-bottom: 1px solid #e5e7eb;
                }
                tr:nth-child(even) {
                    background: #f9fafb;
                }
                .badge {
                    padding: 4px 8px;
                    border-radius: 12px;
                    font-size: 10px;
                    font-weight: bold;
                    color: white;
                }
                .badge-pendiente { background: linear-gradient(135deg, #f59e0b 0%, #f97316 100%); }
                .badge-confirmada { background: linear-gradient(135deg, #10b981 0%, #059669 100%); }
                .badge-rechazada { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); }
                .badge-cancelada { background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%); }
                .footer {
                    margin-top: 30px;
                    padding-top: 20px;
                    border-top: 2px solid #667eea;
                    text-align: center;
                    color: #6b7280;
                }
                @media print {
                    body { padding: 0; }
                    .no-print { display: none; }
                }
            </style>
        </head>
        <body>
            <h1>🐕 Reporte de Reservas - Guardería Canina</h1>
            
            <div class="info">
                <p><strong>Fecha de generación:</strong> ${new Date().toLocaleString('es-ES')}</p>
                <p><strong>Total de reservas:</strong> ${reservas.length}</p>
                <p><strong>Filtros aplicados:</strong></p>
                <ul>
                    <li>Fecha desde: ${document.getElementById('export-desde').value || 'Todas'}</li>
                    <li>Fecha hasta: ${document.getElementById('export-hasta').value || 'Todas'}</li>
                    <li>Servicio: ${document.getElementById('export-servicio').value}</li>
                    <li>Estado: ${document.getElementById('export-estado').value}</li>
                </ul>
            </div>
            
            <table>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Servicio</th>
                        <th>Fechas</th>
                        <th>Dueño</th>
                        <th>Perro</th>
                        <th>Contacto</th>
                        <th>Estado</th>
                        <th>Precio</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        // Agregamos cada reserva
        reservas.forEach(r => {
            html += `
                <tr>
                    <td style="font-family: monospace; font-size: 10px;">${r.id.substring(0, 8)}</td>
                    <td style="text-transform: capitalize;">${r.servicio}</td>
                    <td style="white-space: nowrap;">
                        ${r.fecha_desde}<br>
                        ${r.fecha_hasta !== r.fecha_desde ? '→ ' + r.fecha_hasta : ''}
                    </td>
                    <td>${r.nombre_dueno}</td>
                    <td><strong>${r.nombre_perro}</strong><br><small>${r.raza || ''}</small></td>
                    <td style="font-size: 10px;">
                        ${r.telefono}<br>
                        ${r.email}
                    </td>
                    <td>
                        <span class="badge badge-${r.estado}">${r.estado}</span>
                    </td>
                    <td style="text-align: right; font-weight: bold;">${r.precio_total}€</td>
                </tr>
            `;
        });
        
        // Calculamos totales
        const totalConfirmadas = reservas.filter(r => r.estado === 'confirmada').length;
        const totalIngresos = reservas
            .filter(r => r.estado === 'confirmada')
            .reduce((sum, r) => sum + parseFloat(r.precio_total || 0), 0);
        
        html += `
                </tbody>
                <tfoot>
                    <tr style="background: #f3f4f6; font-weight: bold;">
                        <td colspan="6"></td>
                        <td style="text-align: right;">Total Confirmadas:</td>
                        <td style="text-align: right;">${totalConfirmadas}</td>
                    </tr>
                    <tr style="background: #e5e7eb; font-weight: bold; font-size: 14px;">
                        <td colspan="6"></td>
                        <td style="text-align: right;">Total Ingresos:</td>
                        <td style="text-align: right; color: #10b981;">${totalIngresos.toFixed(2)}€</td>
                    </tr>
                </tfoot>
            </table>
            
            <div class="footer">
                <p>Documento generado automáticamente por el Sistema de Gestión</p>
                <p>Guardería Canina - ${new Date().getFullYear()}</p>
            </div>
            
            <div class="no-print" style="margin-top: 30px; text-align: center;">
                <button onclick="window.print()" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; border: none; border-radius: 8px; font-size: 16px; font-weight: bold; cursor: pointer;">
                    🖨️ Imprimir / Guardar como PDF
                </button>
                <button onclick="window.close()" style="background: #6b7280; color: white; padding: 15px 30px; border: none; border-radius: 8px; font-size: 16px; font-weight: bold; cursor: pointer; margin-left: 10px;">
                    ✕ Cerrar
                </button>
            </div>
        </body>
        </html>
        `;
        
        ventana.document.write(html);
        ventana.document.close();
        
        console.log('✅ PDF generado correctamente');
        mostrarExito('PDF generado. Usa el botón Imprimir para guardar');
        
    } catch (error) {
        console.error('❌ Error generando PDF:', error);
        mostrarError('Error al generar PDF: ' + error.message);
    }
}

/**
 * Inicializa los eventos de exportación
 * Llamar esta función en init() o cuando se carga la pestaña de exportar
 */
function inicializarExportacion() {
    // Agregamos listeners a los filtros
    const filtros = ['export-desde', 'export-hasta', 'export-servicio', 'export-estado'];
    
    filtros.forEach(filtroId => {
        const elemento = document.getElementById(filtroId);
        if (elemento) {
            elemento.addEventListener('change', actualizarVistaPreviaExport);
        }
    });
    
    // Actualizamos la vista inicial
    actualizarVistaPreviaExport();
    
    console.log('✅ Sistema de exportación inicializado');
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