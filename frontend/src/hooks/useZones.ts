"use client";

import { useState, useEffect, useCallback } from "react";
import { zones } from "@/lib/api";
import type { HostedZone } from "@/lib/types";

export function useZones() {
  const [zoneList, setZoneList] = useState<HostedZone[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchZones = useCallback(
    async (p?: number, s?: string) => {
      setLoading(true);
      setError(null);
      try {
        const res = await zones.list({
          page: p ?? page,
          search: s ?? search,
          size: 20,
        });
        setZoneList(res.hosted_zones);
        setTotal(res.total);
        setPage(res.page);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to load zones");
      } finally {
        setLoading(false);
      }
    },
    [page, search]
  );

  useEffect(() => {
    fetchZones();
  }, []);

  const createZone = useCallback(
    async (data: {
      name: string;
      caller_reference: string;
      comment?: string;
    }) => {
      const zone = await zones.create({
        name: data.name,
        caller_reference: data.caller_reference,
        hosted_zone_config: { comment: data.comment || "", private_zone: false },
      });
      await fetchZones(1, search);
      return zone;
    },
    [fetchZones, search]
  );

  const updateZone = useCallback(
    async (id: string, data: { comment?: string }) => {
      const zone = await zones.update(id, data);
      await fetchZones(page, search);
      return zone;
    },
    [fetchZones, page, search]
  );

  const deleteZone = useCallback(
    async (id: string) => {
      await zones.delete(id);
      await fetchZones(1, search);
    },
    [fetchZones, search]
  );

  return {
    zoneList,
    total,
    page,
    search,
    loading,
    error,
    setSearch,
    setPage,
    fetchZones,
    createZone,
    updateZone,
    deleteZone,
  };
}
