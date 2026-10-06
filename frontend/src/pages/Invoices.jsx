import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { getInvoices } from '../services/api'
import './Invoices.css'

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

  const itemsPerPage = 10

  useEffect(() => {
    loadInvoices()
  }, [])

  async function loadInvoices() {
    try {
      const data = await getInvoices()
      setInvoices(data)
    } catch (error) {
      console.error('Failed to load invoices:', error)
    }
  }

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

  const filteredSalesInvoices = useMemo(() => {
    return salesInvoices.filter(invoice => {
      const search = searchTerm.toLowerCase()

      const matchesSearch =
        String(invoice.invoiceNumber || '')
          .toLowerCase()
          .includes(search) ||
        String(invoice.customer?.name || '')
          .toLowerCase()
          .includes(search)

      const paymentStatus = String(
        invoice.payment?.status || ''
      ).toLowerCase()

      const matchesPayment =
        paymentFilter === 'all' ||
        paymentStatus === paymentFilter.toLowerCase()

      return matchesSearch && matchesPayment
    })
  }, [salesInvoices, searchTerm, paymentFilter])

  const filteredPurchaseInvoices = useMemo(() => {
    return purchaseInvoices.filter(invoice => {
      const search = searchTerm.toLowerCase()

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

  const startIndex =
    (currentPage - 1) * itemsPerPage

  const paginatedInvoices = currentInvoices.slice(
    startIndex,
    startIndex + itemsPerPage
  )

  const totalValue = invoices.reduce(
    (sum, invoice) =>
      sum + Number(invoice.totals?.grandTotal || 0),
    0
  )

  const paidInvoices = salesInvoices.filter(
    invoice =>
      String(invoice.payment?.status || '').toLowerCase() ===
      'paid'
  )

  function changeType(type) {
    setActiveType(type)

    setSearchParams({
      type
    })

    setSearchTerm('')
    setPaymentFilter('all')
  }

  function handlePageChange(page) {
    if (activeType === 'sales') {
      setSalesPage(page)
    } else {
      setPurchasePage(page)
    }
  }

  function formatAmount(amount) {
    return `₹${Number(amount || 0).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
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
      year: 'numeric'
    })
  }

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

      {/* SUMMARY */}
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

      {/* MAIN CARD */}
      <div className="invoices-card">

        <div className="invoice-record-header">
          <div>
            <h2>Invoice Records</h2>
            <p>
              View and manage your invoice records.
            </p>
          </div>
        </div>

        {/* TEXT TABS */}
        <div className="invoice-type-navigation">

          <div
            className={`invoice-type-item ${
              activeType === 'sales' ? 'active' : ''
            }`}
            onClick={() => changeType('sales')}
          >
            Sales Invoices
            <span>{salesInvoices.length}</span>
          </div>

          <div
            className={`invoice-type-item ${
              activeType === 'purchase' ? 'active' : ''
            }`}
            onClick={() => changeType('purchase')}
          >
            Purchase Invoices
            <span>{purchaseInvoices.length}</span>
          </div>

        </div>

        {/* SEARCH / FILTER */}
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
              onChange={event => {
                setSearchTerm(event.target.value)

                if (activeType === 'sales') {
                  setSalesPage(1)
                } else {
                  setPurchasePage(1)
                }
              }}
            />
          </div>

          {activeType === 'sales' && (
            <select
              value={paymentFilter}
              onChange={event => {
                setPaymentFilter(event.target.value)
                setSalesPage(1)
              }}
            >
              <option value="all">All Payment Status</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
            </select>
          )}

        </div>

        {/* TABLE */}
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
                          className={`payment-status ${
                            String(
                              invoice.payment?.status || ''
                            ).toLowerCase()
                          }`}
                        >
                          {invoice.payment?.status || 'Pending'}
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

                  ))

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
                disabled={currentPage === 1}
                onClick={() =>
                  handlePageChange(currentPage - 1)
                }
              >
                Previous
              </button>

              {Array.from(
                { length: totalPages },
                (_, index) => index + 1
              ).map(page => (

                <button
                  key={page}
                  className={
                    page === currentPage
                      ? 'active'
                      : ''
                  }
                  onClick={() =>
                    handlePageChange(page)
                  }
                >
                  {page}
                </button>

              ))}

              <button
                disabled={currentPage === totalPages}
                onClick={() =>
                  handlePageChange(currentPage + 1)
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