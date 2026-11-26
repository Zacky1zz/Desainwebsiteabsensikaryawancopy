// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { startTestServer } from "../helpers/backendTestServer.mjs";

let api;
beforeAll(async () => { api = await startTestServer("fs001-register"); });
afterAll(async () => { await api?.close(); });

describe("FS-001 Register", () => {
  it("mendaftarkan akun karyawan dan mengembalikan access token", async () => {
    const result = await api.request("/auth/register", {
      method: "POST",
      body: {
        role: "karyawan", fullName: "Siti Aminah", email: "siti@mcc.id",
        password: "password123", department: "IT", position: "Developer", phone: "08123456789",
      },
    });
    expect(result.status).toBe(201);
    expect(result.body.data.accessToken).toBeTruthy();
    expect(result.body.data.user.email).toBe("siti@mcc.id");
    expect(result.body.data.user.role).toBe("karyawan");
  });

  it("menolak pendaftaran dengan email yang sudah digunakan", async () => {
    const body = {
      role: "karyawan", fullName: "Siti Aminah", email: "siti@mcc.id",
      password: "password123", department: "IT", position: "Developer",
    };
    await api.request("/auth/register", { method: "POST", body });
    const duplicate = await api.request("/auth/register", { method: "POST", body });
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.message).toMatch(/Email sudah digunakan/i);
  });


  it("mendaftarkan akun admin jika kode undangan valid", async () => {
    const result = await api.request("/auth/register", {
      method: "POST",
      body: {
        role: "admin", fullName: "Admin Uji", email: "admin.uji@mcc.id",
        password: "password123", inviteCode: "MCC-TEST-ADMIN",
      },
    });
    expect(result.status).toBe(201);
    expect(result.body.data.user.role).toBe("admin");
    expect(result.body.data.accessToken).toBeTruthy();
  });

  it("menolak pendaftaran admin dengan kode undangan yang salah", async () => {
    const result = await api.request("/auth/register", {
      method: "POST",
      body: {
        role: "admin", fullName: "Admin Baru", email: "admin2@mcc.id",
        password: "password123", inviteCode: "SALAH",
      },
    });
    expect(result.status).toBe(403);
  });
});
