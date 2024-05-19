import { buildOperationNodeForField } from "@graphql-toolkit/common";

import {
  DocumentNode,
  FragmentDefinitionNode,
  Kind,
  OperationTypeNode,
  SelectionNode,
  SelectionSetNode
} from "graphql";

import configManager from "./config";
import { UnspecifiedSelectionsError } from "./errors/public";
import { getTypeConditionPaths, hasFragmentPath, splitPath } from "./utils";
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
  let operationFragments: FragmentDefinitionNode[] = [];

  const selectionSets = [operationDefinition.selectionSet];
  const fieldPathSplits = fieldPaths.map(splitPath);

  let i = 0;
  while (selectionSets.length) {
    let hasFieldSelection = false;
    let hold = false;

    const paths = fieldPathSplits.map((fps) => fps[i]).filter(Boolean);
    const selectionSet = selectionSets.pop() as SelectionSetNode;

    if (hasFragmentPath(paths)) {
      const fragments = configManager.findFragments(paths);
      operationFragments.push(...fragments);
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
              toDelete = options.noResolve.includes(
                selection.typeCondition.name.value
              );
              hold = toDelete;
            } else {
              toDelete = !getTypeConditionPaths(paths).includes(
                selection.typeCondition.name.value
              );
            }
          }
          break;
        case Kind.FIELD:
          toDelete = !paths.includes(selection.name.value);
          break;
      }

      if (toDelete) {
        (selectionSet.selections as SelectionNode[]).splice(j, 1);
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

  return configManager.composeDocument(operationDefinition, operationFragments);
}
