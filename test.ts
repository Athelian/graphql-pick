"use strict";

import equal from "fast-deep-equal";
import { DocumentNode, Kind } from "graphql";
import gql from "graphql-tag";

const initial = gql`
  query {
    yes
    no
  }
`;

const expected = gql`
  query {
    yes
  }
`;

export default function pick(document: DocumentNode, fields: string[]): DocumentNode {
  const def = document.definitions[0];
  if ("selectionSet" in def) {
    def.selectionSet.selections = def.selectionSet.selections.filter((s) => {
      return s.kind === Kind.FIELD && fields.includes(s.name.value);
    });
  }
  return document;
}

const result = pick(initial, ["yes"]);

console.log(equal(result.definitions, expected.definitions));
