import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send } from 'lucide-react';

export default function MessageComposer({ onSend, disabled }) {
  const [text, setText] = useState('');

  const submit = (e) => {
    e.preventDefault();
    if (!text.trim() || disabled) return;
    onSend(text.trim());
    setText('');
  };

  return (
    <form onSubmit={submit} className="flex gap-2">
      <Input
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="Say something…"
        className="rounded-full flex-1"
      />
      <Button type="submit" size="icon" disabled={disabled || !text.trim()} className="rounded-full flex-shrink-0">
        <Send className="w-4 h-4" />
      </Button>
    </form>
  );
}