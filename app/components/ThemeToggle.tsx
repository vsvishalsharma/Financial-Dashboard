"use client";
import React, { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export const ThemeToggle: React.FC = () => {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const saved = (typeof window !== "undefined" && localStorage.getItem("theme")) as
      | "light"
      | "dark"
      | null;
    const initial = saved || getSystemTheme();
    setTheme(initial);
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-theme", initial);
    }
  }, []);

  const toggle = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("data-theme", next);
    }
    if (typeof window !== "undefined") {
      localStorage.setItem("theme", next);
    }
  };

  return (
    <button
      aria-label="Toggle theme"
      onClick={toggle}
      className="fixed bottom-4 right-4 z-50 inline-flex items-center gap-2 px-3 py-2 rounded-md border border-border bg-card text-foreground hover:bg-accent hover:text-accent-foreground shadow-sm"
    >
      {theme === "dark" ? (
        <>
          <Sun className="w-4 h-4" />
          <span className="text-sm">Light</span>
        </>
      ) : (
        <>
          <Moon className="w-4 h-4" />
          <span className="text-sm">Dark</span>
        </>
      )}
    </button>
  );
};
