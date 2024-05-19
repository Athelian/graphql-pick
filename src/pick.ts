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
import {
  UnspecifiedSelectionsError,
  UnspecifiedTypeResolverError
} from "./errors/public";
import { getSomeFragmentPath, getTypeConditionPaths, splitPath } from "./utils";
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

  if (!("selectionSet" in operationDefinition)) return operationDefinition;

  const selectionSets = [operationDefinition.selectionSet];
  const fieldPathSplits = fieldPaths.map(splitPath);

  let i = 0;
  while (selectionSets.length) {
    let hasFieldSelection = false;
    let repeat = false;

    const iPaths = fieldPathSplits.map((fps) => fps[i]).filter(Boolean);
    const iSelectionSet = selectionSets.pop() as SelectionSetNode;

    const fragmentPath = getSomeFragmentPath(iPaths);
    if (fragmentPath) {
      const fragment = options.fragments?.find(
        (f) => f.name.value === fragmentPath
      ) as FragmentDefinitionNode; // already validated
      iSelectionSet.selections = [
        {
          kind: Kind.FRAGMENT_SPREAD,
          name: {
            kind: Kind.NAME,
            value: fragment.name.value
          },
          directives: []
        }
      ];
      continue;
    }

    for (let i = iSelectionSet.selections.length - 1; i >= 0; i--) {
      let selection = iSelectionSet.selections[i];
      let toDelete = false;

      switch (selection.kind) {
        case Kind.INLINE_FRAGMENT:
          if (selection.typeCondition?.kind === Kind.NAMED_TYPE) {
            if (options.noResolve) {
              if (
                options.noResolve.includes(selection.typeCondition.name.value)
              ) {
                toDelete = true;
                repeat = true;
              }
            } else {
              const iTypeConditionPaths = getTypeConditionPaths(iPaths);
              if (!iTypeConditionPaths.length) {
                throw new UnspecifiedTypeResolverError();
              }
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
        (iSelectionSet.selections as SelectionNode[]).splice(i, 1);
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

    if (!repeat) {
      i++;
    }

    repeat = false;
    hasFieldSelection = false;
  }

  return configManager.composeDocument(operationDefinition);
}
