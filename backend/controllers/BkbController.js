const fs = require("fs");
const path = require("path");

const BkbPeriode = require("../models/BkbPeriode");
const BkbDetail = require("../models/BkbDetail");

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

class BkbController {

    // ===========================
    // GET /bkb - list semua periode (buat halaman List)
    // Query optional: ?tahun=2026
    // ===========================
    static async index(req, res) {

        try {

            const { tahun } = req.query;

            const where = {};
            if (tahun) {
                where.tahun = tahun;
            }

            const periods = await BkbPeriode.findAll({

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
    // GET /bkb/:id - detail 1 periode lengkap dengan baris per kecamatan
    // ===========================
    static async show(req, res) {

        try {

            const { id } = req.params;

            const periode = await BkbPeriode.findByPk(id);

            if (!periode) {

                return res.status(404).json({

                    success: false,
                    message: "Data periode tidak ditemukan.",

                });

            }

            const details = await BkbDetail.findAll({

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
    // POST /bkb - simpan hasil wizard upload (multipart/form-data)
    //
    // Field yang dikirim dari frontend:
    // - file1, file2 : file Excel Tabel 3A & 3B (diarsipkan, ditangani middleware multer)
    // - bulan        : angka 1-12
    // - tahun        : angka, mis. 2026
    // - rows         : JSON string dari array hasil parsing+perhitungan, tiap elemen:
    //                   { kode, kecamatan, ada, lapor, pctLapor, target,
    //                     jumlah_anggota, selisih, jumlah_hadir, pctThdTarget, pctThdAnggota }
    // - uploadedBy   : nama pengguna yang login (opsional)
    // ===========================
    static async store(req, res) {

        try {

            const { bulan, tahun, rows, uploadedBy, uploadedById } = req.body;

            const file1 = req.files?.file1?.[0];
            const file2 = req.files?.file2?.[0];

            if (!bulan || !tahun || !rows) {

                if (file1) fs.unlinkSync(file1.path);
                if (file2) fs.unlinkSync(file2.path);

                return res.status(400).json({

                    success: false,
                    message: "Data bulan, tahun, dan rows wajib diisi.",

                });

            }

            let parsedRows;
            try {
                parsedRows = JSON.parse(rows);
            } catch (e) {

                if (file1) fs.unlinkSync(file1.path);
                if (file2) fs.unlinkSync(file2.path);

                return res.status(400).json({

                    success: false,
                    message: "Format data rows tidak valid.",

                });
            }

            if (!Array.isArray(parsedRows) || parsedRows.length === 0) {

                if (file1) fs.unlinkSync(file1.path);
                if (file2) fs.unlinkSync(file2.path);

                return res.status(400).json({

                    success: false,
                    message: "Data rows tidak boleh kosong.",

                });

            }

            // Cegah upload dobel buat bulan+tahun yang sama
            const existing = await BkbPeriode.findOne({

                where: { bulan, tahun },

            });

            if (existing) {

                if (file1) fs.unlinkSync(file1.path);
                if (file2) fs.unlinkSync(file2.path);

                return res.status(409).json({

                    success: false,
                    message: `Data untuk periode ${BULAN_LABEL[bulan]} ${tahun} sudah ada. Hapus data lama dulu kalau mau upload ulang.`,

                });

            }

            // Rata-rata capaian kabupaten dipakai buat kolom "Rata-rata % Thd Target" di List,
            // dihitung dari pctThdTarget tiap kecamatan (indikator utama capaian BKB)
            const rataCapaian = parsedRows.reduce((sum, r) => {
                return sum + (Number(r.pctThdTarget) || 0);
            }, 0) / parsedRows.length;

            const periode = await BkbPeriode.create({

                bulan,
                tahun,

                namaFile1: file1 ? file1.originalname : "-",
                pathFile1: file1 ? `uploads/bkb/${file1.filename}` : null,

                namaFile2: file2 ? file2.originalname : "-",
                pathFile2: file2 ? `uploads/bkb/${file2.filename}` : null,

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

                target: Number(r.target) || 0,
                jumlahAnggota: Number(r.jumlah_anggota) || 0,
                selisih: Number(r.selisih) || 0,

                jumlahHadir: Number(r.jumlah_hadir) || 0,
                pctThdTarget: Number(r.pctThdTarget) || 0,
                pctThdAnggota: Number(r.pctThdAnggota) || 0,

            }));

            await BkbDetail.bulkCreate(detailRecords);

            return res.status(201).json({

                success: true,
                message: "Data monitoring BKB berhasil disimpan.",
                data: formatPeriode(periode),

            });

        } catch (error) {

            console.error(error);

            // Kalau gagal simpan ke database, hapus file yang sudah kelanjur ke-upload
            const file1 = req.files?.file1?.[0];
            const file2 = req.files?.file2?.[0];
            if (file1) { try { fs.unlinkSync(file1.path); } catch (e) { /* abaikan */ } }
            if (file2) { try { fs.unlinkSync(file2.path); } catch (e) { /* abaikan */ } }

            return res.status(500).json({

                success: false,
                message: "Terjadi kesalahan server.",

            });

        }

    }

    // ===========================
    // DELETE /bkb/:id - hapus 1 periode beserta seluruh baris kecamatannya
    // dan kedua file excel arsipnya
    // ===========================
    static async destroy(req, res) {

        try {

            const { id } = req.params;

            const periode = await BkbPeriode.findByPk(id);

            if (!periode) {

                return res.status(404).json({

                    success: false,
                    message: "Data periode tidak ditemukan.",

                });

            }

            await BkbDetail.destroy({
                where: { periodeId: id },
            });

            // Hapus kedua file excel arsipnya juga kalau ada
            [periode.pathFile1, periode.pathFile2].forEach((p) => {
                if (p) {
                    const fullPath = path.join(__dirname, "..", p);
                    if (fs.existsSync(fullPath)) {
                        fs.unlinkSync(fullPath);
                    }
                }
            });

            await periode.destroy();

            return res.status(200).json({

                success: true,
                message: "Data periode BKB berhasil dihapus.",

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
    // PUT /bkb/:id - update data per-kecamatan yang sudah tersimpan
    //
    // Body JSON:
    // - rows : array baris yang diedit, tiap elemen:
    //          { id, ada, lapor, target, jumlahAnggota, jumlahHadir }
    // ===========================
    static async update(req, res) {

        try {

            const { id } = req.params;
            const { rows } = req.body;

            const periode = await BkbPeriode.findByPk(id);

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

                const detail = await BkbDetail.findOne({

                    where: { id: r.id, periodeId: id },

                });

                if (!detail) continue;

                const ada = Number(r.ada) || 0;
                const lapor = Number(r.lapor) || 0;
                const target = Number(r.target) || 0;
                const jumlahAnggota = Number(r.jumlahAnggota) || 0;
                const jumlahHadir = Number(r.jumlahHadir) || 0;

                await detail.update({

                    ada,
                    lapor,
                    pctLapor: ada > 0 ? (lapor / ada) * 100 : 0,

                    target,
                    jumlahAnggota,
                    selisih: jumlahAnggota - target,

                    jumlahHadir,
                    pctThdTarget: target > 0 ? (jumlahHadir / target) * 100 : 0,
                    pctThdAnggota: jumlahAnggota > 0 ? (jumlahHadir / jumlahAnggota) * 100 : 0,

                });

            }

            const semuaDetail = await BkbDetail.findAll({ where: { periodeId: id } });

            const rataCapaian = semuaDetail.reduce((sum, d) => {
                return sum + (Number(d.pctThdTarget) || 0);
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

module.exports = BkbController;
