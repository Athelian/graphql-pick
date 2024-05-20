import gql from "graphql-tag";

import pick, { initGQLPick as init } from "../..";
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
      circularReferenceDepth: 2
    });
  });

  it("should pick a field from an object type", async () => {
    const expected = gql`
      query {
        user {
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
      ${userFragment}
      ${organizationFragments}
    `;
    const result = pick([
      "user.id",
      "user.__fragment_UserFields",
      "users.__fragment_UserFields",
      "user.organization.__fragment_OrganizationId",
      "user.organization.__fragment_OrganizationName",
      "user.organization.users.id",
      "user.organization.users.__fragment_UserFields"
    ]);

    const expectedResponse = await getResponse(schemaWithMocks, expected);
    const resultResponse = await getResponse(schemaWithMocks, result);

    expect(resultResponse).toEqual(expectedResponse);
  });
});
