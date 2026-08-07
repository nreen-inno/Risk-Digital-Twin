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
                id: "eu-fsf-opensanctions",
                name: "EU Financial Sanctions (OpenSanctions eu_fsf)",
                sourceKind: "restApi",
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
                id: "open-meteo",
                name: "Open-Meteo",
                sourceKind: "restApi",
                sourceRole: "external",
                requiresSimulation: false
            },
            {
                id: "fmi",
                name: "Finnish Meteorological Institute",
                sourceKind: "rss",
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
    },

    {
        id: "customer-commercial",
        name: "Customer & Commercial",
        businessQuestion:
            "Is customer demand, order-book strength or customer credit becoming a commercial risk?",
        description:
            "Monitor customer demand, order-book strength, contract deferrals and customer credit conditions that may affect commercial exposure, revenue and programme commitments.",
        relatedRiskFactors: [
            "demand-softening",
            "order-book-deferral",
            "customer-credit",
            "economic-cycle"
        ],
        relatedRiskDefinitions: [
            "Customer order deferral",
            "Revenue shortfall",
            "Customer credit default",
            "Order-book concentration",
            "Contract renegotiation"
        ],
        suggestedSources: [
            {
                id: "crm-pipeline",
                name: "CRM or sales pipeline",
                sourceKind: "restApi",
                sourceRole: "internal",
                requiresSimulation: true
            },
            {
                id: "order-book",
                name: "Order-book / contract register",
                sourceKind: "database",
                sourceRole: "internal",
                requiresSimulation: true
            },
            {
                id: "credit-ratings",
                name: "Customer credit ratings or financial news",
                sourceKind: "restApi",
                sourceRole: "external",
                requiresSimulation: false
            }
        ]
    },

    {
        id: "workforce-hse",
        name: "Workforce & HSE",
        businessQuestion:
            "Is workforce availability and safety performance holding up?",
        description:
            "Monitor workforce availability, skilled-labour capacity and health, safety and environment performance that may affect production, commissioning and project delivery.",
        relatedRiskFactors: [
            "workforce-availability",
            "skilled-labour-capacity",
            "hse-performance"
        ],
        relatedRiskDefinitions: [
            "Workforce shortage",
            "Skilled-labour bottleneck",
            "HSE incident",
            "Production interruption",
            "Commissioning delay"
        ],
        suggestedSources: [
            {
                id: "hr-workforce",
                name: "HR / workforce planning system",
                sourceKind: "restApi",
                sourceRole: "internal",
                requiresSimulation: true
            },
            {
                id: "hse-incidents",
                name: "HSE incident and near-miss register",
                sourceKind: "csv",
                sourceRole: "internal",
                requiresSimulation: true
            },
            {
                id: "labour-market",
                name: "Labour-market or union bulletins",
                sourceKind: "rss",
                sourceRole: "external",
                requiresSimulation: false
            }
        ]
    }
];
export { monitoringCapabilities };

export function findMonitoringCapabilityById(id) {
    return monitoringCapabilities.find(
        capability => capability.id === id
    );
}
