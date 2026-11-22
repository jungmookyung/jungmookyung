# 포켓 툴즈 (Pocket Tools)

폰 브라우저 안에서만 동작하는 **7-in-1 생활 도구**입니다.
사진·PDF가 서버로 전송되지 않고, 모든 처리는 기기 안에서 끝납니다.
홈 화면에 추가하면 앱처럼 열 수 있습니다(PWA).

## 들어 있는 도구

| 도구 | 하는 일 |
| --- | --- |
| **EXIF·모자이크** | 사진의 GPS·기기·촬영일시 확인 → 손가락으로 문질러 모자이크 → 정보를 지운 PNG/JPG로 저장 |
| **URL추적제거** | 인스타·스레드·쿠팡 공유 링크에서 `utm_*`, `fbclid`, `igsh`, `sourceType`, `searchId`, `rank` 같은 추적 파라미터만 제거 (쿠팡 itemId·vendorItemId 같은 필수값은 보존) |
| **PDF↔이미지** | PDF 각 페이지를 고해상도 이미지로 변환(개별/ZIP 저장), 사진 여러 장을 순서대로 1개 PDF로 병합 |
| **이미지압축** | 여러 장 한 번에 JPG·PNG·WebP 변환, 품질/최대 해상도 조절, 절감률 표시, 개별/ZIP 저장 |
| **QR생성기** | 링크·텍스트·와이파이 정보를 만료 없는 순수 QR 이미지로 생성(PNG 저장) |
| **비율리사이즈** | 1:1, 4:5, 16:9, 9:16, 3:4 비율에 맞춰 잘리지 않게 조정, 흰/검정/블러 배경 채우기 |
| **워터마크** | 여러 장에 텍스트 또는 로고 워터마크를 한 번에 삽입 (4모서리·중앙·타일, 크기/투명도/색상) |

## 구조

```
index.html              화면(홈 + 7개 도구)
css/app.css             스타일
js/app.js               홈 타일·라우터·설치 배너·서비스워커 등록
js/util.js              공통 유틸(다운로드, ZIP, 캔버스, 이미지 로딩)
js/tools/*.js           도구별 구현
vendor/                 pdf.js, pdf-lib, qrcode-generator, jszip, exifr (로컬 번들)
manifest.webmanifest    PWA 매니페스트
sw.js                   오프라인 캐시용 서비스워커
icons/                  앱 아이콘
```

외부 CDN 없이 모든 라이브러리를 로컬에 두었기 때문에, 한 번 열어두면 인터넷이 없어도 동작합니다.

## 로컬에서 열기

```bash
cd pocket-tools
python3 -m http.server 8000
# 브라우저에서 http://localhost:8000
```

`index.html`을 파일로 직접 열어도 대부분 동작하지만, 서비스워커·클립보드는
`localhost` 또는 HTTPS에서만 동작합니다.

## GitHub Pages로 배포

```bash
# 저장소는 직접 한 번만 만들어 주세요 (GitHub 웹에서 New repository → pocket-tools, Public)
git remote add origin https://github.com/<계정>/pocket-tools.git
git push -u origin main
# Settings → pages → Source: Deploy from a branch → main / (root) → Save
```

잠시 뒤 `https://<계정>.github.io/pocket-tools/` 에서 열립니다.
폰 Chrome에서 주소를 연 다음 **⋮ → 홈 화면에 추가**를 누르면 앱처럼 실행됩니다.

## 개인정보

- 업로드한 사진·PDF는 어디로도 전송되지 않습니다(네트워크 요청 없음).
- EXIF 저장 기능은 캔버스로 다시 인코딩해 메타데이터를 완전히 제거합니다.
- QR은 이미지로만 생성되며, 만료나 추적이 없습니다.
