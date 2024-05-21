export type User = {
  id: number;
  name: string;
  age: number;
  address: Address;
  organization: Organization;
  previousOrganization: Organization;
};

export type Address = {
  street: string;
  city: string;
  state: string;
  zip: string;
};

export type Organization = {
  id: number;
  name: string;
  users: User[];
};
