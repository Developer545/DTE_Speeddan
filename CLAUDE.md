# DTE Online ERP — Contexto para Claude

## ¿Qué es este proyecto?
ERP de **facturación electrónica (DTE)** multi-tenant para El Salvador.
Incluye panel SuperAdmin SaaS separado en `/superadmin`.

## Acceso rápido

### ERP Cliente (producción)
- URL login: `https://dte-speeddan.vercel.app/login`
- Paso 1 — Código de empresa: `principal`
- Paso 2 — usuario/contraseña: ver MEMORY.md local

### Panel SuperAdmin (producción)
- URL: `https://dte-speeddan.vercel.app/superadmin/login`
- Credenciales: ver MEMORY.md local

### Desarrollo local
- Frontend: `http://localhost:3000`
- Backend: `http://localhost:3001`

## Stack técnico
- **Frontend**: React 18 + TypeScript + Vite (puerto 3000)
- **Backend**: Express + TypeScript + Prisma 7.5.0 + PostgreSQL (puerto 3001)
- **Multi-tenant**: columna `tenant_id` en todas las tablas
- **Auth ERP**: cookie `erp_token` + JWT_SECRET
- **Auth SuperAdmin**: cookie `erp_superadmin_token` + SUPERADMIN_JWT_SECRET

## Infraestructura producción
- **Frontend**: Vercel — `dte-speeddan.vercel.app` (rootDirectory = `frontend`)
- **Backend**: Render — `dte-speeddan-api.onrender.com`
- **BD**: Neon PostgreSQL (instancia `neondb`)
- **Render service ID**: `srv-d6qd81npm1nc73b0riag`
- **Vercel Org**: `daniel-s-projects-11e0171c` | Project ID: `prj_E3IFzZEWVgiJjVz8pB1yJ7xMZQlp`
- Deploy Vercel manual: `npx vercel@latest --prod --yes` desde la raíz del proyecto

## Rutas locales y repo
- Ruta local: `C:\ProjectosDev\Facturacion DTE online\`
- GitHub: `https://github.com/Developer545/DTE_Speeddan`
- Estructura monorepo: `backend/` + `frontend/`

## Comandos frecuentes
```bash
# Backend (desde backend/):
npm run dev        # servidor Express en puerto 3001

# Frontend (desde frontend/):
npm run dev        # Vite en puerto 3000

# Deploy Vercel manual (desde raíz):
npx vercel@latest --prod --yes
```

## Estructura del proyecto
```
backend/
  src/
    superadmin/       # Panel SuperAdmin (3 capas: models/controllers/services/routes)
    controllers/      # ERP controllers
    routes/           # ERP routes
    server.ts         # app.set('trust proxy', 1) configurado
frontend/
  src/
    components/MainMenu/MainMenu.jsx   # navegación principal por activeSection
    styles/colors.ts                   # design tokens
    services/api.ts                    # instancia axios base
```

## Tablas de BD clave
- `facturas`, `factura_detalles`, `productos`, `inventario`
- `clientes`, `compras`, `superadmin_users` (con 2FA TOTP)
- `movimientos_inventario` (kardex), `audit_log`

## Módulos completados
### ERP cliente
- Dashboard (recharts), POS mejorado (trazabilidad de lotes)
- Inventario avanzado (Kardex / Ajustes / Alertas de stock mínimo)
- Reportes (Ventas + Compras → PDF @react-pdf/renderer + Excel exceljs)
- Notificaciones (polling 5min, 4 tipos: stock/vencimiento/borradores)

### SuperAdmin
- Analytics (AreaChart/BarChart/PieChart ingresos 12 meses)
- Mapa de clientes (react-simple-maps, El Salvador por departamento)
- Auditoría, Health check, Backups automáticos (cron 02:00 SV)
- 2FA TOTP, Rate limiting granular, Sentry error tracking
- Límites de sucursales/POS/usuarios por tenant (modelo cobro por uso)

## Configuración importante
- `app.set('trust proxy', 1)` en server.ts — fix para express-rate-limit en Render
- CORS: localhost:3000/3001 + *.vercel.app
- Cookies: SameSite=None+Secure en prod, SameSite=Lax en dev
- Cron jobs en Render: billing 00:05, backup 02:00 (NO funcionan en Vercel)

## Patrón para añadir módulos
### Backend
1. Crear `controllers/nombre.controller.ts`
2. Crear `routes/nombre.routes.ts`
3. Registrar en `routes/index.ts`: `router.use('/nombre', nombreRoutes)`

### Frontend
1. Crear `components/NombreModulo/index.tsx`
2. Crear `services/nombre.service.ts`
3. Agregar import + `{activeSection === 'id' && <NombreModulo />}` en `MainMenu.jsx`

## Otros proyectos del mismo usuario (Daniel)
- **Speeddansys ERP**: `C:\ProjectosDev\Speeddansys\` → `https://speeddansys.vercel.app`
- **Speeddan Barbería**: `C:\ProjectosDev\Speeddan_Barbería\` → `https://speeddan-barberia.vercel.app`
