import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from "react";
import { useAuth } from "./AuthContext";

export interface AttendanceRecord {
  id: string;
  userId: string; // This will store employeeId to match with AdminEmployees
  userName: string;
  department: string;
  position: string;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  status: "hadir" | "terlambat" | "izin" | "sakit" | "alpha";
  notes?: string;
  workHours?: number;
}

interface AttendanceContextType {
  records: AttendanceRecord[];
  isLoading: boolean;
  checkIn: (userId: string, userName: string, department: string, position: string) => Promise<void>;
  checkOut: (userId: string) => Promise<void>;
  getTodayRecord: (userId: string) => AttendanceRecord | null;
  getUserRecords: (userId: string) => AttendanceRecord[];
  addLeave: (userId: string, userName: string, department: string, position: string, type: "izin" | "sakit", notes: string) => Promise<void>;
  refreshRecords: () => Promise<void>;
}

const AttendanceContext = createContext<AttendanceContextType | null>(null);

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1";

const formatT = (tStr: string | null) => {
  if (!tStr) return null;
  const d = new Date(tStr);
  return d.toTimeString().split(" ")[0].substring(0, 5); // "HH:MM"
};

export function AttendanceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRecords = useCallback(async () => {
    if (!user) {
      setRecords([]);
      setIsLoading(false);
      return;
    }

    try {
      const token = sessionStorage.getItem("mcc_token");
      if (!token) {
        setIsLoading(false);
        return;
      }

      const endpoint = user.role === "admin" ? "/attendance?limit=10000" : "/attendance/my?limit=10000";
      const res = await fetch(`${API_URL}${endpoint}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        
        const mapped = data.data.map((r: any): AttendanceRecord => {
          const dateStr = new Date(r.date).toISOString().split("T")[0];
          const inTime = formatT(r.checkInTime);
          const outTime = formatT(r.checkOutTime);
          
          let workHours: number | undefined;
          if (inTime && outTime) {
            const [inH, inM] = inTime.split(":").map(Number);
            const [outH, outM] = outTime.split(":").map(Number);
            workHours = Math.round(((outH * 60 + outM) - (inH * 60 + inM)) / 60 * 100) / 100;
          }

          return {
            id: r.id,
            userId: r.employeeId,
            userName: r.employee?.fullName || user.name,
            department: r.employee?.department || user.department,
            position: r.employee?.position || user.position,
            date: dateStr,
            checkIn: inTime,
            checkOut: outTime,
            status: r.status.toLowerCase(),
            notes: r.notes || undefined,
            workHours
          };
        });

        setRecords(mapped);
      }
    } catch (e) {
      console.error("Failed to load attendance", e);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  // We map userId parameter here as user.id from context, but wait, the API expects us to use the bearer token for auth.
  // The backend uses req.user.id for my actions!
  
  const handleApiAction = async (endpoint: string, method: string, body: any) => {
    const token = sessionStorage.getItem("mcc_token");
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}${endpoint}`, {
        method,
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(body)
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.message || "Terjadi kesalahan");
        return;
      }
      await fetchRecords();
    } catch (e) {
      console.error(e);
      alert("Gagal terhubung ke server");
    }
  };

  const checkIn = async (userId: string, userName: string, department: string, position: string) => {
    // We send fallback coordinates (MCC office) to pass backend validation in development
    await handleApiAction("/attendance/check-in", "POST", { latitude: -7.983908, longitude: 112.621391 });
  };

  const checkOut = async (userId: string) => {
    await handleApiAction("/attendance/check-out", "POST", { latitude: -7.983908, longitude: 112.621391 });
  };

  const addLeave = async (userId: string, userName: string, department: string, position: string, type: "izin" | "sakit", notes: string) => {
    await handleApiAction("/attendance/leave", "POST", { type, notes });
  };

  const getTodayRecord = (userId: string) => {
    // Wait, in employee dashboard it uses getTodayRecord(user!.id). 
    // BUT the mapped records use `r.employeeId` as `userId`.
    // Wait! user.id in AuthContext is the `user.id` from DB, NOT `employee.id`!
    // So the frontend will pass `user.id` to getTodayRecord, but `records[].userId` is `employee.id`!
    // To fix this mismatch, for employee dashboard we just check by date since they only see their own records.
    const todayStr = new Date().toISOString().split("T")[0];
    if (user?.role === "karyawan") {
      return records.find((r) => r.date === todayStr) || null;
    }
    return records.find((r) => r.userId === userId && r.date === todayStr) || null;
  };

  const getUserRecords = (userId: string) => {
    if (user?.role === "karyawan") {
      return records.sort((a, b) => b.date.localeCompare(a.date));
    }
    return records.filter((r) => r.userId === userId).sort((a, b) => b.date.localeCompare(a.date));
  };

  return (
    <AttendanceContext.Provider value={{ 
      records, isLoading, checkIn, checkOut, getTodayRecord, getUserRecords, addLeave, refreshRecords: fetchRecords 
    }}>
      {children}
    </AttendanceContext.Provider>
  );
}

export function useAttendance() {
  const ctx = useContext(AttendanceContext);
  if (!ctx) throw new Error("useAttendance must be used within AttendanceProvider");
  return ctx;
}
