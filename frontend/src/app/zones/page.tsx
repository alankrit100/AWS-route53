"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@cloudscape-design/components/header";
import Table from "@cloudscape-design/components/table";
import Button from "@cloudscape-design/components/button";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Input from "@cloudscape-design/components/input";
import Pagination from "@cloudscape-design/components/pagination";
import Modal from "@cloudscape-design/components/modal";
import Box from "@cloudscape-design/components/box";
import FormField from "@cloudscape-design/components/form-field";
import Form from "@cloudscape-design/components/form";
import Alert from "@cloudscape-design/components/alert";
import TextContent from "@cloudscape-design/components/text-content";
import { auth, zones } from "@/lib/api";
import { AppLayout } from "@/components/AppLayout";
import { NotificationProvider, useNotification } from "@/components/NotificationFlashbar";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { ShortcutsHelp } from "@/components/ShortcutsHelp";
import type { HostedZone } from "@/lib/types";

function ZonesContent() {
  const router = useRouter();
  const { addNotification } = useNotification();
  const [zoneList, setZoneList] = useState<HostedZone[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedZone, setSelectedZone] = useState<HostedZone | null>(null);
  const [newName, setNewName] = useState("");
  const [newComment, setNewComment] = useState("");
  const [callerRef, setCallerRef] = useState("");
  const [error, setError] = useState("");
  const [selectedItems, setSelectedItems] = useState<HostedZone[]>([]);
  const { showHelp, setShowHelp } = useKeyboardShortcuts([
    { key: "c", description: "Create hosted zone", action: () => {
      setNewName(""); setNewComment(""); setCallerRef(""); setError(""); setShowCreateModal(true);
    }},
    { key: "n", description: "Create hosted zone", action: () => {
      setNewName(""); setNewComment(""); setCallerRef(""); setError(""); setShowCreateModal(true);
    }},
  ]);

  const fetchZones = async (p?: number, s?: string) => {
    setLoading(true);
    try {
      const res = await zones.list({ page: p ?? page, search: s ?? search, size: 20 });
      setZoneList(res.hosted_zones);
      setTotal(res.total);
      setPage(res.page);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load zones");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchZones(); }, []);

  const handleCreate = async () => {
    try {
      await zones.create({
        name: newName,
        caller_reference: callerRef || Date.now().toString(),
        hosted_zone_config: { comment: newComment, private_zone: false },
      });
      setShowCreateModal(false);
      setNewName("");
      setNewComment("");
      setCallerRef("");
      addNotification("success", "Hosted zone created successfully");
      fetchZones(1, search);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to create zone");
    }
  };

  const handleEdit = async () => {
    if (!selectedZone) return;
    try {
      await zones.update(selectedZone.id, { comment: newComment });
      setShowEditModal(false);
      addNotification("success", "Hosted zone updated successfully");
      fetchZones(page, search);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to update zone");
    }
  };

  const handleDelete = async () => {
    if (!selectedZone) return;
    try {
      await zones.delete(selectedZone.id);
      setShowDeleteModal(false);
      addNotification("success", "Hosted zone deleted successfully");
      fetchZones(1, search);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to delete zone");
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <Header
        variant="h1"
        actions={
          <Button variant="primary" onClick={() => {
            setNewName("");
            setNewComment("");
            setCallerRef("");
            setError("");
            setShowCreateModal(true);
          }}>
            Create hosted zone
          </Button>
        }
      >
        Hosted zones
      </Header>

      <SpaceBetween size="m" direction="vertical">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ width: "300px" }}>
            <Input
              placeholder="Search by domain name"
              value={search}
              onChange={(e) => {
                setSearch(e.detail.value);
                fetchZones(1, e.detail.value);
              }}
            />
          </div>
        </div>

        <Table
          loading={loading}
          selectedItems={selectedItems}
          onSelectionChange={(e) => setSelectedItems(e.detail.selectedItems)}
          sortingDisabled
          columnDefinitions={[
            {
              id: "name",
              header: "Domain name",
              cell: (item) => (
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    router.push(`/zones/${item.id}`);
                  }}
                  style={{ textDecoration: "none" }}
                >
                  {item.name}
                </a>
              ),
            },
            {
              id: "type",
              header: "Type",
              cell: (item) => (item.config.private_zone ? "Private" : "Public"),
            },
            {
              id: "record_count",
              header: "Record count",
              cell: (item) => String(item.resource_record_set_count),
            },
            {
              id: "comment",
              header: "Comment",
              cell: (item) => item.config.comment || "-",
            },
            {
              id: "actions",
              header: "Actions",
              cell: (item) => (
                <SpaceBetween size="xs" direction="horizontal">
                  <Button
                    variant="inline-link"
                    onClick={() => {
                      setSelectedZone(item);
                      setNewComment(item.config.comment || "");
                      setError("");
                      setShowEditModal(true);
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="inline-link"
                    onClick={() => {
                      setSelectedZone(item);
                      setError("");
                      setShowDeleteModal(true);
                    }}
                  >
                    Delete
                  </Button>
                </SpaceBetween>
              ),
            },
          ]}
          items={zoneList}
          loadingText="Loading hosted zones"
          empty={
            <Box textAlign="center" color="inherit">
              <b>No hosted zones</b>
              <Box padding={{ bottom: "s" }} variant="p" color="inherit">
                {search ? "No zones match your search." : "Create your first hosted zone to get started."}
              </Box>
            </Box>
          }
        />

        <Pagination
          currentPageIndex={page}
          pagesCount={Math.max(1, Math.ceil(total / 20))}
          onChange={(e) => {
            setPage(e.detail.currentPageIndex);
            fetchZones(e.detail.currentPageIndex, search);
          }}
        />
      </SpaceBetween>

      <Modal
        visible={showCreateModal}
        onDismiss={() => setShowCreateModal(false)}
        header="Create hosted zone"
        closeAriaLabel="Close modal"
      >
        <Form>
          {error && <Alert type="error">{error}</Alert>}
          <FormField label="Domain name" description="Enter a fully qualified domain name">
            <Input value={newName} onChange={(e) => setNewName(e.detail.value)} placeholder="example.com" />
          </FormField>
          <FormField label="Comment" description="Optional">
            <Input value={newComment} onChange={(e) => setNewComment(e.detail.value)} />
          </FormField>
          <Button variant="primary" onClick={handleCreate}>Create</Button>
        </Form>
      </Modal>

      <Modal
        visible={showEditModal}
        onDismiss={() => setShowEditModal(false)}
        header="Edit hosted zone comment"
        closeAriaLabel="Close modal"
      >
        <Form>
          {error && <Alert type="error">{error}</Alert>}
          <FormField label="Comment">
            <Input value={newComment} onChange={(e) => setNewComment(e.detail.value)} />
          </FormField>
          <Button variant="primary" onClick={handleEdit}>Save</Button>
        </Form>
      </Modal>

      <Modal
        visible={showDeleteModal}
        onDismiss={() => setShowDeleteModal(false)}
        header="Delete hosted zone"
        closeAriaLabel="Close modal"
      >
        <Form>
          {error && <Alert type="error">{error}</Alert>}
          <TextContent>
            <p>
              Are you sure you want to delete{" "}
              <strong>{selectedZone?.name}</strong>?
            </p>
          </TextContent>
          <Button variant="primary" onClick={handleDelete}>Delete</Button>
        </Form>
      </Modal>

      <ShortcutsHelp
        visible={showHelp}
        onDismiss={() => setShowHelp(false)}
        shortcuts={[
          { key: "c", description: "Create hosted zone" },
          { key: "n", description: "Create hosted zone" },
        ]}
      />
    </div>
  );
}

export default function ZonesPage() {
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
        <ZonesContent />
      </AppLayout>
    </NotificationProvider>
  );
}
