import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login from "../pages/Login";
import Layout from "../components/layout/Layout";

import DashboardAdmin from "../pages/admin/Dashboard";
import DataPengguna from "../pages/admin/DataPengguna";
import DashboardPetugas from "../pages/petugas/Dashboard";
import DashboardUser from "../pages/user/Dashboard";

function AppRoutes() {

    return (

        <BrowserRouter>

            <Routes>

                <Route
                    path="/"
                    element={<Login />}
                />

                {/* Semua route admin di dalam sini otomatis pakai Layout
                    (Sidebar+Header+Footer) yang cuma di-mount SEKALI —
                    pindah halaman cuma ganti bagian <Outlet /> saja */}
                <Route path="/admin" element={<Layout />}>
                    <Route index element={<DashboardAdmin />} />
                    <Route path="data-pengguna" element={<DataPengguna />} />
                </Route>

                <Route
                    path="/petugas"
                    element={<DashboardPetugas />}
                />

                <Route
                    path="/user"
                    element={<DashboardUser />}
                />

            </Routes>

        </BrowserRouter>

    );

}

export default AppRoutes;