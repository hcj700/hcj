// 최초 데이터(저장소가 비어 있을 때 사용). 배포 후에는 실적 입력 화면에서 수정합니다.
export default {
  "meta": {
    "university": "대구과학대학교",
    "unit": "전문대학혁신지원사업단",
    "director": "황철준 사업단장",
    "yearLabel": "2026학년도 · 3주기 혁신지원사업 2차년도",
    "periodStart": "2026-03-01",
    "periodEnd": "2027-02-28",
    "y1AvgRate": 113.0,
    "contact": "[담당자명] · [내선번호]",
    "source": "자율성과지표 정의서 및 1차년도 달성도(사업계획) · 2026학년도 자율성과지표 현황(부서 제출)",
    "updatedAt": "2026-10-16 17:00",
    "updatedBy": "초기 자료",
    "rev": 0
  },
  "thresholds": {
    "green": 90,
    "yellow": 60,
    "red": 30
  },
  "indicators": [
    {
      "id": "future",
      "name": "미래교육혁신지수",
      "base": 57.1,
      "y1Target": 76.5,
      "y1Actual": 88.0,
      "y1Rate": 115.0,
      "subs": [
        {
          "id": "fusion",
          "name": "융합교육 운영",
          "unit": "건",
          "weight": 20,
          "target26": 6,
          "target27": 8,
          "current": 3,
          "kind": "count",
          "dept": "학사운영팀",
          "note": "마이크로디그리 3건 · 나노디그리·융합전공 미집계"
        },
        {
          "id": "ai_learn",
          "name": "AI기반 학습자 맞춤형 학습지원",
          "unit": "명",
          "weight": 30,
          "target26": 61,
          "target27": 78,
          "current": 7,
          "kind": "count",
          "dept": "교수학습지원센터",
          "note": "AI셀터디 7명 · AI적응형 교과 0명(운영 예정)"
        },
        {
          "id": "satisfaction",
          "name": "재학생 교육만족도",
          "unit": "점",
          "weight": 50,
          "target26": 81.2,
          "target27": 81.5,
          "current": 73,
          "kind": "year",
          "dept": "IR센터",
          "note": "학년도 말 조사 · 1차년도 82.3점"
        }
      ]
    },
    {
      "id": "support",
      "name": "학생지원혁신지수",
      "base": 88.4,
      "y1Target": 91.8,
      "y1Actual": 100.3,
      "y1Rate": 109.3,
      "subs": [
        {
          "id": "ai_career",
          "name": "AI기반 진로·취업 설계 지원",
          "unit": "명",
          "weight": 50,
          "target26": 535,
          "target27": 580,
          "current": 434,
          "kind": "count",
          "dept": "취업지원센터",
          "note": "8.31 기준"
        },
        {
          "id": "retention",
          "name": "재학생 수 유지율",
          "unit": "%",
          "weight": 50,
          "target26": 92.6,
          "target27": 92.6,
          "current": null,
          "kind": "point",
          "dept": "학사운영팀",
          "note": "4.1 대비 10.1 재학인원 · 정보공시 반영 필요"
        }
      ]
    },
    {
      "id": "glocal",
      "name": "지·산·학글로컬혁신지수",
      "base": 97.7,
      "y1Target": 98.4,
      "y1Actual": 106.0,
      "y1Rate": 107.7,
      "subs": [
        {
          "id": "coop",
          "name": "지·산·학 협력교육",
          "unit": "건",
          "weight": 40,
          "target26": 1197,
          "target27": 1209,
          "current": 1124,
          "kind": "count",
          "dept": "학사운영팀·현장실습지원센터",
          "note": "캡스톤 4건 + 현장실습 1,120명(계획 기준)"
        },
        {
          "id": "lifelong",
          "name": "열린평생직업교육",
          "unit": "명",
          "weight": 40,
          "target26": 1050,
          "target27": 1060,
          "current": 434,
          "kind": "count",
          "dept": "학사운영팀",
          "note": "선행학습 학점인정 · 1차년도 89.1% 미달"
        },
        {
          "id": "global",
          "name": "재학생 글로벌 핵심역량 향상",
          "unit": "점",
          "weight": 20,
          "target26": 0.2,
          "target27": 0.2,
          "current": 0.18,
          "kind": "year",
          "dept": "IR센터",
          "note": "학년도 초·말 진단검사"
        }
      ]
    },
    {
      "id": "social",
      "name": "사회적책무혁신지수",
      "base": 81.3,
      "y1Target": 85.1,
      "y1Actual": 102.2,
      "y1Rate": 120.2,
      "subs": [
        {
          "id": "moral",
          "name": "재학생 도덕성(Altrism)역량 향상",
          "unit": "점",
          "weight": 30,
          "target26": 0.2,
          "target27": 0.2,
          "current": 0.18,
          "kind": "year",
          "dept": "IR센터",
          "note": "학년도 초·말 진단검사"
        },
        {
          "id": "share",
          "name": "인적·물적 자원 공유·협력",
          "unit": "건",
          "weight": 30,
          "target26": 118,
          "target27": 123,
          "current": 71,
          "kind": "count",
          "dept": "기획팀·학사운영팀·교육환경지원팀",
          "note": "공동교과목 1 · 학점교류 2 · 교육공간 공유 68"
        },
        {
          "id": "spread",
          "name": "성과 공유·확산",
          "unit": "건",
          "weight": 40,
          "target26": 27,
          "target27": 32,
          "current": 18,
          "kind": "count",
          "dept": "기획팀",
          "note": ""
        }
      ]
    }
  ],
  "actions": [
    {
      "level": "red",
      "kind": "매우 부진",
      "dept": "교수학습지원센터",
      "title": "AI 맞춤형 학습지원 11.5% (7/61명)",
      "desc": "1차년도 65명 달성 항목이나 2차년도 실적 부진. AI 적응형 교과는 담당자 변경으로 0명 — 운영 개시 일정 확인 필요"
    },
    {
      "level": "red",
      "kind": "부진",
      "dept": "학사운영팀",
      "title": "열린평생직업교육 41.3% (434/1,050명)",
      "desc": "1차년도에도 89.1%로 유일한 미달 항목. 선행학습 미인정 사례 점검 및 하반기 신청 독려 필요"
    },
    {
      "level": "red",
      "kind": "부진",
      "dept": "학사운영팀",
      "title": "융합교육 운영 50.0% (3/6건)",
      "desc": "마이크로디그리 3건만 집계, 나노디그리·융합전공 실적 미집계. 기획팀 협의 후 실적 반영 필요"
    },
    {
      "level": "yellow",
      "kind": "데이터 정비",
      "dept": "학사운영팀",
      "title": "재학생 수 유지율 미입력",
      "desc": "10.1. 기준 재학인원(정보공시)을 반영해야 학생지원혁신지수가 정상 산출됨"
    },
    {
      "level": "yellow",
      "kind": "데이터 확인",
      "dept": "IR센터",
      "title": "교육만족도 73점 잠정치 여부",
      "desc": "학년도 말 조사 항목으로 1차년도 82.3점 대비 큰 폭 하락 수치. 확정치가 아닌 경우 표기 구분 필요"
    },
    {
      "level": "yellow",
      "kind": "데이터 확인",
      "dept": "현장실습지원센터",
      "title": "현장실습 1,120명 계획 기준 수치",
      "desc": "결과 확정 시 변동 가능. 지·산·학 협력교육 진척률에 직접 영향"
    },
    {
      "level": "gray",
      "kind": "평가 대비",
      "dept": "사업단",
      "title": "2차 목표 < 1차 실적 지표 3개",
      "desc": "학생지원(▼4.2) · 지·산·학글로컬(▼6.8) · 사회적책무(▼9.7). 목표 도전성 소명 자료 준비"
    },
    {
      "level": "gray",
      "kind": "문서 정정",
      "dept": "사업단",
      "title": "재학생 수 유지율 산출식 표현",
      "desc": "\"3차년도 유지율 / n차년도 목표\" → \"n차년도 유지율 / n차년도 목표\"로 정정 필요"
    }
  ]
};
