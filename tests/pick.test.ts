import gql from "graphql-tag";

import pick, { initSchema } from "../";
import schemaWithMocks from "./mocks/graphqlMocks";
import { schema } from "./mocks/graphqlMocks";
import { getResponse } from "./utils/index";
import {
  UnspecifiedSelectionsError,
  UnspecifiedTypeResolverError
} from "../src/errors";

describe("pick", () => {
  initSchema(schema);
  it("should pick a field from an object type", async () => {
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

    expect(expectedResponse).toEqual(resultResponse);
  });

  it("should throw if no selections are found in fieldPaths", async () => {
    await expect(() => pick(["user"])).toThrow(UnspecifiedSelectionsError);
  });

  it("should pick a field from a resolved type", async () => {
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

    expect(expectedResponse).toEqual(resultResponse);
  });

  it("should throw if no type resolution is specified", async () => {
    const myFunction = () => pick(["user.organization.name"]);
    await expect(myFunction).toThrow(UnspecifiedTypeResolverError);
    await expect(myFunction).toThrow("Missing type resolution for union type.");
  });
});
