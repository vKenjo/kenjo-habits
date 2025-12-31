const { Client } = require('pg');

const client = new Client({
    connectionString: 'postgresql://postgres:KenjoKoorui27!@db.mihhakhjhbsbqhmgfeoh.supabase.co:5432/postgres'
});

async function setupDatabase() {
    try {
        await client.connect();
        console.log('Connected to database');

        // Create habits table
        await client.query(`
      CREATE TABLE IF NOT EXISTS habits (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        name TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        sort_order INTEGER DEFAULT 0
      );
    `);
        console.log('Created habits table');

        // Create habit_completions table
        await client.query(`
      CREATE TABLE IF NOT EXISTS habit_completions (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        habit_id UUID REFERENCES habits(id) ON DELETE CASCADE,
        completed_date DATE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(habit_id, completed_date)
      );
    `);
        console.log('Created habit_completions table');

        // Create indexes
        await client.query(`
      CREATE INDEX IF NOT EXISTS idx_habit_completions_habit_id ON habit_completions(habit_id);
      CREATE INDEX IF NOT EXISTS idx_habit_completions_date ON habit_completions(completed_date);
    `);
        console.log('Created indexes');

        console.log('Database setup complete!');
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await client.end();
    }
}

setupDatabase();
