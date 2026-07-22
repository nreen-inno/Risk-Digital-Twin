import "dotenv/config";
import app from "./app.js";

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Risk Digital Twin API running at http://localhost:${port}`);
  console.log(`Health check: http://localhost:${port}/api/health`);
});
