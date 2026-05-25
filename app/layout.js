import "./globals.css";

export const metadata = {
  title: "Netflix Cookie Checker — Validate & Verify Cookies",
  description:
    "Bulk check Netflix cookies, verify login status, and filter working accounts. Paste or upload cookies to instantly validate them.",
  keywords: ["netflix", "cookie", "checker", "validator", "bulk check"],
  openGraph: {
    title: "Netflix Cookie Checker",
    description: "Validate Netflix cookies instantly — bulk check & filter working accounts.",
    type: "website",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <div className="bg-animated" />
        {children}
      </body>
    </html>
  );
}
