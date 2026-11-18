import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

async function updateAllDataIsDeletedFalse() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  console.log('[Migration Script] Connecting to database...');
  const client = await pool.connect();

  try {
    const tables = [
      'accounts',
      'scripts',
      'exchanges',
      'trades',
      'brokerages',
      'expiry_dates'
    ];

    console.log('[Migration Script] Updating all tables: setting is_deleted = false...');

    for (const table of tables) {
      const res = await client.query('UPDATE "' + table + '" SET is_deleted = false, deleted_at = NULL;');
      console.log('✓ Table "' + table + '": updated ' + res.rowCount + ' rows to is_deleted = false');
    }

    console.log('[Migration Script] Verification check:');
    for (const table of tables) {
      const totalRes = await client.query('SELECT count(*) FROM "' + table + '";');
      const deletedRes = await client.query('SELECT count(*) FROM "' + table + '" WHERE is_deleted = true;');
      const nullRes = await client.query('SELECT count(*) FROM "' + table + '" WHERE is_deleted IS NULL;');
      console.log('- "' + table + '": total = ' + totalRes.rows[0].count + ', is_deleted=true: ' + deletedRes.rows[0].count + ', is_deleted=NULL: ' + nullRes.rows[0].count);
    }

    console.log('[Migration Script] Successfully completed all updates!');
  } catch (err) {
    console.error('[Migration Script Error]', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

updateAllDataIsDeletedFalse();
