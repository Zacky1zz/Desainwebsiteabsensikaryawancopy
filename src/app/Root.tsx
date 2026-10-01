import { Outlet, Navigate, useNavigate, useLocation, Link } from "react-router";
import { useAuth } from "./context/AuthContext";
import { useState } from "react";
import {
  LayoutDashboard,
  ClockIcon,
  FileText,
  Users,
  BarChart3,
  ClipboardList,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Building2,
} from "lucide-react";

export function Root() {
  const { user, logout, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="w-8 h-8 border-4 border-[#1e3263]/30 border-t-[#1e3263] rounded-full animate-spin" /></div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const employeeNav = [
    { path: "/", icon: LayoutDashboard, label: "Dashboard" },
    { path: "/history", icon: ClockIcon, label: "Riwayat Absensi" },
  ];

  const adminNav = [
    { path: "/admin", icon: LayoutDashboard, label: "Dashboard Admin" },
    { path: "/admin/employees", icon: Users, label: "Kelola Karyawan" },
    { path: "/admin/reports", icon: BarChart3, label: "Laporan & Export" },
    { path: "/admin/logs", icon: ClipboardList, label: "Log Aktivitas" },
    { path: "/", icon: ClockIcon, label: "Portal Karyawan" },
  ];

  const navItems = user?.role === "admin" ? adminNav : employeeNav;

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#1e3263] text-white flex flex-col transform transition-transform duration-300 lg:translate-x-0 lg:static lg:inset-auto lg:z-auto ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-white/10">
          <div className="w-10 h-10 bg-orange-400 rounded-xl flex items-center justify-center shrink-0">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="font-bold text-sm leading-tight">MCC Absensi</p>
            <p className="text-[10px] text-blue-200">Malang Creative Center</p>
          </div>
        </div>

        {/* User Info */}
        <div className="px-4 py-4 border-b border-white/10">
          <div className="flex items-center gap-3 bg-white/10 rounded-xl p-3">
            <div className="w-9 h-9 rounded-full bg-orange-400 flex items-center justify-center shrink-0 text-white font-bold text-sm">
              {user?.name?.charAt(0)}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-semibold truncate">{user?.name}</p>
              <p className="text-xs text-blue-200 truncate">{user?.position}</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path + item.label}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm ${
                  isActive
                    ? "bg-orange-400 text-white shadow"
                    : "text-blue-100 hover:bg-white/10"
                }`}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="px-4 py-4 border-t border-white/10">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-red-300 hover:bg-red-500/20 transition-all"
          >
            <LogOut className="w-4 h-4" />
            Keluar
          </button>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="bg-white border-b border-gray-200 px-4 lg:px-6 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-sm font-semibold text-gray-800">
                Sistem Absensi Karyawan
              </h1>
              <p className="text-xs text-gray-500">Malang Creative Center</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden sm:block text-xs bg-blue-100 text-[#1e3263] px-3 py-1.5 rounded-full font-medium">
              {user?.role === "admin" ? "👑 Admin" : "👤 Karyawan"}
            </span>
            <span className="text-xs text-gray-500">
              {new Date().toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
            </span>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
