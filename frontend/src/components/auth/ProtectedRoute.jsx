import { Navigate, Outlet, useLocation } from "react-router-dom";

function ProtectedRoute() {
    const location = useLocation();
    const token = localStorage.getItem("token");

    if (!token) {
        return (
            <Navigate
                to="/"
                replace
                state={{ message: "Silakan login terlebih dahulu." }}
            />
        );
    }

    return <Outlet />;
}

export default ProtectedRoute;