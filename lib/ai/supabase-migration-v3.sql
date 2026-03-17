-- ============================================================
-- Migration V3: 평가 시스템 안정화
-- - prediction_results에 누락 컬럼 추가
-- - ai_predictions에 중복 방지 인덱스 추가
-- - 고아 prediction_results 정리
-- ============================================================

-- 1. prediction_results 테이블에 누락된 컬럼 추가
ALTER TABLE prediction_results
  ADD COLUMN IF NOT EXISTS accuracy_score NUMERIC DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS grade TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS abstained BOOLEAN DEFAULT FALSE;

-- 2. ai_predictions에 cycle_id + asset_id 복합 인덱스 (중복 방지 + 조회 성능)
CREATE INDEX IF NOT EXISTS idx_ai_predictions_cycle_asset
  ON ai_predictions (cycle_id, asset_id);

-- 3. ai_predictions에 created_at 인덱스 (최신 사이클 조회 성능)
CREATE INDEX IF NOT EXISTS idx_ai_predictions_created_at
  ON ai_predictions (created_at DESC);

-- 4. prediction_results에 prediction_id 인덱스 (평가 여부 조회)
CREATE INDEX IF NOT EXISTS idx_prediction_results_prediction_id
  ON prediction_results (prediction_id);

-- 5. 같은 cycle_id + asset_id에 중복 예측이 있으면 가장 최신 것만 유지
-- (기존 중복 데이터 정리)
DELETE FROM ai_predictions
WHERE id NOT IN (
  SELECT DISTINCT ON (cycle_id, asset_id) id
  FROM ai_predictions
  ORDER BY cycle_id, asset_id, created_at DESC
);

-- 6. RLS 정책 확인 (anon 키로 읽기/쓰기 가능하도록)
-- 이미 설정되어 있다면 무시됨
DO $$
BEGIN
  -- ai_predictions
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'ai_predictions' AND policyname = 'anon_all'
  ) THEN
    ALTER TABLE ai_predictions ENABLE ROW LEVEL SECURITY;
    CREATE POLICY anon_all ON ai_predictions FOR ALL USING (true) WITH CHECK (true);
  END IF;

  -- prediction_results
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'prediction_results' AND policyname = 'anon_all'
  ) THEN
    ALTER TABLE prediction_results ENABLE ROW LEVEL SECURITY;
    CREATE POLICY anon_all ON prediction_results FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
