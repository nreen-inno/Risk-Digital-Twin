import {
  monitoringCapabilities,
  findMonitoringCapabilityById
} from "../data/monitoringCapabilities.js";

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
