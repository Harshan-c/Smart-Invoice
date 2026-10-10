import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createCompanyProfile } from '../services/api'
import './CompanyProfile.css'

function CompanyProfile() {
  const navigate = useNavigate()

  const [company, setCompany] = useState({
    companyName: '',
    logo: '',
    phone: '',
    email: '',
    address: '',
    gstin: '',
    pan: '',
    state: '',
    password: ''
  })

  const [logoPreview, setLogoPreview] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  function handleChange(event) {
    const { name, value } = event.target

    setCompany(previous => ({
      ...previous,
      [name]: value
    }))
  }

  function handleLogoChange(event) {
    const file = event.target.files[0]

    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file.')
      return
    }

    const reader = new FileReader()

    reader.onloadend = () => {
      const logoData = reader.result

      setLogoPreview(logoData)

      setCompany(previous => ({
        ...previous,
        logo: logoData
      }))
    }

    reader.readAsDataURL(file)
  }

  async function handleCreateProfile(event) {
    event.preventDefault()

    setError('')
    setMessage('')

    if (!company.companyName.trim()) {
      setError('Company name is required.')
      return
    }

    if (company.password.length < 6) {
      setError('Password must be at least 6 characters long.')
      return
    }

    try {
      setIsSaving(true)

      const data = await createCompanyProfile(company)

      setMessage(
        data.message || 'Company profile created successfully.'
      )

      setTimeout(() => {
        navigate('/')
      }, 1000)

    } catch (error) {
      console.error('Company profile error:', error)

      setError(
        error.message ||
        'Failed to create company profile.'
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="company-profile-page">

      <div className="company-profile-card">

        <div className="company-profile-header">

          <div className="company-profile-brand">
            SmartInvoice
          </div>

          <h1>Create Company Profile</h1>

          <p>
            Set up your company details once and use them
            automatically in your invoices.
          </p>

        </div>


        <form
          className="company-profile-form"
          onSubmit={handleCreateProfile}
        >

          {/* LOGO */}

          <div className="company-logo-section">

            <div className="company-logo-preview">

              {logoPreview ? (
                <img
                  src={logoPreview}
                  alt="Company logo preview"
                />
              ) : (
                <span>LOGO</span>
              )}

            </div>

            <div className="company-logo-content">

              <label>
                Company Logo
              </label>

              <p>
                Upload your company logo.
              </p>

              <input
                type="file"
                accept="image/*"
                onChange={handleLogoChange}
              />

            </div>

          </div>


          {/* COMPANY NAME */}

          <div className="company-profile-field full">

            <label>
              Company Name
            </label>

            <input
              type="text"
              name="companyName"
              placeholder="Enter company name"
              value={company.companyName}
              onChange={handleChange}
              required
            />

          </div>


          {/* PHONE */}

          <div className="company-profile-grid">

            <div className="company-profile-field">

              <label>
                Phone
              </label>

              <input
                type="tel"
                name="phone"
                placeholder="Enter phone number"
                value={company.phone}
                onChange={handleChange}
              />

            </div>


            {/* EMAIL */}

            <div className="company-profile-field">

              <label>
                Email
              </label>

              <input
                type="email"
                name="email"
                placeholder="Enter company email"
                value={company.email}
                onChange={handleChange}
              />

            </div>

          </div>


          {/* ADDRESS */}

          <div className="company-profile-field full">

            <label>
              Address
            </label>

            <textarea
              name="address"
              placeholder="Enter company address"
              value={company.address}
              onChange={handleChange}
              rows="3"
            />

          </div>


          {/* GSTIN + PAN */}

          <div className="company-profile-grid">

            <div className="company-profile-field">

              <label>
                GSTIN
              </label>

              <input
                type="text"
                name="gstin"
                placeholder="Enter GSTIN"
                value={company.gstin}
                onChange={handleChange}
              />

            </div>


            <div className="company-profile-field">

              <label>
                PAN
              </label>

              <input
                type="text"
                name="pan"
                placeholder="Enter PAN"
                value={company.pan}
                onChange={handleChange}
              />

            </div>

          </div>


          {/* STATE */}

          <div className="company-profile-field full">

            <label>
              State
            </label>

            <select
              name="state"
              value={company.state}
              onChange={handleChange}
            >

              <option value="">
                Select Company State
              </option>

              <option value="Andhra Pradesh">
                Andhra Pradesh
              </option>

              <option value="Delhi">
                Delhi
              </option>

              <option value="Karnataka">
                Karnataka
              </option>

              <option value="Kerala">
                Kerala
              </option>

              <option value="Maharashtra">
                Maharashtra
              </option>

              <option value="Tamil Nadu">
                Tamil Nadu
              </option>

              <option value="Telangana">
                Telangana
              </option>

              <option value="West Bengal">
                West Bengal
              </option>

            </select>

          </div>

          {/* PASSWORD */}
          <div className="company-profile-field full">

            <label>
                Password
            </label>

            <input
                type="password"
                name="password"
                placeholder="Create a password"
                value={company.password}
                onChange={handleChange}
                required
            />

          </div>

          {/* MESSAGE */}

          {error && (
            <div className="company-profile-message error">
              {error}
            </div>
          )}

          {message && (
            <div className="company-profile-message success">
              {message}
            </div>
          )}


          {/* BUTTON */}

          <button
            type="submit"
            className="company-profile-button"
            disabled={isSaving}
          >

            {isSaving
              ? 'Creating Profile...'
              : 'Create Company Profile'}

          </button>


          <button
            type="button"
            className="company-profile-back"
            onClick={() => navigate('/')}
          >
            Back to Login
          </button>

        </form>

      </div>

    </div>
  )
}

export default CompanyProfile