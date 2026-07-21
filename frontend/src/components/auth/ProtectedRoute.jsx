import { Navigate, Outlet, useLocation } from "react-router-dom";

// Baca payload JWT tanpa perlu library tambahan — cukup buat baca
// klaim "exp" (waktu kedaluwarsa), BUKAN buat verifikasi keaslian token
// (verifikasi keaslian tetap di server, ini cuma pengecekan cepat di
// frontend biar UX-nya nggak nyangkut di halaman yang tokennya udah mati)
function decodeTokenPayload(token) {
    try {
        const payload = token.split(".")[1];
        return JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    } catch {
        return null;
    }
}

function isTokenExpired(token) {
    const payload = decodeTokenPayload(token);
    if (!payload?.exp) return false; // kalau nggak ada klaim exp, anggap belum tau
    return Date.now() >= payload.exp * 1000;
}

// ===========================
// ProtectedRoute
// Props:
// - allowedRoles : array role yang boleh akses, mis. ["admin"].
//                  Kalau nggak diisi, cuma ngecek "sudah login" tanpa
//                  peduli role apa.
// ===========================
function ProtectedRoute({ allowedRoles }) {
    const location = useLocation();
    const token = localStorage.getItem("token");
    const storedUser = JSON.parse(localStorage.getItem("user") || "null");

    // Belum login sama sekali
    if (!token || !storedUser) {
        return (
            <Navigate
                to="/"
                replace
                state={{ message: "Silakan login terlebih dahulu." }}
            />
        );
    }

    // Token udah kedaluwarsa (cek cepat di frontend; server tetap jadi
    // sumber kebenaran final lewat interceptor 401 di api.js)
    if (isTokenExpired(token)) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        return (
            <Navigate
                to="/"
                replace
                state={{ message: "Sesi login sudah habis. Silakan login ulang." }}
            />
        );
    }

    // Role nggak sesuai — misal Petugas coba akses halaman Admin
    if (allowedRoles && !allowedRoles.includes(storedUser.role)) {
        return (
            <Navigate
                to="/"
                replace
                state={{ message: "Anda tidak memiliki akses ke halaman tersebut." }}
            />
        );
    }

    return <Outlet />;
}

export default ProtectedRoute;
