// components/charts/VerticalBarChart.jsx
import React from 'react';

const VerticalBarChart = ({ data = [], labels = [], colors = ["#2563eb"], maxValue = 100, subValues = [] }) => {
  const hasSubValues = Array.isArray(subValues) && subValues.length > 0;
  
  return (
    <div className="w-full h-full flex items-end justify-between px-1 md:px-2 space-x-1 md:space-x-2 pt-2">
      {data.map((value, index) => {
        // Calculate percentage for the bar itself (using absolute value for height if negative)
        const absValue = Math.abs(parseFloat(value) || 0);
        const percentage = Math.max(0, Math.min(100, (absValue / (maxValue || 1)) * 100));

        return (
          <div key={index} className="flex flex-col items-center justify-end flex-1 h-full min-w-0 pb-1">
            {/* Value above bar */}
            <div className="mb-1 text-center w-full flex-shrink-0">
              <span className={`text-[10px] sm:text-xs font-semibold whitespace-nowrap ${parseFloat(value) < 0 ? 'text-red-500' : 'text-gray-700'}`}>
                {hasSubValues ? `${value} / ${subValues[index] ?? '—'}` : `${value}%`}
              </span>
            </div>

            {/* Bar Container */}
            <div className="w-full flex items-end justify-center flex-1 min-h-[20px]">
              <div
                className="w-full rounded-t transition-all duration-500 ease-out"
                style={{
                  height: `${percentage}%`,
                  backgroundColor: (colors || ["#2563eb"])[index % (colors || ["#2563eb"]).length],
                  opacity: parseFloat(value) < 0 ? 0.7 : 1
                }}
              />
            </div>

            {/* Label */}
            <div className="mt-2 h-8 sm:h-10 flex items-start justify-center w-full flex-shrink-0">
              <span
                className="text-[9px] sm:text-[11px] text-gray-600 text-center leading-tight px-0.5 w-full block"
                style={{ wordBreak: 'normal', overflowWrap: 'break-word', whiteSpace: 'normal' }}
              >
                { (labels || [])[index] }
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default VerticalBarChart;