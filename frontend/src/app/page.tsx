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
import { auth, zones, clearTokens } from "@/lib/api";
import { AppLayout } from "@/components/AppLayout";
import { NotificationProvider } from "@/components/NotificationFlashbar";

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
        description="Manage domain name system (DNS) settings, traffic policies, and health checks for your domains."
      >
        Route 53 dashboard
      </Header>

      <ColumnLayout columns={4} variant="text-grid">
        <Container>
          <Box variant="awsui-key-label">Hosted zones</Box>
          <Box variant="awsui-value-large" padding={{ top: "xxs", bottom: "xs" }}>
            {zoneCount === null ? "—" : zoneCount}
          </Box>
          <Link onFollow={() => router.push("/zones")}>View hosted zones</Link>
        </Container>
        <Container>
          <Box variant="awsui-key-label">Health checks</Box>
          <Box variant="awsui-value-large" padding={{ top: "xxs", bottom: "xs" }}>0</Box>
          <Link onFollow={() => router.push("/health-checks")}>View health checks</Link>
        </Container>
        <Container>
          <Box variant="awsui-key-label">Traffic policies</Box>
          <Box variant="awsui-value-large" padding={{ top: "xxs", bottom: "xs" }}>0</Box>
          <Link onFollow={() => router.push("/traffic-policies")}>View traffic policies</Link>
        </Container>
        <Container>
          <Box variant="awsui-key-label">Resolver rules</Box>
          <Box variant="awsui-value-large" padding={{ top: "xxs", bottom: "xs" }}>0</Box>
          <Link onFollow={() => router.push("/resolver")}>View resolver</Link>
        </Container>
      </ColumnLayout>

      <ColumnLayout columns={2} variant="text-grid">
        <Container header={<Header variant="h2">Getting started</Header>}>
          <SpaceBetween size="m" direction="vertical">
            <Box variant="p">
              Follow these steps to get started with Amazon Route 53.
            </Box>
            <SpaceBetween size="xs" direction="vertical">
              <Link onFollow={() => router.push("/zones")}>
                1. Create a hosted zone for your domain
              </Link>
              <Link onFollow={() => router.push("/zones")}>
                2. Add DNS records within your hosted zone
              </Link>
              <Link onFollow={() => router.push("/health-checks")}>
                3. Set up health checks for your endpoints
              </Link>
              <Link onFollow={() => router.push("/traffic-policies")}>
                4. Create traffic policies to route users
              </Link>
            </SpaceBetween>
          </SpaceBetween>
        </Container>

        <Container header={<Header variant="h2">DNS management</Header>}>
          <SpaceBetween size="m" direction="vertical">
            <SpaceBetween size="xs" direction="vertical">
              <Link onFollow={() => router.push("/zones")}>
                Hosted zones — manage records for your domains
              </Link>
              <Link onFollow={() => router.push("/health-checks")}>
                Health checks — monitor endpoint health
              </Link>
              <Link onFollow={() => router.push("/traffic-policies")}>
                Traffic policies — configure routing policies
              </Link>
              <Link onFollow={() => router.push("/profiles")}>
                Profiles — manage Route 53 profiles
              </Link>
              <Link onFollow={() => router.push("/resolver")}>
                Resolver — manage DNS firewall and query logging
              </Link>
            </SpaceBetween>
            <Button variant="primary" onClick={() => router.push("/zones")}>
              Go to hosted zones
            </Button>
          </SpaceBetween>
        </Container>
      </ColumnLayout>

      <Container header={<Header variant="h2">Additional resources</Header>}>
        <SpaceBetween size="xs" direction="vertical">
          <Link external href="https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/">
            Route 53 Developer Guide
          </Link>
          <Link external href="https://docs.aws.amazon.com/Route53/latest/APIReference/">
            Route 53 API Reference
          </Link>
          <Link external href="https://aws.amazon.com/route53/pricing/">
            Route 53 pricing
          </Link>
        </SpaceBetween>
      </Container>
    </SpaceBetween>
  );
}

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; username: string } | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      router.replace("/login");
      return;
    }
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
          <DashboardContent />
        </div>
      </AppLayout>
    </NotificationProvider>
  );
}
