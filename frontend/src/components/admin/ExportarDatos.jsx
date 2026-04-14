/**
 * Panel de exportación de reservas.
 * Filtros: rango de fechas, servicio, estado.
 * Contador de registros a exportar.
 * Botones: CSV, Excel, PDF.
 *
 * @module ExportarDatos
 */

import React, { useState, useEffect, useCallback } from 'react';
import { getReservas, exportarReservas } from '../../services/api';

const SERVICIOS = ['', 'paseos', 'guarderia', 'alojamiento'];
const ESTADOS = ['', 'pendiente', 'confirmada', 'rechazada', 'cancelada'];

function ExportarDatos() {
  const [filtros, setFiltros] = useState({
    fecha_desde: '',
    fecha_hasta: '',
    servicio: '',
    estado: '',
  });
  const [conteo, setConteo] = useState(null);
  const [cargandoConteo, setCargandoConteo] = useState(false);
  const [descargando, setDescargando] = useState(null); // 'csv'|'excel'|'pdf'
  const [error, setError] = useState(null);

  const actualizarConteo = useCallback(async () => {
    setCargandoConteo(true);
    setError(null);
    const params = {};
    if (filtros.fecha_desde) params.fecha_desde = filtros.fecha_desde;
    if (filtros.fecha_hasta) params.fecha_hasta = filtros.fecha_hasta;
    if (filtros.servicio) params.servicio = filtros.servicio;
    if (filtros.estado) params.estado = filtros.estado;

    const { data, error: err } = await getReservas(params);
    setCargandoConteo(false);
    if (err) {
      setError(err);
      setConteo(null);
    } else {
      const lista = Array.isArray(data) ? data : data?.reservas ?? [];
      setConteo(lista.length);
    }
  }, [filtros]);

  useEffect(() => {
    actualizarConteo();
  }, [actualizarConteo]);

  function setFiltro(campo, valor) {
    setFiltros((f) => ({ ...f, [campo]: valor }));
  }

  async function handleExportar(formato) {
    setDescargando(formato);
    setError(null);

    const params = { formato };
    if (filtros.fecha_desde) params.fecha_desde = filtros.fecha_desde;
    if (filtros.fecha_hasta) params.fecha_hasta = filtros.fecha_hasta;
    if (filtros.servicio) params.servicio = filtros.servicio;
    if (filtros.estado) params.estado = filtros.estado;

    const response = await exportarReservas(params);
    setDescargando(null);

    if (!response || !response.ok) {
      setError('No se pudo descargar el archivo. Inténtalo de nuevo.');
      return;
    }

    // Descargar el blob
    const blob = await response.blob();
    const extensiones = { csv: 'csv', excel: 'xlsx', pdf: 'pdf' };
    const ext = extensiones[formato] ?? formato;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reservas_${new Date().toISOString().slice(0, 10)}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <h2 style={estiloTitulo}>Exportar reservas</h2>

      {/* Filtros */}
      <div
        style={{
          background: '#f9fafb',
          border: '2px solid #e5e7eb',
          borderRadius: '0.75rem',
          padding: '1.25rem',
          marginBottom: '1.5rem',
          maxWidth: '600px',
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <label style={estiloLabel}>Fecha desde</label>
            <input
              type="date"
              value={filtros.fecha_desde}
              onChange={(e) => setFiltro('fecha_desde', e.target.value)}
              style={estiloInput}
            />
          </div>
          <div>
            <label style={estiloLabel}>Fecha hasta</label>
            <input
              type="date"
              value={filtros.fecha_hasta}
              onChange={(e) => setFiltro('fecha_hasta', e.target.value)}
              style={estiloInput}
            />
          </div>
          <div>
            <label style={estiloLabel}>Servicio</label>
            <select
              value={filtros.servicio}
              onChange={(e) => setFiltro('servicio', e.target.value)}
              style={estiloInput}
            >
              <option value="">Todos</option>
              {SERVICIOS.filter(Boolean).map((s) => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={estiloLabel}>Estado</label>
            <select
              value={filtros.estado}
              onChange={(e) => setFiltro('estado', e.target.value)}
              style={estiloInput}
            >
              <option value="">Todos</option>
              {ESTADOS.filter(Boolean).map((e) => (
                <option key={e} value={e}>{e.charAt(0).toUpperCase() + e.slice(1)}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Contador */}
        <div
          style={{
            padding: '0.75rem 1rem',
            background: '#ede9fe',
            borderRadius: '0.5rem',
            fontSize: '0.9rem',
            color: '#5b21b6',
            fontWeight: 600,
          }}
        >
          {cargandoConteo
            ? '⏳ Calculando registros...'
            : conteo !== null
            ? `📊 ${conteo} reserva${conteo !== 1 ? 's' : ''} a exportar`
            : '—'}
        </div>
      </div>

      {error && <div style={estiloError}>❌ {error}</div>}

      {/* Botones de exportación */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        <BotonExportar
          formato="csv"
          label="📄 CSV"
          color="#059669"
          onClick={() => handleExportar('csv')}
          cargando={descargando === 'csv'}
        />
        <BotonExportar
          formato="excel"
          label="📊 Excel"
          color="#1d4ed8"
          onClick={() => handleExportar('excel')}
          cargando={descargando === 'excel'}
        />
        <BotonExportar
          formato="pdf"
          label="📑 PDF"
          color="#b91c1c"
          onClick={() => handleExportar('pdf')}
          cargando={descargando === 'pdf'}
        />
      </div>

      <p style={{ marginTop: '1rem', fontSize: '0.8rem', color: '#9ca3af' }}>
        Los archivos se descargarán automáticamente en tu dispositivo.
      </p>
    </div>
  );
}

function BotonExportar({ label, color, onClick, cargando }) {
  return (
    <button
      onClick={onClick}
      disabled={cargando}
      style={{
        padding: '0.75rem 1.5rem',
        border: 'none',
        borderRadius: '0.5rem',
        background: cargando ? '#9ca3af' : color,
        color: '#fff',
        fontWeight: 700,
        cursor: cargando ? 'not-allowed' : 'pointer',
        fontSize: '0.95rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.4rem',
      }}
    >
      {cargando ? 'Descargando...' : label}
    </button>
  );
}

const estiloTitulo = { fontWeight: 800, fontSize: '1.3rem', color: '#1f2937', marginBottom: '1rem' };
const estiloLabel = { display: 'block', fontWeight: 600, marginBottom: '0.3rem', fontSize: '0.85rem', color: '#374151' };
const estiloInput = { width: '100%', padding: '0.6rem 0.9rem', border: '2px solid #e5e7eb', borderRadius: '0.5rem', fontSize: '0.9rem', boxSizing: 'border-box', background: '#fff' };
const estiloError = { padding: '0.75rem', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '0.5rem', color: '#b91c1c', fontSize: '0.85rem', marginBottom: '1rem' };

export default ExportarDatos;
