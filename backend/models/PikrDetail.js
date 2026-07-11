const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const PikrDetail = sequelize.define(
    "pikr_details",
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },

        periodeId: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },

        kode: {
            type: DataTypes.STRING,
            allowNull: true,
        },

        kecamatan: {
            type: DataTypes.STRING,
            allowNull: false,
        },

        // ===== Jumlah Poktan =====
        ada: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
        },

        lapor: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
        },

        pctLapor: {
            type: DataTypes.FLOAT,
            allowNull: false,
            defaultValue: 0,
        },

        // Jumlah Remaja Hadir Pertemuan Sosialisasi PKBR (dari kolom 6 Tabel 7A).
        // PIK-R nggak punya pasangan Anggota/Capaian kayak program lain,
        // cuma 1 angka ini yang dipakai buat laporan MONEV-nya.
        jumlahPkbr: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
        },
    },
    {
        tableName: "pikr_details",
        timestamps: true,
    }
);

module.exports = PikrDetail;
