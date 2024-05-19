import { buildOperationNodeForField } from "@graphql-toolkit/common";

import {
  DocumentNode,
  Kind,
  OperationTypeNode,
  SelectionNode,
  SelectionSetNode
} from "graphql";

import configManager from "./config";
import {
  UnspecifiedSelectionsError,
  UnspecifiedTypeResolverError
} from "./errors/public";
import {
  getTypeConditionPaths,
  hasFragmentPath,
  hasTypeConditionPath,
  splitPath
} from "./utils";
import assertValidPick from "./validator";

export default function pick(fieldPaths: string[]): DocumentNode {
  assertValidPick(fieldPaths);

  const schema = configManager.getSchema();
  const options = configManager.getOptions();

  const operationDefinition = buildOperationNodeForField({
    schema,
    kind: OperationTypeNode.QUERY,
    field: "user"
  });

  const selectionSets = [operationDefinition.selectionSet];
  const fieldPathSplits = fieldPaths.map(splitPath);

  let i = 0;
  while (selectionSets.length) {
    let hasFieldSelection = false;
    let hold = false;

    const iPaths = fieldPathSplits.map((fps) => fps[i]).filter(Boolean);
    const iSelectionSet = selectionSets.pop() as SelectionSetNode;

    const isHasFragmentPath = hasFragmentPath(iPaths);

    if (isHasFragmentPath) {
      const fragments = configManager.composeFragments(iPaths);
      (iSelectionSet.selections as SelectionNode[]).push(...fragments);
    }

    const iHasTypeConditionPath = hasTypeConditionPath(iPaths);
    if (!options.noResolve && !iHasTypeConditionPath && !hasFragmentPath) {
      throw new UnspecifiedTypeResolverError();
    }

    for (let j = iSelectionSet.selections.length - 1; j >= 0; j--) {
      let selection = iSelectionSet.selections[j];
      let toDelete = false;

      switch (selection.kind) {
        case Kind.INLINE_FRAGMENT:
          if (selection.typeCondition?.kind === Kind.NAMED_TYPE) {
            if (options.noResolve) {
              if (
                options.noResolve.includes(selection.typeCondition.name.value)
              ) {
                toDelete = true;
                hold = true;
              }
            } else {
              const iTypeConditionPaths = getTypeConditionPaths(iPaths);

              if (
                !iTypeConditionPaths.includes(
                  selection.typeCondition.name.value
                )
              ) {
                toDelete = true;
              }
            }
          }
          break;
        case Kind.FIELD:
          if (!iPaths.includes(selection.name.value)) {
            toDelete = true;
          }
          break;
      }

      if (toDelete) {
        (iSelectionSet.selections as SelectionNode[]).splice(j, 1);
      } else {
        hasFieldSelection = true;
        if ("selectionSet" in selection && selection.selectionSet?.selections) {
          selectionSets.push(selection.selectionSet);
        }
      }
    }

    if (hasFieldSelection === false) {
      throw new UnspecifiedSelectionsError();
    }

    if (!hold) {
      i++;
    }

    hold = false;
    hasFieldSelection = false;
  }

  return configManager.composeDocument(operationDefinition);
}
