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
    },
    {
        tableName: "users",
        timestamps: true,
    }
);

module.exports = User;