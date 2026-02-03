import { query } from "./_generated/server";
import { v } from "convex/values";

export const getByDate = query({
  args: { date: v.string() },
  handler: async (ctx, args) => {
    const ratings = await ctx.db
      .query("readingRatings")
      .withIndex("by_date", (q) => q.eq("readingDate", args.date))
      .collect();

    const journal = await ctx.db
      .query("dailyJournals")
      .withIndex("by_date", (q) => q.eq("date", args.date))
      .unique();

    return {
      date: args.date,
      journal: journal?.content ?? "",
      readings: ratings.map((r) => ({
        bookId: r.bookId,
        rating: r.rating,
      })),
    };
  },
});

export const getByMonth = query({
  args: { startDate: v.string(), endDate: v.string() },
  handler: async (ctx, args) => {
    const allRatings = await ctx.db
      .query("readingRatings")
      .withIndex("by_date")
      .collect();
    const ratings = allRatings.filter(
      (r) => r.readingDate >= args.startDate && r.readingDate <= args.endDate
    );

    const allJournals = await ctx.db
      .query("dailyJournals")
      .withIndex("by_date")
      .collect();
    const journals = allJournals.filter(
      (j) => j.date >= args.startDate && j.date <= args.endDate
    );

    const dayMap: Record<
      string,
      {
        date: string;
        hasJournal: boolean;
        readings: { bookId: string; rating: number }[];
      }
    > = {};

    for (const r of ratings) {
      if (!dayMap[r.readingDate]) {
        dayMap[r.readingDate] = {
          date: r.readingDate,
          hasJournal: false,
          readings: [],
        };
      }
      dayMap[r.readingDate].readings.push({
        bookId: r.bookId,
        rating: r.rating,
      });
    }

    for (const j of journals) {
      if (!dayMap[j.date]) {
        dayMap[j.date] = { date: j.date, hasJournal: false, readings: [] };
      }
      dayMap[j.date].hasJournal = true;
    }

    return Object.values(dayMap).sort((a, b) => a.date.localeCompare(b.date));
  },
});
