import { useState, useRef } from "react";
import "../../styles/dataPengguna.css";

const KECAMATAN_LIST = [
    "Banyuwangi", "Giri", "Glagah", "Kalipuro", "Kabat", "Rogojampi", "Srono",
    "Genteng", "Muncar", "Songgon", "Sempu", "Gambiran", "Cluring", "Tegalsari",
    "Singojuruh", "Purwoharjo", "Bangorejo", "Siliragung", "Pesanggaran",
    "Tegaldlimo", "Wongsorejo", "Kalibaru", "Glenmore", "Licin",
];

const INITIAL_USERS = [
    { nip: "198501012010011001", nama: "Ahmad Fauzi", pass: "poktan123", kecamatan: "Banyuwangi" },
    { nip: "198702152011012002", nama: "Siti Nurhaliza", pass: "bwi@2025", kecamatan: "Rogojampi" },
    { nip: "199003102015011003", nama: "Budi Santoso", pass: "srono#456", kecamatan: "Srono" },
    { nip: "198911202012012004", nama: "Dewi Lestari", pass: "genteng789", kecamatan: "Genteng" },
    { nip: "199205052016011005", nama: "Rizky Ramadhan", pass: "muncar2024", kecamatan: "Muncar" },
    { nip: "198808082013012006", nama: "Nur Aisyah", pass: "kalipuro!1", kecamatan: "Kalipuro" },
    { nip: "199107172014011007", nama: "Eko Prasetyo", pass: "glagah_08", kecamatan: "Glagah" },
    { nip: "198606062011012008", nama: "Wulan Sari", pass: "sempu2023", kecamatan: "Sempu" },
];

function initials(name) {
    return name.split(" ").map((w) => w[0]).join("").substring(0, 2).toUpperCase();
}

function maskPass(pass) {
    return "•".repeat(Math.min(pass.length, 10));
}

/* Parser CSV sederhana, dukung tanda kutip dasar */
function parseCsvLine(line) {
    const result = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
            inQuotes = !inQuotes;
        } else if (ch === "," && !inQuotes) {
            result.push(cur.trim());
            cur = "";
        } else {
            cur += ch;
        }
    }
    result.push(cur.trim());
    return result;
}

function DataPengguna() {
    const [users, setUsers] = useState(INITIAL_USERS);
    const [searchTerm, setSearchTerm] = useState("");
    const [visiblePass, setVisiblePass] = useState({}); // { [nip]: true/false }

    // ===== Modal Tambah/Edit =====
    const [modalOpen, setModalOpen] = useState(false);
    const [editIndex, setEditIndex] = useState(null);
    const [form, setForm] = useState({ nip: "", nama: "", pass: "", kecamatan: "" });

    // ===== Modal Import CSV =====
    const [importModalOpen, setImportModalOpen] = useState(false);
    const [dragOver, setDragOver] = useState(false);
    const [csvFileName, setCsvFileName] = useState("");
    const [parsedRows, setParsedRows] = useState([]);
    const csvInputRef = useRef(null);

    // ===== Filter pencarian =====
    const filteredUsers = users.filter((u) => {
        const q = searchTerm.toLowerCase();
        return (
            u.nama.toLowerCase().includes(q) ||
            u.nip.includes(q) ||
            u.kecamatan.toLowerCase().includes(q)
        );
    });

    function togglePass(nip) {
        setVisiblePass((prev) => ({ ...prev, [nip]: !prev[nip] }));
    }

    // ===== Modal Tambah/Edit handlers =====
    function openAddModal() {
        setEditIndex(null);
        setForm({ nip: "", nama: "", pass: "", kecamatan: "" });
        setModalOpen(true);
    }

    function openEditModal(index) {
        setEditIndex(index);
        setForm({ ...users[index] });
        setModalOpen(true);
    }

    function closeModal() {
        setModalOpen(false);
    }

    function saveUser() {
        const { nip, nama, pass, kecamatan } = form;
        if (!nip || !nama || !pass || !kecamatan) {
            alert("Mohon lengkapi semua kolom.");
            return;
        }

        if (editIndex === null) {
            setUsers((prev) => [...prev, { nip, nama, pass, kecamatan }]);
        } else {
            setUsers((prev) => prev.map((u, i) => (i === editIndex ? { nip, nama, pass, kecamatan } : u)));
        }

        closeModal();
    }

    function deleteUser(index) {
        if (confirm(`Hapus pengguna "${users[index].nama}"?`)) {
            setUsers((prev) => prev.filter((_, i) => i !== index));
        }
    }

    // ===== Import CSV handlers =====
    function openImportModal() {
        setCsvFileName("");
        setParsedRows([]);
        setImportModalOpen(true);
    }

    function closeImportModal() {
        setImportModalOpen(false);
    }

    function downloadTemplate() {
        const header = "nip,nama,kata_sandi,kecamatan\n";
        const sample = "198501012010011001,Contoh Nama,contohsandi123,Banyuwangi\n";
        const blob = new Blob([header + sample], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "template_data_pengguna.csv";
        a.click();
        URL.revokeObjectURL(url);
    }

    function handleCsvFile(file) {
        if (!file) return;
        if (!file.name.toLowerCase().endsWith(".csv")) {
            alert("Mohon unggah file dengan format .csv");
            return;
        }

        setCsvFileName(file.name);

        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target.result;
            const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
            if (lines.length < 2) {
                alert("File CSV kosong atau tidak memiliki data.");
                return;
            }

            const header = parseCsvLine(lines[0]).map((h) => h.toLowerCase());
            const idxNip = header.indexOf("nip");
            const idxNama = header.indexOf("nama");
            const idxPass = header.indexOf("kata_sandi") !== -1 ? header.indexOf("kata_sandi") : header.indexOf("password");
            const idxKec = header.indexOf("kecamatan");

            if (idxNip === -1 || idxNama === -1 || idxPass === -1 || idxKec === -1) {
                alert("Header CSV harus memuat kolom: nip, nama, kata_sandi, kecamatan");
                return;
            }

            const rows = [];
            for (let i = 1; i < lines.length; i++) {
                const cols = parseCsvLine(lines[i]);
                const row = {
                    nip: (cols[idxNip] || "").trim(),
                    nama: (cols[idxNama] || "").trim(),
                    pass: (cols[idxPass] || "").trim(),
                    kecamatan: (cols[idxKec] || "").trim(),
                };

                let error = "";
                if (!row.nip || !row.nama || !row.pass || !row.kecamatan) {
                    error = "Data tidak lengkap";
                } else if (!/^\d+$/.test(row.nip)) {
                    error = "NIP harus angka";
                } else if (!KECAMATAN_LIST.some((k) => k.toLowerCase() === row.kecamatan.toLowerCase())) {
                    error = "Kecamatan tidak dikenali";
                } else if (users.some((u) => u.nip === row.nip) || rows.some((r) => r.nip === row.nip)) {
                    error = "NIP duplikat";
                }

                rows.push({ ...row, error });
            }

            setParsedRows(rows);
        };
        reader.readAsText(file);
    }

    function confirmImport() {
        const validRows = parsedRows.filter((r) => !r.error);
        if (validRows.length === 0) return;

        setUsers((prev) => [
            ...prev,
            ...validRows.map((r) => ({ nip: r.nip, nama: r.nama, pass: r.pass, kecamatan: r.kecamatan })),
        ]);

        closeImportModal();
        alert(`${validRows.length} pengguna berhasil diimport.`);
    }

    const validCount = parsedRows.filter((r) => !r.error).length;
    const errorCount = parsedRows.length - validCount;

    return (
        <>

            <div className="content-toolbar">
                <div className="toolbar-search">
                    <span className="search-icon">🔍</span>
                    <input
                        type="text"
                        placeholder="Cari nama, NIP, atau kecamatan..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="toolbar-actions">
                    <button className="btn-import-csv" onClick={openImportModal}>
                        📥 Import CSV
                    </button>
                    <button className="btn-add-user" onClick={openAddModal}>
                        <span className="plus-icon">+</span>
                        Add User
                    </button>
                </div>
            </div>

            <div className="table-card">
                <div className="table-wrapper">
                    <table>
                        <thead>
                            <tr>
                                <th>NIP</th>
                                <th>Nama</th>
                                <th>Kata Sandi</th>
                                <th>Kecamatan</th>
                                <th className="col-actions">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsers.map((u) => {
                                const realIndex = users.indexOf(u);
                                const isVisible = !!visiblePass[u.nip];
                                return (
                                    <tr key={u.nip}>
                                        <td className="cell-nip">{u.nip}</td>
                                        <td>
                                            <div className="user-cell">
                                                <div className="user-avatar">{initials(u.nama)}</div>
                                                <div>
                                                    <div className="user-name">{u.nama}</div>
                                                    <div className="user-nip-sub">Petugas</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="password-cell">
                                                <span>{isVisible ? u.pass : maskPass(u.pass)}</span>
                                                <button className="toggle-pass" onClick={() => togglePass(u.nip)}>
                                                    {isVisible ? "🙈" : "👁"}
                                                </button>
                                            </div>
                                        </td>
                                        <td><span className="badge-kecamatan">{u.kecamatan}</span></td>
                                        <td className="col-actions">
                                            <div className="action-buttons">
                                                <button className="btn-icon btn-edit" title="Edit" onClick={() => openEditModal(realIndex)}>✏️</button>
                                                <button className="btn-icon btn-delete" title="Hapus" onClick={() => deleteUser(realIndex)}>🗑️</button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                <div className="table-footer-info">
                    <span>Menampilkan {filteredUsers.length} dari {users.length} pengguna</span>
                    <div className="pagination">
                        <button className="page-btn">‹</button>
                        <button className="page-btn active">1</button>
                        <button className="page-btn">›</button>
                    </div>
                </div>
            </div>

            {/* ===== MODAL Tambah/Edit User ===== */}
            {modalOpen && (
                <div className="modal-overlay open" onClick={(e) => e.target === e.currentTarget && closeModal()}>
                    <div className="modal-box">
                        <div className="modal-header">
                            <h3>{editIndex === null ? "Tambah Pengguna" : "Edit Pengguna"}</h3>
                            <button className="modal-close" onClick={closeModal}>✕</button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label>NIP</label>
                                <input
                                    type="text"
                                    placeholder="Masukkan NIP"
                                    value={form.nip}
                                    onChange={(e) => setForm({ ...form, nip: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label>Nama</label>
                                <input
                                    type="text"
                                    placeholder="Masukkan nama lengkap"
                                    value={form.nama}
                                    onChange={(e) => setForm({ ...form, nama: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label>Kata Sandi</label>
                                <input
                                    type="password"
                                    placeholder="Masukkan kata sandi"
                                    value={form.pass}
                                    onChange={(e) => setForm({ ...form, pass: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label>Kecamatan</label>
                                <select
                                    value={form.kecamatan}
                                    onChange={(e) => setForm({ ...form, kecamatan: e.target.value })}
                                >
                                    <option value="">Pilih kecamatan</option>
                                    {KECAMATAN_LIST.map((k) => (
                                        <option key={k} value={k}>{k}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-cancel" onClick={closeModal}>Batal</button>
                            <button className="btn-save" onClick={saveUser}>Simpan</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ===== MODAL Import CSV ===== */}
            {importModalOpen && (
                <div className="modal-overlay open" onClick={(e) => e.target === e.currentTarget && closeImportModal()}>
                    <div className="modal-box modal-wide">
                        <div className="modal-header">
                            <h3>Import Data Pengguna (CSV)</h3>
                            <button className="modal-close" onClick={closeImportModal}>✕</button>
                        </div>
                        <div className="modal-body">
                            <div
                                className={`import-dropzone ${dragOver ? "drag-over" : ""}`}
                                onClick={() => csvInputRef.current?.click()}
                                onDragEnter={(e) => { e.preventDefault(); setDragOver(true); }}
                                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                                onDragLeave={(e) => { e.preventDefault(); setDragOver(false); }}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    setDragOver(false);
                                    const file = e.dataTransfer.files[0];
                                    if (file) handleCsvFile(file);
                                }}
                            >
                                <div className="dz-icon">📄</div>
                                <p>Klik atau seret file CSV ke sini</p>
                                <small>Format kolom: nip, nama, kata_sandi, kecamatan</small>
                            </div>
                            <input
                                type="file"
                                ref={csvInputRef}
                                accept=".csv"
                                style={{ display: "none" }}
                                onChange={(e) => handleCsvFile(e.target.files[0])}
                            />

                            <a className="import-template-link" onClick={downloadTemplate}>⬇ Unduh template CSV</a>

                            {csvFileName && (
                                <div className="import-file-name">
                                    <span>📄 {csvFileName}</span>
                                    <button onClick={() => { setCsvFileName(""); setParsedRows([]); }} title="Hapus file">✕</button>
                                </div>
                            )}

                            {parsedRows.length > 0 && (
                                <>
                                    <div className="import-preview-wrap">
                                        <table>
                                            <thead>
                                                <tr>
                                                    <th>NIP</th>
                                                    <th>Nama</th>
                                                    <th>Kata Sandi</th>
                                                    <th>Kecamatan</th>
                                                    <th>Status</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {parsedRows.map((r, i) => (
                                                    <tr key={i} className={r.error ? "row-error" : ""}>
                                                        <td>{r.nip || "-"}</td>
                                                        <td>{r.nama || "-"}</td>
                                                        <td>{r.pass ? "•".repeat(Math.min(r.pass.length, 8)) : "-"}</td>
                                                        <td>{r.kecamatan || "-"}</td>
                                                        <td>{r.error ? `⚠ ${r.error}` : "✓ Valid"}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    <div className="import-status-bar">
                                        <span className="status-ok">✓ {validCount} data valid</span>
                                        {errorCount > 0 && (
                                            <span className="status-err">⚠ {errorCount} data bermasalah (akan dilewati)</span>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button className="btn-cancel" onClick={closeImportModal}>Batal</button>
                            <button className="btn-save" disabled={validCount === 0} onClick={confirmImport}>
                                Import Data
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </>
    );
}

export default DataPengguna;
