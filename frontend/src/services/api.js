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