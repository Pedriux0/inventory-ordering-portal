import { useState } from 'react'
import { money } from '../api'

// type-to-search product field (docs/UI_RESEARCH.md section C, POS research)
// replaces a long <select>: type part of the name or the #id, pick with the mouse or
// with arrow keys + Enter. Every option also shows stock and price, so you dont have
// to look them up somewhere else.
// built on the WAI-ARIA "combobox with listbox" pattern so it works with a keyboard
// and screen readers: role=combobox, aria-expanded, aria-activedescendant
export default function ProductPicker({ id, products, value, onChange, ...ariaProps }) {
  const selected = products.find((p) => p.productId === Number(value));
  const [query, setQuery] = useState(null); // null = not typing, show the selected name
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const listId = `${id}-listbox`;
  const search = (query ?? '').trim().toLowerCase().replace(/^#/, '');
  const matches = products.filter(
    (p) => !search || p.productName.toLowerCase().includes(search) || String(p.productId) === search
  );

  function choose(product) {
    onChange(product.productId);
    setQuery(null);
    setOpen(false);
  }

  function handleKeyDown(event) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, matches.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (event.key === 'Enter' && open && matches[active]) {
      event.preventDefault(); // pick the product instead of submitting the form
      choose(matches[active]);
    } else if (event.key === 'Escape' && open) {
      event.stopPropagation(); // close only the list, not the whole drawer
      setOpen(false);
      setQuery(null);
    }
  }

  const activeOption = open && matches[active] ? `${id}-opt-${matches[active].productId}` : undefined;

  return (
    <div className="picker">
      <input
        id={id}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={activeOption}
        autoComplete="off"
        placeholder="Search by name or #id"
        value={query ?? (selected ? selected.productName : '')}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          setActive(0);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          setOpen(false);
          setQuery(null);
        }}
        onKeyDown={handleKeyDown}
        {...ariaProps}
      />
      {open && (
        <ul id={listId} role="listbox" className="picker-list" aria-label="Products">
          {matches.map((p, i) => (
            <li
              key={p.productId}
              id={`${id}-opt-${p.productId}`}
              role="option"
              aria-selected={i === active}
              className={i === active ? 'picker-option active' : 'picker-option'}
              // mousedown (not click) so the input does not lose focus and close the list first
              onMouseDown={(e) => {
                e.preventDefault();
                choose(p);
              }}
              onMouseEnter={() => setActive(i)}
            >
              <span className="picker-name">{p.productName}</span>
              <span className="picker-meta">
                {p.currentStock} in stock · {money(p.unitPrice)}
              </span>
            </li>
          ))}
        </ul>
      )}
      {open && matches.length === 0 && <div className="picker-empty">No products match “{query}”.</div>}
    </div>
  );
}
