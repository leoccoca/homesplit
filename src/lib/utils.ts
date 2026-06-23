import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

/**
 * Parses an ISO 8601 date string or a YYYY-MM-DD string into a Date object 
 * representing midnight on that calendar day in the user's local timezone.
 * This prevents dates from shifting to the previous day in western timezones like Toronto.
 */
export function parseLocalDate(dateString: string): Date {
  if (!dateString) return new Date();
  
  // Extract the YYYY-MM-DD part
  const cleanDate = dateString.substring(0, 10);
  const parts = cleanDate.split('-');
  
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);
    
    if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
      // month index is 0-based in JS Date constructor
      return new Date(year, month - 1, day);
    }
  }
  
  return new Date(dateString);
}
