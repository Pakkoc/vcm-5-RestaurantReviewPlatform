"use client";

import { createContext, useContext, type ReactNode } from "react";

type CspNonceContextValue = string | null;

const CspNonceContext = createContext<CspNonceContextValue>(null);

type CspNonceProviderProps = {
  nonce: string | null;
  children: ReactNode;
};

export const CspNonceProvider = ({ nonce, children }: CspNonceProviderProps) => {
  return (
    <CspNonceContext.Provider value={nonce}>{children}</CspNonceContext.Provider>
  );
};

export const useCspNonce = () => {
  return useContext(CspNonceContext);
};
