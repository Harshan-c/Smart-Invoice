
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { companyLogin } from '../services/api'
import './Login.css'

function Login() {
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoggingIn, setIsLoggingIn] = useState(false)

  async function handleLogin(event) {
    event.preventDefault()

    setError('')

    try {
      setIsLoggingIn(true)

      const data = await companyLogin({
        email,
        password
      })

      // Validate the login response
      if (!data.accessToken || !data.company) {
        throw new Error('Invalid login response from server')
      }

      if (!data.company.id) {
        throw new Error('Company ID is missing from login response')
      }

      // Store JWT token and company details
      localStorage.setItem(
        'smartInvoiceUser',
        JSON.stringify({
          accessToken: data.accessToken,
          companyId: data.company.id,
          companyName: data.company.companyName,
          email: data.company.email,
          phone: data.company.phone,
          address: data.company.address,
          logo: data.company.logo
        })
      )

      // Clear stale authentication state for this tab
      sessionStorage.removeItem('smartInvoiceTabBlocked')
      sessionStorage.setItem(
        'smartInvoiceTabCompanyId',
        String(data.company.id)
      )

      // Navigate to dashboard
      navigate('/dashboard')

    } catch (error) {
      console.error('Login error:', error)
      setError(error.message || 'Invalid email or password')
    } finally {
      setIsLoggingIn(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">

        <div className="login-header">
          <h1>SmartInvoice</h1>
          <p>Company Login</p>
        </div>

        <form onSubmit={handleLogin}>
          <div className="login-field">
            <label>Email</label>

            <input
              type="email"
              placeholder="Enter company email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>

          <div className="login-field">
            <label>Password</label>

            <input
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>

          {error && (
            <p className="login-error">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="login-button"
            disabled={isLoggingIn}
          >
            {isLoggingIn ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="login-footer">
          <p>Don't have a company profile?</p>

          <button
            type="button"
            onClick={() => navigate('/create-profile')}
            className="create-profile-button"
          >
            Create Company Profile
          </button>
        </div>

      </div>
    </div>
  )
}

export default Login
