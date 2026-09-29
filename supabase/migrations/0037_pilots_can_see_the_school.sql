-- 0037: a pilot can see which school is asking.
--
-- 0006's SELECT policy on `organizations` is "you may read an organisation you
-- are a member of". A volunteering pilot is not a member of the school, so every
-- open visit rendered as "A school" — and a pilot choosing between classrooms
-- needs the name above all else. It is how they judge whether they can reach it,
-- and whether it is the neighbourhood they grew up in, which is the single most
-- important match in this whole product.
--
-- Found by reading the policy rather than by waiting for it to look broken.
--
-- WHAT THIS DOES AND DOES NOT REVEAL. It exposes the name and type of a school
-- that has asked for a pilot, to pilots who have been vetted. A school is a
-- public institution that wants a visit; there is no person in `organizations`
-- and no student anywhere near it. It does not expose schools that have never
-- asked, and an unvetted pilot still sees nothing, because they cannot volunteer.
--
-- Written for the Supabase SQL Editor, which supplies the transaction.

create policy "A verified pilot reads a school that has asked for a visit"
  on public.organizations for select to authenticated
  using (
    public.is_verified_pilot()
    and exists (
      select 1 from public.classroom_visits v
      where v.organization_id = organizations.id
        and v.status in ('open', 'confirmed', 'completed')
    )
  );

-- Administrators read every organisation. They already read every visit, and a
-- visit whose school cannot be named is not much use on an admin page.
create policy "Admins read every organization"
  on public.organizations for select to authenticated
  using (public.may_administer());

-- ---------------------------------------------------------------
-- Report. Expect 3 select policies on organizations: the member one from
-- 0006 and the two added here.
-- ---------------------------------------------------------------

select
  count(*) as select_policies_on_organizations
from pg_policies
where schemaname = 'public'
  and tablename = 'organizations'
  and cmd = 'SELECT';
