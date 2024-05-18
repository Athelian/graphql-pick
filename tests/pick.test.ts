import assert from "assert";
import gql from "graphql-tag";

import pick, { initSchema } from "../";
import schemaWithMocks from "./mocks/graphqlMocks.js";
import { schema } from "./mocks/graphqlMocks";
import { getResponse } from "./utils/index.js";

initSchema(schema);

try {
  for (const test of [test1, test2, test3]) {
    await test();
  }
  console.log("All tests passed");
} catch (e) {
  console.error(e);
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

  const expectedResponse = await getResponse(schemaWithMocks, expected);
  const resultResponse = await getResponse(schemaWithMocks, result);

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

  const expectedResponse = await getResponse(schemaWithMocks, expected);
  const resultResponse = await getResponse(schemaWithMocks, result);

  assert.deepEqual(expectedResponse, resultResponse);
}

// throws an error if no selections are found in fieldPaths
async function test3() {
  pick(["user"]);
}
