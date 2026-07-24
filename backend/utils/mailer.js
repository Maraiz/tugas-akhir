const nodemailer = require("nodemailer");

// ===========================
// Transporter — konfigurasi SMTP diambil dari .env, JANGAN di-hardcode
// di sini. Isi .env kamu (lihat instruksi setup di chat).
// ===========================
const transporter = nodemailer.createTransport({

    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT) || 587,
    secure: Number(process.env.EMAIL_PORT) === 465, // true buat port 465, false buat 587/25

    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },

});

// ===========================
// sendResetPasswordEmail
// Kirim email berisi link reset password. Link-nya ngarah ke halaman
// frontend /reset-password?token=xxx (lihat ResetPassword.jsx)
// ===========================
async function sendResetPasswordEmail(toEmail, nama, token) {

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
            <h2 style="color: #1565c0;">Reset Password — Monitoring Poktan</h2>
            <p>Halo <b>${nama}</b>,</p>
            <p>Kami menerima permintaan buat reset password akun kamu di Sistem Monitoring Poktan Dinsos PPKB Banyuwangi. Klik tombol di bawah buat bikin password baru:</p>
            <p style="text-align: center; margin: 32px 0;">
                <a href="${resetUrl}"
                   style="background: linear-gradient(135deg,#4f3cc9,#6c52e3); color: #fff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
                    Reset Password
                </a>
            </p>
            <p style="font-size: 12px; color: #888;">Link ini cuma berlaku 1 jam. Kalau kamu nggak minta reset password, abaikan aja email ini — password kamu tetap aman.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
            <p style="font-size: 11px; color: #aaa;">Dinas Sosial, Pemberdayaan Perempuan dan Keluarga Berencana Kabupaten Banyuwangi</p>
        </div>
    `;

    await transporter.sendMail({

        from: `"Monitoring Poktan" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
        to: toEmail,
        subject: "Reset Password — Monitoring Poktan",
        html,

    });

}

module.exports = { sendResetPasswordEmail };
