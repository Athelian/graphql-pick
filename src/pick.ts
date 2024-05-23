import { buildOperationNodeForField } from "./buildOperationNodeForField.js";

import {
  DocumentNode,
  FragmentDefinitionNode,
  FragmentSpreadNode,
  Kind,
  NameNode,
  OperationDefinitionNode,
  VariableDefinitionNode
} from "graphql";

import configManager from "./config/index.js";
import {
  isAliasPath,
  isFragmentPath,
  normalizeAliasPath,
  parseAliasPath,
  parseFragmentPath,
  splitPath,
  splitPaths
} from "./utils/index.js";
import assertValidPick from "./validator.js";

let fragments: Set<FragmentDefinitionNode> = new Set();

export default function pick(fieldPaths: string[]): DocumentNode {
  fragments = new Set();
  const rootPaths = new Set(splitPaths(fieldPaths).map((fps) => fps[0]));
  const rootPathMap = new Map<string, string[]>();

  for (const rootPath of rootPaths) {
    const paths = fieldPaths.filter((p) => splitPath(p)[0] === rootPath);
    rootPathMap.set(
      rootPath,
      paths.map((p) => p.split(".").slice(1).join("."))
    );
  }

  const operations = [];

  for (const [field, fieldPaths] of rootPathMap) {
    const operation = buildOperationNodeForPaths(field, fieldPaths);
    operations.push(operation);
  }

  for (const operation of operations) {
    if (operation.variableDefinitions) {
      (operation.variableDefinitions as VariableDefinitionNode[]) =
        operation.variableDefinitions?.filter((vd) => {
          return !vd.variable.name.value.includes("_");
        });
    }
  }

  return configManager.composeDocument(operations, fragments);
}

function buildOperationNodeForPaths(field: string, fieldPaths: string[]): OperationDefinitionNode {
  assertValidPick(fieldPaths);

  const schema = configManager.getSchema();

  const selectedFields = createSelectedFieldsFromFieldPaths(fieldPaths);

  const operationDefinition = buildOperationNodeForField({
    schema,
    field,
    selectedFields
  });

  return operationDefinition;
}

function createSelectedFieldsFromFieldPaths(fieldPaths: string[]): Record<string, any> {
  const result: Record<string, any> = {};

  for (const path of fieldPaths) {
    const paths = splitPath(path);
    let current = result;

    for (let i = 0; i < paths.length; i++) {
      const path = paths[i];
      if (isFragmentPath(path)) {
        const frag = configManager.findFragmentByPath(path);
        if (frag) {
          fragments.add(frag);
          current[path] = {
            kind: Kind.FRAGMENT_SPREAD,
            name: {
              kind: Kind.NAME,
              value: parseFragmentPath(path)
            },
            directives: []
          } as FragmentSpreadNode;
        }
      } else if (isAliasPath(path)) {
        const alias = parseAliasPath(path) as string;
        const node: NameNode = {
          kind: Kind.NAME,
          value: alias
        };
        current[normalizeAliasPath(path)] = node;
      } else if (i === paths.length - 1) {
        current[path] = true;
      } else {
        if (!current[path]) {
          current[path] = {};
        }
        current = current[path];
      }
    }
  }

  return result;
}
