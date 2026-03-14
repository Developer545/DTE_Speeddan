/**
 * api.ts — Instancia Axios compartida para toda la app.
 * Todos los servicios importan de aquí. Nunca crear instancias adicionales.
 * Se conecta directamente al backend en http://localhost:3001/api
 */

import axios from 'axios';

const api = axios.create({
  baseURL:         (import.meta.env.VITE_API_URL || 'http://localhost:3001') + '/api',
  timeout:         30000,
  headers:         { 'Content-Type': 'application/json' },
  withCredentials: true,  // necesario para enviar/recibir httpOnly cookies
});

// Normaliza errores: siempre rechaza con un Error que tiene el mensaje del backend
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.message ||
      error.message ||
      'Error desconocido';
    return Promise.reject(new Error(message));
  }
);

export default api;
