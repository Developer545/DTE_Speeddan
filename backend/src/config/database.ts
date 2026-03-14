/**
 * database.ts — Pool de conexiones PostgreSQL compartido.
 * Exporta initializeDatabase() que crea las tablas si no existen.
 * Se llama una vez al arrancar el servidor.
 */

import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import { env } from './env';

export const pool = new Pool({
  host:                  env.DB_HOST,
  port:                  env.DB_PORT,
  user:                  env.DB_USER,
  password:              env.DB_PASSWORD,
  database:              env.DB_NAME,
  max:                   10,
  idleTimeoutMillis:     30000,
  connectionTimeoutMillis: 2000,
  // Neon (y cualquier PG en produccion) requiere SSL
  ssl: env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

/**
 * Crea las tablas necesarias si no existen.
 * Seguro de re-ejecutar (usa IF NOT EXISTS).
 */
export async function initializeDatabase(): Promise<void> {
  const client = await pool.connect();
  try {
    // Compatible Prisma 7: @updatedAt genera NOT NULL sin DEFAULT.
    // Ejecuta ALTER COLUMN por tabla individualmente con try-catch
    // para ignorar tablas que no tienen la columna updated_at.
    for (const tbl of [
      'superadmin_users', 'tenants', 'tenant_api_mh', 'tenant_firma',
      'configuracion_empresa', 'configuracion_tema', 'configuracion_api_mh',
      'configuracion_firma', 'clientes', 'proveedores', 'categorias',
      'empleados', 'productos', 'compras', 'inventario',
      'sucursales', 'puntos_venta', 'numeros_dte', 'facturas', 'usuarios',
    ]) {
      try {
        await client.query(`ALTER TABLE IF EXISTS ${tbl} ALTER COLUMN updated_at SET DEFAULT NOW()`);
      } catch { /* columna no existe en esta tabla */ }
    }

    // ── Tabla clientes ────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS clientes (
        id               SERIAL PRIMARY KEY,
        tipo_cliente     VARCHAR(20)  NOT NULL
          CHECK (tipo_cliente IN ('persona_natural', 'empresa')),
        nombre_completo  VARCHAR(200) NOT NULL,
        tipo_documento   VARCHAR(20)  NOT NULL
          CHECK (tipo_documento IN ('DUI', 'Pasaporte', 'Otro')),
        numero_documento VARCHAR(50)  NOT NULL,
        direccion        TEXT,
        telefono         VARCHAR(20),
        correo           VARCHAR(100),
        created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // ── Tabla proveedores ─────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS proveedores (
        id         SERIAL PRIMARY KEY,
        nombre     VARCHAR(200) NOT NULL,
        nit        VARCHAR(20),
        ncr        VARCHAR(20),
        direccion  TEXT,
        telefono   VARCHAR(20),
        correo     VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // ── Función para actualizar updated_at automáticamente ───────────────────
    await client.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_trigger WHERE tgname = 'set_clientes_updated_at'
        ) THEN
          CREATE TRIGGER set_clientes_updated_at
            BEFORE UPDATE ON clientes
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        END IF;
      END $$;
    `);

    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_trigger WHERE tgname = 'set_proveedores_updated_at'
        ) THEN
          CREATE TRIGGER set_proveedores_updated_at
            BEFORE UPDATE ON proveedores
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        END IF;
      END $$;
    `);

    // ── Extensión trigrama para búsquedas ILIKE eficientes ───────────────────
    // Permite índices GIN que aceleran ILIKE '%texto%' de O(n) a O(log n)
    await client.query(`CREATE EXTENSION IF NOT EXISTS pg_trgm;`);

    // ── Índices para clientes ─────────────────────────────────────────────────
    // Índice trigrama: acelera búsqueda ILIKE en nombre y documento
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_clientes_nombre_trgm
        ON clientes USING gin(nombre_completo gin_trgm_ops);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_clientes_documento_trgm
        ON clientes USING gin(numero_documento gin_trgm_ops);
    `);
    // Índice B-tree: acelera ORDER BY created_at DESC
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_clientes_created_at
        ON clientes (created_at DESC);
    `);

    // ── Índices para proveedores ──────────────────────────────────────────────
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_proveedores_nombre_trgm
        ON proveedores USING gin(nombre gin_trgm_ops);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_proveedores_nit_trgm
        ON proveedores USING gin(nit gin_trgm_ops);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_proveedores_created_at
        ON proveedores (created_at DESC);
    `);

    // ── Tabla categorias ──────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS categorias (
        id         SERIAL PRIMARY KEY,
        nombre     VARCHAR(100) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_trigger WHERE tgname = 'set_categorias_updated_at'
        ) THEN
          CREATE TRIGGER set_categorias_updated_at
            BEFORE UPDATE ON categorias
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        END IF;
      END $$;
    `);

    // ── Índices para categorias ───────────────────────────────────────────────
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_categorias_nombre_trgm
        ON categorias USING gin(nombre gin_trgm_ops);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_categorias_nombre_btree
        ON categorias (nombre ASC);
    `);

    // ── Tabla empleados ───────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS empleados (
        id               SERIAL PRIMARY KEY,
        nombre_completo  VARCHAR(200) NOT NULL,
        tipo_documento   VARCHAR(20)  NOT NULL
          CHECK (tipo_documento IN ('DUI', 'Pasaporte', 'Otro')),
        numero_documento VARCHAR(50)  NOT NULL,
        direccion        TEXT,
        telefono         VARCHAR(20),
        correo           VARCHAR(100),
        created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_trigger WHERE tgname = 'set_empleados_updated_at'
        ) THEN
          CREATE TRIGGER set_empleados_updated_at
            BEFORE UPDATE ON empleados
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        END IF;
      END $$;
    `);

    // ── Índices para empleados ────────────────────────────────────────────────
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_empleados_nombre_trgm
        ON empleados USING gin(nombre_completo gin_trgm_ops);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_empleados_documento_trgm
        ON empleados USING gin(numero_documento gin_trgm_ops);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_empleados_created_at
        ON empleados (created_at DESC);
    `);

    // ── Tabla productos ───────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS productos (
        id           SERIAL PRIMARY KEY,
        nombre       VARCHAR(200) NOT NULL,
        categoria_id INT REFERENCES categorias(id) ON DELETE SET NULL,
        imagen_url   VARCHAR(500),
        created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_trigger WHERE tgname = 'set_productos_updated_at'
        ) THEN
          CREATE TRIGGER set_productos_updated_at
            BEFORE UPDATE ON productos
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        END IF;
      END $$;
    `);

    // ── Índices para productos ────────────────────────────────────────────────
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_productos_nombre_trgm
        ON productos USING gin(nombre gin_trgm_ops);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_productos_created_at
        ON productos (created_at DESC);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_productos_categoria_id
        ON productos (categoria_id);
    `);

    // ── Tabla compras ─────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS compras (
        id            SERIAL PRIMARY KEY,
        orden_compra  VARCHAR(50) UNIQUE NOT NULL,
        proveedor_id  INT NOT NULL REFERENCES proveedores(id) ON DELETE RESTRICT,
        fecha_compra  DATE NOT NULL,
        estado        VARCHAR(20) NOT NULL DEFAULT 'recibida'
          CHECK (estado IN ('recibida', 'pendiente', 'cancelada')),
        total         NUMERIC(12,2) NOT NULL DEFAULT 0,
        notas         TEXT,
        created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Agregar columna orden_compra si la tabla ya existía sin ella
    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'compras' AND column_name = 'orden_compra'
        ) THEN
          ALTER TABLE compras ADD COLUMN orden_compra VARCHAR(50);
          CREATE UNIQUE INDEX IF NOT EXISTS idx_compras_orden_compra
            ON compras (orden_compra);
        END IF;
      END $$;
    `);

    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_trigger WHERE tgname = 'set_compras_updated_at'
        ) THEN
          CREATE TRIGGER set_compras_updated_at
            BEFORE UPDATE ON compras
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        END IF;
      END $$;
    `);

    // ── Tabla compra_detalle ──────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS compra_detalle (
        id                SERIAL PRIMARY KEY,
        compra_id         INT NOT NULL REFERENCES compras(id) ON DELETE CASCADE,
        producto_id       INT NOT NULL REFERENCES productos(id) ON DELETE RESTRICT,
        cantidad          NUMERIC(12,3) NOT NULL,
        lote              VARCHAR(100),
        fecha_vencimiento DATE,
        precio_unitario   NUMERIC(12,2) NOT NULL,
        subtotal          NUMERIC(12,2) NOT NULL,
        created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_compra_detalle_compra_id
        ON compra_detalle (compra_id);
    `);

    // ── Tabla inventario ──────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS inventario (
        id                SERIAL PRIMARY KEY,
        producto_id       INT NOT NULL REFERENCES productos(id) ON DELETE RESTRICT,
        lote              VARCHAR(100),
        fecha_vencimiento DATE,
        cantidad          NUMERIC(12,3) NOT NULL DEFAULT 0,
        precio_unitario   NUMERIC(12,2) NOT NULL DEFAULT 0,
        ultima_compra_id  INT REFERENCES compras(id) ON DELETE SET NULL,
        created_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Índice de rendimiento para búsquedas frecuentes por (producto_id, lote)
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_inventario_producto_lote
        ON inventario (producto_id, lote);
    `);

    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_trigger WHERE tgname = 'set_inventario_updated_at'
        ) THEN
          CREATE TRIGGER set_inventario_updated_at
            BEFORE UPDATE ON inventario
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        END IF;
      END $$;
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_inventario_producto_id
        ON inventario (producto_id);
    `);

    // ── Tabla sucursales ─────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS sucursales (
        id              SERIAL PRIMARY KEY,
        nombre          VARCHAR(200) NOT NULL,
        codigo          VARCHAR(10)  NOT NULL UNIQUE,
        codigo_mh       VARCHAR(10),
        direccion       TEXT,
        departamento_id INT REFERENCES cat_departamentos(id) ON DELETE SET NULL,
        municipio_id    INT REFERENCES cat_municipios(id)    ON DELETE SET NULL,
        telefono        VARCHAR(30),
        correo          VARCHAR(100),
        activo          BOOLEAN NOT NULL DEFAULT true,
        created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    // Sucursal principal por defecto
    await client.query(`
      INSERT INTO sucursales (id, nombre, codigo, updated_at)
      VALUES (1, 'Casa Matriz', 'M001', NOW())
      ON CONFLICT (id) DO NOTHING;
    `);
    // Resincronizar secuencia para evitar colisión al crear nuevas sucursales
    await client.query(`
      SELECT setval('sucursales_id_seq', (SELECT MAX(id) FROM sucursales));
    `);
    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_sucursales_updated_at') THEN
          CREATE TRIGGER set_sucursales_updated_at
            BEFORE UPDATE ON sucursales
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        END IF;
      END $$;
    `);

    // ── Tabla puntos_venta ────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS puntos_venta (
        id          SERIAL PRIMARY KEY,
        sucursal_id INT NOT NULL REFERENCES sucursales(id) ON DELETE CASCADE,
        nombre      VARCHAR(200) NOT NULL,
        codigo      VARCHAR(10)  NOT NULL,
        codigo_mh   VARCHAR(10),
        activo      BOOLEAN NOT NULL DEFAULT true,
        created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(sucursal_id, codigo)
      );
    `);
    // Punto de venta principal por defecto
    await client.query(`
      INSERT INTO puntos_venta (id, sucursal_id, nombre, codigo, updated_at)
      VALUES (1, 1, 'Caja Principal', 'P001', NOW())
      ON CONFLICT (id) DO NOTHING;
    `);
    // Resincronizar la secuencia para que el próximo INSERT auto-generado
    // use el id correcto (MAX + 1) y no colisione con los seeds
    await client.query(`
      SELECT setval('puntos_venta_id_seq', (SELECT MAX(id) FROM puntos_venta));
    `);
    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_puntos_venta_updated_at') THEN
          CREATE TRIGGER set_puntos_venta_updated_at
            BEFORE UPDATE ON puntos_venta
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        END IF;
      END $$;
    `);

    // ── Tabla para control de números DTE (correlativo) ──────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS numeros_dte (
        id              SERIAL PRIMARY KEY,
        tipo_dte        VARCHAR(10) NOT NULL UNIQUE,
        numero_actual   BIGINT NOT NULL DEFAULT 0,
        prefijo         VARCHAR(50) NOT NULL DEFAULT 'M001P001',
        created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Actualizar CHECK constraint para incluir todos los tipos DTE
    await client.query(`
      ALTER TABLE numeros_dte DROP CONSTRAINT IF EXISTS numeros_dte_tipo_dte_check;
    `);
    await client.query(`
      ALTER TABLE numeros_dte ADD CONSTRAINT numeros_dte_tipo_dte_check
        CHECK (tipo_dte IN ('DTE_01','DTE_03','DTE_05','DTE_06','DTE_11'));
    `);

    // ── punto_venta_id en numeros_dte ─────────────────────────────────────────
    await client.query(`
      ALTER TABLE numeros_dte
        ADD COLUMN IF NOT EXISTS punto_venta_id INT REFERENCES puntos_venta(id) ON DELETE CASCADE;
    `);
    // Migrar filas existentes (NULL → punto de venta por defecto)
    await client.query(`
      UPDATE numeros_dte SET punto_venta_id = 1 WHERE punto_venta_id IS NULL;
    `);
    // Cambiar UNIQUE: de solo tipo_dte a (tipo_dte, punto_venta_id)
    await client.query(`
      ALTER TABLE numeros_dte DROP CONSTRAINT IF EXISTS numeros_dte_tipo_dte_key;
    `);
    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_numeros_dte_tipo_pventa
        ON numeros_dte (tipo_dte, punto_venta_id);
    `);

    // Insertar valores iniciales si no existen (para el punto de venta por defecto)
    await client.query(`
      INSERT INTO numeros_dte (tipo_dte, numero_actual, prefijo, punto_venta_id)
      VALUES
        ('DTE_01', 0, 'M001P001', 1),
        ('DTE_03', 0, 'M001P001', 1),
        ('DTE_05', 0, 'M001P001', 1),
        ('DTE_06', 0, 'M001P001', 1),
        ('DTE_11', 0, 'M001P001', 1)
      ON CONFLICT DO NOTHING;
    `);

    // ── Tabla facturas (cabecera) ──────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS facturas (
        id                  SERIAL PRIMARY KEY,
        numero_dte          VARCHAR(50) NOT NULL UNIQUE,
        tipo_dte            VARCHAR(10) NOT NULL
          CHECK (tipo_dte IN ('DTE_01', 'DTE_03')),
        cliente_id          INT NOT NULL REFERENCES clientes(id) ON DELETE RESTRICT,
        fecha_emision       DATE NOT NULL,
        fecha_vencimiento   DATE,
        estado              VARCHAR(20) NOT NULL DEFAULT 'borrador'
          CHECK (estado IN ('borrador', 'facturado', 'cancelado')),
        subtotal            NUMERIC(15,2) NOT NULL DEFAULT 0,
        iva                 NUMERIC(15,2) NOT NULL DEFAULT 0,
        total               NUMERIC(15,2) NOT NULL DEFAULT 0,
        notas               TEXT,
        json_dte_path       VARCHAR(255),
        json_pdf_path       VARCHAR(255),
        created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Trigger para actualizar updated_at en facturas
    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_trigger WHERE tgname = 'set_facturas_updated_at'
        ) THEN
          CREATE TRIGGER set_facturas_updated_at
            BEFORE UPDATE ON facturas
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        END IF;
      END $$;
    `);

    // Índices para facturas
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_facturas_numero_dte
        ON facturas (numero_dte);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_facturas_cliente_id
        ON facturas (cliente_id);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_facturas_estado
        ON facturas (estado);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_facturas_fecha_emision
        ON facturas (fecha_emision DESC);
    `);

    // ── Tabla factura_detalles (líneas) ────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS factura_detalles (
        id               SERIAL PRIMARY KEY,
        factura_id       INT NOT NULL REFERENCES facturas(id) ON DELETE CASCADE,
        producto_id      INT NOT NULL REFERENCES productos(id) ON DELETE RESTRICT,
        cantidad         NUMERIC(12,3) NOT NULL DEFAULT 0,
        precio_unitario  NUMERIC(12,2) NOT NULL DEFAULT 0,
        iva_unitario     NUMERIC(12,2) NOT NULL DEFAULT 0,
        subtotal         NUMERIC(15,2) NOT NULL DEFAULT 0,
        total_linea      NUMERIC(15,2) NOT NULL DEFAULT 0,
        created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Índices para factura_detalles
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_factura_detalles_factura_id
        ON factura_detalles (factura_id);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_factura_detalles_producto_id
        ON factura_detalles (producto_id);
    `);

    // ── Columnas DTE adicionales en facturas ──────────────────────────────────
    await client.query(`
      ALTER TABLE facturas
        ADD COLUMN IF NOT EXISTS codigo_generacion   VARCHAR(40),
        ADD COLUMN IF NOT EXISTS ambiente            VARCHAR(5)  DEFAULT '00',
        ADD COLUMN IF NOT EXISTS doc_relacionado_id  INT REFERENCES facturas(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS condicion_operacion SMALLINT DEFAULT 1,
        ADD COLUMN IF NOT EXISTS punto_venta_id      INT REFERENCES puntos_venta(id) ON DELETE SET NULL;
    `);

    // ── Hacer cliente_id NULLABLE y agregar campos de receptor para 3 modos ──
    // Modo A (Clientes Varios):   cliente_id=NULL, receptor_nombre=NULL
    // Modo B (Datos transitorios): cliente_id=NULL, receptor_nombre="Juan García"
    // Modo C (Cliente registrado): cliente_id=X (comportamiento actual)
    await client.query(`
      ALTER TABLE facturas
        ALTER COLUMN cliente_id DROP NOT NULL;
    `);
    await client.query(`
      ALTER TABLE facturas
        ADD COLUMN IF NOT EXISTS receptor_nombre  VARCHAR(200),
        ADD COLUMN IF NOT EXISTS receptor_correo  VARCHAR(200),
        ADD COLUMN IF NOT EXISTS retencion_renta  NUMERIC(12,2) DEFAULT 0;
    `);

    // Método de pago (efectivo/tarjeta/transferencia) — FASE 6A POS mejorado
    await client.query(`
      ALTER TABLE facturas
        ADD COLUMN IF NOT EXISTS metodo_pago VARCHAR(20) DEFAULT 'efectivo'
          CHECK (metodo_pago IN ('efectivo', 'tarjeta', 'transferencia', 'otro'));
    `);

    // ── Columnas DTE adicionales en factura_detalles ───────────────────────────
    await client.query(`
      ALTER TABLE factura_detalles
        ADD COLUMN IF NOT EXISTS tipo_item     SMALLINT     DEFAULT 1,
        ADD COLUMN IF NOT EXISTS unidad_medida SMALLINT     DEFAULT 59,
        ADD COLUMN IF NOT EXISTS descuento     NUMERIC(12,2) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS venta_gravada NUMERIC(15,2) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS venta_exenta  NUMERIC(15,2) DEFAULT 0;
    `);

    // ── FASE 6A: Trazabilidad de lote en detalle de factura ────────────────────
    // Almacena el ID del registro de inventario descontado para que las
    // devoluciones puedan restaurar el stock al lote exacto que fue vendido.
    await client.query(`
      ALTER TABLE factura_detalles
        ADD COLUMN IF NOT EXISTS lote_inventario_id INT REFERENCES inventario(id) ON DELETE SET NULL;
    `);

    // ── Tabla configuracion_empresa (singleton, id=1) ──────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS configuracion_empresa (
        id               INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
        nombre_negocio   VARCHAR(200) NOT NULL DEFAULT 'Mi Empresa',
        nit              VARCHAR(30),
        ncr              VARCHAR(30),
        direccion        TEXT,
        giro             VARCHAR(200),
        departamento     VARCHAR(100),
        municipio        VARCHAR(100),
        telefono         VARCHAR(30),
        correo           VARCHAR(100),
        updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await client.query(`
      INSERT INTO configuracion_empresa DEFAULT VALUES ON CONFLICT DO NOTHING;
    `);
    // Columna logo_url agregada posteriormente — se añade si no existe
    await client.query(`
      ALTER TABLE configuracion_empresa
      ADD COLUMN IF NOT EXISTS logo_url VARCHAR(500);
    `);
    // Columnas DTE de empresa (actividad económica, establecimiento, ubicación)
    await client.query(`
      ALTER TABLE configuracion_empresa
        ADD COLUMN IF NOT EXISTS cod_actividad        VARCHAR(10),
        ADD COLUMN IF NOT EXISTS desc_actividad       VARCHAR(200),
        ADD COLUMN IF NOT EXISTS tipo_establecimiento VARCHAR(5)  DEFAULT '02',
        ADD COLUMN IF NOT EXISTS departamento_id      INT REFERENCES cat_departamentos(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS municipio_id         INT REFERENCES cat_municipios(id)    ON DELETE SET NULL;
    `);

    // ── Tabla usuarios ────────────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id              SERIAL PRIMARY KEY,
        nombre          VARCHAR(100) NOT NULL,
        username        VARCHAR(50)  NOT NULL UNIQUE,
        password_hash   VARCHAR(200) NOT NULL,
        rol             VARCHAR(20)  NOT NULL DEFAULT 'user'
          CHECK (rol IN ('admin', 'user')),
        activo          BOOLEAN NOT NULL DEFAULT true,
        created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Trigger updated_at para usuarios
    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_trigger WHERE tgname = 'set_usuarios_updated_at'
        ) THEN
          CREATE TRIGGER set_usuarios_updated_at
            BEFORE UPDATE ON usuarios
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        END IF;
      END $$;
    `);

    // ── Tabla cat_departamentos (CAT-012) ─────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS cat_departamentos (
        id     SERIAL PRIMARY KEY,
        codigo VARCHAR(5)   NOT NULL UNIQUE,
        nombre VARCHAR(100) NOT NULL
      );
    `);
    await client.query(`
      INSERT INTO cat_departamentos (codigo, nombre) VALUES
        ('00','OTRO (PARA EXTRANJEROS)'),
        ('01','AHUACHAPAN'),('02','SANTA ANA'),('03','SONSONATE'),
        ('04','CHALATENANGO'),('05','LA LIBERTAD'),('06','SAN SALVADOR'),
        ('07','CUSCATLAN'),('08','LA PAZ'),('09','CABAÑAS'),
        ('10','SAN VICENTE'),('11','USULUTAN'),('12','SAN MIGUEL'),
        ('13','MORAZAN'),('14','LA UNION')
      ON CONFLICT (codigo) DO UPDATE SET nombre = EXCLUDED.nombre;
    `);

    // ── Tabla cat_municipios (CAT-013) ─────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS cat_municipios (
        id                  SERIAL PRIMARY KEY,
        codigo              VARCHAR(5)   NOT NULL,
        nombre              VARCHAR(100) NOT NULL,
        departamento_id     INT NOT NULL REFERENCES cat_departamentos(id) ON DELETE CASCADE,
        UNIQUE(codigo, departamento_id)
      );
    `);
    // Limpiar municipios previos (elimina duplicados o datos incorrectos de versiones anteriores)
    await client.query(`DELETE FROM cat_municipios;`);
    await client.query(`
      INSERT INTO cat_municipios (codigo, nombre, departamento_id)
      SELECT m.codigo, m.nombre, d.id
      FROM (VALUES
        ('00','Otro (Para extranjeros)','00'),
        ('13','AHUACHAPAN NORTE','01'),
        ('14','AHUACHAPAN CENTRO','01'),
        ('15','AHUACHAPAN SUR','01'),
        ('14','SANTA ANA NORTE','02'),
        ('15','SANTA ANA CENTRO','02'),
        ('16','SANTA ANA ESTE','02'),
        ('17','SANTA ANA OESTE','02'),
        ('17','SONSONATE NORTE','03'),
        ('18','SONSONATE CENTRO','03'),
        ('19','SONSONATE ESTE','03'),
        ('20','SONSONATE OESTE','03'),
        ('34','CHALATENANGO NORTE','04'),
        ('35','CHALATENANGO CENTRO','04'),
        ('36','CHALATENANGO SUR','04'),
        ('23','LA LIBERTAD NORTE','05'),
        ('24','LA LIBERTAD CENTRO','05'),
        ('25','LA LIBERTAD OESTE','05'),
        ('26','LA LIBERTAD ESTE','05'),
        ('27','LA LIBERTAD COSTA','05'),
        ('28','LA LIBERTAD SUR','05'),
        ('20','SAN SALVADOR NORTE','06'),
        ('21','SAN SALVADOR OESTE','06'),
        ('22','SAN SALVADOR ESTE','06'),
        ('23','SAN SALVADOR CENTRO','06'),
        ('24','SAN SALVADOR SUR','06'),
        ('17','CUSCATLAN NORTE','07'),
        ('18','CUSCATLAN SUR','07'),
        ('23','LA PAZ OESTE','08'),
        ('24','LA PAZ CENTRO','08'),
        ('25','LA PAZ ESTE','08'),
        ('10','CABAÑAS OESTE','09'),
        ('11','CABAÑAS ESTE','09'),
        ('14','SAN VICENTE NORTE','10'),
        ('15','SAN VICENTE SUR','10'),
        ('24','USULUTAN NORTE','11'),
        ('25','USULUTAN ESTE','11'),
        ('26','USULUTAN OESTE','11'),
        ('21','SAN MIGUEL NORTE','12'),
        ('22','SAN MIGUEL CENTRO','12'),
        ('23','SAN MIGUEL OESTE','12'),
        ('27','MORAZAN NORTE','13'),
        ('28','MORAZAN SUR','13'),
        ('19','LA UNION NORTE','14'),
        ('20','LA UNION SUR','14')
      ) AS m(codigo, nombre, dep_codigo)
      JOIN cat_departamentos d ON d.codigo = m.dep_codigo;
    `);

    // ── Columnas departamento_id / municipio_id en clientes, empleados, proveedores ──
    await client.query(`
      ALTER TABLE clientes
        ADD COLUMN IF NOT EXISTS departamento_id INT REFERENCES cat_departamentos(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS municipio_id    INT REFERENCES cat_municipios(id)    ON DELETE SET NULL;
    `);

    // ── Nuevas columnas en clientes (DTE: nit separado, ncr, nombre comercial, giro) ──
    // nit: para persona_natural que tiene NIT (distinto del numero_documento=DUI)
    // ncr: Número de Registro de Contribuyente, requerido en DTE_03
    // nombre_comercial: nombre con el que opera la empresa (distinto a razón social)
    // giro: actividad económica (informativa)
    await client.query(`
      ALTER TABLE clientes
        ADD COLUMN IF NOT EXISTS nit             VARCHAR(20),
        ADD COLUMN IF NOT EXISTS ncr             VARCHAR(20),
        ADD COLUMN IF NOT EXISTS nombre_comercial VARCHAR(200),
        ADD COLUMN IF NOT EXISTS giro            VARCHAR(200);
    `);

    // Ampliar el CHECK constraint de tipo_documento para incluir 'NIT' y 'Carnet Residente'
    // (necesario para empresas y extranjeros residentes — CAT-022 del MH)
    await client.query(`
      ALTER TABLE clientes DROP CONSTRAINT IF EXISTS clientes_tipo_documento_check;
    `);
    await client.query(`
      ALTER TABLE clientes ADD CONSTRAINT clientes_tipo_documento_check
        CHECK (tipo_documento IN ('DUI', 'NIT', 'Pasaporte', 'Carnet Residente', 'Otro'));
    `);
    await client.query(`
      ALTER TABLE empleados
        ADD COLUMN IF NOT EXISTS departamento_id INT REFERENCES cat_departamentos(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS municipio_id    INT REFERENCES cat_municipios(id)    ON DELETE SET NULL;
    `);
    await client.query(`
      ALTER TABLE proveedores
        ADD COLUMN IF NOT EXISTS departamento_id INT REFERENCES cat_departamentos(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS municipio_id    INT REFERENCES cat_municipios(id)    ON DELETE SET NULL;
    `);

    // ── Tabla configuracion_tema (singleton, id=1) ────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS configuracion_tema (
        id           INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
        accent       VARCHAR(30) NOT NULL DEFAULT '#111111',
        accent_text  VARCHAR(30) NOT NULL DEFAULT '#ffffff',
        page_bg      VARCHAR(30) NOT NULL DEFAULT '#f5f5f5',
        card_bg      VARCHAR(30) NOT NULL DEFAULT '#ffffff',
        sidebar_bg   VARCHAR(30) NOT NULL DEFAULT '#ffffff',
        updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await client.query(`
      INSERT INTO configuracion_tema DEFAULT VALUES ON CONFLICT DO NOTHING;
    `);
    // Migraciones: ampliar columnas y agregar glass_blur
    await client.query(`ALTER TABLE configuracion_tema ALTER COLUMN accent      TYPE TEXT`);
    await client.query(`ALTER TABLE configuracion_tema ALTER COLUMN accent_text TYPE TEXT`);
    await client.query(`ALTER TABLE configuracion_tema ALTER COLUMN page_bg     TYPE TEXT`);
    await client.query(`ALTER TABLE configuracion_tema ALTER COLUMN card_bg     TYPE TEXT`);
    await client.query(`ALTER TABLE configuracion_tema ALTER COLUMN sidebar_bg  TYPE TEXT`);
    await client.query(`ALTER TABLE configuracion_tema ADD COLUMN IF NOT EXISTS glass_blur TEXT NOT NULL DEFAULT ''`);

    // ── Tabla configuracion_api_mh (singleton, id=1) ─────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS configuracion_api_mh (
        id                INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
        ambiente          VARCHAR(5)   NOT NULL DEFAULT '00',
        url_auth          VARCHAR(500) NOT NULL DEFAULT 'https://apitest.dtes.mh.gob.sv/seguridad/auth',
        url_transmision   VARCHAR(500) NOT NULL DEFAULT 'https://apitest.dtes.mh.gob.sv/fesv/recepciondte',
        usuario_api       VARCHAR(100),
        password_api      VARCHAR(200),
        token_activo      TEXT,
        token_expira_en   TIMESTAMP,
        updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await client.query(`
      INSERT INTO configuracion_api_mh DEFAULT VALUES ON CONFLICT DO NOTHING;
    `);

    // ── Tabla configuracion_firma (singleton, id=1) ───────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS configuracion_firma (
        id                INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
        certificado_path  VARCHAR(500),
        certificado_pass  VARCHAR(200),
        nit_certificado   VARCHAR(30),
        fecha_vencimiento DATE,
        updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await client.query(`
      INSERT INTO configuracion_firma DEFAULT VALUES ON CONFLICT DO NOTHING;
    `);

    // ═══════════════════════════════════════════════════════════════════════════
    // ── SISTEMA SAAS — TABLAS DE PLATAFORMA ───────────────────────────────────
    // ═══════════════════════════════════════════════════════════════════════════

    // ── Tabla superadmin_users ────────────────────────────────────────────────
    // Completamente separada de la tabla 'usuarios' (que pertenece a los tenants).
    // Solo el superadmin accede por /superadmin/login.
    await client.query(`
      CREATE TABLE IF NOT EXISTS superadmin_users (
        id            SERIAL PRIMARY KEY,
        nombre        VARCHAR(100) NOT NULL,
        username      VARCHAR(50)  NOT NULL UNIQUE,
        password_hash VARCHAR(200) NOT NULL,
        activo        BOOLEAN      NOT NULL DEFAULT true,
        created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_superadmin_users_updated_at') THEN
          CREATE TRIGGER set_superadmin_users_updated_at
            BEFORE UPDATE ON superadmin_users
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        END IF;
      END $$;
    `);

    // ── Tabla planes ──────────────────────────────────────────────────────────
    // Define los límites de cada plan de suscripción que ofrece el SaaS.
    await client.query(`
      CREATE TABLE IF NOT EXISTS planes (
        id             SERIAL PRIMARY KEY,
        nombre         VARCHAR(50)    NOT NULL UNIQUE,
        max_sucursales INT            NOT NULL DEFAULT 1,
        max_usuarios   INT            NOT NULL DEFAULT 3,
        precio         DECIMAL(10,2)  NOT NULL DEFAULT 0,
        activo         BOOLEAN        NOT NULL DEFAULT true,
        created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    // Garantizar constraint UNIQUE en nombre para tablas ya existentes
    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conrelid = 'planes'::regclass AND contype = 'u' AND conname = 'planes_nombre_key'
        ) THEN
          ALTER TABLE planes ADD CONSTRAINT planes_nombre_key UNIQUE (nombre);
        END IF;
      END $$;
    `);
    // Planes iniciales
    await client.query(`
      INSERT INTO planes (nombre, max_sucursales, max_usuarios, precio) VALUES
        ('Básico',      1,  3,   0.00),
        ('Profesional', 3, 10,  25.00),
        ('Empresarial', 10, 50, 75.00)
      ON CONFLICT (nombre) DO NOTHING;
    `);

    // ── Tabla tenants ─────────────────────────────────────────────────────────
    // Cada fila es una empresa cliente del SaaS.
    // estado: 'pruebas'    → cliente nuevo en demo (API MH en pruebas)
    //         'activo'     → pagó, en producción (API MH en producción)
    //         'suspendido' → no pagó, modo solo lectura
    // slug: código único que el cliente usa al hacer login (ej: "empresa-abc")
    await client.query(`
      CREATE TABLE IF NOT EXISTS tenants (
        id               SERIAL PRIMARY KEY,
        nombre           VARCHAR(200) NOT NULL,
        slug             VARCHAR(50)  NOT NULL UNIQUE,
        email_contacto   VARCHAR(200),
        telefono         VARCHAR(50),
        plan_id          INT REFERENCES planes(id) ON DELETE RESTRICT,
        estado           VARCHAR(20)  NOT NULL DEFAULT 'pruebas'
          CHECK (estado IN ('pruebas', 'activo', 'suspendido')),
        fecha_pago       DATE,
        fecha_suspension DATE,
        notas            TEXT,
        created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_tenants_updated_at') THEN
          CREATE TRIGGER set_tenants_updated_at
            BEFORE UPDATE ON tenants
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        END IF;
      END $$;
    `);

    // ── Tenant por defecto para datos preexistentes ────────────────────────────
    // Cualquier dato creado antes de esta migración pertenece al tenant 1.
    await client.query(`
      INSERT INTO tenants (id, nombre, slug, estado)
      VALUES (1, 'Tenant Principal', 'principal', 'activo')
      ON CONFLICT (id) DO NOTHING;
    `);
    await client.query(`
      SELECT setval('tenants_id_seq', (SELECT MAX(id) FROM tenants));
    `);

    // ── Tabla tenant_pagos ────────────────────────────────────────────────────
    // Historial de pagos registrados por el superadmin para cada tenant.
    await client.query(`
      CREATE TABLE IF NOT EXISTS tenant_pagos (
        id             SERIAL PRIMARY KEY,
        tenant_id      INT           NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        monto          DECIMAL(10,2) NOT NULL,
        fecha_pago     DATE          NOT NULL DEFAULT CURRENT_DATE,
        metodo         VARCHAR(50),
        notas          TEXT,
        registrado_por INT REFERENCES superadmin_users(id) ON DELETE SET NULL,
        created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_tenant_pagos_tenant_id
        ON tenant_pagos (tenant_id);
    `);

    // ── Tabla tenant_api_mh ───────────────────────────────────────────────────
    // Credenciales del API del Ministerio de Hacienda por tenant.
    // Solo el superadmin puede crear/modificar estas filas.
    // ambiente 'pruebas'    → URL de pruebas del MH
    // ambiente 'produccion' → URL real del MH
    await client.query(`
      CREATE TABLE IF NOT EXISTS tenant_api_mh (
        id              SERIAL PRIMARY KEY,
        tenant_id       INT          NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
        ambiente        VARCHAR(15)  NOT NULL DEFAULT 'pruebas'
          CHECK (ambiente IN ('pruebas', 'produccion')),
        url_auth        VARCHAR(500) NOT NULL
          DEFAULT 'https://apitest.dtes.mh.gob.sv/seguridad/auth',
        url_transmision VARCHAR(500) NOT NULL
          DEFAULT 'https://apitest.dtes.mh.gob.sv/fesv/recepciondte',
        usuario_api     VARCHAR(100),
        password_api    TEXT,
        token_activo    TEXT,
        token_expira_en TIMESTAMP,
        updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_tenant_api_mh_updated_at') THEN
          CREATE TRIGGER set_tenant_api_mh_updated_at
            BEFORE UPDATE ON tenant_api_mh
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        END IF;
      END $$;
    `);

    // Migrar datos existentes de configuracion_api_mh → tenant_api_mh (tenant 1)
    // Convierte códigos legacy ('00'→'pruebas', '01'→'produccion') al nuevo formato texto
    await client.query(`
      INSERT INTO tenant_api_mh (tenant_id, ambiente, url_auth, url_transmision, usuario_api, password_api, token_activo, token_expira_en)
      SELECT 1,
        CASE ambiente
          WHEN '01' THEN 'produccion'
          ELSE 'pruebas'
        END,
        url_auth, url_transmision, usuario_api, password_api, token_activo, token_expira_en
      FROM configuracion_api_mh WHERE id = 1
      ON CONFLICT (tenant_id) DO NOTHING;
    `);

    // ── Tabla tenant_firma ────────────────────────────────────────────────────
    // Firma digital (.p12) por tenant. Solo el superadmin la gestiona.
    await client.query(`
      CREATE TABLE IF NOT EXISTS tenant_firma (
        id                SERIAL PRIMARY KEY,
        tenant_id         INT          NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
        archivo_nombre    VARCHAR(200),
        certificado_path  VARCHAR(500),
        certificado_pass  TEXT,
        nit_certificado   VARCHAR(30),
        fecha_vencimiento DATE,
        updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await client.query(`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_tenant_firma_updated_at') THEN
          CREATE TRIGGER set_tenant_firma_updated_at
            BEFORE UPDATE ON tenant_firma
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        END IF;
      END $$;
    `);

    // Migrar datos existentes de configuracion_firma → tenant_firma (tenant 1)
    await client.query(`
      INSERT INTO tenant_firma (tenant_id, archivo_nombre, certificado_path, certificado_pass, nit_certificado, fecha_vencimiento)
      SELECT 1, NULL, certificado_path, certificado_pass, nit_certificado, fecha_vencimiento
      FROM configuracion_firma WHERE id = 1
      ON CONFLICT (tenant_id) DO NOTHING;
    `);

    // ═══════════════════════════════════════════════════════════════════════════
    // ── AGREGAR tenant_id A TABLAS DE DATOS EXISTENTES ────────────────────────
    // ═══════════════════════════════════════════════════════════════════════════
    // Patrón: ADD COLUMN IF NOT EXISTS → UPDATE datos viejos → CREATE INDEX

    // clientes
    await client.query(`ALTER TABLE clientes ADD COLUMN IF NOT EXISTS tenant_id INT REFERENCES tenants(id);`);
    await client.query(`UPDATE clientes SET tenant_id = 1 WHERE tenant_id IS NULL;`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_clientes_tenant_id ON clientes (tenant_id);`);

    // proveedores
    await client.query(`ALTER TABLE proveedores ADD COLUMN IF NOT EXISTS tenant_id INT REFERENCES tenants(id);`);
    await client.query(`UPDATE proveedores SET tenant_id = 1 WHERE tenant_id IS NULL;`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_proveedores_tenant_id ON proveedores (tenant_id);`);

    // categorias — el UNIQUE global nombre → UNIQUE por (tenant_id, nombre)
    await client.query(`ALTER TABLE categorias ADD COLUMN IF NOT EXISTS tenant_id INT REFERENCES tenants(id);`);
    await client.query(`UPDATE categorias SET tenant_id = 1 WHERE tenant_id IS NULL;`);
    await client.query(`ALTER TABLE categorias DROP CONSTRAINT IF EXISTS categorias_nombre_key;`);
    await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_categorias_tenant_nombre ON categorias (tenant_id, nombre);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_categorias_tenant_id ON categorias (tenant_id);`);

    // empleados
    await client.query(`ALTER TABLE empleados ADD COLUMN IF NOT EXISTS tenant_id INT REFERENCES tenants(id);`);
    await client.query(`UPDATE empleados SET tenant_id = 1 WHERE tenant_id IS NULL;`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_empleados_tenant_id ON empleados (tenant_id);`);

    // productos
    await client.query(`ALTER TABLE productos ADD COLUMN IF NOT EXISTS tenant_id INT REFERENCES tenants(id);`);
    await client.query(`UPDATE productos SET tenant_id = 1 WHERE tenant_id IS NULL;`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_productos_tenant_id ON productos (tenant_id);`);

    // compras — UNIQUE orden_compra → UNIQUE por (tenant_id, orden_compra)
    await client.query(`ALTER TABLE compras ADD COLUMN IF NOT EXISTS tenant_id INT REFERENCES tenants(id);`);
    await client.query(`UPDATE compras SET tenant_id = 1 WHERE tenant_id IS NULL;`);
    await client.query(`DROP INDEX IF EXISTS idx_compras_orden_compra;`);
    await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_compras_tenant_orden ON compras (tenant_id, orden_compra);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_compras_tenant_id ON compras (tenant_id);`);

    // inventario
    await client.query(`ALTER TABLE inventario ADD COLUMN IF NOT EXISTS tenant_id INT REFERENCES tenants(id);`);
    await client.query(`UPDATE inventario SET tenant_id = 1 WHERE tenant_id IS NULL;`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_inventario_tenant_id ON inventario (tenant_id);`);

    // facturas — UNIQUE numero_dte → UNIQUE por (tenant_id, numero_dte)
    await client.query(`ALTER TABLE facturas ADD COLUMN IF NOT EXISTS tenant_id INT REFERENCES tenants(id);`);
    await client.query(`UPDATE facturas SET tenant_id = 1 WHERE tenant_id IS NULL;`);
    await client.query(`ALTER TABLE facturas DROP CONSTRAINT IF EXISTS facturas_numero_dte_key;`);
    await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_facturas_tenant_numero_dte ON facturas (tenant_id, numero_dte);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_facturas_tenant_id ON facturas (tenant_id);`);

    // sucursales
    await client.query(`ALTER TABLE sucursales ADD COLUMN IF NOT EXISTS tenant_id INT REFERENCES tenants(id);`);
    await client.query(`UPDATE sucursales SET tenant_id = 1 WHERE tenant_id IS NULL;`);
    // UNIQUE(codigo) global → UNIQUE por (tenant_id, codigo)
    await client.query(`ALTER TABLE sucursales DROP CONSTRAINT IF EXISTS sucursales_codigo_key;`);
    await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_sucursales_tenant_codigo ON sucursales (tenant_id, codigo);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_sucursales_tenant_id ON sucursales (tenant_id);`);

    // usuarios
    await client.query(`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS tenant_id INT REFERENCES tenants(id);`);
    await client.query(`UPDATE usuarios SET tenant_id = 1 WHERE tenant_id IS NULL;`);
    // UNIQUE(username) global → UNIQUE por (tenant_id, username)
    await client.query(`ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_username_key;`);
    await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_usuarios_tenant_username ON usuarios (tenant_id, username);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_usuarios_tenant_id ON usuarios (tenant_id);`);

    // configuracion_empresa — remover singleton id=1, convertir a por-tenant
    await client.query(`ALTER TABLE configuracion_empresa ADD COLUMN IF NOT EXISTS tenant_id INT REFERENCES tenants(id);`);
    // Si ya existe una fila con tenant_id=1 (migración previa), eliminar filas huérfanas NULL para evitar conflicto de unicidad
    await client.query(`
      DELETE FROM configuracion_empresa
      WHERE tenant_id IS NULL
        AND EXISTS (SELECT 1 FROM configuracion_empresa WHERE tenant_id = 1)
    `);
    await client.query(`UPDATE configuracion_empresa SET tenant_id = 1 WHERE tenant_id IS NULL;`);
    await client.query(`ALTER TABLE configuracion_empresa DROP CONSTRAINT IF EXISTS configuracion_empresa_id_check;`);
    await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_conf_empresa_tenant ON configuracion_empresa (tenant_id);`);
    // Convertir id a secuencia auto-increment (era DEFAULT 1, causaba conflictos de PK en tenants 2+)
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'configuracion_empresa_id_seq') THEN
          CREATE SEQUENCE configuracion_empresa_id_seq;
          PERFORM setval('configuracion_empresa_id_seq', COALESCE((SELECT MAX(id) FROM configuracion_empresa), 1));
        END IF;
      END$$;
    `);
    await client.query(`ALTER TABLE configuracion_empresa ALTER COLUMN id SET DEFAULT nextval('configuracion_empresa_id_seq');`);

    // Insertar filas faltantes para tenants que no tienen configuracion_empresa (creados antes del fix)
    await client.query(`
      INSERT INTO configuracion_empresa (nombre_negocio, tenant_id)
      SELECT t.nombre, t.id FROM tenants t
      WHERE NOT EXISTS (
        SELECT 1 FROM configuracion_empresa ce WHERE ce.tenant_id = t.id
      )
    `);

    // configuracion_tema — remover singleton id=1, convertir a por-tenant
    await client.query(`ALTER TABLE configuracion_tema ADD COLUMN IF NOT EXISTS tenant_id INT REFERENCES tenants(id);`);
    await client.query(`UPDATE configuracion_tema SET tenant_id = 1 WHERE tenant_id IS NULL;`);
    await client.query(`ALTER TABLE configuracion_tema DROP CONSTRAINT IF EXISTS configuracion_tema_id_check;`);
    await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS idx_conf_tema_tenant ON configuracion_tema (tenant_id);`);

    // ── Tabla audit_log ───────────────────────────────────────────────────────
    // Registra todas las acciones importantes del superadmin y del sistema.
    // actor_tipo: 'superadmin' | 'sistema' (para acciones automáticas del cron)
    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_log (
        id          SERIAL PRIMARY KEY,
        actor_id    INT,
        actor_tipo  VARCHAR(20) NOT NULL DEFAULT 'superadmin'
          CHECK (actor_tipo IN ('superadmin', 'sistema')),
        accion      VARCHAR(100) NOT NULL,
        tenant_id   INT REFERENCES tenants(id) ON DELETE SET NULL,
        detalle     JSONB,
        ip          VARCHAR(50),
        created_at  TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_log_tenant_created
        ON audit_log (tenant_id, created_at DESC);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_log_actor
        ON audit_log (actor_id, created_at DESC);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_log_created
        ON audit_log (created_at DESC);
    `);

    // ── FASE 7A: Stock mínimo por producto ────────────────────────────────────
    // Umbral configurable por producto; cuando cantidad < stock_minimo se genera
    // alerta en el panel de inventario.
    await client.query(`
      ALTER TABLE productos
        ADD COLUMN IF NOT EXISTS stock_minimo NUMERIC(12,3) NOT NULL DEFAULT 0;
    `);

    // ── FASE 7A: Movimientos manuales de inventario ───────────────────────────
    // Registra ajustes (merma, daño, robo, corrección) hechos manualmente.
    // Las entradas por compra y salidas por venta se derivan de sus propias tablas.
    await client.query(`
      CREATE TABLE IF NOT EXISTS movimientos_inventario (
        id             SERIAL PRIMARY KEY,
        producto_id    INT         NOT NULL REFERENCES productos(id)  ON DELETE RESTRICT,
        inventario_id  INT                  REFERENCES inventario(id) ON DELETE SET NULL,
        tipo           VARCHAR(30) NOT NULL
          CHECK (tipo IN ('merma','dano','robo','correccion_positiva','correccion_negativa')),
        cantidad       NUMERIC(12,3) NOT NULL CHECK (cantidad > 0),
        motivo         TEXT,
        usuario_id     INT                  REFERENCES usuarios(id)   ON DELETE SET NULL,
        tenant_id      INT         NOT NULL,
        created_at     TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_mov_inv_producto
        ON movimientos_inventario (producto_id, tenant_id, created_at DESC);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_mov_inv_tenant
        ON movimientos_inventario (tenant_id, created_at DESC);
    `);

    // ── Seed: crear admin por defecto si la tabla está vacía ─────────────────
    const { rows: userCount } = await client.query(`SELECT COUNT(*) FROM usuarios`);
    if (parseInt(userCount[0].count, 10) === 0) {
      const hash = await bcrypt.hash('admin123', 10);
      await client.query(
        `INSERT INTO usuarios (nombre, username, password_hash, rol, tenant_id) VALUES ($1, $2, $3, $4, $5)`,
        ['Administrador', 'admin', hash, 'admin', 1]
      );
      console.log('[DB] Usuario admin creado: admin / admin123 (tenant 1)');
    }

    // ── Límite de sucursales por tenant (override del plan) ───────────────────
    // Si es NULL, se usa el límite del plan. Si tiene valor, sobreescribe el plan.
    await client.query(`
      ALTER TABLE tenants
        ADD COLUMN IF NOT EXISTS max_sucursales INTEGER DEFAULT NULL;
    `);

    // ── Límite de puntos de venta en planes y por tenant ──────────────────────
    await client.query(`
      ALTER TABLE planes
        ADD COLUMN IF NOT EXISTS max_puntos_venta INTEGER DEFAULT NULL;
    `);
    await client.query(`
      ALTER TABLE tenants
        ADD COLUMN IF NOT EXISTS max_puntos_venta INTEGER DEFAULT NULL;
    `);

    // ── Override de límite de usuarios por tenant ─────────────────────────────
    // planes.max_usuarios ya existe; aquí agregamos el override en tenants.
    await client.query(`
      ALTER TABLE tenants
        ADD COLUMN IF NOT EXISTS max_usuarios INTEGER DEFAULT NULL;
    `);

    // ── Columnas 2FA para superadmin_users (migración incremental) ───────────
    await client.query(`ALTER TABLE superadmin_users ADD COLUMN IF NOT EXISTS totp_secret  VARCHAR(255);`);
    await client.query(`ALTER TABLE superadmin_users ADD COLUMN IF NOT EXISTS totp_enabled BOOLEAN NOT NULL DEFAULT false;`);

    // ── Seed: crear superadmin por defecto si la tabla está vacía ─────────────
    const { rows: saCount } = await client.query(`SELECT COUNT(*) FROM superadmin_users`);
    if (parseInt(saCount[0].count, 10) === 0) {
      const hash = await bcrypt.hash('superadmin123', 10);
      await client.query(
        `INSERT INTO superadmin_users (nombre, username, password_hash) VALUES ($1, $2, $3)`,
        ['Super Administrador', 'superadmin', hash]
      );
      console.log('[DB] SuperAdmin creado: superadmin / superadmin123 — ¡CAMBIAR EN PRODUCCIÓN!');
    }

    // ── Reparar departamento_id / municipio_id en configuracion_empresa ──────
    // Poblar departamento_id a partir del campo string 'departamento' para registros
    // que tienen nombre guardado pero FK nulo (datos previos a la corrección del servicio).
    await client.query(`
      UPDATE configuracion_empresa ce
      SET    departamento_id = d.id
      FROM   cat_departamentos d
      WHERE  ce.departamento_id IS NULL
        AND  ce.departamento   IS NOT NULL
        AND  ce.departamento   <> ''
        AND  UPPER(TRIM(ce.departamento)) = UPPER(TRIM(d.nombre))
    `);
    // Poblar municipio_id a partir del campo string 'municipio' (solo si ya tiene departamento_id)
    await client.query(`
      UPDATE configuracion_empresa ce
      SET    municipio_id = m.id
      FROM   cat_municipios m
      WHERE  ce.municipio_id    IS NULL
        AND  ce.municipio       IS NOT NULL
        AND  ce.municipio       <> ''
        AND  ce.departamento_id IS NOT NULL
        AND  m.departamento_id  = ce.departamento_id
        AND  UPPER(TRIM(ce.municipio)) = UPPER(TRIM(m.nombre))
    `);

    console.log('[DB] Tablas e índices inicializados correctamente');
  } finally {
    client.release();
  }
}
