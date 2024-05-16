"use strict";

import equal from "fast-deep-equal";
import { DocumentNode, Kind, SelectionNode, SelectionSetNode } from "graphql";
import gql from "graphql-tag";

export default function pick(
  document: DocumentNode,
  fieldPaths: string[]
): DocumentNode {
  const def = document.definitions[0];
  if (!("selectionSet" in def)) return document;

  const selectionSets = [def.selectionSet];
  const fieldPathSplits = fieldPaths.map((fp) => fp.split("."));

  for (let i = 0; selectionSets.length; i++) {
    const iPaths = fieldPathSplits.map((fps) => fps[i]);
    const selectionSet = selectionSets.pop() as SelectionSetNode;

    for (let i = 0; i < selectionSet.selections.length; i++) {
      let selection = selectionSet.selections[i];

      if ("selectionSet" in selection && selection.selectionSet?.selections) {
        selectionSets.push(selection.selectionSet);
      }

      switch (selection.kind) {
        case Kind.INLINE_FRAGMENT:
          if (
            selection.typeCondition?.name.value &&
            iPaths.includes(selection.typeCondition.name.value)
          ) {
            selectionSets.push(selection.selectionSet);
          }
          break;
        case Kind.FIELD:
          if (!iPaths.includes(selection.name.value)) {
            (selectionSet.selections as SelectionNode[]).splice(i, 1);
          }
          break;
      }
    }
  }

  return document;
}

// removes a field from an object type
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
        age
      }
    }
  `;

  const result = pick(initial, ["user.name"]);

  if (!equal(result.definitions, expected.definitions)) {
    throw new Error("Error");
  }
}

// removes a field from an line fragment type
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

  if (!equal(result.definitions, expected.definitions)) {
    throw new Error("Error");
  }
}

[
  test1, //
  test2
].forEach((func) => {
  try {
    func();
    console.log("Success");
  } catch (e) {
    console.error("Error");
  }
});
