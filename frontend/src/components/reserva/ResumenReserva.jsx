/**
 * Muestra el desglose de precio de la reserva y advertencia de festivos.
 *
 * @param {{
 *   servicio: string,
 *   fechaDesde: string,
 *   fechaHasta: string,
 *   tarifa: string,
 *   tramo: string,
 *   perroExtra: boolean,
 *   precios: Object|null,
 *   festivos: string[]
 * }} props
 */

import React, { useMemo } from 'react';

const NOMBRES_TRAMO = {
  mañana: 'Mañana (09:00-12:00)',
  tarde: 'Tarde (16:00-19:00)',
  completo: 'Todo el día (09:00-19:00)',
  'sin-transporte': 'Sin transporte',
  recogida: 'Solo recogida (+12€)',
  'recogida-entrega': 'Recogida + Entrega (+20€)',
};

const NOMBRES_TARIFA = {
  normal: 'Normal',
  cachorros: 'Cachorros',
};

const NOMBRES_SERVICIO = {
  paseos: 'Paseos',
  guarderia: 'Guardería',
  alojamiento: 'Alojamiento',
};

/**
 * Calcula el número de días/noches del rango.
 * @param {string} desde
 * @param {string} hasta
 * @param {string} servicio
 * @returns {number}
 */
function calcularUnidades(desde, hasta, servicio) {
  const d1 = new Date(desde + 'T00:00:00');
  const d2 = new Date(hasta + 'T00:00:00');
  const diff = Math.ceil((d2 - d1) / (1000 * 60 * 60 * 24));
  return servicio === 'alojamiento' ? diff : diff + 1;
}

/**
 * Comprueba si alguna fecha del rango es festivo.
 * @param {string} desde
 * @param {string} hasta
 * @param {string[]} festivos
 * @returns {boolean}
 */
function hayFestivosEnRango(desde, hasta, festivos) {
  if (!festivos || festivos.length === 0) return false;
  const d1 = new Date(desde + 'T00:00:00');
  const d2 = new Date(hasta + 'T00:00:00');
  const cursor = new Date(d1);
  while (cursor <= d2) {
    const key = cursor.toISOString().slice(0, 10);
    if (festivos.includes(key)) return true;
    cursor.setDate(cursor.getDate() + 1);
  }
  return false;
}

function ResumenReserva({ servicio, fechaDesde, fechaHasta, tarifa, tramo, perroExtra, precios, festivos }) {
  const desglose = useMemo(() => {
    if (!precios || !fechaDesde || !fechaHasta || !tarifa) return null;

    const unidades = calcularUnidades(fechaDesde, fechaHasta, servicio);
    const precioBase =
      (tarifa === 'normal' ? precios.precio_normal : precios.precio_cachorros) * unidades;
    const costoExtra = perroExtra ? (precios.precio_perro_extra ?? 0) * unidades : 0;
    let costoTransporte = 0;
    if (servicio === 'alojamiento') {
      if (tramo === 'recogida') costoTransporte = 12;
      else if (tramo === 'recogida-entrega') costoTransporte = 20;
    }
    const total = precioBase + costoExtra + costoTransporte;
    return { precioBase, costoExtra, costoTransporte, total, unidades };
  }, [precios, fechaDesde, fechaHasta, tarifa, tramo, perroExtra, servicio]);

  const tieneFestivos = useMemo(
    () => festivos && fechaDesde && fechaHasta && hayFestivosEnRango(fechaDesde, fechaHasta, festivos),
    [festivos, fechaDesde, fechaHasta]
  );

  const unidadLabel = servicio === 'alojamiento' ? 'noche' : 'día';

  if (!desglose) {
    return (
      <div style={estiloContenedor}>
        <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>
          Completa los pasos anteriores para ver el resumen.
        </p>
      </div>
    );
  }

  return (
    <div style={estiloContenedor}>
      <h3 style={{ fontWeight: 700, marginBottom: '1rem', color: '#1f2937' }}>📋 Resumen de la reserva</h3>

      <div style={{ fontSize: '0.9rem', color: '#374151', lineHeight: '1.8' }}>
        <p><strong>Servicio:</strong> {NOMBRES_SERVICIO[servicio] ?? servicio}</p>
        <p>
          <strong>Fechas:</strong> {fechaDesde}
          {fechaHasta && fechaHasta !== fechaDesde ? ` → ${fechaHasta}` : ''}
          {' '}({desglose.unidades} {desglose.unidades === 1 ? unidadLabel : `${unidadLabel}s`})
        </p>
        <p><strong>Tarifa:</strong> {NOMBRES_TARIFA[tarifa] ?? tarifa}</p>
        <p><strong>Horario/Transporte:</strong> {NOMBRES_TRAMO[tramo] ?? tramo}</p>
      </div>

      <hr style={{ margin: '0.75rem 0', borderColor: '#e5e7eb' }} />

      {/* Desglose de precio */}
      <div style={{ fontSize: '0.9rem', color: '#374151' }}>
        <FilaPrecio
          label={`Precio base (${desglose.unidades} ${unidadLabel}${desglose.unidades > 1 ? 's' : ''})`}
          valor={desglose.precioBase}
        />
        {desglose.costoExtra > 0 && (
          <FilaPrecio label="Perro extra" valor={desglose.costoExtra} />
        )}
        {desglose.costoTransporte > 0 && (
          <FilaPrecio label="Transporte" valor={desglose.costoTransporte} />
        )}
      </div>

      <div
        style={{
          marginTop: '0.75rem',
          paddingTop: '0.75rem',
          borderTop: '2px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span style={{ fontWeight: 700, fontSize: '1rem', color: '#1f2937' }}>TOTAL</span>
        <span style={{ fontWeight: 800, fontSize: '1.5rem', color: '#7c3aed' }}>
          {desglose.total}€
        </span>
      </div>

      {/* Advertencia festivos */}
      {tieneFestivos && (
        <div
          style={{
            marginTop: '0.75rem',
            padding: '0.6rem 0.9rem',
            background: '#fef3c7',
            border: '2px solid #f59e0b',
            borderRadius: '0.5rem',
            fontSize: '0.82rem',
            color: '#92400e',
          }}
        >
          ⚠️ El rango incluye días festivos. El precio final puede variar.
        </div>
      )}
    </div>
  );
}

function FilaPrecio({ label, valor }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
      <span>{label}</span>
      <span style={{ fontWeight: 600 }}>{valor}€</span>
    </div>
  );
}

const estiloContenedor = {
  background: 'linear-gradient(135deg, #eef2ff, #fce7f3)',
  border: '2px solid #c7d2fe',
  borderRadius: '0.75rem',
  padding: '1.25rem',
};

export default ResumenReserva;
