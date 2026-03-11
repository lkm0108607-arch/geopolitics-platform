"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Globe, BarChart3, Menu, X, TrendingUp, Brain, Cpu, Target, LayoutDashboard } from "lucide-react";
import { useState, useEffect } from "react";
import { useTranslation } from "./LanguageProvider";


function LiveTicker() {
  const { t } = useTranslation();
  const [time, setTime] = useState("");
  const [countdown, setCountdown] = useState("");

  useEffect(() => {
    const getNext1Min = () => {
      const now = Date.now();
      const interval = 1 * 60 * 1000;
      return Math.ceil(now / interval) * interval;
    };

    let nextTarget = getNext1Min();

    const timer = setInterval(() => {
      const now = new Date();
      setTime(now.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));

      const diff = nextTarget - now.getTime();
      if (diff <= 0) {
        nextTarget = getNext1Min();
        return;
      }
      const m = Math.floor(diff / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setCountdown(`${m}:${s.toString().padStart(2, "0")}`);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="hidden lg:flex items-center gap-3 text-[11px] text-slate-500">
      <div className="flex items-center gap-1.5">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>
        <span className="text-emerald-400 font-medium">{t.common.live}</span>
      </div>
      <span className="text-slate-600">|</span>
      <span className="font-mono">{time}</span>
      <span className="text-slate-600">|</span>
      <span className="text-slate-400">{t.common.nextUpdate} <span className="font-mono text-blue-400">{countdown}</span></span>
    </div>
  );
}

export default function Navbar() {
  const pathname = usePathname();
  const { t } = useTranslation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    { href: "/", label: "대시보드", icon: LayoutDashboard },
    { href: "/predictions", label: "AI 예측", icon: Brain },
    { href: "/assets", label: "실시간 시세", icon: TrendingUp },
    { href: "/ai", label: "AI 시스템", icon: Cpu },
    { href: "/investment", label: "투자전략", icon: Target },
    { href: "/investment/simulation", label: "모의투자", icon: BarChart3 },
  ];

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

        <div className="flex items-center gap-2">
          <LiveTicker />
        </div>

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
