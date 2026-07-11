import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";
import Footer from "./Footer";
import "../../styles/layout.css";

/* Judul & breadcrumb per halaman, dicocokkan dari URL.
   Tambahkan entri baru di sini setiap kali menambah halaman baru
   (misalnya nanti "/admin/monitoring/bkl": { title: "Data BKL", breadcrumb: "BKL" }). */
const ROUTE_META = {
    "/admin": { title: "Dashboard", breadcrumb: "Dashboard" },
    "/admin/data-pengguna": { title: "Data Pengguna", breadcrumb: "Data Pengguna" },
    "/admin/monitoring/bkb": { title: "Data BKB", breadcrumb: "BKB" },
    "/admin/monitoring/bkr": { title: "Data BKR", breadcrumb: "BKR" },
    "/admin/monitoring/bkb/tambah": { title: "Tambah Data BKB", breadcrumb: "Tambah BKB" },
    "/admin/monitoring/bkl": { title: "Data BKL", breadcrumb: "BKL" },
    "/admin/monitoring/bkl/tambah": { title: "Tambah Data BKL", breadcrumb: "Tambah BKL" },
};

function Layout() {
    const location = useLocation();
    const meta = ROUTE_META[location.pathname] || { title: "", breadcrumb: "" };

    return (

        <div className="app-layout">

            <Sidebar />

            <div className="main-area">

                <Header title={meta.title} breadcrumb={meta.breadcrumb} />

                <main className="content">
                    <Outlet />
                </main>

                <Footer />

            </div>

        </div>

    );

}

export default Layout;