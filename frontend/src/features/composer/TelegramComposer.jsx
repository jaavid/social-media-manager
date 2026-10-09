import { useLanguage } from '@/i18n';
import { useState } from 'react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
const style = {
  width: '100%',
  padding: 8,
  border: '1px solid var(--border-subtle)',
  background: 'var(--bg-surface)',
  color: 'var(--text-primary)',
  borderRadius: 6,
};
const MEDIA = ['photo', 'video', 'document'];
const BLOCKS = [
  'heading',
  'paragraph',
  'pullquote',
  'blockquote',
  'divider',
  'list',
  'table',
  'details',
  'photo',
  'video',
  'document',
  'slideshow',
  'collage',
  'buttons',
];
export const emptyRich = {
  is_rtl: true,
  blocks: [
    {
      type: 'heading',
      text: '',
      size: 2,
    },
    {
      type: 'paragraph',
      text: '',
    },
  ],
};
export function createBlock(type) {
  if (type === 'heading')
    return {
      type,
      text: '',
      size: 2,
    };
  if (type === 'divider')
    return {
      type,
    };
  if (type === 'blockquote' || type === 'details')
    return {
      type,
      ...(type === 'details'
        ? {
            summary: '',
          }
        : {}),
      blocks: [
        {
          type: 'paragraph',
          text: '',
        },
      ],
    };
  if (type === 'slideshow' || type === 'collage')
    return {
      type,
      blocks: [
        {
          type: 'photo',
          photo: {
            type: 'photo',
            media: '',
          },
        },
        {
          type: 'photo',
          photo: {
            type: 'photo',
            media: '',
          },
        },
      ],
    };
  if (type === 'list')
    return {
      type,
      items: [
        {
          blocks: [
            {
              type: 'paragraph',
              text: '',
            },
          ],
        },
      ],
    };
  if (type === 'table')
    return {
      type,
      cells: [
        [
          {
            text: '',
            align: 'left',
            valign: 'top',
          },
        ],
      ],
    };
  if (type === 'buttons')
    return {
      type,
      buttons: [
        {
          text: '',
          url: '',
        },
      ],
    };
  if (MEDIA.includes(type))
    return {
      type,
      [type]: {
        type,
        media: '',
      },
    };
  return {
    type,
    text: '',
  };
}
function ButtonEditor({ rows, onChange }) {
  const { tr } = useLanguage();
  return (
    <div>
      {rows.map((b, i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            gap: 6,
            marginTop: 6,
          }}
        >
          <input
            aria-label={`Button ${i + 1} label`}
            placeholder={tr('Button label')}
            style={style}
            value={b.text}
            onChange={(e) =>
              onChange(
                rows.map((x, j) =>
                  j === i
                    ? {
                        ...x,
                        text: e.target.value,
                      }
                    : x,
                ),
              )
            }
          />
          <select
            aria-label={`Button ${i + 1} action`}
            value={b.action ? 'acknowledge' : 'url'}
            onChange={(e) =>
              onChange(
                rows.map((x, j) =>
                  j === i
                    ? {
                        text: x.text,
                        ...(e.target.value === 'url'
                          ? {
                              url: '',
                            }
                          : {
                              action: 'acknowledge',
                            }),
                      }
                    : x,
                ),
              )
            }
          >
            <option value="url">{tr('Open link')}</option>
            <option value="acknowledge">{tr('Acknowledge')}</option>
          </select>
          {'url' in b && (
            <input
              aria-label={`Button ${i + 1} URL`}
              placeholder={tr('https://…')}
              style={style}
              value={b.url}
              onChange={(e) =>
                onChange(
                  rows.map((x, j) =>
                    j === i
                      ? {
                          ...x,
                          url: e.target.value,
                        }
                      : x,
                  ),
                )
              }
            />
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onChange(rows.filter((_, j) => j !== i))}
          >
            {tr('Remove')}
          </Button>
        </div>
      ))}
      {rows.length < 8 && (
        <Button
          size="sm"
          onClick={() =>
            onChange([
              ...rows,
              {
                text: '',
                url: '',
              },
            ])
          }
        >
          {tr('Add button')}
        </Button>
      )}
    </div>
  );
}
function BlocksEditor({ blocks, onChange, nested = false }) {
  const { tr } = useLanguage();
  const [kind, setKind] = useState('paragraph');
  const update = (i, row) => onChange(blocks.map((b, j) => (j === i ? row : b)));
  return (
    <div>
      {blocks.map((b, i) => (
        <Card
          key={i}
          padding="sm"
          style={{
            marginTop: 8,
          }}
        >
          <div
            style={{
              display: 'flex',
              gap: 8,
              alignItems: 'center',
            }}
          >
            <strong>
              {i + 1}
              {tr('.')}
              {b.type}
            </strong>
            <Button
              size="sm"
              variant="ghost"
              disabled={i === 0}
              onClick={() => {
                const next = [...blocks];
                [next[i - 1], next[i]] = [next[i], next[i - 1]];
                onChange(next);
              }}
            >
              {tr('Move up')}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onChange(blocks.filter((_, j) => j !== i))}
            >
              {tr('Remove')}
            </Button>
          </div>
          {'text' in b && (
            <textarea
              aria-label={`${b.type} text`}
              style={style}
              value={b.text}
              onChange={(e) =>
                update(i, {
                  ...b,
                  text: e.target.value,
                })
              }
            />
          )}
          {'summary' in b && (
            <input
              aria-label={tr('Details summary')}
              style={style}
              value={b.summary}
              onChange={(e) =>
                update(i, {
                  ...b,
                  summary: e.target.value,
                })
              }
            />
          )}
          {MEDIA.includes(b.type) && (
            <input
              aria-label={`${b.type} URL or file ID`}
              style={style}
              placeholder={tr('Public HTTPS media URL or Telegram file ID')}
              value={b[b.type].media}
              onChange={(e) =>
                update(i, {
                  ...b,
                  [b.type]: {
                    type: b.type,
                    media: e.target.value,
                  },
                })
              }
            />
          )}
          {b.blocks && (
            <BlocksEditor
              nested
              blocks={b.blocks}
              onChange={(rows) =>
                update(i, {
                  ...b,
                  blocks: rows,
                })
              }
            />
          )}
          {b.type === 'buttons' && (
            <ButtonEditor
              rows={b.buttons}
              onChange={(rows) =>
                update(i, {
                  ...b,
                  buttons: rows,
                })
              }
            />
          )}
          {b.type === 'list' && (
            <textarea
              aria-label={tr('List items, one per line')}
              style={style}
              value={b.items.map((x) => x.blocks[0]?.text || '').join('\n')}
              onChange={(e) =>
                update(i, {
                  ...b,
                  items: e.target.value.split('\n').map((text) => ({
                    blocks: [
                      {
                        type: 'paragraph',
                        text,
                      },
                    ],
                  })),
                })
              }
            />
          )}
          {b.type === 'table' && (
            <textarea
              aria-label={tr('Table, columns separated by a vertical bar')}
              style={style}
              value={b.cells.map((row) => row.map((x) => x.text).join(' | ')).join('\n')}
              onChange={(e) =>
                update(i, {
                  ...b,
                  cells: e.target.value.split('\n').map((row) =>
                    row.split('|').map((text) => ({
                      text: text.trim(),
                      align: 'left',
                      valign: 'top',
                    })),
                  ),
                })
              }
            />
          )}
        </Card>
      ))}
      <div
        style={{
          display: 'flex',
          gap: 8,
          marginTop: 8,
        }}
      >
        <select
          aria-label={tr('New block type')}
          value={kind}
          onChange={(e) => setKind(e.target.value)}
        >
          {(nested ? ['paragraph', 'photo', 'video'] : BLOCKS).map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
        <Button size="sm" onClick={() => onChange([...blocks, createBlock(kind)])}>
          {tr('Add block')}
        </Button>
      </div>
    </div>
  );
}
export function RichPreview({ value }) {
  const { tr } = useLanguage();
  const text = (value) =>
    typeof value === 'string'
      ? value
      : Array.isArray(value)
        ? value.map(text).join('')
        : value && typeof value === 'object'
          ? text(value.text || '')
          : '';
  function rows(blocks) {
    return blocks.map((b, i) => (
      <div
        key={i}
        style={{
          margin: '8px 0',
        }}
      >
        {b.type === 'heading' ? <h3>{text(b.text)}</h3> : b.text ? <p>{text(b.text)}</p> : null}
        {b.type === 'divider' && <hr />}
        {b.summary && <strong>{text(b.summary)}</strong>}
        {MEDIA.includes(b.type) && (
          <div>
            {b.type === 'photo' && b.photo?.media?.startsWith('https://') ? (
              <img
                src={b.photo.media}
                alt=""
                loading="lazy"
                referrerPolicy="no-referrer"
                style={{ maxWidth: '100%', maxHeight: 220 }}
              />
            ) : (
              <span>
                {tr(b.type)} {tr('attachment')}
              </span>
            )}
          </div>
        )}
        {b.type === 'slideshow' || b.type === 'collage' ? (
          <strong>
            {b.type}
            {tr('—')}
            {b.blocks.length}
            {tr('items')}
          </strong>
        ) : null}
        {b.blocks && rows(b.blocks)}
        {b.items &&
          b.items.map((x, j) => (
            <div key={j}>
              {tr('•')}
              {rows(x.blocks)}
            </div>
          ))}
        {b.cells && (
          <table>
            <tbody>
              {b.cells.map((row, j) => (
                <tr key={j}>
                  {row.map((c, k) => (
                    <td key={k}>{text(c.text)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {b.buttons &&
          b.buttons.map((x, j) => (
            <span
              key={j}
              style={{
                display: 'inline-block',
                padding: 6,
                border: '1px solid var(--border-subtle)',
              }}
            >
              {x.text}
            </span>
          ))}
      </div>
    ));
  }
  return <div dir={value.is_rtl ? 'rtl' : 'ltr'}>{rows(value.blocks || [])}</div>;
}
export default function TelegramComposer({ mode, value, onChange, assets, onMove, onCaption }) {
  const { tr } = useLanguage();
  if (mode === 'album')
    return (
      <Card padding="md">
        <Card.Header
          title={tr('Telegram Album / Gallery')}
          subtitle={tr(
            '2–10 photos/videos, in the order shown. Post caption appears on the first item.',
          )}
        />
        {assets.map((a, i) => (
          <div key={a.id}>
            {i + 1}
            {tr('.')}
            {a.mime_type}{' '}
            <input
              aria-label={`Album caption ${i + 1}`}
              placeholder={tr('Optional item caption')}
              value={a.caption || ''}
              maxLength={1024}
              onChange={(e) => onCaption(i, e.target.value)}
            />{' '}
            <Button size="sm" disabled={!i} onClick={() => onMove(i)}>
              {tr('Move up')}
            </Button>
          </div>
        ))}
      </Card>
    );
  if (mode === 'poll') {
    const poll = value.poll || {
      question: '',
      options: ['', ''],
      is_anonymous: true,
      type: 'regular',
    };
    const change = (p) =>
      onChange({
        ...value,
        poll: p,
      });
    return (
      <Card padding="md">
        <Card.Header title={tr('Telegram poll')} />
        <label>
          {tr('Question')}
          <input
            aria-label={tr('Poll question')}
            style={style}
            maxLength={300}
            value={poll.question}
            onChange={(e) =>
              change({
                ...poll,
                question: e.target.value,
              })
            }
          />
        </label>
        <label>
          {tr('Answers, one per line')}
          <textarea
            aria-label={tr('Poll answers')}
            style={style}
            value={poll.options.map((x) => (typeof x === 'string' ? x : x.text)).join('\n')}
            onChange={(e) =>
              change({
                ...poll,
                options: e.target.value.split('\n'),
              })
            }
          />
        </label>
        <label>
          <input
            type="checkbox"
            checked={poll.is_anonymous !== false}
            onChange={(e) =>
              change({
                ...poll,
                is_anonymous: e.target.checked,
              })
            }
          />
          {tr('Anonymous')}
        </label>
        <label>
          <input
            type="checkbox"
            checked={!!poll.allows_multiple_answers}
            onChange={(e) =>
              change({
                ...poll,
                allows_multiple_answers: e.target.checked,
              })
            }
          />
          {tr('Multiple answers')}
        </label>
        <label>
          {tr('Type')}
          <select
            value={poll.type || 'regular'}
            onChange={(e) => {
              const p = {
                ...poll,
                type: e.target.value,
              };
              if (p.type === 'quiz') p.correct_option_ids = [0];
              else {
                delete p.correct_option_ids;
                delete p.explanation;
              }
              change(p);
            }}
          >
            <option value="regular">{tr('Regular')}</option>
            <option value="quiz">{tr('Quiz')}</option>
          </select>
        </label>
        {poll.type === 'quiz' && (
          <label>
            {tr('Correct answer number')}
            <input
              type="number"
              min="1"
              max={poll.options.length}
              value={(poll.correct_option_ids?.[0] ?? 0) + 1}
              onChange={(e) =>
                change({
                  ...poll,
                  correct_option_ids: [Number(e.target.value) - 1],
                })
              }
            />
          </label>
        )}
        <label>
          {tr('Open period (seconds, optional)')}
          <input
            type="number"
            min="5"
            max="2628000"
            value={poll.open_period || ''}
            onChange={(e) => {
              const p = {
                ...poll,
              };
              if (e.target.value) p.open_period = Number(e.target.value);
              else delete p.open_period;
              change(p);
            }}
          />
        </label>
      </Card>
    );
  }
  if (mode === 'rich') {
    const rich = value.rich_message || emptyRich;
    return (
      <Card padding="md">
        <Card.Header
          title={tr('Telegram Rich Article / Slideshow / Collage')}
          subtitle={tr('Structured blocks are preserved through approval and scheduling.')}
        />
        <label>
          <input
            type="checkbox"
            checked={rich.is_rtl}
            onChange={(e) =>
              onChange({
                ...value,
                rich_message: {
                  ...rich,
                  is_rtl: e.target.checked,
                },
              })
            }
          />
          {tr('Right to left')}
        </label>
        <BlocksEditor
          blocks={rich.blocks}
          onChange={(blocks) =>
            onChange({
              ...value,
              rich_message: {
                ...rich,
                blocks,
              },
            })
          }
        />
        <label>
          <input
            type="checkbox"
            checked={!!value.rich_fallback}
            onChange={(e) =>
              onChange({
                ...value,
                rich_fallback: e.target.checked,
              })
            }
          />
          {tr('Publish as plain text and media links')}
        </label>
        <RichPreview value={rich} />
      </Card>
    );
  }
  return (
    <Card padding="md">
      <Card.Header title={tr('Telegram interactive / CTA')} />
      <ButtonEditor
        rows={value.buttons || []}
        onChange={(buttons) =>
          onChange({
            ...value,
            buttons,
          })
        }
      />
    </Card>
  );
}
