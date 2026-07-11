import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import "../../styles/sidebar.css";

function Sidebar() {

    const [openMonitoring, setOpenMonitoring] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();

    const isActive = (path) => location.pathname === path;

    function handleLogout() {
        if (!confirm("Yakin ingin logout?")) return;
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/");
    }

    return (
        <aside className="sidebar">
            {/* Brand */}
            <div className="sidebar-brand">

                <div className="sidebar-brand-icon">
                    📊
                </div>

                <div className="sidebar-brand-text">

                    <h3>Monitoring Poktan</h3>

                    <span>Dinsos PPKB Banyuwangi</span>

                </div>

            </div>

            {/* Profile */}
            <div className="sidebar-profile">

                <div className="profile-avatar">
                    AD
                </div>

                <div className="profile-info">

                    <h4>Admin Dinas</h4>

                    <span>Super Administrator</span>

                </div>

            </div>

            {/* Navigation */}
            <nav className="sidebar-nav">

                <div className="nav-section-label">
                    Menu Utama
                </div>

                <Link to="/admin" className={`nav-item ${isActive("/admin") ? "active" : ""}`}>
                    <span className="nav-icon">📊</span>
                    Dashboard
                </Link>

                {/* Monitoring Program */}
                <div
                    className={`nav-item has-sub ${openMonitoring ? "open" : ""}`}
                    onClick={() => setOpenMonitoring(!openMonitoring)}
                >
                    <span className="nav-icon">▶</span>
                    Monitoring Program
                    <span className="nav-arrow">›</span>
                </div>

                <div className={`nav-submenu ${openMonitoring ? "open" : ""}`} style={{ display: openMonitoring ? "block" : "none" }}>
                    <Link to="/admin/monitoring/bkb" className={`nav-subitem ${isActive("/admin/monitoring/bkb") ? "active" : ""}`}>BKB</Link>
                    <Link to="/admin/monitoring/bkr" className={`nav-subitem ${isActive("/admin/monitoring/bkr") ? "active" : ""}`}>BKR</Link>
                    <div className="nav-subitem">BKL</div>
                    <div className="nav-subitem">PIK-R</div>
                    <div className="nav-subitem">UPPKA</div>
                </div>

                <div className="nav-divider"></div>
                <div className="nav-section-label">Manajemen</div>

                <Link to="/admin/data-pengguna" className={`nav-item ${isActive("/admin/data-pengguna") ? "active" : ""}`}>
                    <span className="nav-icon">👥</span>
                    Data Pengguna
                </Link>

                <div className="nav-item">
                    <span className="nav-icon">📄</span>
                    Riwayat Upload
                </div>

                <div className="nav-item">
                    <span className="nav-icon">📈</span>
                    Laporan
                </div>

            </nav>

            {/* Footer Sidebar */}
            <div className="sidebar-footer">
                <button className="btn-logout" onClick={handleLogout}>
                    🚪 Logout
                </button>
            </div>

        </aside>
    );
}

export default Sidebar;
