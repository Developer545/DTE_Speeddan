/**
 * MapaClientesPage.tsx — Distribución geográfica de tenants por departamento.
 * Usa Leaflet directamente (sin react-leaflet) para evitar incompatibilidades
 * con el Context API de React 18.3+.
 * Base: CartoDB Positron tiles + GeoJSON de departamentos de El Salvador.
 */

import React, { useEffect, useRef, useCallback, useMemo, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { RefreshCw, Users, MapIcon, AlertCircle, MapPin } from 'lucide-react';
import { colors, radius, shadow } from '../../styles/colors';
import { mapaService, MapaData, MapaDepartamento } from '../services/superadmin.service';

// ── URLs para GeoJSON (se prueban en orden hasta que una funcione) ─────────────
const GEOJSON_URLS = [
  'https://raw.githubusercontent.com/codeforamerica/click_that_hood/master/public/data/el-salvador-departamentos.geojson',
  'https://geodata.ucdavis.edu/gadm/gadm4.1/json/gadm41_SLV_1.json',
];

// ── Nombres de departamentos por código ───────────────────────────────────────
const DEPT_NAMES: Record<string, string> = {
  '01': 'Ahuachapán',   '02': 'Santa Ana',    '03': 'Sonsonate',
  '04': 'Chalatenango', '05': 'La Libertad',  '06': 'San Salvador',
  '07': 'Cuscatlán',    '08': 'La Paz',        '09': 'Cabañas',
  '10': 'San Vicente',  '11': 'Usulután',      '12': 'San Miguel',
  '13': 'Morazán',      '14': 'La Unión',
};

// ── Centroides: [lat, lon] — Leaflet usa lat-lon ──────────────────────────────
const CENTROIDES: Record<string, [number, number]> = {
  '01': [13.922, -89.845], '02': [13.994, -89.560], '03': [13.718, -89.725],
  '04': [14.034, -88.932], '05': [13.683, -89.299], '06': [13.693, -89.218],
  '07': [13.789, -88.925], '08': [13.483, -88.925], '09': [13.873, -88.748],
  '10': [13.638, -88.786], '11': [13.350, -88.443], '12': [13.481, -88.178],
  '13': [13.767, -88.127], '14': [13.336, -87.844],
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function deptColor(d: MapaDepartamento): string {
  if (d.total === 0)     return '#94a3b8';
  if (d.activos > 0)     return '#10b981';
  if (d.en_pruebas > 0)  return '#f59e0b';
  return '#ef4444';
}

function markerRadius(total: number, max: number): number {
  if (max === 0 || total === 0) return 7;
  return Math.round(7 + Math.sqrt(total / max) * 19);
}

function norm(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

function deptCodeFromName(featureName: string): string | null {
  const n = norm(featureName);
  for (const [code, name] of Object.entries(DEPT_NAMES)) {
    if (norm(name) === n) return code;
  }
  for (const [code, name] of Object.entries(DEPT_NAMES)) {
    const mn = norm(name);
    if (n.includes(mn) || mn.includes(n)) return code;
  }
  return null;
}

function buildPolyTooltip(name: string, depto: MapaDepartamento | null): string {
  if (!depto) return `<strong>${name}</strong>`;
  return `
    <div style="font-family:system-ui,sans-serif;min-width:150px">
      <strong style="font-size:13px;color:#1e293b">${name}</strong>
      <div style="margin-top:5px;font-size:12px;line-height:1.8">
        ${depto.total === 0
          ? '<span style="color:#94a3b8">Sin clientes</span>'
          : `Total: <b>${depto.total}</b><br/>
             ${depto.activos     > 0 ? `<span style="color:#10b981">● Activos: ${depto.activos}</span><br/>` : ''}
             ${depto.en_pruebas  > 0 ? `<span style="color:#d97706">● En pruebas: ${depto.en_pruebas}</span><br/>` : ''}
             ${depto.suspendidos > 0 ? `<span style="color:#ef4444">● Suspendidos: ${depto.suspendidos}</span>` : ''}`
        }
      </div>
    </div>`;
}

// ── CSS de animación y tooltips (inyectado una vez en <head>) ─────────────────
const MAP_CSS = `
  @keyframes sv-pulse {
    0%   { opacity: 0.75; }
    50%  { opacity: 0.12; }
    100% { opacity: 0.75; }
  }
  .sv-pulse { animation: sv-pulse 2.4s ease-in-out infinite !important; }

  .sv-poly-tooltip {
    background: #fff !important;
    border: 1px solid #e2e8f0 !important;
    border-radius: 8px !important;
    padding: 8px 12px !important;
    box-shadow: 0 6px 20px rgba(0,0,0,.12) !important;
    pointer-events: none;
  }
  .sv-poly-tooltip::before { display: none !important; }

  .leaflet-popup-content-wrapper {
    border-radius: 10px !important;
    box-shadow: 0 8px 24px rgba(0,0,0,.15) !important;
  }
  .leaflet-popup-content { margin: 10px 14px !important; }
`;

// ── Componente del mapa (Leaflet puro, sin react-leaflet) ─────────────────────
interface LeafletMapProps {
  deptoMap: Record<string, MapaDepartamento>;
  maxTotal: number;
  selected: string;
  onSelect: (codigo: string) => void;
  geoJSON: any;
}

function LeafletMap({ deptoMap, maxTotal, selected, onSelect, geoJSON }: LeafletMapProps) {
  const divRef    = useRef<HTMLDivElement>(null);
  const mapRef    = useRef<L.Map | null>(null);
  const layersRef = useRef<L.Layer[]>([]);
  const onSelectRef = useRef(onSelect);
  useEffect(() => { onSelectRef.current = onSelect; }, [onSelect]);

  // ── Inicializar mapa una sola vez ─────────────────────────────────────────
  useEffect(() => {
    if (!divRef.current || mapRef.current) return;

    const map = L.map(divRef.current, { zoomControl: false });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://carto.com/" target="_blank">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>',
      maxZoom: 19,
      subdomains: 'abcd',
    }).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);
    map.fitBounds([[13.15, -90.1], [14.45, -87.7]], { padding: [20, 20], animate: false });

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // ── Redibujar capas cuando cambian datos o selección ─────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Eliminar capas anteriores
    layersRef.current.forEach(l => { try { map.removeLayer(l); } catch (_) {} });
    layersRef.current = [];

    // ── GeoJSON de departamentos ──────────────────────────────────────────
    if (geoJSON) {
      const geoLayer = L.geoJSON(geoJSON, {
        style: (feature) => {
          const name  = feature?.properties?.name ?? feature?.properties?.NAME_1 ?? feature?.properties?.shapeName ?? '';
          const code  = deptCodeFromName(name);
          const depto = code ? deptoMap[code] : null;
          if (!depto || depto.total === 0) {
            return { fillColor: '#cbd5e1', fillOpacity: 0.2, color: '#94a3b8', weight: 1.5 };
          }
          const col = deptColor(depto);
          return { fillColor: col, fillOpacity: 0.28, color: col, weight: 2 };
        },
        onEachFeature: (feature, layer) => {
          const name  = feature?.properties?.name ?? feature?.properties?.NAME_1 ?? feature?.properties?.shapeName ?? '';
          const code  = deptCodeFromName(name);
          const depto = code ? deptoMap[code] : null;
          const path  = layer as L.Path;

          path.bindTooltip(buildPolyTooltip(name, depto), {
            sticky: true,
            className: 'sv-poly-tooltip',
          });

          const baseStyle = (path as any).options as L.PathOptions;
          path.on('mouseover', () => path.setStyle({ ...baseStyle, fillOpacity: 0.6, weight: 3 }));
          path.on('mouseout',  () => path.setStyle(baseStyle));
          path.on('click', () => { if (code) onSelectRef.current(code); });
        },
      });
      geoLayer.addTo(map);
      layersRef.current.push(geoLayer);
    }

    // ── Marcadores por departamento ───────────────────────────────────────
    for (const [codigo, [lat, lon]] of Object.entries(CENTROIDES)) {
      const depto = deptoMap[codigo];
      if (!depto) continue;

      const r     = markerRadius(depto.total, maxTotal);
      const col   = deptColor(depto);
      const isSel = selected === codigo;

      // Anillo pulsante decorativo
      const ring = L.circleMarker([lat, lon], {
        radius: r + 9,
        fillColor: col,
        fillOpacity: 0.22,
        color: col,
        weight: 1,
        opacity: 0.3,
        interactive: false,
        className: 'sv-pulse',
      } as any);
      ring.addTo(map);
      layersRef.current.push(ring);

      // Círculo principal
      const circle = L.circleMarker([lat, lon], {
        radius: r,
        fillColor: col,
        fillOpacity: isSel ? 1 : 0.9,
        color: '#ffffff',
        weight: isSel ? 3 : 2,
      });
      circle.addTo(map);
      circle.bindTooltip(buildPolyTooltip(depto.nombre, depto), {
        sticky: false,
        className: 'sv-poly-tooltip',
      });
      circle.bindPopup(`
        <div style="min-width:155px;font-family:system-ui,sans-serif">
          <p style="margin:0 0 6px;font-weight:700;font-size:14px;color:#1e293b">${depto.nombre}</p>
          ${depto.total === 0
            ? '<p style="margin:0;color:#94a3b8;font-size:13px">Sin clientes registrados</p>'
            : `<div style="font-size:12px;line-height:1.9">
                 <p style="margin:0">Total: <strong>${depto.total}</strong></p>
                 ${depto.activos     > 0 ? `<p style="margin:0;color:#10b981">● Activos: <strong>${depto.activos}</strong></p>` : ''}
                 ${depto.en_pruebas  > 0 ? `<p style="margin:0;color:#d97706">● En pruebas: <strong>${depto.en_pruebas}</strong></p>` : ''}
                 ${depto.suspendidos > 0 ? `<p style="margin:0;color:#ef4444">● Suspendidos: <strong>${depto.suspendidos}</strong></p>` : ''}
               </div>`
          }
        </div>
      `);
      circle.on('click', () => onSelectRef.current(codigo));
      layersRef.current.push(circle);

      // Número dentro del círculo (etiqueta DivIcon)
      if (depto.total > 0 && r >= 11) {
        const d    = r * 2;
        const icon = L.divIcon({
          className: '',
          html: `<span style="display:block;width:${d}px;height:${d}px;line-height:${d}px;text-align:center;font-weight:800;font-size:${r > 16 ? 11 : 9}px;color:#fff;text-shadow:0 1px 3px rgba(0,0,0,.65);pointer-events:none">${depto.total}</span>`,
          iconSize:   [d, d],
          iconAnchor: [r, r],
        });
        const label = L.marker([lat, lon], { icon, interactive: false, zIndexOffset: 500 });
        label.addTo(map);
        layersRef.current.push(label);
      }
    }
  }, [deptoMap, maxTotal, selected, geoJSON]);

  return <div ref={divRef} style={{ height: 510, width: '100%' }} />;
}

// ── Leyenda ───────────────────────────────────────────────────────────────────
function Leyenda() {
  return (
    <div style={{ display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
      {[
        { color: '#10b981', label: 'Con activos' },
        { color: '#f59e0b', label: 'En pruebas' },
        { color: '#ef4444', label: 'Suspendidos' },
        { color: '#94a3b8', label: 'Sin clientes' },
      ].map(({ color, label }) => (
        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
          <span style={{ fontSize: 11, color: colors.textSecondary }}>{label}</span>
        </div>
      ))}
    </div>
  );
}

// ── Ranking lateral ───────────────────────────────────────────────────────────
function RankingList({ departamentos, selected, onSelect }: {
  departamentos: MapaDepartamento[];
  selected: string;
  onSelect: (c: string) => void;
}) {
  const sorted = [...departamentos].sort((a, b) => b.total - a.total);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', overflowY: 'auto', maxHeight: 490 }}>
      {sorted.map((d, i) => {
        const active = selected === d.codigo;
        const col    = deptColor(d);
        return (
          <button
            key={d.codigo}
            onClick={() => onSelect(active ? '' : d.codigo)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 14px',
              background: active ? `${colors.accent}14` : 'transparent',
              border: 'none',
              borderLeft: active ? `3px solid ${colors.accent}` : '3px solid transparent',
              borderBottom: `1px solid ${colors.borderLight}`,
              cursor: 'pointer', textAlign: 'left', width: '100%',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = colors.mutedBg; }}
            onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
          >
            <span style={{
              width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
              background: i < 3 ? colors.accent : colors.mutedBg,
              color: i < 3 ? colors.accentText : colors.textMuted,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, fontWeight: 700,
            }}>
              {i + 1}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: colors.textPrimary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {d.nombre}
              </p>
              {d.total > 0 && (
                <p style={{ margin: 0, fontSize: 11, color: colors.textMuted }}>
                  {d.activos     > 0 && <span style={{ color: '#10b981' }}>{d.activos}a </span>}
                  {d.en_pruebas  > 0 && <span style={{ color: '#f59e0b' }}>{d.en_pruebas}p </span>}
                  {d.suspendidos > 0 && <span style={{ color: '#ef4444' }}>{d.suspendidos}s</span>}
                </p>
              )}
            </div>
            <span style={{
              padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 700,
              background: d.total > 0 ? `${col}22` : colors.mutedBg,
              color:      d.total > 0 ? col : colors.textMuted,
            }}>
              {d.total}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ── Fetch GeoJSON intentando múltiples URLs ───────────────────────────────────
async function fetchGeoJSON(): Promise<any> {
  for (const url of GEOJSON_URLS) {
    try {
      const r = await fetch(url);
      if (!r.ok) continue;
      return await r.json();
    } catch (_) {
      continue;
    }
  }
  return null; // Ninguna URL funcionó — el mapa igual funciona sin polígonos
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function MapaClientesPage() {
  const [data,     setData]     = useState<MapaData | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);
  const [geoJSON,  setGeoJSON]  = useState<any>(null);
  const [selected, setSelected] = useState('');

  // Inyectar CSS una sola vez
  useEffect(() => {
    if (document.getElementById('sv-map-css')) return;
    const el = document.createElement('style');
    el.id = 'sv-map-css';
    el.textContent = MAP_CSS;
    document.head.appendChild(el);
    return () => { document.getElementById('sv-map-css')?.remove(); };
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await mapaService.get());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Fetch GeoJSON de El Salvador (intentar varias URLs)
  useEffect(() => {
    fetchGeoJSON().then(data => { if (data) setGeoJSON(data); });
  }, []);

  const deptoMap = useMemo(
    () => data ? Object.fromEntries(data.departamentos.map(d => [d.codigo, d])) : {},
    [data],
  );

  const maxTotal = useMemo(
    () => data ? Math.max(...data.departamentos.map(d => d.total), 1) : 1,
    [data],
  );

  const handleSelect = useCallback((codigo: string) => {
    setSelected(prev => prev === codigo ? '' : codigo);
  }, []);

  // ── Skeleton de carga ─────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ padding: 32 }}>
        <div style={{ height: 28, width: 220, background: colors.mutedBg, borderRadius: 6, marginBottom: 24 }} />
        <div style={{ height: 540, background: colors.mutedBg, borderRadius: 12 }} />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 32, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, marginTop: 60 }}>
        <AlertCircle size={40} color="#dc2626" />
        <p style={{ fontSize: 14, color: colors.textSecondary }}>{error}</p>
        <button
          onClick={fetchData}
          style={{ padding: '8px 20px', borderRadius: radius.md ?? 8, background: colors.accent, color: colors.accentText, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (!data) return null;

  const conUbicacion = data.departamentos.reduce((s, d) => s + d.total, 0);

  return (
    <div style={{ padding: '32px 28px' }}>

      {/* ── Encabezado ───────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 4, height: 22, borderRadius: 4, background: colors.accent }} />
          <MapIcon size={18} color={colors.accent} />
          <h2 style={{ margin: 0, fontSize: 21, fontWeight: 700, color: colors.textPrimary, letterSpacing: '-0.3px' }}>
            Mapa de Clientes
          </h2>
        </div>
        <button
          onClick={fetchData}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: radius.md ?? 8, background: colors.cardBg, border: `1px solid ${colors.border}`, cursor: 'pointer', fontSize: 12, color: colors.textSecondary }}
        >
          <RefreshCw size={12} /> Actualizar
        </button>
      </div>
      <p style={{ color: colors.textMuted, fontSize: 13, margin: '0 0 24px 14px' }}>
        Distribución geográfica de clientes por departamento de El Salvador
      </p>

      {/* ── KPIs ─────────────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Total tenants',  val: data.total_tenants, color: colors.textPrimary, Icon: Users },
          { label: 'Con ubicación',  val: conUbicacion,        color: '#10b981',          Icon: MapPin },
          { label: 'Sin ubicación',  val: data.sin_ubicacion,  color: '#f59e0b',          Icon: AlertCircle },
        ].map(({ label, val, color, Icon }) => (
          <div key={label} style={{
            background: colors.cardBg, border: `1px solid ${colors.border}`,
            borderRadius: radius.lg ?? 12, boxShadow: shadow.card,
            padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14,
          }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon size={18} color={color} />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color }}>{val}</p>
              <p style={{ margin: 0, fontSize: 12, color: colors.textMuted }}>{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Mapa + Ranking ───────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20, alignItems: 'start' }}>

        {/* Panel del mapa */}
        <div style={{
          background: colors.cardBg, border: `1px solid ${colors.border}`,
          borderRadius: radius.lg ?? 12, boxShadow: shadow.card, overflow: 'hidden',
        }}>
          <div style={{ padding: '12px 20px', borderBottom: `1px solid ${colors.borderLight}` }}>
            <Leyenda />
          </div>

          <LeafletMap
            deptoMap={deptoMap}
            maxTotal={maxTotal}
            selected={selected}
            onSelect={handleSelect}
            geoJSON={geoJSON}
          />

          <div style={{ padding: '8px 18px', borderTop: `1px solid ${colors.borderLight}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{ margin: 0, fontSize: 11, color: colors.textMuted }}>
              Arrastra · Rueda para zoom · Clic en marcador para ver detalle
            </p>
            {!geoJSON && (
              <span style={{ fontSize: 11, color: '#94a3b8' }}>Cargando límites…</span>
            )}
          </div>
        </div>

        {/* Ranking lateral */}
        <div style={{
          background: colors.cardBg, border: `1px solid ${colors.border}`,
          borderRadius: radius.lg ?? 12, boxShadow: shadow.card, overflow: 'hidden',
        }}>
          <div style={{ padding: '14px 16px', borderBottom: `1px solid ${colors.border}` }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: colors.textPrimary }}>
              Ranking por departamento
            </p>
            <p style={{ margin: '2px 0 0', fontSize: 11, color: colors.textMuted }}>
              {data.departamentos.filter(d => d.total > 0).length} de 14 con clientes
            </p>
          </div>

          <RankingList
            departamentos={data.departamentos}
            selected={selected}
            onSelect={handleSelect}
          />

          {data.sin_ubicacion > 0 && (
            <div style={{ padding: '10px 14px', borderTop: `1px solid ${colors.border}`, background: '#fffbeb' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertCircle size={14} color="#f59e0b" />
                <span style={{ fontSize: 12, color: '#92400e', fontWeight: 600 }}>
                  {data.sin_ubicacion} cliente{data.sin_ubicacion !== 1 ? 's' : ''} sin departamento
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
