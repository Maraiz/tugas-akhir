import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/header.css";

const ROLE_LABEL = {
    admin: "Administrator",
    petugas: "Petugas",
    user: "User",
};

function initials(name) {
    if (!name) return "??";
    return name.split(" ").map((w) => w[0]).join("").substring(0, 2).toUpperCase();
}

function Header({ title, breadcrumb }) {
    const navigate = useNavigate();
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

    const storedUser = JSON.parse(localStorage.getItem("user") || "null");
    const displayName = storedUser?.nama || "Pengguna";
    const displayRole = ROLE_LABEL[storedUser?.role] || storedUser?.role || "-";

    const today = new Date().toLocaleDateString("id-ID", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
    });

    function handleLogout() {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/");
    }

    // Tutup dropdown kalau klik di luar area profil
    useEffect(() => {
        function handleClickOutside(e) {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <header className="app-header">
            <div className="header-left">
                <h2>{title}</h2>
                <div className="breadcrumb">
                    Beranda › <span>{breadcrumb}</span>
                </div>
            </div>

            <div className="header-right">
                <div className="header-date">{today}</div>

                <button className="btn-notif">
                    🔔
                    <span className="notif-badge"></span>
                </button>

                <div className="header-profile-wrap" ref={dropdownRef}>
                    <div className="header-profile" onClick={() => setDropdownOpen((o) => !o)}>
                        <div className="h-avatar">{initials(displayName)}</div>
                        <div className="h-profile-info">
                            <h4>{displayName}</h4>
                            <span>{displayRole}</span>
                        </div>
                    </div>

                    {dropdownOpen && (
                        <div className="header-profile-dropdown">
                            <div className="dropdown-user-info">
                                <div className="h-avatar">{initials(displayName)}</div>
                                <div>
                                    <h4>{displayName}</h4>
                                    <span>{displayRole}</span>
                                </div>
                            </div>
                            <div className="dropdown-divider"></div>
                            <button className="dropdown-logout-btn" onClick={handleLogout}>
                                🚪 Logout
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}

export default Header;