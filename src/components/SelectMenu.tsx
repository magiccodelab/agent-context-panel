import { Check, ChevronDown } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { cx } from "./ui";

interface SelectMenuProps<T extends string> {
  label: string;
  value: T;
  options: { value: T; label: string; hint?: string }[];
  onChange: (value: T) => void;
  placement?: "top" | "bottom";
}

export function SelectMenu<T extends string>({ label, value, options, onChange, placement = "top" }: SelectMenuProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const current = options.find((o) => o.value === value);

  useEffect(() => {
    if (!isOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    listRef.current?.querySelector<HTMLButtonElement>('[aria-checked="true"]')?.focus();
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [isOpen]);

  const close = () => {
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  const onListKeyDown = (e: React.KeyboardEvent) => {
    const items = Array.from(listRef.current?.querySelectorAll<HTMLButtonElement>("button") ?? []);
    const index = items.indexOf(document.activeElement as HTMLButtonElement);
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const next = (index + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
      items[next]?.focus();
    }
  };

  return (
    <div ref={rootRef} className="relative min-w-0">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls={isOpen ? menuId : undefined}
        aria-label={`${label}：${current?.label ?? ""}`}
        onClick={() => setIsOpen((v) => !v)}
        className={cx(
          "inline-flex h-8 max-w-full items-center gap-1 rounded-sm px-2 text-caption text-fg-2 transition-colors hover:bg-surface-2 hover:text-fg active:scale-[0.98]",
          isOpen && "bg-surface-2 text-fg",
        )}
      >
        <span className="max-w-48 min-w-0 truncate">{current?.label}</span>
        <ChevronDown className={cx("size-4 shrink-0 text-fg-3 transition-transform", isOpen && "rotate-180")} strokeWidth={1.75} aria-hidden />
      </button>
      {isOpen && (
        <div
          ref={listRef}
          id={menuId}
          role="menu"
          aria-label={label}
          onKeyDown={onListKeyDown}
          className={cx(
            "absolute left-0 z-30 min-w-48 rounded-md border border-line bg-surface p-1 shadow-md",
            placement === "top" ? "bottom-full mb-2" : "top-full mt-2",
          )}
        >
          <div className="px-2 py-1 text-caption text-fg-2">{label}</div>
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                role="menuitemradio"
                aria-checked={isSelected}
                onClick={() => {
                  onChange(option.value);
                  close();
                }}
                className="flex w-full items-center gap-2 rounded-sm px-2 py-2 text-left text-body-sm text-fg transition-colors hover:bg-surface-2 focus-visible:bg-surface-2"
              >
                <span className="flex-1 truncate">{option.label}</span>
                {option.hint && <span className="text-caption text-fg-2">{option.hint}</span>}
                <Check className={cx("size-4", isSelected ? "text-fg" : "invisible")} strokeWidth={1.75} aria-hidden />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
