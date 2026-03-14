/**
 * Inventario/index.tsx — Módulo de Inventario con pestañas (FASE 7A).
 *
 * Tabs:
 *   Stock actual  — lista paginada con alertas de stock mínimo
 *   Kardex        — historial de movimientos por producto
 *   Ajustes       — formulario de ajuste manual (merma/daño/robo/corrección)
 */

import React, { useState } from 'react';
import { colors } from '../../styles/colors';
import { StockTab }   from './tabs/StockTab';
import { KardexTab }  from './tabs/KardexTab';
import { AjustesTab } from './tabs/AjustesTab';

const TABS = [
  { id: 'stock',   label: 'Stock actual'     },
  { id: 'kardex',  label: 'Kardex'           },
  { id: 'ajustes', label: 'Ajustes manuales' },
] as const;

type TabId = typeof TABS[number]['id'];

export function InventarioList() {
  const [activeTab, setActiveTab] = useState<TabId>('stock');

  return (
    <div style={{ padding: '32px 36px', background: colors.pageBg, minHeight: '100%' }}>

      {/* Encabezado */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
          <div style={{ width: '4px', height: '22px', borderRadius: '4px', background: colors.accent }} />
          <h1 style={{ fontSize: '21px', fontWeight: 700, color: colors.textPrimary, letterSpacing: '-0.3px', margin: 0 }}>
            Inventario
          </h1>
        </div>
        <p style={{ fontSize: '13px', color: colors.textMuted, margin: '0 0 0 14px' }}>
          Stock en tiempo real, historial de movimientos y ajustes manuales
        </p>
      </div>

      {/* Pestañas */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 24, borderBottom: `2px solid ${colors.border}` }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '10px 22px', border: 'none', background: 'transparent',
              cursor: 'pointer', fontSize: 14,
              fontWeight: activeTab === tab.id ? 700 : 500,
              color: activeTab === tab.id ? colors.accent : colors.textMuted,
              borderBottom: activeTab === tab.id ? `2px solid ${colors.accent}` : '2px solid transparent',
              marginBottom: -2, transition: 'color 0.15s, border-color 0.15s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Contenido */}
      {activeTab === 'stock'   && <StockTab />}
      {activeTab === 'kardex'  && <KardexTab />}
      {activeTab === 'ajustes' && <AjustesTab />}
    </div>
  );
}

export default InventarioList;
