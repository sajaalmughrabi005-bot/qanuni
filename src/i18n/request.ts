import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";
import { routing } from "./routing";

const namespaces = [
  "common",
  "landing",
  "auth",
  "citizen",
  "marketplace",
  "lawyer",
  "admin",
] as const;

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  const modules = await Promise.all(
    namespaces.map((ns) =>
      import(`../messages/${locale}/${ns}.json`).then((m) => [ns, m.default] as const)
    )
  );

  const messages = Object.fromEntries(modules);

  return { locale, messages };
});
