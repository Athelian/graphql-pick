import { GraphQLFileLoader } from "@graphql-tools/graphql-file-loader";
import { loadSchemaSync } from "@graphql-tools/load";
import { DocumentNode, GraphQLSchema } from "graphql";
import { ParsedOptions, ValidatedOptions } from "./types";

export function parseSchema(schema: DocumentNode): GraphQLSchema {
  return loadSchemaSync(schema, {
    loaders: [new GraphQLFileLoader()]
  });
}

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
