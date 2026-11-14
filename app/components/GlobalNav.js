"use client";
import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "../../lib/supabase/client";
import { Logomark } from "./brand/Logomark";

const NAV_MENU = [
  {
    id: "explore",
    items: [
      { label: "How it works", href: "/" },
      { label: "Plans", href: "/pricing" },
    ],
  },
];

// The signed-in menu (Master Specification, User Profiles). Account opens the
// logged-in home, whose four tabs are the addresses listed here. Purchases
// joins as Stage 4.3 builds it, and Stage 5.1 adds the Legacy Guard portal
// link.
const PROFILE_TABS = ["/dashboard", "/dashboard/people", "/dashboard/social-media", "/dashboard/account"];
const ACCOUNT_MENU = [
  { label: "Account", href: "/dashboard", current: (path) => PROFILE_TABS.includes(path) },
  { label: "Add a plan", href: "/dashboard/add-plan", current: (path) => path === "/dashboard/add-plan" },
  { label: "Settings", href: "/dashboard/settings", current: (path) => path === "/dashboard/settings" },
];

export default function GlobalNav() {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState(null);
  const menuRef = useRef(null);
  const pathname = usePathname();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setUser(data?.user ?? null));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  async function logOut() {
    setOpen(false);
    await createClient().auth.signOut();
    // Full navigation so the proxy sees the cleared cookies.
    window.location.href = "/";
  }

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
    }
    function handleKeyDown(e) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <nav
      className="flex justify-between items-center px-8 py-6"
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        backgroundColor: "#000",
        borderBottom: "1px solid #262626",
      }}
    >
      <a href="/" style={{ display: "inline-flex", alignItems: "center", gap: "0.6em", textDecoration: "none", color: "#ffffff" }}>
        <Logomark size={40} />
        <span style={{ fontWeight: 700, letterSpacing: "0.28em", textTransform: "uppercase", lineHeight: 1, fontSize: 22 }}>Posterity</span>
      </a>

      <div className="flex items-center gap-4">
        <div id="nav-cart-slot" className="flex items-center" />
      <div className="navmenu" ref={menuRef}>
        <button
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          className={`navmenu__toggle${open ? " is-open" : ""}`}
        >
          <span className="navmenu__bar" />
          <span className="navmenu__bar" />
          <span className="navmenu__bar" />
        </button>

        {open && (
          <div className="navmenu__panel">
            {NAV_MENU.map((group) => (
              <div key={group.id} className="navmenu__group">
                {group.items.map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={`navmenu__item${pathname === item.href ? " is-current" : ""}`}
                  >
                    {item.label}
                  </a>
                ))}
              </div>
            ))}

            {user ? (
              <>
                <div className="navmenu__group">
                  {ACCOUNT_MENU.map((item) => (
                    <a
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      aria-current={item.current(pathname) ? "page" : undefined}
                      className={`navmenu__item${item.current(pathname) ? " is-current" : ""}`}
                    >
                      {item.label}
                    </a>
                  ))}
                </div>
                <div className="navmenu__group">
                  <button type="button" onClick={logOut} className="navmenu__item">
                    Log Out
                  </button>
                </div>
              </>
            ) : (
              <div className="navmenu__group">
                <a href="/login" onClick={() => setOpen(false)} className="navmenu__item">
                  Login
                </a>
              </div>
            )}

            {!user && (
              <div className="navmenu__cta">
                <a
                  href="/signup"
                  onClick={() => setOpen(false)}
                  className="block text-center border border-white text-white px-4 py-2 rounded-full text-sm font-semibold hover:bg-white hover:text-black transition"
                >
                  Get Started
                </a>
              </div>
            )}
          </div>
        )}
      </div>
      </div>
    </nav>
  );
}
