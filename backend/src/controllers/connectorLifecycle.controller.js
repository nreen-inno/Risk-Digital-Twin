import {
  acceptConnectorSpecification,
  testConnectorForSource,
  listRawRecordsForSource,
  findLatestDefinitionForSource,
  findLatestSpecificationForSource,
  approveConnectorSample
} from "../connectors/connectorLifecycle.service.js";

async function loadSource(findInformationSourceById, id, res) {
  const source = await findInformationSourceById(id);
  if (!source) {
    res.status(404).json({ error: "Information source not found" });
    return null;
  }
  return source;
}

/**
 * Factory so we can reuse findInformationSourceById from the sources controller
 * without circular imports — wired in routes via bound helpers below.
 */
export function createConnectorLifecycleHandlers({
  findInformationSourceById
}) {
  async function acceptConnectorSpecificationHandler(req, res, next) {
    try {
      const source = await loadSource(
        findInformationSourceById,
        req.params.id,
        res
      );
      if (!source) return;

      const proposal =
        req.body?.proposal ||
        req.body?.connectorAdvice ||
        req.body;

      if (!proposal || typeof proposal !== "object") {
        return res.status(400).json({
          error: "Validation error",
          message: "Request body must include the connector proposal."
        });
      }

      // FE normalized advice nests v2 fields at top level — accept either.
      const normalizedProposal = proposal.recommendation
        ? proposal
        : proposal.connectorAdvice || proposal;

      const result = await acceptConnectorSpecification({
        source,
        proposal: normalizedProposal,
        monitoringObjectiveId:
          req.body?.monitoringObjectiveId ||
          source.monitoringObjectiveIds?.[0] ||
          null
      });

      let test = null;
      const runTest =
        req.body?.runTest !== false && result.executable;

      if (runTest) {
        try {
          test = await testConnectorForSource(source, {
            limit: Number(req.body?.limit) || 15
          });
        } catch (testError) {
          console.error("Auto connector test failed:", testError.message);
          test = {
            error: testError.message,
            code: testError.code || "TEST_FAILED"
          };
        }
      }

      res.status(201).json({
        informationSourceId: source.id,
        acceptedAt: new Date().toISOString(),
        ...result,
        test
      });
    } catch (error) {
      if (error.code === "MISSING_ENDPOINT" || error.code === "VERIFICATION_FAILED") {
        return res.status(400).json({
          error: "Validation error",
          message: error.message,
          code: error.code,
          verification: error.verification || null
        });
      }
      next(error);
    }
  }

  async function testConnectorHandler(req, res, next) {
    try {
      const source = await loadSource(
        findInformationSourceById,
        req.params.id,
        res
      );
      if (!source) return;

      const result = await testConnectorForSource(source, {
        limit: Number(req.body?.limit) || 15,
        endpointOverride: req.body?.endpoint || null
      });

      res.status(200).json({
        informationSourceId: source.id,
        ...result
      });
    } catch (error) {
      if (
        error.code === "NO_DEFINITION" ||
        error.code === "ADAPTER_NOT_IMPLEMENTED"
      ) {
        return res.status(400).json({
          error: "Connector test unavailable",
          message: error.message,
          code: error.code
        });
      }
      next(error);
    }
  }

  async function getRawRecordsHandler(req, res, next) {
    try {
      const source = await loadSource(
        findInformationSourceById,
        req.params.id,
        res
      );
      if (!source) return;

      const limit = Math.min(Number(req.query.limit) || 25, 100);
      const items = await listRawRecordsForSource(source.id, { limit });

      res.status(200).json({
        informationSourceId: source.id,
        count: items.length,
        items
      });
    } catch (error) {
      next(error);
    }
  }

  async function getConnectorStatusHandler(req, res, next) {
    try {
      const source = await loadSource(
        findInformationSourceById,
        req.params.id,
        res
      );
      if (!source) return;

      const definition = await findLatestDefinitionForSource(source.id);
      const specification = await findLatestSpecificationForSource(
        source.id
      );
      const records = await listRawRecordsForSource(source.id, {
        limit: 5
      });

      res.status(200).json({
        informationSourceId: source.id,
        connectorStatus: source.connectorStatus || "notConfigured",
        specification: specification || null,
        definition: definition || null,
        recentRecords: records
      });
    } catch (error) {
      next(error);
    }
  }

  async function approveSampleHandler(req, res, next) {
    try {
      const source = await loadSource(
        findInformationSourceById,
        req.params.id,
        res
      );
      if (!source) return;

      const result = await approveConnectorSample(source);

      res.status(200).json({
        informationSourceId: source.id,
        ...result
      });
    } catch (error) {
      if (error.code === "NO_DEFINITION" || error.code === "NO_SAMPLE") {
        return res.status(400).json({
          error: "Sample approval unavailable",
          message: error.message,
          code: error.code
        });
      }
      next(error);
    }
  }

  return {
    acceptConnectorSpecificationHandler,
    testConnectorHandler,
    getRawRecordsHandler,
    getConnectorStatusHandler,
    approveSampleHandler
  };
}
