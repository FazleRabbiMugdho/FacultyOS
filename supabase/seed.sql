-- ==============================================================================
-- IAPEA Seed Data: supabase/seed.sql
-- Program Outcomes (ABET / CS Accreditation Standard) & Demo Records
-- ==============================================================================

-- Seed Program Outcomes (POs)
insert into public.program_outcomes (code, description)
values
  ('PO1', 'Analyze complex computing problems and apply principles of computing and other relevant disciplines to identify solutions.'),
  ('PO2', 'Design, implement, and evaluate computing-based solutions to meet a given set of computing requirements in the context of the program discipline.'),
  ('PO3', 'Communicate effectively in a variety of professional contexts.'),
  ('PO4', 'Recognize professional responsibilities and make informed judgments in computing practice based on legal and ethical principles.'),
  ('PO5', 'Function effectively as a member or leader of a team engaged in activities appropriate to the program discipline.'),
  ('PO6', 'Apply computer science theory and software development fundamentals to produce computing-based solutions.'),
  ('PO7', 'Demonstrate understanding of algorithms, data structures, and computational complexity.'),
  ('PO8', 'Design and conduct experimental analysis of software and computational systems.'),
  ('PO9', 'Adapt to emerging technological developments and engage in lifelong learning.'),
  ('PO10', 'Apply security principles and secure coding practices in software development.')
on conflict (code) do nothing;
