import gql from "graphql-tag";

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
      fragments: [userFragment, organizationFragments]
    });
  });

  it("should resolve relevant fields based on configuration and selection", async () => {
    const variables = { id: 2 };
    const expected = gql`
      query ($id: ID!) {
        user(id: $id) {
          id
        }
        currentUser {
          ... on Model {
            id
          }
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
      ${userFragment}
      ${organizationFragments}
    `;
    const result = pick([
      "user.id",
      "currentUser.id",
      "currentUser.__fragment_UserFields",
      "currentUser.__fragment_ModelId",
      "users.__fragment_UserFields",
      "currentUser.organization.__fragment_OrganizationId",
      "currentUser.organization.__fragment_OrganizationName",
      "currentUser.organization.users.id",
      "currentUser.organization.users.__fragment_UserFields"
    ]);

    const expectedResponse = await getResponse(schemaWithMocks, expected, variables);
    const resultResponse = await getResponse(schemaWithMocks, result, variables);

    expect(resultResponse).toEqual(expectedResponse);
  });
});
