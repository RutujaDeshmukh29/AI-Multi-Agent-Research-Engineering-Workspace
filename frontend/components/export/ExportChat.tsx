"use client";
// ============================================================
// components/export/ExportChat.tsx
// Phase 4 — Export chat as Markdown or copy to clipboard
// PDF export via browser print dialog (no extra library needed)
// ============================================================

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  agent_outputs?: Record<string, string>;
  created_at: string;
}

interface ExportChatProps {
  messages: Message[];
  sessionTitle: string;
  projectName: string;
}

export function ExportChat({ messages, sessionTitle, projectName }: ExportChatProps) {
  const [open, setOpen]       = useState(false);
  const [copied, setCopied]   = useState(false);
  const [exporting, setExporting] = useState(false);

  // Build Markdown from messages
  const buildMarkdown = (): string => {
    const lines: string[] = [
      `# ${sessionTitle}`,
      `**Project:** ${projectName}`,
      `**Exported:** ${new Date().toLocaleString()}`,
      `**Messages:** ${messages.length}`,
      "",
      "---",
      "",
    ];

    messages.forEach(msg => {
      const time = new Date(msg.created_at).toLocaleTimeString();
      if (msg.role === "user") {
        lines.push(`## 👤 You — ${time}`);
        lines.push("");
        lines.push(msg.content);
        lines.push("");
      } else {
        lines.push(`## ✦ AI Workspace — ${time}`);
        lines.push("");
        lines.push(msg.content);
        // Include agent outputs if expanded
        if (msg.agent_outputs && Object.keys(msg.agent_outputs).length > 0) {
          lines.push("");
          lines.push("<details><summary>Agent Outputs</summary>");
          Object.entries(msg.agent_outputs).forEach(([agent, output]) => {
            lines.push(`\n### ${agent.charAt(0).toUpperCase() + agent.slice(1)} Agent\n${output}`);
          });
          lines.push("</details>");
        }
        lines.push("");
      }
      lines.push("---");
      lines.push("");
    });

    return lines.join("\n");
  };

  const handleCopyMarkdown = async () => {
    const md = buildMarkdown();
    await navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadMarkdown = () => {
    const md   = buildMarkdown();
    const blob = new Blob([md], { type: "text/markdown" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `${sessionTitle.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.md`;
    a.click();
    URL.revokeObjectURL(url);
    setOpen(false);
  };

  const handlePrintPDF = () => {
    // Build a clean HTML page and print it (browser saves as PDF)
    const md = buildMarkdown();
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${sessionTitle}</title>
  <style>
    body { font-family: -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; max-width:800px; margin:40px auto; color:#1a1a1a; line-height:1.6; padding:0 20px; }
    h1 { border-bottom:2px solid #6366f1; padding-bottom:12px; color:#1a1a1a; }
    h2 { color:#4338ca; margin-top:2em; font-size:1em; font-weight:600; }
    h2:contains('You') { color:#059669; }
    pre { background:#f5f5f5; padding:12px; border-radius:6px; overflow-x:auto; font-size:0.9em; }
    code { background:#f5f5f5; padding:2px 5px; border-radius:3px; font-size:0.9em; }
    details { background:#f9f9f9; border:1px solid #e5e7eb; border-radius:6px; padding:8px 12px; margin:8px 0; }
    hr { border:none; border-top:1px solid #e5e7eb; margin:1.5em 0; }
    @media print { body { margin:0; } }
  </style>
</head>
<body>
  <pre style="white-space:pre-wrap;font-family:inherit;font-size:inherit;background:none;padding:0">${md.replace(/</g,"&lt;").replace(/>/g,"&gt;")}</pre>
</body>
</html>`;
    const win = window.open("", "_blank");
    if (win) {
      win.document.write(html);
      win.document.close();
      setTimeout(() => win.print(), 500);
    }
    setOpen(false);
  };

  if (messages.length === 0) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(p => !p)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-white/[0.09] text-white/35 hover:text-white/65 hover:border-white/[0.18] transition-all text-[11.5px] font-medium"
        title="Export chat"
      >
        <span className="text-[13px]">↓</span> Export
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -8 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-full mt-2 w-52 bg-[#0d0e16] border border-white/[0.1] rounded-xl shadow-2xl z-50 overflow-hidden"
            >
              {[
                { icon: "📋", label: "Copy as Markdown", desc: "To clipboard", action: handleCopyMarkdown, highlight: copied },
                { icon: "⬇️", label: "Download .md file", desc: "Save locally", action: handleDownloadMarkdown },
                { icon: "📄", label: "Export as PDF",    desc: "Via print dialog", action: handlePrintPDF },
              ].map(item => (
                <button
                  key={item.label}
                  onClick={item.action}
                  className={cn(
                    "w-full flex items-start gap-3 px-3.5 py-2.5 text-left hover:bg-white/[0.05] transition-all border-b border-white/[0.05] last:border-0",
                  )}
                >
                  <span className="text-[14px] mt-0.5">{item.icon}</span>
                  <div>
                    <div className={cn("text-[12px] font-medium", item.highlight ? "text-emerald-400" : "text-white/70")}>
                      {item.highlight ? "Copied!" : item.label}
                    </div>
                    <div className="text-[10.5px] text-white/30 mt-0.5">{item.desc}</div>
                  </div>
                </button>
              ))}

              <div className="px-3.5 py-2 text-[10px] text-white/20">
                {messages.length} messages · {sessionTitle.slice(0, 25)}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
