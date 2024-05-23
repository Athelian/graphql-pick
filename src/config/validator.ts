import { Kind } from "graphql";

import { ImpureFragmentDefinitionsError } from "../errors/public.js";
import { Options } from "./types";

export function assertValidConfiguration(options: Options) {
  if (options.fragments) {
    assertValidFragments(options.fragments);
  }
}

function assertValidFragments(fragments: NonNullable<Options["fragments"]>) {
  fragments.forEach((f) =>
    f.definitions.forEach((d) => {
      if (d.kind !== Kind.FRAGMENT_DEFINITION) {
        throw new ImpureFragmentDefinitionsError();
      }
    })
  );
}
