아래는 오늘(2025-10-24) 기준, **공식 문서 우선** + 최근 이슈를 교차 검증해 정리한 **최종 연동 문서**입니다.
요구하신 항목(수단/기능/설치·세팅/인증 관리/호출 방법)과 **Step-by-Step** 절차를 모두 포함했습니다.
(환경 가정: Next.js 14/15, Node 20/22 LTS)

---

# 1) 수단별 개요

## A. **SDK (NAVER Maps JavaScript API v3 / Web Dynamic Map)**

* **사용할 기능**: 웹 지도 표시, 마커/인포윈도우, 이벤트 처리, 서브모듈(지오코더 등)
* **근거**: 공식 “Hello, World” 문서에서 `ncpClientId`를 포함한 `<script>` 로드와 기본 맵 생성 예시를 제공. ([Naver Maps][1])

## B. **API (NAVER 검색 API — 지역)**

* **사용할 기능**: 키워드 기반 장소 검색(서버사이드 호출 → JSON 반환), 검색 결과의 좌표(`mapx/mapy`: **WGS84 × 10⁷ 정수**) 활용
* **근거**: 공식 지역 검색 문서에 엔드포인트/헤더 인증/파라미터/쿼터가 명시. `display`는 **최대 5**, 응답 좌표는 **WGS84 기준**으로 명시. ([NAVER Developers][2])

## C. **Webhook**

* **사용할 기능**: *(제공 없음)* 지도 SDK/검색 API 자체는 **공식 Webhook 스펙이 없음**. 필요한 경우 **자체 서버의 Webhook 엔드포인트**를 설계(애플리케이션 이벤트를 내부적으로 트리거)
* **근거**: 지도 v3 문서 및 지역 검색 API 문서 어디에도 Webhook 스펙/시크릿 발급이 존재하지 않음(부재 확인). ([Naver Maps][1])

---

# 2) 수단별 상세 가이드

## A) SDK — NAVER Maps JS v3

### ① 설치/세팅 방법

1. **애플리케이션 등록 / 도메인 화이트리스트**

   * Naver Cloud Console → **Services > Application Services > Maps > Application**
   * **Web 서비스 URL은 ‘호스트만’ 등록(포트/경로 제외)**
     예: `http://localhost:8080` **→** `http://localhost` / `http://127.0.0.1/main` **→** `http://127.0.0.1` (인증 오류 방지 핵심) ([Ncloud Docs Guide][3])
2. **라이브러리 로드(패키지 설치 없음)**

   * 공식 예시:

     ```html
     <script src="https://oapi.map.naver.com/openapi/v3/maps.js?ncpClientId=YOUR_CLIENT_ID"></script>
     ```

     (필요 시 `&callback=initMap`, `&submodules=geocoder` 등 추가) ([Naver Maps][1])
3. **Next.js에서 배치 규칙**

   * `beforeInteractive` 스크립트는 **Pages Router: `pages/_document.js`**, **App Router: `app/layout.tsx`** 에서만 허용.
     페이지 컴포넌트에 배치하면 경고 발생 → 페이지 국소 로드 시엔 `afterInteractive` + `useEffect`로 초기화. ([Next.js][4])

### ② 인증정보 관리 방법

* **지도 Client ID**는 스크립트 URL에 노출되는 구조이므로, **콘솔의 도메인 제한**으로 접근 제어(필수). 포트/경로 제외 규칙을 지키지 않으면 인증 실패 빈발. ([Ncloud Docs Guide][3])
* (서브모듈·지오코더 사용 시) 콘솔에서 해당 기능 권한 체크가 필요할 수 있음(예: Geocoding 미신청 시 429). ([Ncloud Docs Guide][3])

### ③ 호출 방법(예시, Next.js 페이지)

```jsx
// pages/index.jsx (페이지 한정 로드: afterInteractive + useEffect)
import Script from 'next/script'
import { useEffect, useRef } from 'react'

export default function Home() {
  const ref = useRef(null)

  useEffect(() => {
    if (!window.naver || !ref.current) return
    const { naver } = window
    const center = new naver.maps.LatLng(37.5666805, 126.9784147)
    const map = new naver.maps.Map(ref.current, { center, zoom: 15 })
    new naver.maps.Marker({ position: center, map })
  }, [])

  return (
    <>
      <Script
        strategy="afterInteractive"
        src={`https://oapi.map.naver.com/openapi/v3/maps.js?ncpClientId=${process.env.NEXT_PUBLIC_NAVER_MAP_CLIENT_ID}`}
      />
      <div ref={ref} style={{ height: '80vh' }} />
    </>
  )
}
```

> 전역 필요 시에는 `pages/_document.js` 또는 `app/layout.tsx`에 `beforeInteractive`로 배치. ([Next.js][4])

---

## B) API — 검색(지역) API

### ① API 주소 / 엔드포인트

* **호스트**: `https://openapi.naver.com`
* **엔드포인트**:

  * `GET /v1/search/local.json` (JSON)
  * `GET /v1/search/local.xml` (XML) ([NAVER Developers][2])

### ② 인증정보 발급 및 세팅

* NAVER Developers에서 애플리케이션 등록 후 **검색 API(지역)** 사용 체크 → **Client ID/Secret 발급**.
* **HTTP 헤더**에 아래 값을 포함해야 정상 인증:

  * `X-Naver-Client-Id: <Client ID>`
  * `X-Naver-Client-Secret: <Client Secret>` ([NAVER Developers][2])

### ③ 호출 파라미터(요점)

* `query`(필수), `display`(기본 1, **최대 5**), `start`(기본 1, 문서 표기상 최댓값 1), `sort`(`random`/`comment`) ([NAVER Developers][2])
* **응답 좌표**: `mapx/mapy`는 **WGS84 좌표계 기준의 정수(×10⁷)** → `lng = mapx/1e7`, `lat = mapy/1e7` 로 환산하여 지도에 표시. (과거 TM128 예제와 혼동 주의) ([NAVER Developers][2])
* **쿼터**: 검색 API **하루 25,000회**. ([NAVER Developers][2])

### ④ 인증정보 관리 방법

* **Client Secret은 절대 클라이언트에 노출 금지**.
* **브라우저 직접 호출 시 CORS/보안 문제**가 발생 가능 → **서버(Next.js API Route)에서 프록시**로 호출 권장. (NCP 트러블슈팅에서도 JS 환경 CORS 시 백엔드 경유를 권고) ([Ncloud Docs Guide][3])

### ⑤ 호출 방법(Next.js — App Router의 Route Handler 예시)

```ts
// app/api/local/route.ts
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const query = searchParams.get('query')
  if (!query) return new Response(JSON.stringify({ error: 'query is required' }), { status: 400 })

  const url = `https://openapi.naver.com/v1/search/local.json?query=${encodeURIComponent(query)}&display=5`
  const res = await fetch(url, {
    headers: {
      'X-Naver-Client-Id': process.env.NAVER_SEARCH_API_CLIENT_ID!,
      'X-Naver-Client-Secret': process.env.NAVER_SEARCH_API_CLIENT_SECRET!,
    },
    cache: 'no-store',
  })

  if (!res.ok) return new Response(JSON.stringify({ error: `naver api ${res.status}` }), { status: 502 })
  const data = await res.json()
  return Response.json(data)
}
```

> 프론트에서는 `/api/local?query=…`를 호출하고, 응답의 `mapx/mapy`를 `lng/lat`으로 변환해 지도에 마커를 찍습니다. ([NAVER Developers][2])

---

## C) Webhook — *(자체 구현 대체)*

### ① 연동할 수단 / 사용할 기능

* **공식 Webhook 미제공** → “새 리뷰 저장됨”, “관리자 승인됨” 등 **내부 이벤트**를 트리거하려면 **자체 Webhook 엔드포인트**(`/webhook/...`)를 설계하여 **당사 시스템 간 알림** 용도로 사용.

### ② 설치/세팅 방법(예시)

* Next.js API Route/Route Handler로 `POST /api/webhook/naver-local` 정의, **서명 검증 로직**(HMAC 등) 포함.
* 외부 시스템(또는 내부 마이크로서비스)이 이벤트 발생 시 이 엔드포인트로 호출.

### ③ 인증정보 관리 방법

* **Webhook Secret**을 서버 환경변수에 저장(`WEBHOOK_SECRET`)하고 요청 시그니처 헤더(예: `X-Signature`)를 검증하는 **HMAC-SHA256** 등으로 위·변조 방지.
* 요청 본문(raw body) 기준으로 검증(프레임워크의 body-parser 옵션 주의).

### ④ 호출 방법(예시)

* 발신 측: `POST /api/webhook/naver-local` + 헤더(`X-Signature`) + JSON body
* 수신 측: 서명 검증 후 2xx 응답(비동기 작업은 큐/워크플로로 분리)

> *참고*: 이 Webhook 파트는 **공식 스펙이 없는 영역**이라 **조직 내부 규격**으로 정의합니다. 지도/검색 API 자체는 Webhook을 문서화하지 않습니다(문서 부재 확인). ([Naver Maps][1])

---

# 3) 자주 발생하는 문제 & 체크리스트

* **지도 인증 실패**: 서비스 URL에 **포트/경로가 포함**되어 있으면 실패 → **호스트만** 등록했는지 확인. ([Ncloud Docs Guide][3])
* **지오코딩 429**: 콘솔에서 **Geocoding 사용 신청** 누락. ([Ncloud Docs Guide][3])
* **CORS 오류**: 브라우저에서 OpenAPI 직접 호출 시 → **서버 프록시**로 경유. (NCP 트러블슈팅 권고) ([Ncloud Docs Guide][3])
* **좌표계 혼동**: 지역 API 응답 `mapx/mapy`는 **WGS84 × 10⁷ 정수** → `lng/lat` 환산 필수. ([NAVER Developers][2])
* **Next.js Script 배치**: `beforeInteractive`는 **`_document`/`app/layout`에서만 허용**. 페이지에서는 `afterInteractive` 사용. ([Next.js][4])

---

# 4) Step-by-Step (실행 순서 가이드)

## STEP 0. 런타임

* Node **20/22 LTS** 권장, Next.js 14/15 (Script 전략 규칙 준수).

## STEP 1. 콘솔 설정

1. **Naver Cloud (Maps)**

   * Application 생성 → **Web Dynamic Map** 활성화
   * **Web 서비스 URL = 호스트만 등록** (예: `http://localhost`, `https://yourdomain.com`)
   * 필요 시 **Geocoding** 체크(주소↔좌표 변환 사용) ([Ncloud Docs Guide][3])
2. **Naver Developers (검색 API)**

   * 애플리케이션 생성 → **검색 API(지역)** 사용 체크
   * **Client ID/Secret** 발급 확인 ([NAVER Developers][2])

## STEP 2. 환경변수

```bash
# 공개(지도): 도메인 제한 필수
NEXT_PUBLIC_NAVER_MAP_CLIENT_ID=발급받은_지도_Client_ID

# 비공개(서버 전용)
NAVER_SEARCH_API_CLIENT_ID=발급받은_검색_Client_ID
NAVER_SEARCH_API_CLIENT_SECRET=발급받은_검색_Client_Secret
WEBHOOK_SECRET=임의의_난수_시크릿(자체_웹훅_사용시)
```

## STEP 3. SDK 로드 & 지도 초기화

* 전역 필요시 **`_document`/`app/layout`** 에 `beforeInteractive`, 페이지 한정은 `afterInteractive` + `useEffect`. ([Next.js][4])
* 기본 지도 + 마커 생성(상단 SDK 섹션 코드 참고). ([Naver Maps][1])

## STEP 4. 서버 프록시(API Route)

* `GET /api/local?query=…` → 내부에서 `openapi.naver.com/v1/search/local.json` 호출
* 헤더에 `X-Naver-Client-Id/Secret` 포함(서버 환경변수) ([NAVER Developers][2])

## STEP 5. 프론트 검색 & 마커 표시

* `/api/local` 응답의 `items` 반복 → 각 `mapx/mapy`를 `lng/lat`으로 변환 후 `new naver.maps.Marker`로 표시. ([NAVER Developers][2])

## STEP 6. 운영 전 점검

* 서비스 URL **호스트만** 여부 재확인, 방화벽/프록시 환경에서 **지도 리소스 차단** 없는지 점검, 쿼터(25,000/일) 모니터링. ([Ncloud Docs Guide][3])

---

## 참고 문서(우선순위: 공식)

* **NAVER Maps JS v3**: Getting Started/Hello World, 서브모듈, 전반 문서. ([Naver Maps][1])
* **NCP Maps 트러블슈팅(도메인 등록 규칙·CORS 권고·Geocoding 신청)**. ([Ncloud Docs Guide][3])
* **NAVER Developers — 검색 API(지역)**: 엔드포인트/헤더 인증/파라미터/쿼터/좌표계(WGS84). ([NAVER Developers][2])
* **Next.js `next/script` 규칙**: `beforeInteractive` 허용 위치/전략 설명. ([Next.js][4])

---

필요하시면 **App Router 기준 템플릿(지오코더 서브모듈 포함)**, **좌표 변환 유틸**, **Webhook HMAC 검증 미들웨어**까지 바로 붙여드릴게요. 객관적으로 위험/이슈 가능성이 높은 지점(도메인 등록·CORS·좌표계)은 위 체크리스트대로 먼저 점검하시면 시행착오를 크게 줄일 수 있습니다.

[1]: https://navermaps.github.io/maps.js.en/docs/tutorial-2-Getting-Started.html "Hello, World | 네이버 지도 API v3"
[2]: https://developers.naver.com/docs/serviceapi/search/local/local.md "검색 > 지역 - Search API"
[3]: https://guide.ncloud-docs.com/docs/application-maps-troubleshoot "Maps 문제 해결"
[4]: https://nextjs.org/docs/messages/no-before-interactive-script-outside-document?utm_source=chatgpt.com "No Before Interactive Script Outside Document"
