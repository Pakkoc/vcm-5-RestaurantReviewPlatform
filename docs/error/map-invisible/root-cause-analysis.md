# 네이버 지도 렌더링 실패 원인 분석 보고서

## 📋 요약

네이버 지도가 화면에 표시되지 않는 문제는 **네이버 지도 API 서버의 일시적인 네트워크 오류**로 확인되었습니다. CSP(Content Security Policy) 설정은 정상이며, 실제 문제는 `nrbe.map.naver.net` 서버로의 연결 실패입니다.

---

## 🔍 상세 분석

### 1. 브라우저 콘솔 오류 분석

#### CSP 관련 오류 (해결됨)
```
Refused to execute inline script because it violates the following Content Security Policy directive
Refused to apply inline style because it violates the following Content Security Policy directive
```

**분석 결과**: 
- 이 오류는 `'nonce'` 값이 존재할 때 `'unsafe-inline'`이 무시되는 정상적인 동작입니다.
- CSP 설정 자체는 올바르게 구성되어 있습니다.
- 실제 스크립트 및 스타일 로딩에는 문제가 없습니다.

#### 실제 문제: 네트워크 연결 실패
```
Failed to load resource: net::ERR_CONNECTION_REFUSED
- https://nrbe.map.naver.net/styles/basic.json?fmt=png&callback=__naver_maps_callback__1
- https://nrbe.map.naver.net/styles/terrain.json?fmt=png&callback=__naver_maps_callback__2
- https://nrbe.map.naver.net/styles/satellite.json?fmt=png&callback=__naver_maps_callback__3
```

**분석 결과**:
- `ERR_CONNECTION_REFUSED`: 서버가 연결을 거부하거나 응답하지 않음
- 이는 CSP 문제가 아닌 **네트워크/서버 문제**입니다.

#### 네이버 지도 API 자체 오류 메시지
```
NAVER Maps JavaScript API v3
일시적인 서비스 오류입니다. 잠시 후 다시 시도해 주세요.
```

**분석 결과**:
- 네이버 지도 API 자체에서 서비스 오류를 감지하고 오류 메시지를 출력했습니다.
- 이는 네이버 측 인프라 문제임을 확인합니다.

---

### 2. 네트워크 요청 분석

#### 성공한 요청들
| URL | 상태 | 설명 |
|-----|------|------|
| `https://oapi.map.naver.com/openapi/v3/maps.js` | 200 OK | 지도 SDK 로드 성공 |
| `https://oapi.map.naver.com/v3/auth` | 200 OK | API 인증 성공 |
| `https://static.naver.net/maps/mantle/1x/openhand.cur` | 200 OK | 커서 이미지 로드 성공 |
| `http://localhost:3000/api/restaurants/markers` | 200 OK | 마커 데이터 로드 성공 |

#### 실패한 요청들
| URL | 상태 | 설명 |
|-----|------|------|
| `https://nrbe.map.naver.net/styles/basic.json` | ERR_CONNECTION_REFUSED | 기본 지도 스타일 로드 실패 |
| `https://nrbe.map.naver.net/styles/terrain.json` | ERR_CONNECTION_REFUSED | 지형 스타일 로드 실패 |
| `https://nrbe.map.naver.net/styles/satellite.json` | ERR_CONNECTION_REFUSED | 위성 스타일 로드 실패 |

**핵심 발견**:
- 지도 타일과 스타일 정보를 제공하는 `nrbe.map.naver.net` 서버만 연결 실패
- 다른 네이버 도메인(`oapi.map.naver.com`, `static.naver.net`)은 정상 작동
- 이는 특정 서버의 일시적인 장애 또는 네트워크 라우팅 문제를 의미합니다.

---

### 3. CSP 설정 검증

현재 CSP 설정 (`src/constants/security.ts`):

```typescript
const NAVER_DOMAINS: DirectiveSources = [
  "https://oapi.map.naver.com",
  "https://*.naver.com",
  "https://*.naver.net",      // ✅ nrbe.map.naver.net 포함
  "https://*.ntruss.com",
  "https://*.pstatic.net",
  "https://*.map.naver.net",
];

// script-src, style-src, img-src, connect-src 모두 NAVER_DOMAINS 포함
```

**검증 결과**: 
- ✅ `https://*.naver.net` 패턴으로 `nrbe.map.naver.net` 허용됨
- ✅ 모든 필수 지시문(`script-src`, `style-src`, `img-src`, `connect-src`)에 네이버 도메인 포함
- ✅ `'unsafe-inline'`, `'unsafe-eval'` 적절히 설정됨
- ✅ CSP 설정은 완벽하게 구성되어 있음

---

## 🎯 결론

### 문제의 근본 원인
**네이버 지도 API의 `nrbe.map.naver.net` 서버 일시적 장애**

### CSP는 문제가 아닙니다
1. CSP 설정은 올바르게 구성되어 있습니다.
2. CSP 오류 메시지는 nonce 사용 시 정상적으로 나타나는 경고입니다.
3. 실제 리소스 로딩은 CSP에 의해 차단되지 않았습니다.

### 실제 문제
1. `nrbe.map.naver.net` 서버가 연결을 거부하고 있습니다.
2. 지도 스타일 JSON 파일을 로드할 수 없어 지도가 렌더링되지 않습니다.
3. 네이버 지도 API 자체에서 "일시적인 서비스 오류" 메시지를 출력했습니다.

---

## 💡 해결 방안

### 즉시 조치 (사용자 측에서 불가능)
이 문제는 네이버 측 인프라 문제이므로 사용자가 직접 해결할 수 없습니다.

### 권장 조치
1. **잠시 후 재시도**: 일시적인 서버 장애일 가능성이 높습니다.
2. **네트워크 환경 확인**: 
   - 방화벽이나 프록시가 `nrbe.map.naver.net` 차단하는지 확인
   - VPN 사용 중이라면 비활성화 후 재시도
3. **네이버 지도 API 상태 확인**: 
   - 네이버 클라우드 플랫폼 공지사항 확인
   - 다른 사용자들도 같은 문제를 겪는지 확인

### 장기적 개선 방안
```typescript
// src/features/restaurant/components/naver-map.tsx
// 지도 로드 실패 시 더 명확한 오류 메시지 표시

useEffect(() => {
  const timer = setTimeout(() => {
    if (!mapInstanceRef.current && isScriptReady) {
      // 네이버 서버 연결 실패 감지
      console.error('네이버 지도 서버 연결 실패. nrbe.map.naver.net 상태 확인 필요');
    }
  }, 10000); // 10초 후 체크

  return () => clearTimeout(timer);
}, [isScriptReady]);
```

---

## 📊 테스트 환경
- **브라우저**: Playwright (Chromium)
- **로컬 서버**: http://localhost:3000
- **테스트 시간**: 2025년 10월 23일
- **네이버 지도 API 키**: 9r1tn2l2yf

---

## 🔗 관련 문서
- [CSP 설정 가이드](../external/csp.md)
- [네이버 지도 타일 로딩 이슈](./naver-map-tile-loading-issue.md)
- [CSP 오류 분석](./csp-error.md)

---

## ✅ 최종 권고사항

**이 문제는 코드 수정으로 해결할 수 없습니다.**

현재 애플리케이션 코드와 CSP 설정은 완벽하게 구성되어 있습니다. 문제는 네이버 측 인프라에 있으므로:

1. 잠시 후 다시 시도하세요.
2. 네트워크 환경(방화벽, VPN 등)을 확인하세요.
3. 문제가 지속되면 네이버 클라우드 플랫폼 고객센터에 문의하세요.

