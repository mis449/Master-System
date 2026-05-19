"use client"

import React, { useState, useEffect, useCallback, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Filter, ChevronDown, ChevronUp, Play, Pause, Edit, Save, X, Mic, Square, Trash2, Loader2 } from "lucide-react"
import { ReactMediaRecorder } from "react-media-recorder"
import AudioPlayer from "../../../components/AudioPlayer"
import RenderDescription from "../../../components/RenderDescription"
import supabase from "../../../SupabaseClient"
import { fetchDashboardDataApi, getDashboardDataCount } from "../../../redux/api/dashboardApi"
import { useDispatch } from "react-redux"
import { updateChecklistTask, updateDelegationTask } from "../../../redux/slice/quickTaskSlice"
import { updateMaintenanceTask } from "../../../redux/slice/maintenanceSlice"
import { fetchUniqueDepartmentDataApi, fetchUniqueGivenByDataApi, fetchUniqueDoerNameDataApi } from "../../../redux/api/assignTaskApi"

const isAudioUrl = (url) => {
  if (!url || typeof url !== 'string') return false;
  return url.startsWith('http') && (
    url.includes('all_images') ||
    url.includes('voice-notes') ||
    url.match(/\.(mp3|wav|ogg|webm|m4a|aac)(\?.*)?$/i)
  );
};

export default function TaskNavigationTabs({
  dashboardType,
  taskView,
  setTaskView,
  searchQuery,
  setSearchQuery,
  filterStaff,
  setFilterStaff,
  departmentData,
  getFrequencyColor,
  dashboardStaffFilter,
  departmentFilter,
  userRole // Add this prop
}) {
  const [currentPage, setCurrentPage] = useState(1)
  const [displayedTasks, setDisplayedTasks] = useState([])
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMoreData, setHasMoreData] = useState(true)
  const [totalCount, setTotalCount] = useState(0)
  const [isFilterExpanded, setIsFilterExpanded] = useState(false) // Add this state
  const [isSaving, setIsSaving] = useState(false)
  const [editingTaskId, setEditingTaskId] = useState(null)
  const [editFormData, setEditFormData] = useState({})
  const [recordedAudio, setRecordedAudio] = useState(null)
  const [isUploading, setIsUploading] = useState(false)

  // Dropdown lists
  const [departments, setDepartments] = useState([]);
  const [givenByList, setGivenByList] = useState([]);
  const [doersList, setDoersList] = useState([]);

  const dispatch = useDispatch()
  const itemsPerPage = 50

  // Edit Handlers
  const handleEditClick = (task) => {
    setEditingTaskId(task.id);
    setEditFormData({
      id: task.id,
      task_description: task.title || '',
      name: task.assignedTo || '',
      department: task.department || '',
      task_start_date: task.originalTaskStartDate || '',
      frequency: task.frequency || '',
      originalAudioUrl: isAudioUrl(task.title) ? task.title : null,
      // Add other relevant fields if needed
    });
  };

  const handleCancelEdit = () => {
    setEditingTaskId(null);
    setEditFormData({});
    setRecordedAudio(null);
  };

  const handleInputChange = async (field, value) => {
    setEditFormData(prev => ({ ...prev, [field]: value }));

    // If department changes, refresh doers list
    if (field === 'department') {
      const doers = await fetchUniqueDoerNameDataApi(value);
      setDoersList(doers);
    }
  };

  const handleSaveEdit = async () => {
    setIsSaving(true);
    try {
      let finalEditData = { ...editFormData };
      let audioToCleanup = null;

      // Handle Audio Upload or Change
      if (recordedAudio && recordedAudio.blob) {
        setIsUploading(true);
        try {
          const fileName = `voice-notes/${Date.now()}-${Math.random().toString(36).substring(7)}.webm`;
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('all_images')
            .upload(fileName, recordedAudio.blob, {
              contentType: recordedAudio.blob.type || 'audio/webm',
              upsert: false
            });

          if (uploadError) throw uploadError;

          const { data: publicUrlData } = supabase.storage
            .from('all_images')
            .getPublicUrl(fileName);

          finalEditData.task_description = publicUrlData.publicUrl;

          // If we had an original audio, mark it for cleanup
          if (editFormData.originalAudioUrl) {
            audioToCleanup = editFormData.originalAudioUrl;
          }
        } catch (error) {
          console.error("Audio upload failed:", error);
          alert("Failed to upload voice note. Saving without it.");
        } finally {
          setIsUploading(false);
        }
      } else if (editFormData.originalAudioUrl && isAudioUrl(editFormData.task_description)) {
        // No new recording, keeping old audio
      } else if (editFormData.originalAudioUrl && !isAudioUrl(editFormData.task_description)) {
        // Audio removed, record it for cleanup
        audioToCleanup = editFormData.originalAudioUrl;
      }

      if (dashboardType === 'checklist') {
        const originalTask = displayedTasks.find(t => t.id === editingTaskId);
        await dispatch(updateChecklistTask({
          updatedTask: finalEditData,
          originalTask: {
            department: originalTask.department,
            name: originalTask.assignedTo,
            task_description: originalTask.title
          }
        })).unwrap();
      } else if (dashboardType === 'maintenance') {
        const originalTask = displayedTasks.find(t => t.id === editingTaskId);
        const updatedTask = {
          ...finalEditData,
          freq: finalEditData.frequency
        };
        await dispatch(updateMaintenanceTask({
          updatedTask,
          originalTask: {
            machine_name: originalTask.machine_name || originalTask.title, // Handle potential mapping differences
            part_name: originalTask.part_name || '',
            task_description: originalTask.title
          }
        })).unwrap();
      } else if (dashboardType === 'delegation') {
        const originalTask = displayedTasks.find(t => t.id === editingTaskId);
        await dispatch(updateDelegationTask({
          updatedTask: finalEditData,
          originalTask: {
            department: originalTask.department,
            name: originalTask.assignedTo,
            task_description: originalTask.title
          }
        })).unwrap();
      }

      // Cleanup audio after successful DB update
      if (audioToCleanup) {
        try {
          const path = audioToCleanup.split('audio-recordings/').pop().split('?')[0];
          await supabase.storage.from('all_images').remove([path]);
        } catch (cleanupError) {
          console.error("Failed to cleanup old audio:", cleanupError);
        }
      }

      setEditingTaskId(null);
      setRecordedAudio(null);
      loadTasksFromServer(1, false);
    } catch (error) {
      console.error("Failed to save edit:", error);
      alert("Failed to save changes: " + (error.message || "Unknown error"));
    } finally {
      setIsSaving(false);
    }
  };

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1)
    setDisplayedTasks([])
    setHasMoreData(true)
    setTotalCount(0)
  }, [taskView, dashboardType, dashboardStaffFilter, departmentFilter]) // Add departmentFilter

  // Function to load tasks from server
  const loadTasksFromServer = useCallback(async (page = 1, append = false) => {
    if (isLoadingMore) return;

    try {
      setIsLoadingMore(true)

      console.log('Loading tasks with filters:', {
        dashboardType,
        dashboardStaffFilter,
        taskView,
        page,
        departmentFilter
      });

      // Use departmentFilter for server call (only affects table data)
      const data = await fetchDashboardDataApi(
        dashboardType,
        dashboardStaffFilter,
        page,
        itemsPerPage,
        taskView,
        departmentFilter // Pass department filter to API
      )

      // Get total count for this view (only on first load)
      if (page === 1) {
        const count = await getDashboardDataCount(dashboardType, dashboardStaffFilter, taskView, departmentFilter)
        setTotalCount(count)
      }

      if (!data || data.length === 0) {
        setHasMoreData(false)
        if (!append) {
          setDisplayedTasks([])
        }
        setIsLoadingMore(false)
        return
      }

      console.log('Raw data received:', data.length, 'records');

      // Process the data similar to your existing logic
      const seen = new Set();
      const processedTasks = data.map((task) => {
        // Use planned_date for checklist/delegation as the primary date for status/display
        // Use task_start_date for others (maintenance, repair, etc.)
        const dateToUse = (dashboardType === 'checklist' || dashboardType === 'delegation')
          ? (task.planned_date || task.task_start_date)
          : task.task_start_date;

        const taskStartDate = parseTaskStartDate(dateToUse)
        const completionDate = task.submission_date ? parseTaskStartDate(task.submission_date) : null

        let status = "pending"
        let timeStatus = "Upcoming"
        const now = new Date();
        now.setHours(0, 0, 0, 0);

        if (completionDate || task.status === 'yes' || task.status === 'done' || task.admin_done) {
          status = "completed"
          timeStatus = "Submitted"
        } else if (taskStartDate) {
          const taskDateOnly = new Date(taskStartDate);
          taskDateOnly.setHours(0, 0, 0, 0);

          if (taskDateOnly < now) {
            status = "overdue"
            timeStatus = "Overdue"
          } else if (taskDateOnly.getTime() === now.getTime()) {
            status = "pending"
            timeStatus = "Today"
          } else {
            status = "upcoming"
            timeStatus = "Upcoming"
          }
        }

        return {
          ...task,
          id: task.id,
          title: task.task_description,
          assignedTo: task.name || "Unassigned",
          taskStartDate: formatDateToDDMMYYYY(taskStartDate),
          originalTaskStartDate: task.task_start_date,
          plannedDate: task.planned_date,
          status,
          timeStatus,
          frequency: task.frequency || "one-time",
          rating: task.color_code_for || 0,
          department: task.department || "N/A",
        }
      })

      console.log('Processed tasks:', processedTasks.length, 'records');

      // Apply client-side search filter AND smart deduplication
      let filteredTasks = processedTasks.filter((task) => {
        // 0. Tab view strict filter (Prevents UTC offset task leakage across tabs)
        // If the task view is 'recent', we only want TODAY'S tasks. If the local calculation 
        // says it's "Upcoming", we hide it from this tab.
        if (taskView === 'recent') {
          // Keep tasks categorized as Today or already Submitted
          if (task.timeStatus !== 'Today' && task.timeStatus !== 'Submitted') return false;
        } else if (taskView === 'upcoming') {
          if (task.timeStatus !== 'Upcoming') return false;
        } else if (taskView === 'overdue') {
          if (task.timeStatus !== 'Overdue') return false;
        }

        // 1. Search filter
        if (searchQuery && searchQuery.trim() !== "") {
          const query = searchQuery.toLowerCase().trim()
          const matchesSearch = (
            (task.title && task.title.toLowerCase().includes(query)) ||
            (task.id && task.id.toString().includes(query)) ||
            (task.assignedTo && task.assignedTo.toLowerCase().includes(query))
          )
          if (!matchesSearch) return false;
        }

        // 2. Smart deduplication for checklist/delegation/maintenance
        if (dashboardType === 'checklist' || dashboardType === 'delegation' || dashboardType === 'maintenance' || dashboardType === 'ea' || dashboardType === 'repair') {
          if (task.status === "upcoming") {
            // UPCOMING: only show the NEXT (earliest) occurrence per task series
            const descKey = task.task_description || task.title || "";
            const nameKey = task.name || task.assignedTo || "";
            const key = `upcoming::${descKey}::${nameKey}`;
            if (seen.has(key)) return false;
            seen.add(key);
          } else {
            // OVERDUE & TODAY: show each day individually
            const taskDate = task.plannedDate ? new Date(task.plannedDate).toDateString() :
              (task.originalTaskStartDate ? new Date(task.originalTaskStartDate).toDateString() : "");
            const descKey = task.task_description || task.title || "";
            const nameKey = task.name || task.assignedTo || "";
            const key = `${descKey}::${nameKey}::${taskDate}`;
            if (seen.has(key)) return false;
            seen.add(key);
          }
        }

        return true
      })

      console.log('Final filtered tasks:', filteredTasks.length, 'records');

      if (append) {
        setDisplayedTasks(prev => [...prev, ...filteredTasks])
      } else {
        setDisplayedTasks(filteredTasks)
      }

      // Check if we have more data
      setHasMoreData(data.length === itemsPerPage)

    } catch (error) {
      console.error('Error loading tasks:', error)
    } finally {
      setIsLoadingMore(false)
    }
  }, [dashboardType, dashboardStaffFilter, taskView, searchQuery, departmentFilter, isLoadingMore, itemsPerPage])

  // Helper functions
  const parseTaskStartDate = (dateStr) => {
    if (!dateStr || typeof dateStr !== "string") return null

    if (dateStr.includes("-") && dateStr.match(/^\d{4}-\d{2}-\d{2}/)) {
      const parsed = new Date(dateStr)
      return isNaN(parsed) ? null : parsed
    }

    if (dateStr.includes("/")) {
      const parts = dateStr.split(" ")
      const datePart = parts[0]
      const dateComponents = datePart.split("/")
      if (dateComponents.length !== 3) return null

      const [day, month, year] = dateComponents.map(Number)
      if (!day || !month || !year) return null

      const date = new Date(year, month - 1, day)
      if (parts.length > 1) {
        const timePart = parts[1]
        const timeComponents = timePart.split(":")
        if (timeComponents.length >= 2) {
          const [hours, minutes, seconds] = timeComponents.map(Number)
          date.setHours(hours || 0, minutes || 0, seconds || 0)
        }
      }
      return isNaN(date) ? null : date
    }

    const parsed = new Date(dateStr)
    return isNaN(parsed) ? null : parsed
  }

  const formatDateToDDMMYYYY = (date) => {
    if (!date || !(date instanceof Date) || isNaN(date)) return ""
    const day = date.getDate().toString().padStart(2, "0")
    const month = (date.getMonth() + 1).toString().padStart(2, "0")
    const year = date.getFullYear()
    return `${day}/${month}/${year}`
  }

  const isDateInPast = (date) => {
    if (!date || !(date instanceof Date)) return false
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const checkDate = new Date(date)
    checkDate.setHours(0, 0, 0, 0)
    return checkDate < today
  }

  // Initial load when component mounts or key dependencies change
  useEffect(() => {
    loadTasksFromServer(1, false)

    // Fetch dropdown data
    const fetchDropdownData = async () => {
      const [depts, givens, doers] = await Promise.all([
        fetchUniqueDepartmentDataApi(),
        fetchUniqueGivenByDataApi(),
        fetchUniqueDoerNameDataApi()
      ]);
      setDepartments(depts);
      setGivenByList(givens);
      setDoersList(doers);
    };
    fetchDropdownData();
  }, [taskView, dashboardType, dashboardStaffFilter, departmentFilter])

  // Load more when search changes (client-side filter)
  useEffect(() => {
    if (currentPage === 1) {
      loadTasksFromServer(1, false)
    }
  }, [searchQuery])

  // Reset local staff filter when dashboardStaffFilter changes
  useEffect(() => {
    if (dashboardStaffFilter !== "all") {
      setFilterStaff("all")
    }
  }, [dashboardStaffFilter])

  // Function to load more data when scrolling
  const loadMoreData = () => {
    if (!isLoadingMore && hasMoreData) {
      const nextPage = currentPage + 1
      setCurrentPage(nextPage)
      loadTasksFromServer(nextPage, true)
    }
  }

  // Handle scroll event for infinite loading
  useEffect(() => {
    const handleScroll = () => {
      if (!hasMoreData || isLoadingMore) return

      const tableContainer = document.querySelector('.task-table-container')
      if (!tableContainer) return

      const { scrollTop, scrollHeight, clientHeight } = tableContainer
      const isNearBottom = scrollHeight - scrollTop <= clientHeight * 1.2

      if (isNearBottom) {
        loadMoreData()
      }
    }

    const tableContainer = document.querySelector('.task-table-container')
    if (tableContainer) {
      tableContainer.addEventListener('scroll', handleScroll)
      return () => tableContainer.removeEventListener('scroll', handleScroll)
    }
  }, [hasMoreData, isLoadingMore, currentPage])

  return (
    <div className="w-full space-y-6">
      {/* Premium Tab Selection */}
      <div className="bg-white p-2 sm:p-2.5 rounded-2xl shadow-sm border border-gray-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex bg-gray-100/80 p-1 rounded-xl sm:rounded-2xl gap-1 overflow-x-auto custom-scrollbar">
          {["recent", "upcoming", "overdue"].map((view) => (
            <button
              key={view}
              onClick={() => setTaskView(view)}
              className={`
                relative flex items-center justify-center gap-2 py-1.5 sm:py-2 px-3 sm:px-6 rounded-lg text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all duration-500 min-w-[80px] sm:min-w-[110px] z-10
                ${taskView === view ? "text-white" : "text-gray-400 hover:text-blue-600"}
              `}
            >
              {taskView === view && (
                <motion.div
                  layoutId="activeTabGlow"
                  className="absolute inset-0 bg-gradient-to-r from-blue-600 to-blue-500 rounded-lg shadow-lg shadow-blue-200"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              <span className="relative">
                {view === "overdue" ? "Overdue" :
                  (dashboardType === "delegation"
                    ? (view === "recent" ? "Today Task" : "Future Task")
                    : (view === "recent" ? "Recent" : "Upcoming")
                  )
                }
              </span>
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="flex items-center gap-3 bg-gray-50 border border-gray-100 px-5 py-2 rounded-xl w-full sm:w-72 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-400 transition-all h-10">
          <Filter className="w-4 h-4 text-gray-400 shrink-0" />
          <input
            type="text"
            placeholder="Quick search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent border-none focus:ring-0 text-[11px] sm:text-[12px] font-bold text-gray-700 w-full placeholder:text-gray-300 placeholder:font-black uppercase tracking-widest"
          />
        </div>
      </div>

      {/* Task List / Table Rendering */}
      {displayedTasks.length === 0 && !isLoadingMore ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center p-20 bg-white rounded-none border border-gray-200 shadow-none"
        >
          <div className="flex justify-center mb-6">
            <div className="p-6 bg-blue-50 rounded-none text-blue-600">
              <Filter className="h-10 w-10 opacity-40" />
            </div>
          </div>
          <h3 className="text-lg font-bold text-gray-900 tracking-tight">Zero Tasks Identified</h3>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-widest mt-2">Adjust your filters to discover records</p>
        </motion.div>
      ) : (
        <div className="bg-white rounded-none border border-gray-200 shadow-none overflow-hidden">
          <div
            className="task-table-container overflow-x-auto"
            style={{ maxHeight: "calc(100vh - 420px)", minHeight: "400px", overflowY: "auto" }}
          >
            {/* Desktop Table View */}
            <table className="min-w-full border-separate border-spacing-0 hidden lg:table">
              <thead className="sticky top-0 z-20">
                <tr className="bg-gray-50/95 backdrop-blur-md">
                  <th className="px-4 py-4 text-left text-[12px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100">ID</th>
                  {dashboardType === "delegation" && (
                    <th className="px-4 py-4 text-left text-[12px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100">Timeline</th>
                  )}
                  <th className="px-4 py-4 text-left text-[12px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 min-w-[340px]">Objective & Description</th>
                  <th className="px-4 py-4 text-left text-[12px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100">Assignee</th>
                  {dashboardType === "checklist" && (
                    <th className="px-4 py-4 text-left text-[12px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100">Dept</th>
                  )}
                  <th className="px-4 py-4 text-left text-[12px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100">Scheduled</th>
                  <th className="px-4 py-4 text-left text-[12px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100">Status</th>
                  <th className="px-4 py-4 text-left text-[12px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100">Freq</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-50">
                <AnimatePresence>
                  {displayedTasks.map((task, index) => {
                    const getStatusStyle = (s, ad) => {
                      if (s === "completed" || s === "done" || s === "yes") {
                        return ad ? { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-100", label: "Finalized" } 
                                  : { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-100", label: "Verification" };
                      }
                      if (s === "overdue") return { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-100", label: "Delayed" };
                      return { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-100", label: "Active" };
                    };
                    const statusUI = getStatusStyle(task.status, task.admin_done);

                    return (
                      <motion.tr
                        key={`${task.id}-${task.taskStartDate}-${index}`}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.03 }}
                        className="group hover:bg-gray-50/80 transition-all duration-300 cursor-pointer"
                        onDoubleClick={() => handleEditClick(task)}
                      >
                        <td className="px-4 py-5 whitespace-nowrap">
                          <span className="text-[15px] font-semibold text-blue-600/50 group-hover:text-blue-600 transition-colors">#{task.id}</span>
                        </td>
                        {dashboardType === "delegation" && (
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold uppercase tracking-wider
                              ${task.timeStatus === "Overdue" ? "bg-rose-50 text-rose-600 border border-rose-100" :
                                task.timeStatus === "Today" ? "bg-amber-50 text-amber-600 border border-amber-100" :
                                  task.timeStatus === "Submitted" ? "bg-emerald-50 text-emerald-600 border border-emerald-100" :
                                    "bg-blue-50 text-blue-600 border border-blue-100"
                              }`}>
                              {task.timeStatus}
                            </span>
                          </td>
                        )}
                        <td className="px-4 py-3">
                          {editingTaskId === task.id ? (
                            <div className="bg-gray-50 p-2 rounded-xl border border-gray-100">
                                <textarea
                                  value={editFormData.task_description}
                                  onChange={(e) => handleInputChange('task_description', e.target.value)}
                                  className="w-full bg-white rounded-lg border-gray-100 p-2 text-[10px] font-bold text-gray-700 focus:ring-2 focus:ring-blue-500/20"
                                  rows="2"
                                />
                                <div className="flex gap-2 mt-2">
                                  <button onClick={handleSaveEdit} className="flex-1 bg-blue-600 text-white py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest shadow-lg shadow-blue-100">Save</button>
                                  <button onClick={handleCancelEdit} className="flex-1 bg-white text-gray-400 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest border border-gray-100">Cancel</button>
                                </div>
                            </div>
                          ) : (
                            <div className="group-hover:translate-x-1 transition-transform">
                              <RenderDescription
                                text={task.title || task.task_description}
                                audioUrl={task.audio_url}
                                instructionUrl={task.instruction_attachment_url}
                                instructionType={task.instruction_attachment_type}
                              />
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-5 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center text-[13px] font-semibold text-gray-500 group-hover:bg-blue-600 group-hover:text-white transition-all">
                              {task.assignedTo?.charAt(0) || '?'}
                            </div>
                            <span className="text-[16px] font-semibold text-gray-700">{task.assignedTo}</span>
                          </div>
                        </td>
                        {dashboardType === "checklist" && (
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="text-[9px] font-semibold text-gray-400 uppercase tracking-widest">{task.department}</span>
                          </td>
                        )}
                        <td className="px-4 py-5 whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className="text-[15px] font-semibold text-gray-700">{task.taskStartDate}</span>
                          </div>
                        </td>
                        <td className="px-4 py-5 whitespace-nowrap">
                          <span className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold uppercase tracking-widest border shadow-sm ${statusUI.bg} ${statusUI.text} ${statusUI.border}`}>
                            {statusUI.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className={`w-1 h-1 rounded-full ${getFrequencyColor(task.frequency)}`} />
                            <span className="text-[9px] font-semibold text-gray-400 uppercase tracking-widest">{task.frequency}</span>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </tbody>
            </table>

            {/* Mobile Card View */}
            <div className="lg:hidden divide-y divide-gray-100">
              <AnimatePresence>
                {displayedTasks.map((task, index) => {
                  const getStatusStyle = (s, ad) => {
                    if (s === "completed" || s === "done" || s === "yes") {
                      return ad ? { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-100", label: "Finalized" } 
                                : { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-100", label: "Verification" };
                    }
                    if (s === "overdue") return { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-100", label: "Delayed" };
                    return { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-100", label: "Active" };
                  };
                  const statusUI = getStatusStyle(task.status, task.admin_done);

                  return (
                       <motion.div
                        key={`${task.id}-${task.taskStartDate}-${index}`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.03 }}
                        className="p-3 space-y-3"
                        onClick={() => handleEditClick(task)}
                      >
                      <div className="flex items-center justify-between">
                         <div className="flex items-center gap-2">
                            <span className="text-[12px] font-semibold text-blue-600/50">#{task.id}</span>
                            {dashboardType === "delegation" && (
                              <span className={`px-2 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wider
                                ${task.timeStatus === "Overdue" ? "bg-rose-50 text-rose-600 border border-rose-100" :
                                  task.timeStatus === "Today" ? "bg-amber-50 text-amber-600 border border-amber-100" :
                                    task.timeStatus === "Submitted" ? "bg-emerald-50 text-emerald-600 border border-emerald-100" :
                                      "bg-blue-50 text-blue-600 border border-blue-100"
                                }`}>
                                {task.timeStatus}
                              </span>
                            )}
                         </div>
                         <span className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold uppercase tracking-widest border shadow-sm ${statusUI.bg} ${statusUI.text} ${statusUI.border}`}>
                            {statusUI.label}
                         </span>
                      </div>

                      <div className="text-sm font-medium text-gray-700 leading-relaxed bg-gray-50/50 p-3 rounded-xl border border-gray-100/50">
                         <RenderDescription
                            text={task.title || task.task_description}
                            audioUrl={task.audio_url}
                            instructionUrl={task.instruction_attachment_url}
                            instructionType={task.instruction_attachment_type}
                          />
                      </div>

                      <div className="grid grid-cols-2 gap-4 pt-3">
                         <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-[11px] font-bold text-gray-500">
                               {task.assignedTo?.charAt(0) || '?'}
                            </div>
                            <div className="flex flex-col">
                               <span className="text-[12px] font-semibold text-gray-700">{task.assignedTo}</span>
                               <span className="text-[10px] font-medium text-gray-400 uppercase">{task.department}</span>
                            </div>
                         </div>
                         <div className="text-right flex flex-col justify-center">
                            <span className="text-[12px] font-semibold text-gray-700">{task.taskStartDate}</span>
                            <div className="flex items-center justify-end gap-1.5 mt-0.5">
                               <div className={`w-1.5 h-1.5 rounded-full ${getFrequencyColor(task.frequency)}`} />
                               <span className="text-[10px] font-semibold text-gray-400 uppercase">{task.frequency}</span>
                            </div>
                         </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>

            {isLoadingMore && (
              <div className="p-10 flex flex-col items-center justify-center">
                <Loader2 className="w-6 h-6 text-blue-600 animate-spin opacity-50" />
                <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mt-4">Synchronizing Tasks</span>
              </div>
            )}

            {!hasMoreData && displayedTasks.length > 0 && (
              <div className="py-12 text-center bg-gray-50/30">
                <div className="w-px h-16 bg-gradient-to-b from-gray-200 to-transparent mx-auto mb-4" />
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.4em]">End of Records</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
