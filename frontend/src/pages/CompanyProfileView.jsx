import { useEffect, useState } from 'react'
import { getCompanyProfile } from '../services/api'
import './CompanyProfileView.css'

function CompanyProfileView() {
  const [company, setCompany] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadProfile() {
      try {
        const data = await getCompanyProfile()
        setCompany(data)
      } catch (err) {
        setError(err.message || 'Failed to load company profile')
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [])

  if (loading) {
    return (
      <div className="company-profile-page">
        <div className="company-profile-loading">
          Loading company profile...
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="company-profile-page">
        <div className="company-profile-error" role="alert">
          <strong>Unable to load profile</strong>
          <p>{error}</p>
        </div>
      </div>
    )
  }

  if (!company) {
    return (
      <div className="company-profile-page">
        <div className="company-profile-error">
          Company profile not found.
        </div>
      </div>
    )
  }

  const initials = (company.companyName || 'Company')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(word => word[0].toUpperCase())
    .join('')

  const fields = [
    {
      label: 'Company Name',
      value: company.companyName,
      icon: '🏢',
    },
    {
      label: 'Email Address',
      value: company.email,
      icon: '✉️',
    },
    {
      label: 'Phone Number',
      value: company.phone,
      icon: '☎️',
    },
    {
      label: 'Business Address',
      value: company.address,
      icon: '📍',
      fullWidth: true,
    },
  ]

  return (
    <div className="company-profile-page">
      <div className="company-profile-heading">
        <div>
          <span className="company-profile-eyebrow">
            ACCOUNT SETTINGS
          </span>
          <h1>Company Profile</h1>
          <p>
            View your registered business information.
          </p>
        </div>

        <span className="company-profile-badge">
          <span className="company-profile-status-dot" />
          Registered Company
        </span>
      </div>

      <section className="company-profile-card">
        <div className="company-profile-banner" />

        <div className="company-profile-identity">
          <div className="company-profile-avatar">
            {company.logo ? (
              <img
                src={company.logo}
                alt={`${company.companyName || 'Company'} logo`}
              />
            ) : (
              initials || 'CO'
            )}
          </div>

          <div className="company-profile-identity-text">
            <h2>{company.companyName || 'Company Name'}</h2>
            <p>{company.email || 'Email not provided'}</p>
          </div>

          <span className="company-profile-view-label">
            <span aria-hidden="true">🔒</span> View only
          </span>
        </div>

        <div className="company-profile-section">
          <h3>Business Information</h3>
          <p className="company-profile-section-description">
            Your company details associated with this account.
          </p>

          <div className="company-profile-grid">
            {fields.map(field => (
              <div
                className={`company-profile-field ${
                  field.fullWidth ? 'full-width' : ''
                }`}
                key={field.label}
              >
                <div className="company-profile-field-icon">
                  {field.icon}
                </div>

                <div className="company-profile-field-content">
                  <span>{field.label}</span>
                  <strong>
                    {field.value || 'Not provided'}
                  </strong>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="company-profile-footer">
          <span className="company-profile-lock">🔐</span>
          <p>
            These details belong to your logged-in company.
            Profile editing is not available on this page.
          </p>
        </div>
      </section>
    </div>
  )
}

export default CompanyProfileView