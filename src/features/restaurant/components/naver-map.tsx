"use client";

import { useEffect, useMemo, useRef } from "react";
import clsx from "clsx";
import {
  NAVER_MAP_DEFAULT_CENTER,
  NAVER_MAP_DEFAULT_ZOOM,
  NAVER_MAP_MAX_ZOOM,
  NAVER_MAP_MIN_ZOOM,
} from "@/constants/map";
import { MapErrorFallback } from "@/features/restaurant/components/map-error-fallback";
import { MapLoadingSpinner } from "@/features/restaurant/components/map-loading-spinner";
import { useRestaurantMarkers } from "@/features/restaurant/hooks/useRestaurantMarkers";
import { type RestaurantMarker } from "@/features/restaurant/lib/dto";
import { useNaverMapScript } from "@/hooks/useNaverMapScript";

type NaverMapProps = {
  className?: string;
  onMarkerClick?: (marker: RestaurantMarker) => void;
  onMarkerHover?: (
    marker: RestaurantMarker,
    event: { position: { x: number; y: number } },
  ) => void;
  onMarkerLeave?: () => void;
};

type MarkerEntry = {
  marker: naver.maps.Marker;
  listeners: Array<ReturnType<typeof naver.maps.Event.addListener>>;
};

export const NaverMap = ({
  className,
  onMarkerClick,
  onMarkerHover,
  onMarkerLeave,
}: NaverMapProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<naver.maps.Map | null>(null);
  const markerEntriesRef = useRef<MarkerEntry[]>([]);

  const {
    isLoading: isScriptLoading,
    isReady: isScriptReady,
    isError: isScriptError,
    retry: retryScript,
  } = useNaverMapScript();

  const markersQuery = useRestaurantMarkers();

  const isMarkersLoading = markersQuery.isLoading;
  const markersError = markersQuery.error;

  const markers = useMemo(
    () => markersQuery.data ?? [],
    [markersQuery.data],
  );

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    const container = containerRef.current;
    let targetElement = container.parentElement;

    while (targetElement && targetElement.offsetHeight === 0) {
      targetElement = targetElement.parentElement;
    }

    if (targetElement && targetElement.offsetHeight > 0) {
      const height = targetElement.offsetHeight;
      container.style.height = `${height}px`;
      if (container.parentElement) {
        container.parentElement.style.height = `${height}px`;
      }
    }
  }, []);

  useEffect(() => {
    if (
      !isScriptReady ||
      mapInstanceRef.current !== null ||
      !containerRef.current
    ) {
      return;
    }

    if (!window.naver?.maps?.LatLng) {
      return;
    }

    const createLatLng = (latitude: number, longitude: number) =>
      new window.naver.maps.LatLng(latitude, longitude);

    const center = createLatLng(
      NAVER_MAP_DEFAULT_CENTER.latitude,
      NAVER_MAP_DEFAULT_CENTER.longitude,
    );

    const { naver } = window;
    const zoomControlPosition =
      naver?.maps?.Position?.TOP_RIGHT ?? undefined;

    mapInstanceRef.current = new window.naver.maps.Map(containerRef.current, {
      center,
      zoom: NAVER_MAP_DEFAULT_ZOOM,
      minZoom: NAVER_MAP_MIN_ZOOM,
      maxZoom: NAVER_MAP_MAX_ZOOM,
      zoomControl: true,
      zoomControlOptions: zoomControlPosition
        ? {
            position: zoomControlPosition,
          }
        : undefined,
      mapDataControl: false,
      scaleControl: false,
      logoControl: false,
      draggable: true,
      scrollWheel: true,
      keyboardShortcuts: true,
      disableDoubleTapZoom: false,
      disableDoubleClickZoom: false,
      disableTwoFingerTapZoom: false,
      pinchZoom: true,
    });
  }, [isScriptReady]);

  useEffect(() => {
    if (!isScriptReady || !mapInstanceRef.current) {
      return;
    }

    const map = mapInstanceRef.current;
    const { naver } = window;

    markerEntriesRef.current.forEach(({ marker, listeners }) => {
      listeners.forEach((listener) => naver.maps.Event.removeListener(listener));
      marker.setMap(null);
    });
    markerEntriesRef.current = [];

    if (markers.length === 0) {
      if (window.naver?.maps?.LatLng && typeof map.setCenter === "function") {
        map.setCenter(
          new window.naver.maps.LatLng(
            NAVER_MAP_DEFAULT_CENTER.latitude,
            NAVER_MAP_DEFAULT_CENTER.longitude,
          ),
        );
      }
      return;
    }

    if (!window.naver?.maps?.LatLng) {
      return;
    }

    const createLatLng = (latitude: number, longitude: number) =>
      new window.naver.maps.LatLng(latitude, longitude);

    let bounds: naver.maps.LatLngBounds | null = null;

    markerEntriesRef.current = markers.map((markerData) => {
      const position = createLatLng(markerData.latitude, markerData.longitude);
      const marker = new naver.maps.Marker({
        map,
        position,
        title: markerData.name,
      });

      if (!bounds) {
        bounds = new naver.maps.LatLngBounds(position, position);
      } else {
        bounds.extend(position);
      }

      const listeners: Array<
        ReturnType<typeof naver.maps.Event.addListener>
      > = [];

      const computeScreenPosition = (
        event: naver.maps.PointerEvent,
      ): { x: number; y: number } => {
        const pointerEvent = event.pointerEvent;

        if (pointerEvent) {
          const mouseLike = pointerEvent as Partial<MouseEvent>;

          if (
            typeof mouseLike.clientX === "number" &&
            typeof mouseLike.clientY === "number"
          ) {
            return {
              x: mouseLike.clientX,
              y: mouseLike.clientY,
            };
          }

          const touchLike = pointerEvent as Partial<TouchEvent>;

          if (
            touchLike.changedTouches &&
            touchLike.changedTouches.length > 0
          ) {
            const touch = touchLike.changedTouches[0];
            return {
              x: touch.clientX,
              y: touch.clientY,
            };
          }
        }

        const containerRect = containerRef.current?.getBoundingClientRect();

        if (containerRect) {
          return {
            x: containerRect.left + event.point.x,
            y: containerRect.top + event.point.y,
          };
        }

        return {
          x: event.point.x,
          y: event.point.y,
        };
      };

      if (onMarkerClick) {
        listeners.push(
          naver.maps.Event.addListener(marker, "click", () =>
            onMarkerClick(markerData),
          ),
        );
      }

      if (onMarkerHover) {
        listeners.push(
          naver.maps.Event.addListener(
            marker,
            "mouseover",
            (event: naver.maps.PointerEvent) =>
              onMarkerHover(markerData, {
                position: computeScreenPosition(event),
              }),
          ),
        );
      }

      if (onMarkerLeave) {
        listeners.push(
          naver.maps.Event.addListener(marker, "mouseout", () =>
            onMarkerLeave(),
          ),
        );
      }

      return {
        marker,
        listeners,
      };
    });

    if (bounds) {
      if (markers.length === 1) {
        if (typeof map.setCenter === "function") {
          map.setCenter(bounds.getCenter());
        }
        if (typeof map.setZoom === "function") {
          map.setZoom(NAVER_MAP_DEFAULT_ZOOM);
        }
      } else if (typeof map.fitBounds === "function") {
        map.fitBounds(bounds);
      }
    }
  }, [isScriptReady, markers, onMarkerClick, onMarkerHover, onMarkerLeave]);

  useEffect(() => {
    return () => {
      if (!window.naver?.maps) {
        return;
      }

      markerEntriesRef.current.forEach(({ marker, listeners }) => {
        listeners.forEach((listener) =>
          window.naver.maps.Event.removeListener(listener),
        );
        marker.setMap(null);
      });
      markerEntriesRef.current = [];
      mapInstanceRef.current = null;
    };
  }, []);

  const shouldShowSpinner =
    isScriptLoading || (isMarkersLoading && !markersQuery.isError);

  return (
    <div className={clsx("relative h-full w-full", className)}>
      <div ref={containerRef} className="h-full w-full" style={{ minHeight: '100%' }} />
      {shouldShowSpinner ? <MapLoadingSpinner /> : null}
      {isScriptError ? (
        <MapErrorFallback
          title="지도를 불러오지 못했습니다."
          description="네이버 지도 SDK 로드 중 문제가 발생했습니다. 다시 시도해 주세요."
          onRetry={retryScript}
        />
      ) : null}
      {!isScriptError && markersQuery.isError ? (
        <MapErrorFallback
          title="마커 데이터를 불러오지 못했습니다."
          description={
            markersError instanceof Error
              ? markersError.message
              : "잠시 후 다시 시도해 주세요."
          }
          onRetry={() => {
            void markersQuery.refetch();
          }}
        />
      ) : null}
    </div>
  );
};
