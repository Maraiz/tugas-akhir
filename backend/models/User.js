const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const User = sequelize.define(
    "users",
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },

        nama: {
            type: DataTypes.STRING,
            allowNull: false,
        },

        username: {
            type: DataTypes.STRING,
            allowNull: true,
            unique: true,
        },

        nip: {
            type: DataTypes.STRING(18),
            allowNull: true,
            unique: true,
        },

        email: {
            type: DataTypes.STRING,
            allowNull: true,
            unique: true,
            // Buat kirim link/OTP reset password ke depannya — opsional
            // dulu, soalnya banyak akun lama (Petugas via Import CSV)
            // belum tentu punya email
        },

        foto: {
            type: DataTypes.STRING,
            allowNull: true,
            // Path relatif ke file foto profil, misal "uploads/profile/xxx.jpg"
        },

        resetPasswordToken: {
            type: DataTypes.STRING,
            allowNull: true,
            // Token acak yang dikirim lewat link email — dicocokkan pas
            // user klik link "Reset Password". Di-null-in lagi setelah
            // dipakai (atau kadaluwarsa)
        },

        resetPasswordExpires: {
            type: DataTypes.DATE,
            allowNull: true,
            // Batas waktu token di atas masih valid (1 jam sejak diminta)
        },

        password: {
            type: DataTypes.STRING,
            allowNull: false,
        },

        role: {
            type: DataTypes.ENUM(
                "admin",
                "petugas",
                "user"
            ),
            allowNull: false,
            defaultValue: "user",
        },

        kecamatan: {
            type: DataTypes.STRING,
            allowNull: true,
        },
    },
    {
        tableName: "users",
        timestamps: true,
    }
);

module.exports = User;