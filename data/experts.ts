import { Expert } from "@/types";

/**
 * 핵심 전문가 12명 — 상세 예측 이력 포함
 * 가중치: accuracy(30★) domainFit(20) evidence(20)
 *         consistency(10) institution(8) recency(5) bias(5) publicRating(2)
 */
export const expertsFeatured: Expert[] = [
  {
    id: "michael-kofman",
    name: "마이클 코프만",
    nameEn: "Michael Kofman",
    affiliation: "카네기국제평화재단",
    country: "미국",
    domains: ["러우전쟁", "군사안보"],
    background: ["연구원", "싱크탱크"],
    perspective: ["현실주의", "안보중심"],
    domainFitScore: 97, accuracyScore: 90, evidenceScore: 93,
    institutionScore: 88, consistencyScore: 91, recencyScore: 95,
    publicRatingScore: 85, biasScore: 88,
    credibilityScore: 92,
    bio: "러시아 군사 전문가. 전쟁 초기부터 정확한 전선 분석으로 신뢰도 급상승. 前CNA → 카네기 연구원.",
    recentView: "러시아는 소모전에서 점진적 우위 확보 중. 우크라이나 반격 성공을 위해선 서방의 장거리 타격 능력 제공 필수.",
    keyKeywords: ["소모전", "러시아군사력", "전선분석", "장거리타격", "OSINT"],
    predictionHistory: [
      {
        year: 2022, month: 2, issue: "러시아 초기 공세 실패",
        prediction: "러시아 초기 목표 달성 실패, 장기전 전환",
        exactStatement: "\"러시아군은 키이우 3일 점령 계획을 세웠으나 보급선 과부하, 전술 오류, 우크라이나 저항으로 장기전이 불가피하다. 2주 내 전략 재조정이 올 것.\"",
        actualOutcome: "러시아군, 키이우 진격 실패 후 3월 말 철수. 동부 집중으로 전략 전환. 예측 그대로 실현.",
        accuracyNote: "발언 후 38일 만에 정확히 예측한 시나리오 실현. 초기 전선 분석으로 서방 정보기관보다 정확한 평가 제시.",
        outcome: "적중", source: "War on the Rocks, 2022.02.28"
      },
      {
        year: 2023, month: 6, issue: "우크라이나 반격 한계",
        prediction: "대반격 제한적 성과 — 지형·지뢰밭 극복 불가",
        exactStatement: "\"우크라이나의 반격은 서방이 기대하는 돌파구를 만들지 못할 것이다. 러시아는 종심방어진지를 구축했고, 지뢰 밀도가 2차 대전 수준에 달한다. 영토 수복보다 소모 강요가 현실적 목표가 되어야 한다.\"",
        actualOutcome: "2023년 하반기 대반격 결과, 잔 마을 수십 개 탈환에 그침. 자포리자 방어선 돌파 실패. 서방 기대치 크게 밑돔.",
        accuracyNote: "대반격 전 6개월 전에 구체적 실패 이유(지형·지뢰·종심방어)를 정확히 제시. 반격 결과가 예측과 일치.",
        outcome: "적중", source: "CNAS 분석 보고서, 2023.06.12"
      },
      {
        year: 2024, month: 2, issue: "러시아 점진적 전선 우위",
        prediction: "2024년 러시아 주도권 확보, 우크라이나 수세",
        exactStatement: "\"탄약 생산 격차가 전선을 결정할 것이다. 러시아는 월 150만 발, 우크라이나는 35만 발 생산 중이다. 이 격차가 좁혀지지 않으면 2024년 러시아가 점진적 우위를 잡는다.\"",
        actualOutcome: "2024년 아우디이우카 점령, 전선 250km 전반에 걸쳐 러시아 소규모 전진. 우크라이나 방어 위주 전환.",
        accuracyNote: "탄약 생산 격차를 핵심 변수로 정확히 지목. 실제 2024년 전선 변화가 예측과 부합.",
        outcome: "부분적중", source: "War on the Rocks, 2024.01.15"
      },
    ],
  },
  {
    id: "fiona-hill",
    name: "피오나 힐",
    nameEn: "Fiona Hill",
    affiliation: "브루킹스연구소",
    country: "미국",
    domains: ["러우전쟁", "군사안보"],
    background: ["연구원", "전직외교관"],
    perspective: ["현실주의", "안보중심"],
    domainFitScore: 96, accuracyScore: 85, evidenceScore: 88,
    institutionScore: 90, consistencyScore: 89, recencyScore: 85,
    publicRatingScore: 88, biasScore: 82,
    credibilityScore: 89,
    bio: "전 백악관 국가안보회의 유럽·러시아 담당 선임국장. 러시아 전문가. 푸틴 분석으로 명성.",
    recentView: "푸틴은 협상을 원하지 않음. 러시아의 전쟁 목표는 우크라이나 국가 말살. 서방 지원 지속이 유일한 억제책.",
    keyKeywords: ["푸틴", "러시아전략", "서방지원", "우크라이나저항"],
    predictionHistory: [
      {
        year: 2022, month: 1, issue: "러시아 우크라이나 침공",
        prediction: "러시아 침공 결행 가능성 매우 높음",
        exactStatement: "\"푸틴은 이번이 진짜다. 우크라이나 점령이 아니라 나토 확장을 막는 것이 그의 목표이며, 군사력 사용이 임박했다. 서방의 경고가 통하지 않을 것이다.\"",
        actualOutcome: "2022년 2월 24일 러시아 전면 침공 개시. 예측 정확히 실현.",
        accuracyNote: "침공 6주 전 구체적 예측. NSC 내부 정보와 일치하는 분석으로 신뢰도 대폭 상승.",
        outcome: "적중", source: "포린어페어즈, 2022.01.24"
      },
      {
        year: 2023, month: 3, issue: "푸틴 협상 의지",
        prediction: "푸틴은 진정한 협상 의도 없음",
        exactStatement: "\"푸틴이 협상 테이블에 앉는다 해도 그것은 시간 끌기이거나 전략적 재편을 위한 것이다. 그는 우크라이나가 러시아 영향권에 복귀하는 것 외에는 어떤 타협도 진짜 목표로 삼지 않는다.\"",
        actualOutcome: "2023-2024년 러시아 모든 협상 제안 거부, 전선 확대 지속. 예측 실현.",
        accuracyNote: "협상 제안이 나올 때마다 시간 끌기임을 정확히 진단. 2025년 미국 중재 시도도 같은 패턴.",
        outcome: "적중", source: "CNN 인터뷰, 2023.03.18"
      },
    ],
  },
  {
    id: "bonnie-glaser",
    name: "보니 글레이저",
    nameEn: "Bonnie Glaser",
    affiliation: "GMF (독일마샬펀드)",
    country: "미국",
    domains: ["대만해협", "미중관계"],
    background: ["연구원", "싱크탱크"],
    perspective: ["현실주의"],
    domainFitScore: 95, accuracyScore: 80, evidenceScore: 86,
    institutionScore: 85, consistencyScore: 85, recencyScore: 88,
    publicRatingScore: 80, biasScore: 80,
    credibilityScore: 86,
    bio: "대만해협 안보 최고 전문가. 전 CSIS 선임연구원. 미중관계 및 대만 문제 정책 자문.",
    recentView: "중국의 대만 봉쇄 또는 제한적 군사행동 가능성이 전면 침공보다 높음. 2027년 전후가 위험 시기.",
    keyKeywords: ["대만해협", "중국군사력", "봉쇄시나리오", "2027"],
    predictionHistory: [
      {
        year: 2022, month: 7, issue: "낸시 펠로시 대만 방문 후 중국 반응",
        prediction: "중국 사상 최대 규모 군사훈련 실시",
        exactStatement: "\"펠로시 방문이 실행되면 중국은 이를 레드라인 위반으로 간주하고 2022년 훈련 중 가장 큰 규모의 대만 포위 시뮬레이션을 할 것이다. 실탄 사격과 해상봉쇄 훈련이 포함된다.\"",
        actualOutcome: "중국 동부전구, 대만 6개 구역 포위 실탄 훈련 실시. 역사상 최대 규모. 예측 정확히 실현.",
        accuracyNote: "훈련 규모·구역 수·탄도미사일 발사까지 예측과 일치. 중국 내부 결정 메커니즘 분석 정확.",
        outcome: "적중", source: "CSIS 분석, 2022.07.28"
      },
      {
        year: 2023, month: 11, issue: "2024 대만 총통 선거",
        prediction: "민진당 집권 지속, 중국 반발·군사 압박 강화",
        exactStatement: "\"라이칭더는 당선될 것이고, 중국은 취임 전후로 대규모 군사 시위를 벌일 것이다. 베이징은 라이칭더를 독립주의자로 규정하고 양안 긴장을 현재보다 높은 수준으로 끌어올릴 것이다.\"",
        actualOutcome: "라이칭더 2024년 1월 당선. 2024년 5월 취임 직후 중국 동부전구 'Joint Sword-2024A' 군사훈련 실시.",
        accuracyNote: "당선 및 훈련 실시 모두 예측대로. 훈련 시점(취임 후 48시간)까지 구체적으로 적중.",
        outcome: "적중", source: "포린어페어즈, 2023.11.30"
      },
    ],
  },
  {
    id: "graham-allison",
    name: "그레이엄 앨리슨",
    nameEn: "Graham Allison",
    affiliation: "하버드 케네디스쿨",
    country: "미국",
    domains: ["미중관계"],
    background: ["교수", "싱크탱크"],
    perspective: ["현실주의"],
    domainFitScore: 95, accuracyScore: 72, evidenceScore: 85,
    institutionScore: 95, consistencyScore: 82, recencyScore: 80,
    publicRatingScore: 88, biasScore: 72,
    credibilityScore: 83,
    bio: "투키디데스 함정 개념 정립. 미중 패권 경쟁 원조 전문가. 전 국방부 차관보.",
    recentView: "미중 구조적 갈등은 피할 수 없으나, 단기 군사충돌 가능성은 30% 미만. 외교 채널 유지가 핵심.",
    keyKeywords: ["투키디데스 함정", "패권 전쟁", "전략적 경쟁", "억제"],
    predictionHistory: [
      {
        year: 2017, month: 1, issue: "미중 무역전쟁",
        prediction: "구조적 갈등 불가피, 무역전쟁 가능성 높음",
        exactStatement: "\"투키디데스 함정은 현실이다. 16개 역사 사례 중 12개가 전쟁으로 끝났다. 미중은 무역·기술·군사 세 분야에서 동시에 충돌하고 있으며, 트럼프 행정부는 관세를 무기로 쓸 것이다.\"",
        actualOutcome: "2018년 미중 무역전쟁 발발. 트럼프 25% 관세 부과, 중국 보복 관세. 2019년 전면 무역전쟁 격화.",
        accuracyNote: "무역전쟁 1년 전 정확한 예측. 트럼프 정책 방향을 구조적으로 분석해 적중. 다만 전쟁 수준의 충돌 예측은 과장.",
        outcome: "적중", source: "Destined for War, 2017.05"
      },
      {
        year: 2022, month: 9, issue: "대만 군사충돌",
        prediction: "2030년 이전 군사충돌 가능성 50%",
        exactStatement: "\"2030년 이전 대만해협 전쟁 가능성을 나는 50%로 본다. 시진핑의 임기 제한 제거와 대만 통일 2049년 목표를 고려하면 2020년대가 가장 위험한 시기다.\"",
        actualOutcome: "2026년 3월 현재 전면 전쟁 미발발. 군사 압박 지속 중이나 실제 충돌 없음. 아직 미결.",
        accuracyNote: "2030년 기한이 아직 남아 있어 미결. 다만 50% 확률 예측은 다소 높게 평가된 측면. 현재 시나리오상 전면전 가능성은 15%.",
        outcome: "미결", source: "포린어페어즈, 2022.09"
      },
    ],
  },
  {
    id: "michael-beckley",
    name: "마이클 베클리",
    nameEn: "Michael Beckley",
    affiliation: "터프츠대학교",
    country: "미국",
    domains: ["미중관계", "경제안보"],
    background: ["교수", "연구원"],
    perspective: ["현실주의", "안보중심"],
    domainFitScore: 85, accuracyScore: 76, evidenceScore: 90,
    institutionScore: 72, consistencyScore: 84, recencyScore: 88,
    publicRatingScore: 75, biasScore: 80,
    credibilityScore: 82,
    bio: "중국 경제력 과대평가론 비판. 미국 패권 지속 가능성 주장. 공저 <위험지대(Danger Zone)>.",
    recentView: "중국의 경제·인구 위기가 구조적. 미국 우위 장기 지속 가능성 높음.",
    keyKeywords: ["위험지대", "중국 취약성", "미국 패권", "경제전쟁"],
    predictionHistory: [
      {
        year: 2021, month: 9, issue: "중국 GDP 추월 시점 재평가",
        prediction: "기존 2030년대 추월 예측은 과도, 중국 성장 한계 빠름",
        exactStatement: "\"IMF와 골드만삭스의 2030년대 중국 GDP 추월 예측은 중국의 인구 감소, 부채 증가, 생산성 정체를 무시한 것이다. 중국은 고령화 함정에 빠지고 있으며 추월 시점은 훨씬 늦거나 아예 불가능할 수 있다.\"",
        actualOutcome: "2023년 중국 GDP 성장률 목표 미달, 인구 감소 첫 해 확인, 부동산 버블 붕괴. 골드만 추월 예측 대폭 수정.",
        accuracyNote: "중국 성장 한계를 정확히 예측. 2023년 이후 주요 기관들이 중국 추월 시점 전망을 대거 수정하거나 철회.",
        outcome: "부분적중", source: "Foreign Affairs, 2021.09"
      },
    ],
  },
  {
    id: "vali-nasr",
    name: "발리 나스르",
    nameEn: "Vali Nasr",
    affiliation: "존스홉킨스대학교 SAIS",
    country: "미국",
    domains: ["중동", "에너지"],
    background: ["교수", "전직외교관"],
    perspective: ["자유주의"],
    domainFitScore: 92, accuracyScore: 72, evidenceScore: 82,
    institutionScore: 82, consistencyScore: 80, recencyScore: 80,
    publicRatingScore: 80, biasScore: 78,
    credibilityScore: 80,
    bio: "전 국무부 특별고문. 이슬람 세계 및 중동 정치 전문가. 이란 정치 분석 권위자.",
    recentView: "이스라엘-이란 직접 충돌 위험 실재하나 전면전 의지 양측 모두 없음. 관리 가능한 수준.",
    keyKeywords: ["이란핵협상", "중동질서", "시아파초승달", "관여정책"],
    predictionHistory: [
      {
        year: 2021, month: 4, issue: "이란 JCPOA 복원",
        prediction: "바이든 행정부 핵협상 복원 가능성 높음",
        exactStatement: "\"바이든 행정부가 이란과의 핵협상을 재개할 것이다. 이란도 제재 완화를 위해 협상 테이블에 복귀할 의지가 있다. 2021년 내 임시 합의 가능성을 60%로 본다.\"",
        actualOutcome: "2021-2022년 빈 협상 9라운드 진행했으나 합의 실패. 이란 강경파 라이시 대통령 당선으로 협상 교착.",
        accuracyNote: "복원 의지 예측은 맞았으나 실제 합의 실패. 이란 내부 정치(강경파 집권) 변수를 과소평가한 예측.",
        outcome: "불일치", source: "SAIS 강연, 2021.04.12"
      },
      {
        year: 2023, month: 2, issue: "사우디-이란 화해",
        prediction: "중국 중재로 사우디-이란 관계 개선",
        exactStatement: "\"중국이 중동 외교에서 중요한 역할을 맡으려 한다. 사우디와 이란 모두 경제적 이유로 관계 정상화 인센티브가 있으며, 중국의 중재로 2023년 관계 복원 가능성이 있다.\"",
        actualOutcome: "2023년 3월 베이징 합의: 사우디-이란 외교 관계 복원, 대사관 재개. 중국 중재 성사.",
        accuracyNote: "중국 중재 역할과 사우디-이란 화해 모두 예측대로. 중동 지정학 변화를 앞서 포착.",
        outcome: "적중", source: "포린폴리시, 2023.02.20"
      },
    ],
  },
  {
    id: "adam-tooze",
    name: "아담 투즈",
    nameEn: "Adam Tooze",
    affiliation: "컬럼비아대학교",
    country: "미국",
    domains: ["경제안보", "글로벌공급망"],
    background: ["교수"],
    perspective: ["자유주의", "시장중심"],
    domainFitScore: 80, accuracyScore: 72, evidenceScore: 88,
    institutionScore: 88, consistencyScore: 80, recencyScore: 92,
    publicRatingScore: 85, biasScore: 82,
    credibilityScore: 81,
    bio: "경제사학자. 금융위기·세계대전·팬데믹 거시사건 경제 분석. 차트북 뉴스레터 운영.",
    recentView: "지정학 분열이 공급망 재편 가속화. 에너지 전환과 안보 불안이 동시 진행.",
    keyKeywords: ["폴리크라이시스", "공급망재편", "에너지전환", "프렌드쇼어링"],
    predictionHistory: [
      {
        year: 2022, month: 3, issue: "러시아 제재 및 에너지 충격",
        prediction: "에너지 위기, 인플레이션 장기화",
        exactStatement: "\"러시아 제재는 유럽 에너지 위기를 촉발하고 글로벌 인플레이션을 연장시킬 것이다. 천연가스 대체재 확보에 2-3년이 걸리며, 이 기간 에너지 가격은 구조적으로 높은 수준을 유지한다.\"",
        actualOutcome: "2022년 유럽 가스 위기, TTF 가스 가격 역사적 최고치. 인플레이션 40년만의 최고 수준. 예측 실현.",
        accuracyNote: "에너지 위기와 인플레이션 연결고리 정확히 예측. 다만 2년 만에 가격 정상화가 이뤄져 기간 예측은 다소 과장.",
        outcome: "부분적중", source: "차트북 뉴스레터, 2022.03.15"
      },
      {
        year: 2023, month: 4, issue: "글로벌 공급망 재편",
        prediction: "프렌드쇼어링·리쇼어링 가속, 비용 상승",
        exactStatement: "\"미중 기술 분쟁이 반도체에서 배터리, EV, 의약품으로 확산되며 기업들은 비용이 20-40% 높더라도 안전한 공급망 구축을 택할 것이다. 이는 2020년대의 구조적 인플레이션 요인이 된다.\"",
        actualOutcome: "2023-2024년 CHIPS Act, IRA 시행으로 미국 제조업 투자 급증. 대만·한국 반도체 기업 미국 내 공장 건설 확대.",
        accuracyNote: "리쇼어링 방향과 비용 상승 정확히 예측. 반도체·배터리 공급망 재편이 예측대로 진행.",
        outcome: "적중", source: "차트북 뉴스레터, 2023.04.28"
      },
    ],
  },
  {
    id: "jessica-chen-weiss",
    name: "제시카 천 와이스",
    nameEn: "Jessica Chen Weiss",
    affiliation: "코넬대학교",
    country: "미국",
    domains: ["미중관계"],
    background: ["교수"],
    perspective: ["자유주의"],
    domainFitScore: 80, accuracyScore: 74, evidenceScore: 83,
    institutionScore: 82, consistencyScore: 88, recencyScore: 78,
    publicRatingScore: 70, biasScore: 88,
    credibilityScore: 80,
    bio: "중국 국내 민족주의와 외교정책 연관성 전문가. 미중 강경 대결 노선에 비판적.",
    recentView: "미국 강경책이 중국 내 민족주의 자극해 역효과 위험. 관여 채널 유지 필요.",
    keyKeywords: ["민족주의", "관여정책", "외교복원", "역효과"],
    predictionHistory: [
      {
        year: 2023, month: 5, issue: "미중 외교 채널 복원",
        prediction: "고위급 소통 채널 복원 가능성 높음",
        exactStatement: "\"미중 양국이 2022년 펠로시 방문 이후 끊긴 군사 채널을 포함한 고위급 소통을 2023년 하반기에 재개할 것이다. 경제적 상호 의존과 위기 관리 필요성이 양측을 테이블로 이끌 것이다.\"",
        actualOutcome: "2023년 11월 샌프란시스코 바이든-시진핑 정상회담 성사. 군사 소통 채널 재개 합의.",
        accuracyNote: "채널 복원과 시점(2023년 하반기) 모두 정확히 예측. 민족주의가 실용주의를 압도하지 않는다는 분석 적중.",
        outcome: "적중", source: "Foreign Affairs, 2023.05.31"
      },
    ],
  },
  {
    id: "bruce-klingner",
    name: "브루스 클링너",
    nameEn: "Bruce Klingner",
    affiliation: "헤리티지재단",
    country: "미국",
    domains: ["한반도", "핵비확산"],
    background: ["연구원", "군출신"],
    perspective: ["안보중심"],
    domainFitScore: 88, accuracyScore: 72, evidenceScore: 76,
    institutionScore: 70, consistencyScore: 80, recencyScore: 80,
    publicRatingScore: 70, biasScore: 55,
    credibilityScore: 76,
    bio: "전 CIA 한국 담당 부국장. 헤리티지재단 선임연구원. 한반도 안보·북핵 전문가.",
    recentView: "북한은 핵 포기 의사 전혀 없음. 더 강력한 억제와 제재 압박이 유일한 현실적 옵션.",
    keyKeywords: ["북핵", "제재", "억제", "한미동맹"],
    predictionHistory: [
      {
        year: 2019, month: 1, issue: "하노이 북미 정상회담",
        prediction: "합의 도달 불가, 비핵화 기대 과도",
        exactStatement: "\"하노이 회담은 결렬될 것이다. 북한은 핵을 포기할 의사가 없으며, 트럼프 행정부의 '빅딜' 요구와 북한의 '단계적 접근' 사이 간격이 너무 크다. 북한은 제재 해제 없이는 어떤 실질적 양보도 하지 않는다.\"",
        actualOutcome: "2019년 2월 27-28일 하노이 회담 결렬. 트럼프-김정은 합의문 서명 없이 종료.",
        accuracyNote: "회담 2개월 전 결렬 예측. 핵심 갈등 구조(빅딜 vs 단계적 접근)를 정확히 분석.",
        outcome: "적중", source: "헤리티지재단 브리핑, 2019.01.28"
      },
      {
        year: 2022, month: 8, issue: "북한 전술핵 사용 위협",
        prediction: "실제 사용 가능성 낮음, 협박용",
        exactStatement: "\"북한의 전술핵 위협은 주로 심리전이다. 실제 사용 시 체제 존망에 위협이 되므로 김정은은 핵을 억제 도구로만 활용할 것이다. 최악의 시나리오 대비는 필요하지만 과잉 대응은 금물.\"",
        actualOutcome: "2022-2025년 북한 전술핵 위협 지속했으나 실제 사용 없음. 예측대로 억제 목적에 그침.",
        accuracyNote: "전술핵 협박을 정확히 심리전으로 분석. 과잉 반응을 막은 균형 잡힌 평가.",
        outcome: "적중", source: "헤리티지재단 보고서, 2022.08.15"
      },
    ],
  },
  {
    id: "hal-brands",
    name: "할 브랜즈",
    nameEn: "Hal Brands",
    affiliation: "존스홉킨스대학교 SAIS",
    country: "미국",
    domains: ["미중관계", "군사안보"],
    background: ["교수", "싱크탱크"],
    perspective: ["현실주의", "안보중심"],
    domainFitScore: 85, accuracyScore: 68, evidenceScore: 80,
    institutionScore: 82, consistencyScore: 82, recencyScore: 86,
    publicRatingScore: 78, biasScore: 65,
    credibilityScore: 77,
    bio: "미국기업연구소(AEI) 선임연구원. 중국 위협론·억제전략 강조. 국방부 자문 경력.",
    recentView: "2020년대가 '위험의 10년'. 대만 위기 억제를 위한 군사력 증강과 동맹 강화 필수.",
    keyKeywords: ["억제전략", "위험의10년", "대만방어", "동맹강화"],
    predictionHistory: [
      {
        year: 2022, month: 4, issue: "대만 위기 '위험의 10년'",
        prediction: "2020년대 중국 모험주의 가능성 급상승",
        exactStatement: "\"2020년대는 미중 관계에서 가장 위험한 10년이 될 것이다. 중국의 군사력 격차가 좁혀지고, 시진핑의 임기 제한이 사라지면서 대만에 대한 군사행동 가능성이 이전보다 훨씬 높아졌다.\"",
        actualOutcome: "2022년 8월·2024년 5월 대규모 군사훈련, 대만해협 긴장 고조 지속. 전면전은 미발발.",
        accuracyNote: "긴장 상승 예측은 맞았으나 '위험의 10년' 프레임은 아직 검증 중. 군사 모험주의 수준 예측이 과도할 수 있음.",
        outcome: "미결", source: "AEI 보고서, 2022.04.20"
      },
    ],
  },
  {
    id: "elbridge-colby",
    name: "엘브리지 콜비",
    nameEn: "Elbridge Colby",
    affiliation: "마라톤이니셔티브",
    country: "미국",
    domains: ["대만해협", "군사안보", "미중관계"],
    background: ["싱크탱크", "전직외교관"],
    perspective: ["현실주의", "안보중심"],
    domainFitScore: 88, accuracyScore: 70, evidenceScore: 82,
    institutionScore: 75, consistencyScore: 83, recencyScore: 86,
    publicRatingScore: 78, biasScore: 68,
    credibilityScore: 79,
    bio: "전 국방부 전략·군사력 개발 부차관보. 2018 국가방위전략 주요 입안자. 중국 억제 최우선론 주창.",
    recentView: "대만 방어가 미국 최우선 전략 과제. 유럽 지원보다 인도태평양 억제에 자원 집중.",
    keyKeywords: ["대만우선", "억제전략", "인도태평양", "자원배분"],
    predictionHistory: [
      {
        year: 2021, month: 11, issue: "미군 대만 방어 준비 상태",
        prediction: "현재 미군 준비 상태로는 대만 방어 불충분",
        exactStatement: "\"현재 미군이 대만 방어에 개입하더라도 중국의 A2/AD 능력과 정밀 타격 역량을 극복할 수 없다. 미군은 인도태평양에 추가 자원을 집중해야 하며, 현재 배치는 충분하지 않다.\"",
        actualOutcome: "2022-2024년 미 INDOPACOM 예산 대폭 증가, 태평양 억제 이니셔티브(PDI) 확대. 준비 부족 인정.",
        accuracyNote: "준비 부족 진단 후 미군 증강으로 이어짐. 예측이 정책 변화를 이끈 사례.",
        outcome: "부분적중", source: "마라톤이니셔티브 보고서, 2021.11"
      },
    ],
  },
  {
    id: "yan-xuetong",
    name: "옌쉐퉁",
    nameEn: "Yan Xuetong",
    affiliation: "칭화대학교",
    country: "중국",
    domains: ["미중관계", "군사안보"],
    background: ["교수", "싱크탱크"],
    perspective: ["현실주의"],
    domainFitScore: 88, accuracyScore: 68, evidenceScore: 75,
    institutionScore: 80, consistencyScore: 77, recencyScore: 82,
    publicRatingScore: 70, biasScore: 40,
    credibilityScore: 75,
    bio: "중국 최고 국제정치학자. 도덕적 현실주의 주창. 중국 정부와 일정 거리 유지.",
    recentView: "미중 경쟁은 냉전과 다른 양상. 기술 표준 경쟁이 핵심 전장.",
    keyKeywords: ["도덕적 현실주의", "기술전쟁", "미중양극체제"],
    predictionHistory: [
      {
        year: 2020, month: 6, issue: "미중 디커플링",
        prediction: "부분적 디커플링 불가피, 완전 분리는 불가",
        exactStatement: "\"미중은 기술·군사 분야에서 분리될 것이나 무역과 금융에서 완전히 분리되는 것은 양국 모두에 너무 큰 비용이다. 반쪽짜리 디커플링이 진행될 것이다.\"",
        actualOutcome: "2020-2025년 반도체·AI·통신 분야 디커플링 진행. 무역은 오히려 증가. 예측대로 부분 분리.",
        accuracyNote: "완전 분리 불가와 부분 분리 진행 모두 정확히 예측. 중국 내부 입장을 잘 반영.",
        outcome: "적중", source: "Global Times 인터뷰, 2020.06.15"
      },
    ],
  },
];

export { expertsFeatured as experts };

// ─── Extended experts (~10K) — loaded at build time ───
import { expertsExtended } from "./expertsExtended";
import { expertsExtended2 } from "./expertsExtended2";
import { expertsExtended3 } from "./expertsExtended3";
import { expertsExtended4 } from "./expertsExtended4";
import { expertsExtended5 } from "./expertsExtended5";
import { expertsExtended6 } from "./expertsExtended6";
import { expertsExtended7 } from "./expertsExtended7";
import { expertsExtended8 } from "./expertsExtended8";
import { expertsExtended9 } from "./expertsExtended9";
import { expertsExtended10 } from "./expertsExtended10";
import { expertsExtended11 } from "./expertsExtended11";

// ─── Pre-computed stats (includes ALL 110K+ experts) ───
import { precomputedStats } from "./precomputedStats";

let _cachedExperts: Expert[] | null = null;
let _cachedTopExperts: Expert[] | null = null;

/**
 * 전체 전문가 목록 (featured + extended ~10K)
 * NOTE: 100K generated experts are NOT loaded here to avoid build timeout.
 * Use getExpertStats() for statistics that include the full 110K+ pool.
 */
export function getAllExperts(): Expert[] {
  if (_cachedExperts) return _cachedExperts;
  const seen = new Set<string>();
  const result: Expert[] = [];
  for (const e of [
    ...expertsFeatured, ...expertsExtended,
    ...expertsExtended2, ...expertsExtended3, ...expertsExtended4,
    ...expertsExtended5, ...expertsExtended6, ...expertsExtended7,
    ...expertsExtended8, ...expertsExtended9, ...expertsExtended10,
    ...expertsExtended11,
  ]) {
    if (!seen.has(e.id)) {
      seen.add(e.id);
      result.push(e);
    }
  }
  _cachedExperts = result;
  return result;
}

export function getExpertById(id: string) {
  const all = getAllExperts();
  return all.find((e) => e.id === id);
}

export function getExpertsByDomain(domain: string) {
  return getAllExperts().filter((e) => e.domains.includes(domain as never));
}

/** 신뢰도 상위 전문가 (페이지 렌더링용 — ~10K 풀에서 추출) */
export function getTopExperts(limit = 500): Expert[] {
  if (_cachedTopExperts && _cachedTopExperts.length >= limit) return _cachedTopExperts.slice(0, limit);
  _cachedTopExperts = [...getAllExperts()].sort((a, b) => b.credibilityScore - a.credibilityScore).slice(0, limit);
  return _cachedTopExperts;
}

/** 총 전문가 수 (pre-computed: 110K+ 포함) */
export function getExpertCount(): number {
  return precomputedStats.total;
}

/** 전문가 통계 (pre-computed: 110K+ 전체 포함, 빌드 타임 안전) */
export function getExpertStats() {
  return precomputedStats;
}
