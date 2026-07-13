const User = require("../models/User");

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

// Ambang batas capaian buat masuk daftar "Kecamatan Perlu Perhatian"
const THRESHOLD_PERHATIAN = 65;
const MAX_ATTENTION_ITEMS = 5;
const MAX_ACTIVITY_ITEMS = 5;

// Sama polanya kayak PROGRAM_CONFIG di LaporanController — field tiap
// program beda struktur, jadi disamain dulu sebelum diproses gabungan
const PROGRAM_CONFIG = {
    bkb: {
        label: "BKB",
        periodeModel: BkbPeriode,
        detailModel: BkbDetail,
        pctCapaian: (r) => r.pctThdTarget,
    },
    bkr: {
        label: "BKR",
        periodeModel: BkrPeriode,
        detailModel: BkrDetail,
        pctCapaian: (r) => (Number(r.pctLapor) + Number(r.pctHadir)) / 2,
    },
    bkl: {
        label: "BKL",
        periodeModel: BklPeriode,
        detailModel: BklDetail,
        pctCapaian: (r) => r.pctThdTarget,
    },
    pikr: {
        label: "PIK-R",
        periodeModel: PikrPeriode,
        detailModel: PikrDetail,
        pctCapaian: (r) => r.pctLapor,
    },
    uppka: {
        label: "UPPKA",
        periodeModel: UppkaPeriode,
        detailModel: UppkaDetail,
        pctCapaian: (r) => (Number(r.pctLapor) + Number(r.pctHadir)) / 2,
    },
};

function periodeLabel(bulan, tahun) {
    return `${BULAN_LABEL[bulan] || "-"} ${tahun}`;
}

class DashboardController {

    // ===========================
    // GET /dashboard
    // Satu endpoint gabungan buat semua kartu/panel di Dashboard Admin
    // ===========================
    static async index(req, res) {

        try {

            const now = new Date();
            const bulanIni = now.getMonth() + 1;
            const tahunIni = now.getFullYear();

            const programEntries = Object.entries(PROGRAM_CONFIG);

            // ===== 1. Total periode terekam (semua program) =====
            const jumlahPeriodePerProgram = await Promise.all(
                programEntries.map(([, config]) => config.periodeModel.count())
            );
            const totalPeriode = jumlahPeriodePerProgram.reduce((a, b) => a + b, 0);

            // ===== 2. Total pengguna terdaftar =====
            const totalPengguna = await User.count();

            // ===== 3. Status upload bulan berjalan per program =====
            const statusUpload = await Promise.all(
                programEntries.map(async ([key, config]) => {

                    const periode = await config.periodeModel.findOne({
                        where: { bulan: bulanIni, tahun: tahunIni },
                    });

                    return {
                        program: key,
                        label: config.label,
                        done: !!periode,
                        diuploadOleh: periode ? periode.diuploadOlehNama : null,
                        waktu: periode ? periode.createdAt : null,
                    };

                })
            );

            const sudahUpload = statusUpload.filter((s) => s.done).length;

            // ===== 4. Periode terbaru per program (buat rata-rata capaian & grafik) =====
            const periodeTerbaruPerProgram = await Promise.all(
                programEntries.map(async ([key, config]) => {

                    const periode = await config.periodeModel.findOne({
                        order: [["tahun", "DESC"], ["bulan", "DESC"]],
                    });

                    return { program: key, label: config.label, periode };

                })
            );

            const rataCapaianTiapProgram = periodeTerbaruPerProgram
                .filter((p) => p.periode)
                .map((p) => ({
                    program: p.program,
                    label: p.label,
                    pct: Number(p.periode.rataCapaian) || 0,
                }));

            const rataCapaianKabupaten = rataCapaianTiapProgram.length > 0
                ? rataCapaianTiapProgram.reduce((s, p) => s + p.pct, 0) / rataCapaianTiapProgram.length
                : 0;

            // ===== 5. Kecamatan Perlu Perhatian — dari periode TERBARU tiap program =====
            let kecamatanPerluPerhatian = [];

            for (const { program, label, periode } of periodeTerbaruPerProgram) {

                if (!periode) continue;

                const config = PROGRAM_CONFIG[program];
                const details = await config.detailModel.findAll({ where: { periodeId: periode.id } });

                details.forEach((row) => {

                    const pct = Number(config.pctCapaian(row)) || 0;

                    if (pct < THRESHOLD_PERHATIAN) {
                        kecamatanPerluPerhatian.push({
                            kecamatan: row.kecamatan,
                            program,
                            programLabel: label,
                            periode: periodeLabel(periode.bulan, periode.tahun),
                            pct: Number(pct.toFixed(1)),
                        });
                    }

                });

            }

            kecamatanPerluPerhatian.sort((a, b) => a.pct - b.pct);
            kecamatanPerluPerhatian = kecamatanPerluPerhatian.slice(0, MAX_ATTENTION_ITEMS);

            // ===== 6. Aktivitas terbaru (5 unggahan paling baru, lintas program) =====
            const semuaPeriode = [];

            for (const [key, config] of programEntries) {

                const periods = await config.periodeModel.findAll({
                    order: [["createdAt", "DESC"]],
                    limit: MAX_ACTIVITY_ITEMS,
                });

                periods.forEach((p) => {
                    semuaPeriode.push({
                        program: key,
                        programLabel: config.label,
                        periode: periodeLabel(p.bulan, p.tahun),
                        diuploadOleh: p.diuploadOlehNama || "-",
                        waktu: p.createdAt,
                    });
                });

            }

            semuaPeriode.sort((a, b) => new Date(b.waktu) - new Date(a.waktu));
            const aktivitasTerbaru = semuaPeriode.slice(0, MAX_ACTIVITY_ITEMS);

            // ===== Response gabungan =====
            return res.status(200).json({

                success: true,

                data: {

                    periodeBerjalan: periodeLabel(bulanIni, tahunIni),

                    kpi: {
                        totalPeriode,
                        rataCapaianKabupaten: Number(rataCapaianKabupaten.toFixed(1)),
                        totalPengguna,
                        sudahUpload,
                        totalProgram: programEntries.length,
                    },

                    statusUpload,
                    kecamatanPerluPerhatian,
                    aktivitasTerbaru,
                    grafikCapaianProgram: rataCapaianTiapProgram,

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

}

module.exports = DashboardController;
