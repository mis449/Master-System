import React from "react"
import StatisticsCards from "../StaticsCard"
import TaskNavigationTabs from "../TaskNavigationTab"
import StaffTasksTable from "../StaffTaskTable"

export default function DefaultView({
    dashboardType,
    taskView,
    setTaskView,
    searchQuery,
    setSearchQuery,
    filterStaff,
    setFilterStaff,
    departmentData,
    getTasksByView,
    getFrequencyColor,
    isLoadingMore,
    hasMoreData,
    displayStats,
    notDoneTask,
    dateRange,
    activeTab,
    dashboardStaffFilter,
    departmentFilter,
    parseTaskStartDate,
    userRole,
}) {
    return (
        <div className="space-y-4">
            <StatisticsCards
                totalTask={displayStats.totalTasks}
                completeTask={displayStats.completedTasks}
                pendingTask={displayStats.pendingTasks}
                overdueTask={displayStats.overdueTasks}
                notDoneTask={notDoneTask}
                dashboardType={dashboardType}
                dateRange={dateRange.filtered ? dateRange : null}
            />

            <TaskNavigationTabs
                taskView={taskView}
                setTaskView={setTaskView}
                dashboardType={dashboardType}
                dashboardStaffFilter={dashboardStaffFilter}
                departmentFilter={departmentFilter}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                filterStaff={filterStaff}
                setFilterStaff={setFilterStaff}
                departmentData={departmentData}
                getTasksByView={getTasksByView}
                getFrequencyColor={getFrequencyColor}
                isLoadingMore={isLoadingMore}
                hasMoreData={hasMoreData}
                userRole={userRole}
            />

            {activeTab === "overview" && (
                <div className="space-y-4">
                    <div className="px-4 py-3 bg-blue-50 border border-gray-200 rounded-none">
                        <h3 className="text-[14px] font-bold text-blue-900 tracking-tight">Staff Task Summary</h3>
                        <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mt-1">Overview of tasks assigned to each staff member</p>
                    </div>
                    <StaffTasksTable
                        dashboardType={dashboardType}
                        dashboardStaffFilter={dashboardStaffFilter}
                        departmentFilter={departmentFilter}
                        parseTaskStartDate={parseTaskStartDate}
                    />
                </div>
            )}
        </div>
    )
}
