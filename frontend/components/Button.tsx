"use client";

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "green" | "gray" | "outline";
  fullWidth?: boolean;
  className?: string;
  type?: "button" | "submit";
}

export default function Button({
  children,
  onClick,
  variant = "primary",
  fullWidth = false,
  className = "",
  type = "button",
}: ButtonProps) {
  const base = "flex items-center justify-center gap-2 font-semibold rounded-xl px-5 py-4 transition-all active:scale-95 cursor-pointer";

  const variants = {
    primary: "bg-[#1a2fb8] text-white hover:bg-[#1527a0]",
    green: "bg-[#4ade80] text-[#14532d] hover:bg-[#22c55e]",
    gray: "bg-[#e5e9f0] text-[#374151] hover:bg-[#d1d5db]",
    outline: "border-2 border-[#1a2fb8] text-[#1a2fb8] bg-white hover:bg-[#eef2ff]",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      className={`${base} ${variants[variant]} ${fullWidth ? "w-full" : ""} ${className}`}
    >
      {children}
    </button>
  );
}
