"use client";

interface InputProps {
  label?: string;
  placeholder?: string;
  value: string;
  onChange: (val: string) => void;
  type?: string;
  prefix?: string;
  suffix?: React.ReactNode;
  className?: string;
}

export default function Input({
  label,
  placeholder,
  value,
  onChange,
  type = "text",
  prefix,
  suffix,
  className = "",
}: InputProps) {
  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label className="block text-xs font-semibold tracking-widest text-[#6b7280] uppercase mb-2">
          {label}
        </label>
      )}
      <div className="flex items-center bg-white rounded-2xl px-4 py-4 shadow-sm border border-[#e5e9f0] gap-3">
        {prefix && (
          <>
            <span className="text-[#374151] font-semibold text-base">{prefix}</span>
            <div className="w-px h-5 bg-[#d1d5db]" />
          </>
        )}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 outline-none text-base text-[#374151] placeholder-[#9ca3af] bg-transparent"
        />
        {suffix && <div className="ml-auto">{suffix}</div>}
      </div>
    </div>
  );
}
