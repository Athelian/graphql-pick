"use strict";

import equal from "fast-deep-equal";
import {
  DocumentNode,
  Kind,
  SelectionNode,
  SelectionSetNode,
  graphql,
  print
} from "graphql";
import gql from "graphql-tag";
import schemaWithMocks from "./mocks";

export default function pick(
  document: DocumentNode,
  fieldPaths: string[]
): DocumentNode {
  const def = document.definitions[0];
  if (!("selectionSet" in def)) return document;

  for (const fieldPath of fieldPaths) {
    const paths = fieldPath.split(".").reverse();
    const selectionSets: SelectionSetNode[] = [def.selectionSet];

    while (paths.length && selectionSets.length) {
      const path = paths.pop() as string;
      const selectionSet = selectionSets.pop() as SelectionSetNode;

      for (let i = 0; i < selectionSet.selections.length; i++) {
        let selection = selectionSet.selections[i];

        if ("selectionSet" in selection && selection.selectionSet?.selections) {
          selectionSets.push(selection.selectionSet);
        }

        switch (selection.kind) {
          case Kind.INLINE_FRAGMENT:
            if (selection.typeCondition?.name.value === path) {
              selectionSets.push(selection.selectionSet);
            }
            break;
          case Kind.FIELD:
            if (selection.name.value !== path) {
              (selectionSet.selections as SelectionNode[]).splice(i, 1);
            }
            break;
        }
      }
    }
  }

  return document;
}

// it should remove a field from an object type
function test1() {
  const initial = gql`
    query {
      user {
        id
        name
      }
    }
  `;

  const expected = gql`
    query {
      user {
        name
      }
    }
  `;

  const result = pick(initial, ["user.name"]);

  if (equal(result.definitions, expected.definitions)) {
    console.log("Success");
  } else {
    console.error("Error");
  }
}

// it should remove the field from a union object type
function test2() {
  const initial = gql`
    query {
      user {
        organization {
          ... on Organization {
            id
            name
          }
        }
      }
    }
  `;

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

  const result = pick(initial, ["user.organization.__Organization.name"]);

  if (equal(result.definitions, expected.definitions)) {
    console.log("Success");
  } else {
    console.error("Error");
  }
}

[
  test1, //
  test2
].forEach((test) => test());

// graphql({
//   schema: schemaWithMocks,
//   source: print(result)
// }).then((result: any) => console.log("Got result", result));
