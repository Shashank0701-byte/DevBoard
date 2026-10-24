const PRIORITY_PHRASE =
  /\b(?:(high|medium|low)\s+priority|priority\s+(high|medium|low))\b/gi;

const STANDALONE_PRIORITY = /\b(high|medium|low|priority)\b/gi;

/**
 * Turn a spoken phrase into a backlog task.
 * "Fix auth bug high priority" → { title: "Fix auth bug", priority: "high" }.
 * Priority words are matched as whole words so "highlight" stays in the title.
 */
export const parseSpokenTask = (transcript) => {
  const text = String(transcript || "").replace(/\s+/g, " ").trim();
  if (!text) return { title: "", priority: "medium" };

  const phrase = text.match(/\b(high|medium|low)\s+priority\b|\bpriority\s+(high|medium|low)\b/i);
  const word = text.match(/\b(high|medium|low)\b/i);
  const priority = (phrase?.[1] || phrase?.[2] || word?.[1] || "medium").toLowerCase();

  const title = text
    .replace(PRIORITY_PHRASE, " ")
    .replace(STANDALONE_PRIORITY, " ")
    .replace(/\s+/g, " ")
    .trim();

  return { title, priority };
};
