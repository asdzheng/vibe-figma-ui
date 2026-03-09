import {
  createEmptyRegistries,
  createRegistryRef,
  type DesignRegistries
} from "@vibe-figma/schema";

import type {
  RuntimePluginApi,
  RuntimeStyle,
  RuntimeVariable,
  RuntimeVariableAlias,
  RuntimeVariableCollection,
  RuntimeVariableValue
} from "./types.js";

function isVariableAliasArray(
  value: RuntimeVariableAlias | readonly RuntimeVariableAlias[]
): value is readonly RuntimeVariableAlias[] {
  return Array.isArray(value);
}

function serializeVariableValue(
  value: RuntimeVariableValue,
  collector: RuntimeRegistryCollector
): unknown {
  if (
    typeof value === "object" &&
    value !== null &&
    "type" in value &&
    value.type === "VARIABLE_ALIAS"
  ) {
    const variableRef = collector.registerVariableAlias(value);

    return variableRef
      ? {
          ref: variableRef,
          type: "VARIABLE_ALIAS"
        }
      : value;
  }

  return value;
}

function serializeStyleFallback(
  style: RuntimeStyle,
  collector: RuntimeRegistryCollector
): unknown {
  if (style.type === "PAINT") {
    return {
      paints: style.paints?.map((paint) => ({
        color: paint.color,
        gradientStops: paint.gradientStops,
        imageHash: paint.imageHash,
        opacity: paint.opacity,
        scaleMode: paint.scaleMode,
        type: paint.type
      }))
    };
  }

  if (style.type === "EFFECT") {
    return {
      effects: style.effects?.map((effect) => ({
        blendMode: effect.blendMode,
        color: effect.color,
        offset: effect.offset,
        radius: effect.radius,
        spread: effect.spread,
        tokenRef: collector.registerVariableAliases(
          Object.values(effect.boundVariables ?? {}).filter(
            (alias): alias is RuntimeVariableAlias => alias !== undefined
          )
        ),
        type: effect.type,
        visible: effect.visible
      }))
    };
  }

  return undefined;
}

function mapBoundVariableRecord(
  value:
    | Record<string, RuntimeVariableAlias | readonly RuntimeVariableAlias[] | undefined>
    | undefined,
  collector: RuntimeRegistryCollector
): Record<string, string | string[]> | undefined {
  if (!value) {
    return undefined;
  }

  const boundVariables: Record<string, string | string[]> = {};

  for (const [field, binding] of Object.entries(value)) {
    if (!binding) {
      continue;
    }

    if (isVariableAliasArray(binding)) {
      const refs = collector.registerVariableAliases(binding);

      if (refs.length > 0) {
        boundVariables[field] = refs;
      }

      continue;
    }

    const ref = collector.registerVariableAlias(binding);

    if (ref) {
      boundVariables[field] = ref;
    }
  }

  return Object.keys(boundVariables).length > 0 ? boundVariables : undefined;
}

function mapVariableCollection(
  collection: RuntimeVariableCollection
): DesignRegistries["variables"][string]["collection"] {
  return {
    id: collection.id,
    ...(collection.key ? { key: collection.key } : {}),
    name: collection.name
  };
}

function createVariableModes(
  variable: RuntimeVariable,
  collection: RuntimeVariableCollection,
  collector: RuntimeRegistryCollector
): DesignRegistries["variables"][string]["modes"] {
  return collection.modes.map((mode) => ({
    modeId: mode.modeId,
    name: mode.name,
    ...(mode.modeId in variable.valuesByMode
      ? {
          value: serializeVariableValue(
            variable.valuesByMode[mode.modeId] as RuntimeVariableValue,
            collector
          )
        }
      : {})
  }));
}

export class RuntimeRegistryCollector {
  readonly registries: DesignRegistries;

  constructor(private readonly pluginApi: RuntimePluginApi) {
    this.registries = createEmptyRegistries();
  }

  registerStyle(styleId: string | undefined): string | undefined {
    if (!styleId) {
      return undefined;
    }

    const style = this.pluginApi.getStyleById(styleId);

    if (!style) {
      return undefined;
    }

    const styleRef = createRegistryRef(
      "style",
      style.key ?? style.id ?? style.name
    );

    if (!this.registries.styles[styleRef]) {
      const boundVariables = mapBoundVariableRecord(style.boundVariables, this);
      const fallback = serializeStyleFallback(style, this);

      this.registries.styles[styleRef] = {
        ...(boundVariables ? { boundVariables } : {}),
        ...(fallback !== undefined ? { fallback } : {}),
        ...(style.key ? { key: style.key } : {}),
        name: style.name,
        ref: styleRef,
        ...(style.remote !== undefined ? { remote: style.remote } : {}),
        styleType: style.type
      };
    }

    return styleRef;
  }

  registerVariableAlias(alias: RuntimeVariableAlias | undefined): string | undefined {
    if (!alias) {
      return undefined;
    }

    const variable = this.pluginApi.variables.getVariableById(alias.id);

    if (!variable) {
      return undefined;
    }

    const collection = this.pluginApi.variables.getVariableCollectionById(
      variable.variableCollectionId
    );

    if (!collection) {
      return undefined;
    }

    const variableRef = createRegistryRef(
      "variable",
      variable.key ?? variable.id ?? variable.name
    );

    if (!this.registries.variables[variableRef]) {
      this.registries.variables[variableRef] = {
        collection: mapVariableCollection(collection),
        ...(variable.codeSyntax ? { codeSyntax: variable.codeSyntax } : {}),
        id: variable.id,
        ...(variable.key ? { key: variable.key } : {}),
        modes: createVariableModes(variable, collection, this),
        name: variable.name,
        ref: variableRef,
        ...(variable.remote !== undefined ? { remote: variable.remote } : {}),
        resolvedType: variable.resolvedType
      };
    }

    return variableRef;
  }

  registerVariableAliases(
    aliases: readonly RuntimeVariableAlias[] | undefined
  ): string[] {
    return (
      aliases
        ?.map((alias) => this.registerVariableAlias(alias))
        .filter((ref): ref is string => ref !== undefined) ?? []
    );
  }
}
