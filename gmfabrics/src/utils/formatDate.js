/**
 * Date formatting helpers
 */
export const formatDate = (dateInput) => {
  if (!dateInput) return "—";
  const date = new Date(dateInput);
  return date.toLocaleDateString("en-PK", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

export const formatDateTime = (dateInput) => {
  if (!dateInput) return "—";
  const date = new Date(dateInput);
  return date.toLocaleString("en-PK", {
    dateStyle: "medium",
    timeStyle: "short",
  });
};
