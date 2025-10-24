"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  RestaurantDetailSchema,
  type RestaurantDetail,
} from "@/features/restaurant/lib/dto";
import {
  apiClient,
  extractApiErrorMessage,
} from "@/lib/remote/api-client";

const restaurantDetailQueryKey = (restaurantId: string) =>
  ["restaurants", restaurantId] as const;

const fetchRestaurantDetail = async (
  restaurantId: string,
): Promise<RestaurantDetail> => {
  try {
    const { data } = await apiClient.get(
      `/api/restaurants/${restaurantId}`,
    );

    return RestaurantDetailSchema.parse(data);
  } catch (error) {
    const message = extractApiErrorMessage(
      error,
      "음식점 정보를 불러오는 중 문제가 발생했습니다.",
    );

    throw new Error(message);
  }
};

type UseRestaurantDetailOptions = {
  enabled?: boolean;
};

export const useRestaurantDetail = (
  restaurantId: string,
  options: UseRestaurantDetailOptions = {},
) =>
  useQuery({
    queryKey: restaurantDetailQueryKey(restaurantId),
    queryFn: () => fetchRestaurantDetail(restaurantId),
    enabled: options.enabled ?? (restaurantId.length > 0),
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: 1,
  });

export const usePrefetchRestaurantDetail = () => {
  const queryClient = useQueryClient();

  return (restaurantId: string) =>
    queryClient.prefetchQuery({
      queryKey: restaurantDetailQueryKey(restaurantId),
      queryFn: () => fetchRestaurantDetail(restaurantId),
      staleTime: 60 * 1000,
    });
};
