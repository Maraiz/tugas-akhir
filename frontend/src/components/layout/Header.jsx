import { useState, useRef, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../../services/api";
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

    const [notifOpen, setNotifOpen] = useState(false);
    const notifRef = useRef(null);
    const [notifications, setNotifications] = useState([]);
    const [notifLoading, setNotifLoading] = useState(true);

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

    // ===== Ambil notifikasi — reuse endpoint Dashboard, disusun ulang
    // jadi daftar notifikasi (aktivitas terbaru + program belum upload +
    // kecamatan bermasalah). Link tiap notifikasi disesuaikan sama role
    // yang lagi login — Admin diarahin ke halaman kerja (Riwayat Upload/
    // Laporan), User/Pimpinan diarahin ke halaman Monitoring per-Program
    // yang relevan, soalnya dia nggak punya akses ke halaman Admin. =====
    async function fetchNotifications() {
        setNotifLoading(true);
        try {
            const res = await api.get("/dashboard");
            const data = res.data.data;

            const role = storedUser?.role;
            const isAdmin = role === "admin";

            const list = [];

            // 1. Aktivitas terbaru (data baru diupload/diperbarui) — max 3,
            // paling relevan buat "apa yang baru berubah"
            (data.aktivitasTerbaru || []).slice(0, 3).forEach((a, i) => {
                list.push({
                    id: `activity-${i}`,
                    type: "info",
                    icon: "bi-cloud-check-fill",
                    text: <><b>{a.programLabel}</b> diperbarui oleh {a.diuploadOleh} — periode {a.periode}</>,
                    to: isAdmin ? "/admin/riwayat-upload" : `/user/monitoring/${a.program}`,
                });
            });

            // 2. Program yang belum upload periode berjalan
            (data.statusUpload || []).filter((p) => !p.done).forEach((p) => {
                list.push({
                    id: `upload-${p.program}`,
                    type: "warning",
                    icon: "bi-cloud-arrow-up-fill",
                    text: <><b>{p.label}</b> belum upload data periode {data.periodeBerjalan}</>,
                    to: isAdmin ? "/admin/riwayat-upload" : `/user/monitoring/${p.program}`,
                });
            });

            // 3. Kecamatan perlu perhatian
            (data.kecamatanPerluPerhatian || []).forEach((a, i) => {
                list.push({
                    id: `attention-${i}`,
                    type: "danger",
                    icon: "bi-exclamation-triangle-fill",
                    text: <>Kecamatan <b>{a.kecamatan}</b> capaian {a.programLabel} cuma {a.pct}%</>,
                    to: isAdmin ? "/admin/laporan" : `/user/monitoring/${a.program}`,
                });
            });

            setNotifications(list);
        } catch (err) {
            console.error(err);
            setNotifications([]);
        } finally {
            setNotifLoading(false);
        }
    }

    useEffect(() => {
        fetchNotifications();
    }, []);

    // Tutup dropdown profil / notifikasi kalau klik di luar
    useEffect(() => {
        function handleClickOutside(e) {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setDropdownOpen(false);
            }
            if (notifRef.current && !notifRef.current.contains(e.target)) {
                setNotifOpen(false);
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
                    Beranda <i className="bi bi-chevron-right"></i> <span>{breadcrumb}</span>
                </div>
            </div>

            <div className="header-right">
                <div className="header-date"><i className="bi bi-calendar3"></i>{today}</div>

                {/* ===== NOTIFIKASI ===== */}
                <div className="notif-wrap" ref={notifRef}>
                    <button className="btn-notif" onClick={() => setNotifOpen((o) => !o)}>
                        <i className="bi bi-bell-fill"></i>
                        {notifications.length > 0 && <span className="notif-badge"></span>}
                    </button>

                    {notifOpen && (
                        <div className="notif-dropdown">
                            <div className="notif-dropdown-head">
                                <h4>Notifikasi</h4>
                                {notifications.length > 0 && <span className="notif-count">{notifications.length}</span>}
                            </div>

                            <div className="notif-list">
                                {notifLoading && (
                                    <div className="notif-empty">
                                        <i className="bi bi-hourglass-split"></i>
                                        <span>Memuat notifikasi...</span>
                                    </div>
                                )}

                                {!notifLoading && notifications.length === 0 && (
                                    <div className="notif-empty">
                                        <i className="bi bi-check2-circle"></i>
                                        <span>Semua aman, tidak ada notifikasi baru</span>
                                    </div>
                                )}

                                {!notifLoading && notifications.map((n) => (
                                    <Link
                                        to={n.to}
                                        key={n.id}
                                        className="notif-item"
                                        onClick={() => setNotifOpen(false)}
                                    >
                                        <div className={`notif-item-icon ${n.type}`}>
                                            <i className={`bi ${n.icon}`}></i>
                                        </div>
                                        <div className="notif-item-text">{n.text}</div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* ===== PROFIL ===== */}
                <div className="header-profile-wrap" ref={dropdownRef}>
                    <div className="header-profile" onClick={() => setDropdownOpen((o) => !o)}>
                        <div className="h-avatar">{initials(displayName)}</div>
                        <div className="h-profile-info">
                            <h4>{displayName}</h4>
                            <span>{displayRole}</span>
                        </div>
                        <i className={`bi bi-chevron-down profile-chevron ${dropdownOpen ? "open" : ""}`}></i>
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
                                <i className="bi bi-box-arrow-right"></i> Logout
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}

export default Header;
