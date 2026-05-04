/**
 * Parse a time string like "9:00 AM", "09:30 AM", "14:30", "9:30"
 * Returns "HH:MM" in 24-hour format (e.g., "09:30", "14:30").
 * Returns undefined for invalid input.
 */
export function parseTime(input: string): string | undefined {
  const trimmed = input.trim();
  if (!trimmed) return undefined;

  // Try 12-hour format: "9:00 AM", "09:30 PM", "9AM", "12PM"
  const match12 = trimmed.match(/^(\d{1,2}):?(\d{2})?\s*(am|pm)$/i);
  if (match12) {
    let hours = parseInt(match12[1], 10);
    const minutes = match12[2] ? parseInt(match12[2], 10) : 0;
    const period = match12[3].toLowerCase();

    if (hours < 1 || hours > 12 || minutes > 59) return undefined;

    if (period === "am") {
      if (hours === 12) hours = 0;
    } else {
      if (hours !== 12) hours += 12;
    }

    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  }

  // Try 24-hour format: "14:30", "9:30", "09:00"
  const match24 = trimmed.match(/^(\d{1,2}):?(\d{2})?$/);
  if (match24) {
    const hours = parseInt(match24[1], 10);
    const minutes = match24[2] ? parseInt(match24[2], 10) : 0;

    if (hours > 23 || minutes > 59) return undefined;

    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  }

  return undefined;
}

/**
 * Format a 24-hour time string to 12-hour with AM/PM for display.
 * E.g., "09:30" → "9:30 AM", "14:00" → "2:00 PM"
 */
export function formatTime12(time24: string): string {
  const [h, m] = time24.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 || 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}
