// @vitest-environment node

import { createHmac } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const cryptoSpies = vi.hoisted(() => ({
  timingSafeEqual: vi.fn(),
}));

vi.mock("node:crypto", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    timingSafeEqual(...args) {
      cryptoSpies.timingSafeEqual(...args);
      return actual.timingSafeEqual(...args);
    },
  };
});

const originalDataPath = process.env.DATA_PATH;
const originalJwtSecret = process.env.JWT_SECRET;
const testDataDirectory = await mkdtemp(join(tmpdir(), "mcc-auth-test-"));
process.env.DATA_PATH = join(testDataDirectory, "data.json");
const secret = "mcc-auth-unit-test-secret";
process.env.JWT_SECRET = secret;

const now = Date.UTC(2025, 0, 1, 12, 0, 0);
const activeUser = { id: "u1", isActive: true, email: "active@mcc.id" };
const inactiveUser = { id: "u2", isActive: false, email: "inactive@mcc.id" };
await writeFile(
  process.env.DATA_PATH,
  JSON.stringify({ users: [activeUser, inactiveUser], employees: [], attendance: [] }),
);
const { getAuthenticatedUser } = await import("../../backend/server.mjs");

function createRequest(authorization) {
  return {
    headers: authorization === undefined ? {} : { authorization },
  };
}

function createToken(claims, payloadOverride) {
  const payload = Buffer.from(payloadOverride ?? JSON.stringify(claims)).toString("base64url");
  const signature = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

function expectUnauthorized(request, expectedMessage = "Token tidak valid") {
  let error;
  try {
    getAuthenticatedUser(request);
  } catch (caught) {
    error = caught;
  }
  expect(error).toMatchObject({ status: 401, message: expectedMessage });
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(now);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

afterAll(async () => {
  if (originalDataPath === undefined) {
    delete process.env.DATA_PATH;
  } else {
    process.env.DATA_PATH = originalDataPath;
  }
  if (originalJwtSecret === undefined) {
    delete process.env.JWT_SECRET;
  } else {
    process.env.JWT_SECRET = originalJwtSecret;
  }
  await rm(testDataDirectory, { recursive: true, force: true });
});

describe("getAuthenticatedUser()", () => {
  it("rejects a missing Authorization header", () => {
    const requestStub = createRequest();

    expectUnauthorized(requestStub);
  });

  it("rejects a non-Bearer authorization scheme", () => {
    const requestStub = createRequest("Basic abc.def");

    expectUnauthorized(requestStub);
  });

  it("rejects a Bearer value without a payload and signature", () => {
    const requestStub = createRequest("Bearer malformed");

    expectUnauthorized(requestStub);
  });

  it("rejects a signature that has the wrong length", () => {
    const token = createToken({ sub: activeUser.id, exp: now / 1000 + 60 });
    const requestStub = createRequest(`Bearer ${token.split(".")[0]}.short`);

    expectUnauthorized(requestStub);
  });

  it("rejects a same-length signature with an invalid HMAC", () => {
    const [payload, signature] = createToken({
      sub: activeUser.id,
      exp: now / 1000 + 60,
    }).split(".");
    const tamperedSignature = `${signature[0] === "A" ? "B" : "A"}${signature.slice(1)}`;
    const requestStub = createRequest(`Bearer ${payload}.${tamperedSignature}`);

    expectUnauthorized(requestStub);
  });

  it("rejects a correctly signed payload that is not valid JSON", () => {
    const token = createToken({}, "not-json");
    const requestStub = createRequest(`Bearer ${token}`);

    expectUnauthorized(requestStub);
  });

  it("rejects an expired token", () => {
    const token = createToken({ sub: activeUser.id, exp: now / 1000 - 60 });
    const requestStub = createRequest(`Bearer ${token}`);

    expectUnauthorized(requestStub, "Sesi sudah kedaluwarsa");
  });

  it("rejects a valid token for a user that does not exist", () => {
    const token = createToken({ sub: "missing-user", exp: now / 1000 + 60 });
    const requestStub = createRequest(`Bearer ${token}`);

    expectUnauthorized(
      requestStub,
      "Akun tidak ditemukan atau sudah nonaktif",
    );
  });

  it("rejects a valid token for an inactive user", () => {
    const token = createToken({ sub: inactiveUser.id, exp: now / 1000 + 60 });
    const requestStub = createRequest(`Bearer ${token}`);

    expectUnauthorized(
      requestStub,
      "Akun tidak ditemukan atau sudah nonaktif",
    );
  });

  it("returns the active user for a valid Bearer token", () => {
    const token = createToken({ sub: activeUser.id, exp: now / 1000 + 60 });
    const requestStub = createRequest(`Bearer ${token}`);
    cryptoSpies.timingSafeEqual.mockClear();
    const result = getAuthenticatedUser(requestStub);

    expect(result).toEqual(activeUser);
    expect(cryptoSpies.timingSafeEqual).toHaveBeenCalledOnce();
  });
});
