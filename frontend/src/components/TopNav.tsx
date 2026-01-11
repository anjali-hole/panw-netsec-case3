"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Sparkles, Settings as SettingsIcon } from "lucide-react";

const links = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/insights", label: "Insights", icon: Sparkles },
  { href: "/settings", label: "Settings", icon: SettingsIcon },
];

export default function TopNav() {
  const pathname = usePathname();

  return (
    <div className="sticky top-0 z-50 border-b border-[#E2E8F0] bg-[#3B4953] shadow-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        {/* Brand */}
        <div className="flex items-center gap-2 text-white">
          <Image
            src="/wellness-icon.svg"
            alt="Wellness Aggregator"
            width={20}
            height={20}
            className="opacity-90"
          />
          <span className="font-semibold tracking-tight">
            Wellness Aggregator
          </span>
        </div>

        {/* Links */}
        <nav className="flex gap-1 text-sm">
          {links.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href);

            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={[
                  "flex items-center gap-2 rounded-md px-3 py-2 transition-colors",
                  active
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-200 hover:text-white hover:bg-white/10",
                ].join(" ")}
              >
                <Icon className={active ? "h-4 w-4" : "h-4 w-4 opacity-90"} aria-hidden="true" />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}