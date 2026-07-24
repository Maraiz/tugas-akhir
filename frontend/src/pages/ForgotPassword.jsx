import { useState } from "react";
import { Link } from "react-router-dom";
import logo from "../assets/images/logodinsos.jpg";
import "../styles/login.css";
import api from "../services/api";

function ForgotPassword() {

    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [sent, setSent] = useState(false);

    const handleSubmit = async (e) => {

        e.preventDefault();
        setErrorMessage("");
        setLoading(true);

        try {

            await api.post("/auth/forgot-password", { email });

            // Selalu tampilin pesan sukses generik, TANPA bilang email-nya
            // beneran terdaftar apa nggak — biar orang nggak bisa "mancing"
            // nyari tau email siapa aja yang punya akun di sistem ini
            setSent(true);

        } catch (error) {

            console.error(error);
            setErrorMessage(
                error.response?.data?.message || "Gagal mengirim permintaan. Periksa koneksi internet Anda."
            );

        } finally {
            setLoading(false);
        }

    };

    return (
        <div className="login-page">

            <div className="login-card">

                <div className="brand-panel">
                    <img src={logo} alt="Logo Dinsos PPKB Banyuwangi" />
                </div>

                <div className="form-panel">

                    {sent ? (

                        <div style={{ textAlign: "center", padding: "20px 0" }}>
                            <i
                                className="bi bi-envelope-check-fill"
                                style={{ fontSize: 48, color: "#2e7d32", marginBottom: 16, display: "block" }}
                            ></i>
                            <h1 className="form-title" style={{ fontSize: 22 }}>Cek Email Anda</h1>
                            <p className="form-subtitle" style={{ marginBottom: 24 }}>
                                Kalau email <b>{email}</b> terdaftar di sistem, link buat reset password
                                udah kami kirim. Cek juga folder Spam kalau nggak ketemu di Inbox.
                            </p>
                            <Link to="/" className="btn-login" style={{ textDecoration: "none", display: "flex" }}>
                                Kembali ke Login
                            </Link>
                        </div>

                    ) : (

                        <>
                            {errorMessage && (
                                <div className="login-error">
                                    <i className="bi bi-x-circle-fill"></i>
                                    {errorMessage}
                                </div>
                            )}

                            <h1 className="form-title">Lupa Password?</h1>
                            <p className="form-subtitle">
                                Masukkan email yang terdaftar, kami kirim link buat bikin password baru
                            </p>

                            <div className="divider">atau kembali ke halaman Login</div>

                            <form onSubmit={handleSubmit}>

                                <div className="form-group">
                                    <label htmlFor="email">Email</label>
                                    <div className="input-with-icon">
                                        <i className="bi bi-envelope-fill"></i>
                                        <input
                                            type="email"
                                            id="email"
                                            placeholder="Masukkan email terdaftar"
                                            value={email}
                                            disabled={loading}
                                            onChange={(e) => setEmail(e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>

                                <button type="submit" className="btn-login" disabled={loading}>
                                    {loading ? (
                                        <>
                                            <span className="btn-spinner"></span>
                                            Mengirim...
                                        </>
                                    ) : (
                                        "Kirim Link Reset"
                                    )}
                                </button>

                            </form>

                            <p style={{ textAlign: "center", marginTop: 18, fontSize: 13 }}>
                                <Link to="/" style={{ color: "#4f3cc9", fontWeight: 600, textDecoration: "none" }}>
                                    <i className="bi bi-arrow-left"></i> Kembali ke Login
                                </Link>
                            </p>
                        </>

                    )}

                </div>

            </div>

        </div>
    );
}

export default ForgotPassword;
