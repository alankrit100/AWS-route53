"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
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
import Select from "@cloudscape-design/components/select";
import Tabs from "@cloudscape-design/components/tabs";
import Alert from "@cloudscape-design/components/alert";
import TextContent from "@cloudscape-design/components/text-content";
import Container from "@cloudscape-design/components/container";
import { auth, zones, records, tags } from "@/lib/api";
import { AppLayout } from "@/components/AppLayout";
import { NotificationProvider, useNotification } from "@/components/NotificationFlashbar";
import type { HostedZone, RecordResponse, TagItem } from "@/lib/types";
import { RECORD_TYPES } from "@/lib/types";

function ZoneDetailContent() {
  const params = useParams();
  const zoneId = params.id as string;
  const router = useRouter();
  const { addNotification } = useNotification();

  const [zone, setZone] = useState<HostedZone | null>(null);
  const [recordList, setRecordList] = useState<RecordResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [tagList, setTagList] = useState<TagItem[]>([]);
  const [activeTab, setActiveTab] = useState("records");

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editRecord, setEditRecord] = useState<RecordResponse | null>(null);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState({ label: "A", value: "A" });
  const [newTTL, setNewTTL] = useState("300");
  const [newValue, setNewValue] = useState("");
  const [error, setError] = useState("");

  const [showTagModal, setShowTagModal] = useState(false);
  const [newTagKey, setNewTagKey] = useState("");
  const [newTagValue, setNewTagValue] = useState("");

  const fetchZone = async () => {
    try {
      const z = await zones.get(zoneId);
      setZone(z);
    } catch { router.push("/zones"); }
  };

  const fetchRecords = async (p?: number, s?: string, t?: string) => {
    setLoading(true);
    try {
      const res = await records.list(zoneId, {
        page: p ?? page,
        search: s ?? search,
        type: t ?? typeFilter,
        size: 20,
      });
      setRecordList(res.records);
      setTotal(res.total);
      setPage(res.page);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load records");
    } finally {
      setLoading(false);
    }
  };

  const fetchTags = async () => {
    try {
      const res = await tags.list(zoneId);
      setTagList(res.tags);
    } catch {}
  };

  useEffect(() => {
    fetchZone();
    fetchRecords();
    fetchTags();
  }, [zoneId]);

  const handleCreateRecord = async () => {
    const values = newValue.split("\n").filter((v) => v.trim());
    if (values.length === 0) { setError("At least one value is required"); return; }
    try {
      await records.change(zoneId, {
        change_batch: {
          changes: [{
            action: "CREATE",
            resource_record_set: {
              name: newName,
              type: newType.value,
              ttl: parseInt(newTTL) || 300,
              resource_records: values.map((v) => ({ value: v.trim() })),
            },
          }],
        },
      });
      setShowCreateModal(false);
      setNewName("");
      setNewValue("");
      setNewTTL("300");
      addNotification("success", "Record created successfully");
      fetchRecords(1, search, typeFilter);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to create record");
    }
  };

  const handleEditRecord = async () => {
    if (!editRecord) return;
    try {
      await records.change(zoneId, {
        change_batch: {
          changes: [{
            action: "UPSERT",
            resource_record_set: {
              name: editRecord.name,
              type: editRecord.type,
              ttl: parseInt(newTTL) || 300,
              resource_records: (editRecord.value ? JSON.parse(editRecord.value) : []).map((v: string) => ({ value: v })),
            },
          }],
        },
      });
      setShowEditModal(false);
      addNotification("success", "Record updated successfully");
      fetchRecords(page, search, typeFilter);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to update record");
    }
  };

  const handleDeleteRecord = async () => {
    if (!editRecord) return;
    try {
      await records.delete(zoneId, editRecord.id);
      setShowDeleteModal(false);
      addNotification("success", "Record deleted successfully");
      fetchRecords(1, search, typeFilter);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to delete record");
    }
  };

  const handleAddTag = async () => {
    if (!newTagKey.trim()) return;
    try {
      await tags.update(zoneId, {
        add_tags: [{ key: newTagKey, value: newTagValue }],
      });
      setNewTagKey("");
      setNewTagValue("");
      fetchTags();
      addNotification("success", "Tag added");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to add tag");
    }
  };

  const handleRemoveTag = async (key: string) => {
    try {
      await tags.update(zoneId, { remove_tag_keys: [key] });
      fetchTags();
      addNotification("info", "Tag removed");
    } catch {}
  };

  const recordTypeHelp: Record<string, string> = {
    A: "IPv4 address, e.g. 192.168.1.1",
    AAAA: "IPv6 address, e.g. 2001:db8::1",
    CNAME: "Canonical name, e.g. example.com.",
    TXT: "Text string, e.g. \"v=spf1 include:_spf.google.com ~all\"",
    MX: "Priority and mail server, e.g. 10 mail.example.com.",
    NS: "Name server, e.g. ns1.example.com.",
    PTR: "Pointer record, e.g. host.example.com.",
    SRV: "Priority Weight Port Target, e.g. 0 10 80 svc.example.com.",
    CAA: "Flags Tag Value, e.g. 0 issue \"letsencrypt.org\"",
  };

  return (
    <div style={{ padding: "20px" }}>
      <Header
        variant="h1"
        actions={
          <SpaceBetween direction="horizontal" size="xs">
            <Button onClick={() => router.push("/zones")}>Back to zones</Button>
            <Button variant="primary" onClick={() => {
              setNewName("");
              setNewValue("");
              setNewTTL("300");
              setNewType({ label: "A", value: "A" });
              setError("");
              setShowCreateModal(true);
            }}>
              Create record
            </Button>
          </SpaceBetween>
        }
      >
        {zone?.name || "Loading..."}
      </Header>

      {zone && (
        <Container header={<Header variant="h2">Zone details</Header>}>
          <TextContent>
            <p><strong>ID:</strong> {zone.id}</p>
            <p><strong>Type:</strong> {zone.config.private_zone ? "Private" : "Public"}</p>
            <p><strong>Record count:</strong> {zone.resource_record_set_count}</p>
            <p><strong>Comment:</strong> {zone.config.comment || "-"}</p>
          </TextContent>
        </Container>
      )}

      <div style={{ marginTop: "20px" }}>
        <Tabs
          activeTabId={activeTab}
          onChange={(e) => setActiveTab(e.detail.activeTabId)}
          tabs={[
            {
              id: "records",
              label: "Records",
              content: (
                <SpaceBetween size="m" direction="vertical">
                  <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                    <div style={{ width: "250px" }}>
                      <Input
                        placeholder="Search by name"
                        value={search}
                        onChange={(e) => {
                          setSearch(e.detail.value);
                          fetchRecords(1, e.detail.value, typeFilter);
                        }}
                      />
                    </div>
                    <div style={{ width: "150px" }}>
                      <Select
                        placeholder="Filter by type"
                        selectedOption={typeFilter ? { label: typeFilter, value: typeFilter } : null}
                        onChange={(e) => {
                          const val = e.detail.selectedOption.value || "";
                          setTypeFilter(val);
                          fetchRecords(1, search, val);
                        }}
                        options={[
                          { label: "All types", value: "" },
                          ...RECORD_TYPES.map((t) => ({ label: t, value: t })),
                        ]}
                      />
                    </div>
                  </div>

                  <Table
                    loading={loading}
                    sortingDisabled
                    columnDefinitions={[
                      {
                        id: "name",
                        header: "Name",
                        cell: (item) => item.name,
                      },
                      {
                        id: "type",
                        header: "Type",
                        cell: (item) => item.type,
                      },
                      {
                        id: "value",
                        header: "Value",
                        cell: (item) => {
                          try {
                            const vals = JSON.parse(item.value);
                            return Array.isArray(vals) ? vals.join(", ") : item.value;
                          } catch {
                            return item.value;
                          }
                        },
                      },
                      {
                        id: "ttl",
                        header: "TTL (seconds)",
                        cell: (item) => String(item.ttl),
                      },
                      {
                        id: "actions",
                        header: "Actions",
                        cell: (item) => (
                          <SpaceBetween size="xs" direction="horizontal">
                            <Button variant="inline-link" onClick={() => {
                              setEditRecord(item);
                              setNewTTL(String(item.ttl));
                              setError("");
                              setShowEditModal(true);
                            }}>
                              Edit
                            </Button>
                            <Button variant="inline-link" onClick={() => {
                              setEditRecord(item);
                              setError("");
                              setShowDeleteModal(true);
                            }}>
                              Delete
                            </Button>
                          </SpaceBetween>
                        ),
                      },
                    ]}
                    items={recordList}
                    loadingText="Loading records"
                    empty={
                      <Box textAlign="center" color="inherit">
                        <b>No records</b>
                        <Box padding={{ bottom: "s" }} variant="p" color="inherit">
                          {search || typeFilter ? "No records match your filters." : "Create your first record to get started."}
                        </Box>
                      </Box>
                    }
                  />

                  <Pagination
                    currentPageIndex={page}
                    pagesCount={Math.max(1, Math.ceil(total / 20))}
                    onChange={(e) => {
                      setPage(e.detail.currentPageIndex);
                      fetchRecords(e.detail.currentPageIndex, search, typeFilter);
                    }}
                  />
                </SpaceBetween>
              ),
            },
            {
              id: "tags",
              label: "Tags",
              content: (
                <SpaceBetween size="m" direction="vertical">
                  <div style={{ display: "flex", gap: "8px", alignItems: "flex-end" }}>
                    <FormField label="Key">
                      <Input value={newTagKey} onChange={(e) => setNewTagKey(e.detail.value)} />
                    </FormField>
                    <FormField label="Value">
                      <Input value={newTagValue} onChange={(e) => setNewTagValue(e.detail.value)} />
                    </FormField>
                    <Button onClick={handleAddTag}>Add tag</Button>
                  </div>

                  <Table
                    columnDefinitions={[
                      { id: "key", header: "Key", cell: (item: TagItem) => item.key },
                      { id: "value", header: "Value", cell: (item: TagItem) => item.value },
                      {
                        id: "actions",
                        header: "Actions",
                        cell: (item: TagItem) => (
                          <Button variant="inline-link" onClick={() => handleRemoveTag(item.key)}>
                            Remove
                          </Button>
                        ),
                      },
                    ]}
                    items={tagList}
                    empty={
                      <Box textAlign="center" color="inherit">
                        <b>No tags</b>
                        <Box padding={{ bottom: "s" }} variant="p" color="inherit">
                          Add tags to organize your hosted zones.
                        </Box>
                      </Box>
                    }
                  />
                </SpaceBetween>
              ),
            },
          ]}
        />
      </div>

      <Modal
        visible={showCreateModal}
        onDismiss={() => setShowCreateModal(false)}
        header="Create record"
        closeAriaLabel="Close modal"
      >
        <Form>
          {error && <Alert type="error">{error}</Alert>}
          <FormField label="Record name" description="Fully qualified domain name">
            <Input value={newName} onChange={(e) => setNewName(e.detail.value)} placeholder="www.example.com" />
          </FormField>
          <FormField label="Record type">
            <Select
              selectedOption={newType}
              onChange={(e) => setNewType({ label: e.detail.selectedOption.value!, value: e.detail.selectedOption.value! })}
              options={RECORD_TYPES.map((t) => ({ label: t, value: t }))}
            />
          </FormField>
          <FormField label="TTL (seconds)">
            <Input type="number" value={newTTL} onChange={(e) => setNewTTL(e.detail.value)} />
          </FormField>
          <FormField
            label="Value"
            description={recordTypeHelp[newType.value] || "Enter the record value(s), one per line"}
          >
            <Input
              value={newValue}
              onChange={(e) => setNewValue(e.detail.value)}
              placeholder={newType.value === "MX" ? "10 mail.example.com." :
                          newType.value === "SRV" ? "0 10 80 svc.example.com." :
                          newType.value === "CAA" ? "0 issue \"letsencrypt.org\"" :
                          "192.168.1.1"}
            />
          </FormField>
          <Button variant="primary" onClick={handleCreateRecord}>Create</Button>
        </Form>
      </Modal>

      <Modal
        visible={showEditModal}
        onDismiss={() => setShowEditModal(false)}
        header="Edit record"
        closeAriaLabel="Close modal"
      >
        <Form>
          {error && <Alert type="error">{error}</Alert>}
          <TextContent>
            <p><strong>{editRecord?.name}</strong> ({editRecord?.type})</p>
          </TextContent>
          <FormField label="TTL (seconds)">
            <Input type="number" value={newTTL} onChange={(e) => setNewTTL(e.detail.value)} />
          </FormField>
          <Button variant="primary" onClick={handleEditRecord}>Save</Button>
        </Form>
      </Modal>

      <Modal
        visible={showDeleteModal}
        onDismiss={() => setShowDeleteModal(false)}
        header="Delete record"
        closeAriaLabel="Close modal"
      >
        <Form>
          {error && <Alert type="error">{error}</Alert>}
          <TextContent>
            <p>
              Are you sure you want to delete{" "}
              <strong>{editRecord?.name}</strong> ({editRecord?.type})?
            </p>
          </TextContent>
          <Button variant="primary" onClick={handleDeleteRecord}>Delete</Button>
        </Form>
      </Modal>
    </div>
  );
}

export default function ZoneDetailPage() {
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
        <ZoneDetailContent />
      </AppLayout>
    </NotificationProvider>
  );
}
