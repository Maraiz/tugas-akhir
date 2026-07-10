const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/database");

const BkrDetail = sequelize.define(
    "bkr_details",
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

        jumlahAnggota: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
        },

        jumlahHadir: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
        },

        pctHadir: {
            type: DataTypes.FLOAT,
            allowNull: false,
            defaultValue: 0,
        },
    },
    {
        tableName: "bkr_details",
        timestamps: true,
    }
);

module.exports = BkrDetail;
