import Swal from "sweetalert2";
import { toast } from "react-toastify";

// Toast Notifications
export const showToastSuccess = (message) => {
  toast.success(message, {
    position: "top-right",
    autoClose: 3000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
    theme: "dark",
  });
};

export const showToastError = (message) => {
  toast.error(message || "An error occurred", {
    position: "top-right",
    autoClose: 4000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
    theme: "dark",
  });
};

export const showToastInfo = (message) => {
  toast.info(message, {
    position: "top-right",
    autoClose: 3000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
    theme: "dark",
  });
};

// SweetAlert2 Confirmation for Deletions
export const confirmDelete = async (title = "Are you sure?", text = "This action cannot be undone.") => {
  const result = await Swal.fire({
    title,
    text,
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#ef4444",
    cancelButtonColor: "#3f3f46",
    confirmButtonText: "Yes, Delete It!",
    cancelButtonText: "Cancel",
    background: "#18181b",
    color: "#f4f4f5",
    customClass: {
      popup: "rounded-2xl border border-zinc-800 shadow-2xl",
      confirmButton: "px-4 py-2 rounded-xl font-bold text-xs",
      cancelButton: "px-4 py-2 rounded-xl font-semibold text-xs",
    },
  });
  return result.isConfirmed;
};

// SweetAlert2 General Confirmation
export const confirmAction = async (
  title = "Confirm Action",
  text = "Do you want to proceed?",
  confirmButtonText = "Yes, Proceed"
) => {
  const result = await Swal.fire({
    title,
    text,
    icon: "question",
    showCancelButton: true,
    confirmButtonColor: "#10b981",
    cancelButtonColor: "#3f3f46",
    confirmButtonText,
    cancelButtonText: "Cancel",
    background: "#18181b",
    color: "#f4f4f5",
    customClass: {
      popup: "rounded-2xl border border-zinc-800 shadow-2xl",
      confirmButton: "px-4 py-2 rounded-xl font-bold text-xs",
      cancelButton: "px-4 py-2 rounded-xl font-semibold text-xs",
    },
  });
  return result.isConfirmed;
};

// SweetAlert2 Success Modal
export const showSuccessAlert = (title, text) => {
  return Swal.fire({
    title,
    text,
    icon: "success",
    confirmButtonColor: "#10b981",
    background: "#18181b",
    color: "#f4f4f5",
    customClass: {
      popup: "rounded-2xl border border-zinc-800 shadow-2xl",
      confirmButton: "px-5 py-2 rounded-xl font-bold text-xs",
    },
  });
};

// SweetAlert2 Error Modal
export const showErrorAlert = (title, text) => {
  return Swal.fire({
    title,
    text,
    icon: "error",
    confirmButtonColor: "#ef4444",
    background: "#18181b",
    color: "#f4f4f5",
    customClass: {
      popup: "rounded-2xl border border-zinc-800 shadow-2xl",
      confirmButton: "px-5 py-2 rounded-xl font-bold text-xs",
    },
  });
};

// SweetAlert2 text prompt (e.g. reason for voiding a bill). Resolves to the text or null.
export const promptText = async (title, { label = "", placeholder = "", confirmButtonText = "Confirm", required = true } = {}) => {
  const result = await Swal.fire({
    title,
    input: "text",
    inputLabel: label,
    inputPlaceholder: placeholder,
    showCancelButton: true,
    confirmButtonColor: "#ef4444",
    cancelButtonColor: "#3f3f46",
    confirmButtonText,
    background: "#18181b",
    color: "#f4f4f5",
    inputValidator: (value) => (required && !String(value || "").trim() ? "This field is required" : undefined),
    customClass: {
      popup: "rounded-2xl border border-zinc-800 shadow-2xl",
      confirmButton: "px-4 py-2 rounded-xl font-bold text-xs",
      cancelButton: "px-4 py-2 rounded-xl font-semibold text-xs",
    },
  });
  return result.isConfirmed ? String(result.value || "").trim() : null;
};
