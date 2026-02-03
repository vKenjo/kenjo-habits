import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const seedHabits = mutation({
  args: {
    habits: v.array(
      v.object({
        name: v.string(),
        createdAt: v.number(),
        sortOrder: v.number(),
        oldId: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const idMap: Record<string, string> = {};
    for (const h of args.habits) {
      const newId = await ctx.db.insert("habits", {
        name: h.name,
        createdAt: h.createdAt,
        sortOrder: h.sortOrder,
      });
      idMap[h.oldId] = newId;
    }
    return idMap;
  },
});

export const seedCompletions = mutation({
  args: {
    completions: v.array(
      v.object({
        habitId: v.id("habits"),
        completedDate: v.string(),
        createdAt: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    for (const c of args.completions) {
      await ctx.db.insert("habitCompletions", {
        habitId: c.habitId,
        completedDate: c.completedDate,
        createdAt: c.createdAt,
      });
    }
    return { count: args.completions.length };
  },
});

export const seedReadingRatings = mutation({
  args: {
    ratings: v.array(
      v.object({
        bookId: v.string(),
        readingDate: v.string(),
        rating: v.number(),
        createdAt: v.number(),
        updatedAt: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    for (const r of args.ratings) {
      await ctx.db.insert("readingRatings", r);
    }
    return { count: args.ratings.length };
  },
});

export const seedMaximRatings = mutation({
  args: {
    ratings: v.array(
      v.object({
        maximNumber: v.number(),
        rating: v.boolean(),
        createdAt: v.number(),
        updatedAt: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    for (const r of args.ratings) {
      await ctx.db.insert("maximRatings", r);
    }
    return { count: args.ratings.length };
  },
});

export const seedJournals = mutation({
  args: {
    journals: v.array(
      v.object({
        date: v.string(),
        content: v.string(),
        updatedAt: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    for (const j of args.journals) {
      await ctx.db.insert("dailyJournals", j);
    }
    return { count: args.journals.length };
  },
});
