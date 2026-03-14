/**
 * notify.ts — Wrapper centralizado para notificaciones con sileo.
 *
 * Uso:
 *   import { notify } from '../utils/notify';
 *   notify.success('Guardado correctamente');
 *   notify.error('Error al guardar');
 *   notify.warning('Aviso importante');
 *   notify.info('Información');
 *   notify.promise(miPromesa, { loading: 'Guardando...', success: 'Listo', error: 'Error' });
 */

import { sileo } from 'sileo';

export const notify = {
  success: (title: string, description?: string) =>
    sileo.success({ title, description }),

  error: (title: string, description?: string) =>
    sileo.error({ title, description }),

  warning: (title: string, description?: string) =>
    sileo.warning({ title, description }),

  info: (title: string, description?: string) =>
    sileo.info({ title, description }),

  promise: <T>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string | ((data: T) => string);
      error:   string | ((err: unknown) => string);
    }
  ) => {
    const successMsg = messages.success;
    const errorMsg   = messages.error;
    return sileo.promise(promise, {
      loading: { title: messages.loading },
      success: typeof successMsg === 'function'
        ? (data: T) => ({ title: (successMsg as (d: T) => string)(data) })
        : { title: successMsg as string },
      error: typeof errorMsg === 'function'
        ? (err: unknown) => ({ title: (errorMsg as (e: unknown) => string)(err) })
        : { title: errorMsg as string },
    });
  },
};
