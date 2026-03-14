/**
 * ComprasPDF.tsx — Plantilla PDF para el reporte de Compras.
 * Usa @react-pdf/renderer para generación client-side.
 *
 * Secciones:
 *   1. Encabezado con título y período
 *   2. Tarjetas de resumen (4 KPIs)
 *   3. Tabla de órdenes de compra
 *   4. Top 10 proveedores
 *   5. Distribución por estado
 */

import React from 'react';
import {
  Document, Page, View, Text, StyleSheet,
} from '@react-pdf/renderer';
import {
  ComprasResponse, TopProveedor, CompraPorEstado,
} from '../../../services/reportes.service';

// ── Estilos ────────────────────────────────────────────────────────────────────

const S = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 8,
    padding: '32px 36px',
    color: '#1a1a2e',
    backgroundColor: '#ffffff',
  },

  // Encabezado
  header: {
    marginBottom: 20,
    borderBottom: '2px solid #111111',
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: '#111111',
    marginBottom: 4,
  },
  headerSub: {
    fontSize: 9,
    color: '#666666',
  },
  headerPeriod: {
    fontSize: 8,
    color: '#888888',
    marginTop: 2,
  },

  // KPI cards
  kpiRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: '#f8f8f8',
    borderRadius: 4,
    padding: '8px 10px',
    borderLeft: '3px solid #111111',
  },
  kpiLabel: {
    fontSize: 7,
    color: '#888888',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  kpiValue: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    color: '#111111',
  },

  // Sección
  sectionTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#111111',
    marginBottom: 6,
    marginTop: 14,
    borderBottom: '1px solid #e0e0e0',
    paddingBottom: 4,
  },

  // Tabla
  table: { width: '100%' },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#111111',
    borderRadius: 2,
    marginBottom: 1,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: '1px solid #f0f0f0',
    minHeight: 18,
    alignItems: 'center',
  },
  tableRowAlt: {
    backgroundColor: '#fafafa',
  },
  thCell: {
    color: '#ffffff',
    fontFamily: 'Helvetica-Bold',
    fontSize: 7,
    padding: '4px 6px',
  },
  tdCell: {
    fontSize: 7,
    padding: '3px 6px',
    color: '#333333',
  },

  // Columnas tabla compras
  colOrden:    { width: '18%' },
  colProv:     { width: '28%' },
  colFecha:    { width: '13%' },
  colEstado:   { width: '12%' },
  colLineas:   { width: '10%', textAlign: 'right' },
  colTotal:    { width: '19%', textAlign: 'right' },

  // Columnas top proveedores
  colProvNom:  { width: '55%' },
  colOrdenes:  { width: '20%', textAlign: 'right' },
  colMonto:    { width: '25%', textAlign: 'right' },

  // Columnas por estado
  colEstNom:   { width: '40%' },
  colEstOrd:   { width: '30%', textAlign: 'right' },
  colEstMonto: { width: '30%', textAlign: 'right' },

  // Badge estado
  badge: {
    fontSize: 6,
    fontFamily: 'Helvetica-Bold',
    padding: '1px 4px',
    borderRadius: 3,
    textTransform: 'capitalize',
  },

  footer: {
    position: 'absolute',
    bottom: 20,
    left: 36,
    right: 36,
    textAlign: 'center',
    fontSize: 7,
    color: '#aaaaaa',
    borderTop: '1px solid #eeeeee',
    paddingTop: 6,
  },
});

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  return n.toLocaleString('es-SV', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });
}

function fmtNum(n: number): string {
  return n.toLocaleString('es-SV');
}

function badgeColor(estado: string): { bg: string; text: string } {
  const map: Record<string, { bg: string; text: string }> = {
    recibida:  { bg: '#dcfce7', text: '#16a34a' },
    pendiente: { bg: '#fef9c3', text: '#ca8a04' },
    cancelada: { bg: '#fee2e2', text: '#dc2626' },
  };
  return map[estado] ?? { bg: '#f3f4f6', text: '#6b7280' };
}

// ── Componente ────────────────────────────────────────────────────────────────

interface Props {
  data:          ComprasResponse;
  proveedores:   TopProveedor[];
  porEstado:     CompraPorEstado[];
}

export function ComprasPDF({ data, proveedores, porEstado }: Props) {
  const { periodo, resumen, compras } = data;

  return (
    <Document title={`Reporte de Compras ${periodo.inicio} — ${periodo.fin}`} author="ERP DTE Online">
      <Page size="A4" style={S.page} orientation="landscape">

        {/* ── Encabezado ── */}
        <View style={S.header}>
          <Text style={S.headerTitle}>Reporte de Compras</Text>
          <Text style={S.headerSub}>ERP DTE Online</Text>
          <Text style={S.headerPeriod}>
            Período: {periodo.inicio} — {periodo.fin}
          </Text>
        </View>

        {/* ── KPIs ── */}
        <View style={S.kpiRow}>
          <View style={[S.kpiCard, { borderLeftColor: '#6366f1' }]}>
            <Text style={S.kpiLabel}>Total Órdenes</Text>
            <Text style={S.kpiValue}>{fmtNum(resumen.total_ordenes)}</Text>
          </View>
          <View style={[S.kpiCard, { borderLeftColor: '#10b981' }]}>
            <Text style={S.kpiLabel}>Monto Total</Text>
            <Text style={S.kpiValue}>{fmt(resumen.monto_total)}</Text>
          </View>
          <View style={[S.kpiCard, { borderLeftColor: '#f59e0b' }]}>
            <Text style={S.kpiLabel}>Proveedores Únicos</Text>
            <Text style={S.kpiValue}>{fmtNum(resumen.proveedores_unicos)}</Text>
          </View>
          <View style={[S.kpiCard, { borderLeftColor: '#3b82f6' }]}>
            <Text style={S.kpiLabel}>Líneas de Producto</Text>
            <Text style={S.kpiValue}>{fmtNum(resumen.productos_lineas)}</Text>
          </View>
        </View>

        {/* ── Tabla de órdenes ── */}
        <Text style={S.sectionTitle}>Órdenes de Compra ({compras.length})</Text>
        <View style={S.table}>
          <View style={S.tableHeader}>
            <Text style={[S.thCell, S.colOrden]}>N° Orden</Text>
            <Text style={[S.thCell, S.colProv]}>Proveedor</Text>
            <Text style={[S.thCell, S.colFecha]}>Fecha</Text>
            <Text style={[S.thCell, S.colEstado]}>Estado</Text>
            <Text style={[S.thCell, S.colLineas]}>Líneas</Text>
            <Text style={[S.thCell, S.colTotal]}>Total</Text>
          </View>
          {compras.slice(0, 40).map((c, i) => {
            const badge = badgeColor(c.estado);
            return (
              <View key={c.id} style={[S.tableRow, i % 2 === 1 ? S.tableRowAlt : {}]}>
                <Text style={[S.tdCell, S.colOrden]}>{c.orden_compra}</Text>
                <Text style={[S.tdCell, S.colProv]}>{c.proveedor}</Text>
                <Text style={[S.tdCell, S.colFecha]}>{c.fecha_compra}</Text>
                <View style={[S.tdCell, S.colEstado, { justifyContent: 'center' }]}>
                  <Text style={[S.badge, { backgroundColor: badge.bg, color: badge.text }]}>
                    {c.estado}
                  </Text>
                </View>
                <Text style={[S.tdCell, S.colLineas]}>{c.num_lineas}</Text>
                <Text style={[S.tdCell, S.colTotal]}>{fmt(c.total)}</Text>
              </View>
            );
          })}
          {compras.length > 40 && (
            <View style={{ marginTop: 4 }}>
              <Text style={{ fontSize: 7, color: '#888888', fontStyle: 'italic' }}>
                … y {compras.length - 40} órdenes más. Descarga el Excel para el listado completo.
              </Text>
            </View>
          )}
        </View>

        {/* ── Top Proveedores + Por Estado ── */}
        <View style={{ flexDirection: 'row', gap: 16, marginTop: 2 }}>

          {/* Top proveedores */}
          <View style={{ flex: 1 }}>
            <Text style={S.sectionTitle}>Top 10 Proveedores</Text>
            <View style={S.table}>
              <View style={S.tableHeader}>
                <Text style={[S.thCell, S.colProvNom]}>Proveedor</Text>
                <Text style={[S.thCell, S.colOrdenes]}>Órdenes</Text>
                <Text style={[S.thCell, S.colMonto]}>Monto</Text>
              </View>
              {proveedores.map((p, i) => (
                <View key={p.proveedor} style={[S.tableRow, i % 2 === 1 ? S.tableRowAlt : {}]}>
                  <Text style={[S.tdCell, S.colProvNom]}>{p.proveedor}</Text>
                  <Text style={[S.tdCell, S.colOrdenes]}>{fmtNum(p.total_ordenes)}</Text>
                  <Text style={[S.tdCell, S.colMonto]}>{fmt(p.total_monto)}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Por estado */}
          <View style={{ flex: 1 }}>
            <Text style={S.sectionTitle}>Por Estado</Text>
            <View style={S.table}>
              <View style={S.tableHeader}>
                <Text style={[S.thCell, S.colEstNom]}>Estado</Text>
                <Text style={[S.thCell, S.colEstOrd]}>Órdenes</Text>
                <Text style={[S.thCell, S.colEstMonto]}>Monto Total</Text>
              </View>
              {porEstado.map((e, i) => (
                <View key={e.estado} style={[S.tableRow, i % 2 === 1 ? S.tableRowAlt : {}]}>
                  <Text style={[S.tdCell, S.colEstNom, { textTransform: 'capitalize' }]}>{e.estado}</Text>
                  <Text style={[S.tdCell, S.colEstOrd]}>{fmtNum(e.total_ordenes)}</Text>
                  <Text style={[S.tdCell, S.colEstMonto]}>{fmt(e.total_monto)}</Text>
                </View>
              ))}
            </View>
          </View>

        </View>

        {/* ── Pie de página ── */}
        <Text style={S.footer} render={({ pageNumber, totalPages }) =>
          `ERP DTE Online — Generado el ${new Date().toLocaleDateString('es-SV')} — Página ${pageNumber} de ${totalPages}`
        } fixed />

      </Page>
    </Document>
  );
}
