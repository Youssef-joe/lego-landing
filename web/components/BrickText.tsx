'use client';

/**
 * Headline that assembles itself out of bricks.
 *
 * Each word is wrapped in a span carrying two pseudo-elements: a coloured
 * brick body and its row of studs. On load the brick drops in, snaps square,
 * then fades to hand the word over to the text underneath — so the type reads
 * as if it were built from pieces.
 *
 * The h1 ships with `reveal visible` already applied so the scroll-reveal
 * observer leaves it alone and the brick animation owns the entrance.
 */
const BRICK_COLORS = ['var(--terracotta)', 'var(--ochre)', 'var(--sage)'];

export default function BrickText({
  text,
  className = '',
  stagger = 80,
}: {
  text: string;
  className?: string;
  /** ms between each word starting to drop */
  stagger?: number;
}) {
  const words = text.split(' ');

  return (
    <h1 className={`brick-text reveal visible ${className}`.trim()}>
      {words.map((word, i) => (
        <span
          key={i}
          className="brick-word"
          style={
            {
              '--bw-c': BRICK_COLORS[i % BRICK_COLORS.length],
              '--bw-delay': `${i * stagger}ms`,
              // alternating tilt so they do not all fall the same way
              '--bw-rot': `${i % 2 === 0 ? -6 : 5}deg`,
            } as React.CSSProperties
          }
        >
          <span className="brick-word-text">{word}</span>
        </span>
      ))}
    </h1>
  );
}
