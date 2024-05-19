import {
  DocumentNode,
  GraphQLSchema,
  Kind,
  OperationDefinitionNode
} from "graphql";

import {
  DocumentUninitializedError,
  SchemaUninitializedError
} from "../errors/internal";
import { DEFAULT_OPTIONS, DEFAULT_SCHEMA } from "./constants";
import { parseOptions } from "./parser";
import { Options, ParsedOptions, ValidatedOptions } from "./types";
import { assertValidConfiguration } from "./validator";

let globalSchema: GraphQLSchema | null = DEFAULT_SCHEMA;
let globalOptions: ParsedOptions = DEFAULT_OPTIONS;
let globalDocument: DocumentNode | null = null;

export function init(schema: GraphQLSchema, options?: Options) {
  globalSchema = schema;

  if (options) {
    assertValidConfiguration(schema, options);
    globalOptions = parseOptions(options as ValidatedOptions);
  }

  globalDocument = {
    kind: Kind.DOCUMENT,
    definitions: [...(globalOptions?.fragments ?? [])]
  };
}

export function reset() {
  globalSchema = DEFAULT_SCHEMA;
  globalOptions = DEFAULT_OPTIONS;
}

export function getSchema() {
  if (!globalSchema) {
    throw new SchemaUninitializedError();
  }
  return globalSchema;
}

export function getOptions() {
  return globalOptions;
}

export function getDocument() {
  if (!globalDocument) {
    throw new DocumentUninitializedError();
  }
  return globalDocument;
}

export function composeDocument(definition: OperationDefinitionNode) {
  if (!globalDocument) {
    throw new DocumentUninitializedError();
  }

  return {
    ...globalDocument,
    definitions: [...globalDocument.definitions, definition]
  };
}
