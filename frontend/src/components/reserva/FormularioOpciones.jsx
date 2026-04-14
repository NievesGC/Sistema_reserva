/**
 * Formulario de opciones de reserva: tarifa, tramo horario/transporte y perro extra.
 *
 * Tramos según servicio:
 *  - Paseos:      Mañana (09:00-12:00), Tarde (16:00-19:00)
 *  - Guardería:   Mañana, Tarde, Todo el día (09:00-19:00)
 *  - Alojamiento: Sin transporte, Recogida (+12€), Recogida+Entrega (+20€)
 *
 * @param {{
 *   servicio: string,
 *   precios: Object|null,
 *   valores: { tarifa: string|null, tramo: string|null, perroExtra: boolean, direccion: string },
 *   onCambio: Function
 * }} props
 */

import React from 'react';

/** @type {Record<string, { id: string, label: string, detalle?: string }[]>} */
const TRAMOS = {
  paseos: [
    { id: 'mañana', label: 'Mañana', detalle: '09:00-12:00' },
    { id: 'tarde', label: 'Tarde', detalle: '16:00-19:00' },
  ],
  guarderia: [
    { id: 'mañana', label: 'Mañana', detalle: '09:00-12:00' },
    { id: 'tarde', label: 'Tarde', detalle: '16:00-19:00' },
    { id: 'completo', label: 'Todo el día', detalle: '09:00-19:00' },
  ],
  alojamiento: [
    { id: 'sin-transporte', label: 'Sin transporte', detalle: '' },
    { id: 'recogida', label: 'Recogida', detalle: '+12€' },
    { id: 'recogida-entrega', label: 'Recogida + Entrega', detalle: '+20€' },
  ],
};

/**
 * Devuelve el precio base de la tarifa según la configuración del backend.
 * @param {Object|null} precios
 * @param {string} tarifa
 * @returns {string}
 */
function precioTarifa(precios, tarifa) {
  if (!precios) return '—';
  const valor = tarifa === 'normal' ? precios.precio_normal : precios.precio_cachorros;
  return valor !== undefined ? `${valor}€` : '—';
}

/**
 * Devuelve el precio del perro extra según la configuración del backend.
 * @param {Object|null} precios
 * @returns {string}
 */
function precioExtra(precios) {
  if (!precios || precios.precio_perro_extra === undefined) return '';
  return `+${precios.precio_perro_extra}€`;
}

function FormularioOpciones({ servicio, precios, valores, onCambio }) {
  const tramos = TRAMOS[servicio] ?? [];
  const necesitaDireccion =
    servicio === 'alojamiento' &&
    (valores.tramo === 'recogida' || valores.tramo === 'recogida-entrega');

  function set(campo, valor) {
    onCambio({ ...valores, [campo]: valor });
  }

  return (
    <div>
      {/* Tarifa */}
      <div style={{ marginBottom: '1.5rem' }}>
        <p style={estiloLabel}>💰 Tarifa</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          {['normal', 'cachorros'].map((t) => {
            const sel = valores.tarifa === t;
            return (
              <button
                key={t}
                onClick={() => set('tarifa', t)}
                style={estiloTarjeta(sel)}
              >
                <div style={{ fontWeight: 700, fontSize: '1rem', color: sel ? '#7c3aed' : '#1f2937' }}>
                  {t === 'normal' ? 'Normal' : 'Cachorros'}
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#7c3aed', margin: '0.25rem 0' }}>
                  {precioTarifa(precios, t)}
                </div>
                {t === 'cachorros' && (
                  <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Para perros &lt; 1 año</div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Perro extra */}
      <div style={{ marginBottom: '1.5rem' }}>
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.75rem 1rem',
            background: '#f5f3ff',
            borderRadius: '0.5rem',
            border: '2px solid #e5e7eb',
            cursor: 'pointer',
          }}
        >
          <input
            type="checkbox"
            checked={valores.perroExtra}
            onChange={(e) => set('perroExtra', e.target.checked)}
            style={{ width: '1.1rem', height: '1.1rem', cursor: 'pointer' }}
          />
          <span style={{ fontWeight: 600, color: '#374151' }}>
            ➕ Segundo perro{' '}
            <span style={{ color: '#7c3aed' }}>{precioExtra(precios)}</span>
          </span>
        </label>
      </div>

      {/* Tramo horario / Transporte */}
      <div style={{ marginBottom: '1.5rem' }}>
        <p style={estiloLabel}>
          {servicio === 'alojamiento' ? '🚗 Transporte' : '🕐 Horario'}
        </p>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${tramos.length}, 1fr)`,
            gap: '0.75rem',
          }}
        >
          {tramos.map((tr) => {
            const sel = valores.tramo === tr.id;
            return (
              <button
                key={tr.id}
                onClick={() => set('tramo', tr.id)}
                style={estiloTarjeta(sel)}
              >
                <div style={{ fontWeight: 700, color: sel ? '#7c3aed' : '#1f2937' }}>
                  {tr.label}
                </div>
                {tr.detalle && (
                  <div style={{ fontSize: '0.8rem', color: sel ? '#7c3aed' : '#6b7280', marginTop: '0.25rem' }}>
                    {tr.detalle}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Dirección de recogida (solo cuando aplica) */}
      {necesitaDireccion && (
        <div style={{ marginBottom: '1rem' }}>
          <label style={estiloLabel}>
            📍 Dirección de recogida <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <input
            type="text"
            value={valores.direccion}
            onChange={(e) => set('direccion', e.target.value)}
            placeholder="Calle, número, ciudad..."
            style={estiloInput}
          />
        </div>
      )}
    </div>
  );
}

const estiloLabel = {
  fontWeight: 700,
  marginBottom: '0.75rem',
  color: '#374151',
  fontSize: '0.9rem',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

const estiloInput = {
  width: '100%',
  padding: '0.75rem 1rem',
  border: '2px solid #e5e7eb',
  borderRadius: '0.5rem',
  fontSize: '0.95rem',
  outline: 'none',
  boxSizing: 'border-box',
};

/** @param {boolean} sel */
function estiloTarjeta(sel) {
  return {
    padding: '1rem',
    borderRadius: '0.75rem',
    border: sel ? '2px solid #7c3aed' : '2px solid #e5e7eb',
    background: sel ? 'linear-gradient(135deg, #ede9fe, #fce7f3)' : '#fff',
    cursor: 'pointer',
    textAlign: 'center',
    boxShadow: sel ? '0 4px 12px rgba(124,58,237,0.15)' : '0 1px 3px rgba(0,0,0,0.06)',
    transition: 'all 0.15s ease',
  };
}

export default FormularioOpciones;
