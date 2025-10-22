import type { SupabaseClient } from "@supabase/supabase-js";
import {
  failure,
  success,
  type HandlerResult,
} from "@/backend/http/response";
import {
  RestaurantBaseRowSchema,
  RestaurantMarkerAggregateRowSchema,
  RestaurantMarkerListSchema,
  type RestaurantMarker,
} from "@/features/restaurant/backend/schema";
import {
  restaurantErrorCodes,
  type RestaurantServiceError,
} from "@/features/restaurant/backend/error";

const RESTAURANT_TABLE = "restaurants";
const RESTAURANT_AGGREGATE_VIEW = "restaurant_review_aggregates";

export const getRestaurantMarkers = async (
  client: SupabaseClient,
): Promise<
  HandlerResult<
    RestaurantMarker[],
    RestaurantServiceError,
    unknown
  >
> => {
  const { data: aggregateRows, error: aggregateError } = await client
    .from(RESTAURANT_AGGREGATE_VIEW)
    .select(
      "restaurant_id, review_count, average_rating",
    )
    .gt("review_count", 0);

  if (aggregateError) {
    return failure(
      500,
      restaurantErrorCodes.markersFetchFailed,
      aggregateError.message,
    );
  }

  const parsedAggregates = RestaurantMarkerAggregateRowSchema.array().safeParse(
    aggregateRows ?? [],
  );

  if (!parsedAggregates.success) {
    return failure(
      500,
      restaurantErrorCodes.markersValidationFailed,
      "Failed to validate restaurant aggregate rows.",
      parsedAggregates.error.format(),
    );
  }

  if (parsedAggregates.data.length === 0) {
    return success([]);
  }

  const restaurantIds = parsedAggregates.data.map(
    (aggregate) => aggregate.restaurant_id,
  );

  const { data: restaurantRows, error: restaurantError } = await client
    .from(RESTAURANT_TABLE)
    .select("id, name, category, latitude, longitude")
    .in("id", restaurantIds);

  if (restaurantError) {
    return failure(
      500,
      restaurantErrorCodes.markersFetchFailed,
      restaurantError.message,
    );
  }

  const parsedRestaurants = RestaurantBaseRowSchema.array().safeParse(
    restaurantRows ?? [],
  );

  if (!parsedRestaurants.success) {
    return failure(
      500,
      restaurantErrorCodes.markersValidationFailed,
      "Failed to validate restaurant rows.",
      parsedRestaurants.error.format(),
    );
  }

  const restaurantsMap = new Map(
    parsedRestaurants.data.map((restaurant) => [restaurant.id, restaurant]),
  );

  const transformed = parsedAggregates.data
    .map((aggregate) => {
      const restaurant = restaurantsMap.get(aggregate.restaurant_id);

      if (!restaurant) {
        return null;
      }

      const marker: RestaurantMarker = {
        id: restaurant.id,
        name: restaurant.name,
        category: restaurant.category,
        latitude: restaurant.latitude,
        longitude: restaurant.longitude,
        reviewCount: Math.trunc(aggregate.review_count),
        averageRating:
          aggregate.average_rating === null
            ? null
            : Number.parseFloat(
                aggregate.average_rating.toFixed(1),
              ),
      };

      return marker;
    })
    .filter((marker): marker is RestaurantMarker => marker !== null);

  const validation = RestaurantMarkerListSchema.safeParse(transformed);

  if (!validation.success) {
    return failure(
      500,
      restaurantErrorCodes.markersValidationFailed,
      "Failed to validate restaurant marker payload.",
      validation.error.format(),
    );
  }

  return success(validation.data);
};
