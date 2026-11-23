import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

// Dev only: when RMA_TRACE_CAPTURE_DIR is set, saves every accepted request
// body (after gunzip) so real exports can be kept as test fixtures and replayed.
// Files are named by arrival time, so they sort in order and a server restart
// never overwrites an earlier capture.
export async function captureTraceRequest(body) {
  const dir = process.env.RMA_TRACE_CAPTURE_DIR;
  if (!dir) return;

  await mkdir(dir, { recursive: true });
  const file = path.join(dir, `${new Date().toISOString().replace(/[:.]/g, "-")}.pb`);
  await writeFile(file, body);
  console.log(`[otel]   captured ${file}`);
}
