import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import logo from "../../assets/images/logodinsos.jpg";
import "../../styles/login.css";
import api from "../../services/api";

function LoginForm() {

    const [nip, setNip] = useState("");
    const [password, setPassword] = useState("");
    const [remember, setRemember] = useState(true);

    const navigate = useNavigate();
    const location = useLocation();
    const warningMessage = location.state?.message;

    const handleSubmit = async (e) => {

        e.preventDefault();

        try {

            const response = await api.post("/auth/login", {

                login: nip,
                password: password,

            });

            console.log(response.data);

            localStorage.setItem(
                "token",
                response.data.token
            );

            localStorage.setItem(
                "user",
                JSON.stringify(response.data.user)
            );

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
                    alert("Role tidak dikenali.");
                    break;

            }

        } catch (error) {

            console.log(error);

            alert(
                error.response?.data?.message ||
                "Login gagal."
            );

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
                            ⚠ {warningMessage}
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

                            <input
                                type="text"
                                id="nip"
                                placeholder="Masukkan NIP atau Username"
                                value={nip}
                                onChange={(e) =>
                                    setNip(e.target.value)
                                }
                            />

                        </div>

                        <div className="form-group">

                            <label htmlFor="password">
                                Password
                            </label>

                            <input
                                type="password"
                                id="password"
                                placeholder="Masukkan password"
                                value={password}
                                onChange={(e) =>
                                    setPassword(e.target.value)
                                }
                            />

                        </div>

                        <div className="form-options">

                            <label className="remember-me">

                                <input
                                    type="checkbox"
                                    checked={remember}
                                    onChange={(e) =>
                                        setRemember(e.target.checked)
                                    }
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
                        >
                            Login
                        </button>

                    </form>

                </div>

            </div>

        </div>
    );
}

export default LoginForm;