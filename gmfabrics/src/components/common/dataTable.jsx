"use client";

import React, { useState, useMemo } from "react";
import {
  Search,
  Calendar,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Download,
  Filter,
  CheckSquare,
  Square,
  AlertTriangle,
} from "lucide-react";
import { Button } from "./button.jsx";
import { Modal } from "./modal.jsx";
import { Loader } from "./loader.jsx";

export const DataTable = ({
  columns = [],
  data = [],
  searchKeys = [],
  dateKey = "createdAt",
  onDeleteSelected = null,
  keyField = "id",
  title = "",
  actions = null,
  enableSelection = true,
  enableDateFilter = true,
  defaultPageSize = 10,
  emptyMessage = "No matching records found.",
  loading = false,
}) => {
  // State
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState("all"); // 'all', 'today', '7days', 'this_month', 'custom'
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Handle Sort Toggle
  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  // Filter Data (Search + Date Range)
  const filteredData = useMemo(() => {
    let result = Array.isArray(data) ? [...data] : [];

    // 1. Date Range Filtering
    if (enableDateFilter && dateKey && dateRange !== "all") {
      const now = new Date();
      let start = new Date(0);
      let end = new Date(2099, 11, 31, 23, 59, 59);

      if (dateRange === "today") {
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
      } else if (dateRange === "7days") {
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6, 0, 0, 0);
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
      } else if (dateRange === "this_month") {
        start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      } else if (dateRange === "custom" && startDate && endDate) {
        start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
      }

      result = result.filter((row) => {
        const rawDate = row[dateKey];
        if (!rawDate) return true;
        const rowDate = new Date(rawDate);
        return rowDate >= start && rowDate <= end;
      });
    }

    // 2. Global Text Search Filtering
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter((row) => {
        if (searchKeys.length > 0) {
          return searchKeys.some((key) => {
            const val = row[key];
            if (val === null || val === undefined) return false;
            return String(val).toLowerCase().includes(term);
          });
        }
        // Fallback: search all values in row
        return Object.values(row).some((val) => {
          if (val === null || val === undefined) return false;
          if (typeof val === "object") return false;
          return String(val).toLowerCase().includes(term);
        });
      });
    }

    // 3. Sorting
    if (sortConfig.key) {
      result.sort((a, b) => {
        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];

        if (aVal === null || aVal === undefined) aVal = "";
        if (bVal === null || bVal === undefined) bVal = "";

        if (typeof aVal === "number" && typeof bVal === "number") {
          return sortConfig.direction === "asc" ? aVal - bVal : bVal - aVal;
        }

        const aStr = String(aVal).toLowerCase();
        const bStr = String(bVal).toLowerCase();

        if (aStr < bStr) return sortConfig.direction === "asc" ? -1 : 1;
        if (aStr > bStr) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [data, searchTerm, dateRange, startDate, endDate, sortConfig, searchKeys, dateKey, enableDateFilter]);

  // Pagination Logic
  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedData = filteredData.slice(startIndex, startIndex + pageSize);

  // Handle Checkbox Selection
  const isAllSelected = paginatedData.length > 0 && paginatedData.every((row) => selectedIds.has(row[keyField]));

  const toggleSelectAll = () => {
    const next = new Set(selectedIds);
    if (isAllSelected) {
      paginatedData.forEach((row) => next.delete(row[keyField]));
    } else {
      paginatedData.forEach((row) => next.add(row[keyField]));
    }
    setSelectedIds(next);
  };

  const toggleSelectRow = (id) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  // Handle Delete Confirmation
  const confirmDeleteSelected = async () => {
    if (!onDeleteSelected || selectedIds.size === 0) return;
    setIsDeleting(true);
    try {
      await onDeleteSelected(Array.from(selectedIds));
      setSelectedIds(new Set());
      setShowDeleteModal(false);
    } catch (err) {
      console.error("Delete failed:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  // CSV Export Handler
  const exportToCSV = () => {
    if (filteredData.length === 0) return;

    const exportCols = columns.filter((col) => col.key);
    const headers = exportCols.map((col) => col.label).join(",");
    const rows = filteredData.map((row) =>
      exportCols
        .map((col) => {
          let val = row[col.key];
          if (val === null || val === undefined) val = "";
          const str = String(val).replace(/"/g, '""');
          return `"${str}"`;
        })
        .join(",")
    );

    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${title || "export"}_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      {/* Table Header Controls (Search, Date Filter, Actions) */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Left: Search Input & Date Filters */}
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search records..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-4 py-2 text-xs bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 font-medium"
            />
          </div>

          {/* Date Filter Select */}
          {enableDateFilter && dateKey && (
            <div className="flex items-center gap-2">
              <div className="relative">
                <select
                  value={dateRange}
                  onChange={(e) => {
                    setDateRange(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="text-xs py-2 pl-8 pr-7 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl font-bold appearance-none cursor-pointer focus:outline-none"
                >
                  <option value="all">📅 All Dates</option>
                  <option value="today">Today</option>
                  <option value="7days">Last 7 Days</option>
                  <option value="this_month">This Month</option>
                  <option value="custom">Custom Date</option>
                </select>
                <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400 pointer-events-none" />
              </div>

              {dateRange === "custom" && (
                <div className="flex items-center gap-1.5 text-xs">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="p-1.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs"
                  />
                  <span className="text-zinc-400">to</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="p-1.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Custom Actions & CSV Export */}
        <div className="flex items-center gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={exportToCSV} className="flex items-center gap-1.5 text-xs font-semibold">
            <Download className="w-3.5 h-3.5" /> CSV
          </Button>
          {actions}
        </div>
      </div>

      {/* Floating Selected Rows Action Bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between p-3 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 rounded-xl shadow-lg animate-in fade-in duration-200">
          <div className="flex items-center gap-2 text-xs font-bold">
            <CheckSquare className="w-4 h-4 text-emerald-400 dark:text-emerald-600" />
            <span>{selectedIds.size} row(s) selected</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedIds(new Set())}
              className="text-xs text-white border-zinc-700 dark:text-zinc-900 dark:border-zinc-300"
            >
              Clear Selection
            </Button>
            {onDeleteSelected && (
              <Button
                variant="danger"
                size="sm"
                onClick={() => setShowDeleteModal(true)}
                className="flex items-center gap-1.5 font-bold text-xs bg-red-600 text-white hover:bg-red-700"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete Selected ({selectedIds.size})
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Main Table Wrapper */}
      <div className="overflow-x-auto border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-950 shadow-sm">
        <table className="w-full text-left text-xs">
          <thead className="bg-zinc-50 dark:bg-zinc-900/80 border-b border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 font-bold uppercase tracking-wider select-none">
            <tr>
              {enableSelection && (
                <th className="p-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-zinc-300 dark:border-zinc-700 text-zinc-900 focus:ring-0 cursor-pointer"
                  />
                </th>
              )}
              {columns.map((col, idx) => (
                <th
                  key={col.key || idx}
                  onClick={() => col.sortable !== false && col.key && handleSort(col.key)}
                  className={`p-3 transition-colors ${
                    col.sortable !== false && col.key ? "cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800/60" : ""
                  } ${col.className || ""}`}
                >
                  <div className="flex items-center gap-1.5">
                    <span>{col.label}</span>
                    {col.sortable !== false && col.key && (
                      <span className="text-zinc-400">
                        {sortConfig.key === col.key ? (
                          sortConfig.direction === "asc" ? (
                            <ArrowUp className="w-3.5 h-3.5 text-zinc-900 dark:text-zinc-100" />
                          ) : (
                            <ArrowDown className="w-3.5 h-3.5 text-zinc-900 dark:text-zinc-100" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3 opacity-40 hover:opacity-100" />
                        )}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 font-medium">
            {loading ? (
              <tr>
                <td colSpan={columns.length + (enableSelection ? 1 : 0)} className="py-8 text-center">
                  <Loader text={`Loading ${title ? title.replace(/_/g, " ") : "records"}...`} />
                </td>
              </tr>
            ) : paginatedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (enableSelection ? 1 : 0)} className="py-12 text-center text-zinc-400">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <Filter className="w-8 h-8 opacity-30 stroke-[1.5]" />
                    <p className="text-xs font-semibold">{emptyMessage}</p>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedData.map((row, rowIdx) => {
                const idVal = row[keyField];
                const isSelected = selectedIds.has(idVal);

                return (
                  <tr
                    key={idVal || rowIdx}
                    className={`transition-colors hover:bg-zinc-50/80 dark:hover:bg-zinc-900/50 ${
                      isSelected ? "bg-zinc-100/70 dark:bg-zinc-900/90" : ""
                    }`}
                  >
                    {enableSelection && (
                      <td className="p-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectRow(idVal)}
                          className="w-4 h-4 rounded border-zinc-300 dark:border-zinc-700 text-zinc-900 focus:ring-0 cursor-pointer"
                        />
                      </td>
                    )}
                    {columns.map((col, colIdx) => (
                      <td key={col.key || colIdx} className={`p-3 text-zinc-800 dark:text-zinc-200 ${col.cellClassName || ""}`}>
                        {col.render ? col.render(row, rowIdx) : row[col.key]}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination & Summary Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-500 pt-1">
        <div className="flex items-center gap-2">
          <span>Show</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="px-2 py-1 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg font-bold"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <span>entries per page</span>
        </div>

        <div className="flex items-center gap-4">
          <span>
            Showing <strong className="text-zinc-900 dark:text-zinc-100">{filteredData.length > 0 ? startIndex + 1 : 0}</strong> to{" "}
            <strong className="text-zinc-900 dark:text-zinc-100">
              {Math.min(startIndex + pageSize, filteredData.length)}
            </strong>{" "}
            of <strong className="text-zinc-900 dark:text-zinc-100">{filteredData.length}</strong> entries
          </span>

          {/* Page buttons */}
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="p-1.5"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>

            <span className="px-2 font-bold text-zinc-800 dark:text-zinc-200">
              {currentPage} / {totalPages}
            </span>

            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="p-1.5"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Confirm Delete Records">
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 rounded-xl text-xs font-semibold">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <span>Are you sure you want to delete {selectedIds.size} selected record(s)? This action cannot be undone.</span>
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
              Cancel
            </Button>
            <Button variant="danger" disabled={isDeleting} onClick={confirmDeleteSelected} className="font-bold">
              {isDeleting ? "Deleting..." : `Yes, Delete ${selectedIds.size} Record(s)`}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
