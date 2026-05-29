export default function Navbar() {

  return (
    <div className="h-[75px] border-b border-white/10 backdrop-blur-xl bg-black/20 flex items-center justify-between px-8">

      <div>

        <h1 className="text-lg font-semibold">
          AI Workspace
        </h1>

        <p className="text-sm text-zinc-500">
          Multi-Agent Engineering System
        </p>

      </div>

      <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-blue-500" />

    </div>
  );
}