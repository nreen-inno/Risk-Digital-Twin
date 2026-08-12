import {
  monitoringCapabilities,
  findMonitoringCapabilityById
} from "../data/monitoringCapabilities.js";

import { container } from "../config/cosmos.js";
import {
  formatPollInterval,
  applyMonitoringFocusToSource
} from "../connectors/connectorLifecycle.service.js";
import { getDemoMockActiveSources } from "../data/demoMockSources.js";

function topicsFromDefinition(definition) {
  const mp = definition?.monitoringConfiguration?.monitoringProfile || {};
  const terms = [
    ...(Array.isArray(mp.includeTerms) ? mp.includeTerms : []),
    ...(Array.isArray(mp.entities) ? mp.entities : []),
    ...(Array.isArray(mp.locations) ? mp.locations : []),
    ...(Array.isArray(definition?.monitoringConfiguration?.geographicScope)
      ? definition.monitoringConfiguration.geographicScope
      : [])
  ]
    .map((t) => String(t || "").trim())
    .filter(Boolean);

  const unique = [];
  const seen = new Set();
  for (const t of terms) {
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(t);
  }
  return unique.slice(0, 8);
}

function parsePollMs(value) {
  const raw = String(value || "").trim();
  const match = raw.match(
    /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$/i
  );
  if (!match) return 0;
  const days = Number(match[1] || 0);
  const hours = Number(match[2] || 0);
  const minutes = Number(match[3] || 0);
  const seconds = Number(match[4] || 0);
  return ((days * 24 + hours) * 60 + minutes) * 60 * 1000 + seconds * 1000;
}

function applyOperationalMeta(source, definition, lastCollectedAt) {
  const topics = topicsFromDefinition(definition);
  if (topics.length) {
    source.topics = topics;
    source.filters = topics;
    source.keywords = topics;
    source.monitoringFilters = topics.join(", ");
  }

  if (lastCollectedAt) {
    source.lastCollectedAt = lastCollectedAt;
    source.lastRunAt = lastCollectedAt;
    source.lastSuccessfulRunAt = lastCollectedAt;
    const poll =
      definition?.config?.pollInterval ||
      source.pollInterval ||
      "";
    const ms = parsePollMs(poll);
    if (ms > 0) {
      source.nextCollectionAt = new Date(
        new Date(lastCollectedAt).getTime() + ms
      ).toISOString();
      source.nextRunAt = source.nextCollectionAt;
    }
  } else if (
    source.status === "active" ||
    source.connectorStatus === "active" ||
    source.connectorStatus === "connected" ||
    source.connectorStatus === "sampleReady"
  ) {
    source.lastCollectedAt = "Awaiting first collection";
    source.lastRunAt = source.lastCollectedAt;
  }

  return source;
}

export function getMonitoringCapabilities(req, res) {
  res.status(200).json({
    count: monitoringCapabilities.length,
    items: monitoringCapabilities
  });
}

export function getMonitoringCapabilityById(req, res) {
  const capability = findMonitoringCapabilityById(
    req.params.id
  );

  if (!capability) {
    return res.status(404).json({
      error: "Monitoring objective not found"
    });
  }

  res.status(200).json(capability);
}
export async function getMonitoringCapabilityInformationSources(
  req,
  res,
  next
) {
  try {
    const { id } = req.params;

    const querySpec = {
      query: `
        SELECT *
        FROM c
        WHERE c.objectType = @objectType
          AND ARRAY_CONTAINS(
            c.monitoringObjectiveIds,
            @monitoringObjectiveId
          )
        ORDER BY c.name
      `,
      parameters: [
        {
          name: "@objectType",
          value: "informationSource"
        },
        {
          name: "@monitoringObjectiveId",
          value: id
        }
      ]
    };

    const { resources } =
      await container.items
        .query(querySpec)
        .fetchAll();

    // Enrich sources with schedule from latest connector definition when missing.
    const sourceIds = resources.map((s) => s.id).filter(Boolean);
    const definitionsBySource = new Map();

    if (sourceIds.length) {
      const defQuery = {
        query: `
          SELECT *
          FROM c
          WHERE c.objectType = @objectType
            AND ARRAY_CONTAINS(@sourceIds, c.informationSourceId)
        `,
        parameters: [
          { name: "@objectType", value: "connectorDefinition" },
          { name: "@sourceIds", value: sourceIds }
        ]
      };
      const { resources: definitions } = await container.items
        .query(defQuery)
        .fetchAll();

      for (const def of definitions) {
        const sid = def.informationSourceId;
        const prev = definitionsBySource.get(sid);
        if (!prev || String(def.createdAt || "") > String(prev.createdAt || "")) {
          definitionsBySource.set(sid, def);
        }
      }
    }

    const grouped = {
      active: [],
      draft: [],
      disabled: []
    };

    // Latest rawRecord receivedAt per source (for Last collection).
    const lastBySource = new Map();
    if (sourceIds.length) {
      const rawQuery = {
        query: `
          SELECT c.informationSourceId, c.receivedAt
          FROM c
          WHERE c.objectType = @objectType
            AND ARRAY_CONTAINS(@sourceIds, c.informationSourceId)
        `,
        parameters: [
          { name: "@objectType", value: "rawRecord" },
          { name: "@sourceIds", value: sourceIds }
        ]
      };
      try {
        const { resources: raws } = await container.items
          .query(rawQuery)
          .fetchAll();
        for (const row of raws) {
          const sid = row.informationSourceId;
          const at = row.receivedAt;
          if (!sid || !at) continue;
          const prev = lastBySource.get(sid);
          if (!prev || String(at) > String(prev)) lastBySource.set(sid, at);
        }
      } catch {
        // Non-fatal — leave last collection empty when query fails.
      }
    }

    for (const source of resources) {
      const def = definitionsBySource.get(source.id);
      if (def) {
        const pollInterval =
          def.config?.pollInterval ||
          source.pollInterval ||
          (source.status === "active" || source.connectorStatus === "active"
            ? "PT6H"
            : "");
        const label =
          source.collectionFrequency ||
          source.refreshFrequency ||
          formatPollInterval(pollInterval);
        if (pollInterval && !source.pollInterval) source.pollInterval = pollInterval;
        if (label) {
          source.collectionFrequency = label;
          source.refreshFrequency = label;
        }
        if (!source.connectionMethod) {
          source.connectionMethod = def.connectionMethod || def.adapterType || "";
        }
        applyMonitoringFocusToSource(source, def);
        // Prefer the user's short description on the card; only use generated
        // focus when informationNeed is empty.
        if (!String(source.informationNeed || "").trim() && source.monitoringFocus) {
          source.informationNeed = source.monitoringFocus;
        }
        if (
          (!source.connectorStatus || source.connectorStatus === "notConfigured") &&
          def.status
        ) {
          source.connectorStatus =
            source.status === "active" ? "active" : source.connectorStatus || def.status;
        }
      }

      applyOperationalMeta(
        source,
        def || null,
        lastBySource.get(source.id) || source.lastCollectedAt || null
      );

      const status = [
        "active",
        "draft",
        "disabled"
      ].includes(source.status)
        ? source.status
        : "draft";

      grouped[status].push(source);
    }

    // Published demo cases need visible "In use" sources. If Cosmos has none
    // yet, inject mock connections (not live-fetched) so the UI is not empty.
    if (grouped.active.length === 0) {
      const mocks = getDemoMockActiveSources(id);
      for (const mock of mocks) {
        grouped.active.push(mock);
      }
    }

    res.status(200).json({
      monitoringObjectiveId: id,

      sources: grouped,

      counts: {
        active: grouped.active.length,
        draft: grouped.draft.length,
        disabled: grouped.disabled.length
      }
    });
  } catch (error) {
    next(error);
  }
}

