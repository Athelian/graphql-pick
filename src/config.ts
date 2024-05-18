import { GraphQLSchema } from "graphql";

const DEFAULT_SCHEMA = null;
const DEFAULT_OPTIONS = {};

let globalSchema: GraphQLSchema | null = DEFAULT_SCHEMA;
let globalOptions: Options = DEFAULT_OPTIONS;

interface Options {
  /** asd */
  noResolve?: string[];
}

export function initGQLPick(schema: GraphQLSchema, options?: Options) {
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
