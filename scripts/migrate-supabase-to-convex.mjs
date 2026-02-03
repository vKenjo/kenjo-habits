#!/usr/bin/env node

/**
 * Supabase to Convex Data Migration Script
 *
 * This script migrates all data from your Supabase database to Convex.
 * Run this ONCE before deploying to production.
 *
 * Usage:
 *   node scripts/migrate-supabase-to-convex.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '../convex/_generated/api.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

// Load migration environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

try {
  const envContent = readFileSync(join(projectRoot, '.env.migration'), 'utf8');
  const envVars = Object.fromEntries(
    envContent.split('\n')
      .filter(line => line && !line.startsWith('#'))
      .map(line => line.split('='))
      .filter(([key]) => key)
  );

  Object.assign(process.env, envVars);
} catch (error) {
  console.error('❌ Error loading .env.migration file');
  console.error('Make sure .env.migration exists with your Supabase credentials');
  process.exit(1);
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing Supabase credentials in .env.migration');
  process.exit(1);
}

if (!CONVEX_URL) {
  console.error('❌ Missing Convex URL in .env.migration');
  process.exit(1);
}

// Initialize clients
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const convex = new ConvexHttpClient(CONVEX_URL);

console.log('🚀 Starting Supabase → Convex Migration\n');
console.log(`📍 Supabase: ${SUPABASE_URL}`);
console.log(`📍 Convex: ${CONVEX_URL}\n`);

let stats = {
  habits: { total: 0, migrated: 0, errors: 0 },
  habitCompletions: { total: 0, migrated: 0, errors: 0 },
  readingRatings: { total: 0, migrated: 0, errors: 0 },
  maximRatings: { total: 0, migrated: 0, errors: 0 },
  dailyJournals: { total: 0, migrated: 0, errors: 0 },
};

async function migrateHabits() {
  console.log('📦 Migrating habits...');

  const { data, error } = await supabase
    .from('habits')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('❌ Error fetching habits:', error.message);
    return;
  }

  stats.habits.total = data.length;
  console.log(`   Found ${data.length} habits`);

  for (const habit of data) {
    try {
      await convex.mutation(api.habits.create, {
        name: habit.name,
        sortOrder: habit.sort_order,
      });
      stats.habits.migrated++;
      process.stdout.write(`   ✓ Migrated: ${habit.name}\n`);
    } catch (err) {
      stats.habits.errors++;
      console.error(`   ✗ Error migrating habit "${habit.name}":`, err.message);
    }
  }

  console.log(`   ✅ Habits: ${stats.habits.migrated}/${stats.habits.total}\n`);
  return data;
}

async function migrateHabitCompletions(habitsMapping) {
  console.log('📦 Migrating habit completions...');

  const { data, error } = await supabase
    .from('habit_completions')
    .select('*');

  if (error) {
    console.error('❌ Error fetching completions:', error.message);
    return;
  }

  stats.habitCompletions.total = data.length;
  console.log(`   Found ${data.length} completions`);

  // First, get all habits from Convex to create ID mapping
  const convexHabits = await convex.query(api.habits.list);
  const habitNameToId = {};

  for (const convexHabit of convexHabits) {
    habitNameToId[convexHabit.name] = convexHabit._id;
  }

  for (const completion of data) {
    try {
      // Find the habit in our original data
      const originalHabit = habitsMapping.find(h => h.id === completion.habit_id);
      if (!originalHabit) {
        console.warn(`   ⚠ Skipping completion for unknown habit ID: ${completion.habit_id}`);
        continue;
      }

      const convexHabitId = habitNameToId[originalHabit.name];
      if (!convexHabitId) {
        console.warn(`   ⚠ Skipping completion for habit: ${originalHabit.name}`);
        continue;
      }

      await convex.mutation(api.habitCompletions.toggle, {
        habitId: convexHabitId,
        completedDate: completion.completed_date,
      });

      stats.habitCompletions.migrated++;
      if (stats.habitCompletions.migrated % 10 === 0) {
        process.stdout.write(`   ✓ Progress: ${stats.habitCompletions.migrated}/${stats.habitCompletions.total}\n`);
      }
    } catch (err) {
      stats.habitCompletions.errors++;
      if (err.message.includes('already exists')) {
        // Skip duplicates
        stats.habitCompletions.migrated++;
      } else {
        console.error(`   ✗ Error:`, err.message);
      }
    }
  }

  console.log(`   ✅ Completions: ${stats.habitCompletions.migrated}/${stats.habitCompletions.total}\n`);
}

async function migrateReadingRatings() {
  console.log('📦 Migrating reading ratings...');

  const { data, error } = await supabase
    .from('reading_ratings')
    .select('*');

  if (error) {
    console.error('❌ Error fetching reading ratings:', error.message);
    return;
  }

  stats.readingRatings.total = data.length;
  console.log(`   Found ${data.length} ratings`);

  for (const rating of data) {
    try {
      await convex.mutation(api.readingRatings.upsert, {
        bookId: rating.book_id,
        date: rating.reading_date,
        rating: rating.rating,
      });
      stats.readingRatings.migrated++;
    } catch (err) {
      stats.readingRatings.errors++;
      console.error(`   ✗ Error:`, err.message);
    }
  }

  console.log(`   ✅ Reading ratings: ${stats.readingRatings.migrated}/${stats.readingRatings.total}\n`);
}

async function migrateMaximRatings() {
  console.log('📦 Migrating maxim ratings...');

  const { data, error } = await supabase
    .from('maxim_ratings')
    .select('*');

  if (error) {
    console.error('❌ Error fetching maxim ratings:', error.message);
    return;
  }

  stats.maximRatings.total = data.length;
  console.log(`   Found ${data.length} ratings`);

  for (const rating of data) {
    try {
      await convex.mutation(api.maximRatings.upsert, {
        maximNumber: rating.maxim_number,
        rating: rating.rating,
      });
      stats.maximRatings.migrated++;
    } catch (err) {
      stats.maximRatings.errors++;
      console.error(`   ✗ Error:`, err.message);
    }
  }

  console.log(`   ✅ Maxim ratings: ${stats.maximRatings.migrated}/${stats.maximRatings.total}\n`);
}

async function migrateDailyJournals() {
  console.log('📦 Migrating daily journals...');

  const { data, error } = await supabase
    .from('daily_journals')
    .select('*');

  if (error) {
    console.error('❌ Error fetching journals:', error.message);
    return;
  }

  stats.dailyJournals.total = data.length;
  console.log(`   Found ${data.length} journal entries`);

  for (const journal of data) {
    try {
      await convex.mutation(api.dailyJournals.upsert, {
        date: journal.date,
        content: journal.content,
      });
      stats.dailyJournals.migrated++;
    } catch (err) {
      stats.dailyJournals.errors++;
      console.error(`   ✗ Error:`, err.message);
    }
  }

  console.log(`   ✅ Journals: ${stats.dailyJournals.migrated}/${stats.dailyJournals.total}\n`);
}

async function main() {
  try {
    // Test connections
    console.log('🔌 Testing connections...');
    const { error: sbError } = await supabase.from('habits').select('count');
    if (sbError && !sbError.message.includes('does not exist')) {
      throw new Error(`Supabase connection failed: ${sbError.message}`);
    }

    await convex.query(api.habits.list);
    console.log('✅ Connections successful\n');

    // Perform migrations
    const habits = await migrateHabits();
    await migrateHabitCompletions(habits);
    await migrateReadingRatings();
    await migrateMaximRatings();
    await migrateDailyJournals();

    // Print summary
    console.log('═══════════════════════════════════════');
    console.log('📊 Migration Summary');
    console.log('═══════════════════════════════════════');

    const totalMigrated = Object.values(stats).reduce((sum, s) => sum + s.migrated, 0);
    const totalRecords = Object.values(stats).reduce((sum, s) => sum + s.total, 0);
    const totalErrors = Object.values(stats).reduce((sum, s) => sum + s.errors, 0);

    console.table(stats);

    console.log(`\n✅ Successfully migrated ${totalMigrated}/${totalRecords} records`);
    if (totalErrors > 0) {
      console.log(`⚠️  ${totalErrors} errors occurred`);
    }

    console.log('\n🎉 Migration complete!');
    console.log('\nNext steps:');
    console.log('1. Run: npx convex deploy --prod');
    console.log('2. Update production environment variables');
    console.log('3. Deploy your Next.js app');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

main();
