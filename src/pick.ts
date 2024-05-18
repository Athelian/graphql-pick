import { buildOperationNodeForField } from "@graphql-toolkit/common";

import {
  Kind,
  OperationDefinitionNode,
  OperationTypeNode,
  SelectionNode,
  SelectionSetNode
} from "graphql";

import { getOptions, getSchema } from "./config";
import {
  UnspecifiedSelectionsError,
  UnspecifiedTypeResolverError
} from "./errors";

export default function pick(fieldPaths: string[]): OperationDefinitionNode {
  const schema = getSchema();
  const options = getOptions();

  const operationDefinition = buildOperationNodeForField({
    schema,
    kind: OperationTypeNode.QUERY,
    field: "user"
  });

  if (!("selectionSet" in operationDefinition)) return operationDefinition;

  const selectionSets = [operationDefinition.selectionSet];
  const fieldPathSplits = fieldPaths.map((fp) => fp.split("."));

  let i = 0;
  while (selectionSets.length) {
    let hasFieldSelection = false;
    let walkBack = false;

    const iPaths = fieldPathSplits.map((fps) => fps[i]);
    const selectionSet = selectionSets.pop() as SelectionSetNode;

    for (let i = selectionSet.selections.length - 1; i >= 0; i--) {
      let selection = selectionSet.selections[i];
      let toDelete = false;

      switch (selection.kind) {
        case Kind.INLINE_FRAGMENT:
          if (selection.typeCondition?.kind === Kind.NAMED_TYPE) {
            if (options.noResolve) {
              if (
                options.noResolve.includes(selection.typeCondition.name.value)
              ) {
                toDelete = true;
                walkBack = true;
              }
            } else {
              const iPathTypeSelections = iPaths.filter(
                (p) => p[0] === p[0].toUpperCase()
              );
              if (!iPathTypeSelections.length) {
                throw new UnspecifiedTypeResolverError();
              }
              if (!iPaths.includes(selection.typeCondition.name.value)) {
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
        (selectionSet.selections as SelectionNode[]).splice(i, 1);
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

    if (!walkBack) {
      i++;
    }

    walkBack = false;
    hasFieldSelection = false;
  }

  return operationDefinition;
}
