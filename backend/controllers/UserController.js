const bcrypt = require("bcrypt");

const User = require("../models/User");

class UserController {

    static async store(req, res) {

        try {

            const {
                nama,
                username,
                nip,
                password,
                role
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

                role

            });

            return res.status(201).json({

                success: true,

                message: `${role} berhasil ditambahkan.`,

                data: user

            });

        } catch (error) {

            console.error(error);

            return res.status(500).json({

                success: false,

                message: "Terjadi kesalahan server."

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