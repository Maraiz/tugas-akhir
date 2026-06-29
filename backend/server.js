require("dotenv").config();

const express = require("express");
const cors = require("cors");

const { connectDatabase } = require("./config/database");
const routes = require("./routes/routes");

const app = express();

// =====================================
// Middleware
// =====================================

app.use(cors());

app.use(express.json());

app.use(express.urlencoded({ extended: true }));

// =====================================
// Routes
// =====================================

app.use("/", routes);

// =====================================
// Start Server
// =====================================

const PORT = process.env.PORT || 5000;

const startServer = async () => {

    try {

        // Koneksi Database
        await connectDatabase();

        // Jalankan Server
        app.listen(PORT, () => {

            console.log(`
===========================================
🚀 Monitoring Poktan API
🌐 Server      : http://localhost:${PORT}
📦 Environment : ${process.env.NODE_ENV || "development"}
===========================================
`);

        });

    } catch (error) {

        console.error("❌ Gagal menjalankan server.");
        console.error(error);

    }

};

startServer();