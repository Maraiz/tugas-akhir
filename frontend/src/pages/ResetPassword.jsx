import { useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import logo from "../assets/images/logodinsos.jpg";
import "../styles/login.css";
import api from "../services/api";

function ResetPassword() {

    const [searchParams] = useSearchParams();
    const token = searchParams.get("token");
    const navigate = useNavigate();

    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e) => {

        e.preventDefault();
        setErrorMessage("");

        if (password.length < 6) {
            setErrorMessage("Password minimal 6 karakter.");
            return;
        }

        if (password !== confirmPassword) {
            setErrorMessage("Konfirmasi password tidak cocok.");
            return;
        }

        setLoading(true);

        try {

            await api.post("/auth/reset-password", { token, password });
            setSuccess(true);

            setTimeout(() => navigate("/"), 2500);

        } catch (error) {

            console.error(error);
            setErrorMessage(
                error.response?.data?.message || "Gagal mereset password. Link mungkin sudah kedaluwarsa."
            );

        } finally {
            setLoading(false);
        }

    };

    // Token nggak ada di URL sama sekali — kemungkinan orang buka halaman
    // ini langsung tanpa lewat link dari email
    if (!token) {
        return (
            <div className="login-page">
                <div className="login-card">
                    <div className="brand-panel">
                        <img src={logo} alt="Logo Dinsos PPKB Banyuwangi" />
                    </div>
                    <div className="form-panel">
                        <div style={{ textAlign: "center", padding: "20px 0" }}>
                            <i className="bi bi-exclamation-triangle-fill" style={{ fontSize: 48, color: "#ef6c00", marginBottom: 16, display: "block" }}></i>
                            <h1 className="form-title" style={{ fontSize: 22 }}>Link Tidak Valid</h1>
                            <p className="form-subtitle" style={{ marginBottom: 24 }}>
                                Halaman ini cuma bisa diakses lewat link reset password yang dikirim ke email Anda.
                            </p>
                            <Link to="/lupa-password" className="btn-login" style={{ textDecoration: "none", display: "flex" }}>
                                Minta Link Baru
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="login-page">

            <div className="login-card">

                <div className="brand-panel">
                    <img src={logo} alt="Logo Dinsos PPKB Banyuwangi" />
                </div>

                <div className="form-panel">

                    {success ? (

                        <div style={{ textAlign: "center", padding: "20px 0" }}>
                            <i className="bi bi-check-circle-fill" style={{ fontSize: 48, color: "#2e7d32", marginBottom: 16, display: "block" }}></i>
                            <h1 className="form-title" style={{ fontSize: 22 }}>Password Berhasil Diubah</h1>
                            <p className="form-subtitle">Mengarahkan ke halaman login...</p>
                        </div>

                    ) : (

                        <>
                            {errorMessage && (
                                <div className="login-error">
                                    <i className="bi bi-x-circle-fill"></i>
                                    {errorMessage}
                                </div>
                            )}

                            <h1 className="form-title">Buat Password Baru</h1>
                            <p className="form-subtitle">Masukkan password baru buat akun Anda</p>

                            <div className="divider">Password Baru</div>

                            <form onSubmit={handleSubmit}>

                                <div className="form-group">
                                    <label htmlFor="password">Password Baru</label>
                                    <div className="input-with-icon">
                                        <i className="bi bi-lock-fill"></i>
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            id="password"
                                            placeholder="Minimal 6 karakter"
                                            value={password}
                                            disabled={loading}
                                            onChange={(e) => setPassword(e.target.value)}
                                        />
                                        <button
                                            type="button"
                                            className="toggle-password"
                                            onClick={() => setShowPassword((s) => !s)}
                                            tabIndex={-1}
                                        >
                                            <i className={`bi ${showPassword ? "bi-eye-slash-fill" : "bi-eye-fill"}`}></i>
                                        </button>
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label htmlFor="confirmPassword">Konfirmasi Password</label>
                                    <div className="input-with-icon">
                                        <i className="bi bi-lock-fill"></i>
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            id="confirmPassword"
                                            placeholder="Ulangi password baru"
                                            value={confirmPassword}
                                            disabled={loading}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <button type="submit" className="btn-login" disabled={loading}>
                                    {loading ? (
                                        <>
                                            <span className="btn-spinner"></span>
                                            Menyimpan...
                                        </>
                                    ) : (
                                        "Simpan Password Baru"
                                    )}
                                </button>

                            </form>
                        </>

                    )}

                </div>

            </div>

        </div>
    );
}

export default ResetPassword;
