import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import "../../styles/sidebar.css";

function Sidebar() {

    const [openMonitoring, setOpenMonitoring] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();

    const isActive = (path) => location.pathname === path;
    const isMonitoringActive = location.pathname.startsWith("/admin/monitoring");

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
                    <i className="bi bi-clipboard2-data-fill"></i>
                </div>
                <div className="sidebar-brand-text">
                    <h3>Monitoring Poktan</h3>
                    <span>Dinsos PPKB Banyuwangi</span>
                </div>
            </div>

            {/* Profile */}
            <div className="sidebar-profile">
                <div className="profile-avatar">AD</div>
                <div className="profile-info">
                    <h4>Admin Dinas</h4>
                    <span>Super Administrator</span>
                </div>
            </div>

            {/* Navigation */}
            <nav className="sidebar-nav">

                <ul className="nav-list">

                    <li className="nav-section-label">Menu Utama</li>

                    <li>
                        <Link to="/admin" className={`nav-link ${isActive("/admin") ? "active" : ""}`}>
                            <i className="bi bi-speedometer2 nav-icon"></i>
                            <span>Dashboard</span>
                        </Link>
                    </li>

                    <li>
                        <button
                            type="button"
                            className={`nav-link nav-link-collapsible ${openMonitoring || isMonitoringActive ? "active" : ""}`}
                            onClick={() => setOpenMonitoring(!openMonitoring)}
                            aria-expanded={openMonitoring}
                        >
                            <i className="bi bi-clipboard-data nav-icon"></i>
                            <span>Monitoring Program</span>
                            <i className={`bi bi-chevron-right nav-arrow ${openMonitoring ? "rotated" : ""}`}></i>
                        </button>

                        {openMonitoring && (
                            <ul className="sidebar-submenu">
                                <li>
                                    <Link to="/admin/monitoring/bkb" className={`nav-sublink ${isActive("/admin/monitoring/bkb") ? "active" : ""}`}>
                                        <i className="bi bi-journal-bookmark-fill sub-icon"></i>
                                        <span>BKB</span>
                                    </Link>
                                </li>
                                <li>
                                    <Link to="/admin/monitoring/bkr" className={`nav-sublink ${isActive("/admin/monitoring/bkr") ? "active" : ""}`}>
                                        <i className="bi bi-journal-bookmark-fill sub-icon"></i>
                                        <span>BKR</span>
                                    </Link>
                                </li>
                                <li>
                                    <Link to="/admin/monitoring/bkl" className={`nav-sublink ${isActive("/admin/monitoring/bkl") ? "active" : ""}`}>
                                        <i className="bi bi-journal-bookmark-fill sub-icon"></i>
                                        <span>BKL</span>
                                    </Link>
                                </li>
                                <li>
                                    <Link to="/admin/monitoring/pikr" className={`nav-sublink ${isActive("/admin/monitoring/pikr") ? "active" : ""}`}>
                                        <i className="bi bi-journal-bookmark-fill sub-icon"></i>
                                        <span>PIK-R</span>
                                    </Link>
                                </li>
                                <li>
                                    <Link to="/admin/monitoring/uppka" className={`nav-sublink ${isActive("/admin/monitoring/uppka") ? "active" : ""}`}>
                                        <i className="bi bi-journal-bookmark-fill sub-icon"></i>
                                        <span>UPPKA</span>
                                    </Link>
                                </li>
                            </ul>
                        )}
                    </li>

                    <li className="nav-divider"></li>
                    <li className="nav-section-label">Manajemen</li>

                    <li>
                        <Link to="/admin/data-pengguna" className={`nav-link ${isActive("/admin/data-pengguna") ? "active" : ""}`}>
                            <i className="bi bi-people-fill nav-icon"></i>
                            <span>Data Pengguna</span>
                        </Link>
                    </li>

                    <li>
                        <Link to="/admin/riwayat-upload" className={`nav-link ${isActive("/admin/riwayat-upload") ? "active" : ""}`}>
                            <i className="bi bi-clock-history nav-icon"></i>
                            <span>Riwayat Upload</span>
                        </Link>
                    </li>

                    <li>
                        <Link to="/admin/laporan" className={`nav-link ${isActive("/admin/laporan") ? "active" : ""}`}>
                            <i className="bi bi-graph-up-arrow nav-icon"></i>
                            <span>Laporan</span>
                        </Link>
                    </li>

                </ul>

            </nav>

            {/* Footer Sidebar */}
            <div className="sidebar-footer">
                <button className="btn-logout" onClick={handleLogout}>
                    <i className="bi bi-box-arrow-right"></i>
                    <span>Logout</span>
                </button>
            </div>

        </aside>
    );
}

export default Sidebar;