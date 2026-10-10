import { useEffect, useRef, useState } from 'react'
import { getCompanyProfile } from '../../services/api'
import './Header.css'

function Header() {
  const [profileOpen, setProfileOpen] = useState(false)
  const [company, setCompany] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const profileRef = useRef(null)

  let user = {}

  try {
    user = JSON.parse(
      localStorage.getItem('smartInvoiceUser') || '{}'
    )
  } catch {
    user = {}
  }

  const companyName = user.companyName || 'Business Owner'

  const initials = companyName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(word => word[0].toUpperCase())
    .join('')

  useEffect(() => {
    function handleOutsideClick(event) {
      if (
        profileRef.current &&
        !profileRef.current.contains(event.target)
      ) {
        setProfileOpen(false)
      }
    }

    function handleEscape(event) {
      if (event.key === 'Escape') {
        setProfileOpen(false)
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [])

  async function handleProfileClick() {
    const shouldOpen = !profileOpen
    setProfileOpen(shouldOpen)

    if (shouldOpen && !company) {
      setLoading(true)
      setError('')

      try {
        const data = await getCompanyProfile()
        setCompany(data)
      } catch (err) {
        setError(err.message || 'Unable to load company details')
      } finally {
        setLoading(false)
      }
    }
  }

  function handleLogout() {
    localStorage.removeItem('smartInvoiceUser')
    window.location.replace('/')
  }

  const logo = company?.logo || user.logo

  return (
    <header className="top-header">
      <div className="header-search">
        <span className="search-icon">⌕</span>
        <input
          type="text"
          placeholder="Search invoices, vendors, products..."
        />
      </div>

      <div className="header-right">
        <button
          type="button"
          className="notification-button"
          aria-label="Notifications"
        >
          🔔
          <span className="notification-dot"></span>
        </button>

        <div className="header-divider"></div>

        <div className="header-company-wrapper" ref={profileRef}>
          <button
            type="button"
            className="header-company-trigger"
            onClick={handleProfileClick}
            aria-expanded={profileOpen}
            aria-label="View company details"
          >
            <span className="header-company-avatar">
              {logo ? (
                <img src={logo} alt="" />
              ) : (
                initials || 'CO'
              )}
            </span>

            <span className="profile-info">
              <strong>{companyName}</strong>
              <span>Business Owner</span>
            </span>

            <span className="profile-arrow">
              {profileOpen ? '▴' : '▾'}
            </span>
          </button>

          {profileOpen && (
            <div className="company-profile-popover">
              {loading ? (
                <p className="company-popover-message">
                  Loading company details...
                </p>
              ) : error ? (
                <p className="company-popover-error" role="alert">
                  {error}
                </p>
              ) : (
                <>
                  <div className="company-popover-heading">
                    <span className="company-popover-avatar">
                      {company?.logo ? (
                        <img src={company.logo} alt="" />
                      ) : (
                        initials || 'CO'
                      )}
                    </span>

                    <div>
                      <strong>
                        {company?.companyName || companyName}
                      </strong>
                      <span>Company Profile</span>
                    </div>
                  </div>

                  <div className="company-popover-details">
                    <div className="company-popover-field">
                      <span>Email</span>
                      <strong>{company?.email || 'Not provided'}</strong>
                    </div>

                    <div className="company-popover-field">
                      <span>Phone</span>
                      <strong>{company?.phone || 'Not provided'}</strong>
                    </div>

                    <div className="company-popover-field">
                      <span>Address</span>
                      <strong>{company?.address || 'Not provided'}</strong>
                    </div>
                  </div>

                  <div className="company-popover-footer">
                    <span>🔒</span>
                    Company details · View only
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <button
          type="button"
          className="logout-button"
          onClick={handleLogout}
        >
          Logout
        </button>
      </div>
    </header>
  )
}

export default Header