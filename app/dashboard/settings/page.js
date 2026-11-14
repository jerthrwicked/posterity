// Posterity — Settings · Walker Brown
import { requireAccount } from '../../../lib/posterity/account'
import { displayPhone } from '../../../lib/posterity/phone'
import { AccountDetailsForm } from './AccountDetailsForm'
import { EmailChangeForm } from './EmailChangeForm'
import { RecoveryEmailForm } from './RecoveryEmailForm'
import { TextSwitchForm } from './TextSwitchForm'
import { PaymentSetupForm } from './PaymentSetupForm'
import { AutomaticPaymentsForm } from './AutomaticPaymentsForm'
import { DeleteAccountForm } from './DeleteAccountForm'
import { createClient } from '@supabase/supabase-js'
import { readRecoveryEmail } from '../../../lib/auth/recovery-email'
import { readAccountTextSwitch, TEXT_DISCLOSURE, CODE_MINUTES } from '../../../lib/dispatch/text-switch'
import { SMS_FROM } from '../../../lib/dispatch/senders'
import { TEXTING_OPEN } from '../../../lib/dispatch/policy'
import { getStripe } from '../../../lib/posterity/stripe'
import { readPaymentSettings } from '../../../lib/posterity/payment-setup'
import { deletionClosed } from '../../../lib/posterity/account-deletion'
import { WarningMark } from '../../components/StatusMarks'
import { AccountGlow } from '../../components/Glow'
import { NavCart } from '../_cart/NavCart'

// Settings is its own page (Master Specification, Settings). The global
// navigation dropdown built within Stage 4.3 will carry its link; until then
// the dashboard does.
export default async function Settings({ searchParams }) {
  const profile = await requireAccount()
  const { supabase, user, account, status } = profile
  const query = await searchParams
  const notice = query?.recovery_email ?? null
  const paymentNotice = query?.payment ?? null

  const { data: details } = await supabase
    .from('accounts')
    .select('legal_name, name, phone')
    .eq('id', account?.id)
    .maybeSingle()

  // recovery_emails, text_agreements and text_switch_requests are server-only,
  // so they are read with the service role, for this account alone. A switch
  // that cannot be read shows as off.
  let recovery = null
  let texts = { on: false, waiting: null }
  if (account?.id) {
    const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    })
    recovery = await readRecoveryEmail(db, account.id).catch(() => null)
    texts = await readAccountTextSwitch(db, { accountId: account.id }).catch(() => ({ on: false, waiting: null }))
  }

  // The saved payment method and automatic payments both belong to the
  // account's storage subscription within Stripe, and one reading of Stripe
  // serves both. Which subscriptions are the account's is read with the
  // customer's own session. Where it cannot be read, the page says so rather
  // than showing a payment method or a switch that might be wrong.
  let payments = { setup: { held: false }, automatic: { held: false }, unread: false }
  if (account?.id) {
    payments = await readPaymentSettings(supabase, getStripe(), { accountId: account.id }).catch((err) => {
      console.log(`payment settings: read failed: ${String(err?.message ?? err).slice(0, 200)}`)
      return { setup: { held: false }, automatic: { held: false }, unread: true }
    })
  }

  // Account deletion is open in Horizon and Planning, and closed for thirty
  // days after an account recovery. The card says which, and the action asks
  // again before it does anything.
  const lockedUntil = status?.recovery_lock_until
    ? new Date(status.recovery_lock_until).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })
    : null

  return (
    <main className="relative min-h-screen bg-black text-white">
      <NavCart profile={profile} />

      <div className="relative z-[1] max-w-4xl mx-auto px-4 sm:px-8 py-10 sm:py-16">
        <a href="/dashboard" className="text-gray-400 hover:text-white text-sm">&larr; Account</a>

        <h1 className="text-4xl font-bold mt-4 mb-12">Settings</h1>

        <h2 className="text-xl font-bold mb-4">Account details</h2>
        {details ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-7">
            <AccountDetailsForm
              legalName={details.legal_name}
              name={details.name === details.legal_name ? '' : details.name}
              phone={displayPhone(details.phone)}
            />
            <TextSwitchForm on={texts.on} phone={displayPhone(details.phone)} disclosure={TEXT_DISCLOSURE}
              sending={TEXTING_OPEN} waiting={texts.waiting ? { code: texts.waiting.code } : null}
              textTo={{ e164: SMS_FROM, display: displayPhone(SMS_FROM) }} minutes={CODE_MINUTES} />
            <EmailChangeForm email={user.email} pendingEmail={user.new_email || null} />
            <RecoveryEmailForm held={recovery} notice={notice} />
            <PaymentSetupForm held={!!payments.setup.held} method={payments.setup.method ?? null}
              unread={!!payments.unread} notice={paymentNotice} />
            <AutomaticPaymentsForm held={!!payments.automatic.held} on={!!payments.automatic.on}
              unread={!!payments.unread} />
            <div className="md:col-span-2">
              <DeleteAccountForm email={user.email} closed={deletionClosed(status)} until={lockedUntil} />
            </div>
          </div>
        ) : (
          <div className="rounded-2xl p-6 border border-white">
            <p className="text-white text-sm flex items-start gap-2">
              <WarningMark className="mt-0.5" />
              [Placeholder: Product surface copy — error messages: the account record cannot be found]
            </p>
          </div>
        )}
      </div>
      <AccountGlow />
    </main>
  )
}
