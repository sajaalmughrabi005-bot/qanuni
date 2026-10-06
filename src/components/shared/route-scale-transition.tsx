"use client";
import { useEffect, useRef } from "react";
import { animate } from "framer-motion";
import { Scale } from "lucide-react";
import { usePathname } from "next/navigation";
import { useReducedMotion } from "@/lib/use-reduced-motion";
import { NAVIGATION_START, type NavigationStart } from "@/lib/navigation-transition";

const MIN_HOLD_MS = 450;
const PENDING_TIMEOUT_MS = 5_000;

/** Navigation-start visual; its timers/animation never control route rendering. */
export function RouteScaleTransition() {
  const pathname = usePathname();
  const reduced = useReducedMotion();
  const overlay = useRef<HTMLDivElement>(null);
  const active = useRef<NavigationStart | null>(null);
  const complete = useRef<() => void>(() => {});
  const reducedPreference = useRef(reduced);

  useEffect(() => { reducedPreference.current = reduced; }, [reduced]);
  useEffect(() => {
    const element = overlay.current!;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let fading: { stop: () => void } | undefined;

    const hide = () => {
      element.style.display = "none";
      element.style.opacity = "0";
      delete element.dataset.routeTransition;
      delete element.dataset.routePhase;
      active.current = null;
    };
    const fade = () => {
      const navigation = active.current;
      element.dataset.routePhase = "fading";
      fading = animate(element, { opacity: 0 }, {
        duration: reducedPreference.current ? 0.1 : 0.15,
        onComplete: () => { if (active.current === navigation) hide(); },
      });
    };
    const start = (event: Event) => {
      const navigation = (event as CustomEvent<NavigationStart>).detail;
      if (active.current?.from === navigation.from && active.current.to === navigation.to) return;
      clearTimeout(timer);
      fading?.stop();
      active.current = navigation;
      // A synchronous DOM update precedes Next's push/replace even when React
      // schedules navigation in a transition. No flushSync, await or route delay.
      element.dataset.routeTransition = navigation.to;
      element.dataset.routePhase = "pending";
      element.style.display = "grid";
      element.style.opacity = "1";
      // Cancelled/failed navigations cannot strand the decorative backdrop.
      timer = setTimeout(fade, PENDING_TIMEOUT_MS);
    };
    complete.current = () => {
      if (!active.current) return;
      clearTimeout(timer);
      element.dataset.routePhase = "arrived";
      timer = setTimeout(fade, Math.max(0, MIN_HOLD_MS - (performance.now() - active.current.startedAt)));
    };
    window.addEventListener(NAVIGATION_START, start);
    return () => {
      window.removeEventListener(NAVIGATION_START, start);
      clearTimeout(timer);
      fading?.stop();
      complete.current = () => {};
      hide();
    };
  }, []);

  useEffect(() => {
    if (active.current && pathname !== active.current.from) complete.current();
  }, [pathname]);

  // Match the existing .haq-landing navy/gold palette in every theme.
  return (
    <div ref={overlay} aria-hidden="true" data-navigation-overlay
      data-route-motion={reduced ? "reduced" : "fade"}
      style={{ display: "none", opacity: 0, backgroundColor: "#0c1421" }}
      className="pointer-events-none fixed inset-0 z-[2147483646] place-items-center text-[#cba760]">
      <Scale data-justice-scale strokeWidth={1.4} className="h-14 w-14" />
    </div>
  );
}
