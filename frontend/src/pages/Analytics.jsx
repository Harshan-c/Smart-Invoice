import { useEffect, useMemo, useState } from 'react'
import { getDashboard, getForecast } from '../services/api'
import './Analytics.css'

const currency = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
})

function formatCurrency(value) {
  return currency.format(Number(value || 0))
}

// The experimental dataset is UK retail data, so do not format it as INR.
const forecastCurrency = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  maximumFractionDigits: 2,
})

function formatForecastCurrency(value) {
  return forecastCurrency.format(Number(value || 0))
}

function formatNumber(value) {
  return new Intl.NumberFormat('en-IN').format(Number(value || 0))
}

function formatDate(value) {
  if (!value) return '—'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return String(value)

  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function getStatus(status) {
  const normalized = String(status || 'pending').toLowerCase()

  if (normalized === 'paid') return 'Paid'
  if (normalized === 'overdue') return 'Overdue'

  return 'Pending'
}

function Analytics() {
  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [experimentalForecast, setExperimentalForecast] = useState(null)
  const [forecastLoading, setForecastLoading] = useState(true)
  const [forecastError, setForecastError] = useState('')

  useEffect(() => {
    let mounted = true

    async function loadAnalytics() {
      try {
        const data = await getDashboard()

        if (mounted) {
          setDashboard(data)
          setError('')
        }
      } catch (err) {
        if (mounted) {
          setError(err.message || 'Unable to load analytics.')
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    loadAnalytics()

    return () => {
      mounted = false
    }
  }, [])

  // Load the research-dataset forecast independently so a forecast failure
  // never prevents the company's invoice analytics from loading.
  useEffect(() => {
    let mounted = true

    async function loadExperimentalForecast() {
      try {
        const data = await getForecast()
        if (mounted) {
          setExperimentalForecast(data)
          setForecastError('')
        }
      } catch (err) {
        if (mounted) {
          setForecastError(err.message || 'Unable to load experimental forecast.')
        }
      } finally {
        if (mounted) setForecastLoading(false)
      }
    }

    loadExperimentalForecast()
    return () => {
      mounted = false
    }
  }, [])

  const monthly = dashboard?.monthly || []
  const summary = dashboard?.summary || {}
  const payments = dashboard?.payments || {}
  const recentInvoices = dashboard?.recentInvoices || []
  const [chartPeriod, setChartPeriod] = useState('6')

  // This filter affects the monthly charts only. Summary cards and
  // month-over-month insights continue to use the full dashboard response.
  const filteredMonthly = useMemo(
    () => (chartPeriod === '3' ? monthly.slice(-3) : monthly),
    [monthly, chartPeriod]
  )

  const chartMax = useMemo(() => {
    const values = filteredMonthly.flatMap((item) => [
      Number(item.sales || 0),
      Number(item.purchases || 0),
    ])

    return Math.max(...values, 1)
  }, [filteredMonthly])

  const profitMax = useMemo(() => {
    return Math.max(
      ...filteredMonthly.map((item) => Math.abs(Number(item.profit || 0))),
      1
    )
  }, [filteredMonthly])

  const paymentTotal =
    Number(payments.paid || 0) +
    Number(payments.pending || 0) +
    Number(payments.overdue || 0)

  const paidCount = Number(payments.paid || 0)
  const pendingCount = Number(payments.pending || 0)
  const overdueCount = Number(payments.overdue || 0)

  const paidPercentage = paymentTotal
    ? (paidCount / paymentTotal) * 100
    : 0
  const pendingPercentage = paymentTotal
    ? (pendingCount / paymentTotal) * 100
    : 0
  const overduePercentage = paymentTotal
    ? (overdueCount / paymentTotal) * 100
    : 0
  const outstandingCount = pendingCount + overdueCount
  const outstandingPercentage = paymentTotal
    ? (outstandingCount / paymentTotal) * 100
    : 0

  const netMargin = Number(summary.totalSales || 0)
    ? (Number(summary.profit || 0) /
        Number(summary.totalSales || 0)) *
      100
    : null

  // Compare the two most recent months already returned by the dashboard API.
  const latestMonth = monthly.length ? monthly[monthly.length - 1] : null
  const previousMonth =
    monthly.length > 1 ? monthly[monthly.length - 2] : null

  function getMonthlyChange(metric) {
    if (!latestMonth || !previousMonth) {
      return {
        available: false,
        label: 'Not enough monthly data',
        detail: 'A second month is needed for comparison.',
        color: '#8793a4',
      }
    }

    const current = Number(latestMonth[metric] || 0)
    const previous = Number(previousMonth[metric] || 0)

    if (previous === 0) {
      if (current === 0) {
        return {
          available: true,
          label: 'No change',
          detail: 'Both months recorded ₹0.',
          color: '#718096',
        }
      }

      return {
        available: true,
        label: 'New activity',
        detail: `${formatCurrency(current)} in the latest month`,
        color: '#168b82',
      }
    }

    const percentage = ((current - previous) / Math.abs(previous)) * 100
    const direction =
      percentage > 0 ? 'increased' : percentage < 0 ? 'decreased' : 'unchanged'
    const roundedPercentage = Math.abs(percentage).toFixed(1)

    return {
      available: true,
      label:
        percentage === 0
          ? 'No change'
          : `${roundedPercentage}% ${direction}`,
      detail: `${formatCurrency(previous)} → ${formatCurrency(current)}`,
      color:
        percentage === 0
          ? '#718096'
          : metric === 'purchases'
            ? '#7954b3'
            : percentage > 0
              ? '#168b82'
              : '#c04444',
    }
  }

  const salesChange = getMonthlyChange('sales')
  const purchasesChange = getMonthlyChange('purchases')
  const profitChange = getMonthlyChange('profit')

  // Simple baseline forecast: average the latest three available monthly values.
  // This is an estimate for demonstration, not a predictive ML model.
  const forecast = useMemo(() => {
    const forecastMonths = monthly.slice(-3)
    if (!forecastMonths.length) return null

    const average = (metric) =>
      forecastMonths.reduce(
        (total, item) => total + Number(item[metric] || 0),
        0
      ) / forecastMonths.length

    const sales = average('sales')
    const purchases = average('purchases')

    return {
      sales,
      purchases,
      profit: sales - purchases,
      basedOn: forecastMonths.length,
    }
  }, [monthly])

  if (loading) {
    return (
      <section className="analytics-page">
        <div className="analytics-state">
          <div className="analytics-spinner" />
          <p>Loading financial analytics...</p>
        </div>
      </section>
    )
  }

  if (error) {
    return (
      <section className="analytics-page">
        <div className="analytics-state analytics-error">
          <h2>Unable to load analytics</h2>
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

  return (
    <section className="analytics-page">
      {/* Page heading */}
      <header className="analytics-heading">
        <div>
          <h1>Financial Analytics</h1>
          <p>
            Understand your business performance through invoice
            and payment data.
          </p>
        </div>

        <div className="analytics-period-label">
          <span className="analytics-live-dot" />
          Based on available dashboard data
        </div>
      </header>

      {/* Summary cards */}
      <div className="analytics-stat-grid">
        <article className="analytics-stat-card">
          <div className="analytics-stat-top">
            <span>Total Sales</span>
            <span className="analytics-stat-icon sales">₹</span>
          </div>
          <strong>{formatCurrency(summary.totalSales)}</strong>
          <p>Recorded sales value</p>
        </article>

        <article className="analytics-stat-card">
          <div className="analytics-stat-top">
            <span>Total Purchases</span>
            <span className="analytics-stat-icon purchases">₹</span>
          </div>
          <strong>{formatCurrency(summary.totalPurchases)}</strong>
          <p>Recorded purchase value</p>
        </article>

        <article className="analytics-stat-card">
          <div className="analytics-stat-top">
            <span>Net Profit</span>
            <span className="analytics-stat-icon profit">↗</span>
          </div>
          <strong
            className={
              Number(summary.profit) < 0
                ? 'analytics-negative-value'
                : ''
            }
          >
            {formatCurrency(summary.profit)}
          </strong>
          <p>Sales minus purchases</p>
        </article>

        <article className="analytics-stat-card">
          <div className="analytics-stat-top">
            <span>Payment Completion</span>
            <span className="analytics-stat-icon payments">%</span>
          </div>
          <strong>{paidPercentage.toFixed(1)}%</strong>
          <p>
            {formatNumber(paidCount)} of {formatNumber(paymentTotal)}
            {' '}recorded invoices paid
          </p>
        </article>
      </div>

      {/* Month-over-month insights */}
      <section className="analytics-panel" style={{ marginBottom: 23 }}>
        <div className="analytics-panel-heading">
          <div>
            <h2>Month-over-Month Insights</h2>
            <p>
              {latestMonth && previousMonth
                ? `${previousMonth.month} compared with ${latestMonth.month}`
                : 'Compare the latest two months of available data'}
            </p>
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 16,
          }}
        >
          {[
            { label: 'Sales', change: salesChange },
            { label: 'Purchases', change: purchasesChange },
            { label: 'Profit', change: profitChange },
          ].map(({ label, change }) => (
            <article
              key={label}
              style={{
                minWidth: 0,
                padding: 16,
                border: '1px solid #e4eaf1',
                borderRadius: 10,
                background: '#fbfcfe',
              }}
            >
              <p
                style={{
                  margin: '0 0 10px',
                  color: '#728197',
                  fontSize: 12,
                  fontWeight: 650,
                }}
              >
                {label}
              </p>
              <strong
                style={{
                  display: 'block',
                  marginBottom: 8,
                  color: change.color,
                  fontSize: 17,
                  lineHeight: 1.4,
                  overflowWrap: 'anywhere',
                }}
              >
                {change.label}
              </strong>
              <p
                style={{
                  margin: 0,
                  color: '#8793a4',
                  fontSize: 11,
                  lineHeight: 1.6,
                  overflowWrap: 'anywhere',
                }}
              >
                {change.detail}
              </p>
            </article>
          ))}
        </div>

        {!previousMonth && (
          <p className="analytics-note">
            Month-over-month insights will appear when the dashboard has data
            for at least two months.
          </p>
        )}
      </section>

      {/* Performance charts */}
      <div className="analytics-main-grid">
        <section className="analytics-panel analytics-sales-panel">
          <div className="analytics-panel-heading">
            <div>
              <h2>Sales vs Purchases</h2>
              <p>Monthly comparison from available records</p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <label
                htmlFor="analytics-chart-period"
                style={{ color: '#728197', fontSize: 12, fontWeight: 600 }}
              >
                Show
              </label>
              <select
                id="analytics-chart-period"
                value={chartPeriod}
                onChange={(event) => setChartPeriod(event.target.value)}
                style={{
                  padding: '8px 10px',
                  border: '1px solid #dce5ed',
                  borderRadius: 7,
                  background: '#fff',
                  color: '#526277',
                  font: 'inherit',
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                <option value="3">Last 3 months</option>
                <option value="6">Last 6 months</option>
              </select>
            </div>

            <div className="analytics-legend">
              <span>
                <i className="analytics-legend-sales" />
                Sales
              </span>
              <span>
                <i className="analytics-legend-purchases" />
                Purchases
              </span>
            </div>
          </div>

          {filteredMonthly.length === 0 ? (
            <div className="analytics-empty-chart">
              Monthly data is not available yet.
            </div>
          ) : (
            <div className="analytics-bar-chart">
              {filteredMonthly.map((item) => {
                const sales = Number(item.sales || 0)
                const purchases = Number(item.purchases || 0)

                const salesHeight =
                  sales > 0
                    ? Math.max((sales / chartMax) * 100, 3)
                    : 0

                const purchasesHeight =
                  purchases > 0
                    ? Math.max((purchases / chartMax) * 100, 3)
                    : 0

                return (
                  <div
                    className="analytics-chart-column"
                    key={item.month}
                  >
                    <div className="analytics-chart-values">
                      <span>{formatCurrency(sales)}</span>
                      <span>{formatCurrency(purchases)}</span>
                    </div>

                    <div className="analytics-bars">
                      <div
                        className="analytics-bar analytics-sales-bar"
                        style={{ height: `${salesHeight}%` }}
                        title={`Sales: ${formatCurrency(sales)}`}
                      />
                      <div
                        className="analytics-bar analytics-purchases-bar"
                        style={{ height: `${purchasesHeight}%` }}
                        title={`Purchases: ${formatCurrency(purchases)}`}
                      />
                    </div>

                    <span className="analytics-chart-label">
                      {String(item.month || '').split(' ')[0]}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        <section className="analytics-panel analytics-payment-panel">
          <div className="analytics-panel-heading">
            <div>
              <h2>Payment Overview</h2>
              <p>Invoice payment status counts</p>
            </div>
          </div>

          <div
            className="analytics-payment-progress"
            role="img"
            aria-label={`Payment status distribution: ${paidPercentage.toFixed(1)}% paid, ${pendingPercentage.toFixed(1)}% pending, ${overduePercentage.toFixed(1)}% overdue`}
            style={{ display: 'flex' }}
          >
            <div
              style={{ width: `${paidPercentage}%`, height: '100%', background: '#21875d' }}
              title={`Paid: ${paidPercentage.toFixed(1)}%`}
            />
            <div
              style={{ width: `${pendingPercentage}%`, height: '100%', background: '#dca13b' }}
              title={`Pending: ${pendingPercentage.toFixed(1)}%`}
            />
            <div
              style={{ width: `${overduePercentage}%`, height: '100%', background: '#cf5050' }}
              title={`Overdue: ${overduePercentage.toFixed(1)}%`}
            />
          </div>

          <div className="analytics-payment-row">
            <span>
              <i className="analytics-status-dot paid" />
              Paid
            </span>
            <strong>{formatNumber(paidCount)} ({paidPercentage.toFixed(1)}%)</strong>
          </div>

          <div className="analytics-payment-row">
            <span>
              <i className="analytics-status-dot pending" />
              Pending
            </span>
            <strong>{formatNumber(pendingCount)} ({pendingPercentage.toFixed(1)}%)</strong>
          </div>

          <div
            className="analytics-payment-row"
            style={{
              margin: '0 -8px',
              padding: '15px 8px',
              borderRadius: 7,
              background: overdueCount > 0 ? '#fff5f5' : 'transparent',
            }}
          >
            <span>
              <i className="analytics-status-dot overdue" />
              Overdue
            </span>
            <strong style={{ color: overdueCount > 0 ? '#c04444' : undefined }}>
              {formatNumber(overdueCount)} ({overduePercentage.toFixed(1)}%)
            </strong>
          </div>

          <div className="analytics-payment-total">
            <span>Outstanding invoices (pending + overdue)</span>
            <strong>{formatNumber(outstandingCount)}</strong>
          </div>

          <div
            style={{
              marginTop: 14,
              padding: 13,
              border: `1px solid ${overdueCount > 0 ? '#f1d1d1' : '#dceeea'}`,
              borderRadius: 9,
              background: overdueCount > 0 ? '#fff7f7' : '#f3f9f8',
            }}
          >
            <strong
              style={{
                display: 'block',
                marginBottom: 5,
                color: overdueCount > 0 ? '#b83e3e' : '#287a70',
                fontSize: 12,
              }}
            >
              {overdueCount > 0 ? 'Attention: overdue invoices' : 'No overdue invoices recorded'}
            </strong>
            <p style={{ margin: 0, color: '#718096', fontSize: 11, lineHeight: 1.7 }}>
              {overdueCount > 0
                ? `${formatNumber(overdueCount)} invoice(s) are overdue. ${outstandingPercentage.toFixed(1)}% of recorded invoices remain unpaid.`
                : `${formatNumber(outstandingCount)} invoice(s) are pending. ${outstandingPercentage.toFixed(1)}% of recorded invoices remain unpaid.`}
            </p>
          </div>

          <p className="analytics-note">
            Percentages are based on payment-status counts returned by the existing dashboard API.
            Outstanding is shown as invoice count; this API does not provide unpaid amounts by status.
          </p>
        </section>
      </div>

      {/* Profit analysis */}
      <section className="analytics-panel analytics-profit-panel">
        <div className="analytics-panel-heading">
          <div>
            <h2>Monthly Profit Analysis</h2>
            <p>Calculated as sales minus purchases</p>
          </div>

          {netMargin !== null && (
            <div className="analytics-margin">
              <span>Net margin</span>
              <strong
                className={
                  netMargin < 0
                    ? 'analytics-negative-value'
                    : ''
                }
              >
                {netMargin.toFixed(1)}%
              </strong>
            </div>
          )}
        </div>

        {filteredMonthly.length === 0 ? (
          <div className="analytics-empty-chart">
            Monthly profit data is not available yet.
          </div>
        ) : (
          <div className="analytics-profit-list">
            {filteredMonthly.map((item) => {
              const profit = Number(item.profit || 0)
              const width = Math.min(
                (Math.abs(profit) / profitMax) * 100,
                100
              )

              return (
                <div
                  className="analytics-profit-row"
                  key={item.month}
                >
                  <span className="analytics-profit-month">
                    {item.month}
                  </span>

                  <div className="analytics-profit-track">
                    <div
                      className={`analytics-profit-bar ${
                        profit < 0 ? 'negative' : ''
                      }`}
                      style={{ width: `${width}%` }}
                      title={formatCurrency(profit)}
                    />
                  </div>

                  <strong
                    className={
                      profit < 0
                        ? 'analytics-negative-value'
                        : ''
                    }
                  >
                    {formatCurrency(profit)}
                  </strong>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* Baseline financial forecast */}
      <section className="analytics-panel" style={{ marginBottom: 23 }}>
        <div className="analytics-panel-heading">
          <div>
            <h2>Estimated Next-Month Forecast</h2>
            <p>
              Simple average of the latest {forecast?.basedOn || 0} available
              month(s), based on recorded sales and purchases
            </p>
          </div>
        </div>

        {forecast ? (
          <>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: 16,
              }}
            >
              {[
                { label: 'Estimated Sales', value: forecast.sales, color: '#168b82' },
                { label: 'Estimated Purchases', value: forecast.purchases, color: '#7954b3' },
                { label: 'Projected Profit', value: forecast.profit, color: forecast.profit < 0 ? '#c04444' : '#168b82' },
              ].map((item) => (
                <article
                  key={item.label}
                  style={{
                    minWidth: 0,
                    padding: 16,
                    border: '1px solid #e4eaf1',
                    borderRadius: 10,
                    background: '#fbfcfe',
                  }}
                >
                  <p
                    style={{
                      margin: '0 0 10px',
                      color: '#728197',
                      fontSize: 12,
                      fontWeight: 650,
                    }}
                  >
                    {item.label}
                  </p>
                  <strong
                    className={item.value < 0 ? 'analytics-negative-value' : ''}
                    style={{
                      display: 'block',
                      color: item.value < 0 ? undefined : item.color,
                      fontSize: 20,
                      lineHeight: 1.4,
                      overflowWrap: 'anywhere',
                    }}
                  >
                    {formatCurrency(item.value)}
                  </strong>
                </article>
              ))}
            </div>
            <p className="analytics-note">
              This is a basic baseline estimate, not an AI/ML prediction or a
              guarantee of future performance. Actual results may differ, and
              the estimate can be less reliable when only a few months of data
              are available.
            </p>
          </>
        ) : (
          <div className="analytics-empty-chart">
            Forecasting will appear when monthly sales and purchase data is available.
          </div>
        )}
      </section>

      {/* Experimental dataset forecast — intentionally separate from company data */}
      <section className="analytics-panel" style={{ marginBottom: 23 }}>
        <div className="analytics-panel-heading">
          <div>
            <h2>Experimental Sales Forecast (Research Dataset)</h2>
            <p>
              Forecast generated from the UCI Online Retail II dataset, not from
              your company's MongoDB invoices.
            </p>
          </div>
          {experimentalForecast?.selectedModel && (
            <span className="analytics-record-count">
              Model: {String(experimentalForecast.selectedModel).replaceAll('_', ' ')}
            </span>
          )}
        </div>

        {forecastLoading ? (
          <div className="analytics-empty-chart">Loading experimental forecast...</div>
        ) : forecastError ? (
          <div className="analytics-empty-chart">
            <p>{forecastError}</p>
            <p>Company financial analytics are still available above.</p>
          </div>
        ) : experimentalForecast ? (
          <>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: 16,
              }}
            >
              <article style={{ minWidth: 0, padding: 16, border: '1px solid #e4eaf1', borderRadius: 10, background: '#fbfcfe' }}>
                <p style={{ margin: '0 0 10px', color: '#728197', fontSize: 12, fontWeight: 650 }}>Forecast Month</p>
                <strong style={{ display: 'block', fontSize: 20, lineHeight: 1.4, overflowWrap: 'anywhere' }}>
                  {experimentalForecast.forecastMonth || '—'}
                </strong>
              </article>
              <article style={{ minWidth: 0, padding: 16, border: '1px solid #e4eaf1', borderRadius: 10, background: '#fbfcfe' }}>
                <p style={{ margin: '0 0 10px', color: '#728197', fontSize: 12, fontWeight: 650 }}>Estimated Sales</p>
                <strong style={{ display: 'block', color: '#168b82', fontSize: 20, lineHeight: 1.4, overflowWrap: 'anywhere' }}>
                  {formatForecastCurrency(experimentalForecast.nextMonthSalesEstimate)}
                </strong>
              </article>
              <article style={{ minWidth: 0, padding: 16, border: '1px solid #e4eaf1', borderRadius: 10, background: '#fbfcfe' }}>
                <p style={{ margin: '0 0 10px', color: '#728197', fontSize: 12, fontWeight: 650 }}>Selected Model</p>
                <strong style={{ display: 'block', fontSize: 20, lineHeight: 1.4, overflowWrap: 'anywhere' }}>
                  {String(experimentalForecast.selectedModel || '—').replaceAll('_', ' ')}
                </strong>
              </article>
            </div>

            {Array.isArray(experimentalForecast.metrics) && experimentalForecast.metrics.length > 0 && (
              <div style={{ marginTop: 20 }}>
                <h3 style={{ margin: '0 0 10px', fontSize: 15 }}>Model Backtesting (MAE)</h3>
                <div className="analytics-table-wrapper">
                  <table className="analytics-table">
                    <thead><tr><th>Model</th><th>Mean Absolute Error</th></tr></thead>
                    <tbody>
                      {experimentalForecast.metrics.map((metric, index) => {
                        const modelName = metric.model || metric.Model || metric.name || 'Model'
                        const mae = metric.meanAbsoluteError ?? metric.meanMAE ?? metric.mean_mae ?? metric.MAE ?? metric.mae ?? metric.AbsoluteError
                        return (
                          <tr key={`${modelName}-${index}`}>
                            <td>{String(modelName).replaceAll('_', ' ')}</td>
                            <td>{mae == null ? '—' : formatForecastCurrency(mae)}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {Array.isArray(experimentalForecast.history) && experimentalForecast.history.length > 0 && (
              <div style={{ marginTop: 20 }}>
                <h3 style={{ margin: '0 0 10px', fontSize: 15 }}>Historical Dataset Sales</h3>
                <div className="analytics-table-wrapper">
                  <table className="analytics-table">
                    <thead><tr><th>Month</th><th>Sales</th></tr></thead>
                    <tbody>
                      {experimentalForecast.history.slice(-6).map((item, index) => (
                        <tr key={`${item.month || item.Month || index}`}>
                          <td>{item.month || item.Month || item.date || '—'}</td>
                          <td>{formatForecastCurrency(item.sales ?? item.Sales ?? item.LineTotal)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <p className="analytics-note">
              {experimentalForecast.currencyNote || 'Values are from a historical UK retail research dataset and are not your company’s actual revenue, profit, or a guarantee of future performance.'}
            </p>
          </>
        ) : (
          <div className="analytics-empty-chart">No experimental forecast data was returned by the API.</div>
        )}
      </section>

      {/* Recent invoice records */}
      <section className="analytics-panel analytics-records-panel">
        <div className="analytics-panel-heading">
          <div>
            <h2>Recent Invoice Activity</h2>
            <p>Latest records returned by the dashboard</p>
          </div>

          <span className="analytics-record-count">
            {formatNumber(recentInvoices.length)} records
          </span>
        </div>

        {recentInvoices.length === 0 ? (
          <div className="analytics-empty-records">
            <h3>No invoice activity yet</h3>
            <p>
              Create a sales invoice or upload a purchase invoice
              to see records here.
            </p>
          </div>
        ) : (
          <div className="analytics-table-wrapper">
            <table className="analytics-table">
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
                {recentInvoices.map((invoice) => {
                  const status = String(
                    invoice.paymentStatus || 'pending'
                  ).toLowerCase()

                  return (
                    <tr key={invoice.id}>
                      <td className="analytics-invoice-number">
                        {invoice.invoiceNumber || '—'}
                      </td>

                      <td>
                        <span
                          className={`analytics-type-badge ${
                            invoice.recordType === 'sales'
                              ? 'sales'
                              : 'purchase'
                          }`}
                        >
                          {invoice.recordType === 'sales'
                            ? 'Sales'
                            : 'Purchase'}
                        </span>
                      </td>

                      <td>{invoice.partyName || '—'}</td>
                      <td>{formatDate(invoice.invoiceDate)}</td>
                      <td className="analytics-amount">
                        {formatCurrency(invoice.amount)}
                      </td>

                      <td>
                        <span
                          className={`analytics-status-badge ${status}`}
                        >
                          {getStatus(status)}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </section>
  )
}

export default Analytics