import { createContext, useContext } from 'react';

/**
 * The ticket whose images a bare `![](name.png)` refers to. Names are only unique within a
 * ticket, so every view that shows them (description, comments, viewer) sits inside one.
 */
const AttachmentScopeContext = createContext<string | null>(null);

export const AttachmentScope = AttachmentScopeContext.Provider;

export const useAttachmentScope = (): string | null => useContext(AttachmentScopeContext);
