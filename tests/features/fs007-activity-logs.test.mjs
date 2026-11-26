// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { startTestServer } from "../helpers/backendTestServer.mjs";

let api;
let adminToken;
let employeeToken;
beforeAll(async () => {
  api = await startTestServer("fs007-activity-logs");
  adminToken = await api.login();
  employeeToken = await api.login("budi@mcc.id", "karyawan123");
});
afterAll(async () => { await api?.close(); });

describe("FS-007 Log Aktivitas", () => {
  it("mencatat aktivitas admin setelah membuat data karyawan", async () => {
    const created = await api.request("/employees", {
      method: "POST", token: adminToken,
      body: {
        email: "audit-target@mcc.id", password: "password123",
        employeeCode: "MCC-AUDIT", fullName: "Target Audit",
        department: "Operasional", position: "Staff",
      },
    });
    expect(created.status).toBe(201);

    const logs = await api.request("/audit-logs?limit=10", { token: adminToken });
    expect(logs.status).toBe(200);
    expect(logs.body.data[0]).toMatchObject({
      action: "created", targetType: "employee", targetName: "Target Audit",
    });
  });

  it("membatasi akses log aktivitas hanya untuk admin", async () => {
    const result = await api.request("/audit-logs", { token: employeeToken });
    expect(result.status).toBe(403);
  });
});
