import { ParsedOptions, ValidatedOptions } from "./types";

export function parseOptions(options: ValidatedOptions): ParsedOptions {
  if (options.fragments) {
    return {
      ...options,
      fragments: parseFragments(options.fragments)
    };
  }

  return {
    ...options,
    fragments: []
  };
}

function parseFragments(fragments: NonNullable<ValidatedOptions["fragments"]>) {
  return fragments.flatMap((f) => f.definitions);
}
