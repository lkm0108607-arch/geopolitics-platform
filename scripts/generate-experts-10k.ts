import * as fs from "fs";
import * as path from "path";

// Seed-based pseudo-random for reproducibility
let seed = 42;
function rand(): number { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; }
function pick<T>(arr: T[]): T { return arr[Math.floor(rand() * arr.length)]; }
function randInt(min: number, max: number): number { return Math.floor(rand() * (max - min + 1)) + min; }

const namesKr = [
  "제임스","로버트","존","마이클","윌리엄","데이비드","리처드","토마스","찰스","다니엘",
  "매튜","앤서니","마크","스티븐","폴","앤드루","케네스","케빈","브라이언","에릭",
  "조나단","벤자민","새뮤얼","패트릭","알렉산더","프랭크","그레고리","레이먼드","잭","헨리",
  "메리","제니퍼","엘리자베스","수전","제시카","사라","리사","낸시","마가렛","에밀리",
  "캐서린","에이미","엠마","니콜","헬렌","사만다","올리비아","소피아","이사벨라","아멜리아",
  "유키오","하루토","켄이치","아키라","히로시","사쿠라","미유키","아야카","유미","나나",
  "리웨이","밍화","하오","웨이밍","펑리","메이린","쯔위","가오밍","보린","궈웨이",
  "김민수","이정훈","박성호","최영준","정태현","강동욱","조현우","윤서진","장민호","한승현",
  "송지영","임수빈","오현정","전다은","황미래","배주원","류하늘","구세진","신예린","양지호",
  "피에르","마르셀","앙리","필리프","알랭","한스","프리드리히","볼프강","카를","디트리히",
  "마리아","카타리나","소피","샬로테","잉그리트","주세페","마르코","루카","스테파노","로렌초",
  "모하메드","아흐메드","알리","후세인","칼릴","이브라힘","유수프","타리크","자밀","오마르",
  "라지브","아룬","비카스","산제이","프라딥","아닐","수닐","비벡","라케시","아쇼크",
  "카를로스","후안","페드로","미겔","호세","라파엘","가브리엘","디에고","마누엘","안토니오",
  "콰메","아데바요","올루세군","치네두","은디야","드미트리","알렉세이","세르게이","니콜라이","보리스",
  "나탈리아","타티아나","올가","이리나","스베틀라나","라헬","노아","루벤","엘리아스","레오",
  "아이샤","파티마","자이나브","누르","하디자","아미나","살마","수마이야","라일라","마리암",
  "탄디웨","은코사자나","시릴","응고지","치마만다","우체","반다","카말라","프리야","디비야",
];

const lastEn = [
  "Smith","Johnson","Williams","Brown","Jones","Garcia","Miller","Davis","Rodriguez","Martinez",
  "Anderson","Taylor","Thomas","Moore","Martin","Jackson","Thompson","White","Lopez","Lee",
  "Harris","Clark","Lewis","Robinson","Walker","Hall","Young","Allen","King","Wright",
  "Mueller","Schmidt","Fischer","Weber","Meyer","Wagner","Becker","Schulz","Hoffmann","Braun",
  "Nakamura","Tanaka","Watanabe","Yamamoto","Suzuki","Takahashi","Sato","Kobayashi","Kato","Ito",
  "Wang","Li","Zhang","Liu","Chen","Yang","Huang","Zhao","Wu","Zhou",
  "Park","Choi","Jung","Kang","Cho","Yoon","Jang","Lim","Han","Shin",
  "Petrov","Ivanov","Smirnov","Kuznetsov","Popov","Sokolov","Volkov","Morozov","Novikov","Lebedev",
  "Dubois","Bernard","Durand","Moreau","Simon","Laurent","Leroy","Lefebvre","Roux","Girard",
  "Rossi","Russo","Ferrari","Esposito","Bianchi","Romano","Colombo","Ricci","Marino","Greco",
  "Singh","Kumar","Sharma","Verma","Gupta","Mehta","Patel","Shah","Joshi","Mishra",
  "Santos","Oliveira","Pereira","Silva","Costa","Sousa","Almeida","Lima","Carvalho","Ferreira",
  "Okafor","Adeyemi","Mensah","Diallo","Nkosi","Osei","Banda","Kamau","Mwangi","Ibrahim",
  "Fernandez","Gonzalez","Cruz","Torres","Rivera","Flores","Gomez","Diaz","Reyes","Morales",
];

const affiliations = [
  "브루킹스연구소","RAND연구소","카네기국제평화재단","CSIS","허드슨연구소","CFR","AEI","헤리티지재단",
  "우드로윌슨센터","뉴아메리카재단","CNAS","애틀랜틱카운슬","스팀슨센터","맨하탄연구소",
  "하버드대","MIT","스탠퍼드대","예일대","프린스턴대","컬럼비아대","시카고대","조지타운대","존스홉킨스대","UC버클리",
  "옥스퍼드대","캠브리지대","LSE","킹스칼리지런던","SOAS","에든버러대",
  "파리정치대학","소르본대","베를린자유대","하이델베르크대","뮌헨대",
  "도쿄대","교토대","와세다대","베이징대","칭화대","푸단대",
  "서울대","고려대","연세대","KAIST","한국국방연구원","KDI","대외경제정책연구원",
  "싱가포르국립대","홍콩대","멜버른대","토론토대",
  "골드만삭스","JP모건","모건스탠리","바클레이즈","도이체방크","UBS","BNP파리바",
  "블랙록","PIMCO","브리지워터","시타델","AQR캐피탈",
  "삼성증권","미래에셋","KB증권","NH투자증권","한국투자증권",
  "IMF","세계은행","OECD","WTO","UN","NATO","IAEA","IEA","BIS","ADB",
  "EU집행위원회","유럽중앙은행","영란은행","일본은행","한국은행",
  "미 국무부","미 국방부","미 재무부","CIA","NSC",
  "이코노미스트","블룸버그","로이터","CNBC","WSJ","FT",
  "맥킨지","BCG","딜로이트","S&P글로벌","무디스","피치",
  "차텀하우스","IISS","SIPRI","카네기모스크바센터","중동연구소",
  "인도전략연구소","ISEAS","아시아소사이어티","일본국제문제연구소",
  "모스크바국제관계대","러시아과학아카데미","텔아비브대","카이로대",
];

const domainSets: string[][] = [
  ["미중관계"],["러우전쟁"],["중동"],["국제법"],["에너지"],["군사안보"],
  ["경제안보"],["핵비확산"],["한반도"],["대만해협"],["글로벌공급망"],
  ["금리통화정책"],["거시경제"],["한국경제"],["국제금융"],["부동산"],["재정정책"],
  ["미중관계","경제안보"],["러우전쟁","군사안보"],["중동","에너지"],
  ["경제안보","글로벌공급망"],["금리통화정책","거시경제"],["한반도","군사안보"],
  ["대만해협","미중관계"],["국제금융","거시경제"],["에너지","글로벌공급망"],
  ["경제안보","국제금융"],["한국경제","부동산"],["재정정책","거시경제"],
  ["미중관계","대만해협","군사안보"],["경제안보","금리통화정책","국제금융"],
];

const bgSets: string[][] = [
  ["교수"],["연구원"],["전직외교관"],["군출신"],["애널리스트"],["싱크탱크"],
  ["중앙은행"],["정부관료"],["펀드매니저"],["기관리서치"],
  ["교수","연구원"],["교수","싱크탱크"],["연구원","싱크탱크"],
  ["애널리스트","펀드매니저"],["중앙은행","교수"],["정부관료","싱크탱크"],
];

const perspSets: string[][] = [
  ["현실주의"],["자유주의"],["구성주의"],["안보중심"],["시장중심"],
  ["매파"],["비둘기파"],["케인즈주의"],["통화주의"],
  ["현실주의","안보중심"],["자유주의","시장중심"],["현실주의","시장중심"],
  ["매파","통화주의"],["비둘기파","케인즈주의"],
];

const countries = [
  "미국","미국","미국","미국","영국","영국","독일","프랑스","이탈리아","스위스",
  "일본","일본","중국","중국","한국","한국","대만","싱가포르","인도","인도",
  "호주","캐나다","이스라엘","터키","사우디","UAE","남아공","브라질","러시아","폴란드",
  "인도네시아","베트남","태국","멕시코","나이지리아","이집트","아르헨티나","칠레","노르웨이","스웨덴",
];

const issues = [
  "미중 무역전쟁","트럼프 관세","연준 금리","글로벌 인플레이션","러우전쟁","대만해협",
  "북한 핵","중동 정세","공급망 재편","에너지 위기","반도체 경쟁","AI 규제",
  "유럽 경기","엔화 약세","중국 부동산","인도 성장","NATO 확장","석유 가격",
  "글로벌 부채","달러 패권","암호화폐","남중국해","한국 경제","원달러 환율","코스피 전망",
];

const outcomes: ("적중"|"부분적중"|"불일치"|"미결")[] = ["적중","적중","적중","부분적중","부분적중","불일치","미결"];
const sources = ["포린어페어즈","로이터","블룸버그","WSJ","FT","CNBC","학술논문","정책보고서","기관리포트","컨퍼런스"];
const kwSets: string[][] = [
  ["관세","무역","디커플링"],["금리","인플레이션","긴축"],["반도체","공급망","기술"],
  ["원유","에너지","OPEC"],["군사","NATO","안보"],["환율","달러","통화"],
  ["부채","재정","국채"],["성장","GDP","경기"],["지정학","패권","동맹"],
  ["제재","수출통제","규제"],["AI","디지털","사이버"],["기후","탄소","ESG"],
  ["채권","국채","스프레드"],["주식","밸류에이션","실적"],["리스크","변동성","VIX"],
  ["금","원자재","헤지"],["부동산","주택","건설"],["고용","임금","노동"],
];

function genExpert(i: number): string {
  const nm = pick(namesKr);
  const ln = pick(lastEn);
  const id = `exp-${i}`;
  const aff = pick(affiliations);
  const dom = pick(domainSets);
  const bg = pick(bgSets);
  const persp = pick(perspSets);
  const country = pick(countries);
  const kw = pick(kwSets);

  const ds = randInt(55,98), as2 = randInt(45,95), es = randInt(50,95);
  const is2 = randInt(40,95), cs = randInt(50,95), rs = randInt(50,98);
  const ps = randInt(40,95), bs = randInt(45,95);
  const cr = Math.round(ds*0.25+as2*0.20+es*0.20+is2*0.10+cs*0.10+rs*0.05+ps*0.05+bs*0.05);

  const nPred = randInt(1,2);
  const preds: string[] = [];
  for (let p = 0; p < nPred; p++) {
    const yr = randInt(2021,2026);
    const iss = pick(issues);
    const oc = pick(outcomes);
    preds.push(`{year:${yr},issue:"${iss}",prediction:"${iss} 전문 분석",exactStatement:"\\\"${iss} 관련 구체적 전망 제시.\\\"",actualOutcome:"${oc==="적중"?"예측 부합":"결과 차이"}",accuracyNote:"${oc==="적중"?"정확 예측":"일부 차이"}",outcome:"${oc}",source:"${pick(sources)}, ${yr}"}`);
  }

  return `{id:"${id}",name:"${nm}",nameEn:"E${i} ${ln}",affiliation:"${aff}",country:"${country}",domains:${JSON.stringify(dom)},background:${JSON.stringify(bg)},perspective:${JSON.stringify(persp)},domainFitScore:${ds},accuracyScore:${as2},evidenceScore:${es},institutionScore:${is2},consistencyScore:${cs},recencyScore:${rs},publicRatingScore:${ps},biasScore:${bs},credibilityScore:${cr},bio:"${dom.join("·")} 전문가. ${aff} ${bg.join("/")}. ${country} 기반.",recentView:"${dom[0]} 최신 동향 분석 중.",keyKeywords:${JSON.stringify(kw)},predictionHistory:[${preds.join(",")}]}`;
}

// Generate 10000 - 113 existing = 9887
const TARGET = 9887;
const CHUNK = 1000;
const dataDir = path.join(__dirname, "..", "data");

const numFiles = Math.ceil(TARGET / CHUNK);
const fileNames: string[] = [];

for (let f = 0; f < numFiles; f++) {
  const start = f * CHUNK;
  const end = Math.min(start + CHUNK, TARGET);
  const fileNum = f + 2;
  const varName = `expertsExtended${fileNum}`;
  const fileName = `expertsExtended${fileNum}.ts`;
  fileNames.push(fileName);

  const entries: string[] = [];
  for (let i = start; i < end; i++) {
    entries.push(genExpert(i + 200));
  }

  const content = `import{Expert}from"@/types";\nexport const ${varName}:Expert[]=[${entries.join(",")}];\n`;
  fs.writeFileSync(path.join(dataDir, fileName), content, "utf8");
  console.log(`Wrote ${fileName} (${end - start} experts)`);
}

console.log(`\nTotal: ${TARGET} new experts in ${numFiles} files`);

// Generate import statements for experts.ts
console.log("\nImport lines:");
for (let f = 0; f < numFiles; f++) {
  const fileNum = f + 2;
  console.log(`import{expertsExtended${fileNum}}from"./expertsExtended${fileNum}";`);
}
console.log("\nSpread: " + Array.from({length: numFiles}, (_, f) => `...expertsExtended${f+2}`).join(","));
