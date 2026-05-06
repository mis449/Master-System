"use client"

import { useState, useEffect, useCallback } from "react"
import { fetchStaffTasksDataApi, getStaffTasksCountApi, getTotalUsersCountApi } from "../../../redux/api/dashboardApi"
import { motion, AnimatePresence } from "framer-motion"
import { Calendar, Search, Filter, ArrowRight, Award, TrendingUp, Clock, CheckCircle2, ChevronDown } from "lucide-react"

export default function StaffTasksTable({
  dashboardType,
  dashboardStaffFilter,
  departmentFilter,
  parseTaskStartDate
}) {
  const [currentPage, setCurrentPage] = useState(1)
  const [staffMembers, setStaffMembers] = useState([])
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMoreData, setHasMoreData] = useState(true)
  const [totalStaffCount, setTotalStaffCount] = useState(0)
  const [totalUsersCount, setTotalUsersCount] = useState(0)
  const [selectedMonth, setSelectedMonth] = useState('')
  const [availableMonths, setAvailableMonths] = useState([])
  const itemsPerPage = 50

  useEffect(() => {
    const months = [];
    const currentDate = new Date();
    for (let i = 0; i < 12; i++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const monthName = date.toLocaleString('default', { month: 'long', year: 'numeric' });
      const value = `${year}-${month.toString().padStart(2, '0')}`;
      months.push({ value, label: monthName });
    }
    setAvailableMonths(months);
    const currentMonth = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}`;
    setSelectedMonth(currentMonth);
  }, []);

  useEffect(() => {
    setCurrentPage(1)
    setStaffMembers([])
    setHasMoreData(true)
    setTotalStaffCount(0)
  }, [dashboardType, dashboardStaffFilter, departmentFilter, selectedMonth])

  const loadStaffData = useCallback(async (page = 1, append = false) => {
    if (isLoadingMore) return;
    try {
      setIsLoadingMore(true)
      const data = await fetchStaffTasksDataApi(dashboardType, dashboardStaffFilter, departmentFilter, page, itemsPerPage, selectedMonth)
      if (page === 1) {
        const [staffCount, usersCount] = await Promise.all([
          getStaffTasksCountApi(dashboardType, dashboardStaffFilter, departmentFilter, selectedMonth),
          getTotalUsersCountApi(departmentFilter)
        ]);
        setTotalStaffCount(staffCount)
        setTotalUsersCount(usersCount)
      }
      if (!data || data.length === 0) {
        setHasMoreData(false)
        if (!append) setStaffMembers([])
        return
      }
      if (append) setStaffMembers(prev => [...prev, ...data])
      else setStaffMembers(data)
      setHasMoreData(data.length === itemsPerPage)
    } catch (error) {
      console.error('Error loading staff data:', error)
    } finally {
      setIsLoadingMore(false)
    }
  }, [dashboardType, dashboardStaffFilter, departmentFilter, selectedMonth, isLoadingMore])

  useEffect(() => {
    if (selectedMonth) loadStaffData(1, false)
  }, [dashboardType, dashboardStaffFilter, departmentFilter, selectedMonth])

  const loadMoreData = () => {
    if (!isLoadingMore && hasMoreData) {
      const nextPage = currentPage + 1
      setCurrentPage(nextPage)
      loadStaffData(nextPage, true)
    }
  }

  useEffect(() => {
    const handleScroll = () => {
      if (!hasMoreData || isLoadingMore) return
      const tableContainer = document.querySelector('.staff-table-container')
      if (!tableContainer) return
      const { scrollTop, scrollHeight, clientHeight } = tableContainer
      if (scrollHeight - scrollTop <= clientHeight * 1.2) loadMoreData()
    }
    const tableContainer = document.querySelector('.staff-table-container')
    if (tableContainer) {
      tableContainer.addEventListener('scroll', handleScroll)
      return () => tableContainer.removeEventListener('scroll', handleScroll)
    }
  }, [hasMoreData, isLoadingMore, currentPage])

  const getDisplayMonth = () => {
    if (!selectedMonth) return '';
    const [year, month] = selectedMonth.split('-');
    return new Date(year, month - 1).toLocaleString('default', { month: 'long', year: 'numeric' });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-gray-900 tracking-tight">Staff Performance</h2>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">League Table • {getDisplayMonth()}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:flex-none">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="appearance-none pl-10 pr-10 py-2.5 bg-gray-50 border border-gray-100 hover:border-indigo-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-xs font-bold text-gray-700 transition-all cursor-pointer w-full md:w-56"
            >
              {availableMonths.map((month) => (
                <option key={month.value} value={month.value}>{month.label}</option>
              ))}
            </select>
            <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          </div>
          
          <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 rounded-2xl border border-emerald-100">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-black text-emerald-700">{staffMembers.length}/{totalUsersCount} <span className="font-bold opacity-60 ml-1">ACTIVE</span></span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-xl shadow-gray-200/50 overflow-hidden">
        <div className="staff-table-container overflow-auto" style={{ maxHeight: "600px" }}>
          <table className="min-w-full border-separate border-spacing-0">
            <thead className="sticky top-0 z-20">
              <tr className="bg-gray-50/95 backdrop-blur-md">
                {["Rank", "Team Member", "Status", "Load", "Done", "On-Time", "Efficiency"].map((header, i) => (
                  <th key={header} className={`px-6 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-100 ${i === 1 ? 'min-w-[280px]' : ''}`}>
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 bg-white">
              <AnimatePresence>
                {staffMembers.map((staff, index) => {
                  const score = staff.completion_score;
                  const getScoreStyles = (s) => {
                    if (s >= 80) return { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-100", bar: "bg-emerald-500" };
                    if (s >= 50) return { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-100", bar: "bg-amber-500" };
                    return { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-100", bar: "bg-rose-500" };
                  };
                  const styles = getScoreStyles(score);

                  return (
                    <motion.tr 
                      key={`${staff.name}-${index}`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="group hover:bg-indigo-50/30 transition-all duration-300"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-black
                          ${index === 0 ? 'bg-amber-100 text-amber-700 shadow-sm shadow-amber-200 ring-2 ring-amber-50' : 
                            index === 1 ? 'bg-slate-100 text-slate-700 shadow-sm shadow-slate-200 ring-2 ring-slate-50' : 
                            index === 2 ? 'bg-orange-100 text-orange-700 shadow-sm shadow-orange-200 ring-2 ring-orange-50' : 
                            'text-gray-400'}`}>
                          {(index + 1).toString().padStart(2, '0')}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-4">
                          <div className="relative">
                            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-sm shadow-sm
                              ${index === 0 ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white' : 
                                index === 1 ? 'bg-gradient-to-br from-slate-300 to-slate-500 text-white' : 
                                index === 2 ? 'bg-gradient-to-br from-orange-300 to-orange-600 text-white' : 
                                'bg-gray-100 text-gray-500'}`}>
                              {staff.name.charAt(0)}
                            </div>
                            {index < 3 && (
                              <div className="absolute -top-1 -right-1 w-4 h-4 bg-white rounded-full flex items-center justify-center shadow-sm">
                                <Award className={`w-2.5 h-2.5 ${index === 0 ? 'text-amber-500' : index === 1 ? 'text-slate-400' : 'text-orange-500'}`} />
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="text-sm font-black text-gray-900 tracking-tight group-hover:text-indigo-600 transition-colors">{staff.name}</div>
                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">ID: {staff.id.split('-').pop()}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-3 py-1 bg-gray-50 text-gray-500 text-[9px] font-black uppercase tracking-wider rounded-lg border border-gray-100 group-hover:bg-white transition-colors">
                          {staff.department}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-gray-300" />
                          <span className="text-xs font-black text-gray-700">{staff.total_tasks}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-xs font-black text-emerald-600">{staff.total_completed_tasks}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-xs font-black text-indigo-600">{staff.total_done_on_time}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1.5 w-32">
                          <div className="flex justify-between items-end">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-black border ${styles.bg} ${styles.text} ${styles.border}`}>
                              {score}%
                            </span>
                            <span className="text-[9px] font-bold text-gray-400 uppercase">Rate</span>
                          </div>
                          <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${score}%` }}
                              className={`h-full ${styles.bar} rounded-full`}
                              transition={{ duration: 1, ease: "easeOut" }}
                            />
                          </div>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            </tbody>
          </table>

          {isLoadingMore && (
            <div className="p-10 flex flex-col items-center justify-center">
              <div className="flex gap-1.5 mb-4">
                {[0, 1, 2].map(i => (
                  <motion.div
                    key={i}
                    animate={{ y: [0, -6, 0] }}
                    transition={{ repeat: Infinity, duration: 0.6, delay: i * 0.1 }}
                    className="w-2.5 h-2.5 bg-indigo-500 rounded-full"
                  />
                ))}
              </div>
              <span className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em]">Synchronizing Data</span>
            </div>
          )}

          {!hasMoreData && staffMembers.length > 0 && (
            <div className="py-10 text-center">
              <div className="w-px h-12 bg-gradient-to-b from-gray-200 to-transparent mx-auto mb-4" />
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">End of Records</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
