// C:\Users\pong1\OneDrive\เอกสาร\End-Pro\sailom\lib\utils.ts
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
