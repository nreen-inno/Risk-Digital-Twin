import crypto from "node:crypto";
import { container } from "../config/cosmos.js";
import {
  getAdapter,
  resolveAdapterType
} from "./adapters/index.js";
import { normalizeFeedEndpoint, fallbackFeedEndpoints, expandFeedDirectoryCandidates } from "./adapters/rss.adapter.js";

function cleanCosmosFields(item) {
  if (!item) return item;
  const {
    _rid,
    _self,
    _etag,
    _attachments,
    _ts,
    ...cleanItem
  } = item;
  return cleanItem;
}

/** Turn ISO-8601 durations like PT1H / PT6H into short labels for the UI. */
export function formatPollInterval(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";

  const match = raw.match(
    /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$/i
  );
  if (!match) return raw;

  const days = Number(match[1] || 0);
  const hours = Number(match[2] || 0);
  const minutes = Number(match[3] || 0);

  if (!days && hours === 1 && !minutes) return "Hourly";
  if (!days && hours === 6 && !minutes) return "Every 6 hours";
  if (!days && hours === 12 && !minutes) return "Every 12 hours";
  if (days === 1 && !hours && !minutes) return "Daily";
  if (!days && !hours && minutes === 15) return "Every 15 minutes";
  if (!days && !hours && minutes === 30) return "Every 30 minutes";

  const parts = [];
  if (days) parts.push(days === 1 ? "1 day" : `${days} days`);
  if (hours) parts.push(hours === 1 ? "1 hour" : `${hours} hours`);
  if (minutes) parts.push(minutes === 1 ? "1 minute" : `${minutes} minutes`);
  return parts.length ? `Every ${parts.join(" ")}` : raw;
}

function applyConnectorScheduleToSource(source, definition) {
  const pollInterval =
    definition?.config?.pollInterval ||
    source.pollInterval ||
    "";
  const label = formatPollInterval(pollInterval);
  if (pollInterval) source.pollInterval = pollInterval;
  if (label) {
    source.collectionFrequency = label;
    source.refreshFrequency = label;
  }
  if (definition?.adapterType || definition?.connectionMethod) {
    source.connectionMethod =
      definition.connectionMethod || definition.adapterType;
  }
  return source;
}

async function queryAll(query, parameters = []) {
  const { resources } = await container.items
    .query({ query, parameters })
    .fetchAll();
  return resources;
}

export async function findLatestDefinitionForSource(informationSourceId) {
  const items = await queryAll(
    `
      SELECT * FROM c
      WHERE c.objectType = @objectType
        AND c.informationSourceId = @informationSourceId
      ORDER BY c.createdAt DESC
    `,
    [
      { name: "@objectType", value: "connectorDefinition" },
      { name: "@informationSourceId", value: informationSourceId }
    ]
  );
  return items[0] || null;
}

export async function findLatestSpecificationForSource(informationSourceId) {
  const items = await queryAll(
    `
      SELECT * FROM c
      WHERE c.objectType = @objectType
        AND c.informationSourceId = @informationSourceId
      ORDER BY c.createdAt DESC
    `,
    [
      { name: "@objectType", value: "connectorSpecification" },
      { name: "@informationSourceId", value: informationSourceId }
    ]
  );
  return items[0] || null;
}

export async function listRawRecordsForSource(
  informationSourceId,
  { limit = 25 } = {}
) {
  const items = await queryAll(
    `
      SELECT * FROM c
      WHERE c.objectType = @objectType
        AND c.informationSourceId = @informationSourceId
      ORDER BY c.receivedAt DESC
    `,
    [
      { name: "@objectType", value: "rawRecord" },
      { name: "@informationSourceId", value: informationSourceId }
    ]
  );
  return items.slice(0, limit).map(cleanCosmosFields);
}

/**
 * Collect candidate feed URLs from the proposal + known provider fallbacks,
 * normalize them, then live-test until one works.
 */
export async function discoverAndVerifyFeedEndpoint({
  source,
  proposal,
  preferEnglish = false
}) {
  const technical = proposal?.technicalConfiguration || {};
  const attempts = [];
  const seen = new Set();

  const addCandidate = (raw, origin) => {
    const normalized = normalizeFeedEndpoint(String(raw || "").trim(), {
      preferEnglish
    });
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    attempts.push({ endpoint: normalized, origin, status: "pending" });
  };

  addCandidate(technical.endpoint, "proposal.endpoint");
  addCandidate(technical.documentationUrl, "proposal.documentationUrl");
  addCandidate(source?.documentationUrl, "source.documentationUrl");

  const urlRegex = /https?:\/\/[^\s"'<>)\]]+/gi;
  const textBags = [
    ...(Array.isArray(proposal?.automatedValidationPlan)
      ? proposal.automatedValidationPlan
      : []),
    ...(Array.isArray(proposal?.assumptions) ? proposal.assumptions : []),
    ...(Array.isArray(proposal?.unresolvedTechnicalFacts)
      ? proposal.unresolvedTechnicalFacts
      : []),
    proposal?.summary || "",
    proposal?.recommendation?.rationale || ""
  ];

  for (const bag of textBags) {
    const text =
      typeof bag === "string"
        ? bag
        : bag?.statement || bag?.verificationStep || bag?.text || "";
    const matches = String(text).match(urlRegex) || [];
    for (const match of matches) {
      addCandidate(match.replace(/[.,;]+$/g, ""), "proposal.text");
    }
  }

  for (const fb of fallbackFeedEndpoints(source, { preferEnglish })) {
    addCandidate(fb, "provider.fallback");
  }

  // If proposal pointed at an HTML feed-directory page, scrape linked feeds.
  const directorySeeds = [
    technical.endpoint,
    technical.documentationUrl,
    source?.documentationUrl
  ].filter(Boolean);

  for (const seed of directorySeeds) {
    const looksLikeDirectory =
      /\.shtml|\.html|aboutrss|\/rss\/?$/i.test(String(seed)) ||
      /select .*feed|feed directory/i.test(String(seed));
    if (!looksLikeDirectory && !/nhc\.noaa\.gov\/aboutrss/i.test(String(seed))) {
      continue;
    }
    const expanded = await expandFeedDirectoryCandidates(seed);
    for (const link of expanded) {
      addCandidate(link, "directory.scrape");
    }
  }

  if (attempts.length === 0) {
    return {
      ok: false,
      endpoint: null,
      attempts: [],
      message:
        "No candidate feed URLs found to verify. Refine the proposal with a concrete RSS/Atom URL."
    };
  }

  let adapter;
  try {
    adapter = getAdapter("rss");
  } catch (error) {
    return {
      ok: false,
      endpoint: null,
      attempts,
      message: error.message
    };
  }

  for (const attempt of attempts) {
    const result = await adapter.testConnection({
      endpoint: attempt.endpoint,
      languages: preferEnglish ? ["en"] : []
    });
    attempt.status = result.ok ? "passed" : "failed";
    attempt.message = result.message;
    attempt.itemCount = result.itemCount || 0;
    attempt.sampleTitles = result.sampleTitles || [];
    if (result.ok) {
      return {
        ok: true,
        endpoint: result.endpoint || attempt.endpoint,
        attempts,
        message: result.message,
        sampleTitles: result.sampleTitles || []
      };
    }
  }

  return {
    ok: false,
    endpoint: null,
    attempts,
    message:
      "Automated verification tried all candidate feed URLs; none returned parseable items."
  };
}

/**
 * Accept Connector Proposal → verify working endpoint → Specification + Definition.
 * Source stays in onboarding until the user approves the collected sample.
 */
export async function acceptConnectorSpecification({
  source,
  proposal,
  monitoringObjectiveId = null
}) {
  if (!source?.id) {
    throw new Error("Information source is required.");
  }
  if (!proposal || typeof proposal !== "object") {
    throw new Error("Connector proposal payload is required.");
  }

  const now = new Date().toISOString();
  const recommendation = proposal.recommendation || {};
  const technical = proposal.technicalConfiguration || {};
  const monitoring = proposal.monitoringConfiguration || {};
  const connectionMethod =
    recommendation.connectionMethod ||
    proposal.recommendedApproach?.connectionMethod ||
    "rss";
  const adapterType = resolveAdapterType(connectionMethod);

  const preferEnglish = Array.isArray(
    monitoring.languages || proposal.monitoringConfiguration?.languages
  )
    ? (monitoring.languages || []).some((l) =>
        String(l).toLowerCase().startsWith("en")
      )
    : false;

  let endpoint = normalizeFeedEndpoint(
    String(technical.endpoint || "").trim(),
    { preferEnglish }
  );
  let verification = null;

  if (adapterType === "rss") {
    verification = await discoverAndVerifyFeedEndpoint({
      source,
      proposal,
      preferEnglish
    });

    if (!verification.ok) {
      const err = new Error(
        verification.message ||
          "Could not verify a working feed URL before building the connector."
      );
      err.code = "VERIFICATION_FAILED";
      err.verification = verification;
      throw err;
    }

    endpoint = verification.endpoint;
  } else if (!endpoint && adapterType === "rss") {
    const err = new Error(
      "Proposal has no feed endpoint. Refine the proposal so AI includes a concrete RSS/Atom URL before accepting."
    );
    err.code = "MISSING_ENDPOINT";
    throw err;
  }

  const specificationId = crypto.randomUUID();
  const definitionId = crypto.randomUUID();

  const specification = {
    id: specificationId,
    objectType: "connectorSpecification",
    informationSourceId: source.id,
    monitoringObjectiveIds:
      source.monitoringObjectiveIds ||
      (monitoringObjectiveId ? [monitoringObjectiveId] : []),
    status: "accepted",
    proposalSnapshot: proposal,
    technicalConfiguration: {
      endpoint,
      documentationUrl: technical.documentationUrl || "",
      authenticationType: technical.authenticationType || "none",
      pollInterval:
        technical.pollInterval ||
        proposal.recommendedApproach?.refreshFrequency ||
        "PT6H",
      responseFormat: technical.responseFormat || "",
      proposedFieldMapping: technical.proposedFieldMapping || {}
    },
    monitoringConfiguration: {
      languages: monitoring.languages || [],
      geographicScope: monitoring.geographicScope || [],
      sensitivity: monitoring.sensitivity || "balanced",
      riskCategoryMappings: monitoring.riskCategoryMappings || [],
      monitoringProfile: monitoring.monitoringProfile || {
        includeTerms: [],
        excludeTerms: [],
        entities: [],
        locations: []
      }
    },
    retentionRecommendation: proposal.retentionRecommendation || null,
    connectorReadiness: "ready-for-test",
    confidence:
      typeof proposal.confidence === "number" ? proposal.confidence : null,
    endpointVerification: verification
      ? {
          ok: verification.ok,
          endpoint: verification.endpoint,
          attempts: verification.attempts,
          verifiedAt: now
        }
      : null,
    createdAt: now,
    updatedAt: now,
    acceptedAt: now
  };

  const definition = {
    id: definitionId,
    objectType: "connectorDefinition",
    informationSourceId: source.id,
    connectorSpecificationId: specificationId,
    monitoringObjectiveIds: specification.monitoringObjectiveIds,
    name: `${source.name} Connector`,
    status: "readyForTest",
    adapterType,
    connectionMethod,
    executable: adapterType === "rss",
    config: {
      endpoint,
      authenticationType: technical.authenticationType || "none",
      pollInterval: specification.technicalConfiguration.pollInterval,
      responseFormat: technical.responseFormat || "",
      documentationUrl: technical.documentationUrl || "",
      fieldMapping: technical.proposedFieldMapping || {},
      languages: monitoring.languages || []
    },
    monitoringConfiguration: specification.monitoringConfiguration,
    generatedBy: "acceptConnectorSpecification",
    requiresUserReview: true,
    endpointVerified: !!verification?.ok,
    createdAt: now,
    updatedAt: now
  };

  await container.items.create(specification);
  await container.items.create(definition);

  // Stay in onboarding until sample approval.
  source.status = "draft";
  source.disabledAt = null;
  source.connectorStatus = "samplePending";
  source.connectorDefinitionId = definitionId;
  source.connectorSpecificationId = specificationId;
  applyConnectorScheduleToSource(source, definition);
  source.updatedAt = now;
  try {
    if (source.objectType) {
      await container.item(source.id, source.objectType).replace(source);
    } else {
      await container.items.upsert(source);
    }
  } catch (error) {
    console.warn(
      "Could not upsert information source after accept:",
      error.message
    );
  }

  return {
    specification: cleanCosmosFields(specification),
    definition: cleanCosmosFields(definition),
    adapterType,
    executable: definition.executable,
    verification: verification
      ? {
          ok: verification.ok,
          endpoint: verification.endpoint,
          attempts: verification.attempts,
          sampleTitles: verification.sampleTitles || []
        }
      : null
  };
}

/**
 * Run automated connector test: connectivity + sample fetch → RawRecords.
 * Optional endpointOverride repairs a bad stored URL without re-onboarding.
 */
export async function testConnectorForSource(
  source,
  { limit = 15, endpointOverride = null } = {}
) {
  if (!source?.id) {
    throw new Error("Information source is required.");
  }

  const definition = await findLatestDefinitionForSource(source.id);
  if (!definition) {
    const err = new Error(
      "No connector definition found. Accept the connector specification first."
    );
    err.code = "NO_DEFINITION";
    throw err;
  }

  const languages =
    definition.monitoringConfiguration?.languages || [];
  const preferEnglish = languages.some((l) =>
    String(l).toLowerCase().startsWith("en")
  );

  if (endpointOverride || definition.config?.endpoint) {
    const normalized = normalizeFeedEndpoint(
      endpointOverride || definition.config.endpoint,
      { preferEnglish }
    );
    if (normalized && normalized !== definition.config?.endpoint) {
      definition.config = {
        ...(definition.config || {}),
        endpoint: normalized
      };
      definition.updatedAt = new Date().toISOString();
      await container.items.upsert(definition);
    } else if (endpointOverride && normalized) {
      definition.config = {
        ...(definition.config || {}),
        endpoint: normalized
      };
      definition.updatedAt = new Date().toISOString();
      await container.items.upsert(definition);
    }
  }

  // Pass languages into adapter config for Yle English preference.
  definition.config = {
    ...(definition.config || {}),
    languages
  };

  const now = new Date().toISOString();
  const executionId = crypto.randomUUID();
  const testResultId = crypto.randomUUID();

  let adapter;
  try {
    adapter = getAdapter(definition.adapterType);
  } catch (error) {
    const testResult = {
      id: testResultId,
      objectType: "connectorTestResult",
      informationSourceId: source.id,
      connectorDefinitionId: definition.id,
      status: "failed",
      connectorReadiness: "test-failed",
      ok: false,
      message: error.message,
      createdAt: now,
      updatedAt: now
    };
    await container.items.create(testResult);
    return {
      testResult: cleanCosmosFields(testResult),
      records: [],
      definition: cleanCosmosFields(definition)
    };
  }

  const connection = await adapter.testConnection(definition.config || {});
  if (!connection.ok) {
    // Demo recovery: if the stored URL 404s / is empty, try known-good feeds
    // for this provider (FMI warnings, Yle recent, …).
    const candidates = fallbackFeedEndpoints(source, { preferEnglish }).filter(
      (u) => u && u !== definition.config?.endpoint
    );

    let recovered = null;
    for (const candidate of candidates) {
      const retryConfig = {
        ...(definition.config || {}),
        endpoint: candidate,
        languages
      };
      const retry = await adapter.testConnection(retryConfig);
      if (retry.ok) {
        definition.config = {
          ...(definition.config || {}),
          endpoint: retry.endpoint || candidate
        };
        definition.updatedAt = new Date().toISOString();
        await container.items.upsert(definition);
        recovered = { connection: retry, config: retryConfig };
        break;
      }
    }

    if (!recovered) {
      const testResult = {
        id: testResultId,
        objectType: "connectorTestResult",
        informationSourceId: source.id,
        connectorDefinitionId: definition.id,
        status: "failed",
        connectorReadiness: "test-failed",
        ok: false,
        message: `${connection.message}${connection.endpoint ? ` · ${connection.endpoint}` : ""}`,
        details: connection,
        createdAt: now,
        updatedAt: now
      };
      await container.items.create(testResult);

      definition.status = "testFailed";
      definition.updatedAt = now;
      await container.items.upsert(definition);

      return {
        testResult: cleanCosmosFields(testResult),
        records: [],
        definition: cleanCosmosFields(definition)
      };
    }

    // Continue with recovered endpoint.
    Object.assign(connection, recovered.connection);
    definition.config = recovered.config;
  }

  const fetched = await adapter.fetch(definition.config || {}, { limit });
  const mapped = adapter.mapToRawRecords(fetched.items, {
    informationSourceId: source.id,
    connectorDefinitionId: definition.id,
    connectorExecutionId: executionId,
    sourceName: source.name
  });

  const createdRecords = [];
  for (const record of mapped) {
    const withId = { ...record, id: crypto.randomUUID() };
    const { resource } = await container.items.create(withId);
    createdRecords.push(cleanCosmosFields(resource));
  }

  const execution = {
    id: executionId,
    objectType: "connectorExecution",
    informationSourceId: source.id,
    connectorDefinitionId: definition.id,
    status: "completed",
    startedAt: now,
    endedAt: new Date().toISOString(),
    recordsCollected: createdRecords.length,
    duplicatesSkipped: 0,
    createdAt: now,
    updatedAt: new Date().toISOString()
  };
  await container.items.create(execution);

  const testResult = {
    id: testResultId,
    objectType: "connectorTestResult",
    informationSourceId: source.id,
    connectorDefinitionId: definition.id,
    connectorExecutionId: executionId,
    status: "passed",
    connectorReadiness: "ready-for-activation",
    ok: true,
    message: connection.message,
    details: {
      ...connection,
      recordsStored: createdRecords.length
    },
    sampleTitles: createdRecords.slice(0, 5).map((r) => r.title),
    createdAt: now,
    updatedAt: new Date().toISOString()
  };
  await container.items.create(testResult);

  definition.status = "tested";
  definition.lastTestedAt = now;
  definition.updatedAt = now;
  await container.items.upsert(definition);

  // Keep source in onboarding (draft) until the user approves the sample.
  source.connectorStatus = "sampleReady";
  source.connectorDefinitionId = definition.id;
  source.updatedAt = now;
  try {
    if (source.objectType) {
      await container.item(source.id, source.objectType).replace(source);
    } else {
      await container.items.upsert(source);
    }
  } catch (error) {
    console.warn(
      "Could not update information source after connector test:",
      error.message
    );
    try {
      await container.items.upsert(source);
    } catch (upsertError) {
      console.warn("Upsert fallback also failed:", upsertError.message);
    }
  }

  return {
    testResult: cleanCosmosFields(testResult),
    execution: cleanCosmosFields(execution),
    records: createdRecords,
    definition: cleanCosmosFields(definition),
    informationSource: cleanCosmosFields(source),
    awaitingSampleApproval: true
  };
}

/**
 * Risk manager approved the collected sample → move source to In use (active).
 */
export async function approveConnectorSample(source) {
  if (!source?.id) {
    throw new Error("Information source is required.");
  }

  const definition = await findLatestDefinitionForSource(source.id);
  if (!definition) {
    const err = new Error(
      "No connector definition found. Accept and test the connector first."
    );
    err.code = "NO_DEFINITION";
    throw err;
  }

  const records = await listRawRecordsForSource(source.id, { limit: 1 });
  if (!records.length) {
    const err = new Error(
      "No sample raw records found. Run a successful connector fetch before approving."
    );
    err.code = "NO_SAMPLE";
    throw err;
  }

  const now = new Date().toISOString();

  definition.status = "active";
  definition.activatedAt = definition.activatedAt || now;
  definition.sampleApprovedAt = now;
  definition.updatedAt = now;
  await container.items.upsert(definition);

  source.status = "active";
  source.activatedAt = source.activatedAt || now;
  source.disabledAt = null;
  source.connectorStatus = "active";
  source.connectorDefinitionId = definition.id;
  source.sampleApprovedAt = now;
  applyConnectorScheduleToSource(source, definition);
  source.updatedAt = now;

  try {
    if (source.objectType) {
      await container.item(source.id, source.objectType).replace(source);
    } else {
      await container.items.upsert(source);
    }
  } catch (error) {
    await container.items.upsert(source);
  }

  return {
    informationSource: cleanCosmosFields(source),
    definition: cleanCosmosFields(definition),
    approvedAt: now
  };
}
