"use client";

import { usePathname, useRouter } from "next/navigation";
import TopNavigation from "@cloudscape-design/components/top-navigation";
import SideNavigation from "@cloudscape-design/components/side-navigation";
import AppLayoutWrapper from "@cloudscape-design/components/app-layout";
import BreadcrumbGroup from "@cloudscape-design/components/breadcrumb-group";
import { useNotification } from "./NotificationFlashbar";
import { useDarkMode } from "@/hooks/useDarkMode";

interface AppLayoutProps {
  children: React.ReactNode;
  onLogout: () => void;
  username?: string;
}

export function AppLayout({ children, onLogout, username }: AppLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { addNotification } = useNotification();
  const { isDark, toggle } = useDarkMode();

  const activeHref = pathname;

  const breadcrumbs = (() => {
    const parts = pathname.split("/").filter(Boolean);
    const items = [{ text: "Route 53", href: "/" }];
    let current = "";
    for (const part of parts) {
      current += `/${part}`;
      const label = part === "zones" ? "Hosted zones" :
                    part === "traffic-policies" ? "Traffic policies" :
                    part === "health-checks" ? "Health checks" :
                    part === "resolver" ? "Resolver" :
                    part === "profiles" ? "Profiles" : decodeURIComponent(part);
      items.push({ text: label, href: current });
    }
    return items;
  })();

  return (
    <>
      <TopNavigation
        identity={{
          href: "/",
          title: "Route 53",
        }}
        utilities={[
          { type: "button", text: username || "admin", variant: "primary-button" },
          {
            type: "button",
            text: isDark ? "\u2600" : "\u263E",
            ariaLabel: isDark ? "Switch to light mode" : "Switch to dark mode",
            onClick: toggle,
          },
          {
            type: "button",
            text: "Sign out",
            onClick: () => {
              onLogout();
              router.push("/login");
            },
          },
        ]}
        i18nStrings={{
          searchIconAriaLabel: "Search",
          searchDismissIconAriaLabel: "Close search",
          overflowMenuTriggerText: "More",
          overflowMenuTitleText: "All",
          overflowMenuBackIconAriaLabel: "Back",
        }}
      />
      <AppLayoutWrapper
        navigation={
          <SideNavigation
            activeHref={activeHref}
            header={{ text: "Route 53", href: "/" }}
            onFollow={(e) => {
              e.preventDefault();
              router.push(e.detail.href);
            }}
            items={[
              { type: "link", text: "Dashboard", href: "/" },
              { type: "link", text: "Hosted zones", href: "/zones" },
              { type: "link", text: "Health checks", href: "/health-checks" },
              { type: "link", text: "Traffic policies", href: "/traffic-policies" },
              { type: "link", text: "Resolver", href: "/resolver" },
              { type: "link", text: "Profiles", href: "/profiles" },
            ]}
          />
        }
        toolsHide={true}
        breadcrumbs={
          <BreadcrumbGroup
            items={breadcrumbs}
            onFollow={(e) => {
              e.preventDefault();
              router.push(e.detail.href);
            }}
          />
        }
        content={children}
      />
    </>
  );
}
