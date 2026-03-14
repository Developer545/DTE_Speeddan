/**
 * SuperAdminApp.tsx — Layout y routing del panel SuperAdmin.
 * Diseño idéntico al ERP: sidebar izquierdo + área de contenido.
 * Usa los mismos CSS vars del sistema de temas del ERP.
 */

import React, { useState } from 'react';
import { Routes, Route, Navigate, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, ShieldCheck, LogOut, CreditCard, MapPin, Map, Palette, ChevronLeft, ChevronRight, Activity, Shield, Globe, BarChart2, HardDrive } from 'lucide-react';
import { SuperAdminAuthProvider, useSuperAdminAuth } from './context/SuperAdminAuthContext';
import { SuperAdminThemeProvider } from './context/SuperAdminThemeContext';
import { colors, radius, shadow } from '../styles/colors';
import LoginPage         from './pages/LoginPage';
import DashboardPage     from './pages/DashboardPage';
import ClientesPage      from './pages/ClientesPage';
import ClienteDetailPage from './pages/ClienteDetailPage';
import PlanesPage        from './pages/PlanesPage';
import DepartamentosPage from './pages/DepartamentosPage';
import MunicipiosPage    from './pages/MunicipiosPage';
import TemaPage          from './pages/TemaPage';
import HealthPage        from './pages/HealthPage';
import AuditoriaPage     from './pages/AuditoriaPage';
import MapaClientesPage  from './pages/MapaClientesPage';
import AnalyticsPage     from './pages/AnalyticsPage';
import BackupPage        from './pages/BackupPage';

// ── Navegación del sidebar ────────────────────────────────────────────────────

const NAV_ITEMS = [
  { to: '/superadmin/dashboard',    label: 'Dashboard',    icon: LayoutDashboard },
  { to: '/superadmin/clientes',     label: 'Clientes',     icon: Users           },
  { to: '/superadmin/planes',       label: 'Planes',       icon: CreditCard      },
  { to: '/superadmin/departamentos',label: 'Departamentos',icon: Map             },
  { to: '/superadmin/municipios',   label: 'Municipios',   icon: MapPin          },
  { to: '/superadmin/tema',         label: 'Tema',         icon: Palette         },
  { to: '/superadmin/health',       label: 'Health',       icon: Activity        },
  { to: '/superadmin/auditoria',    label: 'Auditoría',    icon: Shield          },
  { to: '/superadmin/mapa',         label: 'Mapa',         icon: Globe           },
  { to: '/superadmin/analytics',    label: 'Analytics',    icon: BarChart2       },
  { to: '/superadmin/backups',      label: 'Backups',      icon: HardDrive       },
];

// ── Layout principal ─────────────────────────────────────────────────────────

function SuperAdminLayout() {
  const { superAdmin, logout } = useSuperAdminAuth();
  const navigate               = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/superadmin/login');
  };

  const sidebarW = collapsed ? 60 : 220;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: colors.pageBg, fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>

      {/* ── Sidebar ── */}
      <aside className="erp-sidebar" style={{
        width: sidebarW, flexShrink: 0,
        background: colors.sidebarBg,
        borderRight: `1px solid ${colors.border}`,
        boxShadow: shadow.card,
        display: 'flex', flexDirection: 'column',
        padding: '0',
        transition: 'width 0.2s ease',
        overflow: 'hidden',
        position: 'relative',
      }}>

        {/* Encabezado del sidebar */}
        <div style={{
          padding: collapsed ? '20px 12px 16px' : '20px 20px 16px',
          borderBottom: `1px solid ${colors.borderLight}`,
          display: 'flex', alignItems: 'center', gap: collapsed ? 0 : 10,
          justifyContent: collapsed ? 'center' : 'flex-start',
          minHeight: 68,
        }}>
          <div style={{
            width: 36, height: 36,
            background: colors.accent,
            borderRadius: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <ShieldCheck size={18} color={colors.accentText} />
          </div>
          {!collapsed && (
            <div>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: colors.textPrimary, whiteSpace: 'nowrap' }}>Super Admin</p>
              <p style={{ margin: 0, fontSize: 11, color: colors.textMuted, whiteSpace: 'nowrap' }}>Panel de control</p>
            </div>
          )}
        </div>

        {/* Botón colapsar/expandir */}
        <button
          onClick={() => setCollapsed(c => !c)}
          title={collapsed ? 'Expandir menú' : 'Colapsar menú'}
          style={{
            position: 'absolute', top: 56, right: -12,
            width: 24, height: 24, borderRadius: '50%',
            background: colors.cardBg, border: `1px solid ${colors.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', boxShadow: shadow.card,
            zIndex: 10, padding: 0, color: colors.textSecondary,
            transition: 'background 0.12s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = colors.mutedBg; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = colors.cardBg; }}
        >
          {collapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
        </button>

        {/* Navegación */}
        <nav style={{ flex: 1, padding: collapsed ? '12px 6px' : '12px 10px' }}>
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              title={collapsed ? label : undefined}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center',
                gap: collapsed ? 0 : 9,
                justifyContent: collapsed ? 'center' : 'flex-start',
                padding: collapsed ? '10px 0' : '10px 12px',
                borderRadius: radius.md ?? 8,
                fontSize: 13, fontWeight: isActive ? 700 : 500,
                color: isActive ? colors.accentText : colors.textSecondary,
                background: isActive ? colors.accent : 'transparent',
                textDecoration: 'none', marginBottom: 2,
                transition: 'all 0.12s',
              })}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLAnchorElement;
                if (!el.className.includes('active') && el.style.background === 'transparent') {
                  el.style.background = colors.mutedBg;
                }
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLAnchorElement;
                if (el.style.background === colors.mutedBg) {
                  el.style.background = 'transparent';
                }
              }}
            >
              <Icon size={collapsed ? 18 : 15} />
              {!collapsed && label}
            </NavLink>
          ))}
        </nav>

        {/* Usuario y logout */}
        <div style={{
          padding: collapsed ? '14px 6px' : '14px 16px',
          borderTop: `1px solid ${colors.borderLight}`,
        }}>
          {!collapsed && (
            <p style={{ margin: '0 0 8px', fontSize: 12, color: colors.textMuted, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {superAdmin?.nombre}
            </p>
          )}
          <button
            onClick={handleLogout}
            title={collapsed ? 'Cerrar sesión' : undefined}
            style={{
              width: '100%', display: 'flex', alignItems: 'center',
              gap: collapsed ? 0 : 8,
              justifyContent: collapsed ? 'center' : 'flex-start',
              background: 'none', border: `1px solid ${colors.border}`,
              borderRadius: radius.md ?? 8,
              padding: collapsed ? '8px 0' : '8px 12px',
              fontSize: 12, color: colors.textSecondary,
              cursor: 'pointer', transition: 'all 0.12s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = colors.mutedBg; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'none'; }}
          >
            <LogOut size={13} />
            {!collapsed && 'Cerrar sesión'}
          </button>
        </div>
      </aside>

      {/* ── Contenido principal ── */}
      {/* Las rutas son RELATIVAS al prefijo /superadmin/* del guard padre */}
      <main style={{ flex: 1, overflowY: 'auto', minWidth: 0 }}>
        <Routes>
          <Route path="dashboard"      element={<DashboardPage />} />
          <Route path="clientes"       element={<ClientesPage />} />
          <Route path="clientes/:id"   element={<ClienteDetailPage />} />
          <Route path="planes"         element={<PlanesPage />} />
          <Route path="departamentos"  element={<DepartamentosPage />} />
          <Route path="municipios"     element={<MunicipiosPage />} />
          <Route path="tema"           element={<TemaPage />} />
          <Route path="health"         element={<HealthPage />} />
          <Route path="auditoria"      element={<AuditoriaPage />} />
          <Route path="mapa"           element={<MapaClientesPage />} />
          <Route path="analytics"      element={<AnalyticsPage />} />
          <Route path="backups"        element={<BackupPage />} />
          <Route path="*"              element={<Navigate to="/superadmin/dashboard" replace />} />
        </Routes>
      </main>
    </div>
  );
}

// ── Guard ─────────────────────────────────────────────────────────────────────

function SuperAdminGuard() {
  const { superAdmin, loading } = useSuperAdminAuth();

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: colors.pageBg, fontFamily: "'Inter', sans-serif", fontSize: 14,
        color: colors.textMuted,
      }}>
        Cargando...
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/superadmin/login" element={
        superAdmin ? <Navigate to="/superadmin/dashboard" replace /> : <LoginPage />
      } />
      <Route path="/superadmin/*" element={
        superAdmin ? <SuperAdminLayout /> : <Navigate to="/superadmin/login" replace />
      } />
    </Routes>
  );
}

// ── Entry point ───────────────────────────────────────────────────────────────

export default function SuperAdminApp() {
  return (
    <SuperAdminAuthProvider>
      <SuperAdminThemeProvider>
        <SuperAdminGuard />
      </SuperAdminThemeProvider>
    </SuperAdminAuthProvider>
  );
}
