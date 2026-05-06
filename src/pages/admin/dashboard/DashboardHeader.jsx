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
                    <span className="text-[10px] font-black text-purple-600 uppercase tracking-widest bg-purple-50 px-2 py-0.5 rounded">Management Suite</span>
                </div>
            </div>
        )
    }

    return (
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 p-6 bg-white rounded-3xl shadow-sm border border-gray-100 mb-8">
            <div className="flex items-center gap-5">
                <div className="relative">
                  <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200">
                      <LayoutDashboard className="text-white w-7 h-7" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 border-2 border-white rounded-full animate-pulse" />
                </div>
                <div>
                    <h1 className="text-2xl font-black text-gray-900 tracking-tight">Executive Dashboard</h1>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-2 py-0.5 rounded">Real-time Analytics</span>
                        <div className="w-1 h-1 bg-gray-300 rounded-full" />
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Active System</span>
                    </div>
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
                {isAdmin && (
                    <div className="flex items-center gap-3 bg-gray-50/80 px-4 py-2.5 rounded-2xl border border-gray-100">
                        <div className="flex flex-col">
                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider">Total Force</span>
                            <span className="text-xs font-bold text-gray-700">{departmentFilter !== "all" ? departmentFilter : "Organization"}</span>
                        </div>
                        <div className="w-10 h-10 bg-white shadow-sm rounded-xl flex items-center justify-center text-blue-600 font-black border border-gray-100 ring-2 ring-blue-50">
                            {totalUsersCount}
                        </div>
                    </div>
                )}

                <div className="h-10 w-px bg-gray-200 mx-2 hidden lg:block" />

                <div className="flex items-center gap-2">
                    {isAdmin && (
                        <div className="relative">
                            <button
                                onClick={() => setShowDateRangePicker(!showDateRangePicker)}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all duration-300 border
                                  ${startDate && endDate 
                                    ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-200' 
                                    : 'bg-white text-gray-600 border-gray-200 hover:border-blue-400 hover:text-blue-600'}`}
                            >
                                <Calendar className="w-4 h-4" />
                                <span>{startDate && endDate ? `${startDate.split('-').reverse().join('/')}` : "Timeline"}</span>
                                <ChevronDown className={`w-3 h-3 transition-transform ${showDateRangePicker ? 'rotate-180' : ''}`} />
                            </button>

                            <AnimatePresence>
                                {showDateRangePicker && (
                                    <>
                                        <div className="fixed inset-0 z-40" onClick={() => setShowDateRangePicker(false)} />
                                        <motion.div 
                                          initial={{ opacity: 0, y: 10 }}
                                          animate={{ opacity: 1, y: 0 }}
                                          exit={{ opacity: 0, y: 10 }}
                                          className="absolute top-full right-0 mt-3 bg-white border border-gray-100 rounded-3xl shadow-2xl z-50 p-6 w-80 backdrop-blur-xl bg-white/95"
                                        >
                                            <div className="space-y-5">
                                                <div className="flex items-center justify-between">
                                                    <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight">Filter Timeline</h3>
                                                    <button onClick={() => setShowDateRangePicker(false)} className="text-gray-400 hover:text-gray-600">
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                </div>
                                                <div className="grid grid-cols-1 gap-4">
                                                    <div className="space-y-1.5">
                                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Start Date</label>
                                                        <input
                                                            type="date"
                                                            value={startDate}
                                                            onChange={(e) => setStartDate(e.target.value)}
                                                            max={endDate || getTodayDate()}
                                                            className="w-full rounded-xl border border-gray-100 bg-gray-50/50 p-3 text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                                        />
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">End Date</label>
                                                        <input
                                                            type="date"
                                                            value={endDate}
                                                            onChange={(e) => setEndDate(e.target.value)}
                                                            min={startDate}
                                                            max={getTodayDate()}
                                                            className="w-full rounded-xl border border-gray-100 bg-gray-50/50 p-3 text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="flex gap-3 pt-2">
                                                    <button
                                                        onClick={clearDateRange}
                                                        className="flex-1 py-3 px-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-500 border border-gray-100 hover:bg-gray-50 transition-colors"
                                                    >
                                                        Clear
                                                    </button>
                                                    <button
                                                        onClick={applyDateRange}
                                                        disabled={!startDate || !endDate}
                                                        className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-all"
                                                    >
                                                        Apply
                                                    </button>
                                                </div>
                                            </div>
                                        </motion.div>
                                    </>
                                )}
                            </AnimatePresence>
                        </div>
                    )}

                    <div className="flex items-center bg-gray-100/50 p-1 rounded-2xl border border-gray-200/50 gap-1">
                        <select
                            value={dashboardType}
                            onChange={(e) => setDashboardType(e.target.value)}
                            className="bg-white rounded-xl border-none p-2 px-3 focus:ring-0 text-xs font-bold text-gray-700 shadow-sm cursor-pointer hover:bg-gray-50 transition-colors appearance-none"
                        >
                            <option value="checklist">Checklist</option>
                            <option value="delegation">Delegation</option>
                        </select>

                        {isAdmin && (
                            <select
                                value={departmentFilter}
                                onChange={(e) => setDepartmentFilter(e.target.value)}
                                className="bg-white rounded-xl border-none p-2 px-3 focus:ring-0 text-xs font-bold text-gray-700 shadow-sm cursor-pointer hover:bg-gray-50 transition-colors appearance-none"
                            >
                                <option value="all">All Departments</option>
                                {availableDepartments.map((dept) => (
                                    <option key={dept} value={dept}>{dept}</option>
                                ))}
                            </select>
                        )}

                        {isAdmin || isHOD ? (
                            <select
                                value={dashboardStaffFilter}
                                onChange={(e) => setDashboardStaffFilter(e.target.value)}
                                className="bg-white rounded-xl border-none p-2 px-3 focus:ring-0 text-xs font-bold text-gray-700 shadow-sm cursor-pointer hover:bg-gray-50 transition-colors appearance-none"
                            >
                                <option value="all">{isHOD ? "My Group" : "All Members"}</option>
                                {availableStaff.map((staffName) => (
                                    <option key={staffName} value={staffName}>{staffName}</option>
                                ))}
                            </select>
                        ) : (
                            <div className="bg-gray-100 rounded-xl p-2 px-3 text-xs font-bold text-gray-400 italic">
                                {username || "User"}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
