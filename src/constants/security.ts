type DirectiveSources = readonly string[];

const SELF = "'self'" as const;
const UNSAFE_EVAL = "'unsafe-eval'" as const;
const DATA = "data:" as const;
const BLOB = "blob:" as const;

const NAVER_SCRIPT_ENDPOINT = "https://oapi.map.naver.com" as const;
const NAVER_DOMAINS: DirectiveSources = [
  NAVER_SCRIPT_ENDPOINT,
  "https://*.naver.com",
  "https://*.naver.net",
  "https://*.ntruss.com",
  "https://*.pstatic.net",
];

const SUPABASE_DOMAINS: DirectiveSources = [
  "https://*.supabase.co",
  "https://*.supabase.in",
];

const serialize = (sources: DirectiveSources) => sources.join(" ");

const scriptSrc = (nonce: string) =>
  serialize([
    SELF,
    `'nonce-${nonce}'`,
    UNSAFE_EVAL,
    ...NAVER_DOMAINS,
  ]);

const styleSrc = (nonce: string) =>
  serialize([
    SELF,
    `'nonce-${nonce}'`,
    "'unsafe-inline'",
    ...NAVER_DOMAINS,
  ]);

const styleAttr = () => serialize(["'unsafe-inline'"]);

const imgSrc = () =>
  serialize([
    SELF,
    DATA,
    BLOB,
    NAVER_SCRIPT_ENDPOINT,
    ...NAVER_DOMAINS,
  ]);

const connectSrc = () =>
  serialize([
    SELF,
    ...NAVER_DOMAINS,
    ...SUPABASE_DOMAINS,
    "wss:",
    "https:",
  ]);

const fontSrc = () => serialize([SELF, DATA]);

const frameSrc = () => serialize([NAVER_SCRIPT_ENDPOINT, ...NAVER_DOMAINS]);

export const createContentSecurityPolicy = (nonce: string) =>
  [
    `default-src ${SELF}`,
    `base-uri ${SELF}`,
    "object-src 'none'",
    `form-action ${SELF}`,
    `frame-ancestors ${SELF}`,
    `script-src ${scriptSrc(nonce)}`,
    `script-src-elem ${scriptSrc(nonce)}`,
    `style-src ${styleSrc(nonce)}`,
    `style-src-elem ${styleSrc(nonce)}`,
    `style-src-attr ${styleAttr()}`,
    `img-src ${imgSrc()}`,
    `connect-src ${connectSrc()}`,
    `font-src ${fontSrc()}`,
    `frame-src ${frameSrc()}`,
  ].join("; ");
