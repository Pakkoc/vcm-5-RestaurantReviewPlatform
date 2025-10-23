"use client";

import { useCallback, useEffect, useState } from "react";
import {
  NAVER_MAP_DEFAULT_CENTER,
  NAVER_MAP_MAX_RETRY,
  NAVER_MAP_RETRY_DELAY_MS,
  NAVER_MAP_SCRIPT_URL,
} from "@/constants/map";
import { useCspNonce } from "@/features/security/csp-context";

type ScriptStatus = "idle" | "loading" | "ready" | "error";

const NAVER_MAP_SCRIPT_ID = "naver-maps-sdk";

const hasNaverMap = () => typeof window !== "undefined" && !!window.naver?.maps;

export const useNaverMapScript = () => {
  const [status, setStatus] = useState<ScriptStatus>("idle");
  const [retryCount, setRetryCount] = useState(0);
  const cspNonce = useCspNonce();

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (hasNaverMap()) {
      setStatus("ready");
      return;
    }

    const keyId = process.env.NEXT_PUBLIC_NAVER_MAPS_KEY_ID;

    if (!keyId) {
      console.error(
        "NEXT_PUBLIC_NAVER_MAPS_KEY_ID is not defined. Please configure the environment variable.",
      );
      setStatus("error");
      return;
    }

    if (retryCount > NAVER_MAP_MAX_RETRY) {
      setStatus("error");
      return;
    }

    let cancelled = false;

    const removeExistingScript = () => {
      const existing = document.getElementById(
        NAVER_MAP_SCRIPT_ID,
      ) as HTMLScriptElement | null;

      if (existing && existing.parentNode) {
        existing.parentNode.removeChild(existing);
      }
    };

    const scheduleRetry = () => {
      if (retryCount >= NAVER_MAP_MAX_RETRY || cancelled) {
        setStatus("error");
        return;
      }

      window.setTimeout(() => {
        if (cancelled) {
          return;
        }
        setStatus("idle");
        setRetryCount((prev) => prev + 1);
      }, NAVER_MAP_RETRY_DELAY_MS);
    };

    setStatus("loading");
    removeExistingScript();

    const script = document.createElement("script");
    script.id = NAVER_MAP_SCRIPT_ID;
    if (cspNonce) {
      script.setAttribute("nonce", cspNonce);
    }
    script.src = `${NAVER_MAP_SCRIPT_URL}?ncpKeyId=${keyId}`;
    script.async = true;

    script.onload = () => {
      if (cancelled) {
        return;
      }

      if (hasNaverMap()) {
        setStatus("ready");
      } else {
        scheduleRetry();
      }
    };

    script.onerror = () => {
      if (cancelled) {
        return;
      }

      scheduleRetry();
    };

    document.head.appendChild(script);

    return () => {
      cancelled = true;
      script.onload = null;
      script.onerror = null;

      if (!hasNaverMap() && script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, [retryCount, cspNonce]);

  const retry = useCallback(() => {
    setRetryCount(0);
    setStatus("idle");
  }, []);

  return {
    isLoading: status === "loading",
    isReady: status === "ready",
    isError: status === "error",
    retry,
    retryCount,
    maxRetry: NAVER_MAP_MAX_RETRY,
    defaultCenter: NAVER_MAP_DEFAULT_CENTER,
  };
};
