const API_URL = 'http://127.0.0.1:8000'

export async function getMessage() {
  const response = await fetch(
    `${API_URL}/api/message`
  )

  const data = await response.json()

  return data
}

export async function uploadInvoice(file) {
  const formData = new FormData()

  formData.append('file', file)

  const response = await fetch(
    `${API_URL}/api/invoices/upload`,
    {
      method: 'POST',
      body: formData
    }
  )

  const data = await response.json()

  return data
}

export async function createInvoice(invoiceData) {
  const response = await fetch(
    `${API_URL}/api/invoices`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(invoiceData)
    }
  )

  const data = await response.json()

  return data
}

export async function getInvoices() {
  const response = await fetch(
    `${API_URL}/api/invoices`
  )

  const data = await response.json()

  return data
}
export async function getInvoice(invoiceId) {
  const response = await fetch(
    `${API_URL}/api/invoices/${invoiceId}`
  )

  if (!response.ok) {
    throw new Error(
      'Failed to load invoice'
    )
  }

  const data = await response.json()

  return data
}
export async function updateInvoicePayment(
  invoiceId,
  payment
) {
  const response = await fetch(
    `${API_URL}/api/invoices/${invoiceId}/payment`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payment)
    }
  )

  if (!response.ok) {
    throw new Error(
      'Failed to update payment details'
    )
  }

  const data = await response.json()

  return data
}

export async function deleteInvoice(invoiceId) {
  const response = await fetch(
    `${API_URL}/api/invoices/${invoiceId}`,
    {
      method: 'DELETE'
    }
  )

  if (!response.ok) {
    throw new Error('Failed to delete invoice')
  }

  const data = await response.json()
  return data
}

export async function savePurchaseInvoice(invoiceData) {
  const response = await fetch(
    'http://127.0.0.1:8000/api/purchase-invoices',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(invoiceData)
    }
  )

  if (!response.ok) {
    throw new Error('Failed to save purchase invoice')
  }

  return await response.json()
}

export async function createVendor(vendorData) {
  const response = await fetch(
    'http://127.0.0.1:8000/api/vendors',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(vendorData)
    }
  )

  if (!response.ok) {
    throw new Error('Failed to save vendor')
  }

  return await response.json()
}

export async function getVendors() {
  const response = await fetch(
    'http://127.0.0.1:8000/api/vendors'
  )

  if (!response.ok) {
    throw new Error('Failed to fetch vendors')
  }

  return await response.json()
}

export async function updateVendor(vendorId, vendorData) {
  const response = await fetch(
    `http://127.0.0.1:8000/api/vendors/${vendorId}`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(vendorData)
    }
  )

  if (!response.ok) {
    throw new Error('Failed to update vendor')
  }

  return await response.json()
}

export async function deleteVendor(vendorId) {
  const response = await fetch(
    `http://127.0.0.1:8000/api/vendors/${vendorId}`,
    {
      method: 'DELETE'
    }
  )

  if (!response.ok) {
    throw new Error('Failed to delete vendor')
  }

  return await response.json()
}