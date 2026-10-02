export function ScaleInput({ question, value, onChange }) {
  const points = [1, 2, 3, 4, 5];

  const labels = question.pointLabels;
  const last = points.length;

  return (
    <div className="mt-3">
      <div className="flex justify-between sm:grid sm:grid-cols-5">
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
            {labels && (
              <span className={`hidden sm:block text-xs font-mono transition-colors duration-200 ${value === n ? "text-zinc-300" : "text-zinc-600"}`}>
                {labels[i]}
              </span>
            )}
          </div>
        ))}
      </div>
      {/* On narrow screens the five labels don't fit under the buttons, so show the two ends and the current pick */}
      {labels && (
        <div className="mt-2 grid grid-cols-[auto_1fr_auto] gap-2 text-xs font-mono sm:hidden">
          <span className={value === 1 ? "text-zinc-300" : "text-zinc-600"}>{labels[0]}</span>
          <span className="text-center text-zinc-300">{value > 1 && value < last ? labels[value - 1] : ""}</span>
          <span className={value === last ? "text-zinc-300" : "text-zinc-600"}>{labels[last - 1]}</span>
        </div>
      )}
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
