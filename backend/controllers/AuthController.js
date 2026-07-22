const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { Op } = require("sequelize");

const User = require("../models/User");

class AuthController {
    static async login(req, res) {

        try {

            const { login, password } = req.body;

            if (!login || !password) {

                return res.status(400).json({

                    success: false,

                    message: "Username/NIP dan password wajib diisi."

                });

            }

            const user = await User.findOne({

                where: {

                    [Op.or]: [

                        { username: login },

                        { nip: login }

                    ]

                }

            });

            if (!user) {

                return res.status(401).json({

                    success: false,

                    message: "Username atau NIP tidak ditemukan."

                });

            }

            const match = await bcrypt.compare(

                password,

                user.password

            );

            if (!match) {

                return res.status(401).json({

                    success: false,

                    message: "NIP atau Password salah."

                });

            }

            const token = jwt.sign(

                {

                    id: user.id,

                    username: user.username,

                    nip: user.nip,

                    role: user.role

                },

                process.env.JWT_SECRET,

                {

                    expiresIn: "1d"

                }

            );

            return res.status(200).json({

                success: true,

                message: "Login berhasil.",

                token,

                user: {

                    id: user.id,

                    nama: user.nama,

                    username: user.username,

                    nip: user.nip,

                    role: user.role

                }

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

module.exports = AuthController;