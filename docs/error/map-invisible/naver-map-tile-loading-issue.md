# 네이버 지도 타일 로딩 실패 문제

## 문제 상황
네이버 지도 컨테이너는 정상적으로 렌더링되지만, 지도 타일이 표시되지 않고 회색 배경만 보임.

## 에러 메시지
```
Failed to load resource: net::ERR_CONNECTION_REFUSED
- https://nrbe.map.naver.net/styles/basic.json?fmt=png&callback=__naver_maps_callback__1
- https://nrbe.map.naver.net/styles/terrain.json?fmt=png&callback=__naver_maps_callback__2
- https://nrbe.map.naver.net/styles/satellite.json?fmt=png&callback=__naver_maps_callback__3
```

콘솔 메시지:
```
NAVER Maps JavaScript API v3
일시적인 서비스 오류입니다. 잠시 후 다시 시도해 주세요.
```

## 원인 분석

### 1. 네트워크 연결 문제
`ERR_CONNECTION_REFUSED`는 서버에 연결할 수 없다는 의미로, 다음 원인들이 가능합니다:

1. **방화벽/프록시 차단**
   - `nrbe.map.naver.net` 도메인이 차단되어 있을 수 있음
   - 회사/학교 네트워크에서 외부 지도 서비스 차단

2. **DNS 해석 실패**
   - DNS 서버에서 `nrbe.map.naver.net`을 해석하지 못함
   - 로컬 DNS 캐시 문제

3. **네이버 서버 일시적 다운** (가능성 낮음)
   - 네이버 지도 스타일 서버의 일시적 장애

4. **지역 제한**
   - 특정 지역에서 네이버 지도 서비스 접근 제한

### 2. 네이버 지도 SDK 상태
- ✅ 메인 스크립트 로드 성공: `https://oapi.map.naver.com/openapi/v3/maps.js`
- ✅ 인증 성공: `https://oapi.map.naver.com/v3/auth`
- ✅ 지도 초기화 성공: 컨테이너 1198px 높이
- ❌ 스타일 파일 로드 실패: `https://nrbe.map.naver.net/styles/*.json`

## 진단 방법

### 1. 네트워크 연결 테스트
```bash
# DNS 해석 확인
nslookup nrbe.map.naver.net

# 핑 테스트
ping nrbe.map.naver.net

# 직접 HTTP 요청
curl -I https://nrbe.map.naver.net/styles/basic.json?fmt=png
```

### 2. 브라우저에서 직접 접근
브라우저 주소창에 다음 URL 입력:
```
https://nrbe.map.naver.net/styles/basic.json?fmt=png
```

### 3. 방화벽 확인
- Windows 방화벽 설정 확인
- 안티바이러스 소프트웨어 확인
- 회사/학교 네트워크 정책 확인

### 4. 프록시/VPN 확인
- 프록시 설정 비활성화
- VPN 연결 해제 후 재시도

## 해결 방안

### 방안 1: 네트워크 환경 변경
1. **다른 네트워크에서 테스트**
   - 모바일 핫스팟 사용
   - 다른 Wi-Fi 네트워크 시도

2. **방화벽 예외 추가**
   - `nrbe.map.naver.net` 도메인 허용
   - `*.map.naver.net` 와일드카드 허용

3. **DNS 변경**
   ```
   Google DNS: 8.8.8.8, 8.8.4.4
   Cloudflare DNS: 1.1.1.1, 1.0.0.1
   ```

### 방안 2: CSP 설정 확인 (이미 완료)
현재 CSP 설정 (`src/constants/security.ts`):
```typescript
const NAVER_DOMAINS: DirectiveSources = [
  "https://oapi.map.naver.com",
  "https://*.naver.com",
  "https://*.naver.net",  // nrbe.map.naver.net 포함
  "https://*.ntruss.com",
  "https://*.pstatic.net",
  "https://*.map.naver.net",
];
```

### 방안 3: 네이버 지도 API 키 확인
1. **환경 변수 확인**
   ```bash
   # .env.local
   NEXT_PUBLIC_NAVER_MAPS_KEY_ID=your_key_id
   ```

2. **네이버 클라우드 플랫폼 확인**
   - API 키 상태 확인
   - 도메인 제한 설정 확인 (localhost 허용 여부)
   - 사용량 제한 확인

### 방안 4: 재시도 로직 강화
현재 `useNaverMapScript`에 재시도 로직이 있지만, 스타일 파일 로드 실패는 네이버 SDK 내부에서 처리됩니다.

### 방안 5: 대체 지도 서비스 고려
네이버 지도 타일 로드가 계속 실패할 경우:
- Kakao Maps API
- Google Maps API
- OpenStreetMap

## 현재 상태

### ✅ 해결된 문제
1. 지도 컨테이너 높이 0px → 1198px (section 전체 높이)
2. 지도 영역이 화면에 표시됨

### ❌ 미해결 문제
1. 네이버 지도 타일이 로드되지 않음 (`ERR_CONNECTION_REFUSED`)
2. 회색 배경만 표시됨

### 🔍 추가 조사 필요
1. 사용자의 네트워크 환경 확인
2. 방화벽/프록시 설정 확인
3. 다른 네트워크에서 테스트

## 임시 해결책

사용자가 네트워크 환경을 변경할 수 없는 경우:

1. **에러 메시지 개선**
   ```typescript
   // 네이버 지도 타일 로드 실패 시 명확한 메시지 표시
   "네이버 지도 타일을 불러올 수 없습니다. 
    네트워크 연결을 확인하거나 방화벽 설정을 확인해주세요."
   ```

2. **폴백 UI 제공**
   - 지도 없이 음식점 목록만 표시
   - 주소 기반 검색 기능 제공

3. **대체 지도 서비스 통합**
   - Kakao Maps를 백업으로 사용
   - 환경 변수로 지도 제공자 선택 가능하게 구현

## 참고 사항

- 이 문제는 **코드 문제가 아닌 네트워크/환경 문제**입니다
- 네이버 지도 SDK 자체는 정상적으로 로드되고 초기화됩니다
- 지도 컨테이너도 정상적으로 렌더링됩니다
- 오직 타일 이미지 로드만 실패하고 있습니다

## 다음 단계

1. 사용자에게 네트워크 환경 확인 요청
2. 다른 네트워크에서 테스트
3. 방화벽 로그 확인
4. 필요시 대체 지도 서비스 검토

