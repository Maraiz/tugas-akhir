const BkbPeriode = require("../models/BkbPeriode");
const BkrPeriode = require("../models/BkrPeriode");
const BklPeriode = require("../models/BklPeriode");
const PikrPeriode = require("../models/PikrPeriode");
const UppkaPeriode = require("../models/UppkaPeriode");

const BULAN_LABEL = [
    "", "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

// Daftar program yang digabung — cukup tambah 1 baris di sini kalau nanti
// ada program baru, nggak perlu ubah logic lain
const PROGRAM_MODELS = [
    { key: "bkb", label: "BKB", model: BkbPeriode },
    { key: "bkr", label: "BKR", model: BkrPeriode },
    { key: "bkl", label: "BKL", model: BklPeriode },
    { key: "pikr", label: "PIK-R", model: PikrPeriode },
    { key: "uppka", label: "UPPKA", model: UppkaPeriode },
];

// Samain bentuk data dari tiap model (BKB punya 2 file, sisanya 1) jadi
// satu format seragam
function mapEntry(programKey, programLabel, row) {
    const p = row.toJSON ? row.toJSON() : row;
    const isBkb = programKey === "bkb";

    return {
        id: `${programKey}-${p.id}`,
        program: programKey,
        programLabel,
        periode: `${BULAN_LABEL[p.bulan] || "-"} ${p.tahun}`,
        fileName: isBkb ? `${p.namaFile1} + ${p.namaFile2}` : p.namaFile,
        downloadPath: isBkb ? p.pathFile1 : p.pathFile,
        jumlahKecamatan: p.jumlahKecamatan,
        rataCapaian: p.rataCapaian,
        diuploadOleh: p.diuploadOlehNama || "-",
        createdAt: p.createdAt,
    };
}

class RiwayatUploadController {

    // ===========================
    // GET /riwayat-upload
    // Query optional:
    //   ?program=bkb|bkr|bkl|pikr|uppka   (filter 1 program)
    //   ?search=teks                       (cari di nama file / nama pengunggah)
    //   ?days=7|30                         (batasi N hari terakhir)
    // ===========================
    static async index(req, res) {

        try {

            const { program, search, days } = req.query;

            const programsToQuery = program
                ? PROGRAM_MODELS.filter((p) => p.key === program)
                : PROGRAM_MODELS;

            if (program && programsToQuery.length === 0) {

                return res.status(400).json({

                    success: false,
                    message: "Program tidak dikenali.",

                });

            }

            // Ambil data dari tiap model secara paralel. allSettled dipakai
            // biar kalau 1 tabel error, program lain tetap tampil (bukan
            // seluruh request ikut gagal).
            const results = await Promise.allSettled(

                programsToQuery.map(({ key, label, model }) =>

                    model.findAll({ order: [["createdAt", "DESC"]] })
                        .then((rows) => rows.map((row) => mapEntry(key, label, row)))

                )

            );

            let combined = [];
            let hasPartialFailure = false;

            results.forEach((r) => {

                if (r.status === "fulfilled") {
                    combined.push(...r.value);
                } else {
                    hasPartialFailure = true;
                    console.error(r.reason);
                }

            });

            // Filter search (nama file / nama pengunggah)
            if (search) {

                const keyword = search.toLowerCase();

                combined = combined.filter((e) =>
                    e.fileName.toLowerCase().includes(keyword) ||
                    e.diuploadOleh.toLowerCase().includes(keyword)
                );

            }

            // Filter rentang hari terakhir
            if (days) {

                const cutoff = new Date();
                cutoff.setDate(cutoff.getDate() - Number(days));

                combined = combined.filter((e) => new Date(e.createdAt) >= cutoff);

            }

            // Urutkan gabungan seluruh program dari yang terbaru
            combined.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

            return res.status(200).json({

                success: true,
                data: combined,
                partial: hasPartialFailure, // true kalau ada 1+ program gagal diambil

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

module.exports = RiwayatUploadController;
