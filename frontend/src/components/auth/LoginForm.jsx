import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import logo from "../../assets/images/logodinsos.jpg";
import "../../styles/login.css";
import api from "../../services/api";

function LoginForm() {

    const [nip, setNip] = useState("");
    const [password, setPassword] = useState("");
    const [remember, setRemember] = useState(true);
    const [showPassword, setShowPassword] = useState(false);

    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    const navigate = useNavigate();
    const location = useLocation();
    const warningMessage = location.state?.message;

    const handleSubmit = async (e) => {

        e.preventDefault();

        setErrorMessage("");
        setLoading(true);

        try {

            const response = await api.post("/auth/login", {

                login: nip,
                password: password,

            });

            localStorage.setItem("token", response.data.token);
            localStorage.setItem("user", JSON.stringify(response.data.user));

            const role = response.data.user.role;

            switch (role) {

                case "admin":
                    navigate("/admin");
                    break;

                case "petugas":
                    navigate("/petugas");
                    break;

                case "user":
                    navigate("/user");
                    break;

                default:
                    setErrorMessage("Role tidak dikenali. Hubungi administrator.");
                    setLoading(false);
                    break;

            }

        } catch (error) {

            console.error(error);

            setErrorMessage(
                error.response?.data?.message || "Login gagal. Periksa koneksi internet Anda."
            );

            setLoading(false);

        }

    };

    return (
        <div className="login-page">

            <div className="login-card">

                <div className="brand-panel">
                    <img
                        src={logo}
                        alt="Logo Dinsos PPKB Banyuwangi"
                    />
                </div>

                <div className="form-panel">

                    {warningMessage && (
                        <div className="login-warning">
                            <i className="bi bi-exclamation-triangle-fill"></i>
                            {warningMessage}
                        </div>
                    )}

                    {errorMessage && (
                        <div className="login-error">
                            <i className="bi bi-x-circle-fill"></i>
                            {errorMessage}
                        </div>
                    )}

                    <h1 className="form-title">
                        Login to your Account
                    </h1>

                    <p className="form-subtitle">
                        See what is going on with your business
                    </p>

                    <div className="divider">
                        or Sign in with Email
                    </div>

                    <form onSubmit={handleSubmit}>

                        <div className="form-group">

                            <label htmlFor="nip">
                                NIP atau Username
                            </label>

                            <div className="input-with-icon">
                                <i className="bi bi-person-fill"></i>
                                <input
                                    type="text"
                                    id="nip"
                                    placeholder="Masukkan NIP atau Username"
                                    value={nip}
                                    disabled={loading}
                                    onChange={(e) => setNip(e.target.value)}
                                />
                            </div>

                        </div>

                        <div className="form-group">

                            <label htmlFor="password">
                                Password
                            </label>

                            <div className="input-with-icon">
                                <i className="bi bi-lock-fill"></i>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    id="password"
                                    placeholder="Masukkan password"
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

                        <div className="form-options">

                            <label className="remember-me">

                                <input
                                    type="checkbox"
                                    checked={remember}
                                    disabled={loading}
                                    onChange={(e) => setRemember(e.target.checked)}
                                />

                                Remember Me

                            </label>

                            <a
                                href="#"
                                className="forgot-password"
                            >
                                Forgot Password?
                            </a>

                        </div>

                        <button
                            type="submit"
                            className="btn-login"
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <span className="btn-spinner"></span>
                                    Signing in...
                                </>
                            ) : (
                                "Login"
                            )}
                        </button>

                    </form>

                </div>

            </div>

        </div>
    );
}

export default LoginForm;