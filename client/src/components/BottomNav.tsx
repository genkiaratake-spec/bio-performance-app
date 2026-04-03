import { Link, useLocation } from "wouter";
import { Home, BarChart2, Upload, BookOpen } from "lucide-react";

const tabs = [
  { href: "/", icon: Home, label: "Home" },
  { href: "/upload", icon: Upload, label: "Upload" },
  { href: "/analysis", icon: BarChart2, label: "Analysis" },
  { href: "/food-log", icon: BookOpen, label: "Log" },
];

export default function BottomNav() {
  const [location] = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#0a0a0a]/95 backdrop-blur-md border-t border-white/8">
      <div className="flex items-center justify-around h-16 px-2 max-w-lg mx-auto">
        {tabs.map(({ href, icon: Icon, label }) => {
          const active = location === href;
          return (
            <Link key={href} href={href}>
              <button className="flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all duration-200">
                <Icon
                  className={`w-5 h-5 transition-colors duration-200 ${
                    active ? "text-[#00FF87]" : "text-white/40"
                  }`}
                />
                <span
                  className={`text-[10px] font-medium transition-colors duration-200 ${
                    active ? "text-[#00FF87]" : "text-white/40"
                  }`}
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
