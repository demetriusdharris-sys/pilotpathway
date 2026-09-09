-- 0013: one live guardian invite per student per email address.
--
-- The invite route looks up an existing row, then inserts or updates. Two
-- concurrent requests can both find nothing and both insert, leaving two live
-- tokens for the same guardian. This index makes the second one fail instead.
--
-- Revoked rows are excluded so a link that was revoked can be re-invited
-- later without colliding with its own history.

create unique index if not exists guardian_links_one_live_invite
  on public.guardian_links (student_user_id, lower(invited_email))
  where invited_email is not null and status <> 'revoked';
