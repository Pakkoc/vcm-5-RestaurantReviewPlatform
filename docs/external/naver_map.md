좋아요 👇 지금까지의 모든 검증과 실제 콘솔 경로를 반영한 **최종 정리본**입니다.
2025년 10월 기준, **Next.js + TypeScript 환경에서 “웹용 네이버 지도 SDK + 지역 검색 API” 연동 전체 프로세스**를 **공식 경로**에 맞게 업데이트했습니다.

---

# 🧭 Next.js 기반 네이버 지도 SDK 및 검색 API 연동 — 최신 종합 문서 (2025.10)

## 1️⃣ 연동 개요

| 항목         | 수단                            | 목적                        | 제공 주체                    | 호출 환경                                    |
| ---------- | ----------------------------- | ------------------------- | ------------------------ | ---------------------------------------- |
| **지도 시각화** | **Naver Maps JavaScript SDK** | 웹 페이지에 지도를 표시하고 마커·위치 렌더링 | **Naver Cloud Platform** | 클라이언트(브라우저)                              |
| **지역 검색**  | **Naver Local Search API**    | 키워드로 장소·주소 검색             | **Naver Developers**     | 서버 (Next.js Server Actions or API Route) |

---

## 2️⃣ 기능 요약

| 수단         | 기능                                              | 특징                                   |
| ---------- | ----------------------------------------------- | ------------------------------------ |
| **지도 SDK** | - 지도 렌더링<br>- 마커 표시<br>- 줌/이동 제어<br>- 지오로케이션 표시 | 브라우저에서 스크립트로 호출 (window.naver.maps)  |
| **검색 API** | - 키워드 기반 장소 검색<br>- 주소, 카테고리, 좌표(mapx/mapy) 반환  | REST API (GET /v1/search/local.json) |

---

## 3️⃣ 지도 SDK 설정 (정확한 콘솔 경로 포함)

### ✅ **1단계: 콘솔 진입**

> 📍 **정확한 경로 (2025년 기준):**
> `Services → Application Services → Maps → Application`
> 또는 직접 URL: [https://console.ncloud.com/maps/application](https://console.ncloud.com/maps/application)

> ⚠️ 주의
>
> * “AI·NAVER API → Application” 메뉴는 **지도용이 아님** (CLOVA·CAPTCHA 등 전용)
> * 반드시 **Maps** 메뉴 내 Application에서 등록해야 지도 SDK Client ID 발급 가능

---

### ✅ **2단계: Application 등록 절차**

1. **[Application 등록] 클릭**
2. **서비스 선택 → “Maps (Web Dynamic Map)” 선택**
3. **서비스 환경 등록**

   * 웹 URL을 정확히 등록 (예: `http://localhost:3000`, `https://your-domain.com`)
   * 프로토콜(`http/https`), 포트번호, 서브도메인까지 정확히 일치해야 인증 성공
4. 등록 완료 후 **Client ID (ncpClientId)** 발급

---

### ✅ **3단계: 환경 변수 저장**

`.env.local`

```env
NEXT_PUBLIC_NAVER_MAPS_CLIENT_ID=발급받은_Client_ID
```

> `NEXT_PUBLIC_` 접두사는 브라우저에서 접근 가능하게 해줍니다.
> 지도 SDK는 도메인 제한으로 보호되므로 이 값은 공개 가능.

---

### ✅ **4단계: Next.js 클라이언트 컴포넌트에서 지도 표시**

```tsx
'use client';
import Script from 'next/script';
import { useRef } from 'react';

export default function NaverMap({ lat, lng }: { lat: number; lng: number }) {
  const mapRef = useRef<HTMLDivElement>(null);

  const onReady = () => {
    if (!mapRef.current) return;
    const location = new window.naver.maps.LatLng(lat, lng);
    const map = new window.naver.maps.Map(mapRef.current, {
      center: location,
      zoom: 16,
      zoomControl: true,
    });
    new window.naver.maps.Marker({ position: location, map });
  };

  return (
    <>
      <Script
        strategy="afterInteractive"
        src={`https://oapi.map.naver.com/openapi/v3/maps.js?ncpClientId=${process.env.NEXT_PUBLIC_NAVER_MAPS_CLIENT_ID}`}
        onReady={onReady}
      />
      <div ref={mapRef} style={{ width: '100%', height: 400 }} />
    </>
  );
}
```

> ✅ `'use client'` 필수
> ✅ `onReady` 콜백으로 스크립트 로드 후 지도 생성
> ✅ 등록한 URL과 실제 접근 URL이 다르면 인증 실패 (401/024 오류)

---

## 4️⃣ 지역 검색 API 연동 (서버 호출)

### ✅ **1단계: 콘솔 등록**

> 📍 [Naver Developers](https://developers.naver.com/apps/#/register)

* “내 애플리케이션 → 새 애플리케이션 등록”
* **사용 API** → “검색” 선택
* 발급받은 **Client ID / Secret** 확인

---

### ✅ **2단계: 환경 변수 설정**

`.env.local`

```env
NAVER_SEARCH_CLIENT_ID=발급받은_Client_ID
NAVER_SEARCH_CLIENT_SECRET=발급받은_Client_Secret
```

> `NEXT_PUBLIC_` 접두사 ❌ → 서버 전용
> (보안을 위해 클라이언트 번들에 포함되지 않음)

---

### ✅ **3단계: 서버 액션(Server Action) 또는 API Route 구현**

#### ✅ Server Action 버전

```typescript
'use server';

export async function searchLocalPlaces(query: string) {
  if (!query) return [];
  const url = new URL('https://openapi.naver.com/v1/search/local.json');
  url.searchParams.set('query', query);
  url.searchParams.set('display', '5'); // 2025 기준 최대 5건

  const res = await fetch(url.toString(), {
    headers: {
      'X-Naver-Client-Id': process.env.NAVER_SEARCH_CLIENT_ID!,
      'X-Naver-Client-Secret': process.env.NAVER_SEARCH_CLIENT_SECRET!,
    },
    cache: 'no-store',
  });

  if (!res.ok) throw new Error(`API Error: ${res.status}`);
  const data = await res.json();
  return (data.items || []).map((item: any) => ({
    ...item,
    title: item.title.replace(/<[^>]*>?/g, ''), // <b> 태그 제거
  }));
}
```

#### ✅ API Route 버전

```typescript
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get('query') || '';

  const res = await fetch(
    `https://openapi.naver.com/v1/search/local.json?query=${encodeURIComponent(query)}&display=5`,
    {
      headers: {
        'X-Naver-Client-Id': process.env.NAVER_SEARCH_CLIENT_ID!,
        'X-Naver-Client-Secret': process.env.NAVER_SEARCH_CLIENT_SECRET!,
      },
    }
  );

  const data = await res.json();
  return NextResponse.json(data);
}
```

---

### ✅ **4단계: 검색 결과 표시 (클라이언트)**

```tsx
'use client';
import { useState } from 'react';
import { searchLocalPlaces } from './actions/search';

export default function SearchComponent() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await searchLocalPlaces(query);
    setResults(res);
  };

  return (
    <div>
      <form onSubmit={handleSearch}>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="예: 강남 맛집" />
        <button type="submit">검색</button>
      </form>
      <ul>
        {results.map((item: any, i) => (
          <li key={i}>{item.title} - {item.address}</li>
        ))}
      </ul>
    </div>
  );
}
```

---

## 5️⃣ 인증정보 관리 요약

| 구분     | 키 이름                         | 노출 여부               | 위치                                | 비고               |
| ------ | ---------------------------- | ------------------- | --------------------------------- | ---------------- |
| 지도 SDK | `ncpClientId`                | ✅ 공개 가능 (도메인 제한 있음) | `.env.local` (`NEXT_PUBLIC_`)     | 웹 스크립트용          |
| 검색 API | `Client ID`, `Client Secret` | ❌ 비공개               | `.env.local` (서버 전용)              | REST 호출 시 헤더로 전달 |
| 공통     | —                            | —                   | `.gitignore`에 `.env.local` 반드시 포함 | GitHub 유출 방지     |

---

## 6️⃣ 자주 발생하는 오류 및 해결책

| 오류                          | 원인                   | 해결 방법                                 |
| --------------------------- | -------------------- | ------------------------------------- |
| `401 Unauthorized (지도)`     | 도메인 불일치              | 등록된 URL과 실제 접속 URL(포트 포함) 확인          |
| `024 Authentication failed` | 잘못된 ncpClientId      | 올바른 Client ID 재확인                     |
| `window.naver is undefined` | 스크립트 로드 전에 실행        | `<Script onReady>` 또는 `useEffect`로 처리 |
| 검색 결과 `<b>` 태그 포함           | 네이버 검색 API의 기본 응답 포맷 | 정규식으로 HTML 태그 제거                      |

---

## ✅ 결론 요약

| 항목              | 사용 서비스                      | 발급 위치                                                                                        | 호출 위치            |
| --------------- | --------------------------- | -------------------------------------------------------------------------------------------- | ---------------- |
| **지도 표시 (SDK)** | Naver Cloud Platform → Maps | [https://console.ncloud.com/maps/application](https://console.ncloud.com/maps/application)   | 클라이언트 컴포넌트       |
| **검색 기능 (API)** | Naver Developers → 검색 API   | [https://developers.naver.com/apps/#/register](https://developers.naver.com/apps/#/register) | 서버 액션(API Route) |

---

📚 **참고 공식 문서**

* [NAVER Cloud Platform – Maps Application 가이드](https://guide.ncloud-docs.com/docs/maps-app)
* [NAVER Developers – 지역 검색 API](https://developers.naver.com/docs/serviceapi/search/local/local.md)
* [Next.js 공식 환경변수 가이드](https://nextjs.org/docs/app/building-your-application/configuring/environment-variables)

