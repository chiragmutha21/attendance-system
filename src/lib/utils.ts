import { randomUUID } from "crypto";

/**
 * Calculates the distance between two GPS coordinates in meters using the Haversine formula.
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const distance = R * c; // in meters
  return distance;
}

/**
 * Generates a cryptographically secure random token.
 */
export function generateSecureToken(): string {
  return randomUUID();
}

/**
 * Formats a JS Date object into a readable date and time format in a specific timezone.
 */
export function formatDateTime(date: Date, timezone?: string): { dateStr: string; timeStr: string } {
  try {
    const options: Intl.DateTimeFormatOptions = {
      timeZone: timezone || "Asia/Kolkata",
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    };
    
    const formatter = new Intl.DateTimeFormat("en-IN", options);
    const parts = formatter.formatToParts(date);
    
    const day = parts.find(p => p.type === "day")?.value || "";
    const month = parts.find(p => p.type === "month")?.value || "";
    const year = parts.find(p => p.type === "year")?.value || "";
    const hour = parts.find(p => p.type === "hour")?.value || "";
    const minute = parts.find(p => p.type === "minute")?.value || "";
    const dayPeriod = parts.find(p => p.type === "dayPeriod")?.value || "";
    
    return {
      dateStr: `${day} ${month} ${year}`,
      timeStr: `${hour}:${minute} ${dayPeriod.toUpperCase()}`,
    };
  } catch (err) {
    // Fallback if timezone is invalid
    return {
      dateStr: date.toLocaleDateString(),
      timeStr: date.toLocaleTimeString(),
    };
  }
}
