# Deployment Guide: Supabase to Convex Migration

## Status: ✅ Code Migrated to Convex

Your codebase has been successfully migrated from Supabase to Convex. Follow these steps to deploy to production.

---

## 🚀 Production Deployment Steps

### Step 1: Deploy Convex to Production

Run this command to create your production Convex deployment:

```bash
npx convex deploy --prod
```

This will:
- Create a production deployment (e.g., `prod:amazing-animal-123`)
- Deploy your schema and functions
- Give you production URLs

**Save the output!** You'll need:
- `CONVEX_DEPLOYMENT` value
- `NEXT_PUBLIC_CONVEX_URL` value

---

### Step 2: Configure Environment Variables

#### On Vercel:

1. Go to your Vercel dashboard
2. Select your project: `kenjo-habits`
3. Go to **Settings** → **Environment Variables**

**Remove these (old Supabase variables):**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**Add these (new Convex variables):**
```
CONVEX_DEPLOYMENT=prod:your-deployment-name
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
NEXT_PUBLIC_CONVEX_SITE_URL=https://your-deployment.convex.site
```

#### On Other Platforms:

Set the same environment variables in your platform's configuration.

---

### Step 3: Deploy Next.js Application

#### If using Vercel:
The push to `main` branch will automatically trigger a deployment.

Or manually deploy:
```bash
vercel --prod
```

#### If using another platform:
```bash
npm run build
npm run start
```

---

### Step 4: Verify Deployment

1. Visit your production URL
2. Test all features:
   - ✅ Create/delete habits
   - ✅ Toggle habit completions
   - ✅ Write journal entries
   - ✅ Rate daily readings
   - ✅ Like/dislike quotes
   - ✅ View history

3. Check Convex Dashboard:
```bash
npx convex dashboard
```

---

## 🔄 Data Migration (If Needed)

If you have existing data in Supabase:

### Option 1: Manual Migration Script
```bash
# Edit scripts/migrate-to-convex.mjs with your credentials
node scripts/migrate-to-convex.mjs
```

### Option 2: Fresh Start
- No action needed
- All users start with clean slate

---

## ⚡ Quick Commands

```bash
# Deploy Convex functions only
npm run convex:deploy

# View Convex dashboard
npx convex dashboard

# Check deployment status
git log -1 --oneline

# Force redeploy
vercel --prod --force
```

---

## 🆘 Troubleshooting

### "No functions found"
- Ensure `convex/` directory is committed to git
- Run `npx convex deploy --prod` again

### "Environment variable not found"
- Check that `NEXT_PUBLIC_CONVEX_URL` is set in deployment platform
- Redeploy after adding variables

### "Data not loading"
- Open browser console for errors
- Check Convex dashboard for function logs
- Verify environment variables are correct

### "Still seeing Supabase errors"
- Clear browser cache
- Ensure latest commit is deployed
- Check that old Supabase env vars are removed

---

## 📊 Architecture

**Before (Supabase):**
```
Next.js App → API Routes → Supabase PostgreSQL
```

**After (Convex):**
```
Next.js App → Convex Reactive Queries → Convex Database
```

**Benefits:**
- ✨ Real-time updates
- 🚀 No API routes needed
- 🔒 Type-safe database access
- ⚡ Automatic cache invalidation

---

## 🔗 Resources

- [Convex Dashboard](https://dashboard.convex.dev)
- [Convex Documentation](https://docs.convex.dev)
- [Deployment Status](https://github.com/vKenjo/kenjo-habits)

---

Last Updated: 2026-02-03
Migration Commit: `8e9a648`
