import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Transaction Risk Checker — Pharos Skill",
  description: "Pre-execution risk assessment for blockchain transactions.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0 }}>{children}</body>
    </html>
  );
}
