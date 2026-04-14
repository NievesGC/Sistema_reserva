/**
 * Listado de reservas con filtros, detalle y acciones de gestión.
 *
 * @module ListaReservas
 */

import React, { useState } from 'react';
import useReservas from '../../hooks/useReservas';

const ESTADOS = ['', 'pendiente', 'confirmada', 'rechazada', 'cancelada'];
const SERVICIOS = ['', 'paseos', 'guarderia', 'alojamiento'];

const ETIQUETA_ESTADO = {
  pendiente: { label: 'Pendiente', color: '#f59e0b', bg: '#fffbeb' },
  confirmada: { label: 'Confirmada', color: '#10b981', bg: '#f0fdf4' },
  rechazada: { label: 'Rechazada', color: '#ef4444', bg: '#fef2f2' },
  cancelada: { label: 'Cancelada', color: '#6b7280', bg: '#f9fafb' },
};

function ListaReservas() {
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroServicio, setFiltroServicio] = useState('');
  const [reservaDetalle, setReservaDetalle] = useState(null);
  const [reservaEditar, setReservaEditar] = useState(null);
  const [accionError, setAccionError] = useState(null);

  const filtros = {};
  if (filtroEstado) filtros.estado = filtroEstado;
  if (filtroServicio) filtros.servicio = filtroServicio;

  const { reservas, loading, error, recargar, confirmar, rechazar, cancelar, modificar } =
    useReservas(filtros);

  const pendientes = reservas.filter((r) => r.estado === 'pendiente').length;

  async function ejecutar(accion, id) {
    setAccionError(null);
    await accion(id);
    setReservaDetalle(null);
    recargar();
  }

  async function handleModificar(id, datos) {
    setAccionError(null);
    await modificar(id, datos);
    setReservaEditar(null);
    recargar();
  }

  return (
    <div>
      {/* Header con contador */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <h2 style={estiloTitulo}>
          Reservas
          {pendientes > 0 && (
            <span
              style={{
                marginLeft: '0.75rem',
                background: '#ef4444',
                color: '#fff',
                borderRadius: '9999px',
                padding: '0.1rem 0.6rem',
                fontSize: '0.8rem',
                fontWeight: 700,
              }}
            >
              {pendientes} pendiente{pendientes > 1 ? 's' : ''}
            </span>
          )}
        </h2>
        <button onClick={recargar} style={estiloBotonSecundario}>↻ Actualizar</button>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
          style={estiloSelect}
        >
          <option value="">Todos los estados</option>
          {ESTADOS.filter(Boolean).map((e) => (
            <option key={e} value={e}>{e.charAt(0).toUpperCase() + e.slice(1)}</option>
          ))}
        </select>
        <select
          value={filtroServicio}
          onChange={(e) => setFiltroServicio(e.target.value)}
          style={estiloSelect}
        >
          <option value="">Todos los servicios</option>
          {SERVICIOS.filter(Boolean).map((s) => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
      </div>

      {/* Errores */}
      {(error || accionError) && (
        <div style={estiloError}>❌ {error || accionError}</div>
      )}

      {/* Loading */}
      {loading && <p style={{ color: '#6b7280' }}>Cargando reservas...</p>}

      {/* Tabla */}
      {!loading && reservas.length === 0 && (
        <p style={{ color: '#6b7280', textAlign: 'center', padding: '2rem' }}>
          No hay reservas con los filtros seleccionados.
        </p>
      )}

      {!loading && reservas.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                {['ID', 'Cliente', 'Servicio', 'Fechas', 'Estado', 'Total', 'Acciones'].map((h) => (
                  <th key={h} style={estiloTh}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {reservas.map((r) => {
                const est = ETIQUETA_ESTADO[r.estado] ?? { label: r.estado, color: '#6b7280', bg: '#f9fafb' };
                return (
                  <tr
                    key={r.id}
                    style={{ borderBottom: '1px solid #e5e7eb', cursor: 'pointer' }}
                    onClick={() => setReservaDetalle(r)}
                  >
                    <td style={estiloTd}>{String(r.id).slice(0, 8)}…</td>
                    <td style={estiloTd}>{r.nombre_dueno}</td>
                    <td style={estiloTd}>{r.servicio}</td>
                    <td style={estiloTd}>{r.fecha_desde} → {r.fecha_hasta}</td>
                    <td style={estiloTd}>
                      <span
                        style={{
                          padding: '0.2rem 0.6rem',
                          borderRadius: '9999px',
                          background: est.bg,
                          color: est.color,
                          fontWeight: 600,
                          fontSize: '0.8rem',
                        }}
                      >
                        {est.label}
                      </span>
                    </td>
                    <td style={estiloTd}>{r.precio_total}€</td>
                    <td style={{ ...estiloTd, whiteSpace: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
                      {r.estado === 'pendiente' && (
                        <>
                          <button
                            onClick={() => ejecutar(confirmar, r.id)}
                            style={{ ...estiloBotonAccion, background: '#10b981', color: '#fff' }}
                          >
                            ✓ Confirmar
                          </button>
                          <button
                            onClick={() => ejecutar(rechazar, r.id)}
                            style={{ ...estiloBotonAccion, background: '#ef4444', color: '#fff' }}
                          >
                            ✗ Rechazar
                          </button>
                        </>
                      )}
                      {r.estado === 'confirmada' && (
                        <>
                          <button
                            onClick={() => setReservaEditar(r)}
                            style={{ ...estiloBotonAccion, background: '#3b82f6', color: '#fff' }}
                          >
                            ✏️ Modificar
                          </button>
                          <button
                            onClick={() => ejecutar(cancelar, r.id)}
                            style={{ ...estiloBotonAccion, background: '#6b7280', color: '#fff' }}
                          >
                            Cancelar
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal detalle */}
      {reservaDetalle && (
        <Modal onClose={() => setReservaDetalle(null)} titulo="Detalle de reserva">
          <DetalleReserva reserva={reservaDetalle} />
        </Modal>
      )}

      {/* Modal edición */}
      {reservaEditar && (
        <Modal onClose={() => setReservaEditar(null)} titulo="Modificar reserva">
          <FormularioEdicion
            reserva={reservaEditar}
            onGuardar={(datos) => handleModificar(reservaEditar.id, datos)}
            onCancelar={() => setReservaEditar(null)}
          />
        </Modal>
      )}
    </div>
  );
}

// ── Subcomponentes ────────────────────────────────────────────────────────────

function DetalleReserva({ reserva }) {
  const campos = [
    ['ID', reserva.id],
    ['Servicio', reserva.servicio],
    ['Fecha desde', reserva.fecha_desde],
    ['Fecha hasta', reserva.fecha_hasta],
    ['Tarifa', reserva.tarifa],
    ['Tramo', reserva.tramo_horario],
    ['Perro extra', reserva.perro_extra ? 'Sí' : 'No'],
    ['Estado', reserva.estado],
    ['Total', `${reserva.precio_total}€`],
    ['Cliente', reserva.nombre_dueno],
    ['Teléfono', reserva.telefono],
    ['Email', reserva.email],
    ['Dirección', reserva.direccion || '—'],
    ['Perro', reserva.nombre_perro],
    ['Raza', reserva.raza || '—'],
    ['Tamaño', reserva.tamano || '—'],
    ['Notas', reserva.notas || '—'],
  ];
  return (
    <dl style={{ fontSize: '0.9rem', lineHeight: '1.8' }}>
      {campos.map(([k, v]) => (
        <div key={k} style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid #f3f4f6', padding: '0.25rem 0' }}>
          <dt style={{ fontWeight: 700, minWidth: '120px', color: '#374151' }}>{k}:</dt>
          <dd style={{ color: '#6b7280', margin: 0 }}>{v}</dd>
        </div>
      ))}
    </dl>
  );
}

function FormularioEdicion({ reserva, onGuardar, onCancelar }) {
  const [datos, setDatos] = useState({
    fecha_desde: reserva.fecha_desde,
    fecha_hasta: reserva.fecha_hasta,
    tramo_horario: reserva.tramo_horario,
    notas: reserva.notas ?? '',
  });

  function set(campo, valor) {
    setDatos((d) => ({ ...d, [campo]: valor }));
  }

  return (
    <div>
      <div style={{ display: 'grid', gap: '0.75rem', marginBottom: '1rem' }}>
        <Campo label="Fecha desde">
          <input type="date" value={datos.fecha_desde} onChange={(e) => set('fecha_desde', e.target.value)} style={estiloInputModal} />
        </Campo>
        <Campo label="Fecha hasta">
          <input type="date" value={datos.fecha_hasta} onChange={(e) => set('fecha_hasta', e.target.value)} style={estiloInputModal} />
        </Campo>
        <Campo label="Tramo horario">
          <input type="text" value={datos.tramo_horario} onChange={(e) => set('tramo_horario', e.target.value)} style={estiloInputModal} />
        </Campo>
        <Campo label="Notas">
          <textarea value={datos.notas} onChange={(e) => set('notas', e.target.value)} rows={3} style={{ ...estiloInputModal, resize: 'vertical' }} />
        </Campo>
      </div>
      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <button onClick={() => onGuardar(datos)} style={{ ...estiloBotonAccion, background: '#7c3aed', color: '#fff', padding: '0.6rem 1.25rem' }}>
          Guardar cambios
        </button>
        <button onClick={onCancelar} style={{ ...estiloBotonAccion, background: '#e5e7eb', color: '#374151', padding: '0.6rem 1.25rem' }}>
          Cancelar
        </button>
      </div>
    </div>
  );
}

function Campo({ label, children }) {
  return (
    <div>
      <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.3rem', fontSize: '0.85rem', color: '#374151' }}>{label}</label>
      {children}
    </div>
  );
}

function Modal({ titulo, onClose, children }) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#fff', borderRadius: '1rem', padding: '1.5rem',
          maxWidth: '560px', width: '100%', maxHeight: '80vh', overflowY: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ fontWeight: 700, margin: 0 }}>{titulo}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#6b7280' }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── Estilos ───────────────────────────────────────────────────────────────────

const estiloTitulo = { fontWeight: 800, fontSize: '1.3rem', color: '#1f2937', margin: 0 };
const estiloTh = { padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 700, color: '#374151', fontSize: '0.85rem' };
const estiloTd = { padding: '0.75rem 1rem', color: '#374151' };
const estiloSelect = { padding: '0.5rem 0.75rem', border: '2px solid #e5e7eb', borderRadius: '0.5rem', fontSize: '0.9rem', background: '#fff', cursor: 'pointer' };
const estiloBotonSecundario = { padding: '0.5rem 1rem', border: '2px solid #e5e7eb', borderRadius: '0.5rem', background: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' };
const estiloBotonAccion = { padding: '0.3rem 0.7rem', border: 'none', borderRadius: '0.4rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem', marginRight: '0.3rem' };
const estiloError = { padding: '0.75rem', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '0.5rem', color: '#b91c1c', fontSize: '0.85rem', marginBottom: '1rem' };
const estiloInputModal = { width: '100%', padding: '0.6rem 0.9rem', border: '2px solid #e5e7eb', borderRadius: '0.5rem', fontSize: '0.9rem', boxSizing: 'border-box' };

export default ListaReservas;
