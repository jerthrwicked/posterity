"use client";
import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { Wordmark } from "./brand/Wordmark";

const NAV_MENU = [
  {
    id: "explore",
    items: [
      { label: "How it works", href: "/" },
      { label: "Plans", href: "/pricing" },
    ],
  },
];

export default function GlobalNav() {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState(null);
  const menuRef = useRef(null);
  const pathname = usePathname();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data?.user ?? null));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

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
    <nav className="flex justify-between items-center px-8 py-6 bg-black">
      <a href="/" style={{ display: "inline-flex", alignItems: "center", textDecoration: "none", color: "inherit" }}>
        <Wordmark size="md" withMark />
      </a>

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

            <div className="navmenu__group">
              <a
                href={user ? "/dashboard" : "/login"}
                onClick={() => setOpen(false)}
                className="navmenu__item"
              >
                {user ? "Account" : "Login"}
              </a>
            </div>

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
    </nav>
  );
}
