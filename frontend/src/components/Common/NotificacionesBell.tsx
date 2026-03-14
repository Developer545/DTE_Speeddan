/**
 * NotificacionesBell.tsx — Campana de notificaciones del ERP.
 *
 * Comportamiento:
 *   - Muestra badge con total de notificaciones no leídas (rojo si hay urgentes, ámbar si solo warnings)
 *   - Al hacer clic abre un dropdown fijo (position:fixed) con la lista de notificaciones
 *   - Cada notificación tiene: ícono coloreado, título, mensaje, primeros 5 ítems afectados
 *   - Botón "Ir" navega al módulo correspondiente y cierra el panel
 *   - Botón "Marcar todo como leído" guarda el estado en localStorage por tenantId
 *   - Se refresca automáticamente cada 5 minutos
 *   - Se cierra al hacer clic fuera o presionar Escape
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell, X, Package, Clock, AlertTriangle, FileText,
  CheckCircle, ArrowRight, RefreshCw,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { colors, radius, shadow } from '../../styles/colors';
import * as svc from '../../services/notificaciones.service';

// ── Config ────────────────────────────────────────────────────────────────────

const POLL_MS = 5 * 60 * 1000; // 5 minutos

// ── Helpers visuales ──────────────────────────────────────────────────────────

const TIPO_CONFIG: Record<svc.NotifTipo, {
  bg: string; border: string; text: string; iconBg: string;
  Icon: React.ComponentType<{ size: number; color: string }>;
}> = {
  danger: {
    bg:     'rgba(239,68,68,0.06)',
    border: 'rgba(239,68,68,0.2)',
    text:   '#dc2626',
    iconBg: 'rgba(239,68,68,0.12)',
    Icon:   AlertTriangle,
  },
  warning: {
    bg:     'rgba(245,158,11,0.06)',
    border: 'rgba(245,158,11,0.2)',
    text:   '#d97706',
    iconBg: 'rgba(245,158,11,0.12)',
    Icon:   Clock,
  },
  info: {
    bg:     'rgba(59,130,246,0.06)',
    border: 'rgba(59,130,246,0.2)',
    text:   '#3b82f6',
    iconBg: 'rgba(59,130,246,0.12)',
    Icon:   FileText,
  },
};

const ICONO_POR_ID: Record<string, React.ComponentType<{ size: number; color: string }>> = {
  sin_stock:          Package,
  por_vencer_urgente: AlertTriangle,
  por_vencer_30:      Clock,
  facturas_borrador:  FileText,
};

// ── Componente ────────────────────────────────────────────────────────────────

export function NotificacionesBell() {
  const { user } = useAuth();
  const navigate  = useNavigate();
  const tenantId  = user?.tenantId ?? 0;

  const [data,      setData]      = useState<svc.NotificacionesResponse | null>(null);
  const [loading,   setLoading]   = useState(false);
  const [open,      setOpen]      = useState(false);
  const [unread,    setUnread]    = useState(0);
  const [dropPos,   setDropPos]   = useState({ top: 0, right: 0 });

  const bellRef    = useRef<HTMLButtonElement>(null);
  const panelRef   = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Fetch ─────────────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const res = await svc.getNotificaciones();
      setData(res);
      setUnread(svc.countUnread(tenantId, res.notificaciones));
    } catch { /* silencioso — la campana no debe romper la UI */ }
    finally  { setLoading(false); }
  }, [tenantId]);

  useEffect(() => {
    fetchData();
    intervalRef.current = setInterval(fetchData, POLL_MS);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [fetchData]);

  // ── Cerrar al hacer clic fuera o Escape ───────────────────────────────────

  useEffect(() => {
    if (!open) return;
    function handleOutside(e: MouseEvent) {
      if (
        panelRef.current  && !panelRef.current.contains(e.target as Node) &&
        bellRef.current   && !bellRef.current.contains(e.target as Node)
      ) setOpen(false);
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown',   handleKey);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown',   handleKey);
    };
  }, [open]);

  // ── Abrir/cerrar con posición calculada ───────────────────────────────────

  function handleToggle() {
    if (!open && bellRef.current) {
      const rect = bellRef.current.getBoundingClientRect();
      setDropPos({
        top:   rect.bottom + 8,
        right: window.innerWidth - rect.right,
      });
    }
    setOpen(prev => !prev);
  }

  // ── Marcar como leído ─────────────────────────────────────────────────────

  function handleMarkRead() {
    if (!data) return;
    svc.markAllRead(tenantId, data.notificaciones);
    setUnread(0);
  }

  // ── Navegar a módulo ──────────────────────────────────────────────────────

  function handleIr(ruta: string) {
    setOpen(false);
    navigate(ruta);
  }

  // ── Badge color ───────────────────────────────────────────────────────────

  const hasUrgent = (data?.urgentes ?? 0) > 0;
  const badgeColor = hasUrgent ? '#ef4444' : '#f59e0b';

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── Campana ── */}
      <button
        ref={bellRef}
        onClick={handleToggle}
        style={{
          width: 40, height: 40,
          background: open ? 'var(--row-hover, #ebebeb)' : 'var(--input-bg, #f5f5f5)',
          border: `1px solid ${open ? 'var(--border, #e5e5e5)' : 'var(--border, #e5e5e5)'}`,
          borderRadius: 10,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', position: 'relative', transition: 'background 0.15s',
        }}
        title="Notificaciones"
      >
        <Bell
          size={20}
          color={open ? 'var(--text-primary, #111)' : 'var(--text-secondary, #444)'}
          style={{ transition: 'transform 0.2s', transform: open ? 'rotate(-15deg)' : 'none' }}
        />

        {/* Badge de notificaciones no leídas */}
        {unread > 0 && (
          <span style={{
            position: 'absolute',
            top: 5, right: 5,
            minWidth: 16, height: 16,
            background: badgeColor,
            borderRadius: 8,
            border: '2px solid var(--card-bg, #fff)',
            fontSize: 9, fontWeight: 800, color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '0 3px', lineHeight: 1,
          }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}

        {/* Punto vacío cuando no hay notificaciones no leídas pero sí hay data cargada */}
        {unread === 0 && (data?.total ?? 0) === 0 && data !== null && (
          <span style={{
            position: 'absolute', top: 7, right: 7,
            width: 7, height: 7, borderRadius: '50%',
            background: '#10b981', border: '1.5px solid var(--card-bg, #fff)',
          }} />
        )}
      </button>

      {/* ── Panel dropdown (position:fixed) ── */}
      {open && (
        <div
          ref={panelRef}
          style={{
            position: 'fixed',
            top:   dropPos.top,
            right: dropPos.right,
            width: 380,
            maxHeight: 'calc(100vh - 100px)',
            background: colors.cardBg,
            border: `1px solid ${colors.border}`,
            borderRadius: radius.lg,
            boxShadow: shadow.modal,
            zIndex: 9999,
            display: 'flex', flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Encabezado */}
          <div style={{
            padding: '14px 18px',
            borderBottom: `1px solid ${colors.border}`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Bell size={15} color={colors.accent} />
              <span style={{ fontSize: 14, fontWeight: 700, color: colors.textPrimary }}>
                Notificaciones
              </span>
              {(data?.total ?? 0) > 0 && (
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: '2px 7px',
                  background: hasUrgent ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)',
                  color: hasUrgent ? '#dc2626' : '#d97706',
                  borderRadius: 10,
                }}>
                  {data!.total}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button
                onClick={fetchData}
                disabled={loading}
                title="Actualizar"
                style={{
                  background: 'none', border: 'none', cursor: 'pointer', padding: 4,
                  color: colors.textMuted, display: 'flex', alignItems: 'center',
                }}
              >
                <RefreshCw
                  size={13}
                  style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }}
                />
              </button>
              <button
                onClick={() => setOpen(false)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer', padding: 4,
                  color: colors.textMuted, display: 'flex', alignItems: 'center',
                }}
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Cuerpo con scroll */}
          <div style={{ overflowY: 'auto', flex: 1 }}>

            {/* Loading skeleton */}
            {loading && !data && (
              <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[1,2,3].map(i => (
                  <div key={i} style={{
                    height: 70, borderRadius: 8,
                    background: 'var(--skeleton-from, #efefef)',
                    animation: 'pulse 1.5s ease-in-out infinite',
                  }} />
                ))}
              </div>
            )}

            {/* Sin notificaciones */}
            {!loading && data?.total === 0 && (
              <div style={{
                padding: '40px 20px', textAlign: 'center',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
              }}>
                <div style={{
                  width: 48, height: 48, borderRadius: '50%',
                  background: 'rgba(16,185,129,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <CheckCircle size={24} color="#10b981" />
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: colors.textPrimary }}>
                  ¡Todo al día!
                </div>
                <div style={{ fontSize: 12, color: colors.textMuted }}>
                  No hay alertas pendientes en este momento.
                </div>
              </div>
            )}

            {/* Lista de notificaciones */}
            {data && data.notificaciones.map(notif => {
              const cfg   = TIPO_CONFIG[notif.tipo];
              const Icon  = ICONO_POR_ID[notif.id] ?? cfg.Icon;
              const isRead = svc.getReadMap(tenantId)[notif.id] === notif.count;

              return (
                <div
                  key={notif.id}
                  style={{
                    margin: '8px 10px',
                    padding: '12px 14px',
                    background: isRead ? 'transparent' : cfg.bg,
                    border: `1px solid ${isRead ? colors.borderLight : cfg.border}`,
                    borderRadius: 10,
                    opacity: isRead ? 0.65 : 1,
                    transition: 'all 0.2s',
                  }}
                >
                  {/* Cabecera notif */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                      background: cfg.iconBg,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Icon size={15} color={cfg.text} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: colors.textPrimary, marginBottom: 2 }}>
                        {notif.titulo}
                      </div>
                      <div style={{ fontSize: 11, color: colors.textMuted, lineHeight: 1.4 }}>
                        {notif.mensaje}
                      </div>
                    </div>
                    {!isRead && (
                      <div style={{
                        width: 7, height: 7, borderRadius: '50%', flexShrink: 0, marginTop: 4,
                        background: cfg.text,
                      }} />
                    )}
                  </div>

                  {/* Ítems afectados (primeros 5) */}
                  {notif.items.length > 0 && (
                    <div style={{
                      marginTop: 8, marginLeft: 42,
                      display: 'flex', flexDirection: 'column', gap: 2,
                    }}>
                      {notif.items.slice(0, 5).map((item, i) => (
                        <div key={i} style={{
                          fontSize: 11, color: colors.textSecondary,
                          display: 'flex', alignItems: 'center', gap: 4,
                        }}>
                          <div style={{
                            width: 3, height: 3, borderRadius: '50%',
                            background: cfg.text, flexShrink: 0,
                          }} />
                          {item}
                        </div>
                      ))}
                      {notif.items.length > 5 && (
                        <div style={{ fontSize: 11, color: colors.textMuted, marginLeft: 7 }}>
                          y {notif.items.length - 5} más…
                        </div>
                      )}
                    </div>
                  )}

                  {/* Botón Ir */}
                  <div style={{ marginTop: 10, marginLeft: 42 }}>
                    <button
                      onClick={() => handleIr(notif.ruta)}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        padding: '4px 10px', borderRadius: 6,
                        background: cfg.iconBg, border: `1px solid ${cfg.border}`,
                        color: cfg.text, fontSize: 11, fontWeight: 700, cursor: 'pointer',
                        transition: 'opacity 0.15s',
                      }}
                    >
                      Ir al módulo
                      <ArrowRight size={11} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pie: Marcar como leído */}
          {data && data.total > 0 && (
            <div style={{
              padding: '10px 18px',
              borderTop: `1px solid ${colors.border}`,
              flexShrink: 0,
            }}>
              <button
                onClick={handleMarkRead}
                style={{
                  width: '100%', padding: '7px', borderRadius: 8,
                  background: 'transparent', border: `1px solid ${colors.border}`,
                  color: colors.textMuted, fontSize: 12, fontWeight: 600,
                  cursor: 'pointer', transition: 'all 0.15s',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.background = colors.inputBg;
                  (e.currentTarget as HTMLElement).style.color = colors.textPrimary;
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.background = 'transparent';
                  (e.currentTarget as HTMLElement).style.color = colors.textMuted;
                }}
              >
                <CheckCircle size={12} />
                Marcar todo como leído
              </button>
            </div>
          )}
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </>
  );
}
