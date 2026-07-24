const express = require("express");

const router = express.Router();

// ==============================
// Root API
// ==============================

router.get("/", (req, res) => {

    res.status(200).json({
        success: true,
        message: "Monitoring Poktan API berhasil dijalankan."

    });

});

// ==============================
// Authentication
// ==============================

router.use("/auth", require("./auth"));

// ==============================
// Proteksi login — semua route DI BAWAH baris ini wajib kirim token
// JWT valid di header "Authorization: Bearer <token>"
// ==============================

const { verifyToken } = require("../middleware/auth");
router.use(verifyToken);

router.use("/profile", require("./profile"));

// ==============================
// User Management
// ==============================

router.use("/users", require("./users"));

// ==============================
// Monitoring BKR
// ==============================

router.use("/bkr", require("./bkr"));

// ==============================
// Monitoring BKB
// ==============================

router.use("/bkb", require("./bkb"));

// ==============================
// Monitoring BKL
// ==============================

router.use("/bkl", require("./bkl"));

// ==============================
// Monitoring PIK-R
// ==============================

router.use("/pikr", require("./pikr"));

// ==============================
// Monitoring UPPKA
// ==============================

router.use("/uppka", require("./uppka"));

// ==============================
// Riwayat Upload (gabungan lintas program, read-only)
// ==============================

router.use("/riwayat-upload", require("./riwayatUpload"));

router.use("/laporan", require("./laporan"));

router.use("/dashboard", require("./dashboard"));

module.exports = router;