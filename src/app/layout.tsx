import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Invariant — Autonomous adversarial QA",
  description:
    "Point Invariant at a running web app. It explores the interface, infers the business rules that must always hold, then relentlessly tries to break each one — and writes the regression test the moment it succeeds.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
