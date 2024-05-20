import { addMocksToSchema } from "@graphql-tools/mock";
import { makeExecutableSchema } from "@graphql-tools/schema";
import { IResolvers } from "@graphql-tools/utils";
import { Organization, User } from "./types";

const typeDefs = `
  union OrganizationPayload = BadRequest | Forbidden | Organization

  type BadRequest {
    reason: String!
  }

  type Forbidden {
    reason: String!
  }

  type Organization {
    id: ID!
    name: String!
    users: [User]
  }

  type User {
    id: ID!
    name: String!
    age: Int
    organization: OrganizationPayload
    previousOrganization: OrganizationPayload
  }

  type Query {
    currentUser: User
    user(id: ID!): User
    users: [User]
    organization(id: ID!): Organization
  }
`;

const organizations: Organization[] = [
  {
    id: 1,
    name: "Acme Inc.",
    users: []
  },
  {
    id: 2,
    name: "Globex Corp.",
    users: []
  }
];

const users: User[] = [
  {
    id: 1,
    name: "John Doe",
    age: 30,
    organization: organizations[0],
    previousOrganization: organizations[1]
  },
  {
    id: 2,
    name: "Jane Smith",
    age: 26,
    organization: organizations[1],
    previousOrganization: organizations[0]
  }
];

organizations[0].users.push(users[0]);
organizations[1].users.push(users[1]);

const resolver: IResolvers = {
  Query: {
    currentUser: () => {
      return users[0];
    },
    user: (_: unknown, { id }: { id: string }) => {
      return users.find((u: any) => u.id === parseInt(id));
    },
    users: () => {
      return users;
    },
    organization: (_: unknown, { id }: { id: string }) => {
      return organizations.find((o: any) => o.id === parseInt(id));
    }
  },
  OrganizationPayload: {
    __resolveType(obj: unknown) {
      return "Organization";
    }
  }
};

export const schema = makeExecutableSchema({
  typeDefs,
  resolvers: [resolver],
  resolverValidationOptions: {
    requireResolversForResolveType: "error"
  }
});

const schemaWithMocks = addMocksToSchema({ schema, preserveResolvers: true });

export default schemaWithMocks;
