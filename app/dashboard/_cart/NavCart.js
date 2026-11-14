// Posterity — the cart in the top bar, on every page behind sign-in
//
// Master Specification, User Profiles: "Live cart top right of User Profiles
// (above the global navigation dropdown)". Each page behind sign-in renders
// this, so the cart is read fresh with the page, and Cart.jsx carries it up
// into the top bar.
import { Cart } from './Cart'
import { readCart } from './read'

export async function NavCart({ profile }) {
  const cart = await readCart(profile)
  return cart ? <Cart {...cart} /> : null
}
