"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Sparkles } from "lucide-react";
import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import GuestLoginButton from "@/components/ui/GuestLoginButton";

// Navigation links for signed out users
const publicNavLinks: { name: string; href: string }[] = [
  { name: "Features", href: "/features" },
  { name: "Pricing", href: "/pricing" },
];

// Navigation links for signed in users
const authNavLinks: { name: string; href: string }[] = [
  { name: "Dashboard", href: "/dashboard" },
  { name: "Workspaces", href: "/workspaces" },
//   { name: "Editor", href: "/editor" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Close the mobile menu on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Add shadow on scroll
  useEffect(() => {
    const handler = () => {
      setScrolled(window.scrollY > 4);
    };
    handler();
    window.addEventListener("scroll", handler);
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <nav
      className={`fixed top-0 inset-x-0 z-50 transition-shadow duration-300 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 backdrop-blur-md border-b border-white/10 ${
        scrolled ? "shadow-lg shadow-black/30" : "shadow-none"
      }`}
    >
      <div className="w-full px-6 h-16 flex items-center justify-between">
        {/* Left: Logo / Brand */}
        <Link href="/" className="flex items-center space-x-2 group">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white group-hover:text-blue-200 transition-colors">MarkFlow</h1>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center space-x-6">
          <SignedOut>
            {publicNavLinks.map((link) => {
              const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`relative text-sm font-medium transition-colors hover:text-white ${
                    active ? "text-white" : "text-gray-300"
                  }`}
                >
                  {link.name}
                  {active && (
                    <span className="absolute -bottom-2 left-0 h-0.5 w-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full" />
                  )}
                </Link>
              );
            })}
            <div className="flex items-center space-x-4">
              <GuestLoginButton />
              <Link
                href="/sign-in"
                className="bg-white/10 backdrop-blur-sm text-white px-4 py-2 rounded-lg hover:bg-white/20 transition-all border border-white/20"
              >
                Sign In
              </Link>
              <Link
                href="/sign-up"
                className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-4 py-2 rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all shadow-lg"
              >
                Sign Up
              </Link>
            </div>
          </SignedOut>
          <SignedIn>
            {authNavLinks.map((link) => {
              const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`relative text-sm font-medium transition-colors hover:text-white ${
                    active ? "text-white" : "text-gray-300"
                  }`}
                >
                  {link.name}
                  {active && (
                    <span className="absolute -bottom-2 left-0 h-0.5 w-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full" />
                  )}
                </Link>
              );
            })}
            <div className="ml-4">
              <UserButton afterSignOutUrl="/" />
            </div>
          </SignedIn>
        </div>

        {/* Mobile Toggle */}
        <button
          aria-label="Toggle Menu"
          onClick={() => setOpen((o) => !o)}
          className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Dropdown */}
      <div
        className={`md:hidden origin-top transition-all duration-200 overflow-hidden ${
          open ? "max-h-[480px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="px-4 pt-2 pb-6 flex flex-col gap-2 bg-gradient-to-br from-slate-900/95 via-blue-900/95 to-slate-900/95 backdrop-blur-md border-t border-white/10">
          <SignedOut>
            {publicNavLinks.map((link) => {
              const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`block rounded-lg px-4 py-2 text-sm font-medium transition-colors hover:bg-white/10 ${
                    active ? "text-white bg-white/5" : "text-gray-300"
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}
            <div className="flex flex-col gap-2 mt-2">
              <div className="px-4 py-2">
                <GuestLoginButton />
              </div>
              <Link
                href="/sign-in"
                className="block rounded-lg px-4 py-2 text-sm font-medium text-gray-300 hover:text-white hover:bg-white/10"
              >
                Sign In
              </Link>
              <Link
                href="/sign-up"
                className="block rounded-lg px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-purple-600 text-center hover:from-blue-600 hover:to-purple-700"
              >
                Sign Up
              </Link>
            </div>
          </SignedOut>
          <SignedIn>
            {authNavLinks.map((link) => {
              const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`block rounded-lg px-4 py-2 text-sm font-medium transition-colors hover:bg-white/10 ${
                    active ? "text-white bg-white/5" : "text-gray-300"
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}
            <div className="flex items-center justify-between mt-2 px-2">
              <span className="text-sm text-gray-300">Account</span>
              <UserButton afterSignOutUrl="/" />
            </div>
          </SignedIn>
        </div>
      </div>
    </nav>
  );
}
