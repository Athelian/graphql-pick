import gql from "graphql-tag";

import { print } from "graphql";
import pick, { initPick as init } from "../../src";
import schemaWithMocks, { schema } from "../mocks/graphql";
import { getResponse } from "../utils/index";

describe("pick", () => {
  const userFragment = gql`
    fragment UserFields on User {
      name
      age
    }
  `;
  const organizationFragments = gql`
    fragment OrganizationName on Organization {
      name
    }
    fragment OrganizationId on Organization {
      id
    }
  `;

  beforeAll(() => {
    init(schema, {
      noResolve: ["BadRequest", "Forbidden"],
      fragments: [userFragment, organizationFragments],
      buildOperationNodeForFieldArgs: {
        circularReferenceDepth: 2
      }
    });
  });

  it("should resolve relevant fields based on configuration and selection", async () => {
    const variables = { id: 2 };
    const expected = `
      query ($id: ID!) {
        user(id: $id) {
          id
        }
        currentUser {
          id
          ...UserFields
          organization {
            ...OrganizationId
            ... on Organization {
              ...OrganizationName
              users {
                id
                ...UserFields
              }
            }
          }
        }
        users {
          ...UserFields
        }
      }
      ${print(userFragment)}
      ${print(organizationFragments)}
    `;
    const result = pick([
      "user.id",
      "currentUser.id",
      "currentUser.__fragment_UserFields",
      "users.__fragment_UserFields",
      "currentUser.organization.__fragment_OrganizationId",
      "currentUser.organization.__fragment_OrganizationName",
      "currentUser.organization.users.id",
      "currentUser.organization.users.__fragment_UserFields"
    ]);

    const expectedResponse = await getResponse(
      schemaWithMocks,
      expected,
      variables
    );
    const resultResponse = await getResponse(
      schemaWithMocks,
      result,
      variables
    );

    expect(resultResponse).toEqual(expectedResponse);
  });
});
