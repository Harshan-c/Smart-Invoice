import { useState } from 'react'
import { uploadInvoice } from '../services/api'
import './UploadInvoice.css'

function UploadInvoice() {
  const [selectedFile, setSelectedFile] = useState(null)
  const [dragActive, setDragActive] = useState(false)
  const [uploading, setUploading] = useState(false)
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
  }

  function removeFile() {
    setSelectedFile(null)
    setExtractedData(null)
    setMessage('')
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

  function handleExtractedChange(field, value) {
    setExtractedData(previous => ({
      ...previous,
      [field]: value
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
          <h1>Upload Invoice</h1>

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


          <div className="extracted-grid">

            <div className="extracted-field">

              <label>
                Invoice Number
              </label>

              <input
                type="text"
                value={extractedData.invoice_number || ''}
                onChange={event =>
                  handleExtractedChange(
                    'invoice_number',
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
                value={extractedData.invoice_date || ''}
                onChange={event =>
                  handleExtractedChange(
                    'invoice_date',
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
                value={extractedData.gstin || ''}
                onChange={event =>
                  handleExtractedChange(
                    'gstin',
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
                value={extractedData.payment_mode || ''}
                onChange={event =>
                  handleExtractedChange(
                    'payment_mode',
                    event.target.value
                  )
                }
                placeholder="Not detected"
              />

            </div>


            <div className="extracted-field extracted-field-wide">

              <label>
                Vendor
              </label>

              <input
                type="text"
                value={extractedData.vendor || ''}
                onChange={event =>
                  handleExtractedChange(
                    'vendor',
                    event.target.value
                  )
                }
                placeholder="Not detected"
              />

            </div>

          </div>


          <div className="extracted-footer">

            <span>
              ✓ Information extracted successfully
            </span>

            <button
              type="button"
              className="review-button"
            >
              Review Information
            </button>

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