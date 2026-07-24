import { useState, useEffect, useRef } from "react";
import Chart from "chart.js/auto";
import api from "../../../services/api";
import "../../../styles/detailKecamatan.css";

const PROGRAM_COLOR = { bkb: "#1565c0", bkr: "#2e7d32", bkl: "#ef6c00", pikr: "#8e24aa", uppka: "#c2185b" };
const PROGRAM_ICON = {
    bkb: "bi-journal-bookmark-fill",
    bkr: "bi-journal-bookmark-fill",
    bkl: "bi-journal-bookmark-fill",
    pikr: "bi-journal-bookmark-fill",
    uppka: "bi-journal-bookmark-fill",
};
const PROGRAM_ORDER = ["bkb", "bkr", "bkl", "pikr", "uppka"];
const TREN_LIMIT = 6; // 6 bulan terakhir buat grafik tren historis

function fmtPct(v) {
    const n = Number(v);
    return isNaN(n) ? "-" : n.toFixed(1);
}

function capaianClass(v) {
    const n = Number(v) || 0;
    if (n >= 85) return "high";
    if (n >= 60) return "mid";
    return "low";
}

function DetailKecamatanContent() {

    const radarCanvasRef = useRef(null);
    const radarChartRef = useRef(null);
    const trenCanvasRef = useRef(null);
    const trenChartRef = useRef(null);

    const now = new Date();

    const [kecamatanOptions, setKecamatanOptions] = useState([]);
    const [periodeOptions, setPeriodeOptions] = useState([]);
    const [loadingOpsi, setLoadingOpsi] = useState(true);

    const [kecamatan, setKecamatan] = useState("");
    const [periodeValue, setPeriodeValue] = useState(""); // "bulan-tahun"

    const [rows, setRows] = useState([]); // hasil /laporan/program
    const [periodeLabel, setPeriodeLabel] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const [trenLoading, setTrenLoading] = useState(false);
    const [trenLabels, setTrenLabels] = useState([]);
    const [trenSeries, setTrenSeries] = useState([]); // [{program, label, data: [..]}]

    // ===== Ambil daftar kecamatan & periode (reuse opsi dari BKB sbg acuan) =====
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

    // ===== Ambil data snapshot 5 program (buat kartu + radar) =====
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
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.message || "Gagal memuat data kecamatan.");
            setRows([]);
        } finally {
            setLoading(false);
        }
    }

    // ===== Ambil tren historis 5 program (6 bulan terakhir, terpisah dari filter periode) =====
    async function fetchTren() {
        if (!kecamatan) return;

        setTrenLoading(true);

        try {
            const results = await Promise.allSettled(
                PROGRAM_ORDER.map((program) =>
                    api.get("/laporan/tren", { params: { program, kecamatan, limit: TREN_LIMIT } })
                        .then((res) => ({ program, rows: res.data.data || [] }))
                )
            );

            // Gabungin semua periode yang muncul di 5 program jadi 1 daftar
            // periode master (union), diurutkan kronologis
            const periodeMap = new Map(); // key "tahun-bulan" -> {bulan, tahun, label}

            results.forEach((r) => {
                if (r.status !== "fulfilled") return;
                r.value.rows.forEach((row) => {
                    const key = `${row.tahun}-${row.bulan}`;
                    if (!periodeMap.has(key)) {
                        periodeMap.set(key, { bulan: row.bulan, tahun: row.tahun, label: row.periode });
                    }
                });
            });

            const masterPeriods = Array.from(periodeMap.values())
                .sort((a, b) => (a.tahun - b.tahun) || (a.bulan - b.bulan));

            const series = results.map((r, i) => {
                const program = PROGRAM_ORDER[i];
                if (r.status !== "fulfilled") return { program, label: program.toUpperCase(), data: masterPeriods.map(() => null) };

                const dataMap = new Map(r.value.rows.map((row) => [`${row.tahun}-${row.bulan}`, Number(row.pctCapaian) || 0]));

                return {
                    program,
                    label: program.toUpperCase(),
                    data: masterPeriods.map((p) => {
                        const v = dataMap.get(`${p.tahun}-${p.bulan}`);
                        return v !== undefined ? v : null;
                    }),
                };
            });

            setTrenLabels(masterPeriods.map((p) => p.label));
            setTrenSeries(series);

        } catch (err) {
            console.error(err);
        } finally {
            setTrenLoading(false);
        }
    }

    useEffect(() => {
        if (!loadingOpsi && kecamatan && periodeValue) {
            fetchData();
            fetchTren();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loadingOpsi]);

    // ===== Radar chart =====
    useEffect(() => {
        if (rows.length === 0 || !radarCanvasRef.current) return;
        if (radarChartRef.current) radarChartRef.current.destroy();

        const orderedRows = PROGRAM_ORDER.map((p) => rows.find((r) => r.program === p)).filter(Boolean);

        radarChartRef.current = new Chart(radarCanvasRef.current, {
            type: "radar",
            data: {
                labels: orderedRows.map((r) => r.label),
                datasets: [{
                    label: "% Capaian",
                    data: orderedRows.map((r) => (r.tersedia ? Number(r.pctCapaian) || 0 : 0)),
                    backgroundColor: "rgba(106, 27, 154, 0.15)",
                    borderColor: "#6a1b9a",
                    borderWidth: 2,
                    pointBackgroundColor: orderedRows.map((r) => PROGRAM_COLOR[r.program]),
                    pointRadius: 5,
                    pointHoverRadius: 7,
                }],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: "#1a1a2e", padding: 10, cornerRadius: 8,
                        callbacks: {
                            label: (c) => {
                                const row = orderedRows[c.dataIndex];
                                return row.tersedia ? `${row.label}: ${fmtPct(row.pctCapaian)}%` : `${row.label}: Belum ada data`;
                            },
                        },
                    },
                },
                scales: {
                    r: {
                        beginAtZero: true,
                        max: 100,
                        ticks: { stepSize: 25, backdropColor: "transparent", font: { size: 9 } },
                        grid: { color: "#e8eaf0" },
                        angleLines: { color: "#e8eaf0" },
                        pointLabels: { font: { size: 12, weight: "600" }, color: "#3f4557" },
                    },
                },
                animation: { duration: 600, easing: "easeOutQuart" },
            },
        });

        return () => { if (radarChartRef.current) radarChartRef.current.destroy(); };
    }, [rows]);

    // ===== Tren historis chart (multi-garis) =====
    useEffect(() => {
        if (trenSeries.length === 0 || !trenCanvasRef.current) return;
        if (trenChartRef.current) trenChartRef.current.destroy();

        trenChartRef.current = new Chart(trenCanvasRef.current, {
            type: "line",
            data: {
                labels: trenLabels,
                datasets: trenSeries.map((s) => ({
                    label: s.label,
                    data: s.data,
                    borderColor: PROGRAM_COLOR[s.program],
                    backgroundColor: PROGRAM_COLOR[s.program],
                    tension: 0.35,
                    spanGaps: true,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    borderWidth: 2.5,
                })),
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: true, position: "top", labels: { boxWidth: 12, font: { size: 11.5 } } },
                    tooltip: {
                        backgroundColor: "#1a1a2e", padding: 10, cornerRadius: 8,
                        callbacks: { label: (c) => `${c.dataset.label}: ${c.parsed.y === null ? "Belum ada data" : c.parsed.y.toFixed(1) + "%"}` },
                    },
                },
                scales: {
                    y: { beginAtZero: true, max: 100, ticks: { callback: (v) => v + "%" }, grid: { color: "#f0f2f8" } },
                    x: { grid: { display: false } },
                },
                animation: { duration: 600, easing: "easeOutQuart" },
            },
        });

        return () => { if (trenChartRef.current) trenChartRef.current.destroy(); };
    }, [trenSeries, trenLabels]);

    const tersediaRows = rows.filter((r) => r.tersedia);
    const rataRata = tersediaRows.length > 0 ? tersediaRows.reduce((s, r) => s + (Number(r.pctCapaian) || 0), 0) / tersediaRows.length : 0;
    const terbaik = tersediaRows.length > 0 ? tersediaRows.reduce((max, r) => (Number(r.pctCapaian) > Number(max.pctCapaian) ? r : max), tersediaRows[0]) : null;
    const terendah = tersediaRows.length > 0 ? tersediaRows.reduce((min, r) => (Number(r.pctCapaian) < Number(min.pctCapaian) ? r : min), tersediaRows[0]) : null;

    return (
        <>
            <div className="dk-toolbar">
                <div className="dk-title">
                    <h2>Detail per Kecamatan</h2>
                    <p>Lihat performa seluruh program dalam 1 kecamatan sekaligus</p>
                </div>

                <div className="dk-filter">
                    <select value={kecamatan} onChange={(e) => setKecamatan(e.target.value)} disabled={loadingOpsi}>
                        {kecamatanOptions.length === 0 && <option>Tidak ada data</option>}
                        {kecamatanOptions.map((k) => (
                            <option key={k} value={k}>{k}</option>
                        ))}
                    </select>
                    <select value={periodeValue} onChange={(e) => setPeriodeValue(e.target.value)} disabled={loadingOpsi}>
                        {periodeOptions.length === 0 && <option>Tidak ada data</option>}
                        {periodeOptions.map((p) => (
                            <option key={`${p.bulan}-${p.tahun}`} value={`${p.bulan}-${p.tahun}`}>{p.label}</option>
                        ))}
                    </select>
                    <button className="dk-btn-apply" onClick={() => { fetchData(); fetchTren(); }} disabled={loading}>
                        {loading ? "Memuat..." : "Terapkan"}
                    </button>
                </div>
            </div>

            {error && (
                <div className="dk-panel" style={{ textAlign: "center", padding: 30, color: "#c62828" }}>
                    <i className="bi bi-exclamation-triangle-fill" style={{ marginRight: 6 }}></i>{error}
                </div>
            )}

            {!error && rows.length > 0 && (
                <>
                    {/* KARTU RINGKASAN KECAMATAN */}
                    <div className="dk-summary-card">
                        <div className="dk-summary-icon"><i className="bi bi-geo-alt-fill"></i></div>
                        <div>
                            <h3>{kecamatan}</h3>
                            <p>Periode {periodeLabel}</p>
                        </div>
                        <div className="dk-summary-score">
                            <div className="dk-summary-score-value">{fmtPct(rataRata)}%</div>
                            <div className="dk-summary-score-label">Rata-rata Gabungan 5 Program</div>
                        </div>
                    </div>

                    {/* INSIGHT */}
                    <div className="dk-insight-row">
                        <div className="dk-insight-card">
                            <div className="dk-insight-icon green"><i className="bi bi-trophy-fill"></i></div>
                            <div>
                                <div className="dk-insight-value">{terbaik ? terbaik.label : "-"}</div>
                                <div className="dk-insight-label">Program Terbaik</div>
                            </div>
                        </div>
                        <div className="dk-insight-card">
                            <div className="dk-insight-icon red"><i className="bi bi-exclamation-triangle-fill"></i></div>
                            <div>
                                <div className="dk-insight-value">{terendah ? terendah.label : "-"}</div>
                                <div className="dk-insight-label">Perlu Perhatian</div>
                            </div>
                        </div>
                        <div className="dk-insight-card">
                            <div className="dk-insight-icon blue"><i className="bi bi-check-circle-fill"></i></div>
                            <div>
                                <div className="dk-insight-value">{tersediaRows.length} / 5</div>
                                <div className="dk-insight-label">Program Sudah Lapor</div>
                            </div>
                        </div>
                    </div>

                    {/* 5 KARTU PROGRAM */}
                    <div className="dk-program-grid">
                        {PROGRAM_ORDER.map((p) => {
                            const row = rows.find((r) => r.program === p);
                            if (!row) return null;
                            const pct = row.tersedia ? Number(row.pctCapaian) || 0 : null;
                            return (
                                <div className="dk-program-card" key={p}>
                                    <div className="dk-program-card-head">
                                        <div className="dk-program-icon" style={{ background: `${PROGRAM_COLOR[p]}18`, color: PROGRAM_COLOR[p] }}>
                                            <i className={`bi ${PROGRAM_ICON[p]}`}></i>
                                        </div>
                                        <span className="dk-program-name">{row.label}</span>
                                    </div>
                                    {row.tersedia ? (
                                        <>
                                            <div className={`dk-program-pct ${capaianClass(pct)}`}>{fmtPct(pct)}%</div>
                                            <div className="dk-program-bar-track">
                                                <div className={`dk-program-bar-fill ${capaianClass(pct)}`} style={{ width: `${Math.min(pct, 100)}%` }}></div>
                                            </div>
                                            <div className="dk-program-sub">
                                                {row.ada ?? "-"} Poktan · Capaian {row.capaian ?? "-"}
                                            </div>
                                        </>
                                    ) : (
                                        <div className="dk-program-empty">
                                            <i className="bi bi-inbox"></i> Belum ada data
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* RADAR CHART */}
                    <div className="dk-panel">
                        <div className="dk-panel-head">
                            <i className="bi bi-diagram-3-fill"></i>
                            <h3>Peta Kekuatan 5 Program</h3>
                        </div>
                        <div className="dk-chart-wrap">
                            <canvas ref={radarCanvasRef}></canvas>
                        </div>
                    </div>

                    {/* TREN HISTORIS */}
                    <div className="dk-panel">
                        <div className="dk-panel-head">
                            <i className="bi bi-graph-up"></i>
                            <h3>Tren {TREN_LIMIT} Bulan Terakhir</h3>
                        </div>
                        {trenLoading ? (
                            <div style={{ textAlign: "center", padding: 40, color: "#9090a8" }}>Memuat tren...</div>
                        ) : (
                            <div className="dk-chart-wrap">
                                <canvas ref={trenCanvasRef}></canvas>
                            </div>
                        )}
                    </div>
                </>
            )}

            {!error && !loading && rows.length === 0 && (
                <div className="dk-panel" style={{ textAlign: "center", padding: 50, color: "#9090a8" }}>
                    Pilih kecamatan & periode, lalu klik "Terapkan"
                </div>
            )}
        </>
    );
}

export default DetailKecamatanContent;
