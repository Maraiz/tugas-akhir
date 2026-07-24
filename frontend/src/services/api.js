import axios from "axios";

const api = axios.create({
    baseURL: "http://localhost:5000/api",   
    headers: {
        "Content-Type": "application/json",
    },
});

// ===========================
// Request interceptor — nempelin token JWT ke SETIAP request otomatis,
// biar nggak perlu nulis manual "Authorization: Bearer ..." di tiap
// pemanggilan api.get/post/put/delete di seluruh komponen
// ===========================
api.interceptors.request.use(

    (config) => {

        const token = localStorage.getItem("token");

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        // Kalau body-nya FormData (upload file — foto profil, Excel SIGA,
        // dst), HAPUS header "Content-Type: application/json" yang
        // nempel dari default instance di atas. Biarin browser yang
        // otomatis isi "multipart/form-data; boundary=..." sendiri —
        // kalau dipaksa "application/json", request FormData jadi rusak
        // (fieldnya berubah jadi objek kosong pas nyampe di server).
        if (config.data instanceof FormData) {
            delete config.headers["Content-Type"];
        }

        return config;

    },

    (error) => Promise.reject(error)

);

// ===========================
// Response interceptor — kalau server balikin 401 (token nggak ada/
// expired/invalid), otomatis bersihin localStorage dan lempar balik
// ke halaman login, biar user nggak "nyangkut" di halaman yang
// datanya udah nggak bisa diakses
// ===========================
api.interceptors.response.use(

    (response) => response,

    (error) => {

        if (error.response?.status === 401) {

            localStorage.removeItem("token");
            localStorage.removeItem("user");

            // Hindari redirect loop kalau yang gagal itu request dari
            // halaman login itu sendiri (pathname "/")
            if (window.location.pathname !== "/") {
                window.location.href = "/";
            }

        }

        return Promise.reject(error);

    }

);

export default api;