# 지도 렌더링 문제 분석 보고서

## 문제 상황
- 메인 페이지에서 네이버 지도가 화면에 표시되지 않음
- 로딩 스피너가 사라진 후 빈 화면만 보임

## 상세 분석

### 1. 초기 문제: 지도 컨테이너 높이 0px

**원인**:
- 지도 컨테이너가 `absolute inset-0` 클래스를 사용
- 네이버 지도 SDK가 컨테이너에 인라인 스타일 `position: relative`를 강제로 적용
- 이로 인해 `inset-0`의 효과가 무효화되고 높이가 0px이 됨

**해결**:
```tsx
// Before
<div ref={containerRef} className="absolute inset-0" />

// After  
<div ref={containerRef} className="h-full w-full min-h-[480px]" />
```

**결과**:
- 지도 컨테이너가 480px 높이를 가지게 됨
- 네이버 지도 SDK가 정상적으로 초기화됨

### 2. 현재 문제: 네이버 지도 스타일 파일 로드 실패

**에러 메시지**:
```
Failed to load resource: net::ERR_CONNECTION_REFUSED
- https://nrbe.map.naver.net/styles/basic.json?fmt=png&callback=__naver_maps_callback__1
- https://nrbe.map.naver.net/styles/terrain.json?fmt=png&callback=__naver_maps_callback__2
- https://nrbe.map.naver.net/styles/satellite.json?fmt=png&callback=__naver_maps_callback__3
```

**원인 분석**:
1. **네트워크 연결 문제**: `ERR_CONNECTION_REFUSED`는 서버에 연결할 수 없다는 의미
2. **가능한 원인들**:
   - 네이버 서버 일시적 다운 (가능성 낮음)
   - 방화벽/프록시 설정으로 인한 차단
   - 네이버 지도 API 키 문제
   - DNS 해석 실패
   - 로컬 네트워크 설정 문제

**네이버 지도 SDK 상태**:
- 메인 스크립트 로드: ✅ 성공 (https://oapi.map.naver.com/openapi/v3/maps.js)
- 인증: ✅ 성공 (https://oapi.map.naver.com/v3/auth)
- 지도 초기화: ✅ 성공 (컨테이너 480px 높이)
- 스타일 파일 로드: ❌ 실패 (https://nrbe.map.naver.net/styles/*.json)

**콘솔 메시지**:
```
NAVER Maps JavaScript API v3
일시적인 서비스 오류입니다. 잠시 후 다시 시도해 주세요.
```

### 3. 부차적 문제: CSP Nonce 미적용

**현상**:
- 네이버 지도 스크립트 태그에 nonce 속성이 비어있음
- `useNaverMapScript` 훅에서 nonce를 가져오지만 실제로 적용되지 않음

**영향**:
- CSP 에러 발생: "Refused to execute inline script"
- 하지만 `strict-dynamic` 덕분에 스크립트 자체는 실행됨

**확인 필요**:
```tsx
// src/hooks/useNaverMapScript.ts
if (cspNonce) {
  script.setAttribute("nonce", cspNonce);
}
```

## 수정 사항

### 완료된 수정
1. ✅ 지도 컨테이너 클래스 변경: `absolute inset-0` → `h-full w-full min-h-[480px]`

### 추가 확인 필요
1. ⏳ CSP nonce가 스크립트 태그에 제대로 적용되는지 확인
2. ⏳ 네이버 지도 스타일 파일 로드 실패 원인 파악

## 해결 방안

### 네이버 지도 스타일 파일 로드 실패 해결

#### 방안 1: 네트워크 환경 확인
1. 방화벽 설정 확인
   - `nrbe.map.naver.net` 도메인 허용 여부 확인
   - 포트 443 (HTTPS) 허용 여부 확인

2. DNS 확인
   ```bash
   nslookup nrbe.map.naver.net
   ping nrbe.map.naver.net
   ```

3. 브라우저에서 직접 접근 테스트
   - https://nrbe.map.naver.net/styles/basic.json?fmt=png 접근 시도

#### 방안 2: CSP 설정 확인
현재 CSP 설정 (`src/constants/security.ts`):
```typescript
const NAVER_DOMAINS: DirectiveSources = [
  "https://oapi.map.naver.com",
  "https://*.naver.com",
  "https://*.naver.net",
  "https://*.ntruss.com",
  "https://*.pstatic.net",
  "https://*.map.naver.net",
];
```

`https://*.map.naver.net`가 `https://nrbe.map.naver.net`를 포함해야 함.

#### 방안 3: 네이버 지도 API 키 확인
- 환경 변수 `NEXT_PUBLIC_NAVER_MAPS_KEY_ID` 확인
- 네이버 클라우드 플랫폼에서 API 키 상태 확인
- 도메인 제한 설정 확인 (localhost 허용 여부)

#### 방안 4: 대체 방안
네이버 지도 스타일 파일 로드가 계속 실패할 경우:
1. 에러 핸들링 강화
2. 재시도 로직 추가
3. 폴백 UI 개선

## 다음 단계

1. **서버 재시작 후 재테스트**
   - 로컬 개발 서버가 다운된 상태
   - 서버 재시작 후 브라우저에서 다시 확인

2. **네트워크 진단**
   - 브라우저 개발자 도구 Network 탭에서 실패한 요청 상세 확인
   - 응답 헤더 및 타이밍 정보 확인

3. **CSP Nonce 수정**
   - `useNaverMapScript` 훅에서 nonce 적용 로직 확인
   - 디버깅 로그 추가

4. **커밋**
   - 지도 컨테이너 높이 수정 사항 커밋

## 참고 파일
- `src/features/restaurant/components/naver-map.tsx` - 지도 컴포넌트 (수정됨)
- `src/hooks/useNaverMapScript.ts` - 네이버 지도 SDK 로드 훅
- `src/constants/security.ts` - CSP 설정
- `src/middleware.ts` - CSP 헤더 적용
- `docs/error/csp-error.md` - 이전 CSP 에러 분석

