import gql from "graphql-tag";

import pick, { initGQLPick as init, resetGQLPick as reset } from "../";
import {
  AmbiguousAntiResolverPatternError,
  UnspecifiedSelectionsError
} from "../src/errors/public";
import schemaWithMocks, { schema } from "./mocks/graphql";
import { getResponse } from "./utils/index";

describe("pick without options", () => {
  beforeAll(() => {
    init(schema);
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

    expect(resultResponse).toEqual(expectedResponse);
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
    const result = pick(["user.organization.__on_Organization.name"]);
    const expectedResponse = await getResponse(schemaWithMocks, expected);
    const resultResponse = await getResponse(schemaWithMocks, result);

    expect(resultResponse).toEqual(expectedResponse);
  });

  it("should pick fields from multiple paths", async () => {
    const expected = gql`
      query {
        user {
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
      "user.organization.__on_Organization.name",
      "user.previousOrganization.__on_Organization.name"
    ]);
    const expectedResponse = await getResponse(schemaWithMocks, expected);
    const resultResponse = await getResponse(schemaWithMocks, result);

    expect(resultResponse).toEqual(expectedResponse);
  });

  it("should throw if no type resolution is specified", async () => {
    const myFunction = () => pick(["user.organization.name"]);
    await expect(myFunction).toThrow(UnspecifiedSelectionsError);
    await expect(myFunction).toThrow("Missing selection in field path.");
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
          user {
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
          user {
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
      pick([`user.organization.__on_NonExistentFragment`]);
    };
    await expect(myFunction).toThrow(Error);
  });

  it("should pick fields by a fragment definition", async () => {
    init(schema, {
      fragments: [organizationNameFragment]
    });

    const expected = gql`
      query {
        user {
          organization {
            ...OrganizationName
          }
        }
      }

      ${organizationNameFragment}
    `;
    const result = pick([`user.organization.__fragment_OrganizationName`]);
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
        user {
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
      "user.organization.__fragment_OrganizationName",
      "user.organization.__fragment_OrganizationId"
    ]);
    const expectedResponse = await getResponse(schemaWithMocks, expected);
    const resultResponse = await getResponse(schemaWithMocks, result);

    expect(resultResponse).toEqual(expectedResponse);
  });

  // it("should pick fields by two of the same fragment definition", async () => {
  //   init(schema, { fragments: [organizationNameFragment] });

  //   const expected = gql`
  //     query {
  //       user {
  //         organization {
  //           ...OrganizationName
  //         }
  //         previousOrganization {
  //           ...OrganizationName
  //         }
  //       }
  //     }

  //     ${organizationNameFragment}
  //   `;

  //   const result = pick([
  //     "user.organization.__fragment_OrganizationName",
  //     "user.previousOrganization.__fragment_OrganizationName"
  //   ]);
  //   const expectedResponse = await getResponse(schemaWithMocks, expected);
  //   const resultResponse = await getResponse(schemaWithMocks, result);

  //   expect(resultResponse).toEqual(expectedResponse);
  // });

  // it("should pick a field by two of the same fragment types", async () => {
  //   init(schema, { fragments: [organizationNameFragment] });

  //   const expected = gql`
  //     query {
  //       user {
  //         organization {
  //           ...OrganizationName
  //           ... on Organization {
  //             users {
  //               organization {
  //                 ...OrganizationName
  //               }
  //             }
  //           }
  //         }
  //       }
  //     }

  //     ${organizationNameFragment}
  //   `;

  //   const result = pick([
  //     "user.organization.__fragment_OrganizationName",
  //     "user.organization.__on_Organization.users.organization.__fragment_OrganizationName"
  //   ]);
  //   const expectedResponse = await getResponse(schemaWithMocks, expected);
  //   const resultResponse = await getResponse(schemaWithMocks, result);

  //   expect(resultResponse).toEqual(expectedResponse);
  // });
});
