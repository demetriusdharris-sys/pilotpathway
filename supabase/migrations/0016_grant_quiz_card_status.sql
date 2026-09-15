-- 0016: let students read quiz card status.
--
-- 0014 gave students a column allowlist on quiz_cards that left out
-- `status`. The quiz_card_options policy checks a card's status with a
-- subquery against quiz_cards, and that subquery runs as the student — so it
-- needs SELECT on `status`, and did not have it. Every student read of the
-- options failed with 42501 "permission denied for table quiz_cards"; the app
-- caught that, logged "Failed to load quiz card options", and rendered no
-- quiz. The cards read itself worked. Found by testing on the live site —
-- lint, typecheck and the build all passed, because none of them can see a
-- database privilege.
--
-- Granting status leaks nothing. The RLS policy only ever returns approved
-- rows, so the only value a student can ever read in this column is
-- 'approved'. The columns that actually hide the answer —
-- quiz_card_options.is_correct and quiz_cards.explanation — stay ungranted.
--
-- Do NOT "fix" this with a table-level grant (GRANT SELECT ON
-- public.quiz_cards). That is what the Postgres hint suggests, and it would
-- hand every student the explanation, which spells out the correct answer.
--
-- General rule this taught us: when a table uses column-level grants, any
-- column that an RLS policy reads from it — especially from a subquery inside
-- a policy on a different table — must be in the grant for the role running
-- the query. The safe habit is to grant every column any policy references.

grant select (status) on public.quiz_cards to authenticated;

-- ---------------------------------------------------------------
-- Report: what students can now read on quiz_cards. Expect six columns,
-- including status, and NOT explanation.
-- ---------------------------------------------------------------

select column_name
from information_schema.column_privileges
where table_schema = 'public'
  and table_name = 'quiz_cards'
  and grantee = 'authenticated'
  and privilege_type = 'SELECT'
order by column_name;
