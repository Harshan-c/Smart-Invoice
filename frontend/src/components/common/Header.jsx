import './Header.css'

function Header() {
  return (
    <header className="top-header">

      {/* Search */}

      <div className="header-search">

        <span className="search-icon">
          ⌕
        </span>

        <input
          type="text"
          placeholder="Search invoices, vendors, products..."
        />

      </div>

      {/* Right side */}

      <div className="header-right">

        <button
          type="button"
          className="notification-button"
        >
          🔔
          <span className="notification-dot"></span>
        </button>

        <div className="header-divider"></div>

        <div className="profile">

          <div className="profile-avatar">
            HS
          </div>

          <div className="profile-info">

            <strong>
              Harshan Shetty
            </strong>

            <span>
              Business Owner
            </span>

          </div>

          <span className="profile-arrow">
            ▾
          </span>

        </div>

      </div>

    </header>
  )
}

export default Header