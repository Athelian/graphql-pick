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

  const fieldPathSplits = fieldPaths.map(splitPath);
  const operationDefinition = buildOperationNodeForField({
    schema,
    kind: OperationTypeNode.QUERY,
    circularReferenceDepth: options.circularReferenceDepth,
    field: fieldPathSplits[0][0]
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
                stayPut = true;
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

  return configManager.composeDocument(operationDefinition, operationFragments);
}
