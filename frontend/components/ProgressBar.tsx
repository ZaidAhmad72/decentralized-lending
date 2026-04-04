/**
 * ProgressBar Component
 * Visual progress bar for credit score (300-1000 range)
 */

interface ProgressBarProps {
  score: number;
}

export default function ProgressBar({ score }: ProgressBarProps) {
  // Calculate percentage (300 = 0%, 1000 = 100%)
  const percentage = ((score - 300) / 700) * 100;
  
  // Color based on score tier
  const getColor = () => {
    if (score >= 900) return "bg-green-600";
    if (score >= 700) return "bg-green-400";
    if (score >= 500) return "bg-yellow-400";
    return "bg-red-400";
  };
  
  return (
    <div className="relative">
      {/* Background */}
      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        {/* Progress */}
        <div 
          className={`h-full ${getColor()} transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      
      {/* Labels */}
      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
        <span>300</span>
        <span>500</span>
        <span>700</span>
        <span>900</span>
        <span>1000</span>
      </div>
    </div>
  );
}
