import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import api from "../../../services/api";
import "../../../styles/dataBkb.css";

function initials(name) {
    if (!name) return "??";
    return name.split(" ").map((w) => w[0]).join("").substring(0, 2).toUpperCase();
}

function capaianClass(value) {
    if (value >= 85) return "high";
    if (value >= 60) return "mid";
    return "low";
}

// Ubah 1 baris data dari backend jadi bentuk yang gampang ditampilkan
function mapPeriodeFromApi(p) {
    const created = new Date(p.createdAt);
    return {
        id: p.id,
        periode: p.periode, // sudah diformat backend, mis. "Desember 2025"
        tahun: p.tahun,
        fileName: `${p.namaFile1} + ${p.namaFile2}`,
        tanggalUpload: created.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }),
        jamUpload: created.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) + " WIB",
        jumlahKecamatan: p.jumlahKecamatan,
        rataCapaian: p.rataCapaian,
        diuploadOleh: p.diuploadOlehNama || "-",
    };
}

function BkbTable() {
    const [periods, setPeriods] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [yearFilter, setYearFilter] = useState("");

    // ===== Modal Hapus =====
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleting, setDeleting] = useState(false);

    // ===== Modal Lihat =====
    const [viewTarget, setViewTarget] = useState(null); // periode yang lagi dilihat
    const [viewDetails, setViewDetails] = useState([]);
    const [viewLoading, setViewLoading] = useState(false);
    const [viewError, setViewError] = useState("");

    // ===== Modal Edit =====
    const [editTarget, setEditTarget] = useState(null);
    const [editRows, setEditRows] = useState([]);
    const [editLoading, setEditLoading] = useState(false);
    const [editError, setEditError] = useState("");
    const [saving, setSaving] = useState(false);

    async function fetchPeriods() {
        setLoading(true);
        setLoadError("");
        try {
            const response = await api.get("/bkb");
            setPeriods(response.data.data.map(mapPeriodeFromApi));
        } catch (error) {
            console.error(error);
            setLoadError(error.response?.data?.message || "Gagal memuat data BKB dari server.");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchPeriods();
    }, []);

    // Daftar tahun unik buat dropdown filter, diambil dari field tahun asli (bukan parsing string)
    const yearOptions = [...new Set(periods.map((p) => String(p.tahun)))].sort((a, b) => b - a);

    const filteredPeriods = periods.filter((p) => {
        const matchSearch = p.periode.toLowerCase().includes(searchTerm.toLowerCase());
        const matchYear = yearFilter ? String(p.tahun) === yearFilter : true;
        return matchSearch && matchYear;
    });

    const latestPeriod = periods[0]; // backend sudah urutkan dari terbaru
    const avgCapaianAll = periods.length > 0
        ? (periods.reduce((sum, p) => sum + p.rataCapaian, 0) / periods.length).toFixed(1)
        : 0;

    // Total baris "Jumlah Total" di modal Lihat, dihitung dari seluruh kecamatan periode yang lagi dibuka
    const viewTotals = viewDetails.length > 0 ? {
        totalAda: viewDetails.reduce((s, d) => s + (Number(d.ada) || 0), 0),
        totalLapor: viewDetails.reduce((s, d) => s + (Number(d.lapor) || 0), 0),
        totalTarget: viewDetails.reduce((s, d) => s + (Number(d.target) || 0), 0),
        totalAnggota: viewDetails.reduce((s, d) => s + (Number(d.jumlahAnggota) || 0), 0),
        totalSelisih: viewDetails.reduce((s, d) => s + (Number(d.selisih) || 0), 0),
        totalHadir: viewDetails.reduce((s, d) => s + (Number(d.jumlahHadir) || 0), 0),
    } : null;

    if (viewTotals) {
        viewTotals.totalPctLapor = viewTotals.totalAda > 0 ? (viewTotals.totalLapor / viewTotals.totalAda) * 100 : 0;
        viewTotals.totalPctThdTarget = viewTotals.totalTarget > 0 ? (viewTotals.totalHadir / viewTotals.totalTarget) * 100 : 0;
        viewTotals.totalPctThdAnggota = viewTotals.totalAnggota > 0 ? (viewTotals.totalHadir / viewTotals.totalAnggota) * 100 : 0;
    }

    // ===== Hapus =====
    function openDeleteModal(period) {
        setDeleteTarget(period);
    }

    function closeDeleteModal() {
        if (deleting) return;
        setDeleteTarget(null);
    }

    async function confirmDelete() {
        setDeleting(true);
        try {
            await api.delete(`/bkb/${deleteTarget.id}`);
            setPeriods((prev) => prev.filter((p) => p.id !== deleteTarget.id));
            setDeleteTarget(null);
        } catch (error) {
            console.error(error);
            alert(error.response?.data?.message || "Gagal menghapus data periode.");
        } finally {
            setDeleting(false);
        }
    }

    // ===== Lihat =====
    async function openViewModal(period) {
        setViewTarget(period);
        setViewDetails([]);
        setViewError("");
        setViewLoading(true);
        try {
            const response = await api.get(`/bkb/${period.id}`);
            setViewDetails(response.data.data.details || []);
        } catch (error) {
            console.error(error);
            setViewError(error.response?.data?.message || "Gagal memuat detail periode.");
        } finally {
            setViewLoading(false);
        }
    }

    function closeViewModal() {
        setViewTarget(null);
        setViewDetails([]);
        setViewError("");
    }

    // ===== Edit =====
    async function openEditModal(period) {
        setEditTarget(period);
        setEditRows([]);
        setEditError("");
        setEditLoading(true);
        try {
            const response = await api.get(`/bkb/${period.id}`);
            setEditRows(response.data.data.details || []);
        } catch (error) {
            console.error(error);
            setEditError(error.response?.data?.message || "Gagal memuat detail periode.");
        } finally {
            setEditLoading(false);
        }
    }

    function closeEditModal() {
        if (saving) return;
        setEditTarget(null);
        setEditRows([]);
        setEditError("");
    }

    function updateEditField(rowId, field, value) {
        setEditRows((prev) => prev.map((r) => (r.id === rowId ? { ...r, [field]: value } : r)));
    }

    async function saveEdit() {
        setSaving(true);
        setEditError("");
        try {
            const rowsPayload = editRows.map((r) => ({
                id: r.id,
                ada: r.ada,
                lapor: r.lapor,
                target: r.target,
                jumlahAnggota: r.jumlahAnggota,
                jumlahHadir: r.jumlahHadir,
            }));

            await api.put(`/bkb/${editTarget.id}`, { rows: rowsPayload });

            closeEditModal();
            fetchPeriods();
        } catch (error) {
            console.error(error);
            setEditError(error.response?.data?.message || "Gagal menyimpan perubahan.");
        } finally {
            setSaving(false);
        }
    }

    const editTotals = editRows.length > 0 ? (() => {
        const totalAda = editRows.reduce((s, d) => s + (Number(d.ada) || 0), 0);
        const totalLapor = editRows.reduce((s, d) => s + (Number(d.lapor) || 0), 0);
        const totalTarget = editRows.reduce((s, d) => s + (Number(d.target) || 0), 0);
        const totalAnggota = editRows.reduce((s, d) => s + (Number(d.jumlahAnggota) || 0), 0);
        const totalHadir = editRows.reduce((s, d) => s + (Number(d.jumlahHadir) || 0), 0);
        const totalSelisih = totalAnggota - totalTarget;
        return {
            totalAda, totalLapor, totalTarget, totalAnggota, totalHadir, totalSelisih,
            totalPctLapor: totalAda > 0 ? (totalLapor / totalAda) * 100 : 0,
            totalPctThdTarget: totalTarget > 0 ? (totalHadir / totalTarget) * 100 : 0,
            totalPctThdAnggota: totalAnggota > 0 ? (totalHadir / totalAnggota) * 100 : 0,
        };
    })() : null;

    return (
        <>

            {/* SUMMARY CARDS */}
            <div className="summary-row">
                <div className="summary-card">
                    <div className="summary-card-icon blue">🗂️</div>
                    <div>
                        <div className="summary-card-value">{periods.length}</div>
                        <div className="summary-card-label">Total Periode Terekam</div>
                    </div>
                </div>
                <div className="summary-card">
                    <div className="summary-card-icon green">📈</div>
                    <div>
                        <div className="summary-card-value">{avgCapaianAll}%</div>
                        <div className="summary-card-label">Rata-rata % Terhadap Target Terbaru</div>
                    </div>
                </div>
                <div className="summary-card">
                    <div className="summary-card-icon orange">🕓</div>
                    <div>
                        <div className="summary-card-value">{latestPeriod?.periode || "-"}</div>
                        <div className="summary-card-label">Periode Terakhir Diupdate</div>
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
                            placeholder="Cari periode..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <select
                        className="toolbar-select"
                        value={yearFilter}
                        onChange={(e) => setYearFilter(e.target.value)}
                    >
                        <option value="">Semua Tahun</option>
                        {yearOptions.map((y) => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>
                </div>
                <Link to="/admin/monitoring/bkb/tambah" className="btn-add-data">
                    <span className="plus-icon">+</span>
                    Tambah Data BKB
                </Link>
            </div>

            {/* TABLE */}
            <div className="table-card">
                <div className="table-wrapper">
                    <table>
                        <thead>
                            <tr>
                                <th>Periode</th>
                                <th>Tanggal Upload</th>
                                <th>Jumlah Kecamatan</th>
                                <th>Rata-rata % Thd Target</th>
                                <th>Diupload Oleh</th>
                                <th className="col-actions">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading && (
                                <tr>
                                    <td colSpan="6" style={{ textAlign: "center", padding: 24, color: "#9090a8" }}>
                                        Memuat data BKB...
                                    </td>
                                </tr>
                            )}

                            {!loading && loadError && (
                                <tr>
                                    <td colSpan="6" style={{ textAlign: "center", padding: 24, color: "#e53935" }}>
                                        {loadError}
                                        <div>
                                            <button className="btn-modal-cancel" style={{ marginTop: 10, width: "auto", padding: "8px 16px" }} onClick={fetchPeriods}>
                                                Coba lagi
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )}

                            {!loading && !loadError && filteredPeriods.length === 0 && (
                                <tr>
                                    <td colSpan="6">
                                        <div className="empty-state">
                                            <div className="es-icon">🗂️</div>
                                            <p>Belum ada data periode</p>
                                            <small>Coba ubah kata kunci pencarian atau filter tahun, atau tambah data baru</small>
                                        </div>
                                    </td>
                                </tr>
                            )}

                            {!loading && !loadError && filteredPeriods.map((p) => (
                                <tr key={p.id}>
                                    <td>
                                        <div className="periode-cell">
                                            <div className="periode-icon">📅</div>
                                            <div>
                                                <div className="periode-name">{p.periode}</div>
                                                <div className="periode-sub">{p.fileName}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="cell-upload-date">
                                        {p.tanggalUpload}
                                        <span className="upload-time">{p.jamUpload}</span>
                                    </td>
                                    <td><span className="badge-kecamatan-count">{p.jumlahKecamatan} Kecamatan</span></td>
                                    <td>
                                        <div className="capaian-cell">
                                            <div className="capaian-bar-track">
                                                <div
                                                    className={`capaian-bar-fill ${capaianClass(p.rataCapaian)}`}
                                                    style={{ width: `${Math.min(p.rataCapaian, 100)}%` }}
                                                ></div>
                                            </div>
                                            <span className={`capaian-value ${capaianClass(p.rataCapaian)}`}>{p.rataCapaian}%</span>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="uploader-cell">
                                            <div className="uploader-avatar">{initials(p.diuploadOleh)}</div>
                                            {p.diuploadOleh}
                                        </div>
                                    </td>
                                    <td className="col-actions">
                                        <div className="action-buttons">
                                            <button className="btn-icon btn-view" title="Lihat" onClick={() => openViewModal(p)}>👁️</button>
                                            <button className="btn-icon btn-edit" title="Edit" onClick={() => openEditModal(p)}>✏️</button>
                                            <button className="btn-icon btn-delete" title="Hapus" onClick={() => openDeleteModal(p)}>🗑️</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="table-footer-info">
                    <span>Menampilkan {filteredPeriods.length} dari {periods.length} periode</span>
                    <div className="pagination">
                        <button className="page-btn">‹</button>
                        <button className="page-btn active">1</button>
                        <button className="page-btn">›</button>
                    </div>
                </div>
            </div>

            {/* MODAL KONFIRMASI HAPUS */}
            {deleteTarget && (
                <div className="modal-overlay open" onClick={(e) => e.target === e.currentTarget && closeDeleteModal()}>
                    <div className="modal-box">
                        <div className="modal-warn-icon">⚠️</div>
                        <h3>Hapus Data Periode Ini?</h3>
                        <p>
                            Seluruh data monitoring BKB untuk periode <b>{deleteTarget.periode}</b> ({deleteTarget.jumlahKecamatan} kecamatan)
                            akan dihapus permanen dan tidak dapat dikembalikan.
                        </p>
                        <div className="modal-actions">
                            <button className="btn-modal-cancel" onClick={closeDeleteModal} disabled={deleting}>Batal</button>
                            <button className="btn-modal-delete" onClick={confirmDelete} disabled={deleting}>
                                {deleting ? "Menghapus..." : "Ya, Hapus"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL LIHAT DETAIL */}
            {viewTarget && (
                <div className="modal-overlay open" onClick={(e) => e.target === e.currentTarget && closeViewModal()}>
                    <div className="modal-box modal-wide">
                        <div className="modal-header">
                            <h3>Detail Periode — {viewTarget.periode}</h3>
                            <button className="modal-close" onClick={closeViewModal}>✕</button>
                        </div>
                        <div className="modal-body">
                            {viewLoading && (
                                <div style={{ textAlign: "center", padding: 24, color: "#9090a8" }}>Memuat detail...</div>
                            )}

                            {!viewLoading && viewError && (
                                <div style={{ textAlign: "center", padding: 24, color: "#e53935" }}>{viewError}</div>
                            )}

                            {!viewLoading && !viewError && (
                                <div className="calc-table-wrap" style={{ maxHeight: 420 }}>
                                    <table className="calc-table">
                                        <thead>
                                            <tr>
                                                <th rowSpan="2">Kode</th>
                                                <th rowSpan="2" style={{ textAlign: "left" }}>Kecamatan</th>
                                                <th colSpan="3">Jumlah Poktan</th>
                                                <th colSpan="3">Keanggotaan</th>
                                                <th colSpan="3">Kehadiran</th>
                                                <th rowSpan="2">% Thd<br />Target</th>
                                                <th rowSpan="2">% Thd<br />Anggota</th>
                                            </tr>
                                            <tr>
                                                <th>Ada</th>
                                                <th>Lapor</th>
                                                <th>%</th>
                                                <th>Target</th>
                                                <th>Anggota</th>
                                                <th>Selisih</th>
                                                <th>Target</th>
                                                <th>Anggota</th>
                                                <th>Capaian</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {viewDetails.map((d) => (
                                                <tr key={d.id}>
                                                    <td>{d.kode ?? "-"}</td>
                                                    <td className="text-left"><b>{d.kecamatan}</b></td>
                                                    <td>{d.ada}</td>
                                                    <td>{d.lapor}</td>
                                                    <td>{Number(d.pctLapor).toFixed(2)}</td>
                                                    <td>{d.target}</td>
                                                    <td>{d.jumlahAnggota}</td>
                                                    <td className={Number(d.selisih) >= 0 ? "selisih-pos" : "selisih-neg"}>
                                                        {Number(d.selisih) >= 0 ? `+${d.selisih}` : d.selisih}
                                                    </td>
                                                    <td>{d.target}</td>
                                                    <td>{d.jumlahAnggota}</td>
                                                    <td>{d.jumlahHadir}</td>
                                                    <td>{Number(d.pctThdTarget).toFixed(0)}</td>
                                                    <td>{Number(d.pctThdAnggota).toFixed(0)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        {viewTotals && (
                                            <tfoot>
                                                <tr>
                                                    <td colSpan="2" className="text-left">Jumlah Total</td>
                                                    <td>{viewTotals.totalAda}</td>
                                                    <td>{viewTotals.totalLapor}</td>
                                                    <td>{viewTotals.totalPctLapor.toFixed(2)}</td>
                                                    <td>{viewTotals.totalTarget}</td>
                                                    <td>{viewTotals.totalAnggota}</td>
                                                    <td className={viewTotals.totalSelisih >= 0 ? "selisih-pos" : "selisih-neg"}>
                                                        {viewTotals.totalSelisih >= 0 ? `+${viewTotals.totalSelisih}` : viewTotals.totalSelisih}
                                                    </td>
                                                    <td>{viewTotals.totalTarget}</td>
                                                    <td>{viewTotals.totalAnggota}</td>
                                                    <td>{viewTotals.totalHadir}</td>
                                                    <td>{viewTotals.totalPctThdTarget.toFixed(0)}</td>
                                                    <td>{viewTotals.totalPctThdAnggota.toFixed(0)}</td>
                                                </tr>
                                            </tfoot>
                                        )}
                                    </table>
                                </div>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button className="btn-cancel" onClick={closeViewModal}>Tutup</button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL EDIT */}
            {editTarget && (
                <div className="modal-overlay open" onClick={(e) => e.target === e.currentTarget && closeEditModal()}>
                    <div className="modal-box modal-wide">
                        <div className="modal-header">
                            <h3>Edit Data — {editTarget.periode}</h3>
                            <button className="modal-close" onClick={closeEditModal}>✕</button>
                        </div>
                        <div className="modal-body">
                            {editLoading && (
                                <div style={{ textAlign: "center", padding: 24, color: "#9090a8" }}>Memuat detail...</div>
                            )}

                            {!editLoading && editError && (
                                <div style={{ textAlign: "center", padding: 12, color: "#e53935", marginBottom: 12 }}>⚠ {editError}</div>
                            )}

                            {!editLoading && editRows.length > 0 && (
                                <div className="calc-table-wrap" style={{ maxHeight: 420 }}>
                                    <table className="calc-table">
                                        <thead>
                                            <tr>
                                                <th rowSpan="2">Kode</th>
                                                <th rowSpan="2" style={{ textAlign: "left" }}>Kecamatan</th>
                                                <th colSpan="3">Jumlah Poktan</th>
                                                <th colSpan="3">Keanggotaan</th>
                                                <th colSpan="3">Kehadiran</th>
                                                <th rowSpan="2">% Thd<br />Target</th>
                                                <th rowSpan="2">% Thd<br />Anggota</th>
                                            </tr>
                                            <tr>
                                                <th>Ada</th>
                                                <th>Lapor</th>
                                                <th>%</th>
                                                <th>Target</th>
                                                <th>Anggota</th>
                                                <th>Selisih</th>
                                                <th>Target</th>
                                                <th>Anggota</th>
                                                <th>Capaian</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {editRows.map((d) => {
                                                const ada = Number(d.ada) || 0;
                                                const lapor = Number(d.lapor) || 0;
                                                const target = Number(d.target) || 0;
                                                const anggota = Number(d.jumlahAnggota) || 0;
                                                const hadir = Number(d.jumlahHadir) || 0;
                                                const pctLapor = ada > 0 ? (lapor / ada) * 100 : 0;
                                                const selisih = anggota - target;
                                                const pctThdTarget = target > 0 ? (hadir / target) * 100 : 0;
                                                const pctThdAnggota = anggota > 0 ? (hadir / anggota) * 100 : 0;
                                                return (
                                                    <tr key={d.id}>
                                                        <td>{d.kode ?? "-"}</td>
                                                        <td className="text-left"><b>{d.kecamatan}</b></td>
                                                        <td>
                                                            <input type="number" min="0" value={d.ada}
                                                                onChange={(e) => updateEditField(d.id, "ada", e.target.value)}
                                                                style={{ width: 50, padding: "5px 6px", border: "1px solid #e0e4ee", borderRadius: 6, fontSize: 12 }} />
                                                        </td>
                                                        <td>
                                                            <input type="number" min="0" value={d.lapor}
                                                                onChange={(e) => updateEditField(d.id, "lapor", e.target.value)}
                                                                style={{ width: 50, padding: "5px 6px", border: "1px solid #e0e4ee", borderRadius: 6, fontSize: 12 }} />
                                                        </td>
                                                        <td>{pctLapor.toFixed(2)}</td>
                                                        <td>
                                                            <input type="number" min="0" value={d.target}
                                                                onChange={(e) => updateEditField(d.id, "target", e.target.value)}
                                                                style={{ width: 60, padding: "5px 6px", border: "1px solid #e0e4ee", borderRadius: 6, fontSize: 12 }} />
                                                        </td>
                                                        <td>
                                                            <input type="number" min="0" value={d.jumlahAnggota}
                                                                onChange={(e) => updateEditField(d.id, "jumlahAnggota", e.target.value)}
                                                                style={{ width: 60, padding: "5px 6px", border: "1px solid #e0e4ee", borderRadius: 6, fontSize: 12 }} />
                                                        </td>
                                                        <td className={selisih >= 0 ? "selisih-pos" : "selisih-neg"}>{selisih >= 0 ? `+${selisih}` : selisih}</td>
                                                        <td>{target || "-"}</td>
                                                        <td>{anggota}</td>
                                                        <td>
                                                            <input type="number" min="0" value={d.jumlahHadir}
                                                                onChange={(e) => updateEditField(d.id, "jumlahHadir", e.target.value)}
                                                                style={{ width: 60, padding: "5px 6px", border: "1px solid #e0e4ee", borderRadius: 6, fontSize: 12 }} />
                                                        </td>
                                                        <td>{pctThdTarget.toFixed(0)}</td>
                                                        <td>{pctThdAnggota.toFixed(0)}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                        {editTotals && (
                                            <tfoot>
                                                <tr>
                                                    <td colSpan="2" className="text-left">Jumlah Total</td>
                                                    <td>{editTotals.totalAda}</td>
                                                    <td>{editTotals.totalLapor}</td>
                                                    <td>{editTotals.totalPctLapor.toFixed(2)}</td>
                                                    <td>{editTotals.totalTarget}</td>
                                                    <td>{editTotals.totalAnggota}</td>
                                                    <td className={editTotals.totalSelisih >= 0 ? "selisih-pos" : "selisih-neg"}>
                                                        {editTotals.totalSelisih >= 0 ? `+${editTotals.totalSelisih}` : editTotals.totalSelisih}
                                                    </td>
                                                    <td>{editTotals.totalTarget}</td>
                                                    <td>{editTotals.totalAnggota}</td>
                                                    <td>{editTotals.totalHadir}</td>
                                                    <td>{editTotals.totalPctThdTarget.toFixed(0)}</td>
                                                    <td>{editTotals.totalPctThdAnggota.toFixed(0)}</td>
                                                </tr>
                                            </tfoot>
                                        )}
                                    </table>
                                </div>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button className="btn-cancel" onClick={closeEditModal} disabled={saving}>Batal</button>
                            <button
                                className="btn-modal-delete"
                                style={{ background: "linear-gradient(135deg, #2e7d32, #43a047)" }}
                                onClick={saveEdit}
                                disabled={saving || editLoading}
                            >
                                {saving ? "Menyimpan..." : "💾 Simpan Perubahan"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </>
    );
}

export default BkbTable;
