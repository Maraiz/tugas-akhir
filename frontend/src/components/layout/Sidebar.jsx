import { useState } from "react";
import "../../styles/sidebar.css";

function Sidebar() {

    const [openMonitoring, setOpenMonitoring] = useState(false);

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

                <div className="nav-item active">
                    <span className="nav-icon">📊</span>
                    Dashboard
                </div>

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
                    <div className="nav-subitem">BKB</div>
                    <div className="nav-subitem">BKR</div>
                    <div className="nav-subitem">BKL</div>
                    <div className="nav-subitem">PIK-R</div>
                    <div className="nav-subitem">UPPKA</div>
                </div>

                <div className="nav-divider"></div>
                <div className="nav-section-label">Manajemen</div>

                <div className="nav-item">
                    <span className="nav-icon">👥</span>
                    Data Pengguna
                </div>

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
                <button className="btn-logout">
                    🚪 Logout
                </button>
            </div>

        </aside>
    );
}

export default Sidebar;