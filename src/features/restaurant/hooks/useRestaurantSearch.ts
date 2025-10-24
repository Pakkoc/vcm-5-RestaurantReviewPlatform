"use client";

import { useCallback, useMemo, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  RestaurantSearchListSchema,
  RestaurantSearchRequestSchema,
  type RestaurantSearchResult,
} from "@/features/restaurant/lib/dto";
import {
  apiClient,
  extractApiErrorMessage,
} from "@/lib/remote/api-client";
import { sanitizeSearchKeyword } from "@/lib/string-utils";

const SEARCH_MUTATION_KEY = ["restaurants", "search"] as const;
const DUPLICATE_THRESHOLD_MS = 1000;

type UseRestaurantSearchResult = {
  search: (keyword: string) => Promise<RestaurantSearchResult[]>;
  reset: () => void;
  isLoading: boolean;
  data: RestaurantSearchResult[] | undefined;
  error: string | null;
  isError: boolean;
};

export const useRestaurantSearch = (): UseRestaurantSearchResult => {
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastKeywordRef = useRef<string>("");
  const lastSearchedAtRef = useRef<number>(0);
  const lastResultRef = useRef<RestaurantSearchResult[] | null>(null);

  const mutation = useMutation({
    mutationKey: SEARCH_MUTATION_KEY,
    mutationFn: async (rawKeyword: string) => {
      const sanitizedKeyword = sanitizeSearchKeyword(rawKeyword);

      const parsedRequest = RestaurantSearchRequestSchema.safeParse({
        keyword: sanitizedKeyword,
      });

      if (!parsedRequest.success) {
        throw new Error("검색 키워드를 올바르게 입력해 주세요.");
      }

      const now = Date.now();

      if (
        sanitizedKeyword === lastKeywordRef.current &&
        now - lastSearchedAtRef.current < DUPLICATE_THRESHOLD_MS &&
        lastResultRef.current
      ) {
        return lastResultRef.current;
      }

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const response = await apiClient.post(
          "/api/restaurants/search",
          { keyword: parsedRequest.data.keyword },
          { signal: controller.signal },
        );

        const parsed = RestaurantSearchListSchema.parse(response.data);

        lastKeywordRef.current = sanitizedKeyword;
        lastSearchedAtRef.current = now;
        lastResultRef.current = parsed;

        return parsed;
      } catch (error) {
        const message = extractApiErrorMessage(
          error,
          "검색 결과를 불러오는 중 문제가 발생했습니다.",
        );

        throw new Error(message);
      } finally {
        abortControllerRef.current = null;
      }
    },
  });

  const reset = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    mutation.reset();
  }, [mutation]);

  const error = useMemo(() => {
    if (!mutation.isError) {
      return null;
    }

    if (mutation.error instanceof Error) {
      return mutation.error.message;
    }

    return "검색 결과를 불러오는 중 문제가 발생했습니다.";
  }, [mutation.error, mutation.isError]);

  const search = useCallback(
    async (keyword: string) => {
      return mutation.mutateAsync(keyword);
    },
    [mutation],
  );

  return {
    search,
    reset,
    isLoading: mutation.isPending,
    data: mutation.data,
    error,
    isError: mutation.isError,
  };
};
