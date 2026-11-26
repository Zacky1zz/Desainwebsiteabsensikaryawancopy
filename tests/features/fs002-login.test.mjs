// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { startTestServer } from "../helpers/backendTestServer.mjs";

let api;
beforeAll(async () => { api = await startTestServer("fs002-login"); });
afterAll(async () => { await api?.close(); });

describe("FS-002 Login", () => {
  it("menerima kredensial admin yang benar dan menghasilkan token", async () => {
    const result = await api.request("/auth/login", {
      method: "POST", body: { email: "admin@mcc.id", password: "admin123" },
    });
    expect(result.status).toBe(200);
    expect(result.body.data.accessToken).toBeTruthy();
    expect(result.body.data.user.role).toBe("admin");
  });

  it("menolak password yang salah", async () => {
    const result = await api.request("/auth/login", {
      method: "POST", body: { email: "admin@mcc.id", password: "salah123" },
    });
    expect(result.status).toBe(401);
  });

  it("menolak kredensial yang kosong", async () => {
    const result = await api.request("/auth/login", { method: "POST", body: { email: "", password: "" } });
    expect(result.status).toBe(400);
  });

  it("mengembalikan profil untuk token valid dan menolak akses tanpa token", async () => {
    const token = await api.login();
    const profile = await api.request("/auth/me", { token });
    const denied = await api.request("/auth/me");
    expect(profile.status).toBe(200);
    expect(profile.body.data.email).toBe("admin@mcc.id");
    expect(denied.status).toBe(401);
  });
});
