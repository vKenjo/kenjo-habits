import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getByMaximNumber = query({
  args: { maximNumber: v.number() },
  handler: async (ctx, args) => {
    const result = await ctx.db
      .query("maximRatings")
      .withIndex("by_maxim_number", (q) =>
        q.eq("maximNumber", args.maximNumber)
      )
      .unique();
    return { rating: result?.rating ?? null };
  },
});

export const getPositiveByDateRange = query({
  args: { startDate: v.number(), endDate: v.number() },
  handler: async (ctx, args) => {
    const all = await ctx.db
      .query("maximRatings")
      .withIndex("by_updated")
      .collect();
    return all.filter(
      (r) =>
        r.rating === true &&
        r.updatedAt >= args.startDate &&
        r.updatedAt <= args.endDate
    );
  },
});

export const upsert = mutation({
  args: {
    maximNumber: v.number(),
    rating: v.union(v.boolean(), v.null()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("maximRatings")
      .withIndex("by_maxim_number", (q) =>
        q.eq("maximNumber", args.maximNumber)
      )
      .unique();

    if (args.rating === null) {
      if (existing) {
        await ctx.db.delete(existing._id);
      }
      return { rating: null };
    }

    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        rating: args.rating,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("maximRatings", {
        maximNumber: args.maximNumber,
        rating: args.rating,
        createdAt: now,
        updatedAt: now,
      });
    }
    return { rating: args.rating };
  },
});
