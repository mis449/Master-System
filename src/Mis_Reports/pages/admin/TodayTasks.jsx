import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Search, X, Loader2, Filter, Calendar, Clock, ChevronDown, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../../../context/AuthContext";
import ERPLayout from "../../../components/layout/ERPLayout";
import { getDisplayableImageUrl } from '../../utils/imageUtils';

const AdminTodayTasks = () => {
  const { user, role } = useAuth();
  const [loading, setLoading] = useState(true);
  const [sheetEmployees, setSheetEmployees] = useState([]);
  const [dataSheetRows, setDataSheetRows] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [personFilter, setPersonFilter] = useState("all");
  const [fmsFilter, setFmsFilter] = useState("all");
  const [activeDrillDown, setActiveDrillDown] = useState(null);
  const [taskTodayCounts, setTaskTodayCounts] = useState({});
  const [fetchingTodayCounts, setFetchingTodayCounts] = useState(false);

  // Helper: Parse sheet reference like "FMS 1!O7:O"
  const parseSheetRef = useCallback((ref) => {
    if (!ref) return null;
    const str = String(ref).trim();
    const bangIndex = str.indexOf("!");
    if (bangIndex === -1) return { sheetName: str, colIndex: -1, startRowIndex: 0 };
    const sheetName = str.substring(0, bangIndex);
    const rangePart = str.substring(bangIndex + 1);
    const colMatch = rangePart.match(/^([A-Za-z]+)(\d*)/);
    if (!colMatch) return { sheetName, colIndex: -1, startRowIndex: 0 };
    const colLetter = colMatch[1].toUpperCase();
    let colIndex = 0;
    for (let i = 0; i < colLetter.length; i++) {
      colIndex = colIndex * 26 + (colLetter.charCodeAt(i) - 64);
    }
    colIndex -= 1;
    const startRow = colMatch[2] ? parseInt(colMatch[2]) : 1;
    const startRowIndex = startRow > 0 ? startRow - 1 : 0;
    return { sheetName, colIndex, startRowIndex };
  }, []);

  // Fetch Data from Google Sheet
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const scriptUrl = import.meta.env.VITE_APPS_SCRIPT_URL;
        if (!scriptUrl) {
          console.error("VITE_APPS_SCRIPT_URL not set");
          setLoading(false);
          return;
        }

        const [masterResponse, dataResponse, recordsResponse] = await Promise.all([
          fetch(`${scriptUrl}?sheet=Master`),
          fetch(`${scriptUrl}?sheet=Data`),
          fetch(`${scriptUrl}?sheet=For Records`)
        ]);

        const masterResult = await masterResponse.json();
        const dataResult = await dataResponse.json();
        const recordsResult = await recordsResponse.json();

        const imageMap = {};
        if (masterResult.success && Array.isArray(masterResult.data)) {
          masterResult.data.slice(1).forEach(row => {
            const name = row[0] ? String(row[0]).trim().toLowerCase() : "";
            const imageUrl = row[4];
            if (name && imageUrl) imageMap[name] = imageUrl;
          });
        }

        if (dataResult.success && Array.isArray(dataResult.data)) {
          setDataSheetRows(dataResult.data.slice(1));
        }

        if (recordsResult.success && Array.isArray(recordsResult.data)) {
          const parsed = recordsResult.data.slice(2)
            .filter(row => row[2] && String(row[2]).trim() !== "")
            .map((row, index) => {
              const empName = row[2] || "Unknown";
              const normalizedName = String(empName).trim().toLowerCase();
              let finalImageUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(empName)}&background=0D8ABC&color=fff&size=128`;
              const rawImageUrl = imageMap[normalizedName];
              if (rawImageUrl) {
                const processedUrl = getDisplayableImageUrl(rawImageUrl);
                if (processedUrl) finalImageUrl = processedUrl;
              }
              return {
                id: `emp-${100 + index}`,
                name: empName,
                image: finalImageUrl,
                department: row[0] || "N/A",
                designation: row[3] || "N/A"
              };
            });
          setSheetEmployees(parsed);
        }
      } catch (error) {
        console.error("Error fetching sheet data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Calculate "Today's" count for each task
  useEffect(() => {
    if (dataSheetRows.length === 0 || sheetEmployees.length === 0) return;

    const fetchTodayTasksCounts = async () => {
      setFetchingTodayCounts(true);
      const counts = {};
      const todayDate = new Date().toLocaleDateString('en-GB');

      const sheetGroups = {};
      dataSheetRows.forEach((row, idx) => {
        const scriptUrl = String(row[25] || "").trim();
        const plannedRef = parseSheetRef(row[7]);
        if (!scriptUrl || !plannedRef) return;
        const key = `${scriptUrl}|${plannedRef.sheetName}`;
        if (!sheetGroups[key]) sheetGroups[key] = { scriptUrl, sheetName: plannedRef.sheetName, taskIndices: [] };
        sheetGroups[key].taskIndices.push(idx);
      });

      await Promise.all(Object.values(sheetGroups).map(async (group) => {
        try {
          const res = await fetch(`${group.scriptUrl}?sheet=${encodeURIComponent(group.sheetName)}`);
          const result = await res.json();
          if (!result.success || !Array.isArray(result.data)) return;
          const sheetData = result.data;
          group.taskIndices.forEach((taskIdx) => {
            const row = dataSheetRows[taskIdx];
            const nameRef = parseSheetRef(row[9]);
            const plannedRef = parseSheetRef(row[7]);
            const personName = String(row[4] || "").trim();
            if (!nameRef || !plannedRef) return;
            let todayCount = 0;
            sheetData.slice(nameRef.startRowIndex).forEach((r) => {
              if (String(r[nameRef.colIndex] || "").trim() === personName) {
                const d = new Date(r[plannedRef.colIndex]);
                if (!isNaN(d.getTime()) && d.toLocaleDateString('en-GB') === todayDate) todayCount++;
              }
            });
            counts[taskIdx] = todayCount;
          });
        } catch (e) {
          console.error("Error fetching counts:", group.sheetName, e);
        }
      }));
      setTaskTodayCounts(counts);
      setFetchingTodayCounts(false);
    };
    fetchTodayTasksCounts();
  }, [dataSheetRows, sheetEmployees, parseSheetRef]);

  // Enrich tasks
  const enrichedTasks = useMemo(() => {
    return dataSheetRows.map((row, idx) => {
      const personName = row[4] ? String(row[4]).trim() : "Unknown";
      const normalizedName = personName.toLowerCase();
      const employee = sheetEmployees.find(e => e.name.toLowerCase() === normalizedName);
      return {
        id: `task-${idx}`,
        fmsName: row[2] || "N/A",
        taskName: row[3] || "N/A",
        assignedTo: employee?.id || "N/A",
        personName: personName,
        personImage: employee?.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(personName)}&background=0D8ABC&color=fff&size=128`,
        department: row[0] || "N/A",
        designation: employee?.designation || "N/A",
        plannedCount: taskTodayCounts[idx] !== undefined ? taskTodayCounts[idx] : (fetchingTodayCounts ? "..." : 0),
        scriptUrl: row[25] || "",
        plannedSheetRef: row[7] || "",
        actualSheetRef: row[8] || "",
        nameColRef: row[9] || "",
        taskNameColRef: row[26] || ""
      };
    });
  }, [dataSheetRows, sheetEmployees, taskTodayCounts, fetchingTodayCounts]);

  // Group by Employee Name
  const groupedEmployees = useMemo(() => {
    const groups = {};
    enrichedTasks.forEach(task => {
      const name = task.personName;
      if (!groups[name]) {
        groups[name] = {
          personName: name,
          personImage: task.personImage,
          assignedTo: task.assignedTo,
          designation: task.designation,
          plannedCount: 0,
          tasks: []
        };
      }
      groups[name].tasks.push(task);
      if (typeof task.plannedCount === 'number') {
        groups[name].plannedCount += task.plannedCount;
      }
    });
    return Object.values(groups);
  }, [enrichedTasks]);

  const persons = useMemo(() => [...new Set(groupedEmployees.map(e => e.personName))].sort(), [groupedEmployees]);

  const filteredEmployees = useMemo(() => {
    return groupedEmployees.filter((e) => {
      const matchesSearch = e.personName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesPerson = personFilter === "all" || e.personName === personFilter;
      return matchesSearch && matchesPerson;
    });
  }, [groupedEmployees, searchQuery, personFilter]);

  const handleRowClick = async (empGroup) => {
    setActiveDrillDown({
      personName: empGroup.personName,
      title: `Today's Task Details`,
      rows: [],
      loading: true
    });

    try {
      const compiledRows = [];
      const todayDate = new Date().toLocaleDateString('en-GB');

      // Fetch for all tasks assigned to this person
      await Promise.all(empGroup.tasks.map(async (task) => {
        const scriptUrl = String(task.scriptUrl || "").trim();
        if (!scriptUrl) return;

        const plannedP = parseSheetRef(task.plannedSheetRef);
        const actualP = parseSheetRef(task.actualSheetRef);
        const nameP = parseSheetRef(task.nameColRef);
        const taskP = parseSheetRef(task.taskNameColRef);

        const sheets = new Set();
        if (plannedP?.sheetName) sheets.add(plannedP.sheetName);
        if (actualP?.sheetName) sheets.add(actualP.sheetName);
        if (nameP?.sheetName) sheets.add(nameP.sheetName);
        if (taskP?.sheetName) sheets.add(taskP.sheetName);

        const cache = {};
        await Promise.all([...sheets].map(async (name) => {
          const res = await fetch(`${scriptUrl}?sheet=${encodeURIComponent(name)}`);
          const result = await res.json();
          cache[name] = (result.success && Array.isArray(result.data)) ? result.data : [];
        }));

        const formatDate = (val) => {
          if (!val) return "";
          const d = new Date(val);
          return isNaN(d.getTime()) ? String(val) : `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
        };

        const matchingIndices = [];
        if (nameP && nameP.sheetName) {
          const rows = cache[nameP.sheetName] || [];
          rows.slice(nameP.startRowIndex).forEach((r, idx) => {
            if (String(r[nameP.colIndex] || "").trim() === task.personName) matchingIndices.push(idx);
          });
        }

        const getVals = (p) => {
          if (!p || !p.sheetName) return [];
          const rows = (cache[p.sheetName] || []).slice(p.startRowIndex);
          return matchingIndices.map(idx => ({
            val: rows[idx]?.[p.colIndex],
            formatted: formatDate(rows[idx]?.[p.colIndex])
          }));
        };

        const pVals = getVals(plannedP);
        const aVals = getVals(actualP);
        const tVals = getVals(taskP);

        for (let i = 0; i < Math.max(pVals.length, aVals.length, tVals.length); i++) {
          const raw = pVals[i]?.val;
          if (raw && new Date(raw).toLocaleDateString('en-GB') === todayDate) {
            compiledRows.push({
              fmsName: task.fmsName,
              taskName: tVals[i]?.formatted || "",
              planned: pVals[i]?.formatted || "",
              actual: aVals[i]?.formatted || ""
            });
          }
        }
      }));

      setActiveDrillDown(prev => ({ ...prev, rows: compiledRows, loading: false }));
    } catch (error) {
      console.error("Drill down error:", error);
      setActiveDrillDown(prev => ({ ...prev, loading: false, error: error.message }));
    }
  };

  if (loading) {
    return (
      <ERPLayout>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
            <p className="text-gray-600 font-medium">Fetching Today&apos;s Tasks...</p>
          </div>
        </div>
      </ERPLayout>
    );
  }

  return (
    <ERPLayout>
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header & Filters */}
        <div className="bg-white rounded shadow-sm p-4 mb-4 border border-gray-200">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-500 shadow-sm"
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <select
                value={personFilter}
                onChange={(e) => setPersonFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:border-blue-500 bg-white"
              >
                <option value="all">All Persons</option>
                {persons.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200 flex items-center justify-between">
            <div><p className="text-xs font-medium text-gray-500 uppercase">Persons</p><p className="text-xl font-bold text-gray-900 mt-1">{groupedEmployees.length}</p></div>
            <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center"><Filter className="w-5 h-5 text-blue-600" /></div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200 flex items-center justify-between">
            <div><p className="text-xs font-medium text-gray-500 uppercase">FMS Names</p><p className="text-xl font-bold text-gray-900 mt-1">{[...new Set(enrichedTasks.map(t => t.fmsName))].length}</p></div>
            <div className="w-10 h-10 bg-green-50 rounded-full flex items-center justify-center"><Calendar className="w-5 h-5 text-green-600" /></div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200 flex items-center justify-between">
            <div><p className="text-xs font-medium text-gray-500 uppercase">Total Tasks</p><p className="text-xl font-bold text-gray-900 mt-1">{enrichedTasks.length}</p></div>
            <div className="w-10 h-10 bg-purple-50 rounded-full flex items-center justify-center"><Clock className="w-5 h-5 text-purple-600" /></div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase">Total Planned</p>
              <p className="text-xl font-bold text-gray-900 mt-1">
                {fetchingTodayCounts ? "..." : groupedEmployees.reduce((t, e) => t + e.plannedCount, 0)}
              </p>
            </div>
            <div className="w-10 h-10 bg-orange-50 rounded-full flex items-center justify-center"><Search className="w-5 h-5 text-orange-600" /></div>
          </div>
        </div>

        {/* Unique Employee List */}
        <div className="bg-white rounded-[2rem] shadow-xl shadow-gray-100 overflow-hidden border border-gray-100">
          <div className="px-6 py-5 border-b border-gray-50 bg-white flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-5 bg-blue-600 rounded-full" />
              <h2 className="text-xs sm:text-sm font-black text-gray-800 uppercase tracking-widest">Team Performance Today</h2>
            </div>
            {fetchingTodayCounts && (
              <div className="px-3 py-1 bg-blue-50 rounded-full flex items-center gap-2">
                <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
                <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Syncing Data</span>
              </div>
            )}
          </div>

          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50">
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">S.No</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Employee</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Target Designation</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Today's Load</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredEmployees.length > 0 ? filteredEmployees.map((e, idx) => (
                  <tr key={idx} className="hover:bg-blue-50/30 cursor-pointer transition-colors group" onClick={() => handleRowClick(e)}>
                    <td className="px-6 py-4 whitespace-nowrap text-xs font-bold text-gray-400">{idx + 1}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <img src={e.personImage} alt={e.personName} className="w-9 h-9 rounded-xl object-cover border-2 border-white shadow-sm" />
                        <span className="text-sm font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{e.personName}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs font-bold text-gray-500 uppercase tracking-wide">{e.designation}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-black ${e.plannedCount > 0 ? "bg-blue-100 text-blue-700 shadow-sm shadow-blue-50" : "bg-gray-50 text-gray-400"}`}>
                        {e.plannedCount} Tasks
                      </span>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan="4" className="px-6 py-20 text-center">
                    <Filter className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                    <p className="text-sm font-black text-gray-900 uppercase tracking-widest">No Employees Found</p>
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Premium Mobile Card View */}
          <div className="lg:hidden divide-y divide-gray-50">
            {filteredEmployees.length > 0 ? filteredEmployees.map((e, idx) => (
              <div key={idx} className="p-5 hover:bg-blue-50/50 cursor-pointer transition-all active:scale-[0.98] group" onClick={() => handleRowClick(e)}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <img src={e.personImage} alt={e.personName} className="w-14 h-14 rounded-[1.25rem] object-cover border-2 border-white shadow-md" />
                      <div className="absolute -top-2 -left-2 w-6 h-6 bg-white border border-gray-100 rounded-lg flex items-center justify-center text-[10px] font-black text-gray-400 shadow-sm">
                        {idx + 1}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-black text-gray-900 tracking-tight leading-tight group-hover:text-blue-600 transition-colors">{e.personName}</p>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">{e.designation}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-wider mb-1">Today's Load</p>
                    <span className={`inline-flex items-center px-4 py-2 rounded-2xl text-[11px] font-black shadow-sm ${e.plannedCount > 0 ? "bg-blue-600 text-white shadow-blue-100" : "bg-gray-100 text-gray-400"}`}>
                      {e.plannedCount}
                    </span>
                  </div>
                </div>
              </div>
            )) : (
              <div className="p-16 text-center">
                <Filter className="w-12 h-12 text-gray-100 mx-auto mb-4" />
                <p className="text-xs font-black text-gray-400 uppercase tracking-widest">No Employees Matching Criteria</p>
              </div>
            )}
          </div>
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
              className="bg-white rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
            >
              <div className="flex justify-between items-center p-6 sm:p-8 border-b border-gray-50 bg-white">
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
                      <Clock size={24} />
                   </div>
                   <div>
                      <h3 className="text-base sm:text-xl font-black text-gray-900 tracking-tight">{activeDrillDown.title}</h3>
                      <p className="text-xs sm:text-sm font-bold text-blue-600 uppercase tracking-widest mt-1">{activeDrillDown.personName}</p>
                   </div>
                </div>
                <button onClick={() => setActiveDrillDown(null)} className="p-3 hover:bg-gray-100 rounded-2xl transition-all">
                  <X className="w-6 h-6 text-gray-400" />
                </button>
              </div>

              <div className="overflow-y-auto flex-1 bg-white p-4 sm:p-8 custom-scrollbar">
                {activeDrillDown.loading ? (
                  <div className="flex flex-col items-center justify-center py-20">
                    <div className="w-16 h-16 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mb-6" />
                    <p className="text-xs font-black text-blue-900 uppercase tracking-widest animate-pulse">Compiling Live Data...</p>
                  </div>
                ) : activeDrillDown.error ? (
                  <div className="p-10 text-center bg-red-50 rounded-[2rem] border border-red-100">
                    <p className="text-sm font-bold text-red-600 uppercase tracking-widest leading-relaxed">System Sync Failed: {activeDrillDown.error}</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Desktop Table View inside Modal */}
                    <div className="hidden sm:block overflow-x-auto rounded-[2rem] border border-gray-100">
                      <table className="min-w-full divide-y divide-gray-50">
                        <thead className="bg-gray-50/50">
                          <tr>
                            <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">FMS Category</th>
                            <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Sub-Task Description</th>
                            <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Planned</th>
                            <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Actual</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 bg-white">
                          {activeDrillDown.rows.length > 0 ? activeDrillDown.rows.map((row, idx) => (
                            <tr key={idx} className="hover:bg-blue-50/30 transition-colors">
                              <td className="px-6 py-5">
                                <span className="px-2.5 py-1 bg-blue-50 text-blue-700 text-[10px] font-black rounded-lg border border-blue-100 uppercase tracking-wider">{row.fmsName}</span>
                              </td>
                              <td className="px-6 py-5 text-sm font-bold text-gray-800 leading-relaxed">{row.taskName}</td>
                              <td className="px-6 py-5 text-[11px] font-black text-gray-500">{row.planned}</td>
                              <td className="px-6 py-5">
                                {row.actual ? (
                                  <span className="text-[11px] font-black text-emerald-600">{row.actual}</span>
                                ) : (
                                  <span className="px-2 py-1 bg-amber-50 text-amber-600 text-[9px] font-black rounded-md uppercase">Pending</span>
                                )}
                              </td>
                            </tr>
                          )) : (
                            <tr><td colSpan="4" className="px-6 py-16 text-center text-gray-400 text-sm font-bold uppercase tracking-widest">No active tasks logged for today</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Card View inside Modal */}
                    <div className="sm:hidden space-y-4">
                      {activeDrillDown.rows.length > 0 ? activeDrillDown.rows.map((row, idx) => (
                        <div key={idx} className="bg-gray-50/50 rounded-2xl p-4 border border-gray-100/50 space-y-3">
                           <div className="flex justify-between items-start">
                              <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[9px] font-black rounded uppercase tracking-wider">{row.fmsName}</span>
                              {row.actual ? (
                                <span className="text-[10px] font-black text-emerald-600 flex items-center gap-1">
                                  <CheckCircle2 size={10} /> Completed
                                </span>
                              ) : (
                                <span className="text-[10px] font-black text-amber-600 flex items-center gap-1">
                                  <Clock size={10} /> In Queue
                                </span>
                              )}
                           </div>
                           <p className="text-xs font-bold text-gray-900 leading-relaxed">{row.taskName}</p>
                           <div className="flex items-center justify-between pt-2 border-t border-gray-200/50">
                              <div>
                                 <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Planned At</p>
                                 <p className="text-[10px] font-bold text-gray-600">{row.planned}</p>
                              </div>
                              {row.actual && (
                                <div className="text-right">
                                  <p className="text-[8px] font-black text-emerald-400 uppercase tracking-widest">Actual At</p>
                                  <p className="text-[10px] font-bold text-emerald-600">{row.actual}</p>
                                </div>
                              )}
                           </div>
                        </div>
                      )) : (
                        <div className="py-12 text-center text-gray-400 text-xs font-black uppercase tracking-widest">No active tasks logged for today</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <div className="p-6 sm:p-8 border-t border-gray-50 bg-gray-50/50 flex justify-end">
                <button onClick={() => setActiveDrillDown(null)} className="w-full sm:w-auto px-10 py-4 bg-gray-900 text-white rounded-2xl shadow-xl hover:bg-black font-black uppercase text-[11px] tracking-[0.2em] transition-all active:scale-95">Close View</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
    </ERPLayout>
  );
};

export default AdminTodayTasks;
