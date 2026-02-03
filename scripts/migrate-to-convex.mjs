/**
 * Migration script: Supabase → Convex
 *
 * Prerequisites:
 *   1. Run `npx convex dev` first to deploy schema and functions
 *   2. Ensure .env.local has both Supabase and Convex credentials
 *
 * Usage:
 *   node scripts/migrate-to-convex.mjs
 */

import { createClient } from "@supabase/supabase-js";
import { ConvexHttpClient } from "convex/browser";

// Load env vars from .env.local
import { readFileSync } from "fs";
const envFile = readFileSync(".env.local", "utf-8");
const env = {};
for (const line of envFile.split("\n")) {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) {
    env[match[1].trim()] = match[2].trim();
  }
}

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const CONVEX_URL = env.NEXT_PUBLIC_CONVEX_URL;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}
if (!CONVEX_URL) {
  console.error("Missing NEXT_PUBLIC_CONVEX_URL in .env.local. Run `npx convex dev` first.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const convex = new ConvexHttpClient(CONVEX_URL);

async function migrate() {
  console.log("Starting migration from Supabase to Convex...\n");

  // 1. Migrate habits
  console.log("1/5 Migrating habits...");
  const { data: habits, error: habitsErr } = await supabase
    .from("habits")
    .select("*")
    .order("sort_order", { ascending: true });
  if (habitsErr) throw habitsErr;

  let habitIdMap = {};
  if (habits && habits.length > 0) {
    const habitsPayload = habits.map((h) => ({
      name: h.name,
      createdAt: new Date(h.created_at).getTime(),
      sortOrder: h.sort_order ?? 0,
      oldId: h.id,
    }));
    habitIdMap = await convex.mutation("migration:seedHabits", {
      habits: habitsPayload,
    });
    console.log(`   Migrated ${habits.length} habits`);
  } else {
    console.log("   No habits found");
  }

  // 2. Migrate habit completions
  console.log("2/5 Migrating habit completions...");
  const { data: completions, error: compErr } = await supabase
    .from("habit_completions")
    .select("*");
  if (compErr) throw compErr;

  if (completions && completions.length > 0) {
    // Filter out completions for habits that weren't migrated (orphaned)
    const validCompletions = completions.filter((c) => habitIdMap[c.habit_id]);

    // Chunk into batches of 100 to avoid payload limits
    const batchSize = 100;
    for (let i = 0; i < validCompletions.length; i += batchSize) {
      const batch = validCompletions.slice(i, i + batchSize).map((c) => ({
        habitId: habitIdMap[c.habit_id],
        completedDate: c.completed_date,
        createdAt: new Date(c.created_at).getTime(),
      }));
      await convex.mutation("migration:seedCompletions", {
        completions: batch,
      });
    }
    console.log(`   Migrated ${validCompletions.length} completions`);
  } else {
    console.log("   No completions found");
  }

  // 3. Migrate reading ratings
  console.log("3/5 Migrating reading ratings...");
  const { data: readingRatings, error: rrErr } = await supabase
    .from("reading_ratings")
    .select("*");
  if (rrErr) throw rrErr;

  if (readingRatings && readingRatings.length > 0) {
    const batchSize = 100;
    for (let i = 0; i < readingRatings.length; i += batchSize) {
      const batch = readingRatings.slice(i, i + batchSize).map((r) => ({
        bookId: r.book_id,
        readingDate: r.reading_date,
        rating: r.rating,
        createdAt: new Date(r.created_at).getTime(),
        updatedAt: new Date(r.updated_at).getTime(),
      }));
      await convex.mutation("migration:seedReadingRatings", {
        ratings: batch,
      });
    }
    console.log(`   Migrated ${readingRatings.length} reading ratings`);
  } else {
    console.log("   No reading ratings found");
  }

  // 4. Migrate maxim ratings
  console.log("4/5 Migrating maxim ratings...");
  const { data: maximRatings, error: mrErr } = await supabase
    .from("maxim_ratings")
    .select("*");
  if (mrErr) throw mrErr;

  if (maximRatings && maximRatings.length > 0) {
    const batchSize = 100;
    for (let i = 0; i < maximRatings.length; i += batchSize) {
      const batch = maximRatings.slice(i, i + batchSize).map((r) => ({
        maximNumber: r.maxim_number,
        rating: r.rating,
        createdAt: new Date(r.created_at).getTime(),
        updatedAt: new Date(r.updated_at).getTime(),
      }));
      await convex.mutation("migration:seedMaximRatings", {
        ratings: batch,
      });
    }
    console.log(`   Migrated ${maximRatings.length} maxim ratings`);
  } else {
    console.log("   No maxim ratings found");
  }

  // 5. Migrate daily journals
  console.log("5/5 Migrating daily journals...");
  const { data: journals, error: jErr } = await supabase
    .from("daily_journals")
    .select("*");
  if (jErr) throw jErr;

  if (journals && journals.length > 0) {
    const batchSize = 100;
    for (let i = 0; i < journals.length; i += batchSize) {
      const batch = journals.slice(i, i + batchSize).map((j) => ({
        date: j.date,
        content: j.content || "",
        updatedAt: new Date(j.updated_at).getTime(),
      }));
      await convex.mutation("migration:seedJournals", { journals: batch });
    }
    console.log(`   Migrated ${journals.length} journal entries`);
  } else {
    console.log("   No journal entries found");
  }

  console.log("\nMigration complete!");
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
