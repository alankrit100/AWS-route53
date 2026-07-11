"use client";

import TopNavigation from "@cloudscape-design/components/top-navigation";

interface AwsTopNavigationProps {
  username?: string;
  onLogout: () => void;
  isDark: boolean;
  onToggleDark: () => void;
}

export function AwsTopNavigation({ username, onLogout, isDark, onToggleDark }: AwsTopNavigationProps) {
  return (
    <TopNavigation
      identity={{
        href: "/",
        title: "Route 53",
        logo: {
          src: "/aws-logo.svg",
          alt: "AWS",
        },
      }}
      utilities={[
        {
          type: "button",
          iconName: "search",
          title: "Search",
          ariaLabel: "Search (/)",
          onClick: () => {
            const searchInputs = document.querySelectorAll<HTMLInputElement>(
              'input[type="text"], input:not([type])'
            );
            if (searchInputs.length > 0) searchInputs[0].focus();
          },
        },
        {
          type: "button",
          iconName: "light-dark",
          ariaLabel: isDark ? "Switch to light mode" : "Switch to dark mode",
          title: isDark ? "Light mode" : "Dark mode",
          onClick: onToggleDark,
        },
        {
          type: "menu-dropdown",
          text: username || "admin",
          description: "Account",
          iconName: "user-profile",
          ariaLabel: "Account",
          title: "Account",
          items: [
            
            
            { id: "signout", text: "Sign out" },
          ],
          onItemClick: ({ detail }) => {
            if (detail.id === "signout") onLogout();
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
  );
}
