import gql from "graphql-tag";

import pick, { initGQLPick as init, resetGQLPick as reset } from "../..";
import {
  AmbiguousAntiResolverPatternError,
  UnspecifiedSelectionsError
} from "../../src/errors/public";
import schemaWithMocks, { schema } from "../mocks/graphql";
import { getResponse } from "../utils/index";

describe("pick without options", () => {
  beforeAll(() => {
    init(schema);
  });

  it("should throw if no selections are found in fieldPaths", async () => {
    await expect(() => pick(["currentUser"])).toThrow(
      UnspecifiedSelectionsError
    );
  });

  it("should throw if no type resolution is specified", async () => {
    const myFunction = () => pick(["currentUser.organization.name"]);
    await expect(myFunction).toThrow(UnspecifiedSelectionsError);
    await expect(myFunction).toThrow("Missing selection in field path.");
  });

  it("should pick a field from an object type", async () => {
    const expected = gql`
      query {
        currentUser {
          name
        }
      }
    `;
    const result = pick(["currentUser.name"]);

    const expectedResponse = await getResponse(schemaWithMocks, expected);
    const resultResponse = await getResponse(schemaWithMocks, result);

    expect(resultResponse).toEqual(expectedResponse);
  });

  it("should pick fields from adjacent root paths", async () => {
    // This is non-trivial considering that `buildOperationNodeForField` only takes one field
    const expected = gql`
      query {
        currentUser {
          name
        }
        users {
          name
        }
      }
    `;
    const result = pick(["currentUser.name", "users.name"]);

    const expectedResponse = await getResponse(schemaWithMocks, expected);
    const resultResponse = await getResponse(schemaWithMocks, result);

    expect(resultResponse).toEqual(expectedResponse);
  });

  it("should pick a field from a resolved type", async () => {
    const expected = gql`
      query {
        currentUser {
          organization {
            ... on Organization {
              name
            }
          }
        }
      }
    `;
    const result = pick(["currentUser.organization.__on_Organization.name"]);
    const expectedResponse = await getResponse(schemaWithMocks, expected);
    const resultResponse = await getResponse(schemaWithMocks, result);

    expect(resultResponse).toEqual(expectedResponse);
  });

  it("should pick fields from multiple paths", async () => {
    const expected = gql`
      query {
        currentUser {
          organization {
            ... on Organization {
              name
            }
          }
          previousOrganization {
            ... on Organization {
              name
            }
          }
        }
      }
    `;
    const result = pick([
      "currentUser.organization.__on_Organization.name",
      "currentUser.previousOrganization.__on_Organization.name"
    ]);
    const expectedResponse = await getResponse(schemaWithMocks, expected);
    const resultResponse = await getResponse(schemaWithMocks, result);

    expect(resultResponse).toEqual(expectedResponse);
  });

  it("should include variables", async () => {
    const variables = {
      id: 1
    };
    const expected = gql`
      query user($id: ID!) {
        user(id: $id) {
          name
        }
      }
    `;
    const result = pick(["user.name"]);
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

describe("pick with invalid options", () => {
  afterAll(() => {
    reset();
  });

  it("should throw on initialization with an ambiguous anti resolution pattern", async () => {
    const myFunction = () => {
      const spottyAntiResolvePattern = ["BadRequest"]; // it should match `(unionMembers.length) - 1` elements in all cases
      init(schema, { noResolve: spottyAntiResolvePattern });
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
          currentUser {
            name
          }
        }
      `;
      init(schema, { fragments: [invalidFragment] });
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
          currentUser {
            name
          }
        }
      `;
      init(schema, { fragments: [invalidFragment] });
    };
    await expect(myFunction).toThrow(Error);
  });
});

describe("pick with anti resolution pattern", () => {
  beforeAll(() => {
    init(schema, { noResolve: ["BadRequest", "Forbidden"] });
  });
  it("should pick a field by auto resolution when supplied with an unambiguous anti resolution pattern", async () => {
    const expected = gql`
      query {
        currentUser {
          organization {
            ... on Organization {
              name
            }
          }
        }
      }
    `;
    const result = pick(["currentUser.organization.name"]);
    const expectedResponse = await getResponse(schemaWithMocks, expected);
    const resultResponse = await getResponse(schemaWithMocks, result);

    expect(resultResponse).toEqual(expectedResponse);
  });
});

describe("pick with circularReferenceDepth", () => {
  beforeAll(() => {
    init(schema, { circularReferenceDepth: 2 });
  });
  it("should pick a field on a circular reference", async () => {
    const expected = gql`
      query {
        currentUser {
          organization {
            ... on Organization {
              users {
                organization {
                  ... on Organization {
                    name
                  }
                }
              }
            }
          }
        }
      }
    `;

    const result = pick([
      "currentUser.organization.__on_Organization.users.organization.__on_Organization.name"
    ]);
    const expectedResponse = await getResponse(schemaWithMocks, expected);
    const resultResponse = await getResponse(schemaWithMocks, result);

    expect(resultResponse).toEqual(expectedResponse);
  });
});

describe("pick with fragment definitions", () => {
  const organizationNameFragment = gql`
    fragment OrganizationName on Organization {
      name
    }
  `;
  const organizationIdFragment = gql`
    fragment OrganizationId on Organization {
      id
    }
  `;

  afterEach(() => {
    reset();
  });

  it("should throw on references to non-existent fragment definition", async () => {
    const myFunction = () => {
      pick([`currentUser.organization.__on_NonExistentFragment`]);
    };
    await expect(myFunction).toThrow(Error);
  });

  it("should pick fields by a fragment definition", async () => {
    init(schema, {
      fragments: [organizationNameFragment]
    });

    const expected = gql`
      query {
        currentUser {
          organization {
            ...OrganizationName
          }
        }
      }

      ${organizationNameFragment}
    `;
    const result = pick([
      `currentUser.organization.__fragment_OrganizationName`
    ]);
    const expectedResponse = await getResponse(schemaWithMocks, expected);
    const resultResponse = await getResponse(schemaWithMocks, result);

    expect(resultResponse).toEqual(expectedResponse);
  });

  it("should pick fields by two fragment definitions", async () => {
    init(schema, {
      fragments: [organizationNameFragment, organizationIdFragment]
    });

    const expected = gql`
      query {
        currentUser {
          organization {
            ...OrganizationName
            ...OrganizationId
          }
        }
      }

      ${organizationNameFragment}
      ${organizationIdFragment}
    `;
    const result = pick([
      "currentUser.organization.__fragment_OrganizationName",
      "currentUser.organization.__fragment_OrganizationId"
    ]);
    const expectedResponse = await getResponse(schemaWithMocks, expected);
    const resultResponse = await getResponse(schemaWithMocks, result);

    expect(resultResponse).toEqual(expectedResponse);
  });

  it("should pick fields across multi fragment definitions", async () => {
    const multiDefinitionFragment = gql`
      fragment OrganizationName on Organization {
        name
      }
      fragment OrganizationId on Organization {
        id
      }
    `;
    init(schema, { fragments: [multiDefinitionFragment] });

    const expected = gql`
      query {
        currentUser {
          organization {
            ...OrganizationName
            ...OrganizationId
          }
        }
      }

      ${organizationNameFragment}
      ${organizationIdFragment}
    `;

    const result = pick([
      "currentUser.organization.__fragment_OrganizationName",
      "currentUser.organization.__fragment_OrganizationId"
    ]);
    const expectedResponse = await getResponse(schemaWithMocks, expected);
    const resultResponse = await getResponse(schemaWithMocks, result);

    expect(resultResponse).toEqual(expectedResponse);
  });
});
