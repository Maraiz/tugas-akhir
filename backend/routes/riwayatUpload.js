const express = require("express");

const router = express.Router();

const RiwayatUploadController = require("../controllers/RiwayatUploadController");

// Cuma GET — halaman ini read-only, ngambil gabungan data dari 5 tabel
// Periode yang udah ada. Nggak ada POST/PUT/DELETE karena bukan entitas
// sendiri, cuma "kaca gabungan" dari data program lain.
router.get("/", RiwayatUploadController.index);

module.exports = router;
