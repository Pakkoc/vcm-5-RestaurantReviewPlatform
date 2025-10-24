물론입니다. 제공해주신 내용을 보기 쉽게 마크다운 형식으로 정리해 드릴게요.

---

# NAVER 지도 API v3 사용법 요약

## 📑 주요 변경사항

기존에 공공기관용, 금융기관용으로 나뉘어 있던 Maps API가 **개인/일반 기업용으로 통합**되었습니다. 이에 따라 새로운 클라이언트 아이디 발급이 필요하며, API를 불러오는 방식이 변경되었습니다.

> 프로젝트에서는 `NEXT_PUBLIC_NAVER_MAPS_CLIENT_ID`(구 `ncpClientId`)와 `NEXT_PUBLIC_NAVER_MAPS_KEY_ID`(신규 `ncpKeyId`) 중 **사용 가능한 값을 하나만 설정하면 됩니다.** `CLIENT_ID`가 존재하면 `*.pstatic.net` CDN을, `KEY_ID`만 있을 때는 `*.map.naver.net` CDN을 사용합니다.

### 변경 전

-   **일반용**: `?ncpClientId=YOUR_CLIENT_ID`
-   **공공기관용**: `?govClientId=YOUR_CLIENT_ID`
-   **금융기관용**: `?finClientId=YOUR_CLIENT_ID`

```html
<!-- 일반 -->
<script type="text/javascript" src="https://oapi.map.naver.com/openapi/v3/maps.js?ncpClientId=YOUR_CLIENT_ID"></script>
<!-- 공공 -->
<script type="text/javascript" src="https://oapi.map.naver.com/openapi/v3/maps.js?govClientId=YOUR_CLIENT_ID"></script>
<!-- 금융 -->
<script type="text/javascript" src="https://oapi.map.naver.com/openapi/v3/maps.js?finClientId=YOUR_CLIENT_ID"></script>
```

### 변경 후

-   **통합**: `?ncpKeyId=YOUR_CLIENT_ID`

```html
<!-- 개인/일반 통합 -->
<script type="text/javascript" src="https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=YOUR_CLIENT_ID"></script>
```

<br>

## 🗺️ 지도 생성 과정 (4단계)

### 1단계: NAVER 지도 API v3 로드하기

가장 먼저, 발급받은 `ncpKeyId`를 사용하여 아래와 같이 API 스크립트를 페이지에 추가합니다.

```html
<script type="text/javascript" src="https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=YOUR_CLIENT_ID"></script>
```

> **💡 비동기 로드**
> 웹 페이지의 다른 콘텐츠 렌더링을 방해하지 않으려면 `callback` 파라미터를 추가하여 비동기 방식으로 로드할 수 있습니다. API가 준비되면 지정된 콜백 함수가 호출됩니다.
>
> ```html
> <script type="text/javascript" src="https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=YOUR_CLIENT_ID&callback=initMap"></script>
> ```

### 2단계: 지도를 표시할 DOM 요소 지정하기

지도가 삽입될 HTML 요소를 준비합니다. 일반적으로 `<div>` 태그를 사용하며, **반드시 ID와 크기를 지정해야 합니다.**

```html
<div id="map" style="width:100%;height:400px;"></div>
```

### 3단계: 지도 옵션 설정하기

지도의 중심 좌표, 확대 레벨 등 초기 속성을 객체 형태로 설정합니다.

```javascript
var mapOptions = {
    center: new naver.maps.LatLng(37.3595704, 127.105399), // 초기 중심 좌표
    zoom: 10 // 초기 줌 레벨
};
```

### 4단계: 지도 생성하기

`naver.maps.Map` 클래스를 사용하여 새 지도를 생성합니다. 인자로는 **지도를 표시할 DOM 요소의 ID**와 **지도 옵션 객체**를 전달합니다.

```javascript
var map = new naver.maps.Map('map', mapOptions);
```

<br>

## 💻 전체 예제 코드

아래는 NAVER 그린팩토리를 중심으로 하는 지도를 생성하는 전체 예제입니다.

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>간단한 지도 표시하기</title>
    <!-- 1. API 로드 -->
    <script type="text/javascript" src="https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=YOUR_CLIENT_ID"></script>
</head>
<body>
    <!-- 2. 지도를 표시할 DOM 요소 -->
    <div id="map" style="width:100%;height:400px;"></div>

    <script>
    // 3. 지도 옵션 설정
    var mapOptions = {
        center: new naver.maps.LatLng(37.3595704, 127.105399),
        zoom: 10
    };

    // 4. 지도 생성
    var map = new naver.maps.Map('map', mapOptions);
    </script>
</body>
</html>
```

<br>

## ⚠️ 인증 실패 확인

클라이언트 ID 인증이 실패했을 때 특정 동작을 수행하려면, 아래와 같이 전역 함수를 정의할 수 있습니다. 인증 실패 시 이 함수가 자동으로 호출됩니다.

```javascript
window.navermap_authFailure = function() {
    // 인증 실패 시 처리할 코드를 작성합니다.
    console.log("Naver Map API 인증에 실패했습니다.");
};
```

---

## 🧪 로컬 개발 환경 트러블슈팅 (CSP와 HTTP/HTTPS)

### 증상
- 배포(Vercel)에서는 지도 표시, 로컬(예: `localhost:3000`)에서는 빈 화면 + 콘솔에 `ERR_CONNECTION_REFUSED https://nrbe.map.naver.net/...`

### 핵심 원인
- CSP에 포함된 `upgrade-insecure-requests`가 HTTP 요청을 HTTPS로 강제 → 로컬 망에서 `nrbe.map.naver.net:443`이 차단된 경우 실패
- `ncpKeyId`는 `*.map.naver.net`, `ncpClientId`는 `*.pstatic.net` CDN을 사용(방화벽/허용 도메인 차이 가능)

### 해결 Quick Start
1) 개발 환경에서는 CSP를 느슨하게 설정해 HTTP 허용

```ts
// createContentSecurityPolicy (development)
return [
  "default-src *",
  "script-src * 'unsafe-inline' 'unsafe-eval'",
  "style-src * 'unsafe-inline'",
  "img-src * data: blob:",
  "connect-src *",
  "font-src *",
  "frame-src *",
].join('; ');
```

2) 네이버 도메인의 HTTP 스킴 화이트리스트 추가

```ts
const NAVER_DOMAINS = [
  // ... https 도메인들 ...
  'http://*.map.naver.net',
  'http://*.naver.net',
  'http://*.pstatic.net',
];
```

3) 네트워크 점검
- `Test-NetConnection nrbe.map.naver.net -Port 80`(HTTP) vs `-Port 443`(HTTPS)
- HTTP만 성공하면 개발 환경은 HTTP 허용, 운영은 HTTPS 유지(CSP 분기)
