import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "One operation, four open energy publications",
  description:
    "For one city and one year, the annual electricity consumption of the territory in GWh, from an open municipal publication: what a model proposed, what the code executed, and what it refused to execute.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
