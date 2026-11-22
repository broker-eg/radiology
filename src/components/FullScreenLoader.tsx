export function FullScreenLoader({ label = 'Loading the suite' }: { label?: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-900" role="status">
      <div className="flex items-center gap-3 text-sm text-film-400">
        <span className="relative flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-localizer/60" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-localizer" />
        </span>
        {label}
      </div>
    </div>
  );
}
