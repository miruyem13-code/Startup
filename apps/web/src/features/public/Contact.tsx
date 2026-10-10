import { useState } from 'react';
import { Mail, Check } from 'lucide-react';
import { Badge, Button, Panel } from '../../../../../packages/ui';
import { useAction } from '../../lib/hooks';
export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', message: '', category: 'CONTACT' });
  const [sent, setSent] = useState(false);
  const send = useAction('/contact', 'Your message was saved for operations.');
  return (
    <div className="public-app-page">
      <div className="page-intro">
        <div>
          <span className="eyebrow">LET'S BUILD A BETTER CITY</span>
          <h1>A conversation can start a new route.</h1>
          <p>Pilot questions, product feedback and safety reports reach the operations inbox.</p>
        </div>
        <Mail size={32} />
      </div>
      <Panel className="settings-panel">
        {sent ? (
          <>
            <Badge>MESSAGE RECEIVED</Badge>
            <h2>Thank you for getting in touch.</h2>
            <p>
              Your message is saved in the local operations inbox. This does not send an external
              email.
            </p>
            <Button tone="secondary" onClick={() => setSent(false)}>
              Send another message
            </Button>
          </>
        ) : (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              send
                .mutateAsync(form)
                .then(() => {
                  setSent(true);
                  setForm({ name: '', email: '', message: '', category: 'CONTACT' });
                })
                .catch(() => {});
            }}
          >
            <label>
              Your name
              <input
                required
                minLength={2}
                maxLength={60}
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
              />
            </label>
            <label>
              Email address
              <input
                required
                type="email"
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
              />
            </label>
            <label>
              Topic
              <select
                value={form.category}
                onChange={(event) => setForm({ ...form, category: event.target.value })}
              >
                <option value="CONTACT">Pilot or partnership</option>
                <option value="FEEDBACK">Product feedback</option>
                <option value="SAFETY">Safety concern</option>
              </select>
            </label>
            <label>
              Your message
              <textarea
                required
                minLength={10}
                maxLength={2000}
                rows={5}
                value={form.message}
                onChange={(event) => setForm({ ...form, message: event.target.value })}
              />
            </label>
            <Button type="submit" busy={send.isPending}>
              Send message <Check size={16} />
            </Button>
          </form>
        )}
      </Panel>
    </div>
  );
}
