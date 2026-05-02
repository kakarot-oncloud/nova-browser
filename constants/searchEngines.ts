export interface SearchEngine {
  id: string;
  name: string;
  url: string;
  queryParam: string;
  icon: string;
  color: string;
}

export const SEARCH_ENGINES: SearchEngine[] = [
  {
    id: "google",
    name: "Google",
    url: "https://www.google.com/search",
    queryParam: "q",
    icon: "logo-google",
    color: "#4285F4",
  },
  {
    id: "duckduckgo",
    name: "DuckDuckGo",
    url: "https://duckduckgo.com/",
    queryParam: "q",
    icon: "search",
    color: "#DE5833",
  },
  {
    id: "bing",
    name: "Bing",
    url: "https://www.bing.com/search",
    queryParam: "q",
    icon: "search",
    color: "#0078D4",
  },
  {
    id: "brave",
    name: "Brave Search",
    url: "https://search.brave.com/search",
    queryParam: "q",
    icon: "shield",
    color: "#FB542B",
  },
  {
    id: "ecosia",
    name: "Ecosia",
    url: "https://www.ecosia.org/search",
    queryParam: "q",
    icon: "leaf",
    color: "#5DB85C",
  },
  {
    id: "yahoo",
    name: "Yahoo",
    url: "https://search.yahoo.com/search",
    queryParam: "p",
    icon: "search",
    color: "#720E9E",
  },
  {
    id: "startpage",
    name: "Startpage",
    url: "https://www.startpage.com/search",
    queryParam: "q",
    icon: "search",
    color: "#4455DD",
  },
];

export const DEFAULT_SEARCH_ENGINE = "google";

export function buildSearchUrl(engine: SearchEngine, query: string): string {
  const params = new URLSearchParams({ [engine.queryParam]: query });
  return `${engine.url}?${params.toString()}`;
}
