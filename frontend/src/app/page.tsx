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

  const count = zoneCount === null ? "\u2014" : zoneCount;

  return (
    <SpaceBetween size="m" direction="vertical">
      <Header
        variant="h1"
        description="Manage DNS records, health checks, and traffic policies for your domains."
      >
        Route 53 dashboard
      </Header>

      <Container header={<Header variant="h2">Resources</Header>}>
        <ColumnLayout columns={4} variant="text-grid">
          <div>
            <Box variant="awsui-key-label">Hosted zones</Box>
            <Box variant="awsui-value-large">{count}</Box>
            <Link onFollow={() => router.push("/zones")}>View</Link>
          </div>
          <div>
            <Box variant="awsui-key-label">Health checks</Box>
            <Box variant="awsui-value-large">0</Box>
            <Link onFollow={() => router.push("/health-checks")}>View</Link>
          </div>
          <div>
            <Box variant="awsui-key-label">Traffic policies</Box>
            <Box variant="awsui-value-large">0</Box>
            <Link onFollow={() => router.push("/traffic-policies")}>View</Link>
          </div>
          <div>
            <Box variant="awsui-key-label">Resolver rules</Box>
            <Box variant="awsui-value-large">0</Box>
            <Link onFollow={() => router.push("/resolver")}>View</Link>
          </div>
        </ColumnLayout>
      </Container>

      <ColumnLayout columns={2} variant="text-grid">
        <Container header={<Header variant="h2">Getting started</Header>}>
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
        </Container>

        <Container header={<Header variant="h2">DNS management</Header>}>
          <SpaceBetween size="xs" direction="vertical">
            <Link onFollow={() => router.push("/zones")}>
              Hosted zones
            </Link>
            <Link onFollow={() => router.push("/health-checks")}>
              Health checks
            </Link>
            <Link onFollow={() => router.push("/traffic-policies")}>
              Traffic policies
            </Link>
            <Link onFollow={() => router.push("/profiles")}>
              Profiles
            </Link>
            <Link onFollow={() => router.push("/resolver")}>
              Resolver
            </Link>
          </SpaceBetween>
          <div style={{ marginTop: "12px" }}>
            <Button variant="primary" onClick={() => router.push("/zones")}>
              Go to hosted zones
            </Button>
          </div>
        </Container>
      </ColumnLayout>

      <Container header={<Header variant="h2">Additional resources</Header>}>
        <ColumnLayout columns={3} variant="text-grid">
          <Link external href="https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/">
            Developer Guide
          </Link>
          <Link external href="https://docs.aws.amazon.com/Route53/latest/APIReference/">
            API Reference
          </Link>
          <Link external href="https://aws.amazon.com/route53/pricing/">
            Pricing
          </Link>
        </ColumnLayout>
      </Container>

      <Box variant="small" color="text-body-secondary" textAlign="center">
        Press <kbd style={{
          padding: "1px 5px", fontSize: "12px", fontFamily: "monospace", fontWeight: 600,
          backgroundColor: "#f2f3f3", border: "1px solid #aab7b8", borderRadius: "3px",
          boxShadow: "0 1px 0 #aab7b8", lineHeight: "18px",
        }}>?</kbd> to view keyboard shortcuts
      </Box>
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
