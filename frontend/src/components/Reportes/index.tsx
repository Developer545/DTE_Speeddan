/**
 * Reportes/index.tsx — Módulo de Reportes del ERP.
 *
 * Tabs:
 *   - Ventas: reporte por período con top clientes, top productos, por tipo DTE y Excel
 *   - Inventario: stock actual valorizado, sin stock, lotes por vencer y Excel
 *   - Compras: órdenes de compra, top proveedores, por estado, Excel y PDF
 */

import React, { useState } from 'react';
import { TrendingUp, Package, ShoppingCart } from 'lucide-react';
import { colors, radius, shadow } from '../../styles/colors';
import { VentasTab }     from './tabs/VentasTab';
import { InventarioTab } from './tabs/InventarioTab';
import { ComprasTab }    from './tabs/ComprasTab';

// ── Tabs ──────────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'ventas',     label: 'Ventas',     icon: TrendingUp,  Component: VentasTab     },
  { id: 'inventario', label: 'Inventario', icon: Package,     Component: InventarioTab },
  { id: 'compras',    label: 'Compras',    icon: ShoppingCart, Component: ComprasTab   },
] as const;

type TabId = typeof TABS[number]['id'];

// ── Componente ────────────────────────────────────────────────────────────────

export default function ReportesModule() {
  const [activeTab, setActiveTab] = useState<TabId>('ventas');
  const ActiveComponent = TABS.find(t => t.id === activeTab)!.Component;

  return (
    <div style={{ padding: '32px 36px', background: colors.pageBg, minHeight: '100%' }}>

      {/* Encabezado */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <div style={{ width: 4, height: 22, borderRadius: 4, background: colors.accent }} />
          <h1 style={{ fontSize: 21, fontWeight: 700, color: colors.textPrimary, letterSpacing: '-0.3px', margin: 0 }}>
            Reportes
          </h1>
        </div>
        <p style={{ fontSize: 13, color: colors.textMuted, margin: '0 0 0 14px' }}>
          Análisis de ventas, inventario y compras — exportaciones a Excel y PDF
        </p>
      </div>

      {/* Layout: tabs horizontales + contenido */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Barra de tabs */}
        <nav style={{
          background: colors.cardBg, borderRadius: radius.lg,
          border: `1px solid ${colors.border}`, boxShadow: shadow.card,
          display: 'flex', overflow: 'hidden',
        }}>
          {TABS.map((tab, i) => {
            const Icon    = tab.icon;
            const active  = tab.id === activeTab;
            const isFirst = i === 0;
            const isLast  = i === TABS.length - 1;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  flex: 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  padding: '14px 20px',
                  background: active ? colors.accent : 'transparent',
                  color: active ? colors.accentText : colors.textSecondary,
                  border: 'none',
                  borderRight: !isLast ? `1px solid ${colors.border}` : 'none',
                  cursor: 'pointer',
                  fontSize: 14, fontWeight: active ? 700 : 500,
                  transition: 'background 0.15s, color 0.15s',
                  borderRadius: isFirst ? `${radius.lg} 0 0 ${radius.lg}` : isLast ? `0 ${radius.lg} ${radius.lg} 0` : 0,
                }}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* Contenido del tab activo */}
        <ActiveComponent />
      </div>
    </div>
  );
}
