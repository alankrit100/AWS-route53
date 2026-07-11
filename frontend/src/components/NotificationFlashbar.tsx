"use client";

import { useState, useEffect, useCallback, createContext, useContext, useRef } from "react";
import Alert from "@cloudscape-design/components/alert";
import SpaceBetween from "@cloudscape-design/components/space-between";

export type NotificationType = "success" | "error" | "info" | "warning";

interface Notification {
  id: string;
  type: NotificationType;
  content: string;
  exiting?: boolean;
}

interface NotificationContextValue {
  addNotification: (type: NotificationType, content: string) => void;
}

const NotificationContext = createContext<NotificationContextValue>({
  addNotification: () => {},
});

export function useNotification() {
  return useContext(NotificationContext);
}

const AUTO_DISMISS_MS = 5000;
const EXIT_ANIMATION_MS = 350;

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    return () => {
      timers.current.forEach((t) => clearTimeout(t));
    };
  }, []);

  const scheduleAutoDismiss = useCallback((id: string) => {
    const timer = setTimeout(() => {
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, exiting: true } : n)));
      const exitTimer = setTimeout(() => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
        timers.current.delete(id);
      }, EXIT_ANIMATION_MS);
      timers.current.set(id, exitTimer);
    }, AUTO_DISMISS_MS);
    timers.current.set(id, timer);
  }, []);

  const dismissNotification = useCallback((id: string) => {
    const t = timers.current.get(id);
    if (t) clearTimeout(t);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, exiting: true } : n)));
    const exitTimer = setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      timers.current.delete(id);
    }, EXIT_ANIMATION_MS);
    timers.current.set(id, exitTimer);
  }, []);

  const addNotification = useCallback((type: NotificationType, content: string) => {
    const id = Date.now().toString();
    setNotifications((prev) => [...prev, { id, type, content }]);
    scheduleAutoDismiss(id);
  }, [scheduleAutoDismiss]);

  return (
    <NotificationContext.Provider value={{ addNotification }}>
      {notifications.length > 0 && (
        <div
          style={{
            position: "fixed",
            top: "48px",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 10000,
            maxWidth: "600px",
            width: "100%",
            padding: "8px",
          }}
        >
          <SpaceBetween size="s" direction="vertical">
            {notifications.map((n) => (
              <div
                key={n.id}
                style={{
                  animation: n.exiting ? "flashbarExit 0.35s ease forwards" : "flashbarEnter 0.3s ease",
                }}
              >
                <Alert
                  type={n.type}
                  dismissible
                  onDismiss={() => dismissNotification(n.id)}
                >
                  {n.content}
                </Alert>
              </div>
            ))}
          </SpaceBetween>
          <style>{`
            @keyframes flashbarEnter {
              from { opacity: 0; transform: translateY(-12px); max-height: 0; }
              to { opacity: 1; transform: translateY(0); max-height: 80px; }
            }
            @keyframes flashbarExit {
              from { opacity: 1; transform: translateY(0); max-height: 80px; }
              to { opacity: 0; transform: translateY(-12px); max-height: 0; }
            }
          `}</style>
        </div>
      )}
      {children}
    </NotificationContext.Provider>
  );
}
