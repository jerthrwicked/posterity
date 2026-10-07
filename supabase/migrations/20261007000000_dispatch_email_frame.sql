-- The email frame's fixed text, stored as copy (Stage 3.4).
--
-- Every automated email renders inside one frame, and the frame carries fixed
-- text of its own, including a line saying replies reach a person at Posterity
-- (Founder Build Roadmap, Writing Requirements, Product surface copy). Like all
-- copy it is a field the system reads, so approved wording replaces the
-- placeholder as a content change.
--
-- dispatch_copy required every email row to carry a subject, which a frame has
-- none of. A row now has a kind: a 'message' is sent, and the one 'frame' row is
-- wrapped around every email. A frame needs a body and no subject; a message
-- keeps the rules it had.

alter table dispatch_copy
  add column kind text not null default 'message'
    check (kind in ('message', 'frame'));

alter table dispatch_copy drop constraint dispatch_copy_email_complete;
alter table dispatch_copy add constraint dispatch_copy_email_complete check (
  channel <> 'email'
  or ((html_body is not null or text_body is not null)
      and (kind = 'frame' or subject is not null))
);

-- The frame wraps email only, and there is exactly one.
alter table dispatch_copy add constraint dispatch_copy_frame_is_email
  check (kind <> 'frame' or channel = 'email');
create unique index dispatch_copy_one_frame on dispatch_copy (kind) where kind = 'frame';

insert into dispatch_copy (key, channel, kind, text_body) values
  ('email.frame', 'email', 'frame',
   '[Placeholder: Product surface copy — the automated email frame''s fixed text, including a line saying replies reach a person at Posterity]');
