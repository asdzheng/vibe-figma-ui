import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  resolveComponentPolicy,
  type ComponentPolicyContext
} from "@vibe-figma/capture-core";
import {
  captureFixtureNames,
  type CaptureFixtureName,
  loadCaptureFixtureDocument,
  loadSampleCaptureDocument,
  loadSamplePolicyRules
} from "@vibe-figma/fixtures";
import {
  componentPolicyRulesSchema,
  designDocumentSchema,
  type DesignCapture,
  type DesignDocument,
  type DesignRegistries
} from "@vibe-figma/schema";
import {
  createFetchBridgeClient,
  DEFAULT_BRIDGE_BASE_URL,
  type CaptureBridgeClient,
  type StoredCapture
} from "@vibe-figma/ui-bridge";
import { z } from "zod";

export type VibeMcpServerOptions = {
  bridgeBaseUrl?: string | undefined;
  bridgeClient?: CaptureBridgeClient | undefined;
  name?: string | undefined;
  version?: string | undefined;
};

export type ValidateDesignDocumentResult = {
  rootCount: number;
  schemaVersion: string;
  valid: true;
};

export type LatestCaptureResult = {
  captureId: string;
  receivedAt: string;
  schemaVersion: string;
};

const registrySliceNames = [
  "assets",
  "componentSets",
  "components",
  "icons",
  "styles",
  "variables"
] as const;

const registrySliceNameSchema = z.enum(registrySliceNames);

export type RegistrySliceName = (typeof registrySliceNames)[number];

export type CaptureRegistryCounts = Record<RegistrySliceName, number>;

export type CaptureSummary = {
  registryCounts: CaptureRegistryCounts;
  rootCount: number;
  selectionCount: number;
  warningCount: number;
};

export type LatestCaptureDocumentResult = {
  captureId: string;
  document: DesignDocument;
  receivedAt: string;
  summary: CaptureSummary;
};

export type LatestCaptureRegistriesResult = {
  captureId: string;
  receivedAt: string;
  registries: Partial<Pick<DesignRegistries, RegistrySliceName>>;
  registryCounts: CaptureRegistryCounts;
  requestedRegistries: RegistrySliceName[];
};

export type LatestCaptureDiagnosticsResult = {
  capture: DesignCapture;
  captureId: string;
  diagnostics: DesignDocument["diagnostics"];
  receivedAt: string;
  summary: CaptureSummary;
};

export type FixtureCaptureResult = {
  document: unknown;
  fixtureName: CaptureFixtureName;
  policyRules?: unknown;
};

const captureFixtureNameSchema = z.enum(captureFixtureNames);

export type EvaluateComponentPolicyResult = {
  matchedRuleId?: string | undefined;
  policy: string;
};

const componentPolicyContextSchema = z
  .object({
    componentKey: z.string().min(1).optional(),
    componentName: z.string().min(1).optional(),
    componentRef: z.string().min(1).optional(),
    componentSetName: z.string().min(1).optional(),
    folderPath: z.string().min(1).optional(),
    libraryName: z.string().min(1).optional(),
    remote: z.boolean().optional()
  })
  .strict();

function createRegistryCounts(registries: DesignRegistries): CaptureRegistryCounts {
  return {
    assets: Object.keys(registries.assets).length,
    componentSets: Object.keys(registries.componentSets).length,
    components: Object.keys(registries.components).length,
    icons: Object.keys(registries.icons).length,
    styles: Object.keys(registries.styles).length,
    variables: Object.keys(registries.variables).length
  };
}

function createCaptureSummary(document: DesignDocument): CaptureSummary {
  return {
    registryCounts: createRegistryCounts(document.registries),
    rootCount: document.roots.length,
    selectionCount: document.capture.selection.length,
    warningCount: document.diagnostics.warnings.length
  };
}

async function getRequiredLatestCapture(
  bridgeClient: CaptureBridgeClient
): Promise<StoredCapture> {
  const latestCapture = await bridgeClient.getLatestCapture();

  if (!latestCapture) {
    throw new Error("No capture available from the local bridge.");
  }

  return latestCapture;
}

function pickRegistries(
  registries: DesignRegistries,
  requestedRegistries: readonly RegistrySliceName[]
): Partial<Pick<DesignRegistries, RegistrySliceName>> {
  const requested = new Set(requestedRegistries);

  return {
    ...(requested.has("assets") ? { assets: registries.assets } : {}),
    ...(requested.has("componentSets")
      ? { componentSets: registries.componentSets }
      : {}),
    ...(requested.has("components")
      ? { components: registries.components }
      : {}),
    ...(requested.has("icons") ? { icons: registries.icons } : {}),
    ...(requested.has("styles") ? { styles: registries.styles } : {}),
    ...(requested.has("variables")
      ? { variables: registries.variables }
      : {})
  };
}

function toTextResult(payload: unknown) {
  return {
    content: [
      {
        text: JSON.stringify(payload, null, 2),
        type: "text" as const
      }
    ]
  };
}

function getBridgeClient(
  options: VibeMcpServerOptions
): CaptureBridgeClient {
  if (options.bridgeClient) {
    return options.bridgeClient;
  }

  return createFetchBridgeClient({
    baseUrl: options.bridgeBaseUrl ?? DEFAULT_BRIDGE_BASE_URL
  });
}

export function createToolSuite(options: VibeMcpServerOptions = {}) {
  const bridgeClient = getBridgeClient(options);

  return {
    async evaluateComponentPolicy(args: {
      context: ComponentPolicyContext;
      rules?: unknown;
    }): Promise<EvaluateComponentPolicyResult> {
      const rules = args.rules
        ? componentPolicyRulesSchema.parse(args.rules)
        : await loadSamplePolicyRules();
      const resolution = resolveComponentPolicy(args.context, rules);

      return {
        ...(resolution.matchedRuleId
          ? { matchedRuleId: resolution.matchedRuleId }
          : {}),
        policy: resolution.policy
      };
    },
    async getLatestCapture(): Promise<LatestCaptureResult> {
      const latestCapture = await getRequiredLatestCapture(bridgeClient);

      return {
        captureId: latestCapture.id,
        receivedAt: latestCapture.receivedAt,
        schemaVersion: latestCapture.document.schemaVersion
      };
    },
    async getLatestCaptureDiagnostics(): Promise<LatestCaptureDiagnosticsResult> {
      const latestCapture = await getRequiredLatestCapture(bridgeClient);

      return {
        capture: latestCapture.document.capture,
        captureId: latestCapture.id,
        diagnostics: latestCapture.document.diagnostics,
        receivedAt: latestCapture.receivedAt,
        summary: createCaptureSummary(latestCapture.document)
      };
    },
    async getLatestCaptureDocument(): Promise<LatestCaptureDocumentResult> {
      const latestCapture = await getRequiredLatestCapture(bridgeClient);

      return {
        captureId: latestCapture.id,
        document: latestCapture.document,
        receivedAt: latestCapture.receivedAt,
        summary: createCaptureSummary(latestCapture.document)
      };
    },
    async getLatestCaptureRegistries(args: {
      registries?: RegistrySliceName[];
    }): Promise<LatestCaptureRegistriesResult> {
      const latestCapture = await getRequiredLatestCapture(bridgeClient);
      const requestedRegistries = args.registries ?? [...registrySliceNames];

      return {
        captureId: latestCapture.id,
        receivedAt: latestCapture.receivedAt,
        registries: pickRegistries(
          latestCapture.document.registries,
          requestedRegistries
        ),
        registryCounts: createRegistryCounts(latestCapture.document.registries),
        requestedRegistries
      };
    },
    async loadFixtureCapture(args: {
      fixtureName?: CaptureFixtureName;
      includePolicyRules?: boolean;
    }): Promise<FixtureCaptureResult> {
      const fixtureName = args.fixtureName ?? "sample";
      const document =
        fixtureName === "sample"
          ? await loadSampleCaptureDocument()
          : await loadCaptureFixtureDocument(fixtureName);

      return {
        fixtureName,
        document,
        ...(args.includePolicyRules
          ? { policyRules: await loadSamplePolicyRules() }
          : {})
      };
    },
    async validateDesignDocument(args: {
      document: unknown;
    }): Promise<ValidateDesignDocumentResult> {
      const document = designDocumentSchema.parse(args.document);

      return {
        rootCount: document.roots.length,
        schemaVersion: document.schemaVersion,
        valid: true
      };
    }
  };
}

export function createVibeMcpServer(
  options: VibeMcpServerOptions = {}
): McpServer {
  const server = new McpServer({
    name: options.name ?? "vibe-figma-ui",
    version: options.version ?? "0.5.0"
  });
  const tools = createToolSuite(options);

  server.registerTool(
    "validate_design_document",
    {
      description: "Validate a canonical design JSON document against schema v0.1.",
      inputSchema: z.object({
        document: z.unknown()
      })
    },
    async ({ document }) => toTextResult(await tools.validateDesignDocument({ document }))
  );

  server.registerTool(
    "get_latest_capture",
    {
      description: "Fetch the latest captured design document from the local UI bridge.",
      inputSchema: z.object({})
    },
    async () => toTextResult(await tools.getLatestCapture())
  );

  server.registerTool(
    "get_latest_capture_document",
    {
      description:
        "Fetch the full latest canonical design document from the local UI bridge.",
      inputSchema: z.object({})
    },
    async () => toTextResult(await tools.getLatestCaptureDocument())
  );

  server.registerTool(
    "get_latest_capture_registries",
    {
      description:
        "Fetch selected registry slices from the latest bridge-backed capture.",
      inputSchema: z
        .object({
          registries: z.array(registrySliceNameSchema).min(1).optional()
        })
        .strict()
    },
    async ({ registries }) =>
      toTextResult(
        await tools.getLatestCaptureRegistries(
          registries ? { registries } : {}
        )
      )
  );

  server.registerTool(
    "get_latest_capture_diagnostics",
    {
      description:
        "Fetch capture metadata, diagnostics, and summary counts from the latest bridge-backed capture.",
      inputSchema: z.object({})
    },
    async () => toTextResult(await tools.getLatestCaptureDiagnostics())
  );

  server.registerTool(
    "load_fixture_capture",
    {
      description: "Load one of the checked-in capture fixtures for local testing.",
      inputSchema: z.object({
        fixtureName: captureFixtureNameSchema.optional(),
        includePolicyRules: z.boolean().optional()
      })
    },
    async ({ fixtureName, includePolicyRules }) =>
      toTextResult(
        await tools.loadFixtureCapture(
          {
            ...(fixtureName ? { fixtureName } : {}),
            ...(includePolicyRules !== undefined ? { includePolicyRules } : {})
          }
        )
      )
  );

  server.registerTool(
    "evaluate_component_policy",
    {
      description: "Evaluate the ordered component preservation policy rules for a component context.",
      inputSchema: z.object({
        context: componentPolicyContextSchema,
        rules: componentPolicyRulesSchema.optional()
      })
    },
    async ({ context, rules }) =>
      toTextResult(
        await tools.evaluateComponentPolicy({
          context,
          ...(rules ? { rules } : {})
        })
      )
  );

  return server;
}

export async function startStdioServer(
  options: VibeMcpServerOptions = {}
): Promise<McpServer> {
  const server = createVibeMcpServer(options);
  const transport = new StdioServerTransport();

  await server.connect(transport);

  return server;
}
