"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { NaverMap } from "@/features/restaurant/components/naver-map";
import {
  MarkerTooltip,
} from "@/features/restaurant/components/marker-tooltip";
import {
  RestaurantSearchModal,
} from "@/features/restaurant/components/restaurant-search-modal";
import {
  RESTAURANT_SEARCH_KEYWORD_MAX_LENGTH,
  type RestaurantMarker,
  type RestaurantSearchResult,
} from "@/features/restaurant/lib/dto";
import { useRestaurantSearch } from "@/features/restaurant/hooks/useRestaurantSearch";
import { useRestaurantDetail } from "@/features/restaurant/hooks/useRestaurantDetail";
import { useToast } from "@/hooks/use-toast";
import { sanitizeSearchKeyword } from "@/lib/string-utils";

type HomePageProps = {
  params: Promise<Record<string, never>>;
};

const SEARCH_PARAM_KEY = "keyword";
const SEARCH_PLACEHOLDER = "음식점 이름 또는 키워드를 입력하세요.";

export default function HomePage({ params }: HomePageProps) {
  void params;
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialKeyword = searchParams.get(SEARCH_PARAM_KEY) ?? "";

  const [keyword, setKeyword] = useState(initialKeyword);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalState, setModalState] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [modalResults, setModalResults] = useState<RestaurantSearchResult[]>(
    [],
  );
  const [modalError, setModalError] = useState<string | null>(null);
  const [activeKeyword, setActiveKeyword] = useState(initialKeyword);
  const [hoveredMarkerId, setHoveredMarkerId] = useState<string | null>(null);
  const [hoveredMarkerFallback, setHoveredMarkerFallback] =
    useState<RestaurantMarker | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);

  const { toast } = useToast();
  const {
    search: executeSearch,
    reset: resetSearch,
    isLoading: isSearchLoading,
  } = useRestaurantSearch();

  const lastRequestedKeywordRef = useRef<string>("");
  const initialSearchHandledRef = useRef(false);

  const updateSearchQuery = useCallback(
    (value: string | null) => {
      const nextSearchParams = new URLSearchParams(searchParams.toString());

      if (value && value.length > 0) {
        nextSearchParams.set(SEARCH_PARAM_KEY, value);
      } else {
        nextSearchParams.delete(SEARCH_PARAM_KEY);
      }

      const queryString = nextSearchParams.toString();
      router.push(queryString ? `/?${queryString}` : "/");
    },
    [router, searchParams],
  );

  const executeSearchFlow = useCallback(
    async (
      rawKeyword: string,
      options: { updateQuery?: boolean } = {},
    ) => {
      const sanitized = sanitizeSearchKeyword(rawKeyword);

      if (!sanitized) {
        if (options.updateQuery !== false) {
          updateSearchQuery(null);
        }

        setIsModalOpen(false);
        setModalState("idle");
        setModalError(null);

        toast({
          title: "검색어를 입력해 주세요.",
          description:
            "최소 한 글자 이상의 키워드를 입력해야 검색할 수 있습니다.",
        });

        return;
      }

      setKeyword(sanitized);
      setActiveKeyword(sanitized);
      setModalResults([]);
      setModalError(null);
      setModalState("loading");
      setIsModalOpen(true);

      lastRequestedKeywordRef.current = sanitized;

      if (options.updateQuery !== false) {
        updateSearchQuery(sanitized);
      }

      try {
        const results = await executeSearch(sanitized);
        setModalResults(results);
        setModalState("success");
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "검색 요청 처리 중 문제가 발생했습니다.";
        setModalError(message);
        setModalState("error");
      }
    },
    [executeSearch, toast, updateSearchQuery],
  );

  const handleSearchSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      void executeSearchFlow(keyword);
    },
    [executeSearchFlow, keyword],
  );

  const handleRetrySearch = useCallback(() => {
    if (!activeKeyword) {
      return;
    }

    void executeSearchFlow(activeKeyword, { updateQuery: false });
  }, [activeKeyword, executeSearchFlow]);

  const handleModalClose = useCallback(() => {
    setIsModalOpen(false);
    setModalState("idle");
    setModalError(null);
    resetSearch();
  }, [resetSearch]);

  const handleMarkerClick = useCallback(
    (marker: RestaurantMarker) => {
      router.push(`/restaurant/${marker.id}`);
    },
    [router],
  );

  const handleMarkerHover = useCallback(
    (
      marker: RestaurantMarker,
      event: { position: { x: number; y: number } },
    ) => {
      setHoveredMarkerId(marker.id);
      setHoveredMarkerFallback(marker);
      setTooltipPosition(event.position);
    },
    [],
  );

  const handleMarkerLeave = useCallback(() => {
    setHoveredMarkerId(null);
    setHoveredMarkerFallback(null);
    setTooltipPosition(null);
  }, []);

  useEffect(() => {
    if (!initialKeyword) {
      if (!initialSearchHandledRef.current) {
        setKeyword("");
        setActiveKeyword("");
        initialSearchHandledRef.current = true;
      }
      return;
    }

    if (lastRequestedKeywordRef.current === initialKeyword) {
      return;
    }

    initialSearchHandledRef.current = true;
    lastRequestedKeywordRef.current = initialKeyword;
    setKeyword(initialKeyword);
    setActiveKeyword(initialKeyword);
    void executeSearchFlow(initialKeyword, { updateQuery: false });
  }, [executeSearchFlow, initialKeyword]);

  const {
    data: hoveredRestaurant,
    isFetching: isRestaurantDetailFetching,
  } = useRestaurantDetail(hoveredMarkerId ?? "", {
    enabled: hoveredMarkerId !== null,
  });

  const tooltipData = (() => {
    if (hoveredRestaurant) {
      return {
        name: hoveredRestaurant.name,
        category: hoveredRestaurant.category,
        reviewCount: hoveredRestaurant.reviewCount,
        averageRating: hoveredRestaurant.averageRating,
      };
    }

    if (hoveredMarkerFallback) {
      return {
        name: hoveredMarkerFallback.name,
        category: hoveredMarkerFallback.category,
        reviewCount: hoveredMarkerFallback.reviewCount,
        averageRating: hoveredMarkerFallback.averageRating,
      };
    }

    return null;
  })();

  return (
    <main className="flex min-h-screen flex-col bg-white">
      <header className="z-10 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur">
        <form
          className="mx-auto flex w-full max-w-3xl items-center gap-3 rounded-full border border-slate-300 bg-white px-4 py-2 shadow-sm transition focus-within:border-slate-500"
          onSubmit={handleSearchSubmit}
          aria-busy={modalState === "loading"}
        >
          <label htmlFor="restaurant-search" className="sr-only">
            음식점 검색
          </label>
          <Search className="h-5 w-5 text-slate-500" aria-hidden="true" />
          <input
            id="restaurant-search"
            type="search"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder={SEARCH_PLACEHOLDER}
            className="flex-1 border-none bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
            autoComplete="off"
            maxLength={RESTAURANT_SEARCH_KEYWORD_MAX_LENGTH}
          />
          <button
            type="submit"
            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
            disabled={isSearchLoading || modalState === "loading"}
          >
            검색
          </button>
        </form>
      </header>
      <section className="relative flex-1 min-h-[480px]">
        <NaverMap
          onMarkerClick={handleMarkerClick}
          onMarkerHover={handleMarkerHover}
          onMarkerLeave={handleMarkerLeave}
        />
        {tooltipData && tooltipPosition ? (
          <MarkerTooltip
            data={tooltipData}
            position={tooltipPosition}
            isLoading={isRestaurantDetailFetching}
          />
        ) : null}
      </section>
      <RestaurantSearchModal
        isOpen={isModalOpen}
        keyword={activeKeyword}
        results={modalResults}
        state={modalState}
        errorMessage={modalError}
        onClose={handleModalClose}
        onRetry={handleRetrySearch}
      />
    </main>
  );
}
