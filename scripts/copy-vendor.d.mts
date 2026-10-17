/** pdf.js's browser files, as copied into `<out>/pdfjs`. */
export const VENDOR_FILES: string[];
/** Copies pdf.js's browser build, worker and helper folders into `out` (default public/vendor). */
export function copyVendor(out?: string): void;
