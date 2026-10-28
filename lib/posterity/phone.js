// Posterity — phone numbers · Walker Brown

// The phone number is held as E.164, the form the Communication Dispatch System
// sends to. A ten-digit number is read as a US number. Null when the entry
// cannot be a phone number.
export function toE164(raw) {
  const digits = raw.replace(/\D/g, '')
  if (raw.trim().startsWith('+')) return /^[1-9]\d{7,14}$/.test(digits) ? `+${digits}` : null
  // A US or Canadian area code never starts with 0 or 1.
  if (/^[2-9]\d{9}$/.test(digits)) return `+1${digits}`
  if (/^1[2-9]\d{9}$/.test(digits)) return `+${digits}`
  return null
}

// How a held number reads back to the customer: a US number as (504) 555-1234,
// anything else as stored.
export function displayPhone(e164) {
  if (!e164) return ''
  const us = /^\+1(\d{3})(\d{3})(\d{4})$/.exec(e164)
  return us ? `(${us[1]}) ${us[2]}-${us[3]}` : e164
}
