"use client";

import { useEffect, useState, useCallback } from "react";

interface ShortcutAction {
  key: string;
  ctrl?: boolean;
  description: string;
  action: () => void;
}

export function useKeyboardShortcuts(shortcuts: ShortcutAction[]) {
  const [showHelp, setShowHelp] = useState(false);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        if (e.key === "Escape") {
          (e.target as HTMLElement).blur();
        }
        return;
      }

      if (e.key === "Escape") {
        e.preventDefault();
        const closeButtons = document.querySelectorAll('[class*="awsui_dismiss"]');
        if (closeButtons.length > 0) {
          (closeButtons[closeButtons.length - 1] as HTMLElement).click();
        }
        return;
      }

      if (e.key === "?") {
        e.preventDefault();
        setShowHelp((prev) => !prev);
        return;
      }

      for (const s of shortcuts) {
        if (s.ctrl && e.ctrlKey && e.key.toLowerCase() === s.key) {
          e.preventDefault();
          s.action();
          return;
        }
        if (!s.ctrl && e.key === s.key && !e.ctrlKey && !e.metaKey) {
          if (e.key === "/") {
            const searchInputs = document.querySelectorAll<HTMLInputElement>(
              'input[type="text"], input:not([type])'
            );
            if (searchInputs.length > 0) {
              e.preventDefault();
              searchInputs[0].focus();
              return;
            }
          }
          e.preventDefault();
          s.action();
          return;
        }
      }
    },
    [shortcuts]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return { showHelp, setShowHelp };
}
