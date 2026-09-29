import { useEffect, useState } from 'react'
import {
  Link,
  useNavigate,
  useParams
} from 'react-router-dom'

import {
  getInvoice,
  deleteInvoice
} from '../services/api'

import InvoicePreview from '../components/invoice/InvoicePreview'

import './InvoiceDetails.css'

function InvoiceDetails() {
  const { invoiceId } = useParams()
  const navigate = useNavigate()

  const [invoice, setInvoice] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [showDeleteConfirm, setShowDeleteConfirm] =
    useState(false)

  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  useEffect(() => {
    loadInvoice()
  }, [invoiceId])

  async function loadInvoice() {
    try {
      setLoading(true)
      setError('')

      const data = await getInvoice(invoiceId)

      setInvoice(data)
    } catch (error) {
      console.error(error)
      setError('Failed to load invoice.')
    } finally {
      setLoading(false)
    }
  }

  async function handleDeleteInvoice() {
    try {
      setDeleting(true)
      setDeleteError('')

      await deleteInvoice(invoiceId)

      navigate('/invoices')
    } catch (error) {
      console.error(error)

      setDeleteError(
        'Failed to delete invoice. Please try again.'
      )

      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="invoice-details-page">
        <div className="invoice-details-loading">
          <p>Loading invoice...</p>
        </div>
      </div>
    )
  }

  if (error || !invoice) {
    return (
      <div className="invoice-details-page">

        <div className="invoice-details-error-card">

          <h1>Invoice Details</h1>

          <p>
            {error || 'Invoice not found.'}
          </p>

          <Link
            to="/invoices"
            className="invoice-back-button"
          >
            <span>←</span>
            Back to Invoices
          </Link>

        </div>

      </div>
    )
  }

  return (
    <div className="invoice-details-page">

      {/* =========================
          PAGE HEADER
      ========================== */}

      <div className="invoice-details-header">

        <div className="invoice-header-left">

          <Link
            to="/invoices"
            className="invoice-back-button"
          >
            <span>←</span>
            Back to Invoices
          </Link>

          <div className="invoice-title-section">

            <div>
              <h1>Invoice Details</h1>

              <p>
                View the complete details of this invoice.
              </p>
            </div>

          </div>

        </div>

        <div className="invoice-number-badge">
          <span>Invoice</span>
          <strong>
            {invoice.invoiceNumber}
          </strong>
        </div>

      </div>


      {/* =========================
          ACTION BAR
      ========================== */}

      <div className="invoice-action-bar">

        <div className="invoice-action-left">
          <span className="invoice-action-label">
            Invoice Actions
          </span>
        </div>

        <div className="invoice-action-buttons">

          {/* Update Payment */}
          <Link
            to={`/invoices/${invoiceId}/payment`}
            className="invoice-action-button payment-action"
          >
            <span className="action-button-icon">
              ₹
            </span>

            <span>
              Update Payment
            </span>
          </Link>


          {/* Print / Save PDF */}
          <button
            type="button"
            className="invoice-action-button print-action"
            onClick={() => window.print()}
          >
            <span className="action-button-icon">
              ⬇
            </span>

            <span>
              Print / Save PDF
            </span>
          </button>


          {/* Delete */}
          <button
            type="button"
            className="invoice-action-button delete-action"
            onClick={() => {
              setDeleteError('')
              setShowDeleteConfirm(true)
            }}
          >
            <span className="action-button-icon">
              🗑
            </span>

            <span>
              Delete Invoice
            </span>
          </button>

        </div>

      </div>


      {/* =========================
          DELETE CONFIRMATION
      ========================== */}

      {showDeleteConfirm && (
        <div className="delete-confirmation">

          <div className="delete-confirmation-content">

            <div className="delete-confirmation-icon">
              🗑
            </div>

            <div className="delete-confirmation-text">

              <h3>
                Delete Invoice?
              </h3>

              <p>
                Are you sure you want to delete invoice
                <strong>
                  {' '}
                  {invoice.invoiceNumber}
                </strong>
                ?
              </p>

              <p className="delete-warning">
                This action cannot be undone.
              </p>

            </div>

          </div>


          {deleteError && (
            <div className="delete-error">
              {deleteError}
            </div>
          )}


          <div className="delete-confirmation-actions">

            <button
              type="button"
              className="delete-cancel-button"
              onClick={() => {
                setShowDeleteConfirm(false)
                setDeleteError('')
              }}
              disabled={deleting}
            >
              Cancel
            </button>

            <button
              type="button"
              className="delete-confirm-button"
              onClick={handleDeleteInvoice}
              disabled={deleting}
            >
              {deleting
                ? 'Deleting...'
                : 'Yes, Delete Invoice'}
            </button>

          </div>

        </div>
      )}


      {/* =========================
          INVOICE PREVIEW
      ========================== */}

      <div className="invoice-details-preview">

        <InvoicePreview
          invoice={invoice}
        />

      </div>

    </div>
  )
}

export default InvoiceDetails