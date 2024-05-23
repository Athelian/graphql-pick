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
  Kind,
  ListTypeNode,
  NonNullTypeNode,
  OperationDefinitionNode,
  OperationTypeNode,
  SelectionNode,
  SelectionSetNode,
  TypeNode,
  VariableDefinitionNode,
  getNamedType,
  isEnumType,
  isInterfaceType,
  isListType,
  isNonNullType,
  isObjectType,
  isScalarType,
  isUnionType
} from "graphql";
import configManager from "./config/index.js";

let operationVariables: VariableDefinitionNode[] = [];
let fieldTypeMap = new Map();

function addOperationVariable(variable: VariableDefinitionNode) {
  operationVariables.push(variable);
}

function resetOperationVariables() {
  operationVariables = [];
}

function resetFieldMap() {
  fieldTypeMap = new Map();
}

export type Skip = string[];
export type Force = string[];
export type Ignore = string[];

export type SelectedFields =
  | {
      [key: string]: SelectedFields;
    }
  | boolean;

export function buildOperationNodeForField({
  schema,
  kind,
  field,
  ignore = [],
  argNames,
  selectedFields = true
}: {
  schema: GraphQLSchema;
  kind: OperationTypeNode;
  field: string;
  ignore?: Ignore;
  argNames?: string[];
  selectedFields?: SelectedFields;
}) {
  resetOperationVariables();
  resetFieldMap();

  const rootTypeNames = getRootTypeNames(schema);

  const operationNode = buildOperationAndCollectVariables({
    schema,
    fieldName: field,
    kind,
    ignore,
    argNames,
    selectedFields,
    rootTypeNames
  });

  // attach variables
  (operationNode as any).variableDefinitions = [...operationVariables];

  resetOperationVariables();
  resetFieldMap();

  return operationNode;
}

function buildOperationAndCollectVariables({
  schema,
  fieldName,
  kind,
  ignore,
  argNames,
  selectedFields,
  rootTypeNames
}: {
  schema: GraphQLSchema;
  fieldName: string;
  kind: OperationTypeNode;
  ignore: Ignore;
  argNames?: string[];
  selectedFields: SelectedFields;
  rootTypeNames: Set<string>;
}): OperationDefinitionNode {
  const type = getDefinedRootType(schema, kind);
  const field = type.getFields()[fieldName];
  const operationName = `${fieldName}_${kind}`;

  if (field.args) {
    for (const arg of field.args) {
      const argName = arg.name;
      if (!argNames || argNames.includes(argName)) {
        addOperationVariable(resolveVariable(arg, argName));
      }
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
          type,
          field,
          firstCall: true,
          path: [],
          ancestors: [],
          ignore,
          schema,
          argNames,
          selectedFields,
          rootTypeNames
        })
      ]
    }
  };
}

function resolveSelectionSet({
  parent,
  type,
  path,
  ancestors,
  ignore,
  schema,
  argNames,
  selectedFields,
  rootTypeNames
}: {
  parent: GraphQLNamedType;
  type: GraphQLNamedType;
  path: string[];
  ancestors: GraphQLNamedType[];
  ignore: Ignore;
  schema: GraphQLSchema;
  selectedFields: SelectedFields;
  argNames?: string[];
  rootTypeNames: Set<string>;
}): SelectionSetNode | void {
  if (isUnionType(type)) {
    const selectedFragments = Object.values(selectedFields)
      .filter((sf) => sf.kind === Kind.FRAGMENT_SPREAD)
      .filter((sf) => {
        const fragment = configManager.findFragmentByName(sf.name.value);
        return (
          fragment && type.getTypes().some((t) => t.name === fragment.typeCondition.name.value)
        );
      });

    const types = type.getTypes();

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
              parent: type,
              type: t,
              path,
              ancestors,
              ignore,
              schema,
              argNames,
              selectedFields,
              rootTypeNames
            }) as SelectionSetNode
          };
        })
        .filter((fragmentNode) => fragmentNode?.selectionSet?.selections?.length > 0)
        .concat(selectedFragments)
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
              parent: type,
              type: t,
              path,
              ancestors,
              ignore,
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
    const isIgnored =
      ignore.includes(type.name) || ignore.includes(`${parent.name}.${path[path.length - 1]}`);
    const selectedFragments = Object.values(selectedFields)
      .filter((sf) => sf.kind === Kind.FRAGMENT_SPREAD)
      .filter((sf) => {
        const fragment = configManager.findFragmentByName(sf.name.value);
        return type.name === fragment?.typeCondition.name.value;
      });

    const fields = type.getFields();

    return {
      kind: Kind.SELECTION_SET,
      selections: Object.keys(fields)
        .map((fieldName) => {
          const selectedSubFields =
            typeof selectedFields === "object" ? selectedFields[fieldName] : true;
          if (selectedSubFields) {
            return resolveField({
              type,
              field: fields[fieldName],
              path: [...path, fieldName],
              ancestors,
              ignore,
              schema,
              argNames,
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
        .concat(selectedFragments)
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
        // for v16 compatibility
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

function getArgumentName(name: string, path: string[]): string {
  return [...path, name].join("_");
}

function resolveField({
  type,
  field,
  firstCall,
  path,
  ancestors,
  ignore,
  schema,
  argNames,
  selectedFields,
  rootTypeNames
}: {
  type: GraphQLObjectType;
  field: GraphQLField<any, any>;
  path: string[];
  ancestors: GraphQLNamedType[];
  firstCall?: boolean;
  ignore: Ignore;
  schema: GraphQLSchema;
  selectedFields: SelectedFields;
  argNames?: string[];
  rootTypeNames: Set<string>;
}): SelectionNode {
  const namedType = getNamedType(field.type);
  let args: ArgumentNode[] = [];
  let removeField = false;

  if (field.args && field.args.length) {
    args = field.args
      .map<ArgumentNode>((arg) => {
        const argumentName = getArgumentName(arg.name, path);
        if (argNames && !argNames.includes(argumentName)) {
          if (isNonNullType(arg.type)) {
            removeField = true;
          }
          return null as any;
        }
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
  const fieldPathStr = fieldPath.join(".");
  let fieldName = field.name;
  if (fieldTypeMap.has(fieldPathStr) && fieldTypeMap.get(fieldPathStr) !== field.type.toString()) {
    fieldName += (field.type as any)
      .toString()
      .replace("!", "NonNull")
      .replace("[", "List")
      .replace("]", "");
  }
  fieldTypeMap.set(fieldPathStr, field.type.toString());

  if (!isScalarType(namedType) && !isEnumType(namedType)) {
    return {
      kind: Kind.FIELD,
      name: {
        kind: Kind.NAME,
        value: field.name
      },
      ...(fieldName !== field.name && { alias: { kind: Kind.NAME, value: fieldName } }),
      selectionSet:
        resolveSelectionSet({
          parent: type,
          type: namedType,
          path: fieldPath,
          ancestors: [...ancestors, type],
          ignore,
          schema,
          argNames,
          selectedFields,
          rootTypeNames
        }) || undefined,
      arguments: args
    };
  }

  return {
    kind: Kind.FIELD,
    name: {
      kind: Kind.NAME,
      value: field.name
    },
    ...(fieldName !== field.name && { alias: { kind: Kind.NAME, value: fieldName } }),
    arguments: args
  };
}
