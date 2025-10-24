"use client";

import { useMutation } from "@tanstack/react-query";
import {
  CreateRestaurantRequestSchema,
  CreateRestaurantResponseSchema,
  type CreateRestaurantRequest,
  type CreateRestaurantResponse,
} from "@/features/restaurant/lib/dto";
import {
  apiClient,
  extractApiErrorMessage,
} from "@/lib/remote/api-client";

type CreateRestaurantVariables = CreateRestaurantRequest;

const CREATE_RESTAURANT_MUTATION_KEY = [
  "restaurants",
  "create",
] as const;

const postRestaurant = async (
  variables: CreateRestaurantVariables,
): Promise<CreateRestaurantResponse> => {
  const parsedVariables = CreateRestaurantRequestSchema.parse(variables);

  try {
    const response = await apiClient.post(
      "/api/restaurants",
      parsedVariables,
    );

    return CreateRestaurantResponseSchema.parse(response.data);
  } catch (error) {
    const message = extractApiErrorMessage(
      error,
      "음식점 정보를 저장하지 못했습니다.",
    );

    throw new Error(message);
  }
};

export const useCreateRestaurant = () =>
  useMutation({
    mutationKey: CREATE_RESTAURANT_MUTATION_KEY,
    mutationFn: postRestaurant,
  });
