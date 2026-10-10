"use client";

import { CheckCircle2, Info, X, XCircle } from "lucide-react";

const ICONS = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
};

export default function Toast({ toast, onDismiss }) {
  const Icon = ICONS[toast.type] ?? Info;

  return (
    <div className={`toast ${toast.type}`} role="status">
      <Icon size={18} className="toast-icon" />
      <span className="toast-msg">{toast.message}</span>
      <button
        type="button"
        className="toast-close"
        onClick={onDismiss}
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  );
}
