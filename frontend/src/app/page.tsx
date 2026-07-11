"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Header from "@cloudscape-design/components/header";
import Container from "@cloudscape-design/components/container";
import Box from "@cloudscape-design/components/box";
import SpaceBetween from "@cloudscape-design/components/space-between";
import ColumnLayout from "@cloudscape-design/components/column-layout";
import Button from "@cloudscape-design/components/button";
import Link from "@cloudscape-design/components/link";
import { auth, zones } from "@/lib/api";
import { AppLayout } from "@/components/AppLayout";
import { NotificationProvider } from "@/components/NotificationFlashbar";
import type { HostedZone } from "@/lib/types";

function DashboardContent() {
  const router = useRouter();
  const [zoneCount, setZoneCount] = useState<number | null>(null);

  useEffect(() => {
    zones.list({ size: 1 }).then((res) => setZoneCount(res.total)).catch(() => setZoneCount(0));
  }, []);

  return (
    <SpaceBetween size="l" direction="vertical">
      <Header
        variant="h1"
        description="Manage your DNS records, health checks, and traffic policies."
      >
        Route 53 dashboard
      </Header>

      <ColumnLayout columns={2} variant="text-grid">
        <Container
          header={<Header variant="h2">Getting started</Header>}
        >
          <SpaceBetween size="m" direction="vertical">
            <Box variant="p">
              Get started with Route 53 by creating a hosted zone for your domain.
            </Box>
            <SpaceBetween size="s" direction="vertical">
              <Link href="/zones">
                Create a hosted zone
              </Link>
              <Link href="/health-checks">
                Create a health check
              </Link>
              <Link external href="https://docs.aws.amazon.com/route53/">
                Route 53 documentation
              </Link>
            </SpaceBetween>
          </SpaceBetween>
        </Container>

        <Container
          header={<Header variant="h2">Resources</Header>}
        >
          <SpaceBetween size="m" direction="vertical">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Box variant="h3">Hosted zones</Box>
              <Box variant="awsui-value-large">
                {zoneCount === null ? "—" : zoneCount}
              </Box>
            </div>
            <Button variant="primary" onClick={() => router.push("/zones")}>
              View hosted zones
            </Button>
          </SpaceBetween>
        </Container>
      </ColumnLayout>

      <Container
        header={<Header variant="h2">What's new</Header>}
      >
        <SpaceBetween size="s" direction="vertical">
          <Box variant="p">
            <strong>DNS management:</strong> Create and manage A, AAAA, CNAME, TXT, MX, NS, PTR, SRV, and CAA records.
          </Box>
          <Box variant="p">
            <strong>Import / Export:</strong> Import BIND zone files and export zones in JSON or BIND format.
          </Box>
          <Box variant="p">
            <strong>Keyboard shortcuts:</strong> Press <kbd>?</kbd> anywhere in the console to see available shortcuts.
          </Box>
        </SpaceBetween>
      </Container>
    </SpaceBetween>
  );
}

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; username: string } | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.replace("/login");
      return;
    }
    auth.me().then(setUser).catch(() => router.replace("/login"));
  }, [router]);

  const handleLogout = async () => {
    try { await auth.logout(); } catch {}
    localStorage.removeItem("token");
    router.push("/login");
  };

  if (!user) return null;

  return (
    <NotificationProvider>
      <AppLayout onLogout={handleLogout} username={user?.username}>
        <div style={{ padding: "24px" }}>
          <DashboardContent />
        </div>
      </AppLayout>
    </NotificationProvider>
  );
}
