import { useState } from "react";
import { useNavigate, Navigate } from "react-router";
import { useAuth } from "../context/AuthContext";
import { Eye, EyeOff, Building2, Lock, Mail, AlertCircle, KeyRound } from "lucide-react";

const BG_IMAGE = "https://images.unsplash.com/photo-1632012993419-e2341a8a656e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxNYWxhbmclMjBjcmVhdGl2ZSUyMGNlbnRlciUyMG1vZGVybiUyMGJ1aWxkaW5nfGVufDF8fHx8MTc3NjIzOTg3OHww&ixlib=rb-4.1.0&q=80&w=1080";
const viteEnv = (import.meta as ImportMeta & { env: { VITE_API_URL?: string; DEV: boolean } }).env;
const API_URL = viteEnv.VITE_API_URL || "http://localhost:5000/api/v1";

export function LoginPage() {
  const { login, isAuthenticated, user, isLoading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [forgotStep, setForgotStep] = useState<"login" | "request" | "reset">("login");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="w-8 h-8 border-4 border-[#1e3263]/30 border-t-[#1e3263] rounded-full animate-spin" /></div>;
  }

  if (isAuthenticated) {
    return <Navigate to={user?.role === "admin" ? "/admin" : "/"} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    await new Promise((r) => setTimeout(r, 800));
    const success = await login(email, password);
    setLoading(false);
    if (success) {
      const savedUser = JSON.parse(sessionStorage.getItem("mcc_user") || "{}");
      navigate(savedUser.role === "admin" ? "/admin" : "/");
    } else {
      setError("Email atau password salah. Silakan coba lagi.");
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setNotice("");
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Permintaan reset gagal.");

      if (result.data.resetToken) {
        setResetToken(result.data.resetToken);
        setForgotStep("reset");
        setNotice(`Token reset development berlaku ${result.data.expiresInMinutes} menit.`);
      } else {
        setNotice(result.data.message);
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Tidak dapat menghubungi server.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setNotice("");
    if (newPassword.length < 8) {
      setError("Password baru minimal 8 karakter.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Konfirmasi password tidak sama.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: resetToken, password: newPassword }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Reset password gagal.");

      setForgotStep("login");
      setPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setResetToken("");
      setNotice(result.data.message);
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : "Tidak dapat menghubungi server.");
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = forgotStep === "login"
    ? handleSubmit
    : forgotStep === "request"
      ? handleForgotSubmit
      : handleResetSubmit;

  const fillAdmin = () => { setEmail("admin@mcc.id"); setPassword("admin123"); setError(""); };
  const fillEmployee = () => { setEmail("budi@mcc.id"); setPassword("karyawan123"); setError(""); };

  return (
    <div className="min-h-screen flex">
      {/* Left - Image */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <img src={BG_IMAGE} alt="MCC" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-br from-[#1e3263]/90 to-[#1e3263]/60" />
        <div className="relative z-10 flex flex-col justify-between p-12 text-white">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-orange-400 rounded-xl flex items-center justify-center">
              <Building2 className="w-7 h-7 text-white" />
            </div>
            <div>
              <p className="font-bold text-lg">MCC Absensi</p>
              <p className="text-blue-200 text-sm">Malang Creative Center</p>
            </div>
          </div>
          <div>
            <h2 className="text-4xl font-bold mb-4 leading-tight">
              Sistem Absensi<br />Digital Karyawan
            </h2>
            <p className="text-blue-200 text-lg mb-8">
              Kelola kehadiran karyawan dengan mudah, akurat, dan real-time.
            </p>
            <div className="grid grid-cols-3 gap-4">
              {[
                { num: "50+", label: "Karyawan" },
                { num: "100%", label: "Digital" },
                { num: "Real-time", label: "Monitoring" },
              ].map((s) => (
                <div key={s.label} className="bg-white/10 backdrop-blur rounded-xl p-4 text-center">
                  <p className="font-bold text-xl text-orange-300">{s.num}</p>
                  <p className="text-xs text-blue-200 mt-1">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
          <p className="text-blue-300 text-sm">© 2026 MCC – Malang Creative Center</p>
        </div>
      </div>

      {/* Right - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-gray-50 p-6">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="flex lg:hidden items-center gap-3 mb-8 justify-center">
            <div className="w-12 h-12 bg-[#1e3263] rounded-xl flex items-center justify-center">
              <Building2 className="w-7 h-7 text-white" />
            </div>
            <div>
              <p className="font-bold text-gray-800">MCC Absensi</p>
              <p className="text-gray-500 text-sm">Malang Creative Center</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h1 className="text-2xl font-bold text-gray-800 mb-1">
              {forgotStep === "login" ? "Selamat Datang" : forgotStep === "request" ? "Lupa Password" : "Buat Password Baru"}
            </h1>
            <p className="text-gray-500 text-sm mb-6">
              {forgotStep === "login"
                ? "Masuk ke akun Anda untuk mulai absensi"
                : forgotStep === "request"
                  ? "Masukkan email akun yang ingin dipulihkan"
                  : "Gunakan password baru minimal 8 karakter"}
            </p>

            <form onSubmit={handleFormSubmit} className="space-y-4">
              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@mcc.id"
                    required
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3263]/30 focus:border-[#1e3263] transition-all"
                  />
                </div>
              </div>

              {/* Password */}
              {forgotStep === "login" && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type={showPass ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        className="w-full pl-10 pr-12 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3263]/30 focus:border-[#1e3263] transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPass(!showPass)}
                        aria-label={showPass ? "Sembunyikan password" : "Tampilkan password"}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="text-right -mt-2">
                    <button
                      type="button"
                      onClick={() => { setForgotStep("request"); setError(""); setNotice(""); }}
                      className="text-sm font-medium text-[#1e3263] hover:underline"
                    >
                      Lupa password?
                    </button>
                  </div>
                </>
              )}

              {forgotStep === "reset" && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Token reset</label>
                    <div className="relative">
                      <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={resetToken}
                        onChange={(e) => setResetToken(e.target.value)}
                        required
                        autoComplete="one-time-code"
                        className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3263]/30 focus:border-[#1e3263] transition-all"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Password baru</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      minLength={8}
                      autoComplete="new-password"
                      required
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3263]/30 focus:border-[#1e3263] transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Konfirmasi password baru</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      minLength={8}
                      autoComplete="new-password"
                      required
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3263]/30 focus:border-[#1e3263] transition-all"
                    />
                  </div>
                </>
              )}

              {error && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-600 text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}
              {notice && <p role="status" className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{notice}</p>}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#1e3263] hover:bg-[#162550] text-white py-3 rounded-xl font-medium text-sm transition-all disabled:opacity-60 flex items-center justify-center gap-2 mt-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Memproses...
                  </>
                ) : (
                  forgotStep === "login" ? "Masuk" : forgotStep === "request" ? "Kirim instruksi reset" : "Simpan password baru"
                )}
              </button>
            </form>

            {forgotStep !== "login" && (
              <button
                type="button"
                onClick={() => { setForgotStep("login"); setError(""); setNotice(""); }}
                className="mt-4 w-full text-sm font-medium text-gray-500 hover:text-[#1e3263]"
              >
                Kembali ke login
              </button>
            )}

            {forgotStep === "login" && viteEnv.DEV && (
              <div className="mt-6 border-t border-gray-100 pt-5">
                <p className="text-xs text-gray-400 text-center mb-3">Akun Demo</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={fillAdmin}
                    className="bg-[#1e3263]/5 hover:bg-[#1e3263]/10 border border-[#1e3263]/20 text-[#1e3263] py-2.5 px-3 rounded-xl text-xs font-medium transition-all text-center"
                  >
                    👑 Login Admin
                  </button>
                  <button
                    type="button"
                    onClick={fillEmployee}
                    className="bg-orange-50 hover:bg-orange-100 border border-orange-200 text-orange-700 py-2.5 px-3 rounded-xl text-xs font-medium transition-all text-center"
                  >
                    👤 Login Karyawan
                  </button>
                </div>
              </div>
            )}
          </div>

          <p className="text-center text-xs text-gray-400 mt-6">
            © 2026 Malang Creative Center · Universitas Muhammadiyah Malang
          </p>
        </div>
      </div>
    </div>
  );
}
