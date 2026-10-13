
import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { getInvoices } from '../services/api'
import './Invoices.css'

// =========================================================
// PAYMENT STATUS HELPER
// =========================================================

function getInvoicePaymentStatus(invoice) {
  const status = String(
    invoice.payment?.status || 'pending'
  ).trim().toLowerCase()

  // Paid invoices must never be marked overdue.
  if (status === 'paid') {
    return 'paid'
  }

  // Only sales invoices are checked for overdue status.
  const isSalesInvoice =
    invoice.recordType === 'sales' ||
    (!invoice.recordType && invoice.customer)

  if (!isSalesInvoice || !invoice.dueDate) {
    return status
  }

  const dueDate = new Date(invoice.dueDate)

  if (Number.isNaN(dueDate.getTime())) {
    return status
  }

  // Compare calendar dates, ignoring the current time.
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  dueDate.setHours(0, 0, 0, 0)

  if (dueDate < today) {
    return 'overdue'
  }

  return status
}


// =========================================================
// INVOICES COMPONENT
// =========================================================

function Invoices() {
  const [invoices, setInvoices] = useState([])
  const [searchParams, setSearchParams] = useSearchParams()

  const [activeType, setActiveType] = useState(
    searchParams.get('type') === 'purchase'
      ? 'purchase'
      : 'sales'
  )

  const [searchTerm, setSearchTerm] = useState('')
  const [paymentFilter, setPaymentFilter] = useState('all')

  const [salesPage, setSalesPage] = useState(1)
  const [purchasePage, setPurchasePage] = useState(1)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const itemsPerPage = 10

  // =======================================================
  // LOAD INVOICES
  // =======================================================

  useEffect(() => {
    let mounted = true

    async function loadInvoices() {
      try {
        setLoading(true)
        setError('')

        const data = await getInvoices()

        if (mounted) {
          setInvoices(Array.isArray(data) ? data : [])
        }
      } catch (err) {
        console.error('Failed to load invoices:', err)

        if (mounted) {
          setError(
            err.message || 'Failed to load invoices.'
          )
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    loadInvoices()

    return () => {
      mounted = false
    }
  }, [])

  // =======================================================
  // SPLIT SALES AND PURCHASE INVOICES
  // =======================================================

  const salesInvoices = useMemo(() => {
    return invoices.filter(
      invoice =>
        invoice.recordType === 'sales' ||
        (!invoice.recordType && invoice.customer)
    )
  }, [invoices])

  const purchaseInvoices = useMemo(() => {
    return invoices.filter(
      invoice =>
        invoice.recordType === 'purchase' ||
        invoice.invoiceType === 'purchase'
    )
  }, [invoices])

  // =======================================================
  // FILTER SALES INVOICES
  // =======================================================

  const filteredSalesInvoices = useMemo(() => {
    const search = searchTerm.trim().toLowerCase()

    return salesInvoices.filter(invoice => {
      const matchesSearch =
        String(invoice.invoiceNumber || '')
          .toLowerCase()
          .includes(search) ||
        String(invoice.customer?.name || '')
          .toLowerCase()
          .includes(search)

      const paymentStatus =
        getInvoicePaymentStatus(invoice)

      const matchesPayment =
        paymentFilter === 'all' ||
        paymentStatus === paymentFilter.toLowerCase()

      return matchesSearch && matchesPayment
    })
  }, [salesInvoices, searchTerm, paymentFilter])

  // =======================================================
  // FILTER PURCHASE INVOICES
  // =======================================================

  const filteredPurchaseInvoices = useMemo(() => {
    const search = searchTerm.trim().toLowerCase()

    return purchaseInvoices.filter(invoice => {
      return (
        String(invoice.invoiceNumber || '')
          .toLowerCase()
          .includes(search) ||
        String(invoice.vendor?.name || '')
          .toLowerCase()
          .includes(search)
      )
    })
  }, [purchaseInvoices, searchTerm])

  // =======================================================
  // CURRENT PAGE DATA
  // =======================================================

  const currentInvoices =
    activeType === 'sales'
      ? filteredSalesInvoices
      : filteredPurchaseInvoices

  const currentPage =
    activeType === 'sales'
      ? salesPage
      : purchasePage

  const totalPages = Math.max(
    1,
    Math.ceil(currentInvoices.length / itemsPerPage)
  )

  // Prevent stale page numbers from showing an empty page.
  const safeCurrentPage = Math.min(
    currentPage,
    totalPages
  )

  const startIndex =
    (safeCurrentPage - 1) * itemsPerPage

  const paginatedInvoices = currentInvoices.slice(
    startIndex,
    startIndex + itemsPerPage
  )

  // =======================================================
  // SUMMARY VALUES
  // =======================================================

  const totalValue = invoices.reduce(
    (sum, invoice) =>
      sum + Number(invoice.totals?.grandTotal || 0),
    0
  )

  const paidInvoices = salesInvoices.filter(
    invoice => getInvoicePaymentStatus(invoice) === 'paid'
  )

  // =======================================================
  // EVENT HANDLERS
  // =======================================================

  function changeType(type) {
    setActiveType(type)

    setSearchParams({ type })

    setSearchTerm('')
    setPaymentFilter('all')

    // Reset pagination for both invoice types.
    setSalesPage(1)
    setPurchasePage(1)
  }

  function handleSearchChange(value) {
    setSearchTerm(value)
    setSalesPage(1)
    setPurchasePage(1)
  }

  function handlePaymentFilterChange(value) {
    setPaymentFilter(value)
    setSalesPage(1)
  }

  function handlePageChange(page) {
    const nextPage = Math.max(
      1,
      Math.min(page, totalPages)
    )

    if (activeType === 'sales') {
      setSalesPage(nextPage)
    } else {
      setPurchasePage(nextPage)
    }
  }

  // =======================================================
  // FORMATTERS
  // =======================================================

  function formatAmount(amount) {
    return `₹${Number(amount || 0).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`
  }

  function formatDate(date) {
    if (!date) return '-'

    const parsedDate = new Date(date)

    if (Number.isNaN(parsedDate.getTime())) {
      return date
    }

    return parsedDate.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  // =======================================================
  // LOADING AND ERROR STATES
  // =======================================================

  if (loading) {
    return (
      <div className="invoices-page">
        <div className="invoices-loading">
          Loading invoices...
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="invoices-page">
        <div className="invoices-error">
          <p>{error}</p>

          <button
            type="button"
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  // =======================================================
  // RENDER
  // =======================================================

  return (
    <div className="invoices-page">

      {/* PAGE HEADER */}
      <div className="invoices-header">
        <div>
          <h1>Invoices</h1>
          <p>
            Manage and track your sales and purchase invoices.
          </p>
        </div>

        <Link
          to="/create-invoice"
          className="create-invoice-button"
        >
          + Create Invoice
        </Link>
      </div>

      {/* SUMMARY CARDS */}
      <div className="invoice-summary">

        <div className="invoice-summary-card">
          <span>Total Invoices</span>
          <strong>{invoices.length}</strong>
        </div>

        <div className="invoice-summary-card">
          <span>Sales Invoices</span>
          <strong>{salesInvoices.length}</strong>
        </div>

        <div className="invoice-summary-card">
          <span>Purchase Invoices</span>
          <strong>{purchaseInvoices.length}</strong>
        </div>

        <div className="invoice-summary-card">
          <span>Total Value</span>
          <strong>{formatAmount(totalValue)}</strong>
        </div>

      </div>

      {/* MAIN INVOICE CARD */}
      <div className="invoices-card">

        <div className="invoice-record-header">
          <div>
            <h2>Invoice Records</h2>
            <p>
              View and manage your invoice records.
            </p>
          </div>
        </div>

        {/* SALES / PURCHASE TABS */}
        <div className="invoice-type-navigation">

          <div
            className={`invoice-type-item ${
              activeType === 'sales' ? 'active' : ''
            }`}
            role="button"
            tabIndex={0}
            onClick={() => changeType('sales')}
            onKeyDown={event => {
              if (
                event.key === 'Enter' ||
                event.key === ' '
              ) {
                event.preventDefault()
                changeType('sales')
              }
            }}
          >
            Sales Invoices
            <span>{salesInvoices.length}</span>
          </div>

          <div
            className={`invoice-type-item ${
              activeType === 'purchase' ? 'active' : ''
            }`}
            role="button"
            tabIndex={0}
            onClick={() => changeType('purchase')}
            onKeyDown={event => {
              if (
                event.key === 'Enter' ||
                event.key === ' '
              ) {
                event.preventDefault()
                changeType('purchase')
              }
            }}
          >
            Purchase Invoices
            <span>{purchaseInvoices.length}</span>
          </div>

        </div>

        {/* SEARCH AND PAYMENT FILTER */}
        <div className="invoice-toolbar">

          <div className="invoice-search">
            <span className="invoice-search-icon">⌕</span>

            <input
              type="text"
              placeholder={
                activeType === 'sales'
                  ? 'Search invoice or customer...'
                  : 'Search invoice or vendor...'
              }
              value={searchTerm}
              onChange={event =>
                handleSearchChange(event.target.value)
              }
            />
          </div>

          {activeType === 'sales' && (
            <select
              value={paymentFilter}
              onChange={event =>
                handlePaymentFilterChange(event.target.value)
              }
            >
              <option value="all">All Payment Status</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="overdue">Overdue</option>
            </select>
          )}

        </div>

        {/* INVOICE TABLE */}
        <div className="invoice-table-wrapper">

          {activeType === 'sales' ? (

            <table className="invoice-list-table">
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Date</th>
                  <th>Customer</th>
                  <th>Payment</th>
                  <th>Amount</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {paginatedInvoices.length > 0 ? (
                  paginatedInvoices.map(invoice => {
                    const status =
                      getInvoicePaymentStatus(invoice)

                    return (
                      <tr key={invoice._id}>
                        <td>
                          <strong>
                            {invoice.invoiceNumber || '-'}
                          </strong>
                        </td>

                        <td>
                          {formatDate(invoice.invoiceDate)}
                        </td>

                        <td>
                          <div className="invoice-party">
                            <div className="invoice-party-avatar">
                              {(invoice.customer?.name || 'C')
                                .charAt(0)
                                .toUpperCase()}
                            </div>

                            <span>
                              {invoice.customer?.name || '-'}
                            </span>
                          </div>
                        </td>

                        <td>
                          <span
                            className={`payment-status ${status}`}
                          >
                            {status.charAt(0).toUpperCase() +
                              status.slice(1)}
                          </span>
                        </td>

                        <td>
                          <strong>
                            {formatAmount(
                              invoice.totals?.grandTotal
                            )}
                          </strong>
                        </td>

                        <td>
                          <Link
                            to={`/invoices/${invoice._id}`}
                            className="view-invoice-button"
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td
                      colSpan="6"
                      className="invoice-empty-state"
                    >
                      No sales invoices found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

          ) : (

            <table className="invoice-list-table">
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Date</th>
                  <th>Vendor</th>
                  <th>Payment Mode</th>
                  <th>Amount</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {paginatedInvoices.length > 0 ? (
                  paginatedInvoices.map(invoice => (
                    <tr key={invoice._id}>
                      <td>
                        <strong>
                          {invoice.invoiceNumber || '-'}
                        </strong>
                      </td>

                      <td>
                        {formatDate(invoice.invoiceDate)}
                      </td>

                      <td>
                        <div className="invoice-party">
                          <div className="invoice-party-avatar">
                            {(invoice.vendor?.name || 'V')
                              .charAt(0)
                              .toUpperCase()}
                          </div>

                          <span>
                            {invoice.vendor?.name || '-'}
                          </span>
                        </div>
                      </td>

                      <td>
                        <span className="payment-mode">
                          {invoice.paymentMode || '-'}
                        </span>
                      </td>

                      <td>
                        <strong>
                          {formatAmount(
                            invoice.totals?.grandTotal
                          )}
                        </strong>
                      </td>

                      <td>
                        <Link
                          to={`/invoices/${invoice._id}?type=purchase`}
                          className="view-invoice-button"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan="6"
                      className="invoice-empty-state"
                    >
                      No purchase invoices found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

          )}

        </div>

        {/* PAGINATION */}
        {currentInvoices.length > 0 && (
          <div className="invoice-pagination">

            <span>
              Showing {startIndex + 1}–
              {Math.min(
                startIndex + itemsPerPage,
                currentInvoices.length
              )}{' '}
              of {currentInvoices.length}
            </span>

            <div className="pagination-controls">

              <button
                type="button"
                disabled={safeCurrentPage === 1}
                onClick={() =>
                  handlePageChange(safeCurrentPage - 1)
                }
              >
                Previous
              </button>

              {Array.from(
                { length: totalPages },
                (_, index) => index + 1
              ).map(page => (
                <button
                  type="button"
                  key={page}
                  className={
                    page === safeCurrentPage ? 'active' : ''
                  }
                  onClick={() => handlePageChange(page)}
                >
                  {page}
                </button>
              ))}

              <button
                type="button"
                disabled={safeCurrentPage === totalPages}
                onClick={() =>
                  handlePageChange(safeCurrentPage + 1)
                }
              >
                Next
              </button>

            </div>
          </div>
        )}

      </div>
    </div>
  )
}

export default Invoices
