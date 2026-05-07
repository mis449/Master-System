"use client"

import { useState, useEffect } from "react"
import { getTotalUsersCountApi } from "../../../redux/api/dashboardApi"
import { LayoutDashboard, Calendar, ChevronDown, X, Users, Activity } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

export default function DashboardHeader({
    dashboardType,
    setDashboardType,
    dashboardStaffFilter,
    setDashboardStaffFilter,
    availableStaff,
    userRole,
    username,
    departmentFilter,
    setDepartmentFilter,
    availableDepartments,
    isLoadingMore,
    onDateRangeChange,
    mainTab
}) {
    const [totalUsersCount, setTotalUsersCount] = useState(0)
    const [showDateRangePicker, setShowDateRangePicker] = useState(false)
    const [startDate, setStartDate] = useState("")
    const [endDate, setEndDate] = useState("")
    const normalizedRole = (userRole || "").toLowerCase();
    const isAdmin = normalizedRole === "admin";
    const isHOD = normalizedRole === "hod";

    useEffect(() => {
        const fetchTotalUsers = async () => {
            try {
                const count = await getTotalUsersCountApi(departmentFilter)
                setTotalUsersCount(count)
            } catch (error) {
                console.error('Error fetching total users count:', error)
            }
        }
        fetchTotalUsers()
    }, [departmentFilter])

    const applyDateRange = () => {
        if (startDate && endDate && onDateRangeChange) {
            onDateRangeChange(startDate, endDate)
            setShowDateRangePicker(false)
        }
    }

    const clearDateRange = () => {
        setStartDate("")
        setEndDate("")
        if (onDateRangeChange) {
            onDateRangeChange(null, null)
        }
        setShowDateRangePicker(false)
    }

    const getTodayDate = () => {
        return new Date().toISOString().split('T')[0]
    }

    if (mainTab !== "default") {
        return (
            <div className="flex items-center gap-5 p-6 bg-white rounded-3xl shadow-sm border border-gray-100 mb-8">
                <div className="w-14 h-14 bg-gradient-to-br from-purple-600 to-indigo-700 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-200">
                    <Activity className="text-white w-7 h-7" />
                </div>
                <div>
                    <h1 className="text-2xl font-black text-gray-900 tracking-tight capitalize">{mainTab} Dashboard</h1>
                    <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-2 py-0.5 rounded">Management Suite</span>
                </div>
            </div>
        )
    }

    return (
        <div className="relative z-50 flex flex-wrap items-center justify-between gap-4 py-1.5 mb-3 group/header">
            {/* Left Side: Title and Total Users */}
            <div className="flex items-center gap-6">
                <h1 className="text-xl font-black text-blue-600 tracking-tight">Dashboard</h1>
                
                <div className="flex items-center gap-2">
                    <span className="text-[11px] font-medium text-gray-500">Total Users</span>
                    <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-[10px] font-black shadow-lg shadow-blue-200">
                        {totalUsersCount || 0}
                    </div>
                </div>
            </div>

            <div className="flex flex-col xs:flex-row flex-wrap items-stretch xs:items-center gap-2.5">

            <div className="flex flex-wrap items-center gap-2">
                {/* Date Range Picker */}
                <div className="relative group/popover">
                    <button
                        onClick={() => setShowDateRangePicker(!showDateRangePicker)}
                        className="flex items-center gap-2 bg-white border border-gray-200 rounded-md px-4 py-1 text-[11px] font-medium text-gray-700 hover:border-blue-400 transition-all shadow-sm h-8"
                    >
                        <span className="truncate max-w-[120px]">{startDate && endDate ? `${startDate.split('-').reverse().join('/')}` : "Date Range"}</span>
                        <ChevronDown className={`w-2.5 h-2.5 transition-transform duration-300 ${showDateRangePicker ? 'rotate-180' : ''}`} />
                    </button>

                    <AnimatePresence>
                        {showDateRangePicker && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setShowDateRangePicker(false)} />
                                <motion.div 
                                  initial={{ opacity: 0, y: 8, scale: 0.98 }}
                                  animate={{ opacity: 1, y: 0, scale: 1 }}
                                  exit={{ opacity: 0, y: 8, scale: 0.98 }}
                                  className="absolute top-full right-0 mt-2 bg-white border border-gray-100 rounded-xl shadow-2xl z-50 p-4 w-64"
                                >
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-[10px] font-black text-gray-900 uppercase tracking-widest">Filter Timeline</h3>
                                            <button onClick={() => setShowDateRangePicker(false)} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
                                                <X className="w-3.5 h-3.5 text-gray-400" />
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-1 gap-3">
                                            <div className="space-y-1">
                                                <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">From</label>
                                                <input
                                                    type="date"
                                                    value={startDate}
                                                    onChange={(e) => setStartDate(e.target.value)}
                                                    className="w-full rounded-lg border border-gray-100 bg-white p-2 text-[10px] font-bold focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest ml-1">To</label>
                                                <input
                                                    type="date"
                                                    value={endDate}
                                                    onChange={(e) => setEndDate(e.target.value)}
                                                    className="w-full rounded-lg border border-gray-100 bg-white p-2 text-[10px] font-bold focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                                                />
                                            </div>
                                        </div>
                                        <div className="flex gap-2 pt-1">
                                            <button onClick={clearDateRange} className="flex-1 py-2 bg-gray-50 text-gray-500 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-gray-100 transition-all">Reset</button>
                                            <button onClick={applyDateRange} className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-[9px] font-black uppercase tracking-widest shadow-md shadow-blue-200 transition-all">Update</button>
                                        </div>
                                    </div>
                                </motion.div>
                            </>
                        )}
                    </AnimatePresence>
                </div>

                {/* Checklist/Delegation Select */}
                <div className="relative group/select">
                    <select
                        value={dashboardType}
                        onChange={(e) => setDashboardType(e.target.value)}
                        className="bg-white border border-gray-200 rounded-md p-1 px-4 pr-9 text-[11px] font-medium text-gray-700 focus:ring-2 focus:ring-blue-500/20 cursor-pointer hover:border-blue-400 transition-all appearance-none shadow-sm h-8"
                    >
                        <option value="checklist">Checklist</option>
                        <option value="delegation">Delegation</option>
                    </select>
                    <ChevronDown className="w-2.5 h-2.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none group-hover/select:text-blue-500 transition-colors" />
                </div>

                {/* Departments Select */}
                {isAdmin && (
                    <div className="relative group/select">
                        <select
                            value={departmentFilter}
                            onChange={(e) => setDepartmentFilter(e.target.value)}
                            className="bg-white border-2 border-blue-500 rounded-md p-1 px-4 pr-9 text-[11px] font-bold text-gray-800 focus:ring-2 focus:ring-blue-500/20 cursor-pointer transition-all appearance-none shadow-sm h-8"
                        >
                            <option value="all">All Departments</option>
                            {availableDepartments.map((dept) => (
                                <option key={dept} value={dept}>{dept}</option>
                            ))}
                        </select>
                        <ChevronDown className="w-2.5 h-2.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-blue-500 pointer-events-none transition-colors" />
                    </div>
                )}

                {/* Team Members Select */}
                {(isAdmin || isHOD) && (
                    <div className="relative group/select">
                        <select
                            value={dashboardStaffFilter}
                            onChange={(e) => setDashboardStaffFilter(e.target.value)}
                            className="bg-white border border-gray-200 rounded-md p-1 px-4 pr-9 text-[11px] font-medium text-gray-700 focus:ring-2 focus:ring-blue-500/20 cursor-pointer hover:border-blue-400 transition-all appearance-none shadow-sm h-8"
                        >
                            <option value="all">All Staff Members</option>
                            {availableStaff.map((staffName) => (
                                <option key={staffName} value={staffName}>{staffName}</option>
                            ))}
                        </select>
                        <ChevronDown className="w-2.5 h-2.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none group-hover/select:text-blue-500 transition-colors" />
                    </div>
                )}
            </div>
            </div>
        </div>
    )
}
