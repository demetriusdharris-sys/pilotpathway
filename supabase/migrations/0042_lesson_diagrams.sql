-- 0042: diagrams on a lesson, reviewed like everything else.
--
-- A lesson in this product is a title, a summary, objectives and a conversation.
-- There is no body text and there is nothing to look at, in a subject that is
-- almost entirely visual — the four forces, the three axes, a traffic pattern.
-- That is the gap this closes.
--
-- WHY DRAWN RATHER THAN LIFTED FROM THE HANDBOOK. The PHAK is public domain and
-- its figures are authoritative, so copying them would be legal and fast. But
-- 961 of its 1,311 images are JPEG 2000, which no browser except Safari renders,
-- and a scanned figure is a fixed-size raster that blurs on a phone and cannot
-- follow a dark theme. An SVG is a couple of kilobytes and sharp at any size,
-- which is what this audience needs. The handbook stays the authority; the
-- drawing is ours.
--
-- THE DATABASE HOLDS REVIEW STATE, NOT CONTENT. The drawing is a React
-- component and the caption is in `src/lib/diagrams/catalogue.ts`; this table
-- holds only whether a CFI has approved it. Same split as the cards, for the
-- same reason: the code is the source of truth and a correction typed into the
-- database would be overwritten by the next sync.
--
-- A DIAGRAM ASSERTS FACTS, so it is draft until a person says otherwise. Nothing
-- here reaches a student before that, exactly like a quiz card.
--
-- Written for the Supabase SQL Editor, which supplies the transaction.

create table public.lesson_diagrams (
  diagram_key text primary key,

  lesson_slug text not null,
  position integer not null default 1,

  -- Copied from the catalogue so a reviewer reads what a student will read, and
  -- so a caption change knocks the approval back the way a card's does.
  title text not null,
  caption text not null,
  source_note text,

  status text not null default 'draft'
    check (status in ('draft', 'needs_changes', 'approved', 'retired')),

  reviewed_by text,
  reviewed_at timestamptz,
  review_note text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint approved_diagram_names_a_reviewer
    check (
      status <> 'approved'
      or (reviewed_by is not null and reviewed_at is not null)
    )
);

create index lesson_diagrams_lesson_idx
  on public.lesson_diagrams (lesson_slug, position) where status = 'approved';

comment on table public.lesson_diagrams is
  'Review state for the diagrams in src/lib/diagrams/catalogue.ts. The drawing and the caption live in code; this says whether a CFI has approved them.';

alter table public.lesson_diagrams enable row level security;

create policy "Anyone signed in reads an approved diagram"
  on public.lesson_diagrams for select to authenticated
  using (status = 'approved');

create policy "A reviewer reads every diagram"
  on public.lesson_diagrams for select to authenticated
  using (public.may_review_content());

-- No write policies. The sync migration writes the content and `review_diagram`
-- writes the decision, both of which check who is asking.

-- ---------------------------------------------------------------
-- The one way a diagram changes state. Mirrors review_card.
-- ---------------------------------------------------------------

create or replace function public.review_diagram(
  p_diagram_key text,
  p_decision text,
  p_reviewer text,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_status text;
  v_note   text;
begin
  if not public.may_review_content() then
    raise exception 'Only a flight instructor or an administrator can review diagrams.';
  end if;

  if coalesce(trim(p_reviewer), '') = '' then
    raise exception 'Say who is approving this — a name and certificate number.';
  end if;

  if p_decision not in ('approve', 'needs_changes', 'retire') then
    raise exception 'Unknown decision: %', p_decision;
  end if;

  v_note := nullif(trim(coalesce(p_note, '')), '');

  if p_decision = 'needs_changes' and v_note is null then
    raise exception 'Say what needs changing — the note is the whole point of sending it back.';
  end if;

  if not exists (select 1 from public.lesson_diagrams where diagram_key = p_diagram_key) then
    raise exception 'No such diagram.';
  end if;

  v_status := case p_decision
    when 'approve' then 'approved'
    when 'needs_changes' then 'needs_changes'
    else 'retired'
  end;

  update public.lesson_diagrams d
  set status = v_status,
      reviewed_by = case when p_decision = 'approve' then trim(p_reviewer) else d.reviewed_by end,
      reviewed_at = case when p_decision = 'approve' then now() else d.reviewed_at end,
      review_note = case when p_decision = 'retire' then null else v_note end,
      updated_at = now()
  where d.diagram_key = p_diagram_key;
end;
$$;

revoke all on function public.review_diagram(text, text, text, text) from public, anon;
grant execute on function public.review_diagram(text, text, text, text) to authenticated;

-- ---------------------------------------------------------------
-- NO EXTRA GRANTS. Nothing hidden here — a diagram has no answer key — but the
-- pattern stays: a student reads approved rows through the policy above and
-- nothing else.
-- ---------------------------------------------------------------

-- ---------------------------------------------------------------
-- Report. Expect the table, the function, RLS on, and 0 diagrams —
-- the sync migration puts them in.
-- ---------------------------------------------------------------

select
  to_regclass('public.lesson_diagrams') is not null as diagrams_table,
  to_regprocedure('public.review_diagram(text,text,text,text)') is not null as review_function,
  (select relrowsecurity from pg_class where oid = 'public.lesson_diagrams'::regclass) as rls_on,
  (select count(*) from public.lesson_diagrams) as diagrams;
