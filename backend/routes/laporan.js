const express = require("express");

const router = express.Router();

const LaporanController = require("../controllers/LaporanController");

// Semua read-only — Laporan cuma nyusun ulang data yang udah ada di 5 tabel
// Periode/Detail masing-masing program, gak ada data baru yang disimpan.
router.get("/opsi", LaporanController.opsi);
router.get("/tren", LaporanController.tren);
router.get("/ranking", LaporanController.ranking);
router.get("/program", LaporanController.perbandinganProgram);

module.exports = router;
