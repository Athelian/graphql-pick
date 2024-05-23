import { getDefinedRootType, getRootTypeNames } from "@graphql-tools/utils";
import {
  ArgumentNode,
  GraphQLArgument,
  GraphQLField,
  GraphQLInputType,
  GraphQLList,
  GraphQLNamedType,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLSchema,
  InlineFragmentNode,
  ListTypeNode,
  NonNullTypeNode,
  OperationTypeNode,
  SelectionNode,
  SelectionSetNode,
  TypeNode,
  getNamedType,
  isEnumType,
  isInterfaceType,
  isListType,
  isNonNullType,
  isObjectType,
  isScalarType,
  isUnionType
} from "graphql";

import {
  DocumentNode,
  FragmentDefinitionNode,
  FragmentSpreadNode,
  Kind,
  NameNode,
  OperationDefinitionNode,
  VariableDefinitionNode
} from "graphql";

import configManager from "./config/index.js";
import {
  isAliasPath,
  isFragmentPath,
  joinPath,
  normalizeAliasPath,
  parseAliasPath,
  parseFragmentPath,
  splitPath,
  splitPaths
} from "./utils/index.js";
import assertValidPick from "./validator.js";

let operations: OperationDefinitionNode[] = [];
let operationFragments: Set<FragmentDefinitionNode> = new Set();
let operationVariables: VariableDefinitionNode[] = [];

function addOperation(operation: OperationDefinitionNode) {
  operations.push(operation);
}

function addOperationVariable(variable: VariableDefinitionNode) {
  operationVariables.push(variable);
}

function addOperationFragment(fragment: FragmentDefinitionNode) {
  operationFragments.add(fragment);
}

function resetOperations() {
  operations = [];
}

function resetOperationFragments() {
  operationFragments = new Set();
}

function resetOperationVariables() {
  operationVariables = [];
}

export type SelectedFields =
  | {
      [key: string]: SelectedFields;
    }
  | boolean
  | FragmentSpreadNode
  | NameNode;

export default function pick(fieldPaths: string[]): DocumentNode {
  assertValidPick(fieldPaths);

  const schema = configManager.getSchema();

  resetOperations();
  resetOperationFragments();
  resetOperationVariables();

  const rootPaths = new Set(splitPaths(fieldPaths).map((fps) => fps[0]));
  const rootPathMap = new Map<string, string[]>();

  for (const rootPath of rootPaths) {
    const paths = fieldPaths
      .filter((p) => rootPath === splitPath(p)[0])
      .map((p) => joinPath(splitPath(p).slice(1)));
    rootPathMap.set(rootPath, paths);
  }

  for (const [field, fieldPaths] of rootPathMap) {
    addOperation(
      buildOperationNodeForField({
        schema,
        field,
        selectedFields: getSelectedFieldsFromFieldPaths(fieldPaths)
      })
    );
  }

  return configManager.composeDocument(operations, operationFragments);
}

function buildOperationNodeForField({
  schema,
  field,
  selectedFields
}: {
  schema: GraphQLSchema;
  field: string;
  selectedFields: SelectedFields;
}) {
  const rootTypeNames = getRootTypeNames(schema);

  const operationNode = buildOperationAndCollectVariables({
    schema,
    fieldName: field,
    kind: OperationTypeNode.QUERY,
    selectedFields,
    rootTypeNames
  });

  (operationNode as any).variableDefinitions = [...operationVariables];

  return operationNode;
}

function buildOperationAndCollectVariables({
  schema,
  fieldName,
  kind,
  selectedFields,
  rootTypeNames
}: {
  schema: GraphQLSchema;
  fieldName: string;
  kind: OperationTypeNode;
  selectedFields: SelectedFields;
  rootTypeNames: Set<string>;
}): OperationDefinitionNode {
  const type = getDefinedRootType(schema, kind);
  const field = type.getFields()[fieldName];
  const operationName = `${fieldName}_${kind}`;

  if (field.args) {
    for (const arg of field.args) {
      const argName = arg.name;
      addOperationVariable(resolveVariable(arg, argName));
    }
  }

  return {
    kind: Kind.OPERATION_DEFINITION,
    operation: kind,
    name: {
      kind: Kind.NAME,
      value: operationName
    },
    variableDefinitions: [],
    selectionSet: {
      kind: Kind.SELECTION_SET,
      selections: [
        resolveField({
          field,
          firstCall: true,
          path: [],
          schema,
          selectedFields,
          rootTypeNames
        })
      ]
    }
  };
}

function resolveSelectionSet({
  type,
  path,
  schema,
  argNames,
  selectedFields,
  rootTypeNames
}: {
  type: GraphQLNamedType;
  path: string[];
  schema: GraphQLSchema;
  selectedFields: SelectedFields;
  argNames?: string[];
  rootTypeNames: Set<string>;
}): SelectionSetNode | void {
  const selectedFragments = getFragmentSpreadsFromSelectedFields(selectedFields);

  if (isUnionType(type)) {
    const types = type.getTypes();

    return {
      kind: Kind.SELECTION_SET,
      selections: types
        .map<InlineFragmentNode | FragmentSpreadNode>((t) => {
          return {
            kind: Kind.INLINE_FRAGMENT,
            typeCondition: {
              kind: Kind.NAMED_TYPE,
              name: {
                kind: Kind.NAME,
                value: t.name
              }
            },
            selectionSet: resolveSelectionSet({
              type: t,
              path,
              schema,
              argNames,
              selectedFields,
              rootTypeNames
            }) as SelectionSetNode
          };
        })
        .filter(
          (fragmentNode) =>
            "selectionSet" in fragmentNode && fragmentNode?.selectionSet?.selections?.length > 0
        )
        .concat(
          selectedFragments.filter((f) => {
            const fragment = configManager.findFragmentByName(f.name.value);
            return type.getTypes().some((t) => t.name === fragment?.typeCondition.name.value);
          })
        )
    };
  }

  if (isInterfaceType(type)) {
    const types = Object.values(schema.getTypeMap()).filter(
      (t: any) => isObjectType(t) && t.getInterfaces().includes(type)
    ) as GraphQLObjectType[];

    return {
      kind: Kind.SELECTION_SET,
      selections: types
        .map<InlineFragmentNode>((t) => {
          return {
            kind: Kind.INLINE_FRAGMENT,
            typeCondition: {
              kind: Kind.NAMED_TYPE,
              name: {
                kind: Kind.NAME,
                value: t.name
              }
            },
            selectionSet: resolveSelectionSet({
              type: t,
              path,
              schema,
              argNames,
              selectedFields,
              rootTypeNames
            }) as SelectionSetNode
          };
        })
        .filter((fragmentNode) => fragmentNode?.selectionSet?.selections?.length > 0)
    };
  }

  if (isObjectType(type) && !rootTypeNames.has(type.name)) {
    const fields = type.getFields();

    return {
      kind: Kind.SELECTION_SET,
      selections: Object.keys(fields)
        .map((fieldName) => {
          const selectedSubFields =
            typeof selectedFields === "object" ? (selectedFields as any)[fieldName] : true;
          if (selectedSubFields) {
            return resolveField({
              field: fields[fieldName],
              alias: selectedSubFields.kind === Kind.NAME ? selectedSubFields : undefined,
              path: [...path, fieldName],
              schema,
              selectedFields: selectedSubFields,
              rootTypeNames
            });
          }
          return null;
        })
        .filter((f): f is SelectionNode => {
          if (f == null) {
            return false;
          } else if ("selectionSet" in f) {
            return !!f.selectionSet?.selections?.length;
          }
          return true;
        })
        .concat(
          selectedFragments.filter((f) => {
            const fragment = configManager.findFragmentByName(f.name.value);
            return type.name === fragment?.typeCondition.name.value;
          })
        )
    };
  }
}

function resolveVariable(arg: GraphQLArgument, name?: string): VariableDefinitionNode {
  function resolveVariableType(type: GraphQLList<any>): ListTypeNode;
  function resolveVariableType(type: GraphQLNonNull<any>): NonNullTypeNode;
  function resolveVariableType(type: GraphQLInputType): TypeNode;
  function resolveVariableType(type: GraphQLInputType): TypeNode {
    if (isListType(type)) {
      return {
        kind: Kind.LIST_TYPE,
        type: resolveVariableType(type.ofType)
      };
    }

    if (isNonNullType(type)) {
      return {
        kind: Kind.NON_NULL_TYPE,
        type: resolveVariableType(type.ofType) as any
      };
    }

    return {
      kind: Kind.NAMED_TYPE,
      name: {
        kind: Kind.NAME,
        value: type.name
      }
    };
  }

  return {
    kind: Kind.VARIABLE_DEFINITION,
    variable: {
      kind: Kind.VARIABLE,
      name: {
        kind: Kind.NAME,
        value: name || arg.name
      }
    },
    type: resolveVariableType(arg.type)
  };
}

function resolveField({
  field,
  alias,
  firstCall,
  path,
  schema,
  selectedFields,
  rootTypeNames
}: {
  field: GraphQLField<any, any>;
  alias?: NameNode;
  path: string[];
  firstCall?: boolean;
  schema: GraphQLSchema;
  selectedFields: SelectedFields;
  rootTypeNames: Set<string>;
}): SelectionNode {
  const namedType = getNamedType(field.type);
  let args: ArgumentNode[] = [];
  let removeField = false;

  if (field.args && field.args.length) {
    args = field.args
      .map<ArgumentNode>((arg) => {
        const argumentName = getArgumentName(arg.name, path);
        if (!firstCall) {
          addOperationVariable(resolveVariable(arg, argumentName));
        }

        return {
          kind: Kind.ARGUMENT,
          name: {
            kind: Kind.NAME,
            value: arg.name
          },
          value: {
            kind: Kind.VARIABLE,
            name: {
              kind: Kind.NAME,
              value: getArgumentName(arg.name, path)
            }
          }
        };
      })
      .filter(Boolean);
  }

  if (removeField) {
    return null as any;
  }

  const fieldPath = [...path, field.name];

  if (!isScalarType(namedType) && !isEnumType(namedType)) {
    return {
      kind: Kind.FIELD,
      name: {
        kind: Kind.NAME,
        value: field.name
      },
      selectionSet:
        resolveSelectionSet({
          type: namedType,
          path: fieldPath,
          schema,
          selectedFields,
          rootTypeNames
        }) || undefined,
      arguments: args
    };
  }

  return {
    alias,
    kind: Kind.FIELD,
    name: {
      kind: Kind.NAME,
      value: field.name
    },
    arguments: args
  };
}

function getArgumentName(name: string, path: string[]): string {
  return [...path, name].join("_");
}

function getSelectedFieldsFromFieldPaths(fieldPaths: string[]): SelectedFields {
  const result: Record<string, any> = {};

  for (const path of fieldPaths) {
    let current = result;
    const paths = splitPath(path);

    for (let i = 0; i < paths.length; i++) {
      const path = paths[i];
      if (isFragmentPath(path)) {
        const fragment = configManager.findFragmentByPath(path);
        if (fragment) {
          addOperationFragment(fragment);
          const node: FragmentSpreadNode = {
            kind: Kind.FRAGMENT_SPREAD,
            name: {
              kind: Kind.NAME,
              value: parseFragmentPath(path)
            },
            directives: []
          };
          current[path] = node;
        }
      } else if (isAliasPath(path)) {
        const alias = parseAliasPath(path) as string;
        const node: NameNode = {
          kind: Kind.NAME,
          value: alias
        };
        current[normalizeAliasPath(path)] = node;
      } else if (i === paths.length - 1) {
        current[path] = true;
      } else {
        if (!current[path]) {
          current[path] = {};
        }
        current = current[path];
      }
    }
  }

  return result;
}

function getFragmentSpreadsFromSelectedFields(
  selectedFields: SelectedFields
): FragmentSpreadNode[] {
  return Object.values(selectedFields).filter((sf) => sf.kind === Kind.FRAGMENT_SPREAD);
}
