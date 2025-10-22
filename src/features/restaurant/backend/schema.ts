import { z } from "zod";

export const RestaurantMarkerAggregateRowSchema = z.object({
  restaurant_id: z.string().uuid(),
  review_count: z.coerce
    .number()
    .nonnegative()
    .refine(Number.isFinite, "review_count must be a finite number"),
  average_rating: z
    .union([z.coerce.number(), z.null()])
    .refine(
      (value) => value === null || (value >= 0 && value <= 5),
      "average_rating must be between 0 and 5 when provided",
    ),
});

export type RestaurantMarkerAggregateRow = z.infer<
  typeof RestaurantMarkerAggregateRowSchema
>;

export const RestaurantBaseRowSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  category: z.string().nullable(),
  latitude: z.coerce
    .number()
    .refine(Number.isFinite, "latitude must be a finite number"),
  longitude: z.coerce
    .number()
    .refine(Number.isFinite, "longitude must be a finite number"),
});

export type RestaurantBaseRow = z.infer<typeof RestaurantBaseRowSchema>;

export const RestaurantMarkerSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  category: z.string().nullable(),
  latitude: z.number(),
  longitude: z.number(),
  reviewCount: z.number().int().nonnegative(),
  averageRating: z.number().min(0).max(5).nullable(),
});

export type RestaurantMarker = z.infer<typeof RestaurantMarkerSchema>;

export const RestaurantMarkerListSchema = z.array(RestaurantMarkerSchema);
