// Halaman Laporan User "pinjam" komponen yang sama persis dari Admin —
// LaporanContent.jsx udah read-only sepenuhnya dari awal (nggak ada
// tombol Tambah/Edit/Hapus), dan endpoint backend-nya (/laporan/opsi,
// /laporan/tren, /laporan/ranking, /laporan/program) juga nggak peduli
// role, asal login. Jadi nggak perlu duplikat kode sama sekali — cukup
// re-export komponennya di path User.
import LaporanContent from "../../components/admin/laporan/LaporanContent";

function LaporanUser() {
    return <LaporanContent />;
}

export default LaporanUser;