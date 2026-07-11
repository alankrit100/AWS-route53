import type { Metadata } from "next";
import "@cloudscape-design/global-styles/index.css";
import "@/styles/aws-overrides.css";
import "@/styles/aws-dark-overrides.css";

export const metadata: Metadata = {
  title: "Route 53",
  description: "Route 53 Console Clone",
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
