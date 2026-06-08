"use client";
import { useState, useEffect, useRef } from "react";
import { supabase } from "../../lib/supabase";

export default function GlobalNav() {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState(null);
  const menuRef = useRef(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data?.user ?? null));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  return (
    <nav className="flex justify-between items-center px-8 py-6 bg-black">
      <a href="/" className="text-2xl font-bold tracking-widest text-white">POSTERITY</a>

      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setOpen((v) => !v)}
          aria-label="Open menu"
          aria-expanded={open}
          className="flex flex-col justify-center items-center w-12 h-12 gap-[6px]"
        >
          <span
            className={`block w-8 h-[2.5px] bg-white rounded-full transition-all duration-200 origin-center ${
              open ? "rotate-45 translate-y-[8.5px]" : ""
            }`}
          />
          <span
            className={`block w-8 h-[2.5px] bg-white rounded-full transition-all duration-200 ${
              open ? "opacity-0 scale-x-0" : ""
            }`}
          />
          <span
            className={`block w-8 h-[2.5px] bg-white rounded-full transition-all duration-200 origin-center ${
              open ? "-rotate-45 -translate-y-[8.5px]" : ""
            }`}
          />
        </button>

        {open && (
          <div className="absolute right-0 top-14 bg-gray-950 border border-gray-800 rounded-2xl overflow-hidden min-w-[180px] z-50 shadow-xl shadow-black/50">
            <a
              href="/pricing"
              onClick={() => setOpen(false)}
              className="block px-6 py-4 text-sm text-gray-300 hover:text-white hover:bg-gray-900 transition"
            >
              Plans
            </a>
            <a
              href={user ? "/dashboard" : "/login"}
              onClick={() => setOpen(false)}
              className="block px-6 py-4 text-sm text-gray-300 hover:text-white hover:bg-gray-900 transition border-t border-gray-800"
            >
              {user ? "Account" : "Login"}
            </a>
            {!user && (
              <div className="px-4 py-3 border-t border-gray-800">
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
