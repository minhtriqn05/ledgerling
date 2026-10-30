import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TagInput, { cleanTag } from './TagInput.jsx';

// The component is controlled, so the tests need a parent that keeps the tags
function Harness({ initial = [], suggestions = [], onChange = () => {} }) {
  const [tags, setTags] = useState(initial);
  return (
    <>
      <label htmlFor="tags">Tags</label>
      <TagInput
        id="tags"
        value={tags}
        suggestions={suggestions}
        onChange={(next) => {
          setTags(next);
          onChange(next);
        }}
      />
    </>
  );
}

const box = () => screen.getByLabelText('Tags');
const chips = () => screen.queryAllByRole('button', { name: /^Remove tag / }).map((b) => b.getAttribute('aria-label'));

describe('cleanTag', () => {
  it('trims, lower-cases and drops one leading #', () => {
    expect(cleanTag('  #Work ')).toBe('work');
    expect(cleanTag('Team-Lunch')).toBe('team-lunch');
    expect(cleanTag('   ')).toBe('');
  });
});

describe('TagInput', () => {
  it('adds a cleaned tag on Enter, comma or space', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);

    await user.type(box(), '#Work{Enter}');
    await user.type(box(), 'trip,');
    await user.type(box(), 'team-lunch ');

    expect(onChange).toHaveBeenLastCalledWith(['work', 'trip', 'team-lunch']);
    expect(chips()).toEqual(['Remove tag work', 'Remove tag trip', 'Remove tag team-lunch']);
    expect(box()).toHaveValue('');
  });

  it('adds the half-typed tag when the box loses focus, so Save does not lose it', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);

    await user.type(box(), 'later');
    await user.tab();

    expect(onChange).toHaveBeenLastCalledWith(['later']);
  });

  it('does not add a bad tag and says why', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);

    await user.type(box(), 'bad_tag{Enter}');
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('A tag has 1-20 letters, digits or hyphens.');

    // Typing again clears the message
    await user.type(box(), 'x');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('ignores a tag that is already there', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness initial={['work']} onChange={onChange} />);

    await user.type(box(), 'WORK{Enter}');

    expect(onChange).not.toHaveBeenCalled();
    expect(chips()).toEqual(['Remove tag work']);
    expect(box()).toHaveValue('');
  });

  it('removes a tag with its x button, and the last one with Backspace in the empty box', async () => {
    const user = userEvent.setup();
    render(<Harness initial={['a', 'b', 'c']} />);

    await user.click(screen.getByRole('button', { name: 'Remove tag b' }));
    expect(chips()).toEqual(['Remove tag a', 'Remove tag c']);

    await user.click(box());
    await user.keyboard('{Backspace}');
    expect(chips()).toEqual(['Remove tag a']);
  });

  it('does not take a 6th tag: the box is disabled', () => {
    render(<Harness initial={['a', 'b', 'c', 'd', 'e']} suggestions={[{ tag: 'f', count: 1 }]} />);

    expect(box()).toBeDisabled();
    expect(screen.queryByRole('button', { name: /#f/ })).not.toBeInTheDocument();
  });

  it('suggests used tags that are not chosen yet, filtered by what is typed', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const suggestions = [
      { tag: 'work', count: 12 },
      { tag: 'trip', count: 3 },
      { tag: 'weekend', count: 1 },
    ];
    render(<Harness initial={['trip']} suggestions={suggestions} onChange={onChange} />);

    // "trip" is already chosen
    expect(screen.queryByRole('button', { name: /#trip/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /#work/ })).toBeInTheDocument();

    await user.type(box(), 'we');
    expect(screen.queryByRole('button', { name: /#work/ })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /#weekend/ }));
    expect(onChange).toHaveBeenLastCalledWith(['trip', 'weekend']);
    expect(box()).toHaveValue('');
  });
});
