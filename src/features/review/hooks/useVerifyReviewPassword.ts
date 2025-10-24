"use client";

import { useMutation } from "@tanstack/react-query";
import {
  VerifyReviewPasswordRequestSchema,
  VerifyReviewPasswordResponseSchema,
  type VerifyReviewPasswordRequest,
  type VerifyReviewPasswordResponse,
} from "@/features/review/lib/dto";
import {
  apiClient,
  extractApiErrorMessage,
  isAxiosError,
} from "@/lib/remote/api-client";

const MUTATION_KEY_PREFIX = ["reviews", "verify"] as const;

const verifyReviewPasswordRequest = async (
  reviewId: string,
  payload: VerifyReviewPasswordRequest,
): Promise<VerifyReviewPasswordResponse> => {
  const validatedPayload = VerifyReviewPasswordRequestSchema.parse(
    payload,
  );

  try {
    const { data } = await apiClient.post(
      `/api/reviews/${reviewId}/verify-password`,
      validatedPayload,
    );

    return VerifyReviewPasswordResponseSchema.parse(data);
  } catch (error) {
    const message = extractApiErrorMessage(
      error,
      "비밀번호를 확인하지 못했습니다.",
    );

    if (isAxiosError(error)) {
      const attemptsLeft =
        (error.response?.data as { error?: { details?: { attemptsLeft?: number } } })?.error?.details
          ?.attemptsLeft;

      if (typeof attemptsLeft === "number") {
        const enrichedError = new Error(message) as Error & {
          attemptsLeft: number;
        };
        enrichedError.attemptsLeft = attemptsLeft;
        throw enrichedError;
      }
    }

    throw new Error(message);
  }
};

export const useVerifyReviewPassword = (reviewId: string) =>
  useMutation({
    mutationKey: [...MUTATION_KEY_PREFIX, reviewId],
    mutationFn: (payload: VerifyReviewPasswordRequest) =>
      verifyReviewPasswordRequest(reviewId, payload),
  });
