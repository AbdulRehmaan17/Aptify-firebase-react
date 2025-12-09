import React from "react";

export default function Card({ children, className="", ...props }) {
  return <div className={`bg-surface border border-muted rounded-lg shadow-soft p-4 ${className}`} {...props}>{children}</div>;
}


