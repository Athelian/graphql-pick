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
import { DEFAULT_OPTIONS, TYPE_CONDITION_DELIMITER } from "./constants";
import { parseOptions } from "./parser";
import { Options, ParsedOptions, ValidatedOptions } from "./types";
import { assertValidConfiguration } from "./validator";

class ConfigManager {
  private static instance: ConfigManager;
  private schema: GraphQLSchema | null = null;
  private options: ParsedOptions = DEFAULT_OPTIONS;
  private document: DocumentNode | null = null;

  private constructor() {}

  public static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  public reset() {
    this.schema = null;
    this.options = DEFAULT_OPTIONS;
    this.document = null;
  }

  public init(schema: GraphQLSchema, options?: Options) {
    this.schema = schema;

    if (options) {
      assertValidConfiguration(schema, options);
      this.options = parseOptions(options as ValidatedOptions);
    }

    this.document = {
      kind: Kind.DOCUMENT,
      definitions: [...(this.options?.fragments ?? [])]
    };
  }

  public getSchema() {
    if (!this.schema) {
      throw new SchemaUninitializedError();
    }
    return this.schema;
  }

  public getOptions() {
    return this.options;
  }

  public getDocument() {
    if (!this.document) {
      throw new DocumentUninitializedError();
    }
    return this.document;
  }

  public composeDocument(definition: OperationDefinitionNode) {
    if (!this.document) {
      throw new DocumentUninitializedError();
    }

    return {
      ...this.document,
      definitions: [...this.document.definitions, definition]
    };
  }

  public findFragment(paths: string[]) {
    if (!this.options.fragments) {
      return undefined;
    }

    return this.options.fragments.find(
      (f) =>
        f.name.value ===
        paths
          .find((p) => p.startsWith(TYPE_CONDITION_DELIMITER))
          ?.slice(TYPE_CONDITION_DELIMITER.length)
    );
  }
}

const instance = ConfigManager.getInstance();
export default instance;
