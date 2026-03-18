import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

export { sql }

export async function initDb() {
  await sql`
    CREATE TABLE IF NOT EXISTS proposals (
      id SERIAL PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      test_name TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      created_by TEXT,
      flow_name TEXT DEFAULT '',
      canvas_link TEXT DEFAULT '',
      entry_trigger TEXT DEFAULT '',
      entry_rules TEXT DEFAULT '',
      exit_rules TEXT DEFAULT '',
      primary_goal TEXT DEFAULT '',
      secondary_goals TEXT DEFAULT '',
      test_direction TEXT DEFAULT '',
      test_hypothesis TEXT DEFAULT '',
      hypothesis_reasons TEXT DEFAULT '',
      hypothesis_exclusion TEXT DEFAULT '',
      expected_learning_1 TEXT DEFAULT '',
      expected_learning_2 TEXT DEFAULT '',
      expected_learning_3 TEXT DEFAULT '',
      next_test_1 TEXT DEFAULT '',
      next_test_2 TEXT DEFAULT '',
      next_test_3 TEXT DEFAULT '',
      steps JSONB DEFAULT '[]'
    )
  `
  // Safe migration: add steps column to existing tables that predate this schema
  await sql`ALTER TABLE proposals ADD COLUMN IF NOT EXISTS steps JSONB DEFAULT '[]'`
}
