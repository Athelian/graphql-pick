import { GraphQLSchema } from "graphql";

import { DEFAULT_OPTIONS, DEFAULT_SCHEMA } from "./constants";
import { parseOptions } from "./parser";
import { Options, ParsedOptions } from "./types";
import { assertValidConfiguration } from "./validator";

let globalSchema: GraphQLSchema | null = DEFAULT_SCHEMA;
let globalOptions: ParsedOptions = DEFAULT_OPTIONS;

export function initGQLPick(schema: GraphQLSchema, options?: Options) {
  globalSchema = schema;

  if (options) {
    assertValidConfiguration(schema, options);
    globalOptions = parseOptions(options);
  }
}

export function getSchema() {
  if (!globalSchema) {
    throw new Error("Pick not initialized. Please call initSchema() first.");
  }
  return globalSchema;
}

export function getOptions() {
  return globalOptions;
}

export function resetGQLPick() {
  globalSchema = DEFAULT_SCHEMA;
  globalOptions = DEFAULT_OPTIONS;
}
