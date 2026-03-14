/**
 * seed-superadmin.ts — Crea el primer usuario SuperAdmin en la BD.
 * Ejecutar UNA SOLA VEZ al inicializar el sistema.
 *
 * Uso local:
 *   cd backend
 *   DATABASE_URL="postgresql://..." node -r ts-node/register src/scripts/seed-superadmin.ts
 *
 * O compilado:
 *   npx ts-node src/scripts/seed-superadmin.ts
 *
 * Variables de entorno (via .env o inline):
 *   DATABASE_URL      — Neon connection string
 *   SEED_USERNAME     — usuario (default: superadmin)
 *   SEED_PASSWORD     — password (default: Admin@DTE2024!)
 *   SEED_NOMBRE       — nombre completo (default: Super Administrador)
 */

import 'dotenv/config';
import bcrypt     from 'bcryptjs';
import { Pool }   from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function seedSuperAdmin() {
  const username = process.env.SEED_USERNAME || 'superadmin';
  const password = process.env.SEED_PASSWORD || 'Admin@DTE2024!';
  const nombre   = process.env.SEED_NOMBRE   || 'Super Administrador';

  console.log('\n🌱 Seed SuperAdmin — DTE Online ERP');
  console.log('=====================================');

  try {
    const { rows } = await pool.query(
      'SELECT id, username FROM superadmin_users WHERE username = $1',
      [username],
    );

    if (rows.length > 0) {
      console.log(`⚠️  Usuario "${username}" ya existe (id=${rows[0].id}). Nada que hacer.`);
      return;
    }

    const hash   = await bcrypt.hash(password, 12);
    const result = await pool.query(
      `INSERT INTO superadmin_users (nombre, username, password_hash, activo, updated_at)
       VALUES ($1, $2, $3, true, NOW())
       RETURNING id, username, nombre`,
      [nombre, username, hash],
    );

    const created = result.rows[0];
    console.log(`✅ SuperAdmin creado exitosamente:`);
    console.log(`   ID:       ${created.id}`);
    console.log(`   Usuario:  ${created.username}`);
    console.log(`   Nombre:   ${created.nombre}`);
    console.log(`   Password: ${password}`);
    console.log(`\n🔐 Inicia sesion en: /superadmin/login`);
    console.log(`⚠️  CAMBIA la contrasena despues del primer login.`);

  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seedSuperAdmin();
