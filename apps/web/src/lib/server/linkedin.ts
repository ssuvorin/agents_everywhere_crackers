/**
 * LinkedIn data-export processing: unzip → parse CSVs → relationship graph +
 * embedded message index. Runs entirely server-side; the browser only sees
 * the resulting summary.
 */
import { unzipSync, strFromU8 } from "fflate";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const DATA_DIR = path.join(process.cwd(), "public", "data");
const OWNER = "Maya Haddad";

export type Contact = {
  id: string;
  name: string;
  type: "me" | "contact";
  company: string;
  position: string;
  linkedin_url: string;
  messages: number;
  last_contact: string;
  sample: string[];
};
export type OwnerProfile = {
  name: string;
  headline: string;
  summary: string;
  industry: string;
  location: string;
  linkedin_url: string;
  positions: { company: string; title: string; started: string; finished: string }[];
};
export type GraphData = {
  owner: OwnerProfile;
  nodes: Contact[];
  links: { source: string; target: string; weight: number }[];
};
export type MessageRecord = {
  id: number;
  from: string;
  to: string;
  other: string;
  date: string;
  content: string;
  embedding?: number[];
};

/** Minimal CSV row parser — handles quoted fields with commas and newlines. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.length > 1 || row[0] !== "") rows.push(row);
      row = [];
    } else {
      field += c;
    }
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function slug(name: string): string {
  return name
    .toLowerCase()
    .replace(/\W+/g, "-")
    .replace(/^-|-$/g, "");
}

export function buildGraph(zip: Uint8Array): {
  graph: GraphData;
  messages: MessageRecord[];
  stats: { contacts: number; messages: number; skipped: string[] };
} {
  const files = unzipSync(zip);
  const skipped: string[] = [];

  const connFile = Object.keys(files).find((f) => /connections\.csv$/i.test(f));
  const people = new Map<
    string,
    { company: string; position: string; connected_on: string; url: string }
  >();
  if (connFile) {
    const rows = parseCsv(strFromU8(files[connFile]));
    const headerIdx = rows.findIndex((r) => r[0] === "First Name");
    for (const r of rows.slice(headerIdx + 1)) {
      if (r.length >= 7 && r[0] && r[1]) {
        people.set(`${r[0]} ${r[1]}`, {
          url: r[2] ?? "",
          company: r[4] ?? "",
          position: r[5] ?? "",
          connected_on: r[6] ?? "",
        });
      }
    }
  } else {
    skipped.push("Connections.csv");
  }

  // Profile.csv — the owner: headline, summary, industry, location.
  const owner: OwnerProfile = {
    name: OWNER,
    headline: "",
    summary: "",
    industry: "",
    location: "",
    linkedin_url: "",
    positions: [],
  };
  const profFile = Object.keys(files).find((f) => /(^|\/)profile\.csv$/i.test(f));
  if (profFile) {
    const rows = parseCsv(strFromU8(files[profFile]));
    const header = rows[0] ?? [];
    const col = (name: string) => header.indexOf(name);
    const r = rows[1] ?? [];
    owner.name = `${r[col("First Name")] ?? ""} ${r[col("Last Name")] ?? ""}`.trim() || OWNER;
    owner.headline = r[col("Headline")] ?? "";
    owner.summary = r[col("Summary")] ?? "";
    owner.industry = r[col("Industry")] ?? "";
    owner.location = r[col("Geo Location")] ?? r[col("Address")] ?? "";
  } else {
    skipped.push("Profile.csv");
  }

  // Positions.csv — work history, most recent first.
  const posFile = Object.keys(files).find((f) => /positions\.csv$/i.test(f));
  if (posFile) {
    const rows = parseCsv(strFromU8(files[posFile]));
    const header = rows[0] ?? [];
    const col = (name: string) => header.indexOf(name);
    for (const r of rows.slice(1)) {
      if (r[col("Company Name")]) {
        owner.positions.push({
          company: r[col("Company Name")] ?? "",
          title: r[col("Title")] ?? "",
          started: r[col("Started On")] ?? "",
          finished: r[col("Finished On")] ?? "",
        });
      }
    }
  }

  // messages.csv — interaction counts, last date, samples.
  const msgFile = Object.keys(files).find((f) => /^messages\.csv$/i.test(f));
  const counts = new Map<string, number>();
  const lastDate = new Map<string, string>();
  const samples = new Map<string, string[]>();
  const messages: MessageRecord[] = [];
  if (msgFile) {
    const rows = parseCsv(strFromU8(files[msgFile]));
    const header = rows[0];
    const col = (name: string) => header.indexOf(name);
    const [cFrom, cTo, cDate, cContent, cFromUrl, cToUrl] = [
      col("FROM"),
      col("TO"),
      col("DATE"),
      col("CONTENT"),
      col("SENDER PROFILE URL"),
      col("RECIPIENT PROFILE URLS"),
    ];
    const urls = new Map<string, string>();
    let id = 0;
    for (const r of rows.slice(1)) {
      const from = r[cFrom] ?? "";
      const to = r[cTo] ?? "";
      const fromUrl = r[cFromUrl] ?? "";
      const toUrl = (r[cToUrl] ?? "").split(";")[0]?.trim() ?? "";
      if (from === owner.name && !owner.linkedin_url) owner.linkedin_url = fromUrl;
      if (to === owner.name && !owner.linkedin_url) owner.linkedin_url = toUrl;
      if (from !== owner.name && fromUrl) urls.set(from, fromUrl);
      if (to !== owner.name && toUrl) urls.set(to, toUrl);
      const other = from === owner.name ? to : from;
      if (!other || other === owner.name) continue;
      const date = (r[cDate] ?? "").slice(0, 10);
      const content = r[cContent] ?? "";
      counts.set(other, (counts.get(other) ?? 0) + 1);
      if (!lastDate.get(other) || date > lastDate.get(other)!)
        lastDate.set(other, date);
      if (content && (samples.get(other)?.length ?? 0) < 2)
        samples.set(other, [...(samples.get(other) ?? []), content.slice(0, 160)]);
      if (content)
        messages.push({ id: id++, from, to, other, date, content });
    }
    // Merge message-derived URLs into the people map (Connections.csv wins).
    for (const [name, url] of urls) {
      const p = people.get(name);
      if (p && !p.url) p.url = url;
      else if (!p) people.set(name, { company: "", position: "", connected_on: "", url });
    }
  } else {
    skipped.push("messages.csv");
  }

  // Graph: owner center; messaged contacts by volume + a tail of known-company
  // connections for density.
  const nodes: Contact[] = [
    {
      id: "maya",
      name: owner.name,
      type: "me",
      company: owner.positions[0]?.company ?? "",
      position: owner.positions[0]?.title ?? "",
      linkedin_url: owner.linkedin_url,
      messages: 0,
      last_contact: "",
      sample: [],
    },
  ];
  const links: GraphData["links"] = [];
  const seen = new Set<string>();
  const byCount = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  for (const [name, cnt] of byCount.slice(0, 60)) {
    const id = slug(name);
    if (seen.has(id)) continue;
    seen.add(id);
    const p = people.get(name);
    nodes.push({
      id,
      name,
      type: "contact",
      company: p?.company ?? "",
      position: p?.position ?? "",
      linkedin_url: p?.url ?? "",
      messages: cnt,
      last_contact: lastDate.get(name) ?? "",
      sample: (samples.get(name) ?? []).slice(0, 1),
    });
    links.push({ source: "maya", target: id, weight: cnt });
  }
  let extra = 0;
  for (const [name, p] of people) {
    if (extra >= 25) break;
    const id = slug(name);
    if (seen.has(id) || !p.company) continue;
    seen.add(id);
    extra++;
    nodes.push({
      id,
      name,
      type: "contact",
      company: p.company,
      position: p.position,
      linkedin_url: p.url,
      messages: 0,
      last_contact: p.connected_on,
      sample: [],
    });
    links.push({ source: "maya", target: id, weight: 1 });
  }

  return {
    graph: { owner, nodes, links },
    messages,
    stats: {
      contacts: nodes.length - 1,
      messages: messages.length,
      skipped,
    },
  };
}

/** Embed texts via OpenRouter (OpenAI-compatible), preserving input order. */
export async function embedTexts(
  texts: string[],
  apiKey: string,
  model = "openai/text-embedding-3-small",
  batchSize = 64,
): Promise<number[][]> {
  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const res = await fetch("https://openrouter.ai/api/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model, input: batch }),
    });
    if (!res.ok) throw new Error(`OpenRouter embeddings: HTTP ${res.status}`);
    const json = (await res.json()) as {
      data: { index: number; embedding: number[] }[];
    };
    const ordered = [...json.data].sort((a, b) => a.index - b.index);
    for (const d of ordered) out.push(d.embedding);
  }
  return out;
}

export function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);
}

export async function saveGraph(graph: GraphData) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(
    path.join(DATA_DIR, "graph.json"),
    JSON.stringify(graph),
  );
}

export async function saveIndex(messages: MessageRecord[]) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(
    path.join(DATA_DIR, "messages-index.json"),
    JSON.stringify(messages),
  );
}
