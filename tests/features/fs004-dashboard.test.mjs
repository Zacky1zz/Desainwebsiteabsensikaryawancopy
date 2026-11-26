// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { startTestServer } from "../helpers/backendTestServer.mjs";

let api;
let adminToken;
let employeeToken;
beforeAll(async () => {
  api = await startTestServer("fs004-dashboard");
  adminToken = await api.login();
  employeeToken = await api.login("budi@mcc.id", "karyawan123");
});
afterAll(async () => { await api?.close(); });

describe("FS-004 Dashboard Admin", () => {
  it("memuat ringkasan daftar karyawan untuk dashboard admin", async () => {
    const result = await api.request("/employees?limit=1", { token: adminToken });
    expect(result.status).toBe(200);
    expect(result.body.data).toHaveLength(1);
    expect(result.body.pagination.total).toBeGreaterThanOrEqual(1);
  });

  it("memuat data absensi untuk pemantauan admin", async () => {
    const result = await api.request("/attendance?limit=10000", { token: adminToken });
    expect(result.status).toBe(200);
    expect(Array.isArray(result.body.data)).toBe(true);
  });

  it("menolak karyawan yang mencoba mengakses data dashboard admin", async () => {
    const result = await api.request("/employees", { token: employeeToken });
    expect(result.status).toBe(403);
  });
});
