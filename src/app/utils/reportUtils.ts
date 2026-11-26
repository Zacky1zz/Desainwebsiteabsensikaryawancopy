export interface ReportAttendanceRecord {
  userId: string;
  userName: string;
  department: string;
  position: string;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  status: string;
  workHours?: number;
}

export function filterReportRecords(
  records: ReportAttendanceRecord[],
  department: string,
  month: string,
): ReportAttendanceRecord[] {
  return records.filter((record) => {
    const matchesDepartment = department === "all" || record.department === department;
    const matchesMonth = record.date.startsWith(month);
    return matchesDepartment && matchesMonth;
  });
}

export function groupRecordsByEmployee(records: ReportAttendanceRecord[]) {
  return records.reduce<Record<string, ReportAttendanceRecord[]>>((groups, record) => {
    if (!groups[record.userId]) groups[record.userId] = [];
    groups[record.userId].push(record);
    return groups;
  }, {});
}

export function summarizeEmployeeRecords(records: ReportAttendanceRecord[]) {
  return Object.entries(groupRecordsByEmployee(records)).map(([userId, employeeRecords]) => ({
    userId,
    name: employeeRecords[0].userName,
    dept: employeeRecords[0].department,
    pos: employeeRecords[0].position,
    hadir: employeeRecords.filter((record) => record.status === "hadir").length,
    terlambat: employeeRecords.filter((record) => record.status === "terlambat").length,
    izin: employeeRecords.filter((record) => record.status === "izin").length,
    sakit: employeeRecords.filter((record) => record.status === "sakit").length,
    alpha: employeeRecords.filter((record) => record.status === "alpha").length,
    totalHours: employeeRecords.reduce((total, record) => total + (record.workHours || 0), 0),
    total: employeeRecords.length,
  }));
}

export function createAttendanceCsv(records: ReportAttendanceRecord[]): string {
  const headers = ["Nama", "Departemen", "Posisi", "Tanggal", "Check In", "Check Out", "Status", "Total Jam Kerja"];
  const escapeCsv = (value: unknown) => `"${String(value ?? "-").replaceAll('"', '""')}"`;
  const rows = records.map((record) => [
    record.userName,
    record.department,
    record.position,
    record.date,
    record.checkIn || "-",
    record.checkOut || "-",
    record.status,
    record.workHours || 0,
  ].map(escapeCsv).join(","));
  return [headers.map(escapeCsv).join(","), ...rows].join("\n");
}
