"use client";
import ReactMarkdown from "react-markdown";
import { motion } from "framer-motion";
import remarkGfm from "remark-gfm";
interface Props {
  role: "user" | "assistant";
  content: string;
}
export default function MessageBubble({ role, content }: Props) {
  if (role === "assistant") {
    return (
      <motion.div
        initial={{
          opacity: 0,
          y: 20,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        className="flex justify-start"
      >
        <div className="relative max-w-[75%] p-5 rounded-3xl bg-gradient-to-r from-gray-700 to-gray-800 shadow-lg shadow-gray-900/20 glassmorphism gradient-border">
          <div className="prose">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
          </div>
        </div>
      </motion.div>
    );
  }
  return (
    <motion.div
      initial={{
        opacity: 0,
        y: 20,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      className="flex justify-end"
    >
      <div className="relative max-w-[75%] p-5 rounded-3xl bg-gradient-to-r from-purple-600 to-blue-600 shadow-lg shadow-purple-500/20 glassmorphism gradient-border">
        <div className="prose">
          <ReactMarkdown>{content}</ReactMarkdown>
        </div>
      </div>
    </motion.div>
  );
}