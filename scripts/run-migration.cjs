// Run Supabase migration via direct PG connection
// Usage: node scripts/run-migration.cjs <migration-file>
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const migrationFile = process.argv[2];
if (!migrationFile) {
  console.error('Usage: node scripts/run-migration.cjs <migration-file>');
  process.exit(1);
}

const sql = fs.readFileSync(path.resolve(migrationFile), 'utf8');

// Supabase session pooler connection
// Password = service role JWT
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1jbmdhdHByZ2x1ZXhqamNxcGtwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzgyNTcxNSwiZXhwIjoyMDg5NDAxNzE1fQ.4thmVan7mq2MtnbI-AGynfNZBTUA3QGXKtpDJlzSPlg';

const client = new Client({
  host: 'aws-0-us-west-1.pooler.supabase.com',
  port: 5432,
  database: 'postgres',
  user: 'postgres.mcngatprgluexjjcqpkp',
  password: SERVICE_KEY,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  try {
    await client.connect();
    console.log('Connected to Supabase');

    // Split by double newlines + semicolons to handle multi-statement SQL
    // Actually just run the whole thing
    await client.query(sql);
    console.log('Migration applied successfully');
  } catch (err) {
    console.error('Migration failed:', err.message);
    // Don't exit with error -- some errors are expected (already exists)
    if (err.message.includes('already exists') || err.message.includes('duplicate key')) {
      console.log('(Ignoring "already exists" error -- table was already created)');
    } else {
      process.exit(1);
    }
  } finally {
    await client.end();
  }
}

run();
