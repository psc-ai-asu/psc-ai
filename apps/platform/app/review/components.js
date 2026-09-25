export function ScaleInput({ question, value, onChange }) {
  const points = [1, 2, 3, 4, 5];

  return (
    <div className="mt-3 flex gap-5">
      {points.map((n, i) => (
        <div key={n} className="flex flex-col items-center gap-1.5">
          <button
            type="button"
            onClick={() => onChange(n)}
            className={`w-10 h-10 rounded-full text-sm font-bold border-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-900 cursor-pointer
              ${value === n
                ? "bg-violet-500 text-white border-violet-500 scale-110 shadow-lg shadow-violet-500/20"
                : "bg-transparent text-zinc-400 border-zinc-700 hover:border-violet-400 hover:text-zinc-200"
              }`}
          >
            {n}
          </button>
          {question.pointLabels && (
            <span className={`text-xs font-mono transition-colors duration-200 ${value === n ? "text-zinc-300" : "text-zinc-600"}`}>
              {question.pointLabels[i]}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

export function TextInput({ placeholder, value, onChange, size }) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={size}
      className="mt-3 w-full bg-zinc-800/60 border border-zinc-700 rounded-xl px-4 py-3 text-zinc-200 text-sm placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all resize-none font-light leading-relaxed"
    />
  );
}
