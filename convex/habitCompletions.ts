import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const listByDateRange = query({
  args: { startDate: v.string(), endDate: v.string() },
  handler: async (ctx, args) => {
    const all = await ctx.db
      .query("habitCompletions")
      .withIndex("by_date")
      .collect();
    return all.filter(
      (c) => c.completedDate >= args.startDate && c.completedDate <= args.endDate
    );
  },
});

export const toggle = mutation({
  args: { habitId: v.id("habits"), completedDate: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("habitCompletions")
      .withIndex("by_habit_date", (q) =>
        q.eq("habitId", args.habitId).eq("completedDate", args.completedDate)
      )
      .unique();

    if (existing) {
      await ctx.db.delete(existing._id);
      return { action: "removed" as const };
    } else {
      await ctx.db.insert("habitCompletions", {
        habitId: args.habitId,
        completedDate: args.completedDate,
        createdAt: Date.now(),
      });
      return { action: "added" as const };
    }
  },
});
