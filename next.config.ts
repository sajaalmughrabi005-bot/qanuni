import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const isDev = process.env.NODE_ENV !== "production";

// The app has no third-party scripts, trackers, or remote image hosts (fonts
// are self-hosted via next/font, the only outbound link is a plain <a
// href="https://wa.me/..."> navigation). This lets the CSP stay tight.
// 'unsafe-eval' is only allowed in development because Next.js's dev
// bundler/fast-refresh needs it; production never gets it.
//
// connect-src allows *.supabase.co by a static wildcard rather than reading
// NEXT_PUBLIC_SUPABASE_URL at build time: on Vercel that variable is synced
// via the Supabase integration as a "Config"-type value, which build logs
// (and apparently this header) redact/mangle, so interpolating it here
// produced a connect-src silently missing the origin in production even
// though the exact same variable resolves correctly in the client bundle.
// The project ref isn't a secret — it's already visible in every request
// the browser makes — so a wildcard is no less secure and isn't sensitive
// to how that particular env var gets resolved at config-load time.
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  `connect-src 'self' https://*.supabase.co${isDev ? " ws:" : ""}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "geolocation=(), camera=(), microphone=(self)" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const nextConfig: NextConfig = {
  // pdf-parse (contract PDF text extraction) pulls in pdfjs-dist, which
  // tries to require("@napi-rs/canvas") — a native addon — at module load,
  // purely to polyfill a global DOMMatrix. @napi-rs/canvas is NOT required
  // for text extraction: getText() never touches canvas/image APIs (only
  // getImage()/getScreenshot() do, which this app never calls). Instead,
  // src/lib/documents/dom-matrix-polyfill.ts supplies a minimal DOMMatrix
  // before pdf-parse is imported, so the native addon's require() is allowed
  // to fail harmlessly — it is deliberately never bundled, traced, or
  // shipped. serverExternalPackages only lists pdf-parse itself, keeping
  // Next's bundler from inlining it (it has its own dynamic/Node-specific
  // requires unrelated to canvas).
  serverExternalPackages: ["pdf-parse"],
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default withNextIntl(nextConfig);
