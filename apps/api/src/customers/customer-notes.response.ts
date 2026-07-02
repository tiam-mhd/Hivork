import type { CustomerNoteRecord, CustomerNoteRecordWithAuthor } from '@hivork/application';

export function toCustomerNoteResponse(
  note: CustomerNoteRecord | CustomerNoteRecordWithAuthor,
) {
  const authorName = 'authorName' in note ? note.authorName : null;

  return {
    id: note.id,
    body: note.body,
    isPinned: note.isPinned,
    authorStaffId: note.authorStaffId,
    author:
      authorName && authorName.trim().length > 0
        ? {
            id: note.authorStaffId,
            name: authorName,
          }
        : undefined,
    createdAt: note.createdAt.toISOString(),
    updatedAt: note.updatedAt.toISOString(),
    version: note.version,
  };
}
