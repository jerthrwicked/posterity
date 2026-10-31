-- Stage 4.5 — Include in Posterity is off by default · Walker Brown
--
-- The Master Specification's Content Builder: "The toggle is off by default and
-- has no bearing on the content's original delivery — it governs only what
-- forms the second legacy." content_items.include_in_posterity has defaulted to
-- true since the initial schema. The forms send the value every time, so this
-- changes no form and no saved row. It keeps a write that leaves the column out
-- from marking a piece for the second legacy. No content row existed when this
-- ran.

alter table public.content_items
  alter column include_in_posterity set default false;

comment on column public.content_items.include_in_posterity is
  'Include in Posterity (Master Spec, Content Builder): off by default, and the only way a piece joins the second legacy at Reprise. It has no bearing on the piece''s own delivery.';
