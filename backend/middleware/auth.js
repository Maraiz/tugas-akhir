const jwt = require("jsonwebtoken");

// ===========================
// Middleware: verifyToken
// Pasang di routes.js SEBELUM semua router yang butuh login.
// Ngecek header "Authorization: Bearer <token>", verifikasi pakai
// JWT_SECRET yang sama kayak dipakai AuthController buat nandatangani token.
// Kalau valid, payload token (id, username, nip, role) ditaruh di req.user
// biar bisa dipakai controller lain kalau perlu (misal buat audit log).
// ===========================
function verifyToken(req, res, next) {

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {

        return res.status(401).json({

            success: false,
            message: "Token tidak ditemukan. Silakan login terlebih dahulu.",

        });

    }

    const token = authHeader.split(" ")[1];

    try {

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // { id, username, nip, role }
        next();

    } catch (error) {

        // Bedain pesan token expired vs token rusak/invalid, biar
        // frontend bisa kasih tau user alasannya lebih jelas
        if (error.name === "TokenExpiredError") {

            return res.status(401).json({

                success: false,
                message: "Sesi login sudah habis. Silakan login ulang.",

            });

        }

        return res.status(401).json({

            success: false,
            message: "Token tidak valid. Silakan login ulang.",

        });

    }

}

// ===========================
// Middleware: authorizeRoles
// Opsional, dipasang PER-ROUTE (bukan global) kalau ada endpoint yang
// cuma boleh diakses role tertentu. Contoh pemakaian:
//   router.delete("/:id", verifyToken, authorizeRoles("admin"), Controller.destroy);
// ===========================
function authorizeRoles(...allowedRoles) {

    return (req, res, next) => {

        if (!req.user || !allowedRoles.includes(req.user.role)) {

            return res.status(403).json({

                success: false,
                message: "Anda tidak memiliki akses untuk aksi ini.",

            });

        }

        next();

    };

}

module.exports = { verifyToken, authorizeRoles };
