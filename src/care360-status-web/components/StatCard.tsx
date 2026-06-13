import Link from 'next/link';
import clsx from 'clsx';

interface Props {
  title: string;
  value: string | number;
  sub?: string;
  accent?: 'green' | 'amber' | 'red' | 'blue' | 'slate';
  href?: string;
}

const accentCls = {
  green: 'border-t-green-500 text-green-400',
  amber: 'border-t-amber-400 text-amber-400',
  red:   'border-t-red-500  text-red-400',
  blue:  'border-t-blue-500 text-blue-400',
  slate: 'border-t-slate-500 text-slate-300',
};

export default function StatCard({ title, value, sub, accent: a = 'slate', href }: Props) {
  const cls = clsx(
    'bg-navy-800 rounded-xl border border-navy-600 border-t-4 px-5 py-4 shadow-sm',
    accentCls[a].split(' ')[0],
    href && 'hover:bg-navy-750 hover:border-navy-500 transition-colors cursor-pointer'
  );

  const content = (
    <>
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</p>
      <p className={clsx('text-3xl font-bold mt-1', accentCls[a].split(' ')[1])}>
        {value}
      </p>
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
    </>
  );

  if (href) return <Link href={href} className={cls}>{content}</Link>;
  return <div className={cls}>{content}</div>;
}
