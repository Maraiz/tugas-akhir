import { useState, useRef, useEffect } from "react";
import Chart from "chart.js/auto";
import api from "../../../services/api";
import "../../../styles/laporan.css";

const PROGRAM_OPTIONS = [
    { key: "bkb", label: "BKB" },
    { key: "bkr", label: "BKR" },
    { key: "bkl", label: "BKL" },
    { key: "pikr", label: "PIK-R" },
    { key: "uppka", label: "UPPKA" },
];

function capaianClass(v) {
    const n = Number(v) || 0;
    if (n >= 85) return "high";
    if (n >= 60) return "mid";
    return "low";
}

function fmtPct(v) {
    const n = Number(v);
    return isNaN(n) ? "-" : n.toFixed(1) + "%";
}

const TABS = [
    { key: "tren", label: "Tren Waktu", icon: "bi-graph-up" },
    { key: "ranking", label: "Perbandingan Kecamatan", icon: "bi-bar-chart-line-fill" },
    { key: "program", label: "Perbandingan Program", icon: "bi-diagram-3-fill" },
];

// Bikin gradasi vertikal buat chart batang — biar nggak flat 1 warna doang
function makeGradient(ctx, chartArea, hex) {
    const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
    gradient.addColorStop(0, hex);
    gradient.addColorStop(1, hex + "55");
    return gradient;
}

const TOOLTIP_STYLE = {
    backgroundColor: "#1a1a2e",
    padding: 12,
    cornerRadius: 8,
    titleFont: { size: 12.5, weight: "600" },
    bodyFont: { size: 12.5 },
};

function LaporanContent() {
    const [activeTab, setActiveTab] = useState("tren");

    return (
        <>
            {/* TABS */}
            <div className="report-tabs">
                {TABS.map((t) => (
                    <div
                        key={t.key}
                        className={`report-tab ${activeTab === t.key ? "active" : ""}`}
                        onClick={() => setActiveTab(t.key)}
                    >
                        <i className={`bi ${t.icon}`}></i>
                        <span>{t.label}</span>
                    </div>
                ))}
            </div>

            {activeTab === "tren" && <TabTren />}
            {activeTab === "ranking" && <TabRanking />}
            {activeTab === "program" && <TabProgram />}
        </>
    );
}

/* ===================== TAB 1: TREN WAKTU ===================== */
function TabTren() {
    const canvasRef = useRef(null);
    const chartRef = useRef(null);

    const [program, setProgram] = useState("bkb");
    const [kecamatan, setKecamatan] = useState("");
    const [limit, setLimit] = useState(6);

    const [kecamatanOptions, setKecamatanOptions] = useState([]);
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [loadingOpsi, setLoadingOpsi] = useState(true);

    // Ambil daftar kecamatan tiap kali program diganti
    useEffect(() => {
        let cancelled = false;

        async function fetchOpsi() {
            setLoadingOpsi(true);
            try {
                const res = await api.get("/laporan/opsi", { params: { program } });
                if (cancelled) return;

                const kecList = res.data.data.kecamatans || [];
                setKecamatanOptions(kecList);
                setKecamatan((prev) => (kecList.includes(prev) ? prev : kecList[0] || ""));
            } catch (err) {
                console.error(err);
            } finally {
                if (!cancelled) setLoadingOpsi(false);
            }
        }

        fetchOpsi();
        return () => { cancelled = true; };
    }, [program]);

    async function fetchData() {
        if (!kecamatan) return;

        setLoading(true);
        setError("");

        try {
            const res = await api.get("/laporan/tren", { params: { program, kecamatan, limit } });
            const rows = res.data.data || [];
            setData(rows);
            drawChart(rows);
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.message || "Gagal memuat data tren.");
            setData([]);
        } finally {
            setLoading(false);
        }
    }

    function drawChart(rows) {
        if (chartRef.current) chartRef.current.destroy();
        if (!canvasRef.current) return;

        const ctx = canvasRef.current.getContext("2d");

        chartRef.current = new Chart(canvasRef.current, {
            type: "line",
            data: {
                labels: rows.map((d) => d.periode),
                datasets: [{
                    label: "% Capaian",
                    data: rows.map((d) => Number(d.pctCapaian) || 0),
                    borderColor: "#1565c0",
                    backgroundColor: (context) => {
                        const { chart } = context;
                        const { chartArea } = chart;
                        if (!chartArea) return "rgba(21, 101, 192, 0.08)";
                        const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
                        gradient.addColorStop(0, "rgba(21, 101, 192, 0.28)");
                        gradient.addColorStop(1, "rgba(21, 101, 192, 0.02)");
                        return gradient;
                    },
                    fill: true,
                    tension: 0.35,
                    pointBackgroundColor: "#1565c0",
                    pointBorderColor: "#fff",
                    pointBorderWidth: 2,
                    pointRadius: 5,
                    pointHoverRadius: 7,
                    borderWidth: 3,
                }],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: { ...TOOLTIP_STYLE, callbacks: { label: (c) => `Capaian: ${c.parsed.y.toFixed(1)}%` } },
                },
                scales: {
                    y: { beginAtZero: true, max: 100, ticks: { callback: (v) => v + "%" }, grid: { color: "#f0f2f8" } },
                    x: { grid: { display: false } },
                },
                animation: { duration: 650, easing: "easeOutQuart" },
            },
        });
    }

    useEffect(() => {
        if (!loadingOpsi && kecamatan) fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loadingOpsi]);

    useEffect(() => {
        return () => { if (chartRef.current) chartRef.current.destroy(); };
    }, []);

    const avgPct = data.length > 0 ? data.reduce((s, d) => s + (Number(d.pctCapaian) || 0), 0) / data.length : 0;
    const deltaPct = data.length >= 2 ? (Number(data[data.length - 1].pctCapaian) || 0) - (Number(data[0].pctCapaian) || 0) : 0;
    const tertinggi = data.length > 0 ? data.reduce((max, d) => (Number(d.pctCapaian) > Number(max.pctCapaian) ? d : max), data[0]) : null;

    const programLabel = PROGRAM_OPTIONS.find((p) => p.key === program)?.label;

    return (
        <>
            <div className="filter-card">
                <div className="filter-group">
                    <label>Program</label>
                    <select value={program} onChange={(e) => setProgram(e.target.value)}>
                        {PROGRAM_OPTIONS.map((p) => (
                            <option key={p.key} value={p.key}>{p.label}</option>
                        ))}
                    </select>
                </div>
                <div className="filter-group">
                    <label>Kecamatan</label>
                    <select value={kecamatan} onChange={(e) => setKecamatan(e.target.value)} disabled={loadingOpsi}>
                        {kecamatanOptions.length === 0 && <option>Tidak ada data</option>}
                        {kecamatanOptions.map((k) => (
                            <option key={k} value={k}>{k}</option>
                        ))}
                    </select>
                </div>
                <div className="filter-group">
                    <label>Rentang Periode</label>
                    <select value={limit} onChange={(e) => setLimit(Number(e.target.value))}>
                        <option value={6}>6 Bulan Terakhir</option>
                        <option value={12}>12 Bulan Terakhir</option>
                        <option value={999}>Semua Periode</option>
                    </select>
                </div>
                <button className="btn-terapkan" onClick={fetchData} disabled={loading || !kecamatan}>
                    {loading ? "Memuat..." : "Terapkan"}
                </button>
                <button className="btn-export-pdf"><i className="bi bi-file-earmark-pdf-fill"></i> Ekspor PDF</button>
            </div>

            {error && (
                <div className="table-card" style={{ padding: 20, marginBottom: 22, color: "#c62828", textAlign: "center" }}>
                    <i className="bi bi-exclamation-triangle-fill" style={{ marginRight: 6 }}></i>{error}
                </div>
            )}

            {!error && (
                <>
                    <div className="insight-row">
                        <div className="insight-card">
                            <div className="insight-icon blue"><i className="bi bi-bar-chart-fill"></i></div>
                            <div>
                                <div className="insight-value">{fmtPct(avgPct)}</div>
                                <div className="insight-label">Capaian Rata-rata Periode Ini</div>
                            </div>
                        </div>
                        <div className="insight-card">
                            <div className="insight-icon blue"><i className="bi bi-graph-up-arrow"></i></div>
                            <div>
                                <div className="insight-value">{deltaPct >= 0 ? "+" : ""}{deltaPct.toFixed(1)}%</div>
                                <div className="insight-label">Tren dari Awal ke Akhir Rentang</div>
                            </div>
                        </div>
                        <div className="insight-card">
                            <div className="insight-icon blue"><i className="bi bi-clock-history"></i></div>
                            <div>
                                <div className="insight-value">{tertinggi ? tertinggi.periode : "-"}</div>
                                <div className="insight-label">Capaian Tertinggi Tercatat</div>
                            </div>
                        </div>
                    </div>

                    <div className="chart-card">
                        <div className="chart-card-head">
                            <div>
                                <h3>Tren Capaian — Kecamatan {kecamatan || "-"} ({programLabel})</h3>
                                <p>Persentase capaian per periode</p>
                            </div>
                        </div>
                        <div className="chart-wrap">
                            <canvas ref={canvasRef}></canvas>
                        </div>
                    </div>

                    <div className="table-card">
                        <div className="table-wrapper">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Periode</th>
                                        <th className="center">Anggota Yg Ada</th>
                                        <th className="center">Target</th>
                                        <th className="center">Capaian</th>
                                        <th className="center">% Capaian</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.length === 0 && (
                                        <tr><td colSpan="5" style={{ textAlign: "center", padding: 20, color: "#9090a8" }}>
                                            {loading ? "Memuat data..." : "Belum ada data untuk kombinasi ini"}
                                        </td></tr>
                                    )}
                                    {data.map((d, i) => (
                                        <tr key={i}>
                                            <td><b>{d.periode}</b></td>
                                            <td className="center">{d.anggota ?? "-"}</td>
                                            <td className="center">{d.target ?? "-"}</td>
                                            <td className="center">{d.capaian ?? "-"}</td>
                                            <td className="center"><span className={`capaian-value ${capaianClass(d.pctCapaian)}`}>{fmtPct(d.pctCapaian)}</span></td>
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

/* ===================== TAB 2: PERBANDINGAN KECAMATAN ===================== */
function TabRanking() {
    const canvasRef = useRef(null);
    const chartRef = useRef(null);

    const [program, setProgram] = useState("bkb");
    const [periodeValue, setPeriodeValue] = useState(""); // "bulan-tahun"
    const [periodeOptions, setPeriodeOptions] = useState([]);
    const [loadingOpsi, setLoadingOpsi] = useState(true);

    const [rows, setRows] = useState([]);
    const [periodeLabel, setPeriodeLabel] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        let cancelled = false;

        async function fetchOpsi() {
            setLoadingOpsi(true);
            try {
                const res = await api.get("/laporan/opsi", { params: { program } });
                if (cancelled) return;

                const periods = res.data.data.periodes || [];
                setPeriodeOptions(periods);

                if (periods.length > 0) {
                    setPeriodeValue(`${periods[0].bulan}-${periods[0].tahun}`);
                } else {
                    setPeriodeValue("");
                }
            } catch (err) {
                console.error(err);
            } finally {
                if (!cancelled) setLoadingOpsi(false);
            }
        }

        fetchOpsi();
        return () => { cancelled = true; };
    }, [program]);

    async function fetchData() {
        if (!periodeValue) return;
        const [bulan, tahun] = periodeValue.split("-");

        setLoading(true);
        setError("");

        try {
            const res = await api.get("/laporan/ranking", { params: { program, bulan, tahun } });
            const data = res.data.data;
            setRows(data.rows || []);
            setPeriodeLabel(data.periode || "");
            drawChart(data.rows || []);
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.message || "Gagal memuat data ranking.");
            setRows([]);
        } finally {
            setLoading(false);
        }
    }

    function drawChart(data) {
        if (chartRef.current) chartRef.current.destroy();
        if (!canvasRef.current) return;

        const ctx = canvasRef.current.getContext("2d");

        chartRef.current = new Chart(canvasRef.current, {
            type: "bar",
            data: {
                labels: data.map((d) => d.kecamatan),
                datasets: [{
                    label: "% Capaian",
                    data: data.map((d) => Number(d.pctCapaian) || 0),
                    backgroundColor: (context) => {
                        const { chart, dataIndex } = context;
                        const { chartArea } = chart;
                        const v = Number(data[dataIndex]?.pctCapaian) || 0;
                        const hex = v >= 85 ? "#2e7d32" : v >= 60 ? "#f9a825" : "#e53935";
                        if (!chartArea) return hex;
                        const gradient = ctx.createLinearGradient(chartArea.left, 0, chartArea.right, 0);
                        gradient.addColorStop(0, hex + "55");
                        gradient.addColorStop(1, hex);
                        return gradient;
                    },
                    borderRadius: 6,
                }],
            },
            options: {
                indexAxis: "y",
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: { ...TOOLTIP_STYLE, callbacks: { label: (c) => `Capaian: ${c.parsed.x.toFixed(1)}%` } },
                },
                animation: { duration: 650, easing: "easeOutQuart" },
                scales: {
                    x: { beginAtZero: true, max: 100, ticks: { callback: (v) => v + "%" }, grid: { color: "#f0f2f8" } },
                    y: { grid: { display: false } },
                },
            },
        });
    }

    useEffect(() => {
        if (!loadingOpsi && periodeValue) fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loadingOpsi]);

    useEffect(() => {
        return () => { if (chartRef.current) chartRef.current.destroy(); };
    }, []);

    const terbaik = rows.length > 0 ? rows[0] : null;
    const terendah = rows.length > 0 ? rows[rows.length - 1] : null;
    const rataRata = rows.length > 0 ? rows.reduce((s, d) => s + (Number(d.pctCapaian) || 0), 0) / rows.length : 0;

    return (
        <>
            <div className="filter-card">
                <div className="filter-group">
                    <label>Program</label>
                    <select value={program} onChange={(e) => setProgram(e.target.value)}>
                        {PROGRAM_OPTIONS.map((p) => (
                            <option key={p.key} value={p.key}>{p.label}</option>
                        ))}
                    </select>
                </div>
                <div className="filter-group">
                    <label>Periode</label>
                    <select value={periodeValue} onChange={(e) => setPeriodeValue(e.target.value)} disabled={loadingOpsi}>
                        {periodeOptions.length === 0 && <option>Tidak ada data</option>}
                        {periodeOptions.map((p) => (
                            <option key={`${p.bulan}-${p.tahun}`} value={`${p.bulan}-${p.tahun}`}>{p.label}</option>
                        ))}
                    </select>
                </div>
                <button className="btn-terapkan" onClick={fetchData} disabled={loading || !periodeValue}>
                    {loading ? "Memuat..." : "Terapkan"}
                </button>
                <button className="btn-export-pdf"><i className="bi bi-file-earmark-pdf-fill"></i> Ekspor PDF</button>
            </div>

            {error && (
                <div className="table-card" style={{ padding: 20, marginBottom: 22, color: "#c62828", textAlign: "center" }}>
                    <i className="bi bi-exclamation-triangle-fill" style={{ marginRight: 6 }}></i>{error}
                </div>
            )}

            {!error && (
                <>
                    <div className="insight-row">
                        <div className="insight-card">
                            <div className="insight-icon green"><i className="bi bi-trophy-fill"></i></div>
                            <div>
                                <div className="insight-value">{terbaik ? terbaik.kecamatan : "-"}</div>
                                <div className="insight-label">Capaian Tertinggi ({terbaik ? fmtPct(terbaik.pctCapaian) : "-"})</div>
                            </div>
                        </div>
                        <div className="insight-card">
                            <div className="insight-icon red"><i className="bi bi-exclamation-triangle-fill"></i></div>
                            <div>
                                <div className="insight-value">{terendah ? terendah.kecamatan : "-"}</div>
                                <div className="insight-label">Perlu Perhatian ({terendah ? fmtPct(terendah.pctCapaian) : "-"})</div>
                            </div>
                        </div>
                        <div className="insight-card">
                            <div className="insight-icon blue"><i className="bi bi-bar-chart-fill"></i></div>
                            <div>
                                <div className="insight-value">{fmtPct(rataRata)}</div>
                                <div className="insight-label">Rata-rata Kabupaten</div>
                            </div>
                        </div>
                    </div>

                    <div className="chart-card">
                        <div className="chart-card-head">
                            <div>
                                <h3>Ranking Capaian Kecamatan — {PROGRAM_OPTIONS.find((p) => p.key === program)?.label}, {periodeLabel}</h3>
                                <p>Persentase capaian, diurutkan dari tertinggi</p>
                            </div>
                        </div>
                        <div className="chart-wrap tall">
                            <canvas ref={canvasRef}></canvas>
                        </div>
                    </div>

                    <div className="table-card">
                        <div className="table-wrapper">
                            <table>
                                <thead>
                                    <tr>
                                        <th className="center">Peringkat</th>
                                        <th>Kecamatan</th>
                                        <th className="center">Anggota Yg Ada</th>
                                        <th className="center">Capaian</th>
                                        <th>% Capaian</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.length === 0 && (
                                        <tr><td colSpan="5" style={{ textAlign: "center", padding: 20, color: "#9090a8" }}>
                                            {loading ? "Memuat data..." : "Belum ada data untuk periode ini"}
                                        </td></tr>
                                    )}
                                    {rows.map((d, i) => {
                                        const rank = i + 1;
                                        const rankClass = rank === 1 ? "top1" : rank === 2 ? "top2" : rank === 3 ? "top3" : "";
                                        const pct = Number(d.pctCapaian) || 0;
                                        return (
                                            <tr key={d.kecamatan}>
                                                <td className="center"><span className={`rank-badge ${rankClass}`}>{rank}</span></td>
                                                <td><b>{d.kecamatan}</b></td>
                                                <td className="center">{d.anggota ?? "-"}</td>
                                                <td className="center">{d.capaian ?? "-"}</td>
                                                <td>
                                                    <div className="capaian-bar-track">
                                                        <div className={`capaian-bar-fill ${capaianClass(pct)}`} style={{ width: `${Math.min(pct, 100)}%` }}></div>
                                                    </div>
                                                    <span className={`capaian-value ${capaianClass(pct)}`}>{fmtPct(pct)}</span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </>
    );
}

/* ===================== TAB 3: PERBANDINGAN PROGRAM ===================== */
function TabProgram() {
    const canvasRef = useRef(null);
    const chartRef = useRef(null);

    const [kecamatan, setKecamatan] = useState("");
    const [periodeValue, setPeriodeValue] = useState("");
    const [kecamatanOptions, setKecamatanOptions] = useState([]);
    const [periodeOptions, setPeriodeOptions] = useState([]);
    const [loadingOpsi, setLoadingOpsi] = useState(true);

    const [rows, setRows] = useState([]);
    const [periodeLabel, setPeriodeLabel] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // Ambil daftar kecamatan & periode dari program BKB sbg acuan
    // (asumsi cakupan kecamatan sama lintas program)
    useEffect(() => {
        let cancelled = false;

        async function fetchOpsi() {
            setLoadingOpsi(true);
            try {
                const res = await api.get("/laporan/opsi", { params: { program: "bkb" } });
                if (cancelled) return;

                const kecList = res.data.data.kecamatans || [];
                const periods = res.data.data.periodes || [];

                setKecamatanOptions(kecList);
                setPeriodeOptions(periods);
                setKecamatan(kecList[0] || "");
                setPeriodeValue(periods.length > 0 ? `${periods[0].bulan}-${periods[0].tahun}` : "");
            } catch (err) {
                console.error(err);
            } finally {
                if (!cancelled) setLoadingOpsi(false);
            }
        }

        fetchOpsi();
        return () => { cancelled = true; };
    }, []);

    async function fetchData() {
        if (!kecamatan || !periodeValue) return;
        const [bulan, tahun] = periodeValue.split("-");

        setLoading(true);
        setError("");

        try {
            const res = await api.get("/laporan/program", { params: { kecamatan, bulan, tahun } });
            const data = res.data.data;
            setRows(data.rows || []);
            setPeriodeLabel(data.periode || "");
            drawChart(data.rows || []);
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.message || "Gagal memuat data perbandingan program.");
            setRows([]);
        } finally {
            setLoading(false);
        }
    }

    function drawChart(data) {
        if (chartRef.current) chartRef.current.destroy();
        if (!canvasRef.current) return;

        const colors = { bkb: "#1565c0", bkr: "#2e7d32", bkl: "#ef6c00", pikr: "#8e24aa", uppka: "#c2185b" };
        const ctx = canvasRef.current.getContext("2d");

        chartRef.current = new Chart(canvasRef.current, {
            type: "bar",
            data: {
                labels: data.map((d) => d.label),
                datasets: [{
                    label: "% Capaian",
                    data: data.map((d) => (d.tersedia ? Number(d.pctCapaian) || 0 : 0)),
                    backgroundColor: (context) => {
                        const { chart, dataIndex } = context;
                        const { chartArea } = chart;
                        const hex = colors[data[dataIndex]?.program] || "#9090a8";
                        if (!chartArea) return hex;
                        return makeGradient(ctx, chartArea, hex);
                    },
                    borderRadius: 8,
                    maxBarThickness: 60,
                }],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        ...TOOLTIP_STYLE,
                        callbacks: {
                            label: (c) => data[c.dataIndex]?.tersedia ? `Capaian: ${c.parsed.y.toFixed(1)}%` : "Belum ada data",
                        },
                    },
                },
                animation: { duration: 650, easing: "easeOutQuart" },
                scales: {
                    y: { beginAtZero: true, max: 100, ticks: { callback: (v) => v + "%" }, grid: { color: "#f0f2f8" } },
                    x: { grid: { display: false } },
                },
            },
        });
    }

    useEffect(() => {
        if (!loadingOpsi && kecamatan && periodeValue) fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loadingOpsi]);

    useEffect(() => {
        return () => { if (chartRef.current) chartRef.current.destroy(); };
    }, []);

    const tersediaRows = rows.filter((d) => d.tersedia);
    const terbaik = tersediaRows.length > 0 ? tersediaRows.reduce((max, d) => (Number(d.pctCapaian) > Number(max.pctCapaian) ? d : max), tersediaRows[0]) : null;
    const terendah = tersediaRows.length > 0 ? tersediaRows.reduce((min, d) => (Number(d.pctCapaian) < Number(min.pctCapaian) ? d : min), tersediaRows[0]) : null;
    const rataRata = tersediaRows.length > 0 ? tersediaRows.reduce((s, d) => s + (Number(d.pctCapaian) || 0), 0) / tersediaRows.length : 0;

    return (
        <>
            <div className="filter-card">
                <div className="filter-group">
                    <label>Kecamatan</label>
                    <select value={kecamatan} onChange={(e) => setKecamatan(e.target.value)} disabled={loadingOpsi}>
                        {kecamatanOptions.length === 0 && <option>Tidak ada data</option>}
                        {kecamatanOptions.map((k) => (
                            <option key={k} value={k}>{k}</option>
                        ))}
                    </select>
                </div>
                <div className="filter-group">
                    <label>Periode</label>
                    <select value={periodeValue} onChange={(e) => setPeriodeValue(e.target.value)} disabled={loadingOpsi}>
                        {periodeOptions.length === 0 && <option>Tidak ada data</option>}
                        {periodeOptions.map((p) => (
                            <option key={`${p.bulan}-${p.tahun}`} value={`${p.bulan}-${p.tahun}`}>{p.label}</option>
                        ))}
                    </select>
                </div>
                <button className="btn-terapkan" onClick={fetchData} disabled={loading || !kecamatan || !periodeValue}>
                    {loading ? "Memuat..." : "Terapkan"}
                </button>
                <button className="btn-export-pdf"><i className="bi bi-file-earmark-pdf-fill"></i> Ekspor PDF</button>
            </div>

            {error && (
                <div className="table-card" style={{ padding: 20, marginBottom: 22, color: "#c62828", textAlign: "center" }}>
                    <i className="bi bi-exclamation-triangle-fill" style={{ marginRight: 6 }}></i>{error}
                </div>
            )}

            {!error && (
                <>
                    <div className="insight-row">
                        <div className="insight-card">
                            <div className="insight-icon green"><i className="bi bi-trophy-fill"></i></div>
                            <div>
                                <div className="insight-value">{terbaik ? terbaik.label : "-"}</div>
                                <div className="insight-label">Program Terbaik di Kecamatan Ini</div>
                            </div>
                        </div>
                        <div className="insight-card">
                            <div className="insight-icon red"><i className="bi bi-graph-down-arrow"></i></div>
                            <div>
                                <div className="insight-value">{terendah ? terendah.label : "-"}</div>
                                <div className="insight-label">Program Perlu Perhatian</div>
                            </div>
                        </div>
                        <div className="insight-card">
                            <div className="insight-icon blue"><i className="bi bi-bar-chart-fill"></i></div>
                            <div>
                                <div className="insight-value">{fmtPct(rataRata)}</div>
                                <div className="insight-label">Rata-rata Kecamatan ({tersediaRows.length} Program)</div>
                            </div>
                        </div>
                    </div>

                    <div className="chart-card">
                        <div className="chart-card-head">
                            <div>
                                <h3>Perbandingan Capaian Antar Program — Kecamatan {kecamatan || "-"}, {periodeLabel}</h3>
                                <p>Insight: kecamatan bisa unggul di 1 program tapi tertinggal di program lain</p>
                            </div>
                        </div>
                        <div className="chart-wrap">
                            <canvas ref={canvasRef}></canvas>
                        </div>
                    </div>

                    <div className="table-card">
                        <div className="table-wrapper">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Program</th>
                                        <th className="center">Jumlah Poktan</th>
                                        <th className="center">Anggota Yg Ada</th>
                                        <th className="center">Capaian</th>
                                        <th>% Capaian</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.length === 0 && (
                                        <tr><td colSpan="5" style={{ textAlign: "center", padding: 20, color: "#9090a8" }}>
                                            {loading ? "Memuat data..." : "Belum ada data untuk kombinasi ini"}
                                        </td></tr>
                                    )}
                                    {rows.map((d) => (
                                        <tr key={d.program}>
                                            <td><b>{d.label}</b></td>
                                            {d.tersedia ? (
                                                <>
                                                    <td className="center">{d.ada ?? "-"}</td>
                                                    <td className="center">{d.anggota ?? "-"}</td>
                                                    <td className="center">{d.capaian ?? "-"}</td>
                                                    <td>
                                                        <div className="capaian-bar-track">
                                                            <div className={`capaian-bar-fill ${capaianClass(d.pctCapaian)}`} style={{ width: `${Math.min(Number(d.pctCapaian) || 0, 100)}%` }}></div>
                                                        </div>
                                                        <span className={`capaian-value ${capaianClass(d.pctCapaian)}`}>{fmtPct(d.pctCapaian)}</span>
                                                    </td>
                                                </>
                                            ) : (
                                                <td colSpan="4" style={{ textAlign: "center", color: "#9090a8" }}>Belum ada data periode ini</td>
                                            )}
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

export default LaporanContent;
