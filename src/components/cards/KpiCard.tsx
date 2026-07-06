import React from 'react';

interface KpiCardProps {
  title: string;
  value: string | number;
  change?: string;
  isPositive?: boolean;
  icon?: React.ReactNode;
  description?: string;
}

export const KpiCard: React.FC<KpiCardProps> = ({
  title,
  value,
  change,
  isPositive = true,
  icon,
  description
}) => {
  return (
    <div className="premium-card p-6 flex flex-col justify-between min-h-[140px] transition-transform duration-200 hover:-translate-y-0.5">
      <div className="flex justify-between items-start">
        <span className="text-xs font-bold text-[#8A94A6] uppercase tracking-wider">{title}</span>
        {icon && (
          <div className="w-8 h-8 rounded-lg bg-[#F6F8FB] flex items-center justify-center text-[#6254E8] border border-[#E8ECF2]">
            {icon}
          </div>
        )}
      </div>
      
      <div className="mt-4 flex items-baseline gap-2">
        <span className="text-3xl font-bold text-[#0F172A] tracking-tight">{value}</span>
        {change && (
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
            isPositive 
              ? 'bg-[#DDFBF5] text-[#0EAD98]' 
              : 'bg-[#FFE6EE] text-[#E04F6F]'
          }`}>
            {change}
          </span>
        )}
      </div>
      
      {description && (
        <span className="text-[11px] text-[#8A94A6] mt-2 block font-medium leading-tight">
          {description}
        </span>
      )}
    </div>
  );
};
