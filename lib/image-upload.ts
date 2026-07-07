// ────────────────────────────────
// Image Upload Utility (Client-side validation only)
// SECURITY.md Section 9 — file upload security
// BUSINESS_RULE.md Section 5.1 — image storage rules
// ARCHITECTURE.md Section 5 — client-side code cannot use Node.js APIs
//
// NOTE: This module is imported by Client Components. It MUST NOT contain any
// logic that determines the final stored filename/path on disk. Filename
// generation for the stored path happens server-side (in the Server Action)
// using Node's crypto.randomBytes, so the server — not the client — decides
// the final stored filename (prevents path traversal / filename injection).
// This module only provides client-side validation for upload previews.
// ────────────────────────────────

/**
 * Allowed MIME types for motorcycle images
 */
export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

/**
 * Maximum file size: 5MB
 */
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB in bytes

/**
 * Validate image file (client-side, for preview/UX only)
 * @param file - The file to validate
 * @throws Error if file is invalid
 */
export function validateImageFile(file: File): void {
  // Check MIME type
  if (!ALLOWED_IMAGE_TYPES.includes(file.type as (typeof ALLOWED_IMAGE_TYPES)[number])) {
    throw new Error(`Invalid file type: ${file.type}. Only JPEG, PNG, and WebP are allowed.`);
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File size exceeds limit. Maximum size is 5MB.`);
  }
}
