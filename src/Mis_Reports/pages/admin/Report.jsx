import React, { useState, useEffect } from "react";
import { Filter, Search, Calendar, ChevronDown } from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import ERPLayout from "../../../components/layout/ERPLayout";
import { employees, tasks, departments } from "../../data/mockData";

const Report = () => {
  const { user, role } = useAuth();
  const [filterName, setFilterName] = useState("");
  const [filterDepartment, setFilterDepartment] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [filteredData, setFilteredData] = useState([]);
  const [uniqueDepartments, setUniqueDepartments] = useState([]);
  const [uniqueNames, setUniqueNames] = useState([]);
  const [isNameDropdownOpen, setIsNameDropdownOpen] = useState(false);

  useEffect(() => {
    // Get unique departments
    const depts = [...new Set(employees.map((emp) => emp.department))];
    setUniqueDepartments(depts);

    // Get unique employee names
    const names = [...new Set(employees.map((emp) => emp.name))];
    setUniqueNames(names);

    // Initialize with all data
    applyFilters();
  }, []);

  const applyFilters = () => {
    let filteredTasks = [...tasks];

    // Filter by name
    if (filterName) {
      filteredTasks = filteredTasks.filter((task) =>
        task.personName.toLowerCase().includes(filterName.toLowerCase())
      );
    }

    // Filter by department
    if (filterDepartment) {
      const departmentEmployees = employees
        .filter((emp) => emp.department === filterDepartment)
        .map((emp) => emp.id);

      filteredTasks = filteredTasks.filter((task) =>
        departmentEmployees.includes(task.assignedTo)
      );
    }

    // Filter by date range
    if (startDate) {
      filteredTasks = filteredTasks.filter((task) => task.dueDate >= startDate);
    }

    if (endDate) {
      filteredTasks = filteredTasks.filter((task) => task.dueDate <= endDate);
    }

    setFilteredData(filteredTasks);
  };

  const clearFilters = () => {
    setFilterName("");
    setFilterDepartment("");
    setStartDate("");
    setEndDate("");
    setFilteredData(tasks);
  };

  const handleNameSelect = (name) => {
    setFilterName(name);
    setIsNameDropdownOpen(false);
  };

  // Calculate metrics for each task
  const getTaskMetrics = (task) => {
    const employee = employees.find((emp) => emp.id === task.assignedTo);
    if (!employee) return null;

    return {
      target: employee.target,
      totalAchievement: employee.actualWorkDone,
      workDonePercentage: employee.totalWorkDone,
      workDoneOnTimePercentage: employee.weeklyWorkDoneOnTime,
      allPendingTillDate: employee.allPendingTillDate,
    };
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      completed: { color: "bg-green-100 text-green-800", label: "Completed" },
      "in-progress": {
        color: "bg-blue-100 text-blue-800",
        label: "In Progress",
      },
      pending: { color: "bg-yellow-100 text-yellow-800", label: "Pending" },
    };

    const config = statusConfig[status] || {
      color: "bg-gray-100 text-gray-800",
      label: status,
    };
    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}
      >
        {config.label}
      </span>
    );
  };

  const getPriorityBadge = (priority) => {
    const priorityConfig = {
      high: { color: "bg-red-100 text-red-800", label: "High" },
      medium: { color: "bg-yellow-100 text-yellow-800", label: "Medium" },
      low: { color: "bg-green-100 text-green-800", label: "Low" },
    };

    const config = priorityConfig[priority] || {
      color: "bg-gray-100 text-gray-800",
      label: priority,
    };
    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}
      >
        {config.label}
      </span>
    );
  };

  useEffect(() => {
    applyFilters();
  }, [filterName, filterDepartment, startDate, endDate]);

  return (
    <ERPLayout>
    <div className="p-3 space-y-4 md:space-y-6 md:p-4 lg:p-6">
      {/* Header */}
      <div className="flex flex-col gap-3 justify-between items-start sm:flex-row sm:items-center md:gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-gray-900 md:text-2xl">
            Department Report
          </h1>
        
        </div>
        <div className="flex flex-shrink-0 gap-2 items-center px-3 py-2 text-sm text-gray-500 bg-gray-50 rounded-md">
          <Filter className="flex-shrink-0 w-4 h-4" />
          <span className="font-medium whitespace-nowrap">{filteredData.length} tasks found</span>
        </div>
      </div>

      {/* Filters Section */}
<div className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm md:p-6">
  <div className="flex flex-col gap-4 justify-between items-start mb-6 sm:flex-row sm:items-center sm:mb-4">
    <h2 className="flex gap-2 items-center text-lg font-semibold text-gray-900">
      <Filter className="w-5 h-5" />
      Filters
    </h2>
    <button
      onClick={clearFilters}
      className="px-4 py-2.5 w-full text-sm font-medium text-gray-600 rounded-md border border-gray-300 transition-colors hover:text-gray-800 hover:bg-gray-50 sm:w-auto"
    >
      Clear All
    </button>
  </div>

  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 md:gap-4">
    {/* Filter by Name - Dropdown */}
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        Filter by Name
      </label>
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsNameDropdownOpen(!isNameDropdownOpen)}
          className="flex justify-between items-center px-3 py-3 w-full bg-white rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <span
            className={filterName ? "text-gray-900" : "text-gray-500"}
          >
            {filterName || "Select employee..."}
          </span>
          <ChevronDown
            className={`w-4 h-4 text-gray-400 transition-transform ${
              isNameDropdownOpen ? "rotate-180" : ""}`}
          />
        </button>

        {/* Dropdown Menu */}
        {isNameDropdownOpen && (
          <div className="overflow-auto absolute z-50 mt-1 w-full max-h-60 bg-white rounded-md border border-gray-300 shadow-lg">
            <div className="py-1">
              <button
                onClick={() => handleNameSelect("")}
                className="px-4 py-3 w-full text-sm text-left text-gray-700 border-b border-gray-100 hover:bg-gray-100"
              >
                All Employees
              </button>
              {uniqueNames.map((name) => (
                <button
                  key={name}
                  onClick={() => handleNameSelect(name)}
                  className="flex gap-3 items-center px-4 py-3 w-full text-sm text-left text-gray-900 border-b border-gray-100 hover:bg-gray-100 last:border-b-0"
                >
                  {/* <img 
                    className="object-cover w-6 h-6 rounded-full" 
                    src={employees.find(emp => emp.name === name)?.image} 
                    alt={name} 
                  /> */}
                  {name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>

    {/* Filter by Department */}
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        Filter by Department
      </label>
      <select
        value={filterDepartment}
        onChange={(e) => setFilterDepartment(e.target.value)}
        className="px-3 py-3 w-full rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      >
        <option value="">All Departments</option>
        {uniqueDepartments.map((dept) => (
          <option key={dept} value={dept}>
            {dept}
          </option>
        ))}
      </select>
    </div>

    {/* Start Date */}
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        Start Date
      </label>
      <div className="relative">
        <Calendar className="absolute left-3 top-1/2 w-4 h-4 text-gray-400 transform -translate-y-1/2" />
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="py-3 pr-3 pl-10 w-full rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
    </div>

    {/* End Date */}
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        End Date
      </label>
      <div className="relative">
        <Calendar className="absolute left-3 top-1/2 w-4 h-4 text-gray-400 transform -translate-y-1/2" />
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="py-3 pr-3 pl-10 w-full rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
    </div>
  </div>
</div>
  {/* ====================  SUMMARY CARDS (WIDER, SAME HEIGHT)  ==================== */}
<div className="grid grid-cols-1 gap-4 mb-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
  {/* ---- FMS Name Card ---- */}
  <div className="w-full p-3 bg-white rounded-lg border border-gray-200">
    <div className="flex justify-between items-center">
      <div className="flex-1">
        <p className="text-xs font-medium text-gray-600">FMS Name</p>
        <p className="mt-1 text-lg font-semibold text-gray-900">
          {[...new Set(filteredData.map((task) => task.fmsName))].length}
        </p>
      </div>
      <div className="flex justify-center items-center w-9 h-9 bg-blue-50 rounded-full ml-3">
        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>
    </div>
  </div>

  {/* ---- Employees Card ---- */}
  <div className="w-full p-3 bg-white rounded-lg border border-gray-200">
    <div className="flex justify-between items-center">
      <div className="flex-1">
        <p className="text-xs font-medium text-gray-600">Employees</p>
        <p className="mt-1 text-lg font-semibold text-gray-900">
          {[...new Set(
            filteredData.map((task) => {
              const employee = employees.find((emp) => emp.id === task.assignedTo);
              return employee?.name;
            })
          )]
            .filter((name) => name)
            .length}
        </p>
      </div>
      <div className="flex justify-center items-center w-9 h-9 bg-green-50 rounded-full ml-3">
        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      </div>
    </div>
  </div>

  {/* ---- Pending Tasks Card ---- */}
  <div className="w-full p-3 bg-white rounded-lg border border-gray-200">
    <div className="flex justify-between items-center">
      <div className="flex-1">
        <p className="text-xs font-medium text-gray-600">Pending Tasks</p>
        <p className="mt-1 text-lg font-semibold text-gray-900">
          {filteredData.reduce((total, task) => {
            const employee = employees.find((emp) => emp.id === task.assignedTo);
            return total + (employee?.allPendingTillDate || 0);
          }, 0)}
        </p>
      </div>
      <div className="flex justify-center items-center w-9 h-9 bg-orange-50 rounded-full ml-3">
        <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
    </div>
  </div>

  {/* ---- Overall Score Card ---- */}
  <div className="w-full p-3 bg-white rounded-lg border border-gray-200">
    <div className="flex justify-between items-center">
      <div className="flex-1">
        <p className="text-xs font-medium text-gray-600">Overall Score</p>
        <p className="mt-1 text-lg font-semibold text-gray-900">
          {filteredData.length > 0
            ? Math.round(
                filteredData.reduce((total, task) => {
                  const employee = employees.find((emp) => emp.id === task.assignedTo);
                  return total + (employee?.totalWorkDone || 0);
                }, 0) / filteredData.length
              )
            : 0}%
        </p>
      </div>
      <div className="flex justify-center items-center w-9 h-9 bg-indigo-50 rounded-full ml-3">
        <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      </div>
    </div>
  </div>

  {/* ---- Delay Score Card ---- */}
  <div className="w-full p-3 bg-white rounded-lg border border-gray-200">
    <div className="flex justify-between items-center">
      <div className="flex-1">
        <p className="text-xs font-medium text-gray-600">Delay Score</p>
        <p className="mt-1 text-lg font-semibold text-gray-900">
          {filteredData.length > 0
            ? 100 -
              Math.round(
                filteredData.reduce((total, task) => {
                  const employee = employees.find((emp) => emp.id === task.assignedTo);
                  return total + (employee?.weeklyWorkDoneOnTime || 0);
                }, 0) / filteredData.length
              )
            : 0}%
        </p>
      </div>
      <div className="flex justify-center items-center w-9 h-9 bg-red-50 rounded-full ml-3">
        <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
    </div>
  </div>
</div>
{/* Desktop Table View */}
      <div className="hidden md:block">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase whitespace-nowrap md:px-4">
                  Employee ID
                </th>
                <th className="px-3 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase whitespace-nowrap md:px-4">
                  FMS Name
                </th>
                <th className="px-3 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase whitespace-nowrap md:px-4">
                  Task Name
                </th>
                <th className="px-3 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase whitespace-nowrap md:px-4">
                  Employee
                </th>
                <th className="px-3 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase whitespace-nowrap md:px-4">
                  Target
                </th>
                <th className="px-3 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase whitespace-nowrap md:px-4">
                  Total Achievement
                </th>
                <th className="px-3 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase whitespace-nowrap md:px-4">
                  % Work Done
                </th>
                <th className="px-3 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase whitespace-nowrap md:px-4">
                  % Work Done On Time
                </th>
                <th className="px-3 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase whitespace-nowrap md:px-4">
                  All Pending Till Date
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredData.length > 0 ? (
                filteredData.map((task) => {
                  const employee = employees.find(
                    (emp) => emp.id === task.assignedTo
                  );
                  const metrics = getTaskMetrics(task);

                  if (!employee || !metrics) return null;

                  return (
                    <tr key={task.id} className="hover:bg-gray-50">
                      <td className="px-3 py-3 text-sm font-medium text-gray-900 whitespace-nowrap md:px-4">
                        {employee.id}
                      </td>
                      <td className="px-3 py-3 text-sm font-medium text-gray-900 whitespace-nowrap md:px-4">
                        {task.fmsName}
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-900 whitespace-nowrap md:px-4">
                        <div>
                          <div className="font-medium">{task.taskName}</div>
                          <div className="mt-1 text-xs text-gray-500">
                            {task.description}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap md:px-4">
                        <div className="flex items-center">
                          <img
                            className="object-cover mr-3 w-8 h-8 rounded-full"
                            src={employee.image}
                            alt={employee.name}
                          />
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {employee.name}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-sm text-center text-gray-900 whitespace-nowrap md:px-4">
                        <span className="inline-flex justify-center items-center w-12 h-8 text-sm font-semibold text-blue-800 bg-blue-100 rounded-full">
                          {metrics.target}%
                        </span>
                      </td>
                      <td className="px-3 py-3 text-sm text-center text-gray-900 whitespace-nowrap md:px-4">
                        <span
                          className={`inline-flex items-center justify-center w-16 h-8 rounded-full text-sm font-semibold ${
                            metrics.totalAchievement >= metrics.target
                              ? "bg-green-100 text-green-800"
                              : metrics.totalAchievement >= metrics.target * 0.8
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {metrics.totalAchievement}%
                        </span>
                      </td>
                      <td className="px-3 py-3 text-sm text-center text-gray-900 whitespace-nowrap md:px-4">
                        <span
                          className={`inline-flex items-center justify-center w-16 h-8 rounded-full text-sm font-semibold ${
                            metrics.workDonePercentage >= 90
                              ? "bg-green-100 text-green-800"
                              : metrics.workDonePercentage >= 70
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {metrics.workDonePercentage}%
                        </span>
                      </td>
                      <td className="px-3 py-3 text-sm text-center text-gray-900 whitespace-nowrap md:px-4">
                        <span
                          className={`inline-flex items-center justify-center w-16 h-8 rounded-full text-sm font-semibold ${
                            metrics.workDoneOnTimePercentage >= 90
                              ? "bg-green-100 text-green-800"
                              : metrics.workDoneOnTimePercentage >= 70
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {metrics.workDoneOnTimePercentage}%
                        </span>
                      </td>
                      <td className="px-3 py-3 text-sm text-center text-gray-900 whitespace-nowrap md:px-4">
                        <span
                          className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold ${
                            metrics.allPendingTillDate === 0
                              ? "bg-green-100 text-green-800"
                              : metrics.allPendingTillDate <= 3
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {metrics.allPendingTillDate}
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan="9"
                    className="px-4 py-8 text-center text-gray-500"
                  >
                    <div className="flex flex-col justify-center items-center">
                      <Filter className="mb-2 w-12 h-12 text-gray-300" />
                      <p className="text-lg font-medium text-gray-900">
                        No tasks found
                      </p>
                      <p className="text-gray-500">
                        Try adjusting your filters to see more results
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    {/* Premium Mobile Card View */}
      <div className="md:hidden space-y-4">
        {filteredData.length > 0 ? (
          filteredData.map((task) => {
            const employee = employees.find(
              (emp) => emp.id === task.assignedTo
            );
            const metrics = getTaskMetrics(task);

            if (!employee || !metrics) return null;

            return (
              <div key={task.id} className="bg-white rounded-3xl border border-gray-100 shadow-xl shadow-gray-100/50 p-5 space-y-4 transition-all active:scale-[0.98]">
                {/* Header: Employee Info & ID */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <img
                      className="w-12 h-12 rounded-2xl object-cover border-2 border-purple-50 shadow-sm"
                      src={employee.image}
                      alt={employee.name}
                    />
                    <div>
                      <h3 className="text-sm font-black text-gray-900 tracking-tight leading-tight">{employee.name}</h3>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">ID: {employee.id}</p>
                    </div>
                  </div>
                  <div className="text-right">
                     <span className="inline-flex px-2.5 py-1 bg-purple-50 text-purple-600 text-[10px] font-black rounded-lg border border-purple-100 uppercase tracking-wider">
                        {task.fmsName}
                     </span>
                  </div>
                </div>

                {/* Task Details */}
                <div className="bg-gray-50/50 rounded-2xl p-3 border border-gray-100/50">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Current Task</p>
                  <p className="text-xs font-bold text-gray-800 leading-relaxed">{task.taskName}</p>
                  {task.description && (
                    <p className="text-[10px] text-gray-500 mt-1 font-medium italic line-clamp-1">&quot;{task.description}&quot;</p>
                  )}
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-blue-50/50 rounded-2xl p-3 border border-blue-100/50">
                    <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest mb-1">Target vs Achievement</p>
                    <div className="flex items-end justify-between">
                      <span className="text-xs font-black text-blue-900">{metrics.target}%</span>
                      <span className={`text-sm font-black ${metrics.totalAchievement >= metrics.target ? 'text-green-600' : 'text-red-600'}`}>
                        {metrics.totalAchievement}%
                      </span>
                    </div>
                    <div className="w-full bg-blue-100 h-1.5 rounded-full mt-2 overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${metrics.totalAchievement >= metrics.target ? 'bg-green-500' : 'bg-red-500'}`}
                        style={{ width: `${Math.min(metrics.totalAchievement, 100)}%` }}
                      />
                    </div>
                  </div>

                  <div className="bg-emerald-50/50 rounded-2xl p-3 border border-emerald-100/50">
                    <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1">Efficiency & Delay</p>
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-gray-500">On Time</span>
                        <span className="text-[10px] font-black text-emerald-700">{metrics.workDoneOnTimePercentage}%</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-gray-500">Pending</span>
                        <span className={`text-[10px] font-black ${metrics.allPendingTillDate > 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                          {metrics.allPendingTillDate}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Detailed % Work Done */}
                <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 rounded-2xl border border-gray-100">
                  <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Work Completion Score</span>
                  <span className={`text-xs font-black ${metrics.workDonePercentage >= 90 ? 'text-green-600' : metrics.workDonePercentage >= 70 ? 'text-amber-600' : 'text-red-600'}`}>
                    {metrics.workDonePercentage}%
                  </span>
                </div>
              </div>
            );
          })
        ) : (
          <div className="bg-white rounded-3xl border border-gray-100 p-12 text-center">
            <Filter className="w-12 h-12 text-gray-200 mx-auto mb-4" />
            <p className="text-sm font-black text-gray-900 uppercase tracking-widest">No Matches Found</p>
            <p className="text-xs text-gray-400 mt-2">Try clearing your filters to see more.</p>
          </div>
        )}
      </div>
    </div>
  </ERPLayout>
);
};

export default Report;