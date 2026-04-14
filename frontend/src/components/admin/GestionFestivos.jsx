/**
 * Gestión de días festivos: listado, alta y eliminación con confirmación.
 *
 * @module GestionFestivos
 */

import React, { useState, useEffect, useCallback } from 'react';
import { getFestivos, addFestivo, deleteFestivo } from '../../services/api';

function GestionFestivos() {
  const [festivos, setFestivos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [mensaje, setMensaje] = useState(null);

  // Formulario de nuevo festivo
  const [nuevaFecha, setNuevaFecha] = useState('');
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [erroresForm, setErroresForm] = useState({});

  // Confirmación de eliminación
  const [confirmarEliminar, setConfirmarEliminar] = useState(null); // id

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await getFestivos();
    setLoading(false);
    if (err) {
      setError(err);
    } else {
      const lista = Array.isArray(data) ? data : data?.festivos ?? [];
      setFestivos(lista);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function handleAnadir(e) {
    e.preventDefault();
    const errs = {};
    if (!nuevaFecha) errs.fecha = 'La fecha es obligatoria';
    if (!nuevoNombre.trim()) errs.nombre = 'El nombre es obligatorio';
    if (Object.keys(errs).length > 0) {
      setErroresForm(errs);
      return;
    }
    setGuardando(true);
    setMensaje(null);
    const { error: err } = await addFestivo({ fecha: nuevaFecha, nombre: nuevoNombre.trim() });
    setGuardando(false);
    if (err) {
      setMensaje({ tipo: 'error', texto: err });
    } else {
      setNuevaFecha('');
      setNuevoNombre('');
      setErroresForm({});
      setMensaje({ tipo: 'ok', texto: 'Festivo añadido correctamente.' });
      await cargar();
    }
  }

  async function handleEliminar(id) {
    if (confirmarEliminar !== id) {
      setConfirmarEliminar(id);
      return;
    }
    setMensaje(null);
    const { error: err } = await deleteFestivo(id);
    if (err) {
      setMensaje({ tipo: 'error', texto: err });
    } else {
      setMensaje({ tipo: 'ok', texto: 'Festivo eliminado.' });
      await cargar();
    }
    setConfirmarEliminar(null);
  }

  return (
    <div>
      <h2 style={estiloTitulo}>Gestión de festivos</h2>

      {/* Formulario de alta */}
      <div
        style={{
          background: '#f9fafb',
          border: '2px solid #e5e7eb',
          borderRadius: '0.75rem',
          padding: '1.25rem',
          marginBottom: '1.5rem',
          maxWidth: '480px',
        }}
      >
        <h3 style={{ fontWeight: 700, marginBottom: '1rem', fontSize: '1rem', color: '#374151' }}>
          ➕ Añadir festivo
        </h3>
        <form onSubmit={handleAnadir}>
          <div style={{ display: 'grid', gap: '0.75rem', marginBottom: '1rem' }}>
            <div>
              <label style={estiloLabel}>Fecha <span style={{ color: '#ef4444' }}>*</span></label>
              <input
                type="date"
                value={nuevaFecha}
                onChange={(e) => { setNuevaFecha(e.target.value); setErroresForm((er) => ({ ...er, fecha: undefined })); }}
                style={{ ...estiloInput, borderColor: erroresForm.fecha ? '#ef4444' : '#e5e7eb' }}
              />
              {erroresForm.fecha && <p style={estiloErrorCampo}>{erroresForm.fecha}</p>}
            </div>
            <div>
              <label style={estiloLabel}>Nombre <span style={{ color: '#ef4444' }}>*</span></label>
              <input
                type="text"
                value={nuevoNombre}
                onChange={(e) => { setNuevoNombre(e.target.value); setErroresForm((er) => ({ ...er, nombre: undefined })); }}
                placeholder="Ej: Navidad"
                style={{ ...estiloInput, borderColor: erroresForm.nombre ? '#ef4444' : '#e5e7eb' }}
              />
              {erroresForm.nombre && <p style={estiloErrorCampo}>{erroresForm.nombre}</p>}
            </div>
          </div>
          <button
            type="submit"
            disabled={guardando}
            style={{
              padding: '0.6rem 1.25rem',
              border: 'none',
              borderRadius: '0.5rem',
              background: guardando ? '#9ca3af' : '#7c3aed',
              color: '#fff',
              fontWeight: 700,
              cursor: guardando ? 'not-allowed' : 'pointer',
            }}
          >
            {guardando ? 'Guardando...' : 'Añadir festivo'}
          </button>
        </form>
      </div>

      {/* Mensajes */}
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

      {error && <div style={estiloError}>❌ {error}</div>}
      {loading && <p style={{ color: '#6b7280' }}>Cargando festivos...</p>}

      {/* Listado */}
      {!loading && festivos.length === 0 && (
        <p style={{ color: '#6b7280' }}>No hay festivos registrados.</p>
      )}

      {!loading && festivos.length > 0 && (
        <div style={{ display: 'grid', gap: '0.5rem', maxWidth: '560px' }}>
          {festivos.map((f) => (
            <div
              key={f.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 1rem',
                background: '#fff',
                border: '2px solid #e5e7eb',
                borderRadius: '0.5rem',
              }}
            >
              <div>
                <span style={{ fontWeight: 700, color: '#374151' }}>{f.nombre}</span>
                <span style={{ marginLeft: '0.75rem', color: '#6b7280', fontSize: '0.85rem' }}>{f.fecha}</span>
              </div>
              <button
                onClick={() => handleEliminar(f.id)}
                style={{
                  padding: '0.3rem 0.75rem',
                  border: 'none',
                  borderRadius: '0.4rem',
                  background: confirmarEliminar === f.id ? '#ef4444' : '#fee2e2',
                  color: confirmarEliminar === f.id ? '#fff' : '#b91c1c',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                }}
              >
                {confirmarEliminar === f.id ? '¿Confirmar?' : '🗑️ Eliminar'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const estiloTitulo = { fontWeight: 800, fontSize: '1.3rem', color: '#1f2937', marginBottom: '1rem' };
const estiloLabel = { display: 'block', fontWeight: 600, marginBottom: '0.3rem', fontSize: '0.85rem', color: '#374151' };
const estiloInput = { width: '100%', padding: '0.6rem 0.9rem', border: '2px solid #e5e7eb', borderRadius: '0.5rem', fontSize: '0.9rem', boxSizing: 'border-box' };
const estiloError = { padding: '0.75rem', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '0.5rem', color: '#b91c1c', fontSize: '0.85rem', marginBottom: '1rem' };
const estiloErrorCampo = { color: '#ef4444', fontSize: '0.75rem', marginTop: '0.2rem' };

export default GestionFestivos;
