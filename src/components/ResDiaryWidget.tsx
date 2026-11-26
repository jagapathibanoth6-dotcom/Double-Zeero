import { isResdiaryEmbed } from "@/lib/resdiary-public";

export function ResDiaryWidget({ src, title }: { src: string; title: string }) {
  const embed = isResdiaryEmbed(src);

  return (
    <div className="overflow-hidden border border-line bg-white">
      {embed ? (
        <iframe
          src={src}
          title={title}
          className="h-[760px] w-full border-0 bg-white"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allow="payment"
        />
      ) : (
        <div className="flex min-h-[420px] flex-col justify-center px-6 py-10 md:px-10">
          <p className="display text-[0.7rem] tracking-[0.28em] text-ember">Live ResDiary</p>
          <h3 className="serif mt-3 text-3xl">{title}</h3>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-mute">
            Availability is taken from this restaurant’s ResDiary. When you confirm, the table shows on that branch’s
            diary — not in a separate website list.
          </p>
          <a href={src} target="_blank" rel="noreferrer" className="btn btn-ember mt-8 w-fit">
            Check availability
          </a>
        </div>
      )}
    </div>
  );
}
