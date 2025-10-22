"use client";

import { useCallback, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { NaverMap } from "@/features/restaurant/components/naver-map";
import type { RestaurantMarker } from "@/features/restaurant/lib/dto";

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

  const sanitizedKeyword = useMemo(
    () => keyword.trim(),
    [keyword],
  );

  const handleSearchSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      const nextKeyword = sanitizedKeyword;

      const nextSearchParams = new URLSearchParams(searchParams.toString());

      if (nextKeyword) {
        nextSearchParams.set(SEARCH_PARAM_KEY, nextKeyword);
      } else {
        nextSearchParams.delete(SEARCH_PARAM_KEY);
      }

      const nextQuery = nextSearchParams.toString();

      router.push(nextQuery ? `/?${nextQuery}` : "/");
    },
    [router, sanitizedKeyword, searchParams],
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

  return (
    <main className="flex min-h-screen flex-col bg-white">
      <header className="z-10 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur">
        <form
          className="mx-auto flex w-full max-w-3xl items-center gap-3 rounded-full border border-slate-300 bg-white px-4 py-2 shadow-sm transition focus-within:border-slate-500"
          onSubmit={handleSearchSubmit}
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
          />
          <button
            type="submit"
            className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
          >
            검색
          </button>
        </form>
      </header>
      <section className="relative flex-1">
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
    </main>
  );
}
