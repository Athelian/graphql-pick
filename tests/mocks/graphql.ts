import { GraphQLFileLoader } from "@graphql-tools/graphql-file-loader";
import { loadSchemaSync } from "@graphql-tools/load";
import { addMocksToSchema } from "@graphql-tools/mock";
import { makeExecutableSchema } from "@graphql-tools/schema";
import { IResolvers } from "@graphql-tools/utils";
import path from "path";
import { Organization, User } from "./types";

const typeDefs = loadSchemaSync(path.join(__dirname, "schema.graphql"), {
  loaders: [new GraphQLFileLoader()]
});

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
    address: {
      street: "123 Main St.",
      city: "Springfield",
      state: "IL",
      zip: "62701"
    },
    organization: organizations[0],
    previousOrganization: organizations[1]
  },
  {
    id: 2,
    name: "Jane Smith",
    age: 26,
    address: {
      street: "456 Elm St.",
      city: "Springfield",
      state: "IL",
      zip: "62702"
    },
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
