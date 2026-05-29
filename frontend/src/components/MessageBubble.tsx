"use client";

import ReactMarkdown from "react-markdown";

import { motion } from "framer-motion";

import AgentCard from "./AgentCard";

interface Props {
  role: "user" | "assistant";
  content: string;
}

export default function MessageBubble({
  role,
  content,
}: Props) {

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
        className="space-y-5"
      >

        <AgentCard
          title="Research Agent"
          color="bg-blue-500"
          content={content}
        />

        <AgentCard
          title="Engineering Agent"
          color="bg-purple-500"
          content="Suggested architecture and implementation strategies generated."
        />

        <AgentCard
          title="Critic Agent"
          color="bg-red-500"
          content="Potential scalability and deployment concerns identified."
        />

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

      <div className="max-w-[75%] p-5 rounded-3xl bg-gradient-to-r from-purple-600 to-blue-600 shadow-lg shadow-purple-500/20">

        <ReactMarkdown>
          {content}
        </ReactMarkdown>

      </div>

    </motion.div>
  );
}