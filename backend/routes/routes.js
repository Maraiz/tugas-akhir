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
// User Management
// ==============================

router.use("/users", require("./users"));

// ==============================
// Monitoring BKR
// ==============================

router.use("/bkr", require("./bkr"));

module.exports = router;