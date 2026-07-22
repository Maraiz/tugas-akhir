import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login from "../pages/Login";
import Layout from "../components/layout/Layout";
import ProtectedRoute from "../components/auth/ProtectedRoute";

import DashboardAdmin from "../pages/admin/Dashboard";
import DataPengguna from "../pages/admin/DataPengguna";
import DataBkr from "../pages/admin/DataBkr";
import AddBkr from "../pages/admin/AddBkr";
import DataBkb from "../pages/admin/DataBkb";
import AddBkb from "../pages/admin/AddBkb";
import DataBkl from "../pages/admin/DataBkl";
import AddBkl from "../pages/admin/AddBkl";
import DataPikr from "../pages/admin/DataPikr";
import AddPikr from "../pages/admin/AddPikr";
import DataUppka from "../pages/admin/DataUppka";
import AddUppka from "../pages/admin/AddUppka";
import RiwayatUpload from "../pages/admin/RiwayatUpload";
import Laporan from "../pages/admin/Laporan";

import DashboardPetugas from "../pages/petugas/Dashboard";

import UserLayout from "../components/layout/user/UserLayout";
import DashboardUser from "../pages/user/Dashboard";
import MonitoringProgram from "../pages/user/MonitoringProgram";

function AppRoutes() {

    return (

        <BrowserRouter>

            <Routes>

                <Route
                    path="/"
                    element={<Login />}
                />

                {/* ===== ADMIN — cuma role "admin" yang boleh masuk ===== */}
                <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>

                    <Route path="/admin" element={<Layout />}>
                        <Route index element={<DashboardAdmin />} />
                        <Route path="data-pengguna" element={<DataPengguna />} />
                        <Route path="monitoring/bkb" element={<DataBkb />} />
                        <Route path="monitoring/bkb/tambah" element={<AddBkb />} />
                        <Route path="monitoring/bkr" element={<DataBkr />} />
                        <Route path="monitoring/bkr/tambah" element={<AddBkr />} />
                        <Route path="monitoring/bkl" element={<DataBkl />} />
                        <Route path="monitoring/bkl/tambah" element={<AddBkl />} />
                        <Route path="monitoring/pikr" element={<DataPikr />} />
                        <Route path="monitoring/pikr/tambah" element={<AddPikr />} />
                        <Route path="monitoring/uppka" element={<DataUppka />} />
                        <Route path="monitoring/uppka/tambah" element={<AddUppka />} />
                        <Route path="riwayat-upload" element={<RiwayatUpload />} />
                        <Route path="laporan" element={<Laporan />} />
                    </Route>

                </Route>

                {/* ===== PETUGAS — cuma role "petugas" yang boleh masuk ===== */}
                <Route element={<ProtectedRoute allowedRoles={["petugas"]} />}>
                    <Route
                        path="/petugas"
                        element={<DashboardPetugas />}
                    />
                </Route>

                {/* ===== USER/PIMPINAN — cuma role "user" yang boleh masuk ===== */}
                <Route element={<ProtectedRoute allowedRoles={["user"]} />}>
                    <Route path="/user" element={<UserLayout />}>
                        <Route index element={<DashboardUser />} />
                        <Route path="monitoring/:program" element={<MonitoringProgram />} />
                    </Route>
                </Route>

            </Routes>

        </BrowserRouter>

    );

}

export default AppRoutes;