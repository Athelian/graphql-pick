export type User = {
  __typename: "User";
  id: number;
  name: string;
  age: number;
  posts: Post[];
  address: Address;
  organization: Organization;
  previousOrganization: Organization;
};

export type Address = {
  __typename: "Address";
  street: string;
  city: string;
  state: string;
  zip: string;
};

export type Organization = {
  __typename: "Organization";
  id: number;
  name: string;
  users: User[];
};

export type Post = {
  __typename: "Post";
  id: number;
  ownedBy: User;
  title: string;
  content: string;
};
