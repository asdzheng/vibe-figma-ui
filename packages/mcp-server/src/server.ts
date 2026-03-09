import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  resolveComponentPolicy,
  type ComponentPolicyContext
} from "@vibe-figma/capture-core";
import {
  loadSampleCaptureDocument,
  loadSamplePolicyRules
} from "@vibe-figma/fixtures";
import {
  componentPolicyRulesSchema,
  designDocumentSchema
} from "@vibe-figma/schema";
import {
  createFetchBridgeClient,
  DEFAULT_BRIDGE_BASE_URL,
  type CaptureBridgeClient
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

export type FixtureCaptureResult = {
  document: unknown;
  policyRules?: unknown;
};

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
      const latestCapture = await bridgeClient.getLatestCapture();

      if (!latestCapture) {
        throw new Error("No capture available from the local bridge.");
      }

      return {
        captureId: latestCapture.id,
        receivedAt: latestCapture.receivedAt,
        schemaVersion: latestCapture.document.schemaVersion
      };
    },
    async loadFixtureCapture(args: {
      includePolicyRules?: boolean;
    }): Promise<FixtureCaptureResult> {
      const document = await loadSampleCaptureDocument();

      return {
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
    version: options.version ?? "0.3.1"
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
    "load_fixture_capture",
    {
      description: "Load the checked-in sample capture fixture for local testing.",
      inputSchema: z.object({
        includePolicyRules: z.boolean().optional()
      })
    },
    async ({ includePolicyRules }) =>
      toTextResult(
        await tools.loadFixtureCapture(
          includePolicyRules === undefined ? {} : { includePolicyRules }
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
