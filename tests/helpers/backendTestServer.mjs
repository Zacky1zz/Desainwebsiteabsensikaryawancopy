// @vitest-environment node

import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

export async function startTestServer(testName) {
  const tempDir = await mkdtemp(join(tmpdir(), `mcc-${testName}-`));
  const previousEnv = {
    DATA_PATH: process.env.DATA_PATH,
    JWT_SECRET: process.env.JWT_SECRET,
    ADMIN_REGISTRATION_CODE: process.env.ADMIN_REGISTRATION_CODE,
    NODE_ENV: process.env.NODE_ENV,
  };

  process.env.DATA_PATH = join(tempDir, "data.json");
  process.env.JWT_SECRET = "mcc-vitest-secret";
  process.env.ADMIN_REGISTRATION_CODE = "MCC-TEST-ADMIN";
  process.env.NODE_ENV = "test";

  const moduleUrl = new URL("../../backend/server.mjs", import.meta.url);
  moduleUrl.searchParams.set("vitest-instance", `${testName}-${Date.now()}-${Math.random()}`);
  const { server } = await import(moduleUrl.href);

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });

  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}/api/v1`;

  async function request(path, { method = "GET", token, body, headers = {} } = {}) {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const payload = await response.json().catch(() => ({}));
    return { status: response.status, body: payload, headers: response.headers };
  }

  async function login(email = "admin@mcc.id", password = "admin123") {
    const result = await request("/auth/login", {
      method: "POST",
      body: { email, password },
    });
    if (result.status !== 200) {
      throw new Error(`Login fixture gagal: HTTP ${result.status} ${result.body.message || ""}`);
    }
    return result.body.data.accessToken;
  }

  return {
    baseUrl,
    request,
    login,
    async close() {
      await new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
      await rm(tempDir, { recursive: true, force: true });
      for (const [key, value] of Object.entries(previousEnv)) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    },
  };
}
