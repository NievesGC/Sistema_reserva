
const SUPABASE_URL = 'https://zfrotbrayayvlpflpeha.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpmcm90YnJheWF5dmxwZmxwZWhhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkzMzY0MDUsImV4cCI6MjA3NDkxMjQwNX0.dRnztaxi-gtgZei0OIao7pAGV51Zy6luRd0RSjHREfg';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);


/* Objeto donde se guarda temporamente la información de la reserva seleccionada */
const state = {
    servicioSeleccionado: null,
    fechaDesde: null,
    fechaHasta: null,
    unSoloDia: false,
    tarifaSeleccionada: null,
    tramoSeleccionado: null,
    perroExtra: false,
    disponibilidad: {},
    config: {},
    festivos: []
};

// Función para formatear fecha sin problemas de zona horaria
function formatearFecha(fecha) {
    const d = new Date(fecha);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

//Lista de diccionarios, con los servicios que ofrece el negocio
const SERVICIOS = [
    { id: 'paseos', nombre: 'Paseos', icon: '<svg width="48" height="48" viewBox="0 0 24 24" class="icon-stroke"><path d="M12 8c-3 0-6 2-6 5v3h12v-3c0-3-3-5-6-5z"/><path d="M9 8c0-2 1-3 3-3s3 1 3 3"/><circle cx="9" cy="16" r="1"/><circle cx="15" cy="16" r="1"/><path d="M12 16c0 0 0 3 -2 5"/><path d="M12 16c0 0 0 3 2 5"/></svg>', plazas: 2 },
    { id: 'guarderia', nombre: 'Guardería', icon: '<svg width="48" height="48" viewBox="0 0 24 24" class="icon-stroke"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/></svg>', plazas: 4 },
    { id: 'alojamiento', nombre: 'Alojamiento', icon: '<svg width="48" height="48" viewBox="0 0 24 24" class="icon-stroke"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>', plazas: 4 }
];

//Es la función que arranca toda la aplicación cuando carga la página.
/*  Carga la configuración de la base de datos
    Carga la disponibilidad del mes actual
    Carga los días festivos
    Muestra los servicios en pantalla
    Muestra el calendario
    Activa los eventos de botones
    Oculta la pantalla de carga
    Muestra el contenido principal */
async function init() {
    try {
        await cargarConfiguracion();
        await cargarDisponibilidadMes();
        await cargarFestivos();
        renderServicios();
        renderCalendario();
        configurarEventos();
        document.getElementById('loading-screen').classList.add('hidden');
        document.getElementById('main-content').classList.remove('hidden');
    } catch (error) {
        console.error('Error:', error);
        alert('Error al cargar. Recarga la página.');
    }
}

/*  Lee configuraciones de una base de datos
    Guarda esas configuraciones en `state.config`
    Actualiza las plazas disponibles de 3 servicios  */

async function cargarConfiguracion() {
    const { data } = await supabase.from('configuracion').select('*');
    if (data) data.forEach(item => state.config[item.clave] = item.valor);
    SERVICIOS[0].plazas = parseInt(state.config.plazas_paseos) || 2;
    SERVICIOS[1].plazas = parseInt(state.config.plazas_guarderia) || 4;
    SERVICIOS[2].plazas = parseInt(state.config.plazas_alojamiento) || 4;
}

//Carga cuántas plazas hay ocupadas cada día del mes actual.
async function cargarDisponibilidadMes() {
    const primerDia = new Date(); //Calcular primer día del mes
    primerDia.setHours(0, 0, 0, 0); // Pone hora a medianoche
    primerDia.setDate(1); // Pone día 1
    const ultimoDia = new Date(primerDia.getFullYear(), primerDia.getMonth() + 1, 0); // El día 0 del mes siguiente = último día del mes actual
    const { data } = await supabase.from('disponibilidad').select('*').gte('fecha', formatearFecha(primerDia)).lte('fecha', formatearFecha(ultimoDia));
    if (data) {
        data.forEach(item => {
            const key = `${item.servicio}-${item.fecha}`;
            state.disponibilidad[key] = item;
        });
    }
    //¿Por qué esta transformación? Para acceder rápido a la disponibilidad
}

//Carga los días festivos activos desde la base de datos.
async function cargarFestivos() {
    const { data } = await supabase.from('festivos').select('*').eq('activo', true);
    if (data) state.festivos = data.map(f => f.fecha);
}


//Crea los 3 botones de servicios (Paseos, Guardería, Alojamiento) en HTML recoriendo servicios con map
function renderServicios() {
    const grid = document.getElementById('servicios-grid');
    grid.innerHTML = SERVICIOS.map(s => `<button onclick="seleccionarServicio('${s.id}')" id="servicio-${s.id}" class="service-card p-6 rounded-2xl border-2 border-gray-200 text-left bg-white shadow-md">${s.icon}<div class="font-bold text-gray-800 text-lg mt-3">${s.nombre}</div></button>`).join('');
}

function seleccionarServicio(id) {
    state.servicioSeleccionado = id;
    state.fechaDesde = null; //¿Por qué resetear? Porque cada servicio puede tener diferente disponibilidad. Si antes elegiste fechas para guardería y ahora cambias a paseos, esas fechas pueden no estar disponibles
    state.fechaHasta = null;
    document.getElementById('fechaDesde').value = '';
    document.getElementById('fechaHasta').value = '';
    SERVICIOS.forEach(s => {
        const btn = document.getElementById(`servicio-${s.id}`);
        btn.className = s.id === id ? 'service-card selected p-6 rounded-2xl border-2 text-left shadow-lg' : 'service-card p-6 rounded-2xl border-2 border-gray-200 text-left bg-white shadow-md';
    });
    const container = document.getElementById('fechas-container');
    container.classList.add('active');
    const checkboxDiv = document.getElementById('checkbox-un-dia');
    if (id === 'alojamiento') {
        checkboxDiv.style.display = 'none';
        document.getElementById('label-desde').textContent = 'Entrada *';
        document.getElementById('label-hasta').textContent = 'Salida *';
    } else {
        checkboxDiv.style.display = 'block';
        document.getElementById('label-desde').textContent = 'Desde *';
        document.getElementById('label-hasta').textContent = 'Hasta *';
    }
    renderCalendario();
    actualizarBotonPaso1();
}

function renderCalendario() {
    const grid = document.getElementById('calendario-grid');
    const dias = generarCalendario();
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    grid.innerHTML = dias.map(dia => {
        const disponible = dia >= hoy;
        const key = formatearFecha(dia);
        const plazas = obtenerPlazasDisponibles(key);
        return `<button ${!disponible || plazas === 0 ? 'disabled' : ''} onclick="seleccionarFechaCalendario('${key}')" id="dia-${key}" class="calendar-day p-3 rounded-xl text-sm font-semibold transition ${disponible && plazas > 0 ? 'bg-white border-2 border-gray-200 text-gray-800' : 'bg-gray-100 text-gray-400 cursor-not-allowed border-2 border-gray-100'}"><div class="text-lg">${dia.getDate()}</div>${disponible && state.servicioSeleccionado ? (plazas > 0 ? `<div class="availability-badge mt-1">${plazas}</div>` : '<div class="availability-badge full mt-1">✗</div>') : ''}</button>`;
    }).join('');
    actualizarCalendarioSeleccion();
}

function actualizarCalendarioSeleccion() {
    if (!state.fechaDesde) return;
    const dias = generarCalendario();
    dias.forEach(dia => {
        const key = formatearFecha(dia);
        const btn = document.getElementById(`dia-${key}`);
        if (!btn || btn.disabled) return;
        const esDesde = state.fechaDesde === key;
        const esHasta = state.fechaHasta === key;
        const estaEnRango = state.fechaDesde && state.fechaHasta && key >= state.fechaDesde && key <= state.fechaHasta;
        btn.classList.remove('selected', 'in-range');
        if (esDesde || esHasta) {
            btn.classList.add('selected');
        } else if (estaEnRango) {
            btn.classList.add('in-range');
        }
    });
}

function generarCalendario() {
    const hoy = new Date();
    const primerDia = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const ultimoDia = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
    const dias = [];
    const primerDiaSemana = primerDia.getDay();
    const diasVaciosInicio = primerDiaSemana === 0 ? 6 : primerDiaSemana - 1;
    for (let i = diasVaciosInicio; i > 0; i--) {
        const diaAnterior = new Date(primerDia);
        diaAnterior.setDate(primerDia.getDate() - i);
        dias.push(diaAnterior);
    }
    for (let d = new Date(primerDia); d <= ultimoDia; d.setDate(d.getDate() + 1)) {
        dias.push(new Date(d));
    }
    return dias;
}

function obtenerPlazasDisponibles(fecha) {
    if (!state.servicioSeleccionado) return 0;
    const servicio = SERVICIOS.find(s => s.id === state.servicioSeleccionado);
    const key = `${state.servicioSeleccionado}-${fecha}`;
    const disp = state.disponibilidad[key];
    if (disp && disp.bloqueado) return 0;
    const ocupadas = disp ? disp.plazas_ocupadas : 0;
    return Math.max(0, servicio.plazas - ocupadas);
}

function configurarEventos() {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const hoyStr = formatearFecha(hoy);
    document.getElementById('fechaDesde').setAttribute('min', hoyStr);
    document.getElementById('fechaHasta').setAttribute('min', hoyStr);
    document.getElementById('fechaDesde').addEventListener('change', function () {
        state.fechaDesde = this.value;
        document.getElementById('fechaHasta').setAttribute('min', this.value);
        if (state.unSoloDia) state.fechaHasta = this.value;
        actualizarRangoInfo();
        actualizarBotonPaso1();
        actualizarCalendarioSeleccion();
    });
    document.getElementById('fechaHasta').addEventListener('change', function () {
        state.fechaHasta = this.value;
        if (state.fechaDesde && this.value && this.value < state.fechaDesde) {
            alert('⚠️ La fecha "hasta" debe ser igual o posterior a la fecha "desde"');
            this.value = '';
            state.fechaHasta = null;
            return;
        }
        actualizarRangoInfo();
        actualizarBotonPaso1();
        actualizarCalendarioSeleccion();
    });
    document.getElementById('unSoloDia').addEventListener('change', function () {
        state.unSoloDia = this.checked;
        const container = document.getElementById('fecha-hasta-container');
        if (this.checked) {
            container.style.opacity = '0.5';
            container.style.pointerEvents = 'none';
            if (state.fechaDesde) state.fechaHasta = state.fechaDesde;
        } else {
            container.style.opacity = '1';
            container.style.pointerEvents = 'all';
        }
        actualizarRangoInfo();
        actualizarBotonPaso1();
    });
}

function seleccionarFechaCalendario(key) {
    if (state.servicioSeleccionado === 'alojamiento') {
        if (!state.fechaDesde) {
            state.fechaDesde = key;
            document.getElementById('fechaDesde').value = key;
            state.fechaHasta = null;
        } else if (!state.fechaHasta && key > state.fechaDesde) {
            state.fechaHasta = key;
            document.getElementById('fechaHasta').value = key;
        } else if (!state.fechaHasta && key <= state.fechaDesde) {
            alert('⚠️ La fecha de salida debe ser posterior a la fecha de entrada');
            return;
        } else {
            state.fechaDesde = key;
            document.getElementById('fechaDesde').value = key;
            state.fechaHasta = null;
            document.getElementById('fechaHasta').value = '';
        }
    } else {
        if (!state.unSoloDia && state.fechaDesde && !state.fechaHasta) {
            if (key < state.fechaDesde) {
                alert('⚠️ La fecha "hasta" debe ser igual o posterior a la fecha "desde"');
                return;
            }
            state.fechaHasta = key;
            document.getElementById('fechaHasta').value = key;
        } else {
            state.fechaDesde = key;
            document.getElementById('fechaDesde').value = key;
            if (state.unSoloDia) {
                state.fechaHasta = key;
            } else {
                state.fechaHasta = null;
                document.getElementById('fechaHasta').value = '';
            }
        }
    }
    actualizarRangoInfo();
    actualizarBotonPaso1();
    actualizarCalendarioSeleccion();
}

function actualizarRangoInfo() {
    const infoDiv = document.getElementById('rango-info');
    if (state.fechaDesde && (state.fechaHasta || state.unSoloDia)) {
        const desde = new Date(state.fechaDesde + 'T00:00:00');
        const hasta = new Date((state.fechaHasta || state.fechaDesde) + 'T00:00:00');
        const disponible = verificarDisponibilidadRango();
        let texto = '';
        if (state.servicioSeleccionado === 'alojamiento') {
            const noches = Math.ceil((hasta - desde) / (1000 * 60 * 60 * 24));
            texto = disponible ? `🏠 Check-in: ${desde.toLocaleDateString('es-ES')} | Check-out: ${hasta.toLocaleDateString('es-ES')} (${noches} ${noches === 1 ? 'noche' : 'noches'})` : `⚠️ No hay disponibilidad en todas las fechas`;
        } else {
            const dias = Math.ceil((hasta - desde) / (1000 * 60 * 60 * 24)) + 1;
            texto = disponible ? dias === 1 ? `📅 Reserva para: ${desde.toLocaleDateString('es-ES')}` : `📅 Reserva de ${dias} días` : `⚠️ No hay disponibilidad en todas las fechas`;
        }
        infoDiv.innerHTML = `<p class="text-sm font-semibold text-gray-700">${texto}</p>`;
        infoDiv.className = disponible ? 'mt-4 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border-2 border-purple-200' : 'mt-4 p-4 bg-gradient-to-r from-red-50 to-orange-50 rounded-xl border-2 border-red-300';
        infoDiv.classList.remove('hidden');
    } else {
        infoDiv.classList.add('hidden');
    }
}

function verificarDisponibilidadRango() {
    if (!state.fechaDesde || !state.servicioSeleccionado) return true;
    const desde = new Date(state.fechaDesde + 'T00:00:00');
    const hasta = new Date((state.fechaHasta || state.fechaDesde) + 'T00:00:00');
    const fechaActual = new Date(desde);
    while (fechaActual <= hasta) {
        const key = formatearFecha(fechaActual);
        const plazas = obtenerPlazasDisponibles(key);
        if (plazas === 0) return false;
        fechaActual.setDate(fechaActual.getDate() + 1);
    }
    return true;
}

function actualizarBotonPaso1() {
    const btn = document.getElementById('btn-paso1');
    const valido = state.servicioSeleccionado && state.fechaDesde && (state.fechaHasta || state.unSoloDia || state.servicioSeleccionado !== 'alojamiento') && verificarDisponibilidadRango();
    if (valido) {
        btn.disabled = false;
        btn.className = 'btn-primary w-full text-white py-4 rounded-xl font-bold text-lg';
    } else {
        btn.disabled = true;
        btn.className = 'w-full py-4 rounded-xl font-bold text-lg bg-gray-300 text-gray-500 cursor-not-allowed';
    }
}

function avanzarAPaso2() {
    document.getElementById('paso1').classList.add('hidden');
    document.getElementById('paso2').classList.remove('hidden');
    actualizarSteps(2);
    renderPaso2();
}

function renderPaso2() {
    const servicio = SERVICIOS.find(s => s.id === state.servicioSeleccionado);
    const desde = new Date(state.fechaDesde + 'T00:00:00');
    const hasta = new Date((state.fechaHasta || state.fechaDesde) + 'T00:00:00');
    document.getElementById('resumen-paso2').innerHTML = `<p class="text-sm font-semibold text-gray-700 mb-2"><strong>Servicio:</strong> ${servicio.nombre}</p><p class="text-sm font-semibold text-gray-700"><strong>Fechas:</strong> ${desde.toLocaleDateString('es-ES')}${state.fechaHasta ? ' - ' + hasta.toLocaleDateString('es-ES') : ''}</p>`;
    const preciosPorServicio = {
        'paseos': { normal: '12€', cachorros: '14€', festivos: '13€ festivos' },
        'guarderia': { normal: '20€', cachorros: '22€', festivos: '25€ festivos' },
        'alojamiento': { normal: '35€', cachorros: '38€', festivos: '40€ festivos' }
    };
    const preciosActuales = preciosPorServicio[state.servicioSeleccionado];
    const preciosExtraTexto = {
        'paseos': '+9€ por día',
        'guarderia': '+15€ por día',
        'alojamiento': '+25€ por noche'
    };
    let html = '<div class="mb-6"><label class="block text-sm font-bold text-gray-700 mb-4 uppercase tracking-wide">💰 Selecciona Tarifa</label><div class="grid grid-cols-1 md:grid-cols-2 gap-4">';
    html += `<button onclick="seleccionarTarifa('normal')" id="tarifa-normal" class="tarifa-card p-6 rounded-xl border-2 border-gray-200 bg-white shadow-sm"><svg width="40" height="40" viewBox="0 0 24 24" class="icon-stroke mb-2"><path d="M12 8c-3 0-6 2-6 5v3h12v-3c0-3-3-5-6-5z"/><path d="M9 8c0-2 1-3 3-3s3 1 3 3"/><circle cx="9" cy="16" r="1"/><circle cx="15" cy="16" r="1"/></svg><div class="font-bold text-gray-800 text-lg">Normal</div><div class="text-purple-600 font-bold text-2xl mt-2">${preciosActuales.normal}</div><div class="text-xs text-gray-600 mt-2">${preciosActuales.festivos}</div></button>`;
    html += `<button onclick="seleccionarTarifa('cachorros')" id="tarifa-cachorros" class="tarifa-card p-6 rounded-xl border-2 border-gray-200 bg-white shadow-sm"><svg width="40" height="40" viewBox="0 0 24 24" class="icon-stroke mb-2"><circle cx="12" cy="8" r="3"/><path d="M12 11c-3 0-5 2-5 4v3h10v-3c0-2-2-4-5-4z"/><path d="M7 7c-1 0-2-1-2-2s1-2 2-2"/><path d="M17 7c1 0 2-1 2-2s-1-2-2-2"/></svg><div class="font-bold text-gray-800 text-lg">Cachorros</div><div class="text-purple-600 font-bold text-2xl mt-2">${preciosActuales.cachorros}</div><div class="text-xs text-gray-600 mt-2">Para perros menores de 1 año</div></button>`;
    html += '</div><div class="mt-4 checkbox-wrapper"><label class="flex items-center cursor-pointer bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-xl border-2 border-gray-200"><input type="checkbox" id="perroExtra" onchange="togglePerroExtra()" class="mr-3"><span class="text-sm font-semibold text-gray-700">➕ ¿Traes un <strong>segundo perro</strong>? (' + preciosExtraTexto[state.servicioSeleccionado] + ')</span></label></div></div>';
    if (state.servicioSeleccionado === 'alojamiento') {
        html += '<div><label class="block text-sm font-bold text-gray-700 mb-4 uppercase tracking-wide">🚗 Transporte</label><div class="grid grid-cols-1 md:grid-cols-3 gap-4">';
        html += '<button onclick="seleccionarTramo(\'sin-transporte\')" id="tramo-sin-transporte" class="tramo-card p-6 rounded-xl border-2 border-gray-200 bg-white shadow-sm"><svg width="40" height="40" viewBox="0 0 24 24" class="icon-stroke mb-2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/></svg><div class="font-bold text-gray-800">Sin Transporte</div></button>';
        html += '<button onclick="seleccionarTramo(\'recogida\')" id="tramo-recogida" class="tramo-card p-6 rounded-xl border-2 border-gray-200 bg-white shadow-sm"><svg width="40" height="40" viewBox="0 0 24 24" class="icon-stroke mb-2"><path d="M5 17h14v-5l-2-3h-10l-2 3z"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg><div class="font-bold text-gray-800">Recogida</div><div class="text-purple-600 font-bold mt-1">+12€</div></button>';
        html += '<button onclick="seleccionarTramo(\'recogida-entrega\')" id="tramo-recogida-entrega" class="tramo-card p-6 rounded-xl border-2 border-gray-200 bg-white shadow-sm"><svg width="40" height="40" viewBox="0 0 24 24" class="icon-stroke mb-2"><path d="M5 17h14v-5l-2-3h-10l-2 3z"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/><polyline points="17 8 21 12 17 16"/><polyline points="7 8 3 12 7 16"/></svg><div class="font-bold text-gray-800">Recogida+Entrega</div><div class="text-purple-600 font-bold mt-1">+20€</div></button>';
        html += '</div></div>';
    } else {
        html += '<div><label class="block text-sm font-bold text-gray-700 mb-4 uppercase tracking-wide">🐕 Horario</label><div class="grid grid-cols-1 md:grid-cols-' + (state.servicioSeleccionado === 'guarderia' ? '3' : '2') + ' gap-4">';
        html += '<button onclick="seleccionarTramo(\'mañana\')" id="tramo-mañana" class="tramo-card p-6 rounded-xl border-2 border-gray-200 bg-white shadow-sm"><svg width="40" height="40" viewBox="0 0 24 24" class="icon-stroke mb-2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="1" y1="12" x2="3" y2="12"/></svg><div class="font-bold text-gray-800">Mañana</div><div class="text-sm text-gray-600 mt-1">09:00-12:00</div></button>';
        html += '<button onclick="seleccionarTramo(\'tarde\')" id="tramo-tarde" class="tramo-card p-6 rounded-xl border-2 border-gray-200 bg-white shadow-sm"><svg width="40" height="40" viewBox="0 0 24 24" class="icon-stroke mb-2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="19.78" y1="19.78" x2="18.36" y2="18.36"/><line x1="23" y1="12" x2="21" y2="12"/></svg><div class="font-bold text-gray-800">Tarde</div><div class="text-sm text-gray-600 mt-1">16:00-19:00</div></button>';
        if (state.servicioSeleccionado === 'guarderia') {
            html += '<button onclick="seleccionarTramo(\'completo\')" id="tramo-completo" class="tramo-card p-6 rounded-xl border-2 border-gray-200 bg-white shadow-sm"><svg width="40" height="40" viewBox="0 0 24 24" class="icon-stroke mb-2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/></svg><div class="font-bold text-gray-800">Todo el Día</div><div class="text-sm text-gray-600 mt-1">09:00-19:00</div></button>';
        }
        html += '</div></div>';
    }
    document.getElementById('tarifas-tramos-grid').innerHTML = html;
}

function seleccionarTarifa(id) {
    state.tarifaSeleccionada = id;
    ['normal', 'cachorros'].forEach(t => {
        const btn = document.getElementById(`tarifa-${t}`);
        if (btn) btn.className = t === id ? 'tarifa-card selected p-6 rounded-xl border-2 shadow-lg' : 'tarifa-card p-6 rounded-xl border-2 border-gray-200 bg-white shadow-sm';
    });
    actualizarBotonPaso2();
}

function togglePerroExtra() {
    state.perroExtra = document.getElementById('perroExtra').checked;
}

function seleccionarTramo(id) {
    state.tramoSeleccionado = id;
    const tramos = ['sin-transporte', 'recogida', 'recogida-entrega', 'mañana', 'tarde', 'completo'];
    tramos.forEach(t => {
        const btn = document.getElementById(`tramo-${t}`);
        if (btn) btn.className = t === id ? 'tramo-card selected p-6 rounded-xl border-2 shadow-lg' : 'tramo-card p-6 rounded-xl border-2 border-gray-200 bg-white';
    });
    actualizarBotonPaso2();
}

function actualizarBotonPaso2() {
    const btn = document.getElementById('btn-paso2');
    const valido = state.tarifaSeleccionada && state.tramoSeleccionado;
    btn.disabled = !valido;
    btn.className = valido ? 'btn-primary flex-1 text-white py-4 rounded-xl font-bold text-lg' : 'flex-1 py-4 rounded-xl font-bold text-lg bg-gray-300 text-gray-500 cursor-not-allowed';
}

function volverAPaso1() {
    document.getElementById('paso2').classList.add('hidden');
    document.getElementById('paso1').classList.remove('hidden');
    actualizarSteps(1);
}

function avanzarAPaso3() {
    document.getElementById('paso2').classList.add('hidden');
    document.getElementById('paso3').classList.remove('hidden');
    actualizarSteps(3);
    renderResumenPaso3();
}

function renderResumenPaso3() {
    const servicio = SERVICIOS.find(s => s.id === state.servicioSeleccionado);
    const desde = new Date(state.fechaDesde + 'T00:00:00');
    const hasta = new Date((state.fechaHasta || state.fechaDesde) + 'T00:00:00');
    let dias = 1;
    if (state.servicioSeleccionado === 'alojamiento') {
        dias = Math.ceil((hasta - desde) / (1000 * 60 * 60 * 24));
    } else {
        dias = Math.ceil((hasta - desde) / (1000 * 60 * 60 * 24)) + 1;
    }
    const preciosBase = {
        'paseos': { 'normal': 12, 'cachorros': 14 },
        'guarderia': { 'normal': 20, 'cachorros': 22 },
        'alojamiento': { 'normal': 35, 'cachorros': 38 }
    };
    const preciosExtra = {
        'paseos': 9,
        'guarderia': 15,
        'alojamiento': 25
    };
    let precioBase = preciosBase[state.servicioSeleccionado][state.tarifaSeleccionada] * dias;
    if (state.perroExtra) {
        precioBase += preciosExtra[state.servicioSeleccionado] * dias;
    }
    let precioTransporte = 0;
    if (state.servicioSeleccionado === 'alojamiento') {
        if (state.tramoSeleccionado === 'recogida') {
            precioTransporte = 12;
        } else if (state.tramoSeleccionado === 'recogida-entrega') {
            precioTransporte = 20;
        }
    }
    const precioTotal = precioBase + precioTransporte;
    const nombresTramos = {
        'mañana': 'Mañana (09:00-12:00)',
        'tarde': 'Tarde (16:00-19:00)',
        'completo': 'Todo el Día (09:00-19:00)',
        'sin-transporte': 'Sin transporte',
        'recogida': 'Solo Recogida (+12€)',
        'recogida-entrega': 'Recogida + Entrega (+20€)'
    };
    const nombresTarifas = {
        'normal': 'Normal',
        'cachorros': 'Cachorros'
    };
    let html = '<h3 class="text-xl font-bold mb-4">📋 Resumen</h3>';
    html += `<p class="text-sm font-semibold mb-2">${servicio.nombre}</p>`;
    html += `<p class="text-sm mb-2">📅 ${state.fechaDesde}${state.fechaHasta ? ' - ' + state.fechaHasta : ''} (${dias} ${state.servicioSeleccionado === 'alojamiento' ? (dias === 1 ? 'noche' : 'noches') : (dias === 1 ? 'día' : 'días')})</p>`;
    html += `<p class="text-sm mb-2">💰 Tarifa: ${nombresTarifas[state.tarifaSeleccionada]}</p>`;
    if (state.perroExtra) {
        html += `<p class="text-sm mb-2">➕ Perro extra incluido</p>`;
    }
    html += `<p class="text-sm mb-4">${nombresTramos[state.tramoSeleccionado]}</p>`;
    html += `<p class="text-2xl font-bold text-indigo-600">TOTAL: ${precioTotal}€</p>`;
    if (precioTransporte > 0) {
        html += `<p class="text-xs text-gray-600 mt-1">(Incluye ${precioTransporte}€ de transporte)</p>`;
    }
    html += '<p class="text-xs text-gray-500 mt-2 italic">* Precio sujeto a cambios por festivos</p>';
    document.getElementById('resumen-reserva').innerHTML = html;
    const necesitaDireccion = state.servicioSeleccionado === 'alojamiento' && (state.tramoSeleccionado === 'recogida' || state.tramoSeleccionado === 'recogida-entrega');
    const direccionInput = document.getElementById('direccion');
    const direccionReq = document.getElementById('direccion-required');
    const direccionInfo = document.getElementById('direccion-info');
    if (necesitaDireccion) {
        direccionInput.required = true;
        direccionReq.innerHTML = '<span class="text-red-500">*</span>';
        direccionInfo.textContent = '⚠️ Obligatoria para transporte';
        direccionInfo.classList.remove('hidden');
    } else {
        direccionInput.required = false;
        direccionReq.innerHTML = '';
        direccionInfo.classList.add('hidden');
    }
    state.precioTotal = precioTotal;
    agregarValidacionTiempoReal();
}

function volverAPaso2() {
    document.getElementById('paso3').classList.add('hidden');
    document.getElementById('paso2').classList.remove('hidden');
    actualizarSteps(2);
}

function actualizarSteps(paso) {
    for (let i = 1; i <= 3; i++) {
        const step = document.getElementById(`step-${i}`);
        step.className = i <= paso ? 'flex items-center justify-center w-12 h-12 rounded-full font-bold bg-white text-purple-600 shadow-lg' : 'flex items-center justify-center w-12 h-12 rounded-full font-bold bg-white bg-opacity-30 text-white';
        if (i < 3) {
            const line = document.getElementById(`line-${i}`);
            line.className = i < paso ? 'w-20 h-1 bg-white shadow-sm' : 'w-20 h-1 bg-white bg-opacity-30';
        }
    }
}

async function confirmarReserva() {
    // 1. PRIMERO validamos el formulario
    if (!validarFormularioPaso3()) {
        // Si la validación falla, no continuamos
        return;
    }

    // 2. Mostramos el spinner de carga
    const btnText = document.getElementById('btn-confirmar-text');
    const btnSpinner = document.getElementById('btn-confirmar-spinner');
    btnText.classList.add('hidden');
    btnSpinner.classList.remove('hidden');

    try {
        // 3. Construimos el objeto de reserva con todos los datos validados
        const reserva = {
            servicio: state.servicioSeleccionado,
            fecha_desde: state.fechaDesde,
            fecha_hasta: state.fechaHasta || state.fechaDesde,
            tarifa: state.tarifaSeleccionada,
            tramo_horario: state.tramoSeleccionado,
            nombre_dueno: document.getElementById('nombreDueno').value.trim(),
            telefono: document.getElementById('telefono').value.trim(),
            email: document.getElementById('email').value.trim(),
            direccion: document.getElementById('direccion').value.trim() || '',
            nombre_perro: document.getElementById('nombrePerro').value.trim(),
            raza: document.getElementById('raza').value.trim() || '',
            tamano: document.querySelector('input[name="tamano"]:checked').value,
            notas: document.getElementById('notas').value.trim() || '',
            precio_total: state.precioTotal || 50.00,
            estado: 'pendiente',
            perro_extra: state.perroExtra
        };

        // 4. Enviamos la reserva a Supabase
        const { data, error } = await supabase
            .from('reservas')
            .insert([reserva])
            .select();

        if (error) {
            console.error('Error:', error);
            throw new Error(error.message);
        }

        // 5. Mostramos la confirmación
        document.getElementById('paso3').classList.add('hidden');
        document.getElementById('confirmacion').classList.remove('hidden');
        document.getElementById('steps-indicator').style.display = 'none';

        document.getElementById('resumen-final').innerHTML = `
            <p class="font-semibold mb-2">Reserva #${data[0].id.substring(0, 8)}</p>
            <p class="text-sm">Te hemos enviado un email a ${reserva.email}</p>
        `;

    } catch (error) {
        alert('❌ Error al confirmar la reserva: ' + error.message);
    } finally {
        // 6. Restauramos el botón (ocultamos spinner)
        btnText.classList.remove('hidden');
        btnSpinner.classList.add('hidden');
    }
}

function validarFormularioPaso3() {
    // 1. Obtenemos todos los campos obligatorios del formulario
    const nombreDueno = document.getElementById('nombreDueno').value.trim();
    const telefono = document.getElementById('telefono').value.trim();
    const email = document.getElementById('email').value.trim();
    const nombrePerro = document.getElementById('nombrePerro').value.trim();

    // 2. Verificamos que haya un tamaño seleccionado
    const tamanoSeleccionado = document.querySelector('input[name="tamano"]:checked');

    // 3. Verificamos que la política de privacidad esté aceptada
    const aceptaPrivacidad = document.getElementById('aceptaPrivacidad').checked;

    // 4. Si el servicio es alojamiento Y hay transporte, la dirección es obligatoria
    const direccion = document.getElementById('direccion').value.trim();
    const necesitaDireccion = state.servicioSeleccionado === 'alojamiento' &&
        (state.tramoSeleccionado === 'recogida' ||
            state.tramoSeleccionado === 'recogida-entrega');

    // 5. Array para almacenar los mensajes de error
    const errores = [];

    // 6. Validamos cada campo y agregamos mensajes descriptivos si faltan
    if (!nombreDueno) {
        errores.push('• Tu nombre es obligatorio');
    }

    if (!telefono) {
        errores.push('• El teléfono es obligatorio');
    } else if (!/^[0-9]{9}$/.test(telefono.replace(/\s/g, ''))) {
        // Validamos que el teléfono tenga formato correcto (9 dígitos)
        errores.push('• El teléfono debe tener 9 dígitos');
    }

    if (!email) {
        errores.push('• El email es obligatorio');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        // Validamos que el email tenga formato correcto
        errores.push('• El formato del email no es válido');
    }

    if (!nombrePerro) {
        errores.push('• El nombre del perro es obligatorio');
    }

    if (!tamanoSeleccionado) {
        errores.push('• Debes seleccionar el tamaño del perro');
    }

    if (necesitaDireccion && !direccion) {
        errores.push('• La dirección es obligatoria cuando hay transporte');
    }

    if (!aceptaPrivacidad) {
        errores.push('• Debes aceptar la política de privacidad');
    }

    // 7. Si hay errores, los mostramos al usuario
    if (errores.length > 0) {
        alert('⚠️ Por favor completa los siguientes campos:\n\n' + errores.join('\n'));
        return false;
    }

    // 8. Todo está correcto
    return true;
}

async function confirmarReserva() {
    // 1. PRIMERO validamos el formulario
    if (!validarFormularioPaso3()) {
        // Si la validación falla, no continuamos
        return;
    }

    // 2. Mostramos el spinner de carga
    const btnText = document.getElementById('btn-confirmar-text');
    const btnSpinner = document.getElementById('btn-confirmar-spinner');
    btnText.classList.add('hidden');
    btnSpinner.classList.remove('hidden');

    try {
        // 3. Construimos el objeto de reserva con todos los datos validados
        const reserva = {
            servicio: state.servicioSeleccionado,
            fecha_desde: state.fechaDesde,
            fecha_hasta: state.fechaHasta || state.fechaDesde,
            tarifa: state.tarifaSeleccionada,
            tramo_horario: state.tramoSeleccionado,
            nombre_dueno: document.getElementById('nombreDueno').value.trim(),
            telefono: document.getElementById('telefono').value.trim(),
            email: document.getElementById('email').value.trim(),
            direccion: document.getElementById('direccion').value.trim() || '',
            nombre_perro: document.getElementById('nombrePerro').value.trim(),
            raza: document.getElementById('raza').value.trim() || '',
            tamano: document.querySelector('input[name="tamano"]:checked').value,
            notas: document.getElementById('notas').value.trim() || '',
            precio_total: state.precioTotal || 50.00,
            estado: 'pendiente',
            perro_extra: state.perroExtra
        };

        // 4. Enviamos la reserva a Supabase
        const { data, error } = await supabase
            .from('reservas')
            .insert([reserva])
            .select();

        if (error) {
            console.error('Error:', error);
            throw new Error(error.message);
        }

        // 5. Mostramos la confirmación
        document.getElementById('paso3').classList.add('hidden');
        document.getElementById('confirmacion').classList.remove('hidden');
        document.getElementById('steps-indicator').style.display = 'none';

        document.getElementById('resumen-final').innerHTML = `
            <p class="font-semibold mb-2">Reserva #${data[0].id.substring(0, 8)}</p>
            <p class="text-sm">Te hemos enviado un email a ${reserva.email}</p>
        `;

    } catch (error) {
        alert('❌ Error al confirmar la reserva: ' + error.message);
    } finally {
        // 6. Restauramos el botón (ocultamos spinner)
        btnText.classList.remove('hidden');
        btnSpinner.classList.add('hidden');
    }
}

window.addEventListener('DOMContentLoaded', init);
