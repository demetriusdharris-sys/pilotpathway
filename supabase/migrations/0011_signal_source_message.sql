-- 0011: link each signal to the exchange that produced it.
--
-- Without this you cannot answer "why does the tutor think I am shaky on
-- stalls," and there is no natural key to make the write idempotent. Nullable
-- because a signal may later come from something other than a conversation
-- turn, and because on delete set null keeps the signal when history is pruned.

alter table public.objective_signals
  add column if not exists source_message_id uuid
    references public.instructor_messages(id) on delete set null;

-- One signal per objective per source message. Makes a retry or a double
-- invocation harmless rather than a duplicate.
create unique index if not exists objective_signals_source_unique
  on public.objective_signals (source_message_id, objective_id)
  where source_message_id is not null;

comment on column public.objective_signals.source_message_id is
  'The assistant message this reading was inferred from. Nullable: survives message deletion, and leaves room for non-conversational sources.';
