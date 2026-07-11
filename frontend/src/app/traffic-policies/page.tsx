"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/api";
import { AppLayout } from "@/components/AppLayout";
import { NotificationProvider } from "@/components/NotificationFlashbar";
import { ComingSoon } from "@/components/ComingSoon";

export default function TrafficPoliciesPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; username: string } | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.replace("/login"); return; }
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
      <AppLayout onLogout={handleLogout} username={user.username}>
        <ComingSoon title="Traffic policies" />
      </AppLayout>
    </NotificationProvider>
  );
}
