import { useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import Chart from "chart.js/auto";
import "../../../styles/dashboard.css";

/* ===================== DUMMY DATA ===================== */
/* TODO: ganti jadi fetch dari backend — kebanyakan bisa reuse endpoint
   yang udah ada (/riwayat-upload buat Aktivitas Terbaru, /laporan/ranking
   buat Kecamatan Perlu Perhatian, dst) */
const PROGRAM_STATUS = [
    { key: "bkb", label: "BKB", nama: "Bina Keluarga Balita", done: true, info: "Diupload 10 Jul 2026, 15:10" },
    { key: "bkr", label: "BKR", nama: "Bina Keluarga Remaja", done: true, info: "Diupload 10 Jul 2026, 10:44" },
    { key: "bkl", label: "BKL", nama: "Bina Keluarga Lansia", done: true, info: "Diupload 10 Jul 2026, 16:20" },
    { key: "pikr", label: "PIK-R", nama: "PIK Remaja", done: false, info: "Belum ada unggahan bulan ini" },
    { key: "uppka", label: "UPPKA", nama: "Usaha Peningkatan Pendapatan Keluarga Akseptor", done: false, info: "Belum ada unggahan bulan ini" },
];

const ATTENTION_LIST = [
    { kec: "Licin", ket: "BKB · Juni 2026", pct: 54 },
    { kec: "Sempu", ket: "UPPKA · Mei 2026", pct: 58 },
    { kec: "Kalipuro", ket: "BKL · Juni 2026", pct: 63 },
];

const ACTIVITY_LIST = [
    { text: <><b>Admin Dinas</b> mengunggah data <b>PIK-R</b> periode Desember 2025</>, time: "10 Jul 2026, 17:40 WIB" },
    { text: <><b>Admin Dinas</b> mengunggah data <b>UPPKA</b> periode Desember 2025</>, time: "10 Jul 2026, 17:05 WIB" },
    { text: <><b>Admin Dinas</b> mengunggah data <b>BKL</b> periode Desember 2025</>, time: "10 Jul 2026, 16:20 WIB" },
    { text: <><b>Admin Dinas</b> mengunggah data <b>BKB</b> periode Desember 2025</>, time: "10 Jul 2026, 15:10 WIB" },
    { text: <><b>Admin Dinas</b> mengunggah data <b>BKR</b> periode Januari 2026</>, time: "10 Jul 2026, 10:44 WIB" },
];

const PROGRAM_CHART_DATA = [
    { program: "BKB", pct: 88.1, color: "#1565c0" },
    { program: "BKR", pct: 91.7, color: "#2e7d32" },
    { program: "BKL", pct: 90.2, color: "#ef6c00" },
    { program: "PIK-R", pct: 76.5, color: "#8e24aa" },
    { program: "UPPKA", pct: 63.8, color: "#c2185b" },
];

const SHORTCUTS = [
    { icon: "📘", label: "BKB", to: "/admin/monitoring/bkb/tambah" },
    { icon: "📗", label: "BKR", to: "/admin/monitoring/bkr/tambah" },
    { icon: "📙", label: "BKL", to: "/admin/monitoring/bkl/tambah" },
    { icon: "📕", label: "PIK-R", to: "/admin/monitoring/pikr/tambah" },
    { icon: "📓", label: "UPPKA", to: "/admin/monitoring/uppka/tambah" },
    { icon: "👥", label: "Pengguna", to: "/admin/data-pengguna" },
];

function DashboardContent() {
    const canvasRef = useRef(null);
    const chartRef = useRef(null);

    useEffect(() => {
        chartRef.current = new Chart(canvasRef.current, {
            type: "bar",
            data: {
                labels: PROGRAM_CHART_DATA.map((d) => d.program),
                datasets: [{
                    label: "% Capaian",
                    data: PROGRAM_CHART_DATA.map((d) => d.pct),
                    backgroundColor: PROGRAM_CHART_DATA.map((d) => d.color),
                    borderRadius: 8,
                    maxBarThickness: 60,
                }],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, max: 100, ticks: { callback: (v) => v + "%" }, grid: { color: "#f0f2f8" } },
                    x: { grid: { display: false } },
                },
            },
        });

        return () => { if (chartRef.current) chartRef.current.destroy(); };
    }, []);

    const belumUpload = PROGRAM_STATUS.filter((p) => !p.done);
    const sudahUpload = PROGRAM_STATUS.filter((p) => p.done);

    return (
        <>
            <div className="greeting">
                <h1>Selamat datang kembali, Admin Dinas 👋</h1>
                <p>Berikut ringkasan status monitoring poktan periode berjalan</p>
            </div>

            {/* REMINDER BANNER — cuma muncul kalau ada program yang belum upload */}
            {belumUpload.length > 0 && (
                <div className="reminder-banner">
                    <div className="reminder-icon">⏰</div>
                    <div className="reminder-text">
                        <h4>Ada {belumUpload.length} program yang belum upload data periode Juni 2026</h4>
                        <p>
                            {belumUpload.map((p, i) => (
                                <span key={p.key}>
                                    <b>{p.label}</b>{i < belumUpload.length - 1 ? (i === belumUpload.length - 2 ? " dan " : ", ") : ""}
                                </span>
                            ))}
                            {" "}belum diupload. Batas unggah disarankan sebelum tanggal 5 tiap bulan.
                        </p>
                    </div>
                    <button className="btn-reminder-action">Lihat Detail</button>
                </div>
            )}

            {/* KPI CARDS */}
            <div className="kpi-row">
                <div className="kpi-card">
                    <div className="kpi-icon blue">🗂️</div>
                    <div>
                        <div className="kpi-value">47</div>
                        <div className="kpi-label">Total Periode Terekam (5 Program)</div>
                    </div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-icon green">📈</div>
                    <div>
                        <div className="kpi-value">82.1%</div>
                        <div className="kpi-label">Rata-rata Capaian Kabupaten</div>
                    </div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-icon orange">👥</div>
                    <div>
                        <div className="kpi-value">12</div>
                        <div className="kpi-label">Total Pengguna Terdaftar</div>
                    </div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-icon purple">✅</div>
                    <div>
                        <div className="kpi-value">{sudahUpload.length} / {PROGRAM_STATUS.length}</div>
                        <div className="kpi-label">Program Sudah Upload Bulan Ini</div>
                    </div>
                </div>
            </div>

            {/* 2 COLUMN GRID */}
            <div className="dash-grid">

                {/* LEFT COLUMN */}
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

                    <div className="panel-card">
                        <div className="panel-head">
                            <h3>Status Upload — Juni 2026</h3>
                            <Link to="/admin/riwayat-upload">Lihat Riwayat →</Link>
                        </div>
                        <div className="status-list">
                            {PROGRAM_STATUS.map((p) => (
                                <div className="status-item" key={p.key}>
                                    <div className={`status-program-badge ${p.key}`}>{p.label}</div>
                                    <div className="status-info">
                                        <div className="s-name">{p.nama}</div>
                                        <div className="s-sub">{p.info}</div>
                                    </div>
                                    <span className={`status-pill ${p.done ? "done" : "pending"}`}>
                                        {p.done ? "✓ Sudah" : "⚠ Belum"}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="panel-card">
                        <div className="panel-head">
                            <h3>Kecamatan Perlu Perhatian</h3>
                            <Link to="/admin/laporan">Lihat Laporan →</Link>
                        </div>
                        <div className="attention-list">
                            {ATTENTION_LIST.map((a, i) => (
                                <div className="attention-item" key={i}>
                                    <div className="attention-info">
                                        <div className="a-kec">{a.kec}</div>
                                        <div className="a-sub">{a.ket}</div>
                                    </div>
                                    <div className="attention-pct">{a.pct}%</div>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>

                {/* RIGHT COLUMN */}
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

                    <div className="panel-card">
                        <div className="panel-head">
                            <h3>Aktivitas Terbaru</h3>
                            <Link to="/admin/riwayat-upload">Lihat Semua →</Link>
                        </div>
                        <div className="activity-list">
                            {ACTIVITY_LIST.map((a, i) => (
                                <div className="activity-item" key={i}>
                                    <div className="activity-dot">📄</div>
                                    <div className="activity-text">
                                        {a.text}
                                        <div className="activity-time">{a.time}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="panel-card">
                        <div className="panel-head">
                            <h3>Tambah Data Cepat</h3>
                        </div>
                        <div className="shortcut-grid">
                            {SHORTCUTS.map((s) => (
                                <Link to={s.to} className="shortcut-btn" key={s.label}>
                                    <span className="sc-icon">{s.icon}</span>
                                    <span className="sc-label">{s.label}</span>
                                </Link>
                            ))}
                        </div>
                    </div>

                </div>

            </div>

            {/* CHART: PERBANDINGAN CAPAIAN ANTAR PROGRAM */}
            <div className="chart-card">
                <div className="panel-head">
                    <h3>Rata-rata Capaian per Program — Periode Terbaru</h3>
                </div>
                <div className="chart-wrap">
                    <canvas ref={canvasRef}></canvas>
                </div>
            </div>
        </>
    );
}

export default DashboardContent;
