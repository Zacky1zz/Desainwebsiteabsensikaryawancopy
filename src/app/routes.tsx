import { createBrowserRouter } from "react-router";
import { Root } from "./Root";
import { LoginPage } from "./pages/LoginPage";
import { EmployeeDashboard } from "./pages/EmployeeDashboard";
import { AttendanceHistory } from "./pages/AttendanceHistory";
import { AdminDashboard } from "./pages/AdminDashboard";
import { AdminEmployees } from "./pages/AdminEmployees";
import { AdminReports } from "./pages/AdminReports";
import { AdminLogs } from "./pages/AdminLogs";
import { NotFound } from "./pages/NotFound";

export const router = createBrowserRouter([
  {
    path: "/login",
    Component: LoginPage,
  },
  {
    path: "/",
    Component: Root,
    children: [
      { index: true, Component: EmployeeDashboard },
      { path: "history", Component: AttendanceHistory },
      { path: "admin", Component: AdminDashboard },
      { path: "admin/employees", Component: AdminEmployees },
      { path: "admin/reports", Component: AdminReports },
      { path: "admin/logs", Component: AdminLogs },
      { path: "*", Component: NotFound },
    ],
  },
]);
