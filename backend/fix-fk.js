const { Client } = require('pg');
require('dotenv').config();

async function fixFk() {
  const client = new Client({
    user: process.env.DB_USERNAME || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_DATABASE || 'pasca_jadwal',
    password: process.env.DB_PASSWORD || 'postgres',
    port: parseInt(process.env.DB_PORT || '5432', 10),
  });

  try {
    await client.connect();
    
    console.log('Dropping and recreating class_students constraint...');
    await client.query(`ALTER TABLE class_students DROP CONSTRAINT IF EXISTS "FK_4e9a9986dd87d6448440f840144";`);
    await client.query(`ALTER TABLE class_students ADD CONSTRAINT "FK_4e9a9986dd87d6448440f840144" FOREIGN KEY ("studentId") REFERENCES users(id) ON DELETE CASCADE;`);
    
    console.log('Foreign keys updated successfully!');
  } catch (err) {
    console.error('Error updating foreign keys:', err);
  } finally {
    await client.end();
  }
}

fixFk();
