const suggestions = [
  "Build AI SaaS roadmap",
  "Explain LangGraph simply",
  "Design scalable AI architecture",
  "Create AI engineering workflow",
];

export default function SuggestionChips() {

  return (
    <div className="flex flex-wrap gap-3 mt-10 justify-center">

      {suggestions.map((item) => (

        <button
          key={item}
          className="px-5 py-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all duration-300"
        >
          {item}
        </button>

      ))}

    </div>
  );
}