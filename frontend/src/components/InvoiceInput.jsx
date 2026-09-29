import { useState } from 'react'

function InvoiceInput() {
  const [vendor, setVendor] = useState('')

  return (
    <div>
      <h2>Invoice Information</h2>

      <label>
        Vendor Name:
      </label>

      <input
        type="text"
        value={vendor}
        onChange={(event) => setVendor(event.target.value)}
      />

      <p>Vendor: {vendor}</p>
    </div>
  )
}

export default InvoiceInput