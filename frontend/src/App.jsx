/**
 * Componente raíz de la aplicación.
 * Define las rutas principales: flujo de reserva del cliente y panel de administración.
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ReservaPage from './pages/ReservaPage';
import AdminPage from './pages/AdminPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Ruta principal: flujo de reserva del cliente */}
        <Route path="/" element={<ReservaPage />} />

        {/* Panel de administración (protegido por autenticación) */}
        <Route path="/admin/*" element={<AdminPage />} />

        {/* Redirige rutas desconocidas al inicio */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
