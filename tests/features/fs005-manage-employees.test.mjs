// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { startTestServer } from "../helpers/backendTestServer.mjs";

let api;
let adminToken;
beforeAll(async () => {
  api = await startTestServer("fs005-employees");
  adminToken = await api.login();
});
afterAll(async () => { await api?.close(); });

describe("FS-005 Kelola Karyawan", () => {
  it("membuat data karyawan baru", async () => {
    const created = await api.request("/employees", {
      method: "POST", token: adminToken,
      body: {
        email: "pegawai.baru@mcc.id", password: "password123",
        employeeCode: "MCC-TEST-05", fullName: "Pegawai Uji",
        department: "IT", position: "QA Tester", phone: "0811111111",
      },
    });
    expect(created.status).toBe(201);
    expect(created.body.data.fullName).toBe("Pegawai Uji");
    expect(created.body.data.user.email).toBe("pegawai.baru@mcc.id");
  });

  it("mengubah data karyawan yang sudah ada", async () => {
    const list = await api.request("/employees", { token: adminToken });
    const employee = list.body.data[0];
    const updated = await api.request(`/employees/${employee.id}`, {
      method: "PUT", token: adminToken,
      body: { fullName: "Budi Santoso Revisi", department: "IT" },
    });
    expect(updated.status).toBe(200);
    expect(updated.body.data.fullName).toBe("Budi Santoso Revisi");
    expect(updated.body.data.department).toBe("IT");
  });

  it("menghapus data karyawan dan menolak ID yang tidak ditemukan", async () => {
    const created = await api.request("/employees", {
      method: "POST", token: adminToken,
      body: {
        email: "hapus@mcc.id", password: "password123",
        employeeCode: "MCC-DELETE", fullName: "Hapus Saya",
        department: "IT", position: "Tester",
      },
    });
    const deleted = await api.request(`/employees/${created.body.data.id}`, {
      method: "DELETE", token: adminToken,
    });
    const missing = await api.request(`/employees/${created.body.data.id}`, {
      method: "DELETE", token: adminToken,
    });
    expect(deleted.status).toBe(200);
    expect(missing.status).toBe(404);
  });
});
