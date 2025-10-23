- 참고 링크 : https://web.dev/articles/csp?utm_source=devtools&utm_campaign=stable&hl=ko#inline_code_is_considered_harmful


제공된 HTML은 웹 페이지의 보안을 강화하는 **콘텐츠 보안 정책(Content Security Policy, CSP)**에 대한 기술 문서입니다. 주요 내용을 아래와 같이 자세하게 정리해 드립니다.

### 콘텐츠 보안 정책 (CSP) 이란?

CSP는 교차 사이트 스크립팅(Cross-Site Scripting, XSS)과 같은 특정 유형의 공격을 탐지하고 완화하기 위해 추가된 보안 계층입니다. CSP를 사용하면 웹사이트 관리자가 브라우저에 어떤 출처(source)의 콘텐츠를 신뢰할 수 있는지 명시할 수 있습니다.

---

### CSP의 주요 구성 요소 및 구현 단계

효과적인 CSP를 구현하기 위한 핵심 단계는 다음과 같습니다.

1.  **소스 허용 목록(Allowlist) 사용**: 신뢰할 수 있는 콘텐츠 소스의 목록을 만들어 브라우저에 전달합니다.
2.  **지시문(Directives) 활용**: `script-src`, `style-src` 등 다양한 지시어를 사용해 리소스 유형별로 정책을 설정합니다.
3.  **인라인 코드 및 `eval()` 제한**: 보안에 취약한 인라인 JavaScript 및 CSS, `eval()` 함수의 사용을 피합니다.
4.  **정책 위반 보고**: 정책을 위반하는 사례가 발생하면 지정된 URL로 보고서를 받아 분석하고 정책을 개선합니다.

---

### 1. 소스 허용 목록 (Source Allow Lists)

XSS 공격은 신뢰할 수 있는 스크립트와 악의적으로 삽입된 스크립트를 브라우저가 구분하지 못하는 점을 악용합니다. CSP는 `Content-Security-Policy` HTTP 헤더를 통해 신뢰할 수 있는 콘텐츠 소스의 '허용 목록'을 만들어, 이 목록에 없는 소스의 리소스는 실행되거나 렌더링되지 않도록 차단합니다.

**예시:**
```http
Content-Security-Policy: script-src 'self' https://apis.google.com
```
*   `script-src`: 스크립트 파일에 대한 정책을 정의하는 지시문입니다.
*   `'self'`: 현재 페이지와 동일한 출처의 스크립트를 허용합니다.
*   `https://apis.google.com`: 해당 URL의 스크립트를 추가로 허용합니다.
*   위 정책에 따라 브라우저는 현재 도메인과 `https://apis.google.com`에서 온 스크립트만 실행합니다.

#### **주요 리소스 지시문**

| 지시문 | 설명 |
| :--- | :--- |
| `default-src` | 다른 `-src` 지시문이 설정되지 않았을 때의 기본값을 정의합니다. |
| `script-src` | JavaScript 소스를 제한합니다. |
| `style-src` | CSS 스타일시트 소스를 제한합니다. |
| `img-src` | 이미지 소스를 제한합니다. |
| `connect-src` | XHR, WebSocket 등 연결할 수 있는 출처를 제한합니다. |
| `font-src` | 웹 폰트 소스를 지정합니다. |
| `child-src` | 웹 워커(worker)나 `<iframe`> 같은 프레임 콘텐츠의 URL을 지정합니다. |
| `frame-ancestors` | `<frame>`, `<iframe>` 등으로 현재 페이지를 삽입할 수 있는 출처를 지정합니다. |
| `report-uri` | 정책 위반 시 브라우저가 보고서를 보낼 URL을 지정합니다. |

---

### 2. 인라인 코드 피하기

CSP의 가장 강력한 기능 중 하나는 인라인 스크립트를 금지하는 것입니다. 악의적인 스크립트가 페이지에 직접 삽입되는 것을 막기 위함입니다.

*   **금지 대상**: `<script>` 태그 내의 코드, `onclick` 같은 인라인 이벤트 핸들러, `javascript:` URL.
*   **해결 방법**:
    *   JavaScript 코드를 별도의 외부 파일(`.js`)로 분리합니다.
    *   이벤트 핸들러는 `addEventListener()`를 사용하여 코드 내에서 등록합니다.

#### **인라인 스크립트 임시 허용 방법**

부득이하게 인라인 스크립트를 사용해야 할 경우, 두 가지 방법이 있습니다.

1.  **Nonce 사용**: 매 요청마다 추측 불가능한 임의의 값을 생성하여 `<script>` 태그의 `nonce` 속성에 추가하고, CSP 헤더에도 동일한 값을 명시합니다.
    ```html
    <script nonce="EDNnf03nceIOfn39fn3e9h3sdfa">...</script>
    ```
    ```http
    Content-Security-Policy: script-src 'nonce-EDNnf03nceIOfn39fn3e9h3sdfa'
    ```

2.  **해시(Hash) 사용**: 인라인 스크립트 내용의 SHA 해시 값을 계산하여 CSP 헤더에 명시합니다.
    ```http
    Content-Security-Policy: script-src 'sha256-qznLcsROx4GACP2dm0UCKCzCG-HiZ1guq6ZZDob_Tng='
    ```

---

### 3. `eval()` 사용 자제

`eval()`, `new Function()`, `setTimeout([string])` 등 문자열을 코드로 변환하여 실행하는 함수들은 악성 코드 실행에 사용될 수 있어 CSP는 기본적으로 이를 차단합니다.

*   **대안**:
    *   JSON 파싱에는 `JSON.parse()`를 사용합니다.
    *   `setTimeout` 등에는 문자열 대신 함수를 직접 인자로 전달합니다.

만약 `eval` 사용이 불가피하다면, `script-src` 지시문에 `'unsafe-eval'` 키워드를 추가하여 허용할 수 있지만 권장되지 않습니다.

---

### 4. 정책 위반 신고 (Reporting)

정책을 처음 적용하거나 테스트할 때 `Content-Security-Policy-Report-Only` 헤더를 사용할 수 있습니다. 이 헤더는 정책을 실제로 적용(차단)하지는 않고, 위반 사례가 발생할 경우 `report-uri`에 지정된 URL로 JSON 형식의 보고서만 전송합니다. 이를 통해 실제 운영에 영향을 주지 않으면서 정책을 검증하고 수정할 수 있습니다.

**보고서 예시:**
```json
{
  "csp-report": {
    "document-uri": "http://example.org/page.html",
    "referrer": "http://evil.example.com/",
    "blocked-uri": "http://evil.example.com/evil.js",
    "violated-directive": "script-src 'self' https://apis.google.com",
    "original-policy": "..."
  }
}
```

---

### 실제 사용 사례

*   **소셜 미디어 위젯**: 페이스북 '좋아요'나 X(트위터) '트윗' 버튼 등 외부 위젯을 사용할 경우, 해당 위젯이 필요로 하는 스크립트 및 프레임 출처를 `script-src`와 `child-src`에 추가해야 합니다.
*   **잠금(Lockdown)**: 금융 사이트처럼 보안이 중요한 경우, `default-src 'none'`으로 모든 것을 차단한 후 이미지, 스크립트 등 필요한 리소스만 CDN 주소나 자체 도메인으로 명시적으로 허용합니다.
*   **SSL만 허용**: 모든 리소스가 HTTPS를 통해서만 로드되도록 강제하고 싶을 때 `default-src https:` 와 같이 설정할 수 있습니다.

이 문서는 CSP를 통해 웹 애플리케이션의 보안을 크게 향상시키는 방법을 체계적으로 안내하고 있습니다.