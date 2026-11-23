import { cn } from '@/lib/utils';
import { splitGeneratorName } from '../lib/name';
import { Highlight } from './Highlight';

/** A generator's name with the exam first and the shared product words quieter. */
export function GeneratorName({
  name,
  tokens = [],
  kindClassName,
}: {
  name: string;
  tokens?: string[];
  kindClassName?: string;
}) {
  const { exam, kind } = splitGeneratorName(name);
  return (
    <>
      <Highlight text={exam} tokens={tokens} />
      {kind && (
        <span className={cn('font-normal text-film-400', kindClassName)}>
          {' '}
          <Highlight text={kind} tokens={tokens} />
        </span>
      )}
    </>
  );
}
