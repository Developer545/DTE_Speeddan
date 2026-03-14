/**
 * Configuracion/index.tsx — Módulo de Configuración del sistema (ERP tenant).
 *
 * Tabs disponibles:
 *   1. Empresa        — nombre, NIT, NCR, dirección, giro, etc.
 *   2. Tema           — paleta de colores en vivo
 *   3. DTE            — correlativos de documentos tributarios
 *   4. Sucursales     — establecimientos y puntos de emisión
 *   5. Usuarios       — gestión de usuarios del tenant
 *   6. API Hacienda   — credenciales MH
 *   7. Firma Digital  — certificado de firma
 *   8. Departamentos  — catálogo CAT-012
 *   9. Municipios     — catálogo CAT-013
 */

import React, { useState } from 'react';
import {
  Building2, Palette, FileText, Users,
  Globe, LayoutGrid, Shield,
} from 'lucide-react';
import { colors, radius, shadow } from '../../styles/colors';
import { EmpresaSection } from '../Common/EmpresaSection';
import { TemaTab } from './tabs/TemaTab';
import { DTETab } from './tabs/DTETab';
import { SucursalesSection } from '../Common/SucursalesSection';
import { UsuariosTab } from './tabs/UsuariosTab';
import { FirmaElectronicaSection } from '../Common/FirmaElectronicaSection';
import { APIHaciendaSection }      from '../Common/APIHaciendaSection';

// Wrappers sin props → modo cliente (sin tenantId)
const EmpresaTab     = () => <EmpresaSection />;
const FirmaTab       = () => <FirmaElectronicaSection />;
const APIHaciendaTab = () => <APIHaciendaSection />;
const SucursalesTab  = () => <SucursalesSection />;

// ── Definición de tabs ────────────────────────────────────────────────────────

const TABS = [
  { id: 'empresa',    label: 'Empresa',      icon: Building2,  Component: EmpresaTab    },
  { id: 'tema',       label: 'Tema',         icon: Palette,    Component: TemaTab       },
  { id: 'dte',        label: 'DTE',          icon: FileText,   Component: DTETab        },
  { id: 'sucursales', label: 'Sucursales',   icon: LayoutGrid, Component: SucursalesTab },
  { id: 'usuarios',   label: 'Usuarios',     icon: Users,      Component: UsuariosTab   },
  { id: 'api',        label: 'API Hacienda', icon: Globe,      Component: APIHaciendaTab},
  { id: 'firma',      label: 'Firma Digital',icon: Shield,     Component: FirmaTab      },
] as const;

type TabId = typeof TABS[number]['id'];

// ── Componente ────────────────────────────────────────────────────────────────

export function ConfiguracionModule() {
  const [activeTab, setActiveTab] = useState<TabId>('empresa');
  const ActiveComponent = TABS.find(t => t.id === activeTab)!.Component;

  return (
    <div style={{ padding: '32px 36px', background: colors.pageBg, minHeight: '100%' }}>

      {/* Encabezado */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <div style={{ width: 4, height: 22, borderRadius: 4, background: colors.accent }} />
          <h1 style={{ fontSize: 21, fontWeight: 700, color: colors.textPrimary, letterSpacing: '-0.3px', margin: 0 }}>
            Configuración
          </h1>
        </div>
        <p style={{ fontSize: 13, color: colors.textMuted, margin: '0 0 0 14px' }}>
          Configuración general del sistema
        </p>
      </div>

      {/* Layout: sidebar de tabs + contenido */}
      <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 20, alignItems: 'start' }}>

        {/* ── Sidebar de tabs ── */}
        <nav style={{
          background: colors.cardBg, borderRadius: radius.lg,
          border: `1px solid ${colors.border}`, boxShadow: shadow.card,
          overflow: 'hidden',
        }}>
          {TABS.map((tab, i) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                  padding: '12px 16px', background: isActive ? colors.accent : 'transparent',
                  color: isActive ? colors.accentText : colors.textSecondary,
                  border: 'none',
                  borderBottom: i < TABS.length - 1 ? `1px solid ${colors.borderLight}` : 'none',
                  borderRadius: 0, fontSize: 13, fontWeight: isActive ? 700 : 500,
                  cursor: 'pointer', textAlign: 'left',
                  transition: 'all 0.12s',
                }}
                onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = colors.mutedBg; }}
                onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
              >
                <Icon size={14} />
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* ── Panel de contenido ── */}
        <div style={{
          background: colors.cardBg, borderRadius: radius.lg,
          border: `1px solid ${colors.border}`, boxShadow: shadow.card,
          padding: '28px 32px',
          minHeight: 420,
        }}>
          <ActiveComponent />
        </div>
      </div>
    </div>
  );
}

export default ConfiguracionModule;
