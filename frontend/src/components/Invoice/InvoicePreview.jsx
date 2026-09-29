import '../../pages/InvoiceGenerator.css'
function InvoicePreview({ invoice }) {

  function formatCurrency(value) {
    return `₹${Number(value || 0).toLocaleString(
      'en-IN',
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }
    )}`
  }

  function formatDate(date) {
    if (!date) {
      return '--'
    }

    const parts = date.split('-')

    if (parts.length !== 3) {
      return date
    }

    return `${parts[2]}-${parts[1]}-${parts[0]}`
  }

  return (
    <div className="invoice-preview">

      {/* Header */}

      <div className="invoice-header">

        <div>
          <div className="logo-placeholder">
            LOGO
          </div>
        </div>

        <div className="company-info">

          <h1>
            {invoice.company?.name ||
              'COMPANY NAME'}
          </h1>

          <p>
            {invoice.company?.address ||
              'Company Address'}
          </p>

          <p>
            {invoice.company?.phone ||
              'Phone'}
          </p>

          <p>
            {invoice.company?.email ||
              'Email'}
          </p>

          <p>
            GSTIN:{' '}
            {invoice.company?.gstin ||
              '--'}
          </p>

          <p>
            PAN:{' '}
            {invoice.company?.pan ||
              '--'}
          </p>

        </div>

        <div className="tax-invoice">

          <h2>
            TAX INVOICE
          </h2>

        </div>

      </div>

      {/* Invoice information */}

      <div className="invoice-meta">

        <div>
          <strong>
            Invoice No:
          </strong>

          <span>
            {invoice.invoiceNumber}
          </span>
        </div>

        <div>
          <strong>
            Invoice Date:
          </strong>

          <span>
            {formatDate(
              invoice.invoiceDate
            )}
          </span>
        </div>

        <div>
          <strong>
            Due Date:
          </strong>

          <span>
            {formatDate(
              invoice.dueDate
            )}
          </span>
        </div>

        <div>
          <strong>
            Order No:
          </strong>

          <span>
            {invoice.orderNumber ||
              '--'}
          </span>
        </div>

        <div>
          <strong>
            Order Date:
          </strong>

          <span>
            {formatDate(
              invoice.orderDate
            )}
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
            {invoice.customer?.name ||
              'Customer Name'}
          </strong>

          <p>
            {invoice.customer?.address ||
              'Customer Address'}
          </p>

          <p>
            Phone:{' '}
            {invoice.customer?.phone ||
              '--'}
          </p>

          <p>
            Email:{' '}
            {invoice.customer?.email ||
              '--'}
          </p>

          <p>
            GSTIN:{' '}
            {invoice.customer?.gstin ||
              '--'}
          </p>

          <p>
            PAN:{' '}
            {invoice.customer?.pan ||
              '--'}
          </p>

        </div>

        <div className="billing-box">

          <h3>
            PAYMENT
          </h3>

          <p>
            <strong>
              Mode:
            </strong>{' '}
            {invoice.payment?.mode ||
              '--'}
          </p>

          <p>
            <strong>
              Status:
            </strong>{' '}
            {invoice.payment?.status ||
              '--'}
          </p>

          <p>
            <strong>
              Reference:
            </strong>{' '}
            {invoice.payment?.referenceNumber ||
              '--'}
          </p>

        </div>

      </div>

      {/* Products */}

      <table className="invoice-table">

        <thead>

          <tr>

            <th>#</th>

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
              Unit
            </th>

            <th>
              Rate
            </th>

            <th>
              GST
            </th>

            <th>
              Amount
            </th>

          </tr>

        </thead>

        <tbody>

          {invoice.items?.map(
            (item, index) => (

              <tr key={index}>

                <td>
                  {index + 1}
                </td>

                <td>
                  {item.productName ||
                    '--'}
                </td>

                <td>
                  {item.hsnSac ||
                    '--'}
                </td>

                <td>
                  {item.quantity}
                </td>

                <td>
                  {item.unit}
                </td>

                <td>
                  {formatCurrency(
                    item.rate
                  )}
                </td>

                <td>
                  {item.gstRate}%
                </td>

                <td>
                  {formatCurrency(
                    item.total
                  )}
                </td>

              </tr>

            )
          )}

        </tbody>

      </table>

      {/* Bottom */}

      <div className="bottom-section">

        <div className="notes">

          <h3>
            Amount in Words
          </h3>

          <p>
            Amount in words will be
            generated here.
          </p>

          <h3>
            Terms & Conditions
          </h3>

          <p>
            Payment should be made
            according to the agreed
            payment terms.
          </p>

        </div>

        <div className="totals">

          <div>

            <span>
              Subtotal
            </span>

            <span>
              {formatCurrency(
                invoice.totals?.subtotal
              )}
            </span>

          </div>

          <div>

            <span>
              Discount
            </span>

            <span>
              {formatCurrency(
                invoice.totals?.discount
              )}
            </span>

          </div>

          <div>

            <span>
              Taxable Amount
            </span>

            <span>
              {formatCurrency(
                invoice.totals?.taxableAmount
              )}
            </span>

          </div>

          <div>

            <span>
              CGST
            </span>

            <span>
              {formatCurrency(
                invoice.totals?.cgst
              )}
            </span>

          </div>

          <div>

            <span>
              SGST
            </span>

            <span>
              {formatCurrency(
                invoice.totals?.sgst
              )}
            </span>

          </div>

          <div>

            <span>
              IGST
            </span>

            <span>
              {formatCurrency(
                invoice.totals?.igst
              )}
            </span>

          </div>

          <div>

            <strong>
              Grand Total
            </strong>

            <strong>
              {formatCurrency(
                invoice.totals?.grandTotal
              )}
            </strong>

          </div>

        </div>

      </div>

      {/* Footer */}

      <div className="invoice-footer">

        <p>
          This is a computer-generated
          invoice.
        </p>

        <div>
          Authorized Signature
        </div>

      </div>

    </div>
  )
}

export default InvoicePreview