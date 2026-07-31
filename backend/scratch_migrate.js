import pkg from 'pg';
const { Client } = pkg;

const regions = [
  "us-east-1", "us-west-1", "us-east-2", "eu-central-1", "eu-west-1",
  "ap-southeast-1", "ap-southeast-2", "ap-northeast-1", "ap-south-1",
  "sa-east-1", "ca-central-1", "me-central-1"
];

async function testRegions() {
  for (const region of regions) {
    const connStr = `postgresql://postgres.yuorzkwsyawkypjxzutt:gmfabrics1234%23@aws-0-${region}.pooler.supabase.com:6543/postgres`;
    const client = new Client({
      connectionString: connStr,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 3000
    });
    try {
      await client.connect();
      console.log(`FOUND ACTIVE SUPABASE REGION: ${region}`);
      const res = await client.query(`
        ALTER TABLE "ReturnItem" ADD COLUMN IF NOT EXISTS "condition" TEXT DEFAULT 'RESTOCK';
      `);
      console.log("Migration executed successfully!", res);
      await client.end();
      return connStr;
    } catch (err) {
      if (!err.message.includes("ENOTFOUND")) {
        console.log(`Region ${region} resolved, response:`, err.message);
      }
      try { await client.end(); } catch (e) {}
    }
  }
  console.log("None of the standard pooler regions connected.");
}

testRegions();
