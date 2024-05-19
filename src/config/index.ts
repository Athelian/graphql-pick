import {
  DocumentNode,
  FragmentDefinitionNode,
  FragmentSpreadNode,
  GraphQLSchema,
  Kind,
  OperationDefinitionNode
} from "graphql";

import {
  DocumentUninitializedError,
  SchemaUninitializedError
} from "../errors/internal";
import { getFragmentPaths } from "../utils";
import { DEFAULT_OPTIONS } from "./constants";
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

  public composeDocument(
    definition: OperationDefinitionNode,
    operationFragments: FragmentDefinitionNode[]
  ) {
    if (!this.document) {
      throw new DocumentUninitializedError();
    }

    return {
      ...this.document,
      definitions: [definition, ...operationFragments]
    };
  }

  public findFragments(paths: string[]) {
    if (!this.options.fragments) {
      throw new Error("Fragments are not initialized");
    }
    const fragmentPaths = getFragmentPaths(paths);

    return this.options.fragments.filter((f) =>
      fragmentPaths.includes(f.name.value)
    );
  }

  public composeFragments(
    fragments: FragmentDefinitionNode[]
  ): FragmentSpreadNode[] {
    return fragments.map((f) => ({
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
