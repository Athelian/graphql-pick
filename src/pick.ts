import { buildOperationNodeForField } from "@graphql-toolkit/common";

import {
  DocumentNode,
  Kind,
  OperationTypeNode,
  SelectionNode,
  SelectionSetNode
} from "graphql";

import { composeDocument, getOptions, getSchema } from "./config";
import {
  UnspecifiedSelectionsError,
  UnspecifiedTypeResolverError
} from "./errors/public";
import assertValidPick from "./validator";

export default function pick(fieldPaths: string[]): DocumentNode {
  assertValidPick(fieldPaths);

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
    const fragment = options.fragments?.find(
      (f) => f.name.value === iPaths.find((p) => p.startsWith("__"))?.slice(2)
    );
    const selectionSet = selectionSets.pop() as SelectionSetNode;

    if (fragment) {
      selectionSet.selections = [
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

  return composeDocument(operationDefinition);
}
