const bcrypt = require("bcrypt");

const User = require("../models/User");

// Field yang boleh dikirim balik ke frontend (password TIDAK PERNAH dikirim)
const SAFE_ATTRIBUTES = ["id", "nama", "username", "nip", "email", "role", "kecamatan", "createdAt", "updatedAt"];

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
                email,
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

            if (role === "user" && !username) {

                return res.status(400).json({

                    success: false,

                    message: "Username wajib diisi untuk role User."

                });

            }

            if (role === "petugas" && !nip) {

                return res.status(400).json({

                    success: false,

                    message: "NIP wajib diisi untuk role Petugas."

                });

            }

            if (role === "petugas" || role === "user") {

                if (role === "petugas" && !kecamatan) {

                    return res.status(400).json({

                        success: false,

                        message: "Kecamatan wajib diisi untuk petugas."

                    });

                }

                // Username cuma relevan buat role User (Admin sudah dicek di atas)
                if (role === "user" && username) {

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

                if (nip) {

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

            }

            // Email opsional buat semua role — kalau diisi, cek duplikatnya
            if (email) {

                const cekEmail = await User.findOne({

                    where: {
                        email
                    }

                });

                if (cekEmail) {

                    return res.status(409).json({

                        success: false,

                        message: "Email sudah digunakan."

                    });

                }

            }

            const hashedPassword = await bcrypt.hash(

                password,

                10

            );

            const user = await User.create({

                nama,

                username: (role === "admin" || role === "user") ? (username || null) : null,

                nip: role === "admin" ? null : (nip || null),

                email: email || null,

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
                email,
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

            // NIP sekarang OPSIONAL — nggak wajib diisi lagi buat role User.
            // (Cek duplikat NIP tetap jalan di bawah, kalau field-nya diisi.)

            if (targetRole === "user" && !username) {

                return res.status(400).json({

                    success: false,
                    message: "Username wajib diisi untuk role User.",

                });

            }

            if (targetRole === "petugas" && !nip) {

                return res.status(400).json({

                    success: false,
                    message: "NIP wajib diisi untuk role Petugas.",

                });

            }

            if (targetRole === "petugas" && !kecamatan) {

                return res.status(400).json({

                    success: false,
                    message: "Kecamatan wajib diisi untuk petugas.",

                });

            }

            // Cek duplikasi username/NIP milik user LAIN (bukan dirinya sendiri)
            if ((targetRole === "admin" || targetRole === "user") && username) {

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

            // Cek duplikasi email milik user LAIN (bukan dirinya sendiri)
            if (email) {

                const cekEmail = await User.findOne({
                    where: { email },
                });

                if (cekEmail && cekEmail.id !== user.id) {

                    return res.status(409).json({
                        success: false,
                        message: "Email sudah digunakan.",
                    });

                }

            }

            const updateData = {

                nama: nama || user.nama,

                username: (targetRole === "admin" || targetRole === "user") ? (username || null) : null,

                nip: targetRole === "admin" ? null : (nip || null),

                email: email || null,

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
