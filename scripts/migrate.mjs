/**
 * Script de migración: Gamificación Municipal
 * 
 * Uso:
 *   $env:DB_PASSWORD = "tu-password-de-supabase"
 *   node scripts/migrate.mjs
 *
 * La DB_PASSWORD se obtiene desde:
 *   Supabase Dashboard → Settings → Database → Database Password
 */

import { readFileSync } from 'fs';
import { createConnection } from 'net';

const PROJECT_REF = 'enkwnlgjslmtxuysdkfc';
const DB_PASSWORD = process.env.DB_PASSWORD;

if (!DB_PASSWORD) {
    console.error('\n❌ Falta la variable de entorno DB_PASSWORD');
    console.error('   Ejecutá: $env:DB_PASSWORD = "tu-password" ; node scripts/migrate.mjs');
    console.error('\n   Encontrás la password en:');
    console.error(`   https://supabase.com/dashboard/project/${PROJECT_REF}/settings/database`);
    process.exit(1);
}

// Conexión directa a Postgres (Supabase)
const connectionString = `postgresql://postgres.${PROJECT_REF}:${DB_PASSWORD}@aws-0-sa-east-1.pooler.supabase.com:5432/postgres`;

console.log(`\n🔗 Conectando a Supabase (${PROJECT_REF})...`);

// Importamos pg dinámicamente para no requerir instalación previa
const { default: pg } = await import('pg').catch(() => {
    console.error('❌ Módulo "pg" no encontrado. Instalando...');
    return null;
});

if (!pg) {
    const { execSync } = await import('child_process');
    execSync('npm install pg --no-save', { stdio: 'inherit' });
    const { default: pgRetry } = await import('pg');
    await runMigration(pgRetry);
} else {
    await runMigration(pg);
}

async function runMigration(pg) {
    const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });

    try {
        await client.connect();
        console.log('✅ Conexión establecida\n');

        const sql = readFileSync('./sql/11_gamificacion_municipal.sql', 'utf-8');

        console.log('📦 Ejecutando migración...');
        await client.query(sql);

        console.log('✅ Migración ejecutada exitosamente');
        console.log('\n📊 Verificando tablas creadas...');

        const { rows } = await client.query(`
            SELECT table_name FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('muni_calificaciones', 'muni_comentarios')
            ORDER BY table_name;
        `);

        rows.forEach(r => console.log(`   ✅ Tabla: ${r.table_name}`));

        const { rows: views } = await client.query(`
            SELECT viewname FROM pg_views 
            WHERE schemaname = 'public' 
            AND viewname = 'v_ranking_municipalidades';
        `);

        views.forEach(r => console.log(`   ✅ Vista: ${r.viewname}`));

        console.log('\n🎉 ¡Migración completada! El sistema de gamificación está listo.');

    } catch (err) {
        console.error('\n❌ Error en la migración:', err.message);
        process.exit(1);
    } finally {
        await client.end();
    }
}
