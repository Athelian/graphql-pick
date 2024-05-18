import { GraphQLSchema } from "graphql";

let globalSchema: GraphQLSchema | null = null;

export function initSchema(schema: GraphQLSchema) {
  globalSchema = schema;
}

export function getSchema() {
  if (!globalSchema) {
    throw new Error("Pick not initialized. Please call initSchema() first.");
  }
  return globalSchema;
}

