import { Check, Copy, type LucideIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from "react";

export function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: LucideIcon;
  label: string;
  size?: "sm" | "md";
  isActive?: boolean;
}

export function IconButton({ icon: Icon, label, size = "md", isActive = false, className, ...rest }: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cx(
        "inline-flex shrink-0 items-center justify-center rounded-sm text-fg-3 transition-colors hover:bg-surface-2 hover:text-fg active:scale-[0.98]",
        size === "sm" ? "size-6" : "size-8",
        isActive && "bg-surface-2 text-fg",
        className,
      )}
      {...rest}
    >
      <Icon className="size-4" strokeWidth={1.75} aria-hidden />
    </button>
  );
}

export function useClipboard(resetMs = 1500) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const copy = useCallback(
    async (text: string, key = text) => {
      try {
        await navigator.clipboard.writeText(text);
        setCopiedKey(key);
        window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => setCopiedKey(null), resetMs);
      } catch (error) {
        console.error("复制失败", error);
      }
    },
    [resetMs],
  );

  return { copiedKey, copy };
}

export function CopyButton({ text, label = "复制", className }: { text: string; label?: string; className?: string }) {
  const { copiedKey, copy } = useClipboard();
  const isCopied = copiedKey === text;
  return (
    <IconButton
      icon={isCopied ? Check : Copy}
      label={isCopied ? "已复制" : label}
      size="sm"
      className={cx(isCopied && "text-success hover:text-success", className)}
      onClick={(e) => {
        e.stopPropagation();
        void copy(text);
      }}
    />
  );
}

interface SegmentedOption<T extends string> {
  value: T;
  label: ReactNode;
  count?: number;
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: SegmentedOption<T>[];
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-md border border-line bg-surface-2/60 p-1">
      {options.map((option) => {
        const isSelected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => onChange(option.value)}
            className={cx(
              "inline-flex items-center gap-1 rounded-sm px-2 py-1 text-caption transition-colors active:scale-[0.98]",
              isSelected ? "bg-surface text-fg shadow-sm dark:bg-line" : "text-fg-2 hover:text-fg",
            )}
          >
            {option.label}
            {option.count !== undefined && <span className="tabular-nums">{option.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

export function SectionTitle({ icon: Icon, children, aside }: { icon: LucideIcon; children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="flex min-h-8 items-center justify-between gap-3">
      <h2 className="flex items-center gap-2 text-body-sm font-medium text-fg">
        <Icon className="size-4 text-fg-3" strokeWidth={1.75} aria-hidden />
        {children}
      </h2>
      {aside}
    </div>
  );
}
