import * as fs from "fs";
import * as path from "path";

interface KoreanETF {
  ticker: string;
  name: string;
  nameKr: string;
  category: string;
  subCategory: string;
  provider: string;
  isRecommended: boolean;
}

// Comprehensive Korean ETF database with real tickers
const etfs: KoreanETF[] = [
  // ═══ 국내주식 ═══
  // 대표지수
  {ticker:"069500",name:"KODEX 200",nameKr:"KODEX 200",category:"국내주식",subCategory:"대표지수",provider:"삼성",isRecommended:true},
  {ticker:"102110",name:"TIGER 200",nameKr:"TIGER 200",category:"국내주식",subCategory:"대표지수",provider:"미래에셋",isRecommended:false},
  {ticker:"226490",name:"KODEX KOSPI",nameKr:"KODEX 코스피",category:"국내주식",subCategory:"대표지수",provider:"삼성",isRecommended:false},
  {ticker:"229200",name:"KODEX KOSDAQ 150",nameKr:"KODEX 코스닥150",category:"국내주식",subCategory:"대표지수",provider:"삼성",isRecommended:false},
  {ticker:"251340",name:"KODEX KOSDAQ",nameKr:"KODEX 코스닥",category:"국내주식",subCategory:"대표지수",provider:"삼성",isRecommended:false},
  {ticker:"148020",name:"KBSTAR 200",nameKr:"KBSTAR 200",category:"국내주식",subCategory:"대표지수",provider:"KB",isRecommended:false},
  {ticker:"152100",name:"ARIRANG 200",nameKr:"ARIRANG 200",category:"국내주식",subCategory:"대표지수",provider:"한화",isRecommended:false},
  {ticker:"069660",name:"KOSEF 200",nameKr:"KOSEF 200",category:"국내주식",subCategory:"대표지수",provider:"키움",isRecommended:false},
  {ticker:"360200",name:"KINDEX 200",nameKr:"KINDEX 200",category:"국내주식",subCategory:"대표지수",provider:"한국투자",isRecommended:false},
  {ticker:"278530",name:"KODEX KOSDAQ150레버리지",nameKr:"KODEX 코스닥150 레버리지",category:"국내주식",subCategory:"대표지수",provider:"삼성",isRecommended:false},
  {ticker:"122630",name:"KODEX 레버리지",nameKr:"KODEX 레버리지",category:"국내주식",subCategory:"레버리지",provider:"삼성",isRecommended:false},
  {ticker:"252710",name:"TIGER 200 IT",nameKr:"TIGER 200 IT",category:"국내주식",subCategory:"섹터",provider:"미래에셋",isRecommended:false},

  // 반도체
  {ticker:"091160",name:"KODEX Semiconductor",nameKr:"KODEX 반도체",category:"국내주식",subCategory:"반도체",provider:"삼성",isRecommended:true},
  {ticker:"091170",name:"KODEX 은행",nameKr:"KODEX 은행",category:"국내주식",subCategory:"금융",provider:"삼성",isRecommended:false},
  {ticker:"091180",name:"KODEX 자동차",nameKr:"KODEX 자동차",category:"국내주식",subCategory:"자동차",provider:"삼성",isRecommended:false},
  {ticker:"266370",name:"KODEX 삼성그룹밸류",nameKr:"KODEX 삼성그룹밸류",category:"국내주식",subCategory:"그룹",provider:"삼성",isRecommended:false},
  {ticker:"395170",name:"TIGER 반도체TOP10",nameKr:"TIGER 반도체TOP10",category:"국내주식",subCategory:"반도체",provider:"미래에셋",isRecommended:false},
  {ticker:"396500",name:"TIGER KRX반도체",nameKr:"TIGER KRX반도체",category:"국내주식",subCategory:"반도체",provider:"미래에셋",isRecommended:false},

  // 2차전지/배터리
  {ticker:"305720",name:"KODEX 2차전지산업",nameKr:"KODEX 2차전지산업",category:"국내주식",subCategory:"2차전지",provider:"삼성",isRecommended:true},
  {ticker:"394670",name:"TIGER 2차전지TOP10",nameKr:"TIGER 2차전지TOP10",category:"국내주식",subCategory:"2차전지",provider:"미래에셋",isRecommended:false},
  {ticker:"455850",name:"KODEX 2차전지핵심소재10",nameKr:"KODEX 2차전지핵심소재10",category:"국내주식",subCategory:"2차전지",provider:"삼성",isRecommended:false},

  // 바이오/헬스케어
  {ticker:"244580",name:"KODEX 바이오",nameKr:"KODEX 바이오",category:"국내주식",subCategory:"바이오",provider:"삼성",isRecommended:false},
  {ticker:"227540",name:"TIGER 헬스케어",nameKr:"TIGER 헬스케어",category:"국내주식",subCategory:"바이오",provider:"미래에셋",isRecommended:false},
  {ticker:"143860",name:"TIGER 헬스케어",nameKr:"TIGER 의료기기",category:"국내주식",subCategory:"바이오",provider:"미래에셋",isRecommended:false},

  // 배당/가치
  {ticker:"161510",name:"ARIRANG 고배당주",nameKr:"ARIRANG 고배당주",category:"국내주식",subCategory:"배당",provider:"한화",isRecommended:false},
  {ticker:"211560",name:"TIGER 배당성장",nameKr:"TIGER 배당성장",category:"국내주식",subCategory:"배당",provider:"미래에셋",isRecommended:false},
  {ticker:"104530",name:"KODEX 고배당",nameKr:"KODEX 고배당",category:"국내주식",subCategory:"배당",provider:"삼성",isRecommended:false},
  {ticker:"210780",name:"TIGER 코스피고배당",nameKr:"TIGER 코스피고배당",category:"국내주식",subCategory:"배당",provider:"미래에셋",isRecommended:false},
  {ticker:"315960",name:"KODEX 고배당가치",nameKr:"KODEX 고배당가치",category:"국내주식",subCategory:"배당",provider:"삼성",isRecommended:false},

  // 기타 섹터
  {ticker:"266360",name:"KODEX 건설",nameKr:"KODEX 건설",category:"국내주식",subCategory:"건설",provider:"삼성",isRecommended:false},
  {ticker:"117700",name:"KODEX 건설",nameKr:"KODEX 건설",category:"국내주식",subCategory:"건설",provider:"삼성",isRecommended:false},
  {ticker:"140710",name:"KODEX 보험",nameKr:"KODEX 보험",category:"국내주식",subCategory:"금융",provider:"삼성",isRecommended:false},
  {ticker:"227550",name:"TIGER 에너지화학",nameKr:"TIGER 에너지화학",category:"국내주식",subCategory:"에너지",provider:"미래에셋",isRecommended:false},
  {ticker:"117460",name:"KODEX 에너지화학",nameKr:"KODEX 에너지화학",category:"국내주식",subCategory:"에너지",provider:"삼성",isRecommended:false},
  {ticker:"140700",name:"KODEX 운송",nameKr:"KODEX 운송",category:"국내주식",subCategory:"운송",provider:"삼성",isRecommended:false},
  {ticker:"228790",name:"TIGER 화장품",nameKr:"TIGER 화장품",category:"국내주식",subCategory:"소비재",provider:"미래에셋",isRecommended:false},
  {ticker:"228800",name:"TIGER 여행레저",nameKr:"TIGER 여행레저",category:"국내주식",subCategory:"소비재",provider:"미래에셋",isRecommended:false},
  {ticker:"364690",name:"KODEX AI반도체핵심장비",nameKr:"KODEX AI반도체핵심장비",category:"국내주식",subCategory:"AI/반도체",provider:"삼성",isRecommended:false},
  {ticker:"411060",name:"KODEX K-신재생에너지액티브",nameKr:"KODEX K-신재생에너지",category:"국내주식",subCategory:"신재생",provider:"삼성",isRecommended:false},

  // ═══ 해외주식 ═══
  // 미국 대표지수
  {ticker:"360750",name:"TIGER S&P500",nameKr:"TIGER 미국S&P500",category:"해외주식",subCategory:"미국지수",provider:"미래에셋",isRecommended:true},
  {ticker:"133690",name:"TIGER 나스닥100",nameKr:"TIGER 미국나스닥100",category:"해외주식",subCategory:"미국지수",provider:"미래에셋",isRecommended:true},
  {ticker:"143850",name:"TIGER S&P500선물(H)",nameKr:"TIGER 미국S&P500(환헤지)",category:"해외주식",subCategory:"미국지수",provider:"미래에셋",isRecommended:true},
  {ticker:"381180",name:"TIGER 필라델피아반도체나스닥",nameKr:"TIGER 미국필라델피아반도체",category:"해외주식",subCategory:"미국반도체",provider:"미래에셋",isRecommended:true},
  {ticker:"379800",name:"KODEX 미국S&P500TR",nameKr:"KODEX 미국S&P500TR",category:"해외주식",subCategory:"미국지수",provider:"삼성",isRecommended:false},
  {ticker:"379810",name:"KODEX 미국나스닥100TR",nameKr:"KODEX 미국나스닥100TR",category:"해외주식",subCategory:"미국지수",provider:"삼성",isRecommended:false},
  {ticker:"368590",name:"KINDEX 미국S&P500",nameKr:"KINDEX 미국S&P500",category:"해외주식",subCategory:"미국지수",provider:"한국투자",isRecommended:false},
  {ticker:"453080",name:"TIGER 미국나스닥100TR(H)",nameKr:"TIGER 미국나스닥100(환헤지)",category:"해외주식",subCategory:"미국지수",provider:"미래에셋",isRecommended:false},
  {ticker:"409820",name:"KODEX 미국나스닥100(H)",nameKr:"KODEX 미국나스닥100(환헤지)",category:"해외주식",subCategory:"미국지수",provider:"삼성",isRecommended:false},
  {ticker:"401470",name:"TIGER 미국다우존스30",nameKr:"TIGER 미국다우존스30",category:"해외주식",subCategory:"미국지수",provider:"미래에셋",isRecommended:false},

  // 미국 섹터/테마
  {ticker:"458730",name:"TIGER 미국배당다우존스",nameKr:"TIGER 미국배당다우존스",category:"해외주식",subCategory:"미국배당",provider:"미래에셋",isRecommended:true},
  {ticker:"446720",name:"KODEX 미국배당프리미엄액티브",nameKr:"KODEX 미국배당프리미엄",category:"해외주식",subCategory:"미국배당",provider:"삼성",isRecommended:false},
  {ticker:"381170",name:"TIGER 미국테크TOP10 INDXX",nameKr:"TIGER 미국테크TOP10",category:"해외주식",subCategory:"미국기술",provider:"미래에셋",isRecommended:false},
  {ticker:"453870",name:"TIGER 미국AI빅테크10",nameKr:"TIGER 미국AI빅테크10",category:"해외주식",subCategory:"미국AI",provider:"미래에셋",isRecommended:false},
  {ticker:"456250",name:"KODEX 미국AI테크TOP10",nameKr:"KODEX 미국AI테크TOP10",category:"해외주식",subCategory:"미국AI",provider:"삼성",isRecommended:false},
  {ticker:"394280",name:"TIGER 미국헬스케어",nameKr:"TIGER 미국헬스케어",category:"해외주식",subCategory:"미국헬스",provider:"미래에셋",isRecommended:false},
  {ticker:"396510",name:"TIGER 미국필라델피아AI반도체",nameKr:"TIGER 미국AI반도체",category:"해외주식",subCategory:"미국반도체",provider:"미래에셋",isRecommended:false},

  // 미국 레버리지/인버스
  {ticker:"409810",name:"KODEX 미국S&P500(H)인버스",nameKr:"KODEX 미국S&P500인버스(H)",category:"해외주식",subCategory:"미국인버스",provider:"삼성",isRecommended:false},

  // 유럽
  {ticker:"195930",name:"TIGER 유로스탁스50(H)",nameKr:"TIGER 유로스탁스50(환헤지)",category:"해외주식",subCategory:"유럽",provider:"미래에셋",isRecommended:false},
  {ticker:"245340",name:"KODEX 유럽STOXX50(H)",nameKr:"KODEX 유럽STOXX50(환헤지)",category:"해외주식",subCategory:"유럽",provider:"삼성",isRecommended:false},

  // 일본
  {ticker:"241180",name:"TIGER 일본니케이225",nameKr:"TIGER 일본니케이225",category:"해외주식",subCategory:"일본",provider:"미래에셋",isRecommended:false},
  {ticker:"101280",name:"KODEX 일본TOPIX100",nameKr:"KODEX 일본TOPIX100",category:"해외주식",subCategory:"일본",provider:"삼성",isRecommended:false},

  // 중국
  {ticker:"192090",name:"TIGER 차이나CSI300",nameKr:"TIGER 차이나CSI300",category:"해외주식",subCategory:"중국",provider:"미래에셋",isRecommended:false},
  {ticker:"168580",name:"KODEX 차이나H",nameKr:"KODEX 차이나H",category:"해외주식",subCategory:"중국",provider:"삼성",isRecommended:false},
  {ticker:"371460",name:"TIGER 차이나전기차SOLACTIVE",nameKr:"TIGER 중국전기차",category:"해외주식",subCategory:"중국",provider:"미래에셋",isRecommended:false},
  {ticker:"453810",name:"TIGER 차이나항셍테크",nameKr:"TIGER 차이나항셍테크",category:"해외주식",subCategory:"중국",provider:"미래에셋",isRecommended:false},

  // 인도/신흥국
  {ticker:"236350",name:"TIGER 인도니프티50",nameKr:"TIGER 인도니프티50",category:"해외주식",subCategory:"인도",provider:"미래에셋",isRecommended:false},
  {ticker:"453820",name:"KODEX 인도Nifty50",nameKr:"KODEX 인도Nifty50",category:"해외주식",subCategory:"인도",provider:"삼성",isRecommended:false},
  {ticker:"195980",name:"TIGER 신흥국MSCI",nameKr:"TIGER 신흥국MSCI",category:"해외주식",subCategory:"신흥국",provider:"미래에셋",isRecommended:false},
  {ticker:"200250",name:"KODEX 베트남VN30",nameKr:"KODEX 베트남VN30",category:"해외주식",subCategory:"베트남",provider:"삼성",isRecommended:false},

  // ═══ 채권 ═══
  {ticker:"272580",name:"TIGER 단기채권액티브",nameKr:"TIGER 단기채권",category:"채권",subCategory:"국내단기",provider:"미래에셋",isRecommended:true},
  {ticker:"148070",name:"KOSEF 국고채10년",nameKr:"KOSEF 국고채10년",category:"채권",subCategory:"국내장기",provider:"키움",isRecommended:true},
  {ticker:"305080",name:"TIGER 미국채10년선물",nameKr:"TIGER 미국채10년선물",category:"채권",subCategory:"미국채",provider:"미래에셋",isRecommended:true},
  {ticker:"182490",name:"TIGER 단기통안채",nameKr:"TIGER 단기통안채",category:"채권",subCategory:"국내단기",provider:"미래에셋",isRecommended:false},
  {ticker:"153130",name:"KODEX 단기채권",nameKr:"KODEX 단기채권",category:"채권",subCategory:"국내단기",provider:"삼성",isRecommended:false},
  {ticker:"114260",name:"KODEX 국고채3년",nameKr:"KODEX 국고채3년",category:"채권",subCategory:"국내중기",provider:"삼성",isRecommended:false},
  {ticker:"152380",name:"KODEX 국고채10년",nameKr:"KODEX 국고채10년",category:"채권",subCategory:"국내장기",provider:"삼성",isRecommended:false},
  {ticker:"302190",name:"TIGER 미국채30년스트립액티브(H)",nameKr:"TIGER 미국채30년(H)",category:"채권",subCategory:"미국채",provider:"미래에셋",isRecommended:false},
  {ticker:"451540",name:"TIGER 미국30년국채프리미엄액티브(H)",nameKr:"TIGER 미국30년국채프리미엄(H)",category:"채권",subCategory:"미국채",provider:"미래에셋",isRecommended:false},
  {ticker:"308620",name:"KODEX 미국채울트라30년선물(H)",nameKr:"KODEX 미국채울트라30년(H)",category:"채권",subCategory:"미국채",provider:"삼성",isRecommended:false},
  {ticker:"453030",name:"KODEX 미국10년국채+12%프리미엄(합성H)",nameKr:"KODEX 미국10년국채프리미엄(H)",category:"채권",subCategory:"미국채",provider:"삼성",isRecommended:false},

  // ═══ 원자재/금/은 ═══
  {ticker:"132030",name:"KODEX 골드선물(H)",nameKr:"KODEX 골드선물(H)",category:"원자재",subCategory:"금",provider:"삼성",isRecommended:true},
  {ticker:"319640",name:"TIGER 골드선물(H)",nameKr:"TIGER 골드선물(H)",category:"원자재",subCategory:"금",provider:"미래에셋",isRecommended:false},
  {ticker:"411060",name:"KODEX 골드선물레버리지(H)",nameKr:"KODEX 골드선물레버리지(H)",category:"원자재",subCategory:"금",provider:"삼성",isRecommended:false},
  {ticker:"144600",name:"KODEX 은선물(H)",nameKr:"KODEX 은선물(H)",category:"원자재",subCategory:"은",provider:"삼성",isRecommended:false},
  {ticker:"130680",name:"TIGER 원유선물Enhanced(H)",nameKr:"TIGER 원유선물(H)",category:"원자재",subCategory:"원유",provider:"미래에셋",isRecommended:true},
  {ticker:"271060",name:"KODEX 3대농산물선물(H)",nameKr:"KODEX 농산물선물(H)",category:"원자재",subCategory:"농산물",provider:"삼성",isRecommended:true},
  {ticker:"217770",name:"TIGER 원자재",nameKr:"TIGER 원자재",category:"원자재",subCategory:"종합",provider:"미래에셋",isRecommended:false},

  // ═══ 인버스/헤지 ═══
  {ticker:"114800",name:"KODEX 인버스",nameKr:"KODEX 인버스",category:"인버스/레버리지",subCategory:"인버스",provider:"삼성",isRecommended:true},
  {ticker:"252670",name:"KODEX 200선물인버스2X",nameKr:"KODEX 인버스2X",category:"인버스/레버리지",subCategory:"인버스",provider:"삼성",isRecommended:true},
  {ticker:"145670",name:"KINDEX 인버스",nameKr:"KINDEX 인버스",category:"인버스/레버리지",subCategory:"인버스",provider:"한국투자",isRecommended:false},
  {ticker:"251340",name:"KODEX 코스닥150선물인버스",nameKr:"KODEX 코스닥150인버스",category:"인버스/레버리지",subCategory:"인버스",provider:"삼성",isRecommended:false},

  // ═══ 통화/달러 ═══
  {ticker:"261240",name:"KODEX 미국달러선물",nameKr:"KODEX 달러선물",category:"통화",subCategory:"달러",provider:"삼성",isRecommended:true},
  {ticker:"261250",name:"KODEX 미국달러선물인버스",nameKr:"KODEX 달러선물인버스",category:"통화",subCategory:"달러",provider:"삼성",isRecommended:false},
  {ticker:"139230",name:"TIGER 달러선물",nameKr:"TIGER 달러선물",category:"통화",subCategory:"달러",provider:"미래에셋",isRecommended:false},
  {ticker:"139240",name:"TIGER 달러선물인버스",nameKr:"TIGER 달러선물인버스",category:"통화",subCategory:"달러",provider:"미래에셋",isRecommended:false},
  {ticker:"261270",name:"KODEX 엔선물",nameKr:"KODEX 엔선물",category:"통화",subCategory:"엔",provider:"삼성",isRecommended:false},
  {ticker:"396490",name:"TIGER 유로선물",nameKr:"TIGER 유로선물",category:"통화",subCategory:"유로",provider:"미래에셋",isRecommended:false},

  // ═══ 부동산/리츠 ═══
  {ticker:"329200",name:"TIGER 미국MSCI리츠(H)",nameKr:"TIGER 미국리츠(H)",category:"리츠",subCategory:"미국리츠",provider:"미래에셋",isRecommended:false},
  {ticker:"352560",name:"KODEX 한국부동산리츠인프라",nameKr:"KODEX 한국리츠인프라",category:"리츠",subCategory:"한국리츠",provider:"삼성",isRecommended:false},

  // ═══ 테마/ESG ═══
  {ticker:"364960",name:"KODEX K-메타버스액티브",nameKr:"KODEX K-메타버스",category:"테마",subCategory:"메타버스",provider:"삼성",isRecommended:false},
  {ticker:"396520",name:"TIGER Fn메타버스",nameKr:"TIGER 메타버스",category:"테마",subCategory:"메타버스",provider:"미래에셋",isRecommended:false},
  {ticker:"371160",name:"TIGER 퓨처모빌리티액티브",nameKr:"TIGER 퓨처모빌리티",category:"테마",subCategory:"모빌리티",provider:"미래에셋",isRecommended:false},
  {ticker:"394670",name:"TIGER Fn수소경제",nameKr:"TIGER 수소경제",category:"테마",subCategory:"수소",provider:"미래에셋",isRecommended:false},
  {ticker:"456600",name:"TIGER AI코리아그로스",nameKr:"TIGER AI코리아",category:"테마",subCategory:"AI",provider:"미래에셋",isRecommended:false},
  {ticker:"411420",name:"KODEX K-친환경밸류체인액티브",nameKr:"KODEX K-친환경",category:"테마",subCategory:"친환경",provider:"삼성",isRecommended:false},
  {ticker:"354350",name:"KODEX 선진국MSCI World",nameKr:"KODEX 선진국MSCI",category:"해외주식",subCategory:"글로벌",provider:"삼성",isRecommended:false},
  {ticker:"292150",name:"TIGER 글로벌멀티에셋인컴",nameKr:"TIGER 글로벌인컴",category:"해외주식",subCategory:"글로벌",provider:"미래에셋",isRecommended:false},
];

// Deduplicate by ticker
const seen = new Set<string>();
const unique = etfs.filter(e => {
  if (seen.has(e.ticker)) return false;
  seen.add(e.ticker);
  return true;
});

const content = `// 국내 상장 ETF 전체 데이터베이스
// 자동 생성됨 - 직접 수정하지 마세요

export interface KoreanETF {
  ticker: string;
  name: string;
  nameKr: string;
  category: string;      // 국내주식, 해외주식, 채권, 원자재, 인버스/레버리지, 통화, 리츠, 테마
  subCategory: string;   // 세부 분류
  provider: string;      // 운용사
  isRecommended: boolean; // AI 추천 종목 여부
}

export const koreanETFs: KoreanETF[] = ${JSON.stringify(unique, null, 2)};

export const etfCategories = [...new Set(koreanETFs.map(e => e.category))];
export const etfSubCategories = [...new Set(koreanETFs.map(e => e.subCategory))];
export const etfProviders = [...new Set(koreanETFs.map(e => e.provider))];

export function getETFByTicker(ticker: string): KoreanETF | undefined {
  return koreanETFs.find(e => e.ticker === ticker);
}

export function getRecommendedETFs(): KoreanETF[] {
  return koreanETFs.filter(e => e.isRecommended);
}

export function searchETFs(query: string): KoreanETF[] {
  const q = query.toLowerCase();
  return koreanETFs.filter(e =>
    e.ticker.includes(q) ||
    e.name.toLowerCase().includes(q) ||
    e.nameKr.includes(q) ||
    e.category.includes(q) ||
    e.subCategory.includes(q)
  );
}
`;

fs.writeFileSync(path.join(__dirname, "..", "data", "koreanETFs.ts"), content, "utf8");
console.log(`Wrote koreanETFs.ts with ${unique.length} unique ETFs (${unique.filter(e => e.isRecommended).length} recommended)`);
