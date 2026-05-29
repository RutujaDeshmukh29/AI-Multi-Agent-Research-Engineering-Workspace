"use client";

import ReactMarkdown from "react-markdown";
import { motion } from "framer-motion";

interface Props {
  role: "user" | "assistant";
  content: string;
}

export default function MessageBubble({
  role,
  content,
}: Props) {

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
      className={`flex ${
        role === "user"
          ? "justify-end"
          : "justify-start"
      }`}
    >

      <div
        className={`max-w-[75%] p-5 rounded-3xl ${
          role === "user"
            ? "bg-gradient-to-r from-purple-600 to-blue-600 shadow-lg shadow-purple-500/20"
            : "bg-white/5 border border-white/10 backdrop-blur-xl"
        }`}
      >

        <ReactMarkdown>
          {content}
        </ReactMarkdown>

      </div>

    </motion.div>
  );
}