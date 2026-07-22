import { useRef, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Chart from "chart.js/auto";
import api from "../../../services/api";
import "../../../styles/dashboard.css";

const PROGRAM_ICON = { bkb: "bi-journal-bookmark-fill", bkr: "bi-journal-bookmark-fill", bkl: "bi-journal-bookmark-fill", pikr: "bi-journal-bookmark-fill", uppka: "bi-journal-bookmark-fill" };
const PROGRAM_COLOR = { bkb: "#1565c0", bkr: "#2e7d32", bkl: "#ef6c00", pikr: "#8e24aa", uppka: "#c2185b" };

function formatWaktu(dateStr) {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    const tanggal = d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
    const jam = d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
    return `${tanggal}, ${jam} WIB`;
}

function makeGradient(ctx, chartArea, hex) {
    const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
    gradient.addColorStop(0, hex);
    gradient.addColorStop(1, hex + "55");
    return gradient;
}

function DashboardContent() {
    const barCanvasRef = useRef(null);
    const barChartRef = useRef(null);

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
            setError(err.response?.data?.message || "Gagal memuat data ringkasan.");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchDashboard();
    }, []);

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
                        const { chartArea } = chart;
                        const hex = PROGRAM_COLOR[grafik[context.dataIndex]?.program] || "#9090a8";
                        if (!chartArea) return hex;
                        return makeGradient(ctx, chartArea, hex);
                    },
                    borderRadius: 10,
                    maxBarThickness: 56,
                }],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: "#1a1a2e", padding: 12, cornerRadius: 8,
                        callbacks: { label: (c) => `Rata-rata Capaian: ${c.parsed.y}%` },
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

    if (loading) {
        return <div style={{ textAlign: "center", padding: 60, color: "#9090a8" }}>Memuat ringkasan...</div>;
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
                <h1>Selamat datang <i className="bi bi-emoji-smile-fill greeting-icon" style={{ color: "#6a1b9a" }}></i></h1>
                <p>Ringkasan capaian monitoring poktan seluruh program — periode {periodeBerjalan}</p>
            </div>

            {/* Info status data — informatif doang, bukan actionable (Pimpinan cuma lihat) */}
            {belumUpload.length > 0 && (
                <div className="reminder-banner">
                    <div className="reminder-icon"><i className="bi bi-info-circle-fill"></i></div>
                    <div className="reminder-text">
                        <h4>{belumUpload.length} program belum melaporkan data periode {periodeBerjalan}</h4>
                        <p>
                            {belumUpload.map((p, i) => (
                                <span key={p.program}>
                                    <b>{p.label}</b>{i < belumUpload.length - 1 ? (i === belumUpload.length - 2 ? " dan " : ", ") : ""}
                                </span>
                            ))}
                            {" "}masih dalam proses pelaporan.
                        </p>
                    </div>
                </div>
            )}

            {/* KPI CARDS — versi ringkas, tanpa "Total Pengguna" (nggak relevan buat Pimpinan) */}
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
                    <div className="kpi-icon purple"><i className="bi bi-check-circle-fill"></i></div>
                    <div>
                        <div className="kpi-value">{kpi.sudahUpload} / {kpi.totalProgram}</div>
                        <div className="kpi-label">Program Sudah Melapor Bulan Ini</div>
                    </div>
                </div>
            </div>

            {/* 2 COLUMN GRID */}
            <div className="dash-grid">

                <div className="dash-col">

                    <div className="panel-card">
                        <div className="panel-head">
                            <h3>Kecamatan Perlu Perhatian</h3>
                            <Link to="/user/laporan">Lihat Laporan <i className="bi bi-arrow-right"></i></Link>
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

                <div className="dash-col">

                    <div className="panel-card">
                        <div className="panel-head">
                            <h3>Aktivitas Pelaporan Terbaru</h3>
                        </div>
                        <div className="activity-list">
                            {aktivitasTerbaru.length === 0 && (
                                <div className="empty-hint">
                                    <i className="bi bi-inbox"></i>
                                    <span>Belum ada aktivitas pelaporan tercatat</span>
                                </div>
                            )}
                            {aktivitasTerbaru.map((a, i) => (
                                <div className="activity-item" key={i}>
                                    <div className="activity-dot" style={{ background: `${PROGRAM_COLOR[a.program]}18`, color: PROGRAM_COLOR[a.program] }}>
                                        <i className={`bi ${PROGRAM_ICON[a.program] || "bi-cloud-upload-fill"}`}></i>
                                    </div>
                                    <div className="activity-text">
                                        <b>{a.diuploadOleh}</b> melaporkan data <b>{a.programLabel}</b> periode {a.periode}
                                        <div className="activity-time">{formatWaktu(a.waktu)}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>

            </div>

            {/* CHART */}
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
