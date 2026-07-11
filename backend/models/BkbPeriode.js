const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const BkbPeriode = sequelize.define(
    "bkb_periodes",
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },

        bulan: {
            type: DataTypes.INTEGER, // 1 - 12
            allowNull: false,
        },

        tahun: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },

        // BKB butuh 2 file sumber (Tabel 3A dan Tabel 3B), jadi arsipnya dobel
        namaFile1: {
            type: DataTypes.STRING, // Tabel 3A
            allowNull: false,
        },

        pathFile1: {
            type: DataTypes.STRING,
            allowNull: true,
        },

        namaFile2: {
            type: DataTypes.STRING, // Tabel 3B
            allowNull: false,
        },

        pathFile2: {
            type: DataTypes.STRING,
            allowNull: true,
        },

        jumlahKecamatan: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
        },

        rataCapaian: {
            type: DataTypes.FLOAT, // rata-rata % Terhadap Target seluruh kecamatan
            allowNull: false,
            defaultValue: 0,
        },

        diuploadOlehId: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },

        diuploadOlehNama: {
            type: DataTypes.STRING,
            allowNull: true,
        },
    },
    {
        tableName: "bkb_periodes",
        timestamps: true,

        indexes: [
            {
                unique: true,
                fields: ["bulan", "tahun"], // satu periode cuma boleh ada 1 kali
            },
        ],
    }
);

module.exports = BkbPeriode;
