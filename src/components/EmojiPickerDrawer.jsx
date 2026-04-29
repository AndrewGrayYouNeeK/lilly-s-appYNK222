import React from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger, DrawerClose } from '@/components/ui/drawer';

export default function EmojiPickerDrawer({ value, onChange, options, title = 'Pick one', triggerClassName = '' }) {
  return (
    <Drawer>
      <DrawerTrigger asChild>
        <button
          type="button"
          className={`min-h-[44px] min-w-[44px] px-4 inline-flex items-center justify-center gap-2 rounded-xl bg-muted text-2xl bounce-tap ${triggerClassName}`}
        >
          <span>{value}</span>
          <span className="text-xs font-medium text-muted-foreground">Change</span>
        </button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{title}</DrawerTitle>
        </DrawerHeader>
        <div
          className="grid grid-cols-6 gap-2 px-4 pb-6"
          style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}
        >
          {options.map(opt => (
            <DrawerClose asChild key={opt}>
              <button
                type="button"
                onClick={() => onChange(opt)}
                className={`text-3xl min-h-[56px] aspect-square rounded-xl bounce-tap transition ${
                  value === opt ? 'bg-secondary/20 ring-2 ring-secondary' : 'bg-muted'
                }`}
              >
                {opt}
              </button>
            </DrawerClose>
          ))}
        </div>
      </DrawerContent>
    </Drawer>
  );
}