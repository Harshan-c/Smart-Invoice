import { useState } from 'react'
import { createInvoice } from '../services/api'
import './InvoiceGenerator.css'

function InvoiceGenerator() {
  const [invoice, setInvoice] = useState({
    invoiceNumber: 'INV-00001',
    invoiceDate: '',
    dueDate: '',
    orderNumber: '',
    orderDate: '',
    companyName: '',
    companyAddress: '',
    companyPhone: '',
    companyEmail: '',
    companyGSTIN: '',
    companyPAN: '',
    companyState: '',
    customerName: '',
    customerAddress: '',
    customerPhone: '',
    customerEmail: '',
    customerGSTIN: '',
    customerPAN: '',
    customerState: '',
    paymentMode: 'Cash',
    paymentStatus: 'Pending',
    referenceNumber: ''
  })

  const [items, setItems] = useState([
    {
      productName: '',
      hsnSac: '',
      quantity: 1,
      unit: 'pcs',
      rate: 0,
      discount: 0,
      gstRate: 18
    }
  ])

  const [saveMessage, setSaveMessage] = useState('')

  function handleInvoiceChange(event) {
    const { name, value } = event.target

    setInvoice(prev => ({
      ...prev,
      [name]: value
    }))
  }

  function handleItemChange(index, event) {
    const { name, value } = event.target

    setItems(prevItems =>
      prevItems.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              [name]: value
            }
          : item
      )
    )
  }

  function addItem() {
    setItems(prevItems => [
      ...prevItems,
      {
        productName: '',
        hsnSac: '',
        quantity: 1,
        unit: 'pcs',
        rate: 0,
        discount: 0,
        gstRate: 18
      }
    ])
  }

  function removeItem(index) {
    setItems(prevItems =>
      prevItems.filter((_, itemIndex) => itemIndex !== index)
    )
  }

  function calculateItem(item) {
    const quantity = Number(item.quantity) || 0
    const rate = Number(item.rate) || 0
    const discount = Number(item.discount) || 0
    const gstRate = Number(item.gstRate) || 0

    const grossAmount = quantity * rate
    const taxableAmount = Math.max(grossAmount - discount, 0)
    const gstAmount = taxableAmount * (gstRate / 100)
    const total = taxableAmount + gstAmount

    return {
      grossAmount,
      taxableAmount,
      gstAmount,
      total
    }
  }

  function calculateTotals() {
    let subtotal = 0
    let totalDiscount = 0
    let taxableAmount = 0
    let totalGST = 0

    items.forEach(item => {
      const quantity = Number(item.quantity) || 0
      const rate = Number(item.rate) || 0
      const discount = Number(item.discount) || 0

      const calculated = calculateItem(item)

      subtotal += quantity * rate
      totalDiscount += discount
      taxableAmount += calculated.taxableAmount
      totalGST += calculated.gstAmount
    })

    const sameState =
      invoice.companyState &&
      invoice.customerState &&
      invoice.companyState === invoice.customerState

    const cgst = sameState ? totalGST / 2 : 0
    const sgst = sameState ? totalGST / 2 : 0
    const igst = sameState ? 0 : totalGST

    const grandTotal = taxableAmount + totalGST

    return {
      subtotal,
      discount: totalDiscount,
      taxableAmount,
      cgst,
      sgst,
      igst,
      totalGST,
      grandTotal
    }
  }

  function buildInvoiceData() {
    const totals = calculateTotals()

    const formattedItems = items.map(item => {
      const calculated = calculateItem(item)

      return {
        productName: item.productName,
        hsnSac: item.hsnSac,
        quantity: Number(item.quantity) || 0,
        unit: item.unit,
        rate: Number(item.rate) || 0,
        discount: Number(item.discount) || 0,
        gstRate: Number(item.gstRate) || 0,
        grossAmount: calculated.grossAmount,
        taxableAmount: calculated.taxableAmount,
        gstAmount: calculated.gstAmount,
        total: calculated.total
      }
    })

    return {
      invoiceNumber: invoice.invoiceNumber,
      invoiceDate: invoice.invoiceDate,
      dueDate: invoice.dueDate,
      orderNumber: invoice.orderNumber,
      orderDate: invoice.orderDate,

      company: {
        name: invoice.companyName,
        address: invoice.companyAddress,
        phone: invoice.companyPhone,
        email: invoice.companyEmail,
        gstin: invoice.companyGSTIN,
        pan: invoice.companyPAN,
        state: invoice.companyState
      },

      customer: {
        name: invoice.customerName,
        address: invoice.customerAddress,
        phone: invoice.customerPhone,
        email: invoice.customerEmail,
        gstin: invoice.customerGSTIN,
        pan: invoice.customerPAN,
        state: invoice.customerState
      },

      items: formattedItems,

      payment: {
        mode: invoice.paymentMode,
        status: invoice.paymentStatus,
        referenceNumber: invoice.referenceNumber
      },

      totals
    }
  }

  function formatCurrency(value) {
    return `₹${Number(value || 0).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`
  }

  function formatDate(value) {
    if (!value) {
      return '--'
    }

    const date = new Date(`${value}T00:00:00`)

    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  async function handleSaveInvoice() {
    try {
      setSaveMessage('Saving invoice...')

      const invoiceData = buildInvoiceData()

      const data = await createInvoice(invoiceData)

      setSaveMessage(data.message || 'Invoice saved successfully.')
    } catch (error) {
      console.error(error)
      setSaveMessage('Failed to save invoice.')
    }
  }

  const totals = calculateTotals()

  return (
    <div className="invoice-generator">

      {/* =====================================================
          LEFT SIDE - FORM
          ===================================================== */}

      <div className="invoice-form">

        <h1>Create Invoice</h1>

        {/* ===================================================
            COMPANY DETAILS
            =================================================== */}

        <section>

          <div className="form-section-header">

            <div className="form-section-icon">
              🏢
            </div>

            <div>
              <h2>Company Details</h2>

              <p>
                Enter the details of the business issuing this invoice.
              </p>
            </div>

          </div>

          <div className="form-grid">

            <div className="form-field form-field-full">

              <label>
                Company Name
              </label>

              <input
                name="companyName"
                placeholder="Enter company name"
                value={invoice.companyName}
                onChange={handleInvoiceChange}
              />

            </div>

            <div className="form-field form-field-full">

              <label>
                Company Address
              </label>

              <input
                name="companyAddress"
                placeholder="Enter company address"
                value={invoice.companyAddress}
                onChange={handleInvoiceChange}
              />

            </div>

            <div className="form-field">

              <label>
                Phone
              </label>

              <input
                name="companyPhone"
                placeholder="Enter phone number"
                value={invoice.companyPhone}
                onChange={handleInvoiceChange}
              />

            </div>

            <div className="form-field">

              <label>
                Email
              </label>

              <input
                name="companyEmail"
                placeholder="Enter email address"
                value={invoice.companyEmail}
                onChange={handleInvoiceChange}
              />

            </div>

            <div className="form-field">

              <label>
                GSTIN
              </label>

              <input
                name="companyGSTIN"
                placeholder="Enter GSTIN"
                value={invoice.companyGSTIN}
                onChange={handleInvoiceChange}
              />

            </div>

            <div className="form-field">

              <label>
                PAN
              </label>

              <input
                name="companyPAN"
                placeholder="Enter PAN"
                value={invoice.companyPAN}
                onChange={handleInvoiceChange}
              />

            </div>

            <div className="form-field">

              <label>
                State
              </label>

              <select
                name="companyState"
                value={invoice.companyState}
                onChange={handleInvoiceChange}
              >

                <option value="">
                  Select Company State
                </option>

                <option value="Karnataka">
                  Karnataka
                </option>

                <option value="Maharashtra">
                  Maharashtra
                </option>

                <option value="Tamil Nadu">
                  Tamil Nadu
                </option>

                <option value="Kerala">
                  Kerala
                </option>

                <option value="West Bengal">
                  West Bengal
                </option>

                <option value="Delhi">
                  Delhi
                </option>

              </select>

            </div>

          </div>

        </section>


        {/* ===================================================
            INVOICE DETAILS
            =================================================== */}

        <section>

          <div className="form-section-header">

            <div className="form-section-icon">
              🧾
            </div>

            <div>
              <h2>Invoice Details</h2>

              <p>
                Basic information about this invoice.
              </p>
            </div>

          </div>

          <div className="form-grid">

            <div className="form-field">

              <label>
                Invoice Number
              </label>

              <input
                name="invoiceNumber"
                placeholder="INV-00001"
                value={invoice.invoiceNumber}
                onChange={handleInvoiceChange}
              />

            </div>

            <div className="form-field">

              <label>
                Invoice Date
              </label>

              <input
                type="date"
                name="invoiceDate"
                value={invoice.invoiceDate}
                onChange={handleInvoiceChange}
              />

            </div>

            <div className="form-field">

              <label>
                Due Date
              </label>

              <input
                type="date"
                name="dueDate"
                value={invoice.dueDate}
                onChange={handleInvoiceChange}
              />

            </div>

            <div className="form-field">

              <label>
                Order Number
              </label>

              <input
                name="orderNumber"
                placeholder="Order number"
                value={invoice.orderNumber}
                onChange={handleInvoiceChange}
              />

            </div>

            <div className="form-field">

              <label>
                Order Date
              </label>

              <input
                type="date"
                name="orderDate"
                value={invoice.orderDate}
                onChange={handleInvoiceChange}
              />

            </div>

          </div>

        </section>


        {/* ===================================================
            CUSTOMER DETAILS
            =================================================== */}

        <section>

          <div className="form-section-header">

            <div className="form-section-icon">
              👤
            </div>

            <div>
              <h2>Customer Details</h2>

              <p>
                Enter the details of the customer receiving the invoice.
              </p>
            </div>

          </div>

          <div className="form-grid">

            <div className="form-field form-field-full">

              <label>
                Customer Name
              </label>

              <input
                name="customerName"
                placeholder="Enter customer name"
                value={invoice.customerName}
                onChange={handleInvoiceChange}
              />

            </div>

            <div className="form-field form-field-full">

              <label>
                Customer Address
              </label>

              <input
                name="customerAddress"
                placeholder="Enter customer address"
                value={invoice.customerAddress}
                onChange={handleInvoiceChange}
              />

            </div>

            <div className="form-field">

              <label>
                Phone
              </label>

              <input
                name="customerPhone"
                placeholder="Customer phone"
                value={invoice.customerPhone}
                onChange={handleInvoiceChange}
              />

            </div>

            <div className="form-field">

              <label>
                Email
              </label>

              <input
                name="customerEmail"
                placeholder="Customer email"
                value={invoice.customerEmail}
                onChange={handleInvoiceChange}
              />

            </div>

            <div className="form-field">

              <label>
                GSTIN
              </label>

              <input
                name="customerGSTIN"
                placeholder="Customer GSTIN"
                value={invoice.customerGSTIN}
                onChange={handleInvoiceChange}
              />

            </div>

            <div className="form-field">

              <label>
                PAN
              </label>

              <input
                name="customerPAN"
                placeholder="Customer PAN"
                value={invoice.customerPAN}
                onChange={handleInvoiceChange}
              />

            </div>

            <div className="form-field">

              <label>
                State
              </label>

              <select
                name="customerState"
                value={invoice.customerState}
                onChange={handleInvoiceChange}
              >

                <option value="">
                  Select Customer State
                </option>

                <option value="Karnataka">
                  Karnataka
                </option>

                <option value="Maharashtra">
                  Maharashtra
                </option>

                <option value="Tamil Nadu">
                  Tamil Nadu
                </option>

                <option value="Kerala">
                  Kerala
                </option>

                <option value="West Bengal">
                  West Bengal
                </option>

                <option value="Delhi">
                  Delhi
                </option>

              </select>

            </div>

          </div>

        </section>


        {/* ===================================================
            PRODUCTS / SERVICES
            =================================================== */}

        <section>

          <div className="form-section-header">

            <div className="form-section-icon">
              📦
            </div>

            <div>
              <h2>Products / Services</h2>

              <p>
                Add the products or services included in this invoice.
              </p>
            </div>

          </div>

          {items.map((item, index) => {

            const calculated = calculateItem(item)

            return (
              <div
                className="item-form"
                key={index}
              >

                <h3>
                  Item {index + 1}
                </h3>

                <div className="form-grid">

                  <div className="form-field form-field-full">

                    <label>
                      Product / Service Name
                    </label>

                    <input
                      name="productName"
                      placeholder="Enter product or service"
                      value={item.productName}
                      onChange={event =>
                        handleItemChange(index, event)
                      }
                    />

                  </div>

                  <div className="form-field">

                    <label>
                      HSN / SAC
                    </label>

                    <input
                      name="hsnSac"
                      placeholder="HSN / SAC code"
                      value={item.hsnSac}
                      onChange={event =>
                        handleItemChange(index, event)
                      }
                    />

                  </div>

                  <div className="form-field">

                    <label>
                      Unit
                    </label>

                    <select
                      name="unit"
                      value={item.unit}
                      onChange={event =>
                        handleItemChange(index, event)
                      }
                    >

                      <option value="pcs">
                        Pieces
                      </option>

                      <option value="kg">
                        Kg
                      </option>

                      <option value="ltr">
                        Litres
                      </option>

                      <option value="box">
                        Box
                      </option>

                      <option value="hrs">
                        Hours
                      </option>

                      <option value="service">
                        Service
                      </option>

                    </select>

                  </div>

                  <div className="form-field">

                    <label>
                      Quantity
                    </label>

                    <input
                      type="number"
                      min="0"
                      name="quantity"
                      value={item.quantity}
                      onChange={event =>
                        handleItemChange(index, event)
                      }
                    />

                  </div>

                  <div className="form-field">

                    <label>
                      Rate
                    </label>

                    <input
                      type="number"
                      min="0"
                      name="rate"
                      value={item.rate}
                      onChange={event =>
                        handleItemChange(index, event)
                      }
                    />

                  </div>

                  <div className="form-field">

                    <label>
                      Discount
                    </label>

                    <input
                      type="number"
                      min="0"
                      name="discount"
                      value={item.discount}
                      onChange={event =>
                        handleItemChange(index, event)
                      }
                    />

                  </div>

                  <div className="form-field">

                    <label>
                      GST Rate
                    </label>

                    <select
                      name="gstRate"
                      value={item.gstRate}
                      onChange={event =>
                        handleItemChange(index, event)
                      }
                    >

                      <option value="0">
                        0%
                      </option>

                      <option value="5">
                        5%
                      </option>

                      <option value="12">
                        12%
                      </option>

                      <option value="18">
                        18%
                      </option>

                      <option value="28">
                        28%
                      </option>

                    </select>

                  </div>

                </div>

                <div className="item-calculation">

                  <span>
                    Taxable Amount:
                    <strong>
                      {formatCurrency(calculated.taxableAmount)}
                    </strong>
                  </span>

                  <span>
                    GST:
                    <strong>
                      {formatCurrency(calculated.gstAmount)}
                    </strong>
                  </span>

                  <span>
                    Total:
                    <strong>
                      {formatCurrency(calculated.total)}
                    </strong>
                  </span>

                </div>

                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                  >
                    Remove Item
                  </button>
                )}

              </div>
            )
          })}

          <button
            type="button"
            onClick={addItem}
          >
            + Add Product / Service
          </button>

        </section>


        {/* ===================================================
            PAYMENT DETAILS
            =================================================== */}

        <section>

          <div className="form-section-header">

            <div className="form-section-icon">
              💳
            </div>

            <div>
              <h2>Payment Details</h2>

              <p>
                Record the payment method and status.
              </p>
            </div>

          </div>

          <div className="form-grid">

            <div className="form-field">

              <label>
                Payment Mode
              </label>

              <select
                name="paymentMode"
                value={invoice.paymentMode}
                onChange={handleInvoiceChange}
              >

                <option value="Cash">
                  Cash
                </option>

                <option value="UPI">
                  UPI
                </option>

                <option value="Bank Transfer">
                  Bank Transfer
                </option>

                <option value="Card">
                  Card
                </option>

                <option value="Cheque">
                  Cheque
                </option>

              </select>

            </div>

            <div className="form-field">

              <label>
                Payment Status
              </label>

              <select
                name="paymentStatus"
                value={invoice.paymentStatus}
                onChange={handleInvoiceChange}
              >

                <option value="Pending">
                  Pending
                </option>

                <option value="Paid">
                  Paid
                </option>

                <option value="Partially Paid">
                  Partially Paid
                </option>

                <option value="Overdue">
                  Overdue
                </option>

              </select>

            </div>

            <div className="form-field form-field-full">

              <label>
                Reference Number
              </label>

              <input
                name="referenceNumber"
                placeholder="Transaction / reference number"
                value={invoice.referenceNumber}
                onChange={handleInvoiceChange}
              />

            </div>

          </div>

        </section>


        {/* ===================================================
            TOTALS
            =================================================== */}

        <section>

          <div className="form-section-header">

            <div className="form-section-icon">
              ₹
            </div>

            <div>
              <h2>Invoice Totals</h2>

              <p>
                Automatically calculated invoice summary.
              </p>
            </div>

          </div>

          <p>
            <span>Subtotal</span>
            <strong>
              {formatCurrency(totals.subtotal)}
            </strong>
          </p>

          <p>
            <span>Discount</span>
            <strong>
              {formatCurrency(totals.discount)}
            </strong>
          </p>

          <p>
            <span>Taxable Amount</span>
            <strong>
              {formatCurrency(totals.taxableAmount)}
            </strong>
          </p>

          <p>
            <span>CGST</span>
            <strong>
              {formatCurrency(totals.cgst)}
            </strong>
          </p>

          <p>
            <span>SGST</span>
            <strong>
              {formatCurrency(totals.sgst)}
            </strong>
          </p>

          <p>
            <span>IGST</span>
            <strong>
              {formatCurrency(totals.igst)}
            </strong>
          </p>

          <p>
            <span>Total GST</span>
            <strong>
              {formatCurrency(totals.totalGST)}
            </strong>
          </p>

          <h3>
            <span>Grand Total</span>
            <strong>
              {formatCurrency(totals.grandTotal)}
            </strong>
          </h3>

        </section>


        {/* ===================================================
            ACTIONS
            =================================================== */}

        <section>

          <div className="form-section-header">

            <div className="form-section-icon">
              ✓
            </div>

            <div>
              <h2>Save Invoice</h2>

              <p>
                Save this invoice to your SmartInvoice database.
              </p>
            </div>

          </div>

          <button
            type="button"
            onClick={() => {
              console.log('Invoice Data:', buildInvoiceData())
            }}
          >
            Test Invoice Data
          </button>

          <button
            type="button"
            onClick={handleSaveInvoice}
          >
            Save Invoice
          </button>

          {saveMessage && (
            <p>
              {saveMessage}
            </p>
          )}

        </section>

      </div>


      {/* =====================================================
          RIGHT SIDE - LIVE A4 PREVIEW
          ===================================================== */}

      <div className="invoice-preview-container">

        <div className="invoice-preview">

          <div className="invoice-header">

            <div className="logo-placeholder">
              LOGO
            </div>

            <div className="company-info">

              <h1>
                {invoice.companyName || 'Company Name'}
              </h1>

              <p>
                {invoice.companyAddress || 'Company Address'}
              </p>

              <p>
                {invoice.companyPhone || 'Phone'}
                {' • '}
                {invoice.companyEmail || 'Email'}
              </p>

              <p>
                GSTIN:
                {' '}
                {invoice.companyGSTIN || '--'}
              </p>

              <p>
                PAN:
                {' '}
                {invoice.companyPAN || '--'}
              </p>

            </div>

            <div className="tax-invoice">

              <h2>
                TAX INVOICE
              </h2>

            </div>

          </div>


          {/* Invoice Meta */}

          <div className="invoice-meta">

            <div>
              <strong>
                Invoice No.
              </strong>

              <span>
                {invoice.invoiceNumber || '--'}
              </span>
            </div>

            <div>
              <strong>
                Invoice Date
              </strong>

              <span>
                {formatDate(invoice.invoiceDate)}
              </span>
            </div>

            <div>
              <strong>
                Due Date
              </strong>

              <span>
                {formatDate(invoice.dueDate)}
              </span>
            </div>

            <div>
              <strong>
                Order No.
              </strong>

              <span>
                {invoice.orderNumber || '--'}
              </span>
            </div>

            <div>
              <strong>
                Payment
              </strong>

              <span>
                {invoice.paymentMode}
              </span>
            </div>

          </div>


          {/* Billing */}

          <div className="billing-section">

            <div className="billing-box">

              <h3>
                BILL TO
              </h3>

              <strong>
                {invoice.customerName || 'Customer Name'}
              </strong>

              <p>
                {invoice.customerAddress || 'Customer Address'}
              </p>

              <p>
                Phone:
                {' '}
                {invoice.customerPhone || '--'}
              </p>

              <p>
                Email:
                {' '}
                {invoice.customerEmail || '--'}
              </p>

              <p>
                GSTIN:
                {' '}
                {invoice.customerGSTIN || '--'}
              </p>

              <p>
                State:
                {' '}
                {invoice.customerState || '--'}
              </p>

            </div>


            <div className="billing-box">

              <h3>
                PAYMENT DETAILS
              </h3>

              <p>
                Payment Mode:
                {' '}
                {invoice.paymentMode}
              </p>

              <p>
                Payment Status:
                {' '}
                {invoice.paymentStatus}
              </p>

              <p>
                Reference:
                {' '}
                {invoice.referenceNumber || '--'}
              </p>

              <p>
                PAN:
                {' '}
                {invoice.customerPAN || '--'}
              </p>

            </div>

          </div>


          {/* Products Table */}

          <table className="invoice-table">

            <thead>

              <tr>

                <th>
                  #
                </th>

                <th>
                  Product / Service
                </th>

                <th>
                  HSN/SAC
                </th>

                <th>
                  Qty
                </th>

                <th>
                  Rate
                </th>

                <th>
                  Discount
                </th>

                <th>
                  Taxable
                </th>

                <th>
                  GST
                </th>

                <th>
                  Total
                </th>

              </tr>

            </thead>

            <tbody>

              {items.map((item, index) => {

                const calculated = calculateItem(item)

                return (
                  <tr key={index}>

                    <td>
                      {index + 1}
                    </td>

                    <td>
                      {item.productName || '--'}
                    </td>

                    <td>
                      {item.hsnSac || '--'}
                    </td>

                    <td>
                      {item.quantity}
                      {' '}
                      {item.unit}
                    </td>

                    <td>
                      {formatCurrency(item.rate)}
                    </td>

                    <td>
                      {formatCurrency(item.discount)}
                    </td>

                    <td>
                      {formatCurrency(calculated.taxableAmount)}
                    </td>

                    <td>
                      {formatCurrency(calculated.gstAmount)}
                    </td>

                    <td>
                      {formatCurrency(calculated.total)}
                    </td>

                  </tr>
                )
              })}

            </tbody>

          </table>


          {/* Bottom Section */}

          <div className="bottom-section">

            <div className="notes">

              <h3>
                Notes
              </h3>

              <p>
                Thank you for your business.
              </p>

              <h3>
                Terms & Conditions
              </h3>

              <p>
                Payment is subject to the agreed terms.
              </p>

            </div>


            <div className="totals">

              <div>
                <span>
                  Subtotal
                </span>

                <strong>
                  {formatCurrency(totals.subtotal)}
                </strong>
              </div>

              <div>
                <span>
                  Discount
                </span>

                <strong>
                  {formatCurrency(totals.discount)}
                </strong>
              </div>

              <div>
                <span>
                  Taxable Amount
                </span>

                <strong>
                  {formatCurrency(totals.taxableAmount)}
                </strong>
              </div>

              <div>
                <span>
                  CGST
                </span>

                <strong>
                  {formatCurrency(totals.cgst)}
                </strong>
              </div>

              <div>
                <span>
                  SGST
                </span>

                <strong>
                  {formatCurrency(totals.sgst)}
                </strong>
              </div>

              <div>
                <span>
                  IGST
                </span>

                <strong>
                  {formatCurrency(totals.igst)}
                </strong>
              </div>

              <div>
                <span>
                  Total GST
                </span>

                <strong>
                  {formatCurrency(totals.totalGST)}
                </strong>
              </div>

              <div>
                <span>
                  Grand Total
                </span>

                <strong>
                  {formatCurrency(totals.grandTotal)}
                </strong>
              </div>

            </div>

          </div>


          {/* Footer */}

          <div className="invoice-footer">

            <span>
              This is a computer-generated invoice.
            </span>

            <div>
              Authorized Signatory
            </div>

          </div>

        </div>

      </div>

    </div>
  )
}

export default InvoiceGenerator