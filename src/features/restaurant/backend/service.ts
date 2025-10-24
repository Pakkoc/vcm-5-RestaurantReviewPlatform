import type { SupabaseClient } from "@supabase/supabase-js";
import type { AppConfig } from "@/backend/hono/context";
import {
  failure,
  success,
  type HandlerResult,
} from "@/backend/http/response";
import {
  RestaurantBaseRowSchema,
  RestaurantMarkerAggregateRowSchema,
  RestaurantMarkerListSchema,
  RestaurantSearchListSchema,
  RestaurantIdentifierRowSchema,
  type RestaurantMarker,
  type RestaurantSearchNaverItem,
  type RestaurantSearchResult,
} from "@/features/restaurant/backend/schema";
import {
  restaurantErrorCodes,
  type RestaurantServiceError,
} from "@/features/restaurant/backend/error";
import {
  createNaverSearchClient,
  NaverSearchClientError,
  type NaverSearchClient,
} from "@/features/restaurant/backend/naver/search-client";
import {
  normalizeWhitespace,
  sanitizeSearchKeyword,
  toPlainText,
} from "@/lib/string-utils";

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

const NAVER_COORDINATE_SCALE = 100_000;

const convertCoordinate = (value: number | null | undefined): number | null => {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return null;
  }

  const absolute = Math.abs(value);
  if (absolute === 0) {
    return 0;
  }

  if (absolute > 1000) {
    return Number.parseFloat((value / NAVER_COORDINATE_SCALE).toFixed(6));
  }

  return Number.parseFloat(value.toFixed(6));
};

const extractNaverPlaceId = (link: string | null | undefined): string | null => {
  if (!link) {
    return null;
  }

  try {
    const url = new URL(link);
    const segments = url.pathname.split("/").filter(Boolean);

    const placeIndex = segments.findIndex((segment) =>
      ["place", "entry"].includes(segment.toLowerCase()),
    );

    const candidateSegment =
      placeIndex !== -1 ? segments[placeIndex + 1] : segments.at(-1);

    const candidate = candidateSegment?.match(/\d+/)?.[0];

    if (candidate) {
      return candidate.slice(0, 255);
    }

    const queryId = url.searchParams.get("id");
    if (queryId) {
      return queryId.slice(0, 255);
    }

    return link.slice(0, 255);
  } catch {
    return link.slice(0, 255);
  }
};

const mapNaverItemToResult = (
  item: RestaurantSearchNaverItem,
): Omit<RestaurantSearchResult, "restaurantId"> & {
  naverPlaceId: string | null;
} => {
  const name = toPlainText(item.title) ?? normalizeWhitespace(item.title);
  const category = toPlainText(item.category);
  const addressCandidate =
    toPlainText(item.roadAddress) ?? toPlainText(item.address);
  const address = addressCandidate ?? normalizeWhitespace(item.address ?? "");

  const latitude = convertCoordinate(item.mapy ?? null);
  const longitude = convertCoordinate(item.mapx ?? null);

  return {
    name,
    address,
    category,
    latitude,
    longitude,
    naverPlaceId: extractNaverPlaceId(item.link ?? null),
  };
};

type SearchRestaurantsDependencies = {
  naverClient?: NaverSearchClient;
};

export const searchRestaurants = async (
  client: SupabaseClient,
  keyword: string,
  config: AppConfig["naver"]["search"],
  dependencies: SearchRestaurantsDependencies = {},
): Promise<
  HandlerResult<
    RestaurantSearchResult[],
    RestaurantServiceError,
    unknown
  >
> => {
  const sanitizedKeyword = sanitizeSearchKeyword(keyword);

  if (!sanitizedKeyword) {
    return failure(
      400,
      restaurantErrorCodes.searchRequestInvalid,
      "검색 키워드를 입력해 주세요.",
    );
  }

  const naverClient =
    dependencies.naverClient ??
    createNaverSearchClient({
      baseUrl: config.baseUrl,
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      timeoutMs: config.timeoutMs,
      maxResults: config.maxResults,
    });

  let items: RestaurantSearchNaverItem[] = [];

  try {
    items = await naverClient.search(sanitizedKeyword);
  } catch (error) {
    if (error instanceof NaverSearchClientError) {
      const statusCode =
        error.code === restaurantErrorCodes.searchTimeout ? 504 : 502;

      return failure(statusCode, error.code, error.message);
    }

    return failure(
      502,
      restaurantErrorCodes.searchUpstreamFailed,
      "네이버 검색 요청 처리 중 알 수 없는 오류가 발생했습니다.",
    );
  }

  if (items.length === 0) {
    return success([]);
  }

  const formattedItems = items.map(mapNaverItemToResult);

  const placeIds = formattedItems
    .map((item) => item.naverPlaceId)
    .filter(
      (value): value is string =>
        typeof value === "string" && value.length > 0,
    );

  let restaurantIdMap = new Map<string, string>();

  if (placeIds.length > 0) {
    const { data: rows, error } = await client
      .from(RESTAURANT_TABLE)
      .select("id, naver_place_id")
      .in("naver_place_id", placeIds);

    if (error) {
      return failure(
        500,
        restaurantErrorCodes.searchDbLookupFailed,
        error.message,
      );
    }

    const parsedRows = RestaurantIdentifierRowSchema.array().safeParse(
      rows ?? [],
    );

    if (!parsedRows.success) {
      return failure(
        500,
        restaurantErrorCodes.searchValidationFailed,
        "검색 결과의 식별자 정보를 검증하지 못했습니다.",
        parsedRows.error.format(),
      );
    }

    restaurantIdMap = new Map(
      parsedRows.data.map((row) => [row.naver_place_id, row.id]),
    );
  }

  const payload = formattedItems.map((item) => ({
    restaurantId: item.naverPlaceId
      ? restaurantIdMap.get(item.naverPlaceId) ?? null
      : null,
    name: item.name,
    address: item.address,
    category: item.category,
    latitude: item.latitude,
    longitude: item.longitude,
    naverPlaceId: item.naverPlaceId,
  }));

  const validation = RestaurantSearchListSchema.safeParse(payload);

  if (!validation.success) {
    return failure(
      500,
      restaurantErrorCodes.searchValidationFailed,
      "검색 결과 페이로드를 검증하지 못했습니다.",
      validation.error.format(),
    );
  }

  return success(validation.data);
};
