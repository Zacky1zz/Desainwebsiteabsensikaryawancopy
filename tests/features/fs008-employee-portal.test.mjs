// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { startTestServer } from "../helpers/backendTestServer.mjs";

let api;
let employeeToken;
let adminToken;

beforeEach(async () => {
  api = await startTestServer("fs008-employee-portal");
  employeeToken = await api.login("budi@mcc.id", "karyawan123");
  adminToken = await api.login();
});
afterEach(async () => { await api?.close(); });

describe("FS-008 Portal Karyawan", () => {
  it("menolak check-out sebelum check-in", async () => {
    const result = await api.request("/attendance/check-out", {
      method: "POST", token: employeeToken, body: {},
    });
    expect(result.status).toBe(400);
  });

  it("mencatat check-in, menolak duplikasi, lalu menerima check-out", async () => {
    const checkIn = await api.request("/attendance/check-in", {
      method: "POST", token: employeeToken, body: {},
    });
    const duplicate = await api.request("/attendance/check-in", {
      method: "POST", token: employeeToken, body: {},
    });
    const checkOut = await api.request("/attendance/check-out", {
      method: "POST", token: employeeToken, body: {},
    });
    expect(checkIn.status).toBe(200);
    expect(checkIn.body.data.checkInTime).toBeTruthy();
    expect(duplicate.status).toBe(409);
    expect(checkOut.status).toBe(200);
    expect(checkOut.body.data.checkOutTime).toBeTruthy();
  });

  it("menolak aksi presensi dari akun admin", async () => {
    const result = await api.request("/attendance/check-in", {
      method: "POST", token: adminToken, body: {},
    });
    expect(result.status).toBe(403);
  });

  it("mengizinkan karyawan mengajukan izin atau sakit", async () => {
    const result = await api.request("/attendance/leave", {
      method: "POST", token: employeeToken,
      body: { type: "sakit", notes: "Demam" },
    });
    expect(result.status).toBe(200);
    expect(result.body.data.status).toBe("sakit");
    expect(result.body.data.notes).toBe("Demam");
  });

  it("menolak jenis pengajuan izin yang tidak dikenal", async () => {
    const result = await api.request("/attendance/leave", {
      method: "POST", token: employeeToken,
      body: { type: "cuti", notes: "Alasan" },
    });
    expect(result.status).toBe(400);
  });
});
