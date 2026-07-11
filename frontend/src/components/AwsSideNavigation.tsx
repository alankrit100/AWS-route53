"use client";

import SideNavigation from "@cloudscape-design/components/side-navigation";
import { useRouter } from "next/navigation";

interface AwsSideNavigationProps {
  activeHref: string;
}

export function AwsSideNavigation({ activeHref }: AwsSideNavigationProps) {
  const router = useRouter();

  return (
    <SideNavigation
      activeHref={activeHref}
      header={{ text: "Route 53", href: "/" }}
      onFollow={(e) => {
        e.preventDefault();
        router.push(e.detail.href);
      }}
      items={[
        { type: "section-group", title: "DNS management", items: [
          { type: "link", text: "Dashboard", href: "/" },
          { type: "link", text: "Hosted zones", href: "/zones" },
        ]},
        { type: "section-group", title: "Traffic management", items: [
          { type: "link", text: "Health checks", href: "/health-checks" },
          { type: "link", text: "Traffic policies", href: "/traffic-policies" },
        ]},
        { type: "section-group", title: "Configuration", items: [
          { type: "link", text: "Resolver", href: "/resolver" },
          { type: "link", text: "Profiles", href: "/profiles" },
        ]},
        { type: "divider" },
        { type: "link", text: "Route 53 documentation", href: "https://docs.aws.amazon.com/route53", external: true },
      ]}
    />
  );
}
