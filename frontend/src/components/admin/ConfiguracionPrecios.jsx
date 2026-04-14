/**
 * Formulario de configuración de precios por servicio.
 * Permite guardar cambios y restablecer valores con confirmación.
 *
 * @module ConfiguracionPrecios
 */

import React, { useState, useEffect } from 'react';
import { getPrecios, actualizarPrecios } from '../../services/api';

const SERVICIOS = ['paseos', 'guarderia', 'alojamiento'];

const CAMPOS = [
  { key: 'precio_normal', label: 'Precio Normal (€/día)' },
  { key: 'precio_cachorros', label: 'Precio Cachorros (€/día)' },
  { key: 'precio_festivo', label: 'Precio Festivo (€/día)' },
  { key: 'precio_perro_extra', label: 'Perro Extra (€/día)' },
  { key: 'plazas_maximas', label: 'Plazas máximas' },
];

function ConfiguracionPrecios() {
  const [servicioActivo, setServicioActivo] = useState('paseos');
  const [valores, setValores] = useState({});
  const [valoresOriginales, setValoresOriginales] = useState({});
  const [loading, setLoading] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState(null); // { tipo: 'ok'|'error', texto }
  const [confirmarReset, setConfirmarReset] = useState(false);

  useEffect(() => {
    cargarPrecios(servicioActivo);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [servicioActivo]);

  async function cargarPrecios(servicio) {
    setLoading(true);
    setMensaje(null);
    const { data, error } = await getPrecios(servicio);
    setLoading(false);
    if (error) {
      setMensaje({ tipo: 'error', texto: error });
    } else if (data) {
      setValores({ ...data });
      setValoresOriginales({ ...data });
    }
  }

  function set(campo, valor) {
    setValores((v) => ({ ...v, [campo]: valor }));
  }

  async function handleGuardar() {
    setGuardando(true);
    setMensaje(null);
    const { error } = await actualizarPrecios({ servicio: servicioActivo, ...valores });
    setGuardando(false);
    if (error) {
      setMensaje({ tipo: 'error', texto: error });
    } else {
      setValoresOriginales({ ...valores });
      setMensaje({ tipo: 'ok', texto: 'Precios guardados correctamente.' });
    }
  }

  function handleReset() {
    if (!confirmarReset) {
      setConfirmarReset(true);
      return;
    }
    setValores({ ...valoresOriginales });
    setConfirmarReset(false);
    setMensaje({ tipo: 'ok', texto: 'Valores restablecidos.' });
  }

  return (
    <div>
      <h2 style={estiloTitulo}>Configuración de precios</h2>

      {/* Tabs de servicio */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        {SERVICIOS.map((s) => (
          <button
            key={s}
            onClick={() => { setServicioActivo(s); setConfirmarReset(false); }}
            style={{
              padding: '0.5rem 1rem',
              border: 'none',
              borderRadius: '0.5rem',
              background: servicioActivo === s ? '#7c3aed' : '#e5e7eb',
              color: servicioActivo === s ? '#fff' : '#374151',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '0.9rem',
            }}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {loading && <p style={{ color: '#6b7280' }}>Cargando precios...</p>}

      {!loading && (
        <div style={{ maxWidth: '480px' }}>
          <div style={{ display: 'grid', gap: '1rem', marginBottom: '1.5rem' }}>
            {CAMPOS.map(({ key, label }) => (
              <div key={key}>
                <label style={estiloLabel}>{label}</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={valores[key] ?? ''}
                  onChange={(e) => set(key, parseFloat(e.target.value) || 0)}
                  style={estiloInput}
                />
              </div>
            ))}
          </div>

          {mensaje && (
            <div
              style={{
                marginBottom: '1rem',
                padding: '0.75rem',
                background: mensaje.tipo === 'ok' ? '#f0fdf4' : '#fef2f2',
                border: `1px solid ${mensaje.tipo === 'ok' ? '#bbf7d0' : '#fca5a5'}`,
                borderRadius: '0.5rem',
                color: mensaje.tipo === 'ok' ? '#166534' : '#b91c1c',
                fontSize: '0.85rem',
              }}
            >
              {mensaje.tipo === 'ok' ? '✅' : '❌'} {mensaje.texto}
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              onClick={handleGuardar}
              disabled={guardando}
              style={{
                padding: '0.75rem 1.5rem',
                border: 'none',
                borderRadius: '0.5rem',
                background: guardando ? '#9ca3af' : '#7c3aed',
                color: '#fff',
                fontWeight: 700,
                cursor: guardando ? 'not-allowed' : 'pointer',
              }}
            >
              {guardando ? 'Guardando...' : 'Guardar cambios'}
            </button>
            <button
              onClick={handleReset}
              style={{
                padding: '0.75rem 1.5rem',
                border: '2px solid #e5e7eb',
                borderRadius: '0.5rem',
                background: confirmarReset ? '#fef2f2' : '#fff',
                color: confirmarReset ? '#b91c1c' : '#374151',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {confirmarReset ? '¿Confirmar reset?' : 'Restablecer'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const estiloTitulo = { fontWeight: 800, fontSize: '1.3rem', color: '#1f2937', marginBottom: '1rem' };
const estiloLabel = { display: 'block', fontWeight: 600, marginBottom: '0.3rem', fontSize: '0.85rem', color: '#374151' };
const estiloInput = { width: '100%', padding: '0.6rem 0.9rem', border: '2px solid #e5e7eb', borderRadius: '0.5rem', fontSize: '0.95rem', boxSizing: 'border-box' };

export default ConfiguracionPrecios;
