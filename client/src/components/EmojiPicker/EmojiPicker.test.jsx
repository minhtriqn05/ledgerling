import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EmojiPicker from './EmojiPicker.jsx';
import { EMOJI_CHOICES } from '../../utils/emoji.js';

describe('EmojiPicker', () => {
  it('shows every emoji and a None button', () => {
    render(<EmojiPicker value={null} onChange={vi.fn()} />);
    // 40 emoji + None
    expect(screen.getAllByRole('button')).toHaveLength(EMOJI_CHOICES.length + 1);
    expect(screen.getByRole('button', { name: 'None' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('marks the chosen emoji as pressed', () => {
    render(<EmojiPicker value="🍜" onChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: '🍜' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: '🍔' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'None' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('calls onChange with the emoji that was clicked', async () => {
    const onChange = vi.fn();
    render(<EmojiPicker value={null} onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: '☕' }));
    expect(onChange).toHaveBeenCalledWith('☕');
  });

  it('None removes the icon (null)', async () => {
    const onChange = vi.fn();
    render(<EmojiPicker value="🍜" onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: 'None' }));
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('cannot be used while disabled', async () => {
    const onChange = vi.fn();
    render(<EmojiPicker value={null} onChange={onChange} disabled />);
    await userEvent.click(screen.getByRole('button', { name: '☕' }));
    expect(onChange).not.toHaveBeenCalled();
  });
});
