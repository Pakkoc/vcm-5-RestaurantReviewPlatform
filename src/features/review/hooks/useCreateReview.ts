"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CreateReviewRequestSchema,
  CreateReviewResponseSchema,
  type CreateReviewRequest,
  type CreateReviewResponse,
} from "@/features/review/lib/dto";
import {
  apiClient,
  extractApiErrorMessage,
} from "@/lib/remote/api-client";
import { useToast } from "@/hooks/use-toast";

type UseCreateReviewOptions = {
  onSuccess?: (response: CreateReviewResponse) => void;
};

const MUTATION_KEY_PREFIX = ["reviews", "create"] as const;

const createReviewRequest = async (
  restaurantId: string,
  payload: CreateReviewRequest,
) => {
  const validatedPayload = CreateReviewRequestSchema.parse(payload);

  try {
    const { data } = await apiClient.post(
      `/api/restaurants/${restaurantId}/reviews`,
      validatedPayload,
    );

    return CreateReviewResponseSchema.parse(data);
  } catch (error) {
    const message = extractApiErrorMessage(
      error,
      "리뷰를 등록하지 못했습니다.",
    );

    throw new Error(message);
  }
};

export const useCreateReview = (
  restaurantId: string,
  options: UseCreateReviewOptions = {},
) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationKey: [...MUTATION_KEY_PREFIX, restaurantId],
    mutationFn: (payload: CreateReviewRequest) =>
      createReviewRequest(restaurantId, payload),
    onSuccess: (response) => {
      toast({
        title: "리뷰가 등록되었습니다.",
        description: "소중한 의견 감사합니다!",
      });

      queryClient.invalidateQueries({
        queryKey: ["restaurants", restaurantId],
      });
      queryClient.invalidateQueries({
        queryKey: ["restaurants", "markers"],
      });
      queryClient.invalidateQueries({
        queryKey: ["restaurants", restaurantId, "reviews"],
      });

      options.onSuccess?.(response);
    },
    onError: (error) => {
      const description =
        error instanceof Error
          ? error.message
          : "리뷰를 등록하는 중 문제가 발생했습니다.";

      toast({
        variant: "destructive",
        title: "리뷰 등록 실패",
        description,
      });
    },
  });
};
