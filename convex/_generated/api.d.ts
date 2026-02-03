/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as dailyJournals from "../dailyJournals.js";
import type * as habitCompletions from "../habitCompletions.js";
import type * as habits from "../habits.js";
import type * as history from "../history.js";
import type * as maximRatings from "../maximRatings.js";
import type * as migration from "../migration.js";
import type * as readingRatings from "../readingRatings.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  dailyJournals: typeof dailyJournals;
  habitCompletions: typeof habitCompletions;
  habits: typeof habits;
  history: typeof history;
  maximRatings: typeof maximRatings;
  migration: typeof migration;
  readingRatings: typeof readingRatings;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
