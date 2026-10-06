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


function UpdatePayment() {

  const { invoiceId } = useParams()

  const navigate = useNavigate()


  const [invoice, setInvoice] = useState(null)


  const [payment, setPayment] = useState({
    mode: 'Cash',
    status: 'Pending',
    referenceNumber: ''
  })


  const [loading, setLoading] = useState(true)

  const [saving, setSaving] = useState(false)

  const [error, setError] = useState('')

  const [message, setMessage] = useState('')


  useEffect(() => {

    loadInvoice()

  }, [invoiceId])


  async function loadInvoice() {

    try {

      setLoading(true)

      setError('')


      const data = await getInvoice(invoiceId)

      setInvoice(data)


      /*
       * Sales Invoice:
       *
       * payment.mode
       * payment.status
       * payment.referenceNumber
       *
       *
       * Purchase Invoice:
       *
       * paymentMode
       *
       * We support both structures.
       */

      const isPurchaseInvoice =
        data.recordType === 'purchase' ||
        data.invoiceType === 'purchase'


      if (isPurchaseInvoice) {

        setPayment({

          mode:
            data.paymentMode ||
            data.payment?.mode ||
            'Cash',

          status:
            data.payment?.status ||
            'Pending',

          referenceNumber:
            data.payment?.referenceNumber ||
            ''

        })

      } else {

        setPayment({

          mode:
            data.payment?.mode ||
            'Cash',

          status:
            data.payment?.status ||
            'Pending',

          referenceNumber:
            data.payment?.referenceNumber ||
            ''

        })

      }


    } catch (error) {

      console.error(error)

      setError(
        'Failed to load invoice.'
      )

    } finally {

      setLoading(false)

    }

  }


  function handlePaymentChange(event) {

    const { name, value } = event.target


    setPayment(previous => ({

      ...previous,

      [name]: value

    }))

  }


  async function handleSavePayment() {

    try {

      setSaving(true)

      setError('')

      setMessage('')


      const data =
        await updateInvoicePayment(
          invoiceId,
          payment
        )


      setMessage(
        data.message || 'Payment details updated successfully.'
      )


      setTimeout(() => {

        navigate(
          `/invoices/${invoiceId}`
        )

      }, 800)


    } catch (error) {

      console.error(error)

      setError(
        'Failed to update payment details.'
      )

    } finally {

      setSaving(false)

    }

  }


  if (loading) {

    return (

      <div className="payment-page">

        <h1>
          Update Payment
        </h1>

        <p>
          Loading payment details...
        </p>

      </div>

    )

  }


  if (error && !invoice) {

    return (

      <div className="payment-page">

        <h1>
          Update Payment
        </h1>


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


  return (

    <div className="payment-page">


      {/* =========================
          HEADER
      ========================== */}

      <div className="payment-page-header">


        <div>


          <Link
            to={`/invoices/${invoiceId}`}
            className="payment-back-link"
          >

            ← Back to Invoice

          </Link>


          <h1>
            Update Payment
          </h1>


          <p>

            Update the payment information for this invoice.

          </p>


        </div>


        <div className="payment-invoice-number">

          {invoice?.invoiceNumber}

        </div>


      </div>


      {/* =========================
          PAYMENT CARD
      ========================== */}

      <section className="payment-card">


        <div className="payment-card-header">


          <div className="payment-icon">
            ₹
          </div>


          <div>

            <h2>
              Payment Details
            </h2>


            <p>

              Only payment information can be changed
              after an invoice is generated.

            </p>

          </div>


        </div>


        <div className="payment-form">


          {/* =========================
              PAYMENT MODE
          ========================== */}

          <div className="payment-field">


            <label>
              Payment Mode
            </label>


            <select
              name="mode"
              value={payment.mode}
              onChange={handlePaymentChange}
            >

              <option value="Cash">
                Cash
              </option>

              <option value="UPI">
                UPI
              </option>

              <option value="Card">
                Card
              </option>

              <option value="Bank Transfer">
                Bank Transfer
              </option>

              <option value="Credit">
                Credit
              </option>

              <option value="Online">
                Online
              </option>

            </select>


          </div>


          {/* =========================
              PAYMENT STATUS
          ========================== */}

          <div className="payment-field">


            <label>
              Payment Status
            </label>


            <select
              name="status"
              value={payment.status}
              onChange={handlePaymentChange}
            >

              <option value="Pending">
                Pending
              </option>

              <option value="Paid">
                Paid
              </option>

              <option value="Partially Paid">
                Partially Paid
              </option>

              <option value="Overdue">
                Overdue
              </option>

            </select>


          </div>


          {/* =========================
              REFERENCE NUMBER
          ========================== */}

          <div className="payment-field payment-field-wide">


            <label>
              Reference Number
            </label>


            <input
              type="text"
              name="referenceNumber"
              value={payment.referenceNumber}
              onChange={handlePaymentChange}
              placeholder="Enter payment reference number"
            />


          </div>


        </div>


        {/* =========================
            INFORMATION
        ========================== */}

        <div className="payment-info">


          <strong>
            Invoice amount
          </strong>


          <span>

            ₹
            {Number(
              invoice?.totals?.grandTotal || 0
            ).toLocaleString(
              'en-IN',
              {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              }
            )}

          </span>


        </div>


        {/* =========================
            ACTIONS
        ========================== */}

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
            disabled={saving}
          >

            {saving
              ? 'Saving...'
              : 'Save Payment'
            }

          </button>


        </div>


        {/* =========================
            SUCCESS MESSAGE
        ========================== */}

        {message && (

          <div className="payment-success">

            ✓ {message}

          </div>

        )}


        {/* =========================
            ERROR MESSAGE
        ========================== */}

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