"use client";

import Modal from "@cloudscape-design/components/modal";
import Table from "@cloudscape-design/components/table";

interface Shortcut {
  key: string;
  description: string;
}

export function ShortcutsHelp({
  visible,
  onDismiss,
  shortcuts,
}: {
  visible: boolean;
  onDismiss: () => void;
  shortcuts: Shortcut[];
}) {
  const globalShortcuts: Shortcut[] = [
    { key: "/", description: "Focus search" },
    { key: "Esc", description: "Close modal / blur input" },
    { key: "?", description: "Toggle shortcuts help" },
  ];

  const all = [...globalShortcuts, ...shortcuts];

  return (
    <Modal visible={visible} onDismiss={onDismiss} header="Keyboard shortcuts">
      <Table
        columnDefinitions={[
          { id: "key", header: "Shortcut", cell: (item: Shortcut) => <kbd>{item.key}</kbd> },
          { id: "desc", header: "Action", cell: (item: Shortcut) => item.description },
        ]}
        items={all}
        sortingDisabled
      />
    </Modal>
  );
}
