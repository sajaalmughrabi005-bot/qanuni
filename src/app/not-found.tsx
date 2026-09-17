import Link from "next/link";

export default function RootNotFound() {
  return (
    <html lang="en" dir="ltr">
      <body style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif" }}>
        <div style={{ textAlign: "center" }}>
          <p style={{ fontSize: "1.25rem", fontWeight: 600 }}>Page not found</p>
          <Link href="/ar" style={{ color: "#b68a35" }}>
            Go to QANUNI
          </Link>
        </div>
      </body>
    </html>
  );
}
