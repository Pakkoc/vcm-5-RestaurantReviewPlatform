import type { Hono } from "hono";
import { respond, type ErrorResult } from "@/backend/http/response";
import {
  getLogger,
  getSupabase,
  type AppEnv,
} from "@/backend/hono/context";
import { getRestaurantMarkers } from "@/features/restaurant/backend/service";
import {
  restaurantErrorCodes,
  type RestaurantServiceError,
} from "@/features/restaurant/backend/error";

export const registerRestaurantRoutes = (app: Hono<AppEnv>) => {
  app.get("/api/restaurants/markers", async (c) => {
    const supabase = getSupabase(c);
    const logger = getLogger(c);

    const result = await getRestaurantMarkers(supabase);

    if (!result.ok) {
      const errorResult = result as ErrorResult<
        RestaurantServiceError,
        unknown
      >;
      const { code, message } = errorResult.error;

      if (
        code === restaurantErrorCodes.markersFetchFailed ||
        code === restaurantErrorCodes.markersValidationFailed
      ) {
        logger.error(
          "Failed to load restaurant markers",
          message,
        );
      }
    }

    return respond(c, result);
  });
};
