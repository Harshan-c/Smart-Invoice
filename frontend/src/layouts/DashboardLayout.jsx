import { Outlet } from 'react-router-dom'

import Sidebar from '../components/common/Sidebar'
import Header from '../components/common/Header'

import './DashboardLayout.css'

function DashboardLayout() {
  return (
    <div className="dashboard-layout">

      <Sidebar />

      <div className="dashboard-main">

        <Header />

        <main className="dashboard-content">
          <Outlet />
        </main>

      </div>

    </div>
  )
}

export default DashboardLayout