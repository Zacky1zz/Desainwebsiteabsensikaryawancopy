import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AuthProvider, useAuth } from "../src/app/context/AuthContext";

function LoginTestPage() {
  const { login, user } = useAuth();
  const [result, setResult] = React.useState("belum diuji");

  const handleLogin = async () => {
    const success = await login("budi@mcc.id", "karyawan123");
    setResult(success ? "berhasil" : "gagal");
  };

  return (
    <div>
      <button onClick={handleLogin}>Uji Login</button>
      <p data-testid="login-result">{result}</p>
      <p data-testid="current-user">{user?.email ?? "belum login"}</p>
    </div>
  );
}

const validApiResponse = {
  data: {
    accessToken: "token-dummy-123",
    user: {
      id: "user-001",
      email: "budi@mcc.id",
      role: "karyawan",
      name: "Budi",
      department: "Operasional",
      position: "Staff",
    },
  },
};

function apiResponse(ok, body) {
  return {
    ok,
    json: vi.fn().mockResolvedValue(body),
  };
}

describe("AuthProvider - login()", () => {
  let fetchStub;
  let setItemSpy;

  beforeEach(() => {
    sessionStorage.clear();

    
    fetchStub = vi.fn();
    vi.stubGlobal("fetch", fetchStub);

    
    setItemSpy = vi.spyOn(Storage.prototype, "setItem");
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("mengembalikan true dan menyimpan sesi ketika login berhasil", async () => {
    fetchStub.mockResolvedValue(apiResponse(true, validApiResponse));

    render(
      <AuthProvider>
        <LoginTestPage />
      </AuthProvider>
    );

    fireEvent.click(screen.getByRole("button", { name: "Uji Login" }));

    await waitFor(() => {
      expect(screen.getByTestId("login-result").textContent).toBe("berhasil");
    });

    expect(screen.getByTestId("current-user").textContent).toBe("budi@mcc.id");
    expect(sessionStorage.getItem("mcc_token")).toBe("token-dummy-123");
    expect(JSON.parse(sessionStorage.getItem("mcc_user")).email).toBe("budi@mcc.id");
    expect(sessionStorage.getItem("mcc_demo_user")).toBeNull();

    expect(fetchStub).toHaveBeenCalledTimes(1);
    expect(fetchStub).toHaveBeenCalledWith(
      "http://localhost:5000/api/v1/auth/login",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "budi@mcc.id", password: "karyawan123" }),
      })
    );
    expect(setItemSpy).toHaveBeenCalledWith("mcc_token", "token-dummy-123");
    expect(setItemSpy).toHaveBeenCalledWith(
      "mcc_user",
      expect.stringContaining('"email":"budi@mcc.id"')
    );
  });

  it("mengembalikan false ketika server menolak login", async () => {
    fetchStub.mockResolvedValue(apiResponse(false, { message: "Email atau password salah" }));

    render(
      <AuthProvider>
        <LoginTestPage />
      </AuthProvider>
    );

    fireEvent.click(screen.getByRole("button", { name: "Uji Login" }));

    await waitFor(() => {
      expect(screen.getByTestId("login-result").textContent).toBe("gagal");
    });

    expect(screen.getByTestId("current-user").textContent).toBe("belum login");
    expect(sessionStorage.getItem("mcc_token")).toBeNull();
    expect(setItemSpy).not.toHaveBeenCalled();
  });

  it("mengembalikan false ketika request mengalami error", async () => {
    fetchStub.mockRejectedValue(new Error("Network unavailable"));
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <AuthProvider>
        <LoginTestPage />
      </AuthProvider>
    );

    fireEvent.click(screen.getByRole("button", { name: "Uji Login" }));

    await waitFor(() => {
      expect(screen.getByTestId("login-result").textContent).toBe("gagal");
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Login error",
      expect.any(Error)
    );
    expect(sessionStorage.getItem("mcc_token")).toBeNull();
    expect(setItemSpy).not.toHaveBeenCalled();
  });
});
