/**
 * ListPage.tsx — Página CRUD completa y genérica.
 *
 * Orquesta: búsqueda + tabla + paginación + modal crear/editar + modal eliminar.
 *
 * Para crear un módulo nuevo (Productos, Compras, etc.) solo necesitas:
 *   1. Definir COLUMNS, FIELDS y ENTITY_CONFIG en un archivo config.tsx
 *   2. Crear el servicio en services/
 *   3. Usar: <ListPage config={...} columns={...} fields={...} useData={...} />
 *   No toques este archivo.
 */

import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { colors, radius } from '../../styles/colors';
import type { ColumnConfig, FieldConfig, EntityConfig, UseGenericCRUDReturn, DetailField } from './types';
import SearchBar    from './SearchBar';
import DataTable    from './DataTable';
import Pagination   from './Pagination';
import GenericForm  from './GenericForm';
import ConfirmDialog from './ConfirmDialog';
import DetailModal  from './DetailModal';
import { notify }  from '../../utils/notify';

/** Props que recibe un componente de formulario personalizado */
export interface CustomFormProps {
  title:         string;
  submitLabel:   string;
  fields?:       FieldConfig[];
  defaultValues: Record<string, unknown>;
  onSubmit:      (data: Record<string, unknown>) => void;
  onClose:       () => void;
  loading:       boolean;
}

interface Props<T extends { id: number }, CreateDTO> {
  /** Textos de interfaz del módulo (título, botones, etc.) */
  config:    EntityConfig;
  /** Columnas de la tabla */
  columns:   ColumnConfig<T>[];
  /** Campos del formulario — requerido solo si no se usa customFormComponent */
  fields:    FieldConfig[];
  /** Icono que se muestra cuando la tabla está vacía */
  emptyIcon: React.ReactNode;
  /** Hook de datos del módulo (resultado de useGenericCRUD) */
  useData:   () => UseGenericCRUDReturn<T, CreateDTO>;
  /**
   * Convierte un item existente a los defaultValues del formulario de edición.
   * Necesario para manejar nulls y tipos.
   */
  toFormValues: (item: T) => Record<string, unknown>;
  /** Valores por defecto al crear un item nuevo. */
  createDefaults: Record<string, unknown>;
  /** Campos que se muestran en el modal de detalle (ícono ojo). Opcional. */
  detailFields?: DetailField<T>[];
  /** Título del modal de detalle. Por defecto usa config.pageTitle. */
  detailTitle?: (item: T) => string;
  /**
   * Componente de formulario personalizado (reemplaza a GenericForm).
   * Útil cuando el formulario necesita lógica condicional compleja.
   * Recibe las mismas props que GenericForm.
   */
  customFormComponent?: React.ComponentType<CustomFormProps>;
}

function ListPage<T extends { id: number }, CreateDTO>({
  config, columns, fields, emptyIcon,
  useData, toFormValues, createDefaults,
  detailFields, detailTitle,
  customFormComponent: FormComponent,
}: Props<T, CreateDTO>) {
  // FormComponent: usa el custom si se proporcionó, sino GenericForm estándar
  const FormToUse = FormComponent ?? GenericForm as React.ComponentType<CustomFormProps>;

  const {
    items, total, totalPages, page, limit, search,
    loading, error,
    setPage, setLimit, setSearch,
    create, update, remove,
  } = useData();

  const [showCreate,    setShowCreate]    = useState(false);
  const [editingItem,   setEditingItem]   = useState<T | null>(null);
  const [deletingId,    setDeletingId]    = useState<number | null>(null);
  const [detailingItem, setDetailingItem] = useState<T | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // ── Handlers CRUD ────────────────────────────────────────────────────────────
  const handleCreate = async (data: Record<string, unknown>) => {
    setActionLoading(true);
    try {
      await create(data as CreateDTO);
      setShowCreate(false);
      notify.success('Registro creado', config.createModalTitle);
    } catch (err: any) {
      notify.error('Error al crear', err?.response?.data?.message ?? err?.message);
    } finally { setActionLoading(false); }
  };

  const handleUpdate = async (data: Record<string, unknown>) => {
    if (!editingItem) return;
    setActionLoading(true);
    try {
      await update(editingItem.id, data as Partial<CreateDTO>);
      setEditingItem(null);
      notify.success('Cambios guardados');
    } catch (err: any) {
      notify.error('Error al actualizar', err?.response?.data?.message ?? err?.message);
    } finally { setActionLoading(false); }
  };

  const handleDelete = async () => {
    if (deletingId === null) return;
    setActionLoading(true);
    try {
      await remove(deletingId);
      setDeletingId(null);
      notify.success('Registro eliminado');
    } catch (err: any) {
      notify.error('Error al eliminar', err?.response?.data?.message ?? err?.message);
    } finally { setActionLoading(false); }
  };

  // ── Conteo de resultados para el subtítulo ───────────────────────────────────
  const subtitle = search
    ? `${total} resultado${total !== 1 ? 's' : ''} para "${search}"`
    : `${total} registro${total !== 1 ? 's' : ''}`;

  return (
    <div style={{ padding: '32px 36px', background: colors.pageBg, minHeight: '100%' }}>

      {/* Encabezado de página */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
          <div style={{ width: '4px', height: '22px', borderRadius: '4px', background: colors.accent }} />
          <h1 style={{ fontSize: '21px', fontWeight: 700, color: colors.textPrimary, letterSpacing: '-0.3px', margin: 0 }}>
            {config.pageTitle}
          </h1>
        </div>
        <p style={{ fontSize: '13px', color: colors.textMuted, margin: '0 0 0 14px' }}>
          {subtitle}
        </p>
      </div>

      {/* Tarjeta principal */}
      <div style={{
        background: colors.cardBg,
        borderRadius: radius.lg,
        border: `1px solid ${colors.border}`,
        boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
        overflow: 'hidden',
      }}>

        {/* Barra de herramientas: búsqueda + botón agregar */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: `1px solid ${colors.border}`,
          gap: '16px', flexWrap: 'wrap',
          background: 'var(--th-bg, linear-gradient(to bottom, #fafbfd, #f4f5f8))',
        }}>
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder={config.searchPlaceholder}
          />
          <button
            onClick={() => setShowCreate(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: '7px',
              padding: '9px 20px',
              background: colors.accent, color: colors.accentText,
              border: 'none', borderRadius: radius.md,
              fontSize: '14px', fontWeight: 600, cursor: 'pointer',
              whiteSpace: 'nowrap',
              boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
              letterSpacing: '0.1px',
            }}
          >
            <Plus size={15} />
            {config.addButtonLabel}
          </button>
        </div>

        {/* Tabla de datos */}
        <DataTable<T>
          items={items}
          columns={columns}
          loading={loading}
          emptyIcon={emptyIcon}
          emptyMessage={search ? config.emptySearchMessage : config.emptyMessage}
          onEdit={(item) => setEditingItem(item)}
          onDelete={(id) => setDeletingId(id)}
          onDetail={detailFields ? (item) => setDetailingItem(item) : undefined}
        />

        {/* Paginación */}
        <Pagination
          page={page}
          totalPages={totalPages}
          total={total}
          limit={limit}
          onPageChange={setPage}
          onLimitChange={setLimit}
        />
      </div>

      {/* Modal: Crear */}
      {showCreate && (
        <FormToUse
          title={config.createModalTitle}
          submitLabel={config.createSubmitLabel}
          fields={fields}
          defaultValues={createDefaults}
          onSubmit={handleCreate}
          onClose={() => setShowCreate(false)}
          loading={actionLoading}
        />
      )}

      {/* Modal: Editar */}
      {editingItem && (
        <FormToUse
          title={config.editModalTitle}
          submitLabel={config.editSubmitLabel}
          fields={fields}
          defaultValues={toFormValues(editingItem)}
          onSubmit={handleUpdate}
          onClose={() => setEditingItem(null)}
          loading={actionLoading}
        />
      )}

      {/* Modal: Confirmar eliminación */}
      {deletingId !== null && (
        <ConfirmDialog
          title={config.deleteTitle}
          loading={actionLoading}
          onConfirm={handleDelete}
          onCancel={() => setDeletingId(null)}
        />
      )}

      {/* Modal: Ver detalle */}
      {detailingItem && detailFields && (
        <DetailModal<T>
          item={detailingItem}
          title={detailTitle ? detailTitle(detailingItem) : config.pageTitle}
          fields={detailFields}
          onClose={() => setDetailingItem(null)}
        />
      )}
    </div>
  );
}

export default ListPage;
