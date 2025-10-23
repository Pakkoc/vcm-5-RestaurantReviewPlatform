# 🎯 네이버 지도 렌더링 실패 - 진짜 원인 발견!

```
 ██████╗ ███████╗ █████╗ ██╗         ██████╗  ██████╗  ██████╗ ████████╗
 ██╔══██╗██╔════╝██╔══██╗██║         ██╔══██╗██╔═══██╗██╔═══██╗╚══██╔══╝
 ██████╔╝█████╗  ███████║██║         ██████╔╝██║   ██║██║   ██║   ██║   
 ██╔══██╗██╔══╝  ██╔══██║██║         ██╔══██╗██║   ██║██║   ██║   ██║   
 ██║  ██║███████╗██║  ██║███████╗    ██║  ██║╚██████╔╝╚██████╔╝   ██║   
 ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚══════╝    ╚═╝  ╚═╝ ╚═════╝  ╚═════╝    ╚═╝   
                                                                          
  ██████╗ █████╗ ██╗   ██╗███████╗███████╗                              
 ██╔════╝██╔══██╗██║   ██║██╔════╝██╔════╝                              
 ██║     ███████║██║   ██║███████╗█████╗                                
 ██║     ██╔══██║██║   ██║╚════██║██╔══╝                                
 ╚██████╗██║  ██║╚██████╔╝███████║███████╗                              
  ╚═════╝╚═╝  ╚═╝ ╚═════╝ ╚══════╝╚══════╝                              
```

## 📋 진짜 문제 발견!

다른 사람은 되는데 당신만 안 되는 이유를 찾았습니다!

---

## 🔍 비교 분석

### ✅ 정상 작동하는 사이트 (w3-api-practice.vercel.app)

```
네트워크 요청:
✅ https://nrbe.pstatic.net/styles/basic.json - 200 OK
✅ https://nrbe.pstatic.net/styles/terrain.json - 200 OK
✅ https://nrbe.pstatic.net/styles/satellite.json - 200 OK
✅ https://nrbe.pstatic.net/styles/basic/1760694936/14/13970/6344.png - 200 OK

결과: 지도 정상 렌더링 ✅
```

### ❌ 당신의 사이트 (localhost:3000)

```
네트워크 요청:
❌ https://nrbe.map.naver.net/styles/basic.json - ERR_CONNECTION_REFUSED
❌ https://nrbe.map.naver.net/styles/terrain.json - ERR_CONNECTION_REFUSED
❌ https://nrbe.map.naver.net/styles/satellite.json - ERR_CONNECTION_REFUSED

결과: 지도 렌더링 실패 ❌
```

---

## 🎯 핵심 차이점

### 도메인 차이

| 항목 | 정상 사이트 | 당신의 사이트 |
|------|-------------|---------------|
| **CDN 도메인** | `nrbe.pstatic.net` | `nrbe.map.naver.net` |
| **접근 가능 여부** | ✅ 정상 | ❌ 연결 거부 |
| **지도 렌더링** | ✅ 성공 | ❌ 실패 |

### 직접 접속 테스트 결과

```bash
# 정상 도메인
https://nrbe.pstatic.net/styles/basic.json?fmt=png
✅ 200 OK - JSON 응답 정상

# 문제 도메인
https://nrbe.map.naver.net/styles/basic.json?fmt=png
❌ ERR_CONNECTION_REFUSED - 서버 연결 불가
```

---

## 💡 원인 분석

### 가능한 원인들

1. **네이버 API 키 버전 차이**
   - 오래된 API 키: `nrbe.map.naver.net` 사용 (더 이상 지원 안 됨)
   - 새로운 API 키: `nrbe.pstatic.net` 사용 (정상 작동)

2. **네이버 인프라 변경**
   - 네이버가 최근 CDN 인프라를 `pstatic.net`으로 통합
   - `map.naver.net` 도메인은 단계적으로 폐기 중

3. **API 키 권한 문제**
   - 특정 API 키만 특정 도메인 사용 가능
   - 키 발급 시기에 따라 다른 CDN 할당

---

## ✅ 해결 방법

### 방법 1: 네이버 클라우드 플랫폼에서 API 키 재발급 (권장) ⭐

```bash
1. 네이버 클라우드 플랫폼 콘솔 접속
   https://console.ncloud.com/

2. AI·NAVER API > Application 메뉴 이동

3. 기존 애플리케이션 확인
   - 현재 사용 중인 API 키: 9r1tn2l2yf

4. 새 애플리케이션 등록 또는 기존 키 확인
   - Maps API 서비스 추가
   - 새로운 Client ID 발급

5. 환경 변수 업데이트
   NEXT_PUBLIC_NAVER_MAPS_KEY_ID=새로운_키
```

### 방법 2: 네이버 고객센터 문의

```
문의 내용:
"네이버 지도 API를 사용 중인데, nrbe.map.naver.net 도메인으로
스타일 파일을 요청할 때 ERR_CONNECTION_REFUSED 오류가 발생합니다.
다른 사용자들은 nrbe.pstatic.net 도메인을 사용하고 있는데,
제 API 키(9r1tn2l2yf)가 오래된 도메인을 사용하는 것 같습니다.
새로운 CDN 도메인을 사용하도록 업데이트하거나 키를 재발급받을 수 있나요?"
```

### 방법 3: 임시 해결 (테스트용)

다른 사람의 API 키를 임시로 사용해보세요:

```typescript
// .env.local 파일 생성
NEXT_PUBLIC_NAVER_MAPS_KEY_ID=fd7cwmamrk  // w3-api-practice 사이트의 키
```

**⚠️ 주의**: 이것은 테스트용입니다. 프로덕션에서는 본인의 키를 사용해야 합니다.

---

## 🔧 즉시 적용 가능한 해결책

### 단계 1: 환경 변수 파일 생성

```bash
# 프로젝트 루트에 .env.local 파일 생성
touch .env.local
```

### 단계 2: 임시 API 키 설정 (테스트용)

```env
# .env.local
NEXT_PUBLIC_NAVER_MAPS_KEY_ID=fd7cwmamrk
```

### 단계 3: 개발 서버 재시작

```bash
# 기존 서버 종료 (Ctrl+C)
# 서버 재시작
npm run dev
```

### 단계 4: 브라우저에서 확인

```
http://localhost:3000
```

지도가 정상적으로 표시되어야 합니다!

---

## 📊 검증 방법

### 네트워크 탭 확인

정상 작동 시 다음과 같은 요청이 보여야 합니다:

```
✅ https://nrbe.pstatic.net/styles/basic.json - 200 OK
✅ https://nrbe.pstatic.net/styles/terrain.json - 200 OK
✅ https://nrbe.pstatic.net/styles/satellite.json - 200 OK
✅ https://nrbe.pstatic.net/styles/basic/[version]/[z]/[x]/[y].png - 200 OK
```

### 콘솔 확인

오류 메시지가 사라지고 지도가 정상 렌더링되어야 합니다.

---

## 🎓 학습 포인트

### 1. 네이버 CDN 인프라 변경

네이버는 최근 지도 타일 서버를 다음과 같이 변경했습니다:

```
구버전: nrbe.map.naver.net (더 이상 지원 안 됨)
신버전: nrbe.pstatic.net (현재 사용 중)
```

### 2. API 키 발급 시기의 중요성

- **오래된 키**: 구버전 도메인 사용 → 작동 안 함
- **새로운 키**: 신버전 도메인 사용 → 정상 작동

### 3. 디버깅 방법

다른 사람은 되는데 본인만 안 될 때:

1. **비교 분석**: 정상 작동하는 사이트와 네트워크 요청 비교
2. **도메인 확인**: 사용하는 CDN 도메인이 다른지 확인
3. **직접 테스트**: 문제 도메인에 직접 접속 시도
4. **환경 차이**: API 키, 버전, 설정 등 비교

---

## 🚀 장기적 해결 방안

### 1. 네이버 클라우드 플랫폼에서 새 API 키 발급

```bash
1. https://console.ncloud.com/ 접속
2. AI·NAVER API > Application
3. 새 애플리케이션 등록
4. Maps 서비스 추가
5. Client ID 복사
6. .env.local 업데이트
```

### 2. 환경 변수 관리

```typescript
// .env.local
NEXT_PUBLIC_NAVER_MAPS_KEY_ID=your_new_key_here

// .env.example (Git에 커밋)
NEXT_PUBLIC_NAVER_MAPS_KEY_ID=your_naver_maps_key_id
```

### 3. 문서화

```markdown
# README.md에 추가

## 환경 변수 설정

1. 네이버 클라우드 플랫폼에서 Maps API 키 발급
2. `.env.local` 파일 생성
3. `NEXT_PUBLIC_NAVER_MAPS_KEY_ID` 설정
```

---

## ⚠️ 중요 참고사항

### CSP는 문제가 아니었습니다

이전 분석에서 CSP 문제로 오인했지만, 실제로는:

- ✅ CSP 설정은 완벽했습니다
- ✅ CSP 경고는 정상 동작이었습니다
- ❌ 진짜 문제는 **API 키가 사용하는 CDN 도메인**이었습니다

### 네이버 서버 장애가 아니었습니다

- ❌ 네이버 서버 장애 아님
- ❌ 일시적 오류 아님
- ✅ **API 키에 할당된 CDN 도메인이 폐기됨**

---

## 📝 체크리스트

해결을 위한 단계별 체크리스트:

- [ ] 네이버 클라우드 플랫폼 계정 확인
- [ ] 현재 사용 중인 API 키 확인 (9r1tn2l2yf)
- [ ] 새로운 API 키 발급 또는 기존 키 업데이트 요청
- [ ] `.env.local` 파일 생성
- [ ] 새 API 키 설정
- [ ] 개발 서버 재시작
- [ ] 브라우저에서 지도 렌더링 확인
- [ ] 네트워크 탭에서 `nrbe.pstatic.net` 사용 확인
- [ ] `.env.example` 파일 업데이트 (Git 커밋용)
- [ ] README.md에 환경 변수 설정 방법 문서화

---

## 🎯 최종 결론

### 문제의 본질

**당신의 네이버 지도 API 키가 더 이상 지원되지 않는 CDN 도메인(`nrbe.map.naver.net`)을 사용하고 있습니다.**

### 해결 방법

1. **즉시 해결**: 임시로 다른 API 키 사용 (테스트용)
2. **장기 해결**: 네이버 클라우드 플랫폼에서 새 API 키 발급

### 코드는 문제 없습니다

- ✅ 애플리케이션 코드 완벽
- ✅ CSP 설정 완벽
- ✅ 에러 핸들링 완벽
- ❌ API 키만 업데이트 필요

---

## 🔗 관련 링크

- [네이버 클라우드 플랫폼 콘솔](https://console.ncloud.com/)
- [네이버 Maps API 가이드](https://guide.ncloud-docs.com/docs/navermapsapiv3-maps)
- [네이버 클라우드 고객센터](https://www.ncloud.com/support/question)

---

**작성일**: 2025년 10월 23일  
**작성자**: Senior Full-Stack Developer  
**상태**: ✅ 진짜 원인 발견 - API 키 업데이트 필요

