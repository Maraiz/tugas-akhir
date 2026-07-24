import { useState, useEffect, useRef } from "react";
import api from "../../../services/api";
import "../../../styles/profilUser.css";

const ROLE_LABEL = {
    admin: "Administrator",
    petugas: "Petugas",
    user: "User",
};

function initials(name) {
    if (!name) return "??";
    return name.split(" ").map((w) => w[0]).join("").substring(0, 2).toUpperCase();
}

function ProfileContent() {

    const fileInputRef = useRef(null);

    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState("");

    // ===== Form info profil =====
    const [form, setForm] = useState({ nama: "", username: "", email: "" });
    const [fotoFile, setFotoFile] = useState(null);
    const [fotoPreview, setFotoPreview] = useState(null);
    const [savingProfile, setSavingProfile] = useState(false);
    const [profileError, setProfileError] = useState("");
    const [profileSuccess, setProfileSuccess] = useState("");

    // ===== Form ganti password =====
    const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
    const [savingPassword, setSavingPassword] = useState(false);
    const [pwError, setPwError] = useState("");
    const [pwSuccess, setPwSuccess] = useState("");
    const [showPw, setShowPw] = useState(false);

    async function fetchProfile() {
        setLoading(true);
        setLoadError("");
        try {
            const res = await api.get("/profile/me");
            const data = res.data.data;
            setProfile(data);
            setForm({ nama: data.nama || "", username: data.username || "", email: data.email || "" });
        } catch (error) {
            console.error(error);
            setLoadError(error.response?.data?.message || "Gagal memuat data profil.");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchProfile();
    }, []);

    function handleFotoChange(e) {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith("image/")) {
            setProfileError("File harus berupa gambar (JPG/PNG).");
            return;
        }

        if (file.size > 2 * 1024 * 1024) {
            setProfileError("Ukuran file maksimal 2MB.");
            return;
        }

        setProfileError("");
        setFotoFile(file);
        setFotoPreview(URL.createObjectURL(file));
    }

    async function saveProfile() {
        setProfileError("");
        setProfileSuccess("");

        if (!form.nama) {
            setProfileError("Nama wajib diisi.");
            return;
        }

        setSavingProfile(true);

        try {

            const formData = new FormData();
            formData.append("nama", form.nama);
            formData.append("username", form.username);
            formData.append("email", form.email);
            if (fotoFile) formData.append("foto", fotoFile);

            const res = await api.put("/profile", formData);

            const updated = res.data.data;
            setProfile(updated);
            setFotoFile(null);
            setFotoPreview(null);
            setProfileSuccess("Profil berhasil diperbarui.");

            const storedUser = JSON.parse(localStorage.getItem("user") || "null");
            if (storedUser) {
                localStorage.setItem("user", JSON.stringify({ ...storedUser, nama: updated.nama, username: updated.username }));
            }

            setTimeout(() => window.location.reload(), 900);

        } catch (error) {
            console.error(error);
            setProfileError(error.response?.data?.message || "Gagal menyimpan profil.");
        } finally {
            setSavingProfile(false);
        }
    }

    async function savePassword() {
        setPwError("");
        setPwSuccess("");

        if (!pwForm.currentPassword || !pwForm.newPassword) {
            setPwError("Password lama dan password baru wajib diisi.");
            return;
        }

        if (pwForm.newPassword.length < 6) {
            setPwError("Password baru minimal 6 karakter.");
            return;
        }

        if (pwForm.newPassword !== pwForm.confirmPassword) {
            setPwError("Konfirmasi password baru tidak cocok.");
            return;
        }

        setSavingPassword(true);

        try {

            await api.put("/profile/password", {
                currentPassword: pwForm.currentPassword,
                newPassword: pwForm.newPassword,
            });

            setPwSuccess("Password berhasil diubah.");
            setPwForm({ currentPassword: "", newPassword: "", confirmPassword: "" });

        } catch (error) {
            console.error(error);
            setPwError(error.response?.data?.message || "Gagal mengubah password.");
        } finally {
            setSavingPassword(false);
        }
    }

    if (loading) {
        return <div style={{ textAlign: "center", padding: 60, color: "#9090a8" }}>Memuat profil...</div>;
    }

    if (loadError) {
        return (
            <div className="upf-card" style={{ textAlign: "center", padding: 40 }}>
                <i className="bi bi-exclamation-triangle-fill" style={{ fontSize: 28, color: "#e53935" }}></i>
                <p style={{ color: "#c62828", margin: "12px 0 16px" }}>{loadError}</p>
                <button className="upf-btn-secondary" onClick={fetchProfile}>Coba Lagi</button>
            </div>
        );
    }

    const fileServerRoot = api.defaults.baseURL.replace(/\/api\/?$/, "");
    const fotoSrc = fotoPreview || (profile.foto ? `${fileServerRoot}/${profile.foto}` : null);

    return (
        <>
            <div className="upf-greeting">
                <h1>Profil Saya</h1>
                <p>Kelola informasi akun dan keamanan login kamu</p>
            </div>

            <div className="upf-grid">

                {/* ===== KARTU FOTO & INFO SINGKAT ===== */}
                <div className="upf-card upf-side-card">
                    <div className="upf-avatar-wrap">
                        {fotoSrc ? (
                            <img src={fotoSrc} alt="Foto profil" className="upf-avatar-img" />
                        ) : (
                            <div className="upf-avatar-fallback">{initials(profile.nama)}</div>
                        )}
                        <button
                            className="upf-avatar-edit-btn"
                            onClick={() => fileInputRef.current?.click()}
                            title="Ganti foto"
                        >
                            <i className="bi bi-camera-fill"></i>
                        </button>
                        <input
                            type="file"
                            accept="image/*"
                            ref={fileInputRef}
                            style={{ display: "none" }}
                            onChange={handleFotoChange}
                        />
                    </div>
                    <h3 className="upf-side-name">{profile.nama}</h3>
                    <span className="upf-side-role">{ROLE_LABEL[profile.role] || profile.role}</span>

                    <div className="upf-side-info-list">
                        <div className="upf-side-info-item">
                            <i className="bi bi-at"></i>
                            <span>{profile.username || "-"}</span>
                        </div>
                        <div className="upf-side-info-item">
                            <i className="bi bi-credit-card-2-front-fill"></i>
                            <span>{profile.nip || "-"}</span>
                        </div>
                        <div className="upf-side-info-item">
                            <i className="bi bi-envelope-fill"></i>
                            <span>{profile.email || "Belum diisi"}</span>
                        </div>
                        {profile.kecamatan && (
                            <div className="upf-side-info-item">
                                <i className="bi bi-geo-alt-fill"></i>
                                <span>{profile.kecamatan}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* ===== KOLOM KANAN: FORM ===== */}
                <div className="upf-main-col">

                    {/* ===== EDIT INFORMASI PROFIL ===== */}
                    <div className="upf-card">
                        <div className="upf-card-head">
                            <i className="bi bi-person-vcard-fill"></i>
                            <h3>Informasi Profil</h3>
                        </div>

                        {profileError && (
                            <div className="upf-alert error">
                                <i className="bi bi-exclamation-triangle-fill"></i>{profileError}
                            </div>
                        )}
                        {profileSuccess && (
                            <div className="upf-alert success">
                                <i className="bi bi-check-circle-fill"></i>{profileSuccess}
                            </div>
                        )}

                        <div className="upf-form-group">
                            <label><i className="bi bi-person-fill"></i>Nama Lengkap</label>
                            <input
                                type="text"
                                value={form.nama}
                                onChange={(e) => setForm({ ...form, nama: e.target.value })}
                                placeholder="Masukkan nama lengkap"
                            />
                        </div>

                        <div className="upf-form-row">
                            <div className="upf-form-group">
                                <label><i className="bi bi-at"></i>Username</label>
                                <input
                                    type="text"
                                    value={form.username}
                                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                                    placeholder="Masukkan username"
                                />
                            </div>
                            <div className="upf-form-group">
                                <label><i className="bi bi-envelope-fill"></i>Email</label>
                                <input
                                    type="email"
                                    value={form.email}
                                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                                    placeholder="nama@contoh.com"
                                />
                            </div>
                        </div>

                        <div className="upf-form-footer">
                            <button className="upf-btn-primary" onClick={saveProfile} disabled={savingProfile}>
                                {savingProfile ? "Menyimpan..." : (<><i className="bi bi-check-circle-fill"></i> Simpan Perubahan</>)}
                            </button>
                        </div>
                    </div>

                    {/* ===== GANTI PASSWORD ===== */}
                    <div className="upf-card">
                        <div className="upf-card-head">
                            <i className="bi bi-shield-lock-fill"></i>
                            <h3>Ganti Password</h3>
                        </div>

                        {pwError && (
                            <div className="upf-alert error">
                                <i className="bi bi-exclamation-triangle-fill"></i>{pwError}
                            </div>
                        )}
                        {pwSuccess && (
                            <div className="upf-alert success">
                                <i className="bi bi-check-circle-fill"></i>{pwSuccess}
                            </div>
                        )}

                        <div className="upf-form-group">
                            <label><i className="bi bi-key-fill"></i>Password Lama</label>
                            <input
                                type={showPw ? "text" : "password"}
                                value={pwForm.currentPassword}
                                onChange={(e) => setPwForm({ ...pwForm, currentPassword: e.target.value })}
                                placeholder="Masukkan password saat ini"
                            />
                        </div>

                        <div className="upf-form-row">
                            <div className="upf-form-group">
                                <label><i className="bi bi-lock-fill"></i>Password Baru</label>
                                <input
                                    type={showPw ? "text" : "password"}
                                    value={pwForm.newPassword}
                                    onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })}
                                    placeholder="Minimal 6 karakter"
                                />
                            </div>
                            <div className="upf-form-group">
                                <label><i className="bi bi-lock-fill"></i>Konfirmasi Password Baru</label>
                                <input
                                    type={showPw ? "text" : "password"}
                                    value={pwForm.confirmPassword}
                                    onChange={(e) => setPwForm({ ...pwForm, confirmPassword: e.target.value })}
                                    placeholder="Ulangi password baru"
                                />
                            </div>
                        </div>

                        <label className="upf-show-pw-toggle">
                            <input type="checkbox" checked={showPw} onChange={(e) => setShowPw(e.target.checked)} />
                            Tampilkan password
                        </label>

                        <div className="upf-form-footer">
                            <button className="upf-btn-primary danger" onClick={savePassword} disabled={savingPassword}>
                                {savingPassword ? "Menyimpan..." : (<><i className="bi bi-shield-check"></i> Ubah Password</>)}
                            </button>
                        </div>
                    </div>

                </div>

            </div>
        </>
    );
}

export default ProfileContent;
