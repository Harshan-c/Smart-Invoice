
import { useEffect, useState } from 'react'
import { Navigate, Outlet } from 'react-router-dom'

function getSession() {
  try {
    const raw = localStorage.getItem('smartInvoiceUser')
    if (!raw) return null

    const user = JSON.parse(raw)
    const token = user?.accessToken

    if (!token) return null

    const parts = token.split('.')
    if (parts.length !== 3) return null

    const payload = JSON.parse(
      atob(
        parts[1]
          .replace(/-/g, '+')
          .replace(/_/g, '/') +
        '='.repeat((4 - parts[1].length % 4) % 4)
      )
    )

    if (!payload.exp || payload.exp * 1000 <= Date.now()) {
      return null
    }

    return {
      token,
      companyId: String(user.companyId ?? '')
    }
  } catch {
    return null
  }
}

function ProtectedRoute() {
  const [allowed, setAllowed] = useState(() => {
    const session = getSession()

    if (!session) return false

    const previousCompany = sessionStorage.getItem(
      'smartInvoiceTabCompanyId'
    )

    if (
      previousCompany &&
      previousCompany !== session.companyId
    ) {
      sessionStorage.setItem('smartInvoiceTabBlocked', 'true')
      return false
    }

    if (sessionStorage.getItem('smartInvoiceTabBlocked') === 'true') {
      return false
    }

    sessionStorage.setItem(
      'smartInvoiceTabCompanyId',
      session.companyId
    )

    return true
  })

  useEffect(() => {
    function checkSession(event) {
      const session = getSession()

      if (!session) {
        setAllowed(false)
        return
      }

      const previousCompany = sessionStorage.getItem(
        'smartInvoiceTabCompanyId'
      )

      if (
        event?.key === 'smartInvoiceUser' &&
        previousCompany &&
        previousCompany !== session.companyId
      ) {
        sessionStorage.setItem('smartInvoiceTabBlocked', 'true')
        setAllowed(false)
        return
      }

      if (sessionStorage.getItem('smartInvoiceTabBlocked') === 'true') {
        setAllowed(false)
        return
      }

      setAllowed(true)
    }

    window.addEventListener('storage', checkSession)
    window.addEventListener('focus', checkSession)

    return () => {
      window.removeEventListener('storage', checkSession)
      window.removeEventListener('focus', checkSession)
    }
  }, [])

  return allowed
    ? <Outlet />
    : <Navigate to="/" replace />
}

export default ProtectedRoute
