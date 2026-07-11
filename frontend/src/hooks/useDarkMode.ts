"use client";

import { useState, useEffect, useCallback } from "react";
import { applyMode, Mode } from "@cloudscape-design/global-styles";

const STORAGE_KEY = "route53-dark-mode";

export function useDarkMode() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    const dark = stored === "true";
    setIsDark(dark);
    applyMode(dark ? Mode.Dark : Mode.Light);
  }, []);

  const toggle = useCallback(() => {
    const next = !isDark;
    setIsDark(next);
    localStorage.setItem(STORAGE_KEY, String(next));
    applyMode(next ? Mode.Dark : Mode.Light);
  }, [isDark]);

  return { isDark, toggle };
}
