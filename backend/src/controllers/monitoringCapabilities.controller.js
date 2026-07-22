const monitoringCapabilities = [
  {
    id: "geopolitical-regulatory",
    name: "Geopolitical & Regulatory Monitoring",
    businessQuestion:
      "Which political, regulatory or trade developments could affect our suppliers, logistics and shipbuilding projects?",
    description:
      "Monitor geopolitical events, sanctions, trade restrictions, export controls and regulatory changes that may affect suppliers, logistics, engineering and project delivery.",
    relatedRiskFactors: [
      "geopolitical-instability",
      "political-conflict",
      "sanctions",
      "trade-restrictions",
      "export-controls",
      "regulatory-change"
    ],
    relatedRiskDefinitions: [
      "Customs and trade disruption",
      "Late delivery",
      "Supplier instability",
      "Regulatory compliance failure",
      "Engineering change"
    ],
    suggestedSources: [
      {
        id: "eu-news",
        name: "European Commission news and updates",
        sourceKind: "rss",
        sourceRole: "external",
        requiresSimulation: false
      },
      {
        id: "imo-news",
        name: "IMO news and regulatory updates",
        sourceKind: "rss",
        sourceRole: "external",
        requiresSimulation: false
      },
      {
        id: "government-bulletins",
        name: "Government and customs authority bulletins",
        sourceKind: "rss",
        sourceRole: "external",
        requiresSimulation: false
      }
    ]
  },

  {
    id: "supplier-stability",
    name: "Supplier Stability",
    businessQuestion:
      "Are any suppliers becoming a risk to project cost, quality or schedule?",
    description:
      "Monitor supplier capacity, delivery reliability, financial condition, material availability, quality performance and previous incidents.",
    relatedRiskFactors: [
      "supplier-capacity",
      "supplier-financial-pressure",
      "material-availability",
      "transport-disruption",
      "delivery-performance",
      "supplier-quality"
    ],
    relatedRiskDefinitions: [
      "Supplier insolvency",
      "Late delivery",
      "Material shortage",
      "Supplier quality deviation",
      "Project schedule delay"
    ],
    suggestedSources: [
      {
        id: "internal-erp",
        name: "Internal ERP or procurement system",
        sourceKind: "restApi",
        sourceRole: "internal",
        requiresSimulation: true
      },
      {
        id: "supplier-export",
        name: "Supplier delivery CSV or Excel export",
        sourceKind: "csv",
        sourceRole: "internal",
        requiresSimulation: true
      },
      {
        id: "supplier-incidents",
        name: "Historical supplier incidents",
        sourceKind: "csv",
        sourceRole: "historical",
        requiresSimulation: true
      }
    ]
  },

  {
    id: "weather-natural-hazards",
    name: "Weather & Natural Hazards",
    businessQuestion:
      "Could weather or natural hazards disrupt logistics, production, commissioning or sea trials?",
    description:
      "Monitor weather and natural-hazard conditions that may affect transport, outdoor work, production, commissioning, sea trials and business continuity.",
    relatedRiskFactors: [
      "severe-weather",
      "high-wind",
      "storm",
      "flooding",
      "sea-state",
      "transport-disruption"
    ],
    relatedRiskDefinitions: [
      "Sea trial delay",
      "Transport delay",
      "Production interruption",
      "Outdoor work interruption",
      "Business continuity disruption"
    ],
    suggestedSources: [
      {
        id: "fmi",
        name: "Finnish Meteorological Institute",
        sourceKind: "restApi",
        sourceRole: "external",
        requiresSimulation: false
      },
      {
        id: "openweather",
        name: "OpenWeather",
        sourceKind: "restApi",
        sourceRole: "external",
        requiresSimulation: false
      },
      {
        id: "ecmwf",
        name: "ECMWF",
        sourceKind: "restApi",
        sourceRole: "external",
        requiresSimulation: false
      }
    ]
  },

  {
    id: "commodity-energy-prices",
    name: "Commodity & Energy Prices",
    businessQuestion:
      "Are changes in material or energy prices increasing procurement and project cost risks?",
    description:
      "Monitor material, commodity and energy price movements affecting procurement, suppliers, production costs and project profitability.",
    relatedRiskFactors: [
      "commodity-price-volatility",
      "energy-price-volatility",
      "inflation",
      "procurement-cost",
      "supplier-financial-pressure"
    ],
    relatedRiskDefinitions: [
      "Budget overrun",
      "Procurement cost increase",
      "Supplier instability",
      "Material substitution",
      "Project profitability decline"
    ],
    suggestedSources: [
      {
        id: "meps",
        name: "MEPS steel price information",
        sourceKind: "restApi",
        sourceRole: "external",
        requiresSimulation: false
      },
      {
        id: "market-price-api",
        name: "Commodity or financial market API",
        sourceKind: "restApi",
        sourceRole: "external",
        requiresSimulation: false
      },
      {
        id: "procurement-history",
        name: "Internal procurement price history",
        sourceKind: "csv",
        sourceRole: "internal",
        requiresSimulation: true
      }
    ]
  }
];

export function getMonitoringCapabilities(req, res) {
  res.status(200).json({
    count: monitoringCapabilities.length,
    items: monitoringCapabilities
  });
}

export function getMonitoringCapabilityById(req, res) {
  const capability = monitoringCapabilities.find(
    item => item.id === req.params.id
  );

  if (!capability) {
    return res.status(404).json({
      error: "Monitoring objective not found"
    });
  }

  res.status(200).json(capability);
}
