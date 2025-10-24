"use client";

import { useCallback, useEffect, useState } from "react";
import { NAVER_MAP_DEFAULT_CENTER } from "@/constants/map";

type ScriptStatus = "loading" | "ready" | "error";

const hasNaverMap = () => typeof window !== "undefined" && !!window.naver?.maps;

export const useNaverMapScript = () => {
  const [status, setStatus] = useState<ScriptStatus>("loading");

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const checkNaverMap = () => {
      if (hasNaverMap()) {
        setStatus("ready");
        return;
      }

      const timer = window.setTimeout(checkNaverMap, 100);
      return () => window.clearTimeout(timer);
    };

    const cleanup = checkNaverMap();
    return cleanup;
  }, []);

  const retry = useCallback(() => {
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
