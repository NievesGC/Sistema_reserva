/**
 * Página principal del flujo de reserva del cliente.
 *
 * Pasos:
 *  1. Selección de servicio + calendario
 *  2. Tarifa, horario y opciones
 *  3. Datos del cliente + resumen + confirmación
 *
 * @module ReservaPage
 */

import React, { useState, useEffect, useMemo } from 'react';
import SelectorServicio from '../components/reserva/SelectorServicio';
import CalendarioDisponibilidad from '../components/reserva/CalendarioDisponibilidad';
import FormularioOpciones from '../components/reserva/FormularioOpciones';
import ResumenReserva from '../components/reserva/ResumenReserva';
import FormularioCliente from '../components/reserva/FormularioCliente';
import useDisponibilidad from '../hooks/useDisponibilidad';
import usePrecios from '../hooks/usePrecios';
import { getFestivos, crearReserva } from '../services/api';

/** Devuelve el mes actual en formato YYYY-MM */
function mesActual() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function ReservaPage() {
  const [paso, setPaso] = useState(1);
  const [servicio, setServicio] = useState(null);
  const [mes, setMes] = useState(mesActual());
  const [fechaDesde, setFechaDesde] = useState(null);
  const [fechaHasta, setFechaHasta] = useState(null);
  const [opciones, setOpciones] = useState({
    tarifa: null,
    tramo: null,
    perroExtra: false,
    direccion: '',
  });
  const [festivos, setFestivos] = useState([]);
  const [reservaCreada, setReservaCreada] = useState(null);
  const [errorEnvio, setErrorEnvio] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const { disponibilidad, loading: loadingDisp } = useDisponibilidad(servicio, mes);
  const { precios, loading: loadingPrecios } = usePrecios(servicio);

  // Cargar festivos al montar
  useEffect(() => {
    getFestivos().then(({ data }) => {
      if (data) {
        const fechas = Array.isArray(data)
          ? data.map((f) => f.fecha)
          : data.festivos?.map((f) => f.fecha) ?? [];
        setFestivos(fechas);
      }
    });
  }, []);

  // Cuando cambia el servicio, resetear fechas y opciones
  function handleSeleccionarServicio(id) {
    setServicio(id);
    setFechaDesde(null);
    setFechaHasta(null);
    setOpciones({ tarifa: null, tramo: null, perroExtra: false, direccion: '' });
  }

  /**
   * Gestiona la selección de fechas en el calendario.
   * Primer click = fecha inicio; segundo click = fecha fin.
   * @param {string} fecha
   */
  function handleSeleccionarFecha(fecha) {
    if (!fechaDesde || (fechaDesde && fechaHasta)) {
      setFechaDesde(fecha);
      setFechaHasta(null);
    } else {
      if (servicio === 'alojamiento' && fecha <= fechaDesde) {
        // Para alojamiento la salida debe ser posterior
        setFechaDesde(fecha);
        setFechaHasta(null);
      } else if (fecha < fechaDesde) {
        setFechaDesde(fecha);
        setFechaHasta(null);
      } else {
        setFechaHasta(fecha);
      }
    }
  }

  // Validaciones por paso
  const paso1Valido = servicio && fechaDesde && (servicio !== 'alojamiento' || fechaHasta);
  const paso2Valido = opciones.tarifa && opciones.tramo &&
    (!(servicio === 'alojamiento' && (opciones.tramo === 'recogida' || opciones.tramo === 'recogida-entrega')) ||
      opciones.direccion.trim().length > 0);

  async function handleConfirmar(datosCliente) {
    setEnviando(true);
    setErrorEnvio(null);

    const payload = {
      servicio,
      fecha_desde: fechaDesde,
      fecha_hasta: fechaHasta ?? fechaDesde,
      tarifa: opciones.tarifa,
      tramo_horario: opciones.tramo,
      perro_extra: opciones.perroExtra,
      transporte: servicio === 'alojamiento' ? opciones.tramo : undefined,
      direccion: opciones.direccion || undefined,
      ...datosCliente,
    };

    const { data, error } = await crearReserva(payload);
    setEnviando(false);

    if (error) {
      setErrorEnvio(error);
    } else {
      setReservaCreada(data);
      setPaso(4); // pantalla de confirmación
    }
  }

  // ── Pantalla de confirmación ──────────────────────────────────────────────
  if (paso === 4 && reservaCreada) {
    return (
      <div style={estiloContenedor}>
        <div style={estiloTarjeta}>
          <div style={{ textAlign: 'center', padding: '2rem 0' }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>✅</div>
            <h2 style={{ fontWeight: 800, fontSize: '1.8rem', color: '#059669', marginBottom: '0.5rem' }}>
              ¡Reserva enviada!
            </h2>
            <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
              Te confirmaremos en menos de 24 horas por email.
            </p>
            <div
              style={{
                background: '#f0fdf4',
                border: '2px solid #bbf7d0',
                borderRadius: '0.75rem',
                padding: '1rem',
                textAlign: 'left',
                marginBottom: '1.5rem',
                fontSize: '0.9rem',
                color: '#374151',
              }}
            >
              <p><strong>Referencia:</strong> #{String(reservaCreada.id ?? '').slice(0, 8)}</p>
              <p><strong>Servicio:</strong> {servicio}</p>
              <p><strong>Fechas:</strong> {fechaDesde} → {fechaHasta ?? fechaDesde}</p>
            </div>
            <button
              onClick={() => window.location.reload()}
              style={estiloBotonPrimario}
            >
              Nueva reserva →
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={estiloContenedor}>
      {/* Indicador de pasos */}
      <IndicadorPasos paso={paso} />

      <div style={estiloTarjeta}>
        {/* ── PASO 1: Servicio + Calendario ── */}
        {paso === 1 && (
          <>
            <h2 style={estiloTitulo}>📅 Selecciona servicio y fechas</h2>
            <SelectorServicio
              servicioSeleccionado={servicio}
              onSeleccionar={handleSeleccionarServicio}
            />
            {servicio && (
              <>
                {loadingDisp && <Spinner texto="Cargando disponibilidad..." />}
                <CalendarioDisponibilidad
                  servicio={servicio}
                  fechaDesde={fechaDesde}
                  fechaHasta={fechaHasta}
                  onSeleccionarFecha={handleSeleccionarFecha}
                  disponibilidad={disponibilidad}
                  mes={mes}
                  onCambiarMes={setMes}
                />
              </>
            )}
            <div style={{ marginTop: '1.5rem' }}>
              <button
                disabled={!paso1Valido}
                onClick={() => setPaso(2)}
                style={paso1Valido ? estiloBotonPrimario : estiloBotonDeshabilitado}
              >
                Continuar →
              </button>
            </div>
          </>
        )}

        {/* ── PASO 2: Tarifa y opciones ── */}
        {paso === 2 && (
          <>
            <h2 style={estiloTitulo}>💰 Tarifa y opciones</h2>
            {loadingPrecios && <Spinner texto="Cargando precios..." />}
            <FormularioOpciones
              servicio={servicio}
              precios={precios}
              valores={opciones}
              onCambio={setOpciones}
            />
            <div style={estiloFilaBotones}>
              <button onClick={() => setPaso(1)} style={estiloBotonSecundario}>
                ← Atrás
              </button>
              <button
                disabled={!paso2Valido}
                onClick={() => setPaso(3)}
                style={paso2Valido ? estiloBotonPrimario : estiloBotonDeshabilitado}
              >
                Continuar →
              </button>
            </div>
          </>
        )}

        {/* ── PASO 3: Datos del cliente + resumen ── */}
        {paso === 3 && (
          <>
            <h2 style={estiloTitulo}>👤 Tus datos</h2>
            <div style={{ marginBottom: '1.5rem' }}>
              <ResumenReserva
                servicio={servicio}
                fechaDesde={fechaDesde}
                fechaHasta={fechaHasta ?? fechaDesde}
                tarifa={opciones.tarifa}
                tramo={opciones.tramo}
                perroExtra={opciones.perroExtra}
                precios={precios}
                festivos={festivos}
              />
            </div>

            {errorEnvio && (
              <div
                style={{
                  marginBottom: '1rem',
                  padding: '0.75rem 1rem',
                  background: '#fef2f2',
                  border: '2px solid #fca5a5',
                  borderRadius: '0.5rem',
                  color: '#b91c1c',
                  fontSize: '0.9rem',
                }}
              >
                ❌ {errorEnvio}
              </div>
            )}

            <FormularioCliente onSubmit={handleConfirmar} loading={enviando} />

            <div style={{ marginTop: '1rem' }}>
              <button onClick={() => setPaso(2)} style={estiloBotonSecundario}>
                ← Atrás
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function IndicadorPasos({ paso }) {
  const pasos = ['Servicio y fechas', 'Opciones', 'Tus datos'];
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '1.5rem',
        gap: '0',
      }}
    >
      {pasos.map((label, i) => {
        const num = i + 1;
        const activo = num === paso;
        const completado = num < paso;
        return (
          <React.Fragment key={num}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
              <div
                style={{
                  width: '2.5rem',
                  height: '2.5rem',
                  borderRadius: '50%',
                  background: activo || completado ? '#7c3aed' : 'rgba(255,255,255,0.3)',
                  color: activo || completado ? '#fff' : 'rgba(255,255,255,0.7)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '1rem',
                  boxShadow: activo ? '0 0 0 3px rgba(124,58,237,0.3)' : 'none',
                }}
              >
                {completado ? '✓' : num}
              </div>
              <span style={{ fontSize: '0.7rem', color: '#fff', fontWeight: activo ? 700 : 400 }}>
                {label}
              </span>
            </div>
            {i < pasos.length - 1 && (
              <div
                style={{
                  width: '4rem',
                  height: '2px',
                  background: num < paso ? '#7c3aed' : 'rgba(255,255,255,0.3)',
                  marginBottom: '1.2rem',
                }}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function Spinner({ texto }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#6b7280', margin: '0.5rem 0' }}>
      <span
        style={{
          display: 'inline-block',
          width: '1rem',
          height: '1rem',
          border: '2px solid #e5e7eb',
          borderTopColor: '#7c3aed',
          borderRadius: '50%',
          animation: 'spin 0.7s linear infinite',
        }}
      />
      <span style={{ fontSize: '0.85rem' }}>{texto}</span>
    </div>
  );
}

// ── Estilos ──────────────────────────────────────────────────────────────────

const estiloContenedor = {
  minHeight: '100vh',
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  padding: '2rem 1rem',
};

const estiloTarjeta = {
  maxWidth: '720px',
  margin: '0 auto',
  background: 'rgba(255,255,255,0.95)',
  borderRadius: '1.5rem',
  padding: '2rem',
  boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
};

const estiloTitulo = {
  fontWeight: 800,
  fontSize: '1.5rem',
  background: 'linear-gradient(135deg, #7c3aed, #ec4899)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  marginBottom: '1.25rem',
};

const estiloBotonPrimario = {
  width: '100%',
  padding: '1rem',
  borderRadius: '0.75rem',
  border: 'none',
  background: 'linear-gradient(135deg, #7c3aed, #ec4899)',
  color: '#fff',
  fontWeight: 700,
  fontSize: '1rem',
  cursor: 'pointer',
};

const estiloBotonDeshabilitado = {
  ...estiloBotonPrimario,
  background: '#d1d5db',
  color: '#9ca3af',
  cursor: 'not-allowed',
};

const estiloBotonSecundario = {
  padding: '0.75rem 1.5rem',
  borderRadius: '0.75rem',
  border: '2px solid #e5e7eb',
  background: '#f9fafb',
  color: '#374151',
  fontWeight: 600,
  cursor: 'pointer',
};

const estiloFilaBotones = {
  display: 'flex',
  gap: '1rem',
  marginTop: '1.5rem',
};

export default ReservaPage;
