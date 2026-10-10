
import {
  BrowserRouter,
  Routes,
  Route
} from 'react-router-dom'

import DashboardLayout from './layouts/DashboardLayout'
import Dashboard from './pages/Dashboard'
import Invoices from './pages/Invoices'
import InvoiceDetails from './pages/InvoiceDetails'
import InvoiceGenerator from './pages/InvoiceGenerator'
import UploadInvoice from './pages/UploadInvoice'
import UpdatePayment from './pages/UpdatePayment'
import Vendors from './pages/Vendors'
import Login from './pages/Login'
import CompanyProfile from './pages/CompanyProfile'

import ProtectedRoute from './components/common/ProtectedRoute'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Login />} />

        <Route
          path="/create-profile"
          element={<CompanyProfile />}
        />

        {/* Protected routes */}
        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
            <Route
              path="/dashboard"
              element={<Dashboard />}
            />

            <Route
              path="/upload"
              element={<UploadInvoice />}
            />

            <Route
              path="/invoices"
              element={<Invoices />}
            />

            <Route
              path="/vendors"
              element={<Vendors />}
            />

            <Route
              path="/invoices/:invoiceId"
              element={<InvoiceDetails />}
            />

            <Route
              path="/invoices/:invoiceId/payment"
              element={<UpdatePayment />}
            />

            <Route
              path="/create-invoice"
              element={<InvoiceGenerator />}
            />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
