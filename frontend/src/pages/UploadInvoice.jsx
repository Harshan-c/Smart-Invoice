import { useState } from 'react'

import {
  uploadInvoice,
  savePurchaseInvoice
} from '../services/api'

import './UploadInvoice.css'


function UploadInvoice() {

  const [selectedFile, setSelectedFile] = useState(null)

  const [dragActive, setDragActive] = useState(false)

  const [uploading, setUploading] = useState(false)

  const [saving, setSaving] = useState(false)

  const [saveSuccess, setSaveSuccess] = useState(false)

  const [message, setMessage] = useState('')

  const [extractedData, setExtractedData] = useState(null)


  function handleFileChange(event) {

    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    setSelectedFile(file)

    setExtractedData(null)

    setMessage('')

    setSaveSuccess(false)
  }


  function handleDragOver(event) {

    event.preventDefault()

    setDragActive(true)
  }


  function handleDragLeave(event) {

    event.preventDefault()

    setDragActive(false)
  }


  function handleDrop(event) {

    event.preventDefault()

    setDragActive(false)

    const file = event.dataTransfer.files?.[0]

    if (!file) {
      return
    }

    setSelectedFile(file)

    setExtractedData(null)

    setMessage('')

    setSaveSuccess(false)
  }


  function removeFile() {

    setSelectedFile(null)

    setExtractedData(null)

    setMessage('')

    setSaveSuccess(false)
  }


  async function handleUpload() {

    if (!selectedFile) {

      setMessage('Please select an invoice first.')

      return
    }

    try {

      setUploading(true)

      setMessage(
        'Invoice uploaded. PaddleOCR is processing the document...'
      )

      const data = await uploadInvoice(selectedFile)

      setExtractedData(data.extracted_data || null)

      setMessage(
        data.message ||
        'Invoice uploaded and OCR processed successfully.'
      )

    } catch (error) {

      console.error(error)

      setMessage(
        'Invoice upload or OCR processing failed.'
      )

    } finally {

      setUploading(false)
    }
  }


  async function handleSaveInvoice() {

    if (!extractedData || saving) {
      return
    }

    try {

      setSaving(true)

      setMessage('Saving invoice to SmartInvoice...')

      await savePurchaseInvoice(extractedData)

      setSaving(false)

      setMessage('')

      setSaveSuccess(true)

    } catch (error) {

      console.error(error)

      setMessage(
        'Failed to save invoice to MongoDB.'
      )

      setSaving(false)
    }
  }


  function handleExtractedChange(field, value) {

    setExtractedData(previous => ({

      ...previous,

      [field]: value

    }))
  }


  function handleVendorChange(field, value) {

    setExtractedData(previous => ({

      ...previous,

      vendor: {

        ...previous.vendor,

        [field]: value

      }

    }))
  }


  function handleItemChange(index, field, value) {

    setExtractedData(previous => ({

      ...previous,

      items: previous.items.map((item, itemIndex) =>

        itemIndex === index

          ? {

              ...item,

              [field]: value

            }

          : item

      )

    }))
  }


  function handleGrandTotalChange(value) {

    setExtractedData(previous => ({

      ...previous,

      totals: {

        ...previous.totals,

        grandTotal:

          value === ''

            ? null

            : Number(value)

      }

    }))
  }


  function formatFileSize(size) {

    if (size < 1024) {

      return `${size} B`
    }


    if (size < 1024 * 1024) {

      return `${(size / 1024).toFixed(1)} KB`
    }


    return `${(size / (1024 * 1024)).toFixed(1)} MB`
  }


  return (

    <div className="upload-page">


      {/* =====================================================
          PAGE HEADER
          ===================================================== */}

      <div className="upload-page-header">

        <div>

          <h1>
            Upload Invoice
          </h1>

          <p>
            Upload an invoice and let SmartInvoice process the document.
          </p>

        </div>

      </div>



      {/* =====================================================
          MAIN CONTENT
          ===================================================== */}

      <div className="upload-layout">


        {/* ===================================================
            UPLOAD CARD
            =================================================== */}

        <div className="upload-card">


          <div className="upload-card-header">

            <div className="upload-section-icon">
              ⇧
            </div>

            <div>

              <h2>
                Upload Invoice
              </h2>

              <p>
                Select an invoice image or document to begin.
              </p>

            </div>

          </div>



          {/* =================================================
              DROP ZONE
              ================================================= */}

          <label

            className={`upload-drop-zone ${
              dragActive ? 'drag-active' : ''
            }`}

            onDragOver={handleDragOver}

            onDragLeave={handleDragLeave}

            onDrop={handleDrop}

          >

            <input

              type="file"

              accept="image/*,.pdf"

              onChange={handleFileChange}

            />


            <div className="upload-cloud-icon">
              ↑
            </div>


            <h3>
              Drag & Drop your invoice here
            </h3>


            <p>
              or click to browse from your computer
            </p>


            <span className="upload-file-types">
              JPG, JPEG, PNG or PDF
            </span>

          </label>



          {/* =================================================
              SELECTED FILE
              ================================================= */}

          {selectedFile && (

            <div className="selected-file">


              <div className="selected-file-icon">
                📄
              </div>


              <div className="selected-file-info">

                <strong>
                  {selectedFile.name}
                </strong>

                <span>
                  {formatFileSize(selectedFile.size)}
                </span>

              </div>


              <button

                type="button"

                className="remove-file-button"

                onClick={removeFile}

              >
                ×
              </button>


            </div>

          )}



          {/* =================================================
              UPLOAD ACTION
              ================================================= */}

          <div className="upload-actions">

            <button

              type="button"

              className="upload-button"

              onClick={handleUpload}

              disabled={uploading}

            >

              {uploading

                ? 'Processing Invoice...'

                : 'Upload Invoice'

              }

            </button>

          </div>



          {message && (

            <div className="upload-message">
              {message}
            </div>

          )}

        </div>



        {/* ===================================================
            PROCESSING INFORMATION
            =================================================== */}

        <div className="upload-info-card">


          <div className="upload-info-header">


            <div className="upload-info-icon">
              ✦
            </div>


            <div>

              <h2>
                SmartInvoice Processing
              </h2>

              <p>
                Your invoice will move through the following process.
              </p>

            </div>

          </div>



          <div className="processing-steps">


            <div className="processing-step">

              <div className="step-number">
                1
              </div>

              <div>

                <strong>
                  Upload
                </strong>

                <p>
                  Select your invoice document.
                </p>

              </div>

            </div>


            <div className="processing-line"></div>


            <div className="processing-step">

              <div className="step-number">
                2
              </div>

              <div>

                <strong>
                  OCR Processing
                </strong>

                <p>
                  Invoice information will be extracted.
                </p>

              </div>

            </div>


            <div className="processing-line"></div>


            <div className="processing-step">

              <div className="step-number">
                3
              </div>

              <div>

                <strong>
                  Review
                </strong>

                <p>
                  Check and correct extracted information.
                </p>

              </div>

            </div>


            <div className="processing-line"></div>


            <div className="processing-step">

              <div className="step-number">
                4
              </div>

              <div>

                <strong>
                  Save
                </strong>

                <p>
                  Store the invoice in SmartInvoice.
                </p>

              </div>

            </div>

          </div>

        </div>

      </div>



      {/* =====================================================
          EXTRACTED DATA
          ===================================================== */}

      {extractedData && (

        <div className="extracted-invoice-card">


          <div className="extracted-header">

            <div>

              <h2>
                Extracted Invoice Information
              </h2>

              <p>
                Review the information detected by PaddleOCR.
                You can correct any field before saving.
              </p>

            </div>


            <div className="ocr-badge">
              OCR Complete
            </div>

          </div>



          {/* =================================================
              BASIC INVOICE INFORMATION
              ================================================= */}

          <div className="extracted-grid">


            <div className="extracted-field">

              <label>
                Invoice Type
              </label>

              <input

                type="text"

                value={extractedData.invoiceType || ''}

                onChange={event =>
                  handleExtractedChange(
                    'invoiceType',
                    event.target.value
                  )
                }

              />

            </div>



            <div className="extracted-field">

              <label>
                Invoice Number
              </label>

              <input

                type="text"

                value={extractedData.invoiceNumber || ''}

                onChange={event =>
                  handleExtractedChange(
                    'invoiceNumber',
                    event.target.value
                  )
                }

                placeholder="Not detected"

              />

            </div>



            <div className="extracted-field">

              <label>
                Invoice Date
              </label>

              <input

                type="text"

                value={extractedData.invoiceDate || ''}

                onChange={event =>
                  handleExtractedChange(
                    'invoiceDate',
                    event.target.value
                  )
                }

                placeholder="Not detected"

              />

            </div>



            <div className="extracted-field">

              <label>
                Order Number
              </label>

              <input

                type="text"

                value={extractedData.orderNumber || ''}

                onChange={event =>
                  handleExtractedChange(
                    'orderNumber',
                    event.target.value
                  )
                }

                placeholder="Not detected"

              />

            </div>



            <div className="extracted-field">

              <label>
                Order Date
              </label>

              <input

                type="text"

                value={extractedData.orderDate || ''}

                onChange={event =>
                  handleExtractedChange(
                    'orderDate',
                    event.target.value
                  )
                }

                placeholder="Not detected"

              />

            </div>



            <div className="extracted-field">

              <label>
                Payment Mode
              </label>

              <input

                type="text"

                value={extractedData.paymentMode || ''}

                onChange={event =>
                  handleExtractedChange(
                    'paymentMode',
                    event.target.value
                  )
                }

                placeholder="Not detected"

              />

            </div>



            {/* =================================================
                VENDOR
                ================================================= */}

            <div className="extracted-field extracted-field-wide">

              <label>
                Vendor Name
              </label>

              <input

                type="text"

                value={extractedData.vendor?.name || ''}

                onChange={event =>
                  handleVendorChange(
                    'name',
                    event.target.value
                  )
                }

                placeholder="Not detected"

              />

            </div>



            <div className="extracted-field extracted-field-wide">

              <label>
                Vendor Address
              </label>

              <input

                type="text"

                value={extractedData.vendor?.address || ''}

                onChange={event =>
                  handleVendorChange(
                    'address',
                    event.target.value
                  )
                }

                placeholder="Not detected"

              />

            </div>



            <div className="extracted-field">

              <label>
                Phone
              </label>

              <input

                type="text"

                value={extractedData.vendor?.phone || ''}

                onChange={event =>
                  handleVendorChange(
                    'phone',
                    event.target.value
                  )
                }

                placeholder="Not detected"

              />

            </div>



            <div className="extracted-field">

              <label>
                Email
              </label>

              <input

                type="text"

                value={extractedData.vendor?.email || ''}

                onChange={event =>
                  handleVendorChange(
                    'email',
                    event.target.value
                  )
                }

                placeholder="Not detected"

              />

            </div>



            <div className="extracted-field">

              <label>
                GSTIN
              </label>

              <input

                type="text"

                value={extractedData.vendor?.gstin || ''}

                onChange={event =>
                  handleVendorChange(
                    'gstin',
                    event.target.value
                  )
                }

                placeholder="Not detected"

              />

            </div>



            <div className="extracted-field">

              <label>
                PAN
              </label>

              <input

                type="text"

                value={extractedData.vendor?.pan || ''}

                onChange={event =>
                  handleVendorChange(
                    'pan',
                    event.target.value
                  )
                }

                placeholder="Not detected"

              />

            </div>



            <div className="extracted-field">

              <label>
                State
              </label>

              <input

                type="text"

                value={extractedData.vendor?.state || ''}

                onChange={event =>
                  handleVendorChange(
                    'state',
                    event.target.value
                  )
                }

                placeholder="Not detected"

              />

            </div>



            {/* =================================================
                TOTAL
                ================================================= */}

            <div className="extracted-field">

              <label>
                Grand Total
              </label>

              <input

                type="number"

                value={
                  extractedData.totals?.grandTotal ?? ''
                }

                onChange={event =>
                  handleGrandTotalChange(
                    event.target.value
                  )
                }

              />

            </div>

          </div>



          {/* =================================================
              INVOICE ITEMS
              ================================================= */}

          {extractedData.items?.length > 0 && (

            <div className="extracted-items-section">


              <h3>
                Invoice Items
              </h3>


              {extractedData.items.map((item, index) => (

                <div

                  className="extracted-item"

                  key={index}

                >


                  <div className="extracted-field">

                    <label>
                      Serial Number
                    </label>

                    <input

                      type="text"

                      value={item.serialNumber || ''}

                      onChange={event =>
                        handleItemChange(
                          index,
                          'serialNumber',
                          event.target.value
                        )
                      }

                    />

                  </div>



                  <div className="extracted-field extracted-field-wide">

                    <label>
                      Product Name
                    </label>

                    <input

                      type="text"

                      value={item.productName || ''}

                      onChange={event =>
                        handleItemChange(
                          index,
                          'productName',
                          event.target.value
                        )
                      }

                    />

                  </div>



                  <div className="extracted-field">

                    <label>
                      HSN/SAC
                    </label>

                    <input

                      type="text"

                      value={item.hsnSac || ''}

                      onChange={event =>
                        handleItemChange(
                          index,
                          'hsnSac',
                          event.target.value
                        )
                      }

                    />

                  </div>



                  <div className="extracted-field">

                    <label>
                      MRP
                    </label>

                    <input

                      type="text"

                      value={item.mrp || ''}

                      onChange={event =>
                        handleItemChange(
                          index,
                          'mrp',
                          event.target.value
                        )
                      }

                    />

                  </div>



                  <div className="extracted-field">

                    <label>
                      Rate
                    </label>

                    <input

                      type="text"

                      value={item.rate || ''}

                      onChange={event =>
                        handleItemChange(
                          index,
                          'rate',
                          event.target.value
                        )
                      }

                    />

                  </div>



                  <div className="extracted-field">

                    <label>
                      Quantity
                    </label>

                    <input

                      type="text"

                      value={item.quantity || ''}

                      onChange={event =>
                        handleItemChange(
                          index,
                          'quantity',
                          event.target.value
                        )
                      }

                    />

                  </div>



                  <div className="extracted-field">

                    <label>
                      Unit
                    </label>

                    <input

                      type="text"

                      value={item.ctUn || ''}

                      onChange={event =>
                        handleItemChange(
                          index,
                          'ctUn',
                          event.target.value
                        )
                      }

                    />

                  </div>



                  <div className="extracted-field">

                    <label>
                      Taxable Amount
                    </label>

                    <input

                      type="text"

                      value={item.taxableAmount || ''}

                      onChange={event =>
                        handleItemChange(
                          index,
                          'taxableAmount',
                          event.target.value
                        )
                      }

                    />

                  </div>


                </div>

              ))}

            </div>

          )}



          {/* =================================================
              EXTRACTED FOOTER
              ================================================= */}

          <div className="extracted-footer">


            <span>
              ✓ Information extracted successfully
            </span>


            <button

              type="button"

              className="review-button"

              onClick={handleSaveInvoice}

              disabled={saving}

            >

              {saving

                ? 'Saving Invoice...'

                : 'Save Invoice'

              }

            </button>


          </div>


        </div>

      )}



      {/* =====================================================
          SUCCESS POPUP
          ===================================================== */}

      {saveSuccess && (

        <div className="save-success-overlay">

          <div className="save-success-modal">


            <div className="save-success-icon">
              ✓
            </div>


            <h2>
              Invoice Saved Successfully
            </h2>


            <p>
              Your invoice has been successfully saved.
              You can check it in the Invoices section.
            </p>


            <div className="save-success-actions">


              <button

                type="button"

                className="success-invoices-button"

                onClick={() => {
                  window.location.href = '/invoices'
                }}

              >
                Go to Invoices

              </button>


              <button

                type="button"

                className="success-close-button"

                onClick={() => {
                  setSaveSuccess(false)
                }}

              >
                Stay Here

              </button>


            </div>


          </div>

        </div>

      )}



      {/* =====================================================
          TIPS
          ===================================================== */}

      <div className="upload-tips-card">


        <div className="tip-icon">
          ✓
        </div>


        <div>

          <strong>
            For better results
          </strong>

          <p>
            Use a clear, high-quality invoice image or PDF.
            Make sure the invoice information is visible and readable.
          </p>

        </div>


      </div>


    </div>
  )
}


export default UploadInvoice