/**
 * useFacturacion.ts — Hook personalizado para manejar facturación.
 *
 * Proporciona:
 *   - Estado de líneas de factura con descuentos por línea
 *   - Tres modos de receptor (A=Anónimo, B=Transitorio, C=Registrado)
 *   - Retención ISR 1% (Art.156-A CT) para grandes contribuyentes en DTE_03
 *   - Cálculos automáticos de subtotal, descuento, IVA y total
 */

import { useState, useCallback, useMemo } from 'react';
import { TipoDTE, ReceptorModo, FacturaLineaPOS } from '../types/facturacion.types';
import * as facturacionService from '../services/facturacion.service';
import { notify } from '../utils/notify';

const IVA_PORCENTAJE = 0.13;
const r2 = (n: number) => Math.round(n * 100) / 100;

type MetodoPago = 'efectivo' | 'tarjeta' | 'transferencia' | 'otro';

interface UseFacturacionReturn {
  // Terminal activa
  puntoVentaId: number | null;
  setPuntoVentaId: (id: number | null) => void;
  // Estado receptor
  receptorModo: ReceptorModo;
  clienteId: number | null;
  tipoCliente: string;
  receptorNombre: string;
  receptorCorreo: string;
  // Estado factura
  lineas: FacturaLineaPOS[];
  fechaEmision: string;
  fechaVencimiento: string;
  notas: string;
  // Método de pago
  metodoPago: MetodoPago;
  // Retención ISR (solo DTE_03)
  granContribuyente: boolean;

  // Cálculos reactivos
  subtotalBruto: number;    // suma precios × cantidad sin descuentos
  totalDescuento: number;   // suma descuentos
  subtotal: number;         // subtotalBruto - totalDescuento (base imponible)
  iva: number;              // solo DTE_03
  retencionRenta: number;   // ISR 1% solo si granContribuyente y DTE_03
  total: number;            // subtotal + iva - retencionRenta
  tipoDTE: TipoDTE;
  tipoDTEAuto: TipoDTE;     // tipo detectado automáticamente (para mostrar en UI)
  tipoDTEOverride: TipoDTE | null; // null = automático; valor = forzado por el usuario

  // Setters de receptor
  setReceptorModo: (modo: ReceptorModo) => void;
  setClienteId: (id: number | null) => void;
  setTipoCliente: (tipo: string) => void;
  setReceptorNombre: (nombre: string) => void;
  setReceptorCorreo: (correo: string) => void;
  // Setters de factura
  setFechaEmision: (fecha: string) => void;
  setFechaVencimiento: (fecha: string) => void;
  setNotas: (notas: string) => void;
  setMetodoPago: (m: MetodoPago) => void;
  setGranContribuyente: (val: boolean) => void;
  setTipoDTEOverride: (tipo: TipoDTE | null) => void;

  agregarLinea: (linea: FacturaLineaPOS) => void;
  actualizarLinea: (index: number, linea: FacturaLineaPOS) => void;
  eliminarLinea: (index: number) => void;
  limpiarCarrito: () => void;

  // Acción principal
  crearFactura: () => Promise<any>;
  isLoading: boolean;
}

export function useFacturacion(): UseFacturacionReturn {
  // ── Terminal activa ───────────────────────────────────────────────────────
  const [puntoVentaId, setPuntoVentaId] = useState<number | null>(null);

  // ── Estado receptor ──────────────────────────────────────────────────────
  const [receptorModo, setReceptorModo] = useState<ReceptorModo>('A');
  const [clienteId,    setClienteId]    = useState<number | null>(null);
  const [tipoCliente,  setTipoCliente]  = useState<string>('');
  const [receptorNombre, setReceptorNombre] = useState<string>('');
  const [receptorCorreo, setReceptorCorreo] = useState<string>('');

  // ── Estado factura ───────────────────────────────────────────────────────
  const [lineas,           setLineas]           = useState<FacturaLineaPOS[]>([]);
  const [fechaEmision,     setFechaEmision]     = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [fechaVencimiento, setFechaVencimiento] = useState<string>('');
  const [notas,            setNotas]            = useState<string>('');
  const [metodoPago,       setMetodoPago]       = useState<MetodoPago>('efectivo');
  const [granContribuyente, setGranContribuyente] = useState(false);

  // Override manual de tipo DTE (null = usar el automático por tipo_cliente)
  const [tipoDTEOverride, setTipoDTEOverride] = useState<TipoDTE | null>(null);

  // ── Tipo DTE según modo y tipo de cliente ────────────────────────────────
  // Modos A y B → siempre DTE_01 (sin override posible)
  // Modo C → auto por tipo_cliente, pero el usuario puede sobreescribir por transacción
  const tipoDTEAuto: TipoDTE = useMemo(() => {
    if (receptorModo !== 'C') return 'DTE_01';
    return tipoCliente === 'empresa' ? 'DTE_03' : 'DTE_01';
  }, [receptorModo, tipoCliente]);

  const tipoDTE: TipoDTE = useMemo(() => {
    // El override solo aplica en Modo C; en A/B siempre DTE_01
    if (receptorModo === 'C' && tipoDTEOverride !== null) return tipoDTEOverride;
    return tipoDTEAuto;
  }, [receptorModo, tipoDTEOverride, tipoDTEAuto]);

  // ── Cálculos reactivos ───────────────────────────────────────────────────
  const { subtotalBruto, totalDescuento, subtotal, iva, retencionRenta, total } =
    useMemo(() => {
      let bruto = 0;
      let descu = 0;

      for (const l of lineas) {
        const d = r2(l.descuento ?? 0);
        bruto += r2(l.precio_unitario * l.cantidad);
        descu += r2(d * l.cantidad);
      }

      const sub   = r2(bruto - descu);
      const ivaV  = tipoDTE === 'DTE_03' ? r2(sub * IVA_PORCENTAJE) : 0;
      // Retención ISR: 1% sobre base imponible (sub) cuando el comprador es gran contribuyente
      const reteR = (tipoDTE === 'DTE_03' && granContribuyente) ? r2(sub * 0.01) : 0;
      const tot   = r2(sub + ivaV - reteR);

      return {
        subtotalBruto:   r2(bruto),
        totalDescuento:  r2(descu),
        subtotal:        sub,
        iva:             ivaV,
        retencionRenta:  reteR,
        total:           tot,
      };
    }, [lineas, tipoDTE, granContribuyente]);

  // ── Manipulación de líneas ───────────────────────────────────────────────

  const agregarLinea = useCallback((linea: FacturaLineaPOS) => {
    setLineas(prev => [...prev, linea]);
  }, []);

  const actualizarLinea = useCallback((index: number, linea: FacturaLineaPOS) => {
    setLineas(prev => {
      const next = [...prev];
      next[index] = linea;
      return next;
    });
  }, []);

  const eliminarLinea = useCallback((index: number) => {
    setLineas(prev => prev.filter((_, i) => i !== index));
  }, []);

  const limpiarCarrito = useCallback(() => {
    setLineas([]);
    setClienteId(null);
    setTipoCliente('');
    setReceptorNombre('');
    setReceptorCorreo('');
    setReceptorModo('A');
    setGranContribuyente(false);
    setTipoDTEOverride(null);
    setNotas('');
    setFechaVencimiento('');
    setMetodoPago('efectivo');
    // No resetear puntoVentaId aquí: se resetea solo al cambiar de terminal
  }, []);

  // ── Estado de carga ──────────────────────────────────────────────────────
  const [isLoading, setIsLoading] = useState(false);

  // ── Crear factura ────────────────────────────────────────────────────────
  const crearFactura = useCallback(async () => {
    if (!puntoVentaId) {
      notify.error('Selecciona un punto de venta (terminal) para iniciar');
      return;
    }
    if (lineas.length === 0) {
      notify.error('Agrega al menos un producto al carrito');
      return;
    }
    if (receptorModo === 'C' && !clienteId) {
      notify.error('Selecciona un cliente registrado');
      return;
    }
    if (receptorModo === 'B' && !receptorNombre.trim()) {
      notify.error('Ingresa el nombre del receptor');
      return;
    }

    setIsLoading(true);

    try {
      const respuesta = await facturacionService.crearFactura({
        punto_venta_id:    puntoVentaId!,
        receptor_modo:     receptorModo,
        cliente_id:        receptorModo === 'C' ? clienteId! : undefined,
        receptor_nombre:   receptorModo === 'B' ? receptorNombre : undefined,
        receptor_correo:   receptorModo === 'B' ? (receptorCorreo || undefined) : undefined,
        // Enviar override solo en Modo C y cuando sea diferente al auto-detectado
        tipo_dte_override: (receptorModo === 'C' && tipoDTEOverride !== null)
          ? tipoDTEOverride as 'DTE_01' | 'DTE_03' | 'DTE_11'
          : undefined,
        retencion_renta:   retencionRenta > 0 ? retencionRenta : undefined,
        metodo_pago:       metodoPago,
        fecha_emision:     fechaEmision,
        fecha_vencimiento: fechaVencimiento || undefined,
        notas:             notas || undefined,
        detalles: lineas.map(l => ({
          producto_id:     l.producto_id,
          cantidad:        l.cantidad,
          precio_unitario: l.precio_unitario,
          descuento:       l.descuento ?? 0,
          lote:            l.lote ?? undefined,
        })),
      });

      limpiarCarrito();
      notify.success('Factura creada correctamente');
      return respuesta;
    } catch (err: any) {
      const mensaje = err.response?.data?.message || 'Error al crear factura';
      notify.error('Error al crear factura', mensaje);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [
    puntoVentaId, lineas, receptorModo, clienteId, receptorNombre, receptorCorreo,
    tipoDTEOverride, retencionRenta, metodoPago, fechaEmision, fechaVencimiento, notas, limpiarCarrito,
  ]);

  return {
    puntoVentaId,
    setPuntoVentaId,
    receptorModo,
    clienteId,
    tipoCliente,
    receptorNombre,
    receptorCorreo,
    lineas,
    fechaEmision,
    fechaVencimiento,
    notas,
    metodoPago,
    granContribuyente,
    subtotalBruto,
    totalDescuento,
    subtotal,
    iva,
    retencionRenta,
    total,
    tipoDTE,
    tipoDTEAuto,
    tipoDTEOverride,
    setReceptorModo,
    setClienteId,
    setTipoCliente,
    setReceptorNombre,
    setReceptorCorreo,
    setFechaEmision,
    setFechaVencimiento,
    setNotas,
    setMetodoPago,
    setGranContribuyente,
    setTipoDTEOverride,
    agregarLinea,
    actualizarLinea,
    eliminarLinea,
    limpiarCarrito,
    crearFactura,
    isLoading,
  };
}
