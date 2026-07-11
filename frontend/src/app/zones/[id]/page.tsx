"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Header from "@cloudscape-design/components/header";
import Table from "@cloudscape-design/components/table";
import Button from "@cloudscape-design/components/button";
import ButtonDropdown from "@cloudscape-design/components/button-dropdown";
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
import ColumnLayout from "@cloudscape-design/components/column-layout";
import Link from "@cloudscape-design/components/link";
import { auth, zones, records, tags, exports_, clearTokens } from "@/lib/api";
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
  const [editName, setEditName] = useState("");
  const [editValue, setEditValue] = useState("");
  const [error, setError] = useState("");

  const [showTagModal, setShowTagModal] = useState(false);
  const [newTagKey, setNewTagKey] = useState("");
  const [newTagValue, setNewTagValue] = useState("");

  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState("");
  const [selectedRecords, setSelectedRecords] = useState<RecordResponse[]>([]);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);

  const handleBulkDelete = async () => {
    if (selectedRecords.length === 0) return;
    const soaNss = selectedRecords.filter((r) => r.type === "SOA" || r.type === "NS");
    if (soaNss.length > 0) {
      setError("Cannot bulk delete SOA or NS records");
      return;
    }
    try {
      for (const r of selectedRecords) {
        await records.delete(zoneId, r.id);
      }
      setShowBulkDeleteModal(false);
      setSelectedRecords([]);
      addNotification("success", `Deleted ${selectedRecords.length} records`);
      fetchRecords(1, search, typeFilter);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to delete records");
    }
  };

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
      const values = editValue.split("\n").filter((v) => v.trim());
      if (values.length === 0) { setError("At least one value is required"); return; }
      await records.change(zoneId, {
        change_batch: {
          changes: [{
            action: "UPSERT",
            resource_record_set: {
              name: editName || editRecord.name,
              type: editRecord.type,
              ttl: parseInt(newTTL) || 300,
              resource_records: values.map((v) => ({ value: v.trim() })),
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

  const handleExportJson = async () => {
    try {
      const data = await exports_.json(zoneId);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(zone?.name || "zone").replace(/\.$/, "")}.json`;
      a.click();
      URL.revokeObjectURL(url);
      addNotification("success", "Zone exported as JSON");
    } catch { addNotification("error", "Failed to export zone"); }
  };

  const handleExportBind = async () => {
    try {
      await exports_.bind(zoneId, zone?.name || "");
      addNotification("success", "Zone exported as BIND zone file");
    } catch { addNotification("error", "Failed to export zone"); }
  };

  const handleImportBind = async () => {
    if (!importText.trim()) { setError("Paste a BIND zone file first"); return; }
    try {
      const result = await exports_.importBind(zoneId, importText);
      setShowImportModal(false);
      setImportText("");
      addNotification("success", `Imported ${result.imported} records from BIND zone file`);
      fetchRecords(1, search, typeFilter);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to import zone file");
    }
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

  const formatRecordValues = (value: string) => {
    try {
      const vals = JSON.parse(value);
      return Array.isArray(vals) ? vals : [value];
    } catch {
      return [value];
    }
  };

  return (
    <div style={{ padding: "24px" }}>
      <SpaceBetween size="l" direction="vertical">
        <Header
          variant="h1"
          description="Manage the records and tags for this hosted zone."
          actions={
            <SpaceBetween direction="horizontal" size="xs">
              <Button onClick={() => router.push("/zones")}>Back to zones</Button>
              <ButtonDropdown
                items={[
                  { id: "json", text: "Export as JSON" },
                  { id: "bind", text: "Export as BIND" },
                  { id: "import", text: "Import BIND zone file" },
                ]}
                variant="normal"
                expandToViewport
                onItemClick={({ detail }) => {
                  if (detail.id === "json") handleExportJson();
                  if (detail.id === "bind") handleExportBind();
                  if (detail.id === "import") { setImportText(""); setError(""); setShowImportModal(true); }
                }}
              >
                Zone actions
              </ButtonDropdown>
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
          <Container header={<Header variant="h2">Hosted zone details</Header>}>
            <ColumnLayout columns={4} variant="text-grid">
              <div>
                <Box variant="awsui-key-label">Hosted zone ID</Box>
                <Box variant="span">{zone.id}</Box>
              </div>
              <div>
                <Box variant="awsui-key-label">Type</Box>
                <Box variant="span">{zone.config.private_zone ? "Private" : "Public"}</Box>
              </div>
              <div>
                <Box variant="awsui-key-label">Record count</Box>
                <Box variant="span">{zone.resource_record_set_count}</Box>
              </div>
              <div>
                <Box variant="awsui-key-label">Comment</Box>
                <Box variant="span">{zone.config.comment || "—"}</Box>
              </div>
            </ColumnLayout>
          </Container>
        )}

        <Tabs
          activeTabId={activeTab}
          onChange={(e) => setActiveTab(e.detail.activeTabId)}
          tabs={[
            {
              id: "records",
              label: "Records",
              content: (
                <SpaceBetween size="m" direction="vertical">
                  <div style={{ display: "flex", gap: "16px", alignItems: "center", flexWrap: "wrap" }}>
                    <div style={{ width: "280px" }}>
                      <Input
                        placeholder="Search by record name"
                        value={search}
                        onChange={(e) => {
                          setSearch(e.detail.value);
                          fetchRecords(1, e.detail.value, typeFilter);
                        }}
                      />
                    </div>
                    <div style={{ width: "160px" }}>
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
                    {selectedRecords.length > 0 && (
                      <Button onClick={() => setShowBulkDeleteModal(true)}>
                        Delete selected ({selectedRecords.length})
                      </Button>
                    )}
                  </div>

                  <Table
                    loading={loading}
                    sortingDisabled
                    selectionType="multi"
                    selectedItems={selectedRecords}
                    onSelectionChange={(e) => setSelectedRecords(e.detail.selectedItems)}
                    trackBy="id"
                    columnDefinitions={[
                      {
                        id: "name",
                        header: "Record name",
                        cell: (item) => item.name,
                        isRowHeader: true,
                      },
                      {
                        id: "type",
                        header: "Type",
                        cell: (item) => item.type,
                      },
                      {
                        id: "routing",
                        header: "Routing policy",
                        cell: () => "Simple",
                      },
                      {
                        id: "alias",
                        header: "Alias",
                        cell: (item) => (item.alias_target ? "Yes" : "No"),
                      },
                      {
                        id: "ttl",
                        header: "TTL (seconds)",
                        cell: (item) => String(item.ttl),
                      },
                      {
                        id: "value",
                        header: "Value / Route traffic to",
                        cell: (item) => formatRecordValues(item.value).join(", "),
                      },
                      {
                        id: "actions",
                        header: "Actions",
                        cell: (item) => (
                          <ButtonDropdown
                            items={[
                              { id: "edit", text: "Edit" },
                              { id: "delete", text: "Delete" },
                            ]}
                            variant="icon"
                            expandToViewport
                            ariaLabel={`Actions for ${item.name}`}
                            onItemClick={({ detail }) => {
                              setEditRecord(item);
                              setEditName(item.name);
                              setEditValue(formatRecordValues(item.value).join("\n"));
                              setNewTTL(String(item.ttl));
                              setError("");
                              if (detail.id === "edit") setShowEditModal(true);
                              if (detail.id === "delete") setShowDeleteModal(true);
                            }}
                          />
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
                  <div style={{ display: "flex", gap: "16px", alignItems: "flex-end", flexWrap: "wrap" }}>
                    <FormField label="Key">
                      <Input value={newTagKey} onChange={(e) => setNewTagKey(e.detail.value)} />
                    </FormField>
                    <FormField label="Value">
                      <Input value={newTagValue} onChange={(e) => setNewTagValue(e.detail.value)} />
                    </FormField>
                    <Button variant="primary" onClick={handleAddTag}>Add tag</Button>
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
      </SpaceBetween>

      <Modal
        visible={showCreateModal}
        onDismiss={() => setShowCreateModal(false)}
        header="Create record"
        closeAriaLabel="Close modal"
        footer={
          <Box float="right">
            <SpaceBetween direction="horizontal" size="xs">
              <Button variant="link" onClick={() => setShowCreateModal(false)}>Cancel</Button>
              <Button variant="primary" onClick={handleCreateRecord}>Create record</Button>
            </SpaceBetween>
          </Box>
        }
      >
        <Form>
          <SpaceBetween size="m" direction="vertical">
            {error ? <Alert key="error" type="error">{error}</Alert> : null}
            <FormField key="name" label="Record name" description="Fully qualified domain name">
              <Input value={newName} onChange={(e) => setNewName(e.detail.value)} placeholder="www.example.com" />
            </FormField>
            <FormField key="type" label="Record type">
              <Select
                selectedOption={newType}
                onChange={(e) => setNewType({ label: e.detail.selectedOption.value!, value: e.detail.selectedOption.value! })}
                options={RECORD_TYPES.map((t) => ({ label: t, value: t }))}
              />
            </FormField>
            <FormField key="ttl" label="TTL (seconds)">
              <Input type="number" value={newTTL} onChange={(e) => setNewTTL(e.detail.value)} />
            </FormField>
            <FormField
              key="value"
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
          </SpaceBetween>
        </Form>
      </Modal>

      <Modal
        visible={showEditModal}
        onDismiss={() => setShowEditModal(false)}
        header="Edit record"
        closeAriaLabel="Close modal"
        footer={
          <Box float="right">
            <SpaceBetween direction="horizontal" size="xs">
              <Button variant="link" onClick={() => setShowEditModal(false)}>Cancel</Button>
              <Button variant="primary" onClick={handleEditRecord}>Save changes</Button>
            </SpaceBetween>
          </Box>
        }
      >
        <Form>
          <SpaceBetween size="m" direction="vertical">
            {error ? <Alert key="error" type="error">{error}</Alert> : null}
            <FormField key="info" label="Record type">
              <Input value={editRecord?.type || ""} disabled />
            </FormField>
            <FormField key="name" label="Record name">
              <Input value={editName} onChange={(e) => setEditName(e.detail.value)} />
            </FormField>
            <FormField key="value" label="Value" description="One value per line">
              <Input value={editValue} onChange={(e) => setEditValue(e.detail.value)} />
            </FormField>
            <FormField key="ttl" label="TTL (seconds)">
              <Input type="number" value={newTTL} onChange={(e) => setNewTTL(e.detail.value)} />
            </FormField>
          </SpaceBetween>
        </Form>
      </Modal>

      <Modal
        visible={showDeleteModal}
        onDismiss={() => setShowDeleteModal(false)}
        header="Delete record"
        closeAriaLabel="Close modal"
        footer={
          <Box float="right">
            <SpaceBetween direction="horizontal" size="xs">
              <Button variant="link" onClick={() => setShowDeleteModal(false)}>Cancel</Button>
              <Button variant="primary" onClick={handleDeleteRecord}>Delete</Button>
            </SpaceBetween>
          </Box>
        }
      >
        <Form>
          <SpaceBetween size="m" direction="vertical">
            {error ? <Alert key="error" type="error">{error}</Alert> : null}
            <TextContent key="confirm">
              <p>
                Are you sure you want to delete{" "}
                <strong>{editRecord?.name}</strong> ({editRecord?.type})?
              </p>
            </TextContent>
          </SpaceBetween>
        </Form>
      </Modal>

      <Modal
        visible={showBulkDeleteModal}
        onDismiss={() => setShowBulkDeleteModal(false)}
        header="Delete records"
        closeAriaLabel="Close modal"
        footer={
          <Box float="right">
            <SpaceBetween direction="horizontal" size="xs">
              <Button variant="link" onClick={() => setShowBulkDeleteModal(false)}>Cancel</Button>
              <Button variant="primary" onClick={handleBulkDelete}>Delete</Button>
            </SpaceBetween>
          </Box>
        }
      >
        <Form>
          <SpaceBetween size="m" direction="vertical">
            {error ? <Alert key="error" type="error">{error}</Alert> : null}
            <TextContent key="confirm">
              <p>Are you sure you want to delete {selectedRecords.length} records?</p>
            </TextContent>
          </SpaceBetween>
        </Form>
      </Modal>

      <Modal
        visible={showImportModal}
        onDismiss={() => setShowImportModal(false)}
        header="Import BIND zone file"
        closeAriaLabel="Close modal"
        footer={
          <Box float="right">
            <SpaceBetween direction="horizontal" size="xs">
              <Button variant="link" onClick={() => setShowImportModal(false)}>Cancel</Button>
              <Button variant="primary" onClick={handleImportBind}>Import</Button>
            </SpaceBetween>
          </Box>
        }
      >
        <Form>
          <SpaceBetween size="m" direction="vertical">
            {error ? <Alert key="error" type="error">{error}</Alert> : null}
            <FormField
              key="zonefile"
              label="Zone file content"
              description="Paste the contents of a BIND zone file"
            >
              <textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                style={{
                  width: "100%",
                  minHeight: "240px",
                  fontFamily: "monospace",
                  fontSize: "12px",
                  padding: "8px",
                  border: "1px solid #aab7b8",
                  borderRadius: "2px",
                  resize: "vertical",
                }}
                placeholder={"; BIND zone file\n$ORIGIN example.com.\n$TTL 3600\n@  IN  A  192.168.1.1\nwww  IN  A  192.168.1.2"}
              />
            </FormField>
          </SpaceBetween>
        </Form>
      </Modal>
    </div>
  );
}

export default function ZoneDetailPage() {
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
        <ZoneDetailContent />
      </AppLayout>
    </NotificationProvider>
  );
}
