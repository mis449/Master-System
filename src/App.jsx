
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom"
import "./index.css"

// --- Page Imports ---
import LoginPage from "./pages/LoginPage"
import AdminDashboard from "./pages/admin/Dashboard"
import AdminAssignTask from "./pages/admin/AssignTask"
import ChecklistTask from "./pages/admin/ChecklistTask"
import MaintenanceTask from "./pages/admin/MaintenanceTask"
import RepairTask from "./pages/admin/RepairTask"
import EATask from "./pages/admin/EATask"
import CalendarPage from "./pages/admin/CalendarPage"
import QuickTask from "./pages/QuickTask"
import Demo from "./pages/user/Demo"
import Setting from "./pages/Setting"
import UserManagement from "./pages/UserManagement"
import MisReport from "./pages/admin/dashboard/MisReport";
import SalaryManagement from "./pages/admin/SalaryManagement";


// --- Data & Delegation Imports ---
import DataPage from "./pages/admin/DataPage"
import AdminDataPage from "./pages/admin/admin-data-page"
import AccountDataPage from "./pages/delegation"
import AdminDelegationTask from "./pages/delegation-data"
import AllTasks from "./pages/admin/AllTasks"
import HolidayListPage from "./pages/admin/HolidayListPage"
import WorkingDayCalendarPage from "./pages/admin/WorkingDayCalendarPage"
import AdminApprovalPage from "./pages/admin/AdminApprovalPage"
import NotificationsPage from "./pages/admin/Notifications"

// --- MIS Reports Imports ---
import MisDashboard from "./Mis_Reports/pages/admin/Dashboard"
import MisHistory from "./Mis_Reports/pages/admin/HistoryCommitment"
import KpiKra from "./Mis_Reports/pages/admin/KpiKra"
import MisToday from "./Mis_Reports/pages/admin/TodayTasks"
import MisPending from "./Mis_Reports/pages/admin/PendingTasks"
import MisDept from "./Mis_Reports/pages/admin/Report"

// --- New Module Imports ---
import SalesDashboard from "./modules/sales/SalesDashboard"
import PurchaseDashboard from "./modules/purchase/PurchaseDashboard"

// --- Components ---
import RealtimeLogoutListener from "./components/RealtimeLogoutListener"
import { MagicToastProvider } from "./context/MagicToastContext"
import ProtectedRoute from "./components/ProtectedRoute"

function App() {
    return (
        <MagicToastProvider>
            <Router>
                <RealtimeLogoutListener />
                <Routes>
                    {/* --- Public Routes --- */}
                    <Route path="/" element={<Navigate to="/login" replace />} />
                    <Route path="/login" element={<LoginPage />} />

                    {/* --- Main Dashboard Redirect --- */}
                    <Route path="/dashboard" element={<Navigate to="/dashboard/admin" replace />} />

                    {/* --- Core Dashboard Routes --- */}
                    <Route
                        path="/dashboard/admin"
                        element={
                            <ProtectedRoute>
                                <AdminDashboard />
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/dashboard/demo"
                        element={
                            <ProtectedRoute>
                                <Demo />
                            </ProtectedRoute>
                        }
                    />

                    {/* --- Task Management (Admin Only) --- */}
                    <Route
                        path="/dashboard/assign-task"
                        element={
                            <ProtectedRoute allowedRoles={["admin", "hod"]}>
                                <AdminAssignTask />
                            </ProtectedRoute>
                        }
                    />

                    {/* --- Operational Tasks --- */}
                    <Route
                        path="/dashboard/quick-task"
                        element={
                            <ProtectedRoute>
                                <QuickTask />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/dashboard/checklist"
                        element={
                            <ProtectedRoute>
                                <ChecklistTask />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/dashboard/maintenance"
                        element={
                            <ProtectedRoute>
                                <MaintenanceTask />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/dashboard/repair"
                        element={
                            <ProtectedRoute>
                                <RepairTask />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/dashboard/ea-task"
                        element={
                            <ProtectedRoute>
                                <EATask />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/dashboard/calendar"
                        element={
                            <ProtectedRoute>
                                <CalendarPage />
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/dashboard/task"
                        element={
                            <ProtectedRoute>
                                <AllTasks />
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/dashboard/holiday-list"
                        element={
                            <ProtectedRoute allowedRoles={["admin"]}>
                                <HolidayListPage />
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/dashboard/working-day-calendar"
                        element={
                            <ProtectedRoute>
                                <WorkingDayCalendarPage />
                            </ProtectedRoute>
                        }
                    />

                    {/* --- Data & Reporting --- */}
                    <Route
                        path="/dashboard/data"
                        element={
                            <ProtectedRoute allowedRoles={["admin", "hod"]}>
                                <DataPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/dashboard/data/:category"
                        element={
                            <ProtectedRoute>
                                <DataPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/dashboard/admin-data"
                        element={
                            <ProtectedRoute allowedRoles={["admin", "hod"]}>
                                <AdminDataPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/dashboard/delegation"
                        element={
                            <ProtectedRoute>
                                <AccountDataPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/dashboard/delegation-data"
                        element={
                            <ProtectedRoute allowedRoles={["admin", "hod"]}>
                                <AdminDelegationTask />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/dashboard/admin-approval"
                        element={
                            <ProtectedRoute allowedRoles={["admin", "hod"]}>
                                <AdminApprovalPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/dashboard/mis-report"
                        element={
                            <ProtectedRoute allowedRoles={["admin"]}>
                                <MisReport />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/dashboard/mis-dashboard"
                        element={
                            <ProtectedRoute allowedRoles={["admin"]}>
                                <MisDashboard />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/dashboard/mis-history"
                        element={
                            <ProtectedRoute allowedRoles={["admin"]}>
                                <MisHistory />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/dashboard/mis-today"
                        element={
                            <ProtectedRoute allowedRoles={["admin"]}>
                                <MisToday />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/dashboard/mis-pending"
                        element={
                            <ProtectedRoute allowedRoles={["admin"]}>
                                <MisPending />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/dashboard/mis-dept"
                        element={
                            <ProtectedRoute allowedRoles={["admin"]}>
                                <MisDept />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/dashboard/kpi-kra"
                        element={
                            <ProtectedRoute allowedRoles={["admin"]}>
                                <KpiKra />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/dashboard/notifications"
                        element={
                            <ProtectedRoute>
                                <NotificationsPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/dashboard/salary"
                        element={
                            <ProtectedRoute allowedRoles={["admin"]}>
                                <SalaryManagement />
                            </ProtectedRoute>
                        }
                    />

                    {/* --- New ERP Modules --- */}
                    <Route
                        path="/sales"
                        element={
                            <ProtectedRoute allowedRoles={["admin", "manager"]}>
                                <SalesDashboard />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/purchase"
                        element={
                            <ProtectedRoute allowedRoles={["admin", "manager"]}>
                                <PurchaseDashboard />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/users"
                        element={
                            <ProtectedRoute allowedRoles={["admin"]}>
                                <Setting />
                            </ProtectedRoute>
                        }
                    />

                    {/* --- Settings --- */}
                    <Route
                        path="/dashboard/user-management"
                        element={
                            <ProtectedRoute allowedRoles={["admin"]}>
                                <UserManagement />
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/dashboard/setting"
                        element={
                            <ProtectedRoute>
                                <Setting />
                            </ProtectedRoute>
                        }
                    />

                    {/* --- Backward Compatibility Redirects --- */}
                    <Route path="/admin/*" element={<Navigate to="/dashboard/admin" replace />} />
                    <Route path="/admin/dashboard" element={<Navigate to="/dashboard/admin" replace />} />
                    <Route path="/admin/quick" element={<Navigate to="/dashboard/quick-task" replace />} />
                    <Route path="/admin/assign-task" element={<Navigate to="/dashboard/assign-task" replace />} />
                    <Route path="/admin/delegation-task" element={<Navigate to="/dashboard/delegation-data" replace />} />
                    <Route path="/admin/mis-report" element={<Navigate to="/dashboard/mis-report" replace />} />
                    <Route path="/user/*" element={<Navigate to="/dashboard/admin" replace />} />

                </Routes>
            </Router>
        </MagicToastProvider>
    )
}

export default App
