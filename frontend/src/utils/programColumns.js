/* ============================================================
   CONFIG KOLOM EXPORT MONEV — terpusat, dipakai bareng oleh:
   - Admin: BkbTable.jsx, BkrTable.jsx, BklTable.jsx, PikrTable.jsx, UppkaTable.jsx
   - User : MonitoringProgramContent.jsx

   Kalau nanti mau ubah struktur kolom export 1 program, cukup ubah di
   sini SEKALI, otomatis ke-apply ke Admin & User dua-duanya.
   ============================================================ */

export const PROGRAM_EXPORT_CONFIG = {

    bkb: {
        title: null, // pakai judul default "MONEV POKTAN BKB"
        columns: [
            { label: "KODE", key: "kode" },
            { label: "KECAMATAN", key: "kecamatan", align: "left" },
            {
                label: "JUMLAH POKTAN",
                children: [
                    { label: "ADA", key: "ada" },
                    { label: "LAPOR", key: "lapor" },
                ],
            },
            { label: "%", key: "pctLapor", highlight: true, decimal: 2 },
            {
                label: "KEANGGOTAAN",
                children: [
                    { label: "TARGET", key: "target" },
                    { label: "ANGGOTA YG ADA", key: "jumlahAnggota", totalKey: "totalAnggota" },
                ],
            },
            { label: "SELISIH (LEBIH/KURANG)", key: "selisih", signedColor: true },
            {
                label: "KEHADIRAN",
                children: [
                    { label: "TARGET", key: "target" },
                    { label: "ANGGOTA YG ADA", key: "jumlahAnggota", totalKey: "totalAnggota" },
                    { label: "CAPAIAN", key: "jumlahHadir", totalKey: "totalHadir" },
                ],
            },
            { label: "% TERHADAP TARGET", key: "pctThdTarget", highlight: true, decimal: 0 },
            { label: "% TERHADAP ANGGOTA YG ADA", key: "pctThdAnggota", highlight: true, decimal: 0 },
        ],
    },

    bkl: {
        title: null,
        columns: [
            { label: "KODE", key: "kode" },
            { label: "KECAMATAN", key: "kecamatan", align: "left" },
            {
                label: "JUMLAH POKTAN",
                children: [
                    { label: "ADA", key: "ada" },
                    { label: "LAPOR", key: "lapor" },
                ],
            },
            { label: "%", key: "pctLapor", highlight: true, decimal: 2 },
            {
                label: "KEANGGOTAAN",
                children: [
                    { label: "TARGET", key: "target" },
                    { label: "ANGGOTA YG ADA", key: "jumlahAnggota", totalKey: "totalAnggota" },
                ],
            },
            { label: "SELISIH (LEBIH/KURANG)", key: "selisih", signedColor: true },
            {
                label: "KEHADIRAN",
                children: [
                    { label: "TARGET", key: "target" },
                    { label: "ANGGOTA YG ADA", key: "jumlahAnggota", totalKey: "totalAnggota" },
                    { label: "CAPAIAN", key: "jumlahHadir", totalKey: "totalHadir" },
                ],
            },
            { label: "% TERHADAP TARGET", key: "pctThdTarget", highlight: true, decimal: 0 },
            { label: "% TERHADAP ANGGOTA YG ADA", key: "pctThdAnggota", highlight: true, decimal: 0 },
        ],
    },

    bkr: {
        title: null,
        columns: [
            { label: "KODE", key: "kode" },
            { label: "KECAMATAN", key: "kecamatan", align: "left" },
            {
                label: "JUMLAH POKTAN",
                children: [
                    { label: "ADA", key: "ada" },
                    { label: "LAPOR", key: "lapor" },
                ],
            },
            { label: "%", key: "pctLapor", highlight: true, decimal: 2 },
            {
                label: "KEHADIRAN",
                children: [
                    { label: "ANGGOTA", key: "jumlahAnggota", totalKey: "totalAnggota" },
                    { label: "CAPAIAN", key: "jumlahHadir", totalKey: "totalHadir" },
                ],
            },
            { label: "%", key: "pctHadir", highlight: true, decimal: 2 },
        ],
    },

    uppka: {
        title: null,
        columns: [
            { label: "KODE", key: "kode" },
            { label: "KECAMATAN", key: "kecamatan", align: "left" },
            {
                label: "JUMLAH POKTAN",
                children: [
                    { label: "ADA", key: "ada" },
                    { label: "LAPOR", key: "lapor" },
                ],
            },
            { label: "%", key: "pctLapor", highlight: true, decimal: 2 },
            {
                label: "KEHADIRAN",
                children: [
                    { label: "ANGGOTA", key: "jumlahAnggota", totalKey: "totalAnggota" },
                    { label: "CAPAIAN", key: "jumlahHadir", totalKey: "totalHadir" },
                ],
            },
            { label: "%", key: "pctHadir", highlight: true, decimal: 2 },
        ],
    },

    pikr: {
        title: "MONEV POKTAN PIK-R YG MELAKSANAKAN EDUKASI KESPRO",
        columns: [
            { label: "KODE", key: "kode" },
            { label: "KECAMATAN", key: "kecamatan", align: "left" },
            {
                label: "JUMLAH POKTAN",
                children: [
                    { label: "ADA", key: "ada" },
                    { label: "PRO PN YG LAPOR", key: "lapor" },
                ],
            },
            { label: "%", key: "pctLapor", highlight: true, decimal: 2 },
            { label: "JUMLAH REMAJA HADIR PERTEMUAN SOSIALISASI PKBR", key: "jumlahPkbr", totalKey: "totalPkbr" },
        ],
    },

};

// Hitung baris "Jumlah Total" — generik buat semua program, dipakai bareng
// Admin (yang sebelumnya hitung manual di tiap Table.jsx) dan User.
export function computeMonevTotals(program, rows) {

    if (!rows || rows.length === 0) return null;

    const sum = (key) => rows.reduce((s, r) => s + (Number(r[key]) || 0), 0);

    const totalAda = sum("ada");
    const totalLapor = sum("lapor");
    const totalPctLapor = totalAda > 0 ? (totalLapor / totalAda) * 100 : 0;

    if (program === "bkb" || program === "bkl") {

        const totalTarget = sum("target");
        const totalAnggota = sum("jumlahAnggota");
        const totalHadir = sum("jumlahHadir");

        return {
            totalAda, totalLapor, totalPctLapor,
            totalTarget, totalAnggota,
            totalSelisih: totalAnggota - totalTarget,
            totalHadir,
            totalPctThdTarget: totalTarget > 0 ? (totalHadir / totalTarget) * 100 : 0,
            totalPctThdAnggota: totalAnggota > 0 ? (totalHadir / totalAnggota) * 100 : 0,
        };

    }

    if (program === "bkr" || program === "uppka") {

        const totalAnggota = sum("jumlahAnggota");
        const totalHadir = sum("jumlahHadir");

        return {
            totalAda, totalLapor, totalPctLapor,
            totalAnggota, totalHadir,
            totalPctHadir: totalAnggota > 0 ? (totalHadir / totalAnggota) * 100 : 0,
        };

    }

    if (program === "pikr") {

        return {
            totalAda, totalLapor, totalPctLapor,
            totalPkbr: sum("jumlahPkbr"),
        };

    }

    return { totalAda, totalLapor, totalPctLapor };

}
