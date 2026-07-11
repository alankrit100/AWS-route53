import type { Metadata } from "next";
import "@cloudscape-design/global-styles/index.css";
import "@/styles/aws-overrides.css";
import "@/styles/aws-dark-overrides.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Route 53 - AWS Console",
  description: "Amazon Route 53 Console Clone",
  icons: {
    icon: "/aws-logo.svg",
  },
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
