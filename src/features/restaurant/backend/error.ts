export const restaurantErrorCodes = {
  markersFetchFailed: "RESTAURANT_MARKERS_FETCH_FAILED",
  markersValidationFailed: "RESTAURANT_MARKERS_VALIDATION_FAILED",
} as const;

export type RestaurantServiceError =
  (typeof restaurantErrorCodes)[keyof typeof restaurantErrorCodes];
