"use client";
import { AnimatePresence, motion } from "framer-motion";
import { Scale } from "lucide-react";
import { usePathname } from "next/navigation";
import { useReducedMotion } from "@/lib/use-reduced-motion";

/** A brief route-arrival cue. Never remounts page content or delays navigation. */
export function RouteScaleTransition() {
  const pathname = usePathname();
  const reduced = useReducedMotion();
  if (reduced) return null;
  return (
    <AnimatePresence initial={false}>
      <motion.div key={pathname} aria-hidden="true" data-route-transition={pathname}
        className="pointer-events-none fixed start-1/2 top-20 z-50 -translate-x-1/2 rounded-full border border-gold/30 bg-navy px-5 py-2 text-gold-light shadow-lg"
        initial={{ opacity: 0, y: -5 }} animate={{ opacity: [0, 1, 1, 0], y: [-5, 0, 0, -3] }}
        exit={{ opacity: 0 }} transition={{ duration: 0.55, times: [0, 0.2, 0.65, 1] }}>
        <motion.div animate={{ rotate: [-4, 3, 0] }} transition={{ duration: 0.45 }}>
          <Scale className="h-6 w-6" />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
