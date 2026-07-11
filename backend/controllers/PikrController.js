const fs = require("fs");
const path = require("path");

const PikrPeriode = require("../models/PikrPeriode");
const PikrDetail = require("../models/PikrDetail");

const BULAN_LABEL = [
    "", "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

function formatPeriode(row) {
    const plain = row.toJSON ? row.toJSON() : row;
    return {
        ...plain,
        periode: `${BULAN_LABEL[plain.bulan] || "-"} ${plain.tahun}`,
    };
}

class PikrController {

    // ===========================
    // GET /pikr - list semua periode (buat halaman List)
    // Query optional: ?tahun=2026
    // ===========================
    static async index(req, res) {

        try {

            const { tahun } = req.query;

            const where = {};
            if (tahun) {
                where.tahun = tahun;
            }

            const periods = await PikrPeriode.findAll({

                where,

                order: [
                    ["tahun", "DESC"],
                    ["bulan", "DESC"],
                ],

            });

            return res.status(200).json({

                success: true,
                data: periods.map(formatPeriode),

            });

        } catch (error) {

            console.error(error);

            return res.status(500).json({

                success: false,
                message: "Terjadi kesalahan server.",

            });

        }

    }

    // ===========================
    // GET /pikr/:id - detail 1 periode lengkap dengan baris per kecamatan
    // ===========================
    static async show(req, res) {

        try {

            const { id } = req.params;

            const periode = await PikrPeriode.findByPk(id);

            if (!periode) {

                return res.status(404).json({

                    success: false,
                    message: "Data periode tidak ditemukan.",

                });

            }

            const details = await PikrDetail.findAll({

                where: { periodeId: id },

                order: [["kode", "ASC"]],

            });

            return res.status(200).json({

                success: true,

                data: {
                    ...formatPeriode(periode),
                    details,
                },

            });

        } catch (error) {

            console.error(error);

            return res.status(500).json({

                success: false,
                message: "Terjadi kesalahan server.",

            });

        }

    }

    // ===========================
    // POST /pikr - simpan hasil wizard upload (multipart/form-data)
    //
    // Field yang dikirim dari frontend:
    // - file        : file Excel Tabel 7A (diarsipkan, ditangani middleware multer)
    // - bulan       : angka 1-12
    // - tahun       : angka, mis. 2026
    // - rows        : JSON string dari array hasil parsing, tiap elemen:
    //                  { kode, kecamatan, ada, lapor, pctLapor, jumlah_pkbr }
    // - uploadedBy  : nama pengguna yang login (opsional)
    // ===========================
    static async store(req, res) {

        try {

            const { bulan, tahun, rows, uploadedBy, uploadedById } = req.body;

            if (!bulan || !tahun || !rows) {

                if (req.file) fs.unlinkSync(req.file.path);

                return res.status(400).json({

                    success: false,
                    message: "Data bulan, tahun, dan rows wajib diisi.",

                });

            }

            let parsedRows;
            try {
                parsedRows = JSON.parse(rows);
            } catch (e) {

                if (req.file) fs.unlinkSync(req.file.path);

                return res.status(400).json({

                    success: false,
                    message: "Format data rows tidak valid.",

                });
            }

            if (!Array.isArray(parsedRows) || parsedRows.length === 0) {

                if (req.file) fs.unlinkSync(req.file.path);

                return res.status(400).json({

                    success: false,
                    message: "Data rows tidak boleh kosong.",

                });

            }

            // Cegah upload dobel buat bulan+tahun yang sama
            const existing = await PikrPeriode.findOne({

                where: { bulan, tahun },

            });

            if (existing) {

                if (req.file) fs.unlinkSync(req.file.path);

                return res.status(409).json({

                    success: false,
                    message: `Data untuk periode ${BULAN_LABEL[bulan]} ${tahun} sudah ada. Hapus data lama dulu kalau mau upload ulang.`,

                });

            }

            // Rata-rata capaian kabupaten dipakai buat kolom "Rata-rata Capaian" di
            // List, dihitung dari pctLapor tiap kecamatan (self-computed, tanpa target)
            const rataCapaian = parsedRows.reduce((sum, r) => {
                return sum + (Number(r.pctLapor) || 0);
            }, 0) / parsedRows.length;

            const periode = await PikrPeriode.create({

                bulan,
                tahun,

                namaFile: req.file ? req.file.originalname : "-",
                pathFile: req.file ? `uploads/pikr/${req.file.filename}` : null,

                jumlahKecamatan: parsedRows.length,
                rataCapaian: Number(rataCapaian.toFixed(2)),

                diuploadOlehId: uploadedById || null,
                diuploadOlehNama: uploadedBy || "-",

            });

            const detailRecords = parsedRows.map((r) => ({

                periodeId: periode.id,

                kode: r.kode || null,
                kecamatan: r.kecamatan,

                ada: Number(r.ada) || 0,
                lapor: Number(r.lapor) || 0,
                pctLapor: Number(r.pctLapor) || 0,

                jumlahPkbr: Number(r.jumlah_pkbr) || 0,

            }));

            await PikrDetail.bulkCreate(detailRecords);

            return res.status(201).json({

                success: true,
                message: "Data monitoring PIK-R berhasil disimpan.",
                data: formatPeriode(periode),

            });

        } catch (error) {

            console.error(error);

            if (req.file) {
                try { fs.unlinkSync(req.file.path); } catch (e) { /* abaikan */ }
            }

            return res.status(500).json({

                success: false,
                message: "Terjadi kesalahan server.",

            });

        }

    }

    // ===========================
    // DELETE /pikr/:id - hapus 1 periode beserta seluruh baris kecamatannya
    // dan file excel arsipnya
    // ===========================
    static async destroy(req, res) {

        try {

            const { id } = req.params;

            const periode = await PikrPeriode.findByPk(id);

            if (!periode) {

                return res.status(404).json({

                    success: false,
                    message: "Data periode tidak ditemukan.",

                });

            }

            await PikrDetail.destroy({
                where: { periodeId: id },
            });

            if (periode.pathFile) {
                const fullPath = path.join(__dirname, "..", periode.pathFile);
                if (fs.existsSync(fullPath)) {
                    fs.unlinkSync(fullPath);
                }
            }

            await periode.destroy();

            return res.status(200).json({

                success: true,
                message: "Data periode PIK-R berhasil dihapus.",

            });

        } catch (error) {

            console.error(error);

            return res.status(500).json({

                success: false,
                message: "Terjadi kesalahan server.",

            });

        }

    }

}

module.exports = PikrController;
