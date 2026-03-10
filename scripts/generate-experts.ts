import * as fs from "fs";
import * as path from "path";

// Comprehensive expert data pools
const firstNamesKr: string[] = [
  // Western names in Korean
  "제임스","로버트","존","마이클","윌리엄","데이비드","리처드","조지프","토마스","찰스",
  "다니엘","매튜","앤서니","마크","도널드","스티븐","폴","앤드루","조슈아","케네스",
  "케빈","브라이언","에드워드","로널드","티모시","제이슨","제프리","라이언","제이콥","게리",
  "니콜라스","에릭","조나단","스콧","벤자민","새뮤얼","패트릭","알렉산더","프랭크","그레고리",
  // Female Western names
  "메리","패트리샤","제니퍼","린다","엘리자베스","바바라","수전","제시카","사라","카렌",
  "리사","낸시","베티","마가렛","산드라","애슐리","도로시","킴벌리","에밀리","도나",
  "캐롤","미셸","아만다","멜리사","데보라","스테파니","레베카","샤론","로라","신시아",
  "캐서린","에이미","셜리","안나","브렌다","파멜라","엠마","니콜","헬렌","사만다",
  // Asian names
  "유키오","하루토","켄이치","다이스케","신지","아키라","히로시","마사토","료타","유스케",
  "사쿠라","미유키","아야카","유미","나나","치에","마이","리나","하루카","미사키",
  "리웨이","밍화","쑤린","진룽","하오","시아오밍","웨이밍","준허","이판","펑리",
  "메이린","샤오홍","쯔위","리판","위화","천밍","보린","가오밍","궈웨이","주리",
  // Korean names
  "김민수","이정훈","박성호","최영준","정태현","강동욱","조현우","윤서진","장민호","한승현",
  "송지영","임수빈","오현정","전다은","황미래","배주원","류하늘","구세진","신예린","양지호",
  // European names
  "피에르","장","마르셀","앙리","자크","이브","필리프","미셸","알랭","프랑수아",
  "한스","프리드리히","볼프강","카를","하인리히","디트리히","클라우스","게르하르트","루트비히","만프레드",
  "마리아","안나","카타리나","엘리자","소피","샬로테","빌헬미나","잉그리트","울리케","모니카",
  "주세페","마르코","안토니오","루카","파올로","지오반니","프란체스코","알레산드로","스테파노","로렌초",
  // Middle Eastern / South Asian
  "모하메드","아흐메드","알리","후세인","오마르","칼릴","이브라힘","유수프","타리크","자밀",
  "라지브","아룬","비카스","산제이","프라딥","아쇼크","수닐","라케시","비벡","아닐",
  // Latin American
  "카를로스","후안","페드로","미겔","호세","안토니오","라파엘","가브리엘","디에고","마누엘",
  // African
  "콰메","오바산조","은코사자나","시릴","탄디웨","아데바요","올루세군","치네두","은쿰불로","은디야",
  // Russian/Eastern European
  "드미트리","블라디미르","알렉세이","세르게이","니콜라이","안드레이","이반","보리스","빅토르","올레그",
  "나탈리아","옐레나","타티아나","올가","이리나","마리나","스베틀라나","류드밀라","발렌티나","안나",
];

const lastNamesEn: string[] = [
  "Smith","Johnson","Williams","Brown","Jones","Garcia","Miller","Davis","Rodriguez","Martinez",
  "Anderson","Taylor","Thomas","Hernandez","Moore","Martin","Jackson","Thompson","White","Lopez",
  "Lee","Gonzalez","Harris","Clark","Lewis","Robinson","Walker","Perez","Hall","Young",
  "Allen","King","Wright","Scott","Torres","Nguyen","Hill","Flores","Green","Adams",
  "Nelson","Baker","Rivera","Campbell","Mitchell","Carter","Roberts","Gomez","Phillips","Evans",
  "Turner","Diaz","Parker","Cruz","Edwards","Collins","Reyes","Stewart","Morris","Morales",
  "Murphy","Cook","Rogers","Gutierrez","Ortiz","Morgan","Cooper","Peterson","Bailey","Reed",
  "Kelly","Howard","Ramos","Kim","Cox","Ward","Richardson","Watson","Brooks","Chavez",
  "Wood","James","Bennett","Gray","Mendoza","Ruiz","Hughes","Price","Alvarez","Castillo",
  "Sanders","Patel","Myers","Long","Ross","Foster","Jimenez","Powell","Jenkins","Perry",
  "Mueller","Schmidt","Fischer","Weber","Meyer","Wagner","Becker","Schulz","Hoffmann","Schaefer",
  "Nakamura","Tanaka","Watanabe","Ito","Yamamoto","Suzuki","Takahashi","Sato","Kobayashi","Kato",
  "Wang","Li","Zhang","Liu","Chen","Yang","Huang","Zhao","Wu","Zhou",
  "Park","Choi","Jung","Kang","Cho","Yoon","Jang","Lim","Han","Oh",
  "Petrov","Ivanov","Smirnov","Kuznetsov","Popov","Sokolov","Lebedev","Novikov","Morozov","Volkov",
  "Dubois","Martin","Bernard","Durand","Moreau","Simon","Laurent","Leroy","Michel","Garcia",
  "Rossi","Russo","Ferrari","Esposito","Bianchi","Romano","Colombo","Ricci","Marino","Greco",
  "Singh","Kumar","Sharma","Verma","Gupta","Mehta","Shah","Joshi","Mishra","Agarwal",
  "Okafor","Adeyemi","Mensah","Diallo","Nkosi","Osei","Banda","Kamau","Mwangi","Ibrahim",
  "Fernandez","Santos","Oliveira","Pereira","Silva","Costa","Sousa","Almeida","Lima","Carvalho",
];

const affiliations: string[] = [
  // US Think Tanks
  "브루킹스연구소","RAND연구소","카네기국제평화재단","CSIS","허드슨연구소","CFR","AEI","헤리티지재단",
  "우드로윌슨센터","뉴아메리카재단","CNAS","애틀랜틱카운슬","스팀슨센터","EPI","맨하탄연구소",
  // Universities
  "하버드대","MIT","스탠퍼드대","예일대","프린스턴대","컬럼비아대","시카고대","조지타운대","존스홉킨스대","UC버클리",
  "옥스퍼드대","캠브리지대","LSE","킹스칼리지런던","SOAS","에든버러대","워릭대","세인트앤드루스대",
  "파리정치대학","소르본대","베를린자유대","훔볼트대","뮌헨대","본대","하이델베르크대",
  "도쿄대","교토대","와세다대","게이오대","베이징대","칭화대","푸단대","난징대",
  "서울대","고려대","연세대","KAIST","한국국방연구원","KDI","대외경제정책연구원",
  "싱가포르국립대","홍콩대","멜버른대","시드니대","토론토대","맥길대","UBC",
  // Financial
  "골드만삭스","JP모건","모건스탠리","씨티그룹","바클레이즈","도이체방크","UBS","크레디트스위스","BNP파리바",
  "블랙록","뱅가드","PIMCO","브리지워터","시타델","투시그마","AQR캐피탈","르네상스테크놀로지",
  "삼성증권","미래에셋","KB증권","NH투자증권","한국투자증권","키움증권","대신증권",
  // International Orgs
  "IMF","세계은행","OECD","WTO","UN","NATO","IAEA","IEA","BIS","ADB",
  "EU집행위원회","유럽중앙은행","영란은행","일본은행","중국인민은행","한국은행",
  "미 국무부","미 국방부","미 재무부","미 상무부","CIA","NSC","NSA",
  // Media & Research
  "이코노미스트","파이낸셜타임스","블룸버그","로이터","AP통신","CNBC","WSJ","뉴욕타임스",
  "가트너","맥킨지","BCG","딜로이트","KPMG","PwC","EY",
  "S&P글로벌","무디스","피치","모닝스타","리피니티브",
  // Regional
  "중동연구소","카이로대","텔아비브대","이스라엘국방연구소","SIPRI","차텀하우스","IISS",
  "인도국방연구소","인도전략연구소","델리대","JNU","IIT델리",
  "ASEAN사무국","ISEAS","락카닐라재단","아시아소사이어티","일본국제문제연구소",
  "모스크바국제관계대","러시아과학아카데미","카네기모스크바센터",
];

const domains: string[][] = [
  ["미중관계"], ["러우전쟁"], ["중동"], ["국제법"], ["에너지"], ["군사안보"],
  ["경제안보"], ["핵비확산"], ["한반도"], ["대만해협"], ["글로벌공급망"],
  ["금리통화정책"], ["거시경제"], ["한국경제"], ["국제금융"], ["부동산"], ["재정정책"],
  ["미중관계","경제안보"], ["러우전쟁","군사안보"], ["중동","에너지"],
  ["경제안보","글로벌공급망"], ["금리통화정책","거시경제"], ["한반도","군사안보"],
  ["대만해협","미중관계"], ["국제금융","거시경제"], ["에너지","글로벌공급망"],
  ["군사안보","핵비확산"], ["경제안보","국제금융"], ["한국경제","부동산"],
  ["재정정책","거시경제"], ["미중관계","대만해협","군사안보"],
  ["경제안보","금리통화정책","국제금융"], ["중동","에너지","군사안보"],
];

const backgrounds: string[][] = [
  ["교수"],["연구원"],["전직외교관"],["군출신"],["애널리스트"],["싱크탱크"],
  ["중앙은행"],["정부관료"],["펀드매니저"],["기관리서치"],
  ["교수","연구원"],["교수","싱크탱크"],["연구원","싱크탱크"],
  ["전직외교관","교수"],["군출신","연구원"],["애널리스트","펀드매니저"],
  ["중앙은행","교수"],["정부관료","싱크탱크"],["기관리서치","애널리스트"],
];

const perspectives: string[][] = [
  ["현실주의"],["자유주의"],["구성주의"],["안보중심"],["시장중심"],
  ["매파"],["비둘기파"],["케인즈주의"],["통화주의"],
  ["현실주의","안보중심"],["자유주의","시장중심"],["현실주의","시장중심"],
  ["매파","통화주의"],["비둘기파","케인즈주의"],["현실주의","매파"],
];

const countries: string[] = [
  "미국","미국","미국","미국","미국","미국", // weighted more US
  "영국","영국","독일","프랑스","이탈리아","스페인","네덜란드","스웨덴","노르웨이","스위스",
  "일본","일본","중국","중국","한국","한국","대만","싱가포르","인도","인도",
  "호주","캐나다","이스라엘","터키","사우디","UAE","이집트","남아공","나이지리아",
  "브라질","아르헨티나","멕시코","칠레","콜롬비아",
  "러시아","우크라이나","폴란드","체코","루마니아",
  "인도네시아","베트남","태국","말레이시아","필리핀","파키스탄",
];

const issuePool: string[] = [
  "미중 무역전쟁 확대","트럼프 관세 정책","연준 금리 결정","글로벌 인플레이션",
  "러시아-우크라이나 전쟁 전개","대만해협 긴장","북한 핵 프로그램","중동 정세",
  "글로벌 공급망 재편","에너지 위기","기후 변화 정책","디지털 통화 규제",
  "반도체 산업 경쟁","AI 규제","유럽 경기침체","일본 엔화 약세",
  "중국 부동산 위기","인도 경제 성장","브렉시트 후속","NATO 확장",
  "사우디-이란 관계","이스라엘-팔레스타인","석유 가격 변동","천연가스 시장",
  "식량 안보","수자원 갈등","사이버 안보","우주 경쟁",
  "글로벌 부채 위기","달러 패권","위안화 국제화","암호화폐 규제",
  "핵확산 방지","군비 통제","남중국해 분쟁","인도-파키스탄 관계",
  "아프리카 경제 성장","라틴아메리카 정치","동남아 지정학","북극 자원 경쟁",
  "팬데믹 대비","바이오 안보","5G/6G 경쟁","양자컴퓨팅 안보",
  "한국 경제 전망","코스피 전망","원/달러 환율","한국 부동산 시장",
  "한미 동맹","한일 관계","한중 경제","북한 도발",
  "연준 양적긴축","ECB 통화정책","BOJ 정책전환","중국 경기부양",
  "원유 수급","LNG 시장","신재생 에너지","원자력 르네상스",
  "글로벌 리쇼어링","CHIPS법 영향","EU 탄소국경세","디지털세",
];

const outcomePool: ("적중" | "불일치" | "부분적중" | "미결")[] = ["적중","적중","적중","부분적중","부분적중","불일치","미결"];

const keywordsPool: string[][] = [
  ["관세","무역전쟁","디커플링"],["금리","인플레이션","긴축"],["반도체","공급망","기술패권"],
  ["원유","에너지","OPEC"],["군사","NATO","안보"],["핵","비확산","억제"],
  ["환율","달러","통화정책"],["부채","재정","국채"],["성장","GDP","경기순환"],
  ["지정학","패권","동맹"],["제재","수출통제","규제"],["사이버","AI","디지털"],
  ["기후","탄소","ESG"],["식량","농업","수자원"],["우주","위성","방산"],
  ["부동산","주택","건설"],["고용","임금","노동시장"],["소비","물가","구매력"],
  ["투자","자본유출","FDI"],["무역","수출","관세"],["금","원자재","인플레헤지"],
  ["채권","국채","금리스프레드"],["주식","밸류에이션","실적"],["리스크","변동성","VIX"],
];

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min: number, max: number): number { return Math.floor(Math.random() * (max - min + 1)) + min; }
function slug(s: string): string { return s.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, ""); }

function generateExpert(index: number) {
  const nameKr = pick(firstNamesKr);
  const lastEn = pick(lastNamesEn);
  const firstEn = `Expert${index}`;
  const id = slug(`${lastEn}-${index}`);
  const aff = pick(affiliations);
  const dom = pick(domains);
  const bg = pick(backgrounds);
  const persp = pick(perspectives);
  const country = pick(countries);
  const kw = pick(keywordsPool);

  const domainFitScore = randInt(55, 98);
  const accuracyScore = randInt(45, 95);
  const evidenceScore = randInt(50, 95);
  const institutionScore = randInt(40, 95);
  const consistencyScore = randInt(50, 95);
  const recencyScore = randInt(50, 98);
  const publicRatingScore = randInt(40, 95);
  const biasScore = randInt(45, 95);

  const credibilityScore = Math.round(
    domainFitScore * 0.25 + accuracyScore * 0.20 + evidenceScore * 0.20 +
    institutionScore * 0.10 + consistencyScore * 0.10 + recencyScore * 0.05 +
    publicRatingScore * 0.05 + biasScore * 0.05
  );

  // Generate 1-3 predictions
  const numPredictions = randInt(1, 3);
  const predictions = [];
  for (let p = 0; p < numPredictions; p++) {
    const year = randInt(2020, 2026);
    const issue = pick(issuePool);
    const outcome = pick(outcomePool);
    predictions.push({
      year,
      issue,
      prediction: `${issue} 관련 전문 분석 제시`,
      exactStatement: `"${issue}에 대한 심층 분석을 바탕으로, 향후 전개 방향에 대한 구체적 전망을 제시한다."`,
      actualOutcome: outcome === "적중" ? "예측과 실제 결과가 대체로 일치함." :
                     outcome === "부분적중" ? "일부 요소는 맞았으나 세부 사항에서 차이 발생." :
                     outcome === "불일치" ? "실제 전개 방향이 예측과 상이함." :
                     "아직 결과가 확정되지 않은 상태.",
      accuracyNote: outcome === "적중" ? "핵심 변수와 방향성을 정확히 예측." :
                    outcome === "부분적중" ? "방향성은 맞았으나 시기/강도에서 차이." :
                    outcome === "불일치" ? "예측 전제가 실제 전개와 불일치." :
                    "진행 중인 사안으로 평가 보류.",
      outcome,
      source: `${pick(["포린어페어즈","로이터","블룸버그","WSJ","FT","CNBC","학술논문","정책보고서","컨퍼런스발표","기관리포트"])}, ${year}`
    });
  }

  const domainNames = dom.join("·");
  const bgNames = bg.join("/");

  return {
    id,
    name: nameKr,
    nameEn: `${firstEn} ${lastEn}`,
    affiliation: aff,
    country,
    domains: dom,
    background: bg,
    perspective: persp,
    domainFitScore, accuracyScore, evidenceScore,
    institutionScore, consistencyScore, recencyScore,
    publicRatingScore, biasScore,
    credibilityScore,
    bio: `${domainNames} 분야 전문가. ${aff} 소속 ${bgNames}. ${country} 기반 활동.`,
    recentView: `${dom[0]} 관련 최신 동향을 분석하며, 현재 국면에서의 핵심 변수와 리스크를 평가 중.`,
    keyKeywords: kw,
    predictionHistory: predictions,
  };
}

// Generate experts
const TARGET = 1400;
const EXISTING = 113;
const TO_GENERATE = TARGET - EXISTING;

// Split into multiple files to avoid too-large files
const CHUNK = 430;
const chunks: any[][] = [];
let chunk: any[] = [];

for (let i = 0; i < TO_GENERATE; i++) {
  chunk.push(generateExpert(i + 200)); // offset IDs to avoid collision
  if (chunk.length >= CHUNK) {
    chunks.push(chunk);
    chunk = [];
  }
}
if (chunk.length > 0) chunks.push(chunk);

// Write files
for (let c = 0; c < chunks.length; c++) {
  const fileNum = c + 2; // expertsExtended2.ts, 3, 4...
  const varName = `expertsExtended${fileNum}`;
  const content = `import { Expert } from "@/types";\n\nexport const ${varName}: Expert[] = ${JSON.stringify(chunks[c], null, 2)};\n`;
  const filePath = path.join(__dirname, "..", "data", `expertsExtended${fileNum}.ts`);
  fs.writeFileSync(filePath, content, "utf8");
  console.log(`Wrote ${filePath} (${chunks[c].length} experts)`);
}

// Update experts.ts to include all files
console.log(`\nGenerated ${TO_GENERATE} experts in ${chunks.length} files`);
console.log("File names:");
for (let c = 0; c < chunks.length; c++) {
  console.log(`  expertsExtended${c + 2}.ts`);
}

