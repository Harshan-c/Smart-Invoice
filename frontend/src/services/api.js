
const API_URL = 'http://127.0.0.1:8000'

// =========================================================
// AUTHENTICATION HELPERS
// =========================================================

function getCompanySession() {
  let user

  try {
    user = JSON.parse(localStorage.getItem('smartInvoiceUser'))
  } catch {
    throw new Error('Invalid company session. Please log in again.')
  }

  if (!user?.companyId) {
    throw new Error('Company session not found. Please log in again.')
  }

  if (!user?.accessToken) {
    throw new Error('Access token not found. Please log in again.')
  }

  return user
}

function getAuthHeaders(includeJson = false) {
  const user = getCompanySession()

  return {
    ...(includeJson ? { 'Content-Type': 'application/json' } : {}),
    'X-Company-ID': user.companyId,
    Authorization: `Bearer ${user.accessToken}`
  }
}

// =========================================================
// BASIC API
// =========================================================

export async function getMessage() {
  const response = await fetch(`${API_URL}/api/message`)
  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.detail || 'Failed to load message')
  }

  return data
}

// =========================================================
// INVOICE OCR UPLOAD
// =========================================================

export async function uploadInvoice(file) {
  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch(`${API_URL}/api/invoices/upload`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: formData
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.detail || 'Failed to upload invoice')
  }

  return data
}

// =========================================================
// SALES INVOICE
// =========================================================

export async function createInvoice(invoiceData) {
  const response = await fetch(`${API_URL}/api/invoices`, {
    method: 'POST',
    headers: getAuthHeaders(true),
    body: JSON.stringify(invoiceData)
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.detail || 'Failed to create invoice')
  }

  return data
}

// =========================================================
// GET COMPANY INVOICES
// =========================================================

export async function getInvoices() {
  const response = await fetch(`${API_URL}/api/invoices`, {
    method: 'GET',
    headers: getAuthHeaders()
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.detail || 'Failed to load invoices')
  }

  return data
}

// =========================================================
// GET SINGLE COMPANY INVOICE
// =========================================================

export async function getInvoice(invoiceId) {
  const response = await fetch(`${API_URL}/api/invoices/${invoiceId}`, {
    method: 'GET',
    headers: getAuthHeaders()
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.detail || 'Failed to load invoice')
  }

  return data
}

// =========================================================
// UPDATE INVOICE PAYMENT
// =========================================================

export async function updateInvoicePayment(invoiceId, payment) {
  const response = await fetch(
    `${API_URL}/api/invoices/${invoiceId}/payment`,
    {
      method: 'PATCH',
      headers: getAuthHeaders(true),
      body: JSON.stringify(payment)
    }
  )

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.detail || 'Failed to update payment')
  }

  return data
}

// =========================================================
// DELETE INVOICE
// =========================================================

export async function deleteInvoice(invoiceId) {
  const response = await fetch(`${API_URL}/api/invoices/${invoiceId}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.detail || 'Failed to delete invoice')
  }

  return data
}

// =========================================================
// PURCHASE INVOICE
// =========================================================

export async function savePurchaseInvoice(invoiceData) {
  const response = await fetch(`${API_URL}/api/purchase-invoices`, {
    method: 'POST',
    headers: getAuthHeaders(true),
    body: JSON.stringify(invoiceData)
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.detail || 'Failed to save purchase invoice')
  }

  return data
}

// =========================================================
// VENDORS
// =========================================================

export async function createVendor(vendorData) {
  const response = await fetch(`${API_URL}/api/vendors`, {
    method: 'POST',
    headers: getAuthHeaders(true),
    body: JSON.stringify(vendorData)
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.detail || 'Failed to create vendor')
  }

  return data
}

export async function getVendors() {
  const response = await fetch(`${API_URL}/api/vendors`, {
    method: 'GET',
    headers: getAuthHeaders()
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.detail || 'Failed to load vendors')
  }

  return data
}

export async function updateVendor(vendorId, vendorData) {
  const response = await fetch(`${API_URL}/api/vendors/${vendorId}`, {
    method: 'PUT',
    headers: getAuthHeaders(true),
    body: JSON.stringify(vendorData)
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.detail || 'Failed to update vendor')
  }

  return data
}

export async function deleteVendor(vendorId) {
  const response = await fetch(`${API_URL}/api/vendors/${vendorId}`, {
    method: 'DELETE',
    headers: getAuthHeaders()
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.detail || 'Failed to delete vendor')
  }

  return data
}

// =========================================================
// DASHBOARD
// =========================================================

export async function getDashboard() {
  const response = await fetch(`${API_URL}/api/dashboard`, {
    headers: getAuthHeaders()
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.detail || 'Failed to load dashboard data')
  }

  return data
}

// =========================================================
// COMPANY PROFILE
// =========================================================

export async function createCompanyProfile(companyData) {
  const response = await fetch(`${API_URL}/api/company/profile`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(companyData)
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(
      data.detail || 'Failed to create company profile'
    )
  }

  return data
}

export async function getCompanyProfile() {
  const response = await fetch(`${API_URL}/api/company/profile`, {
    headers: getAuthHeaders()
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.detail || 'Failed to load company profile')
  }

  return data
}

export async function updateCompanyProfile(companyData) {
  const response = await fetch(`${API_URL}/api/company/profile`, {
    method: 'PUT',
    headers: getAuthHeaders(true),
    body: JSON.stringify(companyData)
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.detail || 'Failed to update company profile')
  }

  return data
}

// =========================================================
// COMPANY LOGIN
// =========================================================

export async function companyLogin(loginData) {
  const response = await fetch(`${API_URL}/api/company/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(loginData)
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.detail || 'Login failed')
  }

  return data
}
