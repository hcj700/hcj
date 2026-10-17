# 자율성과지표 성과관리 대시보드 — GitHub · Netlify 배포판

대구과학대학교 전문대학혁신지원사업단 자율성과지표 성과관리 웹페이지입니다.
**접속 코드와 수정 PIN 없이** 주소만 알면 누구나 열람하고 실적을 수정할 수 있는 버전입니다.

| 주소 | 용도 |
|---|---|
| `https://<사이트이름>.netlify.app/` | 대시보드(도넛 그래프, 세부지수, 연차별 경로, AI 요약보고서) |
| `https://<사이트이름>.netlify.app/admin.html` | 실적 입력(로그인 없음, 수정자 이름만 입력) |

---

## 1. GitHub에 올리기 (약 5분)

1. https://github.com 에 로그인 → 오른쪽 위 **+ → New repository**
2. Repository name 예: `aid-dashboard` / 공개 범위는 **Private(비공개)** 권장 → **Create repository**
3. 생성된 화면에서 **uploading an existing file** 클릭
4. 이 폴더(`aid-netlify`) **안의 파일과 폴더 전체**를 끌어다 놓기
   - `netlify.toml`, `package.json`, `public/`, `netlify/` 가 저장소 맨 위에 보여야 합니다.
5. **Commit changes** 클릭

> git 명령어를 쓰는 경우: `git init && git add . && git commit -m "초기 배포" && git branch -M main && git remote add origin <저장소주소> && git push -u origin main`

## 2. Netlify에 연결하기 (약 5분)

1. https://app.netlify.com 에 GitHub 계정으로 로그인
2. **Add new site → Import an existing project → GitHub** → 방금 만든 저장소 선택
3. 설정 화면은 `netlify.toml`이 자동으로 채우므로 그대로 **Deploy** 클릭
   - Publish directory: `public` / Functions directory: `netlify/functions` (자동)
4. 1~2분 뒤 `https://임의이름.netlify.app` 주소가 생깁니다.
5. 주소 변경: **Site configuration → Change site name** (예: `dsc-aid-dashboard` → `https://dsc-aid-dashboard.netlify.app`)

이후 GitHub 저장소의 파일을 수정하면 Netlify가 **자동으로 다시 배포**합니다.

## 3. AI 요약보고서 켜기 (선택)

1. Anthropic 콘솔(https://console.anthropic.com)에서 Claude API 키 발급(사용량만큼 비용 발생)
2. Netlify **Site configuration → Environment variables → Add a variable**

| Key | Value | 필수 |
|---|---|---|
| `ANTHROPIC_API_KEY` | `sk-ant-...` | 필수 |
| `AI_MODEL` | `claude-sonnet-5-5` | 선택(기본값) |
| `AI_MAX_PER_HOUR` | `30` | 선택(사이트 전체 시간당 호출 한도) |

3. **Deploys → Trigger deploy → Deploy site**로 다시 배포하면 적용됩니다.

- API 키는 Netlify 서버에만 저장되고 브라우저에는 전달되지 않습니다.
- 같은 데이터는 30분간 이전 결과를 재사용하고, 호출은 시간당 한도로 제한해 비용을 관리합니다.
- AI 요약은 실행시간 제한이 없는 Edge Function에서 스트리밍으로 처리해, 응답이 길어도 끊기지 않게 했습니다.
- 키를 등록하지 않아도 팝업의 "자동 집계 보고" 탭은 항상 사용할 수 있습니다.

## 4. 데이터 저장 방식

- 실적 데이터는 **Netlify Blobs**(Netlify 내장 저장소)에 저장됩니다. 별도 데이터베이스 설정이 필요 없습니다.
- 최초 데이터는 `netlify/lib/seed.mjs`이며, **저장소가 비어 있을 때만** 사용됩니다.
  GitHub에서 코드를 고쳐 재배포해도 화면에서 입력한 실적은 **지워지지 않습니다.**
- 저장할 때마다 직전 자료를 자동 백업(최근 50개)하며, 실적 입력 화면 하단 **변경 이력**에서 되돌릴 수 있습니다.
- 두 사람이 동시에 수정하면 나중에 저장한 사람에게 "다른 사용자가 먼저 저장했습니다" 안내가 나오고, 덮어쓰기를 막습니다.

## 5. 화면 기능 요약

- 지표별 도넛 그래프: 진척률 90% 이상 초록, 60~90% 노랑, 60% 미만 빨강(30% 미만 매우 부진)
- 실시간 시계, 측정기간 경과율과 상태 자동 판정, 다크/일반 모드
- **AI 요약보고서**(우측 상단): AI 분석 보고 / 자동 집계 보고 탭, 텍스트 복사, 인쇄·PDF
- 다른 사람이 저장한 실적은 열려 있는 대시보드에 30초 이내 자동 반영

## 6. 보안·운영 유의사항 (로그인 없는 버전)

이 버전은 요청에 따라 **접속 코드와 수정 PIN을 없앴습니다.** 그래서 다음을 꼭 확인해 주십시오.

- **주소를 아는 사람은 누구나 수정할 수 있습니다.** 주소는 사업단 내부에만 공유하십시오.
- 검색엔진 노출을 막는 설정(`noindex`)을 넣었지만, 주소가 외부로 퍼지는 것까지 막지는 못합니다.
- 잘못 수정되면 **변경 이력 → 이 버전으로 되돌리기**로 복구합니다. 이력에는 수정자 이름과 시각이 남습니다.
  다만 이름은 본인이 입력하는 값이므로 신원 확인 수단은 아닙니다.
- AI 기능을 켠 경우 누구나 AI 요약을 실행할 수 있으므로 `AI_MAX_PER_HOUR`로 비용 상한을 관리하십시오.
- 나중에 보호가 필요해지면 Netlify의 **Site configuration → Access control → Password protection**(유료 요금제)이나,
  이 코드에 수정 PIN을 다시 추가하는 방법이 있습니다.
- 담당자 개인정보는 필요한 범위에서만 입력하십시오.

## 7. 폴더 구성

```
aid-netlify/
├─ netlify.toml                  배포 설정(빌드 없음, 보안 헤더)
├─ package.json                  저장소 모듈(@netlify/blobs)
├─ public/                       화면
│  ├─ index.html                 대시보드
│  ├─ admin.html                 실적 입력(로그인 없음)
│  └─ assets/                    스타일·계산·AI 스크립트
└─ netlify/
   ├─ functions/data.mjs         /api/data    실적 조회·저장(충돌 방지, 자동 백업)
   ├─ functions/history.mjs      /api/history 변경 이력·되돌리기
   ├─ edge-functions/ai-summary.js  /api/ai-summary AI 요약(스트리밍)
   ├─ edge-functions/ai-status.js   /api/ai-status  AI 사용 가능 여부
   └─ lib/                       공통 함수, 최초 데이터(seed), AI 지시문(prompt)
```

## 8. 문제 해결

| 증상 | 확인할 것 |
|---|---|
| 화면에 "데이터를 불러오지 못했습니다" | Netlify **Deploys** 로그에서 Functions 배포 성공 여부 확인 |
| 저장 시 오류 | **Logs → Functions → data** 로그 확인 |
| AI 탭에 "설정되지 않았습니다" | 환경변수 `ANTHROPIC_API_KEY` 등록 후 **재배포**했는지 확인 |
| AI 오류 "모델 이름" | `AI_MODEL` 값을 Anthropic 문서의 현재 모델명으로 수정 |
| 처음 상태로 되돌리고 싶음 | 변경 이력의 가장 오래된 "초기 자료" 버전으로 되돌리기 |
