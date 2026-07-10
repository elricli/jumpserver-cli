import { Option } from "commander";
import type { ApiOperation } from "./openapi.js";

export interface QueryOptionBinding {
  parameterName: string;
  flagName: string;
  attributeName: string;
}

const PAGINATION_QUERY_PARAMETER_NAMES = new Set(["limit", "offset"]);

export function operationCommandPath(operation: ApiOperation): string[] {
  const tagParts = operation.tag.split("_").filter((part) => part.length > 0);
  const actionText = operation.operationId.startsWith(`${operation.tag}_`)
    ? operation.operationId.slice(operation.tag.length + 1)
    : operation.operationId;
  const actionParts = actionText.split("_").filter((part) => part.length > 0);
  return collapseAdjacentDuplicates([...tagParts, ...actionParts]).map(toCommandName);
}

export function operationQueryOptionBindings(
  operation: ApiOperation,
  occupiedFlagNames: Iterable<string>
): QueryOptionBinding[] {
  const usedFlagNames = new Set(occupiedFlagNames);
  const bindings: QueryOptionBinding[] = [];

  for (const parameter of operation.queryParameters) {
    const baseFlagName = queryParameterFlagName(parameter.name);
    if (PAGINATION_QUERY_PARAMETER_NAMES.has(parameter.name)) {
      continue;
    }
    if (!baseFlagName) {
      throw new Error(`Cannot expose OpenAPI query parameter "${parameter.name}" as a CLI option.`);
    }

    let flagName = baseFlagName;
    while (usedFlagNames.has(flagName)) {
      flagName = `query-${flagName}`;
    }

    usedFlagNames.add(flagName);
    bindings.push({
      parameterName: parameter.name,
      flagName,
      attributeName: new Option(`--${flagName} <value>`).attributeName()
    });
  }

  return bindings;
}

function queryParameterFlagName(parameterName: string): string | undefined {
  const flagName = parameterName
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1-$2")
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  return flagName.length > 0 ? flagName : undefined;
}

function toCommandName(value: string): string {
  return value.replaceAll("_", "-");
}

function collapseAdjacentDuplicates(values: string[]): string[] {
  return values.filter((value, index) => index === 0 || value !== values[index - 1]);
}
