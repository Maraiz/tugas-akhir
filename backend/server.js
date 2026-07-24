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

// Supaya file excel yang diarsip (uploads/bkr/...) bisa diakses/didownload
// lewat URL, misal http://localhost:5000/uploads/bkr/namafile.xlsx
app.use("/uploads", express.static("uploads"));

// =====================================
// Routes
// =====================================

app.use("/api", routes);

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
🌐 Server      : http://localhost:${PORT}/api
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
