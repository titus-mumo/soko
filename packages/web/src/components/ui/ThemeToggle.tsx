"use client";

import { useEffect, useState } from "react";
import { IconButton } from "./Button";
import { Icon } from "./Icon";

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem("theme");
    setIsDark(stored !== null ? stored === "dark" : true);
  }, []);

  const toggle = () => {
    const next = !isDark;
    setIsDark(next);
    localStorage.setItem("theme", next ? "dark" : "light");
    document.documentElement.classList.toggle("dark", next);
  };

  // Render a stable placeholder until mounted to avoid hydration mismatch
  if (!mounted) return <div className="h-9 w-9" aria-hidden="true" />;

  return (
    <IconButton
      label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={toggle}
    >
      <Icon name={isDark ? "sun" : "moon"} size={17} />
    </IconButton>
  );
}
