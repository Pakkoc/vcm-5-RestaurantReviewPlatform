export const restaurantErrorCodes = {
  markersFetchFailed: "RESTAURANT_MARKERS_FETCH_FAILED",
  markersValidationFailed: "RESTAURANT_MARKERS_VALIDATION_FAILED",
  searchRequestInvalid: "RESTAURANT_SEARCH_REQUEST_INVALID",
  searchUpstreamFailed: "RESTAURANT_SEARCH_UPSTREAM_FAILED",
  searchTimeout: "RESTAURANT_SEARCH_TIMEOUT",
  searchValidationFailed: "RESTAURANT_SEARCH_VALIDATION_FAILED",
  searchDbLookupFailed: "RESTAURANT_SEARCH_DB_LOOKUP_FAILED",
} as const;

export type RestaurantServiceError =
  (typeof restaurantErrorCodes)[keyof typeof restaurantErrorCodes];
