import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AttachmentScope } from '@/features/attachments/AttachmentScope';
import type { Comment } from '@/data/types';
import { CommentItem } from './CommentItem';

const png = (name: string) => ({ name, mime: 'image/png', size: 1 });

const renderComment = (comment: Comment) =>
  render(
    <AttachmentScope value="t-1">
      <CommentItem comment={comment} onDelete={vi.fn()} />
    </AttachmentScope>,
  );

describe('CommentItem', () => {
  it('shows an image it references inline only, and the rest as thumbnails', () => {
    renderComment({
      id: 1,
      author: 'Ana',
      ts: '2026-11-13T10:00:00.000Z',
      body: 'Here:\n\n![](phone.png)',
      attachments: [png('phone.png'), png('extra.png')],
    });
    const thumbs = screen.getAllByRole('listitem');
    expect(thumbs).toHaveLength(1);
    expect(thumbs[0]).toHaveTextContent('extra.png');
    expect(screen.queryByRole('button', { name: 'View phone.png' })).not.toBeInTheDocument();
  });

  it('shows no thumbnails when every image is inline', () => {
    renderComment({
      id: 2,
      author: 'Ana',
      ts: '2026-11-13T10:00:00.000Z',
      body: '![](phone.png)',
      attachments: [png('phone.png')],
    });
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });
});
