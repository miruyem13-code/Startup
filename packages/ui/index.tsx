import { useEffect, useRef, type ReactNode } from 'react';
import { ArrowUpRight, LoaderCircle, X, RefreshCw } from 'lucide-react';
export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="brand">
      <img src="/velocity.svg" alt="" />
      {!compact && (
        <span>
          velocity<span className="brand-period">.</span>
        </span>
      )}
    </span>
  );
}
export function Button({
  children,
  busy = false,
  tone = '',
  className = '',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { busy?: boolean; tone?: string }) {
  return (
    <button {...props} disabled={props.disabled || busy} className={`button ${tone} ${className}`}>
      {busy ? <LoaderCircle size={17} className="spin" /> : null}
      {children}
    </button>
  );
}
export function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`panel ${className}`}>{children}</section>;
}
export function Metric({
  icon,
  label,
  value,
  unit,
  note,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  unit?: string;
  note: string;
}) {
  return (
    <Panel className="metric">
      <div className="metric-top">
        <span>{label}</span>
        <span className="metric-icon">{icon}</span>
      </div>
      <div className="metric-value">
        {value}
        <small>{unit}</small>
      </div>
      <div className="metric-note">{note}</div>
    </Panel>
  );
}
export function SectionHead({
  eyebrow,
  title,
  children,
}: {
  eyebrow?: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="section-head">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h2>{title}</h2>
      </div>
      {children}
    </div>
  );
}
export const Arrow = () => <ArrowUpRight size={16} />;
export function State({
  error,
  empty,
  retry,
}: {
  error?: string;
  empty?: string;
  retry?: () => void;
}) {
  return (
    <div className={`state ${error ? 'error' : ''}`}>
      <RefreshCw size={26} />
      <h3>{error ? 'Let’s try that again' : empty || 'Loading your city…'}</h3>
      <p>
        {error ||
          (empty
            ? 'A new adventure is a good place to start.'
            : 'Connecting to the VELOCITY pilot.')}
      </p>
      {retry && <Button onClick={retry}>Try again</Button>}
    </div>
  );
}
export function Badge({ children, tone = '' }: { children: ReactNode; tone?: string }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}
export function Progress({ value }: { value: number }) {
  return (
    <div
      className="progress"
      role="progressbar"
      aria-valuenow={Math.min(100, Math.round(value))}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <i style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}
export function Modal({
  title,
  children,
  close,
}: {
  title: string;
  children: ReactNode;
  close: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const closeCallback = useRef(close);
  closeCallback.current = close;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    ref.current?.showModal();
    const dialog = ref.current;
    const handle = (event: Event) => {
      event.preventDefault();
      closeCallback.current();
    };
    dialog?.addEventListener('cancel', handle);
    return () => {
      dialog?.removeEventListener('cancel', handle);
      dialog?.close();
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="modal"
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="modal-title">
        <h2>{title}</h2>
        <button className="icon-button" aria-label="Close dialog" onClick={close}>
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
