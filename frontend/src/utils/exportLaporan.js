import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/* ============================================================
   EXPORT PDF — LAPORAN ANALITIK
   Beda dari exportMonev.js (yang niru tabel Excel mentah), ini buat
   laporan yang ada grafik + kartu insight + tabel data — dipakai di
   ketiga tab halaman Laporan (Tren Waktu, Perbandingan Kecamatan,
   Perbandingan Program).

   Cara pakai:
   exportLaporanPDF({
       title: "Tren Capaian — Kecamatan Genteng (BKB)",
       subtitle: "Persentase capaian per periode",
       canvasEl: canvasRef.current,     // elemen <canvas> chart.js yang aktif
       insights: [
           { value: "82.4%", label: "Capaian Rata-rata Periode Ini" },
           { value: "+7.2%", label: "Tren dari Awal ke Akhir Rentang" },
       ],
       tableHead: ["Periode", "Anggota", "Target", "Capaian", "% Capaian"],
       tableBody: [["Jan 2026", "2180", "2100", "1520", "72.4%"], ...],
       fileName: "laporan-tren-bkb.pdf",
   });
   ============================================================ */

export function exportLaporanPDF({ title, subtitle, canvasEl, insights, tableHead, tableBody, fileName }) {

    const doc = new jsPDF({ orientation: "landscape" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const marginX = 12;

    // ===== Header =====
    doc.setFontSize(16);
    doc.setFont(undefined, "bold");
    doc.setTextColor(20, 20, 40);
    doc.text(title || "Laporan", pageWidth / 2, 16, { align: "center" });

    let y = 22;

    if (subtitle) {
        doc.setFontSize(10);
        doc.setFont(undefined, "normal");
        doc.setTextColor(120, 120, 130);
        doc.text(subtitle, pageWidth / 2, y, { align: "center" });
        y += 6;
    }

    doc.setDrawColor(230, 230, 235);
    doc.line(marginX, y, pageWidth - marginX, y);
    y += 8;

    // ===== Kartu Insight (disederhanakan jadi teks berjajar) =====
    if (insights && insights.length > 0) {
        const boxWidth = (pageWidth - marginX * 2) / insights.length;

        insights.forEach((ins, i) => {
            const x = marginX + i * boxWidth;

            doc.setFontSize(13);
            doc.setFont(undefined, "bold");
            doc.setTextColor(21, 101, 192);
            doc.text(String(ins.value), x + 4, y + 6);

            doc.setFontSize(8.5);
            doc.setFont(undefined, "normal");
            doc.setTextColor(120, 120, 130);
            const labelLines = doc.splitTextToSize(ins.label, boxWidth - 10);
            doc.text(labelLines, x + 4, y + 12);
        });

        y += 24;
    }

    // ===== Grafik (screenshot canvas Chart.js jadi gambar) =====
    if (canvasEl) {
        try {
            const imgData = canvasEl.toDataURL("image/png", 1.0);
            const imgWidth = pageWidth - marginX * 2;
            const aspect = canvasEl.height / canvasEl.width;
            let imgHeight = imgWidth * aspect;

            const maxHeight = 95;
            if (imgHeight > maxHeight) {
                imgHeight = maxHeight;
            }

            doc.addImage(imgData, "PNG", marginX, y, imgWidth, imgHeight);
            y += imgHeight + 10;
        } catch (err) {
            console.error("Gagal nangkep gambar grafik:", err);
        }
    }

    // ===== Tabel data =====
    if (tableHead && tableBody && tableBody.length > 0) {
        autoTable(doc, {
            startY: y,
            head: [tableHead],
            body: tableBody,
            theme: "grid",
            headStyles: { fillColor: [31, 78, 120], textColor: 255, fontStyle: "bold", halign: "center", fontSize: 9 },
            bodyStyles: { halign: "center", fontSize: 8.5 },
            margin: { left: marginX, right: marginX },
        });
    }

    // ===== Footer =====
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 160);
        doc.text(
            `Dicetak ${new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })} — Monitoring Poktan Dinsos PPKB Banyuwangi`,
            marginX,
            doc.internal.pageSize.getHeight() - 8
        );
    }

    doc.save(fileName || `laporan-${Date.now()}.pdf`);
}
