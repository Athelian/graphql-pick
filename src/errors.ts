export class UnspecifiedSelectionsError extends Error {
  constructor() {
    super("No selections found in fieldPaths.");
    Object.setPrototypeOf(this, UnspecifiedSelectionsError.prototype);
  }
}
