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
  FragmentsUninitializedError,
  SchemaUninitializedError
} from "../errors/internal.js";
import { getFragmentPaths } from "../utils/index.js";
import { DEFAULT_OPTIONS } from "./constants.js";
import { parseOptions, parseSchema } from "./parser.js";
import { Options, ParsedOptions, ValidatedOptions } from "./types";
import { assertValidConfiguration } from "./validator.js";

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

  public init(schema: DocumentNode, options?: Options) {
    this.schema = parseSchema(schema);

    if (options) {
      assertValidConfiguration(this.schema, options);
      this.options = parseOptions(options as ValidatedOptions);
    }

    this.document = {
      kind: Kind.DOCUMENT,
      definitions: [...(this.options?.fragments || [])]
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
    operations: OperationDefinitionNode[],
    operationFragments: Set<FragmentDefinitionNode>
  ) {
    if (!this.document) {
      throw new DocumentUninitializedError();
    }

    const operationsAggregate: OperationDefinitionNode = {
      ...operations[0],
      name: operations.length > 1 ? undefined : operations[0].name,
      selectionSet: {
        kind: Kind.SELECTION_SET,
        selections: [
          ...operations[0].selectionSet.selections,
          ...operations.slice(1).flatMap((o) => o.selectionSet.selections[0])
        ]
      }
    };

    return {
      ...this.document,
      definitions: [operationsAggregate, ...operationFragments]
    };
  }

  public findFragments(paths: string[]) {
    if (!this.options.fragments) {
      throw new FragmentsUninitializedError();
    }
    const fragmentPaths = getFragmentPaths(paths);

    return this.options.fragments.filter((f) => fragmentPaths.includes(f.name.value));
  }

  public composeFragments(fragments: FragmentDefinitionNode[]): FragmentSpreadNode[] {
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
