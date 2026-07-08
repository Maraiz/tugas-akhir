import "../../styles/header.css";

function Header({ title, breadcrumb }) {

    const today = new Date().toLocaleDateString("id-ID", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
    });

    return (
        <header className="app-header">
            <div className="header-left">
                <h2>{title}</h2>
                <div className="breadcrumb">
                    Beranda › <span>{breadcrumb}</span>
                </div>
            </div>

            <div className="header-right">
                <div className="header-date">{today}</div>

                <button className="btn-notif">
                    🔔
                    <span className="notif-badge"></span>
                </button>

                <div className="header-profile">
                    <div className="h-avatar">AD</div>
                    <div className="h-profile-info">
                        <h4>Admin Dinas</h4>
                        <span>Administrator</span>
                    </div>
                </div>
            </div>
        </header>
    );
}

export default Header;
