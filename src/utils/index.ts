import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);
}

export function shortenAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function requiresProofText(verificationType?: string): boolean {
  if (!verificationType) return false;
  const norm = verificationType.toLowerCase();
  return ['manual', 'proof', 'screenshot', 'admin_approval'].includes(norm);
}

export { validateExternalUrl, type UrlValidationResult } from './security';

