/**
 * Demo mock "In use" sources for published risk cases that have no real
 * Cosmos connectors yet. Connection is simulated — not a live adapter.
 * Injected only when the objective has zero active sources from Cosmos.
 */

function hoursAgo(h) {
  return new Date(Date.now() - h * 3600 * 1000).toISOString();
}

function hoursFromNow(h) {
  return new Date(Date.now() + h * 3600 * 1000).toISOString();
}

/** @type {Record<string, object[]>} */
const MOCK_ACTIVE_BY_OBJECTIVE = {
  "commodity-energy-prices": [
    {
      id: "demo-mock-eu-trade-steel",
      objectType: "informationSource",
      name: "EU Commission Trade news RSS",
      provider: "European Commission",
      sourceKind: "rss",
      sourceRole: "external",
      status: "active",
      connectorStatus: "active",
      connectionMethod: "rss",
      pollInterval: "PT12H",
      collectionFrequency: "Twice daily",
      refreshFrequency: "Twice daily",
      monitoringFocus:
        "steel, HRC, plate, safeguard, quota, CBAM, import, duty",
      informationNeed:
        "EU steel trade measures, safeguard quotas and CBAM affecting European plate availability and cost",
      topics: [
        "steel",
        "safeguard",
        "quota",
        "CBAM",
        "import duty",
        "HRC",
        "plate"
      ],
      filters: [
        "steel",
        "safeguard",
        "quota",
        "CBAM",
        "import duty",
        "HRC",
        "plate"
      ],
      keywords: ["steel", "safeguard", "quota", "CBAM"],
      monitoringFilters:
        "steel, HRC, plate, safeguard, quota, CBAM, import, duty",
      lastCollectedAt: hoursAgo(5),
      lastRunAt: hoursAgo(5),
      lastSuccessfulRunAt: hoursAgo(5),
      nextCollectionAt: hoursFromNow(7),
      nextRunAt: hoursFromNow(7),
      monitoringObjectiveIds: ["commodity-energy-prices"],
      demoMock: true,
      demoMockLabel: "Demo mock connection",
      availabilityLabel: "Demo mock — not live-fetched"
    },
    {
      id: "demo-mock-steel-market",
      objectType: "informationSource",
      name: "European steel-market reporting",
      provider: "Market / trade press",
      sourceKind: "rss",
      sourceRole: "external",
      status: "active",
      connectorStatus: "active",
      connectionMethod: "rss",
      pollInterval: "PT12H",
      collectionFrequency: "Twice daily",
      refreshFrequency: "Twice daily",
      monitoringFocus:
        "HRC, hot-rolled coil, plate prices, supply tightness, mill allocations",
      informationNeed:
        "European HRC and shipbuilding-grade plate price and availability moves",
      topics: [
        "HRC",
        "hot-rolled coil",
        "plate",
        "steel price",
        "supply tightness"
      ],
      filters: [
        "HRC",
        "hot-rolled coil",
        "plate",
        "steel price",
        "supply tightness"
      ],
      keywords: ["HRC", "steel", "plate", "price"],
      monitoringFilters:
        "HRC, hot-rolled coil, plate prices, supply tightness",
      lastCollectedAt: hoursAgo(8),
      lastRunAt: hoursAgo(8),
      lastSuccessfulRunAt: hoursAgo(8),
      nextCollectionAt: hoursFromNow(4),
      nextRunAt: hoursFromNow(4),
      monitoringObjectiveIds: ["commodity-energy-prices"],
      demoMock: true,
      demoMockLabel: "Demo mock connection",
      availabilityLabel: "Demo mock — not live-fetched"
    }
  ]
};

/**
 * When Cosmos has no active sources for an objective that ships with a
 * published demo case, return mock In-use sources so the UI is not empty.
 */
export function getDemoMockActiveSources(objectiveId) {
  const list = MOCK_ACTIVE_BY_OBJECTIVE[objectiveId];
  if (!Array.isArray(list) || !list.length) return [];
  return list.map((s) => {
    const last = hoursAgo(s.id.includes("steel-market") ? 8 : 5);
    const next = hoursFromNow(s.id.includes("steel-market") ? 4 : 7);
    return {
      ...s,
      lastCollectedAt: last,
      lastRunAt: last,
      lastSuccessfulRunAt: last,
      nextCollectionAt: next,
      nextRunAt: next
    };
  });
}
