-- ==============================================================================
-- IAPEA Database Schema Migration: 0001_init.sql
-- Foundation for Course Design, Question Authoring & Fair Grading
-- ==============================================================================

-- 1. Enable pgvector extension
create extension if not exists vector;

-- 2. Profiles table (linked to Supabase Auth)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  role text check (role in ('admin', 'senior', 'junior')) default 'junior',
  created_at timestamptz default now()
);

-- 3. Program Outcomes (ABET / Institutional Standards)
create table if not exists public.program_outcomes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  description text not null,
  created_at timestamptz default now()
);

-- 4. Courses
create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  owner uuid references auth.users(id) on delete set null,
  code text not null,
  title text not null,
  description text,
  credit_hours int default 3,
  created_at timestamptz default now()
);

-- 5. Course Outcomes (OBE)
create table if not exists public.course_outcomes (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references public.courses(id) on delete cascade not null,
  code text not null,
  statement text not null,
  bloom_level int check (bloom_level between 1 and 6) not null,
  action_verbs text[] default '{}',
  created_at timestamptz default now()
);

-- 6. CO-PO Correlation Mapping Matrix
create table if not exists public.co_po_mappings (
  id uuid primary key default gen_random_uuid(),
  co_id uuid references public.course_outcomes(id) on delete cascade not null,
  po_id uuid references public.program_outcomes(id) on delete cascade not null,
  weight int check (weight between 1 and 3) not null,
  created_at timestamptz default now(),
  unique (co_id, po_id)
);

-- 7. Course Documents & RAG Corpus
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references public.courses(id) on delete cascade not null,
  type text check (type in ('syllabus', 'slides', 'past_paper')) not null,
  storage_path text,
  extracted_text text,
  planned_at timestamptz null,
  taught_at timestamptz null,
  created_at timestamptz default now()
);

-- 8. Document Chunks & Vector Embeddings (768-dim for Gemini text-embedding-004)
create table if not exists public.doc_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references public.documents(id) on delete cascade not null,
  course_id uuid references public.courses(id) on delete cascade not null,
  content text not null,
  embedding vector(768),
  created_at timestamptz default now()
);

-- 9. Exam Blueprints
create table if not exists public.blueprints (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references public.courses(id) on delete cascade not null,
  name text not null,
  created_at timestamptz default now()
);

-- 10. Blueprint Topics & Outcome-Drift Analysis
create table if not exists public.blueprint_topics (
  id uuid primary key default gen_random_uuid(),
  blueprint_id uuid references public.blueprints(id) on delete cascade not null,
  module text not null,
  topic text not null,
  weight_percent numeric not null default 0,
  planned_weight numeric null,
  actual_weight numeric null,
  drift numeric null,
  created_at timestamptz default now()
);

-- 11. Questions (Generated + Historical with Triple-Layer Dedup Metadata)
create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references public.courses(id) on delete cascade not null,
  blueprint_id uuid references public.blueprints(id) on delete set null,
  text text not null,
  marks int not null,
  bloom_level int check (bloom_level between 1 and 6) not null,
  co_id uuid references public.course_outcomes(id) on delete set null,
  source text check (source in ('generated', 'historical')) default 'generated',
  embedding vector(768),
  skill_signature text null,
  skill_tags text[] null,
  created_at timestamptz default now()
);

-- 12. Question Deduplication Flags (Cosine + Jaccard + Skill Signature)
create table if not exists public.question_dedup_flags (
  id uuid primary key default gen_random_uuid(),
  question_id uuid references public.questions(id) on delete cascade not null,
  matched_question_id uuid references public.questions(id) on delete cascade not null,
  cosine numeric not null,
  jaccard numeric not null,
  status text check (status in ('clear', 'review', 'rejected')) default 'clear',
  skill_match numeric null,
  layer text check (layer in ('semantic', 'lexical', 'skill')) null,
  created_at timestamptz default now()
);

-- 13. Analytic Marking Rubrics (Partial Credit + Error-Carried-Forward)
create table if not exists public.rubrics (
  id uuid primary key default gen_random_uuid(),
  question_id uuid references public.questions(id) on delete cascade not null,
  criteria jsonb not null default '[]'::jsonb,
  total_marks int not null,
  created_at timestamptz default now()
);

-- 14. Exam Scripts (Handwritten student submissions)
create table if not exists public.exam_scripts (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references public.courses(id) on delete cascade not null,
  question_id uuid references public.questions(id) on delete set null,
  student_masked_id text not null,
  storage_path text,
  anonymized boolean default false,
  created_at timestamptz default now()
);

-- 15. Double-Blind Grading Assignments
create table if not exists public.grading_assignments (
  id uuid primary key default gen_random_uuid(),
  script_id uuid references public.exam_scripts(id) on delete cascade not null,
  examiner_id uuid references auth.users(id) on delete set null,
  examiner_role text check (examiner_role in ('E1', 'E2', 'E3')) not null,
  created_at timestamptz default now()
);

-- 16. Grades (AI + Human evaluations with confidence maps)
create table if not exists public.grades (
  id uuid primary key default gen_random_uuid(),
  script_id uuid references public.exam_scripts(id) on delete cascade not null,
  examiner_id uuid references auth.users(id) on delete set null,
  question_id uuid references public.questions(id) on delete set null,
  score numeric not null,
  rubric_selections jsonb default '[]'::jsonb,
  is_ai boolean default false,
  confidence numeric null,
  region_confidences jsonb null,
  created_at timestamptz default now()
);

-- 17. Discrepancy Arbitrations & Root-Cause Analysis
create table if not exists public.arbitrations (
  id uuid primary key default gen_random_uuid(),
  script_id uuid references public.exam_scripts(id) on delete cascade not null,
  s1 numeric not null,
  s2 numeric not null,
  delta numeric not null,
  final_score numeric null,
  status text check (status in ('pending', 'resolved', 'arbitration')) default 'pending',
  s3_examiner uuid references auth.users(id) on delete set null,
  disagreement_type text check (disagreement_type in ('partial_credit', 'conceptual', 'ecf', 'mixed')) null,
  disagreement_profile jsonb null,
  created_at timestamptz default now()
);

-- 18. Reliability & Fairness Metrics
create table if not exists public.reliability_metrics (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references public.courses(id) on delete cascade not null,
  kappa numeric,
  mad numeric,
  bias numeric,
  computed_at timestamptz default now()
);

-- 19. Self-Correcting CO Performance Loop
create table if not exists public.co_performance (
  id uuid primary key default gen_random_uuid(),
  co_id uuid references public.course_outcomes(id) on delete cascade not null,
  course_id uuid references public.courses(id) on delete cascade not null,
  avg_score numeric not null,
  question_count int not null,
  flag text check (flag in ('ok', 'review_teaching', 'review_mapping')) default 'ok',
  diagnosis text null,
  computed_at timestamptz default now()
);

-- 20. Examiner Bias Profiles & Calibration
create table if not exists public.examiner_bias_profiles (
  id uuid primary key default gen_random_uuid(),
  examiner_id uuid references auth.users(id) on delete cascade not null,
  leniency numeric not null default 0,
  samples int not null default 0,
  calibration_offset numeric not null default 0,
  updated_at timestamptz default now()
);

-- ==============================================================================
-- Vector Indexes for Cosine Search
-- ==============================================================================
create index if not exists idx_doc_chunks_embedding 
  on public.doc_chunks using ivfflat (embedding vector_cosine_ops) 
  with (lists = 100);

create index if not exists idx_questions_embedding 
  on public.questions using ivfflat (embedding vector_cosine_ops) 
  with (lists = 100);

-- ==============================================================================
-- RPC Functions for Vector Similarity
-- ==============================================================================

-- 1. match_chunks: Cosine similarity for RAG topic retrieval
create or replace function public.match_chunks (
  query_embedding vector(768),
  match_course uuid,
  match_count int default 5
) returns table (
  id uuid,
  document_id uuid,
  course_id uuid,
  content text,
  similarity float
) language plpgsql as $$
begin
  return query
  select
    dc.id,
    dc.document_id,
    dc.course_id,
    dc.content,
    1 - (dc.embedding <=> query_embedding) as similarity
  from public.doc_chunks dc
  where dc.course_id = match_course
    and dc.embedding is not null
  order by dc.embedding <=> query_embedding
  limit match_count;
end;
$$;

-- 2. match_questions: Cosine similarity for deduplication against historical papers
create or replace function public.match_questions (
  query_embedding vector(768),
  match_course uuid,
  match_count int default 5
) returns table (
  id uuid,
  course_id uuid,
  blueprint_id uuid,
  text text,
  marks int,
  bloom_level int,
  source text,
  similarity float,
  skill_signature text,
  skill_tags text[]
) language plpgsql as $$
begin
  return query
  select
    q.id,
    q.course_id,
    q.blueprint_id,
    q.text,
    q.marks,
    q.bloom_level,
    q.source,
    1 - (q.embedding <=> query_embedding) as similarity,
    q.skill_signature,
    q.skill_tags
  from public.questions q
  where q.course_id = match_course
    and q.source = 'historical'
    and q.embedding is not null
  order by q.embedding <=> query_embedding
  limit match_count;
end;
$$;

-- ==============================================================================
-- Row Level Security (RLS) Configuration
-- Permissive authenticated access for hackathon / demo execution
-- ==============================================================================

alter table public.profiles enable row level security;
alter table public.program_outcomes enable row level security;
alter table public.courses enable row level security;
alter table public.course_outcomes enable row level security;
alter table public.co_po_mappings enable row level security;
alter table public.documents enable row level security;
alter table public.doc_chunks enable row level security;
alter table public.blueprints enable row level security;
alter table public.blueprint_topics enable row level security;
alter table public.questions enable row level security;
alter table public.question_dedup_flags enable row level security;
alter table public.rubrics enable row level security;
alter table public.exam_scripts enable row level security;
alter table public.grading_assignments enable row level security;
alter table public.grades enable row level security;
alter table public.arbitrations enable row level security;
alter table public.reliability_metrics enable row level security;
alter table public.co_performance enable row level security;
alter table public.examiner_bias_profiles enable row level security;

-- Universal permissive policies for authenticated users
do $$
declare
  tbl text;
begin
  for tbl in 
    select tablename from pg_tables where schemaname = 'public'
  loop
    execute format('drop policy if exists "Authenticated users full access on %I" on %I;', tbl, tbl);
    execute format('create policy "Authenticated users full access on %I" on %I for all using (true) with check (true);', tbl, tbl);
  end loop;
end;
$$;

-- Auto create profile on auth user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', 'Faculty Member'),
    coalesce(new.raw_user_meta_data->>'role', 'junior')
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ==============================================================================
-- Storage Buckets Setup
-- ==============================================================================
insert into storage.buckets (id, name, public)
values 
  ('documents', 'documents', true),
  ('scripts', 'scripts', true)
on conflict (id) do nothing;

create policy "Public storage access for documents" on storage.objects
  for all using (bucket_id in ('documents', 'scripts'))
  with check (bucket_id in ('documents', 'scripts'));
