"use client";

import { usePathname, useRouter } from "next/navigation";
import AppLayoutWrapper from "@cloudscape-design/components/app-layout";
import BreadcrumbGroup from "@cloudscape-design/components/breadcrumb-group";
import { useNotification } from "./NotificationFlashbar";
import { useDarkMode } from "@/hooks/useDarkMode";
import { AwsTopNavigation } from "./AwsTopNavigation";
import { AwsSideNavigation } from "./AwsSideNavigation";

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
      <AwsTopNavigation
        username={username}
        onLogout={onLogout}
        isDark={isDark}
        onToggleDark={toggle}
      />
      <AppLayoutWrapper
        navigation={<AwsSideNavigation activeHref={pathname} />}
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
