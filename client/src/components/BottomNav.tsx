import { Link, useLocation } from "wouter";
import { Home, BarChart2, FlaskConical, Pill, Clock } from "lucide-react";

const tabs = [
  { href: "/", icon: Home, label: "ホーム", color: undefined },
  { href: "/analysis", icon: BarChart2, label: "分析", color: undefined },
  { href: "/clinic", icon: FlaskConical, label: "検査", color: "#185FA5" },
  { href: "/supplements", icon: Pill, label: "サプリ", color: undefined },
  { href: "/history", icon: Clock, label: "履歴", color: undefined },
];

export default function BottomNav() {
  const [location] = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#0a0a0a]/95 backdrop-blur-md border-t border-white/8">
      <div className="flex items-center justify-around h-16 px-2 max-w-lg mx-auto">
        {tabs.map(({ href, icon: Icon, label, color }) => {
          const active = location === href;
          const activeColor = color || "#00FF87";
          return (
            <Link key={href} href={href}>
              <button className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all duration-200">
                <Icon
                  className="w-5 h-5 transition-colors duration-200"
                  style={{ color: active ? activeColor : 'rgba(255,255,255,0.4)' }}
                />
                <span
                  className="text-[10px] font-medium transition-colors duration-200"
                  style={{ color: active ? activeColor : 'rgba(255,255,255,0.4)' }}
                >
                  {label}
                </span>
              </button>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
