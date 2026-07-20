import { useRef, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Chart from "chart.js/auto";
import api from "../../../services/api";
import "../../../styles/dashboard.css";

// Nama panjang tiap program buat panel "Status Upload" — backend cuma
// ngirim label singkat (BKB, BKR, dst), nama lengkapnya statis di sini
const PROGRAM_FULLNAME = {
    bkb: "Bina Keluarga Balita",
    bkr: "Bina Keluarga Remaja",
    bkl: "Bina Keluarga Lansia",
    pikr: "PIK Remaja",
    uppka: "Usaha Peningkatan Pendapatan Keluarga Akseptor",
};

const PROGRAM_ICON = { bkb: "bi-journal-bookmark-fill", bkr: "bi-journal-bookmark-fill", bkl: "bi-journal-bookmark-fill", pikr: "bi-journal-bookmark-fill", uppka: "bi-journal-bookmark-fill" };
const PROGRAM_COLOR = { bkb: "#1565c0", bkr: "#2e7d32", bkl: "#ef6c00", pikr: "#8e24aa", uppka: "#c2185b" };

const SHORTCUTS = [
    { key: "bkb", label: "BKB", to: "/admin/monitoring/bkb/tambah" },
    { key: "bkr", label: "BKR", to: "/admin/monitoring/bkr/tambah" },
    { key: "bkl", label: "BKL", to: "/admin/monitoring/bkl/tambah" },
    { key: "pikr", label: "PIK-R", to: "/admin/monitoring/pikr/tambah" },
    { key: "uppka", label: "UPPKA", to: "/admin/monitoring/uppka/tambah" },
    { key: "users", label: "Pengguna", to: "/admin/data-pengguna", icon: "bi-people-fill" },
];

function formatWaktu(dateStr) {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    const tanggal = d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
    const jam = d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
    return `${tanggal}, ${jam} WIB`;
}

// Bikin gradasi vertikal buat tiap batang grafik — solusi biar Chart.js
// nggak flat 1 warna doang, kesannya lebih "hidup"
function makeGradient(ctx, chartArea, hex) {
    const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
    gradient.addColorStop(0, hex);
    gradient.addColorStop(1, hex + "55"); // transparansi di bagian bawah
    return gradient;
}

function DashboardContent() {
    const barCanvasRef = useRef(null);
    const barChartRef = useRef(null);

    const donutCanvasRef = useRef(null);
    const donutChartRef = useRef(null);

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    async function fetchDashboard() {
        setLoading(true);
        setError("");

        try {
            const res = await api.get("/dashboard");
            setData(res.data.data);
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.message || "Gagal memuat data dashboard.");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchDashboard();
    }, []);

    // ===== Grafik batang: Rata-rata Capaian per Program =====
    useEffect(() => {
        if (!data || !barCanvasRef.current) return;

        if (barChartRef.current) barChartRef.current.destroy();

        const grafik = data.grafikCapaianProgram || [];
        const ctx = barCanvasRef.current.getContext("2d");

        barChartRef.current = new Chart(barCanvasRef.current, {
            type: "bar",
            data: {
                labels: grafik.map((d) => d.label),
                datasets: [{
                    label: "% Capaian",
                    data: grafik.map((d) => d.pct),
                    backgroundColor: (context) => {
                        const { chart } = context;
                        const { ctx: c, chartArea } = chart;
                        if (!chartArea) return PROGRAM_COLOR[grafik[context.dataIndex]?.program] || "#9090a8";
                        const hex = PROGRAM_COLOR[grafik[context.dataIndex]?.program] || "#9090a8";
                        return makeGradient(c, chartArea, hex);
                    },
                    borderRadius: 10,
                    maxBarThickness: 56,
                    hoverBackgroundColor: grafik.map((d) => PROGRAM_COLOR[d.program] || "#9090a8"),
                }],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: "#1a1a2e",
                        padding: 12,
                        cornerRadius: 8,
                        titleFont: { size: 12.5, weight: "600" },
                        bodyFont: { size: 12.5 },
                        callbacks: {
                            label: (ctx) => `Rata-rata Capaian: ${ctx.parsed.y}%`,
                        },
                    },
                },
                scales: {
                    y: { beginAtZero: true, max: 100, ticks: { callback: (v) => v + "%" }, grid: { color: "#f0f2f8" } },
                    x: { grid: { display: false } },
                },
                animation: { duration: 700, easing: "easeOutQuart" },
            },
        });

        return () => { if (barChartRef.current) barChartRef.current.destroy(); };
    }, [data]);

    // ===== Grafik donut: rasio program Sudah vs Belum Upload =====
    useEffect(() => {
        if (!data || !donutCanvasRef.current) return;

        if (donutChartRef.current) donutChartRef.current.destroy();

        const sudah = data.kpi.sudahUpload;
        const belum = data.kpi.totalProgram - sudah;

        donutChartRef.current = new Chart(donutCanvasRef.current, {
            type: "doughnut",
            data: {
                labels: ["Sudah Upload", "Belum Upload"],
                datasets: [{
                    data: [sudah, belum],
                    backgroundColor: ["#2e7d32", "#e5e8f0"],
                    borderWidth: 0,
                    hoverOffset: 6,
                }],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: "72%",
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: "#1a1a2e",
                        padding: 10,
                        cornerRadius: 8,
                        callbacks: { label: (ctx) => `${ctx.label}: ${ctx.parsed} program` },
                    },
                },
                animation: { duration: 700, easing: "easeOutQuart" },
            },
        });

        return () => { if (donutChartRef.current) donutChartRef.current.destroy(); };
    }, [data]);

    if (loading) {
        return (
            <div className="dash-loading">
                <div className="dash-spinner"></div>
                <p>Memuat dashboard...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="panel-card" style={{ textAlign: "center", padding: 40 }}>
                <i className="bi bi-exclamation-triangle-fill" style={{ fontSize: 28, color: "#e53935" }}></i>
                <p style={{ color: "#c62828", margin: "12px 0 16px" }}>{error}</p>
                <button className="btn-reminder-action" onClick={fetchDashboard}>Coba Lagi</button>
            </div>
        );
    }

    const { kpi, statusUpload, kecamatanPerluPerhatian, aktivitasTerbaru, periodeBerjalan } = data;
    const belumUpload = statusUpload.filter((p) => !p.done);

    return (
        <>
            <div className="greeting">
                <h1>Selamat datang kembali, Admin Dinas <i className="bi bi-hand-thumbs-up-fill greeting-icon"></i></h1>
                <p>Berikut ringkasan status monitoring poktan periode berjalan</p>
            </div>

            {/* REMINDER BANNER — cuma muncul kalau ada program yang belum upload */}
            {belumUpload.length > 0 && (
                <div className="reminder-banner">
                    <div className="reminder-icon"><i className="bi bi-bell-fill"></i></div>
                    <div className="reminder-text">
                        <h4>Ada {belumUpload.length} program yang belum upload data periode {periodeBerjalan}</h4>
                        <p>
                            {belumUpload.map((p, i) => (
                                <span key={p.program}>
                                    <b>{p.label}</b>{i < belumUpload.length - 1 ? (i === belumUpload.length - 2 ? " dan " : ", ") : ""}
                                </span>
                            ))}
                            {" "}belum diupload. Batas unggah disarankan sebelum tanggal 5 tiap bulan.
                        </p>
                    </div>
                    <Link to="/admin/riwayat-upload" className="btn-reminder-action">
                        Lihat Detail
                    </Link>
                </div>
            )}

            {/* KPI CARDS */}
            <div className="kpi-row">
                <div className="kpi-card">
                    <div className="kpi-icon blue"><i className="bi bi-folder2-open"></i></div>
                    <div>
                        <div className="kpi-value">{kpi.totalPeriode}</div>
                        <div className="kpi-label">Total Periode Terekam ({kpi.totalProgram} Program)</div>
                    </div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-icon green"><i className="bi bi-graph-up-arrow"></i></div>
                    <div>
                        <div className="kpi-value">{kpi.rataCapaianKabupaten}%</div>
                        <div className="kpi-label">Rata-rata Capaian Kabupaten</div>
                    </div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-icon orange"><i className="bi bi-people-fill"></i></div>
                    <div>
                        <div className="kpi-value">{kpi.totalPengguna}</div>
                        <div className="kpi-label">Total Pengguna Terdaftar</div>
                    </div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-icon purple"><i className="bi bi-check-circle-fill"></i></div>
                    <div>
                        <div className="kpi-value">{kpi.sudahUpload} / {kpi.totalProgram}</div>
                        <div className="kpi-label">Program Sudah Upload Bulan Ini</div>
                    </div>
                </div>
            </div>

            {/* 2 COLUMN GRID */}
            <div className="dash-grid">

                {/* LEFT COLUMN */}
                <div className="dash-col">

                    <div className="panel-card">
                        <div className="panel-head">
                            <h3>Status Upload — {periodeBerjalan}</h3>
                            <Link to="/admin/riwayat-upload">Lihat Riwayat <i className="bi bi-arrow-right"></i></Link>
                        </div>
                        <div className="status-list">
                            {statusUpload.map((p) => (
                                <div className="status-item" key={p.program}>
                                    <div className={`status-program-badge ${p.program}`}>
                                        <i className={`bi ${PROGRAM_ICON[p.program]}`}></i>
                                    </div>
                                    <div className="status-info">
                                        <div className="s-name">{PROGRAM_FULLNAME[p.program] || p.label}</div>
                                        <div className="s-sub">
                                            {p.done ? `Diupload ${formatWaktu(p.waktu)}` : "Belum ada unggahan bulan ini"}
                                        </div>
                                    </div>
                                    <span className={`status-pill ${p.done ? "done" : "pending"}`}>
                                        <i className={`bi ${p.done ? "bi-check-circle-fill" : "bi-exclamation-circle-fill"}`}></i>
                                        {p.done ? "Sudah" : "Belum"}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="panel-card">
                        <div className="panel-head">
                            <h3>Kecamatan Perlu Perhatian</h3>
                            <Link to="/admin/laporan">Lihat Laporan <i className="bi bi-arrow-right"></i></Link>
                        </div>
                        <div className="attention-list">
                            {kecamatanPerluPerhatian.length === 0 && (
                                <div className="empty-hint">
                                    <i className="bi bi-emoji-smile"></i>
                                    <span>Tidak ada kecamatan di bawah ambang batas capaian saat ini</span>
                                </div>
                            )}
                            {kecamatanPerluPerhatian.map((a, i) => (
                                <div className="attention-item" key={i}>
                                    <div className="attention-icon"><i className="bi bi-exclamation-triangle-fill"></i></div>
                                    <div className="attention-info">
                                        <div className="a-kec">{a.kecamatan}</div>
                                        <div className="a-sub">{a.programLabel} · {a.periode}</div>
                                    </div>
                                    <div className="attention-pct">{a.pct}%</div>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>

                {/* RIGHT COLUMN */}
                <div className="dash-col">

                    <div className="panel-card">
                        <div className="panel-head">
                            <h3>Aktivitas Terbaru</h3>
                            <Link to="/admin/riwayat-upload">Lihat Semua <i className="bi bi-arrow-right"></i></Link>
                        </div>
                        <div className="activity-list">
                            {aktivitasTerbaru.length === 0 && (
                                <div className="empty-hint">
                                    <i className="bi bi-inbox"></i>
                                    <span>Belum ada aktivitas upload tercatat</span>
                                </div>
                            )}
                            {aktivitasTerbaru.map((a, i) => (
                                <div className="activity-item" key={i}>
                                    <div className="activity-dot" style={{ background: `${PROGRAM_COLOR[a.program]}18`, color: PROGRAM_COLOR[a.program] }}>
                                        <i className={`bi ${PROGRAM_ICON[a.program] || "bi-cloud-upload-fill"}`}></i>
                                    </div>
                                    <div className="activity-text">
                                        <b>{a.diuploadOleh}</b> mengunggah data <b>{a.programLabel}</b> periode {a.periode}
                                        <div className="activity-time">{formatWaktu(a.waktu)}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="panel-card">
                        <div className="panel-head">
                            <h3>Rasio Kepatuhan Upload</h3>
                        </div>
                        <div className="donut-wrap">
                            <div className="donut-canvas-holder">
                                <canvas ref={donutCanvasRef}></canvas>
                                <div className="donut-center-label">
                                    <div className="donut-center-value">{kpi.sudahUpload}/{kpi.totalProgram}</div>
                                    <div className="donut-center-caption">Program</div>
                                </div>
                            </div>
                            <div className="donut-legend">
                                <div className="donut-legend-item">
                                    <span className="donut-dot" style={{ background: "#2e7d32" }}></span>
                                    Sudah Upload
                                </div>
                                <div className="donut-legend-item">
                                    <span className="donut-dot" style={{ background: "#e5e8f0" }}></span>
                                    Belum Upload
                                </div>
                            </div>
                        </div>
                    </div>

                </div>

            </div>

            {/* SHORTCUT */}
            <div className="panel-card" style={{ marginBottom: 22 }}>
                <div className="panel-head">
                    <h3>Tambah Data Cepat</h3>
                </div>
                <div className="shortcut-grid">
                    {SHORTCUTS.map((s) => (
                        <Link to={s.to} className="shortcut-btn" key={s.key} style={{ "--sc-color": PROGRAM_COLOR[s.key] || "#1565c0" }}>
                            <span className="sc-icon"><i className={`bi ${s.icon || PROGRAM_ICON[s.key] || "bi-plus-circle"}`}></i></span>
                            <span className="sc-label">{s.label}</span>
                        </Link>
                    ))}
                </div>
            </div>

            {/* CHART: PERBANDINGAN CAPAIAN ANTAR PROGRAM */}
            <div className="chart-card">
                <div className="panel-head">
                    <h3>Rata-rata Capaian per Program — Periode Terbaru</h3>
                </div>
                <div className="chart-wrap">
                    <canvas ref={barCanvasRef}></canvas>
                </div>
            </div>
        </>
    );
}

export default DashboardContent;
