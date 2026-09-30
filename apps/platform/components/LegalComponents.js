export function BulletList({ items }) {
  return (
    <ul className="my-2 mb-4">
      {items.map((item, i) => (
        <li
          key={i}
          className="relative text-[14.5px] text-[var(--text-secondary)] font-light leading-relaxed pl-5 py-1.5"
        >
          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-violet-500 opacity-60" />
          {item}
        </li>
      ))}
    </ul>
  );
}

export function ContactCard() {
  return (
    <div className="bg-[var(--bg-raised)] border border-[var(--border)] rounded-xl p-6 mt-2 space-y-1.5">
      <p className="text-[14px] font-medium text-[var(--text)]">Gentle Systems</p>
      <p className="text-[14px] font-light text-[var(--text-muted)]">
        Email:{" "}
        <a href="mailto:contact@reviewmyagent.today" className="text-violet-400 hover:underline">contact@reviewmyagent.today</a>
      </p>
      <p className="text-[14px] font-light text-[var(--text-muted)]">
        Website:{" "}
        <a href="#" className="text-violet-400 hover:underline">reviewmyagent.today</a>
      </p>
    </div>
  );
}

export function DocSection({ id, title, children }) {
  return (
    <section id={id} className="mb-12 scroll-mt-20">
      <h2 className="text-[22px] font-normal text-[var(--text)] mb-4 flex items-center gap-3">
        {title}
      </h2>
      {children}
    </section>
  );
}

export function BodyText({ children }) {
  return (
    <p className="text-[14.5px] text-[var(--text-secondary)] font-light leading-relaxed mb-3">
      {children}
    </p>
  );
}

export function Callout({ children }) {
  return (
    <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-lg px-5 py-4 my-3">
      <p className="text-[13px] text-yellow-200/70 font-normal leading-relaxed tracking-wide m-0">
        {children}
      </p>
    </div>
  );
}
