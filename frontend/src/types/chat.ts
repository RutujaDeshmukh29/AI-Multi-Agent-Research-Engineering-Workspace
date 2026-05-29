export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export interface ChatSession {
  id: string;
  title: string;
  agentId: string;
  messages: Message[];
}

export interface Agent {
  id: string;
  title: string;
  description: string;
  color: string;
}