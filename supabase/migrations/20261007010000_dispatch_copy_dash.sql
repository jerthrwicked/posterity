-- Restores the em dash in the seeded text-agreement placeholder.
--
-- 20260925000000_communication_dispatch seeds sms.agreement_confirmation with an
-- em dash, and the live row holds U+FFFD, the replacement character, in its
-- place: the text was mangled on its way to the database when that migration was
-- applied. This sets the row to the text the migration file carries. It touches
-- only a row that still holds the replacement character, so approved copy that
-- has since replaced the placeholder is left alone.

update dispatch_copy
   set sms_body = '[Placeholder: Cascade copy — the confirmation text sent on agreement]'
 where key = 'sms.agreement_confirmation'
   and position(U&'\FFFD' in sms_body) > 0;
