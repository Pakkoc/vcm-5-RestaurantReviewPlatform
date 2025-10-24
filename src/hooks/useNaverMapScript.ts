"use client";

import { useCallback, useEffect, useState } from "react";
import { NAVER_MAP_DEFAULT_CENTER } from "@/constants/map";

type ScriptStatus = "loading" | "ready" | "error";

let isMapSdkLoaded = false;
let isMapSdkLoading = false;
let loadPromise: Promise<void> | null = null;

const waitForNaverMaps = (maxAttempts = 50, interval = 100): Promise<void> => {
  return new Promise((resolve, reject) => {
    let attempts = 0;

    const checkNaverMaps = () => {
      attempts++;

      if (typeof window !== "undefined" && window.naver?.maps) {
        resolve();
      } else if (attempts >= maxAttempts) {
        reject(new Error("Naver Maps SDK initialization timeout"));
      } else {
        setTimeout(checkNaverMaps, interval);
      }
    };

    checkNaverMaps();
  });
};

const loadNaverMapSdk = (): Promise<void> => {
  if (isMapSdkLoaded && window.naver?.maps) {
    return Promise.resolve();
  }

  if (isMapSdkLoading && loadPromise) {
    return loadPromise;
  }

  isMapSdkLoading = true;

  loadPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.type = "text/javascript";
    script.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${process.env.NEXT_PUBLIC_NAVER_MAPS_KEY_ID}`;
    script.async = true;

    script.onload = async () => {
      try {
        await waitForNaverMaps();
        isMapSdkLoaded = true;
        isMapSdkLoading = false;
        resolve();
      } catch (error) {
        isMapSdkLoading = false;
        loadPromise = null;
        reject(error);
      }
    };

    script.onerror = () => {
      isMapSdkLoading = false;
      loadPromise = null;
      reject(new Error("Failed to load Naver Map SDK"));
    };

    document.head.appendChild(script);
  });

  return loadPromise;
};

export const useNaverMapScript = () => {
  const [status, setStatus] = useState<ScriptStatus>("loading");

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    loadNaverMapSdk()
      .then(() => {
        setStatus("ready");
      })
      .catch((error) => {
        console.error("[useNaverMapScript] SDK 로드 실패:", error);
        setStatus("error");
      });
  }, []);

  const retry = useCallback(() => {
    isMapSdkLoaded = false;
    isMapSdkLoading = false;
    loadPromise = null;
    setStatus("loading");
  }, []);

  return {
    isLoading: status === "loading",
    isReady: status === "ready",
    isError: status === "error",
    retry,
    retryCount: 0,
    maxRetry: 0,
    defaultCenter: NAVER_MAP_DEFAULT_CENTER,
  };
};
