"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import {
  ReviewListSchema,
  type Review,
} from "@/features/review/lib/dto";
import {
  apiClient,
  extractApiErrorMessage,
} from "@/lib/remote/api-client";

const reviewsQueryKey = (restaurantId: string) =>
  ["restaurants", restaurantId, "reviews"] as const;

const fetchReviews = async (
  restaurantId: string,
  page: number,
  limit: number,
): Promise<Review[]> => {
  try {
    const { data } = await apiClient.get(
      `/api/restaurants/${restaurantId}/reviews`,
      {
        params: {
          page,
          limit,
        },
      },
    );

    return ReviewListSchema.parse(data);
  } catch (error) {
    const message = extractApiErrorMessage(
      error,
      "리뷰 목록을 불러오지 못했습니다.",
    );

    throw new Error(message);
  }
};

type UseInfiniteReviewsOptions = {
  pageSize?: number;
};

export const useInfiniteReviews = (
  restaurantId: string,
  options: UseInfiniteReviewsOptions = {},
) => {
  const pageSize = options.pageSize ?? 10;

  return useInfiniteQuery({
    queryKey: reviewsQueryKey(restaurantId),
    queryFn: ({ pageParam = 1 }) =>
      fetchReviews(restaurantId, pageParam, pageSize),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < pageSize) {
        return undefined;
      }

      return allPages.length + 1;
    },
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
};
