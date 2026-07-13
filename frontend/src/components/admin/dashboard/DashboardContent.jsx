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

const PROGRAM_ICON = { bkb: "📘", bkr: "📗", bkl: "📙", pikr: "📕", uppka: "📓" };
const PROGRAM_COLOR = { bkb: "#1565c0", bkr: "#2e7d32", bkl: "#ef6c00", pikr: "#8e24aa", uppka: "#c2185b" };

const SHORTCUTS = [
    { key: "bkb", label: "BKB", to: "/admin/monitoring/bkb/tambah" },
    { key: "bkr", label: "BKR", to: "/admin/monitoring/bkr/tambah" },
    { key: "bkl", label: "BKL", to: "/admin/monitoring/bkl/tambah" },
    { key: "pikr", label: "PIK-R", to: "/admin/monitoring/pikr/tambah" },
    { key: "uppka", label: "UPPKA", to: "/admin/monitoring/uppka/tambah" },
    { key: "users", label: "Pengguna", to: "/admin/data-pengguna", icon: "👥" },
];

function formatWaktu(dateStr) {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    const tanggal = d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
    const jam = d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
    return `${tanggal}, ${jam} WIB`;
}

function DashboardContent() {
    const canvasRef = useRef(null);
    const chartRef = useRef(null);

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

    // Gambar ulang grafik tiap kali data berubah
    useEffect(() => {
        if (!data || !canvasRef.current) return;

        if (chartRef.current) chartRef.current.destroy();

        const grafik = data.grafikCapaianProgram || [];

        chartRef.current = new Chart(canvasRef.current, {
            type: "bar",
            data: {
                labels: grafik.map((d) => d.label),
                datasets: [{
                    label: "% Capaian",
                    data: grafik.map((d) => d.pct),
                    backgroundColor: grafik.map((d) => PROGRAM_COLOR[d.program] || "#9090a8"),
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
    }, [data]);

    if (loading) {
        return <div style={{ textAlign: "center", padding: 60, color: "#9090a8" }}>Memuat dashboard...</div>;
    }

    if (error) {
        return (
            <div className="panel-card" style={{ textAlign: "center", padding: 40 }}>
                <p style={{ color: "#c62828", marginBottom: 14 }}>⚠ {error}</p>
                <button className="btn-reminder-action" onClick={fetchDashboard}>Coba Lagi</button>
            </div>
        );
    }

    const { kpi, statusUpload, kecamatanPerluPerhatian, aktivitasTerbaru, periodeBerjalan } = data;
    const belumUpload = statusUpload.filter((p) => !p.done);

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
                    <Link to="/admin/riwayat-upload" className="btn-reminder-action" style={{ textDecoration: "none", display: "inline-block" }}>
                        Lihat Detail
                    </Link>
                </div>
            )}

            {/* KPI CARDS */}
            <div className="kpi-row">
                <div className="kpi-card">
                    <div className="kpi-icon blue">🗂️</div>
                    <div>
                        <div className="kpi-value">{kpi.totalPeriode}</div>
                        <div className="kpi-label">Total Periode Terekam ({kpi.totalProgram} Program)</div>
                    </div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-icon green">📈</div>
                    <div>
                        <div className="kpi-value">{kpi.rataCapaianKabupaten}%</div>
                        <div className="kpi-label">Rata-rata Capaian Kabupaten</div>
                    </div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-icon orange">👥</div>
                    <div>
                        <div className="kpi-value">{kpi.totalPengguna}</div>
                        <div className="kpi-label">Total Pengguna Terdaftar</div>
                    </div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-icon purple">✅</div>
                    <div>
                        <div className="kpi-value">{kpi.sudahUpload} / {kpi.totalProgram}</div>
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
                            <h3>Status Upload — {periodeBerjalan}</h3>
                            <Link to="/admin/riwayat-upload">Lihat Riwayat →</Link>
                        </div>
                        <div className="status-list">
                            {statusUpload.map((p) => (
                                <div className="status-item" key={p.program}>
                                    <div className={`status-program-badge ${p.program}`}>{p.label}</div>
                                    <div className="status-info">
                                        <div className="s-name">{PROGRAM_FULLNAME[p.program] || p.label}</div>
                                        <div className="s-sub">
                                            {p.done ? `Diupload ${formatWaktu(p.waktu)}` : "Belum ada unggahan bulan ini"}
                                        </div>
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
                            {kecamatanPerluPerhatian.length === 0 && (
                                <p style={{ fontSize: 12.5, color: "#9090a8", textAlign: "center", padding: "12px 0" }}>
                                    Tidak ada kecamatan di bawah ambang batas capaian saat ini 🎉
                                </p>
                            )}
                            {kecamatanPerluPerhatian.map((a, i) => (
                                <div className="attention-item" key={i}>
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
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

                    <div className="panel-card">
                        <div className="panel-head">
                            <h3>Aktivitas Terbaru</h3>
                            <Link to="/admin/riwayat-upload">Lihat Semua →</Link>
                        </div>
                        <div className="activity-list">
                            {aktivitasTerbaru.length === 0 && (
                                <p style={{ fontSize: 12.5, color: "#9090a8", textAlign: "center", padding: "12px 0" }}>
                                    Belum ada aktivitas upload tercatat
                                </p>
                            )}
                            {aktivitasTerbaru.map((a, i) => (
                                <div className="activity-item" key={i}>
                                    <div className="activity-dot">{PROGRAM_ICON[a.program] || "📄"}</div>
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
                            <h3>Tambah Data Cepat</h3>
                        </div>
                        <div className="shortcut-grid">
                            {SHORTCUTS.map((s) => (
                                <Link to={s.to} className="shortcut-btn" key={s.key}>
                                    <span className="sc-icon">{s.icon || PROGRAM_ICON[s.key]}</span>
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
