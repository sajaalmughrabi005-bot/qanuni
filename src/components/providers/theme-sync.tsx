"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export function ThemeSync() {
  const pathname = usePathname();

  useEffect(() => {
    try {
      const stored = localStorage.getItem("qanuni-theme");
      const theme = stored || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
      document.documentElement.setAttribute("data-theme", theme);
    } catch {}
  }, [pathname]);

  return null;
}
