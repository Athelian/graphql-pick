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

  const selectedFields = createNestedJsonFromPaths(fieldPaths);

  const operationDefinition = buildOperationNodeForField({
    schema,
    field,
    selectedFields
  });

  return operationDefinition;
}

function createNestedJsonFromPaths(paths: string[]): Record<string, any> {
  const result: Record<string, any> = {};

  for (const path of paths) {
    const parts = path.split(".");
    let current = result;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (isFragmentPath(part)) {
        const frag = configManager.findFragment(part);
        if (frag) {
          const node: FragmentSpreadNode = {
            kind: Kind.FRAGMENT_SPREAD,
            name: {
              kind: Kind.NAME,
              value: parseFragmentPath(part)
            },
            directives: []
          };
          current[part] = node;
          fragments.add(frag);
        }
      } else if (isAliasPath(part)) {
        const alias = parseAliasPath(part);
        if (alias) {
          const node: NameNode = {
            kind: Kind.NAME,
            value: alias
          };
          current[normalizeAliasPath(part)] = node;
        }
      } else if (i === parts.length - 1) {
        current[part] = true;
      } else {
        if (!current[part]) {
          current[part] = {};
        }
        current = current[part];
      }
    }
  }

  return result;
}
