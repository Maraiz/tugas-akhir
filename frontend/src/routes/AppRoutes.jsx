import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login from "../pages/Login";

import DashboardAdmin from "../pages/admin/Dashboard";
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

                <Route
                    path="/admin"
                    element={<DashboardAdmin />}
                />

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