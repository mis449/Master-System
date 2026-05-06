"use client"

import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Search, Users, Activity, TrendingUp, Award, BarChart3, ChevronDown, CheckCircle2, Clock, Calendar, Filter, ArrowUpRight } from "lucide-react"
import supabase from "../../../SupabaseClient"
import DashboardHeader from "./DashboardHeader"
import StaticsCard from "./StaticsCard"
import TaskNavigationTabs from "./TaskNavigationTab"
import StaffTasksTable from "./StaffTaskTable"

import ERPLayout from "../../../components/layout/ERPLayout"

export default function MisReport() {
    const [dashboardType, setDashboardType] = useState("checklist")
    const [taskView, setTaskView] = useState("recent")
    const [searchQuery, setSearchQuery] = useState("")
    const [dashboardStaffFilter, setDashboardStaffFilter] = useState("all")
    const [departmentFilter, setDepartmentFilter] = useState("all")
    const [filterStaff, setFilterStaff] = useState("all")

    // Helper for frequency colors
    const getFrequencyColor = (freq) => {
        switch (freq?.toLowerCase()) {
            case "daily": return "bg-emerald-500"
            case "weekly": return "bg-blue-500"
            case "monthly": return "bg-purple-500"
            case "one-time": return "bg-amber-500"
            default: return "bg-gray-400"
        }
    }

    return (
        <ERPLayout>
            <div className="min-h-screen bg-[#F8FAFC]">
                {/* High-Fidelity Header */}
                <DashboardHeader 
                    dashboardType={dashboardType}
                    setDashboardType={setDashboardType}
                    dashboardStaffFilter={dashboardStaffFilter}
                    setDashboardStaffFilter={setDashboardStaffFilter}
                    departmentFilter={departmentFilter}
                    setDepartmentFilter={setDepartmentFilter}
                />

                {/* Download Report Button (from Screenshot) */}
                <div className="max-w-[1600px] mx-auto px-6 flex justify-end -mt-8 relative z-10">
                    <button className="flex items-center gap-2 bg-[#2563eb] text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100">
                        <ArrowUpRight className="w-4 h-4" />
                        Download Report
                    </button>
                </div>

                <main className="max-w-[1600px] mx-auto px-4 sm:px-6 pb-20 space-y-8 sm:space-y-10 mt-6 sm:-mt-12">
                    {/* Executive Statistics Grid */}
                    <StaticsCard 
                        dashboardType={dashboardType}
                        dashboardStaffFilter={dashboardStaffFilter}
                        departmentFilter={departmentFilter}
                    />

                    <div className="flex flex-col lg:grid lg:grid-cols-12 gap-6 sm:gap-8">
                        {/* Primary Content: Task Management */}
                        <div className="w-full lg:col-span-8 space-y-8 order-2 lg:order-1">
                            <TaskNavigationTabs 
                                dashboardType={dashboardType}
                                taskView={taskView}
                                setTaskView={setTaskView}
                                searchQuery={searchQuery}
                                setSearchQuery={setSearchQuery}
                                filterStaff={filterStaff}
                                setFilterStaff={setFilterStaff}
                                getFrequencyColor={getFrequencyColor}
                                dashboardStaffFilter={dashboardStaffFilter}
                                departmentFilter={departmentFilter}
                                userRole={null}
                            />
                        </div>

                        {/* Secondary Content: League Table & Insights */}
                        <div className="w-full lg:col-span-4 space-y-6 sm:space-y-8 order-1 lg:order-2">
                            <StaffTasksTable 
                                dashboardType={dashboardType}
                                dashboardStaffFilter={dashboardStaffFilter}
                                departmentFilter={departmentFilter}
                                parseTaskStartDate={null}
                            />

                            {/* Quick Insights Card */}
                            <motion.div 
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-3xl sm:rounded-[2.5rem] p-6 sm:p-8 text-white shadow-2xl shadow-indigo-200"
                            >
                                <div className="flex items-center justify-between mb-6 sm:mb-8">
                                    <div className="p-2.5 sm:p-3 bg-white/10 rounded-xl sm:rounded-2xl backdrop-blur-md">
                                        <Activity className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-300" />
                                    </div>
                                    <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-indigo-300/60">Live Intelligence</span>
                                </div>
                                
                                <h3 className="text-lg sm:text-xl font-black mb-2">Performance Outlook</h3>
                                <p className="text-indigo-200/60 text-[11px] sm:text-xs font-bold leading-relaxed mb-6 sm:mb-8">
                                    Current operational efficiency is trending 12% higher than last quarter. Keep focus on upcoming milestones.
                                </p>

                                <button className="w-full bg-white text-indigo-900 py-3.5 sm:py-4 rounded-xl sm:rounded-2xl text-[10px] sm:text-[11px] font-black uppercase tracking-widest hover:bg-indigo-50 transition-all shadow-lg">
                                    View Deep Analysis
                                </button>
                            </motion.div>
                        </div>
                    </div>
                </main>
            </div>
        </ERPLayout>
    )
}
