import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

function calculateStreak(dates: string[]): number {
  if (dates.length === 0) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const sortedDates = [...dates]
    .map((d) => {
      const dt = new Date(d);
      dt.setHours(0, 0, 0, 0);
      return dt;
    })
    .sort((a, b) => b.getTime() - a.getTime());

  let streak = 0;
  let expectedDate = today;

  for (const date of sortedDates) {
    if (date.getTime() === expectedDate.getTime()) {
      streak++;
      expectedDate = new Date(expectedDate);
      expectedDate.setDate(expectedDate.getDate() - 1);
    } else if (date.getTime() < expectedDate.getTime()) {
      if (
        streak === 0 &&
        date.getTime() === expectedDate.getTime() - 86400000
      ) {
        streak = 1;
        expectedDate = new Date(date);
        expectedDate.setDate(expectedDate.getDate() - 1);
      } else {
        break;
      }
    }
  }

  return streak;
}

export const getWithStreak = query({
  args: { bookId: v.string(), date: v.string() },
  handler: async (ctx, args) => {
    const allRatings = await ctx.db
      .query("readingRatings")
      .withIndex("by_book", (q) => q.eq("bookId", args.bookId))
      .collect();

    const dates = allRatings.map((r) => r.readingDate);
    const streak = calculateStreak(dates);
    const todayRating = allRatings.find((r) => r.readingDate === args.date);

    return {
      rating: todayRating?.rating ?? null,
      streak,
      totalDays: dates.length,
    };
  },
});

export const getByDate = query({
  args: { date: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("readingRatings")
      .withIndex("by_date", (q) => q.eq("readingDate", args.date))
      .collect();
  },
});

export const getByDateRange = query({
  args: { startDate: v.string(), endDate: v.string() },
  handler: async (ctx, args) => {
    const all = await ctx.db
      .query("readingRatings")
      .withIndex("by_date")
      .collect();
    return all.filter(
      (r) => r.readingDate >= args.startDate && r.readingDate <= args.endDate
    );
  },
});

// Get streak data for all books at once (for DailyReading component)
export const getAllStreaks = query({
  args: { bookIds: v.array(v.string()), date: v.string() },
  handler: async (ctx, args) => {
    const result: Record<
      string,
      { rating: number | null; streak: number; totalDays: number }
    > = {};

    for (const bookId of args.bookIds) {
      const ratings = await ctx.db
        .query("readingRatings")
        .withIndex("by_book", (q) => q.eq("bookId", bookId))
        .collect();

      const dates = ratings.map((r) => r.readingDate);
      const streak = calculateStreak(dates);
      const todayRating = ratings.find((r) => r.readingDate === args.date);

      result[bookId] = {
        rating: todayRating?.rating ?? null,
        streak,
        totalDays: dates.length,
      };
    }

    return result;
  },
});

export const upsert = mutation({
  args: {
    bookId: v.string(),
    date: v.string(),
    rating: v.number(),
  },
  handler: async (ctx, args) => {
    if (args.rating < 1 || args.rating > 5) {
      throw new Error("Rating must be between 1 and 5");
    }

    const submissionDate = new Date(args.date);
    const today = new Date();
    submissionDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    if (submissionDate > today) {
      throw new Error("Cannot rate for future dates");
    }

    const existing = await ctx.db
      .query("readingRatings")
      .withIndex("by_book_date", (q) =>
        q.eq("bookId", args.bookId).eq("readingDate", args.date)
      )
      .unique();

    const now = Date.now();

    if (existing) {
      await ctx.db.patch(existing._id, {
        rating: args.rating,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("readingRatings", {
        bookId: args.bookId,
        readingDate: args.date,
        rating: args.rating,
        createdAt: now,
        updatedAt: now,
      });
    }

    // Return updated streak
    const allRatings = await ctx.db
      .query("readingRatings")
      .withIndex("by_book", (q) => q.eq("bookId", args.bookId))
      .collect();

    const dates = allRatings.map((r) => r.readingDate);
    const streak = calculateStreak(dates);
    return { rating: args.rating, streak, totalDays: dates.length };
  },
});
