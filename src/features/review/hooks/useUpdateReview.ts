"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  UpdateReviewRequestSchema,
  ReviewSchema,
  type UpdateReviewRequest,
  type Review,
} from "@/features/review/lib/dto";
import { apiClient, extractApiErrorMessage } from "@/lib/remote/api-client";
import { useToast } from "@/hooks/use-toast";

const updateReviewRequest = async (
  reviewId: string,
  payload: UpdateReviewRequest,
): Promise<Review> => {
  const validated = UpdateReviewRequestSchema.parse(payload);
  try {
    const { data } = await apiClient.patch(`/api/reviews/${reviewId}`, validated);
    return ReviewSchema.parse(data);
  } catch (error) {
    const message = extractApiErrorMessage(error, "리뷰를 수정하지 못했습니다.");
    throw new Error(message);
  }
};

export const useUpdateReview = (reviewId: string, restaurantId: string) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationKey: ["reviews", reviewId, "update"],
    mutationFn: (payload: UpdateReviewRequest) => updateReviewRequest(reviewId, payload),
    onSuccess: () => {
      toast({ title: "리뷰가 수정되었습니다." });
      queryClient.invalidateQueries({ queryKey: ["reviews", reviewId] });
      queryClient.invalidateQueries({
        queryKey: ["restaurants", restaurantId, "reviews"],
      });
      queryClient.invalidateQueries({ queryKey: ["restaurants", restaurantId] });
    },
  });
};


