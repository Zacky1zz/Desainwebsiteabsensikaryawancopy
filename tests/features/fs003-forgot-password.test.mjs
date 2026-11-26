// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { startTestServer } from "../helpers/backendTestServer.mjs";

let api;
beforeAll(async () => { api = await startTestServer("fs003-forgot-password"); });
afterAll(async () => { await api?.close(); });

describe("FS-003 Lupa Password", () => {
  it("menghasilkan token reset untuk email yang terdaftar", async () => {
    const result = await api.request("/auth/forgot-password", {
      method: "POST", body: { email: "budi@mcc.id" },
    });
    expect(result.status).toBe(200);
    expect(result.body.data.resetToken).toBeTruthy();
    expect(result.body.data.expiresInMinutes).toBe(15);
  });

  it("tidak membocorkan keberadaan akun untuk email yang tidak terdaftar", async () => {
    const result = await api.request("/auth/forgot-password", {
      method: "POST", body: { email: "tidakada@mcc.id" },
    });
    expect(result.status).toBe(200);
    expect(result.body.data.resetToken).toBeUndefined();
  });

  it("mereset password dan mengizinkan login dengan password baru", async () => {
    const requested = await api.request("/auth/forgot-password", {
      method: "POST", body: { email: "budi@mcc.id" },
    });
    const reset = await api.request("/auth/reset-password", {
      method: "POST", body: { token: requested.body.data.resetToken, password: "passwordBaru123" },
    });
    const login = await api.request("/auth/login", {
      method: "POST", body: { email: "budi@mcc.id", password: "passwordBaru123" },
    });
    expect(reset.status).toBe(200);
    expect(login.status).toBe(200);
  });

  it("menolak token reset yang tidak valid", async () => {
    const result = await api.request("/auth/reset-password", {
      method: "POST", body: { token: "token-palsu", password: "passwordBaru123" },
    });
    expect(result.status).toBe(400);
  });
});
