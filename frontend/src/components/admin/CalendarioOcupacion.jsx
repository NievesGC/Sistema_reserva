/**
 * Vista mensual de ocupación por servicio para el panel de administración.
 * Colores: verde (disponible), amarillo (parcial), rojo (lleno), gris (bloqueado).
 * Permite bloquear/desbloquear días.
 *
 * @module CalendarioOcupacion
 */

import React, { useState, useEffect, useCallback } from 'react';
import { getDisponibilidad, bloquearDia, desbloquearDia } from '../../services/api';

const SERVICIOS = ['paseos', 'guarderia', 'alojamiento'];
const DIAS_SEMANA = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

/** Devuelve el mes actual en formato YYYY-MM */
function mesActual() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** @param {Date} fecha @returns {string} */
function formatearFecha(fecha) {
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
}

/** Genera los días del mes con relleno de semana */
function generarDiasMes(anio, mes) {
  const primerDia = new Date(anio, mes, 1);
  const ultimoDia = new Date(anio, mes + 1, 0);
  const dias = [];
  const diaSemana = primerDia.getDay();
  const relleno = diaSemana === 0 ? 6 : diaSemana - 1;
  for (let i = relleno; i > 0; i--) {
    dias.push({ fecha: new Date(anio, mes, 1 - i), esMesActual: false });
  }
  for (let d = new Date(primerDia); d <= ultimoDia; d.setDate(d.getDate() + 1)) {
    dias.push({ fecha: new Date(d), esMesActual: true });
  }
  return dias;
}

/**
 * Determina el color de ocupación de un día.
 * @param {{ bloqueado: boolean, plazas_libres: number, plazas_maximas: number }|undefined} item
 * @returns {{ bg: string, color: string, label: string }}
 */
function colorOcupacion(item) {
  if (!item) return { bg: '#f0fdf4', color: '#166534', label: 'Libre' };
  if (item.bloqueado) return { bg: '#f3f4f6', color: '#6b7280', label: 'Bloqueado' };
  const libres = item.plazas_libres ?? 0;
  const max = item.plazas_maximas ?? 1;
  const ratio = libres / max;
  if (libres === 0) return { bg: '#fef2f2', color: '#b91c1c', label: 'Lleno' };
  if (ratio < 0.5) return { bg: '#fef3c7', color: '#92400e', label: 'Parcial' };
  return { bg: '#f0fdf4', color: '#166534', label: 'Disponible' };
}

function CalendarioOcupacion() {
  const [mes, setMes] = useState(mesActual());
  const [servicio, setServicio] = useState('paseos');
  const [disponibilidad, setDisponibilidad] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [accionando, setAccionando] = useState(null); // fecha en proceso

  const [anio, mesNum] = mes.split('-').map(Number);
  const dias = generarDiasMes(anio, mesNum - 1);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await getDisponibilidad(servicio, mes);
    if (err) {
      setError(err);
    } else {
      setDisponibilidad(data);
    }
    setLoading(false);
  }, [servicio, mes]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  function mesAnterior() {
    const d = new Date(anio, mesNum - 2, 1);
    setMes(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }

  function mesSiguiente() {
    const d = new Date(anio, mesNum, 1);
    setMes(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }

  async function toggleBloqueo(fechaStr, estaBloqueado) {
    setAccionando(fechaStr);
    setError(null);
    const accion = estaBloqueado ? desbloquearDia : bloquearDia;
    const { error: err } = await accion(servicio, fechaStr);
    if (err) setError(err);
    else await cargar();
    setAccionando(null);
  }

  const nombreMes = new Date(anio, mesNum - 1, 1).toLocaleDateString('es-ES', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div>
      <h2 style={estiloTitulo}>Calendario de ocupación</h2>

      {/* Controles */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <select
          value={servicio}
          onChange={(e) => setServicio(e.target.value)}
          style={estiloSelect}
        >
          {SERVICIOS.map((s) => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button onClick={mesAnterior} style={estiloBotonNav}>←</button>
          <span style={{ fontWeight: 700, textTransform: 'capitalize', minWidth: '160px', textAlign: 'center' }}>
            {nombreMes}
          </span>
          <button onClick={mesSiguiente} style={estiloBotonNav}>→</button>
        </div>
      </div>

      {/* Leyenda */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap', fontSize: '0.8rem' }}>
        {[
          { bg: '#f0fdf4', color: '#166534', label: 'Disponible' },
          { bg: '#fef3c7', color: '#92400e', label: 'Parcial' },
          { bg: '#fef2f2', color: '#b91c1c', label: 'Lleno' },
          { bg: '#f3f4f6', color: '#6b7280', label: 'Bloqueado' },
        ].map((l) => (
          <span key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: l.bg, border: `1px solid ${l.color}`, display: 'inline-block' }} />
            <span style={{ color: '#374151' }}>{l.label}</span>
          </span>
        ))}
      </div>

      {error && <div style={estiloError}>❌ {error}</div>}
      {loading && <p style={{ color: '#6b7280' }}>Cargando...</p>}

      {/* Cuadrícula */}
      {!loading && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '4px' }}>
            {DIAS_SEMANA.map((d) => (
              <div key={d} style={{ textAlign: 'center', fontWeight: 700, fontSize: '0.75rem', color: '#7c3aed', padding: '0.25rem' }}>
                {d}
              </div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
            {dias.map(({ fecha, esMesActual }, idx) => {
              if (!esMesActual) {
                return <div key={idx} />;
              }
              const fechaStr = formatearFecha(fecha);
              const item = disponibilidad?.[fechaStr];
              const { bg, color, label } = colorOcupacion(item);
              const estaBloqueado = item?.bloqueado ?? false;
              const enProceso = accionando === fechaStr;

              return (
                <div
                  key={idx}
                  style={{
                    background: bg,
                    border: `1px solid ${color}`,
                    borderRadius: '0.5rem',
                    padding: '0.4rem',
                    textAlign: 'center',
                    fontSize: '0.75rem',
                    minHeight: '64px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '2px',
                  }}
                >
                  <span style={{ fontWeight: 700, color }}>{fecha.getDate()}</span>
                  <span style={{ color, fontSize: '0.65rem' }}>{label}</span>
                  {item && !item.bloqueado && (
                    <span style={{ color: '#6b7280', fontSize: '0.65rem' }}>
                      {item.plazas_libres ?? 0} libres
                    </span>
                  )}
                  <button
                    onClick={() => toggleBloqueo(fechaStr, estaBloqueado)}
                    disabled={enProceso}
                    style={{
                      fontSize: '0.6rem',
                      padding: '1px 5px',
                      border: 'none',
                      borderRadius: '3px',
                      cursor: enProceso ? 'not-allowed' : 'pointer',
                      background: estaBloqueado ? '#10b981' : '#ef4444',
                      color: '#fff',
                      fontWeight: 600,
                    }}
                  >
                    {enProceso ? '...' : estaBloqueado ? 'Desbloquear' : 'Bloquear'}
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

const estiloTitulo = { fontWeight: 800, fontSize: '1.3rem', color: '#1f2937', marginBottom: '1rem' };
const estiloSelect = { padding: '0.5rem 0.75rem', border: '2px solid #e5e7eb', borderRadius: '0.5rem', fontSize: '0.9rem', background: '#fff', cursor: 'pointer' };
const estiloBotonNav = { padding: '0.4rem 0.75rem', border: '1px solid #e5e7eb', borderRadius: '0.5rem', background: '#fff', cursor: 'pointer', fontSize: '1rem' };
const estiloError = { padding: '0.75rem', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '0.5rem', color: '#b91c1c', fontSize: '0.85rem', marginBottom: '1rem' };

export default CalendarioOcupacion;
