const { Client } = require('pg');

const client = new Client({
    connectionString: 'postgresql://postgres:KenjoKoorui27!@db.mihhakhjhbsbqhmgfeoh.supabase.co:5432/postgres'
});

async function setupJournalDatabase() {
    try {
        await client.connect();
        console.log('Connected to database');

        // Create daily_journals table
        await client.query(`
            CREATE TABLE IF NOT EXISTS daily_journals (
                id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
                date DATE NOT NULL UNIQUE,
                content TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        `);
        console.log('Created daily_journals table');

        // Create indexes
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_daily_journals_date ON daily_journals(date);
        `);
        console.log('Created indexes');

        console.log('Journal database setup complete!');
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await client.end();
    }
}

setupJournalDatabase();
