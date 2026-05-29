import { Plus } from "lucide-react";

export default function Sidebar() {

  return (
    <div className="w-[290px] bg-black/40 border-r border-white/10 backdrop-blur-xl p-5 flex flex-col">

      <button className="flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 p-4 rounded-2xl hover:scale-[1.02] transition-all duration-300 shadow-lg shadow-purple-500/20">

        <Plus size={18} />

        New Chat

      </button>

      <div className="mt-10 flex flex-col gap-3">

        <div className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 cursor-pointer transition-all">

          AI Workspace Setup

        </div>

        <div className="p-4 rounded-2xl hover:bg-white/5 cursor-pointer transition-all">

          LangGraph Workflow

        </div>

      </div>

    </div>
  );
}