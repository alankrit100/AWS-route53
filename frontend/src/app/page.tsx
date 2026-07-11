"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { auth } from "@/lib/api";
import { AppLayout } from "@/components/AppLayout";
import { NotificationProvider } from "@/components/NotificationFlashbar";

function DashboardContent({ username }: { username: string }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "60vh",
        color: "#545b64",
      }}
    >
      <h1 style={{ fontSize: "24px", fontWeight: 700, marginBottom: "8px" }}>
        Dashboard
      </h1>
      <p style={{ fontSize: "14px" }}>
        Welcome to Route 53 Console. Select &quot;Hosted zones&quot; from the navigation.
      </p>
    </div>
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
        <DashboardContent username={user.username} />
      </AppLayout>
    </NotificationProvider>
  );
}
