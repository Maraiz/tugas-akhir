import { useState } from "react";
import { Link } from "react-router-dom";
import "../../styles/dataBkr.css";

const INITIAL_PERIODS = [
    {
        id: 1,
        periode: "Maret 2026",
        fileName: "Tabel4A.xlsx",
        tanggalUpload: "08 Jul 2026",
        jamUpload: "14:32 WIB",
        jumlahKecamatan: 25,
        rataCapaian: 91.2,
        diuploadOleh: "Admin Dinas",
    },
    {
        id: 2,
        periode: "Februari 2026",
        fileName: "Tabel4A.xlsx",
        tanggalUpload: "05 Jun 2026",
        jamUpload: "09:15 WIB",
        jumlahKecamatan: 25,
        rataCapaian: 88.7,
        diuploadOleh: "Admin Dinas",
    },
    {
        id: 3,
        periode: "Januari 2026",
        fileName: "Tabel4A.xlsx",
        tanggalUpload: "04 Mei 2026",
        jamUpload: "11:47 WIB",
        jumlahKecamatan: 24,
        rataCapaian: 76.4,
        diuploadOleh: "Admin Dinas",
    },
    {
        id: 4,
        periode: "Desember 2025",
        fileName: "Tabel4A.xlsx",
        tanggalUpload: "03 Jan 2026",
        jamUpload: "16:02 WIB",
        jumlahKecamatan: 25,
        rataCapaian: 58.9,
        diuploadOleh: "Admin Dinas",
    },
];

function initials(name) {
    if (!name) return "??";
    return name.split(" ").map((w) => w[0]).join("").substring(0, 2).toUpperCase();
}

function capaianClass(value) {
    if (value >= 85) return "high";
    if (value >= 60) return "mid";
    return "low";
}

function BkrTable() {
    const [periods, setPeriods] = useState(INITIAL_PERIODS);
    const [searchTerm, setSearchTerm] = useState("");
    const [yearFilter, setYearFilter] = useState("");

    // ===== Modal Hapus =====
    const [deleteTarget, setDeleteTarget] = useState(null); // objek periode yang mau dihapus

    // Daftar tahun unik buat dropdown filter, diambil otomatis dari data
    const yearOptions = [...new Set(periods.map((p) => p.periode.split(" ").pop()))].sort((a, b) => b - a);

    const filteredPeriods = periods.filter((p) => {
        const matchSearch = p.periode.toLowerCase().includes(searchTerm.toLowerCase());
        const matchYear = yearFilter ? p.periode.endsWith(yearFilter) : true;
        return matchSearch && matchYear;
    });

    const latestPeriod = periods[0]; // asumsi data sudah terurut terbaru dulu
    const avgCapaianAll = periods.length > 0
        ? (periods.reduce((sum, p) => sum + p.rataCapaian, 0) / periods.length).toFixed(1)
        : 0;

    function openDeleteModal(period) {
        setDeleteTarget(period);
    }

    function closeDeleteModal() {
        setDeleteTarget(null);
    }

    function confirmDelete() {
        setPeriods((prev) => prev.filter((p) => p.id !== deleteTarget.id));
        closeDeleteModal();
    }

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
                        <div className="summary-card-label">Rata-rata Capaian Terbaru</div>
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
                <Link to="/admin/monitoring/bkr/tambah" className="btn-add-data">
                    <span className="plus-icon">+</span>
                    Tambah Data BKR
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
                                <th>Rata-rata Capaian</th>
                                <th>Diupload Oleh</th>
                                <th className="col-actions">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredPeriods.length === 0 && (
                                <tr>
                                    <td colSpan="6">
                                        <div className="empty-state">
                                            <div className="es-icon">🗂️</div>
                                            <p>Belum ada data periode</p>
                                            <small>Coba ubah kata kunci pencarian atau filter tahun</small>
                                        </div>
                                    </td>
                                </tr>
                            )}

                            {filteredPeriods.map((p) => (
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
                                                    style={{ width: `${p.rataCapaian}%` }}
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
                                            <button className="btn-icon btn-view" title="Lihat">👁️</button>
                                            <button className="btn-icon btn-edit" title="Edit">✏️</button>
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
                            Seluruh data monitoring BKR untuk periode <b>{deleteTarget.periode}</b> ({deleteTarget.jumlahKecamatan} kecamatan)
                            akan dihapus permanen dan tidak dapat dikembalikan.
                        </p>
                        <div className="modal-actions">
                            <button className="btn-modal-cancel" onClick={closeDeleteModal}>Batal</button>
                            <button className="btn-modal-delete" onClick={confirmDelete}>Ya, Hapus</button>
                        </div>
                    </div>
                </div>
            )}

        </>
    );
}

export default BkrTable;
