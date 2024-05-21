import { buildOperationNodeForField } from "@graphql-tools/utils";

import {
  DocumentNode,
  FragmentDefinitionNode,
  Kind,
  NameNode,
  OperationDefinitionNode,
  OperationTypeNode,
  SelectionNode,
  SelectionSetNode,
  VariableDefinitionNode
} from "graphql";

import configManager from "./config/index.js";
import { UnspecifiedSelectionsError } from "./errors/public.js";
import {
  getTypeConditionPaths,
  hasFragmentPath,
  normalizeAliasPath,
  parseAliasPath,
  splitPath,
  splitPaths
} from "./utils/index.js";
import assertValidPick from "./validator.js";

export default function pick(fieldPaths: string[]): DocumentNode {
  const rootPaths = new Set(splitPaths(fieldPaths).map((fps) => fps[0]));
  const rootPathMap = new Map<string, string[]>();

  for (const rootPath of rootPaths) {
    const paths = fieldPaths.filter((p) => splitPath(p)[0] === rootPath);
    rootPathMap.set(rootPath, paths);
  }

  const operations = [];
  const fragments = new Set<FragmentDefinitionNode>();

  for (const [field, paths] of rootPathMap) {
    const [operation, operationFragments] = buildOperationNodeForPaths(
      field,
      paths
    );
    operations.push(operation);
    operationFragments.forEach((f) => fragments.add(f));
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

function buildOperationNodeForPaths(
  field: string,
  fieldPaths: string[]
): [OperationDefinitionNode, Set<FragmentDefinitionNode>] {
  assertValidPick(fieldPaths);

  const schema = configManager.getSchema();
  const options = configManager.getOptions();

  const fieldPathSplits = fieldPaths.map(splitPath);
  const operationDefinition = buildOperationNodeForField({
    schema,
    kind: OperationTypeNode.QUERY,
    field,
    ...options.buildOperationNodeForFieldArgs,
    depthLimit: fieldPathSplits.reduce(
      (memo, fps) => Math.max(memo, fps.length),
      0
    )
  });
  let operationFragments: Set<FragmentDefinitionNode> = new Set();

  const selectionSets = [operationDefinition.selectionSet];

  let level = 0;

  while (selectionSets.length) {
    let hasFieldSelection = false;
    let numSelectionSets = selectionSets.length;
    let stayPut = false;

    while (numSelectionSets-- !== 0) {
      const paths = fieldPathSplits.map((fps) => fps[level]).filter(Boolean);
      const selectionSet = selectionSets.shift() as SelectionSetNode;

      if (hasFragmentPath(paths)) {
        const fragments = configManager.findFragments(paths);
        fragments.forEach((f) => operationFragments.add(f));
        (selectionSet.selections as SelectionNode[]).push(
          ...configManager.composeFragments(fragments)
        );
      }

      for (let j = selectionSet.selections.length - 1; j >= 0; j--) {
        let selection = selectionSet.selections[j];
        let toDelete = false;

        switch (selection.kind) {
          case Kind.INLINE_FRAGMENT:
            if (selection.typeCondition?.kind === Kind.NAMED_TYPE) {
              if (options.noResolve) {
                const antiResolveMatch = options.noResolve.includes(
                  selection.typeCondition.name.value
                );
                toDelete = antiResolveMatch;
                stayPut = stayPut || antiResolveMatch;
              } else {
                toDelete = !getTypeConditionPaths(paths).includes(
                  selection.typeCondition.name.value
                );
              }
            }
            break;
          case Kind.FIELD:
            const normalizedPaths = paths.map(normalizeAliasPath);
            const indexOf = normalizedPaths.indexOf(selection.name.value);

            if (indexOf === -1) {
              toDelete = true;
            } else if (paths[indexOf] !== normalizedPaths[indexOf]) {
              const alias = parseAliasPath(paths[indexOf]);
              if (alias) {
                (selection as { alias: NameNode }).alias = {
                  kind: Kind.NAME,
                  value: alias
                };
              }
            }

            break;
        }

        if (toDelete) {
          (selectionSet.selections as SelectionNode[]).splice(j, 1);
        } else {
          hasFieldSelection = true;
          if (
            "selectionSet" in selection &&
            selection.selectionSet?.selections
          ) {
            selectionSets.push(selection.selectionSet);
          }
        }
      }
    }

    if (hasFieldSelection === false) {
      throw new UnspecifiedSelectionsError();
    }

    if (!stayPut) {
      level++;
    }
  }

  return [operationDefinition, operationFragments];
}
