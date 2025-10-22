"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient, extractApiErrorMessage } from "@/lib/remote/api-client";
import {
  RestaurantMarkerListSchema,
  type RestaurantMarker,
} from "@/features/restaurant/lib/dto";

const MARKER_QUERY_KEY = ["restaurants", "markers"] as const;

const fetchRestaurantMarkers = async (): Promise<RestaurantMarker[]> => {
  try {
    const { data } = await apiClient.get("/api/restaurants/markers");
    return RestaurantMarkerListSchema.parse(data);
  } catch (error) {
    const message = extractApiErrorMessage(
      error,
      "리뷰가 있는 음식점 정보를 불러오지 못했습니다.",
    );

    throw new Error(message);
  }
};

export const useRestaurantMarkers = () =>
  useQuery({
    queryKey: MARKER_QUERY_KEY,
    queryFn: fetchRestaurantMarkers,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 3,
  });
