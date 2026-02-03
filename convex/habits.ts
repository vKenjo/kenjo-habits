import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("habits").withIndex("by_sort_order").collect();
  },
});

export const create = mutation({
  args: { name: v.string(), sortOrder: v.number() },
  handler: async (ctx, args) => {
    return await ctx.db.insert("habits", {
      name: args.name,
      sortOrder: args.sortOrder,
      createdAt: Date.now(),
    });
  },
});

export const updateSortOrder = mutation({
  args: { id: v.id("habits"), sortOrder: v.number() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { sortOrder: args.sortOrder });
  },
});

export const remove = mutation({
  args: { id: v.id("habits") },
  handler: async (ctx, args) => {
    // Cascade delete completions
    const completions = await ctx.db
      .query("habitCompletions")
      .withIndex("by_habit", (q) => q.eq("habitId", args.id))
      .collect();
    for (const c of completions) {
      await ctx.db.delete(c._id);
    }
    await ctx.db.delete(args.id);
  },
});
