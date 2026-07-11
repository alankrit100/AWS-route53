"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { auth, clearTokens } from "@/lib/api";
import { AppLayout } from "@/components/AppLayout";
import { NotificationProvider } from "@/components/NotificationFlashbar";
import { ComingSoon } from "@/components/ComingSoon";

export default function ProfilesPage() {
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
      <AppLayout onLogout={handleLogout} username={user.username}>
        <ComingSoon title="Profiles" />
      </AppLayout>
    </NotificationProvider>
  );
}
