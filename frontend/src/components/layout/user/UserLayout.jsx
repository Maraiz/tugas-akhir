import { Outlet, useLocation } from "react-router-dom";
import UserSidebar from "./UserSidebar";
import Header from "../Header";
import "../../../styles/layout.css";

// Judul & breadcrumb per route — sama pola kayak ROUTE_META di Layout.jsx Admin
const ROUTE_META = {
    "/user": { title: "Dashboard Ringkasan", breadcrumb: "Dashboard Ringkasan" },
    "/user/monitoring/bkb": { title: "Monitoring BKB", breadcrumb: "BKB" },
    "/user/monitoring/bkr": { title: "Monitoring BKR", breadcrumb: "BKR" },
    "/user/monitoring/bkl": { title: "Monitoring BKL", breadcrumb: "BKL" },
    "/user/monitoring/pikr": { title: "Monitoring PIK-R", breadcrumb: "PIK-R" },
    "/user/monitoring/uppka": { title: "Monitoring UPPKA", breadcrumb: "UPPKA" },
    "/user/detail-kecamatan": { title: "Detail per Kecamatan", breadcrumb: "Detail per Kecamatan" },
    "/user/laporan": { title: "Laporan", breadcrumb: "Laporan" },
    "/user/profil": { title: "Profil Saya", breadcrumb: "Profil Saya" },
};

function UserLayout() {
    const location = useLocation();
    const meta = ROUTE_META[location.pathname] || { title: "Dashboard", breadcrumb: "Dashboard" };

    return (
        <div className="app-layout">
            <UserSidebar />
            <div className="main-area">
                <Header title={meta.title} breadcrumb={meta.breadcrumb} />
                <main className="content">
                    <Outlet />
                </main>
                <footer style={{
                    background: "#ffffff", borderTop: "1px solid #e8eaf0", padding: "14px 36px",
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                }}>
                    <p style={{ fontSize: 12, color: "#9090a8" }}>© 2026 Monitoring Poktan · Dinas Sosial PPKB Kabupaten Banyuwangi</p>
                    <span style={{ fontSize: 11, color: "#b0b8cc", background: "#f5f7fc", padding: "4px 12px", borderRadius: 20 }}>v1.0.0</span>
                </footer>
            </div>
        </div>
    );
}

export default UserLayout;
