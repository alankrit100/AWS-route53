"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export interface ShortcutDef {
  keys: string;
  description: string;
  ctrl?: boolean;
}

interface ShortcutAction extends ShortcutDef {
  action: () => void;
}

export const GLOBAL_SHORTCUTS: ShortcutDef[] = [
  { keys: "/", description: "Focus search input" },
  { keys: "?", description: "Open keyboard shortcuts" },
  { keys: "Esc", description: "Close modal / blur input" },
  { keys: "g d", description: "Go to Dashboard" },
  { keys: "g z", description: "Go to Hosted zones" },
  { keys: "g h", description: "Go to Health checks" },
  { keys: "g t", description: "Go to Traffic policies" },
  { keys: "g r", description: "Go to Resolver" },
  { keys: "g p", description: "Go to Profiles" },
];

export const ZONES_SHORTCUTS: ShortcutDef[] = [
  { keys: "c", description: "Create hosted zone" },
  { keys: "n", description: "Create hosted zone" },
];

export const RECORDS_SHORTCUTS: ShortcutDef[] = [
  { keys: "c", description: "Create record" },
  { keys: "n", description: "Create record" },
];

const PAGE_ROUTES: Record<string, string> = {
  d: "/",
  z: "/zones",
  h: "/health-checks",
  t: "/traffic-policies",
  r: "/resolver",
  p: "/profiles",
};

let globalOverrides: ShortcutAction[] = [];

export function useKeyboardShortcuts(shortcuts: ShortcutAction[]) {
  const router = useRouter();
  const seqRef = useRef("");

  useEffect(() => {
    const merged = [...shortcuts];
    globalOverrides = merged;

    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      const inInput = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";

      if (e.key === "Escape") {
        if (inInput) {
          (e.target as HTMLElement).blur();
          return;
        }
        e.preventDefault();
        const close = document.querySelectorAll('[class*="awsui_dismiss"], [class*="awsui_modal"] button[aria-label*="Close"]');
        if (close.length > 0) {
          (close[close.length - 1] as HTMLElement).click();
        }
        return;
      }

      if (inInput) return;

      if (e.key === "?") {
        e.preventDefault();
        router.push("/shortcuts");
        return;
      }

      if (e.key === "/") {
        e.preventDefault();
        const inputs = document.querySelectorAll<HTMLInputElement>('input[type="text"], input:not([type])');
        for (let i = 0; i < inputs.length; i++) {
          const inp = inputs[i];
          if (inp.offsetParent !== null) {
            inp.focus();
            return;
          }
        }
        return;
      }

      if (e.key === "g") {
        seqRef.current = "g";
        setTimeout(() => { seqRef.current = ""; }, 1000);
        return;
      }

      if (seqRef.current === "g" && PAGE_ROUTES[e.key]) {
        e.preventDefault();
        seqRef.current = "";
        router.push(PAGE_ROUTES[e.key]);
        return;
      }

      if (e.ctrlKey || e.metaKey || e.altKey) return;

      for (const s of merged) {
        if (s.ctrl && e.ctrlKey && e.key.toLowerCase() === s.keys) {
          e.preventDefault();
          s.action();
          return;
        }
        if (!s.ctrl && e.key === s.keys) {
          e.preventDefault();
          s.action();
          return;
        }
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [shortcuts, router]);
}
