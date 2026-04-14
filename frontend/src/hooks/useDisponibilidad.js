/**
 * Hook para obtener la disponibilidad mensual de un servicio.
 * Se recarga automáticamente cuando cambia el servicio o el mes.
 *
 * @module useDisponibilidad
 */

import { useState, useEffect } from 'react';
import { getDisponibilidad } from '../services/api';

/**
 * @typedef {Object} UseDisponibilidadResult
 * @property {Object|null} disponibilidad - Mapa fecha -> plazas libres
 * @property {boolean} loading
 * @property {string|null} error
 * @property {Function} recargar - Fuerza una recarga manual
 */

/**
 * Obtiene y gestiona la disponibilidad mensual de un servicio.
 *
 * @param {string|null} servicio - 'paseos' | 'guarderia' | 'alojamiento'
 * @param {string|null} mes - Formato YYYY-MM
 * @returns {UseDisponibilidadResult}
 */
function useDisponibilidad(servicio, mes) {
  const [disponibilidad, setDisponibilidad] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!servicio || !mes) {
      setDisponibilidad(null);
      return;
    }

    let cancelado = false;
    setLoading(true);
    setError(null);

    getDisponibilidad(servicio, mes).then(({ data, error: err }) => {
      if (cancelado) return;
      if (err) {
        setError(err);
        setDisponibilidad(null);
      } else {
        setDisponibilidad(data);
      }
      setLoading(false);
    });

    return () => {
      cancelado = true;
    };
  }, [servicio, mes, tick]);

  /** Fuerza una recarga de los datos */
  function recargar() {
    setTick((t) => t + 1);
  }

  return { disponibilidad, loading, error, recargar };
}

export default useDisponibilidad;
