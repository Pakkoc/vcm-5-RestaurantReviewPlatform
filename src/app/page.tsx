"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { NaverMap } from "@/features/restaurant/components/naver-map";
import {
  RestaurantSearchModal,
} from "@/features/restaurant/components/restaurant-search-modal";
import {
  RESTAURANT_SEARCH_KEYWORD_MAX_LENGTH,
  type RestaurantMarker,
  type RestaurantSearchResult,
} from "@/features/restaurant/lib/dto";
import { useRestaurantSearch } from "@/features/restaurant/hooks/useRestaurantSearch";
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
  const [hoveredMarker, setHoveredMarker] = useState<RestaurantMarker | null>(
    null,
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalState, setModalState] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [modalResults, setModalResults] = useState<RestaurantSearchResult[]>(
    [],
  );
  const [modalError, setModalError] = useState<string | null>(null);
  const [activeKeyword, setActiveKeyword] = useState(initialKeyword);

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

  const handleReviewSelect = useCallback(
    (result: RestaurantSearchResult) => {
      const params = new URLSearchParams();

      if (result.restaurantId) {
        params.set("restaurantId", result.restaurantId);
      } else if (result.naverPlaceId) {
        params.set("naverPlaceId", result.naverPlaceId);
      } else {
        params.set("name", result.name);
      }

      params.set("address", result.address);

      if (result.category) {
        params.set("category", result.category);
      }

      if (result.latitude !== null && result.longitude !== null) {
        params.set("latitude", String(result.latitude));
        params.set("longitude", String(result.longitude));
      }

      handleModalClose();
      router.push(`/review/create?${params.toString()}`);
    },
    [handleModalClose, router],
  );

  const handleMarkerClick = useCallback(
    (marker: RestaurantMarker) => {
      router.push(`/restaurant/${marker.id}`);
    },
    [router],
  );

  const handleMarkerHover = useCallback((marker: RestaurantMarker) => {
    setHoveredMarker(marker);
  }, []);

  const handleMarkerLeave = useCallback(() => {
    setHoveredMarker(null);
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
        {hoveredMarker ? (
          <aside className="pointer-events-none absolute left-6 top-6 z-20 max-w-xs rounded-xl border border-slate-200 bg-white/90 p-4 text-left shadow-lg">
            <h2 className="text-base font-semibold text-slate-900">
              {hoveredMarker.name}
            </h2>
            <dl className="mt-2 space-y-1 text-sm text-slate-600">
              <div className="flex items-center justify-between gap-3">
                <dt className="font-medium text-slate-500">카테고리</dt>
                <dd>{hoveredMarker.category ?? "정보 없음"}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="font-medium text-slate-500">평점</dt>
                <dd>
                  {hoveredMarker.averageRating !== null
                    ? `⭐ ${hoveredMarker.averageRating.toFixed(1)}`
                    : "아직 평점 없음"}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="font-medium text-slate-500">리뷰 수</dt>
                <dd>{hoveredMarker.reviewCount}개</dd>
              </div>
            </dl>
          </aside>
        ) : null}
        <NaverMap
          onMarkerClick={handleMarkerClick}
          onMarkerHover={handleMarkerHover}
          onMarkerLeave={handleMarkerLeave}
        />
      </section>
      <RestaurantSearchModal
        isOpen={isModalOpen}
        keyword={activeKeyword}
        results={modalResults}
        state={modalState}
        errorMessage={modalError}
        onClose={handleModalClose}
        onRetry={handleRetrySearch}
        onReview={handleReviewSelect}
      />
    </main>
  );
}
