const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const BklDetail = sequelize.define(
    "bkl_details",
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

        // ===== Keanggotaan (dari kolom 15 + input manual) =====
        target: {
            type: DataTypes.INTEGER, // diisi manual oleh Dinas
            allowNull: false,
            defaultValue: 0,
        },

        jumlahAnggota: {
            type: DataTypes.INTEGER, // "Anggota Yg Ada", dari kolom 15
            allowNull: false,
            defaultValue: 0,
        },

        selisih: {
            type: DataTypes.INTEGER, // jumlahAnggota - target (boleh negatif)
            allowNull: false,
            defaultValue: 0,
        },

        // ===== Kehadiran (dari kolom 16) =====
        jumlahHadir: {
            type: DataTypes.INTEGER, // "Capaian", dari kolom 16
            allowNull: false,
            defaultValue: 0,
        },

        pctThdTarget: {
            type: DataTypes.FLOAT, // jumlahHadir / target * 100
            allowNull: false,
            defaultValue: 0,
        },

        pctThdAnggota: {
            type: DataTypes.FLOAT, // jumlahHadir / jumlahAnggota * 100
            allowNull: false,
            defaultValue: 0,
        },
    },
    {
        tableName: "bkl_details",
        timestamps: true,
    }
);

module.exports = BklDetail;
