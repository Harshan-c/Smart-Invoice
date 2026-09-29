import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getInvoices } from '../services/api'
import './Invoices.css'

function Invoices() {
  const [invoices, setInvoices] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadInvoices()
  }, [])

  async function loadInvoices() {
    try {
      const data = await getInvoices()
      setInvoices(data)
    } catch (error) {
      console.error(error)
      setError('Failed to load invoices.')
    } finally {
      setLoading(false)
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
      month: 'short',
      year: 'numeric'
    })
  }

  function getStatusClass(status) {
    const normalizedStatus = String(status || '').toLowerCase()

    if (normalizedStatus === 'paid') {
      return 'status-paid'
    }

    if (normalizedStatus === 'pending') {
      return 'status-pending'
    }

    if (normalizedStatus === 'overdue') {
      return 'status-overdue'
    }

    if (normalizedStatus === 'partially paid') {
      return 'status-partial'
    }

    return 'status-default'
  }


  /* =====================================================
     SEARCH
     ===================================================== */

  const normalizedSearch =
    searchTerm.trim().toLowerCase()

  const filteredInvoices =
    normalizedSearch === ''
      ? invoices
      : invoices.filter(invoice => {

          const invoiceNumber =
            String(
              invoice.invoiceNumber || ''
            ).toLowerCase()

          const customerName =
            String(
              invoice.customer?.name || ''
            ).toLowerCase()

          return (
            invoiceNumber.includes(
              normalizedSearch
            ) ||
            customerName.includes(
              normalizedSearch
            )
          )
        })


  /* =====================================================
     LOADING
     ===================================================== */

  if (loading) {
    return (
      <div className="invoices-page">

        <div className="page-heading">

          <div>
            <h1>Invoices</h1>

            <p>
              Manage and track all your business invoices.
            </p>
          </div>

        </div>

        <div className="invoices-card invoices-loading">

          <p>
            Loading invoices...
          </p>

        </div>

      </div>
    )
  }


  /* =====================================================
     ERROR
     ===================================================== */

  if (error) {
    return (
      <div className="invoices-page">

        <div className="page-heading">

          <div>
            <h1>Invoices</h1>

            <p>
              Manage and track all your business invoices.
            </p>
          </div>

        </div>

        <div className="invoices-card invoices-error">

          <p>
            {error}
          </p>

        </div>

      </div>
    )
  }


  return (
    <div className="invoices-page">


      {/* =====================================================
          PAGE HEADER
          ===================================================== */}

      <div className="page-heading">

        <div>

          <h1>
            Invoices
          </h1>

          <p>
            Manage and track all your business invoices.
          </p>

        </div>


        <Link
          to="/create-invoice"
          className="create-invoice-button"
        >
          + Create Invoice
        </Link>

      </div>


      {/* =====================================================
          SUMMARY CARDS
          ===================================================== */}

      <div className="invoice-summary">


        {/* Total Invoices */}

        <div className="invoice-summary-card">

          <div className="summary-icon blue">
            🧾
          </div>

          <div>

            <span>
              Total Invoices
            </span>

            <strong>
              {invoices.length}
            </strong>

          </div>

        </div>


        {/* Paid */}

        <div className="invoice-summary-card">

          <div className="summary-icon green">
            ✓
          </div>

          <div>

            <span>
              Paid
            </span>

            <strong>
              {
                invoices.filter(
                  invoice =>
                    String(
                      invoice.payment?.status || ''
                    ).toLowerCase() === 'paid'
                ).length
              }
            </strong>

          </div>

        </div>


        {/* Pending */}

        <div className="invoice-summary-card">

          <div className="summary-icon orange">
            ◷
          </div>

          <div>

            <span>
              Pending
            </span>

            <strong>
              {
                invoices.filter(
                  invoice =>
                    String(
                      invoice.payment?.status || ''
                    ).toLowerCase() === 'pending'
                ).length
              }
            </strong>

          </div>

        </div>


        {/* Total Value */}

        <div className="invoice-summary-card">

          <div className="summary-icon purple">
            ₹
          </div>

          <div>

            <span>
              Total Value
            </span>

            <strong>
              {formatCurrency(
                invoices.reduce(
                  (total, invoice) =>
                    total +
                    Number(
                      invoice.totals?.grandTotal || 0
                    ),
                  0
                )
              )}
            </strong>

          </div>

        </div>

      </div>


      {/* =====================================================
          INVOICE TABLE
          ===================================================== */}

      <div className="invoices-card">


        {/* ===================================================
            CARD HEADER
            =================================================== */}

        <div className="invoices-card-header">

          <div>

            <h2>
              All Invoices
            </h2>

            <p>
              View and manage your saved invoices.
            </p>

          </div>


          {/* =================================================
              SEARCH + COUNT
              ================================================= */}

          <div className="invoice-header-actions">


            <div className="invoice-search">

              <span className="invoice-search-icon">
                ⌕
              </span>

              <input
                type="text"
                value={searchTerm}
                onChange={event =>
                  setSearchTerm(
                    event.target.value
                  )
                }
                placeholder="Search invoices..."
                aria-label="Search invoices"
              />

              {searchTerm && (

                <button
                  type="button"
                  className="invoice-search-clear"
                  onClick={() =>
                    setSearchTerm('')
                  }
                  aria-label="Clear search"
                >
                  ×
                </button>

              )}

            </div>


            <div className="invoice-table-count">

              {filteredInvoices.length}{' '}

              {filteredInvoices.length !== 1
                ? 'invoices'
                : 'invoice'}

            </div>

          </div>

        </div>


        {/* =====================================================
            NO INVOICES
            ===================================================== */}

        {invoices.length === 0 ? (

          <div className="empty-invoices">

            <div className="empty-invoice-icon">
              🧾
            </div>

            <h3>
              No invoices found
            </h3>

            <p>
              Create your first invoice to start managing
              your business records.
            </p>

            <Link
              to="/create-invoice"
              className="empty-create-button"
            >
              Create Your First Invoice
            </Link>

          </div>


        ) : filteredInvoices.length === 0 ? (


          /* =================================================
             NO SEARCH RESULTS
             ================================================= */

          <div className="empty-invoices">

            <div className="empty-invoice-icon">
              🔍
            </div>

            <h3>
              No matching invoices
            </h3>

            <p>
              No invoice or customer matches
              "{searchTerm}".
            </p>

            <button
              type="button"
              className="empty-clear-search-button"
              onClick={() =>
                setSearchTerm('')
              }
            >
              Clear Search
            </button>

          </div>


        ) : (


          /* =================================================
             INVOICE LIST
             ================================================= */

          <div className="invoice-table-wrapper">

            <table className="invoice-list-table">

              <thead>

                <tr>

                  <th>
                    Invoice
                  </th>

                  <th>
                    Date
                  </th>

                  <th>
                    Customer
                  </th>

                  <th>
                    Payment
                  </th>

                  <th>
                    Amount
                  </th>

                  <th>
                    Action
                  </th>

                </tr>

              </thead>


              <tbody>

                {filteredInvoices.map(invoice => (

                  <tr
                    key={invoice._id}
                  >


                    {/* Invoice Number */}

                    <td>

                      <Link
                        to={`/invoices/${invoice._id}`}
                        className="invoice-number"
                      >
                        {invoice.invoiceNumber}
                      </Link>

                    </td>


                    {/* Date */}

                    <td>

                      <span className="invoice-date">

                        {formatDate(
                          invoice.invoiceDate
                        )}

                      </span>

                    </td>


                    {/* Customer */}

                    <td>

                      <div className="customer-cell">

                        <div className="customer-avatar">

                          {
                            (
                              invoice.customer?.name ||
                              'C'
                            )
                              .charAt(0)
                              .toUpperCase()
                          }

                        </div>

                        <div>

                          <strong>

                            {
                              invoice.customer?.name ||
                              'Unknown Customer'
                            }

                          </strong>

                          <span>

                            {
                              invoice.customer?.email ||
                              'No email'
                            }

                          </span>

                        </div>

                      </div>

                    </td>


                    {/* Payment */}

                    <td>

                      <span
                        className={`payment-status ${getStatusClass(
                          invoice.payment?.status
                        )}`}
                      >

                        <span className="status-dot"></span>

                        {
                          invoice.payment?.status ||
                          'Unknown'
                        }

                      </span>

                    </td>


                    {/* Amount */}

                    <td>

                      <strong className="invoice-amount">

                        {formatCurrency(
                          invoice.totals?.grandTotal
                        )}

                      </strong>

                    </td>


                    {/* Action */}

                    <td>

                      <Link
                        to={`/invoices/${invoice._id}`}
                        className="view-invoice-button"
                      >
                        View
                        <span>
                          →
                        </span>
                      </Link>

                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>

        )}

      </div>

    </div>
  )
}

export default Invoices