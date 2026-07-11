"use client";

import { useState, useEffect, createContext, useContext, useCallback } from "react";
import Flashbar from "@cloudscape-design/components/flashbar";

export type NotificationType = "success" | "error" | "info" | "warning";

interface Notification {
  id: string;
  type: NotificationType;
  content: string;
  dismissible?: boolean;
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

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = useCallback((type: NotificationType, content: string) => {
    const id = Date.now().toString();
    setNotifications((prev) => [...prev, { id, type, content, dismissible: true }]);
  }, []);

  const dismissNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  return (
    <NotificationContext.Provider value={{ addNotification }}>
      {notifications.length > 0 && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 10000 }}>
          <Flashbar
            items={notifications.map((n) => ({
              type: n.type,
              content: n.content,
              dismissible: n.dismissible,
              onDismiss: () => dismissNotification(n.id),
              id: n.id,
            }))}
          />
        </div>
      )}
      {children}
    </NotificationContext.Provider>
  );
}
