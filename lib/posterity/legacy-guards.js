// Posterity — Legacy Guards, in the customer's words · Walker Brown
//
// Whether Legacy Guard setup is open is the database's answer: the account
// status check's legacy_guard_setup_open field. The trigger that locks setup at
// Interlude reads it through legacy_guard_setup_is_open() (20261030010000), and
// the page reads it from requireAccount(). This file holds only the words a
// page shows.

export const GUARD_SETUP_LOCKED_MESSAGE =
  '[Placeholder: Product surface copy — Legacy Guard setup is locked once the account enters Interlude]'
