import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts"

export default function TasksOverviewChart({ data }) {
  return (
    <div className="w-full h-[400px] bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="text-lg font-black text-gray-900 tracking-tight">Performance Trend</h3>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Monthly Task Velocity</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="text-[10px] font-black text-gray-500 uppercase">Done</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-gray-200" />
            <span className="text-[10px] font-black text-gray-500 uppercase">Pending</span>
          </div>
        </div>
      </div>
      
      <ResponsiveContainer width="100%" height="80%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity={1} />
              <stop offset="100%" stopColor="#6366f1" stopOpacity={1} />
            </linearGradient>
            <linearGradient id="pendingGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f1f5f9" stopOpacity={1} />
              <stop offset="100%" stopColor="#e2e8f0" stopOpacity={1} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis 
            dataKey="name" 
            fontSize={10} 
            fontWeight="bold"
            stroke="#94a3b8" 
            tickLine={false} 
            axisLine={false} 
            dy={10}
          />
          <YAxis 
            fontSize={10} 
            fontWeight="bold"
            stroke="#94a3b8" 
            tickLine={false} 
            axisLine={false} 
            tickFormatter={(value) => `${value}`}
          />
          <Tooltip 
            cursor={{ fill: '#f8fafc' }}
            contentStyle={{ 
              borderRadius: '16px', 
              border: 'none', 
              boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
              padding: '12px'
            }}
            itemStyle={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase' }}
          />
          <Bar 
            dataKey="completed" 
            stackId="a" 
            fill="url(#barGradient)" 
            radius={[4, 4, 0, 0]} 
            barSize={32}
          />
          <Bar 
            dataKey="pending" 
            stackId="a" 
            fill="url(#pendingGradient)" 
            radius={[0, 0, 0, 0]} 
            barSize={32}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
