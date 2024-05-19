class PublicError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PublicError";
  }
}

export class ConfigRejectionError extends PublicError {
  constructor(message: string) {
    super("Invalid configuration. " + message);
  }
}

export class AmbiguousAntiResolverPatternError extends ConfigRejectionError {
  constructor() {
    super(
      "The ignore pattern must unambiguously reduce all related unions to one member."
    );
  }
}

export class ImpureFragmentDefinitionsError extends ConfigRejectionError {
  constructor() {
    super("All definitions must be fragment definitions.");
  }
}

export class UnmatchedFragmentDefinitionError extends PublicError {
  constructor() {
    super(
      "Missing fragment definition reference, did you initialize with all of your fragment definitions?"
    );
  }
}

export class UnspecifiedSelectionsError extends PublicError {
  constructor() {
    super("Missing selection in field path.");
  }
}

export class UnspecifiedTypeResolverError extends PublicError {
  constructor() {
    super("Missing type resolution for union type.");
  }
}
