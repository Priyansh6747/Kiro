const { createClient } = require('@libsql/client');
require('dotenv').config({ path: '.env.local' });

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

async function run() {
  await client.execute("DROP TABLE IF EXISTS day_plan;");
  console.log("Dropped day_plan");
}

run();
