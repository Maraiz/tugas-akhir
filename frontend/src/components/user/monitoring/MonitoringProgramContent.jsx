import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import Chart from "chart.js/auto";
import api from "../../../services/api";
import "../../../styles/monitoringProgram.css";

/* ==========================================================================
   PROGRAM_CONFIG — lapisan penyeragam, sama pola kayak PROGRAM_CONFIG di
   LaporanController.js (backend). Tiap program beda struktur field:
   - BKB & BKL punya Target manual (target, selisih, pctThdTarget, pctThdAnggota)
   - BKR & UPPKA self-computed berpasangan (jumlahAnggota, jumlahHadir, pctHadir)
   - PIK-R paling ramping, cuma 1 angka tambahan (jumlahPkbr)
   ========================================================================== */
const PROGRAM_CONFIG = {
    bkb: {
        label: "BKB",
        fullName: "Bina Keluarga Balita",
        hasTarget: true,
        metric1: { key: "pctThdTarget", label: "% Terhadap Target" },
        metric2: { key: "pctThdAnggota", label: "% Terhadap Anggota" },
        anggotaKey: "jumlahAnggota",
        capaianKey: "jumlahHadir",
        columns: [
            { label: "KODE", key: "kode" },
            { label: "KECAMATAN", key: "kecamatan", align: "left" },
            { label: "ADA", key: "ada" },
            { label: "LAPOR", key: "lapor" },
            { label: "TARGET", key: "target" },
            { label: "ANGGOTA", key: "jumlahAnggota" },
            { label: "SELISIH", key: "selisih" },
            { label: "CAPAIAN", key: "jumlahHadir" },
            { label: "% TARGET", key: "pctThdTarget", pct: true },
            { label: "% ANGGOTA", key: "pctThdAnggota", pct: true },
        ],
    },
    bkr: {
        label: "BKR",
        fullName: "Bina Keluarga Remaja",
        hasTarget: false,
        metric1: { key: "pctLapor", label: "% Lapor" },
        metric2: { key: "pctHadir", label: "% Hadir" },
        anggotaKey: "jumlahAnggota",
        capaianKey: "jumlahHadir",
        columns: [
            { label: "KODE", key: "kode" },
            { label: "KECAMATAN", key: "kecamatan", align: "left" },
            { label: "ADA", key: "ada" },
            { label: "LAPOR", key: "lapor" },
            { label: "% LAPOR", key: "pctLapor", pct: true },
            { label: "ANGGOTA", key: "jumlahAnggota" },
            { label: "CAPAIAN", key: "jumlahHadir" },
            { label: "% HADIR", key: "pctHadir", pct: true },
        ],
    },
    bkl: {
        label: "BKL",
        fullName: "Bina Keluarga Lansia",
        hasTarget: true,
        metric1: { key: "pctThdTarget", label: "% Terhadap Target" },
        metric2: { key: "pctThdAnggota", label: "% Terhadap Anggota" },
        anggotaKey: "jumlahAnggota",
        capaianKey: "jumlahHadir",
        columns: [
            { label: "KODE", key: "kode" },
            { label: "KECAMATAN", key: "kecamatan", align: "left" },
            { label: "ADA", key: "ada" },
            { label: "LAPOR", key: "lapor" },
            { label: "TARGET", key: "target" },
            { label: "ANGGOTA", key: "jumlahAnggota" },
            { label: "SELISIH", key: "selisih" },
            { label: "CAPAIAN", key: "jumlahHadir" },
            { label: "% TARGET", key: "pctThdTarget", pct: true },
            { label: "% ANGGOTA", key: "pctThdAnggota", pct: true },
        ],
    },
    pikr: {
        label: "PIK-R",
        fullName: "PIK Remaja",
        hasTarget: false,
        metric1: { key: "pctLapor", label: "% Lapor" },
        metric2: null,
        anggotaKey: null,
        capaianKey: "jumlahPkbr",
        columns: [
            { label: "KODE", key: "kode" },
            { label: "KECAMATAN", key: "kecamatan", align: "left" },
            { label: "ADA", key: "ada" },
            { label: "LAPOR", key: "lapor" },
            { label: "% LAPOR", key: "pctLapor", pct: true },
            { label: "JUMLAH PKBR", key: "jumlahPkbr" },
        ],
    },
    uppka: {
        label: "UPPKA",
        fullName: "Usaha Peningkatan Pendapatan Keluarga Akseptor",
        hasTarget: false,
        metric1: { key: "pctLapor", label: "% Lapor" },
        metric2: { key: "pctHadir", label: "% Hadir" },
        anggotaKey: "jumlahAnggota",
        capaianKey: "jumlahHadir",
        columns: [
            { label: "KODE", key: "kode" },
            { label: "KECAMATAN", key: "kecamatan", align: "left" },
            { label: "ADA", key: "ada" },
            { label: "LAPOR", key: "lapor" },
            { label: "% LAPOR", key: "pctLapor", pct: true },
            { label: "ANGGOTA", key: "jumlahAnggota" },
            { label: "CAPAIAN", key: "jumlahHadir" },
            { label: "% HADIR", key: "pctHadir", pct: true },
        ],
    },
};

const BULAN_LIST = [
    { value: 1, label: "Januari" }, { value: 2, label: "Februari" }, { value: 3, label: "Maret" },
    { value: 4, label: "April" }, { value: 5, label: "Mei" }, { value: 6, label: "Juni" },
    { value: 7, label: "Juli" }, { value: 8, label: "Agustus" }, { value: 9, label: "September" },
    { value: 10, label: "Oktober" }, { value: 11, label: "November" }, { value: 12, label: "Desember" },
];

function fmtPct(v) {
    const n = Number(v);
    return isNaN(n) ? "-" : n.toFixed(2);
}

function capaianClass(v) {
    const n = Number(v) || 0;
    if (n >= 85) return "high";
    if (n >= 60) return "mid";
    return "low";
}

function makeGradient(ctx, chartArea, hex) {
    const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
    gradient.addColorStop(0, hex);
    gradient.addColorStop(1, hex + "55");
    return gradient;
}

function MonitoringProgramContent() {
    const { program } = useParams();
    const config = PROGRAM_CONFIG[program];

    const canvasRef = useRef(null);
    const chartRef = useRef(null);

    const now = new Date();

    const [periods, setPeriods] = useState([]);
    const [selectedBulan, setSelectedBulan] = useState(now.getMonth() + 1);
    const [selectedTahun, setSelectedTahun] = useState(now.getFullYear());
    const [detail, setDetail] = useState(null); // { periode, details: [...] }
    const [loadingPeriods, setLoadingPeriods] = useState(true);
    const [loadingDetail, setLoadingDetail] = useState(false);
    const [error, setError] = useState("");

    // ===== Ambil daftar periode (buat tau tahun mana aja yang ada datanya
    // + buat nyari id periode yang cocok sama bulan/tahun terpilih) =====
    useEffect(() => {
        let cancelled = false;

        async function fetchPeriods() {
            setLoadingPeriods(true);
            setError("");
            try {
                const res = await api.get(`/${program}`);
                if (cancelled) return;
                setPeriods(res.data.data || []);
            } catch (err) {
                console.error(err);
                if (!cancelled) setError("Gagal memuat daftar periode.");
            } finally {
                if (!cancelled) setLoadingPeriods(false);
            }
        }

        fetchPeriods();
        return () => { cancelled = true; };
    }, [program]);

    // ===== Cari periode yang cocok sama bulan+tahun terpilih, lalu fetch detailnya =====
    useEffect(() => {
        if (loadingPeriods) return;

        const match = periods.find((p) => p.bulan === selectedBulan && p.tahun === selectedTahun);

        if (!match) {
            setDetail(null);
            setError(`Belum ada data ${config?.label || ""} untuk periode ini.`);
            return;
        }

        async function fetchDetail() {
            setLoadingDetail(true);
            setError("");
            try {
                const res = await api.get(`/${program}/${match.id}`);
                setDetail(res.data.data);
            } catch (err) {
                console.error(err);
                setError("Gagal memuat data periode ini.");
                setDetail(null);
            } finally {
                setLoadingDetail(false);
            }
        }

        fetchDetail();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loadingPeriods, periods, selectedBulan, selectedTahun, program]);

    // ===== Grafik dual-bar per kecamatan =====
    useEffect(() => {
        if (!detail || !canvasRef.current) return;
        if (chartRef.current) chartRef.current.destroy();

        const rows = detail.details || [];
        const ctx = canvasRef.current.getContext("2d");

        const datasets = [{
            label: config.metric1.label,
            data: rows.map((r) => Number(r[config.metric1.key]) || 0),
            backgroundColor: (c) => {
                const { chartArea } = c.chart;
                if (!chartArea) return "#1565c0";
                return makeGradient(ctx, chartArea, "#1565c0");
            },
            borderRadius: 6,
        }];

        if (config.metric2) {
            datasets.push({
                label: config.metric2.label,
                data: rows.map((r) => Number(r[config.metric2.key]) || 0),
                backgroundColor: (c) => {
                    const { chartArea } = c.chart;
                    if (!chartArea) return "#42a5f5";
                    return makeGradient(ctx, chartArea, "#42a5f5");
                },
                borderRadius: 6,
            });
        }

        chartRef.current = new Chart(canvasRef.current, {
            type: "bar",
            data: { labels: rows.map((r) => r.kecamatan), datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: true, position: "top", labels: { boxWidth: 12, font: { size: 11.5 } } },
                    tooltip: {
                        backgroundColor: "#1a1a2e", padding: 10, cornerRadius: 8,
                        callbacks: { label: (c) => `${c.dataset.label}: ${c.parsed.y.toFixed(1)}%` },
                    },
                },
                scales: {
                    y: { beginAtZero: true, max: 110, ticks: { callback: (v) => v + "%" }, grid: { color: "#f0f2f8" } },
                    x: { grid: { display: false }, ticks: { font: { size: 10.5 } } },
                },
                animation: { duration: 600, easing: "easeOutQuart" },
            },
        });

        return () => { if (chartRef.current) chartRef.current.destroy(); };
    }, [detail, config]);

    if (!config) {
        return <div style={{ padding: 40, textAlign: "center", color: "#e53935" }}>Program tidak dikenali.</div>;
    }

    const rows = detail?.details || [];

    // ===== Opsi dropdown Tahun — gabungan tahun yang ada datanya + tahun sekarang
    // (biar tahun berjalan selalu bisa dipilih walau belum ada data) =====
    const tahunOptions = Array.from(
        new Set([...periods.map((p) => p.tahun), now.getFullYear()])
    ).sort((a, b) => b - a);

    // ===== KPI (dihitung dari rows) =====
    const totalAda = rows.reduce((s, r) => s + (Number(r.ada) || 0), 0);
    const totalAnggota = config.anggotaKey ? rows.reduce((s, r) => s + (Number(r[config.anggotaKey]) || 0), 0) : null;
    const totalCapaian = rows.reduce((s, r) => s + (Number(r[config.capaianKey]) || 0), 0);
    const avgMetric1 = rows.length > 0 ? rows.reduce((s, r) => s + (Number(r[config.metric1.key]) || 0), 0) / rows.length : 0;

    // ===== Notifikasi & Alert =====
    const alerts = [];
    rows.forEach((r) => {
        const m1 = Number(r[config.metric1.key]) || 0;
        if (m1 < 85) {
            alerts.push({
                type: "warning",
                text: <><b>{r.kecamatan}</b>: {config.metric1.label} {m1.toFixed(0)}% - Perlu ditingkatkan</>,
            });
        }
        if (config.hasTarget) {
            const selisih = Number(r.selisih) || 0;
            if (selisih < 0) {
                alerts.push({
                    type: "danger",
                    text: <><b>{r.kecamatan}</b>: Anggota kurang {Math.abs(selisih)} dari target</>,
                });
            }
        }
    });

    return (
        <>
            <div className="mp-toolbar">
                <div className="mp-title">
                    <h2>Dashboard {config.label}</h2>
                    <p>{config.fullName} — {detail ? `Periode ${detail.periode}` : "Pilih periode di sebelah kanan"}</p>
                </div>

                <div className="mp-periode-filter">
                    <select
                        className="mp-periode-select"
                        value={selectedBulan}
                        onChange={(e) => setSelectedBulan(Number(e.target.value))}
                        disabled={loadingPeriods}
                    >
                        {BULAN_LIST.map((b) => (
                            <option key={b.value} value={b.value}>{b.label}</option>
                        ))}
                    </select>
                    <select
                        className="mp-periode-select mp-periode-select-year"
                        value={selectedTahun}
                        onChange={(e) => setSelectedTahun(Number(e.target.value))}
                        disabled={loadingPeriods}
                    >
                        {tahunOptions.map((y) => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>
                </div>
            </div>

            {error && (
                <div className="mp-panel" style={{ textAlign: "center", padding: 30, color: "#9090a8" }}>
                    <i className="bi bi-inbox" style={{ fontSize: 26, opacity: 0.5, display: "block", marginBottom: 10 }}></i>
                    {error}
                </div>
            )}

            {!error && loadingDetail && (
                <div className="mp-panel" style={{ textAlign: "center", padding: 50, color: "#9090a8" }}>
                    Memuat data...
                </div>
            )}

            {!error && !loadingDetail && detail && (
                <>
                    {/* NOTIFIKASI & ALERT */}
                    {alerts.length > 0 && (
                        <div className="mp-panel mp-alert-panel">
                            <div className="mp-panel-head"><i className="bi bi-bell-fill"></i><h3>Notifikasi & Alert</h3></div>
                            <div className="mp-alert-list">
                                {alerts.slice(0, 6).map((a, i) => (
                                    <div className={`mp-alert-item ${a.type}`} key={i}>
                                        <i className={`bi ${a.type === "danger" ? "bi-exclamation-octagon-fill" : "bi-exclamation-triangle-fill"}`}></i>
                                        <span>{a.text}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* KPI CARDS */}
                    <div className="mp-kpi-row">
                        <div className="mp-kpi-card">
                            <div className="mp-kpi-icon blue"><i className="bi bi-diagram-3-fill"></i></div>
                            <div>
                                <div className="mp-kpi-value">{totalAda}</div>
                                <div className="mp-kpi-label">Total Poktan {config.label}</div>
                            </div>
                        </div>
                        {totalAnggota !== null && (
                            <div className="mp-kpi-card">
                                <div className="mp-kpi-icon orange"><i className="bi bi-people-fill"></i></div>
                                <div>
                                    <div className="mp-kpi-value">{totalAnggota.toLocaleString("id-ID")}</div>
                                    <div className="mp-kpi-label">Total Anggota</div>
                                </div>
                            </div>
                        )}
                        <div className="mp-kpi-card">
                            <div className="mp-kpi-icon green"><i className="bi bi-check-circle-fill"></i></div>
                            <div>
                                <div className="mp-kpi-value">{totalCapaian.toLocaleString("id-ID")}</div>
                                <div className="mp-kpi-label">Total Capaian</div>
                            </div>
                        </div>
                        <div className="mp-kpi-card">
                            <div className="mp-kpi-icon purple"><i className="bi bi-graph-up-arrow"></i></div>
                            <div>
                                <div className="mp-kpi-value">{avgMetric1.toFixed(0)}%</div>
                                <div className="mp-kpi-label">Rata-rata {config.metric1.label}</div>
                            </div>
                        </div>
                    </div>

                    {/* GRAFIK */}
                    <div className="mp-panel">
                        <div className="mp-panel-head"><i className="bi bi-bar-chart-line-fill"></i><h3>Persentase Capaian per Kecamatan</h3></div>
                        <div className="mp-chart-wrap">
                            <canvas ref={canvasRef}></canvas>
                        </div>
                    </div>

                    {/* TABEL MONEV */}
                    <div className="mp-panel">
                        <div className="mp-panel-head">
                            <i className="bi bi-table"></i>
                            <h3>MONEV POKTAN {config.label} — {detail.periode}</h3>
                        </div>
                        <div className="mp-table-wrap">
                            <table className="mp-table">
                                <thead>
                                    <tr>
                                        {config.columns.map((c) => (
                                            <th key={c.key} style={{ textAlign: c.align || "center" }}>{c.label}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map((r) => (
                                        <tr key={r.id}>
                                            {config.columns.map((c) => {
                                                const val = r[c.key];
                                                if (c.pct) {
                                                    return (
                                                        <td key={c.key} className={`mp-pct ${capaianClass(val)}`}>{fmtPct(val)}</td>
                                                    );
                                                }
                                                return (
                                                    <td key={c.key} style={{ textAlign: c.align || "center" }}>
                                                        {val ?? "-"}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </>
    );
}

export default MonitoringProgramContent;
