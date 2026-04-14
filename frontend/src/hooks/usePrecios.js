/**
 * Hook para obtener la configuración de precios de un servicio.
 * Cachea el resultado durante 5 minutos para evitar peticiones repetidas.
 *
 * @module usePrecios
 */

import { useState, useEffect } from 'react';
import { getPrecios } from '../services/api';

/** @type {Map<string, { data: any, timestamp: number }>} */
const cache = new Map();
const TTL_MS = 5 * 60 * 1000; // 5 minutos

/**
 * @typedef {Object} UsePreciosResult
 * @property {Object|null} precios - Configuración de precios del servicio
 * @property {boolean} loading
 * @property {string|null} error
 */

/**
 * Obtiene y cachea la configuración de precios de un servicio.
 *
 * @param {string|null} servicio - 'paseos' | 'guarderia' | 'alojamiento'
 * @returns {UsePreciosResult}
 */
function usePrecios(servicio) {
  const [precios, setPrecios] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!servicio) {
      setPrecios(null);
      return;
    }

    // Comprobar caché
    const cached = cache.get(servicio);
    if (cached && Date.now() - cached.timestamp < TTL_MS) {
      setPrecios(cached.data);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelado = false;
    setLoading(true);
    setError(null);

    getPrecios(servicio).then(({ data, error: err }) => {
      if (cancelado) return;
      if (err) {
        setError(err);
        setPrecios(null);
      } else {
        cache.set(servicio, { data, timestamp: Date.now() });
        setPrecios(data);
      }
      setLoading(false);
    });

    return () => {
      cancelado = true;
    };
  }, [servicio]);

  return { precios, loading, error };
}

export default usePrecios;
