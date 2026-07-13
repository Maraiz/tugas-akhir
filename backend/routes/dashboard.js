const express = require("express");

const router = express.Router();

const DashboardController = require("../controllers/DashboardController");

// Cuma 1 endpoint, gabungan semua data yang dibutuhkan Dashboard Admin
router.get("/", DashboardController.index);

module.exports = router;
