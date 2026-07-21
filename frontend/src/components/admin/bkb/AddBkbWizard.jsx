import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import api from "../../../services/api";
import "../../../styles/addBkb.css";

const BULAN_OPTIONS = [
    { value: 1, label: "Januari" }, { value: 2, label: "Februari" }, { value: 3, label: "Maret" },
    { value: 4, label: "April" }, { value: 5, label: "Mei" }, { value: 6, label: "Juni" },
    { value: 7, label: "Juli" }, { value: 8, label: "Agustus" }, { value: 9, label: "September" },
    { value: 10, label: "Oktober" }, { value: 11, label: "November" }, { value: 12, label: "Desember" },
];

/* ===================== FIELD DEFINITION UNTUK BKB ===================== */
/* File 1 = Tabel 3A: kolom 1,2,3,4 (Kode, Kecamatan, Ada, Lapor)
   File 2 = Tabel 3B: kolom 1,2,6,7 (Kode, Kecamatan, Jml Keluarga Anggota BKB, Jml Hadir Pertemuan) */
const FIELDS_FILE1 = [
    { key: "kode", label: "Kode" },
    { key: "kecamatan", label: "Kecamatan" },
    { key: "ada", label: "Jumlah Poktan - ADA (kolom 3)" },
    { key: "lapor", label: "Jumlah Poktan - LAPOR (kolom 4)" },
    { key: "abaikan", label: "(Tidak digunakan)" },
];
const FIELDS_FILE2 = [
    { key: "kode", label: "Kode" },
    { key: "kecamatan", label: "Kecamatan" },
    { key: "jumlah_anggota", label: "Anggota Yg Ada - Jml Keluarga Anggota BKB (kolom 6)" },
    { key: "jumlah_hadir", label: "Capaian - Jml Hadir Pertemuan (kolom 7)" },
    { key: "abaikan", label: "(Tidak digunakan)" },
];

/* Posisi kolom RELATIF terhadap kolom "Kecamatan" (bukan index absolut).
   Ini lebih tahan terhadap pergeseran kolom (mis. ada kolom kosong di awal
   sheet yang bikin semua kolom geser satu posisi) — sistem cari dulu kolom
   mana yang beneran berisi teks "Kecamatan", baru hitung kolom lain relatif
   dari situ, bukan asumsi kolom A/B/dst secara buta. */
const OFFSET_FILE1 = { kode: -1, kecamatan: 0, ada: 1, lapor: 2 };
const OFFSET_FILE2 = { kode: -1, kecamatan: 0, jumlah_anggota: 4, jumlah_hadir: 5 };

const TEST_TARGET_DATA = {
    PESANGGARAN: 2345, BANGOREJO: 2194, PURWOHARJO: 2400, TEGALDLIMO: 2813,
    MUNCAR: 5497, CLURING: 2522, GAMBIRAN: 2381, SRONO: 4012,
    GENTENG: 4144, GLENMORE: 2551, KALIBARU: 2421, SINGOJURUH: 2539,
    ROGOJAMPI: 2301, KABAT: 2924, GLAGAH: 1262, BANYUWANGI: 3782,
    GIRI: 1327, WONGSOREJO: 2684, SONGGON: 2494, SEMPU: 3715,
    KALIPURO: 3208, SILIRAGUNG: 2109, TEGALSARI: 1990, LICIN: 1284,
    BLIMBINGSARI: 1810,
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

function normKode(k) {
    const n = parseInt(String(k).replace(/\D/g, ""), 10);
    return isNaN(n) ? null : n;
}
function normKec(k) {
    return String(k || "").trim().toUpperCase().replace(/\s+/g, " ");
}

const EMPTY_FILE_STATE = { rawHeaders: [], rawRows: [], fileName: "", colMapping: [] };

const STEP_LABELS = [
    { step: 1, label: "Upload Excel SIGA" },
    { step: 2, label: "Validasi Data" },
    { step: 3, label: "Seleksi Kolom" },
    { step: 4, label: "Preview Data" },
    { step: 5, label: "Target Program" },
    { step: 6, label: "Perhitungan & Simpan" },
];

function AddBkbWizard() {
    const navigate = useNavigate();
    const fileInputRef1 = useRef(null);
    const fileInputRef2 = useRef(null);

    const [currentStep, setCurrentStep] = useState(1);
    const [dragOver1, setDragOver1] = useState(false);
    const [dragOver2, setDragOver2] = useState(false);

    const [files, setFiles] = useState({ 1: { ...EMPTY_FILE_STATE }, 2: { ...EMPTY_FILE_STATE } });
    const [selectedFile1, setSelectedFile1] = useState(null); // File object asli slot 1, buat diarsipkan backend
    const [selectedFile2, setSelectedFile2] = useState(null); // File object asli slot 2
    const [bulan, setBulan] = useState("");
    const [tahun, setTahun] = useState(new Date().getFullYear());

    const [mappedData, setMappedData] = useState([]);
    const [kecamatanAgg, setKecamatanAgg] = useState({});
    const [targetInputs, setTargetInputs] = useState({});
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState("");
    const [successOpen, setSuccessOpen] = useState(false);

    function goToStep(n) {
        setCurrentStep(n);
    }

    function updateFileState(slot, patch) {
        setFiles((prev) => ({ ...prev, [slot]: { ...prev[slot], ...patch } }));
    }

    // ===================== STEP 1: UPLOAD =====================
    function resetUpload(slot) {
        updateFileState(slot, { ...EMPTY_FILE_STATE });
        if (slot === 1) setSelectedFile1(null);
        else setSelectedFile2(null);
        const ref = slot === 1 ? fileInputRef1 : fileInputRef2;
        if (ref.current) ref.current.value = "";
    }

    function handleFile(slot, file) {
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

                const rawHeaders = detected.headers;
                const rawRows = json.slice(detected.dataStartIndex).filter((r) => r.some((c) => String(c).trim() !== ""));

                if (slot === 1) setSelectedFile1(file);
                else setSelectedFile2(file);

                updateFileState(slot, {
                    rawHeaders,
                    rawRows,
                    fileName: `${file.name} — ${rawRows.length} baris`,
                });
            } catch (err) {
                alert("Gagal membaca file. Pastikan format file benar (.xlsx/.xls/.csv).");
            }
        };
        reader.readAsArrayBuffer(file);
    }

    const step1Ready = files[1].rawHeaders.length > 0 && files[2].rawHeaders.length > 0 && bulan && tahun;

    // ===================== STEP 2: VALIDASI =====================
    function validationItemsForSlot(slot) {
        const rawHeaders = files[slot].rawHeaders;
        const rawRows = files[slot].rawRows;
        const hasKecamatan = rawHeaders.some((h) => matchesKeyword(h.toLowerCase(), "kecamatan"));
        return [
            { ok: rawHeaders.length > 0, text: <>File berhasil dibaca dengan <b>{rawHeaders.length}</b> kolom</> },
            { ok: rawRows.length > 0, text: <>Ditemukan <b>{rawRows.length}</b> baris data pada file</> },
            { ok: hasKecamatan, text: hasKecamatan ? <>Kolom <b>Kecamatan</b> ditemukan</> : <>Kolom <b>Kecamatan</b> tidak ditemukan</> },
        ];
    }

    const validation1 = validationItemsForSlot(1);
    const validation2 = validationItemsForSlot(2);
    const validationAllOk = validation1.every((it) => it.ok) && validation2.every((it) => it.ok);

    // ===================== STEP 3: SELEKSI KOLOM =====================
    function guessMapping(colIndex, positionMap) {
        return positionMap[colIndex] !== undefined ? positionMap[colIndex] : "abaikan";
    }

    function buildColMapping(slot, positionMap) {
        const claimed = new Set();
        return files[slot].rawHeaders.map((h, idx) => {
            let guessed = guessMapping(idx, positionMap);
            if (guessed !== "abaikan") {
                if (claimed.has(guessed)) guessed = "abaikan";
                else claimed.add(guessed);
            }
            const sample = files[slot].rawRows[0] ? String(files[slot].rawRows[0][idx] ?? "") : "";
            return { colIndex: idx, header: h, checked: guessed !== "abaikan", mappedKey: guessed, sample };
        });
    }

    function initColumnSelection() {
        const positionMap1 = buildPositionMapFromHeaders(files[1].rawHeaders, OFFSET_FILE1);
        const positionMap2 = buildPositionMapFromHeaders(files[2].rawHeaders, OFFSET_FILE2);
        updateFileState(1, { colMapping: buildColMapping(1, positionMap1) });
        updateFileState(2, { colMapping: buildColMapping(2, positionMap2) });
    }

    function unclaimFieldFromOtherColumns(mapping, exceptIndex, fieldKey) {
        return mapping.map((c, j) => {
            if (j !== exceptIndex && c.mappedKey === fieldKey) {
                return { ...c, mappedKey: "abaikan", checked: false };
            }
            return c;
        });
    }

    function onColCheckChange(slot, i, checked) {
        setFiles((prev) => {
            let mapping = prev[slot].colMapping.map((c, idx) => (idx === i ? { ...c, checked } : c));
            if (!checked) {
                mapping = mapping.map((c, idx) => (idx === i ? { ...c, mappedKey: "abaikan" } : c));
            } else if (mapping[i].mappedKey !== "abaikan") {
                mapping = unclaimFieldFromOtherColumns(mapping, i, mapping[i].mappedKey);
            }
            return { ...prev, [slot]: { ...prev[slot], colMapping: mapping } };
        });
    }

    function onColMapChange(slot, i, value) {
        setFiles((prev) => {
            let mapping = prev[slot].colMapping;
            if (value !== "abaikan") {
                mapping = unclaimFieldFromOtherColumns(mapping, i, value);
            }
            mapping = mapping.map((c, idx) => (idx === i ? { ...c, mappedKey: value } : c));
            return { ...prev, [slot]: { ...prev[slot], colMapping: mapping } };
        });
    }

    const used1 = files[1].colMapping.filter((c) => c.checked).map((c) => c.mappedKey);
    const used2 = files[2].colMapping.filter((c) => c.checked).map((c) => c.mappedKey);
    const columnSelectionOk =
        used1.includes("kecamatan") && used1.includes("ada") && used1.includes("lapor") &&
        used2.includes("kecamatan") && used2.includes("jumlah_anggota") && used2.includes("jumlah_hadir");

    // ===================== STEP 4: PREVIEW (GABUNG 2 FILE) =====================
    function mapRowsForSlot(slot) {
        const usedCols = files[slot].colMapping.filter((c) => c.checked && c.mappedKey !== "abaikan");
        return files[slot].rawRows
            .map((row) => {
                const obj = {};
                usedCols.forEach((c) => { obj[c.mappedKey] = row[c.colIndex] ?? ""; });
                return obj;
            })
            .filter((row) => String(row.kecamatan || "").trim() !== "");
    }

    const [unmatchedList, setUnmatchedList] = useState([]);

    function buildPreview() {
        const data1 = mapRowsForSlot(1);
        const data2 = mapRowsForSlot(2);

        const data2ByKode = {};
        const data2ByKec = {};
        data2.forEach((r) => {
            const nk = normKode(r.kode);
            if (nk !== null) data2ByKode[nk] = r;
            data2ByKec[normKec(r.kecamatan)] = r;
        });

        const unmatched = [];

        const merged = data1.map((row1) => {
            const nk = normKode(row1.kode);
            let row2 = nk !== null ? data2ByKode[nk] : null;
            if (!row2) row2 = data2ByKec[normKec(row1.kecamatan)];

            if (!row2) unmatched.push(row1.kecamatan);

            const ada = Number(row1.ada) || 0;
            const lapor = Number(row1.lapor) || 0;

            return {
                kode: row1.kode || (row2 ? row2.kode : "-"),
                kecamatan: row1.kecamatan,
                ada, lapor,
                pctLapor: ada > 0 ? (lapor / ada) * 100 : 0,
                jumlah_anggota: row2 ? Number(row2.jumlah_anggota) || 0 : 0,
                jumlah_hadir: row2 ? Number(row2.jumlah_hadir) || 0 : 0,
                matched: !!row2,
            };
        });

        setMappedData(merged);
        setUnmatchedList(unmatched);

        if (unmatched.length > 0) {
            alert("Kecamatan berikut ada di Tabel 3A tapi tidak ditemukan di Tabel 3B (data anggota jadi 0):\n" + unmatched.join(", "));
        }

        const agg = {};
        merged.forEach((row) => {
            const kec = String(row.kecamatan || "").trim();
            agg[kec] = {
                kode: row.kode || "-",
                ada: row.ada,
                lapor: row.lapor,
                anggota: row.jumlah_anggota,
                hadir: row.jumlah_hadir,
                pctLapor: row.pctLapor,
            };
        });
        setKecamatanAgg(agg);
    }

    const totalAda = mappedData.reduce((s, r) => s + r.ada, 0);
    const totalLapor = mappedData.reduce((s, r) => s + r.lapor, 0);

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
            formData.append("file1", selectedFile1);
            formData.append("file2", selectedFile2);
            formData.append("bulan", bulan);
            formData.append("tahun", tahun);
            formData.append("rows", JSON.stringify(rowsPayload));
            formData.append("uploadedBy", storedUser?.nama || "-");
            if (storedUser?.id) formData.append("uploadedById", storedUser.id);

            await api.post("/bkb", formData, {
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
        setFiles({ 1: { ...EMPTY_FILE_STATE }, 2: { ...EMPTY_FILE_STATE } });
        setSelectedFile1(null);
        setSelectedFile2(null);
        setBulan("");
        setTahun(new Date().getFullYear());
        setMappedData([]);
        setKecamatanAgg({});
        setTargetInputs({});
        setUnmatchedList([]);
        setSaveError("");
        if (fileInputRef1.current) fileInputRef1.current.value = "";
        if (fileInputRef2.current) fileInputRef2.current.value = "";
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

            {/* STEP 1: UPLOAD (2 FILE) */}
            {currentStep === 1 && (
                <div className="step-panel active">
                    <div className="panel-head">
                        <h3>Upload File Excel SIGA</h3>
                        <p>Program BKB butuh <b>2 file Excel</b> dari SIGA: Tabel 3A (jumlah poktan) dan Tabel 3B (jumlah keluarga anggota & kehadiran)</p>
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

                    <div className="upload-grid">
                        {/* SLOT FILE 1 */}
                        <div className="upload-slot-card">
                            <div className="upload-slot-title"><span className="slot-badge">1</span> Tabel 3A BKB</div>
                            <div className="upload-slot-desc">Jumlah BKB Yang Melakukan Penyuluhan — dipakai kolom Ada & Lapor</div>

                            <div
                                className={`upload-dropzone ${dragOver1 ? "drag-over" : ""}`}
                                onClick={() => fileInputRef1.current?.click()}
                                onDragEnter={(e) => { e.preventDefault(); setDragOver1(true); }}
                                onDragOver={(e) => { e.preventDefault(); setDragOver1(true); }}
                                onDragLeave={(e) => { e.preventDefault(); setDragOver1(false); }}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    setDragOver1(false);
                                    const file = e.dataTransfer.files[0];
                                    if (file) handleFile(1, file);
                                }}
                            >
                                <div className="dz-icon"><i className="bi bi-cloud-arrow-up-fill"></i></div>
                                <p>Klik atau seret file Tabel 3A</p>
                                <small>.xlsx, .xls, .csv — maks. 10MB</small>
                            </div>
                            <input
                                type="file"
                                ref={fileInputRef1}
                                accept=".xlsx,.xls,.csv"
                                style={{ display: "none" }}
                                onChange={(e) => handleFile(1, e.target.files[0])}
                            />

                            {files[1].fileName && (
                                <div className="file-loaded-box" style={{ display: "flex" }}>
                                    <span><i className="bi bi-file-earmark-text-fill" style={{ marginRight: 6 }}></i>{files[1].fileName}</span>
                                    <button onClick={() => resetUpload(1)} title="Hapus file"><i className="bi bi-x-lg"></i></button>
                                </div>
                            )}
                        </div>

                        {/* SLOT FILE 2 */}
                        <div className="upload-slot-card">
                            <div className="upload-slot-title"><span className="slot-badge">2</span> Tabel 3B BKB</div>
                            <div className="upload-slot-desc">Jumlah Keluarga Anggota BKB Hadir Pertemuan — dipakai kolom Anggota & Capaian</div>

                            <div
                                className={`upload-dropzone ${dragOver2 ? "drag-over" : ""}`}
                                onClick={() => fileInputRef2.current?.click()}
                                onDragEnter={(e) => { e.preventDefault(); setDragOver2(true); }}
                                onDragOver={(e) => { e.preventDefault(); setDragOver2(true); }}
                                onDragLeave={(e) => { e.preventDefault(); setDragOver2(false); }}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    setDragOver2(false);
                                    const file = e.dataTransfer.files[0];
                                    if (file) handleFile(2, file);
                                }}
                            >
                                <div className="dz-icon"><i className="bi bi-cloud-arrow-up-fill"></i></div>
                                <p>Klik atau seret file Tabel 3B</p>
                                <small>.xlsx, .xls, .csv — maks. 10MB</small>
                            </div>
                            <input
                                type="file"
                                ref={fileInputRef2}
                                accept=".xlsx,.xls,.csv"
                                style={{ display: "none" }}
                                onChange={(e) => handleFile(2, e.target.files[0])}
                            />

                            {files[2].fileName && (
                                <div className="file-loaded-box" style={{ display: "flex" }}>
                                    <span><i className="bi bi-file-earmark-text-fill" style={{ marginRight: 6 }}></i>{files[2].fileName}</span>
                                    <button onClick={() => resetUpload(2)} title="Hapus file"><i className="bi bi-x-lg"></i></button>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="upload-hint-box">
                        <i className="bi bi-info-circle-fill" style={{ marginRight: 6 }}></i>Pastikan kedua file adalah hasil unduhan langsung dari SIGA untuk <b>periode (bulan) yang sama</b>, tanpa diubah struktur kolomnya.
                    </div>

                    <div className="panel-footer">
                        <span></span>
                        <button className="btn-nav next" disabled={!step1Ready} onClick={() => goToStep(2)}>
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
                        <p>Sistem memeriksa format dan kelengkapan kolom wajib pada kedua file yang diunggah</p>
                    </div>

                    <div className="validate-group-title"><i className="bi bi-file-earmark-spreadsheet-fill"></i> Tabel 3A BKB</div>
                    <div className="validate-list">
                        {validation1.map((it, i) => (
                            <div key={i} className={`validate-item ${it.ok ? "ok" : "err"}`}>
                                <div className="v-icon">{it.ok ? <i className="bi bi-check-lg"></i> : <i className="bi bi-x-lg"></i>}</div>
                                <div className="v-text">{it.text}</div>
                            </div>
                        ))}
                    </div>

                    <div className="validate-group-title"><i className="bi bi-file-earmark-spreadsheet-fill"></i> Tabel 3B BKB</div>
                    <div className="validate-list">
                        {validation2.map((it, i) => (
                            <div key={i} className={`validate-item ${it.ok ? "ok" : "err"}`}>
                                <div className="v-icon">{it.ok ? <i className="bi bi-check-lg"></i> : <i className="bi bi-x-lg"></i>}</div>
                                <div className="v-text">{it.text}</div>
                            </div>
                        ))}
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
                        <p>Sistem otomatis mendeteksi dan mencentang kolom yang dibutuhkan dari masing-masing file. Sesuaikan pemetaan kolom jika diperlukan.</p>
                    </div>

                    <div className="colselect-group-title"><i className="bi bi-file-earmark-spreadsheet-fill"></i> Tabel 3A BKB (kolom 1,2,3,4)</div>
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
                                {files[1].colMapping.map((col, i) => {
                                    const isAuto = col.mappedKey !== "abaikan";
                                    return (
                                        <tr key={i}>
                                            <td>
                                                <input
                                                    type="checkbox"
                                                    className="col-check"
                                                    checked={col.checked}
                                                    onChange={(e) => onColCheckChange(1, i, e.target.checked)}
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
                                                    onChange={(e) => onColMapChange(1, i, e.target.value)}
                                                >
                                                    {FIELDS_FILE1.map((f) => (
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

                    <div className="colselect-group-title"><i className="bi bi-file-earmark-spreadsheet-fill"></i> Tabel 3B BKB (kolom 1,2,6,7)</div>
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
                                {files[2].colMapping.map((col, i) => {
                                    const isAuto = col.mappedKey !== "abaikan";
                                    return (
                                        <tr key={i}>
                                            <td>
                                                <input
                                                    type="checkbox"
                                                    className="col-check"
                                                    checked={col.checked}
                                                    onChange={(e) => onColCheckChange(2, i, e.target.checked)}
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
                                                    onChange={(e) => onColMapChange(2, i, e.target.value)}
                                                >
                                                    {FIELDS_FILE2.map((f) => (
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
                        <h3>Preview Hasil Data (Gabungan 2 File)</h3>
                        <p>Data dari Tabel 3A dan 3B digabung berdasarkan Kode/nama kecamatan yang sama</p>
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
                            <div className="chip-value">{unmatchedList.length}</div>
                            <div className="chip-label">Kecamatan Tidak Cocok Antar File</div>
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
                                        <td>{row.ada}</td>
                                        <td>{row.lapor}</td>
                                        <td>{row.pctLapor.toFixed(2)}</td>
                                        <td className={row.matched ? "" : "warn-mismatch"}>{row.jumlah_anggota}{!row.matched && <i className="bi bi-exclamation-triangle-fill" style={{ marginLeft: 4 }}></i>}</td>
                                        <td className={row.matched ? "" : "warn-mismatch"}>{row.jumlah_hadir}{!row.matched && <i className="bi bi-exclamation-triangle-fill" style={{ marginLeft: 4 }}></i>}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {mappedData.length > 0 && (
                        <div className="debug-box" style={{ marginTop: 16, maxHeight: 160 }}>
                            DEBUG — Data mentah Tabel 3A (kode | kecamatan): {mapRowsForSlot(1).map((r) => `[${r.kode}|${r.kecamatan}]`).join(" ")}
                            {"\n\n"}
                            DEBUG — Data mentah Tabel 3B (kode | kecamatan): {mapRowsForSlot(2).map((r) => `[${r.kode}|${r.kecamatan}]`).join(" ")}
                        </div>
                    )}

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
                        <h3>Input Target Program BKB (Manual)</h3>
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
                        <h3>Perhitungan Capaian — MONEV POKTAN BKB</h3>
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
                        <h3>Data Monitoring BKB Tersimpan</h3>
                        <p>Data hasil upload, target, dan perhitungan capaian program BKB telah berhasil disimpan ke sistem.</p>
                        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                            <button onClick={handleTambahLagi}>Tambah Data Lain</button>
                            <button
                                style={{ background: "#f0f2f8", color: "#555668" }}
                                onClick={() => navigate("/admin/monitoring/bkb")}
                            >
                                Kembali ke Data BKB
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

export default AddBkbWizard;
