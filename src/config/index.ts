import {
  DocumentNode,
  FragmentSpreadNode,
  GraphQLSchema,
  Kind,
  OperationDefinitionNode
} from "graphql";

import {
  DocumentUninitializedError,
  SchemaUninitializedError
} from "../errors/internal";
import { DEFAULT_OPTIONS, FRAGMENT_DELIMITER } from "./constants";
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

  public findFragments(paths: string[]) {
    if (!this.options.fragments) {
      throw new Error("Fragments are not initialized");
    }

    return this.options.fragments.filter(
      (f) =>
        f.name.value ===
        paths
          .find((p) => p.startsWith(FRAGMENT_DELIMITER))
          ?.slice(FRAGMENT_DELIMITER.length)
    );
  }

  public composeFragments(paths: string[]): FragmentSpreadNode[] {
    return this.findFragments(paths).map((f) => ({
      kind: Kind.FRAGMENT_SPREAD,
      name: {
        kind: Kind.NAME,
        value: f.name.value
      },
      directives: []
    }));
  }
}

const instance = ConfigManager.getInstance();
export default instance;
