const fs = require("fs");
const path = require("path");

const UppkaPeriode = require("../models/UppkaPeriode");
const UppkaDetail = require("../models/UppkaDetail");

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

class UppkaController {

    // ===========================
    // GET /uppka - list semua periode (buat halaman List)
    // Query optional: ?tahun=2026
    // ===========================
    static async index(req, res) {

        try {

            const { tahun } = req.query;

            const where = {};
            if (tahun) {
                where.tahun = tahun;
            }

            const periods = await UppkaPeriode.findAll({

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
    // GET /uppka/:id - detail 1 periode lengkap dengan baris per kecamatan
    // ===========================
    static async show(req, res) {

        try {

            const { id } = req.params;

            const periode = await UppkaPeriode.findByPk(id);

            if (!periode) {

                return res.status(404).json({

                    success: false,
                    message: "Data periode tidak ditemukan.",

                });

            }

            const details = await UppkaDetail.findAll({

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
    // POST /uppka - simpan hasil wizard upload (multipart/form-data)
    //
    // Field yang dikirim dari frontend:
    // - file        : file Excel Tabel 6B (diarsipkan, ditangani middleware multer)
    // - bulan       : angka 1-12
    // - tahun       : angka, mis. 2026
    // - rows        : JSON string dari array hasil parsing, tiap elemen:
    //                  { kode, kecamatan, ada, lapor, pctLapor, jumlah_anggota, jumlah_hadir, pctHadir }
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
            const existing = await UppkaPeriode.findOne({

                where: { bulan, tahun },

            });

            if (existing) {

                if (req.file) fs.unlinkSync(req.file.path);

                return res.status(409).json({

                    success: false,
                    message: `Data untuk periode ${BULAN_LABEL[bulan]} ${tahun} sudah ada. Hapus data lama dulu kalau mau upload ulang.`,

                });

            }

            // Hitung rata-rata capaian kabupaten dari seluruh kecamatan
            // (self-computed, tanpa target — sama pola kayak BKR)
            const rataCapaian = parsedRows.reduce((sum, r) => {
                const pctLapor = Number(r.pctLapor) || 0;
                const pctHadir = Number(r.pctHadir) || 0;
                return sum + (pctLapor + pctHadir) / 2;
            }, 0) / parsedRows.length;

            const periode = await UppkaPeriode.create({

                bulan,
                tahun,

                namaFile: req.file ? req.file.originalname : "-",
                pathFile: req.file ? `uploads/uppka/${req.file.filename}` : null,

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

                jumlahAnggota: Number(r.jumlah_anggota) || 0,
                jumlahHadir: Number(r.jumlah_hadir) || 0,
                pctHadir: Number(r.pctHadir) || 0,

            }));

            await UppkaDetail.bulkCreate(detailRecords);

            return res.status(201).json({

                success: true,
                message: "Data monitoring UPPKA berhasil disimpan.",
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
    // DELETE /uppka/:id - hapus 1 periode beserta seluruh baris kecamatannya
    // dan file excel arsipnya
    // ===========================
    static async destroy(req, res) {

        try {

            const { id } = req.params;

            const periode = await UppkaPeriode.findByPk(id);

            if (!periode) {

                return res.status(404).json({

                    success: false,
                    message: "Data periode tidak ditemukan.",

                });

            }

            await UppkaDetail.destroy({
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
                message: "Data periode UPPKA berhasil dihapus.",

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
    // PUT /uppka/:id - update data per-kecamatan yang sudah tersimpan
    //
    // Body JSON:
    // - rows : array baris yang diedit, tiap elemen:
    //          { id, ada, lapor, jumlahAnggota, jumlahHadir }
    // ===========================
    static async update(req, res) {

        try {

            const { id } = req.params;
            const { rows } = req.body;

            const periode = await UppkaPeriode.findByPk(id);

            if (!periode) {

                return res.status(404).json({

                    success: false,
                    message: "Data periode tidak ditemukan.",

                });

            }

            if (!Array.isArray(rows) || rows.length === 0) {

                return res.status(400).json({

                    success: false,
                    message: "Data rows tidak boleh kosong.",

                });

            }

            for (const r of rows) {

                const detail = await UppkaDetail.findOne({

                    where: { id: r.id, periodeId: id },

                });

                if (!detail) continue;

                const ada = Number(r.ada) || 0;
                const lapor = Number(r.lapor) || 0;
                const jumlahAnggota = Number(r.jumlahAnggota) || 0;
                const jumlahHadir = Number(r.jumlahHadir) || 0;

                await detail.update({

                    ada,
                    lapor,
                    pctLapor: ada > 0 ? (lapor / ada) * 100 : 0,

                    jumlahAnggota,
                    jumlahHadir,
                    pctHadir: jumlahAnggota > 0 ? (jumlahHadir / jumlahAnggota) * 100 : 0,

                });

            }

            const semuaDetail = await UppkaDetail.findAll({ where: { periodeId: id } });

            const rataCapaian = semuaDetail.reduce((sum, d) => {
                return sum + (Number(d.pctLapor) + Number(d.pctHadir)) / 2;
            }, 0) / semuaDetail.length;

            await periode.update({ rataCapaian: Number(rataCapaian.toFixed(2)) });

            return res.status(200).json({

                success: true,
                message: "Data berhasil diperbarui.",

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

module.exports = UppkaController;
