import 'dotenv/config';
import { pool } from '../database';

async function main() {
  const client = await pool.connect();
  try {
    console.log('Connected to PostgreSQL database. Checking and updating is_deleted columns across tables...');

    const tables = ['accounts', 'scripts', 'exchanges', 'trades', 'brokerages'];

    // Ensure columns exist on core tables
    for (const table of tables) {
      await client.query(`
        ALTER TABLE "${table}" 
        ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false,
        ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
      `);
      console.log(`Verified is_deleted column exists on table "${table}".`);
    }

    // Check if expiry_dates table exists
    const checkExpiry = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'expiry_dates'
      );
    `);
    if (checkExpiry.rows[0].exists) {
      await client.query(`
        ALTER TABLE "expiry_dates" 
        ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false,
        ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
      `);
      tables.push('expiry_dates');
      console.log('Verified is_deleted on expiry_dates table.');
    }

    // Update all tables to is_deleted = false
    console.log('\n--- Updating is_deleted to FALSE across all records ---');
    for (const table of tables) {
      const totalRes = await client.query(`SELECT COUNT(*) as cnt FROM "${table}"`);
      const totalCount = parseInt(totalRes.rows[0].cnt, 10);

      const updateRes = await client.query(`
        UPDATE "${table}" 
        SET is_deleted = false, deleted_at = NULL 
        WHERE is_deleted IS NULL OR is_deleted != false
      `);

      const activeRes = await client.query(`SELECT COUNT(*) as cnt FROM "${table}" WHERE is_deleted = false`);
      const activeCount = parseInt(activeRes.rows[0].cnt, 10);

      console.log(`Table "${table}": Total = ${totalCount}, Updated = ${updateRes.rowCount}, Now is_deleted=false = ${activeCount}`);
    }

    console.log('\nAll tables successfully updated to is_deleted = false!');
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error('Migration script failed:', err);
  process.exit(1);
});
