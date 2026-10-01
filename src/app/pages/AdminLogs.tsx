import { useEffect, useState } from "react";
import { Navigate } from "react-router";
import { useAuth } from "../context/AuthContext";
import { ClipboardList, Clock3, Pencil, Plus, RefreshCw, Search, Trash2 } from "lucide-react";

const viteEnv = (import.meta as ImportMeta & { env: { VITE_API_URL?: string } }).env;
const API_URL = viteEnv.VITE_API_URL || "http://localhost:5000/api/v1";

type AuditAction = "created" | "updated" | "deleted";

interface AuditChange {
  field: string;
  before: string | null;
  after: string | null;
}

interface AuditLog {
  id: string;
  adminId: string;
  adminEmail: string;
  action: AuditAction;
  targetType: string;
  targetId: string;
  targetName: string;
  changes: AuditChange[];
  createdAt: string;
}

const ACTIONS: Record<AuditAction, { label: string; icon: typeof Plus; classes: string }> = {
  created: { label: "Menambahkan", icon: Plus, classes: "bg-green-50 text-green-700 border-green-200" },
  updated: { label: "Mengubah", icon: Pencil, classes: "bg-blue-50 text-blue-700 border-blue-200" },
  deleted: { label: "Menghapus", icon: Trash2, classes: "bg-red-50 text-red-700 border-red-200" },
};

const formatValue = (value: string | null) => value || "-";

export function AdminLogs() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const loadLogs = async () => {
      setIsLoading(true);
      setError("");
      try {
        const token = sessionStorage.getItem("mcc_token");
        const response = await fetch(`${API_URL}/audit-logs?limit=200`, {
          headers: { Authorization: `Bearer ${token || ""}` },
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message || "Gagal memuat log aktivitas.");
        if (!cancelled) setLogs(result.data);
      } catch (loadError) {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Gagal memuat log aktivitas.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    loadLogs();
    return () => { cancelled = true; };
  }, [refreshKey]);

  if (user?.role !== "admin") return <Navigate to="/" replace />;

  const filteredLogs = logs.filter((log) => {
    const matchesAction = actionFilter === "all" || log.action === actionFilter;
    const query = search.trim().toLowerCase();
    const matchesSearch = !query || `${log.adminEmail} ${log.targetName} ${log.changes.map((change) => change.field).join(" ")}`
      .toLowerCase()
      .includes(query);
    return matchesAction && matchesSearch;
  });

  return (
    <div className="p-4 lg:p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-[#1e3263]" />
            Log Aktivitas Admin
          </h2>
          <p className="text-sm text-gray-500 mt-1">Riwayat perubahan data karyawan</p>
        </div>
        <button
          type="button"
          onClick={() => setRefreshKey((key) => key + 1)}
          disabled={isLoading}
          title="Muat ulang log"
          aria-label="Muat ulang log"
          className="self-start sm:self-auto p-2.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-4 flex flex-col sm:flex-row gap-3">
        <label className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari admin, karyawan, atau field..."
            className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3263]/20"
          />
        </label>
        <select
          value={actionFilter}
          onChange={(event) => setActionFilter(event.target.value)}
          aria-label="Filter jenis aktivitas"
          className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1e3263]/20"
        >
          <option value="all">Semua aktivitas</option>
          <option value="created">Penambahan</option>
          <option value="updated">Perubahan</option>
          <option value="deleted">Penghapusan</option>
        </select>
      </div>

      {error && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="py-14 text-center text-sm text-gray-500">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Memuat log aktivitas...
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="py-14 text-center">
            <ClipboardList className="w-9 h-9 text-gray-300 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-700">Belum ada aktivitas</p>
            <p className="text-xs text-gray-500 mt-1">Perubahan data karyawan oleh admin akan tercatat di sini.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-5 py-3 font-medium">Aktivitas</th>
                  <th className="px-5 py-3 font-medium">Admin</th>
                  <th className="px-5 py-3 font-medium">Karyawan</th>
                  <th className="px-5 py-3 font-medium">Detail perubahan</th>
                  <th className="px-5 py-3 font-medium">Waktu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredLogs.map((log) => {
                  const action = ACTIONS[log.action];
                  const ActionIcon = action.icon;
                  return (
                    <tr key={log.id} className="align-top hover:bg-gray-50/60">
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-medium ${action.classes}`}>
                          <ActionIcon className="w-3.5 h-3.5" />
                          {action.label}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-gray-700">{log.adminEmail}</td>
                      <td className="px-5 py-4 font-medium text-gray-800">{log.targetName}</td>
                      <td className="px-5 py-4">
                        <details className="group">
                          <summary className="cursor-pointer text-[#1e3263] hover:underline">
                            Lihat {log.changes.length} field
                          </summary>
                          <ul className="mt-2 space-y-1.5 text-xs text-gray-600">
                            {log.changes.map((change, index) => (
                              <li key={`${change.field}-${index}`}>
                                <span className="font-semibold text-gray-700">{change.field}:</span>{" "}
                                <span>{formatValue(change.before)}</span>
                                <span className="px-1 text-gray-400">-&gt;</span>
                                <span>{formatValue(change.after)}</span>
                              </li>
                            ))}
                          </ul>
                        </details>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-xs text-gray-500">
                        <span className="inline-flex items-center gap-1.5">
                          <Clock3 className="w-3.5 h-3.5" />
                          {new Date(log.createdAt).toLocaleString("id-ID", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
