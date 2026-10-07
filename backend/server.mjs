import { createHmac, randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { createServer } from "node:http";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const PORT = Number(process.env.PORT || 5000);
const API_PREFIX = "/api/v1";
const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";
const DATA_PATH = process.env.DATA_PATH || join(dirname(fileURLToPath(import.meta.url)), "data.json");
const JWT_SECRET = process.env.JWT_SECRET || "mcc-absensi-development-secret-change-before-deploy";
const ADMIN_REGISTRATION_CODE = process.env.ADMIN_REGISTRATION_CODE;
const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7;
const PASSWORD_RESET_TTL_MS = 15 * 60 * 1000;
const passwordResetTokens = new Map();

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const hashPassword = (password, salt = randomBytes(16).toString("hex")) => {
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
};

const verifyPassword = (password, storedHash) => {
  const [salt, hash] = storedHash.split(":");
  const candidate = scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
};

const createSeedStore = () => {
  const adminId = randomUUID();
  const employeeUserId = randomUUID();
  const employeeId = randomUUID();
  const now = new Date().toISOString();

  return {
    users: [
      {
        id: adminId,
        email: "admin@mcc.id",
        passwordHash: hashPassword("admin123"),
        role: "admin",
        isActive: true,
        employeeId: null,
      },
      {
        id: employeeUserId,
        email: "budi@mcc.id",
        passwordHash: hashPassword("karyawan123"),
        role: "karyawan",
        isActive: true,
        employeeId,
      },
    ],
    employees: [
      {
        id: employeeId,
        userId: employeeUserId,
        employeeCode: "MCC0001",
        fullName: "Budi Santoso",
        department: "Operasional",
        position: "Karyawan",
        phone: "081234567890",
        joinDate: now,
        avatarUrl: null,
      },
    ],
    attendance: [],
  };
};

await mkdir(dirname(DATA_PATH), { recursive: true });
let store;
try {
  store = JSON.parse(await readFile(DATA_PATH, "utf8"));
} catch (error) {
  if (error.code !== "ENOENT") throw error;
  store = createSeedStore();
  await writeFile(DATA_PATH, JSON.stringify(store, null, 2));
}
store.auditLogs ??= [];

let writeQueue = Promise.resolve();
const saveStore = () => {
  const snapshot = JSON.stringify(store, null, 2);
  writeQueue = writeQueue.then(async () => {
    const temporaryPath = `${DATA_PATH}.tmp`;
    await writeFile(temporaryPath, snapshot);
    await rename(temporaryPath, DATA_PATH);
  });
  return writeQueue;
};

const employeeForUser = (user) => store.employees.find((employee) => employee.id === user.employeeId) || null;
const userForEmployee = (employee) => store.users.find((user) => user.id === employee.userId) || null;

const employeePayload = (employee) => {
  const user = userForEmployee(employee);
  return {
    id: employee.id,
    employeeCode: employee.employeeCode,
    fullName: employee.fullName,
    department: employee.department,
    position: employee.position,
    phone: employee.phone,
    joinDate: employee.joinDate,
    avatarUrl: employee.avatarUrl,
    user: user ? { id: user.id, email: user.email, isActive: user.isActive } : null,
  };
};

const profilePayload = (user) => {
  const employee = employeeForUser(user);
  return {
    id: user.id,
    email: user.email,
    role: { name: user.role },
    name: employee?.fullName || user.name || null,
    department: employee?.department || user.department || null,
    position: employee?.position || user.position || null,
    employee,
  };
};

const signToken = (user) => {
  const payload = Buffer.from(JSON.stringify({
    sub: user.id,
    exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS,
  })).toString("base64url");
  const signature = createHmac("sha256", JWT_SECRET).update(payload).digest("base64url");
  return `${payload}.${signature}`;
};

const getAuthenticatedUser = (request) => {
  const authorization = request.headers.authorization || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  const [payload, signature] = token.split(".");
  if (!payload || !signature) throw new HttpError(401, "Token tidak valid");

  const expected = createHmac("sha256", JWT_SECRET).update(payload).digest();
  let actual;
  try {
    actual = Buffer.from(signature, "base64url");
  } catch {
    throw new HttpError(401, "Token tidak valid");
  }
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    throw new HttpError(401, "Token tidak valid");
  }

  let claims;
  try {
    claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    throw new HttpError(401, "Token tidak valid");
  }
  if (claims.exp < Math.floor(Date.now() / 1000)) throw new HttpError(401, "Sesi sudah kedaluwarsa");

  const user = store.users.find((entry) => entry.id === claims.sub && entry.isActive);
  if (!user) throw new HttpError(401, "Akun tidak ditemukan atau sudah nonaktif");
  return user;
};

const requireAdmin = (user) => {
  if (user.role !== "admin") throw new HttpError(403, "Akses khusus admin");
};

const readJson = async (request) => {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 1_000_000) throw new HttpError(413, "Request terlalu besar");
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new HttpError(400, "Format JSON tidak valid");
  }
};

const sendJson = (response, status, body) => {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(body));
};

const requireText = (value, label) => {
  if (typeof value !== "string" || !value.trim()) throw new HttpError(400, `${label} wajib diisi`);
  return value.trim();
};

const attendancePayload = (record) => ({
  ...record,
  employee: store.employees.find((employee) => employee.id === record.employeeId) || null,
});

const recordAdminAudit = (user, action, employee, changes) => {
  store.auditLogs.unshift({
    id: randomUUID(),
    adminId: user.id,
    adminEmail: user.email,
    action,
    targetType: "employee",
    targetId: employee.id,
    targetName: employee.fullName,
    changes,
    createdAt: new Date().toISOString(),
  });
};

const server = createServer(async (request, response) => {
  response.setHeader("Access-Control-Allow-Origin", CORS_ORIGIN);
  response.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (request.method === "OPTIONS") {
    response.writeHead(204);
    response.end();
    return;
  }

  try {
    const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);
    const path = url.pathname.replace(/\/+$/, "") || "/";
    if (request.method === "GET" && path === `${API_PREFIX}/health`) {
      sendJson(response, 200, { data: { status: "ok" } });
      return;
    }

    if (request.method === "POST" && path === `${API_PREFIX}/auth/login`) {
      const body = await readJson(request);
      const email = requireText(body.email, "Email").toLowerCase();
      const password = requireText(body.password, "Password");
      const user = store.users.find((entry) => entry.email.toLowerCase() === email && entry.isActive);
      if (!user || !verifyPassword(password, user.passwordHash)) throw new HttpError(401, "Email atau password salah");
      sendJson(response, 200, { data: { accessToken: signToken(user), user: { ...profilePayload(user), role: user.role } } });
      return;
    }

    if (request.method === "POST" && path === `${API_PREFIX}/auth/register`) {
      const body = await readJson(request);
      const role = body.role;
      if (!["admin", "karyawan"].includes(role)) throw new HttpError(400, "Peran pendaftaran tidak valid");

      if (role === "admin") {
        if (!ADMIN_REGISTRATION_CODE) throw new HttpError(503, "Pendaftaran admin belum dikonfigurasi");
        const submittedCode = typeof body.inviteCode === "string" ? Buffer.from(body.inviteCode) : Buffer.alloc(0);
        const expectedCode = Buffer.from(ADMIN_REGISTRATION_CODE);
        if (
          submittedCode.length !== expectedCode.length ||
          !timingSafeEqual(submittedCode, expectedCode)
        ) {
          throw new HttpError(403, "Kode undangan admin tidak valid");
        }
      }

      const email = requireText(body.email, "Email").toLowerCase();
      const password = requireText(body.password, "Password");
      const fullName = requireText(body.fullName, "Nama lengkap");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, "Email tidak valid");
      if (password.length < 8) throw new HttpError(400, "Password minimal 8 karakter");
      if (store.users.some((entry) => entry.email.toLowerCase() === email)) {
        throw new HttpError(409, "Email sudah digunakan");
      }

      const user = {
        id: randomUUID(),
        email,
        passwordHash: hashPassword(password),
        role,
        isActive: true,
        employeeId: null,
        name: fullName,
        department: role === "admin" ? "Manajemen" : requireText(body.department, "Departemen"),
        position: role === "admin" ? "Administrator" : requireText(body.position, "Posisi"),
      };

      if (role === "karyawan") {
        const employeeId = randomUUID();
        let employeeCode;
        do {
          employeeCode = `MCC${randomBytes(4).toString("hex").toUpperCase()}`;
        } while (store.employees.some((employee) => employee.employeeCode === employeeCode));

        user.employeeId = employeeId;
        store.employees.push({
          id: employeeId,
          userId: user.id,
          employeeCode,
          fullName,
          department: user.department,
          position: user.position,
          phone: typeof body.phone === "string" && body.phone.trim() ? body.phone.trim() : "-",
          joinDate: new Date().toISOString(),
          avatarUrl: null,
        });
      }

      store.users.push(user);
      await saveStore();
      sendJson(response, 201, {
        data: { accessToken: signToken(user), user: { ...profilePayload(user), role: user.role } },
      });
      return;
    }

    if (request.method === "POST" && path === `${API_PREFIX}/auth/forgot-password`) {
      if (process.env.NODE_ENV === "production") {
        throw new HttpError(503, "Reset password belum dikonfigurasi. Hubungi administrator.");
      }
      const body = await readJson(request);
      const email = requireText(body.email, "Email").toLowerCase();
      const user = store.users.find((entry) => entry.email.toLowerCase() === email && entry.isActive);
      for (const [tokenHash, reset] of passwordResetTokens) {
        if (reset.expiresAt <= Date.now()) passwordResetTokens.delete(tokenHash);
      }

      const data = { message: "Jika email terdaftar, instruksi reset password akan tersedia." };
      if (user) {
        const resetToken = randomBytes(32).toString("hex");
        const tokenHash = createHmac("sha256", JWT_SECRET).update(resetToken).digest("hex");
        passwordResetTokens.set(tokenHash, { userId: user.id, expiresAt: Date.now() + PASSWORD_RESET_TTL_MS });
        data.resetToken = resetToken;
        data.expiresInMinutes = PASSWORD_RESET_TTL_MS / 60000;
      }
      sendJson(response, 200, { data });
      return;
    }

    if (request.method === "POST" && path === `${API_PREFIX}/auth/reset-password`) {
      if (process.env.NODE_ENV === "production") {
        throw new HttpError(503, "Reset password belum dikonfigurasi. Hubungi administrator.");
      }
      const body = await readJson(request);
      const resetToken = requireText(body.token, "Token reset");
      const password = requireText(body.password, "Password baru");
      if (password.length < 8) throw new HttpError(400, "Password baru minimal 8 karakter");

      const tokenHash = createHmac("sha256", JWT_SECRET).update(resetToken).digest("hex");
      const reset = passwordResetTokens.get(tokenHash);
      if (!reset || reset.expiresAt <= Date.now()) {
        passwordResetTokens.delete(tokenHash);
        throw new HttpError(400, "Token reset tidak valid atau sudah kedaluwarsa");
      }

      const user = store.users.find((entry) => entry.id === reset.userId && entry.isActive);
      if (!user) throw new HttpError(400, "Akun tidak ditemukan atau sudah nonaktif");
      user.passwordHash = hashPassword(password);
      for (const [activeTokenHash, activeReset] of passwordResetTokens) {
        if (activeReset.userId === user.id) passwordResetTokens.delete(activeTokenHash);
      }
      await saveStore();
      sendJson(response, 200, { data: { message: "Password berhasil diperbarui. Silakan masuk dengan password baru." } });
      return;
    }

    const user = getAuthenticatedUser(request);

    if (request.method === "GET" && path === `${API_PREFIX}/auth/me`) {
      sendJson(response, 200, { data: profilePayload(user) });
      return;
    }

    if (request.method === "GET" && path === `${API_PREFIX}/audit-logs`) {
      requireAdmin(user);
      const limit = Math.min(200, Math.max(1, Number.parseInt(url.searchParams.get("limit") || "100", 10)));
      const logs = store.auditLogs
        .slice()
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
        .slice(0, limit);
      sendJson(response, 200, { data: logs });
      return;
    }

    if (request.method === "GET" && path === `${API_PREFIX}/employees`) {
      requireAdmin(user);
      const page = Math.max(1, Number.parseInt(url.searchParams.get("page") || "1", 10));
      const limit = Math.min(1000, Math.max(1, Number.parseInt(url.searchParams.get("limit") || "20", 10)));
      const search = (url.searchParams.get("search") || "").toLowerCase();
      const department = url.searchParams.get("department");
      const employees = store.employees
        .filter((employee) => {
          const account = userForEmployee(employee);
          const matchesSearch = !search || [employee.fullName, employee.position, account?.email]
            .some((value) => value?.toLowerCase().includes(search));
          return account?.isActive && matchesSearch && (!department || employee.department === department);
        })
        .sort((left, right) => left.fullName.localeCompare(right.fullName));
      const start = (page - 1) * limit;
      sendJson(response, 200, {
        data: employees.slice(start, start + limit).map(employeePayload),
        pagination: { page, limit, total: employees.length, totalPages: Math.ceil(employees.length / limit) },
      });
      return;
    }

    if (request.method === "POST" && path === `${API_PREFIX}/employees`) {
      requireAdmin(user);
      const body = await readJson(request);
      const email = requireText(body.email, "Email").toLowerCase();
      const password = requireText(body.password, "Password");
      if (!email.includes("@")) throw new HttpError(400, "Email tidak valid");
      if (store.users.some((entry) => entry.email.toLowerCase() === email)) throw new HttpError(409, "Email sudah digunakan");

      const employeeId = randomUUID();
      const employeeUser = {
        id: randomUUID(),
        email,
        passwordHash: hashPassword(password),
        role: "karyawan",
        isActive: true,
        employeeId,
      };
      const employee = {
        id: employeeId,
        userId: employeeUser.id,
        employeeCode: requireText(body.employeeCode, "Kode karyawan"),
        fullName: requireText(body.fullName, "Nama lengkap"),
        department: requireText(body.department, "Departemen"),
        position: requireText(body.position, "Posisi"),
        phone: typeof body.phone === "string" ? body.phone.trim() : "-",
        joinDate: body.joinDate || new Date().toISOString(),
        avatarUrl: null,
      };
      store.users.push(employeeUser);
      store.employees.push(employee);
      recordAdminAudit(user, "created", employee, [
        { field: "Nama", before: null, after: employee.fullName },
        { field: "Email", before: null, after: employeeUser.email },
        { field: "Departemen", before: null, after: employee.department },
        { field: "Posisi", before: null, after: employee.position },
      ]);
      await saveStore();
      sendJson(response, 201, { data: employeePayload(employee) });
      return;
    }

    const employeeMatch = path.match(new RegExp(`^${API_PREFIX}/employees/([^/]+)$`));
    if (employeeMatch && ["PUT", "DELETE"].includes(request.method)) {
      requireAdmin(user);
      const employee = store.employees.find((entry) => entry.id === decodeURIComponent(employeeMatch[1]));
      if (!employee) throw new HttpError(404, "Karyawan tidak ditemukan");

      if (request.method === "PUT") {
        const body = await readJson(request);
        const changes = [];
        const fieldLabels = { fullName: "Nama", department: "Departemen", position: "Posisi", phone: "Telepon" };
        for (const field of ["fullName", "department", "position", "phone"]) {
          if (typeof body[field] === "string" && employee[field] !== body[field].trim()) {
            changes.push({ field: fieldLabels[field], before: employee[field], after: body[field].trim() });
            employee[field] = body[field].trim();
          }
        }
        if (changes.length) {
          recordAdminAudit(user, "updated", employee, changes);
          await saveStore();
        }
        sendJson(response, 200, { data: employeePayload(employee) });
        return;
      }

      recordAdminAudit(user, "deleted", employee, [
        { field: "Nama", before: employee.fullName, after: null },
        { field: "Email", before: userForEmployee(employee)?.email || "", after: null },
        { field: "Departemen", before: employee.department, after: null },
        { field: "Posisi", before: employee.position, after: null },
      ]);
      store.employees = store.employees.filter((entry) => entry.id !== employee.id);
      store.users = store.users.filter((entry) => entry.id !== employee.userId);
      store.attendance = store.attendance.filter((entry) => entry.employeeId !== employee.id);
      await saveStore();
      sendJson(response, 200, { data: { id: employee.id } });
      return;
    }

    if (request.method === "GET" && ["/attendance", "/attendance/my"].some((suffix) => path === `${API_PREFIX}${suffix}`)) {
      const mineOnly = path.endsWith("/my");
      if (!mineOnly) requireAdmin(user);
      const employee = employeeForUser(user);
      const records = store.attendance
        .filter((record) => !mineOnly || record.employeeId === employee?.id)
        .sort((left, right) => right.date.localeCompare(left.date) || (right.checkInTime || "").localeCompare(left.checkInTime || ""));
      const limit = Math.min(10000, Math.max(1, Number.parseInt(url.searchParams.get("limit") || "100", 10)));
      sendJson(response, 200, { data: records.slice(0, limit).map(attendancePayload) });
      return;
    }

    const attendanceAction = path.match(new RegExp(`^${API_PREFIX}/attendance/(check-in|check-out|leave)$`));
    if (request.method === "POST" && attendanceAction) {
      if (user.role !== "karyawan") throw new HttpError(403, "Aksi absensi hanya untuk karyawan");
      const employee = employeeForUser(user);
      if (!employee) throw new HttpError(400, "Akun belum terhubung ke data karyawan");
      const action = attendanceAction[1];
      const body = await readJson(request);
      const date = new Date().toISOString().slice(0, 10);
      let record = store.attendance.find((entry) => entry.employeeId === employee.id && entry.date === date);

      if (action === "check-in") {
        if (record) throw new HttpError(409, "Absensi hari ini sudah tercatat");
        const now = new Date();
        record = {
          id: randomUUID(),
          employeeId: employee.id,
          date,
          checkInTime: now.toISOString(),
          checkOutTime: null,
          status: now.getHours() > 8 || (now.getHours() === 8 && now.getMinutes() > 0) ? "terlambat" : "hadir",
          notes: null,
        };
      } else if (action === "check-out") {
        if (!record?.checkInTime) throw new HttpError(400, "Silakan check-in terlebih dahulu");
        if (record.checkOutTime) throw new HttpError(409, "Check-out hari ini sudah tercatat");
        record.checkOutTime = new Date().toISOString();
      } else {
        const type = body.type;
        if (!["izin", "sakit"].includes(type)) throw new HttpError(400, "Jenis pengajuan tidak valid");
        if (record) throw new HttpError(409, "Absensi hari ini sudah tercatat");
        record = {
          id: randomUUID(),
          employeeId: employee.id,
          date,
          checkInTime: null,
          checkOutTime: null,
          status: type,
          notes: typeof body.notes === "string" ? body.notes.trim() : "",
        };
      }

      if (!store.attendance.some((entry) => entry.id === record.id)) store.attendance.push(record);
      await saveStore();
      sendJson(response, 200, { data: attendancePayload(record) });
      return;
    }

    throw new HttpError(404, "Endpoint tidak ditemukan");
  } catch (error) {
    if (!(error instanceof HttpError)) console.error(error);
    sendJson(response, error instanceof HttpError ? error.status : 500, {
      message: error instanceof HttpError ? error.message : "Terjadi kesalahan server",
    });
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`MCC Absensi API berjalan di http://localhost:${PORT}${API_PREFIX}`);
});