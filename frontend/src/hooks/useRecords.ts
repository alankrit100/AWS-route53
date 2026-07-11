"use client";

import { useState, useEffect, useCallback } from "react";
import { records } from "@/lib/api";
import type { RecordResponse } from "@/lib/types";

export function useRecords(zoneId: string) {
  const [recordList, setRecordList] = useState<RecordResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRecords = useCallback(
    async (p?: number, s?: string, t?: string) => {
      if (!zoneId) return;
      setLoading(true);
      setError(null);
      try {
        const params: {
          page?: number;
          search?: string;
          type?: string;
          size?: number;
        } = { size: 20, page: p ?? page };
        if (s ?? search) params.search = s ?? search;
        if (t ?? typeFilter) params.type = t ?? typeFilter;
        const res = await records.list(zoneId, params);
        setRecordList(res.records);
        setTotal(res.total);
        setPage(res.page);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to load records");
      } finally {
        setLoading(false);
      }
    },
    [zoneId, page, search, typeFilter]
  );

  useEffect(() => {
    fetchRecords();
  }, [zoneId]);

  const createRecord = useCallback(
    async (data: {
      name: string;
      type: string;
      ttl?: number;
      values: string[];
    }) => {
      const res = await records.change(zoneId, {
        change_batch: {
          changes: [
            {
              action: "CREATE",
              resource_record_set: {
                name: data.name,
                type: data.type,
                ttl: data.ttl ?? 300,
                resource_records: data.values.map((v) => ({ value: v })),
              },
            },
          ],
        },
      });
      await fetchRecords(1, search, typeFilter);
      return res;
    },
    [zoneId, fetchRecords, search, typeFilter]
  );

  const updateRecord = useCallback(
    async (
      record: RecordResponse,
      data: { ttl?: number; value?: string }
    ) => {
      const res = await records.update(zoneId, record.id, data);
      await fetchRecords(page, search, typeFilter);
      return res;
    },
    [zoneId, fetchRecords, page, search, typeFilter]
  );

  const deleteRecord = useCallback(
    async (recordId: string) => {
      await records.delete(zoneId, recordId);
      await fetchRecords(1, search, typeFilter);
    },
    [zoneId, fetchRecords, search, typeFilter]
  );

  const batchDeleteRecords = useCallback(
    async (recordIds: string[]) => {
      for (const rid of recordIds) {
        await records.delete(zoneId, rid);
      }
      await fetchRecords(1, search, typeFilter);
    },
    [zoneId, fetchRecords, search, typeFilter]
  );

  return {
    recordList,
    total,
    page,
    search,
    typeFilter,
    loading,
    error,
    setSearch,
    setTypeFilter,
    setPage,
    fetchRecords,
    createRecord,
    updateRecord,
    deleteRecord,
    batchDeleteRecords,
  };
}
