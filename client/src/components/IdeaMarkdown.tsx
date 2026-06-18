import ReactMarkdown from 'react-markdown';

export function IdeaMarkdown({ content }: { content: string }) {
  return (
    <div className="markdown">
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
}

export function StreamingSkeleton() {
  return (
    <div className="space-y-3 animate-pulse-soft">
      <div className="h-7 w-2/3 rounded bg-slate-200 dark:bg-slate-800" />
      <div className="h-4 w-1/3 rounded bg-slate-200 dark:bg-slate-800 mt-6" />
      <div className="h-4 w-full rounded bg-slate-200 dark:bg-slate-800" />
      <div className="h-4 w-5/6 rounded bg-slate-200 dark:bg-slate-800" />
      <div className="h-4 w-1/3 rounded bg-slate-200 dark:bg-slate-800 mt-6" />
      <div className="h-4 w-full rounded bg-slate-200 dark:bg-slate-800" />
      <div className="h-4 w-full rounded bg-slate-200 dark:bg-slate-800" />
      <div className="h-4 w-2/3 rounded bg-slate-200 dark:bg-slate-800" />
    </div>
  );
}
