import { useState, useEffect } from "react";
import api from "../../../services/api";
import "../../../styles/riwayatUpload.css";

// Cuma buat opsi dropdown filter & pewarnaan badge — data sebenarnya
// (termasuk programLabel) udah dikirim langsung dalam bentuk siap pakai
// dari GET /riwayat-upload
const PROGRAM_LABELS = {
    bkb: "BKB",
    bkr: "BKR",
    bkl: "BKL",
    pikr: "PIK-R",
    uppka: "UPPKA",
};

function initials(name) {
    if (!name) return "??";
    return name.split(" ").map((w) => w[0]).join("").substring(0, 2).toUpperCase();
}

const PAGE_SIZE = 10;

function RiwayatUploadTable() {
    const [entries, setEntries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [programFilter, setProgramFilter] = useState("");
    const [dateFilter, setDateFilter] = useState("semua");
    const [page, setPage] = useState(1);

    async function fetchAll() {
        setLoading(true);
        setLoadError("");

        try {
            const response = await api.get("/riwayat-upload");
            const combined = response.data.data;

            setEntries(combined);

            if (response.data.partial) {
                setLoadError("Sebagian data gagal dimuat. Beberapa program mungkin tidak tampil di daftar.");
            }
        } catch (error) {
            console.error(error);
            setLoadError(error.response?.data?.message || "Gagal memuat riwayat upload dari server.");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchAll();
    }, []);

    useEffect(() => {
        setPage(1);
    }, [searchTerm, programFilter, dateFilter]);

    const now = new Date();
    const filteredEntries = entries.filter((e) => {
        const matchSearch =
            e.fileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            e.diuploadOleh.toLowerCase().includes(searchTerm.toLowerCase());
        const matchProgram = programFilter ? e.program === programFilter : true;

        let matchDate = true;
        if (dateFilter !== "semua") {
            const days = dateFilter === "7hari" ? 7 : 30;
            const cutoff = new Date(now);
            cutoff.setDate(cutoff.getDate() - days);
            matchDate = new Date(e.createdAt) >= cutoff;
        }

        return matchSearch && matchProgram && matchDate;
    });

    const totalPages = Math.max(1, Math.ceil(filteredEntries.length / PAGE_SIZE));
    const pagedEntries = filteredEntries.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    const totalUnggahan = entries.length;
    const latestEntry = entries[0];
    const programCounts = entries.reduce((acc, e) => {
        acc[e.program] = (acc[e.program] || 0) + 1;
        return acc;
    }, {});
    const topProgramKey = Object.keys(programCounts).sort((a, b) => programCounts[b] - programCounts[a])[0];

    function formatTanggal(dateStr) {
        const d = new Date(dateStr);
        return {
            tanggal: d.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }),
            jam: d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) + " WIB",
        };
    }

    function downloadUrl(path) {
        if (!path) return null;
        const base = api.defaults.baseURL.replace(/\/$/, "");
        return `${base}/${path}`;
    }

    function exportCsv() {
        const header = ["Waktu", "Program", "Periode", "File", "Diupload Oleh"];
        const rows = filteredEntries.map((e) => {
            const { tanggal, jam } = formatTanggal(e.createdAt);
            return [`${tanggal} ${jam}`, e.programLabel || e.program, e.periode, e.fileName, e.diuploadOleh];
        });

        const csvContent = [header, ...rows]
            .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
            .join("\n");

        const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `riwayat-upload-${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    }

    return (
        <>
            <div className="info-banner">
                ℹ️ Halaman ini menampilkan gabungan riwayat unggahan yang <b>berhasil disimpan</b> dari seluruh program (BKB, BKR, BKL, PIK-R, UPPKA) secara kronologis.
            </div>

            {/* SUMMARY CARDS */}
            <div className="summary-row">
                <div className="summary-card">
                    <div className="summary-card-icon blue">📄</div>
                    <div>
                        <div className="summary-card-value">{totalUnggahan}</div>
                        <div className="summary-card-label">Total Unggahan</div>
                    </div>
                </div>
                <div className="summary-card">
                    <div className="summary-card-icon green">🏆</div>
                    <div>
                        <div className="summary-card-value">{topProgramKey ? PROGRAM_LABELS[topProgramKey] : "-"}</div>
                        <div className="summary-card-label">Program Terbanyak Data</div>
                    </div>
                </div>
                <div className="summary-card">
                    <div className="summary-card-icon orange">🕓</div>
                    <div>
                        <div className="summary-card-value">
                            {latestEntry ? formatTanggal(latestEntry.createdAt).tanggal : "-"}
                        </div>
                        <div className="summary-card-label">Unggahan Terakhir</div>
                    </div>
                </div>
            </div>

            {/* TOOLBAR */}
            <div className="content-toolbar">
                <div className="toolbar-left">
                    <div className="toolbar-search">
                        <span className="search-icon">🔍</span>
                        <input
                            type="text"
                            placeholder="Cari nama file / pengguna..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <select className="toolbar-select" value={programFilter} onChange={(e) => setProgramFilter(e.target.value)}>
                        <option value="">Semua Program</option>
                        {Object.entries(PROGRAM_LABELS).map(([key, label]) => (
                            <option key={key} value={key}>{label}</option>
                        ))}
                    </select>
                    <select className="toolbar-select" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}>
                        <option value="7hari">7 Hari Terakhir</option>
                        <option value="30hari">30 Hari Terakhir</option>
                        <option value="semua">Semua Waktu</option>
                    </select>
                </div>
                <button className="btn-export" onClick={exportCsv} disabled={filteredEntries.length === 0}>
                    ⬇ Ekspor CSV
                </button>
            </div>

            {/* TABLE */}
            <div className="table-card">
                <div className="table-wrapper">
                    <table>
                        <thead>
                            <tr>
                                <th>Waktu</th>
                                <th>Program</th>
                                <th>Periode Data</th>
                                <th>File</th>
                                <th>Diupload Oleh</th>
                                <th className="col-actions">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading && (
                                <tr>
                                    <td colSpan="6" style={{ textAlign: "center", padding: 24, color: "#9090a8" }}>
                                        Memuat riwayat upload...
                                    </td>
                                </tr>
                            )}

                            {!loading && loadError && (
                                <tr>
                                    <td colSpan="6" style={{ textAlign: "center", padding: 16, color: "#c62828" }}>
                                        ⚠ {loadError}
                                    </td>
                                </tr>
                            )}

                            {!loading && !loadError && filteredEntries.length === 0 && (
                                <tr>
                                    <td colSpan="6">
                                        <div className="empty-state">
                                            <div className="es-icon">🗂️</div>
                                            <p>Belum ada riwayat upload</p>
                                            <small>Coba ubah kata kunci pencarian atau filter</small>
                                        </div>
                                    </td>
                                </tr>
                            )}

                            {!loading && pagedEntries.map((e) => {
                                const { tanggal, jam } = formatTanggal(e.createdAt);
                                const url = downloadUrl(e.downloadPath);
                                return (
                                    <tr key={e.id}>
                                        <td className="waktu-cell">
                                            {tanggal}
                                            <span className="waktu-time">{jam}</span>
                                        </td>
                                        <td><span className={`badge-program ${e.program}`}>{e.programLabel}</span></td>
                                        <td>{e.periode}</td>
                                        <td>
                                            <div className="file-cell">
                                                <div className="file-icon">📊</div>
                                                <div>
                                                    <div className="file-name">{e.fileName}</div>
                                                    <div className="file-sub">{e.jumlahKecamatan} kecamatan</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="uploader-cell">
                                                <div className="uploader-avatar">{initials(e.diuploadOleh)}</div>
                                                {e.diuploadOleh}
                                            </div>
                                        </td>
                                        <td className="col-actions">
                                            {url ? (
                                                <a href={url} className="btn-icon" title="Unduh file arsip" target="_blank" rel="noopener noreferrer">⬇</a>
                                            ) : (
                                                <button className="btn-icon" disabled title="File tidak tersedia">⬇</button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                <div className="table-footer-info">
                    <span>Menampilkan {pagedEntries.length} dari {filteredEntries.length} unggahan</span>
                    <div className="pagination">
                        <button className="page-btn" disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>‹</button>
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                            <button
                                key={n}
                                className={`page-btn ${page === n ? "active" : ""}`}
                                onClick={() => setPage(n)}
                            >
                                {n}
                            </button>
                        ))}
                        <button className="page-btn" disabled={page === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>›</button>
                    </div>
                </div>
            </div>
        </>
    );
}

export default RiwayatUploadTable;
