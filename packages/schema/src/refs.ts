import { z } from "zod";

const REF_VALUE_PATTERN = "[A-Za-z0-9._/-]+";

export const registryPrefixes = [
  "component",
  "component-set",
  "style",
  "variable",
  "icon",
  "asset"
] as const;

export type RegistryPrefix = (typeof registryPrefixes)[number];

export function createRegistryRef(
  prefix: RegistryPrefix,
  value: string
): `${RegistryPrefix}:${string}` {
  const normalizedValue = value.trim().replace(/[^A-Za-z0-9._/-]+/g, "-");

  return `${prefix}:${normalizedValue}`;
}

export function registryRefSchema(prefix?: RegistryPrefix) {
  const source = prefix
    ? `^${prefix}:${REF_VALUE_PATTERN}$`
    : `^(?:${registryPrefixes.join("|")}):${REF_VALUE_PATTERN}$`;

  return z.string().regex(new RegExp(source));
}

export const componentRefSchema = registryRefSchema("component");
export const componentSetRefSchema = registryRefSchema("component-set");
export const styleRefSchema = registryRefSchema("style");
export const variableRefSchema = registryRefSchema("variable");
export const iconRefSchema = registryRefSchema("icon");
export const assetRefSchema = registryRefSchema("asset");

export const componentOrComponentSetRefSchema = z.union([
  componentRefSchema,
  componentSetRefSchema
]);
