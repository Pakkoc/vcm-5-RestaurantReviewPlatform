# Implementation Plan: UC-005 지도 마커 클릭

## 개요

지도 마커 클릭 시 음식점 세부 정보 페이지로 네비게이션하는 기능을 구현합니다.

### 모듈 목록

| 모듈 | 위치 | 설명 |
|------|------|------|
| **NaverMap Component** | `src/features/restaurant/components/naver-map.tsx` | 마커 클릭 이벤트 핸들링 (이미 구현됨) |
| **HomePage** | `src/app/page.tsx` | 마커 클릭 핸들러 (이미 구현됨) |

---

## Diagram

```mermaid
graph TB
    HomePage[HomePage] --> NaverMap[NaverMap]
    NaverMap --> ClickHandler[handleMarkerClick]
    ClickHandler --> Router[Next.js Router]
    Router --> RestaurantDetailPage[/restaurant/:id]

    style ClickHandler fill:#e1f5ff
```

---

## Implementation Plan

### 1. 기존 구현 확인

코드베이스 분석 결과, 이미 구현되어 있음:
- `src/app/page.tsx`의 `handleMarkerClick` 함수
- `router.push(\`/restaurant/${marker.id}\`)`로 네비게이션

### 2. 추가 작업

#### 2.1. 디바운싱 추가 (선택 사항)

**구현 내용**:
```typescript
const [isNavigating, setIsNavigating] = useState(false);

const handleMarkerClick = useCallback(
  (marker: RestaurantMarker) => {
    if (isNavigating) return;
    
    setIsNavigating(true);
    router.push(`/restaurant/${marker.id}`);
    
    // 300ms 후 플래그 해제
    setTimeout(() => setIsNavigating(false), 300);
  },
  [router, isNavigating],
);
```

### 3. QA Sheet

- ✅ 마커 클릭 시 음식점 세부 정보 페이지로 이동
- ✅ 올바른 restaurantId 전달
- ✅ 연속 클릭 방지 (디바운싱)
- ✅ 호버 툴팁 제거 (UC-004와 통합)

### 4. 의존성

- **선행 작업**: UC-001 완료
- **후속 작업**: UC-011 (음식점 세부 정보 페이지 로드)

