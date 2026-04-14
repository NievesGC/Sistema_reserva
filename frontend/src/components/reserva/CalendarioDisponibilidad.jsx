/**
 * Calendario mensual con plazas disponibles por día.
 * - Deshabilita días pasados y días sin disponibilidad.
 * - Permite seleccionar rango de fechas (click inicio, click fin).
 * - Muestra advertencia si algún día del rango no tiene plazas.
 *
 * @param {{
 *   servicio: string|null,
 *   fechaDesde: string|null,
 *   fechaHasta: string|null,
 *   onSeleccionarFecha: Function,
 *   disponibilidad: Object|null,
 *   mes: string,
 *   onCambiarMes: Function
 * }} props
 */

import React, { useMemo } from 'react';

const DIAS_SEMANA = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

/**
 * Formatea una fecha como YYYY-MM-DD sin problemas de zona horaria.
 * @param {Date} fecha
 * @returns {string}
 */
function formatearFecha(fecha) {
  const y = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, '0');
  const d = String(fecha.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Genera los días del mes (incluyendo relleno de semana anterior).
 * @param {number} anio
 * @param {number} mes - 0-indexed
 * @returns {{ fecha: Date, esMesActual: boolean }[]}
 */
function generarDiasMes(anio, mes) {
  const primerDia = new Date(anio, mes, 1);
  const ultimoDia = new Date(anio, mes + 1, 0);
  const dias = [];

  // Relleno inicio (lunes = 0)
  const diaSemana = primerDia.getDay();
  const relleno = diaSemana === 0 ? 6 : diaSemana - 1;
  for (let i = relleno; i > 0; i--) {
    const d = new Date(anio, mes, 1 - i);
    dias.push({ fecha: d, esMesActual: false });
  }

  for (let d = new Date(primerDia); d <= ultimoDia; d.setDate(d.getDate() + 1)) {
    dias.push({ fecha: new Date(d), esMesActual: true });
  }

  return dias;
}

function CalendarioDisponibilidad({
  servicio,
  fechaDesde,
  fechaHasta,
  onSeleccionarFecha,
  disponibilidad,
  mes,
  onCambiarMes,
}) {
  const [anio, mesNum] = mes.split('-').map(Number);

  const hoy = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const dias = useMemo(() => generarDiasMes(anio, mesNum - 1), [anio, mesNum]);

  /**
   * Obtiene las plazas disponibles para una fecha dada.
   * @param {string} fechaStr - YYYY-MM-DD
   * @returns {number}
   */
  function plazasDisponibles(fechaStr) {
    if (!disponibilidad) return 0;
    const item = disponibilidad[fechaStr];
    if (!item) return 0;
    if (item.bloqueado) return 0;
    return Math.max(0, item.plazas_libres ?? 0);
  }

  /**
   * Comprueba si algún día del rango seleccionado no tiene plazas.
   * @returns {boolean}
   */
  const hayDiasSinPlazasEnRango = useMemo(() => {
    if (!fechaDesde || !fechaHasta) return false;
    const desde = new Date(fechaDesde + 'T00:00:00');
    const hasta = new Date(fechaHasta + 'T00:00:00');
    const cursor = new Date(desde);
    while (cursor <= hasta) {
      if (plazasDisponibles(formatearFecha(cursor)) === 0) return true;
      cursor.setDate(cursor.getDate() + 1);
    }
    return false;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fechaDesde, fechaHasta, disponibilidad]);

  function handleClickDia(fechaStr, deshabilitado) {
    if (deshabilitado) return;
    onSeleccionarFecha(fechaStr);
  }

  function mesAnterior() {
    const d = new Date(anio, mesNum - 2, 1);
    onCambiarMes(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }

  function mesSiguiente() {
    const d = new Date(anio, mesNum, 1);
    onCambiarMes(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }

  const nombreMes = new Date(anio, mesNum - 1, 1).toLocaleDateString('es-ES', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div>
      {/* Cabecera de navegación */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '0.75rem',
        }}
      >
        <button
          onClick={mesAnterior}
          style={estiloBotonNav}
          aria-label="Mes anterior"
        >
          ←
        </button>
        <span style={{ fontWeight: 700, textTransform: 'capitalize', color: '#374151' }}>
          {nombreMes}
        </span>
        <button
          onClick={mesSiguiente}
          style={estiloBotonNav}
          aria-label="Mes siguiente"
        >
          →
        </button>
      </div>

      {/* Cabecera días de la semana */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '4px' }}>
        {DIAS_SEMANA.map((d) => (
          <div
            key={d}
            style={{ textAlign: 'center', fontWeight: 700, fontSize: '0.75rem', color: '#7c3aed' }}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Cuadrícula de días */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
        {dias.map(({ fecha, esMesActual }, idx) => {
          const fechaStr = formatearFecha(fecha);
          const esPasado = fecha < hoy;
          const plazas = esMesActual ? plazasDisponibles(fechaStr) : 0;
          const sinPlazas = esMesActual && !esPasado && plazas === 0;
          const deshabilitado = !esMesActual || esPasado || sinPlazas;

          const esDesde = fechaStr === fechaDesde;
          const esHasta = fechaStr === fechaHasta;
          const estaEnRango =
            fechaDesde &&
            fechaHasta &&
            fechaStr > fechaDesde &&
            fechaStr < fechaHasta;

          let bg = '#fff';
          let color = '#1f2937';
          let border = '2px solid #e5e7eb';

          if (!esMesActual) {
            bg = 'transparent';
            color = '#d1d5db';
            border = '2px solid transparent';
          } else if (deshabilitado) {
            bg = '#f3f4f6';
            color = '#9ca3af';
            border = '2px solid #f3f4f6';
          } else if (esDesde || esHasta) {
            bg = '#7c3aed';
            color = '#fff';
            border = '2px solid #7c3aed';
          } else if (estaEnRango) {
            bg = '#ede9fe';
            color = '#7c3aed';
            border = '2px solid #c4b5fd';
          }

          return (
            <button
              key={idx}
              disabled={deshabilitado}
              onClick={() => handleClickDia(fechaStr, deshabilitado)}
              style={{
                padding: '0.4rem 0.2rem',
                borderRadius: '0.5rem',
                border,
                background: bg,
                color,
                cursor: deshabilitado ? 'not-allowed' : 'pointer',
                textAlign: 'center',
                fontSize: '0.8rem',
                fontWeight: esDesde || esHasta ? 700 : 500,
                minHeight: '52px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '2px',
              }}
            >
              <span>{esMesActual ? fecha.getDate() : ''}</span>
              {esMesActual && !esPasado && servicio && (
                <span
                  style={{
                    fontSize: '0.65rem',
                    fontWeight: 600,
                    color: sinPlazas
                      ? '#ef4444'
                      : esDesde || esHasta
                      ? '#e9d5ff'
                      : '#10b981',
                  }}
                >
                  {sinPlazas ? '✗' : plazas}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Advertencia de rango con días sin plazas */}
      {hayDiasSinPlazasEnRango && (
        <div
          style={{
            marginTop: '0.75rem',
            padding: '0.75rem 1rem',
            background: '#fef3c7',
            border: '2px solid #f59e0b',
            borderRadius: '0.5rem',
            fontSize: '0.85rem',
            color: '#92400e',
          }}
        >
          ⚠️ Algún día del rango seleccionado no tiene plazas disponibles.
        </div>
      )}
    </div>
  );
}

const estiloBotonNav = {
  background: 'none',
  border: '1px solid #e5e7eb',
  borderRadius: '0.5rem',
  padding: '0.25rem 0.75rem',
  cursor: 'pointer',
  fontSize: '1rem',
  color: '#374151',
};

export default CalendarioDisponibilidad;
