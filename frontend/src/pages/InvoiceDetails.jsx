
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import {
  getInvoice,
  getCompanyProfile,
  deleteInvoice
} from '../services/api'

import InvoicePreview from '../components/Invoice/InvoicePreview'
import './InvoiceDetails.css'

function InvoiceDetails() {
  const { invoiceId } = useParams()
  const navigate = useNavigate()

  const [invoice, setInvoice] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  useEffect(() => {
    async function loadInvoice() {
      try {
        setLoading(true)
        setError('')

        const data = await getInvoice(invoiceId)
        let logo = ''

        try {
          const profile = await getCompanyProfile()
          logo = profile?.logo || ''
        } catch (profileError) {
          console.error('Could not load company logo:', profileError)
        }

        setInvoice({
          ...data,
          company: {
            ...data.company,
            logo
          }
        })
      } catch (err) {
        console.error('Could not load invoice:', err)
        setError('Failed to load invoice.')
      } finally {
        setLoading(false)
      }
    }

    loadInvoice()
  }, [invoiceId])

  async function handleDeleteInvoice() {
    try {
      setDeleting(true)
      setDeleteError('')

      await deleteInvoice(invoiceId)
      navigate('/invoices')
    } catch (err) {
      console.error('Could not delete invoice:', err)
      setDeleteError('Failed to delete invoice. Please try again.')
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="invoice-details-page">
        <p>Loading invoice...</p>
      </div>
    )
  }

  if (error || !invoice) {
    return (
      <div className="invoice-details-page">
        <h1>Invoice Details</h1>
        <p>{error || 'Invoice not found.'}</p>
        <Link to="/invoices" className="invoice-back-button">
          ← Back to Invoices
        </Link>
      </div>
    )
  }

  const isPurchaseInvoice =
    invoice.recordType === 'purchase' ||
    invoice.invoiceType === 'purchase'

  const backPath = isPurchaseInvoice
    ? '/invoices?type=purchase'
    : '/invoices?type=sales'

  return (
    <div className="invoice-details-page">
      <div className="invoice-details-header">
        <div>
          <Link to={backPath} className="invoice-back-button">
            ← Back to Invoices
          </Link>

          <h1>
            {isPurchaseInvoice ? 'Purchase Invoice Details' : 'Invoice Details'}
          </h1>

          <p>View the complete details of this invoice.</p>
        </div>

        <div className="invoice-number-badge">
          <span>{isPurchaseInvoice ? 'Purchase Invoice' : 'Invoice'}</span>
          <strong>{invoice.invoiceNumber || '--'}</strong>
        </div>
      </div>

      <div className="invoice-action-bar">
        <strong>Invoice Actions</strong>

        <div className="invoice-action-buttons">
          <Link
            to={`/invoices/${invoiceId}/payment`}
            className="invoice-action-button payment-action"
          >
            ₹ Update Payment
          </Link>

          {!isPurchaseInvoice && (
            <button
              type="button"
              className="invoice-action-button print-action"
              onClick={() => window.print()}
            >
              Print / Save PDF
            </button>
          )}

          <button
            type="button"
            className="invoice-action-button delete-action"
            onClick={() => {
              setDeleteError('')
              setShowDeleteConfirm(true)
            }}
          >
            Delete Invoice
          </button>
        </div>
      </div>

      {showDeleteConfirm && (
        <div className="delete-confirmation">
          <h3>Delete Invoice?</h3>

          <p>
            Are you sure you want to delete invoice{' '}
            <strong>{invoice.invoiceNumber}</strong>?
          </p>

          <p>This action cannot be undone.</p>

          {deleteError && <p className="delete-error">{deleteError}</p>}

          <div className="delete-confirmation-actions">
            <button
              type="button"
              className="delete-cancel-button"
              disabled={deleting}
              onClick={() => setShowDeleteConfirm(false)}
            >
              Cancel
            </button>

            <button
              type="button"
              className="delete-confirm-button"
              disabled={deleting}
              onClick={handleDeleteInvoice}
            >
              {deleting ? 'Deleting...' : 'Yes, Delete Invoice'}
            </button>
          </div>
        </div>
      )}

      {isPurchaseInvoice ? (
        <div className="purchase-invoice-details">
          <section className="purchase-detail-card">
            <h2>Invoice Information</h2>

            <div className="purchase-detail-grid">
              <div className="purchase-detail-item">
                <span>Invoice Number</span>
                <strong>{invoice.invoiceNumber || '--'}</strong>
              </div>

              <div className="purchase-detail-item">
                <span>Invoice Date</span>
                <strong>{invoice.invoiceDate || '--'}</strong>
              </div>

              <div className="purchase-detail-item">
                <span>Order Number</span>
                <strong>{invoice.orderNumber || '--'}</strong>
              </div>

              <div className="purchase-detail-item">
                <span>Order Date</span>
                <strong>{invoice.orderDate || '--'}</strong>
              </div>

              <div className="purchase-detail-item">
                <span>Payment Mode</span>
                <strong>{invoice.paymentMode || invoice.payment?.mode || '--'}</strong>
              </div>
            </div>
          </section>

          <section className="purchase-detail-card">
            <h2>Vendor Details</h2>

            <div className="purchase-vendor-grid">
              <div className="purchase-detail-item">
                <span>Vendor Name</span>
                <strong>{invoice.vendor?.name || '--'}</strong>
              </div>

              <div className="purchase-detail-item">
                <span>Phone</span>
                <strong>{invoice.vendor?.phone || '--'}</strong>
              </div>

              <div className="purchase-detail-item">
                <span>Email</span>
                <strong>{invoice.vendor?.email || '--'}</strong>
              </div>

              <div className="purchase-detail-item purchase-detail-full">
                <span>Address</span>
                <strong>{invoice.vendor?.address || '--'}</strong>
              </div>

              <div className="purchase-detail-item">
                <span>GSTIN</span>
                <strong>{invoice.vendor?.gstin || '--'}</strong>
              </div>

              <div className="purchase-detail-item">
                <span>PAN</span>
                <strong>{invoice.vendor?.pan || '--'}</strong>
              </div>

              <div className="purchase-detail-item">
                <span>State</span>
                <strong>{invoice.vendor?.state || '--'}</strong>
              </div>
            </div>
          </section>

          <section className="purchase-detail-card">
            <h2>Purchase Items</h2>

            <div className="purchase-items-table-wrapper">
              <table className="purchase-items-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Product / Service</th>
                    <th>HSN / SAC</th>
                    <th>Quantity</th>
                    <th>Unit</th>
                    <th>Rate</th>
                    <th>Taxable Amount</th>
                  </tr>
                </thead>

                <tbody>
                  {invoice.items?.length ? (
                    invoice.items.map((item, index) => (
                      <tr key={index}>
                        <td>{item.serialNumber || index + 1}</td>
                        <td>{item.productName || '--'}</td>
                        <td>{item.hsnSac || '--'}</td>
                        <td>{item.quantity ?? '--'}</td>
                        <td>{item.ctUn || item.unit || '--'}</td>
                        <td>{item.rate ?? '--'}</td>
                        <td>{item.taxableAmount ?? '--'}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="7" className="purchase-items-empty">
                        No purchase items available.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="purchase-detail-card purchase-total-card">
            <h2>Invoice Total</h2>
            <div className="purchase-grand-total">
              <span>Grand Total</span>
              <strong>
                ₹{Number(invoice.totals?.grandTotal || 0).toLocaleString(
                  'en-IN',
                  { minimumFractionDigits: 2, maximumFractionDigits: 2 }
                )}
              </strong>
            </div>
          </section>
        </div>
      ) : (
        <div id="invoice-print-area" className="invoice-details-preview">
          <InvoicePreview invoice={invoice} />
        </div>
      )}
    </div>
  )
}

export default InvoiceDetails
