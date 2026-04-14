/**
 * Hook para el panel de administración: listar, confirmar, rechazar,
 * cancelar y modificar reservas. Requiere token JWT en localStorage.
 *
 * @module useReservas
 */

import { useState, useEffect, useCallback } from 'react';
import {
  getReservas,
  confirmarReserva,
  rechazarReserva,
  cancelarReserva,
  modificarReserva,
} from '../services/api';

/**
 * @typedef {Object} UseReservasResult
 * @property {Array} reservas - Lista de reservas
 * @property {boolean} loading
 * @property {string|null} error
 * @property {Function} recargar
 * @property {Function} confirmar - (id: string) => Promise<void>
 * @property {Function} rechazar  - (id: string) => Promise<void>
 * @property {Function} cancelar  - (id: string) => Promise<void>
 * @property {Function} modificar - (id: string, datos: Object) => Promise<void>
 */

/**
 * Gestiona las reservas del panel de administración.
 *
 * @param {{ estado?: string, servicio?: string }} [filtros]
 * @returns {UseReservasResult}
 */
function useReservas(filtros = {}) {
  const [reservas, setReservas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await getReservas(filtros);
    if (err) {
      setError(err);
    } else {
      setReservas(data ?? []);
    }
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(filtros)]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  /**
   * Ejecuta una acción sobre una reserva y recarga la lista.
   * @param {Function} accion
   * @param {string} id
   * @param {any} [extra]
   */
  async function ejecutarAccion(accion, id, extra) {
    setError(null);
    const { error: err } = extra !== undefined
      ? await accion(id, extra)
      : await accion(id);
    if (err) {
      setError(err);
    } else {
      await cargar();
    }
  }

  return {
    reservas,
    loading,
    error,
    recargar: cargar,
    confirmar: (id) => ejecutarAccion(confirmarReserva, id),
    rechazar: (id) => ejecutarAccion(rechazarReserva, id),
    cancelar: (id) => ejecutarAccion(cancelarReserva, id),
    modificar: (id, datos) => ejecutarAccion(modificarReserva, id, datos),
  };
}

export default useReservas;
