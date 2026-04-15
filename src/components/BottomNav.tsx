"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, MessageSquare, BookOpen, MessageCircle, Mic, Zap } from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/qa", label: "Part 1", icon: MessageSquare },
  { href: "/stories", label: "Part 2", icon: BookOpen },
  { href: "/part3", label: "Part 3", icon: MessageCircle },
  { href: "/flashcards", label: "Vocab", icon: Zap },
  { href: "/mock", label: "Mock", icon: Mic },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="bottom-nav">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className="flex flex-col items-center gap-1 px-4 py-1 transition-all"
          >
            <Icon
              size={22}
              strokeWidth={active ? 2 : 1.5}
              style={{ color: active ? "#0a0a0a" : "#bbb" }}
            />
            <span
              style={{
                fontSize: "8px",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                fontWeight: active ? 700 : 400,
                color: active ? "#0a0a0a" : "#bbb",
              }}
            >
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
