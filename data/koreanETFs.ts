// 국내 상장 ETF 데이터베이스
// 2026-03-11 네이버 금융 실시간 API 기반 검증 완료

export interface KoreanETF {
  ticker: string;
  name: string;       // 네이버 금융 공식 종목명
  nameKr: string;     // 한국어 표시명
  category: string;
  subCategory: string;
  provider: string;
  isRecommended: boolean;
}

export const koreanETFs: KoreanETF[] = [
  // ═══════════════════════════════════════════════════════════
  // 국내주식 ETF
  // ═══════════════════════════════════════════════════════════
  { ticker: "069500", name: "KODEX 200", nameKr: "KODEX 200", category: "국내주식", subCategory: "대표지수", provider: "삼성", isRecommended: true },
  { ticker: "102110", name: "TIGER 200", nameKr: "TIGER 200", category: "국내주식", subCategory: "대표지수", provider: "미래에셋", isRecommended: false },
  { ticker: "226490", name: "KODEX 코스피", nameKr: "KODEX 코스피", category: "국내주식", subCategory: "대표지수", provider: "삼성", isRecommended: false },
  { ticker: "229200", name: "KODEX 코스닥150", nameKr: "KODEX 코스닥150", category: "국내주식", subCategory: "대표지수", provider: "삼성", isRecommended: false },
  { ticker: "148020", name: "RISE 200", nameKr: "RISE 200", category: "국내주식", subCategory: "대표지수", provider: "KB", isRecommended: false },
  { ticker: "152100", name: "PLUS 200", nameKr: "PLUS 200", category: "국내주식", subCategory: "대표지수", provider: "한화", isRecommended: false },
  { ticker: "069660", name: "KIWOOM 200", nameKr: "KIWOOM 200", category: "국내주식", subCategory: "대표지수", provider: "키움", isRecommended: false },
  { ticker: "278530", name: "KODEX 200TR", nameKr: "KODEX 200TR", category: "국내주식", subCategory: "대표지수", provider: "삼성", isRecommended: false },
  { ticker: "395170", name: "KODEX Top10동일가중", nameKr: "KODEX Top10동일가중", category: "국내주식", subCategory: "대표지수", provider: "삼성", isRecommended: false },
  { ticker: "292150", name: "TIGER 코리아TOP10", nameKr: "TIGER 코리아TOP10", category: "국내주식", subCategory: "대표지수", provider: "미래에셋", isRecommended: false },
  { ticker: "122630", name: "KODEX 레버리지", nameKr: "KODEX 레버리지", category: "국내주식", subCategory: "레버리지", provider: "삼성", isRecommended: false },
  { ticker: "091160", name: "KODEX 반도체", nameKr: "KODEX 반도체", category: "국내주식", subCategory: "반도체", provider: "삼성", isRecommended: true },
  { ticker: "396500", name: "TIGER 반도체TOP10", nameKr: "TIGER 반도체TOP10", category: "국내주식", subCategory: "반도체", provider: "미래에셋", isRecommended: false },
  { ticker: "091170", name: "KODEX 은행", nameKr: "KODEX 은행", category: "국내주식", subCategory: "금융", provider: "삼성", isRecommended: false },
  { ticker: "091180", name: "KODEX 자동차", nameKr: "KODEX 자동차", category: "국내주식", subCategory: "자동차", provider: "삼성", isRecommended: false },
  { ticker: "266370", name: "KODEX IT", nameKr: "KODEX IT", category: "국내주식", subCategory: "IT", provider: "삼성", isRecommended: false },
  { ticker: "305720", name: "KODEX 2차전지산업", nameKr: "KODEX 2차전지산업", category: "국내주식", subCategory: "2차전지", provider: "삼성", isRecommended: true },
  { ticker: "305540", name: "TIGER 2차전지테마", nameKr: "TIGER 2차전지테마", category: "국내주식", subCategory: "2차전지", provider: "미래에셋", isRecommended: false },
  { ticker: "394670", name: "TIGER 글로벌리튬&2차전지SOLACTIVE(합성)", nameKr: "TIGER 글로벌리튬&2차전지", category: "국내주식", subCategory: "2차전지", provider: "미래에셋", isRecommended: false },
  { ticker: "455850", name: "SOL AI반도체소부장", nameKr: "SOL AI반도체소부장", category: "국내주식", subCategory: "반도체", provider: "신한", isRecommended: false },
  { ticker: "244580", name: "KODEX 바이오", nameKr: "KODEX 바이오", category: "국내주식", subCategory: "바이오", provider: "삼성", isRecommended: false },
  { ticker: "227540", name: "TIGER 200 헬스케어", nameKr: "TIGER 200 헬스케어", category: "국내주식", subCategory: "바이오", provider: "미래에셋", isRecommended: false },
  { ticker: "143860", name: "TIGER 헬스케어", nameKr: "TIGER 헬스케어", category: "국내주식", subCategory: "바이오", provider: "미래에셋", isRecommended: false },
  { ticker: "161510", name: "PLUS 고배당주", nameKr: "PLUS 고배당주", category: "국내주식", subCategory: "배당", provider: "한화", isRecommended: false },
  { ticker: "211560", name: "TIGER 배당성장", nameKr: "TIGER 배당성장", category: "국내주식", subCategory: "배당", provider: "미래에셋", isRecommended: false },
  { ticker: "104530", name: "KIWOOM 고배당", nameKr: "KIWOOM 고배당", category: "국내주식", subCategory: "배당", provider: "키움", isRecommended: false },
  { ticker: "210780", name: "TIGER 코스피고배당", nameKr: "TIGER 코스피고배당", category: "국내주식", subCategory: "배당", provider: "미래에셋", isRecommended: false },
  { ticker: "315960", name: "RISE 대형고배당10TR", nameKr: "RISE 대형고배당10TR", category: "국내주식", subCategory: "배당", provider: "KB", isRecommended: false },
  { ticker: "266360", name: "KODEX K콘텐츠", nameKr: "KODEX K콘텐츠", category: "국내주식", subCategory: "미디어", provider: "삼성", isRecommended: false },
  { ticker: "117700", name: "KODEX 건설", nameKr: "KODEX 건설", category: "국내주식", subCategory: "건설", provider: "삼성", isRecommended: false },
  { ticker: "140710", name: "KODEX 운송", nameKr: "KODEX 운송", category: "국내주식", subCategory: "운송", provider: "삼성", isRecommended: false },
  { ticker: "140700", name: "KODEX 보험", nameKr: "KODEX 보험", category: "국내주식", subCategory: "금융", provider: "삼성", isRecommended: false },
  { ticker: "227550", name: "TIGER 200 산업재", nameKr: "TIGER 200 산업재", category: "국내주식", subCategory: "산업재", provider: "미래에셋", isRecommended: false },
  { ticker: "117460", name: "KODEX 에너지화학", nameKr: "KODEX 에너지화학", category: "국내주식", subCategory: "에너지", provider: "삼성", isRecommended: false },
  { ticker: "228790", name: "TIGER 화장품", nameKr: "TIGER 화장품", category: "국내주식", subCategory: "소비재", provider: "미래에셋", isRecommended: false },
  { ticker: "228800", name: "TIGER 여행레저", nameKr: "TIGER 여행레저", category: "국내주식", subCategory: "소비재", provider: "미래에셋", isRecommended: false },
  { ticker: "139220", name: "TIGER 200 건설", nameKr: "TIGER 200 건설", category: "국내주식", subCategory: "건설", provider: "미래에셋", isRecommended: false },
  { ticker: "139230", name: "TIGER 200 중공업", nameKr: "TIGER 200 중공업", category: "국내주식", subCategory: "산업재", provider: "미래에셋", isRecommended: false },
  { ticker: "139240", name: "TIGER 200 철강소재", nameKr: "TIGER 200 철강소재", category: "국내주식", subCategory: "소재", provider: "미래에셋", isRecommended: false },

  // ═══════════════════════════════════════════════════════════
  // 해외주식 ETF
  // ═══════════════════════════════════════════════════════════
  { ticker: "360750", name: "TIGER 미국S&P500", nameKr: "TIGER 미국S&P500", category: "해외주식", subCategory: "미국지수", provider: "미래에셋", isRecommended: true },
  { ticker: "133690", name: "TIGER 미국나스닥100", nameKr: "TIGER 미국나스닥100", category: "해외주식", subCategory: "미국지수", provider: "미래에셋", isRecommended: true },
  { ticker: "143850", name: "TIGER 미국S&P500선물(H)", nameKr: "TIGER 미국S&P500선물(H)", category: "해외주식", subCategory: "미국지수", provider: "미래에셋", isRecommended: true },
  { ticker: "381180", name: "TIGER 미국필라델피아반도체나스닥", nameKr: "TIGER 미국필라델피아반도체", category: "해외주식", subCategory: "미국반도체", provider: "미래에셋", isRecommended: true },
  { ticker: "379800", name: "KODEX 미국S&P500", nameKr: "KODEX 미국S&P500", category: "해외주식", subCategory: "미국지수", provider: "삼성", isRecommended: false },
  { ticker: "379810", name: "KODEX 미국나스닥100", nameKr: "KODEX 미국나스닥100", category: "해외주식", subCategory: "미국지수", provider: "삼성", isRecommended: false },
  { ticker: "360200", name: "ACE 미국S&P500", nameKr: "ACE 미국S&P500", category: "해외주식", subCategory: "미국지수", provider: "한국투자", isRecommended: false },
  { ticker: "368590", name: "RISE 미국나스닥100", nameKr: "RISE 미국나스닥100", category: "해외주식", subCategory: "미국지수", provider: "KB", isRecommended: false },
  { ticker: "453080", name: "KIWOOM 미국나스닥100(H)", nameKr: "KIWOOM 미국나스닥100(H)", category: "해외주식", subCategory: "미국지수", provider: "키움", isRecommended: false },
  { ticker: "245340", name: "TIGER 미국다우존스30", nameKr: "TIGER 미국다우존스30", category: "해외주식", subCategory: "미국지수", provider: "미래에셋", isRecommended: false },
  { ticker: "458730", name: "TIGER 미국배당다우존스", nameKr: "TIGER 미국배당다우존스", category: "해외주식", subCategory: "미국배당", provider: "미래에셋", isRecommended: true },
  { ticker: "446720", name: "SOL 미국배당다우존스", nameKr: "SOL 미국배당다우존스", category: "해외주식", subCategory: "미국배당", provider: "신한", isRecommended: false },
  { ticker: "381170", name: "TIGER 미국테크TOP10 INDXX", nameKr: "TIGER 미국테크TOP10", category: "해외주식", subCategory: "미국기술", provider: "미래에셋", isRecommended: false },
  { ticker: "411420", name: "KODEX 미국나스닥AI테크액티브", nameKr: "KODEX 미국나스닥AI테크", category: "해외주식", subCategory: "미국AI", provider: "삼성", isRecommended: false },
  { ticker: "409820", name: "KODEX 미국나스닥100레버리지(합성 H)", nameKr: "KODEX 미국나스닥100레버리지(H)", category: "해외주식", subCategory: "미국레버리지", provider: "삼성", isRecommended: false },
  { ticker: "409810", name: "KODEX 미국나스닥100선물인버스(H)", nameKr: "KODEX 미국나스닥100인버스(H)", category: "해외주식", subCategory: "미국인버스", provider: "삼성", isRecommended: false },
  { ticker: "456250", name: "KODEX 유럽명품TOP10 STOXX", nameKr: "KODEX 유럽명품TOP10", category: "해외주식", subCategory: "유럽", provider: "삼성", isRecommended: false },
  { ticker: "195930", name: "TIGER 유로스탁스50(합성 H)", nameKr: "TIGER 유로스탁스50(H)", category: "해외주식", subCategory: "유럽", provider: "미래에셋", isRecommended: false },
  { ticker: "241180", name: "TIGER 일본니케이225", nameKr: "TIGER 일본니케이225", category: "해외주식", subCategory: "일본", provider: "미래에셋", isRecommended: false },
  { ticker: "101280", name: "KODEX 일본TOPIX100", nameKr: "KODEX 일본TOPIX100", category: "해외주식", subCategory: "일본", provider: "삼성", isRecommended: false },
  { ticker: "192090", name: "TIGER 차이나CSI300", nameKr: "TIGER 차이나CSI300", category: "해외주식", subCategory: "중국", provider: "미래에셋", isRecommended: false },
  { ticker: "168580", name: "ACE 중국본토CSI300", nameKr: "ACE 중국본토CSI300", category: "해외주식", subCategory: "중국", provider: "한국투자", isRecommended: false },
  { ticker: "371460", name: "TIGER 차이나전기차SOLACTIVE", nameKr: "TIGER 차이나전기차", category: "해외주식", subCategory: "중국", provider: "미래에셋", isRecommended: false },
  { ticker: "371160", name: "TIGER 차이나항셍테크", nameKr: "TIGER 차이나항셍테크", category: "해외주식", subCategory: "중국", provider: "미래에셋", isRecommended: false },
  { ticker: "396510", name: "TIGER 차이나클린에너지SOLACTIVE", nameKr: "TIGER 차이나클린에너지", category: "해외주식", subCategory: "중국", provider: "미래에셋", isRecommended: false },
  { ticker: "396520", name: "TIGER 차이나반도체FACTSET", nameKr: "TIGER 차이나반도체", category: "해외주식", subCategory: "중국", provider: "미래에셋", isRecommended: false },
  { ticker: "453870", name: "TIGER 인도니프티50", nameKr: "TIGER 인도니프티50", category: "해외주식", subCategory: "인도", provider: "미래에셋", isRecommended: false },
  { ticker: "453810", name: "KODEX 인도Nifty50", nameKr: "KODEX 인도Nifty50", category: "해외주식", subCategory: "인도", provider: "삼성", isRecommended: false },
  { ticker: "236350", name: "TIGER 인도니프티50레버리지(합성)", nameKr: "TIGER 인도니프티50레버리지", category: "해외주식", subCategory: "인도", provider: "미래에셋", isRecommended: false },
  { ticker: "453820", name: "KODEX 인도Nifty50레버리지(합성)", nameKr: "KODEX 인도Nifty50레버리지", category: "해외주식", subCategory: "인도", provider: "삼성", isRecommended: false },
  { ticker: "200250", name: "KIWOOM 인도Nifty50(합성)", nameKr: "KIWOOM 인도Nifty50", category: "해외주식", subCategory: "인도", provider: "키움", isRecommended: false },
  { ticker: "195980", name: "PLUS 신흥국MSCI(합성 H)", nameKr: "PLUS 신흥국MSCI(H)", category: "해외주식", subCategory: "신흥국", provider: "한화", isRecommended: false },
  { ticker: "354350", name: "HANARO 글로벌럭셔리S&P(합성)", nameKr: "HANARO 글로벌럭셔리", category: "해외주식", subCategory: "글로벌", provider: "NH아문디", isRecommended: false },

  // ═══════════════════════════════════════════════════════════
  // 채권 ETF
  // ═══════════════════════════════════════════════════════════
  { ticker: "272580", name: "TIGER 단기채권액티브", nameKr: "TIGER 단기채권", category: "채권", subCategory: "국내단기", provider: "미래에셋", isRecommended: true },
  { ticker: "153130", name: "KODEX 단기채권", nameKr: "KODEX 단기채권", category: "채권", subCategory: "국내단기", provider: "삼성", isRecommended: false },
  { ticker: "182490", name: "TIGER 단기선진하이일드(합성 H)", nameKr: "TIGER 단기선진하이일드(H)", category: "채권", subCategory: "해외채권", provider: "미래에셋", isRecommended: false },
  { ticker: "114260", name: "KODEX 국고채3년", nameKr: "KODEX 국고채3년", category: "채권", subCategory: "국내중기", provider: "삼성", isRecommended: false },
  { ticker: "148070", name: "KIWOOM 국고채10년", nameKr: "KIWOOM 국고채10년", category: "채권", subCategory: "국내장기", provider: "키움", isRecommended: true },
  { ticker: "152380", name: "KODEX 국채선물10년", nameKr: "KODEX 국채선물10년", category: "채권", subCategory: "국내장기", provider: "삼성", isRecommended: false },
  { ticker: "302190", name: "TIGER 중장기국채", nameKr: "TIGER 중장기국채", category: "채권", subCategory: "국내장기", provider: "미래에셋", isRecommended: false },
  { ticker: "451540", name: "TIGER 종합채권(AA-이상)액티브", nameKr: "TIGER 종합채권", category: "채권", subCategory: "국내종합", provider: "미래에셋", isRecommended: false },
  { ticker: "451600", name: "PLUS 국고채30년액티브", nameKr: "PLUS 국고채30년", category: "채권", subCategory: "국내초장기", provider: "한화", isRecommended: false },
  { ticker: "305080", name: "TIGER 미국채10년선물", nameKr: "TIGER 미국채10년선물", category: "채권", subCategory: "미국채", provider: "미래에셋", isRecommended: true },
  { ticker: "308620", name: "KODEX 미국10년국채선물", nameKr: "KODEX 미국10년국채선물", category: "채권", subCategory: "미국채", provider: "삼성", isRecommended: false },

  // ═══════════════════════════════════════════════════════════
  // 원자재 ETF
  // ═══════════════════════════════════════════════════════════
  { ticker: "132030", name: "KODEX 골드선물(H)", nameKr: "KODEX 골드선물(H)", category: "원자재", subCategory: "금", provider: "삼성", isRecommended: true },
  { ticker: "319640", name: "TIGER 골드선물(H)", nameKr: "TIGER 골드선물(H)", category: "원자재", subCategory: "금", provider: "미래에셋", isRecommended: false },
  { ticker: "411060", name: "ACE KRX금현물", nameKr: "ACE KRX금현물", category: "원자재", subCategory: "금", provider: "한국투자", isRecommended: false },
  { ticker: "144600", name: "KODEX 은선물(H)", nameKr: "KODEX 은선물(H)", category: "원자재", subCategory: "은", provider: "삼성", isRecommended: false },
  { ticker: "130680", name: "TIGER 원유선물Enhanced(H)", nameKr: "TIGER 원유선물(H)", category: "원자재", subCategory: "원유", provider: "미래에셋", isRecommended: true },
  { ticker: "217770", name: "TIGER 원유선물인버스(H)", nameKr: "TIGER 원유선물인버스(H)", category: "원자재", subCategory: "원유인버스", provider: "미래에셋", isRecommended: false },
  { ticker: "271060", name: "KODEX 3대농산물선물(H)", nameKr: "KODEX 농산물선물(H)", category: "원자재", subCategory: "농산물", provider: "삼성", isRecommended: true },

  // ═══════════════════════════════════════════════════════════
  // 인버스/레버리지 ETF
  // ═══════════════════════════════════════════════════════════
  { ticker: "114800", name: "KODEX 인버스", nameKr: "KODEX 인버스", category: "인버스/레버리지", subCategory: "인버스", provider: "삼성", isRecommended: true },
  { ticker: "252670", name: "KODEX 200선물인버스2X", nameKr: "KODEX 인버스2X", category: "인버스/레버리지", subCategory: "인버스", provider: "삼성", isRecommended: true },
  { ticker: "145670", name: "ACE 인버스", nameKr: "ACE 인버스", category: "인버스/레버리지", subCategory: "인버스", provider: "한국투자", isRecommended: false },
  { ticker: "251340", name: "KODEX 코스닥150선물인버스", nameKr: "KODEX 코스닥150인버스", category: "인버스/레버리지", subCategory: "인버스", provider: "삼성", isRecommended: false },
  { ticker: "252710", name: "TIGER 200선물인버스2X", nameKr: "TIGER 인버스2X", category: "인버스/레버리지", subCategory: "인버스", provider: "미래에셋", isRecommended: false },

  // ═══════════════════════════════════════════════════════════
  // 통화 ETF
  // ═══════════════════════════════════════════════════════════
  { ticker: "261240", name: "KODEX 미국달러선물", nameKr: "KODEX 달러선물", category: "통화", subCategory: "달러", provider: "삼성", isRecommended: true },
  { ticker: "261250", name: "KODEX 미국달러선물레버리지", nameKr: "KODEX 달러선물레버리지", category: "통화", subCategory: "달러", provider: "삼성", isRecommended: false },
  { ticker: "261270", name: "KODEX 미국달러선물인버스", nameKr: "KODEX 달러선물인버스", category: "통화", subCategory: "달러", provider: "삼성", isRecommended: false },

  // ═══════════════════════════════════════════════════════════
  // 리츠/부동산 ETF
  // ═══════════════════════════════════════════════════════════
  { ticker: "329200", name: "TIGER 리츠부동산인프라", nameKr: "TIGER 리츠부동산인프라", category: "리츠", subCategory: "한국리츠", provider: "미래에셋", isRecommended: false },
  { ticker: "352560", name: "KODEX 미국부동산리츠(H)", nameKr: "KODEX 미국부동산리츠(H)", category: "리츠", subCategory: "미국리츠", provider: "삼성", isRecommended: false },

  // ═══════════════════════════════════════════════════════════
  // 테마 ETF
  // ═══════════════════════════════════════════════════════════
  { ticker: "364960", name: "TIGER BBIG", nameKr: "TIGER BBIG", category: "테마", subCategory: "BBIG", provider: "미래에셋", isRecommended: false },
  { ticker: "364690", name: "KODEX 혁신기술테마액티브", nameKr: "KODEX 혁신기술테마", category: "테마", subCategory: "혁신기술", provider: "삼성", isRecommended: false },
  { ticker: "401470", name: "KODEX 메타버스액티브", nameKr: "KODEX 메타버스", category: "테마", subCategory: "메타버스", provider: "삼성", isRecommended: false },
  { ticker: "456600", name: "TIME 글로벌AI인공지능액티브", nameKr: "TIME 글로벌AI인공지능", category: "테마", subCategory: "AI", provider: "타임폴리오", isRecommended: false },
];

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
