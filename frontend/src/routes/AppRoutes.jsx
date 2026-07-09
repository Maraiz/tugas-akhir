import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login from "../pages/Login";
import Layout from "../components/layout/Layout";
import ProtectedRoute from "../components/auth/ProtectedRoute";

import DashboardAdmin from "../pages/admin/Dashboard";
import DataPengguna from "../pages/admin/DataPengguna";
import DataBkr from "../pages/admin/DataBkr";
import AddBkr from "../pages/admin/AddBkr";
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

                <Route element={<ProtectedRoute />}>

                    <Route path="/admin" element={<Layout />}>
                        <Route index element={<DashboardAdmin />} />
                        <Route path="data-pengguna" element={<DataPengguna />} />
                        <Route path="monitoring/bkr" element={<DataBkr />} />
                        <Route path="monitoring/bkr/tambah" element={<AddBkr />} />
                    </Route>

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