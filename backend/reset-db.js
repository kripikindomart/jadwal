const { Client } = require('pg');
require('dotenv').config();

async function resetDB() {
  const client = new Client({
    user: process.env.DB_USERNAME || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_DATABASE || 'pasca_jadwal',
    password: process.env.DB_PASSWORD || 'postgres',
    port: parseInt(process.env.DB_PORT || '5432', 10),
  });

  try {
    await client.connect();
    console.log('Connected to DB');
    await client.query('DROP SCHEMA public CASCADE;');
    await client.query('CREATE SCHEMA public;');
    await client.query('GRANT ALL ON SCHEMA public TO postgres;');
    console.log('🎉 Schema dropped and re-created successfully.');
  } catch (err) {
    console.error('❌ Error dropping schema:', err);
  } finally {
    await client.end();
  }
}

resetDB();
