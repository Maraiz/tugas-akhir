const BkbPeriode = require("../models/BkbPeriode");
const BkbDetail = require("../models/BkbDetail");
const BkrPeriode = require("../models/BkrPeriode");
const BkrDetail = require("../models/BkrDetail");
const BklPeriode = require("../models/BklPeriode");
const BklDetail = require("../models/BklDetail");
const PikrPeriode = require("../models/PikrPeriode");
const PikrDetail = require("../models/PikrDetail");
const UppkaPeriode = require("../models/UppkaPeriode");
const UppkaDetail = require("../models/UppkaDetail");

const BULAN_LABEL = [
    "", "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

/* ==========================================================================
   LAPISAN PENYERAGAM — field tiap program beda-beda struktur:
   - BKB & BKL punya Target manual (target, selisih, pctThdTarget, pctThdAnggota)
   - BKR & UPPKA self-computed berpasangan (jumlahAnggota, jumlahHadir, pctHadir)
   - PIK-R paling ramping, cuma 1 angka tambahan (jumlahPkbr), gak ada pasangan

   Biar 3 endpoint di bawah bisa kerja generik lintas 5 program tanpa if-else
   berulang, tiap baris Detail "diterjemahkan" dulu ke bentuk seragam:
   { kode, kecamatan, ada, lapor, pctLapor, anggota, capaian, pctCapaian, target }
   ========================================================================== */
const PROGRAM_CONFIG = {
    bkb: {
        label: "BKB",
        periodeModel: BkbPeriode,
        detailModel: BkbDetail,
        mapDetail: (r) => ({
            kode: r.kode, kecamatan: r.kecamatan, ada: r.ada, lapor: r.lapor, pctLapor: r.pctLapor,
            anggota: r.jumlahAnggota, capaian: r.jumlahHadir, pctCapaian: r.pctThdTarget, target: r.target,
        }),
    },
    bkr: {
        label: "BKR",
        periodeModel: BkrPeriode,
        detailModel: BkrDetail,
        mapDetail: (r) => ({
            kode: r.kode, kecamatan: r.kecamatan, ada: r.ada, lapor: r.lapor, pctLapor: r.pctLapor,
            anggota: r.jumlahAnggota, capaian: r.jumlahHadir, pctCapaian: (Number(r.pctLapor) + Number(r.pctHadir)) / 2, target: null,
        }),
    },
    bkl: {
        label: "BKL",
        periodeModel: BklPeriode,
        detailModel: BklDetail,
        mapDetail: (r) => ({
            kode: r.kode, kecamatan: r.kecamatan, ada: r.ada, lapor: r.lapor, pctLapor: r.pctLapor,
            anggota: r.jumlahAnggota, capaian: r.jumlahHadir, pctCapaian: r.pctThdTarget, target: r.target,
        }),
    },
    pikr: {
        label: "PIK-R",
        periodeModel: PikrPeriode,
        detailModel: PikrDetail,
        mapDetail: (r) => ({
            // PIK-R gak punya pasangan Anggota/Capaian kayak program lain,
            // cuma 1 angka (jumlahPkbr) — dipakai sbg "capaian", dan pctLapor
            // dipakai sbg pctCapaian karena gak ada rasio lain yang tersedia
            kode: r.kode, kecamatan: r.kecamatan, ada: r.ada, lapor: r.lapor, pctLapor: r.pctLapor,
            anggota: null, capaian: r.jumlahPkbr, pctCapaian: r.pctLapor, target: null,
        }),
    },
    uppka: {
        label: "UPPKA",
        periodeModel: UppkaPeriode,
        detailModel: UppkaDetail,
        mapDetail: (r) => ({
            kode: r.kode, kecamatan: r.kecamatan, ada: r.ada, lapor: r.lapor, pctLapor: r.pctLapor,
            anggota: r.jumlahAnggota, capaian: r.jumlahHadir, pctCapaian: (Number(r.pctLapor) + Number(r.pctHadir)) / 2, target: null,
        }),
    },
};

function periodeLabel(bulan, tahun) {
    return `${BULAN_LABEL[bulan] || "-"} ${tahun}`;
}

function normKec(s) {
    return String(s || "").trim().toUpperCase();
}

class LaporanController {

    // ===========================
    // GET /laporan/opsi?program=bkb
    // Buat isi dropdown filter: daftar periode yang ada, dan daftar kecamatan
    // ===========================
    static async opsi(req, res) {

        try {

            const { program } = req.query;
            const config = PROGRAM_CONFIG[program];

            if (!config) {
                return res.status(400).json({ success: false, message: "Program tidak dikenali." });
            }

            const periodes = await config.periodeModel.findAll({
                attributes: ["id", "bulan", "tahun"],
                order: [["tahun", "DESC"], ["bulan", "DESC"]],
            });

            const kecamatanRows = await config.detailModel.findAll({
                attributes: ["kecamatan"],
                group: ["kecamatan"],
                order: [["kecamatan", "ASC"]],
            });

            return res.status(200).json({

                success: true,

                data: {
                    periodes: periodes.map((p) => ({
                        bulan: p.bulan,
                        tahun: p.tahun,
                        label: periodeLabel(p.bulan, p.tahun),
                    })),
                    kecamatans: kecamatanRows.map((k) => k.kecamatan),
                },

            });

        } catch (error) {

            console.error(error);
            return res.status(500).json({ success: false, message: "Terjadi kesalahan server." });

        }

    }

    // ===========================
    // GET /laporan/tren?program=bkb&kecamatan=Banyuwangi&limit=6
    // Tren capaian 1 kecamatan di 1 program, dari periode terlama ke terbaru
    // ===========================
    static async tren(req, res) {

        try {

            const { program, kecamatan, limit } = req.query;
            const config = PROGRAM_CONFIG[program];

            if (!config) {
                return res.status(400).json({ success: false, message: "Program tidak dikenali." });
            }

            if (!kecamatan) {
                return res.status(400).json({ success: false, message: "Parameter kecamatan wajib diisi." });
            }

            const jumlahLimit = Number(limit) || 6;

            // Ambil periode terbaru dulu (buat dibatasi limit), baru dibalik urutannya
            const periodes = await config.periodeModel.findAll({
                order: [["tahun", "DESC"], ["bulan", "DESC"]],
                limit: jumlahLimit,
            });

            const hasil = [];

            for (const periode of periodes) {

                // Query semua baris periode ini, lalu cari manual berdasarkan
                // nama kecamatan (case-insensitive), biar toleran terhadap
                // beda ejaan/spasi kecil antar periode
                const allDetails = await config.detailModel.findAll({
                    where: { periodeId: periode.id },
                });

                const row = allDetails.find((d) => normKec(d.kecamatan) === normKec(kecamatan));

                if (row) {
                    hasil.push({
                        periode: periodeLabel(periode.bulan, periode.tahun),
                        bulan: periode.bulan,
                        tahun: periode.tahun,
                        ...config.mapDetail(row),
                    });
                }

            }

            // Urutkan dari periode terlama ke terbaru (biar grafik tren jalan maju)
            hasil.sort((a, b) => (a.tahun - b.tahun) || (a.bulan - b.bulan));

            return res.status(200).json({

                success: true,
                data: hasil,

            });

        } catch (error) {

            console.error(error);
            return res.status(500).json({ success: false, message: "Terjadi kesalahan server." });

        }

    }

    // ===========================
    // GET /laporan/ranking?program=bkb&bulan=6&tahun=2026
    // Ranking seluruh kecamatan buat 1 program, 1 periode
    // ===========================
    static async ranking(req, res) {

        try {

            const { program, bulan, tahun } = req.query;
            const config = PROGRAM_CONFIG[program];

            if (!config) {
                return res.status(400).json({ success: false, message: "Program tidak dikenali." });
            }

            if (!bulan || !tahun) {
                return res.status(400).json({ success: false, message: "Parameter bulan dan tahun wajib diisi." });
            }

            const periode = await config.periodeModel.findOne({ where: { bulan, tahun } });

            if (!periode) {

                return res.status(404).json({

                    success: false,
                    message: `Data ${config.label} untuk periode ${periodeLabel(bulan, tahun)} tidak ditemukan.`,

                });

            }

            const details = await config.detailModel.findAll({
                where: { periodeId: periode.id },
            });

            const hasil = details
                .map((row) => config.mapDetail(row))
                .sort((a, b) => (Number(b.pctCapaian) || 0) - (Number(a.pctCapaian) || 0));

            return res.status(200).json({

                success: true,

                data: {
                    periode: periodeLabel(periode.bulan, periode.tahun),
                    rows: hasil,
                },

            });

        } catch (error) {

            console.error(error);
            return res.status(500).json({ success: false, message: "Terjadi kesalahan server." });

        }

    }

    // ===========================
    // GET /laporan/program?kecamatan=Banyuwangi&bulan=6&tahun=2026
    // Perbandingan 5 program buat 1 kecamatan, 1 periode
    // ===========================
    static async perbandinganProgram(req, res) {

        try {

            const { kecamatan, bulan, tahun } = req.query;

            if (!kecamatan || !bulan || !tahun) {

                return res.status(400).json({

                    success: false,
                    message: "Parameter kecamatan, bulan, dan tahun wajib diisi.",

                });

            }

            const hasil = [];

            for (const [key, config] of Object.entries(PROGRAM_CONFIG)) {

                const periode = await config.periodeModel.findOne({ where: { bulan, tahun } });

                if (!periode) {
                    hasil.push({ program: key, label: config.label, tersedia: false });
                    continue;
                }

                const allDetails = await config.detailModel.findAll({
                    where: { periodeId: periode.id },
                });

                const row = allDetails.find((d) => normKec(d.kecamatan) === normKec(kecamatan));

                if (!row) {
                    hasil.push({ program: key, label: config.label, tersedia: false });
                    continue;
                }

                hasil.push({
                    program: key,
                    label: config.label,
                    tersedia: true,
                    ...config.mapDetail(row),
                });

            }

            return res.status(200).json({

                success: true,

                data: {
                    kecamatan,
                    periode: periodeLabel(bulan, tahun),
                    rows: hasil,
                },

            });

        } catch (error) {

            console.error(error);
            return res.status(500).json({ success: false, message: "Terjadi kesalahan server." });

        }

    }

}

module.exports = LaporanController;
