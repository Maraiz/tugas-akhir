const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const UppkaPeriode = sequelize.define(
    "uppka_periodes",
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

        namaFile: {
            type: DataTypes.STRING,
            allowNull: false,
        },

        pathFile: {
            type: DataTypes.STRING, // path relatif file excel asli, buat arsip/audit trail
            allowNull: true,
        },

        jumlahKecamatan: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
        },

        rataCapaian: {
            type: DataTypes.FLOAT, // rata-rata dari (pctLapor + pctHadir) / 2 semua kecamatan
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
        tableName: "uppka_periodes",
        timestamps: true,

        indexes: [
            {
                unique: true,
                fields: ["bulan", "tahun"], // satu periode cuma boleh ada 1 kali
            },
        ],
    }
);

module.exports = UppkaPeriode;
