import React, { useState, useEffect, useMemo } from "react";
import { Search, Loader2, History, ChevronDown } from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import ERPLayout from "../../../components/layout/ERPLayout";

const AdminHistoryCommitment = () => {
    const { user, role } = useAuth();
    const [loading, setLoading] = useState(true);
    const [records, setRecords] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [nameFilter, setNameFilter] = useState("all");
    const [dateFilter, setDateFilter] = useState("all");

    useEffect(() => {
        const fetchRecords = async () => {
            try {
                setLoading(true);
                const scriptUrl = import.meta.env.VITE_APPS_SCRIPT_URL;
                if (!scriptUrl) {
                    console.error("VITE_APPS_SCRIPT_URL not set");
                    setLoading(false);
                    return;
                }

                const response = await fetch(`${scriptUrl}?sheet=Records`);
                const result = await response.json();

                if (result.success && Array.isArray(result.data)) {
                    // Skip header row (index 0), map each row to an object using user-specified column indices
                    const parsed = result.data.slice(1).map((row, idx) => ({
                        id: idx,
                        dateStart: row[0] || "",         // Column A (index 0)
                        dateEnd: row[1] || "",           // Column B (index 1)
                        name: row[2] || "",              // Column C (index 2)
                        target: row[3] || "",            // Column D (index 3)
                        actualWorkDone: row[4] || "",    // Column E (index 4)
                        workNotDone: row[5] || "",       // Column F (index 5)
                        workNotDoneOnTime: row[6] || "", // Column G (index 6)
                        totalWorkDone: row[7] || "",     // Column H (index 7)
                        weekPending: row[8] || "",       // Column I (index 8)
                        allPendingTillDate: row[9] || "", // Column J (index 9)
                        lastWeekPlannedNotDone: row[10] || "", // Column K (index 10)
                        lastWeekPlannedNotDoneOnTime: row[11] || "", // Column L (index 11)
                        lastWeekCommitment: row[12] || "", // Column M (index 12)
                        linkWithName: row[13] || "", // Column N (index 13)
                        nextWeekPlannedNotDone: row[14] || "", // Column O (index 14)
                        nextWeekPlannedNotDoneOnTime: row[15] || "", // Column P (index 15)
                        nextWeekCommitment: row[16] || "" // Column Q (index 16)
                    })).filter(r => r.name.trim() !== "");

                    // Filter based on role
                    const finalRecords = role === 'admin'
                        ? parsed
                        : parsed.filter(r => r.name.toLowerCase() === (user || "").toLowerCase());

                    setRecords(finalRecords);
                }
            } catch (error) {
                console.error("Error fetching Records sheet:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchRecords();
    }, []);

    const uniqueNames = useMemo(() => {
        return [...new Set(records.map(r => r.name))].sort();
    }, [records]);

    const uniqueDates = useMemo(() => {
        return [...new Set(records.map(r => r.dateStart))].filter(Boolean).sort((a, b) => new Date(b) - new Date(a));
    }, [records]);

    const filteredRecords = useMemo(() => {
        return records.filter(r => {
            const matchesSearch =
                r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                r.dateStart.toLowerCase().includes(searchQuery.toLowerCase()) ||
                r.dateEnd.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesName = nameFilter === "all" || r.name === nameFilter;
            const matchesDate = dateFilter === "all" || r.dateStart === dateFilter;
            return matchesSearch && matchesName && matchesDate;
        });
    }, [records, searchQuery, nameFilter, dateFilter]);

    const formatValue = (val) => {
        if (val === "" || val === null || val === undefined) return "-";
        return String(val);
    };

    if (loading) {
        return (
            <ERPLayout>
                <div className="min-h-screen flex items-center justify-center bg-gray-50">
                    <div className="flex flex-col items-center gap-4">
                        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
                        <p className="text-gray-600 font-medium">Loading History...</p>
                    </div>
                </div>
            </ERPLayout>
        );
    }

    return (
        <ERPLayout>
        <div className="min-h-screen bg-gray-50 p-4 md:p-6 lg:p-8">
            <div className="max-w-full mx-auto">
                {/* Page Header */}
                <div className="mb-5 flex items-center gap-3">
                    <History className="w-6 h-6 text-blue-600" />
                    <h1 className="text-xl font-bold text-gray-900">History</h1>
                    <span className="ml-auto text-sm text-gray-500 bg-white border border-gray-200 rounded px-3 py-1 shadow-sm">
                        {filteredRecords.length} of {records.length} records
                    </span>
                </div>

                {/* Filters */}
                {/* Filters Section */}
                <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 mb-6 shadow-sm">
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-1 relative group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 group-focus-within:text-blue-600 transition-colors" />
                            <input
                                type="text"
                                placeholder="Search by name or date..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border-none rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500 transition-all"
                            />
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3">
                            <div className="relative">
                                <select
                                    value={dateFilter}
                                    onChange={(e) => setDateFilter(e.target.value)}
                                    className="w-full sm:w-44 pl-4 pr-10 py-2.5 bg-gray-50 border-none rounded-xl text-xs font-bold appearance-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
                                >
                                    <option value="all">All Dates</option>
                                    {uniqueDates.map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
                            </div>
                            <div className="relative">
                                <select
                                    value={nameFilter}
                                    onChange={(e) => setNameFilter(e.target.value)}
                                    className="w-full sm:w-44 pl-4 pr-10 py-2.5 bg-gray-50 border-none rounded-xl text-xs font-bold appearance-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
                                >
                                    <option value="all">All Names</option>
                                    {uniqueNames.map(n => <option key={n} value={n}>{n}</option>)}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm flex flex-col justify-between">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Total Records</p>
                        <p className="text-2xl font-black text-gray-900 leading-none">{records.length}</p>
                    </div>
                    <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm flex flex-col justify-between">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Unique Persons</p>
                        <p className="text-2xl font-black text-gray-900 leading-none">{uniqueNames.length}</p>
                    </div>
                </div>

                {/* Table / Card View */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                        <h2 className="text-base font-bold text-gray-800">Records</h2>
                    </div>

                    {/* Desktop Table View */}
                    <div className="hidden lg:block overflow-auto max-h-[calc(100vh-320px)] relative">
                        <table className="w-full text-sm border-separate border-spacing-0">
                            <thead className="bg-gray-50 sticky top-0 z-30 shadow-sm">
                                <tr>
                                    <th className="w-12 px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap sticky left-0 top-0 bg-gray-50 z-40 border-b border-gray-200">S.No</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap bg-gray-50 border-b border-gray-200">Date Start</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap bg-gray-50 border-b border-gray-200">Date End</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap sticky left-12 top-0 bg-gray-50 z-40 border-l border-b border-gray-200">Name</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap border-b border-gray-200">Target</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap border-b border-gray-200">Actual Work Done</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap border-b border-gray-200">% Work Not Done</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap border-b border-gray-200">% Not Done On Time</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap border-b border-gray-200">Total Work Done</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap border-b border-gray-200">Week Pending</th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap border-b border-gray-200">All Pending Till Date</th>
                                    <th className="px-4 py-3 text-right text-xs font-bold bg-red-100 text-red-700 uppercase tracking-wider whitespace-nowrap border-b border-gray-200">LW Planned % Not Done</th>
                                    <th className="px-4 py-3 text-right text-xs font-bold bg-red-100 text-red-700 uppercase tracking-wider whitespace-nowrap border-b border-gray-200">LW % Not Done On Time</th>
                                    <th className="px-4 py-3 text-right text-xs font-bold bg-red-100 text-red-700 uppercase tracking-wider whitespace-nowrap border-b border-gray-200">LW Commitment</th>
                                    <th className="px-4 py-3 text-right text-xs font-bold bg-green-100 text-green-700 uppercase tracking-wider whitespace-nowrap border-b border-gray-200">NW Planned % Not Done</th>
                                    <th className="px-4 py-3 text-right text-xs font-bold bg-green-100 text-green-700 uppercase tracking-wider whitespace-nowrap border-b border-gray-200">NW % Not Done On Time</th>
                                    <th className="px-4 py-3 text-right text-xs font-bold bg-green-100 text-green-700 uppercase tracking-wider whitespace-nowrap border-b border-gray-200">NW Commitment</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-100">
                                {filteredRecords.length > 0 ? (
                                    filteredRecords.map((r, idx) => (
                                        <tr key={r.id} className="hover:bg-blue-50/40 transition-colors">
                                            <td className="px-4 py-3 text-gray-500 font-medium text-center sticky left-0 bg-white z-10">{idx + 1}</td>
                                            <td className="px-4 py-3 text-gray-700 whitespace-nowrap bg-white">{formatValue(r.dateStart)}</td>
                                            <td className="px-4 py-3 text-gray-700 whitespace-nowrap bg-white">{formatValue(r.dateEnd)}</td>
                                            <td className="px-4 py-3 font-semibold text-gray-900 whitespace-nowrap sticky left-12 bg-white z-10 border-l border-gray-200">{formatValue(r.name)}</td>
                                            <td className="px-4 py-3 text-right text-gray-700">{formatValue(r.target)}</td>
                                            <td className="px-4 py-3 text-right">
                                                <span className="inline-flex items-center justify-center px-2 py-0.5 rounded text-xs font-semibold bg-green-100 text-green-800 min-w-[3rem]">
                                                    {formatValue(r.actualWorkDone)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded text-xs font-semibold min-w-[3rem] ${parseFloat(r.workNotDone) > 30
                                                    ? "bg-red-100 text-red-800"
                                                    : parseFloat(r.workNotDone) > 10
                                                        ? "bg-yellow-100 text-yellow-800"
                                                        : "bg-green-100 text-green-800"
                                                    }`}>
                                                    {formatValue(r.workNotDone)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded text-xs font-semibold min-w-[3rem] ${parseFloat(r.workNotDoneOnTime) > 30
                                                    ? "bg-red-100 text-red-800"
                                                    : parseFloat(r.workNotDoneOnTime) > 10
                                                        ? "bg-yellow-100 text-yellow-800"
                                                        : "bg-green-100 text-green-800"
                                                    }`}>
                                                    {formatValue(r.workNotDoneOnTime)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <span className="inline-flex items-center justify-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-800 min-w-[3rem]">
                                                    {formatValue(r.totalWorkDone)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded text-xs font-semibold min-w-[3rem] ${parseFloat(r.weekPending) > 5
                                                    ? "bg-red-100 text-red-800"
                                                    : parseFloat(r.weekPending) > 0
                                                        ? "bg-yellow-100 text-yellow-800"
                                                        : "bg-green-100 text-green-800"
                                                    }`}>
                                                    {formatValue(r.weekPending)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded text-xs font-semibold min-w-[3rem] ${parseFloat(r.allPendingTillDate) > 10
                                                    ? "bg-red-100 text-red-800"
                                                    : parseFloat(r.allPendingTillDate) > 3
                                                        ? "bg-yellow-100 text-yellow-800"
                                                        : "bg-green-100 text-green-800"
                                                    }`}>
                                                    {formatValue(r.allPendingTillDate)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right bg-red-50/30">
                                                <span className="text-red-700 font-medium">{formatValue(r.lastWeekPlannedNotDone)}</span>
                                            </td>
                                            <td className="px-4 py-3 text-right bg-red-50/30">
                                                <span className="text-red-700 font-medium">{formatValue(r.lastWeekPlannedNotDoneOnTime)}</span>
                                            </td>
                                            <td className="px-4 py-3 text-right bg-red-50/30">
                                                <span className="text-red-700 font-bold">{formatValue(r.lastWeekCommitment)}</span>
                                            </td>
                                            <td className="px-4 py-3 text-right bg-green-50/30">
                                                <span className="text-green-700 font-medium">{formatValue(r.nextWeekPlannedNotDone)}</span>
                                            </td>
                                            <td className="px-4 py-3 text-right bg-green-50/30">
                                                <span className="text-green-700 font-medium">{formatValue(r.nextWeekPlannedNotDoneOnTime)}</span>
                                            </td>
                                            <td className="px-4 py-3 text-right bg-green-50/30">
                                                <span className="text-green-700 font-bold">{formatValue(r.nextWeekCommitment)}</span>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="17" className="px-6 py-12 text-center text-gray-400">
                                            No records found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile Card View */}
                    <div className="lg:hidden divide-y divide-gray-100">
                        {filteredRecords.length > 0 ? (
                            filteredRecords.map((r, idx) => (
                                <div key={r.id} className="p-4 hover:bg-gray-50 transition-colors space-y-4">
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs font-black text-gray-400">#{idx + 1}</span>
                                            <p className="text-sm font-bold text-gray-900">{formatValue(r.name)}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] font-black text-gray-400 uppercase">Period</p>
                                            <p className="text-[10px] font-bold text-gray-600">{formatValue(r.dateStart)} - {formatValue(r.dateEnd)}</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-3 gap-2 text-center">
                                        <div className="bg-gray-50 p-2 rounded-lg">
                                            <p className="text-[8px] font-black text-gray-400 uppercase mb-1">Target</p>
                                            <p className="text-xs font-bold text-gray-900">{formatValue(r.target)}</p>
                                        </div>
                                        <div className="bg-green-50 p-2 rounded-lg">
                                            <p className="text-[8px] font-black text-green-600 uppercase mb-1">Achievement</p>
                                            <p className="text-xs font-bold text-green-700">{formatValue(r.actualWorkDone)}</p>
                                        </div>
                                        <div className="bg-blue-50 p-2 rounded-lg">
                                            <p className="text-[8px] font-black text-blue-600 uppercase mb-1">Total</p>
                                            <p className="text-xs font-bold text-blue-700">{formatValue(r.totalWorkDone)}</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <div className="flex justify-between items-center text-[10px]">
                                                <span className="font-bold text-gray-500 uppercase">Work Not Done</span>
                                                <span className={`font-black ${parseFloat(r.workNotDone) > 30 ? 'text-red-600' : 'text-emerald-600'}`}>{formatValue(r.workNotDone)}%</span>
                                            </div>
                                            <div className="flex justify-between items-center text-[10px]">
                                                <span className="font-bold text-gray-500 uppercase">Not Done On Time</span>
                                                <span className={`font-black ${parseFloat(r.workNotDoneOnTime) > 30 ? 'text-red-600' : 'text-emerald-600'}`}>{formatValue(r.workNotDoneOnTime)}%</span>
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <div className="flex justify-between items-center text-[10px]">
                                                <span className="font-bold text-gray-500 uppercase">Week Pending</span>
                                                <span className={`font-black ${parseFloat(r.weekPending) > 5 ? 'text-red-600' : 'text-emerald-600'}`}>{formatValue(r.weekPending)}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-[10px]">
                                                <span className="font-bold text-gray-500 uppercase">All Pending</span>
                                                <span className={`font-black ${parseFloat(r.allPendingTillDate) > 10 ? 'text-red-600' : 'text-emerald-600'}`}>{formatValue(r.allPendingTillDate)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-3 bg-red-50/50 rounded-xl border border-red-100">
                                        <p className="text-[9px] font-black text-red-600 uppercase mb-2 tracking-widest">Last Week Commitment</p>
                                        <p className="text-xs font-bold text-red-700 italic">"{formatValue(r.lastWeekCommitment)}"</p>
                                    </div>

                                    <div className="p-3 bg-green-50/50 rounded-xl border border-green-100">
                                        <p className="text-[9px] font-black text-green-600 uppercase mb-2 tracking-widest">Next Week Commitment</p>
                                        <p className="text-xs font-bold text-green-700 italic">"{formatValue(r.nextWeekCommitment)}"</p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="p-10 text-center text-gray-400 text-sm">No records found.</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
        </ERPLayout>
    );
};

export default AdminHistoryCommitment;
