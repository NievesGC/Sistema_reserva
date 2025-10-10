
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