import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  habits: defineTable({
    name: v.string(),
    createdAt: v.number(), // Unix timestamp ms
    sortOrder: v.number(),
  }).index("by_sort_order", ["sortOrder"]),

  habitCompletions: defineTable({
    habitId: v.id("habits"),
    completedDate: v.string(), // "YYYY-MM-DD"
    createdAt: v.number(),
  })
    .index("by_habit", ["habitId"])
    .index("by_date", ["completedDate"])
    .index("by_habit_date", ["habitId", "completedDate"]),

  readingRatings: defineTable({
    bookId: v.string(),
    readingDate: v.string(), // "YYYY-MM-DD"
    rating: v.number(), // 1-5
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_book", ["bookId"])
    .index("by_book_date", ["bookId", "readingDate"])
    .index("by_date", ["readingDate"]),

  maximRatings: defineTable({
    maximNumber: v.number(),
    rating: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_maxim_number", ["maximNumber"])
    .index("by_updated", ["updatedAt"]),

  dailyJournals: defineTable({
    date: v.string(), // "YYYY-MM-DD"
    content: v.string(),
    updatedAt: v.number(),
  }).index("by_date", ["date"]),
});
