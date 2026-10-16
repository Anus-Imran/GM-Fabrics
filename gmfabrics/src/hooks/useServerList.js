"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import api from "../services/apiService.js";

/**
 * Loads a paginated API list ({ items, total, summary }) and re-fetches when the
 * table query changes. Out-of-order responses are ignored.
 *
 *   const list = useServerList("/sales", { params: { status } });
 *   <DataTable serverMode data={list.items} totalCount={list.total} loading={list.loading}
 *              onQueryChange={list.setQuery} />
 */
export const useServerList = (path, { params = {}, pageSize = 25, enabled = true } = {}) => {
  const [query, setQueryState] = useState({ page: 1, pageSize });
  const [state, setState] = useState({ items: [], total: 0, summary: null, extra: null });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const requestId = useRef(0);
  const paramsKey = JSON.stringify(params);

  const load = useCallback(async () => {
    if (!enabled) return;
    const id = ++requestId.current;
    setLoading(true);
    setError(null);
    try {
      const clean = Object.fromEntries(
        Object.entries({ ...query, ...JSON.parse(paramsKey) }).filter(([, v]) => v !== undefined && v !== null && v !== "")
      );
      const res = await api.get(path, { params: clean });
      if (id !== requestId.current) return;
      const data = res.data || {};
      const { items = [], total = 0, summary = null, ...extra } = data;
      setState({ items, total, summary, extra });
    } catch (err) {
      if (id === requestId.current) setError(err.message);
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [path, query, paramsKey, enabled]);

  useEffect(() => {
    load();
  }, [load]);

  const setQuery = useCallback((next) => {
    setQueryState((prev) => {
      const merged = { ...prev, ...next };
      return JSON.stringify(merged) === JSON.stringify(prev) ? prev : merged;
    });
  }, []);

  return { ...state, loading, error, query, setQuery, reload: load };
};
