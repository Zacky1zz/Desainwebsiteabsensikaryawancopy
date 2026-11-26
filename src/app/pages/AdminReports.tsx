import { useState } from "react";
import { useAttendance } from "../context/AttendanceContext";
import {
  createAttendanceCsv,
  filterReportRecords,
  groupRecordsByEmployee,
  summarizeEmployeeRecords,
} from "../utils/reportUtils";
import {
  Download,
  FileText,
  BarChart3,
  Calendar,
  Filter,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from "recharts";

const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  hadir: { label: "Hadir", color: "bg-green-100 text-green-700", dot: "bg-green-500" },
  terlambat: { label: "Terlambat", color: "bg-yellow-100 text-yellow-700", dot: "bg-yellow-500" },
  izin: { label: "Izin", color: "bg-blue-100 text-blue-700", dot: "bg-blue-500" },
  sakit: { label: "Sakit", color: "bg-purple-100 text-purple-700", dot: "bg-purple-500" },
  alpha: { label: "Alpha", color: "bg-red-100 text-red-700", dot: "bg-red-500" },
};

const DEPARTMENTS = ["all", "Kreatif", "Event", "IT", "Marketing", "Keuangan", "Manajemen", "Operasional"];

export function AdminReports() {
  const { records } = useAttendance();
  const [filterDept, setFilterDept] = useState("all");
  const [filterMonth, setFilterMonth] = useState(new Date().toISOString().slice(0, 7));
  const [exportSuccess, setExportSuccess] = useState("");

  const filtered = filterReportRecords(records, filterDept, filterMonth);
  const byEmployee = groupRecordsByEmployee(filtered);
  const employeeSummary = summarizeEmployeeRecords(filtered);

  // Daily trend for the month
  const daysInMonth = new Date(parseInt(filterMonth.split("-")[0]), parseInt(filterMonth.split("-")[1]), 0).getDate();
  const trendData = Array.from({ length: Math.min(daysInMonth, 30) }, (_, i) => {
    const day = (i + 1).toString().padStart(2, "0");
    const dateStr = `${filterMonth}-${day}`;
    const dayRecs = filtered.filter((r) => r.date === dateStr);
    return {
      date: `${i + 1}`,
      Hadir: dayRecs.filter((r) => r.status === "hadir").length,
      Terlambat: dayRecs.filter((r) => r.status === "terlambat").length,
      Izin: dayRecs.filter((r) => r.status === "izin").length,
      Sakit: dayRecs.filter((r) => r.status === "sakit").length,
    };
  });

  // Dept comparison
  const deptData = ["Kreatif", "Event", "IT", "Marketing", "Keuangan", "Manajemen"].map((dept) => {
    const dRecs = records.filter((r) => r.department === dept && r.date.startsWith(filterMonth));
    return {
      dept,
      Hadir: dRecs.filter((r) => r.status === "hadir").length,
      Terlambat: dRecs.filter((r) => r.status === "terlambat").length,
      Izin: dRecs.filter((r) => r.status === "izin").length,
    };
  });

  const totalHadir = filtered.filter((r) => r.status === "hadir").length;
  const totalTerlambat = filtered.filter((r) => r.status === "terlambat").length;
  const totalIzin = filtered.filter((r) => r.status === "izin").length;
  const totalSakit = filtered.filter((r) => r.status === "sakit").length;
  const totalAlpha = filtered.filter((r) => r.status === "alpha").length;
  const totalWorkHours = filtered.reduce((acc, r) => acc + (r.workHours || 0), 0);

  const handleExport = (type: string) => {
    if (type === "Excel (.xlsx)") {
      const csvContent = "data:text/csv;charset=utf-8," + encodeURIComponent(createAttendanceCsv(filtered));
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `Laporan_Absensi_MCC_${filterMonth}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
    setExportSuccess(`✅ File ${type.includes("Excel") ? "CSV" : type} berhasil diekspor!`);
    setTimeout(() => setExportSuccess(""), 3000);
  };

  const monthName = new Date(filterMonth + "-01").toLocaleDateString("id-ID", { month: "long", year: "numeric" });

  return (
    <div className="p-4 lg:p-6 space-y-5">
      {/* Success Toast */}
      {exportSuccess && (
        <div className="fixed top-4 right-4 z-50 bg-green-600 text-white px-5 py-3 rounded-xl shadow-lg text-sm font-medium">
          {exportSuccess}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Laporan & Export</h2>
          <p className="text-sm text-gray-500 mt-0.5">Rekap data kehadiran karyawan</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => handleExport("Excel (.xlsx)")}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-all shadow-sm"
          >
            <Download className="w-4 h-4" />
            Export Excel
          </button>
          <button
            onClick={() => handleExport("PDF (.pdf)")}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-all shadow-sm"
          >
            <FileText className="w-4 h-4" />
            Export PDF
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-400" />
          <input
            type="month"
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3263]/20"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={filterDept}
            onChange={(e) => setFilterDept(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none bg-white"
          >
            {DEPARTMENTS.map((d) => (
              <option key={d} value={d}>{d === "all" ? "Semua Departemen" : d}</option>
            ))}
          </select>
        </div>
        <div className="ml-auto flex items-center">
          <span className="text-sm text-gray-500">Laporan: <strong className="text-gray-800">{monthName}</strong></span>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {[
          { label: "Hadir", value: totalHadir, icon: CheckCircle2, textColor: "text-green-600", bgColor: "bg-green-50" },
          { label: "Terlambat", value: totalTerlambat, icon: Clock, textColor: "text-yellow-600", bgColor: "bg-yellow-50" },
          { label: "Izin", value: totalIzin, icon: FileText, textColor: "text-blue-600", bgColor: "bg-blue-50" },
          { label: "Sakit", value: totalSakit, icon: AlertTriangle, textColor: "text-purple-600", bgColor: "bg-purple-50" },
          { label: "Alpha", value: totalAlpha, icon: XCircle, textColor: "text-red-600", bgColor: "bg-red-50" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500">{s.label}</span>
              <div className={`${s.bgColor} p-1.5 rounded-lg`}>
                <s.icon className={`w-4 h-4 ${s.textColor}`} />
              </div>
            </div>
            <p className={`text-2xl font-bold ${s.textColor}`}>{s.value}</p>
            <p className="text-xs text-gray-400">total hari</p>
          </div>
        ))}
      </div>

      {/* Work Hours Banner */}
      <div className="bg-gradient-to-r from-[#1e3263] to-[#2d4a8c] rounded-xl p-4 text-white flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-5 h-5 text-orange-300" />
          <div>
            <p className="text-blue-200 text-xs">Total Jam Kerja Bulan Ini</p>
            <p className="font-bold text-xl">{totalWorkHours.toFixed(1)} jam</p>
          </div>
        </div>
        <div className="flex gap-6">
          <div>
            <p className="text-blue-200 text-xs">Total Record</p>
            <p className="font-bold">{filtered.length} data</p>
          </div>
          <div>
            <p className="text-blue-200 text-xs">Karyawan Tercatat</p>
            <p className="font-bold">{Object.keys(byEmployee).length} orang</p>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Line Chart Trend */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-semibold text-gray-800 mb-4">Tren Kehadiran Harian</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={trendData} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#9ca3af" }} />
              <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} />
              <Tooltip contentStyle={{ borderRadius: "12px", fontSize: 11 }} />
              <Line type="monotone" dataKey="Hadir" stroke="#22c55e" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Terlambat" stroke="#eab308" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Izin" stroke="#3b82f6" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Dept Bar Chart */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-semibold text-gray-800 mb-4">Kehadiran per Departemen</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={deptData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="dept" tick={{ fontSize: 9, fill: "#9ca3af" }} />
              <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} />
              <Tooltip contentStyle={{ borderRadius: "12px", fontSize: 11 }} />
              <Legend iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Hadir" fill="#22c55e" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Terlambat" fill="#eab308" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Izin" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Rekap Table per Karyawan */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-800">Rekap Per Karyawan</h3>
          <span className="text-xs text-gray-500">{employeeSummary.length} karyawan</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Karyawan</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Dept</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-green-600 uppercase">Hadir</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-yellow-600 uppercase">Terlambat</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-blue-600 uppercase">Izin</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-purple-600 uppercase">Sakit</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-red-600 uppercase">Alpha</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Jam Kerja</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {employeeSummary.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-10 text-center text-gray-400 text-sm">
                    Tidak ada data untuk filter yang dipilih
                  </td>
                </tr>
              ) : (
                employeeSummary.map((emp) => (
                  <tr key={emp.userId} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#1e3263] flex items-center justify-center text-white text-xs font-bold shrink-0">
                          {emp.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-800">{emp.name}</p>
                          <p className="text-xs text-gray-500">{emp.pos}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-600">{emp.dept}</td>
                    <td className="px-4 py-3.5 text-center">
                      <span className="px-2 py-0.5 bg-green-50 text-green-700 rounded-lg text-sm font-semibold">{emp.hadir}</span>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className="px-2 py-0.5 bg-yellow-50 text-yellow-700 rounded-lg text-sm font-semibold">{emp.terlambat}</span>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-lg text-sm font-semibold">{emp.izin}</span>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded-lg text-sm font-semibold">{emp.sakit}</span>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className="px-2 py-0.5 bg-red-50 text-red-700 rounded-lg text-sm font-semibold">{emp.alpha}</span>
                    </td>
                    <td className="px-4 py-3.5 text-center text-sm text-gray-700 font-medium">
                      {emp.totalHours.toFixed(1)}j
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
