/**
 * notificaciones.service.ts — Tipos y llamada API para el sistema de notificaciones.
 */

import api from './api';

export type NotifTipo = 'danger' | 'warning' | 'info';

export interface Notificacion {
  id:      string;
  tipo:    NotifTipo;
  titulo:  string;
  mensaje: string;
  count:   number;
  items:   string[];
  ruta:    string;
}

export interface NotificacionesResponse {
  total:          number;
  urgentes:       number;
  notificaciones: Notificacion[];
}

export async function getNotificaciones(): Promise<NotificacionesResponse> {
  const { data } = await api.get<NotificacionesResponse>('/notificaciones');
  return data;
}

// ── Read state en localStorage ────────────────────────────────────────────────
// Clave: erp_notif_read_{tenantId}
// Valor: { [notifId]: count } — count al momento de marcar como leído.
// Una notif es "no leída" si su count actual ≠ count guardado.

type ReadMap = Record<string, number>;

function storageKey(tenantId: number) {
  return `erp_notif_read_${tenantId}`;
}

export function getReadMap(tenantId: number): ReadMap {
  try {
    return JSON.parse(localStorage.getItem(storageKey(tenantId)) ?? '{}');
  } catch { return {}; }
}

export function saveReadMap(tenantId: number, map: ReadMap): void {
  try {
    localStorage.setItem(storageKey(tenantId), JSON.stringify(map));
  } catch { /* silencioso */ }
}

/** Marca todas las notificaciones actuales como leídas. */
export function markAllRead(tenantId: number, notificaciones: Notificacion[]): void {
  const map: ReadMap = {};
  for (const n of notificaciones) map[n.id] = n.count;
  saveReadMap(tenantId, map);
}

/** Cuántas notificaciones tienen count diferente al guardado (= no leídas). */
export function countUnread(tenantId: number, notificaciones: Notificacion[]): number {
  const map = getReadMap(tenantId);
  return notificaciones.filter(n => map[n.id] !== n.count).length;
}
