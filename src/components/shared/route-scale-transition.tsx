"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { Scale } from "lucide-react";
import { usePathname } from "next/navigation";
import { useReducedMotion } from "@/lib/use-reduced-motion";

/** Decorative justice balance on route arrival; never controls page rendering. */
export function RouteScaleTransition() {
  const pathname = usePathname();
  const reduced = useReducedMotion();
  const [route, setRoute] = useState({ pathname, active: false });

  // Track committed route changes, including Link, router.push and back/forward.
  // Initial SSR/hydration renders nothing; query/hash-only updates are ignored.
  if (route.pathname !== pathname) {
    setRoute({ pathname, active: !reduced });
  } else if (reduced && route.active) {
    setRoute({ pathname, active: false });
  }
  if (reduced || !route.active) return null;

  return (
    <motion.div key={route.pathname} aria-hidden="true" data-route-transition={route.pathname}
      className="pointer-events-none fixed inset-0 z-[80] grid place-items-center"
      initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 1, 0] }}
      transition={{ duration: 0.6, times: [0, 0.15, 0.72, 1], ease: "easeInOut" }}
      onAnimationComplete={() => setRoute(current =>
        current.pathname === route.pathname ? { ...current, active: false } : current
      )}>
      <div data-justice-scale-panel
        className="grid h-36 w-36 place-items-center rounded-2xl border border-[#cba760]/30 bg-[#0c1421] text-[#cba760] shadow-[0_12px_48px_rgba(0,0,0,0.28)] sm:h-44 sm:w-44">
        <motion.div animate={{ rotate: [-2, 2, 0] }} transition={{ duration: 0.45, ease: "easeInOut" }}>
          <Scale data-justice-scale strokeWidth={1.25} className="h-20 w-20 sm:h-24 sm:w-24" />
        </motion.div>
      </div>
    </motion.div>
  );
}
