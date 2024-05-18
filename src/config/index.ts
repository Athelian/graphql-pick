import { GraphQLSchema } from "graphql";

import { DEFAULT_OPTIONS, DEFAULT_SCHEMA } from "./constants";
import { Options } from "./types";
import { assertValidConfig } from "./validator";

let globalSchema: GraphQLSchema | null = DEFAULT_SCHEMA;
let globalOptions: Options = DEFAULT_OPTIONS;

export function initGQLPick(schema: GraphQLSchema, options?: Options) {
  if (options) {
    assertValidConfig(schema, options);
  }
  globalSchema = schema;
  globalOptions = options || {};
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
