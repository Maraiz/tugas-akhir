const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const router = express.Router();

const BkrController = require("../controllers/BkrController");

// ==============================
// Konfigurasi Multer - arsip file Excel asli ke folder uploads/bkr
// ==============================

const uploadDir = path.join(__dirname, "..", "uploads", "bkr");

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
        fileSize: 10 * 1024 * 1024, // maks 10MB, samain sama batas di frontend
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

// ==============================
// Routes
// ==============================

router.get("/", BkrController.index);
router.get("/:id", BkrController.show);
router.post("/", upload.single("file"), BkrController.store);
router.delete("/:id", BkrController.destroy);

module.exports = router;
