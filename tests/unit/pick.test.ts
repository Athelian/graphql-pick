import gql from "graphql-tag";

import pick, { initPick as init, resetPick as reset } from "../../src";
import schemaWithMocks, { schema } from "../mocks/graphql";
import { getResponse } from "../utils/index";

describe("pick without options", () => {
  beforeAll(() => {
    init(schema);
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
    const result = pick(["currentUser.organization.name"]);
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
    const result = pick(["currentUser.organization.name", "currentUser.previousOrganization.name"]);
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
    const expectedResponse = await getResponse(schemaWithMocks, expected, variables);
    const resultResponse = await getResponse(schemaWithMocks, result, variables);

    expect(resultResponse).toEqual(expectedResponse);
  });

  // TODO: select variables from relevant field selections only
  it("should omit variable definitions from nested queries", async () => {
    const expected = gql`
      query user($id: ID!) {
        user(id: $id) {
          organization {
            ... on Organization {
              name
            }
          }
        }
      }
    `;
    const result = pick(["user.organization.name"]);

    expect((expected.definitions[0] as any).variableDefinitions?.length).toEqual(
      (result.definitions[0] as any).variableDefinitions?.length
    );
  });

  it("should inject variables", async () => {
    const variables = {
      id: 1
    };
    const expected = gql`
      query user($id: ID!) {
        user(id: $id) {
          organization {
            ... on Organization {
              name
            }
          }
        }
      }
    `;
    const result = pick(["user.organization.name"]);
    const expectedResponse = await getResponse(schemaWithMocks, expected, variables);
    const resultResponse = await getResponse(schemaWithMocks, result, variables);

    expect(resultResponse).toEqual(expectedResponse);
  });

  it("should support field aliasing", async () => {
    const expected = gql`
      query {
        currentUser {
          fullName: name
        }
      }
    `;
    const result = pick(["currentUser.__alias_fullName_name"]);
    const expectedResponse = await getResponse(schemaWithMocks, expected);
    const resultResponse = await getResponse(schemaWithMocks, result);

    expect(resultResponse).toEqual(expectedResponse);
  });

  it("should pick fields with a name", async () => {
    const expected = gql`
      query {
        currentUser {
          company: organization {
            ... on Organization {
              name
            }
          }
        }
      }
    `;
    const result = pick(["currentUser.__alias_company_organization.name"]);
    const expectedResponse = await getResponse(schemaWithMocks, expected);
    const resultResponse = await getResponse(schemaWithMocks, result);

    expect(resultResponse).toEqual(expectedResponse);
  });
});

describe("pick with invalid options", () => {
  afterAll(() => {
    reset();
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

describe("pick with fragment definitions", () => {
  const modelIdFragment = gql`
    fragment ModelId on Model {
      id
    }
  `;
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
  const ownedByNameFragment = gql`
    fragment OwnedByName on Owned {
      ownedBy {
        name
      }
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

  it("should include nested fragments", async () => {
    const organizationFragment = gql`
      fragment Organization on Organization {
        name
      }
    `;
    const userFragment = gql`
      fragment User on User {
        organization {
          ...Organization
        }
      }
    `;

    init(schema, { fragments: [organizationFragment, userFragment] });

    const expected = gql`
      query {
        currentUser {
          ...User
        }
      }

      ${organizationFragment}
      ${userFragment}
    `;

    const result = pick(["currentUser.__fragment_User"]);
    const expectedResponse = await getResponse(schemaWithMocks, expected);
    const resultResponse = await getResponse(schemaWithMocks, result);

    expect(resultResponse).toEqual(expectedResponse);
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
    const result = pick([`currentUser.organization.__fragment_OrganizationName`]);
    const expectedResponse = await getResponse(schemaWithMocks, expected);
    const resultResponse = await getResponse(schemaWithMocks, result);

    expect(resultResponse).toEqual(expectedResponse);
  });

  it("should pick fields by an interface fragment", async () => {
    init(schema, {
      fragments: [modelIdFragment]
    });

    const expected = gql`
      query {
        currentUser {
          ...ModelId
        }
      }

      ${modelIdFragment}
    `;
    const result = pick([`currentUser.__fragment_ModelId`]);
    const expectedResponse = await getResponse(schemaWithMocks, expected);
    const resultResponse = await getResponse(schemaWithMocks, result);

    expect(resultResponse).toEqual(expectedResponse);
  });

  it("should pick fields by an interface fragment on a union", async () => {
    init(schema, {
      fragments: [ownedByNameFragment]
    });

    const expected = gql`
      query {
        currentUser {
          posts {
            ... on Post {
              ...OwnedByName
            }
          }
        }
      }

      ${ownedByNameFragment}
    `;
    const result = pick([`currentUser.posts.__fragment_OwnedByName`]);
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

  it("should pick fields with multiple fragment definitions of the same depth", async () => {
    const addressZipFragment = gql`
      fragment AddressZip on Address {
        zip
      }
    `;
    init(schema, { fragments: [addressZipFragment, organizationNameFragment] });

    const expected = gql`
      query {
        currentUser {
          address {
            ...AddressZip
          }
          organization {
            ...OrganizationName
          }
        }
      }

      ${addressZipFragment}
      ${organizationNameFragment}
    `;

    const result = pick([
      "currentUser.address.__fragment_AddressZip",
      "currentUser.organization.__fragment_OrganizationName"
    ]);
    const expectedResponse = await getResponse(schemaWithMocks, expected);
    const resultResponse = await getResponse(schemaWithMocks, result);

    expect(resultResponse).toEqual(expectedResponse);
  });

  it("should pick fields with an aliased fragment", async () => {
    init(schema, { fragments: [organizationNameFragment] });

    const expected = gql`
      query {
        currentUser {
          company: organization {
            ...OrganizationName
          }
        }
      }

      ${organizationNameFragment}
    `;
    const result = pick(["currentUser.__alias_company_organization.__fragment_OrganizationName"]);
    const expectedResponse = await getResponse(schemaWithMocks, expected);
    const resultResponse = await getResponse(schemaWithMocks, result);

    expect(resultResponse).toEqual(expectedResponse);
  });
});
