export class AmbiguousAntiResolverPatternError extends Error {
  constructor() {
    super(
      "The ignore pattern must unambiguously reduce all related unions to one member."
    );
    Object.setPrototypeOf(this, AmbiguousAntiResolverPatternError.prototype);
  }
}

export class UnspecifiedSelectionsError extends Error {
  constructor() {
    super("Missing selection in field path.");
    Object.setPrototypeOf(this, UnspecifiedSelectionsError.prototype);
  }
}

export class UnspecifiedTypeResolverError extends Error {
  constructor() {
    super("Missing type resolution for union type.");
    Object.setPrototypeOf(this, UnspecifiedTypeResolverError.prototype);
  }
}
