"use client";

import { forwardRef, useMemo, type ComponentProps } from "react";
import { useLocale } from "next-intl";
import { createNavigation } from "next-intl/navigation";
import { routing, type AppLocale } from "./routing";
import { startNavigation } from "@/lib/navigation-transition";

const { Link: LocalizedLink, useRouter: useLocalizedRouter, getPathname } = createNavigation(routing);

/** Keep Next's own navigation eligibility, refs, prefetch and cancellation. */
export const Link = forwardRef<HTMLAnchorElement, ComponentProps<typeof LocalizedLink>>(
  function NavigationLink({ onNavigate, ...props }, ref) {
    const locale = useLocale();
    return <LocalizedLink {...props} ref={ref} onNavigate={event => {
      let cancelled = false;
      onNavigate?.({ ...event, preventDefault: () => { cancelled = true; event.preventDefault(); } });
      const href = typeof props.href === "string" ? props.href : props.href.pathname;
      if (!cancelled && href) startNavigation(getPathname({ href, locale: (props.locale || locale) as AppLocale }));
    }} />;
  }
);

/** Decorate the existing localized router; forward every argument unchanged. */
export function useRouter(): ReturnType<typeof useLocalizedRouter> {
  const router = useLocalizedRouter();
  const locale = useLocale();
  return useMemo(() => ({
    ...router,
    push: (...args: Parameters<typeof router.push>) => {
      startNavigation(getPathname({ href: args[0], locale: (args[1]?.locale || locale) as AppLocale }));
      return router.push(...args);
    },
    replace: (...args: Parameters<typeof router.replace>) => {
      startNavigation(getPathname({ href: args[0], locale: (args[1]?.locale || locale) as AppLocale }));
      return router.replace(...args);
    },
  }), [router, locale]);
}
