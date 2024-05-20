export type User = {
  id: number;
  name: string;
  age: number;
  organization: Organization;
  previousOrganization: Organization;
};

export type Organization = {
  id: number;
  name: string;
  users: User[];
};
