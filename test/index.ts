"use strict";

import { buildOperationNodeForField } from "@graphql-toolkit/common";
import assert from "assert";

import {
  ASTNode,
  Kind,
  OperationDefinitionNode,
  OperationTypeNode,
  SelectionNode,
  SelectionSetNode,
  graphql,
  print
} from "graphql";
import gql from "graphql-tag";

import schemaWithMocks, { schema } from "./mocks.js";

export default function pick(fieldPaths: string[]): OperationDefinitionNode {
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

    const iPaths = fieldPathSplits.map((fps) => fps[i]);
    const selectionSet = selectionSets.pop() as SelectionSetNode;

    for (let i = selectionSet.selections.length - 1; i >= 0; i--) {
      let selection = selectionSet.selections[i];
      let toDelete = false;

      switch (selection.kind) {
        case Kind.INLINE_FRAGMENT:
          if (selection.typeCondition?.kind === Kind.NAMED_TYPE) {
            const iPathTypeSelections = iPaths.filter(
              (p) => p[0] === p[0].toUpperCase()
            );
            if (!iPathTypeSelections.length) {
              throw new Error("No union type selections found in fieldPaths");
            }
            if (!iPaths.includes(selection.typeCondition.name.value)) {
              toDelete = true;
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
      throw new Error("No selections found in fieldPaths");
    }

    hasFieldSelection = false;
    i++;
  }

  return operationDefinition;
}

// picks a field from an object type
async function test1() {
  const expected = gql`
    query {
      user {
        name
      }
    }
  `;
  const result = pick(["user.name"]);

  const expectedResponse = await getResponse(expected);
  const resultResponse = await getResponse(result);

  return assert.deepEqual(expectedResponse, resultResponse);
}

// picks a field from a union type
async function test2() {
  const expected = gql`
    query {
      user {
        organization {
          ... on Organization {
            name
          }
        }
      }
    }
  `;
  const result = pick(["user.organization.Organization.name"]);

  const expectedResponse = await getResponse(expected);
  const resultResponse = await getResponse(result);

  assert.deepEqual(expectedResponse, resultResponse);
}

// throws an error if no selections are found in fieldPaths
async function test3() {
  const result = pick(["user"]);

  const resultResponse = await getResponse(result);
}

try {
  for (const test of [test1, test2, test3]) {
    await test();
  }
  console.log("All tests passed");
} catch (e) {
  console.error(e);
}

function getResponse(ast: ASTNode) {
  return graphql({
    schema: schemaWithMocks,
    source: print(ast)
  });
}
