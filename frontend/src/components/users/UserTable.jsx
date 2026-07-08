import { useState, useRef, useEffect } from "react";
import api from "../../services/api";
import "../../styles/dataPengguna.css";

const KECAMATAN_LIST = [
    "Banyuwangi", "Giri", "Glagah", "Kalipuro", "Kabat", "Rogojampi", "Srono",
    "Genteng", "Muncar", "Songgon", "Sempu", "Gambiran", "Cluring", "Tegalsari",
    "Singojuruh", "Purwoharjo", "Bangorejo", "Siliragung", "Pesanggaran",
    "Tegaldlimo", "Wongsorejo", "Kalibaru", "Glenmore", "Licin",
];

const ROLE_OPTIONS = [
    { value: "admin", label: "Admin" },
    { value: "petugas", label: "Petugas" },
    { value: "user", label: "User" },
];

const ROLE_LABEL = {
    admin: "Admin",
    petugas: "Petugas",
    user: "User",
};

function initials(name) {
    if (!name) return "??";
    return name.split(" ").map((w) => w[0]).join("").substring(0, 2).toUpperCase();
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

const EMPTY_FORM = { nama: "", username: "", nip: "", password: "", role: "petugas", kecamatan: "" };

function UserTable() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [roleFilter, setRoleFilter] = useState(""); // "" = semua role

    // ===== Modal Tambah/Edit =====
    const [modalOpen, setModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null); // null = mode tambah, object = mode edit
    const [form, setForm] = useState(EMPTY_FORM);
    const [formError, setFormError] = useState("");
    const [saving, setSaving] = useState(false);

    // ===== Modal Import CSV (khusus role petugas) =====
    const [importModalOpen, setImportModalOpen] = useState(false);
    const [dragOver, setDragOver] = useState(false);
    const [csvFileName, setCsvFileName] = useState("");
    const [parsedRows, setParsedRows] = useState([]);
    const [importing, setImporting] = useState(false);
    const csvInputRef = useRef(null);

    // ===== Ambil data dari backend =====
    async function fetchUsers() {
        setLoading(true);
        setLoadError("");
        try {
            const params = roleFilter ? { role: roleFilter } : {};
            const response = await api.get("/users", { params });
            setUsers(response.data.data);
        } catch (error) {
            console.error(error);
            setLoadError(
                error.response?.data?.message || "Gagal memuat data pengguna dari server."
            );
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchUsers();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [roleFilter]);

    // ===== Filter pencarian (di sisi client, tambahan dari filter role) =====
    const filteredUsers = users.filter((u) => {
        const q = searchTerm.toLowerCase();
        return (
            u.nama.toLowerCase().includes(q) ||
            (u.nip || "").includes(q) ||
            (u.username || "").toLowerCase().includes(q) ||
            (u.kecamatan || "").toLowerCase().includes(q)
        );
    });

    // ===== Modal Tambah/Edit handlers =====
    function openAddModal() {
        setEditingUser(null);
        setForm(EMPTY_FORM);
        setFormError("");
        setModalOpen(true);
    }

    function openEditModal(user) {
        setEditingUser(user);
        setForm({
            nama: user.nama || "",
            username: user.username || "",
            nip: user.nip || "",
            password: "", // sengaja kosong, backend nggak pernah kirim password
            role: user.role || "petugas",
            kecamatan: user.kecamatan || "",
        });
        setFormError("");
        setModalOpen(true);
    }

    function closeModal() {
        if (saving) return;
        setModalOpen(false);
    }

    async function saveUser() {
        const { nama, username, nip, password, role, kecamatan } = form;

        if (!nama || !role) {
            setFormError("Mohon lengkapi Nama dan Role.");
            return;
        }

        if (role === "admin" && !username) {
            setFormError("Username wajib diisi untuk role Admin.");
            return;
        }

        if ((role === "petugas" || role === "user") && !nip) {
            setFormError("NIP wajib diisi untuk role Petugas/User.");
            return;
        }

        if (role === "petugas" && !kecamatan) {
            setFormError("Kecamatan wajib diisi untuk role Petugas.");
            return;
        }

        // Password wajib diisi hanya saat MODE TAMBAH
        if (!editingUser && !password) {
            setFormError("Kata sandi wajib diisi untuk pengguna baru.");
            return;
        }

        setSaving(true);
        setFormError("");

        const payload = {
            nama,
            role,
            username: role === "admin" ? username : null,
            nip: role === "admin" ? null : nip,
            kecamatan: role === "petugas" ? kecamatan : null,
        };

        if (password) {
            payload.password = password;
        }

        try {
            if (editingUser) {
                await api.put(`/users/${editingUser.id}`, payload);
            } else {
                await api.post("/users", payload);
            }

            closeModal();
            await fetchUsers();
        } catch (error) {
            console.error(error);
            setFormError(
                error.response?.data?.message || "Gagal menyimpan data pengguna."
            );
        } finally {
            setSaving(false);
        }
    }

    async function deleteUser(user) {
        if (!confirm(`Hapus pengguna "${user.nama}"?`)) return;

        try {
            await api.delete(`/users/${user.id}`);
            setUsers((prev) => prev.filter((u) => u.id !== user.id));
        } catch (error) {
            console.error(error);
            alert(error.response?.data?.message || "Gagal menghapus pengguna.");
        }
    }

    // ===== Import CSV handlers (khusus untuk menambah banyak PETUGAS sekaligus) =====
    function openImportModal() {
        setCsvFileName("");
        setParsedRows([]);
        setImportModalOpen(true);
    }

    function closeImportModal() {
        if (importing) return;
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
                    password: (cols[idxPass] || "").trim(),
                    kecamatan: (cols[idxKec] || "").trim(),
                };

                let error = "";
                if (!row.nip || !row.nama || !row.password || !row.kecamatan) {
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

    // Import selalu bikin role "petugas" (sesuai format CSV: nip, nama, kata_sandi, kecamatan)
    async function confirmImport() {
        const validRows = parsedRows.filter((r) => !r.error);
        if (validRows.length === 0) return;

        setImporting(true);

        let successCount = 0;
        const failedRows = [];

        for (const row of validRows) {
            try {
                await api.post("/users", {
                    nama: row.nama,
                    nip: row.nip,
                    password: row.password,
                    kecamatan: row.kecamatan,
                    role: "petugas",
                });
                successCount++;
            } catch (error) {
                failedRows.push({
                    ...row,
                    error: error.response?.data?.message || "Gagal disimpan",
                });
            }
        }

        setImporting(false);

        if (failedRows.length > 0) {
            setParsedRows(failedRows);
            alert(
                `${successCount} pengguna berhasil diimport, ${failedRows.length} gagal (lihat tabel untuk detail).`
            );
        } else {
            closeImportModal();
            alert(`${successCount} pengguna berhasil diimport.`);
        }

        await fetchUsers();
    }

    const validCount = parsedRows.filter((r) => !r.error).length;
    const errorCount = parsedRows.length - validCount;

    return (
        <>
            <div className="content-toolbar">
                <div className="toolbar-left">
                    <div className="toolbar-search">
                        <span className="search-icon">🔍</span>
                        <input
                            type="text"
                            placeholder="Cari nama, NIP/username, atau kecamatan..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <select
                        className="role-filter-select"
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                    >
                        <option value="">Semua Role</option>
                        {ROLE_OPTIONS.map((r) => (
                            <option key={r.value} value={r.value}>{r.label}</option>
                        ))}
                    </select>
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
                                <th>NIP / Username</th>
                                <th>Nama</th>
                                <th>Role</th>
                                <th>Kecamatan</th>
                                <th className="col-actions">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading && (
                                <tr>
                                    <td colSpan="5" style={{ textAlign: "center", padding: "24px", color: "#9090a8" }}>
                                        Memuat data pengguna...
                                    </td>
                                </tr>
                            )}

                            {!loading && loadError && (
                                <tr>
                                    <td colSpan="5" style={{ textAlign: "center", padding: "24px", color: "#e53935" }}>
                                        {loadError}
                                        <div>
                                            <button className="btn-cancel" style={{ marginTop: 10 }} onClick={fetchUsers}>
                                                Coba lagi
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )}

                            {!loading && !loadError && filteredUsers.length === 0 && (
                                <tr>
                                    <td colSpan="5" style={{ textAlign: "center", padding: "24px", color: "#9090a8" }}>
                                        Belum ada data pengguna.
                                    </td>
                                </tr>
                            )}

                            {!loading && !loadError && filteredUsers.map((u) => (
                                <tr key={u.id}>
                                    <td className="cell-nip">{u.role === "admin" ? u.username : u.nip}</td>
                                    <td>
                                        <div className="user-cell">
                                            <div className="user-avatar">{initials(u.nama)}</div>
                                            <div>
                                                <div className="user-name">{u.nama}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td><span className={`badge-role badge-role-${u.role}`}>{ROLE_LABEL[u.role] || u.role}</span></td>
                                    <td>{u.kecamatan ? <span className="badge-kecamatan">{u.kecamatan}</span> : <span style={{ color: "#c7cbd6" }}>-</span>}</td>
                                    <td className="col-actions">
                                        <div className="action-buttons">
                                            <button className="btn-icon btn-edit" title="Edit" onClick={() => openEditModal(u)}>✏️</button>
                                            <button className="btn-icon btn-delete" title="Hapus" onClick={() => deleteUser(u)}>🗑️</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
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
                            <h3>{editingUser ? "Edit Pengguna" : "Tambah Pengguna"}</h3>
                            <button className="modal-close" onClick={closeModal}>✕</button>
                        </div>
                        <div className="modal-body">
                            {formError && (
                                <div style={{
                                    background: "#fdecea", color: "#c62828", padding: "10px 14px",
                                    borderRadius: 8, fontSize: 12.5, marginBottom: 14,
                                }}>
                                    ⚠ {formError}
                                </div>
                            )}

                            <div className="form-group">
                                <label>Role</label>
                                <select
                                    value={form.role}
                                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                                >
                                    {ROLE_OPTIONS.map((r) => (
                                        <option key={r.value} value={r.value}>{r.label}</option>
                                    ))}
                                </select>
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

                            {form.role === "admin" ? (
                                <div className="form-group">
                                    <label>Username</label>
                                    <input
                                        type="text"
                                        placeholder="Masukkan username"
                                        value={form.username}
                                        onChange={(e) => setForm({ ...form, username: e.target.value })}
                                    />
                                </div>
                            ) : (
                                <div className="form-group">
                                    <label>NIP</label>
                                    <input
                                        type="text"
                                        placeholder="Masukkan NIP"
                                        value={form.nip}
                                        onChange={(e) => setForm({ ...form, nip: e.target.value })}
                                    />
                                </div>
                            )}

                            <div className="form-group">
                                <label>Kata Sandi {editingUser && <span style={{ fontWeight: 400, color: "#9090a8" }}>(kosongkan jika tidak diubah)</span>}</label>
                                <input
                                    type="password"
                                    placeholder={editingUser ? "Biarkan kosong jika tidak diganti" : "Masukkan kata sandi"}
                                    value={form.password}
                                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                                />
                            </div>

                            {form.role === "petugas" && (
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
                            )}
                        </div>
                        <div className="modal-footer">
                            <button className="btn-cancel" onClick={closeModal} disabled={saving}>Batal</button>
                            <button className="btn-save" onClick={saveUser} disabled={saving}>
                                {saving ? "Menyimpan..." : "Simpan"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ===== MODAL Import CSV ===== */}
            {importModalOpen && (
                <div className="modal-overlay open" onClick={(e) => e.target === e.currentTarget && closeImportModal()}>
                    <div className="modal-box modal-wide">
                        <div className="modal-header">
                            <h3>Import Data Petugas (CSV)</h3>
                            <button className="modal-close" onClick={closeImportModal}>✕</button>
                        </div>
                        <div className="modal-body">
                            <div className="upload-hint-note">
                                ℹ️ Import CSV cuma buat nambah pengguna dengan role <b>Petugas</b> sekaligus banyak. Buat Admin/User, tambahkan satu-satu lewat tombol "Add User".
                            </div>

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
                                                    <th>Kecamatan</th>
                                                    <th>Status</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {parsedRows.map((r, i) => (
                                                    <tr key={i} className={r.error ? "row-error" : ""}>
                                                        <td>{r.nip || "-"}</td>
                                                        <td>{r.nama || "-"}</td>
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
                            <button className="btn-cancel" onClick={closeImportModal} disabled={importing}>Batal</button>
                            <button className="btn-save" disabled={validCount === 0 || importing} onClick={confirmImport}>
                                {importing ? "Mengimport..." : "Import Data"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </>
    );
}

export default UserTable;
