"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { ProblemMetadata } from "@sim/domain";
import { catalogCategory, csesSourceId } from "../lib/catalog";

export function ProblemsLibrary({
  entries,
  exploredIds,
  initialConcept,
}: {
  entries: Array<ProblemMetadata & { algorithm: string }>;
  exploredIds: string[];
  initialConcept: string;
}) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [concept, setConcept] = useState(initialConcept);
  const [progress, setProgress] = useState("all");
  const [sort, setSort] = useState("title");
  const [opened, setOpened] = useState<string[]>([]);
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("atlas:opened") ?? "[]");
      if (Array.isArray(saved))
        setOpened(
          saved.filter((item): item is string => typeof item === "string"),
        );
    } catch {
      // Local progress is optional.
    }
  }, []);
  const explored = useMemo(
    () => new Set([...exploredIds, ...opened]),
    [exploredIds, opened],
  );
  const categories = useMemo(
    () => [...new Set(entries.map(catalogCategory))].sort(),
    [entries],
  );
  const concepts = useMemo(
    () =>
      [...new Set(entries.flatMap((entry) => entry.tags))].sort((a, b) =>
        a.localeCompare(b),
      ),
    [entries],
  );
  const results = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return entries
      .filter((entry) => {
        const group = catalogCategory(entry);
        const terms = [
          entry.title,
          entry.id,
          csesSourceId(entry),
          entry.category,
          group,
          entry.algorithm,
          ...entry.tags,
        ]
          .join(" ")
          .toLocaleLowerCase();
        return (
          (!query || terms.includes(query)) &&
          (category === "all" || group === category) &&
          (!concept ||
            entry.tags.some(
              (tag) => tag.toLocaleLowerCase() === concept.toLocaleLowerCase(),
            )) &&
          (progress === "all" ||
            (progress === "explored") === explored.has(entry.id))
        );
      })
      .sort((a, b) =>
        sort === "category"
          ? catalogCategory(a).localeCompare(catalogCategory(b)) ||
            a.title.localeCompare(b.title)
          : sort === "source"
            ? Number(csesSourceId(a)) - Number(csesSourceId(b))
            : a.title.localeCompare(b.title),
      );
  }, [entries, search, category, concept, progress, sort, explored]);
  function clear() {
    setSearch("");
    setCategory("all");
    setConcept("");
    setProgress("all");
    setSort("title");
  }
  return (
    <>
      <div className="library-search">
        <label htmlFor="problem-search">Search problems</label>
        <input
          id="problem-search"
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Title, CSES ID, BFS, segment tree…"
        />
      </div>
      <details className="library-filters" open>
        <summary>Filters and sort</summary>
        <div className="library-filter-grid">
          <label>
            Category
            <select
              aria-label="Category"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              <option value="all">All categories</option>
              {categories.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <label>
            Concept or algorithm
            <select
              aria-label="Concept or algorithm"
              value={concept}
              onChange={(event) => setConcept(event.target.value)}
            >
              <option value="">All concepts</option>
              {concepts.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <label>
            Progress
            <select
              aria-label="Progress"
              value={progress}
              onChange={(event) => setProgress(event.target.value)}
            >
              <option value="all">All progress</option>
              <option value="explored">Explored</option>
              <option value="new">Not yet explored</option>
            </select>
          </label>
          <label>
            Sort by
            <select
              aria-label="Sort by"
              value={sort}
              onChange={(event) => setSort(event.target.value)}
            >
              <option value="title">Title</option>
              <option value="category">Category</option>
              <option value="source">CSES ID</option>
            </select>
          </label>
        </div>
      </details>
      <div className="library-summary">
        <p role="status">
          {results.length} of {entries.length} interactive problems
        </p>
        <button type="button" onClick={clear}>
          Clear filters
        </button>
      </div>
      <div className="library-list">
        {results.map((entry) => {
          const group = catalogCategory(entry);
          return (
            <Link
              className="library-row"
              key={entry.id}
              href={"/problems/" + entry.id}
            >
              <div className="library-row-main">
                <strong>{entry.title}</strong>
                <span>{entry.summary}</span>
              </div>
              <span className="category" data-category={group}>
                {group}
              </span>
              <span className="library-concept">
                {entry.tags[0] ?? "Algorithm"}
              </span>
              <span className="library-progress">
                {explored.has(entry.id) ? "Explored" : "New"}
              </span>
              <span className="library-arrow" aria-hidden="true">
                ↗
              </span>
            </Link>
          );
        })}
        {!results.length && (
          <div className="library-empty">
            <strong>No matching problems</strong>
            <p>Try another term or clear the filters.</p>
            <button type="button" onClick={clear}>
              Show all problems
            </button>
          </div>
        )}
      </div>
    </>
  );
}
