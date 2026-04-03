import { Link, useLocation } from "wouter";
import { LayoutDashboard, Upload, FlaskConical, Pill, Menu, X, ScanLine, BarChart3, BookOpen } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const navItems = [
  { path: "/dashboard", label: "ダッシュボード", icon: LayoutDashboard },
  { path: "/food-scanner", label: "フードスキャナー", icon: ScanLine },
  { path: "/upload", label: "データ連携", icon: Upload },
  { path: "/analysis", label: "食事解析", icon: BarChart3 },
  { path: "/food-log", label: "食事ログ", icon: BookOpen },
  { path: "/supplements", label: "サプリメント", icon: Pill },
];

export default function Sidebar() {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2.5 elevated-card rounded-xl"
      >
        <Menu className="w-5 h-5 text-foreground" />
      </button>

      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="lg:hidden fixed inset-0 bg-black/70 backdrop-blur-sm z-40"
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-[72px] lg:w-64 bg-sidebar z-50 flex flex-col transition-transform duration-300 lg:translate-x-0 ${
          mobileOpen ? "translate-x-0 !w-64" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Logo */}
        <div className="p-4 lg:px-5 lg:py-6 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
              <FlaskConical className="w-5 h-5 text-primary" />
            </div>
            <div className={`${mobileOpen ? "block" : "hidden"} lg:block`}>
              <h1 className="text-sm font-bold tracking-wider text-foreground" style={{ fontFamily: "var(--font-display)" }}>
                BIO-PERF
              </h1>
              <p className="text-[9px] text-muted-foreground tracking-[0.2em] uppercase">Laboratory</p>
            </div>
          </Link>
          <button onClick={() => setMobileOpen(false)} className="lg:hidden p-1">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Divider */}
        <div className="mx-3 lg:mx-4 h-px bg-border/50 mb-2" />

        {/* Nav */}
        <nav className="flex-1 px-2 lg:px-3 py-2 space-y-0.5">
          {navItems.map((item) => {
            const isActive = location === item.path;
            return (
              <Link key={item.path} href={item.path} onClick={() => setMobileOpen(false)}>
                <div
                  className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 group ${
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="sidebar-indicator"
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-primary"
                      transition={{ type: "spring", stiffness: 350, damping: 30 }}
                    />
                  )}
                  <item.icon className={`w-[18px] h-[18px] shrink-0 ${isActive ? "text-primary" : "group-hover:text-foreground"}`} />
                  <span className={`font-medium ${mobileOpen ? "block" : "hidden"} lg:block`}>{item.label}</span>
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Footer disclaimer */}
        <div className={`p-3 lg:p-4 mx-2 lg:mx-3 mb-3 rounded-xl bg-secondary/40 ${mobileOpen ? "block" : "hidden"} lg:block`}>
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            本サービスは医療行為ではありません。健康増進・パフォーマンス最適化を目的としています。
          </p>
        </div>
      </aside>
    </>
  );
}
