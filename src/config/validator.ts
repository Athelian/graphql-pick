import { GraphQLSchema, Kind } from "graphql";

import {
  AmbiguousAntiResolverPatternError,
  ImpureFragmentDefinitionsError
} from "../errors/public.js";
import { Options } from "./types";

export function assertValidConfiguration(
  schema: GraphQLSchema,
  options: Options
) {
  if (options.fragments) {
    assertValidFragments(schema, options.fragments);
  }
  if (options.noResolve) {
    assertValidAntiResolvePattern(schema, options.noResolve);
  }
}

function assertValidFragments(
  schema: GraphQLSchema,
  fragments: NonNullable<Options["fragments"]>
) {
  fragments.forEach((f) =>
    f.definitions.forEach((d) => {
      if (d.kind !== Kind.FRAGMENT_DEFINITION) {
        throw new ImpureFragmentDefinitionsError();
      }
    })
  );
}

function assertValidAntiResolvePattern(
  schema: GraphQLSchema,
  noResolve: NonNullable<Options["noResolve"]>
) {
  for (const type of Object.values(schema.getTypeMap())) {
    if (!("getTypes" in type)) {
      return;
    }

    const typeMap = type.getTypes();
    const resolves = typeMap.filter(({ name }) => !noResolve.includes(name));

    if (resolves.length === typeMap.length) {
      return; // no match is considered valid
    }

    if (resolves.length !== 1) {
      throw new AmbiguousAntiResolverPatternError();
    }
  }
}
