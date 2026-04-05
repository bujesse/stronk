create table if not exists public.exercises (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  movement_name text not null,
  body_region text,
  muscle_group text,
  equipment text,
  preferred_weight_unit text,
  tracking_mode text not null,
  default_rest_seconds integer,
  is_custom boolean not null default true,
  deleted_at timestamptz,
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create table if not exists public.workout_templates (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  notes text not null default '',
  deleted_at timestamptz,
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create table if not exists public.template_exercises (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  template_id text not null,
  exercise_id text not null,
  sort_order integer not null,
  deleted_at timestamptz,
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create table if not exists public.template_sets (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  template_exercise_id text not null,
  sort_order integer not null,
  set_kind text not null default 'normal',
  target_reps integer,
  target_weight double precision,
  target_assistance_weight double precision,
  target_duration_seconds integer,
  deleted_at timestamptz,
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create table if not exists public.workouts (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  template_id text,
  name text not null,
  notes text not null default '',
  status text not null,
  started_at timestamptz not null,
  ended_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create table if not exists public.workout_exercises (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  workout_id text not null,
  exercise_id text not null,
  notes text not null default '',
  sort_order integer not null,
  deleted_at timestamptz,
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create table if not exists public.logged_sets (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  workout_exercise_id text not null,
  planned_set_id text,
  sort_order integer not null,
  set_kind text not null default 'normal',
  reps integer,
  weight double precision,
  assistance_weight double precision,
  duration_seconds integer,
  completed_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null,
  updated_at timestamptz not null
);

create table if not exists public.preferences (
  id text primary key,
  user_id uuid not null unique references auth.users (id) on delete cascade,
  weight_unit text not null,
  default_rest_seconds integer not null,
  updated_at timestamptz not null
);

create index if not exists exercises_user_id_idx on public.exercises (user_id);
create index if not exists workout_templates_user_id_idx on public.workout_templates (user_id);
create index if not exists template_exercises_user_id_idx on public.template_exercises (user_id);
create index if not exists template_sets_user_id_idx on public.template_sets (user_id);
create index if not exists workouts_user_id_idx on public.workouts (user_id);
create index if not exists workout_exercises_user_id_idx on public.workout_exercises (user_id);
create index if not exists logged_sets_user_id_idx on public.logged_sets (user_id);

alter table public.exercises enable row level security;
alter table public.workout_templates enable row level security;
alter table public.template_exercises enable row level security;
alter table public.template_sets enable row level security;
alter table public.workouts enable row level security;
alter table public.workout_exercises enable row level security;
alter table public.logged_sets enable row level security;
alter table public.preferences enable row level security;

drop policy if exists "Own exercises" on public.exercises;
create policy "Own exercises" on public.exercises for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Own workout templates" on public.workout_templates;
create policy "Own workout templates" on public.workout_templates for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Own template exercises" on public.template_exercises;
create policy "Own template exercises" on public.template_exercises for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Own template sets" on public.template_sets;
create policy "Own template sets" on public.template_sets for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Own workouts" on public.workouts;
create policy "Own workouts" on public.workouts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Own workout exercises" on public.workout_exercises;
create policy "Own workout exercises" on public.workout_exercises for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Own logged sets" on public.logged_sets;
create policy "Own logged sets" on public.logged_sets for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Own preferences" on public.preferences;
create policy "Own preferences" on public.preferences for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
