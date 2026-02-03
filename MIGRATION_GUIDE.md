# 🚀 Data Migration Guide: Supabase → Convex

## Overview

This guide will help you migrate your existing data from Supabase to Convex.

---

## ⚠️ Important Notes

1. **The migration script is ready to run** - Your Supabase credentials are configured
2. **This is a ONE-TIME operation** - Run it only once
3. **No downtime** - Existing Supabase data remains untouched
4. **Safe to rerun** - The script handles duplicates gracefully

---

## 📋 Pre-Migration Checklist

- [x] Supabase credentials configured in `.env.migration`
- [x] Convex dev deployment active (`dev:usable-porcupine-910`)
- [x] Migration script created
- [ ] Convex dev server running

---

## 🔄 Migration Steps

### Step 1: Start Convex Dev Server

Open a terminal and run:

```bash
npx convex dev
```

Keep this terminal open. This syncs your local schema to Convex.

### Step 2: Run Migration Script

In a NEW terminal, run:

```bash
node scripts/migrate-supabase-to-convex.mjs
```

This will:
- ✅ Connect to your Supabase database
- ✅ Fetch all data from 5 tables:
  - `habits`
  - `habit_completions`
  - `reading_ratings`
  - `maxim_ratings`
  - `daily_journals`
- ✅ Import everything into Convex
- ✅ Show progress in real-time
- ✅ Display final statistics

### Step 3: Verify Migration

Check the Convex dashboard:

```bash
npx convex dashboard
```

Navigate to "Data" tab and verify:
- [ ] Habits table has entries
- [ ] HabitCompletions table has entries
- [ ] ReadingRatings table has entries
- [ ] MaximRatings table has entries
- [ ] DailyJournals table has entries

---

## 📊 Expected Output

The migration script will show:

```
🚀 Starting Supabase → Convex Migration

📍 Supabase: https://mihhakhjhbsbqhmgfeoh.supabase.co
📍 Convex: https://usable-porcupine-910.convex.cloud

🔌 Testing connections...
✅ Connections successful

📦 Migrating habits...
   Found X habits
   ✓ Migrated: Morning Run
   ✓ Migrated: Read Book
   ✅ Habits: X/X

📦 Migrating habit completions...
   Found X completions
   ✓ Progress: 10/X
   ✓ Progress: 20/X
   ✅ Completions: X/X

📦 Migrating reading ratings...
   Found X ratings
   ✅ Reading ratings: X/X

📦 Migrating maxim ratings...
   Found X ratings
   ✅ Maxim ratings: X/X

📦 Migrating daily journals...
   Found X journal entries
   ✅ Journals: X/X

═══════════════════════════════════════
📊 Migration Summary
═══════════════════════════════════════

✅ Successfully migrated X/X records
🎉 Migration complete!
```

---

## 🔧 Troubleshooting

### "Cannot find module '@supabase/supabase-js'"
**Solution:**
```bash
npm install
```

### "Error loading .env.migration file"
**Solution:**
Ensure `.env.migration` exists with your Supabase credentials.

### "Supabase connection failed"
**Solution:**
- Check your Supabase URL and API keys
- Verify your Supabase project is still active
- Ensure you're using the service role key (starts with `sb_secret_`)

### "Convex connection failed"
**Solution:**
- Ensure `npx convex dev` is running
- Check `NEXT_PUBLIC_CONVEX_URL` is correct
- Verify you have internet connection

### Duplicate entries
**Solution:**
The script automatically handles duplicates. Rerunning is safe.

---

## ✅ After Migration

Once migration is complete:

1. **Test locally:**
   ```bash
   npm run dev
   ```
   Visit `http://localhost:3000` and verify all your data is there

2. **Deploy to production:**
   ```bash
   # Deploy Convex
   npx convex deploy --prod

   # Push code
   git add .
   git commit -m "chore: add data migration scripts"
   git push origin main
   ```

3. **Update production env vars** (see DEPLOYMENT.md)

4. **Optionally:** Keep Supabase running for a few days as backup, then delete

---

## 🗑️ Cleanup (After Successful Production Deployment)

After everything works in production:

1. Remove Supabase project (optional)
2. Delete `.env.migration` file
3. Remove migration script (optional):
   ```bash
   rm scripts/migrate-supabase-to-convex.mjs
   rm .env.migration
   ```

---

## 📞 Support

If you encounter issues:
1. Check Convex logs: `npx convex dashboard` → "Logs" tab
2. Check migration script output for specific errors
3. Verify all environment variables are correct

---

## 🔐 Security Note

The `.env.migration` file contains sensitive credentials:
- ✅ It's automatically ignored by `.gitignore`
- ✅ Never commit it to version control
- ✅ Delete it after migration is complete

---

Last Updated: 2026-02-03
