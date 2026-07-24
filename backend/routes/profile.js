const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const router = express.Router();

const ProfileController = require("../controllers/ProfileController");

// Pastikan folder tujuan upload foto profil ada
const uploadDir = path.join(__dirname, "../uploads/profile");
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({

    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },

    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `profile-${req.user.id}-${Date.now()}${ext}`);
    },

});

const upload = multer({

    storage,
    limits: { fileSize: 2 * 1024 * 1024 }, // maks 2MB

    fileFilter: (req, file, cb) => {

        if (!file.mimetype.startsWith("image/")) {
            return cb(new Error("File harus berupa gambar (JPG/PNG)."));
        }

        cb(null, true);

    },

});

// Semua route ini otomatis udah dilindungi verifyToken (dipasang global
// di routes.js), jadi req.user pasti ada isinya di sini
router.get("/me", ProfileController.me);
router.put("/", upload.single("foto"), ProfileController.updateProfile);
router.put("/password", ProfileController.changePassword);

module.exports = router;
