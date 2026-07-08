const bcrypt = require("bcrypt");

const User = require("../models/User");

// Field yang boleh dikirim balik ke frontend (password TIDAK PERNAH dikirim)
const SAFE_ATTRIBUTES = ["id", "nama", "username", "nip", "role", "kecamatan", "createdAt", "updatedAt"];

class UserController {

    // ===========================
    // GET /users - list semua user
    // Query optional: ?role=petugas untuk filter role tertentu
    // ===========================
    static async index(req, res) {

        try {

            const { role } = req.query;

            const where = {};
            if (role) {
                where.role = role;
            }

            const users = await User.findAll({

                where,

                attributes: SAFE_ATTRIBUTES,

                order: [["nama", "ASC"]],

            });

            return res.status(200).json({

                success: true,
                data: users,

            });

        } catch (error) {

            console.error(error);

            return res.status(500).json({

                success: false,
                message: "Terjadi kesalahan server.",

            });

        }

    }

    static async store(req, res) {

        try {

            const {
                nama,
                username,
                nip,
                password,
                role,
                kecamatan,
            } = req.body;

            if (!nama || !password || !role) {

                return res.status(400).json({

                    success: false,

                    message: "Data wajib diisi."

                });

            }

            // ===========================
            // Admin
            // ===========================

            if (role === "admin") {

                if (!username) {

                    return res.status(400).json({

                        success: false,

                        message: "Username wajib diisi."

                    });

                }

                const cekUsername = await User.findOne({

                    where: {
                        username
                    }

                });

                if (cekUsername) {

                    return res.status(409).json({

                        success: false,

                        message: "Username sudah digunakan."

                    });

                }

            }

            // ===========================
            // Petugas / User
            // ===========================

            if (role === "petugas" || role === "user") {

                if (!nip) {

                    return res.status(400).json({

                        success: false,

                        message: "NIP wajib diisi."

                    });

                }

                if (role === "petugas" && !kecamatan) {

                    return res.status(400).json({

                        success: false,

                        message: "Kecamatan wajib diisi untuk petugas."

                    });

                }

                const cekNip = await User.findOne({

                    where: {
                        nip
                    }

                });

                if (cekNip) {

                    return res.status(409).json({

                        success: false,

                        message: "NIP sudah digunakan."

                    });

                }

            }

            const hashedPassword = await bcrypt.hash(

                password,

                10

            );

            const user = await User.create({

                nama,

                username: role === "admin" ? username : null,

                nip: role === "admin" ? null : nip,

                password: hashedPassword,

                role,

                kecamatan: role === "petugas" ? kecamatan : null,

            });

            // Jangan kirim balik password (walau sudah hash)
            const { password: _pw, ...userSafe } = user.toJSON();

            return res.status(201).json({

                success: true,

                message: `${role} berhasil ditambahkan.`,

                data: userSafe

            });

        } catch (error) {

            console.error(error);

            return res.status(500).json({

                success: false,

                message: "Terjadi kesalahan server."

            });

        }

    }

    // ===========================
    // PUT /users/:id - update user
    // Password bersifat OPSIONAL: kalau field password dikirim kosong/tidak
    // dikirim sama sekali, password lama tetap dipakai (tidak diubah).
    // ===========================
    static async update(req, res) {

        try {

            const { id } = req.params;

            const user = await User.findByPk(id);

            if (!user) {

                return res.status(404).json({

                    success: false,
                    message: "User tidak ditemukan.",

                });

            }

            const {
                nama,
                username,
                nip,
                password,
                role,
                kecamatan,
            } = req.body;

            const targetRole = role || user.role;

            if (targetRole === "admin" && !username) {

                return res.status(400).json({

                    success: false,
                    message: "Username wajib diisi.",

                });

            }

            if ((targetRole === "petugas" || targetRole === "user") && !nip) {

                return res.status(400).json({

                    success: false,
                    message: "NIP wajib diisi.",

                });

            }

            if (targetRole === "petugas" && !kecamatan) {

                return res.status(400).json({

                    success: false,
                    message: "Kecamatan wajib diisi untuk petugas.",

                });

            }

            // Cek duplikasi username/NIP milik user LAIN (bukan dirinya sendiri)
            if (targetRole === "admin" && username) {

                const cekUsername = await User.findOne({
                    where: { username },
                });

                if (cekUsername && cekUsername.id !== user.id) {

                    return res.status(409).json({
                        success: false,
                        message: "Username sudah digunakan.",
                    });

                }

            }

            if ((targetRole === "petugas" || targetRole === "user") && nip) {

                const cekNip = await User.findOne({
                    where: { nip },
                });

                if (cekNip && cekNip.id !== user.id) {

                    return res.status(409).json({
                        success: false,
                        message: "NIP sudah digunakan.",
                    });

                }

            }

            const updateData = {

                nama: nama || user.nama,

                username: targetRole === "admin" ? username : null,

                nip: targetRole === "admin" ? null : nip,

                role: targetRole,

                kecamatan: targetRole === "petugas" ? kecamatan : null,

            };

            // Hanya update password kalau field-nya diisi (tidak kosong)
            if (password && password.trim() !== "") {

                updateData.password = await bcrypt.hash(password, 10);

            }

            await user.update(updateData);

            const { password: _pw, ...userSafe } = user.toJSON();

            return res.status(200).json({

                success: true,
                message: "User berhasil diperbarui.",
                data: userSafe,

            });

        } catch (error) {

            console.error(error);

            return res.status(500).json({

                success: false,
                message: "Terjadi kesalahan server.",

            });

        }

    }

    static async destroy(req, res) {

        try {

            const { id } = req.params;

            const user = await User.findByPk(id);

            if (!user) {

                return res.status(404).json({

                    success: false,
                    message: "User tidak ditemukan."

                });

            }

            await user.destroy();

            return res.status(200).json({

                success: true,
                message: "User berhasil dihapus."

            });

        } catch (error) {

            console.error(error);

            return res.status(500).json({

                success: false,
                message: "Terjadi kesalahan server."

            });

        }

    }

}

module.exports = UserController;
