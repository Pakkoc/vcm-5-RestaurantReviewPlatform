좋아요 👏
지금 제공하신 **공식 문서(업데이트된 네이버 지도 API v3)** 내용을 반영하여,
2025년 10월 기준으로 최신 정책(`ncpKeyId` 변경 포함)까지 모두 반영한
**최종 종합 정리본**을 아래에 제공합니다.

---

# 🧭 Next.js 기반 NAVER 지도 SDK + 지역검색 API 최신 통합 가이드 (2025.10 기준)

---

## 1️⃣ 연동 개요

| 구분        | 수단                                 | 제공 플랫폼                   | 목적                  | 호출 주체                                      |
| --------- | ---------------------------------- | ------------------------ | ------------------- | ------------------------------------------ |
| **지도 표시** | **NAVER Maps JavaScript SDK (v3)** | **NAVER Cloud Platform** | 웹페이지에 지도, 마커, 경로 표시 | **클라이언트(브라우저)**                            |
| **장소 검색** | **NAVER Local Search Open API**    | **NAVER Developers**     | 지역명·주소 기반 장소 검색     | **서버(Next.js API Route or Server Action)** |

---

## 2️⃣ 공식 문서 변경사항 (2025 최신)

### 🔹 변경 요약

* 지도 API 서비스가 **개인·기업용 콘솔(Naver Cloud Platform)** 으로 통합됨.
* 기존 **공공기관용(govClientId)**, **금융기관용(finClientId)** 콘솔 중단 예정.
* **새로운 파라미터 이름**:

  * 이전: `ncpClientId`
  * 변경 후: ✅ `ncpKeyId`

### 🔹 스크립트 변경 예시

```html
<!-- 변경 전 -->
<script src="https://oapi.map.naver.com/openapi/v3/maps.js?ncpClientId=YOUR_CLIENT_ID"></script>

<!-- 변경 후 (2025 기준) -->
<script src="https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=YOUR_CLIENT_ID"></script>
```

📘 공식 가이드:

* [Maps API 개요](https://guide.ncloud-docs.com/docs/application-maps-overview)
* [Maps API 사용(VPC)](https://guide.ncloud-docs.com/docs/application-maps-app-vpc)

---

## 3️⃣ 지도 SDK 설정

### ✅ 콘솔 등록 경로

> `Services → Application Services → Maps → Application`

📍 URL 직접 이동:
👉 [https://console.ncloud.com/maps/application](https://console.ncloud.com/maps/application)

---

### ✅ Application 등록 단계

1. **“Application 등록” 클릭**
2. **API 선택**

   * ✔️ **Dynamic Map** (웹 지도용 필수)
   * 필요 시 `Geocoding`, `Reverse Geocoding` 함께 선택
3. **서비스 환경 등록**

   * 웹사이트 주소 입력 (예: `http://localhost:3000`, `https://your-domain.com`)
   * 프로토콜(`http/https`), 포트(`:3000`) 포함
4. 등록 완료 후 **Client ID (ncpKeyId)** 발급

---

### ✅ 환경 변수 설정

`.env.local`

```bash
NEXT_PUBLIC_NAVER_MAPS_KEY_ID=발급받은_ncpKeyId
```

> `NEXT_PUBLIC_` 접두사를 붙이면 브라우저에서 접근 가능
> 지도용 키는 도메인 제한으로 보호되므로 공개해도 안전

---

### ✅ Next.js 예제 코드 (App Router 기준)

```tsx
'use client';
import Script from 'next/script';
import { useRef } from 'react';

export default function NaverMap({ lat, lng }: { lat: number; lng: number }) {
  const mapRef = useRef<HTMLDivElement>(null);

  const onReady = () => {
    if (!mapRef.current) return;
    const center = new window.naver.maps.LatLng(lat, lng);
    const map = new window.naver.maps.Map(mapRef.current, {
      center,
      zoom: 15,
      zoomControl: true,
    });
    new window.naver.maps.Marker({ position: center, map });
  };

  return (
    <>
      <Script
        strategy="afterInteractive"
        src={`https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${process.env.NEXT_PUBLIC_NAVER_MAPS_KEY_ID}`}
        onReady={onReady}
      />
      <div ref={mapRef} style={{ width: '100%', height: 400 }} />
    </>
  );
}
```

---

### ⚠️ 인증 오류 발생 시 체크리스트

| 오류 코드                       | 원인                     | 해결 방법                 |
| --------------------------- | ---------------------- | --------------------- |
| `401 Unauthorized`          | 등록된 URL과 실제 접속 URL 불일치 | NCP 콘솔에서 URL 정확히 등록   |
| `024 Authentication failed` | 잘못된 ncpKeyId 입력        | 환경 변수 재확인             |
| `window.naver is undefined` | 스크립트 로드 전 지도 접근        | `<Script onReady>` 사용 |

---

## 4️⃣ 지역 검색 API 연동 (서버 사이드)

### ✅ 콘솔 등록 경로

> [https://developers.naver.com/apps/#/register](https://developers.naver.com/apps/#/register)

1. **새 애플리케이션 등록**
2. **사용 API → “검색” 선택**
3. 등록 후 **Client ID / Client Secret** 확인

---

### ✅ 환경 변수 설정

`.env.local`

```bash
NAVER_SEARCH_CLIENT_ID=발급받은_Client_ID
NAVER_SEARCH_CLIENT_SECRET=발급받은_Client_Secret
```

> `NEXT_PUBLIC_` 붙이지 않음 (서버 전용 키)

---

### ✅ API 호출 코드 (Next.js Server Action)

```typescript
'use server';

export async function searchLocalPlaces(query: string) {
  if (!query) return [];

  const url = new URL('https://openapi.naver.com/v1/search/local.json');
  url.searchParams.set('query', query);
  url.searchParams.set('display', '5'); // 현재 최대 5개 제한

  const res = await fetch(url.toString(), {
    headers: {
      'X-Naver-Client-Id': process.env.NAVER_SEARCH_CLIENT_ID!,
      'X-Naver-Client-Secret': process.env.NAVER_SEARCH_CLIENT_SECRET!,
    },
    cache: 'no-store',
  });

  if (!res.ok) throw new Error(`API Error ${res.status}`);
  const data = await res.json();
  return (data.items || []).map((item: any) => ({
    ...item,
    title: item.title.replace(/<[^>]*>?/g, ''), // <b> 태그 제거
  }));
}
```

---

### ✅ 예시 UI (클라이언트)

```tsx
'use client';
import { useState } from 'react';
import { searchLocalPlaces } from './actions/search';

export default function SearchBox() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = await searchLocalPlaces(query);
    setResults(data);
  };

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="예: 강남 맛집" />
        <button type="submit">검색</button>
      </form>
      <ul>
        {results.map((r: any, i) => (
          <li key={i}>{r.title} — {r.address}</li>
        ))}
      </ul>
    </div>
  );
}
```

---

## 5️⃣ 인증정보 및 보안 관리

| 구분     | 변수명                                                    | 노출 여부        | 위치                   | 설명                  |
| ------ | ------------------------------------------------------ | ------------ | -------------------- | ------------------- |
| 지도 SDK | `NEXT_PUBLIC_NAVER_MAPS_KEY_ID`                        | 🔓 공개 가능     | `.env.local`         | 브라우저 로딩용, 도메인 제한 있음 |
| 검색 API | `NAVER_SEARCH_CLIENT_ID`, `NAVER_SEARCH_CLIENT_SECRET` | 🔒 비공개       | `.env.local`         | 서버 전용               |
| 공통     | `.env.local`                                           | ❌ 깃허브 업로드 금지 | `.gitignore`에 반드시 포함 |                     |

---

## 6️⃣ 자주 발생하는 문제 요약

| 문제 상황                    | 원인                       | 해결                                   |
| ------------------------ | ------------------------ | ------------------------------------ |
| 지도 안 뜸                   | 잘못된 `ncpKeyId` / URL 불일치 | NCP Application 도메인 등록 재확인           |
| “인증 실패” 팝업               | 공공/금융용 키 사용 중            | 신규 `ncpKeyId`로 교체 필요                 |
| `window.naver undefined` | Script 로드 전 접근           | `<Script onReady>` 또는 `useEffect` 사용 |
| 검색 결과 `<b>` 태그 포함        | 네이버 하이라이트 표시             | 정규식으로 HTML 태그 제거                     |

---

## ✅ 결론 요약

| 항목    | 사용 수단                                       | 발급 경로                                                                                  | 호출 환경                              |
| ----- | ------------------------------------------- | -------------------------------------------------------------------------------------- | ---------------------------------- |
| 지도 표시 | **NAVER Maps JavaScript SDK (Dynamic Map)** | [Naver Cloud Platform → Maps Application](https://console.ncloud.com/maps/application) | **클라이언트 컴포넌트**                     |
| 장소 검색 | **NAVER Local Search API**                  | [Naver Developers → 검색 API 등록](https://developers.naver.com/apps/#/register)           | **서버(Server Action or API Route)** |

---

📚 **참고 공식 문서**

* [Maps API 개요](https://guide.ncloud-docs.com/docs/application-maps-overview)
* [Maps API 사용(VPC)](https://guide.ncloud-docs.com/docs/application-maps-app-vpc)
* [NAVER Developers 지역 검색 API](https://developers.naver.com/docs/serviceapi/search/local/local.md)
* [Next.js 환경 변수 관리 가이드](https://nextjs.org/docs/app/building-your-application/configuring/environment-variables)

---

✅ **최종 정리 핵심**

> * 지도 SDK는 **`ncpKeyId`** 사용 (기존 `ncpClientId` 폐기)
> * 콘솔 등록 경로는 **“Application Services → Maps → Application”**
> * 웹에서는 **Dynamic Map** 필수
> * 주소 변환 기능은 **Geocoding / Reverse Geocoding 추가 선택**
> * 검색 API는 **서버 사이드 호출**, 보안 유지 필수
