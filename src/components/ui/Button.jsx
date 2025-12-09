import React from "react";

export default function Button({ variant="primary", children, className="", ...props }) {
  const base = "rounded-[12px] px-4 py-2 font-medium transition";
  const variants = {
    primary: "bg-primary text-white hover:bg-primaryDark",
    secondary: "bg-accent text-white hover:opacity-95",
    outline: "border border-primary text-primary hover:bg-primary hover:text-white",
    danger: "bg-red-600 text-white hover:bg-red-700",
  };
  const cls = `${base} ${variants[variant] ?? variants.primary} ${className}`;
  return <button className={cls} {...props}>{children}</button>;
}


