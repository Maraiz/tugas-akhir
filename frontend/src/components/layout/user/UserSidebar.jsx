import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import "../../../styles/userSidebar.css";

function UserSidebar() {

    const [openMonitoring, setOpenMonitoring] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();

    const isActive = (path) => location.pathname === path;
    const isMonitoringActive = location.pathname.startsWith("/user/monitoring");

    const storedUser = JSON.parse(localStorage.getItem("user") || "null");
    const displayName = storedUser?.nama || "Pengguna";

    function initials(name) {
        if (!name) return "??";
        return name.split(" ").map((w) => w[0]).join("").substring(0, 2).toUpperCase();
    }

    function handleLogout() {
        if (!confirm("Yakin ingin logout?")) return;
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/");
    }

    return (
        <aside className="user-sidebar">

            <div className="user-sidebar-brand">
                <div className="user-sidebar-brand-icon">
                    <i className="bi bi-clipboard2-data-fill"></i>
                </div>
                <div className="user-sidebar-brand-text">
                    <h3>Monitoring Poktan</h3>
                    <span>Dinsos PPKB Banyuwangi</span>
                </div>
            </div>

            <div className="user-sidebar-profile">
                <div className="user-profile-avatar">{initials(displayName)}</div>
                <div className="user-profile-info">
                    <h4>{displayName}</h4>
                    <span>Pimpinan Dinas</span>
                </div>
            </div>

            <nav className="user-sidebar-nav">

                <div className="user-nav-section-label">Menu Utama</div>

                <Link to="/user" className={`user-nav-item ${isActive("/user") ? "active" : ""}`}>
                    <i className="bi bi-speedometer2 user-nav-icon"></i>
                    Dashboard Ringkasan
                </Link>

                <div
                    className={`user-nav-item has-sub ${openMonitoring || isMonitoringActive ? "open" : ""}`}
                    onClick={() => setOpenMonitoring(!openMonitoring)}
                >
                    <i className="bi bi-clipboard-data user-nav-icon"></i>
                    Monitoring Program
                    <i className={`bi bi-chevron-right user-nav-arrow ${openMonitoring ? "rotated" : ""}`}></i>
                </div>

                {(openMonitoring || isMonitoringActive) && (
                    <div className="user-nav-submenu">
                        <Link to="/user/monitoring/bkb" className={`user-nav-sublink ${isActive("/user/monitoring/bkb") ? "active" : ""}`}>BKB</Link>
                        <Link to="/user/monitoring/bkr" className={`user-nav-sublink ${isActive("/user/monitoring/bkr") ? "active" : ""}`}>BKR</Link>
                        <Link to="/user/monitoring/bkl" className={`user-nav-sublink ${isActive("/user/monitoring/bkl") ? "active" : ""}`}>BKL</Link>
                        <Link to="/user/monitoring/pikr" className={`user-nav-sublink ${isActive("/user/monitoring/pikr") ? "active" : ""}`}>PIK-R</Link>
                        <Link to="/user/monitoring/uppka" className={`user-nav-sublink ${isActive("/user/monitoring/uppka") ? "active" : ""}`}>UPPKA</Link>
                    </div>
                )}

                <Link to="/user/detail-kecamatan" className={`user-nav-item ${isActive("/user/detail-kecamatan") ? "active" : ""}`}>
                    <i className="bi bi-geo-alt-fill user-nav-icon"></i>
                    Detail per Kecamatan
                </Link>

                <Link to="/user/laporan" className={`user-nav-item ${isActive("/user/laporan") ? "active" : ""}`}>
                    <i className="bi bi-graph-up-arrow user-nav-icon"></i>
                    Laporan
                </Link>

                <div className="user-nav-divider"></div>
                <div className="user-nav-section-label">Akun</div>

                <Link to="/user/profil" className={`user-nav-item ${isActive("/user/profil") ? "active" : ""}`}>
                    <i className="bi bi-person-fill user-nav-icon"></i>
                    Profil Saya
                </Link>

            </nav>

            <div className="user-sidebar-footer">
                <button className="user-btn-logout" onClick={handleLogout}>
                    <i className="bi bi-box-arrow-right"></i> Logout
                </button>
            </div>

        </aside>
    );
}

export default UserSidebar;
