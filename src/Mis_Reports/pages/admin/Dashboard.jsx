// ============ DASHBOARD PAGE (RESTORED & FIXED) ============
import React, { useState, useEffect, useMemo } from "react";
import { 
  Search, ChevronDown, Download, Filter, Loader2, CheckCircle2, BarChart3
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getDisplayableImageUrl } from '../../utils/imageUtils';
import HalfCircleChart from "../../components/charts/HalfCircleChart";
import VerticalBarChart from "../../components/charts/VerticalBarChart";
import DepartmentScoreChart from "../../components/charts/DepartmentScoreChart";
import { useAuth } from "../../../context/AuthContext";
import { useMagicToast } from "../../../context/MagicToastContext";
import ERPLayout from "../../../components/layout/ERPLayout";
import UserDetailsModal from "./components/UserDetailsModal";
import aceLogo from "../../../assets/Ace_Logoo.jpg";

const getCurrentWeek = () => {
  const today = new Date();
  const startOfWeek = new Date(today);
  const day = today.getDay() || 7; 
  startOfWeek.setDate(today.getDate() - day + 1); 

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 5);

  return {
    start: startOfWeek.toISOString().split("T")[0],
    end: endOfWeek.toISOString().split("T")[0],
  };
};

const AdminDashboard = () => {
  const { user, role } = useAuth();
  const { showToast } = useMagicToast();
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dateRange, setDateRange] = useState(getCurrentWeek());
  const [loading, setLoading] = useState(true);
  const [sheetEmployees, setSheetEmployees] = useState([]);
  const [departmentScores, setDepartmentScores] = useState([]);
  const [dataSheetRows, setDataSheetRows] = useState([]);
  const [showColumnFilter, setShowColumnFilter] = useState(false);
  const [filterName, setFilterName] = useState("");
  const [filterDepartment, setFilterDepartment] = useState("all");
  const [selectedUserDetails, setSelectedUserDetails] = useState(null);
  const [activeDrillDown, setActiveDrillDown] = useState(null);
  const [drillDownLoading, setDrillDownLoading] = useState(false);
  
  // New State for Data Editing & Archiving
  const [editableData, setEditableData] = useState({});
  const [archivedMap, setArchivedMap] = useState({});

  const [columnLabels, setColumnLabels] = useState({
    name: "Name",
    designation: "Designation",
    target: "Target",
    actualWork: "Actual Work",
    weeklyDone: "Weekly Done %",
    weeklyOnTime: "Weekly On Time %",
    totalWork: "Total Work",
    weekPending: "Week Pending",
    allPending: "All Pending"
  });

  const ALL_COLUMNS = [
    { key: "name", label: "Name" },
    { key: "designation", label: "Designation" },
    { key: "target", label: "Target" },
    { key: "actualWork", label: "Actual Work" },
    { key: "weeklyDone", label: "Weekly Done %" },
    { key: "weeklyOnTime", label: "Weekly On Time %" },
    { key: "totalWork", label: "Total Work" },
    { key: "weekPending", label: "Week Pending" },
    { key: "allPending", label: "All Pending" },
    { key: "lastWeekPlannedNotDone", label: "Last Week Planned Work Not Done %" },
    { key: "lastWeekPlannedNotDoneOnTime", label: "Last Week Planned Work Not Done On Time %" },
    { key: "lastWeekCommitment", label: "Last Week Commitment" },
    { key: "nextWeekPlannedNotDone", label: "Next Week Planned Work Not Done %" },
    { key: "nextWeekPlannedNotDoneOnTime", label: "Next Week Planned Work Not Done On Time %" },
    { key: "nextWeekCommitment", label: "Next Week Commitment" },
  ];

  const [visibleColumns, setVisibleColumns] = useState(() => {
    const initial = {};
    ALL_COLUMNS.forEach(col => initial[col.key] = true);
    return initial;
  });

  // Fetch Data logic
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const scriptUrl = import.meta.env.VITE_APPS_SCRIPT_URL;
        if (!scriptUrl) {
          setLoading(false);
          return;
        }

        const [recordsResponse, archivedResponse, masterResponse, dataResponse, deptScoreResponse] = await Promise.all([
          fetch(`${scriptUrl}?sheet=For Records`),
          fetch(`${scriptUrl}?sheet=Archived`),
          fetch(`${scriptUrl}?sheet=Master`),
          fetch(`${scriptUrl}?sheet=Data`),
          fetch(`${scriptUrl}?sheet=Department Score Graph`)
        ]);

        const result = await recordsResponse.json();
        const archivedResult = await archivedResponse.json();
        const masterResult = await masterResponse.json();
        const dataResult = await dataResponse.json();
        const deptScoreResult = await deptScoreResponse.json();

        if (dataResult.success && Array.isArray(dataResult.data)) {
          setDataSheetRows(dataResult.data.slice(1));
        }

        // Process Archived Map
        const newArchivedMap = {};
        const currentWeek = getCurrentWeek();
        if (archivedResult.success && Array.isArray(archivedResult.data)) {
          archivedResult.data.slice(1).forEach((row, idx) => {
            const name = row[0];
            const rowStart = row[1];
            if (!name) return;

            const normalizeDate = (d) => {
              if (!d) return "";
              const dateObj = new Date(d);
              return isNaN(dateObj) ? d : dateObj.toISOString().split("T")[0];
            };

            const normRowStart = normalizeDate(rowStart);
            if (normRowStart >= currentWeek.start && normRowStart <= currentWeek.end) {
              newArchivedMap[name] = {
                rowIndex: idx + 2,
                values: {
                  nextWeekPlannedNotDone: row[3]?.toString() || "",
                  nextWeekPlannedNotDoneOnTime: row[4]?.toString() || "",
                  nextWeekCommitment: row[5]?.toString() || ""
                }
              };
            }
          });
        }
        setArchivedMap(newArchivedMap);

        if (deptScoreResult.success && Array.isArray(deptScoreResult.data)) {
          const parsedDeptScores = deptScoreResult.data.slice(1)
            .filter(row => row[0])
            .map(row => ({
              name: row[0],
              workNotDonePct: Math.abs(parseFloat(row[1]) || 0),
              notDoneOnTimePct: Math.abs(parseFloat(row[2]) || 0),
              pendingWorks: parseInt(row[3]) || 0
            }));
          setDepartmentScores(parsedDeptScores);
        }

        const imageMap = {};
        const designationMap = {};
        if (masterResult.success && Array.isArray(masterResult.data)) {
          masterResult.data.slice(1).forEach(row => {
            const name = row[0] ? String(row[0]).trim().toLowerCase() : "";
            const designation = row[3] ? String(row[3]).trim() : "";
            const imageUrl = row[4];
            if (name) {
              if (imageUrl) imageMap[name] = imageUrl;
              if (designation) designationMap[name] = designation;
            }
          });
        }

        if (result.success && Array.isArray(result.data) && dataResult.success && Array.isArray(dataResult.data)) {
          const currentDataRows = dataResult.data.slice(1);
          
          const parsedData = result.data.slice(2)
            .filter(row => row[2] && String(row[2]).trim() !== "")
            .map((row, index) => {
              const empName = row[2] || "Unknown";
              const normalizedName = String(empName).trim().toLowerCase();
              const rawImageUrl = imageMap[normalizedName];
              let finalImageUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(empName)}&background=0D8ABC&color=fff&size=128`;

              if (rawImageUrl) {
                const processedUrl = getDisplayableImageUrl(rawImageUrl);
                if (processedUrl) finalImageUrl = processedUrl;
              }

              const target = parseFloat(row[3]) || 0;
              const weeklyDonePct = target > 0 ? (100 - Math.abs(parseFloat(String(row[5] || "0").replace("%", "")))) : 0;
              const weeklyOnTimePct = target > 0 ? (100 - Math.abs(parseFloat(String(row[6] || "0").replace("%", "")))) : 0;

              return {
                id: `emp-${100 + index}`,
                name: empName,
                startDate: row[10] || "",
                endDate: row[11] || "",
                designation: designationMap[normalizedName] || "N/A",
                image: finalImageUrl,
                target: row[3] || 0,
                actualWorkDone: row[4] || 0,
                weeklyWorkDone: `${Math.round(weeklyDonePct)}%`,
                weeklyWorkDoneOnTime: `${Math.round(weeklyOnTimePct)}%`,
                totalWorkDone: row[7] || 0,
                weekPending: row[8] || 0,
                allPendingTillDate: row[9] || 0,
                plannedWorkNotDone: row[12] || 0,
                plannedWorkNotDoneOnTime: row[13] || 0,
                commitment: row[14] || 0,
                nextWeekPlannedWorkNotDone: row[16] || 0,
                nextWeekPlannedWorkNotDoneOnTime: row[17] || 0,
                nextWeekCommitment: row[18] || 0
              };
            });

          setSheetEmployees(parsedData);

          // Dynamically synchronize the dashboard's dateRange with the actual reporting week from the For Records sheet
          if (result.data.length > 2) {
            const firstRow = result.data[2];
            const sheetStart = firstRow[0];
            const sheetEnd = firstRow[1];
            if (sheetStart && sheetEnd) {
              const parseSheetDateToIso = (dateStr) => {
                if (!dateStr) return "";
                const d = new Date(dateStr);
                if (isNaN(d.getTime())) return "";
                const yyyy = d.getFullYear();
                const mm = String(d.getMonth() + 1).padStart(2, "0");
                const dd = String(d.getDate()).padStart(2, "0");
                return `${yyyy}-${mm}-${dd}`;
              };
              const startIso = parseSheetDateToIso(sheetStart);
              const endIso = parseSheetDateToIso(sheetEnd);
              if (startIso && endIso) {
                console.log("Synchronizing dateRange from sheet:", startIso, "to", endIso);
                setDateRange({ start: startIso, end: endIso });
              }
            }
          }
        }
      } catch (error) {
        console.error("Error fetching sheet data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredEmployees = useMemo(() => {
    return sheetEmployees.filter((emp) => {
      const matchesName = emp.name.toLowerCase().includes(filterName.toLowerCase());
      const matchesDesignation = filterDepartment === "all" || emp.designation === filterDepartment;
      return matchesName && matchesDesignation;
    });
  }, [sheetEmployees, filterName, filterDepartment]);

  const handleDownload = () => {
    if (sheetEmployees.length === 0) return;
    
    const img = new Image();
    img.src = aceLogo;

    const generatePdf = () => {
      const doc = new jsPDF('l', 'mm', 'a4'); // Switched to Landscape
      const pageWidth = doc.internal.pageSize.getWidth();
      const dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });

      // 1. Sleek Royal Blue Corporate Branding Header
      doc.setFillColor(30, 64, 175); // Premium Royal Blue (#1E40AF)
      doc.rect(0, 0, pageWidth, 20, 'F'); // Compact slim header for single page fit
      
      // Premium Logo
      try {
        doc.addImage(img, 'JPEG', 12, 4, 12, 12);
      } catch (e) {
        // Fallback Logo Placeholder
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(12, 4, 12, 12, 2.5, 2.5, 'F');
        doc.setTextColor(30, 64, 175);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('ACE', 18, 11.5, { align: 'center' });
      }

      // Header Content
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(15);
      doc.text('MIS ANALYTICS REPORT OF PAREKH GALLERIUM', pageWidth - 12, 10, { align: 'right' });
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(`DATE: ${dateStr.toUpperCase()}`, pageWidth - 12, 15, { align: 'right' });

      // 2. Summary Grids
      let startY = 26; // Tighter margin
      const colWidth = (pageWidth - 35) / 3;

      const summarySections = [
        { title: 'TOP PERFORMERS', data: topBestPerformers, color: [5, 150, 105], icon: '★' },
        { title: 'PENDING TASKS', data: sortedPendingList, color: [220, 38, 38], icon: '⚠' },
        { title: 'LOW PERFORMERS', data: topWorstPerformers, color: [30, 64, 175], icon: '▼' }
      ];

      summarySections.forEach((sec, idx) => {
        const xPos = 12 + (idx * (colWidth + 5));
        
        doc.setFillColor(...sec.color);
        doc.roundedRect(xPos, startY, colWidth, 5, 1.5, 1.5, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text(`${sec.icon} ${sec.title}`, xPos + colWidth / 2, startY + 3.5, { align: 'center' });

        const rows = sec.data.map(emp => [
          emp.name, 
          sec.title.includes('PENDING') ? `${emp.pending}` : (emp.weeklyWorkDone || '0%')
        ]);

        autoTable(doc, {
          startY: startY + 5,
          margin: { left: xPos, bottom: 8 },
          tableWidth: colWidth,
          body: rows,
          theme: 'striped',
          styles: { 
            fontSize: 7.5, 
            cellPadding: 2, 
            lineColor: [241, 245, 249], 
            lineWidth: 0.1,
            valign: 'middle'
          },
          columnStyles: { 0: { cellWidth: 'auto' }, 1: { halign: 'right', fontStyle: 'bold' } },
          headStyles: { fillColor: [240, 240, 240] },
          pageBreak: 'avoid'
        });
      });

      // 3. Departmental Analysis
      startY = doc.lastAutoTable.finalY + 5;
      doc.setFillColor(30, 64, 175); // Royal Blue indicator
      doc.rect(12, startY, 2, 4, 'F');
      doc.setTextColor(30, 64, 175);
      doc.setFontSize(9.5);
      doc.setFont('helvetica', 'bold');
      doc.text('DEPARTMENTAL SCORECARD', 18, startY + 3.2);

      autoTable(doc, {
        startY: startY + 5,
        margin: { bottom: 8, left: 12, right: 12 },
        head: [['DEPARTMENT NAME', 'PENDING WORKS', 'NOT DONE %', 'DELAYED %']],
        body: departmentScores.map(d => [d.name, d.pendingWorks, `${d.workNotDonePct}%`, `${d.notDoneOnTimePct}%`]),
        theme: 'grid',
        styles: { 
          fontSize: 8.5, 
          cellPadding: 2.8, 
          lineColor: [226, 232, 240], 
          lineWidth: 0.15,
          valign: 'middle'
        },
        headStyles: { 
          fillColor: [30, 64, 175], // Royal Blue Header
          textColor: 255, 
          fontStyle: 'bold', 
          fontSize: 8.5,
          halign: 'center',
          valign: 'middle'
        },
        columnStyles: { 
          0: { halign: 'left', fontStyle: 'bold' }, 
          1: { halign: 'center' }, 
          2: { halign: 'center' }, 
          3: { halign: 'center' } 
        },
        pageBreak: 'avoid'
      });

      // 4. Employee Detailed Master List
      startY = doc.lastAutoTable.finalY + 5;
      doc.setFillColor(30, 64, 175); // Royal Blue indicator
      doc.rect(12, startY, 2, 4, 'F');
      doc.setTextColor(30, 64, 175);
      doc.text('DETAILED EMPLOYEE PERFORMANCE LIST', 18, startY + 3.2);

      const tableCols = ALL_COLUMNS.filter(c => visibleColumns[c.key]);
      const bodyData = filteredEmployees.map(emp => tableCols.map(col => {
        switch (col.key) {
          case "actualWork": return emp.actualWorkDone;
          case "weeklyDone": return emp.weeklyWorkDone;
          case "weeklyOnTime": return emp.weeklyWorkDoneOnTime;
          case "totalWork": return emp.totalWorkDone;
          case "allPending": return emp.allPendingTillDate;
          case "lastWeekPlannedNotDone": return emp.plannedWorkNotDone;
          case "lastWeekPlannedNotDoneOnTime": return emp.plannedWorkNotDoneOnTime;
          case "lastWeekCommitment": return emp.commitment;
          case "nextWeekPlannedNotDone": return emp.nextWeekPlannedWorkNotDone;
          case "nextWeekPlannedNotDoneOnTime": return emp.nextWeekPlannedWorkNotDoneOnTime;
          default: return emp[col.key];
        }
      }));

      autoTable(doc, {
        startY: startY + 5,
        margin: { bottom: 10, left: 12, right: 12 },
        head: [tableCols.map(c => {
          switch (c.key) {
            case "weeklyDone": return "Wk. Done %";
            case "weeklyOnTime": return "Wk. On Time %";
            case "lastWeekPlannedNotDone": return "L.W. Not Done %";
            case "lastWeekPlannedNotDoneOnTime": return "L.W. Delayed %";
            case "lastWeekCommitment": return "L.W. Commit";
            case "nextWeekPlannedNotDone": return "N.W. Not Done %";
            case "nextWeekPlannedNotDoneOnTime": return "N.W. Delayed %";
            case "nextWeekCommitment": return "N.W. Commit";
            default: return c.label;
          }
        })],
        body: bodyData,
        theme: 'grid',
        styles: { 
          fontSize: 7.5, 
          cellPadding: 2.6, 
          overflow: 'linebreak', 
          halign: 'center',
          valign: 'middle',
          lineColor: [226, 232, 240], 
          lineWidth: 0.15
        },
        headStyles: { 
          fillColor: [30, 64, 175], // Royal Blue Header
          textColor: 255, 
          fontSize: 7.5, 
          fontStyle: 'bold', 
          halign: 'center',
          valign: 'middle'
        },
        columnStyles: {
          0: { fontStyle: 'bold', halign: 'left' }, // Name
          1: { halign: 'left' }, // Designation
        },
        didParseCell: (data) => {
          if (data.section === 'body' && data.column.index > 1) data.cell.styles.halign = 'center';
        },
        pageBreak: 'avoid'
      });

      // 5. Page Numbers & Confidentiality
      const pages = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`CONFIDENTIAL | MIS ANALYTICS | PAGE ${i} OF ${pages}`, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
      }

      doc.save(`MIS_Full_Report_${new Date().toISOString().split('T')[0]}.pdf`);
      showToast("Professional PDF Report generated", "success");
    };

    if (img.complete) {
      generatePdf();
    } else {
      img.onload = generatePdf;
      img.onerror = generatePdf;
    }
  };

  const handleRowClick = async (employee) => {
    console.log("Selected Employee", employee);
    const personName = String(employee.name).trim().toLowerCase();
    const matchingRows = dataSheetRows.filter(row => {
      const dataName = row[4] ? String(row[4]).trim().toLowerCase() : "";
      return dataName === personName;
    });

    const tasks = matchingRows.map(row => {
      let scriptUrl = String(row[25] || "").trim();
      if (!scriptUrl && row[5]) {
        // Find another row with the same sheetId that has a scriptUrl
        const siblingRow = dataSheetRows.find(r => r[5] === row[5] && String(r[25] || "").trim());
        if (siblingRow) {
          scriptUrl = String(siblingRow[25]).trim();
        }
      }
      return {
        fmsName: row[2] || "",
        taskName: row[3] || "",
        nameColRef: row[9] || "",
        taskNameColRef: row[26] || "",
        department: row[0] || "",
        sheetId: row[5] || "",
        scriptUrl: scriptUrl,
        plannedSheetRef: row[7] || "",
        actualSheetRef: row[8] || "",
        target: row[10] || 0,
        totalAchievement: row[11] || 0,
        workNotDone: row[12] || 0,
        workNotDoneOnTime: row[13] || 0,
        allPendingTillDate: row[14] || 0,
        delayColRef: row[27] || ""
      };
    });

    // Open modal immediately with current data and a loading state for totals
    setSelectedUserDetails({ ...employee, tasks, loadingTasks: true });

    // Fetch and calculate live totals
    try {
      const defaultScriptUrl = import.meta.env.VITE_APPS_SCRIPT_URL;
      if (!defaultScriptUrl) return;

      // Group fetches by their specific script URLs to handle multiple FMS sources
      const fetchQueue = []; 
      tasks.forEach(t => {
        const taskUrl = String(t.scriptUrl || "").trim() || defaultScriptUrl;
        [t.plannedSheetRef, t.actualSheetRef, t.nameColRef, t.taskNameColRef, t.delayColRef].forEach(ref => {
          const parsed = parseSheetRef(ref);
          if (parsed?.sheetName) {
            fetchQueue.push({ url: taskUrl, sheet: parsed.sheetName });
          }
        });
      });

      // Filter unique scriptUrl + sheetName combinations
      const uniqueFetches = [];
      const seen = new Set();
      fetchQueue.forEach(f => {
        const key = `${f.url}|${f.sheet}`;
        if (!seen.has(key)) {
          seen.add(key);
          uniqueFetches.push(f);
        }
      });

      // Fetch all required data in parallel
      const cache = {}; // Key format: "url|sheet"
      await Promise.all(uniqueFetches.map(async ({ url, sheet }) => {
        try {
          const res = await fetch(`${url}?sheet=${encodeURIComponent(sheet)}`);
          const result = await res.json();
          cache[`${url}|${sheet}`] = (result.success && Array.isArray(result.data)) ? result.data : [];
        } catch (err) {
          console.error(`Failed to fetch ${sheet} from ${url}:`, err);
          cache[`${url}|${sheet}`] = [];
        }
      }));

      // Recalculate all totals for each task
      const currentWeekStart = new Date(dateRange.start);
      const currentWeekEnd = new Date(dateRange.end);
      currentWeekEnd.setHours(23, 59, 59, 999);

      const parseSheetDate = (dateStr) => {
        if (!dateStr || String(dateStr).trim() === "---" || String(dateStr).trim() === "") return null;
        const str = String(dateStr).trim().split(" ")[0];
        const parts = str.split("/");
        if (parts.length === 3) {
          return new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
        }
        const d = new Date(str);
        return isNaN(d.getTime()) ? null : d;
      };

      const updatedTasks = tasks.map(task => {
        const taskUrl = String(task.scriptUrl || "").trim() || defaultScriptUrl;
        const nameParsed = parseSheetRef(task.nameColRef);
        const actualParsed = parseSheetRef(task.actualSheetRef);
        const delayParsed = parseSheetRef(task.delayColRef);
        const plannedParsed = parseSheetRef(task.plannedSheetRef);

        if (!nameParsed || !nameParsed.sheetName || nameParsed.colIndex < 0) return task;

        const nameSheetRows = cache[`${taskUrl}|${nameParsed.sheetName}`] || [];
        const nameRowsFromStart = nameParsed.startRowIndex > 0 ? nameSheetRows.slice(nameParsed.startRowIndex) : nameSheetRows;
        
        const matchingIndices = [];
        nameRowsFromStart.forEach((row, idx) => {
          const cellValue = String(row[nameParsed.colIndex] || "").trim();
          if (cellValue.toLowerCase() === personName) {
            matchingIndices.push(idx);
          }
        });

        const taskDetails = matchingIndices.map(relIdx => {
          const absIdx = nameParsed.startRowIndex + relIdx;
          const actualSheet = actualParsed ? cache[`${taskUrl}|${actualParsed.sheetName}`] : null;
          const delaySheet = delayParsed ? cache[`${taskUrl}|${delayParsed.sheetName}`] : null;
          const plannedSheet = plannedParsed ? cache[`${taskUrl}|${plannedParsed.sheetName}`] : null;
          
          return {
            actual: actualSheet ? (actualSheet[absIdx] || [])[actualParsed.colIndex] : "",
            delay: delaySheet ? (delaySheet[absIdx] || [])[delayParsed.colIndex] : "",
            planned: plannedSheet ? (plannedSheet[absIdx] || [])[plannedParsed.colIndex] : ""
          };
        });

        let target = 0;
        let totalAchievement = 0;
        let pendingCount = 0;
        let delayCount = 0;
        let allPendingTillDate = 0;

        taskDetails.forEach(d => {
          const plannedDate = parseSheetDate(d.planned);
          const status = getStatus(d);
          const isPending = status === "Pending";
          const isDelay = status === "Delay";

          const isThisWeekTarget = plannedDate && plannedDate >= currentWeekStart && plannedDate <= currentWeekEnd;

          if (isThisWeekTarget) {
            target++;
            if (!isPending) {
              totalAchievement++;
              if (isDelay) delayCount++;
            } else {
              pendingCount++;
            }
          }

          if (isPending && (!plannedDate || plannedDate <= currentWeekEnd)) {
            allPendingTillDate++;
          }
        });

        const workNotDone = target > 0 ? Math.round((pendingCount / target) * 100) + "%" : "0%";
        const workNotDoneOnTime = target > 0 ? Math.round(((pendingCount + delayCount) / target) * 100) + "%" : "0%";

        return {
          ...task,
          target,
          totalAchievement,
          workNotDone,
          workNotDoneOnTime,
          allPendingTillDate
        };
      });

      setSelectedUserDetails(prev => (prev && prev.name === employee.name) ? { ...prev, tasks: updatedTasks, loadingTasks: false } : prev);
    } catch (error) {
      console.error("Error calculating task totals:", error);
      setSelectedUserDetails(prev => prev ? { ...prev, loadingTasks: false } : null);
    }
  };

  const parseSheetRef = (ref) => {
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
  };

  const getStatus = (row) => {
    const actualStr = String(row.actual || "").trim();
    if (!actualStr || actualStr === "" || actualStr === "---") return "Pending";
    
    const delayStr = String(row.delay || "0").trim();
    if (delayStr === "0" || delayStr === "00:00:00" || delayStr === "") return "On Time";
    
    const parts = delayStr.split(":");
    if (parts.length === 3) {
      const h = parseInt(parts[0], 10) || 0;
      const m = parseInt(parts[1], 10) || 0;
      const s = parseInt(parts[2], 10) || 0;
      if (h > 0 || m > 0 || s > 0) return "Delay";
    } else if (parseFloat(delayStr) > 0) {
      return "Delay";
    }
    return "On Time";
  };

  const handleDrillDown = async (task, type, value, empName, event) => {
    if (event && typeof event.stopPropagation === 'function') event.stopPropagation();
    
    let scriptUrl = String(task.scriptUrl || "").trim();
    if (!scriptUrl) {
      scriptUrl = import.meta.env.VITE_APPS_SCRIPT_URL;
    }
    
    if (!scriptUrl) return;

    const plannedParsed = parseSheetRef(task.plannedSheetRef);
    const actualParsed = parseSheetRef(task.actualSheetRef);
    const nameParsed = parseSheetRef(task.nameColRef);
    const taskNameParsed = parseSheetRef(task.taskNameColRef);
    const delayParsed = parseSheetRef(task.delayColRef);

    setDrillDownLoading(true);
    setActiveDrillDown({
      taskId: task.taskName,
      type,
      title: `Total Achievement Details`,
      rows: [],
      loading: true
    });

    try {
      const employeeName = String(empName || selectedUserDetails?.name || "").trim().toLowerCase();
      console.log("Selected Employee in drilldown:", employeeName);
      const sheetDataCache = {};
      const sheetsToFetch = new Set();
      if (plannedParsed?.sheetName) sheetsToFetch.add(plannedParsed.sheetName);
      if (actualParsed?.sheetName) sheetsToFetch.add(actualParsed.sheetName);
      if (nameParsed?.sheetName) sheetsToFetch.add(nameParsed.sheetName);
      if (taskNameParsed?.sheetName) sheetsToFetch.add(taskNameParsed.sheetName);
      if (delayParsed?.sheetName) sheetsToFetch.add(delayParsed.sheetName);

      await Promise.all([...sheetsToFetch].map(async (name) => {
        try {
          const res = await fetch(`${scriptUrl}?sheet=${encodeURIComponent(name)}`);
          const response = await res.json();
          console.log("Popup API Response", response);
          sheetDataCache[name] = (response.success && Array.isArray(response.data)) ? response.data : [];
        } catch (err) {
          console.error(`Failed to fetch ${name} from ${scriptUrl}:`, err);
          sheetDataCache[name] = [];
        }
      }));

      const formatVal = (val) => String(val || "");

      let matchingRowIndices = null;
      if (nameParsed && nameParsed.sheetName && nameParsed.colIndex >= 0) {
        const nameSheetRows = sheetDataCache[nameParsed.sheetName] || [];
        const nameRowsFromStart = nameParsed.startRowIndex > 0 ? nameSheetRows.slice(nameParsed.startRowIndex) : nameSheetRows;
        matchingRowIndices = [];
        nameRowsFromStart.forEach((row, idx) => {
          const cellValue = String(row[nameParsed.colIndex] || "").trim().toLowerCase();
          if (cellValue === employeeName) {
            matchingRowIndices.push(idx);
          }
        });
      }

      if (matchingRowIndices) {
        const currentWeekStart = new Date(dateRange.start);
        const currentWeekEnd = new Date(dateRange.end);
        currentWeekEnd.setHours(23, 59, 59, 999);

        const parseSheetDate = (dateStr) => {
          if (!dateStr || String(dateStr).trim() === "---" || String(dateStr).trim() === "") return null;
          const str = String(dateStr).trim().split(" ")[0];
          const parts = str.split("/");
          if (parts.length === 3) {
            return new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
          }
          const d = new Date(str);
          return isNaN(d.getTime()) ? null : d;
        };

        const rows = [];
        matchingRowIndices.forEach(idx => {
          const absIdx = nameParsed.startRowIndex + idx;
          const taskNameVal = taskNameParsed ? formatVal((sheetDataCache[taskNameParsed.sheetName]?.[absIdx] || [])[taskNameParsed.colIndex]) : "";
          const plannedVal = plannedParsed ? formatVal((sheetDataCache[plannedParsed.sheetName]?.[absIdx] || [])[plannedParsed.colIndex]) : "";
          const actualVal = actualParsed ? formatVal((sheetDataCache[actualParsed.sheetName]?.[absIdx] || [])[actualParsed.colIndex]) : "";
          const delayVal = delayParsed ? formatVal((sheetDataCache[delayParsed.sheetName]?.[absIdx] || [])[delayParsed.colIndex]) : "";
          
          const plannedDate = parseSheetDate(plannedVal);
          const isPending = !actualVal || String(actualVal).trim() === "" || String(actualVal).trim() === "---";
          
          const isThisWeek = plannedDate && plannedDate >= currentWeekStart && plannedDate <= currentWeekEnd;
          const isAllPending = isPending && (!plannedDate || plannedDate <= currentWeekEnd);
          
          if (isThisWeek || isAllPending) {
            rows.push({
              taskName: taskNameVal,
              planned: plannedVal,
              actual: actualVal,
              delay: delayVal
            });
          }
        });
        setActiveDrillDown(prev => ({ ...prev, rows, loading: false }));
      }
    } catch (error) {
      console.error("Drilldown error:", error);
      setActiveDrillDown(prev => ({ ...prev, loading: false, error: "Failed to load details" }));
    } finally {
      setDrillDownLoading(false);
    }
  };

  const uniqueDesignations = useMemo(() => [
    ...new Set(sheetEmployees.map((emp) => emp.designation).filter(Boolean)),
  ], [sheetEmployees]);

  // Chart Data preparation
  const { topBestPerformers, topWorstPerformers, sortedPendingList } = useMemo(() => {
    const latestDateStr = sheetEmployees.reduce((latest, emp) => {
      if (!emp.endDate) return latest;
      const currentEnd = new Date(emp.endDate);
      if (isNaN(currentEnd)) return latest;
      if (!latest || currentEnd > new Date(latest)) return emp.endDate;
      return latest;
    }, "");

    const topBest = sheetEmployees
      .filter(emp => emp.endDate === latestDateStr)
      .map(emp => ({
        ...emp,
        donePct: parseFloat(String(emp.weeklyWorkDone || "0").replace('%', '').trim()) || 0,
        onTimePct: parseFloat(String(emp.weeklyWorkDoneOnTime || "0").replace('%', '').trim()) || 0
      }))
      .sort((a, b) => {
        if (b.donePct !== a.donePct) return b.donePct - a.donePct;
        if (b.actualWorkDone !== a.actualWorkDone) return b.actualWorkDone - a.actualWorkDone;
        if (b.onTimePct !== a.onTimePct) return b.onTimePct - a.onTimePct;
        if (a.allPendingTillDate !== b.allPendingTillDate) return a.allPendingTillDate - b.allPendingTillDate;
        return b.target - a.target;
      })
      .slice(0, 5);

    const topWorst = sheetEmployees
      .filter(emp => emp.endDate === latestDateStr)
      .map(emp => ({
        ...emp,
        donePct: parseFloat(String(emp.weeklyWorkDone || "0").replace('%', '').trim()) || 0,
        onTimePct: parseFloat(String(emp.weeklyWorkDoneOnTime || "0").replace('%', '').trim()) || 0
      }))
      .sort((a, b) => {
        if (a.donePct !== b.donePct) return a.donePct - b.donePct;
        if (a.actualWorkDone !== b.actualWorkDone) return a.actualWorkDone - b.actualWorkDone;
        if (a.onTimePct !== b.onTimePct) return a.onTimePct - b.onTimePct;
        if (b.allPendingTillDate !== a.allPendingTillDate) return b.allPendingTillDate - a.allPendingTillDate;
        return b.target - a.target;
      })
      .slice(0, 5);

    const pending = [...sheetEmployees]
      .map(emp => ({
        name: emp.name,
        pending: parseFloat(emp.weekPending) || 0,
        total: parseFloat(emp.target) || 0
      }))
      .filter(emp => emp.pending > 0)
      .sort((a, b) => b.pending - a.pending)
      .slice(0, 5);

    return { 
      topBestPerformers: topBest, 
      topWorstPerformers: topWorst,
      sortedPendingList: pending 
    };
  }, [sheetEmployees]);

  const handleInputChange = (employeeId, field, value) => {
    if (field !== "nextWeekCommitment" && value && !/^\d*$/.test(value)) return;
    setEditableData(prev => ({
      ...prev,
      [employeeId]: {
        ...prev[employeeId],
        [field]: value
      }
    }));
  };

  const handleSelectEmployee = (empId) => {
    const isSelected = selectedEmployees.includes(empId);
    const emp = sheetEmployees.find(e => e.id === empId);
    if (!emp) return;

    if (!isSelected) {
      // Select logic
      const existing = archivedMap[emp.name];
      setEditableData(prev => ({
        ...prev,
        [empId]: existing ? { ...existing.values } : {
          nextWeekPlannedNotDone: "",
          nextWeekPlannedNotDoneOnTime: "",
          nextWeekCommitment: ""
        }
      }));
      setSelectedEmployees(prev => [...prev, empId]);
    } else {
      // Unselect logic
      setEditableData(prev => {
        const copy = { ...prev };
        delete copy[empId];
        return copy;
      });
      setSelectedEmployees(prev => prev.filter(id => id !== empId));
    }
  };

  const handleSelectAll = () => {
    if (selectedEmployees.length === filteredEmployees.length) {
      setSelectedEmployees([]);
      setEditableData({});
    } else {
      const allIds = filteredEmployees.map(emp => emp.id);
      setSelectedEmployees(allIds);
      const newEditable = {};
      filteredEmployees.forEach(emp => {
        const existing = archivedMap[emp.name];
        newEditable[emp.id] = existing ? { ...existing.values } : {
          nextWeekPlannedNotDone: "",
          nextWeekPlannedNotDoneOnTime: "",
          nextWeekCommitment: ""
        };
      });
      setEditableData(newEditable);
    }
  };

  const handleSubmitSelection = async () => {
    if (selectedEmployees.length === 0) return;
    
    setIsSubmitting(true);
    try {
      const scriptUrl = import.meta.env.VITE_APPS_SCRIPT_URL;
      
      for (const id of selectedEmployees) {
        const emp = sheetEmployees.find(e => e.id === id);
        const inputs = editableData[id] || {};
        
        const row = [
          emp.name,
          emp.startDate,
          emp.endDate,
          inputs.nextWeekPlannedNotDone || "",
          inputs.nextWeekPlannedNotDoneOnTime || "",
          inputs.nextWeekCommitment || ""
        ];

        const existing = archivedMap[emp.name];
        const payload = existing
          ? {
            action: "update",
            sheetName: "Archived",
            rowIndex: existing.rowIndex,
            rowData: JSON.stringify(row)
          }
          : {
            action: "insert",
            sheetName: "Archived",
            rowData: JSON.stringify(row)
          };

        const response = await fetch(scriptUrl, {
          method: "POST",
          mode: "no-cors",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams(payload)
        });
      }
      
      showToast(`Successfully submitted ${selectedEmployees.length} selections`, 'success');
      setSelectedEmployees([]);
      setEditableData({});
    } catch (error) {
      console.error("Submission error:", error);
      showToast("Failed to submit selection", 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <ERPLayout>
        <div className="flex items-center justify-center h-screen bg-white">
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
            <p className="text-gray-500 font-bold animate-pulse">Synchronizing Dashboard Intelligence...</p>
          </div>
        </div>
      </ERPLayout>
    );
  }

  return (
    <ERPLayout>
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          .no-print, 
          nav, 
          aside, 
          header,
          .sticky {
            display: none !important;
          }
          .min-h-screen {
            min-height: auto !important;
            background: white !important;
          }
          .px-8 {
            padding-left: 0 !important;
            padding-right: 0 !important;
          }
          .mt-8 {
            margin-top: 20px !important;
          }
          .rounded-[2rem], .rounded-xl, .rounded-2xl {
            border-radius: 0 !important;
            border: 1px solid #eee !important;
            box-shadow: none !important;
          }
          .grid {
            display: block !important;
          }
          .col-span-12, .lg:col-span-4 {
            width: 100% !important;
            margin-bottom: 30px !important;
            page-break-inside: avoid;
          }
          table {
            font-size: 8px !important;
          }
          th, td {
            padding: 4px !important;
          }
          .h-[250px], .h-[400px] {
            height: 300px !important;
          }
          h1 {
            font-size: 18px !important;
            margin-bottom: 10px !important;
          }
          body {
            background: white !important;
          }
        }
      `}} />
      <div className="bg-[#F8FAFC] w-full max-w-full overflow-x-hidden">
        {/* Top Controls */}
        <div className="px-2 py-4 sm:px-10 sm:py-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">Admin Dashboard</h1>
            <button 
              onClick={handleDownload}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 text-white px-5 py-3 sm:py-2.5 rounded-xl text-xs font-black shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95 no-print"
            >
              <Download className="w-4 h-4" /> 
              <span className="sm:inline">Download Report</span>
            </button>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 no-print">
            <div className="col-span-2 relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 group-focus-within:text-blue-600 transition-colors" />
              <input 
                type="text" 
                placeholder="Search by name..." 
                value={filterName}
                onChange={(e) => setFilterName(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white border border-gray-100 rounded-xl text-[10px] sm:text-[11px] font-black shadow-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>
            
            <div className="relative group">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <select 
                value={filterDepartment}
                onChange={(e) => setFilterDepartment(e.target.value)}
                className="w-full pl-10 pr-8 py-3 bg-white border border-gray-100 rounded-xl text-[10px] sm:text-[11px] font-black shadow-sm appearance-none focus:ring-2 focus:ring-blue-500 outline-none transition-all cursor-pointer"
              >
                <option value="all">Designations</option>
                {uniqueDesignations.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
            </div>

            <div className="relative">
              <button 
                onClick={() => setShowColumnFilter(!showColumnFilter)}
                className="w-full flex items-center justify-between px-4 py-3 bg-white border border-gray-100 rounded-xl text-[10px] sm:text-[11px] font-black shadow-sm hover:bg-gray-50 transition-all"
              >
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-blue-600" />
                  <span className="hidden xs:inline">Columns</span>
                  <span className="xs:hidden">Cols</span>
                </div>
                <ChevronDown className={`w-4 h-4 transition-transform ${showColumnFilter ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {showColumnFilter && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute right-0 mt-2 w-full min-w-[200px] bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 z-50"
                  >
                    <div className="max-h-60 overflow-y-auto space-y-2 custom-scrollbar pr-2">
                      {ALL_COLUMNS.map(col => (
                        <label key={col.key} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors">
                          <input 
                            type="checkbox" 
                            checked={visibleColumns[col.key]}
                            onChange={() => setVisibleColumns(prev => ({ ...prev, [col.key]: !prev[col.key] }))}
                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-[10px] font-black text-gray-600 uppercase tracking-wider">{col.label}</span>
                        </label>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="px-2 sm:px-10 pb-10 space-y-6 sm:space-y-8">
          {/* Main Table Card */}
          <div className="bg-white rounded-xl sm:rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50 flex flex-row items-center justify-between bg-white gap-4">
              <h2 className="text-[10px] sm:text-xs font-black text-gray-800 uppercase tracking-wider">Employee Performance</h2>
              <AnimatePresence>
                {selectedEmployees.length > 0 && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    onClick={handleSubmitSelection}
                    disabled={isSubmitting}
                    className="flex items-center justify-center gap-2 bg-[#2563eb] text-white px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl text-[10px] sm:text-xs font-black shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    )}
                    Submit ({selectedEmployees.length})
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50">
                    <th className="px-6 py-4">
                      <input 
                        type="checkbox" 
                        checked={selectedEmployees.length === filteredEmployees.length && filteredEmployees.length > 0}
                        onChange={handleSelectAll}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer" 
                      />
                    </th>
                    {ALL_COLUMNS.filter(c => visibleColumns[c.key]).map(col => (
                      <th key={col.key} className="px-4 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredEmployees.map((emp) => (
                    <tr 
                      key={emp.id} 
                      className="hover:bg-blue-50/30 transition-colors cursor-pointer group"
                      onClick={() => handleRowClick(emp)}
                    >
                      <td className="px-6 py-4" onClick={e => e.stopPropagation()}>
                        <input 
                          type="checkbox" 
                          checked={selectedEmployees.includes(emp.id)}
                          onChange={() => handleSelectEmployee(emp.id)}
                          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer" 
                        />
                      </td>
                      {visibleColumns.name && (
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <img src={emp.image} alt={emp.name} className="w-8 h-8 rounded-lg shadow-sm border border-white" />
                            <span className="text-xs font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{emp.name}</span>
                          </div>
                        </td>
                      )}
                      {visibleColumns.designation && <td className="px-4 py-4 text-xs font-bold text-gray-500">{emp.designation}</td>}
                      {visibleColumns.target && <td className="px-4 py-4 text-xs font-bold text-gray-900 text-center">{emp.target}</td>}
                      {visibleColumns.actualWork && <td className="px-4 py-4 text-xs font-bold text-gray-900 text-center">{emp.actualWorkDone}</td>}
                      {visibleColumns.weeklyDone && (
                        <td className="px-4 py-4 text-center">
                          <span className={`px-2 py-1 rounded text-[10px] font-black ${parseFloat(emp.weeklyWorkDone) < 50 ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                            {emp.weeklyWorkDone}
                          </span>
                        </td>
                      )}
                      {visibleColumns.weeklyOnTime && (
                        <td className="px-4 py-4 text-center">
                          <span className={`px-2 py-1 rounded text-[10px] font-black ${parseFloat(emp.weeklyWorkDoneOnTime) < 50 ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'}`}>
                            {emp.weeklyWorkDoneOnTime}
                          </span>
                        </td>
                      )}
                      {visibleColumns.totalWork && <td className="px-4 py-4 text-xs font-bold text-gray-900 text-center">{emp.totalWorkDone}</td>}
                      {visibleColumns.weekPending && (
                        <td className="px-4 py-4 text-center">
                          <span className={`px-2 py-1 rounded text-[10px] font-black ${emp.weekPending > 5 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                            {emp.weekPending}
                          </span>
                        </td>
                      )}
                      {visibleColumns.allPending && <td className="px-4 py-4 text-xs font-bold text-gray-900 text-center">{emp.allPendingTillDate}</td>}
                      
                      {visibleColumns.lastWeekPlannedNotDone && <td className="px-4 py-4 text-center text-xs font-bold bg-red-50/30 text-red-600">{emp.plannedWorkNotDone}</td>}
                      {visibleColumns.lastWeekPlannedNotDoneOnTime && <td className="px-4 py-4 text-center text-xs font-bold bg-red-50/30 text-red-600">{emp.plannedWorkNotDoneOnTime}</td>}
                      {visibleColumns.lastWeekCommitment && <td className="px-4 py-4 text-center text-xs font-bold bg-red-50/30 text-red-600">{emp.commitment}</td>}
                      
                      {visibleColumns.nextWeekPlannedNotDone && (
                        <td className="px-4 py-4 text-center">
                          {selectedEmployees.includes(emp.id) ? (
                            <input 
                              type="text"
                              value={editableData[emp.id]?.nextWeekPlannedNotDone || ""}
                              onChange={(e) => handleInputChange(emp.id, "nextWeekPlannedNotDone", e.target.value)}
                              className="w-16 px-2 py-1 bg-white border border-gray-200 rounded text-xs font-bold text-emerald-600 focus:ring-2 focus:ring-emerald-500 outline-none"
                              placeholder="0"
                            />
                          ) : (
                            <span className="text-xs font-bold text-emerald-600">{emp.nextWeekPlannedWorkNotDone}</span>
                          )}
                        </td>
                      )}
                      {visibleColumns.nextWeekPlannedNotDoneOnTime && (
                        <td className="px-4 py-4 text-center">
                          {selectedEmployees.includes(emp.id) ? (
                            <input 
                              type="text"
                              value={editableData[emp.id]?.nextWeekPlannedNotDoneOnTime || ""}
                              onChange={(e) => handleInputChange(emp.id, "nextWeekPlannedNotDoneOnTime", e.target.value)}
                              className="w-16 px-2 py-1 bg-white border border-gray-200 rounded text-xs font-bold text-emerald-600 focus:ring-2 focus:ring-emerald-500 outline-none"
                              placeholder="0"
                            />
                          ) : (
                            <span className="text-xs font-bold text-emerald-600">{emp.nextWeekPlannedWorkNotDoneOnTime}</span>
                          )}
                        </td>
                      )}
                      {visibleColumns.nextWeekCommitment && (
                        <td className="px-4 py-4 text-center">
                          {selectedEmployees.includes(emp.id) ? (
                            <input 
                              type="text"
                              value={editableData[emp.id]?.nextWeekCommitment || ""}
                              onChange={(e) => handleInputChange(emp.id, "nextWeekCommitment", e.target.value)}
                              className="w-32 px-2 py-1 bg-white border border-gray-200 rounded text-xs font-bold text-emerald-600 focus:ring-2 focus:ring-emerald-500 outline-none"
                              placeholder="Comment..."
                            />
                          ) : (
                            <span className="text-xs font-bold text-emerald-600">{emp.nextWeekCommitment}</span>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="lg:hidden divide-y divide-gray-100">
              {filteredEmployees.map((emp) => (
                <div 
                  key={emp.id} 
                  className={`p-5 transition-all space-y-4 ${selectedEmployees.includes(emp.id) ? 'bg-blue-50/50' : 'hover:bg-gray-50'}`}
                  onClick={() => handleRowClick(emp)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div onClick={e => e.stopPropagation()} className="p-1">
                        <input 
                          type="checkbox" 
                          checked={selectedEmployees.includes(emp.id)}
                          onChange={() => handleSelectEmployee(emp.id)}
                          className="w-5 h-5 rounded-lg border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer transition-all" 
                        />
                      </div>
                      <div className="flex items-center gap-3">
                        <img src={emp.image} alt={emp.name} className="w-11 h-11 rounded-2xl shadow-sm border-2 border-white" />
                        <div>
                          <p className="text-[13px] font-black text-gray-900 leading-tight tracking-tight">{emp.name}</p>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">{emp.designation}</p>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black shadow-sm ${parseFloat(emp.weeklyWorkDone) < 50 ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>
                        {emp.weeklyWorkDone}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div className="bg-white/50 border border-gray-100 p-2 rounded-2xl">
                      <p className="text-[8px] font-black text-gray-400 uppercase mb-1">Target</p>
                      <p className="text-xs font-black text-gray-900">{emp.target}</p>
                    </div>
                    <div className="bg-white/50 border border-gray-100 p-2 rounded-2xl">
                      <p className="text-[8px] font-black text-gray-400 uppercase mb-1">Actual</p>
                      <p className="text-xs font-black text-gray-900">{emp.actualWorkDone}</p>
                    </div>
                    <div className="bg-white/50 border border-gray-100 p-2 rounded-2xl">
                      <p className="text-[8px] font-black text-gray-400 uppercase mb-1">Total</p>
                      <p className="text-xs font-black text-gray-900">{emp.totalWorkDone}</p>
                    </div>
                    <div className="bg-blue-50/50 border border-blue-100 p-2 rounded-2xl">
                      <p className="text-[8px] font-black text-blue-600 uppercase mb-1">On Time</p>
                      <p className="text-xs font-black text-blue-700">{emp.weeklyWorkDoneOnTime}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex items-center justify-between px-4 py-2.5 bg-amber-50/40 rounded-2xl border border-amber-100/60 shadow-sm">
                      <span className="text-[9px] font-black text-amber-600 uppercase tracking-wider">Week Pending</span>
                      <span className="text-xs font-black text-amber-700">{emp.weekPending}</span>
                    </div>
                    <div className="flex items-center justify-between px-4 py-2.5 bg-red-50/40 rounded-2xl border border-red-100/60 shadow-sm">
                      <span className="text-[9px] font-black text-red-600 uppercase tracking-wider">All Pending</span>
                      <span className="text-xs font-black text-red-700">{emp.allPendingTillDate}</span>
                    </div>
                  </div>

                  {selectedEmployees.includes(emp.id) && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="pt-4 space-y-4 border-t border-gray-100"
                      onClick={e => e.stopPropagation()}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-4 bg-blue-600 rounded-full" />
                        <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Next Week Commitment</p>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className="text-[9px] font-black text-gray-400 uppercase ml-1 tracking-wide">Planned Not Done</label>
                          <input 
                            type="text"
                            value={editableData[emp.id]?.nextWeekPlannedNotDone || ""}
                            onChange={(e) => handleInputChange(emp.id, "nextWeekPlannedNotDone", e.target.value)}
                            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-2xl text-xs font-black text-emerald-600 focus:ring-2 focus:ring-emerald-500 outline-none shadow-sm"
                            placeholder="0"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[9px] font-black text-gray-400 uppercase ml-1 tracking-wide">Not Done On Time</label>
                          <input 
                            type="text"
                            value={editableData[emp.id]?.nextWeekPlannedNotDoneOnTime || ""}
                            onChange={(e) => handleInputChange(emp.id, "nextWeekPlannedNotDoneOnTime", e.target.value)}
                            className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-2xl text-xs font-black text-emerald-600 focus:ring-2 focus:ring-emerald-500 outline-none shadow-sm"
                            placeholder="0"
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-1.5 pb-2">
                        <label className="text-[9px] font-black text-gray-400 uppercase ml-1 tracking-wide">Commitment Comment</label>
                        <input 
                          type="text"
                          value={editableData[emp.id]?.nextWeekCommitment || ""}
                          onChange={(e) => handleInputChange(emp.id, "nextWeekCommitment", e.target.value)}
                          className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-2xl text-xs font-black text-emerald-600 focus:ring-2 focus:ring-emerald-500 outline-none shadow-sm"
                          placeholder="Enter your comment here..."
                        />
                      </div>
                    </motion.div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-12 gap-4 sm:gap-8">
            {/* Top Performers Card */}
            <div className="col-span-12 lg:col-span-4 bg-white rounded-2xl sm:rounded-[2rem] border border-gray-100 p-6 sm:p-8 shadow-xl shadow-gray-100">
               <div className="flex items-center justify-between mb-6 sm:mb-8">
                  <div className="flex items-center gap-3">
                    <div className="w-1.5 h-6 bg-emerald-500 rounded-full" />
                    <h3 className="text-xs sm:text-sm font-black text-gray-800 uppercase tracking-widest">Top 5 Best Performers</h3>
                  </div>
               </div>
               <div className="h-[250px]">
                  <VerticalBarChart 
                    data={topBestPerformers.map(e => parseFloat(e.weeklyWorkDone))}
                    labels={topBestPerformers.map(e => e.name)}
                    colors={["#10b981", "#34d399", "#6ee7b7", "#a7f3d0", "#d1fae5"]}
                  />
               </div>
            </div>

            {/* Pending Tasks Card */}
            <div className="col-span-12 lg:col-span-4 bg-white rounded-2xl sm:rounded-[2rem] border border-gray-100 p-6 sm:p-8 shadow-xl shadow-gray-100">
               <div className="flex items-center justify-between mb-6 sm:mb-8">
                  <div className="flex items-center gap-3">
                    <div className="w-1.5 h-6 bg-red-500 rounded-full" />
                    <h3 className="text-xs sm:text-sm font-black text-gray-800 uppercase tracking-widest">Pending Tasks by User</h3>
                  </div>
               </div>
               <div className="space-y-3 sm:space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                  {sortedPendingList.map((emp, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 sm:p-4 bg-gray-50 rounded-2xl border border-transparent hover:border-red-100 hover:bg-red-50/30 transition-all cursor-pointer group">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center text-red-600 text-[10px] font-black group-hover:scale-110 transition-transform">
                          {emp.name.charAt(0)}
                        </div>
                        <span className="text-[10px] sm:text-xs font-bold text-gray-700 group-hover:text-red-700 transition-colors">{emp.name}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-[8px] sm:text-[10px] font-black text-gray-400 uppercase">Pending</p>
                        <p className="text-[10px] sm:text-xs font-black text-red-600">{emp.pending} / {emp.total}</p>
                      </div>
                    </div>
                  ))}
               </div>
            </div>

            {/* Worst Performers Card */}
            <div className="col-span-12 lg:col-span-4 bg-white rounded-2xl sm:rounded-[2rem] border border-gray-100 p-6 sm:p-8 shadow-xl shadow-gray-100">
               <div className="flex items-center justify-between mb-6 sm:mb-8">
                  <div className="flex items-center gap-3">
                    <div className="w-1.5 h-6 bg-blue-500 rounded-full" />
                    <h3 className="text-xs sm:text-sm font-black text-gray-800 uppercase tracking-widest">Top 5 Worst Performers</h3>
                  </div>
               </div>
               <div className="h-[250px] flex items-center justify-center">
                  <HalfCircleChart 
                    data={topWorstPerformers.map(e => parseFloat(String(e.weeklyWorkDone).replace('%', '')))}
                    labels={topWorstPerformers.map(e => e.name)}
                    colors={["#ef4444", "#f87171", "#fb923c", "#fbbf24", "#fcd34d"]}
                  />
               </div>
            </div>
          </div>

          {/* Department Scores Section */}
          <div className="bg-white rounded-2xl sm:rounded-[2rem] border border-gray-100 p-6 sm:p-8 shadow-xl shadow-gray-100">
             <div className="flex items-center gap-3 mb-8 sm:mb-10">
                <div className="w-1.5 h-6 bg-indigo-600 rounded-full" />
                <h3 className="text-xs sm:text-sm font-black text-gray-800 uppercase tracking-widest">Department Scores</h3>
             </div>
             <div className="h-[300px] sm:h-[400px]">
                <DepartmentScoreChart 
                  labels={departmentScores.map(d => d.name)}
                  pendingData={departmentScores.map(d => d.pendingWorks)}
                  notDoneData={departmentScores.map(d => d.workNotDonePct)}
                  notDoneOnTimeData={departmentScores.map(d => d.notDoneOnTimePct)}
                />
             </div>
          </div>
        </div>

        {/* User Details Modal */}
        {selectedUserDetails && (
          <UserDetailsModal 
            selectedUserDetails={selectedUserDetails}
            setSelectedUserDetails={setSelectedUserDetails}
            activeDrillDown={activeDrillDown}
            setActiveDrillDown={setActiveDrillDown}
            handleDrillDown={handleDrillDown}
          />
        )}
      </div>
    </ERPLayout>
  );
};

export default AdminDashboard;
