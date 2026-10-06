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

          <p>
            Loading invoice...
          </p>

        </div>

      </div>

    )

  }


  if (error || !invoice) {

    return (

      <div className="invoice-details-page">

        <div className="invoice-details-error-card">

          <h1>
            Invoice Details
          </h1>

          <p>
            {error || 'Invoice not found.'}
          </p>

          <Link
            to={backToInvoicesPath}
            className="invoice-back-button"
          >

            <span>
              ←
            </span>

            Back to Invoices

          </Link>

        </div>

      </div>

    )

  }


  /*
   * Purchase invoices are stored with:
   *
   * recordType: "purchase"
   *
   * We also check invoiceType for compatibility.
   */

  const isPurchaseInvoice =
    invoice.recordType === 'purchase' ||
    invoice.invoiceType === 'purchase'

  const backToInvoicesPath = isPurchaseInvoice
    ? '/invoices?type=purchase'
    : '/invoices?type=sales'

  return (

    <div className="invoice-details-page">


      {/* =========================
          PAGE HEADER
      ========================== */}

      <div className="invoice-details-header">


        <div className="invoice-header-left">


          <Link
            to={backToInvoicesPath}
            className="invoice-back-button"
          >

            <span>
              ←
            </span>

            Back to Invoices

          </Link>


          <div className="invoice-title-section">

            <div>

              <h1>

                {isPurchaseInvoice
                  ? 'Purchase Invoice Details'
                  : 'Invoice Details'}

              </h1>


              <p>

                {isPurchaseInvoice
                  ? 'View the complete details of this purchase invoice.'
                  : 'View the complete details of this invoice.'}

              </p>

            </div>

          </div>


        </div>


        <div className="invoice-number-badge">


          <span>

            {isPurchaseInvoice
              ? 'Purchase Invoice'
              : 'Invoice'}

          </span>


          <strong>

            {invoice.invoiceNumber || '--'}

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


          {/* Print / Save PDF
              Sales invoices only */}

          {!isPurchaseInvoice && (

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

          )}


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


      {/* =====================================================
          PURCHASE INVOICE CARD VIEW
          ===================================================== */}

      {isPurchaseInvoice && (

        <div className="purchase-invoice-details">


          {/* =========================
              INVOICE INFORMATION
          ========================== */}

          <div className="purchase-detail-card">


            <div className="purchase-detail-card-header">

              <div>

                <h2>
                  Invoice Information
                </h2>

                <p>
                  Basic information about this purchase.
                </p>

              </div>

            </div>


            <div className="purchase-detail-grid">


              <div className="purchase-detail-item">

                <span>
                  Invoice Number
                </span>

                <strong>
                  {invoice.invoiceNumber || '--'}
                </strong>

              </div>


              <div className="purchase-detail-item">

                <span>
                  Invoice Date
                </span>

                <strong>
                  {invoice.invoiceDate || '--'}
                </strong>

              </div>


              <div className="purchase-detail-item">

                <span>
                  Order Number
                </span>

                <strong>
                  {invoice.orderNumber || '--'}
                </strong>

              </div>


              <div className="purchase-detail-item">

                <span>
                  Order Date
                </span>

                <strong>
                  {invoice.orderDate || '--'}
                </strong>

              </div>


              <div className="purchase-detail-item">

                <span>
                  Payment Mode
                </span>

                <strong>
                  {invoice.paymentMode || '--'}
                </strong>

              </div>


            </div>


          </div>


          {/* =========================
              VENDOR DETAILS
          ========================== */}

          <div className="purchase-detail-card">


            <div className="purchase-detail-card-header">

              <div>

                <h2>
                  Vendor Details
                </h2>

                <p>
                  Supplier information from the purchase invoice.
                </p>

              </div>

            </div>


            <div className="purchase-vendor-grid">


              <div className="purchase-detail-item">

                <span>
                  Vendor Name
                </span>

                <strong>
                  {invoice.vendor?.name || '--'}
                </strong>

              </div>


              <div className="purchase-detail-item">

                <span>
                  Phone
                </span>

                <strong>
                  {invoice.vendor?.phone || '--'}
                </strong>

              </div>


              <div className="purchase-detail-item">

                <span>
                  Email
                </span>

                <strong>
                  {invoice.vendor?.email || '--'}
                </strong>

              </div>


              <div className="purchase-detail-item purchase-detail-full">

                <span>
                  Address
                </span>

                <strong>
                  {invoice.vendor?.address || '--'}
                </strong>

              </div>


              <div className="purchase-detail-item">

                <span>
                  GSTIN
                </span>

                <strong>
                  {invoice.vendor?.gstin || '--'}
                </strong>

              </div>


              <div className="purchase-detail-item">

                <span>
                  PAN
                </span>

                <strong>
                  {invoice.vendor?.pan || '--'}
                </strong>

              </div>


              <div className="purchase-detail-item">

                <span>
                  State
                </span>

                <strong>
                  {invoice.vendor?.state || '--'}
                </strong>

              </div>


            </div>


          </div>


          {/* =========================
              PURCHASE ITEMS
          ========================== */}

          <div className="purchase-detail-card">


            <div className="purchase-detail-card-header">

              <div>

                <h2>
                  Purchase Items
                </h2>

                <p>
                  Products and services recorded from this invoice.
                </p>

              </div>

            </div>


            <div className="purchase-items-table-wrapper">


              <table className="purchase-items-table">


                <thead>

                  <tr>

                    <th>
                      #
                    </th>

                    <th>
                      Product / Service
                    </th>

                    <th>
                      HSN / SAC
                    </th>

                    <th>
                      Quantity
                    </th>

                    <th>
                      Unit
                    </th>

                    <th>
                      Rate
                    </th>

                    <th>
                      Taxable Amount
                    </th>

                  </tr>

                </thead>


                <tbody>


                  {invoice.items?.length > 0 ? (

                    invoice.items.map((item, index) => (

                      <tr key={index}>

                        <td>
                          {item.serialNumber || index + 1}
                        </td>

                        <td>
                          {item.productName || '--'}
                        </td>

                        <td>
                          {item.hsnSac || '--'}
                        </td>

                        <td>
                          {item.quantity || '--'}
                        </td>

                        <td>
                          {item.ctUn || '--'}
                        </td>

                        <td>
                          {item.rate || '--'}
                        </td>

                        <td>
                          {item.taxableAmount || '--'}
                        </td>

                      </tr>

                    ))

                  ) : (

                    <tr>

                      <td
                        colSpan="7"
                        className="purchase-items-empty"
                      >

                        No purchase items available.

                      </td>

                    </tr>

                  )}


                </tbody>


              </table>


            </div>


          </div>


          {/* =========================
              PAYMENT + TOTAL
          ========================== */}

          <div className="purchase-bottom-grid">


            <div className="purchase-detail-card purchase-payment-card">


              <div className="purchase-detail-card-header">

                <div>

                  <h2>
                    Payment Details
                  </h2>

                  <p>
                    Payment information recorded for this purchase.
                  </p>

                </div>

              </div>


              <div className="purchase-detail-item">

                <span>
                  Payment Mode
                </span>

                <strong>
                  {invoice.paymentMode || '--'}
                </strong>

              </div>


            </div>


            <div className="purchase-detail-card purchase-total-card">


              <div className="purchase-detail-card-header">

                <div>

                  <h2>
                    Invoice Total
                  </h2>

                </div>

              </div>


              <div className="purchase-grand-total">

                <span>
                  Grand Total
                </span>

                <strong>

                  ₹
                  {Number(
                    invoice.totals?.grandTotal || 0
                  ).toLocaleString('en-IN', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}

                </strong>

              </div>


            </div>


          </div>


        </div>

      )}


      {/* =====================================================
          SALES INVOICE A4 PREVIEW
          ===================================================== */}

      {!isPurchaseInvoice && (

        <div
          id="invoice-print-area"
          className="invoice-details-preview"
        >

          <InvoicePreview
            invoice={invoice}
          />

        </div>

      )}


    </div>

  )

}


export default InvoiceDetails