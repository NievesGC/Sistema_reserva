/**
 * Formulario de datos del cliente para completar la reserva.
 * Valida campos obligatorios antes del envío y señala los pendientes.
 *
 * @param {{
 *   onSubmit: Function,
 *   loading: boolean
 * }} props
 */

import React, { useState } from 'react';

const TAMANOS = [
  { value: 'cachorro', label: 'Cachorro' },
  { value: 'pequeño', label: 'Pequeño' },
  { value: 'mediano', label: 'Mediano' },
  { value: 'grande', label: 'Grande' },
];

const CAMPOS_OBLIGATORIOS = ['nombre', 'telefono', 'email', 'nombrePerro'];

function FormularioCliente({ onSubmit, loading }) {
  const [valores, setValores] = useState({
    nombre: '',
    telefono: '',
    email: '',
    nombrePerro: '',
    raza: '',
    tamano: 'mediano',
    notas: '',
    aceptaPrivacidad: false,
  });

  /** @type {[Record<string, string>, Function]} */
  const [errores, setErrores] = useState({});

  function set(campo, valor) {
    setValores((v) => ({ ...v, [campo]: valor }));
    if (errores[campo]) {
      setErrores((e) => ({ ...e, [campo]: undefined }));
    }
  }

  function validar() {
    const nuevosErrores = {};
    CAMPOS_OBLIGATORIOS.forEach((campo) => {
      if (!valores[campo] || !valores[campo].trim()) {
        nuevosErrores[campo] = 'Este campo es obligatorio';
      }
    });
    if (valores.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valores.email)) {
      nuevosErrores.email = 'Introduce un email válido';
    }
    if (!valores.aceptaPrivacidad) {
      nuevosErrores.aceptaPrivacidad = 'Debes aceptar la política de privacidad';
    }
    return nuevosErrores;
  }

  function handleSubmit(e) {
    e.preventDefault();
    const nuevosErrores = validar();
    if (Object.keys(nuevosErrores).length > 0) {
      setErrores(nuevosErrores);
      return;
    }
    onSubmit({
      nombre_dueno: valores.nombre.trim(),
      telefono: valores.telefono.trim(),
      email: valores.email.trim(),
      nombre_perro: valores.nombrePerro.trim(),
      raza: valores.raza.trim() || undefined,
      tamano: valores.tamano,
      notas: valores.notas.trim() || undefined,
      acepta_privacidad: true,
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div style={estiloGrid}>
        <Campo
          label="👤 Tu nombre"
          obligatorio
          error={errores.nombre}
        >
          <input
            type="text"
            value={valores.nombre}
            onChange={(e) => set('nombre', e.target.value)}
            placeholder="Juan García"
            style={estiloInput(!!errores.nombre)}
          />
        </Campo>

        <Campo
          label="📱 Teléfono"
          obligatorio
          error={errores.telefono}
        >
          <input
            type="tel"
            value={valores.telefono}
            onChange={(e) => set('telefono', e.target.value)}
            placeholder="600 123 456"
            style={estiloInput(!!errores.telefono)}
          />
        </Campo>

        <Campo
          label="📧 Email"
          obligatorio
          error={errores.email}
          fullWidth
        >
          <input
            type="email"
            value={valores.email}
            onChange={(e) => set('email', e.target.value)}
            placeholder="tu@email.com"
            style={estiloInput(!!errores.email)}
          />
        </Campo>

        <Campo
          label="🐕 Nombre del perro"
          obligatorio
          error={errores.nombrePerro}
        >
          <input
            type="text"
            value={valores.nombrePerro}
            onChange={(e) => set('nombrePerro', e.target.value)}
            placeholder="Max"
            style={estiloInput(!!errores.nombrePerro)}
          />
        </Campo>

        <Campo label="🏷️ Raza" error={errores.raza}>
          <input
            type="text"
            value={valores.raza}
            onChange={(e) => set('raza', e.target.value)}
            placeholder="Labrador"
            style={estiloInput(false)}
          />
        </Campo>

        <Campo label="📏 Tamaño" fullWidth>
          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
            {TAMANOS.map((t) => (
              <label key={t.value} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="tamano"
                  value={t.value}
                  checked={valores.tamano === t.value}
                  onChange={() => set('tamano', t.value)}
                />
                {t.label}
              </label>
            ))}
          </div>
        </Campo>

        <Campo label="📝 Notas" fullWidth>
          <textarea
            value={valores.notas}
            onChange={(e) => set('notas', e.target.value)}
            rows={3}
            placeholder="Alergias, medicación, comportamiento especial..."
            style={{ ...estiloInput(false), resize: 'vertical' }}
          />
        </Campo>
      </div>

      {/* Política de privacidad */}
      <div
        style={{
          margin: '1rem 0',
          padding: '1rem',
          background: '#fffbeb',
          border: `2px solid ${errores.aceptaPrivacidad ? '#ef4444' : '#fcd34d'}`,
          borderRadius: '0.5rem',
        }}
      >
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={valores.aceptaPrivacidad}
            onChange={(e) => set('aceptaPrivacidad', e.target.checked)}
            style={{ marginTop: '2px', width: '1.1rem', height: '1.1rem', cursor: 'pointer' }}
          />
          <span style={{ fontSize: '0.9rem', color: '#374151', fontWeight: 500 }}>
            He leído y acepto la{' '}
            <span style={{ color: '#7c3aed', textDecoration: 'underline', cursor: 'pointer' }}>
              política de privacidad
            </span>{' '}
            <span style={{ color: '#ef4444' }}>*</span>
          </span>
        </label>
        {errores.aceptaPrivacidad && (
          <p style={estiloError}>{errores.aceptaPrivacidad}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={loading}
        style={{
          width: '100%',
          padding: '1rem',
          borderRadius: '0.75rem',
          border: 'none',
          background: loading ? '#9ca3af' : 'linear-gradient(135deg, #7c3aed, #ec4899)',
          color: '#fff',
          fontWeight: 700,
          fontSize: '1.1rem',
          cursor: loading ? 'not-allowed' : 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
        }}
      >
        {loading ? (
          <>
            <Spinner /> Enviando reserva...
          </>
        ) : (
          'Confirmar reserva ✓'
        )}
      </button>
    </form>
  );
}

function Campo({ label, obligatorio, error, fullWidth, children }) {
  return (
    <div style={{ gridColumn: fullWidth ? '1 / -1' : undefined }}>
      <label style={{ display: 'block', fontWeight: 700, marginBottom: '0.4rem', fontSize: '0.9rem', color: '#374151' }}>
        {label} {obligatorio && <span style={{ color: '#ef4444' }}>*</span>}
      </label>
      {children}
      {error && <p style={estiloError}>{error}</p>}
    </div>
  );
}

function Spinner() {
  return (
    <span
      style={{
        display: 'inline-block',
        width: '1rem',
        height: '1rem',
        border: '2px solid rgba(255,255,255,0.4)',
        borderTopColor: '#fff',
        borderRadius: '50%',
        animation: 'spin 0.7s linear infinite',
      }}
    />
  );
}

const estiloGrid = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '1rem',
};

/** @param {boolean} conError */
function estiloInput(conError) {
  return {
    width: '100%',
    padding: '0.75rem 1rem',
    border: `2px solid ${conError ? '#ef4444' : '#e5e7eb'}`,
    borderRadius: '0.5rem',
    fontSize: '0.95rem',
    outline: 'none',
    boxSizing: 'border-box',
    background: conError ? '#fef2f2' : '#fff',
  };
}

const estiloError = {
  color: '#ef4444',
  fontSize: '0.78rem',
  marginTop: '0.25rem',
};

export default FormularioCliente;
