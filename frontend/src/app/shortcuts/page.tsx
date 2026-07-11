"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@cloudscape-design/components/header";
import Container from "@cloudscape-design/components/container";
import Table from "@cloudscape-design/components/table";
import Box from "@cloudscape-design/components/box";
import SpaceBetween from "@cloudscape-design/components/space-between";
import ColumnLayout from "@cloudscape-design/components/column-layout";
import { auth, clearTokens } from "@/lib/api";
import { AppLayout } from "@/components/AppLayout";
import { NotificationProvider } from "@/components/NotificationFlashbar";
import { GLOBAL_SHORTCUTS, ZONES_SHORTCUTS, RECORDS_SHORTCUTS, ShortcutDef } from "@/hooks/useKeyboardShortcuts";

function Kbd({ children }: { children: string }) {
  return (
    <kbd
      style={{
        display: "inline-block",
        padding: "2px 8px",
        fontSize: "12px",
        fontFamily: "monospace",
        fontWeight: 600,
        color: "#0f141a",
        backgroundColor: "#f2f3f3",
        border: "1px solid #aab7b8",
        borderRadius: "3px",
        boxShadow: "0 1px 0 #aab7b8",
        lineHeight: "20px",
      }}
    >
      {children}
    </kbd>
  );
}

function ShortcutsTable({ title, items }: { title: string; items: ShortcutDef[] }) {
  return (
    <Container header={<Header variant="h2">{title}</Header>}>
      <Table
        columnDefinitions={[
          {
            id: "keys",
            header: "Shortcut",
            cell: (item: ShortcutDef) => {
              const keys = item.keys.split(" ");
              return (
                <span style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                  {keys.map((k, i) => (
                    <span key={i} style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                      {i > 0 && <span style={{ color: "#95a5a6" }}>+</span>}
                      <Kbd>{k}</Kbd>
                    </span>
                  ))}
                </span>
              );
            },
          },
          {
            id: "desc",
            header: "Description",
            cell: (item: ShortcutDef) => item.description,
          },
        ]}
        items={items}
        sortingDisabled
      />
    </Container>
  );
}

function ShortcutsContent() {
  return (
    <SpaceBetween size="l" direction="vertical">
      <Header
        variant="h1"
        description="Press ? from any page to return to this page. Shortcuts are context-sensitive."
      >
        Keyboard shortcuts
      </Header>

      <ColumnLayout columns={2} variant="text-grid">
        <ShortcutsTable title="Global" items={GLOBAL_SHORTCUTS} />
        <ShortcutsTable title="Hosted zones" items={ZONES_SHORTCUTS} />
      </ColumnLayout>

      <ShortcutsTable title="DNS records" items={RECORDS_SHORTCUTS} />

      <Box variant="small" color="text-body-secondary">
        Hover over the icon in the top navigation bar to see keyboard shortcuts for the current page.
      </Box>
    </SpaceBetween>
  );
}

export default function ShortcutsPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; username: string } | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) { router.replace("/login"); return; }
    auth.me().then(setUser).catch(() => router.replace("/login"));
  }, [router]);

  const handleLogout = async () => {
    try { await auth.logout(); } catch {}
    clearTokens();
    router.push("/login");
  };

  if (!user) return null;

  return (
    <NotificationProvider>
      <AppLayout onLogout={handleLogout} username={user?.username}>
        <div style={{ padding: "24px" }}>
          <ShortcutsContent />
        </div>
      </AppLayout>
    </NotificationProvider>
  );
}
