import gql from "graphql-tag";

import pick, { initGQLPick } from "../";
import { resetGQLPick } from "../src/config";
import {
  AmbiguousAntiResolverPatternError,
  UnspecifiedSelectionsError,
  UnspecifiedTypeResolverError
} from "../src/errors";
import schemaWithMocks, { schema } from "./mocks/graphqlMocks";
import { getResponse } from "./utils/index";

describe("pick", () => {
  beforeAll(() => {
    initGQLPick(schema);
  });

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

describe("pick with invalid options", () => {
  afterAll(() => {
    resetGQLPick();
  });

  it("should throw on initialization with an ambiguous anti resolution pattern", async () => {
    const myFunction = () => {
      const spottyAntiResolvePattern = ["BadRequest"]; // it should match `(unionMembers.length) - 1` elements in all cases
      initGQLPick(schema, { noResolve: spottyAntiResolvePattern });
    };
    await expect(myFunction).toThrow(AmbiguousAntiResolverPatternError);
    await expect(myFunction).toThrow(
      "The ignore pattern must unambiguously reduce all related unions to one member."
    );
  });

  it("should throw on documents without any fragment definitions", async () => {
    const myFunction = () => {
      const invalidFragment = gql`
        query {
          user {
            name
          }
        }
      `;
      initGQLPick(schema, { fragments: [invalidFragment] });
    };
    await expect(myFunction).toThrow(Error);
  });

  it("should throw on documents with any non-fragment definition", async () => {
    const myFunction = () => {
      const invalidFragment = gql`
        fragment OrganizationName on Organization {
          name
        }
        query {
          user {
            name
          }
        }
      `;
      initGQLPick(schema, { fragments: [invalidFragment] });
    };
    await expect(myFunction).toThrow(Error);
  });
});

describe("pick with noResolve", () => {
  beforeAll(() => {
    initGQLPick(schema, { noResolve: ["BadRequest", "Forbidden"] });
  });
  it("should pick a field by auto resolution when supplied with an unambiguous anti resolution pattern", async () => {
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
    const result = pick(["user.organization.name"]);
    const expectedResponse = await getResponse(schemaWithMocks, expected);
    const resultResponse = await getResponse(schemaWithMocks, result);

    expect(expectedResponse).toEqual(resultResponse);
  });
});

describe("pick with fragments", () => {
  const fragment = gql`
    fragment OrganizationName on Organization {
      name
    }
  `;

  beforeAll(() => {
    initGQLPick(schema, { fragments: [fragment] });
  });

  it("should throw on references to non-existent fragments", async () => {
    const myFunction = () => {
      pick([`user.organization.__NonExistentFragment`]);
    };
    await expect(myFunction).toThrow(Error);
  });

  it("should pick a field by a fragment type", async () => {
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
    const result = pick([`user.organization.__OrganizationNameFragment`]);
    const expectedResponse = await getResponse(schemaWithMocks, expected);
    const resultResponse = await getResponse(schemaWithMocks, result);

    expect(expectedResponse).toEqual(resultResponse);
  });
});
