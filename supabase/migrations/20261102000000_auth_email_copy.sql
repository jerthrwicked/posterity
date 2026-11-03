-- Copy for the authentication emails (Stage 4.2, Settings).
--
-- Supabase's own authentication emails stay off: with the Send Email hook on,
-- the signup confirmation and the password reset leave through the
-- Communication Dispatch System, each from a copy row. {{link}} is the link to
-- the site's confirm route, built at send; {{name}} is the name the account
-- holds. The wording is a placeholder until Product surface copy approves it,
-- and approved wording replaces it as a content change.
--
-- The email change's copy joins with the double verification build.

insert into dispatch_copy (key, channel, kind, subject, html_body, text_body) values
  ('email.confirm_signup', 'email', 'message',
   '[Placeholder: Product surface copy — subject of the email confirming a new account''s address]',
   '<p style="margin:0 0 16px;">[Placeholder: Product surface copy — the email confirming a new account''s address, sent to {{name}} at signup; the link below confirms it and lasts an hour]</p>'
   '<p style="margin:0;"><a href="{{link}}" style="color:#0a0a0a;">{{link}}</a></p>',
   '[Placeholder: Product surface copy — the email confirming a new account''s address, sent to {{name}} at signup; the link below confirms it and lasts an hour]'
   || E'\n\n{{link}}'),
  ('email.reset_password', 'email', 'message',
   '[Placeholder: Product surface copy — subject of the password reset email]',
   '<p style="margin:0 0 16px;">[Placeholder: Product surface copy — the password reset email, sent to {{name}} on request from the sign-in page; the link below opens the new-password page, lasts an hour, and can be ignored if they did not ask]</p>'
   '<p style="margin:0;"><a href="{{link}}" style="color:#0a0a0a;">{{link}}</a></p>',
   '[Placeholder: Product surface copy — the password reset email, sent to {{name}} on request from the sign-in page; the link below opens the new-password page, lasts an hour, and can be ignored if they did not ask]'
   || E'\n\n{{link}}');
