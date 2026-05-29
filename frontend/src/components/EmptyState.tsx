import SuggestionChips from "./SuggestionChips";

export default function EmptyState() {

  return (
    <div className="flex flex-col items-center justify-center h-full">

      <h1 className="text-5xl font-bold text-center leading-tight bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">

        AI Multi-Agent
        <br />
        Workspace

      </h1>

      <p className="text-zinc-400 mt-6 text-lg">

        Build. Research. Engineer. Collaborate.

      </p>

      <SuggestionChips />

    </div>
  );
}