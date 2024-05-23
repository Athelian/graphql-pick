import { getDefinedRootType, getRootTypeNames } from "@graphql-tools/utils";
import {
  ArgumentNode,
  FragmentSpreadNode,
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

export type SelectedFields =
  | {
      [key: string]: SelectedFields;
    }
  | boolean
  | FragmentSpreadNode;

export function buildOperationNodeForField({
  schema,
  field,
  selectedFields
}: {
  schema: GraphQLSchema;
  field: string;
  selectedFields: SelectedFields;
}) {
  resetOperationVariables();
  resetFieldMap();

  const rootTypeNames = getRootTypeNames(schema);

  const operationNode = buildOperationAndCollectVariables({
    schema,
    fieldName: field,
    kind: OperationTypeNode.QUERY,
    selectedFields,
    rootTypeNames
  });

  (operationNode as any).variableDefinitions = [...operationVariables];

  resetOperationVariables();
  resetFieldMap();

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
          type,
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
  parent: GraphQLNamedType;
  type: GraphQLNamedType;
  path: string[];
  schema: GraphQLSchema;
  selectedFields: SelectedFields;
  argNames?: string[];
  rootTypeNames: Set<string>;
}): SelectionSetNode | void {
  const fragments = getFragmentsFromSelectedFields(selectedFields);

  if (isUnionType(type)) {
    const types = type.getTypes();
    const selectedFragments = fragments.filter((f) => {
      const fragment = configManager.findFragmentByName(f.name.value);
      return fragment && type.getTypes().some((t) => t.name === fragment.typeCondition.name.value);
    });

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
              parent: type,
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
    const selectedFragments = fragments.filter((f) => {
      const fragment = configManager.findFragmentByName(f.name.value);
      return type.name === fragment?.typeCondition.name.value;
    });

    return {
      kind: Kind.SELECTION_SET,
      selections: Object.keys(fields)
        .map((fieldName) => {
          const selectedSubFields =
            typeof selectedFields === "object" ? (selectedFields as any)[fieldName] : true;
          if (selectedSubFields) {
            return resolveField({
              type,
              field: fields[fieldName],
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
  schema,
  selectedFields,
  rootTypeNames
}: {
  type: GraphQLObjectType;
  field: GraphQLField<any, any>;
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
          schema,
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

function getFragmentsFromSelectedFields(selectedFields: SelectedFields): FragmentSpreadNode[] {
  return Object.values(selectedFields).filter((sf) => sf.kind === Kind.FRAGMENT_SPREAD);
}
