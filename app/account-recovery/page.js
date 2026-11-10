// Posterity — account recovery · Walker Brown
import { Frame } from './Frame'
import { RequestForm } from './RequestForm'

// Account recovery, from the sign-in page (Master Specification, Settings:
// "A recovery request from the sign-in page opens with either a code from a
// Legacy Guard on the account or a browser that has signed into that login
// before, and it names a new email address").
//
// This page takes the address the account signs in with and the new address.
// Whether this browser has signed into that login is read from its cookie by
// the action (lib/auth/known-browser.js); the page never learns the answer.
// The Legacy Guard's code is Stage 5.2's and has no box here yet.
export default function AccountRecovery() {
  return (
    <Frame line="Account recovery">
      <RequestForm />
    </Frame>
  )
}
