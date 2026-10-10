import { useEffect, useMemo, useState } from 'react'
import { getDashboard } from '../services/api'
import './Dashboard.css'

const currency = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
})

function formatCurrency(value) {
  return currency.format(Number(value || 0))
}

function formatDate(value) {
  if (!value) return '—'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function statusLabel(status) {
  const normalized = String(status || 'pending').toLowerCase()

  if (normalized === 'paid') return 'Paid'
  if (normalized === 'overdue') return 'Overdue'
  return 'Pending'
}

function Dashboard() {
  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true

    async function loadDashboard() {
      try {
        const data = await getDashboard()

        if (mounted) {
          setDashboard(data)
          setError('')
        }
      } catch (err) {
        if (mounted) {
          setError(err.message || 'Failed to load dashboard')
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    loadDashboard()

    return () => {
      mounted = false
    }
  }, [])

  const chartMax = useMemo(() => {
    if (!dashboard?.monthly?.length) return 1

    const values = dashboard.monthly.flatMap((item) => [
      Number(item.sales || 0),
      Number(item.purchases || 0),
    ])

    return Math.max(...values, 1)
  }, [dashboard])

  if (loading) {
    return (
      <section className="dashboard-page">
        <div className="dashboard-state">
          <div className="dashboard-spinner" />
          <p>Loading financial dashboard...</p>
        </div>
      </section>
    )
  }

  if (error) {
    return (
      <section className="dashboard-page">
        <div className="dashboard-state dashboard-error">
          <h2>Unable to load dashboard</h2>
          <p>{error}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </div>
      </section>
    )
  }

  const summary = dashboard?.summary || {}
  const payments = dashboard?.payments || {}
  const monthly = dashboard?.monthly || []
  const recentInvoices = dashboard?.recentInvoices || []

  return (
    <section className="dashboard-page">
      <div className="dashboard-heading">
        <div>
          <h1>Dashboard</h1>
          <p>
            Here's a quick overview of your business finances.
          </p>
        </div>
      </div>

      <div className="dashboard-stat-grid">
        <article className="dashboard-stat-card">
          <div className="stat-card-icon sales-icon">₹</div>
          <div>
            <span>Total Sales</span>
            <strong>{formatCurrency(summary.totalSales)}</strong>
          </div>
        </article>

        <article className="dashboard-stat-card">
          <div className="stat-card-icon purchase-icon">₹</div>
          <div>
            <span>Total Purchases</span>
            <strong>{formatCurrency(summary.totalPurchases)}</strong>
          </div>
        </article>

        <article className="dashboard-stat-card">
          <div className="stat-card-icon profit-icon">↗</div>
          <div>
            <span>Net Profit</span>
            <strong className={Number(summary.profit) < 0 ? 'negative-value' : ''}>
              {formatCurrency(summary.profit)}
            </strong>
          </div>
        </article>

        <article className="dashboard-stat-card">
          <div className="stat-card-icon pending-icon">◷</div>
          <div>
            <span>Pending Payments</span>
            <strong>{payments.pending || 0}</strong>
          </div>
        </article>
      </div>

      <div className="dashboard-grid dashboard-grid-main">
        <section className="dashboard-panel sales-purchases-panel">
          <div className="panel-header">
            <div>
              <h2>Sales vs Purchases</h2>
              <p>Last 6 months</p>
            </div>

            <div className="chart-legend">
              <span><i className="legend-sales" /> Sales</span>
              <span><i className="legend-purchases" /> Purchases</span>
            </div>
          </div>

          <div className="bar-chart">
            {monthly.map((item) => (
              <div className="bar-chart-column" key={item.month}>
                <div className="bars">
                  <div
                    className="bar sales-bar"
                    style={{
                      height: `${Math.max(
                        (Number(item.sales || 0) / chartMax) * 100,
                        Number(item.sales) > 0 ? 4 : 0
                      )}%`,
                    }}
                    title={`Sales: ${formatCurrency(item.sales)}`}
                  />

                  <div
                    className="bar purchases-bar"
                    style={{
                      height: `${Math.max(
                        (Number(item.purchases || 0) / chartMax) * 100,
                        Number(item.purchases) > 0 ? 4 : 0
                      )}%`,
                    }}
                    title={`Purchases: ${formatCurrency(item.purchases)}`}
                  />
                </div>

                <span>{item.month.split(' ')[0]}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="dashboard-panel payment-panel">
          <div className="panel-header">
            <div>
              <h2>Payment Status</h2>
              <p>Invoice payment overview</p>
            </div>
          </div>

          <div className="payment-summary">
            <div className="payment-row">
              <span><i className="status-dot paid-dot" /> Paid</span>
              <strong>{payments.paid || 0}</strong>
            </div>

            <div className="payment-row">
              <span><i className="status-dot pending-dot" /> Pending</span>
              <strong>{payments.pending || 0}</strong>
            </div>

            <div className="payment-row">
              <span><i className="status-dot overdue-dot" /> Overdue</span>
              <strong>{payments.overdue || 0}</strong>
            </div>
          </div>

          <div className="payment-note">
            Purchases are included in total expenses because the current
            application stores purchase invoices as financial outflows.
          </div>
        </section>
      </div>

      <section className="dashboard-panel profit-panel">
        <div className="panel-header">
          <div>
            <h2>Profit Trend</h2>
            <p>Monthly sales minus purchases</p>
          </div>
        </div>

        <div className="profit-list">
          {monthly.map((item) => (
            <div className="profit-row" key={item.month}>
              <span>{item.month}</span>

              <div className="profit-track">
                <div
                  className={`profit-bar ${
                    Number(item.profit) < 0 ? 'profit-negative' : ''
                  }`}
                  style={{
                    width: `${Math.min(
                      Math.abs(Number(item.profit || 0)) /
                        Math.max(
                          ...monthly.map((entry) =>
                            Math.abs(Number(entry.profit || 0))
                          ),
                          1
                        ) *
                        100,
                      100
                    )}%`,
                  }}
                />
              </div>

              <strong className={Number(item.profit) < 0 ? 'negative-value' : ''}>
                {formatCurrency(item.profit)}
              </strong>
            </div>
          ))}
        </div>
      </section>

      <section className="dashboard-panel recent-panel">
        <div className="panel-header">
          <div>
            <h2>Recent Invoices</h2>
            <p>Your latest sales and purchase invoices</p>
          </div>
        </div>

        {recentInvoices.length === 0 ? (
          <div className="dashboard-empty">
            <h3>No invoices yet</h3>
            <p>Create a sales invoice or purchase invoice to see it here.</p>
          </div>
        ) : (
          <div className="recent-table-wrapper">
            <table className="recent-table">
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Type</th>
                  <th>Customer / Vendor</th>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {recentInvoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td className="invoice-number">
                      {invoice.invoiceNumber}
                    </td>

                    <td>
                      <span className={`type-badge ${invoice.recordType}`}>
                        {invoice.recordType === 'sales'
                          ? 'Sales'
                          : 'Purchase'}
                      </span>
                    </td>

                    <td>{invoice.partyName}</td>
                    <td>{formatDate(invoice.invoiceDate)}</td>
                    <td>{formatCurrency(invoice.amount)}</td>

                    <td>
                      <span
                        className={`payment-badge ${String(
                          invoice.paymentStatus || 'pending'
                        ).toLowerCase()}`}
                      >
                        {statusLabel(invoice.paymentStatus)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </section>
  )
}

export default Dashboard
