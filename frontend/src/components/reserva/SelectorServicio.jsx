/**
 * Muestra tres tarjetas de servicio: Paseos, Guardería y Alojamiento.
 * Resalta la tarjeta seleccionada.
 *
 * @param {{ servicioSeleccionado: string|null, onSeleccionar: Function }} props
 */

import React from 'react';

const SERVICIOS = [
  {
    id: 'paseos',
    nombre: 'Paseos',
    descripcion: 'Paseos diarios con tu perro',
    emoji: '🐕',
  },
  {
    id: 'guarderia',
    nombre: 'Guardería',
    descripcion: 'Cuidado diurno en nuestras instalaciones',
    emoji: '🏠',
  },
  {
    id: 'alojamiento',
    nombre: 'Alojamiento',
    descripcion: 'Estancia completa con nosotros',
    emoji: '🌙',
  },
];

function SelectorServicio({ servicioSeleccionado, onSeleccionar }) {
  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <p style={{ fontWeight: 700, marginBottom: '1rem', color: '#374151' }}>
        Tipo de servicio
      </p>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '1rem',
        }}
      >
        {SERVICIOS.map((s) => {
          const seleccionado = servicioSeleccionado === s.id;
          return (
            <button
              key={s.id}
              onClick={() => onSeleccionar(s.id)}
              style={{
                padding: '1.25rem',
                borderRadius: '0.75rem',
                border: seleccionado ? '2px solid #7c3aed' : '2px solid #e5e7eb',
                background: seleccionado
                  ? 'linear-gradient(135deg, #ede9fe, #fce7f3)'
                  : '#fff',
                cursor: 'pointer',
                textAlign: 'left',
                boxShadow: seleccionado
                  ? '0 4px 12px rgba(124,58,237,0.2)'
                  : '0 1px 4px rgba(0,0,0,0.06)',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>
                {s.emoji}
              </div>
              <div
                style={{
                  fontWeight: 700,
                  fontSize: '1rem',
                  color: seleccionado ? '#7c3aed' : '#1f2937',
                  marginBottom: '0.25rem',
                }}
              >
                {s.nombre}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                {s.descripcion}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default SelectorServicio;
