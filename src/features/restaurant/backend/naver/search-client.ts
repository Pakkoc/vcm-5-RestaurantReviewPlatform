import { restaurantErrorCodes } from "@/features/restaurant/backend/error";
import {
  RestaurantSearchNaverResponseSchema,
  type RestaurantSearchNaverItem,
} from "@/features/restaurant/backend/schema";

type FetchImplementation = typeof fetch;

export type NaverSearchClientConfig = {
  baseUrl: string;
  clientId: string;
  clientSecret: string;
  timeoutMs: number;
  maxResults: number;
  fetchImpl?: FetchImplementation;
};

export class NaverSearchClientError extends Error {
  constructor(
    message: string,
    public readonly code:
      | typeof restaurantErrorCodes.searchTimeout
      | typeof restaurantErrorCodes.searchUpstreamFailed,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "NaverSearchClientError";
  }
}

export type NaverSearchClient = {
  search: (
    keyword: string,
    options?: { signal?: AbortSignal },
  ) => Promise<RestaurantSearchNaverItem[]>;
};

const attachAbort = (
  controller: AbortController,
  externalSignal?: AbortSignal,
) => {
  if (!externalSignal) {
    return;
  }

  if (externalSignal.aborted) {
    controller.abort(externalSignal.reason);
    return;
  }

  const abort = () => {
    controller.abort(externalSignal.reason);
  };

  externalSignal.addEventListener("abort", abort, { once: true });
};

export const createNaverSearchClient = (
  config: NaverSearchClientConfig,
): NaverSearchClient => {
  const fetchImpl: FetchImplementation = config.fetchImpl ?? fetch;

  const search: NaverSearchClient["search"] = async (
    keyword,
    options,
  ) => {
    const controller = new AbortController();
    attachAbort(controller, options?.signal);

    const timeoutId = setTimeout(() => {
      controller.abort(
        new DOMException("Naver search request timed out", "AbortError"),
      );
    }, config.timeoutMs);

    try {
      const endpoint = new URL(config.baseUrl);
      endpoint.searchParams.set("query", keyword);
      endpoint.searchParams.set("display", String(config.maxResults));
      endpoint.searchParams.set("sort", "sim");

      const response = await fetchImpl(endpoint.toString(), {
        method: "GET",
        headers: {
          Accept: "application/json",
          "X-Naver-Client-Id": config.clientId,
          "X-Naver-Client-Secret": config.clientSecret,
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        let responseText: string | null = null;
        try {
          responseText = await response.text();
        } catch {
          responseText = null;
        }

        // Minimal diagnostics without leaking credentials
        console.error(
          "[NaverSearch] upstream not ok",
          response.status,
          response.statusText,
          responseText ? responseText.slice(0, 200) : null,
        );

        throw new NaverSearchClientError(
          `Failed to fetch Naver search results: ${response.status} ${response.statusText}`,
          restaurantErrorCodes.searchUpstreamFailed,
        );
      }

      const payload = await response.json();
      const parsed = RestaurantSearchNaverResponseSchema.parse(payload);
      return parsed.items;
    } catch (error) {
      if (error instanceof NaverSearchClientError) {
        throw error;
      }

      if (
        (error instanceof DOMException && error.name === "AbortError") ||
        (error instanceof Error && error.name === "AbortError")
      ) {
        throw new NaverSearchClientError(
          "네이버 검색 요청이 제한 시간을 초과했습니다.",
          restaurantErrorCodes.searchTimeout,
          error,
        );
      }

      throw new NaverSearchClientError(
        "네이버 검색 요청 중 문제가 발생했습니다.",
        restaurantErrorCodes.searchUpstreamFailed,
        error,
      );
    } finally {
      clearTimeout(timeoutId);
    }
  };

  return {
    search,
  };
};
