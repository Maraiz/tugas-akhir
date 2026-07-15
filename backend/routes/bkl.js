const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const router = express.Router();

const BklController = require("../controllers/BklController");

// ==============================
// Konfigurasi Multer - arsip file Excel asli ke folder uploads/bkl
// ==============================

const uploadDir = path.join(__dirname, "..", "uploads", "bkl");

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
        fileSize: 10 * 1024 * 1024, // maks 10MB
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

router.get("/", BklController.index);
router.get("/:id", BklController.show);
router.post("/", upload.single("file"), BklController.store);
router.put("/:id", BklController.update);
router.delete("/:id", BklController.destroy);

module.exports = router;
