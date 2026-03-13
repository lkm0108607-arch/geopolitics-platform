-- ============================================================================
-- 지정학 플랫폼 AI 예측 시스템 – Supabase 스키마
-- Supabase SQL Editor에서 실행하세요.
-- ============================================================================

-- market_snapshots: 과거 가격 데이터
create table market_snapshots (
  id uuid default gen_random_uuid() primary key,
  asset_id text not null,
  close_price numeric not null,
  high_price numeric,
  low_price numeric,
  volume numeric,
  change_percent numeric,
  recorded_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index idx_snapshots_asset_date on market_snapshots(asset_id, recorded_at desc);

-- ai_predictions: AI 생성 예측
create table ai_predictions (
  id uuid default gen_random_uuid() primary key,
  cycle_id text not null,
  asset_id text not null,
  direction text not null, -- 상승/하락/보합/변동성확대
  probability integer not null,
  confidence integer not null,
  rationale text not null,
  sub_model_votes jsonb not null, -- { momentum, meanReversion, volatility, correlation }
  created_at timestamptz not null default now()
);
create index idx_predictions_cycle on ai_predictions(cycle_id);
create index idx_predictions_asset on ai_predictions(asset_id, created_at desc);

-- prediction_results: 예측 대비 실제 결과
create table prediction_results (
  id uuid default gen_random_uuid() primary key,
  prediction_id uuid references ai_predictions(id),
  cycle_id text not null,
  asset_id text not null,
  predicted_direction text not null,
  actual_direction text not null,
  was_correct boolean not null,
  actual_change_percent numeric,
  evaluated_at timestamptz not null default now()
);
create index idx_results_asset on prediction_results(asset_id, evaluated_at desc);

-- model_weights: 현재 앙상블 가중치 설정
create table model_weights (
  id uuid default gen_random_uuid() primary key,
  momentum_weight numeric not null default 0.30,
  mean_reversion_weight numeric not null default 0.25,
  volatility_weight numeric not null default 0.20,
  correlation_weight numeric not null default 0.25,
  updated_at timestamptz not null default now(),
  reason text
);

-- learning_logs: 학습 기록
create table learning_logs (
  id uuid default gen_random_uuid() primary key,
  cycle_id text not null,
  asset_id text not null,
  lesson text not null,
  missed_factors text[] default '{}',
  model_performance jsonb not null, -- { momentum: bool, meanReversion: bool, ... }
  weight_adjustment jsonb not null, -- 조정된 가중치
  created_at timestamptz not null default now()
);
create index idx_learning_cycle on learning_logs(cycle_id);

-- ============================================================================
-- RLS 활성화 (anon 전체 허용)
-- ============================================================================

alter table market_snapshots enable row level security;
alter table ai_predictions enable row level security;
alter table prediction_results enable row level security;
alter table model_weights enable row level security;
alter table learning_logs enable row level security;

create policy "Allow all for anon" on market_snapshots for all using (true) with check (true);
create policy "Allow all for anon" on ai_predictions for all using (true) with check (true);
create policy "Allow all for anon" on prediction_results for all using (true) with check (true);
create policy "Allow all for anon" on model_weights for all using (true) with check (true);
create policy "Allow all for anon" on learning_logs for all using (true) with check (true);

-- auto_trades: AI 추천 포트폴리오 자동매매 기록
create table auto_trades (
  id uuid default gen_random_uuid() primary key,
  cycle_id text not null,
  asset_id text not null,
  name text not null,
  signal text not null,
  weight numeric not null,
  entry_price numeric not null,
  tp_target numeric not null,
  sl_target numeric not null,
  predicted_return numeric not null,
  holding_days integer not null default 7,
  status text not null default 'pending', -- pending/filled/tp_hit/sl_hit/expired/cancelled
  fill_price numeric,
  fill_date timestamptz,
  exit_price numeric,
  exit_date timestamptz,
  exit_reason text, -- 익절/손절/기간종료/미체결
  actual_return numeric,
  exit_day integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null,
  unique(cycle_id, asset_id)
);
create index idx_auto_trades_status on auto_trades(status);
create index idx_auto_trades_cycle on auto_trades(cycle_id);
create index idx_auto_trades_created on auto_trades(created_at desc);

alter table auto_trades enable row level security;
create policy "Allow all for anon" on auto_trades for all using (true) with check (true);

-- ============================================================================
-- 기본 가중치 삽입
-- ============================================================================

insert into model_weights (momentum_weight, mean_reversion_weight, volatility_weight, correlation_weight, reason)
values (0.30, 0.25, 0.20, 0.25, '초기 기본 가중치');
