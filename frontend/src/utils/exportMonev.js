import ExcelJS from "exceljs";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/* ============================================================
   UTILITY EXPORT MONEV — dipakai semua program (BKR/BKB/BKL/PIK-R/UPPKA)

   Cara pakai (contoh BKR):

   const columnGroups = [
       { label: "KODE", key: "kode", rowspan: true },
       { label: "KECAMATAN", key: "kecamatan", rowspan: true, align: "left" },
       { label: "JUMLAH POKTAN", children: [
           { label: "ADA", key: "ada" },
           { label: "LAPOR", key: "lapor" },
       ]},
       { label: "%", key: "pctLapor", rowspan: true, highlight: true, decimal: 2 },
       { label: "KEHADIRAN", children: [
           { label: "ANGGOTA", key: "jumlahAnggota" },
           { label: "CAPAIAN", key: "jumlahHadir" },
       ]},
       { label: "%", key: "pctHadir", rowspan: true, highlight: true, decimal: 2 },
   ];

   exportMonevExcel({
       programLabel: "BKR",
       periodeLabel: "Desember 2025",
       columnGroups,
       rows: viewDetails,       // array data per kecamatan
       totals: viewTotals,      // object { totalAda, totalLapor, totalPctLapor, ... } — key harus sama pola "total" + Key kapital
   });
   ============================================================ */

const HEADER_BLUE = "FF1F4E78";
const YELLOW_HL = "FFFFE699";
const TOTAL_BLUE = "FFDDEBF7";
const BORDER_CYAN = "FF00B0F0";

// Ubah columnGroups jadi daftar kolom flat (buat data row) + info span buat header
function flattenColumns(columnGroups) {
    const flat = [];
    columnGroups.forEach((g) => {
        if (g.children) {
            g.children.forEach((c) => flat.push({ ...c, groupLabel: g.label }));
        } else {
            flat.push(g);
        }
    });
    return flat;
}

function totalKeyFor(col) {
    // Kalau kolom punya "totalKey" eksplisit, pakai itu — buat kasus di
    // mana nama field total nggak persis ngikutin pola otomatis
    // (misal key data-nya "jumlahAnggota" tapi field totalnya "totalAnggota",
    // bukan "totalJumlahAnggota")
    if (col.totalKey) return col.totalKey;
    return "total" + col.key.charAt(0).toUpperCase() + col.key.slice(1);
}

function formatValue(val, col) {
    if (val === null || val === undefined) return "-";
    if (col.decimal !== undefined) return Number(val).toFixed(col.decimal);
    return val;
}

/* ===================== EXCEL ===================== */
export async function exportMonevExcel({ programLabel, periodeLabel, columnGroups, rows, totals, fileName, title }) {

    const flatCols = flattenColumns(columnGroups);
    const colCount = flatCols.length;

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(`MONEV ${programLabel}`);

    const colLetter = (n) => String.fromCharCode(64 + n); // 1 -> A, 2 -> B, dst (maks 26 kolom, cukup buat kasus ini)

    const borderAll = {
        top: { style: "thin", color: { argb: BORDER_CYAN } },
        left: { style: "thin", color: { argb: BORDER_CYAN } },
        bottom: { style: "thin", color: { argb: BORDER_CYAN } },
        right: { style: "thin", color: { argb: BORDER_CYAN } },
    };

    // ===== Judul — pakai "title" custom kalau dikasih, kalau nggak
    // pakai pola standar "MONEV POKTAN {PROGRAM}" =====
    sheet.mergeCells(`A1:${colLetter(colCount)}1`);
    sheet.getCell("A1").value = title || `MONEV POKTAN ${programLabel.toUpperCase()}`;
    sheet.getCell("A1").font = { bold: true, size: 14 };
    sheet.getCell("A1").alignment = { horizontal: "center" };

    const [bulanText, tahunText] = periodeLabel.toUpperCase().split(" ");
    sheet.mergeCells(`A2:${colLetter(colCount)}2`);
    sheet.getCell("A2").value = `BULAN : ${bulanText} - ${tahunText}`;
    sheet.getCell("A2").font = { bold: true, size: 12 };
    sheet.getCell("A2").alignment = { horizontal: "center" };

    sheet.addRow([]); // baris kosong (row 3)

    // ===== Header (2 baris: row 4 = grup, row 5 = sub-kolom) =====
    const row1 = sheet.getRow(4);
    const row2 = sheet.getRow(5);

    let colIdx = 1;
    columnGroups.forEach((g) => {
        if (g.children) {
            const startCol = colIdx;
            const endCol = colIdx + g.children.length - 1;
            sheet.mergeCells(4, startCol, 4, endCol);
            row1.getCell(startCol).value = g.label;
            g.children.forEach((c, i) => {
                row2.getCell(startCol + i).value = c.label;
            });
            colIdx = endCol + 1;
        } else {
            sheet.mergeCells(4, colIdx, 5, colIdx);
            row1.getCell(colIdx).value = g.label;
            colIdx++;
        }
    });

    [row1, row2].forEach((row) => {
        for (let c = 1; c <= colCount; c++) {
            const cell = row.getCell(c);
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_BLUE } };
            cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
            cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
            cell.border = borderAll;
        }
    });

    // ===== Data rows =====
    let rowIdx = 6;
    rows.forEach((d) => {
        const row = sheet.getRow(rowIdx);
        flatCols.forEach((col, i) => {
            const cell = row.getCell(i + 1);
            cell.value = formatValue(d[col.key], col);
            cell.border = borderAll;
            cell.alignment = { horizontal: col.align || "center", vertical: "middle" };
            if (col.highlight) {
                cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: YELLOW_HL } };
            }
        });
        rowIdx++;
    });

    // ===== Baris Jumlah Total =====
    if (totals) {
        const totalRow = sheet.getRow(rowIdx);
        flatCols.forEach((col, i) => {
            const cell = totalRow.getCell(i + 1);
            if (i === 0) {
                cell.value = "";
            } else if (i === 1) {
                cell.value = "Jumlah Total";
            } else {
                const tKey = totalKeyFor(col);
                cell.value = totals[tKey] !== undefined ? formatValue(totals[tKey], col) : "";
            }
            cell.font = { bold: true };
            cell.border = borderAll;
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: TOTAL_BLUE } };
            cell.alignment = { horizontal: i === 1 ? "left" : "center", vertical: "middle" };
        });
    }

    // ===== Lebar kolom =====
    sheet.columns = flatCols.map((col) => ({
        width: col.key === "kecamatan" ? 24 : col.key === "kode" ? 8 : 12,
    }));

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName || `MONEV-${programLabel}-${bulanText}-${tahunText}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
}

/* ===================== PDF ===================== */
export function exportMonevPDF({ programLabel, periodeLabel, columnGroups, rows, totals, fileName, title }) {

    const flatCols = flattenColumns(columnGroups);
    const doc = new jsPDF({ orientation: "landscape" });

    doc.setFontSize(14);
    doc.setFont(undefined, "bold");
    doc.text(title || `MONEV POKTAN ${programLabel.toUpperCase()}`, doc.internal.pageSize.getWidth() / 2, 14, { align: "center" });

    const [bulanText, tahunText] = periodeLabel.toUpperCase().split(" ");
    doc.setFontSize(11);
    doc.text(`BULAN : ${bulanText} - ${tahunText}`, doc.internal.pageSize.getWidth() / 2, 21, { align: "center" });

    // Susun head 2 baris buat autoTable (dukung rowSpan/colSpan)
    const headRow1 = [];
    const headRow2 = [];

    columnGroups.forEach((g) => {
        if (g.children) {
            headRow1.push({ content: g.label, colSpan: g.children.length, styles: { halign: "center" } });
            g.children.forEach((c) => headRow2.push(c.label));
        } else {
            headRow1.push({ content: g.label, rowSpan: 2, styles: { halign: "center", valign: "middle" } });
        }
    });

    const body = rows.map((d) => flatCols.map((col) => formatValue(d[col.key], col)));

    if (totals) {
        const totalRowArr = flatCols.map((col, i) => {
            if (i === 0) return "";
            if (i === 1) return "Jumlah Total";
            const tKey = totalKeyFor(col);
            return totals[tKey] !== undefined ? formatValue(totals[tKey], col) : "";
        });
        body.push(totalRowArr);
    }

    const highlightColIndexes = flatCols
        .map((c, i) => (c.highlight ? i : null))
        .filter((i) => i !== null);

    autoTable(doc, {
        startY: 26,
        head: [headRow1, headRow2],
        body,
        theme: "grid",
        headStyles: { fillColor: [31, 78, 120], textColor: 255, fontStyle: "bold", halign: "center" },
        bodyStyles: { halign: "center" },
        columnStyles: Object.fromEntries(
            flatCols.map((c, i) => [i, { halign: c.align === "left" ? "left" : "center" }])
        ),
        didParseCell: (data) => {
            // Highlight kolom % kuning, kecuali baris terakhir (total) yang biru
            const isLastRow = totals && data.row.index === body.length - 1;
            if (isLastRow) {
                data.cell.styles.fillColor = [221, 235, 247];
                data.cell.styles.fontStyle = "bold";
            } else if (data.section === "body" && highlightColIndexes.includes(data.column.index)) {
                data.cell.styles.fillColor = [255, 230, 153];
            }
        },
    });

    doc.save(fileName || `MONEV-${programLabel}-${bulanText}-${tahunText}.pdf`);
}
