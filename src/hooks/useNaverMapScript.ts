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
const readNonceFromDom = () => {
  if (typeof document === "undefined") {
    return null;
  }
  return document.body.getAttribute("data-csp-nonce");
};

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
    const clientId = process.env.NEXT_PUBLIC_NAVER_MAPS_CLIENT_ID;

    if (!keyId && !clientId) {
      console.error(
        "NEXT_PUBLIC_NAVER_MAPS_KEY_ID 또는 NEXT_PUBLIC_NAVER_MAPS_CLIENT_ID가 설정되지 않았습니다. 환경 변수를 확인하세요.",
      );
      setStatus("error");
      return;
    }

    const credentialCandidates: Array<{
      param: "ncpKeyId" | "ncpClientId";
      value: string;
      description: string;
    }> = [];

    if (clientId) {
      credentialCandidates.push({
        param: "ncpClientId",
        value: clientId,
        description: "레거시 ncpClientId",
      });
    }

    if (keyId) {
      credentialCandidates.push({
        param: "ncpClientId",
        value: keyId,
        description: "ncpKeyId → ncpClientId 폴백",
      });
      credentialCandidates.push({
        param: "ncpKeyId",
        value: keyId,
        description: "신규 ncpKeyId",
      });
    }

    if (credentialCandidates.length === 0) {
      console.error("사용 가능한 NAVER 지도 인증 정보 후보가 없습니다.");
      setStatus("error");
      return;
    }

    const currentCandidate =
      credentialCandidates[
        Math.min(retryCount, credentialCandidates.length - 1)
      ];

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
    const effectiveNonce = cspNonce ?? readNonceFromDom();
    if (effectiveNonce) {
      script.setAttribute("nonce", effectiveNonce);
    }
    const scriptUrl = new URL(NAVER_MAP_SCRIPT_URL);
    scriptUrl.searchParams.set(currentCandidate.param, currentCandidate.value);
    script.dataset.naverMapsCredentialType = currentCandidate.param;

    const serviceMode = process.env.NEXT_PUBLIC_NAVER_MAPS_SERVICE_MODE;
    if (serviceMode) {
      scriptUrl.searchParams.set("serviceMode", serviceMode);
    }

    const submodules = process.env.NEXT_PUBLIC_NAVER_MAPS_SUBMODULES;
    if (submodules) {
      scriptUrl.searchParams.set("submodules", submodules);
    }

    script.src = scriptUrl.toString();
    script.async = true;
    console.info(
      `[NAVER_MAP] SDK 로드 시도 (${retryCount + 1}회차): ${currentCandidate.description} 사용`,
    );

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
      console.warn(
        `[NAVER_MAP] SDK 로드 실패 (${retryCount + 1}회차): ${currentCandidate.description}`,
      );
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
