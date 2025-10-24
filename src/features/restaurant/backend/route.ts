import { z } from "zod";
import type { Hono } from "hono";
import { respond, failure, type ErrorResult } from "@/backend/http/response";
import {
  getConfig,
  getLogger,
  getSupabase,
  type AppEnv,
} from "@/backend/hono/context";
import {
  createRestaurant,
  getRestaurantMarkers,
  getRestaurantDetail,
  searchRestaurants,
} from "@/features/restaurant/backend/service";
import {
  restaurantErrorCodes,
  type RestaurantServiceError,
} from "@/features/restaurant/backend/error";
import {
  CreateRestaurantRequestSchema,
  RestaurantSearchRequestSchema,
} from "@/features/restaurant/backend/schema";

export const registerRestaurantRoutes = (app: Hono<AppEnv>) => {
  app.post("/api/restaurants", async (c) => {
    const logger = getLogger(c);
    const supabase = getSupabase(c);

    let payload: unknown;

    try {
      payload = await c.req.json();
    } catch (error) {
      logger.warn("Failed to parse create restaurant payload", error);
      return respond(
        c,
        failure(
          400,
          restaurantErrorCodes.createRequestInvalid,
          "요청 본문을 읽는 중 문제가 발생했습니다.",
        ),
      );
    }

    const parsed = CreateRestaurantRequestSchema.safeParse(payload);

    if (!parsed.success) {
      return respond(
        c,
        failure(
          400,
          restaurantErrorCodes.createRequestInvalid,
          "음식점 정보가 올바르지 않습니다.",
          parsed.error.format(),
        ),
      );
    }

    const result = await createRestaurant(supabase, parsed.data);

    if (!result.ok) {
      const errorResult = result as ErrorResult<
        RestaurantServiceError,
        unknown
      >;

      logger.error(
        "Failed to create or fetch restaurant",
        errorResult.error.message,
        errorResult.error.details ?? null,
      );
    }

    return respond(c, result);
  });

  app.get("/api/restaurants/:restaurantId", async (c) => {
    const logger = getLogger(c);
    const supabase = getSupabase(c);
    const restaurantId = c.req.param("restaurantId");

    const parsedId = z.string().uuid().safeParse(restaurantId);

    if (!parsedId.success) {
      return respond(
        c,
        failure(
          400,
          restaurantErrorCodes.detailRequestInvalid,
          "유효한 음식점 ID가 필요합니다.",
        ),
      );
    }

    const result = await getRestaurantDetail(supabase, parsedId.data);

    if (!result.ok) {
      const errorResult = result as ErrorResult<
        RestaurantServiceError,
        unknown
      >;
      const { code, message } = errorResult.error;

      if (
        code === restaurantErrorCodes.detailFetchFailed ||
        code === restaurantErrorCodes.detailValidationFailed
      ) {
        logger.error("Failed to load restaurant detail", message);
      } else if (code === restaurantErrorCodes.detailNotFound) {
        logger.warn("Restaurant not found", { restaurantId: parsedId.data });
      }
    }

    return respond(c, result);
  });

  app.post("/api/restaurants/search", async (c) => {
    const logger = getLogger(c);
    const supabase = getSupabase(c);
    const config = getConfig(c);

    let payload: unknown;

    try {
      payload = await c.req.json();
    } catch (error) {
      logger.warn("Failed to parse search request body", error);
      return respond(
        c,
        failure(
          400,
          restaurantErrorCodes.searchRequestInvalid,
          "요청 본문을 읽는 중 문제가 발생했습니다.",
        ),
      );
    }

    const parsed = RestaurantSearchRequestSchema.safeParse(payload);

    if (!parsed.success) {
      return respond(
        c,
        failure(
          400,
          restaurantErrorCodes.searchRequestInvalid,
          "검색 키워드가 올바르지 않습니다.",
          parsed.error.format(),
        ),
      );
    }

    const result = await searchRestaurants(
      supabase,
      parsed.data.keyword,
      config.naver.search,
    );

    if (!result.ok) {
      const errorResult = result as ErrorResult<
        RestaurantServiceError,
        unknown
      >;

      if (
        errorResult.error.code === restaurantErrorCodes.searchTimeout ||
        errorResult.error.code === restaurantErrorCodes.searchUpstreamFailed
      ) {
        logger.error(
          "Naver search upstream call failed",
          errorResult.error.message,
        );
      } else if (
        errorResult.error.code !==
        restaurantErrorCodes.searchRequestInvalid
      ) {
        logger.error(
          "Search request failed",
          errorResult.error.message,
          errorResult.error.details ?? null,
        );
      }
    }

    return respond(c, result);
  });

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
