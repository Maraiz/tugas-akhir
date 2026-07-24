const bcrypt = require("bcrypt");
const fs = require("fs");
const path = require("path");

const User = require("../models/User");

// Field yang boleh dikirim balik ke frontend (password TIDAK PERNAH dikirim)
const SAFE_ATTRIBUTES = ["id", "nama", "username", "nip", "email", "foto", "role", "kecamatan", "createdAt"];

class ProfileController {

    // ===========================
    // GET /profile/me
    // Ambil data profil user yang lagi login (dari req.user hasil verifyToken)
    // ===========================
    static async me(req, res) {

        try {

            const user = await User.findByPk(req.user.id, {
                attributes: SAFE_ATTRIBUTES,
            });

            if (!user) {

                return res.status(404).json({
                    success: false,
                    message: "User tidak ditemukan.",
                });

            }

            return res.status(200).json({
                success: true,
                data: user,
            });

        } catch (error) {

            console.error(error);

            return res.status(500).json({
                success: false,
                message: "Terjadi kesalahan server.",
            });

        }

    }

    // ===========================
    // PUT /profile
    // Update nama/username/email/foto milik SENDIRI — id diambil dari
    // token (req.user.id), BUKAN dari parameter URL. Ini penting biar
    // orang nggak bisa "ngedit" profil orang lain cuma dengan ngoprek
    // URL/body request.
    // ===========================
    static async updateProfile(req, res) {

        try {

            const user = await User.findByPk(req.user.id);

            if (!user) {

                return res.status(404).json({
                    success: false,
                    message: "User tidak ditemukan.",
                });

            }

            const { nama, username, email } = req.body;

            if (!nama) {

                return res.status(400).json({
                    success: false,
                    message: "Nama wajib diisi.",
                });

            }

            // Cek duplikasi username (kalau diisi & beda dari yang lama)
            if (username && username !== user.username) {

                const cekUsername = await User.findOne({ where: { username } });

                if (cekUsername && cekUsername.id !== user.id) {

                    return res.status(409).json({
                        success: false,
                        message: "Username sudah digunakan.",
                    });

                }

            }

            // Cek duplikasi email (kalau diisi & beda dari yang lama)
            if (email && email !== user.email) {

                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {

                    return res.status(400).json({
                        success: false,
                        message: "Format email tidak valid.",
                    });

                }

                const cekEmail = await User.findOne({ where: { email } });

                if (cekEmail && cekEmail.id !== user.id) {

                    return res.status(409).json({
                        success: false,
                        message: "Email sudah digunakan.",
                    });

                }

            }

            const updateData = {
                nama,
                username: username || null,
                email: email || null,
            };

            // Kalau ada file foto baru diupload, hapus foto lama dulu
            // (biar nggak numpuk file nggak kepake di server)
            if (req.file) {

                if (user.foto) {

                    const oldPath = path.join(__dirname, "..", user.foto);

                    if (fs.existsSync(oldPath)) {
                        fs.unlinkSync(oldPath);
                    }

                }

                updateData.foto = `uploads/profile/${req.file.filename}`;

            }

            await user.update(updateData);

            const updated = await User.findByPk(user.id, { attributes: SAFE_ATTRIBUTES });

            return res.status(200).json({
                success: true,
                message: "Profil berhasil diperbarui.",
                data: updated,
            });

        } catch (error) {

            console.error(error);

            return res.status(500).json({
                success: false,
                message: "Terjadi kesalahan server.",
            });

        }

    }

    // ===========================
    // PUT /profile/password
    // Ganti password SENDIRI — wajib masukin password lama dulu buat
    // verifikasi (bukan cuma langsung ganti tanpa validasi)
    // ===========================
    static async changePassword(req, res) {

        try {

            const { currentPassword, newPassword } = req.body;

            if (!currentPassword || !newPassword) {

                return res.status(400).json({
                    success: false,
                    message: "Password lama dan password baru wajib diisi.",
                });

            }

            if (newPassword.length < 6) {

                return res.status(400).json({
                    success: false,
                    message: "Password baru minimal 6 karakter.",
                });

            }

            const user = await User.findByPk(req.user.id);

            if (!user) {

                return res.status(404).json({
                    success: false,
                    message: "User tidak ditemukan.",
                });

            }

            const match = await bcrypt.compare(currentPassword, user.password);

            if (!match) {

                return res.status(401).json({
                    success: false,
                    message: "Password lama salah.",
                });

            }

            const hashedPassword = await bcrypt.hash(newPassword, 10);

            await user.update({ password: hashedPassword });

            return res.status(200).json({
                success: true,
                message: "Password berhasil diubah.",
            });

        } catch (error) {

            console.error(error);

            return res.status(500).json({
                success: false,
                message: "Terjadi kesalahan server.",
            });

        }

    }

}

module.exports = ProfileController;