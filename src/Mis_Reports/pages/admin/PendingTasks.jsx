import React, { useState, useMemo } from 'react';
import { Search, Clock, X } from 'lucide-react';
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../../../context/AuthContext";
import ERPLayout from "../../../components/layout/ERPLayout";

// Employee data
const employees = [
  {
    id: 'emp-001',
    name: 'Pratap Kumar',
    email: 'pratap@company.com',
    image: 'https://images.pexels.com/photos/614810/pexels-photo-614810.jpeg?auto=compress&cs=tinysrgb&w=600',
    department: 'Engineering',
    designation: 'CRM'
  },
  {
    id: 'emp-002',
    name: 'Chetan Sharma',
    email: 'chetan@company.com',
    image: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=600',
    department: 'Design',
    designation: 'PURCHASE'
  },
  {
    id: 'emp-003',
    name: 'Digendra Patel',
    email: 'digendra@company.com',
    image: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=600',
    department: 'Marketing',
    designation: 'HR'
  },
  {
    id: 'emp-004',
    name: 'Durgesh Gupta',
    email: 'durgesh@company.com',
    image: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=600',
    department: 'Sales',
    designation: 'EA'
  },
  {
    id: 'emp-005',
    name: 'Vikash Singh',
    email: 'vikash@company.com',
    image: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=600',
    department: 'Engineering',
    designation: 'ACCOUNTANT'
  },
  {
    id: 'emp-006',
    name: 'Anubhav Kumar',
    email: 'anubhav@company.com',
    image: 'https://images.pexels.com/photos/1040880/pexels-photo-1040880.jpeg?auto=compress&cs=tinysrgb&w=600',
    department: 'IT',
    designation: 'CRM'
  },
  {
    id: 'emp-007',
    name: 'Muzammil Ahmed',
    email: 'muzammil@company.com',
    image: 'https://images.pexels.com/photos/1043471/pexels-photo-1043471.jpeg?auto=compress&cs=tinysrgb&w=600',
    department: 'Operations',
    designation: 'PURCHASE'
  },
  {
    id: 'emp-008',
    name: 'Pooja Verma',
    email: 'pooja@company.com',
    image: 'https://images.pexels.com/photos/1181686/pexels-photo-1181686.jpeg?auto=compress&cs=tinysrgb&w=600',
    department: 'HR',
    designation: 'HR'
  }
];

// Pending task data with employee references
const tasks = [
  {
    id: 'task-001',
    fmsName: 'Project Alpha',
    taskName: 'Frontend Development',
    assignedTo: 'emp-001',
    pendingTaskCount: 5,
    dueDate: '2025-10-15'
  },
  {
    id: 'task-002',
    fmsName: 'Project Beta',
    taskName: 'UI Design',
    assignedTo: 'emp-002',
    pendingTaskCount: 3,
    dueDate: '2025-10-14'
  },
  {
    id: 'task-003',
    fmsName: 'Project Gamma',
    taskName: 'Marketing Campaign',
    assignedTo: 'emp-003',
    pendingTaskCount: 8,
    dueDate: '2025-10-16'
  },
  {
    id: 'task-004',
    fmsName: 'Project Delta',
    taskName: 'Sales Presentation',
    assignedTo: 'emp-004',
    pendingTaskCount: 2,
    dueDate: '2025-10-13'
  },
  {
    id: 'task-005',
    fmsName: 'Project Epsilon',
    taskName: 'Backend Development',
    assignedTo: 'emp-005',
    pendingTaskCount: 12,
    dueDate: '2025-10-18'
  },
  {
    id: 'task-006',
    fmsName: 'Project Zeta',
    taskName: 'Quality Assurance',
    assignedTo: 'emp-006',
    pendingTaskCount: 7,
    dueDate: '2025-10-17'
  },
  {
    id: 'task-007',
    fmsName: 'Project Eta',
    taskName: 'Documentation',
    assignedTo: 'emp-007',
    pendingTaskCount: 4,
    dueDate: '2025-10-14'
  },
  {
    id: 'task-008',
    fmsName: 'Project Theta',
    taskName: 'HR Process',
    assignedTo: 'emp-008',
    pendingTaskCount: 6,
    dueDate: '2025-10-15'
  },
  {
    id: 'task-009',
    fmsName: 'Checklist & Delegation',
    taskName: 'Checklist Task-Afroj Begam',
    assignedTo: 'emp-001',
    pendingTaskCount: 15,
    dueDate: '2025-10-20'
  },
  {
    id: 'task-010',
    fmsName: 'OTD V.2-HTML',
    taskName: 'Audit',
    assignedTo: 'emp-002',
    pendingTaskCount: 9,
    dueDate: '2025-10-19'
  },
  {
    id: 'task-011',
    fmsName: 'Checklist & Delegation',
    taskName: 'Checklist Task-Amlan Dikshit',
    assignedTo: 'emp-003',
    pendingTaskCount: 11,
    dueDate: '2025-10-21'
  },
  {
    id: 'task-012',
    fmsName: 'OTD V.2-HTML',
    taskName: 'Billing',
    assignedTo: 'emp-004',
    pendingTaskCount: 10,
    dueDate: '2025-10-16'
  }
];

const AdminPendingTasks = () => {
  const { user, role } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [personFilter, setPersonFilter] = useState('all');
  const [fmsFilter, setFmsFilter] = useState('all');
  const [activeDrillDown, setActiveDrillDown] = useState(null);

  const handleRowClick = (task) => {
    // Generate dummy data based on count
    const rows = Array.from({ length: task.pendingTaskCount }, (_, i) => {
      const planned = new Date(Date.now() - Math.floor(Math.random() * 10000000000));
      const actual = new Date(planned.getTime() + Math.floor(Math.random() * 172800000)); // +0-48 hours

      return {
        id: `TD-${Math.floor(Math.random() * 10000)}`,
        description: `Pending Task for ${task.taskName} - ${i + 1}`,
        plannedDate: planned.toLocaleDateString(),
        actualDate: actual.toLocaleDateString(),
        delayHours: Math.floor(Math.random() * 48)
      };
    });

    setActiveDrillDown({
      taskId: task.taskName,
      count: task.pendingTaskCount,
      rows,
      title: `Pending Tasks (${task.pendingTaskCount})`
    });
  };

  // Get employee by ID
  const getEmployee = (employeeId) => {
    return employees.find(emp => emp.id === employeeId);
  };

  // Enrich tasks with employee data
  const enrichedTasks = useMemo(() => {
    return tasks.map(task => {
      const employee = getEmployee(task.assignedTo);
      return {
        ...task,
        personName: employee?.name || 'Unknown',
        personImage: employee?.image || '',
        department: employee?.department || 'N/A'
      };
    });
  }, []);

  // Extract unique persons and FMS names
  const persons = useMemo(() => {
    const uniquePersons = [...new Set(enrichedTasks.map(task => task.personName))];
    return uniquePersons.sort();
  }, [enrichedTasks]);

  const fmsNames = useMemo(() => {
    const uniqueFMS = [...new Set(enrichedTasks.map(task => task.fmsName))];
    return uniqueFMS.sort();
  }, [enrichedTasks]);

  // Filter tasks based on all criteria
  const filteredTasks = useMemo(() => {
    return enrichedTasks.filter(task => {
      const matchesSearch =
        task.taskName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.personName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.fmsName.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesPerson = personFilter === 'all' || task.personName === personFilter;
      const matchesFMS = fmsFilter === 'all' || task.fmsName === fmsFilter;

      return matchesSearch && matchesPerson && matchesFMS;
    });
  }, [enrichedTasks, searchQuery, personFilter, fmsFilter]);

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <ERPLayout>
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Search and Filter Bar */}
        <div className="bg-white rounded shadow-sm p-4 mb-4">
          <div className="flex flex-col md:flex-row gap-3">
            {/* Search Input */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Person Filter */}
            <div className="w-full md:w-56">
              <select
                value={personFilter}
                onChange={(e) => setPersonFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-500 appearance-none bg-white"
              >
                <option value="all">All Persons</option>
                {persons.map(person => (
                  <option key={person} value={person}>{person}</option>
                ))}
              </select>
            </div>

            {/* FMS Name Filter */}
            <div className="w-full md:w-56">
              <select
                value={fmsFilter}
                onChange={(e) => setFmsFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-500 appearance-none bg-white"
              >
                <option value="all">All FMS Names</option>
                {fmsNames.map(fms => (
                  <option key={fms} value={fms}>{fms}</option>
                ))}
              </select>
            </div>
          </div>
        </div>


        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Total Persons Card */}
          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Persons</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {personFilter === 'all'
                    ? persons.length
                    : 1
                  }
                </p>
              </div>
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Total FMS Names Card */}
          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total FMS Names</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {[...new Set(filteredTasks.map(task => task.fmsName))].length}
                </p>
              </div>
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Total Task Names Card */}
          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Task Names</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {[...new Set(filteredTasks.map(task => task.taskName))].length}
                </p>
              </div>
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
            </div>
          </div>

          {/* Total Pending Tasks Card */}
          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Pending Tasks</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {filteredTasks.reduce((total, task) => total + task.pendingTaskCount, 0)}
                </p>
              </div>
              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                <Clock className="w-5 h-5 text-orange-600" />
              </div>
            </div>
          </div>
        </div>
        {/* Tasks List */}
        <div className="bg-white rounded-[2rem] shadow-xl shadow-gray-100 overflow-hidden border border-gray-100">
          <div className="px-6 py-5 border-b border-gray-50 bg-white flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-5 bg-orange-500 rounded-full" />
              <h2 className="text-xs sm:text-sm font-black text-gray-800 uppercase tracking-widest">Active Backlog</h2>
            </div>
          </div>

          {filteredTasks.length > 0 ? (
            <>
              {/* Desktop Table View */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50/50">
                      <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">ID</th>
                      <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Assignee</th>
                      <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">FMS Category</th>
                      <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Target Task</th>
                      <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Deadline</th>
                      <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Backlog Count</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredTasks.map(task => (
                      <tr key={task.id} className="hover:bg-orange-50/30 cursor-pointer transition-colors group" onClick={() => handleRowClick(task)}>
                        <td className="px-6 py-4 whitespace-nowrap text-xs font-bold text-gray-400 uppercase">{task.assignedTo}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <img src={task.personImage} alt={task.personName} className="w-9 h-9 rounded-xl object-cover border-2 border-white shadow-sm" />
                            <span className="text-sm font-bold text-gray-900 group-hover:text-orange-600 transition-colors">{task.personName}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2.5 py-1 bg-orange-50 text-orange-700 text-[10px] font-black rounded-lg border border-orange-100 uppercase tracking-wider">{task.fmsName}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-800">{task.taskName}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-xs font-bold text-gray-500 uppercase">{formatDate(task.dueDate)}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-black bg-orange-100 text-orange-700 shadow-sm shadow-orange-50">
                            {task.pendingTaskCount} Tasks
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Premium Mobile Card View */}
              <div className="lg:hidden divide-y divide-gray-50">
                {filteredTasks.map(task => (
                  <div key={task.id} className="p-5 hover:bg-orange-50/50 cursor-pointer transition-all active:scale-[0.98] group" onClick={() => handleRowClick(task)}>
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-4">
                        <img src={task.personImage} alt={task.personName} className="w-14 h-14 rounded-[1.25rem] object-cover border-2 border-white shadow-md" />
                        <div>
                          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Assignee</p>
                          <p className="text-sm font-black text-gray-900 tracking-tight leading-tight group-hover:text-orange-600 transition-colors">{task.personName}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-wider mb-1">Backlog</p>
                        <span className="inline-flex items-center px-4 py-2 rounded-2xl text-[11px] font-black bg-orange-600 text-white shadow-lg shadow-orange-100">
                          {task.pendingTaskCount}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="bg-gray-50/50 rounded-2xl p-4 border border-gray-100/50">
                        <div className="flex justify-between items-center mb-2">
                          <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-[9px] font-black rounded uppercase tracking-wider">{task.fmsName}</span>
                          <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{task.assignedTo}</span>
                        </div>
                        <p className="text-xs font-bold text-gray-900 leading-relaxed">{task.taskName}</p>
                      </div>

                      <div className="flex items-center justify-between px-4 py-3 bg-white rounded-2xl border border-gray-100 shadow-sm">
                        <div className="flex items-center gap-2">
                          <Clock size={12} className="text-gray-400" />
                          <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Deadline</span>
                        </div>
                        <span className="text-[10px] font-black text-red-600">{formatDate(task.dueDate)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="p-20 text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-[2rem] bg-gray-50 mb-6">
                <Clock className="w-10 h-10 text-gray-200" />
              </div>
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-2">Queue is Clear</h3>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">No pending tasks found for current filters</p>
            </div>
          )}
        </div>
      </div>

      {/* Premium Drill Down Modal */}
      <AnimatePresence>
        {activeDrillDown && (
          <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-md z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden">
            <motion.div 
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              className="bg-white rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden"
            >
              <div className="flex justify-between items-center p-6 sm:p-8 border-b border-gray-50 bg-white">
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center text-orange-600">
                      <Clock size={24} />
                   </div>
                   <div>
                      <h3 className="text-base sm:text-xl font-black text-gray-900 tracking-tight">{activeDrillDown.title}</h3>
                      <p className="text-xs sm:text-sm font-bold text-orange-600 uppercase tracking-widest mt-1">{activeDrillDown.taskId}</p>
                   </div>
                </div>
                <button onClick={() => setActiveDrillDown(null)} className="p-3 hover:bg-gray-100 rounded-2xl transition-all">
                  <X className="w-6 h-6 text-gray-400" />
                </button>
              </div>

              <div className="overflow-y-auto flex-1 bg-white p-4 sm:p-8 custom-scrollbar">
                <div className="space-y-4">
                  {/* Desktop Table inside Modal */}
                  <div className="hidden sm:block overflow-x-auto rounded-[2rem] border border-gray-100">
                    <table className="min-w-full divide-y divide-gray-50">
                      <thead className="bg-gray-50/50">
                        <tr>
                          <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Planned Completion</th>
                          <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Actual Log</th>
                          <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">System Delay</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50 bg-white">
                        {activeDrillDown.rows.map((row, idx) => (
                          <tr key={idx} className="hover:bg-orange-50/30 transition-colors">
                            <td className="px-6 py-5 text-[11px] font-black text-gray-500">{row.plannedDate}</td>
                            <td className="px-6 py-5 text-[11px] font-black text-gray-500">{row.actualDate}</td>
                            <td className="px-6 py-5">
                              <span className="inline-flex items-center px-2.5 py-1 bg-red-50 text-red-600 text-[10px] font-black rounded-lg border border-red-100">
                                + {row.delayHours} Hours Delayed
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Cards inside Modal */}
                  <div className="sm:hidden space-y-4">
                    {activeDrillDown.rows.map((row, idx) => (
                      <div key={idx} className="bg-gray-50/50 rounded-2xl p-5 border border-gray-100/50 space-y-4">
                         <div className="flex justify-between items-center">
                            <div className="px-3 py-1 bg-red-50 text-red-600 text-[10px] font-black rounded-lg border border-red-100">
                              + {row.delayHours}h Delay
                            </div>
                            <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">#{idx + 1}</span>
                         </div>
                         
                         <div className="grid grid-cols-2 gap-4">
                            <div>
                               <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Target Date</p>
                               <p className="text-[11px] font-black text-gray-600">{row.plannedDate}</p>
                            </div>
                            <div className="text-right">
                               <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Current State</p>
                               <p className="text-[11px] font-black text-orange-600">Pending Log</p>
                            </div>
                         </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-6 sm:p-8 border-t border-gray-50 bg-gray-50/50 flex justify-end">
                <button onClick={() => setActiveDrillDown(null)} className="w-full sm:w-auto px-10 py-4 bg-gray-900 text-white rounded-2xl shadow-xl hover:bg-black font-black uppercase text-[11px] tracking-[0.2em] transition-all active:scale-95">Back to List</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
    </ERPLayout>
  );
};

export default AdminPendingTasks;