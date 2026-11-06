// The one error type for expected failures, shared by every layer.
// Codes and their meanings: docs/ARCHITECTURE.md §2.2.
// Messages are for developers; the UI turns codes into user-facing text.

export const ErrorCode = Object.freeze({
  INVALID: "invalid",
  NAME_TAKEN: "name-taken",
  NOT_FOUND: "not-found",
  INVALID_REFERENCE: "invalid-reference",
  ARCHIVED: "archived",
  SESSION_ACTIVE: "session-active",
  SESSION_NOT_ACTIVE: "session-not-active",
  CLOSING_NOTES_MISSING: "closing-notes-missing",
  IMPORT_INVALID: "import-invalid",
  STORAGE_FAILED: "storage-failed",
});

const knownCodes = new Set(Object.values(ErrorCode));

export class WorkbenchError extends Error {
  constructor(code, message, details = {}) {
    // An unknown code is a bug in the caller, so fail loudly.
    if (!knownCodes.has(code)) {
      throw new TypeError(`Unknown WorkbenchError code: ${code}`);
    }
    super(message);
    this.name = "WorkbenchError";
    this.code = code;
    this.details = details;
  }
}
