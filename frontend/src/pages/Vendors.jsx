import { useEffect, useState } from 'react'
import {
  createVendor,
  getVendors,
  updateVendor,
  deleteVendor
} from '../services/api'

import './Vendors.css'


function Vendors() {

  const [showForm, setShowForm] = useState(false)

  const [vendors, setVendors] = useState([])

  const [searchTerm, setSearchTerm] = useState('')

  const [editingVendor, setEditingVendor] = useState(null)

  const [vendorToDelete, setVendorToDelete] = useState(null)

  const [showUpdateSuccess, setShowUpdateSuccess] = useState(false)

  const [showDeleteSuccess, setShowDeleteSuccess] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    gstin: '',
    pan: '',
    state: ''
  })


  /* =====================================================
     LOAD VENDORS
     ===================================================== */

  useEffect(() => {
    loadVendors()
  }, [])


  async function loadVendors() {

    try {

      const data = await getVendors()

      setVendors(data.vendors)

    } catch (error) {

      console.error(error)

      alert('Failed to load vendors.')

    }
  }


  /* =====================================================
     SEARCH VENDORS
     ===================================================== */

  const filteredVendors = vendors.filter(vendor => {

    const search = searchTerm.toLowerCase()

    return (
      vendor.name?.toLowerCase().includes(search) ||
      vendor.phone?.toLowerCase().includes(search) ||
      vendor.email?.toLowerCase().includes(search) ||
      vendor.gstin?.toLowerCase().includes(search) ||
      vendor.state?.toLowerCase().includes(search)
    )

  })


  /* =====================================================
     FORM CHANGE
     ===================================================== */

  function handleChange(event) {

    const { name, value } = event.target

    setFormData(previous => ({
      ...previous,
      [name]: value
    }))

  }


  /* =====================================================
     ADD VENDOR
     ===================================================== */

  async function handleAddVendor(event) {

    event.preventDefault()

    try {

      await createVendor(formData)

      await loadVendors()

      resetForm()

    } catch (error) {

      console.error(error)

      alert('Failed to save vendor.')

    }

  }


  /* =====================================================
     EDIT VENDOR
     ===================================================== */

  function handleEditVendor(vendor) {

    setEditingVendor(vendor)

    setFormData({
      name: vendor.name || '',
      address: vendor.address || '',
      phone: vendor.phone || '',
      email: vendor.email || '',
      gstin: vendor.gstin || '',
      pan: vendor.pan || '',
      state: vendor.state || ''
    })

    setShowForm(true)

  }


  /* =====================================================
     UPDATE VENDOR
     ===================================================== */

  async function handleUpdateVendor(event) {

    event.preventDefault()

    try {

      await updateVendor(
        editingVendor.id,
        formData
      )

      await loadVendors()

      setShowUpdateSuccess(true)

    } catch (error) {

      console.error(error)

      alert('Failed to update vendor.')

    }

  }


  /* =====================================================
     UPDATE SUCCESS
     ===================================================== */

  function handleUpdateSuccessClose() {

    setShowUpdateSuccess(false)

    resetForm()

  }


  /* =====================================================
     DELETE VENDOR
     ===================================================== */

  async function handleDeleteVendor() {

    if (!vendorToDelete) {
      return
    }

    try {

      await deleteVendor(vendorToDelete.id)

      await loadVendors()

      setVendorToDelete(null)

      setShowDeleteSuccess(true)

    } catch (error) {

      console.error(error)

      alert('Failed to delete vendor.')

    }

  }


  /* =====================================================
     DELETE SUCCESS
     ===================================================== */

  function handleDeleteSuccessClose() {

    setShowDeleteSuccess(false)

  }


  /* =====================================================
     RESET FORM
     ===================================================== */

  function resetForm() {

    setFormData({
      name: '',
      address: '',
      phone: '',
      email: '',
      gstin: '',
      pan: '',
      state: ''
    })

    setEditingVendor(null)

    setShowForm(false)

  }


  /* =====================================================
     CANCEL
     ===================================================== */

  function handleCancel() {

    resetForm()

  }


  /* =====================================================
     OPEN ADD FORM
     ===================================================== */

  function handleAddButton() {

    setEditingVendor(null)

    setFormData({
      name: '',
      address: '',
      phone: '',
      email: '',
      gstin: '',
      pan: '',
      state: ''
    })

    setShowForm(true)

  }


  /* =====================================================
     PAGE
     ===================================================== */

  return (

    <div className="vendors-page">


      {/* =====================================================
          PAGE HEADER
          ===================================================== */}

      <div className="vendors-page-header">

        <div>

          <h1>
            Vendor Management
          </h1>

          <p>
            Manage your vendors and their information.
          </p>

        </div>


        {!editingVendor && (

          <button
            type="button"
            className="add-vendors-button"
            onClick={handleAddButton}
          >
            + Add Vendor
          </button>

        )}

      </div>


      {/* =====================================================
          ADD / EDIT VENDOR FORM
          ===================================================== */}

      {showForm && (

        <div className="vendors-form-card">

          <div className="vendors-form-header">

            <div>

              <h2>
                {editingVendor
                  ? 'Edit Vendor'
                  : 'Add Vendor'}
              </h2>

              <p>
                {editingVendor
                  ? 'Update the vendor information below.'
                  : 'Enter the vendor information below.'}
              </p>

            </div>

          </div>


          <form
            className="vendors-form"
            onSubmit={
              editingVendor
                ? handleUpdateVendor
                : handleAddVendor
            }
          >


            {/* Vendor Name */}

            <div className="vendors-form-field">

              <label>
                Vendor Name
              </label>

              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter vendor name"
                required
              />

            </div>


            {/* Address */}

            <div className="vendors-form-field vendors-form-field-wide">

              <label>
                Address
              </label>

              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="Enter vendor address"
              />

            </div>


            {/* Phone */}

            <div className="vendors-form-field">

              <label>
                Phone
              </label>

              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="Enter phone number"
                required
              />

            </div>


            {/* Email */}

            <div className="vendors-form-field">

              <label>
                Email
              </label>

              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter email address"
              />

            </div>


            {/* GSTIN */}

            <div className="vendors-form-field">

              <label>
                GSTIN
              </label>

              <input
                type="text"
                name="gstin"
                value={formData.gstin}
                onChange={handleChange}
                placeholder="Enter GSTIN"
                required
              />

            </div>


            {/* PAN */}

            <div className="vendors-form-field">

              <label>
                PAN
              </label>

              <input
                type="text"
                name="pan"
                value={formData.pan}
                onChange={handleChange}
                placeholder="Enter PAN"
                required
              />

            </div>


            {/* State */}

            <div className="vendors-form-field">

              <label>
                State
              </label>

              <input
                type="text"
                name="state"
                value={formData.state}
                onChange={handleChange}
                placeholder="Enter state"
                required
              />

            </div>


            {/* Form Actions */}

            <div className="vendors-form-actions">

              <button
                type="button"
                className="vendors-cancel-button"
                onClick={handleCancel}
              >
                Cancel
              </button>


              <button
                type="submit"
                className="vendors-save-button"
              >
                {editingVendor
                  ? 'Update Vendor'
                  : 'Save Vendor'}
              </button>

            </div>


          </form>

        </div>

      )}


      {/* =====================================================
          VENDOR LIST
          ===================================================== */}

      {!editingVendor && (

        <div className="vendors-content">

          {vendors.length === 0 ? (

            <div className="vendors-empty-state">

              <div className="vendors-empty-icon">
                ♙
              </div>

              <h2>
                No Vendors Yet
              </h2>

              <p>
                Add your first vendor to start managing
                vendor information in SmartInvoice.
              </p>

              {!showForm && (

                <button
                  type="button"
                  className="add-vendors-button"
                  onClick={handleAddButton}
                >
                  + Add Vendor
                </button>

              )}

            </div>

          ) : (

            <div className="vendors-list-card">


              {/* =================================================
                  LIST HEADER
                  ================================================= */}

              <div className="vendors-list-header">

                <div>

                  <h2>
                    Vendors
                  </h2>

                  <p>
                    {filteredVendors.length} vendor
                    {filteredVendors.length !== 1
                      ? 's'
                      : ''}
                  </p>

                </div>


                {/* Search */}

                <div className="vendors-search">

                  <input
                    type="text"
                    value={searchTerm}
                    onChange={event =>
                      setSearchTerm(event.target.value)
                    }
                    placeholder="Search vendors..."
                  />

                </div>

              </div>


              {/* =================================================
                  VENDOR TABLE
                  ================================================= */}

              <div className="vendors-table-wrapper">

                <table className="vendors-table">

                  <thead>

                    <tr>

                      <th>
                        Vendor Name
                      </th>

                      <th>
                        Phone
                      </th>

                      <th>
                        Email
                      </th>

                      <th>
                        GSTIN
                      </th>

                      <th>
                        State
                      </th>

                      <th>
                        Actions
                      </th>

                    </tr>

                  </thead>


                  <tbody>

                    {filteredVendors.map(vendor => (

                      <tr key={vendor.id}>

                        <td>

                          <strong>
                            {vendor.name}
                          </strong>

                        </td>


                        <td>
                          {vendor.phone || '—'}
                        </td>


                        <td>
                          {vendor.email || '—'}
                        </td>


                        <td>
                          {vendor.gstin || '—'}
                        </td>


                        <td>
                          {vendor.state || '—'}
                        </td>


                        <td>

                          <div className="vendors-action-buttons">

                            <button
                              type="button"
                              className="vendors-edit-button"
                              onClick={() =>
                                handleEditVendor(vendor)
                              }
                            >
                              Edit
                            </button>


                            <button
                              type="button"
                              className="vendors-delete-button"
                              onClick={() =>
                                setVendorToDelete(vendor)
                              }
                            >
                              Delete
                            </button>

                          </div>

                        </td>

                      </tr>

                    ))}

                  </tbody>

                </table>


                {/* No Search Results */}

                {filteredVendors.length === 0 && (

                  <div className="vendors-no-results">

                    <p>
                      No vendors found matching
                      "{searchTerm}".
                    </p>

                  </div>

                )}

              </div>

            </div>

          )}

        </div>

      )}


      {/* =====================================================
          UPDATE SUCCESS POPUP
          ===================================================== */}

      {showUpdateSuccess && (

        <div className="vendor-success-overlay">

          <div className="vendor-success-popup">

            <div className="vendor-success-icon">
              ✓
            </div>

            <h2>
              Vendor Updated Successfully
            </h2>

            <p>
              The vendor information has been
              updated successfully.
            </p>

            <button
              type="button"
              className="vendor-success-button"
              onClick={handleUpdateSuccessClose}
            >
              OK
            </button>

          </div>

        </div>

      )}


      {/* =====================================================
          DELETE CONFIRMATION POPUP
          ===================================================== */}

      {vendorToDelete && (

        <div className="vendor-delete-overlay">

          <div className="vendor-delete-popup">

            <h2>
              Delete Vendor?
            </h2>

            <p>
              Are you sure you want to delete
              <strong>
                {' '}{vendorToDelete.name}
              </strong>?
            </p>

            <p>
              This action cannot be undone.
            </p>


            <div className="vendor-delete-actions">

              <button
                type="button"
                className="vendor-delete-cancel-button"
                onClick={() => setVendorToDelete(null)}
              >
                Cancel
              </button>


              <button
                type="button"
                className="vendor-delete-confirm-button"
                onClick={handleDeleteVendor}
              >
                Delete
              </button>

            </div>

          </div>

        </div>

      )}


      {/* =====================================================
          DELETE SUCCESS POPUP
          ===================================================== */}

      {showDeleteSuccess && (

        <div className="vendor-success-overlay">

          <div className="vendor-success-popup">

            <div className="vendor-success-icon">
              ✓
            </div>

            <h2>
              Vendor Deleted Successfully
            </h2>

            <p>
              The vendor has been removed successfully.
            </p>

            <button
              type="button"
              className="vendor-success-button"
              onClick={handleDeleteSuccessClose}
            >
              OK
            </button>

          </div>

        </div>

      )}

    </div>

  )

}


export default Vendors