import { z } from "zod";

export const RESTAURANT_SEARCH_KEYWORD_MAX_LENGTH = 100;

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

export const RestaurantIdentifierRowSchema = z.object({
  id: z.string().uuid(),
  naver_place_id: z.string().min(1),
});

export type RestaurantIdentifierRow = z.infer<
  typeof RestaurantIdentifierRowSchema
>;

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

export const RestaurantSearchRequestSchema = z.object({
  keyword: z
    .string()
    .trim()
    .min(1, "검색 키워드를 입력해 주세요.")
    .max(
      RESTAURANT_SEARCH_KEYWORD_MAX_LENGTH,
      `검색 키워드는 ${RESTAURANT_SEARCH_KEYWORD_MAX_LENGTH}자 이하여야 합니다.`,
    ),
});

export type RestaurantSearchRequest = z.infer<
  typeof RestaurantSearchRequestSchema
>;

export const RestaurantSearchNaverItemSchema = z.object({
  title: z.string(),
  category: z.string().nullable().optional(),
  roadAddress: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  mapx: z.coerce.number().nullable().optional(),
  mapy: z.coerce.number().nullable().optional(),
  link: z.string().url().nullable().optional(),
  telephone: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
});

export type RestaurantSearchNaverItem = z.infer<
  typeof RestaurantSearchNaverItemSchema
>;

export const RestaurantSearchNaverResponseSchema = z.object({
  items: z.array(RestaurantSearchNaverItemSchema),
});

export type RestaurantSearchNaverResponse = z.infer<
  typeof RestaurantSearchNaverResponseSchema
>;

export const RestaurantSearchResultSchema = z.object({
  restaurantId: z.string().uuid().nullable(),
  name: z.string(),
  address: z.string(),
  category: z.string().nullable(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  naverPlaceId: z.string().min(1).nullable(),
});

export type RestaurantSearchResult = z.infer<
  typeof RestaurantSearchResultSchema
>;

export const RestaurantSearchListSchema = z.array(
  RestaurantSearchResultSchema,
);
