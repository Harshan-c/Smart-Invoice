import { NavLink } from 'react-router-dom'
import './Sidebar.css'

function Sidebar() {
  return (
    <aside className="sidebar">

      {/* Brand */}

      <div className="sidebar-brand">

        <div className="brand-icon">
          📄
        </div>

        <div>
          <h1>SmartInvoice</h1>
          <p>Invoices to Insights</p>
        </div>

      </div>

      {/* Navigation */}

      <nav className="sidebar-nav">

        <NavLink
          to="/dashboard"
          className="sidebar-link"
        >
          <span className="sidebar-icon">⌂</span>
          <span>Dashboard</span>
        </NavLink>

        <NavLink
          to="/upload"
          className="sidebar-link"
        >
          <span className="sidebar-icon">⇧</span>
          <span>Upload Invoice</span>
        </NavLink>

        <NavLink
          to="/invoices"
          className="sidebar-link"
        >
          <span className="sidebar-icon">▤</span>
          <span>Invoices</span>
        </NavLink>

        <NavLink
          to="/vendors"
          className="sidebar-link"
        >
          <span className="sidebar-icon">♙</span>
          <span>Vendors</span>
        </NavLink>

        <NavLink
          to="/analytics"
          className="sidebar-link"
        >
          <span className="sidebar-icon">▥</span>
          <span>Analytics</span>
        </NavLink>

        <NavLink
          to="/prediction"
          className="sidebar-link"
        >
          <span className="sidebar-icon">⌁</span>
          <span>Prediction</span>
        </NavLink>

        <NavLink
          to="/simulation"
          className="sidebar-link"
        >
          <span className="sidebar-icon">⚙</span>
          <span>Simulation</span>
        </NavLink>

        <NavLink
          to="/recommendations"
          className="sidebar-link"
        >
          <span className="sidebar-icon">♡</span>
          <span>Recommendations</span>
        </NavLink>

        <NavLink
          to="/reports"
          className="sidebar-link"
        >
          <span className="sidebar-icon">▧</span>
          <span>Reports</span>
        </NavLink>

        <NavLink
          to="/settings"
          className="sidebar-link"
        >
          <span className="sidebar-icon">⚙</span>
          <span>Settings</span>
        </NavLink>

      </nav>

      {/* Bottom card */}

      <div className="sidebar-bottom-card">

        <div className="sidebar-bottom-icon">
          ✦
        </div>

        <p>
          Smarter Financial
          <br />
          Decisions for a
          <br />
          Brighter Tomorrow
        </p>

        <div className="sidebar-bottom-line">
          ━
        </div>

      </div>

    </aside>
  )
}

export default Sidebar