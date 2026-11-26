import { describe, expect, it } from "vitest";
import {
  createAttendanceCsv,
  filterReportRecords,
  groupRecordsByEmployee,
  summarizeEmployeeRecords,
  type ReportAttendanceRecord,
} from "../../src/app/utils/reportUtils";

const sampleRecords: ReportAttendanceRecord[] = [
  { userId: "u1", userName: "Budi", department: "IT", position: "QA", date: "2026-11-01", checkIn: "08:00", checkOut: "17:00", status: "hadir", workHours: 9 },
  { userId: "u1", userName: "Budi", department: "IT", position: "QA", date: "2026-11-02", checkIn: "08:10", checkOut: "17:00", status: "terlambat", workHours: 8.8 },
  { userId: "u2", userName: "Siti", department: "HR", position: "Staff", date: "2026-10-01", checkIn: null, checkOut: null, status: "izin", workHours: 0 },
];

describe("FS-006 Laporan & Export", () => {
  it("memfilter laporan berdasarkan bulan dan departemen", () => {
    const filtered = filterReportRecords(sampleRecords, "IT", "2026-11");
    expect(filtered).toHaveLength(2);
    expect(filtered.every((record) => record.department === "IT" && record.date.startsWith("2026-11"))).toBe(true);
  });

  it("mengelompokkan dan menghitung rekap kehadiran per karyawan", () => {
    const groups = groupRecordsByEmployee(sampleRecords);
    const summary = summarizeEmployeeRecords(sampleRecords);
    expect(Object.keys(groups)).toHaveLength(2);
    expect(summary.find((item) => item.userId === "u1")).toMatchObject({
      name: "Budi", hadir: 1, terlambat: 1, total: 2, totalHours: 17.8,
    });
  });

  it("membuat isi CSV dengan header dan mengamankan tanda kutip", () => {
    const csv = createAttendanceCsv([
      { ...sampleRecords[0], userName: 'Budi "QA"' },
    ]);
    expect(csv).toContain('"Nama","Departemen","Posisi"');
    expect(csv).toContain('"Budi ""QA"""');
    expect(csv).toContain('"2026-11-01"');
  });
});
