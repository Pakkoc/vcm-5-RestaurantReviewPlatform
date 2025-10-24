"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient, extractApiErrorMessage } from "@/lib/remote/api-client";
import { ReviewSchema, type Review } from "@/features/review/lib/dto";

export const useReview = (reviewId: string, options: { enabled?: boolean } = {}) =>
  useQuery({
    queryKey: ["reviews", reviewId],
    enabled: options.enabled ?? Boolean(reviewId),
    queryFn: async (): Promise<Review> => {
      try {
        const { data } = await apiClient.get(`/api/reviews/${reviewId}`);
        return ReviewSchema.parse(data);
      } catch (error) {
        const message = extractApiErrorMessage(error, "리뷰 정보를 불러오지 못했습니다.");
        throw new Error(message);
      }
    },
    staleTime: 60 * 1000,
  });


