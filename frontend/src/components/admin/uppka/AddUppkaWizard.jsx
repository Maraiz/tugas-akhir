import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import api from "../../../services/api";
import "../../../styles/addUppka.css";

const BULAN_OPTIONS = [
    { value: 1, label: "Januari" }, { value: 2, label: "Februari" }, { value: 3, label: "Maret" },
    { value: 4, label: "April" }, { value: 5, label: "Mei" }, { value: 6, label: "Juni" },
    { value: 7, label: "Juli" }, { value: 8, label: "Agustus" }, { value: 9, label: "September" },
    { value: 10, label: "Oktober" }, { value: 11, label: "November" }, { value: 12, label: "Desember" },
];

/* ===================== FIELD DEFINITION UNTUK UPPKA ===================== */
/* Mengacu pada TABEL 6B SIGA — hanya kolom 1,2,3,4,6,7 yang dipakai:
   1=Kode, 2=Kecamatan, 3=Jumlah Pertemuan Penyuluhan (dipakai sbg "Ada"),
   4=Tatap Muka (dipakai sbg "Lapor"), 6=Jumlah Keluarga Anggota UPPKA,
   7=Jumlah Keluarga Anggota UPPKA Hadir Pertemuan.
   Kolom lain (Virtual, Informasi Kesertaan KB, Metode Kontrasepsi, dst) diabaikan */
const UPPKA_FIELDS = [
    { key: "kode", label: "Kode" },
    { key: "kecamatan", label: "Kecamatan" },
    { key: "ada", label: "Jumlah Poktan - ADA (kolom 3)" },
    { key: "lapor", label: "Jumlah Poktan - LAPOR (kolom 4)" },
    { key: "jumlah_anggota", label: "Kehadiran - Jml Keluarga Anggota UPPKA (kolom 6)" },
    { key: "jumlah_hadir", label: "Kehadiran - Jml Anggota Hadir Pertemuan (kolom 7)" },
    { key: "abaikan", label: "(Tidak digunakan)" },
];

/* Posisi kolom RELATIF terhadap kolom "Kecamatan" (bukan index absolut) —
   lebih tahan terhadap pergeseran kolom. */
const OFFSET_UPPKA = { kode: -1, kecamatan: 0, ada: 1, lapor: 2, jumlah_anggota: 4, jumlah_hadir: 5 };

function matchesKeyword(header, keyword) {
    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp("\\b" + escaped + "\\b", "i").test(header);
}

/* Deteksi baris header sebenarnya + pengaman ganda: kalau cek pertama
   (baris nomor urut kolom) gagal ke-skip karena struktur file agak beda,
   sistem terus maju sampai ketemu baris yang kolom Kecamatan-nya beneran
   berisi teks (bukan kosong/angka doang). */
function findHeaderRows(json) {
    let mainIdx = -1;
    let kecColIdx = -1;
    for (let i = 0; i < json.length; i++) {
        const row = json[i] || [];
        const idx = row.findIndex((cell) => String(cell).trim().toLowerCase() === "kecamatan");
        if (idx !== -1) {
            mainIdx = i;
            kecColIdx = idx;
            break;
        }
    }
    if (mainIdx === -1) return null;

    const mainRow = json[mainIdx] || [];
    const subRow = json[mainIdx + 1] || [];
    const maxCols = Math.max(mainRow.length, subRow.length);

    const filledMain = [];
    let lastMain = "";
    for (let c = 0; c < maxCols; c++) {
        const m = String(mainRow[c] ?? "").trim();
        if (m) lastMain = m;
        filledMain.push(lastMain);
    }

    const combined = [];
    for (let c = 0; c < maxCols; c++) {
        const s = String(subRow[c] ?? "").trim();
        const m = filledMain[c];
        combined.push(s || m);
    }

    let dataStart = mainIdx + 2;
    const maybeNumRow = json[dataStart] || [];
    const filledCells = maybeNumRow.filter((c) => String(c).trim() !== "");
    const looksLikeNumberRow = filledCells.length > 0 && filledCells.every((c) => /^\d+(=.*)?$/.test(String(c).trim()));
    if (looksLikeNumberRow) dataStart += 1;

    let guard = 0;
    while (dataStart < json.length && guard < 10) {
        const candidate = json[dataStart] || [];
        const kecVal = String(candidate[kecColIdx] ?? "").trim();
        const looksLikeRealKecamatan = kecVal !== "" && !/^\d+(\.\d+)?$/.test(kecVal);
        if (looksLikeRealKecamatan) break;
        dataStart += 1;
        guard += 1;
    }

    return { headers: combined, dataStartIndex: dataStart };
}

function buildPositionMapFromHeaders(rawHeaders, offsetMap) {
    const kecIdx = rawHeaders.findIndex((h) => matchesKeyword(String(h).toLowerCase(), "kecamatan"));
    if (kecIdx === -1) return {};

    const positionMap = {};
    Object.keys(offsetMap).forEach((field) => {
        const idx = kecIdx + offsetMap[field];
        if (idx >= 0 && idx < rawHeaders.length) positionMap[idx] = field;
    });
    return positionMap;
}

const STEP_LABELS = [
    { step: 1, label: "Upload Excel SIGA" },
    { step: 2, label: "Validasi Data" },
    { step: 3, label: "Seleksi Kolom" },
    { step: 4, label: "Preview & Simpan" },
];

function AddUppkaWizard() {
    const navigate = useNavigate();
    const fileInputRef = useRef(null);

    const [currentStep, setCurrentStep] = useState(1);
    const [dragOver, setDragOver] = useState(false);

    // ===== STEP 1: Upload =====
    const [selectedFile, setSelectedFile] = useState(null); // File object asli, buat dikirim & diarsip di backend
    const [fileName, setFileName] = useState("");
    const [rawHeaders, setRawHeaders] = useState([]);
    const [rawRows, setRawRows] = useState([]);
    const [debugText, setDebugText] = useState("");
    const [bulan, setBulan] = useState("");
    const [tahun, setTahun] = useState(new Date().getFullYear());

    // ===== STEP 3: Seleksi Kolom =====
    const [colMapping, setColMapping] = useState([]);

    // ===== STEP 4: Preview =====
    const [mappedData, setMappedData] = useState([]);
    const [totals, setTotals] = useState(null);

    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState("");
    const [successOpen, setSuccessOpen] = useState(false);

    function goToStep(n) {
        setCurrentStep(n);
    }

    // ===================== STEP 1: UPLOAD =====================
    function resetUpload() {
        setSelectedFile(null);
        setFileName("");
        setRawHeaders([]);
        setRawRows([]);
        setDebugText("");
        if (fileInputRef.current) fileInputRef.current.value = "";
    }

    function handleFile(file) {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: "array" });
                const sheetName = workbook.SheetNames[0];
                const sheet = workbook.Sheets[sheetName];
                const json = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

                if (!json || json.length < 2) {
                    alert("File Excel tidak memiliki data yang cukup.");
                    return;
                }

                const detected = findHeaderRows(json);
                if (!detected) {
                    alert('Kolom "Kecamatan" tidak ditemukan di file manapun. Pastikan file adalah hasil unduhan resmi dari SIGA.');
                    return;
                }

                const headers = detected.headers;
                const rows = json.slice(detected.dataStartIndex).filter((r) => r.some((c) => String(c).trim() !== ""));

                setSelectedFile(file);
                setRawHeaders(headers);
                setRawRows(rows);
                setFileName(`📄 ${file.name} — ${rows.length} baris data terdeteksi`);
                setDebugText("Header terdeteksi: " + headers.map((h, i) => `[${i}] "${h || "(kosong)"}"`).join("   "));
            } catch (err) {
                alert("Gagal membaca file. Pastikan format file benar (.xlsx/.xls/.csv).");
            }
        };
        reader.readAsArrayBuffer(file);
    }

    // ===================== STEP 2: VALIDASI =====================
    const hasKecamatanCol = rawHeaders.some((h) => matchesKeyword(h.toLowerCase(), "kecamatan"));
    // Validasi Ada/Lapor berbasis POSISI kolom (bukan cari teks di nama header) —
    // soalnya buat UPPKA, kolom 3/4 di Tabel 6B itu sebenarnya bernama "Jumlah
    // Pertemuan Penyuluhan"/"Tatap Muka", dipakai sbg Ada/Lapor berdasarkan
    // posisi relatif dari Kecamatan, BUKAN karena nama kolomnya literal "Ada"/"Lapor".
    const positionMapPreview = buildPositionMapFromHeaders(rawHeaders, OFFSET_UPPKA);
    const detectedFields = Object.values(positionMapPreview);
    const hasAdaCol = detectedFields.includes("ada");
    const hasLaporCol = detectedFields.includes("lapor");

    const validationItems = [
        { ok: rawHeaders.length > 0, text: <>File berhasil dibaca dengan <b>{rawHeaders.length}</b> kolom</> },
        { ok: rawRows.length > 0, text: <>Ditemukan <b>{rawRows.length}</b> baris data pada file</> },
        { ok: hasKecamatanCol, text: hasKecamatanCol ? <>Kolom <b>Kecamatan</b> ditemukan</> : <>Kolom <b>Kecamatan</b> tidak ditemukan pada file</> },
        { ok: hasAdaCol && hasLaporCol, text: (hasAdaCol && hasLaporCol) ? <>Kolom <b>Ada</b> dan <b>Lapor</b> ditemukan</> : <>Kolom <b>Ada</b> / <b>Lapor</b> tidak ditemukan pada file</> },
        { ok: true, text: "Tidak ditemukan baris yang seluruhnya kosong" },
    ];
    const validationAllOk = validationItems.every((it) => it.ok);

    // ===================== STEP 3: SELEKSI KOLOM =====================
    function initColumnSelection() {
        const positionMap = buildPositionMapFromHeaders(rawHeaders, OFFSET_UPPKA);
        const claimed = new Set();
        const mapping = rawHeaders.map((h, idx) => {
            let guessed = positionMap[idx] !== undefined ? positionMap[idx] : "abaikan";
            if (guessed !== "abaikan") {
                if (claimed.has(guessed)) guessed = "abaikan";
                else claimed.add(guessed);
            }
            const sample = rawRows[0] ? String(rawRows[0][idx] ?? "") : "";
            return { colIndex: idx, header: h, checked: guessed !== "abaikan", mappedKey: guessed, sample };
        });
        setColMapping(mapping);
    }

    function unclaimFieldFromOtherColumns(mapping, exceptIndex, fieldKey) {
        return mapping.map((c, j) => {
            if (j !== exceptIndex && c.mappedKey === fieldKey) {
                return { ...c, mappedKey: "abaikan", checked: false };
            }
            return c;
        });
    }

    function onColCheckChange(i, checked) {
        setColMapping((prev) => {
            let next = prev.map((c, idx) => (idx === i ? { ...c, checked } : c));
            if (!checked) {
                next = next.map((c, idx) => (idx === i ? { ...c, mappedKey: "abaikan" } : c));
            } else if (next[i].mappedKey !== "abaikan") {
                next = unclaimFieldFromOtherColumns(next, i, next[i].mappedKey);
            }
            return next;
        });
    }

    function onColMapChange(i, value) {
        setColMapping((prev) => {
            let next = prev;
            if (value !== "abaikan") {
                next = unclaimFieldFromOtherColumns(prev, i, value);
            }
            next = next.map((c, idx) => (idx === i ? { ...c, mappedKey: value } : c));
            return next;
        });
    }

    const usedKeys = colMapping.filter((c) => c.checked).map((c) => c.mappedKey);
    const columnSelectionOk = usedKeys.includes("kecamatan") && usedKeys.includes("ada") && usedKeys.includes("lapor");

    // ===================== STEP 4: PREVIEW & SIMPAN =====================
    function buildPreview() {
        const usedCols = colMapping.filter((c) => c.checked && c.mappedKey !== "abaikan");

        const data = rawRows
            .map((row) => {
                const obj = {};
                usedCols.forEach((c) => { obj[c.mappedKey] = row[c.colIndex] ?? ""; });

                const ada = Number(obj.ada) || 0;
                const lapor = Number(obj.lapor) || 0;
                const anggota = Number(obj.jumlah_anggota) || 0;
                const hadir = Number(obj.jumlah_hadir) || 0;

                obj.pctLapor = ada > 0 ? (lapor / ada) * 100 : 0;
                obj.pctHadir = anggota > 0 ? (hadir / anggota) * 100 : 0;

                return obj;
            })
            .filter((row) => String(row.kecamatan || "").trim() !== "");

        setMappedData(data);

        const totalAda = data.reduce((s, r) => s + (Number(r.ada) || 0), 0);
        const totalLapor = data.reduce((s, r) => s + (Number(r.lapor) || 0), 0);
        const totalAnggota = data.reduce((s, r) => s + (Number(r.jumlah_anggota) || 0), 0);
        const totalHadir = data.reduce((s, r) => s + (Number(r.jumlah_hadir) || 0), 0);
        const totalPctLapor = totalAda > 0 ? (totalLapor / totalAda) * 100 : 0;
        const totalPctHadir = totalAnggota > 0 ? (totalHadir / totalAnggota) * 100 : 0;

        setTotals({ totalAda, totalLapor, totalAnggota, totalHadir, totalPctLapor, totalPctHadir });
    }

    async function saveMonitoring() {
        setSaveError("");
        setSaving(true);

        try {
            const storedUser = JSON.parse(localStorage.getItem("user") || "null");

            const formData = new FormData();
            formData.append("file", selectedFile);
            formData.append("bulan", bulan);
            formData.append("tahun", tahun);
            formData.append("rows", JSON.stringify(mappedData));
            formData.append("uploadedBy", storedUser?.nama || "-");
            if (storedUser?.id) formData.append("uploadedById", storedUser.id);

            await api.post("/uppka", formData, {
                headers: { "Content-Type": undefined }, // biar browser generate boundary multipart otomatis
            });

            setSuccessOpen(true);
        } catch (error) {
            console.error(error);
            setSaveError(error.response?.data?.message || "Gagal menyimpan data ke server.");
        } finally {
            setSaving(false);
        }
    }

    function handleTambahLagi() {
        setSuccessOpen(false);
        setCurrentStep(1);
        resetUpload();
        setBulan("");
        setTahun(new Date().getFullYear());
        setColMapping([]);
        setMappedData([]);
        setTotals(null);
        setSaveError("");
    }

    return (
        <>
            {/* STEPPER */}
            <div className="stepper-card">
                <div className="stepper">
                    {STEP_LABELS.map(({ step, label }) => (
                        <div
                            key={step}
                            className={`step-item ${currentStep === step ? "active" : ""} ${currentStep > step ? "completed" : ""}`}
                        >
                            <div className="step-circle">{step}</div>
                            <div className="step-label">{label}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* STEP 1: UPLOAD */}
            {currentStep === 1 && (
                <div className="step-panel active">
                    <div className="panel-head">
                        <h3>Upload File Excel SIGA</h3>
                        <p>Unggah hasil unduhan data UPPKA (Tabel 6B) dari aplikasi SIGA dalam format Excel (.xlsx / .xls / .csv)</p>
                    </div>

                    <div className="periode-select-row">
                        <div className="form-group">
                            <label>Bulan</label>
                            <select value={bulan} onChange={(e) => setBulan(e.target.value)}>
                                <option value="">Pilih bulan</option>
                                {BULAN_OPTIONS.map((b) => (
                                    <option key={b.value} value={b.value}>{b.label}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Tahun</label>
                            <input
                                type="number"
                                value={tahun}
                                onChange={(e) => setTahun(e.target.value)}
                                min="2000"
                                max="2100"
                            />
                        </div>
                    </div>

                    <div
                        className={`upload-dropzone ${dragOver ? "drag-over" : ""}`}
                        onClick={() => fileInputRef.current?.click()}
                        onDragEnter={(e) => { e.preventDefault(); setDragOver(true); }}
                        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                        onDragLeave={(e) => { e.preventDefault(); setDragOver(false); }}
                        onDrop={(e) => {
                            e.preventDefault();
                            setDragOver(false);
                            const file = e.dataTransfer.files[0];
                            if (file) handleFile(file);
                        }}
                    >
                        <div className="dz-icon">📁</div>
                        <p>Klik atau seret file Excel ke sini</p>
                        <small>Format didukung: .xlsx, .xls, .csv — maks. 10MB</small>
                    </div>
                    <input
                        type="file"
                        ref={fileInputRef}
                        accept=".xlsx,.xls,.csv"
                        style={{ display: "none" }}
                        onChange={(e) => handleFile(e.target.files[0])}
                    />

                    <div className="upload-hint-box">
                        ⚠️ Pastikan file yang diunggah adalah hasil unduhan langsung dari SIGA (Tabel 6B) tanpa diubah struktur kolomnya.
                    </div>

                    {fileName && (
                        <div className="file-loaded-box" style={{ display: "flex" }}>
                            <span>{fileName}</span>
                            <button onClick={resetUpload} title="Hapus file">✕</button>
                        </div>
                    )}

                    {debugText && (
                        <div className="debug-box" style={{ display: "block" }}>{debugText}</div>
                    )}

                    <div className="panel-footer">
                        <span></span>
                        <button className="btn-nav next" disabled={!fileName || !bulan || !tahun} onClick={() => goToStep(2)}>
                            Lanjut ke Validasi →
                        </button>
                    </div>
                </div>
            )}

            {/* STEP 2: VALIDASI */}
            {currentStep === 2 && (
                <div className="step-panel active">
                    <div className="panel-head">
                        <h3>Validasi Data</h3>
                        <p>Sistem memeriksa format dan kelengkapan kolom wajib pada file yang diunggah</p>
                    </div>

                    <div className="validate-list">
                        {validationItems.map((it, i) => (
                            <div key={i} className={`validate-item ${it.ok ? "ok" : "err"}`}>
                                <div className="v-icon">{it.ok ? "✓" : "✕"}</div>
                                <div className="v-text">{it.text}</div>
                            </div>
                        ))}

                        {!validationAllOk && (
                            <>
                                <div className="upload-hint-box" style={{ marginTop: 14 }}>
                                    ⚠️ File tidak lolos validasi. Silakan kembali dan unggah ulang file Excel SIGA yang sesuai format.
                                </div>
                                <div className="debug-box">
                                    Header yang terbaca dari file: {rawHeaders.map((h, i) => `[${i}] "${h || "(kosong)"}"`).join("   ")}
                                </div>
                            </>
                        )}
                    </div>

                    <div className="panel-footer">
                        <button className="btn-nav back" onClick={() => goToStep(1)}>← Kembali</button>
                        <button
                            className="btn-nav next"
                            disabled={!validationAllOk}
                            onClick={() => { initColumnSelection(); goToStep(3); }}
                        >
                            Lanjut ke Seleksi Kolom →
                        </button>
                    </div>
                </div>
            )}

            {/* STEP 3: SELEKSI KOLOM */}
            {currentStep === 3 && (
                <div className="step-panel active">
                    <div className="panel-head">
                        <h3>Seleksi Kolom Otomatis</h3>
                        <p>Sistem otomatis mendeteksi dan mencentang kolom yang dibutuhkan (kolom 1,2,3,4,6,7). Sesuaikan pemetaan kolom jika diperlukan.</p>
                    </div>

                    <div style={{ overflowX: "auto" }}>
                        <table className="col-select-table">
                            <thead>
                                <tr>
                                    <th style={{ width: 40 }}>Pakai</th>
                                    <th>Kolom Sumber (Excel)</th>
                                    <th>Petakan ke Field Sistem</th>
                                </tr>
                            </thead>
                            <tbody>
                                {colMapping.map((col, i) => {
                                    const isAuto = col.mappedKey !== "abaikan";
                                    return (
                                        <tr key={i}>
                                            <td>
                                                <input
                                                    type="checkbox"
                                                    className="col-check"
                                                    checked={col.checked}
                                                    onChange={(e) => onColCheckChange(i, e.target.checked)}
                                                />
                                            </td>
                                            <td>
                                                <div className="col-source-name">
                                                    {col.header || "(tanpa nama)"}{" "}
                                                    {isAuto ? <span className="tag-auto">Auto terdeteksi</span> : <span className="tag-unused">Tidak dipakai</span>}
                                                </div>
                                                <div className="col-source-sample">Contoh isi: {col.sample || "-"}</div>
                                            </td>
                                            <td>
                                                <select
                                                    value={col.mappedKey}
                                                    disabled={!col.checked}
                                                    onChange={(e) => onColMapChange(i, e.target.value)}
                                                >
                                                    {UPPKA_FIELDS.map((f) => (
                                                        <option key={f.key} value={f.key}>{f.label}</option>
                                                    ))}
                                                </select>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    <div className="panel-footer">
                        <button className="btn-nav back" onClick={() => goToStep(2)}>← Kembali</button>
                        <button
                            className="btn-nav next"
                            disabled={!columnSelectionOk}
                            onClick={() => { buildPreview(); goToStep(4); }}
                        >
                            Lanjut ke Preview →
                        </button>
                    </div>
                </div>
            )}

            {/* STEP 4: PREVIEW & SIMPAN */}
            {currentStep === 4 && (
                <div className="step-panel active">
                    <div className="panel-head">
                        <h3>Preview Hasil Data — MONEV POKTAN UPPKA</h3>
                        <p>Data mentah SIGA telah disaring menjadi format rekap MONEV POKTAN UPPKA: Jumlah Poktan (Ada/Lapor) dan Kehadiran (Anggota/Capaian), lengkap dengan persentase otomatis</p>
                    </div>

                    <div className="preview-summary">
                        <div className="summary-chip">
                            <div className="chip-value">{mappedData.length}</div>
                            <div className="chip-label">Kecamatan Terdeteksi</div>
                        </div>
                        <div className="summary-chip">
                            <div className="chip-value">{totals ? `${totals.totalAda} / ${totals.totalLapor}` : "0 / 0"}</div>
                            <div className="chip-label">Total Poktan Ada / Lapor</div>
                        </div>
                        <div className="summary-chip">
                            <div className="chip-value">{totals ? totals.totalPctLapor.toFixed(1) : 0}%</div>
                            <div className="chip-label">Rata-rata % Pelaporan</div>
                        </div>
                    </div>

                    <div className="preview-table-wrap">
                        <table>
                            <thead>
                                <tr>
                                    <th rowSpan="2">Kode</th>
                                    <th rowSpan="2">Kecamatan</th>
                                    <th colSpan="3" style={{ textAlign: "center" }}>Jumlah Poktan</th>
                                    <th colSpan="3" style={{ textAlign: "center" }}>Kehadiran</th>
                                </tr>
                                <tr>
                                    <th>Ada</th>
                                    <th>Lapor</th>
                                    <th>%</th>
                                    <th>Anggota</th>
                                    <th>Capaian</th>
                                    <th>%</th>
                                </tr>
                            </thead>
                            <tbody>
                                {mappedData.map((row, i) => (
                                    <tr key={i}>
                                        <td>{row.kode ?? "-"}</td>
                                        <td><b>{row.kecamatan ?? "-"}</b></td>
                                        <td>{row.ada ?? 0}</td>
                                        <td>{row.lapor ?? 0}</td>
                                        <td>{row.pctLapor.toFixed(2)}</td>
                                        <td>{row.jumlah_anggota ?? 0}</td>
                                        <td>{row.jumlah_hadir ?? 0}</td>
                                        <td>{row.pctHadir.toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                            {totals && (
                                <tfoot>
                                    <tr>
                                        <td colSpan="2">Jumlah Total</td>
                                        <td>{totals.totalAda}</td>
                                        <td>{totals.totalLapor}</td>
                                        <td>{totals.totalPctLapor.toFixed(2)}</td>
                                        <td>{totals.totalAnggota}</td>
                                        <td>{totals.totalHadir}</td>
                                        <td>{totals.totalPctHadir.toFixed(2)}</td>
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>

                    {saveError && (
                        <div className="upload-hint-box" style={{ background: "#fdecea", borderColor: "#f5c6c2", color: "#c62828", marginBottom: 16 }}>
                            ⚠ {saveError}
                        </div>
                    )}

                    <div className="panel-footer">
                        <button className="btn-nav back" onClick={() => goToStep(3)} disabled={saving}>← Kembali</button>
                        <button className="btn-nav save" onClick={saveMonitoring} disabled={saving}>
                            {saving ? "Menyimpan..." : "💾 Simpan Data Monitoring"}
                        </button>
                    </div>
                </div>
            )}

            {/* SUCCESS OVERLAY */}
            {successOpen && (
                <div className="success-overlay open">
                    <div className="success-box">
                        <div className="success-icon">✓</div>
                        <h3>Data Monitoring UPPKA Tersimpan</h3>
                        <p>Data hasil upload dan perhitungan capaian program UPPKA telah berhasil disimpan ke sistem.</p>
                        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                            <button onClick={handleTambahLagi}>Tambah Data Lain</button>
                            <button
                                style={{ background: "#f0f2f8", color: "#555668" }}
                                onClick={() => navigate("/admin/monitoring/uppka")}
                            >
                                Kembali ke Data UPPKA
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

export default AddUppkaWizard;