import { GraphQLSchema } from "graphql";

import { Options } from "./types";
import { AmbiguousAntiResolverPatternError } from "../errors";

export function assertValidConfig(schema: GraphQLSchema, options: Options) {
  if (options.noResolve) {
    assertValidAntiResolvePattern(schema, options.noResolve);
  }
}

function assertValidAntiResolvePattern(
  schema: GraphQLSchema,
  noResolve: NonNullable<Options["noResolve"]>
) {
  for (const type of Object.values(schema.getTypeMap())) {
    if (!("getTypes" in type)) return;

    const typeMap = type.getTypes();
    const resolves = typeMap.filter(({ name }) => !noResolve.includes(name));

    if (resolves.length === typeMap.length) return; // no match is considered valid
    if (resolves.length !== 1) {
      throw new AmbiguousAntiResolverPatternError();
    }
  }
}
