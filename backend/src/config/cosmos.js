import { CosmosClient } from "@azure/cosmos";

const {
  COSMOS_ENDPOINT,
  COSMOS_KEY,
  COSMOS_DATABASE,
  COSMOS_CONTAINER
} = process.env;

if (!COSMOS_ENDPOINT || !COSMOS_KEY) {
  throw new Error(
    "Missing COSMOS_ENDPOINT or COSMOS_KEY in the .env file."
  );
}

if (!COSMOS_DATABASE || !COSMOS_CONTAINER) {
  throw new Error(
    "Missing COSMOS_DATABASE or COSMOS_CONTAINER in the .env file."
  );
}

const cosmosClient = new CosmosClient({
  endpoint: COSMOS_ENDPOINT,
  key: COSMOS_KEY
});

const database = cosmosClient.database(COSMOS_DATABASE);
const container = database.container(COSMOS_CONTAINER);

export {
  cosmosClient,
  database,
  container
};