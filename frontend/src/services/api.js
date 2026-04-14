/**
 * Cliente HTTP hacia el backend FastAPI.
 * BASE_URL apunta a http://localhost:8000
 *
 * @module api
 */

const BASE_URL = 'http://localhost:8000';

/**
 * @typedef {Object} ApiResponse
 * @property {any} data - Datos de la respuesta
 * @property {boolean} loading - Indica si la petición está en curso
 * @property {string|null} error - Mensaje de error legible por el usuario
 */

/**
 * @typedef {'paseos'|'guarderia'|'alojamiento'} TipoServicio
 * @typedef {'normal'|'cachorros'} TipoTarifa
 * @typedef {'sin-transporte'|'recogida'|'recogida-entrega'} TipoTransporte
 */

/**
 * @typedef {Object} DatosReserva
 * @property {TipoServicio} servicio
 * @property {string} fecha_desde - ISO date string (YYYY-MM-DD)
 * @property {string} fecha_hasta - ISO date string (YYYY-MM-DD)
 * @property {TipoTarifa} tarifa
 * @property {string} tramo_horario
 * @property {boolean} perro_extra
 * @property {TipoTransporte} [transporte]
 * @property {string} nombre_dueno
 * @property {string} telefono
 * @property {string} email
 * @property {string} [direccion]
 * @property {string} nombre_perro
 * @property {string} [raza]
 * @property {string} [tamano]
 * @property {string} [notas]
 * @property {boolean} acepta_privacidad
 */

/**
 * Realiza una petición fetch con manejo de errores centralizado.
 * @param {string} url
 * @param {RequestInit} [options]
 * @returns {Promise<ApiResponse>}
 */
async function fetchApi(url, options = {}) {
  try {
    const response = await fetch(url, {
      headers: { 'Content-Type': 'application/json', ...options.headers },
      ...options,
    });

    if (!response.ok) {
      let mensaje = 'Ha ocurrido un error. Por favor, inténtalo de nuevo.';
      try {
        const body = await response.json();
        if (body.detail) {
          mensaje = typeof body.detail === 'string' ? body.detail : JSON.stringify(body.detail);
        }
      } catch (_) {
        // no se pudo parsear el cuerpo
      }
      return { data: null, loading: false, error: mensaje };
    }

    const data = await response.json();
    return { data, loading: false, error: null };
  } catch (err) {
    const esErrorRed =
      err instanceof TypeError && err.message.toLowerCase().includes('fetch');
    const mensaje = esErrorRed
      ? 'No se puede conectar con el servidor. Comprueba tu conexión a internet.'
      : 'Ha ocurrido un error inesperado. Por favor, inténtalo de nuevo.';
    return { data: null, loading: false, error: mensaje };
  }
}

/**
 * Obtiene la disponibilidad mensual de un servicio.
 * @param {TipoServicio} servicio
 * @param {string} mes - Formato YYYY-MM
 * @returns {Promise<ApiResponse>}
 */
export async function getDisponibilidad(servicio, mes) {
  return fetchApi(`${BASE_URL}/api/disponibilidad/${servicio}/${mes}`);
}

/**
 * Obtiene la configuración de precios de un servicio.
 * @param {TipoServicio} servicio
 * @returns {Promise<ApiResponse>}
 */
export async function getPrecios(servicio) {
  return fetchApi(`${BASE_URL}/api/precios/${servicio}`);
}

/**
 * Obtiene los días festivos activos.
 * @returns {Promise<ApiResponse>}
 */
export async function getFestivos() {
  return fetchApi(`${BASE_URL}/api/festivos`);
}

/**
 * Crea una nueva reserva.
 * @param {DatosReserva} datos
 * @returns {Promise<ApiResponse>}
 */
export async function crearReserva(datos) {
  return fetchApi(`${BASE_URL}/api/reservas`, {
    method: 'POST',
    body: JSON.stringify(datos),
  });
}

// ─── Endpoints admin ────────────────────────────────────────────────────────

/**
 * Devuelve las cabeceras de autenticación con el token JWT almacenado.
 * @returns {Record<string, string>}
 */
function authHeaders() {
  const token = localStorage.getItem('admin_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Inicia sesión en el panel de administración.
 * @param {string} email
 * @param {string} password
 * @returns {Promise<ApiResponse>}
 */
export async function login(email, password) {
  return fetchApi(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

/**
 * Obtiene el listado de reservas (admin).
 * @param {{ estado?: string, servicio?: string }} [filtros]
 * @returns {Promise<ApiResponse>}
 */
export async function getReservas(filtros = {}) {
  const params = new URLSearchParams(filtros).toString();
  const url = params
    ? `${BASE_URL}/api/admin/reservas?${params}`
    : `${BASE_URL}/api/admin/reservas`;
  return fetchApi(url, { headers: authHeaders() });
}

/**
 * Obtiene el detalle de una reserva (admin).
 * @param {string} id
 * @returns {Promise<ApiResponse>}
 */
export async function getReserva(id) {
  return fetchApi(`${BASE_URL}/api/admin/reservas/${id}`, {
    headers: authHeaders(),
  });
}

/**
 * Confirma una reserva (admin).
 * @param {string} id
 * @returns {Promise<ApiResponse>}
 */
export async function confirmarReserva(id) {
  return fetchApi(`${BASE_URL}/api/admin/reservas/${id}/confirmar`, {
    method: 'PATCH',
    headers: authHeaders(),
  });
}

/**
 * Rechaza una reserva (admin).
 * @param {string} id
 * @returns {Promise<ApiResponse>}
 */
export async function rechazarReserva(id) {
  return fetchApi(`${BASE_URL}/api/admin/reservas/${id}/rechazar`, {
    method: 'PATCH',
    headers: authHeaders(),
  });
}

/**
 * Cancela una reserva (admin).
 * @param {string} id
 * @returns {Promise<ApiResponse>}
 */
export async function cancelarReserva(id) {
  return fetchApi(`${BASE_URL}/api/admin/reservas/${id}/cancelar`, {
    method: 'PATCH',
    headers: authHeaders(),
  });
}

/**
 * Modifica una reserva confirmada (admin).
 * @param {string} id
 * @param {Partial<DatosReserva>} datos
 * @returns {Promise<ApiResponse>}
 */
export async function modificarReserva(id, datos) {
  return fetchApi(`${BASE_URL}/api/admin/reservas/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(datos),
  });
}

/**
 * Bloquea un día en el calendario (admin).
 * @param {TipoServicio} servicio
 * @param {string} fecha - ISO date string
 * @returns {Promise<ApiResponse>}
 */
export async function bloquearDia(servicio, fecha) {
  return fetchApi(`${BASE_URL}/api/admin/disponibilidad/bloquear`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ servicio, fecha }),
  });
}

/**
 * Desbloquea un día en el calendario (admin).
 * @param {TipoServicio} servicio
 * @param {string} fecha - ISO date string
 * @returns {Promise<ApiResponse>}
 */
export async function desbloquearDia(servicio, fecha) {
  return fetchApi(`${BASE_URL}/api/admin/disponibilidad/desbloquear`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ servicio, fecha }),
  });
}

/**
 * Actualiza la configuración de precios (admin).
 * @param {Object} config
 * @returns {Promise<ApiResponse>}
 */
export async function actualizarPrecios(config) {
  return fetchApi(`${BASE_URL}/api/admin/precios`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(config),
  });
}

/**
 * Añade un festivo (admin).
 * @param {{ fecha: string, nombre: string }} festivo
 * @returns {Promise<ApiResponse>}
 */
export async function addFestivo(festivo) {
  return fetchApi(`${BASE_URL}/api/admin/festivos`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(festivo),
  });
}

/**
 * Elimina un festivo (admin).
 * @param {string} id
 * @returns {Promise<ApiResponse>}
 */
export async function deleteFestivo(id) {
  return fetchApi(`${BASE_URL}/api/admin/festivos/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
}

/**
 * Exporta reservas con filtros (admin).
 * @param {{ fecha_desde?: string, fecha_hasta?: string, servicio?: string, estado?: string, formato?: string }} filtros
 * @returns {Promise<Response>} - Respuesta raw para descargar el archivo
 */
export async function exportarReservas(filtros = {}) {
  const params = new URLSearchParams(filtros).toString();
  const url = params
    ? `${BASE_URL}/api/admin/exportar?${params}`
    : `${BASE_URL}/api/admin/exportar`;
  try {
    const response = await fetch(url, { headers: authHeaders() });
    return response;
  } catch (_) {
    return null;
  }
}
