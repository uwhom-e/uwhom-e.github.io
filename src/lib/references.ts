import { getCollection } from 'astro:content';

// Raw source of every page and log entry, used to find where each reference is first cited.
const sources = import.meta.glob(['/src/pages/**/*.astro', '/src/content/logs/**/*.{md,mdx}'], {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

// Reading order of the site: home page first, then log entries oldest to newest, then other pages.
function sourceRank(path: string) {
  if (path === '/src/pages/index.astro') return 0;
  if (path.startsWith('/src/content/logs/')) return 1;
  return 2;
}

function citationOrder() {
  const paths = Object.keys(sources).sort(
    (a, b) => sourceRank(a) - sourceRank(b) || a.localeCompare(b)
  );
  const order: string[] = [];
  for (const path of paths) {
    for (const [, id] of sources[path].matchAll(/<Cite\s+id=["']([^"']+)["']/g)) {
      if (!order.includes(id)) order.push(id);
    }
  }
  return order;
}

// IEEE style: references are numbered in the order they are first cited across the site,
// so a reference's position here is its citation number ([1], [2], ...). Uncited
// references follow, alphabetically by title.
export async function getSortedReferences() {
  const all = await getCollection('references');
  const order = citationOrder();
  const rank = (id: string) => {
    const i = order.indexOf(id);
    return i === -1 ? Infinity : i;
  };
  return all.sort((a, b) => {
    const diff = rank(a.id) - rank(b.id);
    if (diff !== 0 && !Number.isNaN(diff)) return diff;
    return a.data.title.localeCompare(b.data.title);
  });
}
