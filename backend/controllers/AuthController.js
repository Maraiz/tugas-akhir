const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { Op } = require("sequelize");

const User = require("../models/User");
const { sendResetPasswordEmail } = require("../utils/mailer");

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

    static async forgotPassword(req, res) {

        try {

            const { email } = req.body;

            if (!email) {

                return res.status(400).json({

                    success: false,
                    message: "Email wajib diisi.",

                });

            }

            const user = await User.findOne({ where: { email } });

            // PENTING: tetap balikin "success: true" walaupun emailnya
            // nggak ketemu di database — biar orang luar nggak bisa
            // "mancing" nyari tau email siapa aja yang punya akun di
            // sistem ini (information disclosure). Frontend selalu
            // nampilin pesan yang sama ke user, apapun hasilnya di sini.
            if (!user) {

                return res.status(200).json({

                    success: true,
                    message: "Kalau email terdaftar, link reset password sudah dikirim.",

                });

            }

            // Generate token acak, berlaku 1 jam
            const token = crypto.randomBytes(32).toString("hex");
            const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 jam dari sekarang

            await user.update({

                resetPasswordToken: token,
                resetPasswordExpires: expires,

            });

            try {

                await sendResetPasswordEmail(user.email, user.nama, token);

            } catch (mailError) {

                console.error("Gagal kirim email reset password:", mailError);

                // Reset token-nya balik biar user bisa coba lagi, soalnya
                // emailnya gagal kekirim
                await user.update({
                    resetPasswordToken: null,
                    resetPasswordExpires: null,
                });

                return res.status(500).json({

                    success: false,
                    message: "Gagal mengirim email. Coba lagi beberapa saat.",

                });

            }

            return res.status(200).json({

                success: true,
                message: "Kalau email terdaftar, link reset password sudah dikirim.",

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
    // POST /auth/reset-password
    // Body: { token, password }
    // ===========================
    static async resetPassword(req, res) {

        try {

            const { token, password } = req.body;

            if (!token || !password) {

                return res.status(400).json({

                    success: false,
                    message: "Data tidak lengkap.",

                });

            }

            if (password.length < 6) {

                return res.status(400).json({

                    success: false,
                    message: "Password minimal 6 karakter.",

                });

            }

            const user = await User.findOne({

                where: {
                    resetPasswordToken: token,
                },

            });

            // Token nggak ketemu ATAU udah kedaluwarsa
            if (!user || !user.resetPasswordExpires || new Date() > new Date(user.resetPasswordExpires)) {

                return res.status(400).json({

                    success: false,
                    message: "Link reset password tidak valid atau sudah kedaluwarsa. Silakan minta link baru.",

                });

            }

            const hashedPassword = await bcrypt.hash(password, 10);

            await user.update({

                password: hashedPassword,
                resetPasswordToken: null,
                resetPasswordExpires: null,

            });

            return res.status(200).json({

                success: true,
                message: "Password berhasil direset. Silakan login dengan password baru.",

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

module.exports = AuthController;