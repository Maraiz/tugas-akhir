import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import api from "../../../services/api";
import "../../../styles/addBkl.css";

const BULAN_OPTIONS = [
    { value: 1, label: "Januari" }, { value: 2, label: "Februari" }, { value: 3, label: "Maret" },
    { value: 4, label: "April" }, { value: 5, label: "Mei" }, { value: 6, label: "Juni" },
    { value: 7, label: "Juli" }, { value: 8, label: "Agustus" }, { value: 9, label: "September" },
    { value: 10, label: "Oktober" }, { value: 11, label: "November" }, { value: 12, label: "Desember" },
];

/* ===================== FIELD DEFINITION UNTUK BKL ===================== */
/* Mengacu pada TABEL 5A SIGA — hanya kolom 1,2,3,4,15,16 yang dipakai,
   kolom lain (dimensi lansia tangguh, pedoman PJP, cara penyuluhan,
   status PUS/BER-KB, dst) diabaikan */
const BKL_FIELDS = [
    { key: "kode", label: "Kode" },
    { key: "kecamatan", label: "Kecamatan" },
    { key: "ada", label: "Jumlah Poktan - ADA (kolom 3)" },
    { key: "lapor", label: "Jumlah Poktan - LAPOR (kolom 4)" },
    { key: "jumlah_anggota", label: "Anggota Yg Ada - Jml Keluarga/Lansia Anggota BKL (kolom 15)" },
    { key: "jumlah_hadir", label: "Capaian - Jml Anggota Hadir Pertemuan (kolom 16)" },
    { key: "abaikan", label: "(Tidak digunakan)" },
];

/* Posisi kolom RELATIF terhadap kolom "Kecamatan" (bukan index absolut) —
   lebih tahan terhadap pergeseran kolom (mis. ada kolom kosong di awal
   sheet yang bikin semua kolom geser satu posisi). */
const OFFSET_BKL = { kode: -1, kecamatan: 0, ada: 1, lapor: 2, jumlah_anggota: 13, jumlah_hadir: 14 };

const TEST_TARGET_DATA = {
    PESANGGARAN: 1023, BANGOREJO: 1277, PURWOHARJO: 1448, TEGALDLIMO: 1384,
    MUNCAR: 1963, CLURING: 1352, GAMBIRAN: 1221, SRONO: 1856,
    GENTENG: 1599, GLENMORE: 1398, KALIBARU: 1059, SINGOJURUH: 969,
    ROGOJAMPI: 1040, KABAT: 1153, GLAGAH: 714, BANYUWANGI: 1885,
    GIRI: 584, WONGSOREJO: 1203, SONGGON: 1158, SEMPU: 1571,
    KALIPURO: 1258, SILIRAGUNG: 1016, TEGALSARI: 851, LICIN: 560,
    BLIMBINGSARI: 1072,
};

function matchesKeyword(header, keyword) {
    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp("\\b" + escaped + "\\b", "i").test(header);
}

function findHeaderRows(json) {
    let mainIdx = -1;
    for (let i = 0; i < json.length; i++) {
        const row = json[i] || [];
        if (row.some((cell) => String(cell).trim().toLowerCase() === "kecamatan")) {
            mainIdx = i;
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

    return { headers: combined, dataStartIndex: dataStart };
}

function buildPositionMapFromHeaders(rawHeaders, offsetMap) {
    const kecIdx = rawHeaders.findIndex((h) => matchesKeyword(String(h).toLowerCase(), "kecamatan"));
    if (kecIdx === -1) return {};

    const positionMap = {};
    Object.keys(offsetMap).forEach((field) => {
        const idx = kecIdx + offsetMap[field];
        if (idx >= 0) positionMap[idx] = field;
    });
    return positionMap;
}

const STEP_LABELS = [
    { step: 1, label: "Upload Excel SIGA" },
    { step: 2, label: "Validasi Data" },
    { step: 3, label: "Seleksi Kolom" },
    { step: 4, label: "Preview Data" },
    { step: 5, label: "Target Program" },
    { step: 6, label: "Perhitungan & Simpan" },
];

function AddBklWizard() {
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
    const [kecamatanAgg, setKecamatanAgg] = useState({});

    // ===== STEP 5: Target =====
    const [targetInputs, setTargetInputs] = useState({});

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
                setFileName(`${file.name} — ${rows.length} baris data terdeteksi`);
                setDebugText("Header terdeteksi: " + headers.map((h, i) => `[${i}] "${h || "(kosong)"}"`).join("   "));
            } catch (err) {
                alert("Gagal membaca file. Pastikan format file benar (.xlsx/.xls/.csv).");
            }
        };
        reader.readAsArrayBuffer(file);
    }

    // ===================== STEP 2: VALIDASI =====================
    const hasKecamatanCol = rawHeaders.some((h) => matchesKeyword(h.toLowerCase(), "kecamatan"));
    const hasAdaCol = rawHeaders.some((h) => matchesKeyword(h.toLowerCase(), "ada"));
    const hasLaporCol = rawHeaders.some((h) => matchesKeyword(h.toLowerCase(), "lapor"));

    const validationItems = [
        { ok: rawHeaders.length > 0, text: <>File berhasil dibaca dengan <b>{rawHeaders.length}</b> kolom</> },
        { ok: rawRows.length > 0, text: <>Ditemukan <b>{rawRows.length}</b> baris data pada file</> },
        { ok: hasKecamatanCol, text: hasKecamatanCol ? <>Kolom <b>Kecamatan</b> ditemukan</> : <>Kolom <b>Kecamatan</b> tidak ditemukan pada file</> },
        { ok: hasAdaCol && hasLaporCol, text: (hasAdaCol && hasLaporCol) ? <>Kolom <b>Ada</b> dan <b>Lapor</b> ditemukan</> : <>Kolom <b>Ada</b> / <b>Lapor</b> tidak ditemukan pada file</> },
        { ok: true, text: "Tidak ditemukan baris yang seluruhnya kosong" },
    ];
    const validationAllOk = validationItems.every((it) => it.ok);

    // ===================== STEP 3: SELEKSI KOLOM =====================
    function guessMapping(colIndex, positionMap) {
        return positionMap[colIndex] !== undefined ? positionMap[colIndex] : "abaikan";
    }

    function initColumnSelection() {
        const positionMap = buildPositionMapFromHeaders(rawHeaders, OFFSET_BKL);
        const claimed = new Set();
        const mapping = rawHeaders.map((h, idx) => {
            let guessed = guessMapping(idx, positionMap);
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

    // ===================== STEP 4: PREVIEW =====================
    function buildPreview() {
        const usedCols = colMapping.filter((c) => c.checked && c.mappedKey !== "abaikan");

        const data = rawRows
            .map((row) => {
                const obj = {};
                usedCols.forEach((c) => { obj[c.mappedKey] = row[c.colIndex] ?? ""; });

                const ada = Number(obj.ada) || 0;
                const lapor = Number(obj.lapor) || 0;
                obj.pctLapor = ada > 0 ? (lapor / ada) * 100 : 0;

                return obj;
            })
            .filter((row) => String(row.kecamatan || "").trim() !== "");

        setMappedData(data);

        const agg = {};
        data.forEach((row) => {
            const kec = String(row.kecamatan || "").trim();
            agg[kec] = {
                kode: row.kode || "-",
                ada: Number(row.ada) || 0,
                lapor: Number(row.lapor) || 0,
                anggota: Number(row.jumlah_anggota) || 0,
                hadir: Number(row.jumlah_hadir) || 0,
                pctLapor: row.pctLapor,
            };
        });
        setKecamatanAgg(agg);
    }

    const totalAda = mappedData.reduce((s, r) => s + (Number(r.ada) || 0), 0);
    const totalLapor = mappedData.reduce((s, r) => s + (Number(r.lapor) || 0), 0);

    // ===================== STEP 5: TARGET MANUAL =====================
    function updateTarget(kec, value) {
        setTargetInputs((prev) => ({ ...prev, [kec]: value }));
    }

    function applyGlobalTarget(value) {
        if (value === "") return;
        setTargetInputs((prev) => {
            const next = { ...prev };
            Object.keys(kecamatanAgg).forEach((kec) => { next[kec] = value; });
            return next;
        });
    }

    function applyTestTarget() {
        const notFound = [];
        setTargetInputs((prev) => {
            const next = { ...prev };
            Object.keys(kecamatanAgg).forEach((kec) => {
                const key = kec.trim().toUpperCase();
                if (TEST_TARGET_DATA[key] !== undefined) {
                    next[kec] = TEST_TARGET_DATA[key];
                } else {
                    notFound.push(kec);
                }
            });
            return next;
        });

        if (notFound.length > 0) {
            alert("Kecamatan berikut tidak ada di data testing, target dibiarkan kosong:\n" + notFound.join(", "));
        }
    }

    // ===================== STEP 6: PERHITUNGAN =====================
    const kecList = Object.keys(kecamatanAgg).sort();

    const calcRows = kecList.map((kec) => {
        const agg = kecamatanAgg[kec];
        const target = Number(targetInputs[kec]) || 0;
        const selisih = agg.anggota - target;
        const pctThdTarget = target > 0 ? (agg.hadir / target) * 100 : 0;
        const pctThdAnggota = agg.anggota > 0 ? (agg.hadir / agg.anggota) * 100 : 0;
        return { kec, agg, target, selisih, pctThdTarget, pctThdAnggota };
    });

    const calcTotals = calcRows.reduce(
        (acc, r) => {
            acc.totalAda += r.agg.ada;
            acc.totalLapor += r.agg.lapor;
            acc.totalTarget += r.target;
            acc.totalAnggota += r.agg.anggota;
            acc.totalHadir += r.agg.hadir;
            acc.totalSelisih += r.selisih;
            return acc;
        },
        { totalAda: 0, totalLapor: 0, totalTarget: 0, totalAnggota: 0, totalHadir: 0, totalSelisih: 0 }
    );
    const totalPctLapor = calcTotals.totalAda > 0 ? (calcTotals.totalLapor / calcTotals.totalAda) * 100 : 0;
    const totalPctThdTarget = calcTotals.totalTarget > 0 ? (calcTotals.totalHadir / calcTotals.totalTarget) * 100 : 0;
    const totalPctThdAnggota = calcTotals.totalAnggota > 0 ? (calcTotals.totalHadir / calcTotals.totalAnggota) * 100 : 0;

    async function saveMonitoring() {
        setSaveError("");
        setSaving(true);

        try {
            const storedUser = JSON.parse(localStorage.getItem("user") || "null");

            // Susun ulang baris hasil perhitungan (calcRows) jadi format yang
            // diharapkan backend: kode, kecamatan, ada, lapor, pctLapor, target,
            // jumlah_anggota, selisih, jumlah_hadir, pctThdTarget, pctThdAnggota
            const rowsPayload = calcRows.map(({ kec, agg, target, selisih, pctThdTarget, pctThdAnggota }) => ({
                kode: agg.kode,
                kecamatan: kec,
                ada: agg.ada,
                lapor: agg.lapor,
                pctLapor: agg.pctLapor,
                target,
                jumlah_anggota: agg.anggota,
                selisih,
                jumlah_hadir: agg.hadir,
                pctThdTarget,
                pctThdAnggota,
            }));

            const formData = new FormData();
            formData.append("file", selectedFile);
            formData.append("bulan", bulan);
            formData.append("tahun", tahun);
            formData.append("rows", JSON.stringify(rowsPayload));
            formData.append("uploadedBy", storedUser?.nama || "-");
            if (storedUser?.id) formData.append("uploadedById", storedUser.id);

            await api.post("/bkl", formData, {
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
        setKecamatanAgg({});
        setTargetInputs({});
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
                        <p>Unggah hasil unduhan data BKL (Tabel 5A) dari aplikasi SIGA dalam format Excel (.xlsx / .xls / .csv)</p>
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
                        <div className="dz-icon"><i className="bi bi-cloud-arrow-up-fill"></i></div>
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
                        <i className="bi bi-info-circle-fill" style={{ marginRight: 6 }}></i>Pastikan file yang diunggah adalah hasil unduhan langsung dari SIGA (Tabel 5A) tanpa diubah struktur kolomnya.
                    </div>

                    {fileName && (
                        <div className="file-loaded-box" style={{ display: "flex" }}>
                            <span><i className="bi bi-file-earmark-text-fill" style={{ marginRight: 6 }}></i>{fileName}</span>
                            <button onClick={resetUpload} title="Hapus file"><i className="bi bi-x-lg"></i></button>
                        </div>
                    )}

                    {debugText && (
                        <div className="debug-box" style={{ display: "block" }}>{debugText}</div>
                    )}

                    <div className="panel-footer">
                        <span></span>
                        <button className="btn-nav next" disabled={!fileName || !bulan || !tahun} onClick={() => goToStep(2)}>
                            Lanjut ke Validasi <i className="bi bi-arrow-right"></i>
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
                                <div className="v-icon">{it.ok ? <i className="bi bi-check-lg"></i> : <i className="bi bi-x-lg"></i>}</div>
                                <div className="v-text">{it.text}</div>
                            </div>
                        ))}

                        {!validationAllOk && (
                            <>
                                <div className="upload-hint-box" style={{ marginTop: 14 }}>
                                    <i className="bi bi-exclamation-triangle-fill" style={{ marginRight: 6 }}></i>File tidak lolos validasi. Silakan kembali dan unggah ulang file Excel SIGA yang sesuai format.
                                </div>
                                <div className="debug-box">
                                    Header yang terbaca dari file: {rawHeaders.map((h, i) => `[${i}] "${h || "(kosong)"}"`).join("   ")}
                                </div>
                            </>
                        )}
                    </div>

                    <div className="panel-footer">
                        <button className="btn-nav back" onClick={() => goToStep(1)}><i className="bi bi-arrow-left"></i> Kembali</button>
                        <button
                            className="btn-nav next"
                            disabled={!validationAllOk}
                            onClick={() => { initColumnSelection(); goToStep(3); }}
                        >
                            Lanjut ke Seleksi Kolom <i className="bi bi-arrow-right"></i>
                        </button>
                    </div>
                </div>
            )}

            {/* STEP 3: SELEKSI KOLOM */}
            {currentStep === 3 && (
                <div className="step-panel active">
                    <div className="panel-head">
                        <h3>Seleksi Kolom Otomatis</h3>
                        <p>Sistem otomatis mendeteksi dan mencentang kolom yang dibutuhkan (kolom 1,2,3,4,15,16). Sesuaikan pemetaan kolom jika diperlukan.</p>
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
                                                    {BKL_FIELDS.map((f) => (
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
                        <button className="btn-nav back" onClick={() => goToStep(2)}><i className="bi bi-arrow-left"></i> Kembali</button>
                        <button
                            className="btn-nav next"
                            disabled={!columnSelectionOk}
                            onClick={() => { buildPreview(); goToStep(4); }}
                        >
                            Lanjut ke Preview <i className="bi bi-arrow-right"></i>
                        </button>
                    </div>
                </div>
            )}

            {/* STEP 4: PREVIEW */}
            {currentStep === 4 && (
                <div className="step-panel active">
                    <div className="panel-head">
                        <h3>Preview Hasil Data</h3>
                        <p>Data mentah SIGA telah disaring: Jumlah Poktan (Ada/Lapor) dan Jumlah Anggota BKL (Anggota Ada/Capaian Hadir)</p>
                    </div>

                    <div className="preview-summary">
                        <div className="summary-chip">
                            <div className="chip-value">{mappedData.length}</div>
                            <div className="chip-label">Kecamatan Terdeteksi</div>
                        </div>
                        <div className="summary-chip">
                            <div className="chip-value">{totalAda} / {totalLapor}</div>
                            <div className="chip-label">Total Poktan Ada / Lapor</div>
                        </div>
                        <div className="summary-chip">
                            <div className="chip-value">{totalAda > 0 ? ((totalLapor / totalAda) * 100).toFixed(1) : 0}%</div>
                            <div className="chip-label">Rata-rata % Pelaporan</div>
                        </div>
                    </div>

                    <div className="preview-table-wrap">
                        <table>
                            <thead>
                                <tr>
                                    <th>Kode</th>
                                    <th>Kecamatan</th>
                                    <th>Ada</th>
                                    <th>Lapor</th>
                                    <th>%</th>
                                    <th>Anggota Yg Ada</th>
                                    <th>Capaian (Hadir)</th>
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
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="panel-footer">
                        <button className="btn-nav back" onClick={() => goToStep(3)}><i className="bi bi-arrow-left"></i> Kembali</button>
                        <button className="btn-nav next" onClick={() => goToStep(5)}>Lanjut Input Target <i className="bi bi-arrow-right"></i></button>
                    </div>
                </div>
            )}

            {/* STEP 5: TARGET MANUAL */}
            {currentStep === 5 && (
                <div className="step-panel active">
                    <div className="panel-head">
                        <h3>Input Target Program BKL (Manual)</h3>
                        <p>Jumlah Anggota Yang Ada dan Capaian sudah terhitung otomatis dari data Excel. Masukkan Target keanggotaan yang ditetapkan Dinas untuk tiap kecamatan pada periode ini.</p>
                    </div>

                    <div style={{ marginBottom: 20, display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-end" }}>
                        <div className="summary-chip" style={{ flex: 1, minWidth: 280 }}>
                            <label style={{ fontSize: 11.5, color: "#9090a8", fontWeight: 600, display: "block", marginBottom: 6 }}>
                                Terapkan Target ke Semua Kecamatan
                            </label>
                            <input
                                type="number"
                                min="0"
                                placeholder="cth. 1200"
                                style={{ width: "100%", padding: "9px 12px", border: "1px solid #e0e4ee", borderRadius: 8, fontSize: 13.5, fontFamily: "inherit" }}
                                onChange={(e) => applyGlobalTarget(e.target.value)}
                            />
                        </div>
                        <button
                            className="btn-nav back"
                            style={{ background: "#fff8e1", color: "#7a5c00", border: "1px solid #ffe082" }}
                            onClick={applyTestTarget}
                        >
                            <i className="bi bi-flask-fill"></i> Isi Target Testing
                        </button>
                    </div>

                    <div className="target-table-wrap">
                        <table className="target-table">
                            <thead>
                                <tr>
                                    <th>Kecamatan</th>
                                    <th>Anggota Yang Ada</th>
                                    <th>Capaian (Hadir)</th>
                                    <th>Target</th>
                                </tr>
                            </thead>
                            <tbody>
                                {kecList.length === 0 && (
                                    <tr>
                                        <td colSpan="4" style={{ textAlign: "center", color: "#9090a8", padding: 16 }}>
                                            Tidak ada data kecamatan terdeteksi dari file.
                                        </td>
                                    </tr>
                                )}
                                {kecList.map((kec) => {
                                    const agg = kecamatanAgg[kec];
                                    return (
                                        <tr key={kec}>
                                            <td className="target-kec-name">{kec}</td>
                                            <td className="realisasi-val">{agg.anggota}</td>
                                            <td className="realisasi-val">{agg.hadir}</td>
                                            <td>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    placeholder="0"
                                                    value={targetInputs[kec] ?? ""}
                                                    onChange={(e) => updateTarget(kec, e.target.value)}
                                                />
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    <div className="panel-footer">
                        <button className="btn-nav back" onClick={() => goToStep(4)}><i className="bi bi-arrow-left"></i> Kembali</button>
                        <button className="btn-nav next" onClick={() => goToStep(6)}>Hitung Capaian <i className="bi bi-arrow-right"></i></button>
                    </div>
                </div>
            )}

            {/* STEP 6: PERHITUNGAN & SIMPAN */}
            {currentStep === 6 && (
                <div className="step-panel active">
                    <div className="panel-head">
                        <h3>Perhitungan Capaian — MONEV POKTAN BKL</h3>
                        <p>Selisih = Anggota Yang Ada − Target. % Terhadap Target = Capaian ÷ Target × 100. % Terhadap Anggota Yang Ada = Capaian ÷ Anggota Yang Ada × 100.</p>
                    </div>

                    <div className="calc-summary-cards">
                        <div className="calc-card">
                            <div className="cc-value">{calcTotals.totalAnggota} / {calcTotals.totalTarget}</div>
                            <div className="cc-label">Total Anggota Yg Ada / Target Kabupaten</div>
                        </div>
                        <div className="calc-card">
                            <div className="cc-value">{totalPctThdTarget.toFixed(1)}%</div>
                            <div className="cc-label">Rata-rata % Terhadap Target</div>
                        </div>
                        <div className="calc-card alt">
                            <div className="cc-value">{totalPctThdAnggota.toFixed(1)}%</div>
                            <div className="cc-label">Rata-rata % Terhadap Anggota Yg Ada</div>
                        </div>
                    </div>

                    <div className="calc-table-wrap">
                        <table className="calc-table">
                            <thead>
                                <tr>
                                    <th rowSpan="2">Kode</th>
                                    <th rowSpan="2" style={{ textAlign: "left" }}>Kecamatan</th>
                                    <th colSpan="3">Jumlah Poktan</th>
                                    <th colSpan="3">Keanggotaan</th>
                                    <th colSpan="3">Kehadiran</th>
                                    <th rowSpan="2">% Terhadap<br />Target</th>
                                    <th rowSpan="2">% Terhadap<br />Anggota Yg Ada</th>
                                </tr>
                                <tr>
                                    <th>Ada</th>
                                    <th>Lapor</th>
                                    <th>%</th>
                                    <th>Target</th>
                                    <th>Anggota<br />Yg Ada</th>
                                    <th>Selisih<br />(Lebih/Kurang)</th>
                                    <th>Target</th>
                                    <th>Anggota<br />Yg Ada</th>
                                    <th>Capaian</th>
                                </tr>
                            </thead>
                            <tbody>
                                {calcRows.map(({ kec, agg, target, selisih, pctThdTarget, pctThdAnggota }) => (
                                    <tr key={kec}>
                                        <td>{agg.kode}</td>
                                        <td className="text-left"><b>{kec}</b></td>
                                        <td>{agg.ada}</td>
                                        <td>{agg.lapor}</td>
                                        <td>{agg.pctLapor.toFixed(2)}</td>
                                        <td>{target || "-"}</td>
                                        <td>{agg.anggota}</td>
                                        <td className={selisih >= 0 ? "selisih-pos" : "selisih-neg"}>{selisih >= 0 ? `+${selisih}` : selisih}</td>
                                        <td>{target || "-"}</td>
                                        <td>{agg.anggota}</td>
                                        <td>{agg.hadir}</td>
                                        <td>{pctThdTarget.toFixed(0)}</td>
                                        <td>{pctThdAnggota.toFixed(0)}</td>
                                    </tr>
                                ))}
                            </tbody>
                            {calcRows.length > 0 && (
                                <tfoot>
                                    <tr>
                                        <td colSpan="2" className="text-left">Jumlah Total</td>
                                        <td>{calcTotals.totalAda}</td>
                                        <td>{calcTotals.totalLapor}</td>
                                        <td>{totalPctLapor.toFixed(2)}</td>
                                        <td>{calcTotals.totalTarget}</td>
                                        <td>{calcTotals.totalAnggota}</td>
                                        <td className={calcTotals.totalSelisih >= 0 ? "selisih-pos" : "selisih-neg"}>
                                            {calcTotals.totalSelisih >= 0 ? `+${calcTotals.totalSelisih}` : calcTotals.totalSelisih}
                                        </td>
                                        <td>{calcTotals.totalTarget}</td>
                                        <td>{calcTotals.totalAnggota}</td>
                                        <td>{calcTotals.totalHadir}</td>
                                        <td>{totalPctThdTarget.toFixed(0)}</td>
                                        <td>{totalPctThdAnggota.toFixed(0)}</td>
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>

                    {saveError && (
                        <div className="upload-hint-box" style={{ background: "#fdecea", borderColor: "#f5c6c2", color: "#c62828", marginBottom: 16 }}>
                            <i className="bi bi-exclamation-triangle-fill" style={{ marginRight: 6 }}></i>{saveError}
                        </div>
                    )}

                    <div className="panel-footer">
                        <button className="btn-nav back" onClick={() => goToStep(5)} disabled={saving}><i className="bi bi-arrow-left"></i> Kembali</button>
                        <button className="btn-nav save" onClick={saveMonitoring} disabled={saving}>
                            {saving ? "Menyimpan..." : (<><i className="bi bi-save-fill"></i> Simpan Data Monitoring</>)}
                        </button>
                    </div>
                </div>
            )}

            {/* SUCCESS OVERLAY */}
            {successOpen && (
                <div className="success-overlay open">
                    <div className="success-box">
                        <div className="success-icon"><i className="bi bi-check-lg"></i></div>
                        <h3>Data Monitoring BKL Tersimpan</h3>
                        <p>Data hasil upload, target, dan perhitungan capaian program BKL telah berhasil disimpan ke sistem.</p>
                        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                            <button onClick={handleTambahLagi}>Tambah Data Lain</button>
                            <button
                                style={{ background: "#f0f2f8", color: "#555668" }}
                                onClick={() => navigate("/admin/monitoring/bkl")}
                            >
                                Kembali ke Data BKL
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

export default AddBklWizard;
