interface Props {
  title: string;
  content: string;
  color: string;
}

export default function AgentCard({
  title,
  content,
  color,
}: Props) {

  return (
    <div className="bg-white/5 border border-white/10 rounded-3xl p-5 backdrop-blur-xl">

      <div className="flex items-center gap-3 mb-4">

        <div
          className={`w-3 h-3 rounded-full ${color}`}
        />

        <h3 className="font-semibold">
          {title}
        </h3>

      </div>

      <p className="text-zinc-300 leading-7">

        {content}

      </p>

    </div>
  );
}