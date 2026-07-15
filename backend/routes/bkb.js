const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const router = express.Router();

const BkbController = require("../controllers/BkbController");

// ==============================
// Konfigurasi Multer - arsip 2 file Excel (Tabel 3A & 3B) ke folder uploads/bkb
// ==============================

const uploadDir = path.join(__dirname, "..", "uploads", "bkb");

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({

    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },

    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    },

});

const upload = multer({

    storage,

    limits: {
        fileSize: 10 * 1024 * 1024, // maks 10MB per file
    },

    fileFilter: (req, file, cb) => {

        const allowedExt = [".xlsx", ".xls", ".csv"];
        const ext = path.extname(file.originalname).toLowerCase();

        if (!allowedExt.includes(ext)) {
            return cb(new Error("Format file harus .xlsx, .xls, atau .csv"));
        }

        cb(null, true);

    },

});

// upload.fields() dipakai karena BKB butuh 2 file sekaligus (bukan 1 kayak BKR),
// field name di FormData harus "file1" dan "file2"
const uploadTwoFiles = upload.fields([
    { name: "file1", maxCount: 1 },
    { name: "file2", maxCount: 1 },
]);

// ==============================
// Routes
// ==============================

router.get("/", BkbController.index);
router.get("/:id", BkbController.show);
router.post("/", uploadTwoFiles, BkbController.store);
router.put("/:id", BkbController.update);
router.delete("/:id", BkbController.destroy);

module.exports = router;
