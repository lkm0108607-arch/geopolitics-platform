"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Globe, Users, BarChart3, Menu, X, TrendingUp, Activity, DollarSign, Brain } from "lucide-react";
import { useState } from "react";

const navItems = [
  { href: "/", label: "홈", icon: Globe },
  { href: "/predictions", label: "AI예측", icon: Brain },
  { href: "/assets", label: "자산전망", icon: TrendingUp },
  { href: "/factors", label: "변동요인", icon: Activity },
  { href: "/experts", label: "전문가", icon: Users },
  { href: "/investment", label: "투자전략", icon: DollarSign },
  { href: "/investment/simulation", label: "모의투자", icon: BarChart3 },
];

export default function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-slate-950/90 backdrop-blur border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-16">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg tracking-tight">
          <Globe className="w-5 h-5 text-blue-400" />
          <span className="text-white">GeoInsight</span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== "/" && href !== "/investment" && pathname.startsWith(href)) || (href === "/investment" && pathname === "/investment");
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  active
                    ? "bg-blue-600 text-white"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            );
          })}
        </nav>

        <button
          className="md:hidden text-slate-400 hover:text-white"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-slate-800 bg-slate-950">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== "/" && href !== "/investment" && pathname.startsWith(href)) || (href === "/investment" && pathname === "/investment");
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 text-sm font-medium border-b border-slate-800/50 ${
                  active ? "text-blue-400 bg-slate-900" : "text-slate-400"
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
}
