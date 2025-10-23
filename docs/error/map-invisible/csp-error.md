## Error
1.
Request URL
http://localhost:3000/?_rsc=1oqwi
Referrer Policy
strict-origin-when-cross-origin

2.
Request URL
https://nrbe.map.naver.net/styles/
basic/1760694936/13/6985/3172.png?mt=bg.ol.sw.ar.lko

3.
Request URL
https://nrbe.map.naver.net/styles/basic.json?
fmt=png&callback=__naver_maps_callback__1

https://nrbe.map.naver.net/styles/terrain.json?
fmt=png&callback=__naver_maps_callback__2
Referrer Policy
strict-origin-when-cross-origin

5.
Request URL
https://nrbe.map.naver.net/styles/satellite.json?
fmt=png&callback=__naver_maps_callback__3
Referrer Policy
strict-origin-when-cross-origin

6.
Request URL
https://nrbe.map.naver.net/styles/
basic/1760694936/13/6985/3172.png?mt=bg.ol.sw.ar.lko
Referrer Policy
strict-origin-when-cross-origin


## Solution
지도 컨테이너의 높이가 0px입니다. section은 1198px의 높이를 가지고 있지만, 지도 div는 높이가 0px입니다.
추가로 CSP nonce가 제대로 전달되지 않는 문제도 있습니다.

문제점 요약
1. 주요 문제: 지도 컨테이너 높이가 0px
section 요소는 flex-1 클래스를 가지고 있어 1198px 높이를 가짐
하지만 지도 컨테이너 div는 h-full 클래스를 가지고 있음에도 불구하고 높이가 0px
이는 Tailwind의 h-full이 부모의 명시적인 높이에 의존하기 때문
2. 부차적 문제: CSP nonce 미전달
네이버 지도 스크립트 태그에 nonce 속성이 비어있음
useNaverMapScript 훅에서 nonce를 가져오지만 실제로 적용되지 않음
3. 네트워크 에러
네이버 지도 스타일 파일들이 ERR_CONNECTION_REFUSED로 실패
이는 네이버 서버 측 일시적 문제일 수 있음
수정 계획
지도 컨테이너 높이 수정 (최우선)
src/app/page.tsx의 section 요소에 명시적인 높이 지정
또는 main 요소를 flex container로 만들고 section이 flex-grow하도록 수정
CSP nonce 전달 확인
useNaverMapScript에서 nonce가 제대로 스크립트 태그에 적용되는지 확인
디버깅 로그 추가
네이버 지도 스타일 로드 에러 모니터링
이는 네이버 측 문제일 가능성이 높으므로 재시도 로직이 작동하는지 확인