/**
 * Panel de administración.
 * - Login con JWT guardado en localStorage ('admin_token')
 * - Protección de rutas: si no hay token, muestra el login
 * - Tabs: Reservas, Calendario, Festivos, Precios, Exportar
 * - Cierre de sesión
 *
 * @module AdminPage
 */

import React, { useState, useEffect } from 'react';
import { login } from '../services/api';
import ListaReservas from '../components/admin/ListaReservas';
import CalendarioOcupacion from '../components/admin/CalendarioOcupacion';
import GestionFestivos from '../components/admin/GestionFestivos';
import ConfiguracionPrecios from '../components/admin/ConfiguracionPrecios';
import ExportarDatos from '../components/admin/ExportarDatos';

const TABS = [
  { id: 'reservas', label: '📋 Reservas' },
  { id: 'calendario', label: '📅 Calendario' },
  { id: 'festivos', label: '🎉 Festivos' },
  { id: 'precios', label: '💰 Precios' },
  { id: 'exportar', label: '📤 Exportar' },
];

function AdminPage() {
  const [token, setToken] = useState(() => localStorage.getItem('admin_token'));
  const [tabActiva, setTabActiva] = useState('reservas');

  function handleLogin(nuevoToken) {
    localStorage.setItem('admin_token', nuevoToken);
    setToken(nuevoToken);
  }

  function handleLogout() {
    localStorage.removeItem('admin_token');
    setToken(null);
  }

  if (!token) {
    return <LoginForm onLogin={handleLogin} />;
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f3f4f6' }}>
      {/* Header */}
      <header
        style={{
          background: 'linear-gradient(135deg, #7c3aed, #ec4899)',
          padding: '1rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          color: '#fff',
        }}
      >
        <h1 style={{ fontWeight: 800, fontSize: '1.2rem', margin: 0 }}>
          🐕 Panel de Administración
        </h1>
        <button
          onClick={handleLogout}
          style={{
            background: 'rgba(255,255,255,0.2)',
            border: '1px solid rgba(255,255,255,0.4)',
            color: '#fff',
            padding: '0.4rem 1rem',
            borderRadius: '0.5rem',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '0.85rem',
          }}
        >
          Cerrar sesión
        </button>
      </header>

      {/* Tabs */}
      <nav
        style={{
          background: '#fff',
          borderBottom: '2px solid #e5e7eb',
          display: 'flex',
          overflowX: 'auto',
        }}
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setTabActiva(tab.id)}
            style={{
              padding: '0.85rem 1.25rem',
              border: 'none',
              borderBottom: tabActiva === tab.id ? '3px solid #7c3aed' : '3px solid transparent',
              background: 'none',
              color: tabActiva === tab.id ? '#7c3aed' : '#6b7280',
              fontWeight: tabActiva === tab.id ? 700 : 500,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              fontSize: '0.9rem',
            }}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Contenido */}
      <main style={{ padding: '1.5rem', maxWidth: '1100px', margin: '0 auto' }}>
        {tabActiva === 'reservas' && <ListaReservas />}
        {tabActiva === 'calendario' && <CalendarioOcupacion />}
        {tabActiva === 'festivos' && <GestionFestivos />}
        {tabActiva === 'precios' && <ConfiguracionPrecios />}
        {tabActiva === 'exportar' && <ExportarDatos />}
      </main>
    </div>
  );
}

// ── Formulario de login ───────────────────────────────────────────────────────

function LoginForm({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Introduce email y contraseña.');
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error: err } = await login(email.trim(), password);
    setLoading(false);
    if (err) {
      setError('Credenciales incorrectas. Inténtalo de nuevo.');
    } else {
      const token = data?.access_token ?? data?.token ?? data;
      if (token && typeof token === 'string') {
        onLogin(token);
      } else {
        setError('Respuesta inesperada del servidor.');
      }
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: '1rem',
          padding: '2.5rem',
          width: '100%',
          maxWidth: '400px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
        }}
      >
        <h2
          style={{
            fontWeight: 800,
            fontSize: '1.5rem',
            textAlign: 'center',
            marginBottom: '1.5rem',
            background: 'linear-gradient(135deg, #7c3aed, #ec4899)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          🐕 Acceso Admin
        </h2>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={estiloLabel}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@guarderia.com"
              style={estiloInput}
              autoComplete="email"
            />
          </div>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={estiloLabel}>Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              style={estiloInput}
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div
              style={{
                marginBottom: '1rem',
                padding: '0.75rem',
                background: '#fef2f2',
                border: '1px solid #fca5a5',
                borderRadius: '0.5rem',
                color: '#b91c1c',
                fontSize: '0.85rem',
              }}
            >
              ❌ {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.9rem',
              borderRadius: '0.75rem',
              border: 'none',
              background: loading ? '#9ca3af' : 'linear-gradient(135deg, #7c3aed, #ec4899)',
              color: '#fff',
              fontWeight: 700,
              fontSize: '1rem',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Accediendo...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}

const estiloLabel = {
  display: 'block',
  fontWeight: 600,
  marginBottom: '0.4rem',
  fontSize: '0.9rem',
  color: '#374151',
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

export default AdminPage;
