import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import AddDocumentModal from "../../components/AddDocumentModal";

const defaultPageSize = 15;

function formatDate(iso) {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleString();
  } catch {
    return "-";
  }
}

function compareValues(a, b, key) {
  // Dates
  if (key.endsWith("At")) {
    const da = new Date(a?.[key] ?? 0).getTime();
    const db = new Date(b?.[key] ?? 0).getTime();
    return da - db;
  }
  // Strings
  const sa = (a?.[key] ?? "").toString().toLowerCase();
  const sb = (b?.[key] ?? "").toString().toLowerCase();
  if (sa < sb) return -1;
  if (sa > sb) return 1;
  return 0;
}

export default function DocumentsList() {
  const { categoryId } = useParams();
  const [rows, setRows] = useState([]);
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState("updatedAt");
  const [sortDir, setSortDir] = useState("desc"); // 'asc' | 'desc' | 'none'
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(defaultPageSize);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  useEffect(() => {
    async function fetchDocuments() {
      if (!categoryId) {
        setRows([]);
        return;
      }
      try {
        const response = await fetch(`http://localhost:8001/api/docs/category/${categoryId}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setRows(data);
      } catch (error) {
        console.error("Error fetching documents:", error);
        setRows([]);
      }
    }
    fetchDocuments();
  }, [categoryId]);

  // Close row menu on outside click
  useEffect(() => {
    function onDocClick(e) {
      const target = e.target;
      if (!(
        target.closest && (target.closest(".menu") || target.closest(".menu-trigger"))
      )) {
        setOpenMenuId(null);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  // Filter
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      return (
        r.name.toLowerCase().includes(q) ||
        (r.description || "").toLowerCase().includes(q) ||
        r.createdby.toLowerCase().includes(q) ||
        r.updatedby.toLowerCase().includes(q)
      );
    });
  }, [rows, query]);

  // Sort
  const sorted = useMemo(() => {
    if (sortDir === "none") return filtered;
    const copy = [...filtered];
    copy.sort((a, b) => {
      const base = compareValues(a, b, sortBy);
      return sortDir === "asc" ? base : -base;
    });
    return copy;
  }, [filtered, sortBy, sortDir]);

  // Pagination
  const pageCount = useMemo(
    () => Math.max(1, Math.ceil(sorted.length / rowsPerPage)),
    [sorted.length, rowsPerPage]
  );
  const currentPage = Math.min(page, pageCount - 1);
  const paginated = useMemo(() => {
    const start = currentPage * rowsPerPage;
    const end = start + rowsPerPage;
    return sorted.slice(start, end);
  }, [sorted, currentPage, rowsPerPage]);

  useEffect(() => {
    // Reset to first page when filter / page size changes
    setPage(0);
  }, [query, rowsPerPage]);

  function toggleSort(col) {
    if (sortBy === col) {
      setSortDir((prev) => (prev === "asc" ? "desc" : prev === "desc" ? "none" : "asc"));
    } else {
      setSortBy(col);
      setSortDir("asc");
    }
  }

  function onView(row) {
    alert(
      [
        `Document: ${row.name}`,
        `Description: ${row.description || "-"}`,
        `Category ID: ${row.category_id}`,
        `Created By: ${row.createdby}`,
        `Updated By: ${row.updatedby}`,
        `Created At: ${formatDate(row.createdat)}`,
        `Updated At: ${formatDate(row.updatedat)}`,
      ].join("\n")
    );
    setOpenMenuId(null);
  }

  function askDelete(row) {
    setConfirmDeleteId(row.id);
  }

  function confirmDelete(row) {
    setRows((prev) => prev.filter((r) => r.id !== row.id));
    setConfirmDeleteId(null);
    setOpenMenuId(null);
  }

  function cancelDelete() {
    setConfirmDeleteId(null);
  }

  function onChat(row) {
    const url = `${window.location.origin}/chat?docId=${encodeURIComponent(row.id)}`;
    window.open(url, "_blank", "noopener,noreferrer");
    setOpenMenuId(null);
  }

  function onRename(row) {
    const next = prompt(`Rename "${row.name}" to:`, row.name);
    if (next && next.trim() && next.trim() !== row.name) {
      setRows((prev) =>
        prev.map((r) =>
          r.id === row.id
            ? { ...r, name: next.trim(), updatedat: new Date().toISOString() }
            : r
        )
      );
    }
    setOpenMenuId(null);
  }

  const columns = [
    { key: "name", label: "Name", sortable: true },
    { key: "description", label: "Description", sortable: true },
    { key: "createdby", label: "Created By", sortable: true },
    { key: "updatedby", label: "Updated By", sortable: true },
    { key: "createdat", label: "Created At", sortable: true },
    { key: "updatedat", label: "Updated At", sortable: true },
  ];

  return (
    <div className="doc-list-wrap">
      <style>{`
        .doc-list-wrap {
          padding: 20px 24px;
        }
        .doc-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        }
        .doc-title {
          font-size: 20px;
          font-weight: 600;
        }
        .primary-btn {
          height: 36px;
          padding: 0 14px;
          border-radius: 8px;
          border: 1px solid #1d4ed8;
          background: #1d4ed8;
          color: #fff;
          font-weight: 600;
          cursor: pointer;
          box-shadow: 0 1px 2px rgba(0,0,0,0.06);
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .primary-btn:hover {
          background: #1e40af;
          border-color: #1e40af;
        }
        .toolbar {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
          flex-wrap: wrap;
        }
        .search-input {
          min-width: 260px;
          flex: 1 1 260px;
          border: 1px solid #e0e0e0;
          background: #fff;
          height: 38px;
          border-radius: 8px;
          padding: 0 12px;
          outline: none;
          transition: box-shadow .2s ease, border-color .2s ease;
        }
        .search-input:focus {
          border-color: #90caf9;
          box-shadow: 0 0 0 3px rgba(25, 118, 210, 0.15);
        }
        .rows-per-page {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #555;
          font-size: 14px;
        }
        .rows-per-page select {
          height: 34px;
          border-radius: 8px;
          border: 1px solid #e0e0e0;
          padding: 0 10px;
          background: #fff;
        }

        .table-card {
          background: #fff;
          border-radius: 12px;
          box-shadow:
            0 2px 4px rgba(0,0,0,0.04),
            0 8px 24px rgba(0,0,0,0.06);
          overflow: visible;
          border: 1px solid #f0f0f0;
        }
        table.mui-like {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
        }
        .mui-like thead th {
          background: linear-gradient(0deg, #fafafa, #fff);
          color: #374151;
          text-align: left;
          font-weight: 600;
          font-size: 13px;
          padding: 14px 16px;
          border-bottom: 1px solid #ececec;
          position: sticky;
          top: 0;
          z-index: 1;
        }
        .mui-like thead th.sortable {
          cursor: pointer;
          user-select: none;
        }
        .mui-like thead th .sort-label {
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .mui-like tbody td {
          padding: 14px 16px;
          border-bottom: 1px solid #f4f4f5;
          color: #333;
          vertical-align: middle;
          background: #fff;
        }
        .mui-like tbody tr:hover td {
          background: #fafcff;
        }
        .cell-name {
          font-weight: 600;
          color: #111827;
        }
        .muted {
          color: #6b7280;
          font-variant-numeric: tabular-nums;
        }
        .truncate {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 280px;
        }
        .actions-cell {
          width: 56px;
          position: relative;
        }
        .menu-trigger {
          border: none;
          background: transparent;
          width: 32px;
          height: 32px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          cursor: pointer;
          color: #374151;
        }
        .menu-trigger:hover {
          background: #f3f4f6;
        }
        .menu {
          position: absolute;
          right: 8px;
          top: 40px;
          min-width: 160px;
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.12);
          padding: 6px;
          z-index: 10;
        }
        .menu button {
          width: 100%;
          background: transparent;
          border: none;
          text-align: left;
          padding: 10px 10px;
          border-radius: 8px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          color: #111827;
          font-size: 14px;
        }
        .menu button:hover {
          background: #f3f4f6;
        }

        .pagination {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 8px 0 8px;
          color: #6b7280;
          font-size: 14px;
        }
        .pager {
          display: inline-flex;
          gap: 6px;
          align-items: center;
        }
        .pager button {
          height: 32px;
          min-width: 32px;
          padding: 0 8px;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          background: #fff;
          cursor: pointer;
          color: #374151;
        }
        .pager button:hover:not(:disabled) {
          background: #f3f4f6;
        }
        .pager button.active {
          background: #e8f1ff;
          border-color: #90caf9;
          color: #1e40af;
          font-weight: 600;
        }
        .pager button:disabled {
          opacity: .5;
          cursor: not-allowed;
        }
      `}</style>

      <div className="doc-header">
        <div className="doc-title">Documents</div>
        <button onClick={() => setIsAddModalOpen(true)} className="primary-btn" title="Add Document">+ Add Document</button>
      </div>

      <div className="toolbar">
        <input
          className="search-input"
          placeholder="Filter by name, file, category, description, created by, or updated by..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="rows-per-page">
          <span>Rows per page</span>
          <select
            value={rowsPerPage}
            onChange={(e) => setRowsPerPage(Number(e.target.value))}>
            <option value={15}>15</option>
            <option value={30}>30</option>
            <option value={50}>50</option>
          </select>
        </div>
      </div>

      <div className="table-card">
        <table className="mui-like">
          <thead>
            <tr>
              {columns.map((col) => {
                const isActive = sortBy === col.key;
                const arrow = isActive ? (sortDir === "asc" ? "▲" : sortDir === "desc" ? "▼" : "◇") : "◇";
                return (
                  <th
                    key={col.key}
                    className={col.sortable ? "sortable" : ""}
                    onClick={() => col.sortable && toggleSort(col.key)}
                    title={col.sortable ? "Sort" : undefined}
                  >
                    <span className="sort-label">
                      {col.label} {col.sortable && <span className="muted">{arrow}</span>}
                    </span>
                  </th>
                );
              })}
              <th style={{ width: 56 }}></th>
            </tr>
          </thead>
          <tbody>
            {paginated.map((row) => (
              <tr key={row.id}>
                <td className="cell-name">{row.name}</td>
                <td>{row.description}</td>
                <td>{row.createdby}</td>
                <td>{row.updatedby}</td>
                <td className="muted">{formatDate(row.createdat)}</td>
                <td className="muted">{formatDate(row.updatedat)}</td>
                <td className="actions-cell">
                  <button
                    className="menu-trigger"
                    title="Actions"
                    onClick={() => setOpenMenuId((prev) => (prev === row.id ? null : row.id))}
                  >
                    ⋮
                  </button>
                  {openMenuId === row.id && (
                    <div className="menu">
                      {confirmDeleteId === row.id ? (
                        <>
                          <button onClick={() => confirmDelete(row)} style={{ color: "#b91c1c" }}>
                            Confirm Delete
                          </button>
                          <button onClick={cancelDelete}>Cancel</button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => onView(row)}>👁️ View</button>
                          <button onClick={() => onRename(row)}>✏️ Rename</button>
                          <button onClick={() => onChat(row)}>💬 Chat</button>
                          <button onClick={() => askDelete(row)}>🗑️ Delete</button>
                        </>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {paginated.length === 0 && (
              <tr>
                <td colSpan={columns.length + 1} className="muted" style={{ padding: 24, textAlign: "center" }}>
                  No records found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="pagination">
        <div>
          Showing{" "}
          <strong>
            {sorted.length === 0 ? 0 : currentPage * rowsPerPage + 1}
            -
            {Math.min(sorted.length, (currentPage + 1) * rowsPerPage)}
          </strong>{" "}
          of <strong>{sorted.length}</strong>
        </div>
        <div className="pager">
          <button onClick={() => setPage(0)} disabled={currentPage === 0} title="First">
            ⏮
          </button>
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={currentPage === 0}
            title="Previous"
          >
            ‹
          </button>
          {Array.from({ length: pageCount }).map((_, i) => (
            <button
              key={i}
              className={i === currentPage ? "active" : ""}
              onClick={() => setPage(i)}
            >
              {i + 1}
            </button>
          ))}
          <button
            onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
            disabled={currentPage >= pageCount - 1}
            title="Next"
          >
            ›
          </button>
          <button
            onClick={() => setPage(pageCount - 1)}
            disabled={currentPage >= pageCount - 1}
            title="Last"
          >
            ⏭
          </button>
        </div>
      </div>

      <AddDocumentModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onDocumentAdded={(newDoc) => setRows((prev) => [...prev, newDoc])}
      />
    </div>
  );
}
