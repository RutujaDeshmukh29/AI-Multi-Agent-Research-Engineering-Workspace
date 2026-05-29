export default function TypingLoader() {

  return (
    <div className="flex items-center gap-3 text-zinc-400">

      <div className="flex gap-1">

        <div className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" />
        <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce delay-100" />
        <div className="w-2 h-2 rounded-full bg-purple-400 animate-bounce delay-200" />

      </div>

      <p className="text-sm">
        Multi-Agent System Thinking...
      </p>

    </div>
  );
}