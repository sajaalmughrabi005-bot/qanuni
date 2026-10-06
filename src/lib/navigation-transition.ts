"use client";

export const NAVIGATION_START = "haq:navigation-start";
export type NavigationStart = { from: string; to: string; startedAt: number };

/** Signal only a meaningful same-origin route change; never wait or route here. */
export function startNavigation(href: string) {
  const target = new URL(href, window.location.href);
  const routePath = (value: string) => value.replace(/\/+$/, "") || "/";
  if (target.origin !== window.location.origin || routePath(target.pathname) === routePath(window.location.pathname)) return;
  window.dispatchEvent(new CustomEvent<NavigationStart>(NAVIGATION_START, {
    detail: { from: window.location.pathname, to: target.pathname, startedAt: performance.now() },
  }));
}
