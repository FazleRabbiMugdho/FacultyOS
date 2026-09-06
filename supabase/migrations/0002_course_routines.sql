-- Conflict-free recurring course routines
create extension if not exists btree_gist;

create table if not exists public.academic_terms (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  starts_on date not null,
  ends_on date not null,
  teaching_days int[] not null default '{0,1,2,3,4}',
  day_start_minute int not null default 480,
  day_end_minute int not null default 1020,
  slot_increment_minutes int not null default 10,
  breaks jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  check (ends_on >= starts_on),
  check (day_start_minute >= 0 and day_end_minute <= 1440 and day_end_minute > day_start_minute),
  check (slot_increment_minutes > 0 and 60 % slot_increment_minutes = 0),
  check (teaching_days <@ array[0,1,2,3,4,5,6])
);

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  capacity int not null check (capacity > 0),
  room_type text not null check (room_type in ('lecture','lab','hybrid')),
  location text,
  amenities text[] not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.cohorts (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  department text,
  semester int check (semester is null or semester between 1 and 12),
  expected_size int not null check (expected_size > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.course_schedule_requirements (
  id uuid primary key default gen_random_uuid(),
  term_id uuid not null references public.academic_terms(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  instructor_id uuid not null references public.profiles(id) on delete restrict,
  cohort_id uuid not null references public.cohorts(id) on delete restrict,
  session_type text not null check (session_type in ('lecture','lab','tutorial')),
  sessions_per_week int not null check (sessions_per_week between 1 and 10),
  duration_minutes int not null check (duration_minutes between 10 and 360 and duration_minutes % 10 = 0),
  required_room_type text not null check (required_room_type in ('lecture','lab','hybrid')),
  preferred_days int[] not null default '{}',
  preferred_start_minute int,
  preferred_end_minute int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (term_id, course_id, instructor_id, cohort_id, session_type),
  check (preferred_days <@ array[0,1,2,3,4,5,6]),
  check (
    (preferred_start_minute is null and preferred_end_minute is null)
    or (preferred_start_minute >= 0 and preferred_end_minute <= 1440 and preferred_end_minute > preferred_start_minute)
  )
);

create table if not exists public.course_routines (
  id uuid primary key default gen_random_uuid(),
  term_id uuid not null unique references public.academic_terms(id) on delete cascade,
  name text not null,
  status text not null default 'draft' check (status in ('draft','published')),
  created_by uuid references public.profiles(id) on delete set null,
  generated_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.routine_entries (
  id uuid primary key default gen_random_uuid(),
  routine_id uuid not null references public.course_routines(id) on delete cascade,
  term_id uuid not null references public.academic_terms(id) on delete cascade,
  requirement_id uuid not null references public.course_schedule_requirements(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  instructor_id uuid not null references public.profiles(id) on delete restrict,
  cohort_id uuid not null references public.cohorts(id) on delete restrict,
  room_id uuid not null references public.rooms(id) on delete restrict,
  session_type text not null check (session_type in ('lecture','lab','tutorial')),
  session_index int not null check (session_index > 0),
  day_of_week int not null check (day_of_week between 0 and 6),
  start_minute int not null check (start_minute >= 0 and start_minute < 1440),
  end_minute int not null check (end_minute > start_minute and end_minute <= 1440),
  time_range int4range generated always as (int4range(start_minute, end_minute, '[)')) stored,
  source text not null default 'generated' check (source in ('generated','manual')),
  score numeric not null default 0,
  explanation text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (routine_id, requirement_id, session_index)
);

create table if not exists public.schedule_unavailability (
  id uuid primary key default gen_random_uuid(),
  term_id uuid not null references public.academic_terms(id) on delete cascade,
  instructor_id uuid references public.profiles(id) on delete cascade,
  cohort_id uuid references public.cohorts(id) on delete cascade,
  room_id uuid references public.rooms(id) on delete cascade,
  day_of_week int not null check (day_of_week between 0 and 6),
  start_minute int not null check (start_minute >= 0 and start_minute < 1440),
  end_minute int not null check (end_minute > start_minute and end_minute <= 1440),
  time_range int4range generated always as (int4range(start_minute, end_minute, '[)')) stored,
  reason text,
  created_at timestamptz not null default now(),
  check (num_nonnulls(instructor_id, cohort_id, room_id) = 1)
);

alter table public.routine_entries
  add constraint routine_entries_no_instructor_overlap
  exclude using gist (term_id with =, day_of_week with =, instructor_id with =, time_range with &&);
alter table public.routine_entries
  add constraint routine_entries_no_room_overlap
  exclude using gist (term_id with =, day_of_week with =, room_id with =, time_range with &&);
alter table public.routine_entries
  add constraint routine_entries_no_cohort_overlap
  exclude using gist (term_id with =, day_of_week with =, cohort_id with =, time_range with &&);

create index if not exists idx_routine_entries_routine on public.routine_entries(routine_id);
create index if not exists idx_requirements_term on public.course_schedule_requirements(term_id);
create index if not exists idx_unavailability_term_day on public.schedule_unavailability(term_id, day_of_week);

create or replace function public.is_scheduler()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin','senior')
  );
$$;

create or replace function public.validate_routine_entry()
returns trigger language plpgsql set search_path = public as $$
declare
  term_row public.academic_terms;
  room_row public.rooms;
  requirement_row public.course_schedule_requirements;
begin
  select * into term_row from public.academic_terms where id = new.term_id;
  select * into room_row from public.rooms where id = new.room_id;
  select * into requirement_row from public.course_schedule_requirements where id = new.requirement_id;

  if not (new.day_of_week = any(term_row.teaching_days)) then
    raise exception using errcode = '23514', message = 'Entry is outside configured teaching days';
  end if;
  if new.start_minute < term_row.day_start_minute or new.end_minute > term_row.day_end_minute then
    raise exception using errcode = '23514', message = 'Entry is outside configured teaching hours';
  end if;
  if new.start_minute % term_row.slot_increment_minutes <> 0 or new.end_minute % term_row.slot_increment_minutes <> 0 then
    raise exception using errcode = '23514', message = 'Entry does not align to the term slot increment';
  end if;
  if room_row.capacity < (select expected_size from public.cohorts where id = new.cohort_id) then
    raise exception using errcode = '23514', message = 'Room capacity is below cohort size';
  end if;
  if requirement_row.required_room_type = 'lab' and room_row.room_type not in ('lab','hybrid') then
    raise exception using errcode = '23514', message = 'A lab-capable room is required';
  end if;
  if exists (
    select 1 from public.schedule_unavailability unavailable
    where unavailable.term_id = new.term_id
      and unavailable.day_of_week = new.day_of_week
      and unavailable.time_range && int4range(new.start_minute, new.end_minute, '[)')
      and (
        unavailable.instructor_id = new.instructor_id
        or unavailable.cohort_id = new.cohort_id
        or unavailable.room_id = new.room_id
      )
  ) then
    raise exception using errcode = '23P01', message = 'Entry overlaps a blocked resource period';
  end if;
  if exists (select 1 from public.course_routines where id = new.routine_id and status = 'published') then
    raise exception using errcode = '55000', message = 'Published routines are immutable';
  end if;
  return new;
end;
$$;

create or replace function public.prevent_published_routine_mutation()
returns trigger language plpgsql set search_path = public as $$
begin
  if old.status = 'published' then
    raise exception using errcode = '55000', message = 'Published routines are immutable';
  end if;
  return new;
end;
$$;

create trigger validate_routine_entry_before_write
before insert or update on public.routine_entries
for each row execute function public.validate_routine_entry();

create trigger prevent_published_routine_update
before update or delete on public.course_routines
for each row execute function public.prevent_published_routine_mutation();

create or replace function public.replace_routine_draft(
  target_term uuid,
  routine_name text,
  entries jsonb
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  routine_uuid uuid;
  entry jsonb;
begin
  if not public.is_scheduler() then raise exception 'Scheduler role required'; end if;
  insert into public.course_routines(term_id, name, status, created_by, generated_at, updated_at)
  values (target_term, routine_name, 'draft', auth.uid(), now(), now())
  on conflict (term_id) do update set name = excluded.name, generated_at = now(), updated_at = now()
  where public.course_routines.status = 'draft'
  returning id into routine_uuid;
  if routine_uuid is null then raise exception 'Published routines cannot be replaced'; end if;
  delete from public.routine_entries where routine_id = routine_uuid;
  for entry in select * from jsonb_array_elements(entries)
  loop
    insert into public.routine_entries(
      routine_id, term_id, requirement_id, course_id, instructor_id, cohort_id,
      room_id, session_type, session_index, day_of_week, start_minute, end_minute,
      source, score, explanation
    ) values (
      routine_uuid, target_term, (entry->>'requirement_id')::uuid, (entry->>'course_id')::uuid,
      (entry->>'instructor_id')::uuid, (entry->>'cohort_id')::uuid, (entry->>'room_id')::uuid,
      entry->>'session_type', (entry->>'session_index')::int, (entry->>'day_of_week')::int,
      (entry->>'start_minute')::int, (entry->>'end_minute')::int,
      coalesce(entry->>'source','generated'), coalesce((entry->>'score')::numeric,0), entry->>'explanation'
    );
  end loop;
  return routine_uuid;
end;
$$;

create or replace function public.publish_course_routine(target_routine uuid)
returns public.course_routines
language plpgsql security definer set search_path = public as $$
declare
  routine_row public.course_routines;
  required_count int;
  assigned_count int;
begin
  if not public.is_scheduler() then raise exception 'Scheduler role required'; end if;
  select * into routine_row from public.course_routines where id = target_routine for update;
  if routine_row.id is null then raise exception 'Routine not found'; end if;
  if routine_row.status = 'published' then return routine_row; end if;
  select coalesce(sum(sessions_per_week),0) into required_count
    from public.course_schedule_requirements where term_id = routine_row.term_id;
  select count(*) into assigned_count from public.routine_entries where routine_id = target_routine;
  if assigned_count <> required_count then
    raise exception 'Routine is incomplete: % of % sessions assigned', assigned_count, required_count;
  end if;
  update public.course_routines set status='published', published_at=now(), updated_at=now()
    where id=target_routine returning * into routine_row;
  return routine_row;
end;
$$;

alter table public.academic_terms enable row level security;
alter table public.rooms enable row level security;
alter table public.cohorts enable row level security;
alter table public.course_schedule_requirements enable row level security;
alter table public.course_routines enable row level security;
alter table public.routine_entries enable row level security;
alter table public.schedule_unavailability enable row level security;

create policy "Authenticated read terms" on public.academic_terms for select to authenticated using (true);
create policy "Schedulers manage terms" on public.academic_terms for all to authenticated using (public.is_scheduler()) with check (public.is_scheduler());
create policy "Authenticated read rooms" on public.rooms for select to authenticated using (true);
create policy "Schedulers manage rooms" on public.rooms for all to authenticated using (public.is_scheduler()) with check (public.is_scheduler());
create policy "Authenticated read cohorts" on public.cohorts for select to authenticated using (true);
create policy "Schedulers manage cohorts" on public.cohorts for all to authenticated using (public.is_scheduler()) with check (public.is_scheduler());
create policy "Authenticated read requirements" on public.course_schedule_requirements for select to authenticated using (true);
create policy "Schedulers manage requirements" on public.course_schedule_requirements for all to authenticated using (public.is_scheduler()) with check (public.is_scheduler());
create policy "Authenticated read routines" on public.course_routines for select to authenticated using (status='published' or public.is_scheduler());
create policy "Schedulers manage routines" on public.course_routines for all to authenticated using (public.is_scheduler()) with check (public.is_scheduler());
create policy "Authenticated read routine entries" on public.routine_entries for select to authenticated using (
  exists (select 1 from public.course_routines routine where routine.id=routine_id and (routine.status='published' or public.is_scheduler()))
);
create policy "Schedulers manage routine entries" on public.routine_entries for all to authenticated using (public.is_scheduler()) with check (public.is_scheduler());
create policy "Authenticated read unavailability" on public.schedule_unavailability for select to authenticated using (true);
create policy "Schedulers manage unavailability" on public.schedule_unavailability for all to authenticated using (public.is_scheduler()) with check (public.is_scheduler());

grant execute on function public.replace_routine_draft(uuid,text,jsonb) to authenticated;
grant execute on function public.publish_course_routine(uuid) to authenticated;

insert into public.academic_terms(name, starts_on, ends_on, teaching_days, day_start_minute, day_end_minute, slot_increment_minutes, breaks)
values ('Fall 2026', '2026-09-01', '2026-12-31', '{0,1,2,3,4}', 480, 1020, 10, '[{"start_minute":780,"end_minute":840,"label":"Lunch"}]')
on conflict (name) do nothing;

insert into public.rooms(code,name,capacity,room_type,location,amenities) values
  ('A-201','Lecture Room A-201',60,'lecture','Academic Building A','{"projector","whiteboard"}'),
  ('A-305','Lecture Room A-305',40,'lecture','Academic Building A','{"projector"}'),
  ('LAB-1','Computing Lab 1',35,'lab','Engineering Building','{"computers","projector"}'),
  ('LAB-2','Computing Lab 2',50,'hybrid','Engineering Building','{"computers","projector","whiteboard"}')
on conflict (code) do nothing;

insert into public.cohorts(code,name,department,semester,expected_size) values
  ('CSE-3A','CSE Year 3 Section A','CSE',5,32),
  ('CSE-3B','CSE Year 3 Section B','CSE',5,30)
on conflict (code) do nothing;
