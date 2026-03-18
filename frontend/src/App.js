// src/App.js
import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';

import { useAuthStore } from './store/authStore';
import Sidebar    from './components/layout/Sidebar';
import Navbar     from './components/layout/Navbar';
import PageWrapper from './components/layout/PageWrapper';

import Home         from './pages/Home';
import Login        from './pages/Login';
import Register     from './pages/Register';
import Dashboard    from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Settings     from './pages/Settings';
import Safety       from './pages/Safety';
import Budget       from './pages/Budget';
import Emis         from './pages/Emis';
import Subscriptions from './pages/Subscriptions';
import Calendar      from './pages/Calendar';
import Insights      from './pages/Insights';

// ── Route guards ──────────────────────────────────────────────

function PrivateRoute({ children }) {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function PublicRoute({ children }) {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : children;
}

// ── Authenticated shell ───────────────────────────────────────

function AuthenticatedShell({ children }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  return (
    <div className={`app-shell ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <Sidebar collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} />
      <div className="app-main">
        <Navbar />
        <PageWrapper>{children}</PageWrapper>
      </div>
    </div>
  );
}

// ── App ───────────────────────────────────────────────────────

export default function App() {
  const { initAuth } = useAuthStore();

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/" element={<Home />} />
        <Route path="/login"    element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

        {/* Authenticated */}
        <Route path="/dashboard" element={
          <PrivateRoute>
            <AuthenticatedShell><Dashboard /></AuthenticatedShell>
          </PrivateRoute>
        } />
        <Route path="/transactions" element={
          <PrivateRoute>
            <AuthenticatedShell><Transactions /></AuthenticatedShell>
          </PrivateRoute>
        } />
        <Route path="/settings" element={
          <PrivateRoute>
            <AuthenticatedShell><Settings /></AuthenticatedShell>
          </PrivateRoute>
        } />
        <Route path="/safety" element={
          <PrivateRoute>
            <AuthenticatedShell><Safety /></AuthenticatedShell>
          </PrivateRoute>
        } />
        <Route path="/budget" element={
          <PrivateRoute>
            <AuthenticatedShell><Budget /></AuthenticatedShell>
          </PrivateRoute>
        } />
        <Route path="/emis" element={
          <PrivateRoute>
            <AuthenticatedShell><Emis /></AuthenticatedShell>
          </PrivateRoute>
        } />
        <Route path="/subscriptions" element={
          <PrivateRoute>
            <AuthenticatedShell><Subscriptions /></AuthenticatedShell>
          </PrivateRoute>
        } />
        <Route path="/calendar" element={
          <PrivateRoute>
            <AuthenticatedShell><Calendar /></AuthenticatedShell>
          </PrivateRoute>
        } />
        <Route path="/insights" element={
          <PrivateRoute>
            <AuthenticatedShell><Insights /></AuthenticatedShell>
          </PrivateRoute>
        } />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}