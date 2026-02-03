import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getByDate = query({
  args: { date: v.string() },
  handler: async (ctx, args) => {
    const result = await ctx.db
      .query("dailyJournals")
      .withIndex("by_date", (q) => q.eq("date", args.date))
      .unique();
    return { content: result?.content ?? "" };
  },
});

export const getByDateRange = query({
  args: { startDate: v.string(), endDate: v.string() },
  handler: async (ctx, args) => {
    const all = await ctx.db
      .query("dailyJournals")
      .withIndex("by_date")
      .collect();
    return all.filter(
      (j) => j.date >= args.startDate && j.date <= args.endDate
    );
  },
});

export const upsert = mutation({
  args: { date: v.string(), content: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("dailyJournals")
      .withIndex("by_date", (q) => q.eq("date", args.date))
      .unique();

    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        content: args.content,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("dailyJournals", {
        date: args.date,
        content: args.content,
        updatedAt: now,
      });
    }
    return { success: true };
  },
});
