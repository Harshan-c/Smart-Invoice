
import { useEffect, useState } from 'react'
import {
  Link,
  useNavigate,
  useParams
} from 'react-router-dom'

import {
  getInvoice,
  updateInvoicePayment
} from '../services/api'

import './UpdatePayment.css'

const currency = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
})

function UpdatePayment() {
  const { invoiceId } = useParams()
  const navigate = useNavigate()

  const [invoice, setInvoice] = useState(null)

  const [payment, setPayment] = useState({
    mode: 'Cash',
    referenceNumber: '',
    amountPaid: '0'
  })

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    let mounted = true

    async function loadInvoice() {
      try {
        setLoading(true)
        setError('')

        const data = await getInvoice(invoiceId)

        if (!mounted) return

        setInvoice(data)

        const isPurchaseInvoice =
          data.recordType === 'purchase' ||
          data.invoiceType === 'purchase'

        const total = Number(
          data.totals?.grandTotal || 0
        )

        const existingPayment = data.payment || {}

        // Preserve existing payment data.
        // For older invoices, a Paid status means the
        // full invoice amount has already been paid.
        let amountPaid = existingPayment.amountPaid

        if (amountPaid === undefined || amountPaid === null) {
          amountPaid =
            String(existingPayment.status || '').toLowerCase() === 'paid'
              ? total
              : 0
        }

        setPayment({
          mode:
            (isPurchaseInvoice
              ? data.paymentMode || existingPayment.mode
              : existingPayment.mode) || 'Cash',

          referenceNumber:
            existingPayment.referenceNumber || '',

          amountPaid: String(amountPaid)
        })
      } catch (err) {
        console.error('Load invoice error:', err)

        if (mounted) {
          setError(err.message || 'Failed to load invoice.')
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    loadInvoice()

    return () => {
      mounted = false
    }
  }, [invoiceId])

  function handlePaymentChange(event) {
    const { name, value } = event.target

    setPayment(previous => ({
      ...previous,
      [name]: value
    }))

    setError('')
    setMessage('')
  }

  const invoiceTotal = Number(
    invoice?.totals?.grandTotal || 0
  )

  const parsedAmountPaid =
    payment.amountPaid.trim() === ''
      ? NaN
      : Number(payment.amountPaid)

  const validAmount =
    Number.isFinite(parsedAmountPaid) &&
    parsedAmountPaid >= 0 &&
    parsedAmountPaid <= invoiceTotal

  const amountPaid = validAmount ? parsedAmountPaid : 0

  const balanceDue = Math.max(
    0,
    Math.round((invoiceTotal - amountPaid) * 100) / 100
  )

  const previewStatus =
    !validAmount
      ? 'Invalid amount'
      : balanceDue <= 0
        ? 'Paid'
        : amountPaid > 0
          ? 'Partially Paid'
          : 'Pending'

  async function handleSavePayment() {
    if (saving) return

    if (!validAmount) {
      setError(
        'Enter a valid amount paid between ₹0 and the invoice total.'
      )
      return
    }

    try {
      setSaving(true)
      setError('')
      setMessage('')

      const payload = {
        mode: payment.mode,
        referenceNumber: payment.referenceNumber.trim(),
        amountPaid: Math.round(amountPaid * 100) / 100
      }

      const data = await updateInvoicePayment(
        invoiceId,
        payload
      )

      setMessage(
        `${data.message || 'Payment updated successfully.'} ` +
        `Paid: ${currency.format(data.amountPaid ?? amountPaid)}. ` +
        `Balance: ${currency.format(data.balanceDue ?? balanceDue)}. ` +
        `Status: ${data.status || previewStatus}.`
      )

      // Refresh displayed invoice data before navigating.
      const updatedInvoice = await getInvoice(invoiceId)
      setInvoice(updatedInvoice)

      setTimeout(() => {
        navigate(`/invoices/${invoiceId}`)
      }, 1200)
    } catch (err) {
      console.error('Save payment error:', err)

      setError(
        err.message || 'Failed to update payment details.'
      )
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="payment-page">
        <h1>Update Payment</h1>
        <p>Loading payment details...</p>
      </div>
    )
  }

  if (error && !invoice) {
    return (
      <div className="payment-page">
        <h1>Update Payment</h1>

        <div className="payment-error">
          {error}
        </div>

        <Link
          to={`/invoices/${invoiceId}`}
          className="payment-back-link"
        >
          ← Back to Invoice
        </Link>
      </div>
    )
  }

  const isPurchaseInvoice =
    invoice?.recordType === 'purchase' ||
    invoice?.invoiceType === 'purchase'

  const dueDate = invoice?.dueDate
    ? new Date(`${String(invoice.dueDate).slice(0, 10)}T00:00:00`)
    : null

  const isOverdue =
    balanceDue > 0 &&
    dueDate &&
    !Number.isNaN(dueDate.getTime()) &&
    dueDate < new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      new Date().getDate()
    )

  const displayedStatus =
    !validAmount
      ? 'Invalid amount'
      : balanceDue <= 0
        ? 'Paid'
        : isOverdue
          ? 'Overdue'
          : amountPaid > 0
            ? 'Partially Paid'
            : 'Pending'

  return (
    <div className="payment-page">
      <div className="payment-page-header">
        <div>
          <Link
            to={`/invoices/${invoiceId}`}
            className="payment-back-link"
          >
            ← Back to Invoice
          </Link>

          <h1>Update Payment</h1>

          <p>
            Record the total amount paid so far for this invoice.
          </p>
        </div>

        <div className="payment-invoice-number">
          {invoice?.invoiceNumber}
        </div>
      </div>

      <section className="payment-card">
        <div className="payment-card-header">
          <div className="payment-icon">₹</div>

          <div>
            <h2>Payment Details</h2>

            <p>
              Enter the cumulative amount received or paid.
              The outstanding balance is calculated automatically.
            </p>
          </div>
        </div>

        <div className="payment-form">
          <div className="payment-field">
            <label htmlFor="payment-mode">
              Payment Mode
            </label>

            <select
              id="payment-mode"
              name="mode"
              value={payment.mode}
              onChange={handlePaymentChange}
            >
              <option value="Cash">Cash</option>
              <option value="UPI">UPI</option>
              <option value="Card">Card</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Credit">Credit</option>
              <option value="Online">Online</option>
            </select>
          </div>

          <div className="payment-field">
            <label htmlFor="amount-paid">
              Total Amount Paid (₹)
            </label>

            <input
              id="amount-paid"
              type="number"
              name="amountPaid"
              min="0"
              max={invoiceTotal}
              step="0.01"
              value={payment.amountPaid}
              onChange={handlePaymentChange}
              placeholder="Enter total amount paid"
              aria-invalid={!validAmount}
            />

            <small>
              Enter the total paid to date, not only the latest installment.
            </small>
          </div>

          <div className="payment-field payment-field-wide">
            <label htmlFor="reference-number">
              Payment Reference Number
            </label>

            <input
              id="reference-number"
              type="text"
              name="referenceNumber"
              value={payment.referenceNumber}
              onChange={handlePaymentChange}
              placeholder="Enter payment reference number"
            />
          </div>
        </div>

        <div className="payment-info">
          <strong>Invoice amount</strong>
          <span>{currency.format(invoiceTotal)}</span>
        </div>

        <div className="payment-info">
          <strong>Amount paid</strong>
          <span>{currency.format(amountPaid)}</span>
        </div>

        <div className="payment-info">
          <strong>Outstanding balance</strong>
          <span>{currency.format(balanceDue)}</span>
        </div>

        <div className="payment-info">
          <strong>Payment status preview</strong>
          <span>{displayedStatus}</span>
        </div>

        {isPurchaseInvoice && (
          <div className="payment-note">
            This is a purchase invoice. The amount paid represents
            the amount your company has paid to the vendor.
          </div>
        )}

        {!validAmount && (
          <div className="payment-error">
            Enter a valid amount between ₹0 and{' '}
            {currency.format(invoiceTotal)}.
          </div>
        )}

        <div className="payment-actions">
          <Link
            to={`/invoices/${invoiceId}`}
            className="payment-cancel-button"
          >
            Cancel
          </Link>

          <button
            type="button"
            className="payment-save-button"
            onClick={handleSavePayment}
            disabled={saving || !validAmount}
          >
            {saving ? 'Saving...' : 'Save Payment'}
          </button>
        </div>

        {message && (
          <div className="payment-success">
            ✓ {message}
          </div>
        )}

        {error && (
          <div className="payment-error">
            {error}
          </div>
        )}
      </section>
    </div>
  )
}

export default UpdatePayment
